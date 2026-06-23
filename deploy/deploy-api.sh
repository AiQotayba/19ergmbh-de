#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

corepack enable 2>/dev/null || true

if [ ! -f "$REPO_ROOT/.env" ]; then
  echo "Missing $REPO_ROOT/.env — create it from deploy/env.production.example"
  exit 1
fi

mkdir -p "$REPO_ROOT/logs"

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

echo "==> Generating Prisma client"
pnpm --filter @19er/db db:generate

if [ -d "$REPO_ROOT/packages/db/prisma/migrations" ] && [ -n "$(ls -A "$REPO_ROOT/packages/db/prisma/migrations" 2>/dev/null)" ]; then
  echo "==> Running database migrations"
  pnpm --filter @19er/db db:migrate:deploy
else
  echo "==> Syncing database schema (db push)"
  pnpm --filter @19er/db db:push
fi

echo "==> Building API and workspace dependencies"
pnpm turbo build --filter=@19er/api...

echo "==> Starting / reloading PM2"
pm2 startOrReload "$REPO_ROOT/deploy/ecosystem.config.cjs" --update-env
pm2 save

echo "==> Deploy complete"
pm2 status 19er-api
