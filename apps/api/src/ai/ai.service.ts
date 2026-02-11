import { Injectable, NotFoundException } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { FollowupsSchedulerService } from '../followups/followups.scheduler.service';
import { MessageDirection, MessageSource, Prisma } from '@prisma/client';
import { SystemLogsService } from '../system/system.logs.service';
import { SystemSettingsService } from '../system/system.settings.service';

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private messages: MessagesService,
    private followups: FollowupsSchedulerService,
    private logs: SystemLogsService,
    private systemSettings: SystemSettingsService,
  ) {}

  private mergeMetadata(
    current: Prisma.JsonValue | null,
    patch: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    const base =
      current && typeof current === 'object' && !Array.isArray(current)
        ? (current as Record<string, unknown>)
        : {};
    return { ...base, ...patch } as Prisma.InputJsonValue;
  }

  private extractMetadataFromText(
    current: Prisma.JsonValue | null,
    text: string,
  ): Prisma.InputJsonValue {
    const lower = text.toLowerCase();
    const patch: Record<string, unknown> = {};

    // Город (очень грубо, под текущего клиента)
    if (lower.includes('алматы')) {
      patch.city = 'Алматы';
    } else if (lower.includes('астана') || lower.includes('нур-султан')) {
      patch.city = 'Астана';
    }

    // Размеры: ищем шаблоны вида "10x20", "10 x 20", "10 на 20"
    const dimensionMatch =
      lower.match(/(\d+)\s*(x|х|\*)\s*(\d+)/) ||
      lower.match(/(\d+)\s*на\s*(\d+)/);
    if (dimensionMatch) {
      const a = Number(dimensionMatch[1]);
      const b = Number(dimensionMatch[3] ?? dimensionMatch[2]);
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        patch.dimensions = {
          length: a,
          width: b,
        };
      }
    }

    // Фундамент
    if (lower.includes('фундамент')) {
      if (lower.includes('без фунда') || lower.includes('нет фунда')) {
        patch.foundation = 'нет';
      } else if (lower.includes('есть фунда') || lower.includes('на фунда')) {
        patch.foundation = 'есть';
      } else {
        patch.foundation = 'уточнить';
      }
    }

    // Кол-во окон
    const windowsMatch = lower.match(/(\d+)\s*(окн)/);
    if (windowsMatch) {
      const count = Number(windowsMatch[1]);
      if (!Number.isNaN(count)) {
        patch.windowsCount = count;
      }
    }

    // Кол-во дверей
    const doorsMatch = lower.match(/(\d+)\s*(двер)/);
    if (doorsMatch) {
      const count = Number(doorsMatch[1]);
      if (!Number.isNaN(count)) {
        patch.doorsCount = count;
      }
    }

    // Когда перезвонить: «через полчаса», «жарты сагат», «бугин жарт сагат кейн», «через час», «завтра в 10»
    const callTime = this.parseSuggestedCallTime(text);
    if (callTime) {
      patch.suggestedCallAt = callTime.at;
      patch.suggestedCallNote = callTime.note;
    }

    if (Object.keys(patch).length === 0) {
      return (current ?? {}) as Prisma.InputJsonValue;
    }
    return this.mergeMetadata(current, patch);
  }

  /** Парсит из текста указание «когда перезвонить» и возвращает ISO-дату и подпись. */
  private parseSuggestedCallTime(text: string): { at: string; note: string } | null {
    const lower = text.toLowerCase().trim();
    const now = new Date();
    let at: Date | null = null;
    let note = '';

    // через полчаса / пол часа / жарты сагат / жарт сагат кейн / бугин жарт сагат кейн
    if (
      /(через\s+)?(полчаса|пол\s+часа|жарты?\s+сагат|сагат\s+кейн|полчаса\s+кейн)/.test(lower) ||
      /бугин\s+жарт\s+сагат/.test(lower)
    ) {
      at = new Date(now.getTime() + 30 * 60 * 1000);
      note = 'Через 30 мин';
    }
    // через час / через 1 час
    else if (/(через\s+)?(1\s+)?час[ау]?(\s+кейн)?/.test(lower) && !lower.includes('полчаса') && !lower.includes('жарты')) {
      at = new Date(now.getTime() + 60 * 60 * 1000);
      note = 'Через 1 час';
    }
    // через N минут
    else {
      const minsMatch = lower.match(/через\s+(\d+)\s*м(ин|инут)/);
      if (minsMatch) {
        const m = Number(minsMatch[1]);
        if (!Number.isNaN(m) && m > 0 && m < 1440) {
          at = new Date(now.getTime() + m * 60 * 1000);
          note = `Через ${m} мин`;
        }
      }
    }
    // завтра в 10 / завтра в 10:30
    if (!at && /завтра\s+в\s+(\d{1,2})(?::(\d{2}))?/.test(lower)) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const hourMatch = lower.match(/завтра\s+в\s+(\d{1,2})(?::(\d{2}))?/);
      if (hourMatch) {
        const h = Number(hourMatch[1]);
        const min = hourMatch[2] ? Number(hourMatch[2]) : 0;
        if (!Number.isNaN(h) && h >= 0 && h <= 23) {
          tomorrow.setHours(h, Number.isNaN(min) ? 0 : min, 0, 0);
          at = tomorrow;
          note = `Завтра в ${h}:${String(min).padStart(2, '0')}`;
        }
      }
    }

    if (!at) return null;
    return { at: at.toISOString(), note };
  }

  private formatMetadataForPrompt(metadata: Prisma.JsonValue | null): string {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';
    const m = metadata as Record<string, unknown>;
    const parts: string[] = [];
    if (m.city != null) parts.push(`Город: ${String(m.city)}`);
    if (m.dimensions != null && typeof m.dimensions === 'object' && !Array.isArray(m.dimensions)) {
      const d = m.dimensions as { length?: number; width?: number };
      if (d.length != null && d.width != null) parts.push(`Размеры (длина x ширина): ${d.length} x ${d.width}`);
    }
    if (m.foundation != null) parts.push(`Фундамент: ${String(m.foundation)}`);
    if (m.windowsCount != null) parts.push(`Окон: ${Number(m.windowsCount)}`);
    if (m.doorsCount != null) parts.push(`Дверей: ${Number(m.doorsCount)}`);
    if (m.suggestedCallAt != null || m.suggestedCallNote != null) {
      parts.push(`Перезвонить: ${m.suggestedCallNote != null ? String(m.suggestedCallNote) : new Date(String(m.suggestedCallAt)).toLocaleString('ru-RU')}`);
    }
    if (parts.length === 0) return '';
    return `\n\nУже известные данные по клиенту (не спрашивай их повторно, опирайся на них): ${parts.join('. ')}.`;
  }

  private async generateOpenAIReply(params: {
    leadId: string;
    systemPrompt: string | null;
    openaiApiKey: string;
    currentUserMessage: string;
    leadMetadata?: Prisma.JsonValue | null;
  }): Promise<string> {
    const recent = await this.prisma.message.findMany({
      where: { leadId: params.leadId },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });
    const contextBlock = this.formatMetadataForPrompt(params.leadMetadata ?? null);
    const systemContent = (params.systemPrompt?.trim() || 'Ты вежливый AI-ассистент компании. Отвечай кратко и по делу. Общайся на том же языке, что и клиент.') + contextBlock;
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...recent.map((m) => ({
        role: m.direction === MessageDirection.in ? ('user' as const) : ('assistant' as const),
        content: m.body || '',
      })),
      { role: 'user', content: params.currentUserMessage },
    ];
    const client = new OpenAI({ apiKey: params.openaiApiKey });
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
    });
    const content = completion.choices[0]?.message?.content?.trim();
    return content || 'Спасибо за сообщение! Мы скоро свяжемся с вами.';
  }

  async handleFakeIncoming(params: { tenantId: string; leadId: string; text: string }) {
    const { tenantId, leadId, text } = params;

    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: {
        stage: true,
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const systemSettings = await this.systemSettings.getSettings();
    if (!systemSettings.aiGlobalEnabled) {
      // Just record the incoming message without AI reply
      await this.messages.create(lead.id, {
        source: MessageSource.human,
        direction: MessageDirection.in,
        body: text,
      });
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: text.slice(0, 120),
          noResponseSince: null,
        },
      });
      return { leadId: lead.id, aiHandled: false, reply: undefined };
    }

    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    // Save incoming message from client
    await this.messages.create(lead.id, {
      source: MessageSource.human,
      direction: MessageDirection.in,
      body: text,
    });

    // Client replied – cancel pending follow-ups for this lead
    this.followups.cancelLeadFollowUps(lead.id);

    const now = new Date();
    let newScore = lead.leadScore;
    let newStageId: string | undefined;
    let decisionReason = 'сообщение не попало ни под одно правило';

    const newMetadata = this.extractMetadataFromText(lead.metadata ?? null, text);
    const meta = (newMetadata && typeof newMetadata === 'object' ? newMetadata : {}) as Record<string, unknown>;

    const lower = text.toLowerCase();
    if (lower.includes('не интересно') || lower.includes('отказ') || lower.includes('не актуально')) {
      newScore = 'cold';
      decisionReason = 'клиент явно отказался (\"не интересно\", \"отказ\", \"не актуально\")';
      const refusedStage = await this.prisma.pipelineStage.findFirst({
        where: { tenantId, type: 'refused' },
      });
      if (refusedStage) newStageId = refusedStage.id;
    } else if (meta.suggestedCallAt != null || meta.suggestedCallNote != null || lower.includes('звон') || lower.includes('созвон')) {
      newScore = 'hot';
      decisionReason = meta.suggestedCallAt != null ? 'указано время перезвона' : 'клиент хочет созвон';
      const wantsCall = await this.prisma.pipelineStage.findFirst({
        where: { tenantId, type: 'wants_call' },
      });
      if (wantsCall) newStageId = wantsCall.id;
    } else if (lower.includes('цена') || lower.includes('стоимость') || lower.includes('сколько')) {
      newScore = 'warm';
      decisionReason = 'клиент уточняет условия/цену';
      const inProgress = await this.prisma.pipelineStage.findFirst({
        where: { tenantId, type: 'in_progress' },
      });
      if (inProgress) newStageId = inProgress.id;
    } else if (meta.city != null || meta.dimensions != null) {
      newScore = 'warm';
      decisionReason = meta.city != null && meta.dimensions != null
        ? 'получены город и размеры'
        : meta.city != null
          ? 'получен город'
          : 'получены размеры';
      const inProgress = await this.prisma.pipelineStage.findFirst({
        where: { tenantId, type: 'in_progress' },
      });
      if (inProgress) newStageId = inProgress.id;
    }
    if (meta.city != null && meta.dimensions != null && newScore === 'warm') {
      const fullData = await this.prisma.pipelineStage.findFirst({
        where: { tenantId, type: 'full_data' },
      });
      if (fullData) {
        newStageId = fullData.id;
        decisionReason = 'город и размеры получены — полные данные';
      }
    }

    const effectiveStageId = newStageId ?? lead.stageId;
    const stageForNotes =
      effectiveStageId === lead.stageId
        ? lead.stage
        : await this.prisma.pipelineStage.findFirst({
            where: { id: effectiveStageId },
            select: { name: true },
          });
    const stageName = stageForNotes && 'name' in stageForNotes ? stageForNotes.name : 'текущая';
    const scoreLabel = newScore === 'hot' ? 'горячий' : newScore === 'warm' ? 'тёплый' : 'холодный';
    const aiNotes = `Оценка: ${scoreLabel}. Стадия: ${stageName}. ${decisionReason}`;

    const updatedLead = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        leadScore: newScore,
        stageId: newStageId ?? lead.stageId,
        lastMessageAt: now,
        lastMessagePreview: text.slice(0, 120),
        noResponseSince: null,
        aiNotes,
        metadata: newMetadata,
      },
      include: {
        stage: { select: { id: true, name: true, type: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    // Night mode: if enabled, do not answer, send night message once
    if (settings?.nightModeEnabled) {
      // crude: we don't compute timezone here, just send special message
      if (settings.nightModeMessage) {
        await this.messages.create(lead.id, {
          source: MessageSource.ai,
          direction: MessageDirection.out,
          body: settings.nightModeMessage,
        });
      }
      await this.logs.log({
        tenantId,
        category: 'ai',
        message: `Ночное сообщение отправлено лиду ${lead.id}`,
        meta: { leadId: lead.id },
      });
      return { lead: updatedLead, aiHandled: true, reply: settings.nightModeMessage ?? undefined };
    }

    // If AI is disabled on tenant or lead, stop here
    if (!settings?.aiEnabled || !updatedLead.aiActive) {
      await this.logs.log({
        tenantId,
        category: 'ai',
        message: `Входящее сообщение без AI-обработки (AI выключен) для лида ${lead.id}`,
        meta: { leadId: lead.id, text },
      });
      return { lead: updatedLead, aiHandled: false, reply: undefined };
    }

    // Ответ: OpenAI GPT (если задан ключ у клиента) или шаблон
    let reply: string;
    if (settings?.openaiApiKey?.startsWith('sk-')) {
      try {
        reply = await this.generateOpenAIReply({
          leadId: lead.id,
          systemPrompt: settings.systemPrompt,
          openaiApiKey: settings.openaiApiKey,
          currentUserMessage: text,
          leadMetadata: updatedLead.metadata,
        });
      } catch (err) {
        await this.logs.log({
          tenantId,
          category: 'ai',
          message: `OpenAI ошибка для лида ${lead.id}: ${(err as Error).message}`,
          meta: { leadId: lead.id },
        });
        reply = 'Спасибо за сообщение! Сейчас заняты, скоро ответим.';
      }
    } else {
      reply = 'Спасибо за сообщение! ';
      if (settings?.suggestCall) {
        reply += 'Мы можем организовать для вас звонок и подробно всё рассказать. ';
      } else {
        reply += 'Сейчас подготовим для вас информацию по запросу. ';
      }
      if (settings?.askQuestions) {
        reply += 'Подскажите, пожалуйста, какие детали для вас сейчас самые важные?';
      } else {
        reply += 'Мы скоро свяжемся с вами.';
      }
    }

    await this.messages.create(lead.id, {
      source: MessageSource.ai,
      direction: MessageDirection.out,
      body: reply,
    });

    await this.logs.log({
      tenantId,
      category: 'ai',
      message: `AI ответил на сообщение для лида ${lead.id}`,
      meta: {
        leadId: lead.id,
        input: text,
        reply,
        leadScore: updatedLead.leadScore,
        stageId: updatedLead.stageId,
      },
    });

    // Schedule follow-up if enabled
    if (settings?.followUpEnabled && settings?.followUpMessage) {
      const delayMinutes = Number(settings.followUpDelay || '0') || 0;
      await this.followups.scheduleLeadFollowUp({
        tenantId,
        leadId: lead.id,
        delayMinutes,
        messageText: settings.followUpMessage,
      });
    }

    return { lead: updatedLead, aiHandled: true, reply };
  }

  async takeOverLead(params: { tenantId: string; leadId: string; userId: string }) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: params.leadId, tenantId: params.tenantId },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const updated = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        aiActive: false,
        assignedUserId: params.userId,
      },
      include: {
        stage: { select: { id: true, name: true, type: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    this.followups.cancelLeadFollowUps(lead.id);

    await this.logs.log({
      tenantId: params.tenantId,
      category: 'ai',
      message: `Диалог забран менеджером ${params.userId} по лиду ${lead.id}`,
      meta: { leadId: lead.id, userId: params.userId },
    });

    return updated;
  }

  async releaseLead(params: { tenantId: string; leadId: string }) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: params.leadId, tenantId: params.tenantId },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const updated = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        aiActive: true,
      },
      include: {
        stage: { select: { id: true, name: true, type: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    await this.logs.log({
      tenantId: params.tenantId,
      category: 'ai',
      message: `Диалог возвращён AI по лиду ${lead.id}`,
      meta: { leadId: lead.id },
    });

    return updated;
  }
}

