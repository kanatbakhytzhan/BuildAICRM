import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageSource, MessageDirection } from '@prisma/client';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(private prisma: PrismaService) {}

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

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        lastMessageAt: now,
        lastMessagePreview: data.body?.trim()
          ? data.body.slice(0, 120)
          : data.mediaUrl
            ? '🎵 Голосовое'
            : null,
        noResponseSince: data.direction === MessageDirection.out ? now : null,
      },
    });

    // Отправить исходящее голосовое в WhatsApp
    if (
      data.direction === MessageDirection.out &&
      data.source === MessageSource.human &&
      data.mediaUrl?.trim()
    ) {
      await this.sendMediaToLead(tenantId, lead.id, data.mediaUrl.trim(), 'audio');
    }

    // Отправить исходящее текстовое сообщение в WhatsApp
    if (
      data.direction === MessageDirection.out &&
      data.source === MessageSource.human &&
      data.body?.trim()
    ) {
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
      if (settings?.chatflowApiToken && instanceId) {
        const phone = String(lead.phone).replace(/\D/g, '');
        if (phone.length >= 10) {
          const jid = `${phone}@s.whatsapp.net`;
          try {
            const url = new URL('https://app.chatflow.kz/api/v1/send-text');
            url.searchParams.set('token', settings.chatflowApiToken);
            url.searchParams.set('instance_id', instanceId);
            url.searchParams.set('jid', jid);
            url.searchParams.set('msg', data.body!.trim());
            await fetch(url.toString());
          } catch {
            // не падаем: сообщение уже сохранено в CRM
          }
        }
      }
    }

    return message;
  }

  /** Отправить исходящее сообщение лиду в WhatsApp (тот же канал/номер, что у лида). Для AI и webhook. */
  async sendToLead(tenantId: string, leadId: string, body: string): Promise<boolean> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead || !body?.trim()) return false;
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
    if (!settings?.chatflowApiToken || !instanceId) return false;
    const phone = String(lead.phone).replace(/\D/g, '');
    if (phone.length < 10) return false;
    const jid = `${phone}@s.whatsapp.net`;
    const url = new URL('https://app.chatflow.kz/api/v1/send-text');
    url.searchParams.set('token', settings.chatflowApiToken);
    url.searchParams.set('instance_id', instanceId);
    url.searchParams.set('jid', jid);
    url.searchParams.set('msg', body.trim());
    try {
      const res = await fetch(url.toString());
      const data = (await res.json()) as { success?: boolean };
      return data?.success === true;
    } catch {
      return false;
    }
  }

  /** Отправить медиа (голосовое, фото, документ) лиду в WhatsApp через ChatFlow send-media. */
  async sendMediaToLead(
    tenantId: string,
    leadId: string,
    mediaUrl: string,
    type: 'audio' | 'image' | 'document',
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
    const mediaType = type === 'audio' ? 'ptt' : type;
    const baseUrl = 'https://app.chatflow.kz/api/v1';
    const payload = {
      token: settings.chatflowApiToken!,
      instance_id: instanceId,
      jid,
      url: mediaUrl.trim(),
      type: mediaType,
    };

    const tryFetch = async (method: 'GET' | 'POST', body?: string, contentType?: string): Promise<{ ok: boolean; text: string; res: Response }> => {
      const url = method === 'GET' ? `${baseUrl}/send-media?${new URLSearchParams(payload as Record<string, string>).toString()}` : `${baseUrl}/send-media`;
      const res = await fetch(url, {
        method,
        ...(body !== undefined && { headers: contentType ? { 'Content-Type': contentType } : {}, body }),
      });
      const text = await res.text();
      let parsed: { success?: boolean } = {};
      try {
        parsed = JSON.parse(text) as { success?: boolean };
      } catch {
        return { ok: false, text, res };
      }
      return { ok: parsed?.success === true, text, res };
    };

    try {
      let result = await tryFetch('GET');
      if (!result.ok && result.text.trimStart().startsWith('<!')) {
        result = await tryFetch('POST', new URLSearchParams(payload as Record<string, string>).toString(), 'application/x-www-form-urlencoded');
      }
      if (!result.ok && result.text.trimStart().startsWith('<!')) {
        result = await tryFetch('POST', JSON.stringify(payload), 'application/json');
      }
      if (result.ok) return true;
      if (result.text.trimStart().startsWith('<!')) {
        this.logger.warn(`sendMediaToLead: ChatFlow returned HTML (send-media не поддерживается), отправляю ссылку текстом tenantId=${tenantId} leadId=${leadId}`);
        return this.sendMediaLinkAsText(tenantId, leadId, mediaUrl.trim(), type);
      }
      this.logger.warn(`sendMediaToLead FAIL: ChatFlow API tenantId=${tenantId} leadId=${leadId} response=${result.text.slice(0, 300)}`);
      return this.sendMediaLinkAsText(tenantId, leadId, mediaUrl.trim(), type);
    } catch (err) {
      this.logger.warn(`sendMediaToLead FAIL: fetch error tenantId=${tenantId} leadId=${leadId} mediaUrl=${mediaUrl} error=${(err as Error).message}`);
      return this.sendMediaLinkAsText(tenantId, leadId, mediaUrl.trim(), type);
    }
  }

  /** Fallback: отправить ссылку на медиа текстом (ChatFlow не имеет send-media). */
  private sendMediaLinkAsText(
    tenantId: string,
    leadId: string,
    mediaUrl: string,
    type: 'audio' | 'image' | 'document',
  ): Promise<boolean> {
    const label = type === 'audio' ? '🎵 Голосовое' : type === 'image' ? '🖼 Фото' : '📎 Документ';
    const body = `${label}: ${mediaUrl}`;
    return this.sendToLead(tenantId, leadId, body);
  }
}
