# ADR-007: Cloudflare R2 mandatory for production storage

| Status | Accepted |
|---|---|
| Date | 2026-04-30 |
| Decider | Holilihu / Maritime LMS team |
| Driver | S136 (post-pause incident) |

## Context

On 2026-04-30 a teacher reported a missing course thumbnail (course "An Toàn Hàng Hải v2"). Diagnosis surfaced two compounding bugs:

1. **Application bug** — uploaded files (thumbnails, avatars, submissions) were stored in `file_attachments` with `entity_id = NULL`, then deleted by the daily orphan-cleanup scheduler after 7 days because the consuming entity (`courses.thumbnail_url` etc.) was a free-form URL string with no FK back to the attachment.
2. **Configuration drift** — production was running `CLOUDFLARE_R2_ENABLED=false` with empty credentials. The legacy `@ConditionalOnProperty(matchIfMissing = true)` on `LocalStorageService` made the backend silently fall back to local filesystem on the GCP VM, where the `lms-uploads` named volume survives container restart but does **not** survive a snapshot-based zone migration (28-04 -b → -c) or any rebuild from a fresh `.env.prod`.

R2 had been configured and active on 2026-03-19 (S128 deployment); the credentials were lost during the production pause/resume cycle and the silent fallback hid the regression for almost three days.

## Decision

1. **Production storage is Cloudflare R2.** Local filesystem is **dev-only**.
2. `LocalStorageService` is activated **only** when `cloudflare.r2.enabled=false` is set explicitly. The previous `matchIfMissing=true` is removed — production that forgets the env will **fail-fast at boot** with "no storage service configured" rather than silently fall back.
3. Three-bucket layout (already provisioned on account `a7cec31eaddd4eb5858167c4aa7d0bca`):
   - `lms-cdn` — public assets (thumbnails, avatars, editor images, submission docs). Custom domain `cdn.holilihu.online` (CF proxy + SSL min TLS 1.2).
   - `lms-storage` — private video originals + adaptive DASH/HLS segments. Accessed via S3 presigned URLs (and optionally Worker proxy at `media.holilihu.online`).
   - (Reserved) third bucket for backups / exports — currently consolidated into `lms-storage`.
4. **DB stores referential FKs**, not URLs, for any new column. URL-only columns (`courses.thumbnail_url`, `users.avatar_url`, `assignment_submissions.file_url`) are kept transitionally and will be dropped after the cutover retention window.
5. **Cleanup is referential**, not date-only. The query checks `NOT EXISTS` against every consumer's `*_attachment_id` column. PostgreSQL `ON DELETE RESTRICT` is the second physical safety layer.
6. **Pre-deploy guard** in `deploy.sh` blocks production deploys that lack R2 credentials.
7. **Visibility check** — backend logs `[VideoPipeline] Production video stack ready: R2 …` at startup, and a future `R2HealthIndicator` will expose the bucket status via `/actuator/health`.

## Consequences

### Positive

- Files referenced by any entity cannot be silently deleted by the cleanup scheduler — DB constraint enforces it.
- A future production deploy that loses its R2 credentials fails immediately, rather than silently corrupting state for days.
- Public assets are served from a CDN edge (`cdn.holilihu.online`) with cached delivery and zero egress cost (R2 free egress).
- Migration off R2 to another S3-compatible store later requires only env + bucket change, not a DB rewrite — keys are stored, URLs are derived.

### Negative / risks

- Tighter coupling to Cloudflare. Mitigated by S3-compatible API (Backblaze B2, AWS S3, MinIO are drop-in alternatives if needed).
- Local development cannot run with `cloudflare.r2.enabled` unset; `application-dev.yml` must explicitly set `false`.
- Existing legacy URLs in DB (`https://holilihu.online/uploads/...`) need a one-shot migration. Done in Phase 5 for non-video; video defer.
- Sentinel `entity_type='PENDING_LINK_REVIEW'` from the tactical hot-fix remains in DB until manual review of those 60+ files.

## Alternatives considered

- **AWS S3** — same architecture, twice the egress cost. Rejected.
- **Self-hosted MinIO on the GCP VM** — solves portability but loses CDN, increases ops burden. Rejected.
- **GCS** — competitive but no zero-egress, no native CF proxy. Rejected.
- **Cloudflare Stream for video only, R2 for the rest** — duplicates pipeline; we already have ffmpeg + Shaka Packager. Rejected.

## Related

- PR #306 — Phase 1 application hot-fix (`linkFileByUrl()` wiring + cleanup hardening)
- PR #307 — Phase 2 schema FK + referential cleanup (this PR)
- `docs/runbooks/R2_STORAGE_RUNBOOK.md` (next) — operational playbook
- ADR-005 (PWA offline) — orthogonal; offline cache still uses Cache API + Dexie
- `docker-compose.prod.yml` — `lms-uploads` volume retained as warm cache during transition
