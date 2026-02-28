import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_LEADS_PER_TENANT = 300;

@Injectable()
export class LeadCleanupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LeadCleanupService.name);

  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    this.logger.log('Запуск очистки старых лидов при старте API...');
    try {
      await this.cleanupAllTenants();
      this.logger.log('Очистка завершена.');
    } catch (err) {
      this.logger.warn('Очистка при старте пропущена: ' + (err as Error).message);
    }
  }

  async cleanupAllTenants() {
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      await this.cleanupOldLeads(tenant.id);
    }
  }

  async cleanupOldLeads(tenantId: string) {
    const totalCount = await this.prisma.lead.count({ where: { tenantId } });
    if (totalCount <= MAX_LEADS_PER_TENANT) return 0;

    const toDelete = totalCount - MAX_LEADS_PER_TENANT;
    const oldestLeads = await this.prisma.lead.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      take: toDelete,
      select: { id: true, topicId: true, createdAt: true },
    });

    if (oldestLeads.length === 0) return 0;

    await this.recordStatsForDeletedLeads(tenantId, oldestLeads);

    const idsToDelete = oldestLeads.map((l) => l.id);
    const deleted = await this.prisma.lead.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    this.logger.log(
      `Tenant ${tenantId}: удалено ${deleted.count} старых лидов, осталось ${MAX_LEADS_PER_TENANT}`,
    );

    return deleted.count;
  }

  private async recordStatsForDeletedLeads(
    tenantId: string,
    leads: { id: string; topicId: string | null; createdAt: Date }[],
  ) {
    const grouped = new Map<string, number>();
    for (const lead of leads) {
      const dateKey = lead.createdAt.toISOString().slice(0, 10);
      const key = `${dateKey}|${lead.topicId ?? ''}`;
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }

    for (const [key, count] of grouped.entries()) {
      const [dateStr, topicIdVal] = key.split('|');
      const topicId = topicIdVal || '';
      const date = new Date(dateStr);

      await this.prisma.leadStats.upsert({
        where: {
          tenantId_topicId_date: { tenantId, topicId, date },
        },
        create: { tenantId, topicId, date, count },
        update: { count: { increment: count } },
      });
    }
  }

  async recordNewLead(tenantId: string, topicId: string | null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const topicIdVal = topicId ?? '';
    await this.prisma.leadStats.upsert({
      where: {
        tenantId_topicId_date: { tenantId, topicId: topicIdVal, date: today },
      },
      create: { tenantId, topicId: topicIdVal, date: today, count: 1 },
      update: { count: { increment: 1 } },
    });

    await this.cleanupOldLeads(tenantId);
  }
}
