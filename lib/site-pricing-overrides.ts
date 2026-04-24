export type SitePricingOverride = {
  effectiveRechargeCnyPerUsd?: number;
};

// Manual cost overrides for sites whose real spending rate differs from the
// publicly exposed display settings. Key by canonical site URL.
export const sitePricingOverrides: Record<string, SitePricingOverride> = {
  "https://apiapi.chat": {
    effectiveRechargeCnyPerUsd: 1,
  },
};

function normalizeSiteUrl(url: string) {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

export function getSitePricingOverride(siteUrl?: string | null) {
  if (!siteUrl) {
    return null;
  }

  return sitePricingOverrides[normalizeSiteUrl(siteUrl)] ?? null;
}
