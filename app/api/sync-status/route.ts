import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [totalSites, sitesWithPrices, totalPrices, latestCheck] =
    await Promise.all([
      prisma.site.count(),
      prisma.site.count({
        where: { prices: { some: {} } },
      }),
      prisma.price.count(),
      prisma.check.findFirst({
        orderBy: { checkedAt: "desc" },
        select: { checkedAt: true },
      }),
    ]);

  return NextResponse.json({
    totalSites,
    sitesWithPrices,
    sitesMissingPrices: totalSites - sitesWithPrices,
    totalPrices,
    lastSyncAt: latestCheck?.checkedAt ?? null,
    syncProgress:
      totalSites > 0
        ? `${((sitesWithPrices / totalSites) * 100).toFixed(1)}%`
        : "N/A",
  });
}
