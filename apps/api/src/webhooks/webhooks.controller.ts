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

  // Вариант: message.text, message.from или from в корне
  const msg = body.message as Record<string, unknown> | undefined;
  if (msg && typeof msg === 'object') {
    text = typeof msg.text === 'string' ? msg.text : (msg.body as string);
    phone = (msg.from ?? body.from) as string | undefined;
  }
  if (text === undefined && typeof body.text === 'string') text = body.text;
  if (phone === undefined && body.phone !== undefined) phone = String(body.phone);
  if (phone === undefined && body.from !== undefined) phone = String(body.from);

  // Вариант: массив messages (первое сообщение)
  const messages = body.messages as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(messages) && messages.length > 0) {
    const first = messages[0];
    if (text === undefined && typeof first?.text === 'string') text = first.text;
    if (text === undefined && first?.body !== undefined) text = String(first.body);
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
      return { received: true, tenantId, reply: null };
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
        return { received: true, tenantId, reply: null };
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
      await this.logs.log({
        tenantId,
        category: 'whatsapp',
        message: `ChatFlow: ошибка AI при ответе лиду ${lead.id}: ${(err as Error).message}`,
        meta: { leadId: lead.id, phone, text },
      });
    }

    return { received: true, tenantId, reply };
  }
}
