import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshAllSites } from "@/lib/sync";

function verifyCronSecret(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const { results } = await refreshAllSites(prisma);
    const duration = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      duration: `${duration}ms`,
      sites: results.length,
      results: results.map((r) => ({
        name: r.name,
        status: r.status,
        latency: r.latency,
        prices: r.priceCount,
        ...(r.error ? { error: r.error } : {}),
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
