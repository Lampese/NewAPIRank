#!/bin/sh
set -e

# 自动建表
npx prisma db push --skip-generate

# 启动服务
node server.js &
SERVER_PID=$!

# 等待服务就绪后自动触发一次价格同步
sleep 3
wget -qO- --header="Authorization: Bearer ${CRON_SECRET}" --post-data='' http://localhost:3000/api/cron/sync-prices > /dev/null 2>&1 &

wait $SERVER_PID
