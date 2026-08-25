const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Promove usuário trial para ADMIN
  await prisma.user.updateMany({
    where: { role: 'USER' },
    data: { role: 'ADMIN' },
  });

  // 2. Atualiza subscription trial -> enterprise
  await prisma.subscription.updateMany({
    where: { planName: 'trial' },
    data: {
      planName: 'enterprise',
      usersLimit: 100,
      gatewaysLimit: 20,
      transactionsLimit: 999999,
      hasAiAnalyst: true,
      prioritySupport: true,
      status: 'ativo',
    },
  });

  const result = await prisma.$queryRawUnsafe(`
    SELECT u."id", u."email", u."role", s."planName", s."gatewaysLimit", s."transactionsLimit", s."hasAiAnalyst"
    FROM "User" u
    JOIN "Subscription" s ON s."companyId" = u."companyId"
    LIMIT 5
  `);
  console.table(result);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
