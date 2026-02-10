import { Injectable, NotFoundException } from '@nestjs/common';
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
    return { ...base, ...patch };
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

    if (Object.keys(patch).length === 0) {
      return (current ?? {}) as Prisma.InputJsonValue;
    }
    return this.mergeMetadata(current, patch);
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
      return { leadId: lead.id, aiHandled: false };
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

    const lower = text.toLowerCase();
    if (lower.includes('не интересно') || lower.includes('отказ') || lower.includes('не актуально')) {
      newScore = 'cold';
      decisionReason = 'клиент явно отказался (\"не интересно\", \"отказ\", \"не актуально\")';
      const refusedStage = await this.prisma.pipelineStage.findFirst({
        where: { tenantId, type: 'refused' },
      });
      if (refusedStage) newStageId = refusedStage.id;
    } else if (lower.includes('цена') || lower.includes('стоимость') || lower.includes('сколько')) {
      newScore = 'warm';
      decisionReason = 'клиент уточняет условия/цену (\"цена\", \"стоимость\", \"сколько\")';
      const inProgress = await this.prisma.pipelineStage.findFirst({
        where: { tenantId, type: 'in_progress' },
      });
      if (inProgress) newStageId = inProgress.id;
    } else if (lower.includes('звон') || lower.includes('созвон')) {
      newScore = 'hot';
      decisionReason = 'клиент хочет созвон (\"звонок\", \"созвон\")';
      const wantsCall = await this.prisma.pipelineStage.findFirst({
        where: { tenantId, type: 'wants_call' },
      });
      if (wantsCall) newStageId = wantsCall.id;
    }

    const aiNotes = `AI обновил оценку лида до "${newScore}" и стадию до "${newStageId ? 'специальной стадии' : lead.stageId}" на основе текста клиента: ${decisionReason}.`;

    const newMetadata = this.extractMetadataFromText(lead.metadata ?? null, text);

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
      return { lead: updatedLead, aiHandled: true };
    }

    // If AI is disabled on tenant or lead, stop here
    if (!settings?.aiEnabled || !updatedLead.aiActive) {
      await this.logs.log({
        tenantId,
        category: 'ai',
        message: `Входящее сообщение без AI-обработки (AI выключен) для лида ${lead.id}`,
        meta: { leadId: lead.id, text },
      });
      return { lead: updatedLead, aiHandled: false };
    }

    // Demo AI reply (stub, no external LLM) with behavior flags
    let reply = 'Спасибо за сообщение! ';

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
    if (settings.followUpEnabled && settings.followUpMessage) {
      const delayMinutes = Number(settings.followUpDelay || '0') || 0;
      await this.followups.scheduleLeadFollowUp({
        tenantId,
        leadId: lead.id,
        delayMinutes,
        messageText: settings.followUpMessage,
      });
    }

    return { lead: updatedLead, aiHandled: true };
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

