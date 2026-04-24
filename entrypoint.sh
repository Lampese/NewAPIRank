#!/bin/sh
set -e

# 自动建表
npx prisma db push --skip-generate

# 启动服务
exec node server.js
