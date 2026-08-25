const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Busca empresa por email do primeiro admin
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN', email: 'caiqueznk@gmail.com' },
    include: { company: true }
  });

  if (!adminUser) {
    console.log('Admin não encontrado');
    return;
  }

  const company = adminUser.company;

  // Cria filial (não matriz)
  const newFilial = await prisma.filial.create({
    data: {
      name: 'Filial Operador SP',
      cnpj: '11111111111111',
      company: { connect: { id: company.id } },
    }
  });

  // Cria usuário operador vinculado à filial
  const operator = await prisma.user.create({
    data: {
      email: 'operador@teste.com',
      name: 'Operador Teste',
      passwordHash: '$2b$10$placeholder', // senha: teste123 (hash gerado pelo auth)
      role: 'USER',
      company: { connect: { id: company.id } },
    }
  });

  // Cria relação usuário → filial (via UserFilial)
  if (prisma.userFilial) {
    await prisma.userFilial.create({
      data: {
        user: { connect: { id: operator.id } },
        filial: { connect: { id: newFilial.id } },
        role: 'OPERATOR'
      }
    });
  }

  console.log('Filial criada:', newFilial.id);
  console.log('Operador criado:', operator.email);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
