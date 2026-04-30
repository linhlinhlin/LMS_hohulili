#!/bin/bash
# =============================================================================
# Daily R2 backup mirror to GCS
# =============================================================================
#
# Mirrors Cloudflare R2 buckets (lms-cdn + lms-storage) to a GCS bucket using
# rclone. Designed to run as a daily cron on the production VM at 04:00 UTC,
# one hour AFTER the orphan-cleanup scheduler. The GCS bucket has a 30-day
# lifecycle policy so old snapshots auto-expire.
#
# Setup (one-time, on VM):
#   sudo apt-get install -y rclone
#   ./scripts/backup-r2-to-gcs.sh --configure   # writes ~/.config/rclone/rclone.conf
#   crontab -e   # add: 0 4 * * * /home/Admin/LMS_hohulili/scripts/backup-r2-to-gcs.sh >>/var/log/r2-backup.log 2>&1
#
# Usage:
#   ./scripts/backup-r2-to-gcs.sh             # default daily run
#   ./scripts/backup-r2-to-gcs.sh --dry-run   # show what would change
#   ./scripts/backup-r2-to-gcs.sh --configure # write rclone config from .env.prod
#
# Restore:
#   See docs/runbooks/R2_STORAGE_RUNBOOK.md §7.
#
set -euo pipefail

GCS_BUCKET="${GCS_BACKUP_BUCKET:-lms-r2-backup-holilihu}"
ENV_FILE="${ENV_FILE:-/home/Admin/LMS_hohulili/.env.prod}"
RCLONE_CONFIG="${RCLONE_CONFIG:-$HOME/.config/rclone/rclone.conf}"
LOG_PREFIX="[r2-backup $(date -u '+%Y-%m-%dT%H:%M:%SZ')]"

log() { echo "$LOG_PREFIX $*"; }

read_env() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" | cut -d= -f2- | tr -d '\r'
}

configure_rclone() {
  log "Configuring rclone from $ENV_FILE → $RCLONE_CONFIG"
  local AID AKID SK
  AID="$(read_env CLOUDFLARE_R2_ACCOUNT_ID)"
  AKID="$(read_env CLOUDFLARE_R2_ACCESS_KEY)"
  SK="$(read_env CLOUDFLARE_R2_SECRET_KEY)"

  if [ -z "$AID" ] || [ -z "$AKID" ] || [ -z "$SK" ]; then
    echo "ERROR: R2 credentials missing in $ENV_FILE" >&2
    exit 1
  fi

  mkdir -p "$(dirname "$RCLONE_CONFIG")"
  cat > "$RCLONE_CONFIG" <<EOF
[r2]
type = s3
provider = Cloudflare
access_key_id = $AKID
secret_access_key = $SK
endpoint = https://${AID}.r2.cloudflarestorage.com
acl = private

[gcs]
type = google cloud storage
project_number = the-wiii-lab
service_account_file = $HOME/.gcs-backup-sa.json
location = asia-southeast1
storage_class = STANDARD
EOF
  chmod 600 "$RCLONE_CONFIG"
  log "rclone config written. Provide $HOME/.gcs-backup-sa.json (service account JSON)"
}

run_backup() {
  local extra_flags=("$@")
  if [ ! -f "$RCLONE_CONFIG" ]; then
    echo "ERROR: $RCLONE_CONFIG not found. Run with --configure first." >&2
    exit 1
  fi

  local timestamp
  timestamp="$(date -u '+%Y-%m-%d')"

  for bucket in lms-cdn lms-storage; do
    log "Syncing R2 $bucket → gs://$GCS_BUCKET/$timestamp/$bucket"
    rclone sync "r2:$bucket" "gcs:$GCS_BUCKET/$timestamp/$bucket" \
      --transfers=8 \
      --checkers=16 \
      --retries=3 \
      --low-level-retries=10 \
      --stats-one-line \
      --stats=30s \
      "${extra_flags[@]}" || {
        log "WARN: sync of $bucket exited non-zero — continuing"
      }
  done

  log "Backup snapshot: gs://$GCS_BUCKET/$timestamp/"
  log "(GCS lifecycle auto-deletes after 30 days)"
}

case "${1:-}" in
  --configure)
    configure_rclone
    ;;
  --dry-run)
    run_backup --dry-run
    ;;
  --help|-h)
    sed -n '4,30p' "$0"
    ;;
  *)
    run_backup
    ;;
esac
