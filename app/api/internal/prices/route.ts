import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyInternalKey } from "@/lib/auth";

export async function POST(request: Request) {
  if (!verifyInternalKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const prices: {
    siteUrl: string;
    modelName: string;
    quotaType?: number;
    modelRatio?: number;
    completionRatio?: number;
    cacheRatio?: number | null;
    createCacheRatio?: number | null;
    modelPrice?: number;
    enableGroups?: string[];
  }[] = body.prices;

  if (!Array.isArray(prices)) {
    return NextResponse.json({ error: "Invalid body: prices must be an array" }, { status: 400 });
  }

  let upserted = 0;

  for (const p of prices) {
    const site = await prisma.site.findUnique({ where: { url: p.siteUrl } });
    if (!site) continue;

    await prisma.price.upsert({
      where: {
        siteId_modelName: { siteId: site.id, modelName: p.modelName },
      },
      create: {
        siteId: site.id,
        modelName: p.modelName,
        quotaType: p.quotaType ?? 0,
        modelRatio: p.modelRatio ?? 0,
        completionRatio: p.completionRatio ?? 0,
        cacheRatio: p.cacheRatio ?? null,
        createCacheRatio: p.createCacheRatio ?? null,
        modelPrice: p.modelPrice ?? 0,
        enableGroups: JSON.stringify(p.enableGroups ?? []),
      },
      update: {
        quotaType: p.quotaType ?? 0,
        modelRatio: p.modelRatio ?? 0,
        completionRatio: p.completionRatio ?? 0,
        cacheRatio: p.cacheRatio ?? null,
        createCacheRatio: p.createCacheRatio ?? null,
        modelPrice: p.modelPrice ?? 0,
        enableGroups: JSON.stringify(p.enableGroups ?? []),
        fetchedAt: new Date(),
      },
    });

    upserted++;
  }

  return NextResponse.json({ upserted });
}
