import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const models = await prisma.price.groupBy({
    by: ["modelName"],
    _count: { siteId: true },
    orderBy: { _count: { siteId: "desc" } },
  });

  const data = models.map((m) => ({
    modelId: m.modelName,
    siteCount: m._count.siteId,
  }));

  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60",
      },
    }
  );
}
