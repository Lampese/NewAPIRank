import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const sort = searchParams.get("sort");
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const status = searchParams.get("status");

  const where: Prisma.SiteWhereInput = {};
  if (status && ["up", "down", "unknown"].includes(status)) {
    where.status = status;
  }

  const orderBy: Prisma.SiteOrderByWithRelationInput[] = [];

  // Paid sites first unless explicitly sorted
  if (!sort) {
    orderBy.push({ isPaid: "desc" });
    orderBy.push({ rank: "asc" });
  } else {
    orderBy.push({ isPaid: "desc" });
    if (sort === "models") {
      orderBy.push({ prices: { _count: order } });
    }
  }

  const [sites, total] = await Promise.all([
    prisma.site.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { prices: true } },
      },
    }),
    prisma.site.count({ where }),
  ]);

  // Add computed modelCount to each site
  const data = sites.map((site) => ({
    ...site,
    modelCount: site._count.prices,
    _count: undefined,
  }));

  return NextResponse.json(
    { data, total, page, limit },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60",
      },
    }
  );
}
