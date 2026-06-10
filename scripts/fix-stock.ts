import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/index.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fixStock() {
  const tools = await prisma.tool.findMany();
  
  for (const tool of tools) {
    // A quantidade real disponível deve ser igual à quantidade total menos a soma das quantidades que estão na mão dos funcionários.
    // O que está na mão deles?
    // 1. Status 'retirada' -> quantidade total do movimento
    // 2. Status 'parcial' ou 'falta' -> (quantidade - return_quantity)
    
    const movements = await prisma.movement.findMany({
      where: {
        tool_id: tool.id,
        status: {
          in: ['retirada', 'parcial', 'falta']
        }
      }
    });

    let qtyInUse = 0;
    for (const m of movements) {
      if (m.status === 'retirada') {
        qtyInUse += m.quantity;
      } else if (m.status === 'parcial' || m.status === 'falta') {
        const returned = m.return_quantity || 0;
        qtyInUse += (m.quantity - returned);
      }
    }

    const calculatedAvailable = Math.max(0, tool.total_quantity - qtyInUse);

    if (calculatedAvailable !== tool.available_quantity) {
      console.log(`Ferramenta ${tool.name} desincronizada! DB: ${tool.available_quantity} -> Recalculado: ${calculatedAvailable}`);
      await prisma.tool.update({
        where: { id: tool.id },
        data: { available_quantity: calculatedAvailable }
      });
    } else {
      console.log(`Ferramenta ${tool.name} OK (${calculatedAvailable}).`);
    }
  }

  console.log("Sincronização de estoque concluída!");
}

fixStock().catch(console.error).finally(() => prisma.$disconnect());
