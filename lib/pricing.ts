import { getSitePricingOverride } from "@/lib/site-pricing-overrides";

type GroupRatios = Record<string, number>;

type PriceLike = {
  quotaType: number;
  modelRatio: number;
  completionRatio: number;
  cacheRatio?: number | null;
  createCacheRatio?: number | null;
  modelPrice: number;
  enableGroups?: string[] | string | null;
};

type SitePricingContext = {
  siteUrl?: string | null;
  upstreamPrice?: number | null;
  quotaDisplayType?: string | null;
  usdExchangeRate?: number | null;
  groupRatios?: string | GroupRatios | null;
};

type PricePresentationOptions = {
  group?: string | null;
};

export type PricePresentation = {
  quotaType: number;
  inputCny: number | null;
  primaryCny: number;
  outputCny: number | null;
  cacheReadCny: number | null;
  cacheWriteCny: number | null;
  requestCny: number | null;
  appliedGroup: string | null;
  appliedGroupRatio: number;
  effectiveRechargeCnyPerUsd: number;
  upstreamFaceValueCnyPerUsd: number;
  primaryUnitLabel: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (isFiniteNumber(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parseGroupRatios(value: SitePricingContext["groupRatios"]): GroupRatios {
  if (!value) {
    return {};
  }

  const rawValue =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return {};
          }
        })()
      : value;

  if (!rawValue || typeof rawValue !== "object") {
    return {};
  }

  const entries = Object.entries(rawValue as Record<string, unknown>)
    .map(([group, ratio]) => [group, toFiniteNumber(ratio)] as const)
    .filter(([, ratio]) => ratio !== null && ratio >= 0)
    .map(([group, ratio]) => [group, ratio as number] as const);

  return Object.fromEntries(entries) as GroupRatios;
}

function parseEnableGroups(value: PriceLike["enableGroups"]): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((group) => typeof group === "string" && group.length > 0);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((group) => typeof group === "string" && group.length > 0)
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

export function getEnabledGroups(value: PriceLike["enableGroups"]): string[] {
  const groups = parseEnableGroups(value);
  return groups.length > 0 ? groups : ["default"];
}

export function getAppliedGroupRatio(
  enableGroupsValue: PriceLike["enableGroups"],
  groupRatiosValue: SitePricingContext["groupRatios"],
  preferredGroup?: string | null
) {
  const enableGroups = parseEnableGroups(enableGroupsValue);
  const groupRatios = parseGroupRatios(groupRatiosValue);

  if (preferredGroup) {
    const ratio = groupRatios[preferredGroup];
    return {
      appliedGroup: preferredGroup,
      appliedGroupRatio:
        isFiniteNumber(ratio) && ratio >= 0 ? ratio : 1,
    };
  }

  let appliedGroup: string | null = null;
  let appliedGroupRatio: number | null = null;

  for (const group of enableGroups) {
    const ratio = groupRatios[group];
    if (!isFiniteNumber(ratio)) {
      continue;
    }

    if (appliedGroupRatio === null || ratio < appliedGroupRatio) {
      appliedGroup = group;
      appliedGroupRatio = ratio;
    }
  }

  return {
    appliedGroup,
    appliedGroupRatio: appliedGroupRatio ?? 1,
  };
}

export function getSiteUsdExchangeRate(value: number | null | undefined) {
  return isFiniteNumber(value) && value > 0 ? value : 7;
}

function normalizeQuotaDisplayType(value: string | null | undefined) {
  const normalized = String(value || "").trim().toUpperCase();
  switch (normalized) {
    case "CNY":
      return "CNY";
    case "USD":
      return "USD";
    case "TOKENS":
      return "TOKENS";
    case "CUSTOM":
      return "CUSTOM";
    default:
      return "";
  }
}

function normalizePositiveFloat(value: unknown) {
  const amount = toFiniteNumber(value);
  return amount !== null && amount > 0 ? amount : 0;
}

export function getUpstreamFaceValueCnyRate(site: SitePricingContext) {
  return normalizePositiveFloat(site.usdExchangeRate);
}

export function getDetectedRechargeCnyPerUsdRate(site: SitePricingContext) {
  const override = getSitePricingOverride(site.siteUrl);
  const overriddenRate = normalizePositiveFloat(
    override?.effectiveRechargeCnyPerUsd
  );
  if (overriddenRate > 0) {
    return overriddenRate;
  }

  const displayType = normalizeQuotaDisplayType(site.quotaDisplayType);
  const upstreamPrice = normalizePositiveFloat(site.upstreamPrice);
  const usdExchangeRate = normalizePositiveFloat(site.usdExchangeRate);

  switch (displayType) {
    case "CNY":
      if (upstreamPrice > 0 && usdExchangeRate > 0) {
        return upstreamPrice * usdExchangeRate;
      }
      if (usdExchangeRate > 0) {
        return usdExchangeRate;
      }
      return 0;
    case "USD":
      if (upstreamPrice > 0) {
        return upstreamPrice;
      }
      if (usdExchangeRate > 0) {
        return usdExchangeRate;
      }
      return 0;
    default:
      return 0;
  }
}

function convertUSDToCNY(priceUSD: number | null, rate: number) {
  const usd = normalizePositiveFloat(priceUSD);
  const cnyRate = normalizePositiveFloat(rate);
  if (usd <= 0 || cnyRate <= 0) {
    return null;
  }
  return usd * cnyRate;
}

export function formatCny(value: number | null | undefined) {
  if (!isFiniteNumber(value)) {
    return "--";
  }

  if (value >= 100) {
    return `¥${value.toFixed(2)}`;
  }
  if (value >= 1) {
    return `¥${value.toFixed(3)}`;
  }
  if (value >= 0.01) {
    return `¥${value.toFixed(4)}`;
  }
  return `¥${value.toFixed(6)}`;
}

export function formatUsdExchangeRate(value: number | null | undefined) {
  const rate = getSiteUsdExchangeRate(value);
  return `¥${rate.toFixed(2)} / $1`;
}

export function formatCnyPerUsdRate(value: number | null | undefined) {
  const rate = normalizePositiveFloat(value);
  if (rate <= 0) {
    return "--";
  }
  return `¥${rate.toFixed(4)} / $1`;
}

export function calculatePricePresentation(
  price: PriceLike,
  site: SitePricingContext,
  options: PricePresentationOptions = {}
): PricePresentation {
  const { appliedGroup, appliedGroupRatio } = getAppliedGroupRatio(
    price.enableGroups,
    site.groupRatios,
    options.group
  );
  const effectiveRechargeCnyPerUsd = getDetectedRechargeCnyPerUsdRate(site);
  const upstreamFaceValueCnyPerUsd = getUpstreamFaceValueCnyRate(site);

  if (price.quotaType === 1) {
    const requestUsd = price.modelPrice * appliedGroupRatio;
    const requestCostCny = convertUSDToCNY(requestUsd, effectiveRechargeCnyPerUsd);
    const requestCny = requestCostCny ?? 0;
    return {
      quotaType: price.quotaType,
      inputCny: null,
      primaryCny: requestCny,
      outputCny: null,
      cacheReadCny: null,
      cacheWriteCny: null,
      requestCny,
      appliedGroup,
      appliedGroupRatio,
      effectiveRechargeCnyPerUsd,
      upstreamFaceValueCnyPerUsd,
      primaryUnitLabel: "¥ / 次",
    };
  }

  const inputUsd = price.modelRatio * 2 * appliedGroupRatio;
  const outputUsd = inputUsd * price.completionRatio;
  const cacheReadUsd =
    isFiniteNumber(price.cacheRatio ?? null) && (price.cacheRatio ?? 0) >= 0
      ? inputUsd * (price.cacheRatio ?? 0)
      : null;
  const cacheWriteUsd =
    isFiniteNumber(price.createCacheRatio ?? null) &&
    (price.createCacheRatio ?? 0) >= 0
      ? inputUsd * (price.createCacheRatio ?? 0)
      : null;

  const inputCostCny = convertUSDToCNY(inputUsd, effectiveRechargeCnyPerUsd);
  const outputCostCny = convertUSDToCNY(outputUsd, effectiveRechargeCnyPerUsd);
  const cacheReadCostCny = convertUSDToCNY(
    cacheReadUsd,
    effectiveRechargeCnyPerUsd
  );
  const cacheWriteCostCny = convertUSDToCNY(
    cacheWriteUsd,
    effectiveRechargeCnyPerUsd
  );

  return {
    quotaType: price.quotaType,
    inputCny: inputCostCny,
    primaryCny: inputCostCny ?? 0,
    outputCny: outputCostCny,
    cacheReadCny: cacheReadCostCny,
    cacheWriteCny: cacheWriteCostCny,
    requestCny: null,
    appliedGroup,
    appliedGroupRatio,
    effectiveRechargeCnyPerUsd,
    upstreamFaceValueCnyPerUsd,
    primaryUnitLabel: "¥ / 1M 输入",
  };
}
