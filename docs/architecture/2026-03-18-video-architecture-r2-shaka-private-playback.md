# Video Architecture: R2 Private + Shaka Adaptive Playback

Date: 2026-03-18
Status: Active architecture decision

## Purpose

This note defines the current runtime truth for internal LMS video after cutting the learner-facing runtime dependency on Cloudflare Stream.

## Current truth

### Storage

Cloudflare R2 is now split into two buckets:

- `lms-cdn`: public/general LMS assets
- `lms-storage`: private learner-facing video/storage objects

The private bucket stores:

- packaged HLS and DASH manifests
- segments and init objects
- private source / generated learner video files

### Packaging

The backend video pipeline is:

1. teacher upload via presigned URL
2. upload confirmation
3. `POST /api/v3/video-assets/from-upload`
4. ingest with `ffprobe`
5. rendition generation with `ffmpeg`
6. adaptive packaging with `Shaka Packager`
7. upload package outputs to `lms-storage`

### Learner playback

For internal LMS video, the standard learner path is:

- `videoSourceKind = ADAPTIVE_R2`
- backend play endpoint returns a signed internal manifest URL
- backend validates entitlement before minting the playback token
- backend rewrites manifest child URLs to tokenized backend routes
- segment/object requests redirect to short-lived presigned `GET` URLs for R2
- published learner content resolves from `course_publications` snapshots, not directly from draft `content_blocks`

Raw R2 manifest URLs are not part of the learner-facing contract.

### Offline download

Offline video remains LMS-managed MP4 profiles:

- `SAVER`
- `STANDARD`
- `HIGH`
- `ORIGINAL`

Adaptive HLS/DASH is for online playback. Offline download continues to use MP4 renditions.

### Cloudflare Stream

Cloudflare Stream is not the target runtime dependency for new internal video.

Operational default:

- `CLOUDFLARE_STREAM_ENABLED=false`

Legacy data may still contain `streamVideoUid`, but that field is no longer the source of truth for asset-backed playback.

## Learner contract

### Online playback

For internal asset-backed video:

- default format: `HLS`
- supported format: `DASH`
- source kind: `ADAPTIVE_R2`

### Offline download

The UI should expose only profiles that truly exist and are ready.

Rules:

- show only ready offline profiles
- never expose a raw adaptive package URL in learner/public DTOs
- legacy/direct MP4 should remain `LEGACY_DIRECT` and expose only the real original file path

## Teacher authoring policy

For new learner-facing internal lesson videos:

- use the upload-backed asset pipeline only
- do not create new Stream-backed authoring paths
- keep legacy Stream data readable only until production cutover is complete
- when a teacher updates an already `APPROVED` course, the draft must be submitted and approved again so the published snapshot carries the new `videoAssetId`

## Operational default

Use these defaults going forward:

- R2 for storage
- private `lms-storage` bucket for learner video/storage
- Shaka Packager for adaptive HLS/DASH outputs
- backend-signed manifest URLs and short-lived segment redirects
- MP4 profiles for offline
- local filesystem only as fallback/dev path

## Operational note

- Observed production baseline on the current VM: a sample `~156 MB` `1080p` upload took a little over `20 minutes` to reach `READY/READY`.
- This latency affects teacher upload-to-ready waiting time and the throughput of the ingest queue.
- It does not degrade playback behavior for assets that are already `READY`; learner playback continues to use pre-packaged HLS/DASH outputs and short-lived object redirects.
