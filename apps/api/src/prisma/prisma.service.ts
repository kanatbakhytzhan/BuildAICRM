import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Максимальное количество активных лидов на одного арендатора (тенанта).
// Старые лиды будут автоматически удаляться сверх этого порога,
// при этом агрегированная статистика по дням остаётся в таблице LeadDailyStat.
const MAX_LEADS_PER_TENANT = 300;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();

    // Централизованная обработка создания лида:
    // 1) увеличиваем дневную статистику по лидам для аналитики;
    // 2) при необходимости удаляем самые старые лиды сверх лимита per-tenant.
    this.$use(async (params, next) => {
      const result = await next(params);

      if (params.model === 'Lead' && params.action === 'create') {
        const created = result as { tenantId: string; createdAt: Date };
        const tenantId = created.tenantId;
        const createdAt = created.createdAt instanceof Date ? created.createdAt : new Date(created.createdAt);

        // Обновляем агрегированную статистику по лидам (по дате создания).
        try {
          const prismaAny = this as any;
          const statDate = new Date(createdAt);
          statDate.setHours(0, 0, 0, 0);
          await prismaAny.leadDailyStat.upsert({
            where: {
              tenantId_date: {
                tenantId,
                date: statDate,
              },
            },
            update: { leadsCount: { increment: 1 } },
            create: {
              tenantId,
              date: statDate,
              leadsCount: 1,
            },
          });
        } catch {
          // Ошибки статистики не должны ломать создание лида.
        }

        // Ограничение на количество лидов в CRM на тенанта.
        try {
          const total = await this.lead.count({ where: { tenantId } });
          if (total > MAX_LEADS_PER_TENANT) {
            const toDeleteCount = total - MAX_LEADS_PER_TENANT;
            const oldestLeads = await this.lead.findMany({
              where: { tenantId },
              orderBy: { createdAt: 'asc' },
              take: toDeleteCount,
              select: { id: true },
            });
            const ids = oldestLeads.map((l) => l.id);
            if (ids.length > 0) {
              await this.lead.deleteMany({
                where: { id: { in: ids } },
              });
            }
          }
        } catch {
          // Если очистка не удалась, это не должно мешать основной работе CRM.
        }
      }

      return result;
    });
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
