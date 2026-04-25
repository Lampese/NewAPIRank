"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Loader2, Search, TrendingDown, X } from "lucide-react";
import { ProviderIcon } from "@/components/provider-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProvider } from "@/lib/providers";
import {
  calculatePricePresentation,
  formatCny,
  formatCnyPerUsdRate,
  getEnabledGroups,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";

type PriceEntry = {
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
};

type SortKey = "input" | "output" | "cacheRead" | "cacheWrite";
type SortDirection = "asc" | "desc";

type PriceRow = {
  entry: PriceEntry;
  group: string;
  presentation: ReturnType<typeof calculatePricePresentation>;
};

function sortValue(item: PriceRow, key: SortKey) {
  switch (key) {
    case "input":
      return item.entry.quotaType === 0
        ? item.presentation.inputCny
        : item.presentation.requestCny;
    case "output":
      return item.presentation.outputCny;
    case "cacheRead":
      return item.presentation.cacheReadCny;
    case "cacheWrite":
      return item.entry.quotaType === 0
        ? item.presentation.cacheWriteCny
        : item.presentation.requestCny;
    default:
      return item.presentation.primaryCny;
  }
}

function sortLabel(key: SortKey) {
  switch (key) {
    case "input":
      return "输入价格";
    case "output":
      return "输出价格";
    case "cacheRead":
      return "缓存价格";
    case "cacheWrite":
      return "缓存建立价格";
    default:
      return "";
  }
}

function sortIcon(active: boolean, direction: SortDirection) {
  if (!active) {
    return <ArrowUpDown className="size-3.5 text-muted-foreground" />;
  }
  return direction === "asc" ? (
    <ArrowUp className="size-3.5 text-primary" />
  ) : (
    <ArrowDown className="size-3.5 text-primary" />
  );
}

function SortHead({
  label,
  sortKey,
  currentKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === currentKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="inline-flex items-center justify-end gap-1 text-right text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
    >
      <span>{label}</span>
      {sortIcon(active, direction)}
    </button>
  );
}

export function PriceTable({
  models,
}: {
  models: { model: string; count: number }[];
}) {
  const [modelQuery, setModelQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState(models[0]?.model ?? "");
  const [sortKey, setSortKey] = useState<SortKey>("input");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [entries, setEntries] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [pricePage, setPricePage] = useState(1);
  const [priceTotal, setPriceTotal] = useState(0);
  const [priceTotalPages, setPriceTotalPages] = useState(1);
  const PAGE_SIZE = 20;

  // 按需加载选中模型的价格数据（分页）
  useEffect(() => {
    if (!selectedModel) return;

    setLoading(true);
    const params = new URLSearchParams({
      model: selectedModel,
      page: String(pricePage),
      size: String(PAGE_SIZE),
      sort: sortDirection,
    });
    fetch(`/api/models/pricing?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.entries ?? []);
        setPriceTotal(data.total ?? 0);
        setPriceTotalPages(data.totalPages ?? 1);
      })
      .catch(() => {
        setEntries([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedModel, pricePage, sortDirection]);

  const normalizedQuery = modelQuery.trim().toLowerCase();
  const filteredModels = useMemo(
    () =>
      normalizedQuery === ""
        ? models
        : models.filter(({ model }) =>
            model.toLowerCase().includes(normalizedQuery)
          ),
    [normalizedQuery, models]
  );

  const provider = getProvider(selectedModel);

  const priceRows = useMemo(() => {
    return entries.flatMap((entry) =>
      getEnabledGroups(entry.enableGroups).map((group) => ({
        entry,
        group,
        presentation: calculatePricePresentation(
          entry,
          {
            siteUrl: entry.siteUrl,
            upstreamPrice: entry.siteUpstreamPrice,
            quotaDisplayType: entry.siteQuotaDisplayType,
            usdExchangeRate: entry.siteUsdExchangeRate,
            groupRatios: entry.siteGroupRatios,
          },
          { group }
        ),
      }))
    );
  }, [entries]);

  // 模型或排序变化时重置分页
  useEffect(() => {
    setPricePage(1);
  }, [selectedModel, sortDirection]);

  const handleSort = (_nextKey: SortKey) => {
    // 排序由数据库处理，只切换升降序
    setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
  };

  return (
    <div className="space-y-5">
      <div className="observatory-panel motion-fade-up p-5 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              搜索模型
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={modelQuery}
                onChange={(event) => setModelQuery(event.target.value)}
                placeholder="例如 gpt-4.1、gemini、claude"
                className="h-12 rounded-2xl border-border/70 bg-background/55 pr-11 pl-11"
              />
              {modelQuery && (
                <button
                  type="button"
                  onClick={() => setModelQuery("")}
                  className="absolute top-1/2 right-3 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
                  aria-label="清除模型搜索"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              当前模型
            </label>
            <div className="flex h-12 items-center gap-2 rounded-2xl border border-border/70 bg-background/55 px-4">
              <span
                className="inline-flex size-7 items-center justify-center rounded-xl border border-border/60 bg-background/50"
                style={{ color: provider.color }}
              >
                <ProviderIcon modelId={selectedModel} className="size-4" />
              </span>
              <span className="text-sm font-medium text-foreground">{selectedModel || "请从下方选择"}</span>
            </div>
            {normalizedQuery !== "" && (
              <div className="mt-2 text-xs text-muted-foreground">
                {filteredModels.length > 0
                  ? `匹配到 ${filteredModels.length} 个模型`
                  : "没有匹配的模型，试试更短的关键词"}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:col-span-2">
            <span className="signal-chip" style={{ color: provider.color }}>
              <ProviderIcon modelId={selectedModel} className="size-4" />
              {provider.name}
            </span>
            <span className="signal-chip">
              <TrendingDown className="size-3.5 text-primary" />
              当前排序：{sortLabel(sortKey)} {sortDirection === "asc" ? "升序" : "降序"}
            </span>
            <span className="signal-chip">可比较报价：{loading ? "..." : priceTotal} 条</span>
          </div>

          {filteredModels.length > 0 && (
            <div className="flex flex-wrap gap-2 xl:col-span-2">
              {filteredModels.slice(0, 50).map(({ model, count }) => (
                <button
                  key={model}
                  type="button"
                  onClick={() => setSelectedModel(model)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                    selectedModel === model
                      ? "border-primary/20 bg-primary/12 text-primary shadow-[inset_0_0_0_1px_rgba(103,232,249,0.14)]"
                      : "border-border/70 bg-background/35 text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                  )}
                >
                  <ProviderIcon modelId={model} className="size-3.5" />
                  {model}
                  <span className="text-xs opacity-70">{count}</span>
                </button>
              ))}
            </div>
          )}

          {normalizedQuery !== "" && filteredModels.length === 0 && (
            <div className="xl:col-span-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModelQuery("")}
                className="rounded-full border-border/70 bg-background/35"
              >
                清除搜索，返回全部模型
              </Button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="observatory-panel flex min-h-72 flex-col items-center justify-center px-6 py-16 text-center">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">加载价格数据...</p>
        </div>
      ) : priceRows.length === 0 ? (
        <div className="observatory-panel flex min-h-72 flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-lg font-medium text-foreground">暂无该模型的定价数据</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            先在采集端推送 `prices` 数据，或者切换到其他已经被监控的模型。
          </p>
        </div>
      ) : (
        <div className="observatory-panel motion-fade-up motion-delay-2 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {selectedModel}
              </div>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                分组级价格表
              </h3>
            </div>
            <div className="text-sm text-muted-foreground">价格列标题可直接点击排序。</div>
          </div>

          <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "40px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "80px" }} />
              <col style={{ width: "56px" }} />
              <col />
              <col />
              <col />
              <col />
            </colgroup>
            <TableHeader>
              <TableRow className="border-border/70 bg-background/30 hover:bg-background/30">
                <TableHead className="px-3 py-3 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  #
                </TableHead>
                <TableHead className="px-3 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  站点
                </TableHead>
                <TableHead className="px-3 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  分组
                </TableHead>
                <TableHead className="px-3 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  模式
                </TableHead>
                <TableHead className="w-28 text-right">
                  <SortHead
                    label="输入价格"
                    sortKey="input"
                    currentKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="w-28 text-right">
                  <SortHead
                    label="输出价格"
                    sortKey="output"
                    currentKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="w-28 text-right">
                  <SortHead
                    label="缓存价格"
                    sortKey="cacheRead"
                    currentKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="w-28 px-3 text-right">
                  <SortHead
                    label="缓存建立"
                    sortKey="cacheWrite"
                    currentKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {priceRows.map(({ entry, group, presentation }, index) => {
                const globalIndex = (pricePage - 1) * PAGE_SIZE + index;
                return (
                <TableRow
                  key={`${entry.siteId}-${group}-${globalIndex}`}
                  className={cn(
                    "border-border/60 hover:bg-background/35",
                    globalIndex === 0 && "bg-primary/[0.04]"
                  )}
                >
                  <TableCell className="px-3 text-center text-sm text-muted-foreground">
                    {String(globalIndex + 1).padStart(2, "0")}
                  </TableCell>
                  <TableCell className="px-3 py-3 truncate">
                    <Link
                      href={`/site/${entry.siteId}`}
                      className="text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {entry.siteName}
                    </Link>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      汇率 {formatCnyPerUsdRate(presentation.effectiveRechargeCnyPerUsd)}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <div className="text-sm text-foreground">{group}</div>
                    <div className="text-xs font-medium text-primary">
                      x{presentation.appliedGroupRatio.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 text-center">
                    <span className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background/45 px-2 py-0.5 text-xs font-medium text-foreground">
                      {entry.quotaType === 0 ? "按量" : "按次"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-foreground">
                    {entry.quotaType === 0
                      ? formatCny(presentation.inputCny)
                      : formatCny(presentation.requestCny)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-foreground">
                    {entry.quotaType === 0 ? formatCny(presentation.outputCny) : "--"}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-foreground">
                    {entry.quotaType === 0 ? formatCny(presentation.cacheReadCny) : "--"}
                  </TableCell>
                  <TableCell className="px-3 text-right text-sm font-semibold text-foreground">
                    {entry.quotaType === 0
                      ? formatCny(presentation.cacheWriteCny)
                      : formatCny(presentation.requestCny)}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </table>

          {priceTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/70 px-5 py-3">
              <div className="text-xs text-muted-foreground">
                第 {pricePage}/{priceTotalPages} 页，共 {priceTotal} 条
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={pricePage <= 1}
                  onClick={() => setPricePage((p) => p - 1)}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/40 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={pricePage >= priceTotalPages}
                  onClick={() => setPricePage((p) => p + 1)}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/40 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground disabled:opacity-30"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
          </div>{/* end overflow-x-auto */}
        </div>
      )}
    </div>
  );
}
