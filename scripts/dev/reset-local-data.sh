#!/usr/bin/env bash
# Reset local dev data — wipe uploaded files and build caches without touching git.
#
# Use between milestones or when starting a fresh demo dataset.
# Safe to run while containers are stopped. DB is NOT touched — use pg_dump/pg_restore for that.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "== reset-local-data.sh =="
echo "Root: $ROOT"
echo

echo "1/3  Clearing backend/uploads/* (keeps directory structure for Docker volume)"
if [ -d "backend/uploads" ]; then
  for d in backend/uploads/*/; do
    [ -d "$d" ] && rm -rf "$d"*
  done
  echo "     done — $(du -sh backend/uploads | cut -f1) remaining"
else
  echo "     skip (folder missing)"
fi

echo
echo "2/3  Removing FE ephemeral junk (fe/fe, fe/screenshots, fe/.tmp, fe/out-tsc)"
rm -rf fe/fe fe/screenshots fe/.tmp fe/out-tsc
echo "     done"

echo
echo "3/3  Removing Claude Code temp settings"
rm -f .claude/settings.local.json.tmp.*
echo "     done"

echo
echo "Summary (not touched):"
echo "  - .git/                (repo history)"
echo "  - fe/node_modules/     (reinstall with 'npm ci' if needed)"
echo "  - fe/.angular/         (Angular cache — keep for fast rebuild)"
echo "  - backend/target/      (Maven cache — keep for fast rebuild)"
echo "  - backups/             (production DB dumps)"
echo "  - DB                   (use 'docker compose down -v' + migrate to reset)"
