const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const prisma = new PrismaClient();
  const hash = await bcrypt.hash('admin123', 10);
  
  await prisma.globalAdmin.upsert({
    where: { email: 'admin@buildcrm.io' },
    update: {},
    create: {
      email: 'admin@buildcrm.io',
      passwordHash: hash,
      name: 'Global Admin',
    },
  });
  
  console.log('Admin created: admin@buildcrm.io / admin123');
  await prisma.$disconnect();
}

main().catch(console.error);
