import { PrismaClient } from "@prisma/client";
import { siteRegistry } from "@/lib/site-registry";

const prisma = new PrismaClient();

interface PricingEntry {
  model_name: string;
  vendor_id?: number;
  quota_type: number;
  model_ratio: number;
  model_price: number;
  completion_ratio: number;
  cache_ratio?: number;
  create_cache_ratio?: number;
  enable_groups?: string[];
  supported_endpoint_types?: string[];
}

async function fetchPricing(url: string): Promise<{
  entries: PricingEntry[];
  groupRatios: Record<string, number>;
}> {
  try {
    const res = await fetch(`${url}/api/pricing`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { entries: [], groupRatios: {} };
    }
    const json = await res.json();
    const groupRatios =
      json && typeof json === "object" && typeof json.group_ratio === "object"
        ? json.group_ratio
        : {};
    const data = Array.isArray(json) ? json : json.data;
    return {
      entries: Array.isArray(data) ? data : [],
      groupRatios,
    };
  } catch {
    return { entries: [], groupRatios: {} };
  }
}

async function fetchStatus(url: string) {
  const start = Date.now();
  try {
    const res = await fetch(`${url}/api/status`, {
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - start;
    const version = res.headers.get("x-new-api-version") || undefined;
    let systemName = "";

    if (res.ok) {
      const json = await res.json();
      systemName = json.data?.system_name || "";
      const usdExchangeRate = Number(json.data?.usd_exchange_rate);
      const upstreamPrice = Number(json.data?.price);
      const quotaDisplayType = String(json.data?.quota_display_type || "USD");
      return {
        status: "up" as const,
        latency,
        version,
        systemName,
        upstreamPrice:
          Number.isFinite(upstreamPrice) && upstreamPrice > 0 ? upstreamPrice : 1,
        quotaDisplayType,
        usdExchangeRate: Number.isFinite(usdExchangeRate) && usdExchangeRate > 0 ? usdExchangeRate : 7,
      };
    }
  } catch {
  }

  return {
    status: "down" as const,
    latency: Date.now() - start,
    version: undefined,
    systemName: "",
    upstreamPrice: 1,
    quotaDisplayType: "USD",
    usdExchangeRate: 7,
  };
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.check.deleteMany();
  await prisma.price.deleteMany();
  await prisma.site.deleteMany();

  console.log("\nProbing real sites...\n");

  for (const siteInfo of siteRegistry) {
    console.log(`Probing ${siteInfo.url}...`);

    const [statusResult, pricingResult] = await Promise.all([
      fetchStatus(siteInfo.url),
      fetchPricing(siteInfo.url),
    ]);

    console.log(
      `  Status: ${statusResult.status}, Latency: ${statusResult.latency}ms, Version: ${statusResult.version || "N/A"}`
    );
    console.log(`  Pricing entries: ${pricingResult.entries.length}`);

    const site = await prisma.site.create({
      data: {
        name: siteInfo.name,
        url: siteInfo.url,
        status: statusResult.status,
        version: statusResult.version,
        upstreamPrice: statusResult.upstreamPrice,
        quotaDisplayType: statusResult.quotaDisplayType,
        usdExchangeRate: statusResult.usdExchangeRate,
        groupRatios: JSON.stringify(pricingResult.groupRatios ?? {}),
      },
    });

    // Store pricing data
    if (pricingResult.entries.length > 0) {
      const priceRecords = pricingResult.entries.map((p) => ({
        siteId: site.id,
        modelName: p.model_name,
        quotaType: p.quota_type ?? 0,
        modelRatio: p.model_ratio ?? 0,
        completionRatio: p.completion_ratio ?? 0,
        cacheRatio: p.cache_ratio ?? null,
        createCacheRatio: p.create_cache_ratio ?? null,
        modelPrice: p.model_price ?? 0,
        enableGroups: JSON.stringify(p.enable_groups ?? []),
      }));

      await prisma.price.createMany({ data: priceRecords });
      console.log(`  Stored ${priceRecords.length} price records`);
    }

    // Generate simulated check history (last 24h, every 5 min)
    const now = Date.now();
    const checks = [];
    for (let i = 0; i < 288; i++) {
      const checkedAt = new Date(now - i * 5 * 60 * 1000);
      const jitter = Math.floor(Math.random() * 200) - 100;
      checks.push({
        siteId: site.id,
        status: Math.random() > 0.02 ? "up" : "down",
        latency: Math.max(50, statusResult.latency + jitter),
        checkedAt,
      });
    }
    await prisma.check.createMany({ data: checks });

    console.log(
      `  Created site with ${pricingResult.entries.length} models, ${checks.length} checks\n`
    );
  }

  console.log("Done! Real sites loaded into database.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
