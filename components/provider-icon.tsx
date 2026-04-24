"use client";

import { getProvider } from "@/lib/providers";

export function ProviderIcon({
  modelId,
  className = "size-3.5",
}: {
  modelId: string;
  className?: string;
}) {
  const provider = getProvider(modelId);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={provider.viewBox ?? "0 0 24 24"}
      fill="currentColor"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: provider.icon }}
    />
  );
}
