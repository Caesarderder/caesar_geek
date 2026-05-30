#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly APP_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

SERVER_HOST="${SERVER_HOST:-47.93.141.241}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_PORT="${SERVER_PORT:-22}"
REMOTE_ROOT="${REMOTE_ROOT:-/opt/caesar}"
REMOTE_APP="${REMOTE_APP:-${REMOTE_ROOT}/caesar_geek}"
REMOTE_DATA="${REMOTE_DATA:-/var/lib/caesar-geek}"
SKIP_LOCAL_BUILD="${SKIP_LOCAL_BUILD:-0}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

die() {
  log "ERROR: $*" >&2
  exit 1
}

usage() {
  cat <<EOF
Usage: ${SCRIPT_NAME}

Sync local working tree changes to the cloud server, then rebuild and restart.

Environment:
  SERVER_HOST       Cloud server host/IP. Default: ${SERVER_HOST}
  SERVER_USER       SSH user. Default: ${SERVER_USER}
  SERVER_PORT       SSH port. Default: ${SERVER_PORT}
  REMOTE_ROOT       Remote parent directory. Default: ${REMOTE_ROOT}
  REMOTE_APP        Remote app directory. Default: ${REMOTE_APP}
  REMOTE_DATA       Remote data directory. Default: ${REMOTE_DATA}
  SKIP_LOCAL_BUILD  Set to 1 to skip local pnpm install/build preflight.

Examples:
  SERVER_USER=root ./deploy/${SCRIPT_NAME}
  SERVER_USER=ubuntu SERVER_HOST=example.com ./deploy/${SCRIPT_NAME}
  SKIP_LOCAL_BUILD=1 ./deploy/${SCRIPT_NAME}
EOF
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

ssh_target() {
  printf '%s@%s' "${SERVER_USER}" "${SERVER_HOST}"
}

run_local_preflight() {
  if [[ "${SKIP_LOCAL_BUILD}" == "1" ]]; then
    log "Skipping local build preflight"
    return
  fi

  log "Running local install and build preflight"
  (
    cd "${APP_ROOT}"
    pnpm install --frozen-lockfile
    pnpm build
  )
}

prepare_remote() {
  log "Preparing remote host $(ssh_target)"
  ssh -p "${SERVER_PORT}" "$(ssh_target)" "REMOTE_ROOT='${REMOTE_ROOT}' REMOTE_APP='${REMOTE_APP}' REMOTE_DATA='${REMOTE_DATA}' bash -s" <<'REMOTE'
set -euo pipefail
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null 2>&1 || { echo "sudo is required for non-root deployment user" >&2; exit 1; }
  SUDO="sudo"
fi

if ! command -v curl >/dev/null 2>&1; then $SUDO apt-get update && $SUDO apt-get install -y curl; fi
if ! command -v rsync >/dev/null 2>&1; then $SUDO apt-get update && $SUDO apt-get install -y rsync; fi
if ! command -v nginx >/dev/null 2>&1; then $SUDO apt-get update && $SUDO apt-get install -y nginx; fi
if ! command -v node >/dev/null 2>&1; then curl -fsSL https://deb.nodesource.com/setup_23.x | $SUDO bash - && $SUDO apt-get install -y nodejs; fi

$SUDO corepack enable
$SUDO corepack prepare pnpm@10.22.0 --activate
$SUDO mkdir -p "${REMOTE_ROOT}" "${REMOTE_APP}" "${REMOTE_DATA}"
$SUDO chown -R "$(id -u):$(id -g)" "${REMOTE_APP}"
REMOTE
}

sync_local_changes() {
  log "Uploading local working tree to $(ssh_target):${REMOTE_APP}"
  rsync -az --delete \
    -e "ssh -p ${SERVER_PORT}" \
    --exclude '.git/' \
    --exclude '.env' \
    --exclude '.env.*' \
    --exclude 'node_modules/' \
    --exclude 'dist/' \
    --exclude 'coverage/' \
    --exclude '*.log' \
    --exclude '.turbo/' \
    --exclude '.vite/' \
    --exclude '.DS_Store' \
    "${APP_ROOT}/" "$(ssh_target):${REMOTE_APP}/"
}

deploy_remote() {
  log "Installing dependencies, building, and restarting services on remote"
  ssh -p "${SERVER_PORT}" "$(ssh_target)" "REMOTE_APP='${REMOTE_APP}' REMOTE_DATA='${REMOTE_DATA}' bash -s" <<'REMOTE'
set -euo pipefail
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null 2>&1 || { echo "sudo is required for non-root deployment user" >&2; exit 1; }
  SUDO="sudo"
fi

cd "${REMOTE_APP}"
pnpm install --frozen-lockfile
pnpm build

$SUDO cp deploy/caesar-geek.service /etc/systemd/system/caesar-geek.service
$SUDO cp deploy/nginx.caesar-geek.conf /etc/nginx/sites-available/caesar-geek
$SUDO ln -sf /etc/nginx/sites-available/caesar-geek /etc/nginx/sites-enabled/caesar-geek
$SUDO rm -f /etc/nginx/sites-enabled/default

$SUDO systemctl daemon-reload
$SUDO systemctl enable --now caesar-geek
$SUDO systemctl restart caesar-geek
$SUDO nginx -t
$SUDO systemctl reload nginx
$SUDO systemctl --no-pager --full status caesar-geek
REMOTE
}

main() {
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi

  require_command ssh
  require_command rsync
  if [[ "${SKIP_LOCAL_BUILD}" != "1" ]]; then
    require_command pnpm
  fi

  run_local_preflight
  prepare_remote
  sync_local_changes
  deploy_remote

  log "Deployment complete: http://${SERVER_HOST}"
}

main "$@"
