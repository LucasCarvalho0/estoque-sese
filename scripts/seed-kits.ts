import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/index.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const kits = [
    { name: 'Kit L2 Exportação', code: 'KIT-L2-EXP', qty: 5 },
    { name: 'Kit L3 Exportação', code: 'KIT-L3-EXP', qty: 6 },
    { name: 'Kit L2 Brasil', code: 'KIT-L2-BRA', qty: 4 },
    { name: 'Kit L3 Brasil', code: 'KIT-L3-BRA', qty: 4 },
  ];

  for (const kit of kits) {
    // Verifica se já existe
    const exists = await prisma.tool.findFirst({ where: { code: kit.code } });
    if (exists) {
      console.log(`Kit ${kit.code} já existe, recriando...`);
      await prisma.tool.delete({ where: { id: exists.id } });
    }

    const lots = Array.from({ length: kit.qty }).map((_, i) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: `Nº ${i + 1}`,
      serial: '',
      status: 'disponivel'
    }));

    await prisma.tool.create({
      data: {
        name: kit.name,
        code: kit.code,
        total_quantity: kit.qty,
        available_quantity: kit.qty,
        description: `Kit contendo os pendrives da linha ${kit.name}`,
        category: 'pendrive',
        lots: lots as any,
        shift: '1'
      }
    });
    console.log(`Kit ${kit.name} criado com sucesso com ${kit.qty} lotes!`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
