#!/bin/sh
set -e

# 自动建表（根据 schema.prisma 同步数据库结构）
npx prisma db push --skip-generate

exec node server.js
