# Video R2 + Shaka Cutover Checklist

Complete `CLOUDFLARE_R2_VIDEO_SETUP.md` first if you still need to create buckets, credentials, public URL, or CORS.

## 1. Environment

Set these values in `.env.prod`:

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

CLOUDFLARE_STREAM_ENABLED=false
```

## 2. Legacy data audit

Run these queries before deploy:

```sql
select id, title, stream_video_uid
from lessons
where stream_video_uid is not null
order by updated_at desc;
```

```sql
select id, title
from lessons
where content_blocks::text ilike '%streamVideoUid%';
```

```sql
select id, title
from lessons
where content_blocks::text ilike '%"videoAssetId"%'
  and content_blocks::text not ilike '%"videoSourceKind":"ADAPTIVE_R2"%';
```

If any learner-facing lesson still depends on `stream_video_uid`, migrate it to `videoAssetId` before cutover.

## 3. Bucket and CORS

- Ensure bucket `lms-storage` exists.
- Keep video objects private.
- Allow `GET` and `HEAD` from the LMS frontend origin.

## 4. Deploy

```bash
./deploy.sh
```

Notes:

- Production compose now supports a dedicated `video-worker` service. Keep ingest enabled on the worker and disabled on the web backend if you want API traffic isolated from heavy packaging jobs.
- Larger teacher video uploads may initialize as multipart uploads instead of returning a single presigned PUT URL. The teacher-facing flow should still complete as `init -> upload -> confirm`.
- Current production truth is stronger than the original cutover target:
  - ingest runs on the dedicated worker VM
  - media object delivery runs through `media.holilihu.online`
  - backend keeps entitlement + manifest control plane

## 5. Smoke flow

1. `POST /api/v3/files/upload/init` with `folder=videos`
2. Upload file to returned presigned URL
3. `POST /api/v3/files/upload/confirm`
4. `POST /api/v3/video-assets/from-upload`
5. Attach `videoAssetId` to a lesson section via `/api/v3/courses/lessons/{lessonId}/sections`
6. If the course is already `APPROVED`, call `POST /api/v3/teacher/courses/{courseId}/submit-for-approval`
7. Approve the new publication via `PATCH /api/v3/admin/courses/{courseId}/approve`
8. Wait until `status=READY` and `adaptivePackagingStatus=READY`
   - On the current dedicated-worker production topology, the sample `~156 MB` `1080p` file reached `READY/READY` in about `7m33s`. This affects authoring/upload-to-ready latency and ingest throughput, not playback quality for assets that are already `READY`.
9. Verify learner `/api/v3/courses/{courseId}/content` exposes the section as `videoSourceKind=ADAPTIVE_R2`
10. `GET /api/v3/sections/{sectionId}/video/play?format=hls`
11. `GET /api/v3/sections/{sectionId}/video/play?format=dash`
12. `GET /api/v3/sections/{sectionId}/video/download?profile=STANDARD`
13. Verify unpaid learner gets `403`
14. If `VIDEO_MEDIA_DOMAIN` is enabled, confirm media object URLs resolve through `media.holilihu.online` and no-token requests are blocked with `403`
