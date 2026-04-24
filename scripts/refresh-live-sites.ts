import { PrismaClient } from "@prisma/client";
import { refreshAllSites } from "@/lib/sync";

const prisma = new PrismaClient();

async function main() {
  const { results, message } = await refreshAllSites(prisma);

  if (message) {
    console.log(message);
    return;
  }

  for (const r of results) {
    if (r.error) {
      console.log(`  ✗ ${r.name} (${r.url}): ${r.error}`);
    } else {
      console.log(
        `  ✓ ${r.name}: status=${r.status} latency=${r.latency}ms prices=${r.priceCount}`
      );
    }
  }

  console.log("Refresh complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
