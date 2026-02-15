import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { MessageDirection, MessageSource, Prisma } from '@prisma/client';
import { SystemLogsService } from '../system/system.logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { FollowupsSchedulerService } from '../followups/followups.scheduler.service';
import { TranscribeService } from './transcribe.service';
import { AiService } from '../ai/ai.service';

/** Нормализует номер телефона до цифр (для поиска лида). */
function normalizePhone(v: unknown): string {
  const s = typeof v === 'string' ? v : String(v ?? '');
  return s.replace(/\D/g, '');
}

/** Результат парсинга: текст, телефон, опционально имя отправителя, опционально идентификатор канала (instance_id). */
type ParsedIncoming = { text: string; phone: string; name?: string; channelExternalId?: string };

/** Рекурсивно ищет строку текста в объекте (форматы Baileys, обёртки конструкторов). Глубина до 5. */
function extractTextRecursive(obj: unknown, depth = 0): string | undefined {
  if (depth > 5 || obj == null) return undefined;
  if (typeof obj === 'string' && obj.trim().length > 0) return obj;
  if (typeof obj !== 'object') return undefined;
  const o = obj as Record<string, unknown>;
  for (const key of ['text', 'body', 'message', 'content', 'conversation', 'caption', 'messageText']) {
    const v = o[key];
    if (typeof v === 'string' && v.trim()) return v;
    if (v && typeof v === 'object') {
      const inner = (v as Record<string, unknown>).body ?? (v as Record<string, unknown>).text ?? v;
      const found = extractTextRecursive(inner, depth + 1);
      if (found) return found;
    }
  }
  for (const v of Object.values(o)) {
    const found = extractTextRecursive(v, depth + 1);
    if (found) return found;
  }
  return undefined;
}

/** Достаёт из тела вебхука ChatFlow/WhatsApp текст сообщения и номер отправителя. */
function parseChatFlowBody(body: Record<string, unknown>): ParsedIncoming | null {
  let text: string | undefined;
  let phone: string | undefined;
  let name: string | undefined;

  // Формат ChatFlow (messageType, message, metadata.remoteJid, metadata.sender, mediaData)
  if (typeof body.message === 'string') text = body.message;
  const metadata = body.metadata as Record<string, unknown> | undefined;
  if (metadata && typeof metadata === 'object') {
    if (metadata.remoteJid !== undefined) phone = String(metadata.remoteJid);
    if (typeof metadata.sender === 'string') name = metadata.sender;
  }

  // Голосовые/медиа: если текст пустой, но есть mediaData, подставляем понятный плейсхолдер
  const mediaData = body.mediaData as Record<string, unknown> | undefined;
  if ((!text || !text.trim()) && mediaData && typeof mediaData === 'object') {
    const mediaType = typeof mediaData.type === 'string' ? mediaData.type.toLowerCase() : '';
    if (mediaType === 'audio') text = '[Голосовое сообщение]';
    else if (mediaType === 'image') text = '[Фото]';
    else if (mediaType === 'video') text = '[Видео]';
    else text = '[Медиа сообщение]';
  }

  // Формат ChatFlow (старый): sender.id, sender.name, message.text / message.caption
  const sender = body.sender as Record<string, unknown> | undefined;
  if (sender && typeof sender === 'object') {
    if (sender.id !== undefined) phone = String(sender.id);
    if (typeof sender.name === 'string') name = sender.name;
  }
  const msg = body.message as Record<string, unknown> | undefined;
  if (msg && typeof msg === 'object') {
    if (text === undefined && typeof msg.text === 'string') text = msg.text;
    if (text === undefined && typeof msg.caption === 'string') text = msg.caption;
    if (text === undefined && msg.body !== undefined) text = String(msg.body);
    if (text === undefined && typeof msg.conversation === 'string') text = msg.conversation;
    const ext = msg.extendedTextMessage as Record<string, unknown> | undefined;
    if (text === undefined && ext && typeof ext.text === 'string') text = ext.text;
    const img = msg.imageMessage as Record<string, unknown> | undefined;
    if (text === undefined && img && typeof img.caption === 'string') text = img.caption;
    if (phone === undefined && msg.from !== undefined) phone = String(msg.from);
  }

  // Формат Meta WhatsApp Cloud API: entry[0].changes[0].value.messages[0]
  const entry = body.entry as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(entry) && entry.length > 0) {
    const changes = entry[0]?.changes as Array<Record<string, unknown>> | undefined;
    const value = Array.isArray(changes) && changes.length > 0 ? (changes[0]?.value as Record<string, unknown>) : undefined;
    const messages = value?.messages as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(messages) && messages.length > 0) {
      const first = messages[0];
      const textObj = first?.text as Record<string, unknown> | undefined;
      if (text === undefined && textObj && typeof textObj.body === 'string') text = textObj.body;
      if (text === undefined) text = extractTextRecursive(first);
      if (phone === undefined && first?.from !== undefined) phone = String(first.from);
      const contacts = value?.contacts as Array<Record<string, unknown>> | undefined;
      if (phone === undefined && Array.isArray(contacts) && contacts.length > 0 && contacts[0]?.wa_id)
        phone = String(contacts[0].wa_id);
    }
  }

  // Ещё раз message / from в корне (если не вытащили выше)
  if (msg && typeof msg === 'object') {
    if (text === undefined) text = typeof msg.text === 'string' ? msg.text : (msg.body as string);
    if (phone === undefined) phone = (msg.from ?? body.from) as string | undefined;
  }
  if (phone === undefined && body.from !== undefined) phone = String(body.from);
  // Вложенные обёртки: data, payload (часто у конструкторов ботов)
  const data = body.data as Record<string, unknown> | undefined;
  const payload = body.payload as Record<string, unknown> | undefined;
  if (data && typeof data === 'object') {
    if (text === undefined && typeof data.text === 'string') text = data.text;
    if (text === undefined && typeof data.body === 'string') text = data.body;
    if (text === undefined && typeof data.message === 'string') text = data.message;
    const dataMsgs = data.messages as Array<Record<string, unknown>> | undefined;
    if (text === undefined && Array.isArray(dataMsgs) && dataMsgs.length > 0) {
      text = extractTextRecursive(dataMsgs[0]);
    }
    if (phone === undefined && data.from !== undefined) phone = String(data.from);
    if (phone === undefined && data.phone !== undefined) phone = String(data.phone);
    if (phone === undefined && data.jid !== undefined) phone = String(data.jid);
  }
  if (payload && typeof payload === 'object') {
    if (text === undefined && typeof payload.text === 'string') text = payload.text;
    if (text === undefined && typeof payload.body === 'string') text = payload.body;
    if (phone === undefined && payload.from !== undefined) phone = String(payload.from);
    if (phone === undefined && payload.phone !== undefined) phone = String(payload.phone);
    if (phone === undefined && payload.jid !== undefined) phone = String(payload.jid);
  }
  if (text === undefined && typeof body.text === 'string') text = body.text;
  if (text === undefined && typeof body.body === 'string') text = body.body;
  if (text === undefined && typeof body.content === 'string') text = body.content;
  if (text === undefined && typeof body.messageText === 'string') text = body.messageText;
  if (text === undefined && typeof body.message === 'string') text = body.message;
  if (phone === undefined && body.phone !== undefined) phone = String(body.phone);
  if (phone === undefined && body.from !== undefined) phone = String(body.from);
  if (phone === undefined && body.jid !== undefined) phone = String(body.jid);
  if (phone === undefined && body.sender !== undefined) phone = String(body.sender);
  if (phone === undefined && body.senderId !== undefined) phone = String(body.senderId);
  if (phone === undefined && body.userId !== undefined) phone = String(body.userId);
  const contact = body.contact as Record<string, unknown> | undefined;
  if (phone === undefined && contact?.phone !== undefined) phone = String(contact.phone);

  // Вариант: массив messages (первое сообщение), в т.ч. messages[0].message (вложенный объект Baileys)
  const messages = body.messages as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(messages) && messages.length > 0) {
    const first = messages[0];
    if (text === undefined && typeof first?.text === 'string') text = first.text;
    if (text === undefined && first?.body !== undefined) text = String(first.body);
    const firstText = first?.text as Record<string, unknown> | undefined;
    if (text === undefined && firstText && typeof firstText.body === 'string') text = firstText.body;
    const firstMsg = first?.message as Record<string, unknown> | undefined;
    if (text === undefined && firstMsg) text = extractTextRecursive(firstMsg);
    if (phone === undefined && first?.from !== undefined) phone = String(first.from);
    const ctx = first?.context as Record<string, unknown> | undefined;
    if (phone === undefined && ctx?.from !== undefined) phone = String(ctx.from);
  }

  // Идентификатор канала/номера (ChatFlow: instance_id — один webhook на несколько номеров)
  let channelExternalId: string | undefined;
  if (typeof body.instance_id === 'string' && body.instance_id.trim()) channelExternalId = body.instance_id.trim();
  if (!channelExternalId && metadata?.instance_id !== undefined && typeof metadata.instance_id === 'string') channelExternalId = (metadata.instance_id as string).trim();
  if (!channelExternalId && typeof body.channelId === 'string' && body.channelId.trim()) channelExternalId = body.channelId.trim();
  const metaContext = metadata?.context as Record<string, unknown> | undefined;
  if (!channelExternalId && metaContext?.instance_id !== undefined && typeof metaContext.instance_id === 'string') channelExternalId = (metaContext.instance_id as string).trim();
  if (!channelExternalId && metaContext?.instanceId !== undefined && typeof metaContext.instanceId === 'string') channelExternalId = (metaContext.instanceId as string).trim();
  const bodyContext = body.context as Record<string, unknown> | undefined;
  if (!channelExternalId && bodyContext?.instance_id !== undefined && typeof bodyContext.instance_id === 'string') channelExternalId = (bodyContext.instance_id as string).trim();
  if (!channelExternalId && bodyContext?.instanceId !== undefined && typeof bodyContext.instanceId === 'string') channelExternalId = (bodyContext.instanceId as string).trim();
  if (!channelExternalId && messages && Array.isArray(messages) && messages.length > 0) {
    const firstCtx = (messages[0] as Record<string, unknown>)?.context as Record<string, unknown> | undefined;
    if (firstCtx?.instance_id !== undefined && typeof firstCtx.instance_id === 'string') channelExternalId = (firstCtx.instance_id as string).trim();
    else if (firstCtx?.instanceId !== undefined && typeof firstCtx.instanceId === 'string') channelExternalId = (firstCtx.instanceId as string).trim();
  }
  if (!channelExternalId && data?.instance_id !== undefined && typeof data.instance_id === 'string') channelExternalId = (data.instance_id as string).trim();
  if (!channelExternalId && payload?.instance_id !== undefined && typeof payload.instance_id === 'string') channelExternalId = (payload.instance_id as string).trim();
  const entryValue = Array.isArray(entry) && entry[0]?.changes?.[0]?.value as Record<string, unknown> | undefined;
  if (!channelExternalId && entryValue?.metadata) {
    const em = entryValue.metadata as Record<string, unknown>;
    if (typeof em.instance_id === 'string' && em.instance_id.trim()) channelExternalId = (em.instance_id as string).trim();
  }

  // Последняя попытка: рекурсивный поиск текста (разные обёртки ChatFlow/Baileys)
  if (!text || !text.trim()) text = extractTextRecursive(body);

  const normalizedPhone = phone ? normalizePhone(phone) : '';
  if (!text || text.trim() === '' || normalizedPhone.length < 10) return null;
  return { text: text.trim(), phone: normalizedPhone, name: name?.trim() || undefined, channelExternalId };
}

/** Парсит text, phone и опционально channelExternalId из query. */
function parseFromQuery(query: Record<string, unknown>): { text: string; phone: string; channelExternalId?: string } | null {
  const text =
    typeof query.text === 'string' ? query.text :
    typeof query.msg === 'string' ? query.msg :
    undefined;
  const phoneRaw =
    query.from !== undefined ? String(query.from) :
    query.phone !== undefined ? String(query.phone) :
    query.jid !== undefined ? String(query.jid) :
    undefined;
  const phone = phoneRaw ? normalizePhone(phoneRaw) : '';
  if (!text || text.trim() === '' || phone.length < 10) return null;
  const channelExternalId =
    typeof query.instance_id === 'string' ? query.instance_id.trim() :
    typeof query.channelId === 'string' ? query.channelId.trim() :
    undefined;
  return { text: text.trim(), phone, channelExternalId };
}

const DELAY_MS = 30 * 1000; // 30 сек после последнего входящего (Этап 3)

/** По тексту сообщения определяет тему (для ChatFlow: какое голосовое отправить). Возвращает slug: panels | laminate | linoleum | tractor | null. */
function detectTopicSlug(text: string): string | null {
  const lower = text.toLowerCase().replace(/[іәғқңүұһө]/g, (c) => ({ і: 'и', ө: 'о', ұ: 'у', ү: 'у', ғ: 'г', қ: 'к', ң: 'н', ҳ: 'х', ә: 'а' }[c] ?? c));
  const keywords: Record<string, string[]> = {
    panels: ['панел', 'сэндвич', 'фасад', 'утеплен'],
    laminate: ['ламинат'],
    linoleum: ['линолеум'],
    tractor: ['погрузчик', 'трактор', 'техника'],
  };
  for (const [slug, kws] of Object.entries(keywords)) {
    if (kws.some((kw) => lower.includes(kw))) return slug;
  }
  return null;
}

@Controller('webhooks/chatflow')
export class WebhooksController {
  constructor(
    private logs: SystemLogsService,
    private prisma: PrismaService,
    private messages: MessagesService,
    private followups: FollowupsSchedulerService,
    private transcribe: TranscribeService,
    private ai: AiService,
  ) {}

  /** Вход по ключу: POST /webhooks/chatflow?key=WEBHOOK_KEY (tenant определяется по TenantSettings.webhookKey). */
  @Post()
  async chatflowByKey(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    const key = query.key;
    if (typeof key !== 'string' || !key.trim()) {
      return { received: false, error: 'Missing key' };
    }
    const settings = await this.prisma.tenantSettings.findFirst({
      where: { webhookKey: key.trim() },
    });
    if (!settings) {
      return { received: false, error: 'Tenant not found' };
    }
    return this.handleChatflow(settings.tenantId, body, query);
  }

  @Post(':tenantId')
  async chatflow(
    @Param('tenantId') tenantId: string,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      return { received: false, error: 'Tenant not found' };
    }
    return this.handleChatflow(tenantId, body, query);
  }

  private async handleChatflow(
    tenantId: string,
    body: Record<string, unknown>,
    query: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    await this.logs.log({
      tenantId,
      category: 'whatsapp',
      message: 'ChatFlow webhook received',
      meta: JSON.parse(JSON.stringify(body)) as Prisma.JsonValue,
    });

    let parsed = parseChatFlowBody(body);
    if (!parsed && (Object.keys(query).length > 0)) {
      const q = parseFromQuery(query);
      if (q) parsed = { text: q.text, phone: q.phone, channelExternalId: q.channelExternalId };
    }
    if (!parsed) {
      const bodyKeys = Object.keys(body);
      const bodyFull = JSON.stringify(body);
      const reason = bodyFull.length > 100 ? 'text_or_phone_empty' : 'body_empty_or_invalid';
      await this.logs.log({
        tenantId,
        category: 'whatsapp',
        message: 'ChatFlow: не удалось извлечь text/phone — проверьте формат payload от номера/instance',
        meta: {
          bodyKeys,
          bodySample: bodyFull.slice(0, 4000),
          queryKeys: Object.keys(query),
          reason,
        } as Prisma.JsonValue,
      });
      return {
        received: true,
        tenantId,
        reply: null,
        debug: { reason: 'parse_failed', bodyKeys, queryKeys: Object.keys(query) },
      };
    }

    const { text, phone, name: senderName, channelExternalId } = parsed;

    // Канал: из webhook приходит instance_id (или channelId); если нет — используем "default" (один номер на тенанта).
    const channel = await this.prisma.tenantChannel.findFirst({
      where: { tenantId, externalId: channelExternalId || 'default' },
    });
    const resolvedChannelId = channel?.id ?? null;

    let lead = await this.prisma.lead.findFirst({ where: { tenantId, phone } });
    if (lead && !lead.channelId && resolvedChannelId) {
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { channelId: resolvedChannelId },
      });
    }
    if (!lead) {
      const firstStage = await this.prisma.pipelineStage.findFirst({
        where: { tenantId },
        orderBy: { order: 'asc' },
      });
      if (!firstStage) {
        await this.logs.log({
          tenantId,
          category: 'whatsapp',
          message: 'ChatFlow: нет ни одной стадии воронки, лид не создан',
          meta: { phone, text },
        });
        return { received: true, tenantId, reply: null, debug: { reason: 'no_pipeline_stages' } };
      }
      lead = await this.prisma.lead.create({
        data: {
          tenantId,
          stageId: firstStage.id,
          phone,
          name: senderName || null,
          channelId: resolvedChannelId,
        },
      });
    } else if (senderName && !lead.name) {
      await this.prisma.lead.update({ where: { id: lead.id }, data: { name: senderName } });
    }

    const mediaData = body.mediaData as Record<string, unknown> | undefined;
    const isVoice = text === '[Голосовое сообщение]' && mediaData && typeof mediaData === 'object'
      && typeof mediaData.type === 'string' && mediaData.type.toLowerCase() === 'audio'
      && typeof mediaData.url === 'string' && (mediaData.url as string).trim();
    let messageBody = text;
    if (isVoice) {
      const settings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { openaiApiKey: true, transcriptionLanguage: true },
      });
      if (settings?.openaiApiKey?.startsWith('sk-')) {
        let lang: 'kk' | 'ru' | undefined =
          settings.transcriptionLanguage === 'kk' || settings.transcriptionLanguage === 'ru'
            ? settings.transcriptionLanguage
            : undefined;
        if (lang === undefined) {
          const recent = await this.prisma.message.findMany({
            where: { leadId: lead.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { body: true },
          });
          const hasKazakh = recent.some((m) => m.body != null && /[әғқңүұһөі]/i.test(m.body));
          if (hasKazakh) lang = 'kk';
        }
        const transcript = await this.transcribe.transcribeFromUrl(
          (mediaData!.url as string).trim(),
          settings.openaiApiKey,
          { language: lang },
        );
        if (transcript) messageBody = transcript;
        else messageBody = '';
      } else {
        messageBody = '';
      }
    }
    const incomingMediaUrl = isVoice && typeof mediaData!.url === 'string' ? (mediaData!.url as string).trim() : undefined;
    await this.messages.createForLead(tenantId, lead.id, {
      source: MessageSource.human,
      direction: MessageDirection.in,
      body: messageBody,
      mediaUrl: incomingMediaUrl,
    });
    this.followups.cancelLeadFollowUps(lead.id);

    // Режим «приветствие»: не планируем крон, сразу генерируем ответ и возвращаем reply + URL медиа. Отправку делает ChatFlow (текст через send-text, медиа — своими узлами).
    const isWelcome = query.welcome === true || query.welcome === '1' || body.welcome === true || body.welcome === '1';
    if (isWelcome) {
      const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
      const hasHumanReplied = await this.prisma.message.findFirst({
        where: { leadId: lead.id, source: MessageSource.human, direction: MessageDirection.out },
      });
      if (settings?.aiEnabled && lead.aiActive && !hasHumanReplied) {
        const result = await this.ai.handleFakeIncoming({
          tenantId,
          leadId: lead.id,
          text: messageBody,
          skipSaveIncoming: true,
        });
        return {
          received: true,
          tenantId,
          reply: result.reply ?? null,
        };
      }
      return { received: true, tenantId, reply: null };
    }

    // Обычный режим: откладываем ответ на 1 мин (крон отправит текст + попытается медиа).
    // Не планируем AI, если менеджер уже общался с этим клиентом (до подключения бота).
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });
    const hasHumanReplied = await this.prisma.message.findFirst({
      where: { leadId: lead.id, source: MessageSource.human, direction: MessageDirection.out },
    });
    if (settings?.aiEnabled && lead.aiActive && !hasHumanReplied) {
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { aiReplyScheduledAt: new Date(Date.now() + DELAY_MS) },
      });
    }

    return {
      received: true,
      tenantId,
      reply: null,
      scheduledIn: 30,
    };
  }

  /** GET с параметрами в URL (text/msg + from/phone/jid). */
  @Get(':tenantId')
  async chatflowGet(
    @Param('tenantId') tenantId: string,
    @Query() query: Record<string, unknown>,
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return { received: false, error: 'Tenant not found' };

    await this.logs.log({
      tenantId,
      category: 'whatsapp',
      message: 'ChatFlow webhook received (GET)',
      meta: JSON.parse(JSON.stringify(query)) as Prisma.JsonValue,
    });

    const parsed = parseFromQuery(query);
    if (!parsed) {
      await this.logs.log({
        tenantId,
        category: 'whatsapp',
        message: 'ChatFlow GET: не удалось извлечь text/phone из query',
        meta: { queryKeys: Object.keys(query) } as Prisma.JsonValue,
      });
      return { received: true, tenantId, reply: null, debug: { reason: 'parse_failed', queryKeys: Object.keys(query) } };
    }

    const { text, phone, channelExternalId } = parsed;
    const channel = await this.prisma.tenantChannel.findFirst({
      where: { tenantId, externalId: channelExternalId || 'default' },
    });
    const resolvedChannelId = channel?.id ?? null;
    let lead = await this.prisma.lead.findFirst({ where: { tenantId, phone } });
    if (lead && !lead.channelId && resolvedChannelId) {
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { channelId: resolvedChannelId },
      });
    }
    if (!lead) {
      const firstStage = await this.prisma.pipelineStage.findFirst({ where: { tenantId }, orderBy: { order: 'asc' } });
      if (!firstStage) return { received: true, tenantId, reply: null, debug: { reason: 'no_pipeline_stages' } };
      lead = await this.prisma.lead.create({
        data: { tenantId, stageId: firstStage.id, phone, name: null, channelId: resolvedChannelId },
      });
    }

    await this.messages.createForLead(tenantId, lead.id, {
      source: MessageSource.human,
      direction: MessageDirection.in,
      body: text,
    });
    this.followups.cancelLeadFollowUps(lead.id);
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    const hasHumanReplied = await this.prisma.message.findFirst({
      where: { leadId: lead.id, source: MessageSource.human, direction: MessageDirection.out },
    });
    if (settings?.aiEnabled && lead.aiActive && !hasHumanReplied) {
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { aiReplyScheduledAt: new Date(Date.now() + DELAY_MS) },
      });
    }
    const topicSlug = detectTopicSlug(text);
    return {
      received: true,
      tenantId,
      reply: null,
      scheduledIn: 30,
      topic: topicSlug ?? undefined,
    };
  }
}
