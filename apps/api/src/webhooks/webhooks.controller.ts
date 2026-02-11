import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SystemLogsService } from '../system/system.logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

/** Нормализует номер телефона до цифр (для поиска лида). */
function normalizePhone(v: unknown): string {
  const s = typeof v === 'string' ? v : String(v ?? '');
  return s.replace(/\D/g, '');
}

/** Результат парсинга: текст, телефон, опционально имя отправителя. */
type ParsedIncoming = { text: string; phone: string; name?: string };

/** Достаёт из тела вебхука ChatFlow/WhatsApp текст сообщения и номер отправителя. */
function parseChatFlowBody(body: Record<string, unknown>): ParsedIncoming | null {
  let text: string | undefined;
  let phone: string | undefined;
  let name: string | undefined;

  // Формат ChatFlow (как у тебя было): sender.id, sender.name, message.text / message.caption
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

  // Вариант: массив messages (первое сообщение)
  const messages = body.messages as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(messages) && messages.length > 0) {
    const first = messages[0];
    if (text === undefined && typeof first?.text === 'string') text = first.text;
    if (text === undefined && first?.body !== undefined) text = String(first.body);
    const firstText = first?.text as Record<string, unknown> | undefined;
    if (text === undefined && firstText && typeof firstText.body === 'string') text = firstText.body;
    if (phone === undefined && first?.from !== undefined) phone = String(first.from);
    const ctx = first?.context as Record<string, unknown> | undefined;
    if (phone === undefined && ctx?.from !== undefined) phone = String(ctx.from);
  }

  const normalizedPhone = phone ? normalizePhone(phone) : '';
  if (!text || text.trim() === '' || normalizedPhone.length < 10) return null;
  return { text: text.trim(), phone: normalizedPhone, name: name?.trim() || undefined };
}

/** Парсит text и phone из query-параметров (если ChatFlow передаёт данные в URL). */
function parseFromQuery(query: Record<string, unknown>): { text: string; phone: string } | null {
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
  return { text: text.trim(), phone };
}

@Controller('webhooks/chatflow')
export class WebhooksController {
  constructor(
    private logs: SystemLogsService,
    private prisma: PrismaService,
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
      parsed = parseFromQuery(query);
    }
    if (!parsed) {
      const bodyKeys = Object.keys(body);
      await this.logs.log({
        tenantId,
        category: 'whatsapp',
        message: 'ChatFlow: не удалось извлечь text/phone из тела запроса',
        meta: { bodyKeys, bodySample: JSON.stringify(body).slice(0, 500), queryKeys: Object.keys(query) } as Prisma.JsonValue,
      });
      return {
        received: true,
        tenantId,
        reply: null,
        debug: { reason: 'parse_failed', bodyKeys, queryKeys: Object.keys(query) },
      };
    }

    const { text, phone, name: senderName } = parsed;

    let lead = await this.prisma.lead.findFirst({
      where: { tenantId, phone },
    });
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
        },
      });
    } else if (senderName && !lead.name) {
      await this.prisma.lead.update({ where: { id: lead.id }, data: { name: senderName } });
    }

    let reply: string | null = null;
    try {
      const result = await this.ai.handleFakeIncoming({
        tenantId,
        leadId: lead.id,
        text,
      });
      reply = result.reply ?? null;
    } catch (err) {
      const errMsg = (err as Error).message;
      await this.logs.log({
        tenantId,
        category: 'whatsapp',
        message: `ChatFlow: ошибка AI при ответе лиду ${lead.id}: ${errMsg}`,
        meta: { leadId: lead.id, phone, text },
      });
      return {
        received: true,
        tenantId,
        reply: null,
        debug: { reason: 'ai_error', error: errMsg },
      };
    }

    // Отправить ответ в WhatsApp через API ChatFlow (GET send-text), если заданы token и instance_id
    let sentViaChatFlow = false;
    if (reply) {
      const settings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId },
      });
      if (settings?.chatflowApiToken && settings?.chatflowInstanceId) {
        const jid = `${phone}@s.whatsapp.net`;
        const url = new URL('https://app.chatflow.kz/api/v1/send-text');
        url.searchParams.set('token', settings.chatflowApiToken);
        url.searchParams.set('instance_id', settings.chatflowInstanceId);
        url.searchParams.set('jid', jid);
        url.searchParams.set('msg', reply);
        try {
          const res = await fetch(url.toString());
          const data = (await res.json()) as { success?: boolean; message?: string };
          sentViaChatFlow = data?.success === true;
          if (!sentViaChatFlow) {
            await this.logs.log({
              tenantId,
              category: 'whatsapp',
              message: `ChatFlow send-text: отправка не удалась`,
              meta: { jid, status: res.status, response: data },
            });
          }
        } catch (sendErr) {
          await this.logs.log({
            tenantId,
            category: 'whatsapp',
            message: `ChatFlow send-text: ошибка запроса — ${(sendErr as Error).message}`,
            meta: { jid },
          });
        }
      }
    }

    return { received: true, tenantId, reply, sentViaChatFlow };
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

    const { text, phone } = parsed;
    let lead = await this.prisma.lead.findFirst({ where: { tenantId, phone } });
    if (!lead) {
      const firstStage = await this.prisma.pipelineStage.findFirst({ where: { tenantId }, orderBy: { order: 'asc' } });
      if (!firstStage) return { received: true, tenantId, reply: null, debug: { reason: 'no_pipeline_stages' } };
      lead = await this.prisma.lead.create({ data: { tenantId, stageId: firstStage.id, phone, name: null } });
    }

    let reply: string | null = null;
    try {
      const result = await this.ai.handleFakeIncoming({ tenantId, leadId: lead.id, text });
      reply = result.reply ?? null;
    } catch (err) {
      const errMsg = (err as Error).message;
      await this.logs.log({ tenantId, category: 'whatsapp', message: `ChatFlow GET: ошибка AI — ${errMsg}`, meta: { leadId: lead.id } });
      return { received: true, tenantId, reply: null, debug: { reason: 'ai_error', error: errMsg } };
    }

    let sentViaChatFlow = false;
    if (reply) {
      const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
      if (settings?.chatflowApiToken && settings?.chatflowInstanceId) {
        const jid = `${phone}@s.whatsapp.net`;
        const url = new URL('https://app.chatflow.kz/api/v1/send-text');
        url.searchParams.set('token', settings.chatflowApiToken);
        url.searchParams.set('instance_id', settings.chatflowInstanceId);
        url.searchParams.set('jid', jid);
        url.searchParams.set('msg', reply);
        try {
          const res = await fetch(url.toString());
          const data = (await res.json()) as { success?: boolean };
          sentViaChatFlow = data?.success === true;
        } catch {
          /* ignore */
        }
      }
    }
    return { received: true, tenantId, reply, sentViaChatFlow };
  }
}
