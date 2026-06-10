import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/index.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tools = await prisma.tool.findMany({ where: { category: 'pendrive' } });
  
  for (const t of tools) {
    if (!t.lots) {
      console.log(`Reparando kits para ${t.name}...`);
      const lots = Array.from({ length: t.total_quantity }).map((_, i) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: `Nº ${i + 1}`,
        serial: '',
        status: 'disponivel'
      }));
      await prisma.tool.update({
        where: { id: t.id },
        data: { lots: lots as any, available_quantity: t.total_quantity }
      });
      console.log(`Reparado ${t.name} com ${t.total_quantity} lotes.`);
    }
  }
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
