"use client";

import { Badge } from "@/components/ui/badge";
import { ProviderIcon } from "@/components/provider-icon";

export function ModelBadge({
  modelId,
  variant = "secondary",
  className = "",
}: {
  modelId: string;
  variant?: "secondary" | "outline" | "default" | "destructive";
  className?: string;
}) {
  return (
    <Badge
      variant={variant}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <ProviderIcon modelId={modelId} />
      {modelId}
    </Badge>
  );
}
