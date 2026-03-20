# Video Architecture: R2, Cloudflare Stream, and Offline Profiles

> Superseded on 2026-03-18 by `2026-03-18-video-architecture-r2-shaka-private-playback.md`.
> Keep this file only as historical context for the Stream-based transition discussion.

Date: 2026-03-17
Status: Historical architecture note

## Purpose

This note fixes a production misconception that caused both implementation drift and confusing UX:

- Cloudflare R2 is object storage.
- Cloudflare Stream is the online playback layer.
- Offline quality choices are LMS-managed grouped profiles, not a promise that every video has exact MP4 renditions like `144p`, `480p`, or `1080p`.

## Current truth

### R2

R2 is the storage layer for:

- master uploaded assets
- offline downloadable files/renditions
- documents, covers, and other binary course assets

R2 is not a streaming platform. Storing an MP4 in R2 does not automatically create adaptive HLS playback or per-resolution MP4 downloads.

### Cloudflare Stream

Cloudflare Stream is the online video playback layer for learner-facing internal video:

- adaptive playback via HLS
- signed playback URLs
- edge delivery for concurrent viewers

Stream should be treated as the online delivery path, not as the source of truth for every offline MP4 quality contract.

### Legacy direct MP4

Some existing content still resolves to direct MP4 files served from local or legacy storage paths. Those videos are treated as:

- `videoSourceKind = LEGACY_DIRECT`
- online playback compatible
- offline download label `Bản gốc`

They must not be presented as if grouped profiles or exact multi-resolution renditions actually exist.

## Learner contract

### Online playback

For internal production video, the standard learner path is:

- `videoSourceKind = STREAM`
- playback URL from Cloudflare Stream

### Offline download

Offline download is exposed through grouped learner-facing profiles:

- `SAVER`
- `STANDARD`
- `HIGH`

The UI should display the actual resolved rendition when available, for example:

- `Tiết kiệm dữ liệu (360p)`
- `Chuẩn (720p)`
- `Chất lượng cao (không khả dụng)`

Rules:

- show only profiles that truly have a ready rendition
- never present `1080p` if the video tops out at `720p`
- legacy/direct MP4 should display only `Bản gốc`

## Teacher authoring policy

For new learner-facing internal lesson videos:

- upload-only authoring path
- no new YouTube/external URL authoring path
- legacy external videos remain readable online for compatibility
- legacy external videos are always online-only

Teacher UX must make this explicit:

- Cloudflare Stream is used for online playback
- offline packaging follows LMS-managed video pipeline rules

## What is implemented now

The current codebase already ships the phase-1 truth fix:

- grouped offline profiles in frontend settings and download dialog
- backend download endpoints default to grouped `STANDARD` when the caller omits profile/quality
- legacy exact quality calls remain for backward compatibility
- new section video authoring is upload-only
- legacy external/internal URLs remain readable as compatibility paths
- env examples and runtime config comments now distinguish R2 from Stream

## What is not implemented yet

The full production pipeline below is still future work:

- `video_assets`
- `video_renditions`
- `video_ingest_jobs`
- R2-backed master asset pipeline
- LMS-managed offline rendition generation
- migration of all learner-facing production video away from legacy direct MP4

Until that pipeline lands, `CloudflareStreamService#getDownloadUrl(uid, quality)` remains a compatibility helper for explicit legacy callers, not the long-term architecture contract.

## Operational default

Use these defaults going forward:

- R2 for storage
- Stream for online playback
- grouped LMS offline profiles for offline UX
- local filesystem only as fallback/dev path
