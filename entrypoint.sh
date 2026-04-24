#!/bin/sh
set -e

# 自动迁移数据库（首次启动或 schema 变更时）
npx prisma migrate deploy 2>/dev/null || npx prisma db push --skip-generate 2>/dev/null || true

exec node server.js
