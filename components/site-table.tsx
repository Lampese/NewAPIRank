"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Site {
  id: string;
  name: string;
  url: string;
  status: string;
  version: string | null;
  isPaid: boolean;
  modelCount: number;
}

interface SiteListResponse {
  sites: Site[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function SiteTable() {
  const [data, setData] = useState<SiteListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: "20" });
      if (search) params.set("q", search);
      const res = await fetch(`/api/sites/list?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="overflow-hidden rounded-[28px] border border-border/70 bg-card/88 shadow-[0_24px_90px_-54px_rgba(34,211,238,0.7)]">
      <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">站点</div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            站点大全
            {data && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                共 {data.total} 个
              </span>
            )}
          </h2>
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索站点..."
            className="h-9 rounded-xl border-border/70 bg-background/55 pl-9 text-sm"
          />
        </div>
      </div>

      <div>
        <Table>
          <TableHeader>
            <TableRow className="border-border/70 bg-background/30 hover:bg-background/30">
              <TableHead className="px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">节点</TableHead>
              <TableHead className="w-16 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">状态</TableHead>
              <TableHead className="w-16 text-right text-xs uppercase tracking-[0.2em] text-muted-foreground">模型数</TableHead>
              <TableHead className="w-20 px-5 text-right text-xs uppercase tracking-[0.2em] text-muted-foreground">版本</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.sites.map((site, index) => (
              <TableRow
                key={site.id}
                className={cn(
                  "border-border/60 hover:bg-background/35",
                  page === 1 && index < 3 && "bg-primary/[0.04]"
                )}
              >
                <TableCell className="px-5 py-2.5">
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
                <TableCell><StatusBadge status={site.status} /></TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{site.modelCount}</TableCell>
                <TableCell className="px-5 text-right text-sm text-muted-foreground">{site.version ?? "--"}</TableCell>
              </TableRow>
            ))}
            {data?.sites.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                  {search ? "没有匹配的站点" : "暂无站点数据"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/70 px-5 py-3">
          <div className="text-xs text-muted-foreground">
            第 {data.page}/{data.totalPages} 页
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/40 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/40 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
