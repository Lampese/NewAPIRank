import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshSite } from "@/lib/sync";
import { normalizeSiteUrl, siteRegistry } from "@/lib/site-registry";

function verifyCronSecret(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

// 全局同步状态 — 任何人都能查
export const syncState = {
  running: false,
  total: 0,
  completed: 0,
  ok: 0,
  failed: 0,
  current: "",
  startedAt: null as string | null,
  finishedAt: null as string | null,
  duration: null as string | null,
};

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (syncState.running) {
    return NextResponse.json({
      message: "Sync already running",
      ...syncState,
    });
  }

  // 立即返回，后台执行
  syncState.running = true;
  syncState.completed = 0;
  syncState.ok = 0;
  syncState.failed = 0;
  syncState.current = "";
  syncState.startedAt = new Date().toISOString();
  syncState.finishedAt = null;
  syncState.duration = null;

  const startTime = Date.now();

  // 后台跑同步，带进度
  (async () => {
    try {
      // 确保 registry 站点存在
      const existingSites = await prisma.site.findMany({
        select: { id: true, name: true, url: true },
      });
      const siteByUrl = new Map(
        existingSites.map((s) => [normalizeSiteUrl(s.url), s])
      );
      for (const entry of siteRegistry) {
        const key = normalizeSiteUrl(entry.url);
        if (siteByUrl.has(key)) continue;
        const created = await prisma.site.create({
          data: {
            name: entry.name, url: entry.url, status: "unknown",
            upstreamPrice: 1, quotaDisplayType: "USD",
            usdExchangeRate: 7, groupRatios: "{}",
          },
          select: { id: true, name: true, url: true },
        });
        siteByUrl.set(key, created);
      }

      const sites = [...siteByUrl.values()].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      syncState.total = sites.length;

      const CONCURRENCY = 10;
      for (let i = 0; i < sites.length; i += CONCURRENCY) {
        const batch = sites.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          batch.map((site) => refreshSite(prisma, site))
        );
        for (const r of results) {
          syncState.completed++;
          syncState.current = r.name;
          if (r.error) syncState.failed++;
          else syncState.ok++;
          console.log(
            `[sync] [${syncState.completed}/${syncState.total}] ${r.name} — ${r.error ? "❌ " + r.error : "✅ " + r.priceCount + " 模型"}`
          );
        }
      }
    } catch (err) {
      console.error("[sync] 错误:", err);
    } finally {
      syncState.running = false;
      syncState.finishedAt = new Date().toISOString();
      syncState.duration = `${Date.now() - startTime}ms`;
      console.log(
        `[sync] 完成: ${syncState.completed}/${syncState.total}, 成功 ${syncState.ok}, 失败 ${syncState.failed}, 耗时 ${syncState.duration}`
      );
    }
  })();

  return NextResponse.json({
    ok: true,
    message: "Sync started in background",
  });
}

export async function GET() {
  return NextResponse.json(syncState);
}
