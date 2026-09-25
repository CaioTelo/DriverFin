import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.ts';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL é obrigatória para executar o seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const platforms = [
  { id: 'UBER', name: 'Uber', sortOrder: 1 },
  { id: 'NINETY_NINE', name: '99', sortOrder: 2 },
  { id: 'INDRIVE', name: 'inDrive', sortOrder: 3 },
  { id: 'PRIVATE', name: 'Particular', sortOrder: 4 },
  { id: 'OTHER', name: 'Outro', sortOrder: 5 },
] as const;

const expenseCategories = [
  { id: 'FUEL', name: 'Combustível', sortOrder: 1 },
  { id: 'MAINTENANCE', name: 'Manutenção', sortOrder: 2 },
  { id: 'INSURANCE', name: 'Seguro', sortOrder: 3 },
  { id: 'WASH', name: 'Lavagem', sortOrder: 4 },
  { id: 'TOLL', name: 'Pedágio', sortOrder: 5 },
  { id: 'PARKING', name: 'Estacionamento', sortOrder: 6 },
  { id: 'FOOD', name: 'Alimentação', sortOrder: 7 },
  { id: 'FINANCING', name: 'Financiamento', sortOrder: 8 },
  { id: 'OTHER', name: 'Outros', sortOrder: 9 },
] as const;

async function main(): Promise<void> {
  await prisma.$transaction([
    ...platforms.map((platform) =>
      prisma.platform.upsert({
        where: { id: platform.id },
        update: { name: platform.name, sortOrder: platform.sortOrder },
        create: platform,
      }),
    ),
    ...expenseCategories.map((category) =>
      prisma.expenseCategory.upsert({
        where: { id: category.id },
        update: { name: category.name, sortOrder: category.sortOrder },
        create: category,
      }),
    ),
  ]);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
