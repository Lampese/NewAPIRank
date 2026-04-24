import { PrismaClient } from "@prisma/client";
import { normalizeSiteUrl, siteRegistry } from "@/lib/site-registry";

interface PricingEntry {
  model_name: string;
  quota_type?: number;
  model_ratio?: number;
  completion_ratio?: number;
  cache_ratio?: number | null;
  create_cache_ratio?: number | null;
  model_price?: number;
  enable_groups?: string[];
}

interface SiteStatus {
  status: "up" | "down";
  latency: number;
  version: string | undefined;
  upstreamPrice: number;
  quotaDisplayType: string;
  usdExchangeRate: number;
}

interface SitePricing {
  entries: PricingEntry[];
  groupRatios: Record<string, number>;
}

interface RefreshResult {
  name: string;
  url: string;
  status: string;
  latency: number;
  priceCount: number;
  error?: string;
}

export async function fetchStatus(url: string): Promise<SiteStatus> {
  const start = Date.now();
  try {
    const response = await fetch(`${url}/api/status`, {
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - start;
    const version = response.headers.get("x-new-api-version") || undefined;
    const json = response.ok ? await response.json() : null;
    const usdExchangeRate = Number(json?.data?.usd_exchange_rate);
    const upstreamPrice = Number(json?.data?.price);
    const quotaDisplayType = String(json?.data?.quota_display_type || "USD");

    return {
      status: response.ok ? "up" : "down",
      latency,
      version,
      upstreamPrice:
        Number.isFinite(upstreamPrice) && upstreamPrice > 0
          ? upstreamPrice
          : 1,
      quotaDisplayType,
      usdExchangeRate:
        Number.isFinite(usdExchangeRate) && usdExchangeRate > 0
          ? usdExchangeRate
          : 7,
    };
  } catch {
    return {
      status: "down",
      latency: Date.now() - start,
      version: undefined,
      upstreamPrice: 1,
      quotaDisplayType: "USD",
      usdExchangeRate: 7,
    };
  }
}

export async function fetchPricing(url: string): Promise<SitePricing> {
  try {
    const response = await fetch(`${url}/api/pricing`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return { entries: [], groupRatios: {} };
    }

    const json = await response.json();
    const entries = Array.isArray(json?.data) ? json.data : [];
    const groupRatios =
      json && typeof json.group_ratio === "object" && json.group_ratio
        ? json.group_ratio
        : {};

    return { entries, groupRatios };
  } catch {
    return { entries: [], groupRatios: {} };
  }
}

export async function refreshSite(
  prisma: PrismaClient,
  site: { id: string; name: string; url: string }
): Promise<RefreshResult> {
  try {
    const [status, pricing] = await Promise.all([
      fetchStatus(site.url),
      fetchPricing(site.url),
    ]);

    await prisma.site.update({
      where: { id: site.id },
      data: {
        status: status.status,
        version: status.version,
        upstreamPrice: status.upstreamPrice,
        quotaDisplayType: status.quotaDisplayType,
        usdExchangeRate: status.usdExchangeRate,
        groupRatios: JSON.stringify(pricing.groupRatios ?? {}),
      },
    });

    // Record health check
    await prisma.check.create({
      data: {
        siteId: site.id,
        status: status.status,
        latency: status.latency,
      },
    });

    // Replace all prices
    await prisma.price.deleteMany({ where: { siteId: site.id } });

    if (pricing.entries.length > 0) {
      await prisma.price.createMany({
        data: pricing.entries.map((entry) => ({
          siteId: site.id,
          modelName: entry.model_name,
          quotaType: entry.quota_type ?? 0,
          modelRatio: entry.model_ratio ?? 0,
          completionRatio: entry.completion_ratio ?? 0,
          cacheRatio: entry.cache_ratio ?? null,
          createCacheRatio: entry.create_cache_ratio ?? null,
          modelPrice: entry.model_price ?? 0,
          enableGroups: JSON.stringify(entry.enable_groups ?? []),
        })),
      });
    }

    return {
      name: site.name,
      url: site.url,
      status: status.status,
      latency: status.latency,
      priceCount: pricing.entries.length,
    };
  } catch (err) {
    return {
      name: site.name,
      url: site.url,
      status: "down",
      latency: 0,
      priceCount: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function refreshAllSites(prisma: PrismaClient) {
  // Ensure all registry sites exist in DB
  const existingSites = await prisma.site.findMany({
    select: { id: true, name: true, url: true },
    orderBy: { createdAt: "asc" },
  });

  const siteByUrl = new Map(
    existingSites.map((site) => [normalizeSiteUrl(site.url), site])
  );

  for (const entry of siteRegistry) {
    const key = normalizeSiteUrl(entry.url);
    if (siteByUrl.has(key)) continue;

    const created = await prisma.site.create({
      data: {
        name: entry.name,
        url: entry.url,
        status: "unknown",
        upstreamPrice: 1,
        quotaDisplayType: "USD",
        usdExchangeRate: 7,
        groupRatios: "{}",
      },
      select: { id: true, name: true, url: true },
    });
    siteByUrl.set(key, created);
  }

  const sites = [...siteByUrl.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  if (sites.length === 0) {
    return { results: [], message: "No sites configured." };
  }

  const results = await Promise.all(
    sites.map((site) => refreshSite(prisma, site))
  );

  return { results };
}
