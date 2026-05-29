#!/usr/bin/env bash
set -euo pipefail

SERVER_HOST="${SERVER_HOST:-47.93.141.241}"
SERVER_USER="${SERVER_USER:-root}"
SERVER="${SERVER_USER}@${SERVER_HOST}"
REMOTE_ROOT="${REMOTE_ROOT:-/opt/caesar}"
REMOTE_APP="${REMOTE_APP:-${REMOTE_ROOT}/caesar_geek}"
REMOTE_DATA="${REMOTE_DATA:-/var/lib/caesar-geek}"
REPO_URL="${REPO_URL:-git@github.com:Caesarderder/caesar_geek.git}"
DEPLOY_REF="${DEPLOY_REF:-main}"

pnpm install --frozen-lockfile
pnpm build

ssh "${SERVER}" "set -euo pipefail
  if ! command -v curl >/dev/null 2>&1; then apt-get update && apt-get install -y curl; fi
  if ! command -v git >/dev/null 2>&1; then apt-get update && apt-get install -y git; fi
  if ! command -v nginx >/dev/null 2>&1; then apt-get update && apt-get install -y nginx; fi
  if ! command -v node >/dev/null 2>&1; then curl -fsSL https://deb.nodesource.com/setup_23.x | bash - && apt-get install -y nodejs; fi
  corepack enable
  corepack prepare pnpm@10.22.0 --activate
  mkdir -p '${REMOTE_ROOT}' '${REMOTE_DATA}'

  if [ -d '${REMOTE_APP}/.git' ]; then
    cd '${REMOTE_APP}'
    git fetch --prune origin '${DEPLOY_REF}'
    git reset --hard 'origin/${DEPLOY_REF}'
  else
    if [ -e '${REMOTE_APP}' ]; then
      mv '${REMOTE_APP}' '${REMOTE_APP}.backup.'\$(date +%Y%m%d%H%M%S)
    fi
    git clone --branch '${DEPLOY_REF}' --single-branch '${REPO_URL}' '${REMOTE_APP}'
    cd '${REMOTE_APP}'
  fi

  pnpm install --frozen-lockfile
  pnpm build
  cp deploy/caesar-geek.service /etc/systemd/system/caesar-geek.service
  cp deploy/nginx.caesar-geek.conf /etc/nginx/sites-available/caesar-geek
  ln -sf /etc/nginx/sites-available/caesar-geek /etc/nginx/sites-enabled/caesar-geek
  rm -f /etc/nginx/sites-enabled/default
  systemctl daemon-reload
  systemctl enable --now caesar-geek
  systemctl restart caesar-geek
  nginx -t
  systemctl reload nginx
  systemctl --no-pager --full status caesar-geek
"

echo "Deployment complete: http://${SERVER_HOST}"
