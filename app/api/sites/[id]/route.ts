import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const site = await prisma.site.findUnique({
    where: { id },
    include: {
      prices: {
        orderBy: { modelName: "asc" },
      },
    },
  });

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  return NextResponse.json(
    { ...site, modelCount: site.prices.length },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60",
      },
    }
  );
}
