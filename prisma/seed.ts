// prisma/seed.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

async function main() {
  await prisma.user.create({
    data: {
      email: "alice@example.com",
      name: "Alice",
      posts: {
        create: [{ title: "Hello World", content: "First post", published: true }],
      },
    },
  });
  console.log("🔧 Seed data inserted");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
