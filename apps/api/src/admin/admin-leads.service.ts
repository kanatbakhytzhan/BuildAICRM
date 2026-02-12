import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminLeadsService {
  constructor(private prisma: PrismaService) {}

  async listSuccessLeads(tenantId: string) {
    const stageIds = await this.prisma.pipelineStage.findMany({
      where: { tenantId, type: 'success' },
      select: { id: true },
    }).then((s) => s.map((x) => x.id));
    if (stageIds.length === 0) return [];
    return this.prisma.lead.findMany({
      where: { tenantId, stageId: { in: stageIds } },
      include: {
        stage: { select: { id: true, name: true, type: true } },
        topic: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateDealAmount(tenantId: string, leadId: string, dealAmount: number | null) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: { stage: { select: { type: true } } },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.prisma.lead.update({
      where: { id: leadId },
      data: { dealAmount: dealAmount == null ? null : dealAmount },
      include: {
        stage: { select: { id: true, name: true, type: true } },
        topic: { select: { id: true, name: true } },
      },
    });
  }

  async getAnalytics(tenantId: string, period: 'day' | 'week' | 'month' | 'year') {
    const now = new Date();
    const to = new Date(now);
    let from = new Date(now);
    if (period === 'day') from.setHours(0, 0, 0, 0);
    else if (period === 'week') from.setDate(from.getDate() - 6);
    else if (period === 'month') from.setDate(from.getDate() - 29);
    else from.setMonth(from.getMonth() - 11);

    const successStageIds = await this.prisma.pipelineStage.findMany({
      where: { tenantId, type: 'success' },
      select: { id: true },
    }).then((s) => s.map((x) => x.id));
    if (successStageIds.length === 0) {
      return { totalRevenue: 0, dealsCount: 0, byPeriod: [] };
    }

    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId,
        stageId: { in: successStageIds },
        updatedAt: { gte: from, lte: to },
      },
      select: { dealAmount: true, updatedAt: true },
    });

    const toNum = (v: unknown) => (v == null ? 0 : Number(v));
    const totalRevenue = leads.reduce((s, l) => s + toNum(l.dealAmount), 0);
    const byPeriod: { label: string; revenue: number; count: number }[] = [];

    if (period === 'day') {
      byPeriod.push({
        label: from.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        revenue: totalRevenue,
        count: leads.length,
      });
    } else if (period === 'week' || period === 'month') {
      const byDay = new Map<string, { revenue: number; count: number }>();
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        byDay.set(d.toISOString().slice(0, 10), { revenue: 0, count: 0 });
      }
      for (const l of leads) {
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
      for (const l of leads) {
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

    return { totalRevenue, dealsCount: leads.length, byPeriod };
  }
}
