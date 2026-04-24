import Link from "next/link";
import type { Site } from "@prisma/client";
import { ArrowUpRight, Layers3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

type SiteWithMetrics = Site & { modelCount: number };

export function SiteCard({
  site,
  rank,
}: {
  site: SiteWithMetrics;
  rank?: number;
}) {
  return (
    <Link href={`/site/${site.id}`} className="group block h-full">
      <Card
        className={cn(
          "h-full gap-0 border border-border/80 bg-card/72 p-0 shadow-[0_24px_80px_-52px_rgba(34,211,238,0.9)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_28px_100px_-44px_rgba(34,211,238,0.7)]",
          site.status === "down" && "border-rose-400/25 shadow-[0_24px_90px_-56px_rgba(251,113,133,0.7)]",
          site.status === "up" && "border-emerald-400/18"
        )}
      >
        <CardHeader className="px-5 pt-5 pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {typeof rank === "number" && (
                  <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-primary">
                    #{String(rank).padStart(2, "0")}
                  </span>
                )}
                <StatusBadge status={site.status} />
                {site.isPaid && (
                  <Badge
                    variant="outline"
                    className="border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300"
                  >
                    Boost
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
                <span className="line-clamp-1">{site.name}</span>
              </CardTitle>
            </div>
            <span className="rounded-full border border-border/70 bg-background/40 p-2 text-muted-foreground transition-colors group-hover:text-primary">
              <ArrowUpRight className="size-4" />
            </span>
          </div>
          <p className="mt-3 line-clamp-1 text-xs text-muted-foreground">
            {site.url}
          </p>
        </CardHeader>

        <CardContent className="px-5 pt-5 pb-5">
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-2xl border border-border/70 bg-background/35 p-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <Layers3 className="size-3.5" />
                模型
              </div>
              <div className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                {site.modelCount}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4 text-xs text-muted-foreground">
            <span className="uppercase tracking-[0.18em]">
              {site.version ?? "Version unknown"}
            </span>
            <span className="text-foreground/80">Inspect node</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
