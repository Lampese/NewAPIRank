import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MonitorPage() {
  const sites = await prisma.site.findMany({
    orderBy: [{ prices: { _count: "desc" } }, { status: "asc" }],
    include: {
      _count: { select: { prices: true } },
    },
  });

  return (
    <div className="page-shell pb-16 pt-8 sm:pt-10">
      <section className="mt-8 motion-fade-up motion-delay-2">
        <div className="overflow-hidden rounded-[28px] border border-border/70 bg-card/72 shadow-[0_24px_90px_-54px_rgba(34,211,238,0.7)] backdrop-blur-2xl">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow className="border-border/70 bg-background/30 hover:bg-background/30">
                <TableHead className="px-6 py-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  节点
                </TableHead>
                <TableHead className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  状态
                </TableHead>
                <TableHead className="text-right text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  模型数
                </TableHead>
                <TableHead className="px-6 text-right text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  版本
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site, index) => (
                <TableRow
                  key={site.id}
                  className={cn(
                    "border-border/60 hover:bg-background/35",
                    index < 3 && "bg-primary/[0.04]"
                  )}
                >
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-background/55 text-xs font-semibold text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <Link
                          href={`/site/${site.id}`}
                          className="text-sm font-semibold text-foreground hover:text-primary"
                        >
                          {site.name}
                        </Link>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {site.url}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={site.status} />
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {site._count.prices}
                  </TableCell>
                  <TableCell className="px-6 text-right text-sm text-muted-foreground">
                    {site.version ?? "--"}
                  </TableCell>
                </TableRow>
              ))}
              {sites.length === 0 && (
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
      </section>
    </div>
  );
}
