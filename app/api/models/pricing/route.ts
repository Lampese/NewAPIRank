import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const model = searchParams.get("model") ?? "";

  if (!model) {
    return NextResponse.json(
      { error: "Missing ?model= parameter" },
      { status: 400 }
    );
  }

  const prices = await prisma.price.findMany({
    where: { modelName: model },
    include: {
      site: {
        select: {
          id: true,
          name: true,
          url: true,
          upstreamPrice: true,
          quotaDisplayType: true,
          usdExchangeRate: true,
          groupRatios: true,
        },
      },
    },
    orderBy: { modelRatio: "asc" },
  });

  const entries = prices.map((price) => ({
    siteName: price.site.name,
    siteId: price.site.id,
    siteUrl: price.site.url,
    quotaType: price.quotaType,
    modelRatio: price.modelRatio,
    completionRatio: price.completionRatio,
    cacheRatio: price.cacheRatio,
    createCacheRatio: price.createCacheRatio,
    modelPrice: price.modelPrice,
    fetchedAt: price.fetchedAt.toISOString(),
    enableGroups: JSON.parse(price.enableGroups || "[]"),
    siteUpstreamPrice: price.site.upstreamPrice,
    siteQuotaDisplayType: price.site.quotaDisplayType,
    siteUsdExchangeRate: price.site.usdExchangeRate,
    siteGroupRatios: JSON.parse(price.site.groupRatios || "{}"),
  }));

  return NextResponse.json({ model, entries });
}
