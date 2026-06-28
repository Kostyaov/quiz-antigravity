#!/usr/bin/env bash
set -euo pipefail

REMOTE="${DEPLOY_REMOTE:-root@198.46.175.223}"
REMOTE_PATH="${DEPLOY_REMOTE_PATH:-/var/www/quiz-app}"
SITE_URL="${DEPLOY_SITE_URL:-https://uames.pp.ua/}"
BACKUP_DIR="${DEPLOY_BACKUP_DIR:-/root/quiz-app-backups}"
DRY_RUN=0

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
elif [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  cat <<HELP
Deploy Quiz Antigravity production build to VPS.

Usage:
  scripts/deploy-vps.sh
  scripts/deploy-vps.sh --dry-run

Environment overrides:
  DEPLOY_REMOTE=root@198.46.175.223
  DEPLOY_REMOTE_PATH=/var/www/quiz-app
  DEPLOY_SITE_URL=https://uames.pp.ua/
  DEPLOY_BACKUP_DIR=/root/quiz-app-backups
HELP
  exit 0
elif [[ -n "${1:-}" ]]; then
  echo "Unknown argument: $1" >&2
  echo "Use --help for usage." >&2
  exit 2
fi

if [[ ! -f package.json || ! -d src ]]; then
  echo "Run this script from the project root." >&2
  exit 1
fi

case "${REMOTE_PATH}${BACKUP_DIR}" in
  *" "*)
    echo "REMOTE_PATH and BACKUP_DIR must not contain spaces." >&2
    exit 1
    ;;
esac

for required_command in npm ssh rsync curl; do
  if ! command -v "${required_command}" >/dev/null 2>&1; then
    echo "Missing required command: ${required_command}" >&2
    exit 1
  fi
done

echo "Deploy target:"
echo "  SSH:        ${REMOTE}"
echo "  Path:       ${REMOTE_PATH}"
echo "  Site URL:   ${SITE_URL}"
echo "  Backup dir: ${BACKUP_DIR}"
if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "  Mode:       DRY RUN (no remote files will be changed)"
fi
echo

echo "1/5 Running local checks..."
npm run lint
npm run build
npm run security:check

echo
echo "2/5 Checking SSH and remote path..."
ssh -o BatchMode=yes -o ConnectTimeout=8 "${REMOTE}" "test -d '${REMOTE_PATH}' && mkdir -p '${REMOTE_PATH}/dist'"

RSYNC_FLAGS=(-az --delete --no-owner --no-group "--chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r")

if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo
  echo "3/5 Previewing rsync changes..."
  rsync "${RSYNC_FLAGS[@]}" --dry-run --itemize-changes dist/ "${REMOTE}:${REMOTE_PATH}/dist/"
  echo
  echo "Dry run complete. Nothing was deployed."
  exit 0
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="dist-${STAMP}.tar.gz"

echo
echo "3/5 Creating remote backup..."
ssh -o BatchMode=yes -o ConnectTimeout=8 "${REMOTE}" \
  "mkdir -p '${BACKUP_DIR}' && tar -C '${REMOTE_PATH}' -czf '${BACKUP_DIR}/${BACKUP_FILE}' dist"
echo "Backup created: ${BACKUP_DIR}/${BACKUP_FILE}"

echo
echo "4/5 Uploading new dist..."
rsync "${RSYNC_FLAGS[@]}" --itemize-changes dist/ "${REMOTE}:${REMOTE_PATH}/dist/"
ssh -o BatchMode=yes -o ConnectTimeout=8 "${REMOTE}" \
  "chown -R root:root '${REMOTE_PATH}/dist' && find '${REMOTE_PATH}/dist' -type d -exec chmod 755 {} + && find '${REMOTE_PATH}/dist' -type f -exec chmod 644 {} +"

echo
echo "5/5 Checking production site..."
curl -fsSI "${SITE_URL}" >/dev/null
curl -fsSI "${SITE_URL%/}/admin" >/dev/null

HTML="$(curl -fsSL "${SITE_URL}")"
ASSET_PATH="$(printf '%s' "${HTML}" | sed -n 's/.*src="\([^"]*assets\/index-[^"]*\.js\)".*/\1/p' | head -n 1)"
if [[ -n "${ASSET_PATH}" ]]; then
  curl -fsSI "${SITE_URL%/}${ASSET_PATH}" >/dev/null
  echo "Main asset is reachable: ${SITE_URL%/}${ASSET_PATH}"
else
  echo "Warning: could not detect main JS asset in index.html" >&2
fi

echo
echo "Deploy complete:"
echo "  ${SITE_URL}"
echo
echo "Rollback, if needed:"
echo "  ssh ${REMOTE} \"tar -C '${REMOTE_PATH}' -xzf '${BACKUP_DIR}/${BACKUP_FILE}'\""
