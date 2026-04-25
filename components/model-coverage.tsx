"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ProviderIcon } from "@/components/provider-icon";
import { Input } from "@/components/ui/input";
import { getProvider } from "@/lib/providers";
import { cn } from "@/lib/utils";

interface ModelItem {
  modelName: string;
  count: number;
}

interface ModelListResponse {
  models: ModelItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function ModelCoverage({
  maxCoverage,
}: {
  maxCoverage: number;
}) {
  const [data, setData] = useState<ModelListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: "10" });
      if (search) params.set("q", search);
      const res = await fetch(`/api/models/list?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="observatory-panel p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">模型</div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            模型覆盖
            {data && (
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                {data.total}
              </span>
            )}
          </h2>
        </div>
      </div>

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="搜索模型..."
          className="h-8 rounded-xl border-border/70 bg-background/55 pl-9 text-xs"
        />
      </div>

      <div className="mt-4 space-y-2.5">
        {data?.models.map((item) => {
          const provider = getProvider(item.modelName);
          return (
            <div key={item.modelName}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/40"
                    style={{ color: provider.color }}
                  >
                    <ProviderIcon modelId={item.modelName} className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{item.modelName}</div>
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm font-semibold text-foreground">{item.count}</div>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-background/55">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-300 to-emerald-300"
                  style={{ width: `${(item.count / maxCoverage) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
        {data?.models.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/70 bg-background/20 px-4 py-6 text-center text-sm text-muted-foreground">
            {search ? "没有匹配的模型" : "暂无数据"}
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {data.page}/{data.totalPages}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex size-7 items-center justify-center rounded-lg border border-border/70 bg-background/40 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex size-7 items-center justify-center rounded-lg border border-border/70 bg-background/40 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
