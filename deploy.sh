#!/usr/bin/env bash
# Frontend deploy. Run on the server from /var/www/lexible/frontend.
#
#   ./deploy.sh
#
# Builds into dist/, which nginx serves at /app-assets. The backend picks up
# the new filenames from dist/.vite/manifest.json on the next request — no
# Laravel restart, no backend deploy.
set -euo pipefail

BRANCH=${BRANCH:-main}

cd "$(dirname "$0")"

echo "→ Kod tortilmoqda ($BRANCH)"
git fetch --quiet origin "$BRANCH"
git reset --hard --quiet "origin/$BRANCH"

echo "→ Bogʼliqliklar"
npm ci --silent

echo "→ Yigʼilmoqda"
npm run build

chown -R www-data:www-data dist

echo "✅ Frontend yangilandi — $(git log -1 --format='%h %s')"
