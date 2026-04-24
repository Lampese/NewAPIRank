import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const { modelId } = await params;
  const decodedModelName = decodeURIComponent(modelId);

  const prices = await prisma.price.findMany({
    where: { modelName: decodedModelName },
    orderBy: { modelRatio: "asc" },
    include: {
      site: {
        select: { id: true, name: true, url: true },
      },
    },
  });

  const data = prices.map((price) => ({
    site: price.site,
    modelName: price.modelName,
    quotaType: price.quotaType,
    modelRatio: price.modelRatio,
    completionRatio: price.completionRatio,
    cacheRatio: price.cacheRatio,
    createCacheRatio: price.createCacheRatio,
    modelPrice: price.modelPrice,
    enableGroups: price.enableGroups,
    fetchedAt: price.fetchedAt,
  }));

  return NextResponse.json(
    { modelId: decodedModelName, data },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60",
      },
    }
  );
}
