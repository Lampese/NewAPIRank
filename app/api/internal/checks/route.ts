import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyInternalKey } from "@/lib/auth";

export async function POST(request: Request) {
  if (!verifyInternalKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const checks: { siteUrl: string; status: string; latency: number }[] = body.checks;

  if (!Array.isArray(checks)) {
    return NextResponse.json({ error: "Invalid body: checks must be an array" }, { status: 400 });
  }

  let created = 0;

  for (const check of checks) {
    const site = await prisma.site.findUnique({ where: { url: check.siteUrl } });
    if (!site) continue;

    await prisma.check.create({
      data: {
        siteId: site.id,
        status: check.status,
        latency: check.latency,
      },
    });

    // Keep raw check history only; site summary fields are maintained elsewhere.
    await prisma.site.update({
      where: { id: site.id },
      data: {
        status: check.status,
      },
    });

    created++;
  }

  return NextResponse.json({ created });
}
