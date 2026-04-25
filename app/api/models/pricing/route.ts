import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const model = searchParams.get("model") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("size") ?? "20", 10)));
  const sort = searchParams.get("sort") ?? "asc";

  if (!model) {
    return NextResponse.json(
      { error: "Missing ?model= parameter" },
      { status: 400 }
    );
  }

  const where = { modelName: model, site: { status: "up" } };
  const orderDir = sort === "desc" ? "desc" : "asc";

  const [total, prices] = await Promise.all([
    prisma.price.count({ where }),
    prisma.price.findMany({
      where,
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
      orderBy: { computedPriceCny: orderDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

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
    computedPriceCny: price.computedPriceCny,
    fetchedAt: price.fetchedAt.toISOString(),
    enableGroups: JSON.parse(price.enableGroups || "[]"),
    siteUpstreamPrice: price.site.upstreamPrice,
    siteQuotaDisplayType: price.site.quotaDisplayType,
    siteUsdExchangeRate: price.site.usdExchangeRate,
    siteGroupRatios: JSON.parse(price.site.groupRatios || "{}"),
  }));

  return NextResponse.json({
    model,
    entries,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
