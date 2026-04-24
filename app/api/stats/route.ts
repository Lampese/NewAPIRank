import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [totalSites, onlineSites, modelsResult] = await Promise.all([
    prisma.site.count(),
    prisma.site.count({ where: { status: "up" } }),
    prisma.price.groupBy({ by: ["modelName"] }).then((r) => r.length),
  ]);

  return NextResponse.json(
    {
      totalSites,
      onlineSites,
      totalModels: modelsResult,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60",
      },
    }
  );
}
