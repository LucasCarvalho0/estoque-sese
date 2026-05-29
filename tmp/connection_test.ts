import "dotenv/config";
import { prisma } from "../prisma/config"; // adjust path if needed

async function main() {
  try {
    const result = await prisma.$queryRaw`SELECT now()`;
    console.log("✅ Conexão bem‑sucedida. Hora do banco:", result);
  } catch (err) {
    console.error("❌ Falha ao conectar:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
