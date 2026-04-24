# Changelog

All notable project changes are recorded here.

This file follows the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), but stays concise and focused on current runtime truth.

## [Unreleased]

### Documentation

- Rebuilt the canonical entrypoint docs: `README.md`, `backend/README.md`, `docs/README.md`, `docs/reference/PRODUCTION_SURFACES.md`, and `docs/testing/*`
- Clarified current runtime truth for video, offline, payment, and the smoke-first E2E gate
- Tightened `.gitignore` for local temp artifacts and test artifacts

## [2026-04-24] — Faculty milestone checkpoint

### Production / Infra

- `deploy.yml` now gates the SSH deploy step on the repo variable `DEPLOY_ENABLED`; build images still push to GHCR on every commit
- Production GCP VM `lms-production` paused to conserve free-trial credits — static IP and disk preserved; resume via [`docs/runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md`](docs/runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md)
- Production DB backed up to `backups/prod-2026-04-24.dump` (483 KB, `pg_restore` custom format)

### Authoring

- Video upload flow redesigned to SOTA pattern: client-side metadata probe, phase-aware processing timeline (Tải lên → Giải mã → Đóng gói → Sẵn sàng), categorized error taxonomy with recovery hints, completion toast + `document.title` indicator, Esc-to-cancel, aria-live progress, OnPush-safe signals

### Repo Health (2026-04-24 audit)

- Local disk footprint reduced 8.1 GB → 1.4 GB (emptied `backend/uploads/` 6.7 GB of dev-only media, removed accidental `fe/fe/` nest, cleared FE debug/tmp folders, purged root PNG/docx leftovers)
- Consolidated 6 duplicate AI-tool skill folders (`.agent/`, `.agents/`, `.kiro/`, `.qwen/`, `skills/`, `skills-lock.json`) into a single `.claude/skills/` (−278 files, −67k LOC)
- Archived Q1 2026 working docs under `docs/archive/2026-Q1/` per new `DOCUMENTATION_POLICY.md §6`; academic/thesis artifacts moved to `docs/academic/`; 83 `git mv` operations preserve history
- Added `SECURITY.md`, `.github/CODEOWNERS`, `.github/ISSUE_TEMPLATE/{bug_report,feature_request,documentation}.md`, `.github/pull_request_template.md`
- Added runbooks: `docs/runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md`, `docs/runbooks/BRANCH_HYGIENE_RUNBOOK.md`
- Added `scripts/dev/reset-local-data.sh` for repeatable local cleanup
- Full audit report: [`docs/reports/2026-04-24-repo-health-audit.md`](docs/reports/2026-04-24-repo-health-audit.md)

### PWA

- Offline indicator detection fixed for desktop/laptop devices (fell through on some network stacks)

## [2026-03-24]

### Payment / Access Truth

- Normalized payment runtime around backend truth instead of local optimistic state
- Locked the three post-payment access states:
  - `READY`
  - `MANUAL_ACTIVATION_REQUIRED`
  - `ACCESS_PENDING`
- Hardened SePay webhook semantics to return accurate `401` / `400` / `201` / `200`
- Updated public course detail behavior to prioritize enrollment/access truth over stale receipt assumptions
- Preserved correct instructor-led behavior: payment completion does not imply direct learner access is immediately ready

### Offline / Learning Progress

- Extended offline fallback to video progress, lesson progress, section completion, and lesson completion
- Standardized additive / forward-only progress convergence:
  - `watchSeconds = max`
  - `completedSections = union`
  - `COMPLETED` never rolls backward
- Split offline sync conflicts from generic failed queue items
- Surfaced conflict, stale state, and retry affordances more clearly in storage/offline UX

### Messaging / Notifications

- Removed the main silent-failure paths in messaging, notifications, class deletion, and instructor refresh flows
- Added scoped recipient discovery plus authorization guards for new conversation initiation
- Fixed polling flows so rendered conversation state follows live backend truth
- Standardized near-real-time messaging on controlled polling rather than drifting local-only state

### Test / Validation

- Formalized the smoke-first browser strategy:
  - `test:e2e:smoke`
  - `test:e2e:release`
- Added new smoke coverage for:
  - offline learning
  - online learning progress
  - payment boundaries
- Local release smoke now covers the highest-value payment/offline/progress slices

## [2026-03-20]

### Video / Production Topology

- Finalized the dedicated GCP `video-worker` VM for ingest
- Finalized `media.holilihu.online` on Cloudflare Free via Worker custom domain for edge auth
- Recorded the distributed playback baseline from `local + worker VM`
- Synced runbooks and production docs to the actual deployed topology

## [2026-03-18] - [2026-03-19]

### Video Runtime Cutover

- Moved new learner-facing video to private `Cloudflare R2 + Shaka Packager`
- Added multipart direct upload for large videos
- Standardized `video_assets`, adaptive `HLS/DASH`, signed playback, and offline MP4 profiles
- Improved ingest with one-pass multi-rendition transcode and production-safe preset tuning
- Documented worker/network/DB-forwarding truth for the production rollout

## [2026-03-16]

### PWA / Publication / Sync

- Finalized `course_publications` as the learner-facing source of truth
- Expanded the offline sync contract
- Standardized stale package detection and refresh behavior
- Bound certificate issuance to completion and exam policy
- Added canonical specs/runbooks for publication, sync conflict, and offline storage telemetry

## [2026-03-04]

### Upload / Authoring

- Upgraded uploads to the three-step presigned URL flow
- Redesigned course info/editor flows for clearer production-safe behavior
