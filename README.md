<div align="center">

# NewAPI Rank

**Real-time monitoring & price comparison for NewAPI sites**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FLampese%2FNewAPIRank&env=DATABASE_URL,INTERNAL_API_KEY&envDescription=Database%20URL%20and%20internal%20API%20key&project-name=newapi-rank)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](#features) | [中文](#特性)

</div>

---

## Features

- **Real-time Monitoring** — Track availability, latency, and uptime of NewAPI instances
- **Price Comparison** — Compare model pricing across sites, find the cheapest option
- **Site Rankings** — Discover top NewAPI sites ranked by performance
- **REST API** — Full public API for programmatic access
- **Dark Mode** — Beautiful dark-first UI with light mode support
- **Self-hostable** — One-click deploy to Vercel, or run anywhere with Node.js

## 特性

- **实时监控** — 追踪 NewAPI 站点的可用性、延迟和在线率
- **价格对比** — 横向对比各站点模型定价，找到最便宜的选择
- **站点排名** — 按性能排名的 NewAPI 站点
- **REST API** — 完整的公开 API 接口
- **暗黑模式** — 精美的暗色优先 UI
- **可自部署** — 一键部署到 Vercel，或在任何 Node.js 环境运行

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| ORM | Prisma (SQLite / PostgreSQL) |
| Deploy | Vercel / Any Node.js host |

## Quick Start

```bash
# Clone
git clone https://github.com/Lampese/NewAPIRank.git
cd NewAPIRank

# Install dependencies
pnpm install

# Setup database
cp .env.example .env
npx prisma db push

# Seed demo data (optional)
npx tsx prisma/seed.ts

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## API

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sites` | List all sites (paginated) |
| GET | `/api/sites/:id` | Site details with models & prices |
| GET | `/api/sites/:id/checks` | Check history |
| GET | `/api/pricing/:modelId` | Price comparison for a model |
| GET | `/api/models` | All tracked models |
| GET | `/api/stats` | Overall statistics |

### Data Push API

For feeding data from your own collector:

```bash
curl -X POST https://your-domain/api/internal/checks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"checks": [{"siteUrl": "https://example.com", "status": "up", "latency": 120}]}'
```

## Deploy

### Vercel (Recommended)

Click the "Deploy with Vercel" button above, set environment variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `INTERNAL_API_KEY` | Secret key for data push API |

### Self-hosted

```bash
pnpm install
pnpm build
pnpm start
```

## Contributing

PRs welcome! Please open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
