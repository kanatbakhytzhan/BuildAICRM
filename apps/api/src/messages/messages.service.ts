import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageSource, MessageDirection, Prisma } from '@prisma/client';
import { SystemLogsService } from '../system/system.logs.service';

export type SendToLeadResult = { sent: boolean; reason?: string };

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private prisma: PrismaService,
    private systemLogs: SystemLogsService,
  ) {}

  async getLeadIfAccess(tenantId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async listByLead(tenantId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) return [];
    return this.prisma.message.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    leadId: string,
    data: {
      source: MessageSource;
      direction: MessageDirection;
      body?: string;
      mediaUrl?: string;
    },
  ) {
    return this.prisma.message.create({
      data: { leadId, ...data },
    });
  }

  async createForLead(
    tenantId: string,
    leadId: string,
    data: {
      source: MessageSource;
      direction: MessageDirection;
      body?: string;
      mediaUrl?: string;
    },
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const message = await this.create(lead.id, data);
    const now = new Date();

    const updateData: { lastMessageAt: Date; lastMessagePreview: string | null; noResponseSince: Date | null; aiActive?: boolean } = {
      lastMessageAt: now,
      lastMessagePreview: data.body?.trim()
        ? data.body.slice(0, 120)
        : data.mediaUrl
          ? '🎵 Голосовое'
          : null,
      noResponseSince: data.direction === MessageDirection.out ? now : null,
    };

    // Менеджер отправил стоп-слово в чат → отключаем AI для этого лида
    if (
      data.direction === MessageDirection.out &&
      data.source === MessageSource.human &&
      data.body?.trim()
    ) {
      const settings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { aiStopWord: true },
      });
      const stopWord = settings?.aiStopWord?.trim();
      if (stopWord) {
        const bodyNorm = data.body.trim().toUpperCase();
        const wordNorm = stopWord.toUpperCase();
        if (bodyNorm === wordNorm || bodyNorm.includes(wordNorm)) {
          updateData.aiActive = false;
          this.logger.log(`createForLead: стоп-слово «${stopWord}» — AI отключён для лида ${leadId}`);
        }
      }
    }

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: updateData,
    });

    // Отправить исходящее голосовое в WhatsApp
    if (
      data.direction === MessageDirection.out &&
      data.source === MessageSource.human &&
      data.mediaUrl?.trim()
    ) {
      await this.sendMediaToLead(tenantId, lead.id, data.mediaUrl.trim(), 'audio', '', MessageSource.human);
    }

    // Отправить исходящее текстовое сообщение в WhatsApp (через общий sendToLead с логированием)
    if (
      data.direction === MessageDirection.out &&
      data.source === MessageSource.human &&
      data.body?.trim()
    ) {
      const r = await this.sendToLead(tenantId, lead.id, data.body!.trim());
      if (!r.sent) {
        this.logger.warn(`createForLead: WhatsApp send-text не отправлен leadId=${lead.id} reason=${r.reason ?? 'unknown'}`);
      }
    }

    return message;
  }

  /** Отправить исходящее сообщение лиду в WhatsApp (тот же канал/номер, что у лида). Для AI и webhook. */
  async sendToLead(tenantId: string, leadId: string, body: string): Promise<SendToLeadResult> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead || !body?.trim()) {
      return { sent: false, reason: 'no_lead_or_empty_body' };
    }
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });
    let instanceId: string | null = settings?.chatflowInstanceId ?? null;
    if (lead.channelId) {
      const ch = await this.prisma.tenantChannel.findUnique({
        where: { id: lead.channelId },
      });
      if (ch && ch.externalId !== 'default') instanceId = ch.externalId;
    }
    if (!settings?.chatflowApiToken?.trim()) {
      await this.systemLogs.log({
        tenantId,
        category: 'whatsapp',
        message: 'WhatsApp: сообщение не отправлено — в настройках клиента не задан ChatFlow API Token',
        meta: { leadId },
      });
      return { sent: false, reason: 'no_chatflow_token' };
    }
    if (!instanceId?.trim()) {
      await this.systemLogs.log({
        tenantId,
        category: 'whatsapp',
        message: 'WhatsApp: сообщение не отправлено — в настройках клиента не задан Instance ID (номер канала)',
        meta: { leadId },
      });
      return { sent: false, reason: 'no_instance_id' };
    }
    const phone = String(lead.phone).replace(/\D/g, '');
    if (phone.length < 10) {
      return { sent: false, reason: 'invalid_phone' };
    }
    const jid = `${phone}@s.whatsapp.net`;
    const msg = body.trim();
    const baseUrl = 'https://app.chatflow.kz/api/v1/send-text';
    const params = {
      token: settings.chatflowApiToken.trim(),
      instance_id: instanceId.trim(),
      jid,
      msg,
    };

    const trySend = async (method: 'GET' | 'POST'): Promise<{ sent: boolean; reason?: string }> => {
      let res: Response;
      try {
        if (method === 'GET') {
          const url = new URL(baseUrl);
          url.searchParams.set('token', params.token);
          url.searchParams.set('instance_id', params.instance_id);
          url.searchParams.set('jid', params.jid);
          url.searchParams.set('msg', params.msg);
          res = await fetch(url.toString(), { method: 'GET' });
        } else {
          res = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(params).toString(),
          });
        }
      } catch (err) {
        const msg = (err as Error).message;
        await this.systemLogs.log({
          tenantId,
          category: 'whatsapp',
          message: `WhatsApp send-text: ошибка сети — ${msg}`,
          meta: { leadId, method },
        });
        return { sent: false, reason: `network_error: ${msg}` };
      }
      const raw = await res.text();
      let data: { success?: boolean; message?: string } = {};
      try {
        data = JSON.parse(raw) as { success?: boolean; message?: string };
      } catch {
        await this.systemLogs.log({
          tenantId,
          category: 'whatsapp',
          message: `WhatsApp send-text: ответ не JSON (возможно HTML). Проверьте URL и токен ChatFlow.`,
          meta: { leadId, status: res.status, responsePreview: raw.slice(0, 300) },
        });
        return { sent: false, reason: 'invalid_response_not_json' };
      }
      if (data?.success === true) {
        return { sent: true };
      }
      const apiMessage = data?.message ?? raw?.slice(0, 200) ?? 'unknown';
      await this.systemLogs.log({
        tenantId,
        category: 'whatsapp',
        message: `WhatsApp send-text: ChatFlow вернул ошибку — ${apiMessage}`,
        meta: { leadId, status: res.status, chatflowMessage: data?.message },
      });
      return { sent: false, reason: apiMessage };
    };

    // Длинные сообщения — сразу POST, чтобы не упираться в лимит длины URL
    const usePost = msg.length > 1200;
    const result = await trySend(usePost ? 'POST' : 'GET');
    if (result.sent) return result;
    // Если GET вернул ошибку (например 414 URI Too Long), пробуем POST
    if (!usePost) {
      const retry = await trySend('POST');
      if (retry.sent) return retry;
    }
    return result;
  }

  /** Отправить медиа лиду в WhatsApp и сохранить в чат CRM (исходящее сообщение). source: ai по умолчанию; human — не создаём запись (уже создана в createForLead). */
  async sendMediaToLead(
    tenantId: string,
    leadId: string,
    mediaUrl: string,
    type: 'audio' | 'image' | 'document',
    caption = '',
    source: MessageSource = MessageSource.ai,
  ): Promise<boolean> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead || !mediaUrl?.trim()) {
      this.logger.warn(`sendMediaToLead skip: lead=${leadId} mediaUrl=${mediaUrl ? 'empty' : 'missing'}`);
      return false;
    }
    if (mediaUrl.includes('localhost')) {
      this.logger.warn(`sendMediaToLead FAIL: mediaUrl contains localhost (ChatFlow cannot fetch) tenantId=${tenantId} leadId=${leadId} url=${mediaUrl}`);
      return false;
    }
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });
    let instanceId: string | null = settings?.chatflowInstanceId ?? null;
    if (lead.channelId) {
      const ch = await this.prisma.tenantChannel.findUnique({
        where: { id: lead.channelId },
      });
      if (ch && ch.externalId !== 'default') instanceId = ch.externalId;
    }
    if (!settings?.chatflowApiToken || !instanceId) {
      this.logger.warn(`sendMediaToLead FAIL: no chatflowApiToken or instanceId tenantId=${tenantId} leadId=${leadId} hasToken=${!!settings?.chatflowApiToken} instanceId=${instanceId ?? 'null'}`);
      return false;
    }
    const phone = String(lead.phone).replace(/\D/g, '');
    if (phone.length < 10) {
      this.logger.warn(`sendMediaToLead FAIL: invalid phone tenantId=${tenantId} leadId=${leadId} phone=${lead.phone}`);
      return false;
    }
    const jid = `${phone}@s.whatsapp.net`;
    const baseUrl = 'https://app.chatflow.kz/api/v1';
    const params = new URLSearchParams({
      token: settings.chatflowApiToken!,
      instance_id: instanceId,
      jid,
    });

    let path: string;
    if (type === 'audio') {
      path = 'send-audio';
      params.set('audiourl', mediaUrl.trim());
    } else if (type === 'image') {
      path = 'send-image';
      params.set('imageurl', mediaUrl.trim());
      // ChatFlow требует непустой caption. Zero-width space — невидимый, возможно WhatsApp сгруппирует фото.
      params.set('caption', (caption ?? '').trim() || '\u200B');
    } else {
      path = 'send-doc';
      params.set('docurl', mediaUrl.trim());
      params.set('caption', (caption ?? '').trim() || '\u200B');
    }

    const trySendMedia = async (): Promise<{ ok: boolean; text: string; res: Response }> => {
      let query: string;
      if (type === 'image') {
        const parts = [
          `token=${encodeURIComponent(settings.chatflowApiToken!)}`,
          `instance_id=${encodeURIComponent(instanceId)}`,
          `jid=${encodeURIComponent(jid)}`,
          `caption=${encodeURIComponent((caption ?? '').trim() || '\u200B')}`,
          `imageurl=${encodeURIComponent(mediaUrl.trim())}`,
        ];
        query = parts.join('&');
      } else if (type === 'document') {
        const parts = [
          `token=${encodeURIComponent(settings.chatflowApiToken!)}`,
          `instance_id=${encodeURIComponent(instanceId)}`,
          `jid=${encodeURIComponent(jid)}`,
          `caption=${encodeURIComponent((caption ?? '').trim() || '\u200B')}`,
          `docurl=${encodeURIComponent(mediaUrl.trim())}`,
        ];
        query = parts.join('&');
      } else {
        // audio
        const parts = [
          `token=${encodeURIComponent(settings.chatflowApiToken!)}`,
          `instance_id=${encodeURIComponent(instanceId)}`,
          `jid=${encodeURIComponent(jid)}`,
          `audiourl=${encodeURIComponent(mediaUrl.trim())}`,
        ];
        query = parts.join('&');
      }
      const url = `${baseUrl}/${path}?${query}`;
      const r = await fetch(url);
      return { ok: r.ok, text: await r.text(), res: r };
    };

    try {
      // Для картинки: убедиться, что URL отдаёт контент (ChatFlow потом сам дергает этот URL)
      if (type === 'image') {
        try {
          const probe = await fetch(mediaUrl.trim(), {
            method: 'HEAD',
            signal: AbortSignal.timeout(10000),
            headers: { Accept: 'image/*' },
          });
          if (!probe.ok) {
            this.logger.warn(`sendMediaToLead image URL not reachable: ${probe.status} ${mediaUrl.slice(0, 60)}... tenantId=${tenantId}`);
          }
        } catch (e) {
          this.logger.warn(`sendMediaToLead image URL probe failed tenantId=${tenantId} error=${(e as Error).message}`);
        }
      }

      const result = await trySendMedia();
      let parsed: { success?: boolean; message?: string } = {};
      try {
        parsed = JSON.parse(result.text) as { success?: boolean; message?: string };
      } catch {
        parsed = {};
      }
      if (parsed?.success === true) {
        if (source === MessageSource.ai) {
          const body =
            type === 'audio' ? '🎵 Голосовое сообщение' : type === 'image' ? '🖼 Фото каталога' : '📎 Документ';
          await this.create(leadId, {
            source: MessageSource.ai,
            direction: MessageDirection.out,
            body,
            mediaUrl: mediaUrl.trim(),
          });
        }
        return true;
      }

      // Повтор при "Failed to fetch stream" (таймаут на стороне ChatFlow)
      if ((type === 'image' || type === 'document') && String(parsed?.message ?? '').includes('Failed to fetch stream')) {
        await new Promise((r) => setTimeout(r, 2500));
        const retry = await trySendMedia();
        let retryParsed: { success?: boolean } = {};
        try {
          retryParsed = JSON.parse(retry.text) as { success?: boolean };
        } catch {
          retryParsed = {};
        }
        if (retryParsed?.success === true) {
          if (source === MessageSource.ai) {
            const body =
              (type === 'image' ? '🖼 Фото каталога' : '📎 Документ');
            await this.create(leadId, {
              source: MessageSource.ai,
              direction: MessageDirection.out,
              body,
              mediaUrl: mediaUrl.trim(),
            });
          }
          return true;
        }
      }

      this.logger.warn(
        `sendMediaToLead FAIL: ChatFlow ${path} status=${result.res.status} success=${parsed?.success} message=${parsed?.message ?? 'n/a'} tenantId=${tenantId} leadId=${leadId} mediaUrl=${mediaUrl.slice(0, 80)}... response=${result.text.slice(0, 400)}`,
      );
      return this.sendMediaLinkAsText(tenantId, leadId, mediaUrl.trim(), type);
    } catch (err) {
      this.logger.warn(`sendMediaToLead FAIL: fetch error tenantId=${tenantId} leadId=${leadId} type=${type} error=${(err as Error).message}`);
      return this.sendMediaLinkAsText(tenantId, leadId, mediaUrl.trim(), type);
    }
  }

  /** Приветственные медиа (голос + фото) по теме. По каждой теме отправляем не более одного раза (metadata.welcomeMediaSentTopicIds). */
  async sendWelcomeMediaForTopic(tenantId: string, leadId: string, topicId: string | null): Promise<void> {
    if (!topicId) return;
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      select: { metadata: true, welcomeMediaSentAt: true },
    });
    if (!lead) return;
    const meta = (lead.metadata && typeof lead.metadata === 'object' && !Array.isArray(lead.metadata)) ? (lead.metadata as Record<string, unknown>) : {};
    const sentIds: string[] = Array.isArray(meta.welcomeMediaSentTopicIds) ? (meta.welcomeMediaSentTopicIds as string[]) : [];
    if (sentIds.includes(topicId)) return;

    const topic = await this.prisma.tenantTopic.findFirst({
      where: { id: topicId, tenantId },
      select: { welcomeVoiceUrl: true, welcomeImageUrl: true, welcomeImageUrls: true },
    });
    if (!topic) return;

    const toSend: { url: string; type: 'audio' | 'image' }[] = [];
    if (topic.welcomeVoiceUrl?.trim() && !topic.welcomeVoiceUrl.includes('localhost')) {
      toSend.push({ url: topic.welcomeVoiceUrl.trim(), type: 'audio' });
    }
    if (topic.welcomeImageUrl?.trim() && !topic.welcomeImageUrl.includes('localhost')) {
      toSend.push({ url: topic.welcomeImageUrl.trim(), type: 'image' });
    }
    const extras = Array.isArray(topic.welcomeImageUrls) ? topic.welcomeImageUrls : [];
    for (const u of extras) {
      const url = typeof u === 'string' ? u : String(u ?? '').trim();
      if (url && !url.includes('localhost')) toSend.push({ url, type: 'image' });
    }

    const audioItems = toSend.filter((x) => x.type === 'audio');
    const imageItems = toSend.filter((x) => x.type === 'image');
    for (const { url, type } of audioItems) {
      await this.sendMediaToLead(tenantId, leadId, url, type);
    }
    if (imageItems.length > 0) {
      await Promise.all(imageItems.map(({ url }) => this.sendMediaToLead(tenantId, leadId, url, 'image', '')));
    }
    const newSentIds = [...sentIds, topicId];
    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        welcomeMediaSentAt: new Date(),
        metadata: { ...meta, welcomeMediaSentTopicIds: newSentIds } as Prisma.InputJsonValue,
      },
    });
  }

  /** Отправить каталог по теме: все фото + документы (PDF) — по запросу «скинь каталог», «пришли фото» и т.д. */
  async sendCatalogImagesForTopic(tenantId: string, leadId: string, topicId: string | null): Promise<void> {
    if (!topicId) return;
    const topic = await this.prisma.tenantTopic.findFirst({
      where: { id: topicId, tenantId },
      select: { welcomeImageUrl: true, welcomeImageUrls: true, welcomeDocumentUrls: true },
    });
    if (!topic) return;

    const imageUrls: string[] = [];
    if (topic.welcomeImageUrl?.trim() && !topic.welcomeImageUrl.includes('localhost')) {
      imageUrls.push(topic.welcomeImageUrl.trim());
    }
    const extras = Array.isArray(topic.welcomeImageUrls) ? topic.welcomeImageUrls : [];
    for (const u of extras) {
      const url = typeof u === 'string' ? u : String(u ?? '').trim();
      if (url && !url.includes('localhost')) imageUrls.push(url);
    }

    const docUrls: string[] = [];
    const docArr = Array.isArray(topic.welcomeDocumentUrls) ? topic.welcomeDocumentUrls : [];
    for (const u of docArr) {
      const url = typeof u === 'string' ? u : String(u ?? '').trim();
      if (url && !url.includes('localhost')) docUrls.push(url);
    }

    const imagePromises = imageUrls.map((url) => this.sendMediaToLead(tenantId, leadId, url, 'image', ''));
    const docPromises = docUrls.map((url) => this.sendMediaToLead(tenantId, leadId, url, 'document', ''));
    await Promise.all([...imagePromises, ...docPromises]);
  }

  /** Запрос подробностей: «Можно узнать об этом подробнее?», «Расскажите подробнее» — отправляем голос + каталог */
  isRequestForMoreInfo(text: string): boolean {
    const t = (text ?? '').toLowerCase().replace(/\s+/g, ' ');
    const phrases = [
      'подробнее', 'узнать об этом', 'узнать подробнее', 'расскажите подробнее',
      'расскажите об этом', 'можно узнать', 'хочу узнать', 'интересует подробнее',
      'толығырақ', 'толығымен', 'бұл туралы',
    ];
    return phrases.some((p) => t.includes(p));
  }

  /** Запрос каталога/фото: «скинь каталог», «пришли фото», «прайс» и т.д. */
  isCatalogRequest(text: string): boolean {
    const t = (text ?? '').toLowerCase().replace(/\s+/g, ' ');
    const catalogPhrases = [
      'каталог', 'скинь каталог', 'пришли каталог', 'пришлите каталог',
      'скинь фото', 'пришли фото', 'пришлите фото', 'фото скинь',
      'прайс', 'скинь прайс', 'пришли прайс', 'пришлите прайс',
      'прайс-лист', 'каталог скинь', 'фото каталог',
    ];
    return catalogPhrases.some((p) => t.includes(p));
  }

  /** Fallback: отправить ссылку на медиа текстом (ChatFlow не имеет send-media). */
  private async sendMediaLinkAsText(
    tenantId: string,
    leadId: string,
    mediaUrl: string,
    type: 'audio' | 'image' | 'document',
  ): Promise<boolean> {
    const label = type === 'audio' ? '🎵 Голосовое' : type === 'image' ? '🖼 Фото' : '📎 Документ';
    const body = `${label}: ${mediaUrl}`;
    const r = await this.sendToLead(tenantId, leadId, body);
    return r.sent;
  }
}
