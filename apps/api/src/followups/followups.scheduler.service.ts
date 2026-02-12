import { Injectable, Logger } from '@nestjs/common';
import { MessagesService } from '../messages/messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { MessageDirection, MessageSource } from '@prisma/client';
import { SystemLogsService } from '../system/system.logs.service';

type Timer = ReturnType<typeof setTimeout>;

@Injectable()
export class FollowupsSchedulerService {
  private readonly logger = new Logger(FollowupsSchedulerService.name);
  private readonly timers = new Map<string, Timer>();

  constructor(
    private messages: MessagesService,
    private prisma: PrismaService,
    private logs: SystemLogsService,
  ) {}

  private parseTime(value: string | null | undefined): { hours: number; minutes: number } | null {
    if (!value) return null;
    const [h, m] = value.split(':').map((v) => Number(v));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return { hours: h, minutes: m };
  }

  private isInNightWindow(now: Date, start?: string | null, end?: string | null): boolean {
    const startTime = this.parseTime(start);
    const endTime = this.parseTime(end);
    if (!startTime || !endTime) return false;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startTime.hours * 60 + startTime.minutes;
    const endMinutes = endTime.hours * 60 + endTime.minutes;

    if (startMinutes < endMinutes) {
      // Ночной интервал в рамках одних суток, например 22:00–08:00 (не переходя через полночь)
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    // Интервал, переходящий через полночь, например 23:00–06:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  private minutesUntilEndOfNight(now: Date, end?: string | null): number | null {
    const endTime = this.parseTime(end);
    if (!endTime) return null;

    const endToday = new Date(now);
    endToday.setHours(endTime.hours, endTime.minutes, 0, 0);

    let target = endToday;
    if (endToday.getTime() <= now.getTime()) {
      // Если "конец ночи" уже прошёл сегодня — переносим на завтра
      target = new Date(endToday.getTime() + 24 * 60 * 60 * 1000);
    }

    const diffMs = target.getTime() - now.getTime();
    return Math.max(0, Math.round(diffMs / 60000));
  }

  async scheduleLeadFollowUp(params: {
    tenantId: string;
    leadId: string;
    delayMinutes: number;
    messageText: string;
  }) {
    const key = params.leadId;
    this.cancelLeadFollowUps(key);

    if (params.delayMinutes <= 0) {
      await this.fireFollowUp(params);
      return;
    }

    const ms = params.delayMinutes * 60 * 1000;
    const timer = setTimeout(() => {
      this.fireFollowUp(params).catch((err) => {
        this.logger.error('Failed to send follow-up', err.stack || String(err));
      });
    }, ms);

    this.timers.set(key, timer);
    this.logger.log(`Scheduled follow-up for lead ${params.leadId} in ${params.delayMinutes} minutes`);
  }

  cancelLeadFollowUps(leadId: string) {
    const timer = this.timers.get(leadId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(leadId);
      this.logger.log(`Cancelled follow-up for lead ${leadId}`);
    }
  }

  private async fireFollowUp(params: { tenantId: string; leadId: string; messageText: string }) {
    this.timers.delete(params.leadId);

    const lead = await this.prisma.lead.findFirst({
      where: { id: params.leadId, tenantId: params.tenantId },
      include: { stage: { select: { type: true } } },
    });
    if (!lead) return;

    // Do not send follow-up if AI is disabled for lead
    if (!lead.aiActive) return;

    // Не отправлять follow-up, если клиент доработан и записан на звонок
    const meta = lead.metadata as Record<string, unknown> | null;
    const hasCallScheduled = meta?.suggestedCallAt != null || meta?.suggestedCallNote != null;
    if (lead.stage?.type === 'wants_call' || hasCallScheduled) return;

    const now = new Date();

    // Respect night mode: если сейчас ночь, переносим follow-up на конец ночного окна
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: params.tenantId },
    });
    if (settings?.nightModeEnabled) {
      const inNight = this.isInNightWindow(now, settings.nightModeStart, settings.nightModeEnd);
      if (inNight) {
        const minutes = this.minutesUntilEndOfNight(now, settings.nightModeEnd);
        if (minutes !== null && minutes > 0) {
          this.logger.log(
            `Follow-up для лида ${params.leadId} перенесён на конец ночного окна через ${minutes} минут`,
          );
          await this.logs.log({
            tenantId: params.tenantId,
            category: 'ai',
            message: `Follow-up перенесён из ночного времени для лида ${params.leadId}`,
            meta: {
              leadId: params.leadId,
              delayMinutes: minutes,
            },
          });
          // Планируем повторно, но уже с новым delay
          await this.scheduleLeadFollowUp({
            ...params,
            delayMinutes: minutes,
          });
          return;
        }
      }
    }

    await this.messages.create(params.leadId, {
      source: MessageSource.ai,
      direction: MessageDirection.out,
      body: params.messageText,
    });

    const sent = await this.messages.sendToLead(params.tenantId, params.leadId, params.messageText);
    if (!sent) {
      await this.logs.log({
        tenantId: params.tenantId,
        category: 'ai',
        message: `Follow-up не отправлен в WhatsApp для лида ${params.leadId} (ChatFlow)`,
        meta: { leadId: params.leadId },
      });
    }

    await this.prisma.lead.update({
      where: { id: params.leadId },
      data: {
        lastMessageAt: now,
        lastMessagePreview: params.messageText.slice(0, 120),
        noResponseSince: now,
      },
    });

    await this.logs.log({
      tenantId: params.tenantId,
      category: 'ai',
      message: `Отправлен follow-up для лида ${params.leadId}`,
      meta: {
        leadId: params.leadId,
        text: params.messageText,
      },
    });
  }
}

