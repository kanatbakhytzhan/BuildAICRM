import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_CHANNEL_EXTERNAL_ID = 'default';

/** Создаёт канал "Основной" для тенанта (если нет) и привязывает лидов без channelId. */
async function ensureDefaultChannelForTenant(tenantId: string) {
  let ch = await prisma.tenantChannel.findFirst({
    where: { tenantId, externalId: DEFAULT_CHANNEL_EXTERNAL_ID },
  });
  if (!ch) {
    ch = await prisma.tenantChannel.create({
      data: { tenantId, name: 'Основной', externalId: DEFAULT_CHANNEL_EXTERNAL_ID },
    });
  }
  await prisma.lead.updateMany({
    where: { tenantId, channelId: null },
    data: { channelId: ch.id },
  });
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: 'seed-tenant-1' },
    update: {},
    create: {
      id: 'seed-tenant-1',
      name: 'Demo Company',
    },
  });

  await ensureDefaultChannelForTenant(tenant.id);

  const passwordHash = await bcrypt.hash('demo123', 10);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'owner@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'owner@demo.com',
      passwordHash,
      name: 'Owner',
      role: 'owner',
    },
  });

  const stageNames = [
    { name: 'Новые', type: 'new' },
    { name: 'В работе (AI)', type: 'in_progress' },
    { name: 'Просит звонок', type: 'wants_call' },
    { name: 'Полные данные', type: 'full_data' },
    { name: 'Успех', type: 'success' },
    { name: 'Отказ', type: 'refused' },
  ];
  const existing = await prisma.pipelineStage.count({ where: { tenantId: tenant.id } });
  if (existing === 0) {
    await prisma.pipelineStage.createMany({
      data: stageNames.map((s, i) => ({
        tenantId: tenant.id,
        name: s.name,
        type: s.type,
        order: i,
      })),
    });
  }

  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.globalAdmin.upsert({
    where: { email: 'admin@buildcrm.io' },
    update: {},
    create: {
      email: 'admin@buildcrm.io',
      passwordHash: adminHash,
      name: 'Global Admin',
    },
  });

  // Backfill: для всех остальных тенантов — канал по умолчанию и привязка лидов
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  for (const t of tenants) {
    await ensureDefaultChannelForTenant(t.id);
  }

  console.log('Seed done. Tenant:', tenant.id, 'CRM: owner@demo.com / demo123');
  console.log('Global Admin: admin@buildcrm.io / admin123');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
