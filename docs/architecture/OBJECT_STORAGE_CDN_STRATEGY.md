# Object Storage and CDN Strategy

This document is the live target architecture for LMS-owned static files and media delivery. It separates two concerns that must not be mixed:

1. **Object storage** keeps the durable copy of static objects such as images, PDFs, text files, HTML/CSS bundles, video sources, and packaged video segments.
2. **CDN delivery** moves read traffic close to learners and prevents the backend from becoming the hot path for static file transfer.

Google Drive and YouTube can still exist as external-content integrations, but they are not the durable storage layer for LMS-owned files. Provider URLs should not become the system of record.

## Storage Target

The production target is **Cloudflare R2**, exposed through the existing S3-compatible AWS SDK integration. The codebase already supports a portable S3-compatible endpoint override, so AWS S3, Backblaze B2, Wasabi, or MinIO can be evaluated later without changing the bucket/key contract.

Use two production buckets:

| Bucket | Visibility | Purpose |
| --- | --- | --- |
| `lms-cdn` | public custom domain | Public thumbnails, avatars, editor images, and other non-sensitive static assets. |
| `lms-storage` | private | Video sources, HLS/DASH packages, offline MP4 profiles, private documents, submissions, and any file that needs LMS authorization. |

The database should store object identity, not provider URLs:

- `bucket`
- `storageKey`
- `contentType`
- `sizeBytes`
- `sha256` or equivalent checksum when available
- `visibility`
- owner/course/lesson/attachment foreign keys
- lifecycle state such as `ACTIVE`, `PENDING_LINK_REVIEW`, or `DELETED`

Runtime URLs are derived at read time from that metadata.

## Object Key Contract

Keep keys stable, scoped, and versionable:

```text
course-thumbnails/{courseId}/{uuid}.webp
avatars/{userId}/{uuid}.webp
editor-images/{ownerId}/{uuid}.{ext}
documents/{tenantId}/{uuid}/{filename}
videos/{assetId}/source.{ext}
video-renditions/{assetId}/{profile}-{height}.mp4
video-packages/{assetId}/hls/...
video-packages/{assetId}/dash/...
simulations/{simulationId}/{buildHash}/...
```

Rules:

- Never encode permanent authorization decisions into the key.
- Do not store Drive, YouTube, or R2 public URLs as canonical references.
- Use immutable keys for CDN-cached assets. If bytes change, write a new key.
- Keep `video-packages/{assetId}/...` private and serve it only through signed playback paths or the media edge Worker.

## CDN Delivery Target

Use two delivery modes:

| Delivery surface | Backing bucket | Cache policy | Auth model |
| --- | --- | --- | --- |
| `https://cdn.holilihu.online` | `lms-cdn` | Long cache for immutable public objects | Public URL |
| `https://media.holilihu.online` | `lms-storage` | Long cache for validated video objects | Edge HMAC token |

For video, backend remains the control plane:

1. Learner asks the backend for playback.
2. Backend checks enrollment, payment, and publication state.
3. Backend returns a signed manifest URL.
4. Manifest rendering rewrites HLS/DASH media object references to `media.holilihu.online` when edge auth is enabled.
5. The Cloudflare Worker validates `verify=<timestamp>-<hmac>` before reading from private R2.
6. Full-object segment responses are cached by path after token validation; range requests bypass Worker Cache API.

This keeps learner authorization in the LMS while shifting heavy segment traffic away from backend containers.

## Migration From Drive and YouTube

Classify existing content before migrating:

| Source | Action |
| --- | --- |
| LMS-owned PDFs, images, HTML, CSS, text files | Copy to `lms-cdn` or `lms-storage` based on visibility, then rewrite DB references to storage keys. |
| LMS-owned videos | Upload/import into `lms-storage`, create `videoAsset`, run Shaka packaging, publish as `ADAPTIVE_R2`. |
| YouTube videos intentionally embedded from public sources | Keep as external online-only content. Do not claim offline availability. |
| Drive links controlled by the school | Copy to R2 after license/ownership check, then remove Drive URL dependency from course content. |
| Third-party content without redistribution rights | Keep as external link/embed or replace with licensed content. |

Do not bulk mirror YouTube or Drive content unless the school owns or is licensed to redistribute the file.

## Operational Gates

Production should be considered storage/CDN ready only when:

- `CLOUDFLARE_R2_ENABLED=true`
- `CLOUDFLARE_R2_BUCKET=lms-cdn`
- `CLOUDFLARE_R2_VIDEO_BUCKET=lms-storage`
- `CLOUDFLARE_R2_PUBLIC_URL=https://cdn.holilihu.online`
- `VIDEO_MEDIA_DOMAIN=https://media.holilihu.online`
- `VIDEO_EDGE_AUTH_MODE=media_hmac_query`
- `VIDEO_EDGE_HMAC_SECRET` is shared with the Worker
- `/actuator/health` reports `targetStackReady=true`
- `/actuator/health` reports `cdnSegmentDeliveryReady=true`
- unsigned media-domain object requests return `403`
- signed media-domain object requests return `200` or `206`
- repeated signed full-object requests show edge cache reuse

## Related Runtime Files

- `backend/docs/adr/ADR-007-storage-r2-mandatory-prod.md`
- `docs/runbooks/R2_STORAGE_RUNBOOK.md`
- `docs/runbooks/CLOUDFLARE_R2_VIDEO_SETUP.md`
- `docs/runbooks/CLOUDFLARE_MEDIA_DOMAIN_EDGE_AUTH_RUNBOOK.md`
- `docs/runbooks/VIDEO_CDN_READINESS_CHECKLIST.md`
- `cloudflare/workers/media-edge-auth-worker.js`
