import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: 'seed-tenant-1' },
    update: {},
    create: {
      id: 'seed-tenant-1',
      name: 'Demo Company',
    },
  });

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
