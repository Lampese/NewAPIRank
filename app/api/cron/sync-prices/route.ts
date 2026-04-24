import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshAllSites } from "@/lib/sync";

function verifyCronSecret(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

// 后台同步状态
let syncRunning = false;
let lastSyncResult: {
  startedAt: string;
  finishedAt?: string;
  duration?: string;
  sites?: number;
  ok?: number;
  failed?: number;
} | null = null;

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (syncRunning) {
    return NextResponse.json({
      ok: true,
      message: "Sync already running",
      lastSync: lastSyncResult,
    });
  }

  // 立即返回，后台异步执行
  syncRunning = true;
  const startTime = Date.now();
  lastSyncResult = { startedAt: new Date().toISOString() };

  // 不 await，让它后台跑
  refreshAllSites(prisma)
    .then(({ results }) => {
      const duration = Date.now() - startTime;
      lastSyncResult = {
        startedAt: lastSyncResult!.startedAt,
        finishedAt: new Date().toISOString(),
        duration: `${duration}ms`,
        sites: results.length,
        ok: results.filter((r) => r.status === "up").length,
        failed: results.filter((r) => r.error).length,
      };
      console.log(
        `[sync] 完成: ${results.length} 站, ${lastSyncResult.ok} 成功, ${lastSyncResult.failed} 失败, 耗时 ${lastSyncResult.duration}`
      );
    })
    .catch((err) => {
      console.error("[sync] 错误:", err);
      lastSyncResult = {
        ...lastSyncResult!,
        finishedAt: new Date().toISOString(),
      };
    })
    .finally(() => {
      syncRunning = false;
    });

  return NextResponse.json({
    ok: true,
    message: "Sync started in background",
  });
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    running: syncRunning,
    lastSync: lastSyncResult,
  });
}
