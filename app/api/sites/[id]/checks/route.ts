import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const hours = Math.max(1, parseInt(request.nextUrl.searchParams.get("hours") ?? "24", 10));

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const data = await prisma.check.findMany({
    where: {
      siteId: id,
      checkedAt: { gte: since },
    },
    orderBy: { checkedAt: "desc" },
  });

  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60",
      },
    }
  );
}
