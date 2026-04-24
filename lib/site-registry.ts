export type SiteRegistryEntry = {
  name: string;
  url: string;
};

export const siteRegistry: SiteRegistryEntry[] = [
  {
    name: "米醋 API (OpenClaudeCode)",
    url: "https://www.openclaudecode.cn",
  },
  {
    name: "APIAPI",
    url: "https://apiapi.chat",
  },
  {
    name: "Hiyo API",
    url: "https://api.hiyo.top",
  },
];

export function normalizeSiteUrl(url: string) {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}
