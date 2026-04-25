import {
  Activity,
  Clock3,
  Layers3,
  Sparkles,
} from "lucide-react";
import { PriceTable } from "@/components/price-table";
import { SiteTable } from "@/components/site-table";
import { ModelCoverage } from "@/components/model-coverage";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatLatestUpdatedAt(value: Date | null) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export default async function Home() {
  const [totalSites, onlineSites, totalOffers, totalModels, topModelCount, modelList, latestCheck] =
    await Promise.all([
      prisma.site.count(),
      prisma.site.count({ where: { status: "up" } }),
      prisma.price.count(),
      prisma.price
        .findMany({ select: { modelName: true }, distinct: ["modelName"] })
        .then((r) => r.length),
      prisma.price
        .groupBy({
          by: ["modelName"],
          _count: { modelName: true },
          orderBy: { _count: { modelName: "desc" } },
          take: 1,
        })
        .then((r) => r[0]?._count.modelName ?? 1),
      prisma.price
        .groupBy({
          by: ["modelName"],
          _count: { modelName: true },
          orderBy: { _count: { modelName: "desc" } },
        })
        .then((rows) =>
          rows.map((r) => ({ model: r.modelName, count: r._count.modelName }))
        ),
      prisma.check.findFirst({
        orderBy: { checkedAt: "desc" },
        select: { checkedAt: true },
      }),
    ]);

  const latestUpdatedAt = latestCheck?.checkedAt ?? null;

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

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <SiteTable />
            <ModelCoverage maxCoverage={topModelCount} />
          </div>
        </div>
      </section>

      <section className="mt-8 motion-fade-up motion-delay-2">
        <PriceTable models={modelList} />
      </section>
    </div>
  );
}
