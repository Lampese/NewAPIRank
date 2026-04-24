import { cn } from "@/lib/utils";

const statusConfig = {
  up: {
    label: "在线",
    dotClass: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]",
    className:
      "border-emerald-400/20 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
  },
  down: {
    label: "离线",
    dotClass: "bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.8)]",
    className:
      "border-rose-400/20 bg-rose-400/10 text-rose-700 dark:text-rose-300",
  },
  unknown: {
    label: "未知",
    dotClass: "bg-slate-400 shadow-[0_0_12px_rgba(148,163,184,0.6)]",
    className:
      "border-slate-400/20 bg-slate-400/10 text-slate-600 dark:text-slate-300",
  },
} as const;

type Status = keyof typeof statusConfig;

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const config = statusConfig[(status as Status) ?? "unknown"] ?? statusConfig.unknown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em]",
        config.className,
        className
      )}
    >
      <span
        className={cn("size-2 rounded-full", config.dotClass)}
        aria-hidden="true"
      />
      <span>{config.label}</span>
    </span>
  );
}
