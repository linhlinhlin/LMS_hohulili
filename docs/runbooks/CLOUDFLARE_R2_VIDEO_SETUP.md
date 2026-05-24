# Cloudflare R2 Video Setup

This runbook shows where to get the production values needed for the current video stack:

- private `Cloudflare R2` bucket for learner-facing adaptive video
- `Shaka Packager` running inside the backend container
- backend-signed playback tokens
- no runtime dependency on `Cloudflare Stream`

## 1. Values to fill in `.env.prod`

```env
CLOUDFLARE_R2_ENABLED=true
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_BUCKET=lms-cdn
CLOUDFLARE_R2_VIDEO_BUCKET=lms-storage
CLOUDFLARE_R2_PUBLIC_URL=https://cdn.holilihu.online

VIDEO_PLAYBACK_TOKEN_EXPIRY_SECONDS=14400
VIDEO_SEGMENT_PRESIGN_TTL_SECONDS=120

VIDEO_ADAPTIVE_PROFILES=SAVER,STANDARD,HIGH
VIDEO_OFFLINE_PROFILES=SAVER,STANDARD,HIGH
VIDEO_RETAIN_SOURCE_AFTER_READY=true

CLOUDFLARE_STREAM_ENABLED=false
```

Notes:

- `VIDEO_PLAYBACK_TOKEN_EXPIRY_SECONDS` and `VIDEO_SEGMENT_PRESIGN_TTL_SECONDS` are not secrets. Keep the defaults unless we have a concrete reason to change them.
- `CLOUDFLARE_R2_PUBLIC_URL` is for the public/general bucket `lms-cdn`, not for the private video bucket.
- `CLOUDFLARE_R2_VIDEO_BUCKET` must stay private.
- Large teacher video uploads should use the presigned upload flow. The current stack now switches larger videos to multipart direct-to-R2 upload, instead of relying on a single-object PUT for every size.
- `VIDEO_ADAPTIVE_PROFILES` controls the online HLS/DASH ladder. Keep `SAVER,STANDARD,HIGH` unless you intentionally want fewer online renditions.
- `VIDEO_OFFLINE_PROFILES` controls which downloadable MP4 renditions are generated. Keep `SAVER,STANDARD,HIGH` for current behavior; use `SAVER,STANDARD` to avoid storing a 1080p offline MP4 for new uploads.
- Keep `VIDEO_RETAIN_SOURCE_AFTER_READY=true` unless you accept that a repackage/retry will require the teacher to re-upload the source video.
- Keep the legacy direct backend upload path as a smaller fallback only. It is not the primary path for large learner-facing video.
- The legacy direct `POST /api/v3/files/upload/video` path remains a smaller fallback and should not be treated as the primary path for multi-gigabyte videos.
- Current production playback scale path also uses `media.holilihu.online` for signed media delivery. See `docs/runbooks/CLOUDFLARE_MEDIA_DOMAIN_EDGE_AUTH_RUNBOOK.md` for that layer.

## Video storage governance

Admins can inspect retained video storage without reading R2 manually:

```bash
GET /api/v3/video-assets/storage/report?limit=20
```

The report separates source bytes, offline rendition bytes, packaged HLS/DASH bytes, duplicate assets, and unreferenced reclaimable storage. Package sizes are tracked for newly processed assets; older assets may show unknown package bytes until they are reprocessed.

Cleanup is intentionally two-step and dry-run by default:

```bash
POST /api/v3/video-assets/storage/orphan-cleanup?dryRun=true&retentionDays=14&limit=20
POST /api/v3/video-assets/storage/orphan-cleanup?dryRun=false&retentionDays=14&limit=20
```

Cleanup only targets video assets that are not referenced by course intro videos, lesson content blocks, or course publication snapshots, and skips canonical assets while duplicate child assets still exist. `dryRun=false` is `ADMIN`-only because it deletes global storage objects; `ORG_ADMIN` can use the preview/report endpoints.

## 2. Where to get each value

### `CLOUDFLARE_R2_ACCOUNT_ID`

In Cloudflare Dashboard:

1. Go to `Account Home`.
2. Find the account used for this LMS.
3. Open the menu on that account row.
4. Click `Copy account ID`.

### `CLOUDFLARE_R2_ACCESS_KEY` and `CLOUDFLARE_R2_SECRET_KEY`

In Cloudflare Dashboard:

1. Go to `R2`.
2. Open `Manage R2 API tokens` or the S3 credential page.
3. Create a token / access key pair with object read-write access for the LMS buckets.
4. Save:
   - access key ID -> `CLOUDFLARE_R2_ACCESS_KEY`
   - secret access key -> `CLOUDFLARE_R2_SECRET_KEY`

Important:

- Cloudflare usually shows the secret only once when you create it.
- If you lose it, create a new credential pair instead of trying to recover the old secret.
- Cloudflare documents that R2 must be enabled for the account before you can generate these credentials.

### `CLOUDFLARE_R2_BUCKET`

Use the existing public/general LMS asset bucket:

- expected value: `lms-cdn`

This bucket is used for thumbnails, quiz images, avatars, and other public LMS assets.

### `CLOUDFLARE_R2_VIDEO_BUCKET`

Create or confirm a second bucket dedicated to private learner video:

1. Go to `R2`.
2. Click `Create bucket`.
3. Name it `lms-storage`.
4. Keep it private.

This bucket stores:

- adaptive manifests
- segments
- packaged playlist files
- private source / generated learner video files
- submissions and certificate files that should stay presigned/private

### `CLOUDFLARE_R2_PUBLIC_URL`

This is only for the public/general bucket `lms-cdn`.

In Cloudflare Dashboard:

1. Go to `R2`.
2. Open bucket `lms-cdn`.
3. Open the custom domain / public access settings for that bucket.
4. Attach the public domain used by the LMS file service.

Expected production value:

- `https://cdn.holilihu.online`

Do not expose `lms-storage` through a public custom domain.
Do not rely on `r2.dev` for production learner traffic.
If `Public Development URL` is enabled on the video bucket, disable it before production cutover.

## 3. Required CORS for `lms-storage`

The private video bucket must allow the frontend origin to read segment/object responses after the backend redirects to short-lived presigned URLs.

Minimum policy:

```json
[
  {
    "AllowedOrigins": ["https://holilihu.online"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": [
      "Accept-Ranges",
      "Content-Length",
      "Content-Type",
      "Content-Range",
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

If you also test from local frontend, add:

- `http://localhost:4200`

to `AllowedOrigins`.

For production, make sure `https://holilihu.online` is present in `AllowedOrigins`. Localhost-only CORS is not enough for learner playback in production.

## 4. What to do after filling the env

Preferred:

1. SSH to the server.
2. Edit `/home/Admin/LMS_hohulili/.env.prod`.
3. Fill the values above.
4. Save the file.
5. Tell me: `da dien xong`

At that point I can continue with:

- env validation
- deploy
- video cutover audit
- HLS/DASH smoke
- offline download smoke

## 5. Official references

- [Cloudflare Fundamentals: Find account and zone IDs](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/)
- [Cloudflare R2 docs: Authentication / Manage R2 API tokens](https://developers.cloudflare.com/r2/api/tokens/)
- [Cloudflare R2 docs: Public buckets and custom domains](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [Cloudflare R2 docs: Configure CORS](https://developers.cloudflare.com/r2/buckets/cors/)
