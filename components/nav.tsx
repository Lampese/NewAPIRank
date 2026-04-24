"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Activity, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [{ href: "/", label: "首页" }];

function GitHubMark({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M12 .5C5.65.5.5 5.66.5 12.03c0 5.1 3.3 9.43 7.88 10.96.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.21.7-3.89-1.36-3.89-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.71.08-.71 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.34.95.1-.74.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.72 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.19 1.18a10.9 10.9 0 0 1 5.81 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.24 2.77.12 3.06.74.81 1.18 1.84 1.18 3.1 0 4.45-2.69 5.42-5.26 5.71.41.36.78 1.06.78 2.15 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.56A11.54 11.54 0 0 0 23.5 12.03C23.5 5.66 18.35.5 12 .5Z" />
    </svg>
  );
}

export function Nav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full px-3 pt-3 sm:px-4">
      <div className="page-shell">
        <div className="overflow-hidden rounded-[28px] border border-border/70 bg-background/88 shadow-[0_24px_80px_-48px_rgba(34,211,238,0.65)]">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-4 sm:gap-8">
          <Link
            href="/"
                className="flex items-center gap-3 text-foreground"
          >
                <span className="flex size-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_30px_-18px_rgba(34,211,238,0.9)]">
                  <Activity className="size-4" />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold uppercase tracking-[0.22em]">
                    NewAPI Rank
                  </span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    站点状态和价格
                  </span>
                </span>
          </Link>
              <div className="hidden items-center gap-3 xl:flex">
                <span className="signal-chip border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                  </span>
                  已更新
                </span>
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  站点大全 · 模型价格
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <nav className="hidden items-center gap-1 md:flex">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                      pathname === link.href
                        ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_rgba(103,232,249,0.16)]"
                        : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full border border-border/60 bg-background/40"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
              </Button>
              <a
                href="https://github.com/Lampese/NewAPIRank"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full border border-border/60 bg-background/40"
                >
                  <GitHubMark className="size-4" />
                </Button>
              </a>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-3 md:hidden [&::-webkit-scrollbar]:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                  pathname === link.href
                    ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_rgba(103,232,249,0.16)]"
                    : "bg-background/30 text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
