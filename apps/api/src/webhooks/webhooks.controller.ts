import { Body, Controller, Param, Post } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SystemLogsService } from '../system/system.logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

/** Нормализует номер телефона до цифр (для поиска лида). */
function normalizePhone(v: unknown): string {
  const s = typeof v === 'string' ? v : String(v ?? '');
  return s.replace(/\D/g, '');
}

/** Достаёт из тела вебхука ChatFlow/WhatsApp текст сообщения и номер отправителя. */
function parseChatFlowBody(body: Record<string, unknown>): { text: string; phone: string } | null {
  let text: string | undefined;
  let phone: string | undefined;

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

  // Вариант: message.text, message.from или from в корне
  const msg = body.message as Record<string, unknown> | undefined;
  if (msg && typeof msg === 'object') {
    if (text === undefined) text = typeof msg.text === 'string' ? msg.text : (msg.body as string);
    if (phone === undefined) phone = (msg.from ?? body.from) as string | undefined;
  }
  if (text === undefined && typeof body.text === 'string') text = body.text;
  if (text === undefined && typeof body.body === 'string') text = body.body;
  if (text === undefined && typeof body.content === 'string') text = body.content;
  if (text === undefined && typeof body.messageText === 'string') text = body.messageText;
  if (phone === undefined && body.phone !== undefined) phone = String(body.phone);
  if (phone === undefined && body.from !== undefined) phone = String(body.from);
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
  return { text: text.trim(), phone: normalizedPhone };
}

@Controller('webhooks/chatflow')
export class WebhooksController {
  constructor(
    private logs: SystemLogsService,
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

  @Post(':tenantId')
  async chatflow(
    @Param('tenantId') tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      return { received: false, error: 'Tenant not found' };
    }

    await this.logs.log({
      tenantId,
      category: 'whatsapp',
      message: 'ChatFlow webhook received',
      meta: JSON.parse(JSON.stringify(body)) as Prisma.JsonValue,
    });

    const parsed = parseChatFlowBody(body);
    if (!parsed) {
      const bodyKeys = Object.keys(body);
      await this.logs.log({
        tenantId,
        category: 'whatsapp',
        message: 'ChatFlow: не удалось извлечь text/phone из тела запроса',
        meta: { bodyKeys, bodySample: JSON.stringify(body).slice(0, 500) } as Prisma.JsonValue,
      });
      return {
        received: true,
        tenantId,
        reply: null,
        debug: { reason: 'parse_failed', bodyKeys },
      };
    }

    const { text, phone } = parsed;

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
          name: null,
        },
      });
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

    return { received: true, tenantId, reply };
  }
}
