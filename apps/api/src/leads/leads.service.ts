import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadScore, Prisma } from '@prisma/client';

export interface ListLeadsOptions {
  tenantId: string;
  stageId?: string;
  topicId?: string;
  assignedUserId?: string | null;
  onlyMine?: boolean;
  userId?: string;
  /** Для менеджера: только лиды с этими topicId или без темы. null = все. */
  visibleTopicIds?: string[] | null;
}

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async list(options: ListLeadsOptions) {
    const where: Prisma.LeadWhereInput = { tenantId: options.tenantId };
    if (options.stageId) where.stageId = options.stageId;
    if (options.topicId) where.topicId = options.topicId;
    if (options.onlyMine && options.userId) where.assignedUserId = options.userId;
    else if (options.assignedUserId !== undefined) where.assignedUserId = options.assignedUserId;
    if (options.visibleTopicIds != null && options.visibleTopicIds.length > 0) {
      where.AND = [
        { OR: [{ topicId: { in: options.visibleTopicIds } }, { topicId: null }] },
      ];
    }

    return this.prisma.lead.findMany({
      where,
      include: {
        stage: { select: { id: true, name: true, type: true, order: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        channel: { select: { id: true, name: true, externalId: true } },
        topic: { select: { id: true, name: true } },
      },
      orderBy: [{ leadScore: 'desc' }, { lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId },
      include: {
        stage: true,
        assignedUser: { select: { id: true, name: true, email: true } },
        channel: { select: { id: true, name: true, externalId: true } },
        topic: { select: { id: true, name: true } },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async create(
    tenantId: string,
    data: {
      stageId: string;
      phone: string;
      name?: string;
      assignedUserId?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.prisma.lead.create({
      data: {
        tenantId,
        stageId: data.stageId,
        phone: data.phone,
        name: data.name,
        assignedUserId: data.assignedUserId,
        metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      include: {
        stage: { select: { id: true, name: true, type: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      stageId?: string;
      assignedUserId?: string | null;
      leadScore?: LeadScore;
      aiActive?: boolean;
      name?: string;
      metadata?: Record<string, unknown>;
      dealAmount?: number | null;
    },
  ) {
    await this.findOne(tenantId, id);
    const { dealAmount, metadata, ...rest } = data;
    return this.prisma.lead.update({
      where: { id },
      data: {
        ...rest,
        ...(metadata !== undefined && { metadata: metadata as Prisma.InputJsonValue }),
        ...(dealAmount !== undefined && { dealAmount: dealAmount == null ? null : dealAmount }),
      },
      include: {
        stage: { select: { id: true, name: true, type: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.lead.delete({ where: { id } });
  }

  /** Аналитика: воронка, конверсия по темам, средний чек, время сделки, график лидов. */
  async getAnalytics(tenantId: string, period: 'day' | 'week' | 'month' | 'year') {
    const now = new Date();
    const to = new Date(now);
    let from = new Date(now);
    if (period === 'day') from.setHours(0, 0, 0, 0);
    else if (period === 'week') from.setDate(from.getDate() - 6);
    else if (period === 'month') from.setDate(from.getDate() - 29);
    else from.setMonth(from.getMonth() - 11);

    const stages = await this.prisma.pipelineStage.findMany({
      where: { tenantId },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, type: true },
    });
    const successStageIds = stages.filter((s) => s.type === 'success').map((s) => s.id);

    // Воронка: лидов на каждом этапе (всего, не за период)
    const stageCounts = await this.prisma.lead.groupBy({
      by: ['stageId'],
      where: { tenantId },
      _count: { id: true },
    });
    const funnel = stages.map((s) => ({
      stageId: s.id,
      stageName: s.name,
      count: stageCounts.find((c) => c.stageId === s.id)?._count.id ?? 0,
    }));

    // Закрытые сделки за период
    const closedLeads = successStageIds.length > 0
      ? await this.prisma.lead.findMany({
          where: { tenantId, stageId: { in: successStageIds }, updatedAt: { gte: from, lte: to } },
          select: { dealAmount: true, updatedAt: true, createdAt: true, topicId: true },
        })
      : [];

    const toNum = (v: unknown) => (v == null ? 0 : Number(v));
    const totalRevenue = closedLeads.reduce((s, l) => s + toNum(l.dealAmount), 0);

    // Среднее время сделки (дни от создания до перехода в success)
    let avgDealTimeDays = 0;
    if (closedLeads.length > 0) {
      const sumDays = closedLeads.reduce((s, l) => {
        const ms = new Date(l.updatedAt).getTime() - new Date(l.createdAt).getTime();
        return s + ms / (24 * 60 * 60 * 1000);
      }, 0);
      avgDealTimeDays = Math.round(sumDays / closedLeads.length * 10) / 10;
    }

    // Конверсия по темам (из закрытых за период)
    const topics = await this.prisma.tenantTopic.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });
    const byTopic: { topicId: string | null; topicName: string; count: number; revenue: number }[] = [];
    for (const t of topics) {
      const list = closedLeads.filter((l) => l.topicId === t.id);
      byTopic.push({
        topicId: t.id,
        topicName: t.name,
        count: list.length,
        revenue: list.reduce((s, l) => s + toNum(l.dealAmount), 0),
      });
    }
    const withoutTopic = closedLeads.filter((l) => !l.topicId);
    if (withoutTopic.length > 0) {
      byTopic.push({ topicId: null, topicName: 'Без темы', count: withoutTopic.length, revenue: withoutTopic.reduce((s, l) => s + toNum(l.dealAmount), 0) });
    }

    // byPeriod — выручка по периодам
    const byPeriod: { label: string; revenue: number; count: number }[] = [];
    if (period === 'day') {
      byPeriod.push({
        label: from.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        revenue: totalRevenue,
        count: closedLeads.length,
      });
    } else if (period === 'week' || period === 'month') {
      const byDay = new Map<string, { revenue: number; count: number }>();
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        byDay.set(d.toISOString().slice(0, 10), { revenue: 0, count: 0 });
      }
      for (const l of closedLeads) {
        const key = new Date(l.updatedAt).toISOString().slice(0, 10);
        const cur = byDay.get(key);
        if (cur) {
          cur.revenue += toNum(l.dealAmount);
          cur.count += 1;
        }
      }
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        const data = byDay.get(key)!;
        byPeriod.push({
          label: new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
          revenue: data.revenue,
          count: data.count,
        });
      }
    } else {
      const byMonth = new Map<string, { revenue: number; count: number }>();
      for (let m = new Date(from.getFullYear(), from.getMonth(), 1); m <= to; m.setMonth(m.getMonth() + 1)) {
        byMonth.set(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`, { revenue: 0, count: 0 });
      }
      for (const l of closedLeads) {
        const d = new Date(l.updatedAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const cur = byMonth.get(key);
        if (cur) {
          cur.revenue += toNum(l.dealAmount);
          cur.count += 1;
        }
      }
      for (let m = new Date(from.getFullYear(), from.getMonth(), 1); m <= to; m.setMonth(m.getMonth() + 1)) {
        const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
        const data = byMonth.get(key)!;
        byPeriod.push({
          label: m.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
          revenue: data.revenue,
          count: data.count,
        });
      }
    }

    // График лидов по дням/неделям (новые лиды)
    const allLeadsInPeriod = await this.prisma.lead.findMany({
      where: { tenantId, createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
    });
    const leadsByPeriod: { label: string; count: number }[] = [];
    if (period === 'day') {
      leadsByPeriod.push({ label: from.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), count: allLeadsInPeriod.length });
    } else if (period === 'week' || period === 'month') {
      const byDay = new Map<string, number>();
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        byDay.set(d.toISOString().slice(0, 10), 0);
      }
      for (const l of allLeadsInPeriod) {
        const key = new Date(l.createdAt).toISOString().slice(0, 10);
        byDay.set(key, (byDay.get(key) ?? 0) + 1);
      }
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        leadsByPeriod.push({
          label: new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
          count: byDay.get(d.toISOString().slice(0, 10)) ?? 0,
        });
      }
    } else {
      const byMonth = new Map<string, number>();
      for (let m = new Date(from.getFullYear(), from.getMonth(), 1); m <= to; m.setMonth(m.getMonth() + 1)) {
        byMonth.set(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`, 0);
      }
      for (const l of allLeadsInPeriod) {
        const d = new Date(l.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
      }
      for (let m = new Date(from.getFullYear(), from.getMonth(), 1); m <= to; m.setMonth(m.getMonth() + 1)) {
        leadsByPeriod.push({
          label: m.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
          count: byMonth.get(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`) ?? 0,
        });
      }
    }

    const avgValue = closedLeads.length > 0 ? Math.round(totalRevenue / closedLeads.length) : 0;

    return {
      totalRevenue,
      dealsCount: closedLeads.length,
      avgValue,
      avgDealTimeDays,
      funnel,
      byTopic,
      byPeriod,
      leadsByPeriod,
    };
  }
}
