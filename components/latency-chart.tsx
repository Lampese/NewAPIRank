"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";

type CheckPoint = {
  latency: number;
  checkedAt: string;
};

export function LatencyChart({ checks }: { checks: CheckPoint[] }) {
  if (checks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-background/35">
        <p className="text-sm text-muted-foreground">暂无延迟数据</p>
      </div>
    );
  }

  const data = checks.map((point) => ({
    time: new Date(point.checkedAt).getTime(),
    latency: point.latency,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart
        data={data}
        margin={{ top: 16, right: 8, left: -18, bottom: 4 }}
      >
        <defs>
          <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="4 8"
          stroke="var(--border)"
          opacity={0.45}
          vertical={false}
        />
        <XAxis
          dataKey="time"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(timestamp) => format(new Date(timestamp), "HH:mm")}
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickMargin={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          tickFormatter={(value) => `${value}ms`}
        />
        <Tooltip
          cursor={{ stroke: "var(--chart-2)", strokeDasharray: "4 8" }}
          contentStyle={{
            backgroundColor: "rgba(8, 18, 31, 0.92)",
            border: "1px solid rgba(103, 232, 249, 0.16)",
            borderRadius: "18px",
            color: "var(--foreground)",
            boxShadow: "0 18px 48px -24px rgba(34, 211, 238, 0.5)",
            fontSize: 13,
            padding: "10px 14px",
          }}
          labelFormatter={(timestamp) =>
            format(new Date(timestamp as number), "MM-dd HH:mm:ss")
          }
          formatter={(value) => [`${value}ms`, "延迟"]}
        />
        <Area
          type="monotone"
          dataKey="latency"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#latencyGradient)"
          dot={false}
          activeDot={{
            r: 4,
            strokeWidth: 0,
            fill: "var(--chart-2)",
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
