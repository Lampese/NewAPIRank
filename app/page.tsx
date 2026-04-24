import Link from "next/link";
import {
  Activity,
  Clock3,
  Layers3,
  Radar,
  Sparkles,
} from "lucide-react";
import { PriceTable } from "@/components/price-table";
import { prisma } from "@/lib/db";
import { ProviderIcon } from "@/components/provider-icon";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProvider } from "@/lib/providers";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatLatestUpdatedAt(value: Date | null) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export default async function Home() {
  const [
    totalSites,
    onlineSites,
    totalOffers,
    topSites,
    modelRows,
    prices,
  ] = await Promise.all([
    prisma.site.count(),
    prisma.site.count({ where: { status: "up" } }),
    prisma.price.count(),
    prisma.site.findMany({
      where: { prices: { some: {} } },
      orderBy: [{ prices: { _count: "desc" } }, { status: "asc" }],
      include: {
        _count: { select: { prices: true } },
      },
    }),
    prisma.price.findMany({
      select: { modelName: true },
    }),
    prisma.price.findMany({
      include: {
        site: {
          select: {
            name: true,
            url: true,
            upstreamPrice: true,
            quotaDisplayType: true,
            usdExchangeRate: true,
            groupRatios: true,
          },
        },
      },
      orderBy: { modelRatio: "asc" },
    }),
  ]);

  const groupedPrices: Record<
    string,
    {
      siteName: string;
      siteId: string;
      siteUrl: string;
      quotaType: number;
      modelRatio: number;
      completionRatio: number;
      cacheRatio: number | null;
      createCacheRatio: number | null;
      modelPrice: number;
      fetchedAt: string;
      enableGroups: string[];
      siteUpstreamPrice: number;
      siteQuotaDisplayType: string;
      siteUsdExchangeRate: number;
      siteGroupRatios: Record<string, number>;
    }[]
  > = {};

  for (const price of prices) {
    if (!groupedPrices[price.modelName]) {
      groupedPrices[price.modelName] = [];
    }

    groupedPrices[price.modelName].push({
      siteName: price.site.name,
      siteId: price.siteId,
      siteUrl: price.site.url,
      quotaType: price.quotaType,
      modelRatio: price.modelRatio,
      completionRatio: price.completionRatio,
      cacheRatio: price.cacheRatio,
      createCacheRatio: price.createCacheRatio,
      modelPrice: price.modelPrice,
      fetchedAt: price.fetchedAt.toISOString(),
      enableGroups: JSON.parse(price.enableGroups || "[]"),
      siteUpstreamPrice: price.site.upstreamPrice,
      siteQuotaDisplayType: price.site.quotaDisplayType,
      siteUsdExchangeRate: price.site.usdExchangeRate,
      siteGroupRatios: JSON.parse(price.site.groupRatios || "{}"),
    });
  }

  const models = Object.keys(groupedPrices).sort();

  const modelCoverageMap = new Map<string, number>();
  for (const row of modelRows) {
    modelCoverageMap.set(row.modelName, (modelCoverageMap.get(row.modelName) ?? 0) + 1);
  }

  const modelCoverage = [...modelCoverageMap.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([modelName, count]) => ({ modelName, count }));

  const totalModels = modelCoverageMap.size;
  const maxCoverage = modelCoverage[0]?.count ?? 1;
  const latestUpdatedAt = prices.reduce<Date | null>((latest, price) => {
    if (!latest || price.fetchedAt > latest) {
      return price.fetchedAt;
    }
    return latest;
  }, null);

  const heroStats = [
    {
      label: "站点数量",
      value: totalSites,
      hint: `${onlineSites} 个站点在线`,
      icon: Activity,
    },
    {
      label: "模型数量",
      value: totalModels,
      hint: `${totalOffers} 条价格记录`,
      icon: Layers3,
    },
    {
      label: "最新更新时间",
      value: formatLatestUpdatedAt(latestUpdatedAt),
      hint: "最近一次价格采集",
      icon: Clock3,
    },
  ];

  return (
    <div className="page-shell pb-16 pt-8 sm:pt-10">
      <section className="motion-fade-up">
        <div className="observatory-panel p-4 sm:p-5 lg:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="section-kicker">
              <Sparkles className="size-3.5" />
              首页
            </span>
            <span className="signal-chip border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              已更新
            </span>
          </div>

          <div className="mt-4 max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-[4.2rem] lg:text-[4rem] leading-[0.95]">
              全网 New API
              <span className="block bg-gradient-to-r from-primary via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                站点大全和模型价格
              </span>
            </h1>
            <p className="section-copy mt-3 max-w-2xl">
              首页直接看站点大全、模型覆盖和价格对比。
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[24px] border border-border/70 bg-background/70 p-3.5"
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  <stat.icon className="size-3.5" />
                  {stat.label}
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{stat.hint}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="overflow-hidden rounded-[28px] border border-border/70 bg-card/88 shadow-[0_24px_90px_-54px_rgba(34,211,238,0.7)]">
              <div className="flex flex-col gap-3 border-b border-border/70 px-6 py-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    站点
                    </div>
                    <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
                    站点大全
                    </h2>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    共 {topSites.length} 个站点
                  </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/70 bg-background/30 hover:bg-background/30 sticky top-0 z-10">
                    <TableHead className="w-[50%] px-5 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground bg-background/80 backdrop-blur-sm">
                      节点
                    </TableHead>
                    <TableHead className="w-[15%] text-xs uppercase tracking-[0.2em] text-muted-foreground bg-background/80 backdrop-blur-sm">
                      状态
                    </TableHead>
                    <TableHead className="w-[15%] text-right text-xs uppercase tracking-[0.2em] text-muted-foreground bg-background/80 backdrop-blur-sm">
                      模型数
                    </TableHead>
                    <TableHead className="w-[20%] px-5 text-right text-xs uppercase tracking-[0.2em] text-muted-foreground bg-background/80 backdrop-blur-sm">
                      版本
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSites.map((site, index) => (
                    <TableRow
                      key={site.id}
                      className={cn(
                        "border-border/60 hover:bg-background/35",
                        index < 3 && "bg-primary/[0.04]"
                      )}
                    >
                      <TableCell className="px-5 py-3">
                        <Link
                          href={`/site/${site.id}`}
                          className="text-sm font-semibold text-foreground hover:text-primary"
                        >
                          {site.name}
                        </Link>
                        {site.isPaid && (
                          <Badge
                            variant="outline"
                            className="ml-2 border-amber-400/20 bg-amber-400/10 text-[10px] uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300"
                          >
                            Boost
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={site.status} />
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {site._count.prices}
                      </TableCell>
                      <TableCell className="px-5 text-right text-sm text-muted-foreground">
                        {site.version ?? "--"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {topSites.length === 0 && (
                    <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-28 text-center text-sm text-muted-foreground"
                  >
                        暂无站点数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </div>

            <div className="observatory-panel p-5">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <Radar className="size-3.5" />
                模型
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
                模型覆盖
              </h2>

              <div className="mt-5 space-y-3">
                {modelCoverage.map((item) => {
                  const provider = getProvider(item.modelName);
                  return (
                    <div key={item.modelName}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background/40"
                            style={{ color: provider.color }}
                          >
                            <ProviderIcon modelId={item.modelName} className="size-4.5" />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">
                              {item.modelName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {provider.name}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm font-semibold text-foreground">
                          {item.count}
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-background/55">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-300 to-emerald-300"
                          style={{ width: `${(item.count / maxCoverage) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {modelCoverage.length === 0 && (
                  <div className="rounded-[24px] border border-dashed border-border/70 bg-background/20 px-4 py-8 text-center text-sm text-muted-foreground">
                    暂无模型覆盖数据
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 motion-fade-up motion-delay-2">
        <PriceTable data={groupedPrices} models={models} />
      </section>
    </div>
  );
}
