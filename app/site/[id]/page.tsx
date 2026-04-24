import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { ProviderIcon } from "@/components/provider-icon";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { ModelBadge } from "@/components/model-badge";
import {
  calculatePricePresentation,
  formatCny,
  formatCnyPerUsdRate,
  getDetectedRechargeCnyPerUsdRate,
} from "@/lib/pricing";
import {
  ExternalLink,
  Layers,
  Wallet,
} from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const site = await prisma.site.findUnique({
    where: { id },
    select: { name: true },
  });
  return {
    title: site ? `${site.name} - NewAPI Rank` : "站点详情 - NewAPI Rank",
  };
}

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const site = await prisma.site.findUnique({
    where: { id },
  });

  if (!site) notFound();

  const prices = await prisma.price.findMany({
    where: { siteId: id },
    orderBy: { modelName: "asc" },
  });

  const pricedModels = prices.map((price) => ({
    price,
    presentation: calculatePricePresentation(price, {
      siteUrl: site.url,
      upstreamPrice: site.upstreamPrice,
      quotaDisplayType: site.quotaDisplayType,
      usdExchangeRate: site.usdExchangeRate,
      groupRatios: site.groupRatios,
    }),
  }));

  const stats = [
    {
      label: "模型数量",
      value: prices.length.toString(),
      icon: Layers,
    },
    {
      label: "成本汇率",
      value: formatCnyPerUsdRate(
        getDetectedRechargeCnyPerUsdRate({
          siteUrl: site.url,
          upstreamPrice: site.upstreamPrice,
          quotaDisplayType: site.quotaDisplayType,
          usdExchangeRate: site.usdExchangeRate,
        })
      ),
      icon: Wallet,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{site.name}</h1>
          <StatusBadge status={site.status} />
          {site.version && (
            <Badge variant="outline" className="border-border/40 text-xs text-muted-foreground">
              {site.version}
            </Badge>
          )}
        </div>
        <Link
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {site.url}
          <ExternalLink className="size-3" />
        </Link>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-3.5 text-muted-foreground/50" />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl font-bold tabular-nums tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Models */}
      {prices.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-base font-semibold tracking-tight">支持模型</h2>
          <div className="flex flex-wrap gap-1.5">
            {prices.map((p) => (
              <ModelBadge
                key={p.modelName}
                modelId={p.modelName}
                variant="secondary"
                className="text-xs"
              />
            ))}
          </div>
        </section>
      )}

      {/* Pricing */}
      {prices.length > 0 && (
        <section className="mt-10 pb-10">
          <h2 className="mb-4 text-base font-semibold tracking-tight">模型定价</h2>
          <div className="overflow-hidden rounded-lg border border-border/40">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs text-muted-foreground font-medium">模型</TableHead>
                  <TableHead className="text-right text-xs text-muted-foreground font-medium">类型</TableHead>
                  <TableHead className="text-right text-xs text-muted-foreground font-medium">输入价格</TableHead>
                  <TableHead className="text-right text-xs text-muted-foreground font-medium">输出价格</TableHead>
                  <TableHead className="text-right text-xs text-muted-foreground font-medium">缓存价格</TableHead>
                  <TableHead className="text-right text-xs text-muted-foreground font-medium">缓存建立价格</TableHead>
                  <TableHead className="text-right text-xs text-muted-foreground font-medium">分组倍率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricedModels.map(({ price, presentation }) => (
                  <TableRow key={price.id} className="border-border/30 hover:bg-muted/20">
                    <TableCell>
                      <span className="inline-flex items-center gap-2 text-sm">
                        <ProviderIcon modelId={price.modelName} />
                        <span className="font-medium">{price.modelName}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {price.quotaType === 0 ? "按量" : "按次"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-foreground">
                      {price.quotaType === 0
                        ? formatCny(presentation.inputCny)
                        : formatCny(presentation.requestCny)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {price.quotaType === 0 ? formatCny(presentation.outputCny) : "--"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {price.quotaType === 0 ? formatCny(presentation.cacheReadCny) : "--"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {price.quotaType === 0
                        ? formatCny(presentation.cacheWriteCny)
                        : formatCny(presentation.requestCny)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {presentation.appliedGroup
                        ? `${presentation.appliedGroup} · x${presentation.appliedGroupRatio.toFixed(2)}`
                        : `默认 · x${presentation.appliedGroupRatio.toFixed(2)}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
