# Changelog

All notable project changes are recorded here.

This file follows the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), but stays concise and focused on current runtime truth.

## [Unreleased]

### Documentation

- Rebuilt the canonical entrypoint docs: `README.md`, `backend/README.md`, `docs/README.md`, `docs/reference/PRODUCTION_SURFACES.md`, and `docs/testing/*`
- Clarified current runtime truth for video, offline, payment, and the smoke-first E2E gate
- Tightened `.gitignore` for local temp artifacts and test artifacts

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
