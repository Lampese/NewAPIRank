import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("size") ?? "20", 10)));
  const search = searchParams.get("q") ?? "";

  const where = {
    prices: { some: {} },
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { url: { contains: search } },
          ],
        }
      : {}),
  };

  const [total, sites] = await Promise.all([
    prisma.site.count({ where }),
    prisma.site.findMany({
      where,
      orderBy: [{ prices: { _count: "desc" } }, { status: "asc" }],
      include: { _count: { select: { prices: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    sites: sites.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      status: s.status,
      version: s.version,
      isPaid: s.isPaid,
      modelCount: s._count.prices,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
