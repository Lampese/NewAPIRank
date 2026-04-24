import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyInternalKey } from "@/lib/auth";

export async function POST(request: Request) {
  if (!verifyInternalKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const sites: {
    name: string;
    url: string;
    version?: string;
    status?: string;
    upstreamPrice?: number;
    quotaDisplayType?: string;
    usdExchangeRate?: number;
    groupRatios?: Record<string, number>;
  }[] = body.sites;

  if (!Array.isArray(sites)) {
    return NextResponse.json({ error: "Invalid body: sites must be an array" }, { status: 400 });
  }

  const results = await Promise.all(
    sites.map((s) =>
      prisma.site.upsert({
        where: { url: s.url },
        create: {
          name: s.name,
          url: s.url,
          version: s.version,
          status: s.status ?? "unknown",
          upstreamPrice: s.upstreamPrice ?? 1,
          quotaDisplayType: s.quotaDisplayType ?? "USD",
          usdExchangeRate: s.usdExchangeRate ?? 7,
          groupRatios: JSON.stringify(s.groupRatios ?? {}),
        },
        update: {
          name: s.name,
          ...(s.version !== undefined && { version: s.version }),
          ...(s.status !== undefined && { status: s.status }),
          ...(s.upstreamPrice !== undefined && { upstreamPrice: s.upstreamPrice }),
          ...(s.quotaDisplayType !== undefined && {
            quotaDisplayType: s.quotaDisplayType,
          }),
          ...(s.usdExchangeRate !== undefined && { usdExchangeRate: s.usdExchangeRate }),
          ...(s.groupRatios !== undefined && {
            groupRatios: JSON.stringify(s.groupRatios),
          }),
        },
      })
    )
  );

  return NextResponse.json({ upserted: results.length });
}
