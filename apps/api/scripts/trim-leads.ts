/**
 * Одноразовый скрипт: подрезать лиды до 300 самых новых на каждого тенанта.
 * Старые лиды удаляются (вместе с сообщениями по cascade).
 * Запуск после деплоя: cd apps/api && npm run trim-leads
 * Требуется DATABASE_URL в окружении (берётся из .env в apps/api через dotenv).
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const MAX_LEADS_PER_TENANT = 300;

// Для отладки: проверяем, что DATABASE_URL подхватился (без вывода самого URL).
// Если увидишь \"Has DATABASE_URL: false\" — значит .env не загрузился.
console.log('Has DATABASE_URL:', !!process.env.DATABASE_URL);

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  });

  for (const tenant of tenants) {
    const total = await prisma.lead.count({ where: { tenantId: tenant.id } });
    if (total <= MAX_LEADS_PER_TENANT) {
      console.log(`[${tenant.name}] лидов: ${total}, лимит не превышен.`);
      continue;
    }

    const toDelete = total - MAX_LEADS_PER_TENANT;
    const oldest = await prisma.lead.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'asc' },
      take: toDelete,
      select: { id: true },
    });
    const ids = oldest.map((l) => l.id);

    await prisma.lead.deleteMany({
      where: { id: { in: ids } },
    });

    console.log(`[${tenant.name}] удалено ${ids.length} старых лидов, осталось ${MAX_LEADS_PER_TENANT}.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
