/**
 * FOFA 发现 + 刺探筛选脚本
 *
 * 两步流程，中间通过 JSON 文件衔接，可断点续传：
 *
 *   Step 1 - 拉取: 从 FOFA 分页拉取全量数据，保存到本地 JSON 文件
 *     npx tsx scripts/discover-sites.ts fetch
 *
 *   Step 2 - 刺探: 读取本地 JSON 文件，逐个刺探验证
 *     npx tsx scripts/discover-sites.ts probe
 *     npx tsx scripts/discover-sites.ts probe --import   # 刺探完自动入库
 *
 * fetch 支持断点续传：如果中断了重新跑，会跳过已拉取的页。
 * probe 支持断点续传：如果中断了重新跑，会跳过已刺探的站点。
 *
 * 其他选项:
 *   --query '...'   自定义 FOFA 查询（会自动追加 && domain!=""）
 *   --max 500       限制最大拉取条数
 *   --file path     指定数据文件路径（默认 data/fofa-results.json）
 *
 * 环境变量:
 *   FOFA_EMAIL  - FOFA 账号邮箱
 *   FOFA_KEY    - FOFA API Key
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { normalizeSiteUrl } from "@/lib/site-registry";
import { fetchStatus, fetchPricing } from "@/lib/sync";

// ─── Config ──────────────────────────────────────────────

const DEFAULT_QUERY = `(title="New API" || body="meta name=\\"generator\\" content=\\"new-api\\"") || (body="quota_display_type" && body="usd_exchange_rate" && body="quota_per_unit") || (body="pricing_version" && body="group_ratio" && body="usable_group")`;

const MIN_MODEL_COUNT = 5;
const PROBE_CONCURRENCY = 20;
const FOFA_PAGE_SIZE = 100;
const FOFA_PAGE_DELAY_MS = 1000;
const DEFAULT_DATA_FILE = "data/fofa-results.json";

// ─── Types ───────────────────────────────────────────────

interface FOFAResponse {
  error: boolean;
  errmsg: string;
  query: string;
  page: number;
  size: number;
  results: string[][];
}

interface FOFAEntry {
  host: string;
  ip: string;
  port: string;
  title: string;
  domain: string;
}

interface ProbeResult {
  url: string;
  host: string;
  ip: string;
  port: string;
  title: string;
  valid: boolean;
  reason?: string;
  version?: string;
  modelCount?: number;
  upstreamPrice?: number;
  quotaDisplayType?: string;
  usdExchangeRate?: number;
  groupRatios?: Record<string, number>;
}

interface DataFile {
  query: string;
  fetchedAt: string;
  totalMatches: number;
  pagesFetched: number;
  totalPages: number;
  entries: FOFAEntry[];
  probeResults?: ProbeResult[];
}

// ─── Progress Bar ────────────────────────────────────────

function progressBar(current: number, total: number, width = 30, extra = ""): string {
  const pct = total > 0 ? current / total : 0;
  const filled = Math.round(width * pct);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  const pctStr = (pct * 100).toFixed(1).padStart(5);
  return `  ${bar} ${pctStr}%  (${current}/${total})${extra ? "  " + extra : ""}`;
}

function clearLine() {
  process.stdout.write("\r\x1b[K");
}

// ─── FOFA Fetch ──────────────────────────────────────────

function getFofaCredentials() {
  const email = process.env.FOFA_EMAIL;
  const key = process.env.FOFA_KEY;
  if (!email || !key) {
    throw new Error(
      "请设置环境变量 FOFA_EMAIL 和 FOFA_KEY\n  export FOFA_EMAIL=your@email.com\n  export FOFA_KEY=your-api-key"
    );
  }
  return { email, key };
}

async function fofaSearchPage(
  query: string,
  page: number,
  pageSize: number
): Promise<{ total: number; results: FOFAEntry[] }> {
  const { email, key } = getFofaCredentials();
  const qbase64 = Buffer.from(query).toString("base64");
  const fields = "host,ip,port,title,domain";
  const url =
    `https://fofa.info/api/v1/search/all?email=${encodeURIComponent(email)}` +
    `&key=${encodeURIComponent(key)}` +
    `&qbase64=${encodeURIComponent(qbase64)}` +
    `&fields=${fields}` +
    `&size=${pageSize}` +
    `&page=${page}`;

  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const data: FOFAResponse = await response.json();

  if (data.error) {
    throw new Error(`FOFA API 错误: ${data.errmsg}`);
  }

  return {
    total: data.size,
    results: data.results.map(([host, ip, port, title, domain]) => ({
      host, ip, port, title, domain,
    })),
  };
}

function saveDataFile(filePath: string, data: DataFile) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadDataFile(filePath: string): DataFile | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

async function cmdFetch(opts: { query: string; maxResults: number; filePath: string }) {
  const query = `(${opts.query}) && domain!=""`;

  console.log(`\n🔍 FOFA 查询:\n   ${query}\n`);

  // 尝试恢复
  let data = loadDataFile(opts.filePath);
  let startPage = 1;

  if (data && data.query === query && data.entries.length > 0) {
    startPage = data.pagesFetched + 1;
    console.log(`📂 发现已有数据文件，已拉取 ${data.entries.length} 条 (${data.pagesFetched} 页)`);
    console.log(`   从第 ${startPage} 页继续...\n`);
  } else {
    // 第一页：获取总数
    const first = await fofaSearchPage(query, 1, FOFA_PAGE_SIZE);
    const total = Math.min(first.total, opts.maxResults);
    const totalPages = Math.ceil(total / FOFA_PAGE_SIZE);

    data = {
      query,
      fetchedAt: new Date().toISOString(),
      totalMatches: first.total,
      pagesFetched: 1,
      totalPages,
      entries: [...first.results],
    };

    saveDataFile(opts.filePath, data);

    console.log(`   总匹配数: ${first.total}`);
    console.log(`   计划拉取: ${total} 条 (${totalPages} 页)\n`);
    clearLine();
    process.stdout.write(progressBar(1, totalPages, 30, `第 1 页 +${first.results.length} 条`));

    startPage = 2;
  }

  const totalPages = data.totalPages;
  const maxEntries = Math.min(data.totalMatches, opts.maxResults);

  for (let page = startPage; page <= totalPages; page++) {
    if (data.entries.length >= maxEntries) break;

    await sleep(FOFA_PAGE_DELAY_MS);

    try {
      const pageData = await fofaSearchPage(query, page, FOFA_PAGE_SIZE);
      data.entries.push(...pageData.results);
      data.pagesFetched = page;
      saveDataFile(opts.filePath, data);

      clearLine();
      process.stdout.write(
        progressBar(page, totalPages, 30, `第 ${page} 页 +${pageData.results.length} 条  累计 ${data.entries.length}`)
      );
    } catch (err) {
      clearLine();
      console.log(`\n   ⚠ 第 ${page} 页失败: ${err instanceof Error ? err.message : err}`);
      console.log(`   已保存 ${data.entries.length} 条，重新运行 fetch 可继续`);
      return;
    }
  }

  clearLine();
  console.log(`\n✅ FOFA 拉取完成: ${data.entries.length} 条，保存到 ${opts.filePath}`);

  // 去重统计
  const unique = dedupEntries(data.entries);
  console.log(`   去重后: ${unique.length} 个唯一域名站点`);
}

// ─── Probe ───────────────────────────────────────────────

function buildUrl(host: string, port: string): string {
  if (host.startsWith("http://") || host.startsWith("https://")) {
    return host.replace(/\/+$/, "");
  }
  const protocol = ["443", "8443"].includes(port) ? "https" : "http";
  return `${protocol}://${host}`.replace(/\/+$/, "");
}

async function probeSite(entry: FOFAEntry): Promise<ProbeResult> {
  const url = buildUrl(entry.host, entry.port);
  const result: ProbeResult = {
    url,
    host: entry.host,
    ip: entry.ip,
    port: entry.port,
    title: entry.title,
    valid: false,
  };

  try {
    const hostname = new URL(url).hostname;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      result.reason = "纯 IP 无域名";
      return result;
    }

    const status = await fetchStatus(url);
    if (status.status === "down") {
      result.reason = "站点不可达";
      return result;
    }

    // 检查自用模式
    if (status.selfUseMode) {
      result.reason = "自用模式";
      return result;
    }

    result.version = status.version;
    result.upstreamPrice = status.upstreamPrice;
    result.quotaDisplayType = status.quotaDisplayType;
    result.usdExchangeRate = status.usdExchangeRate;

    const pricing = await fetchPricing(url);

    if (pricing.entries.length === 0) {
      result.reason = "pricing 接口无数据";
      return result;
    }

    if (pricing.entries.length < MIN_MODEL_COUNT) {
      result.reason = `模型数量太少 (${pricing.entries.length} < ${MIN_MODEL_COUNT})`;
      return result;
    }

    const modelNames = pricing.entries.map((e) => e.model_name.toLowerCase());
    const mainstreamModels = [
      "gpt-4o", "gpt-4", "gpt-3.5-turbo",
      "claude-3", "claude-3.5", "claude-sonnet",
      "deepseek", "gemini",
    ];
    const hasMainstream = mainstreamModels.some((m) =>
      modelNames.some((name) => name.includes(m))
    );

    if (!hasMainstream) {
      result.reason = "无主流模型，可能不是正常 API 站";
      return result;
    }

    const validEntries = pricing.entries.filter(
      (e) => e.model_name && e.model_name.length > 2
    );
    if (validEntries.length < MIN_MODEL_COUNT) {
      result.reason = `有效模型名太少 (${validEntries.length})`;
      return result;
    }

    result.valid = true;
    result.modelCount = pricing.entries.length;
    result.groupRatios = pricing.groupRatios;
    return result;
  } catch (err) {
    result.reason = err instanceof Error ? err.message : String(err);
    return result;
  }
}

async function cmdProbe(opts: { filePath: string; doImport: boolean }) {
  const data = loadDataFile(opts.filePath);
  if (!data) {
    console.log(`❌ 数据文件不存在: ${opts.filePath}\n   请先运行: npx tsx scripts/discover-sites.ts fetch`);
    return;
  }

  console.log(`\n📂 加载 ${opts.filePath}: ${data.entries.length} 条 FOFA 数据`);

  // 去重
  const unique = dedupEntries(data.entries);
  console.log(`   去重后: ${unique.length} 个唯一域名站点`);

  // 恢复已刺探的进度
  const existingResults = data.probeResults ?? [];
  const probedUrls = new Set(existingResults.map((r) => r.url));
  const toDo = unique.filter((e) => !probedUrls.has(buildUrl(e.host, e.port)));

  if (toDo.length === 0 && existingResults.length > 0) {
    console.log(`   ✅ 所有站点已刺探完毕，跳过刺探阶段\n`);
  } else {
    if (existingResults.length > 0) {
      console.log(`   已刺探: ${existingResults.length}，剩余: ${toDo.length}\n`);
    }

    console.log(`🔬 开始刺探...\n`);

    let completed = existingResults.length;
    const total = unique.length;

    // 逐批刺探，每批完成后保存
    const batchSize = PROBE_CONCURRENCY;
    for (let i = 0; i < toDo.length; i += batchSize) {
      const batch = toDo.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((entry) => probeSite(entry)));

      for (const r of batchResults) {
        existingResults.push(r);
        completed++;

        const icon = r.valid ? "✅" : "❌";
        const detail = r.valid
          ? `${r.modelCount} 模型, v${r.version || "?"}`
          : r.reason;

        clearLine();
        process.stdout.write(
          progressBar(completed, total, 30, `${icon} ${r.url} — ${detail}`)
        );
        // 换行让每条记录可见
        process.stdout.write("\n");
      }

      // 每批保存一次
      data.probeResults = existingResults;
      saveDataFile(opts.filePath, data);
    }

    clearLine();
    console.log("");
  }

  // 汇总
  const allResults = existingResults;
  const validRaw = allResults.filter((r) => r.valid);
  const invalid = allResults.filter((r) => !r.valid);

  const afterProtocol = dedupProtocol(validRaw);
  const protocolDeduped = validRaw.length - afterProtocol.length;

  const { kept: valid, deduped: clusterDeduped } = dedupSameCluster(afterProtocol);

  console.log("═".repeat(60));
  console.log(`📊 结果汇总`);
  console.log(`   FOFA 数据: ${data.entries.length}`);
  console.log(`   去重后刺探: ${unique.length}`);
  console.log(`   刺探有效: ${validRaw.length}`);
  if (protocolDeduped > 0) console.log(`   HTTP/HTTPS 去重: -${protocolDeduped}`);
  if (clusterDeduped.length > 0) console.log(`   同网段同模型数去重: -${clusterDeduped.length}`);
  console.log(`   最终有效: ${valid.length}`);
  console.log(`   无效: ${invalid.length}`);
  console.log("═".repeat(60));

  if (valid.length > 0) {
    console.log("\n✅ 有效站点:");
    for (const r of valid) {
      console.log(
        `   ${r.url}  |  ${r.title || "N/A"}  |  ${r.modelCount} 模型  |  v${r.version || "?"}`
      );
    }
  }

  if (clusterDeduped.length > 0) {
    console.log("\n🔁 同网段同模型数去重掉的:");
    for (const r of clusterDeduped) {
      console.log(`   ${r.url}  |  ${r.modelCount} 模型  |  ${r.ip}`);
    }
  }

  // 无效的太多不逐条打了，按原因分组
  if (invalid.length > 0) {
    const reasonCount = new Map<string, number>();
    for (const r of invalid) {
      const reason = r.reason || "未知";
      reasonCount.set(reason, (reasonCount.get(reason) || 0) + 1);
    }
    console.log("\n❌ 筛除统计:");
    for (const [reason, count] of [...reasonCount.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`   ${count.toString().padStart(4)} 个  ${reason}`);
    }
  }

  // 导入
  if (opts.doImport && valid.length > 0) {
    console.log("\n📥 导入到数据库...\n");
    await importSites(valid);
  } else if (opts.doImport && valid.length === 0) {
    console.log("\n没有有效站点可导入");
  } else if (valid.length > 0) {
    console.log(
      `\n💡 如需导入，请加 --import 参数:\n   npx tsx scripts/discover-sites.ts probe --import`
    );
  }
}

// ─── Dedup Helpers ───────────────────────────────────────

function dedupEntries(entries: FOFAEntry[]): FOFAEntry[] {
  // 1. URL 去重
  const seen = new Set<string>();
  const urlDeduped = entries.filter((e) => {
    const url = normalizeSiteUrl(buildUrl(e.host, e.port));
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  // 2. 同域名去重，优先 443
  const domainMap = new Map<string, FOFAEntry>();
  for (const e of urlDeduped) {
    const domain = e.domain?.toLowerCase();
    if (!domain) continue;
    const existing = domainMap.get(domain);
    if (!existing) {
      domainMap.set(domain, e);
    } else if (e.port === "443" && existing.port !== "443") {
      domainMap.set(domain, e);
    }
  }
  return [...domainMap.values()];
}

function dedupProtocol(results: ProbeResult[]): ProbeResult[] {
  const map = new Map<string, ProbeResult>();
  for (const r of results) {
    const bare = r.url.replace(/^https?:\/\//, "");
    const existing = map.get(bare);
    if (!existing) {
      map.set(bare, r);
    } else if (r.url.startsWith("https://") && existing.url.startsWith("http://")) {
      map.set(bare, r);
    }
  }
  return [...map.values()];
}

function dedupSameCluster(
  results: ProbeResult[]
): { kept: ProbeResult[]; deduped: ProbeResult[] } {
  function getSubnet(ip: string): string | null {
    const parts = ip.split(".");
    if (parts.length !== 4) return null;
    return parts.slice(0, 3).join(".");
  }

  const clusterMap = new Map<string, ProbeResult[]>();
  for (const r of results) {
    const subnet = getSubnet(r.ip);
    if (!subnet) continue;
    const key = `${subnet}:${r.modelCount ?? 0}`;
    const group = clusterMap.get(key);
    if (group) group.push(r);
    else clusterMap.set(key, [r]);
  }

  const kept: ProbeResult[] = [];
  const deduped: ProbeResult[] = [];

  for (const r of results) {
    if (!getSubnet(r.ip)) kept.push(r);
  }

  for (const [, group] of clusterMap) {
    if (group.length === 1) {
      kept.push(group[0]);
    } else {
      group.sort((a, b) => {
        const aD = /^\d+\.\d+\.\d+\.\d+/.test(new URL(a.url).hostname) ? 0 : 1;
        const bD = /^\d+\.\d+\.\d+\.\d+/.test(new URL(b.url).hostname) ? 0 : 1;
        if (aD !== bD) return bD - aD;
        const aH = a.url.startsWith("https://") ? 1 : 0;
        const bH = b.url.startsWith("https://") ? 1 : 0;
        return bH - aH;
      });
      kept.push(group[0]);
      deduped.push(...group.slice(1));
    }
  }

  return { kept, deduped };
}

// ─── Import to DB ────────────────────────────────────────

async function importSites(validResults: ProbeResult[]) {
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.site.findMany({ select: { url: true } });
    const existingUrls = new Set(existing.map((s) => normalizeSiteUrl(s.url)));

    let imported = 0;
    for (const r of validResults) {
      const normalized = normalizeSiteUrl(r.url);
      if (existingUrls.has(normalized)) {
        console.log(`  ⏭  ${r.url} — 已存在，跳过`);
        continue;
      }

      const name = extractSiteName(r.url, r.title);
      const site = await prisma.site.create({
        data: {
          name,
          url: r.url,
          status: "up",
          version: r.version,
          upstreamPrice: r.upstreamPrice ?? 1,
          quotaDisplayType: r.quotaDisplayType ?? "USD",
          usdExchangeRate: r.usdExchangeRate ?? 7,
          groupRatios: JSON.stringify(r.groupRatios ?? {}),
        },
      });

      // 立即拉取价格数据写入
      const pricing = await fetchPricing(r.url);
      if (pricing.entries.length > 0) {
        await prisma.price.createMany({
          data: pricing.entries.map((entry) => ({
            siteId: site.id,
            modelName: entry.model_name,
            quotaType: entry.quota_type ?? 0,
            modelRatio: entry.model_ratio ?? 0,
            completionRatio: entry.completion_ratio ?? 0,
            cacheRatio: entry.cache_ratio ?? null,
            createCacheRatio: entry.create_cache_ratio ?? null,
            modelPrice: entry.model_price ?? 0,
            enableGroups: JSON.stringify(entry.enable_groups ?? []),
          })),
        });
      }

      existingUrls.add(normalized);
      imported++;
      console.log(`  ✅ ${name} (${r.url}) — 已导入 (${pricing.entries.length} 模型)`);
    }

    console.log(`\n导入完成: ${imported} 个新站点`);
  } finally {
    await prisma.$disconnect();
  }
}

function extractSiteName(url: string, title: string): string {
  if (title && title !== "New API") {
    return (
      title.replace(/\s*[-–|]\s*(New API|One API|登录|注册|首页).*/i, "").trim() || title
    );
  }
  try {
    return new URL(url).hostname.replace(/^(www|api)\./, "");
  } catch {
    return url;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── CLI ─────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0]; // fetch | probe

  let query = DEFAULT_QUERY;
  let maxResults = Infinity;
  let doImport = false;
  let filePath = DEFAULT_DATA_FILE;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--query" && args[i + 1]) query = args[++i];
    else if (args[i] === "--max" && args[i + 1]) maxResults = parseInt(args[++i], 10);
    else if (args[i] === "--import") doImport = true;
    else if (args[i] === "--file" && args[i + 1]) filePath = args[++i];
  }

  return { command, query, maxResults, doImport, filePath };
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  switch (opts.command) {
    case "fetch":
      await cmdFetch({ query: opts.query, maxResults: opts.maxResults, filePath: opts.filePath });
      break;

    case "probe":
      await cmdProbe({ filePath: opts.filePath, doImport: opts.doImport });
      break;

    default:
      console.log(`
用法:
  npx tsx scripts/discover-sites.ts fetch             # Step 1: 拉取 FOFA 数据
  npx tsx scripts/discover-sites.ts probe             # Step 2: 刺探验证
  npx tsx scripts/discover-sites.ts probe --import    # Step 2: 刺探 + 导入

选项:
  --query '...'    自定义 FOFA 查询
  --max 500        限制最大拉取条数
  --file path      指定数据文件路径 (默认 data/fofa-results.json)
  --import         刺探完自动导入数据库
      `);
      break;
  }
}

main().catch((err) => {
  console.error("\n💥 错误:", err.message || err);
  process.exitCode = 1;
});
