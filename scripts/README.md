# Scripts Guide

This folder contains operational helpers that are useful locally but are not part of the application runtime.

## Folders

- `db/`: database export/import helpers.
- `dev/`: local development convenience scripts.
- `debug/`: one-off debugging helpers such as browser automation capture.

## Usage Notes

- Treat scripts here as operator utilities, not production entrypoints.
- If you add manual verification helpers again, keep them current with the live API version and place them under a dedicated subfolder.
- Generated artifacts from these scripts should stay out of the repository root.
- `dev/coord-watch.ps1` is a local coordination utility for watcher-style mailbox workflows under `coord/`.
- `dev/reset-local-data.sh` wipes local dev uploads + FE ephemeral junk (does NOT touch git, node_modules, build caches, or DB). Useful between milestones or before a fresh demo dataset.
- `prod-video-smoke.ps1` exercises the production upload -> asset -> manifest path with a real file.
- `run-distributed-scenario.ps1` is the current helper for two-origin playback bursts (`local + worker VM`) against a ready URL.
- `debug/pwa-repair-smoke.py` captures the production PWA repair flow into `.tmp-playwright-storage-smoke/`.
- `debug/student-storage-actions-smoke.py` and `debug/student-storage-recovery-cta-smoke.py` are reusable Playwright helpers for learner storage/offline smoke runs.
- `.tmp-playwright-storage-smoke/` is now treated as generated output only; keep the scripts under `scripts/debug/` and keep the artifacts out of Git.
