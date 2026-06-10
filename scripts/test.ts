import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/index.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tools = await prisma.tool.findMany({ where: { category: 'pendrive' } });
  console.log(JSON.stringify(tools, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
