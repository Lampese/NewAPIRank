import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("size") ?? "20", 10)));
  const search = searchParams.get("q") ?? "";

  const allModels = await prisma.price.groupBy({
    by: ["modelName"],
    _count: { modelName: true },
    orderBy: { _count: { modelName: "desc" } },
  });

  const filtered = search
    ? allModels.filter((m) => m.modelName.toLowerCase().includes(search.toLowerCase()))
    : allModels;

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json({
    models: paged.map((m) => ({
      modelName: m.modelName,
      count: m._count.modelName,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
