# PWA Offline Download System v2 - Design Spec

**Date**: 2026-03-10
**Status**: Approved
**Scope**: 2 phases — Phase 1 (FE-only), Phase 2 (Cloudflare Stream + Smart Cleanup)

---

## Context

Maritime LMS serves sailors who may be offline for 2-3 months at sea. The PWA offline system is ~90% complete with IndexedDB (Dexie.js v4) + Cache API + NGSW + offline interceptor + sync queue. Backend sync endpoint (`/api/v3/sync/push`) already exists and works.

### Problems to solve

1. **No download dialog** — course downloads start immediately with no user control over video
2. **OOM on mobile** — `getVideoUrl()` loads entire video blob into RAM via `createObjectURL()`
3. **No sync priority** — all sync items treated equally when reconnecting
4. **No stale content detection** — offline content can be outdated without user knowing
5. **No multi-quality video** — single quality, no size estimation before download

### Key constraints

- Sailors may have limited bandwidth at port (sync priority matters)
- Admin controls refresh token expiry per org; org admin sets per member
- Never auto-delete offline content — user must decide
- System already has: checkpoint/resume, user-scoped IndexedDB (v4), offline interceptor, storage management at `/student/storage`

---

## Phase 1: Download Dialog + OOM Fix + Sync Priority

**Scope**: Frontend only. No new infrastructure. Uses existing R2 video URLs (single quality for now).

### 1.1 Download Dialog Component

**File**: `fe/src/app/shared/components/download-dialog/download-dialog.component.ts`

**Trigger**: `CourseDownloadButtonComponent` opens dialog instead of calling `downloadCourse()` directly.

**Flow**:
1. Fetch course content via `CourseApi.getCourseContent(courseId)`
2. Count lessons with `videoManifestUrl` → calculate estimated sizes
3. Display dialog with options
4. On confirm → call `CourseDownloadService.downloadCourse(courseId, options)`

**Dialog layout** (approved):
```
┌─────────────────────────────────────────┐
│  Tải về: "{course.title}"              │
│                                         │
│  📄 Nội dung bài học (N bài)    ~X MB   │
│  ─────────────────────────────────────  │
│  🎬 Video (M bài có video)             │
│                                         │
│  ○ Không tải video              0 MB    │
│  ○ Tiết kiệm (360p)          ~X MB     │
│  ● Cân bằng (720p)           ~X MB     │  ← default
│  ○ Cao (1080p)              ~X GB      │
│  ─────────────────────────────────────  │
│  Tổng ước tính:    ~X MB                │
│  Dung lượng trống: X GB                │
│  ─────────────────────────────────────  │
│       [ Hủy ]        [ Tải về ]         │
└─────────────────────────────────────────┘
```

**Size estimation heuristics** (Phase 1 — no Cloudflare Stream yet):
- Text content: ~1-2 MB per lesson (HTML + images)
- Video 360p: ~30 MB per 10 min
- Video 720p: ~85 MB per 10 min
- Video 1080p: ~170 MB per 10 min
- Video duration: extracted from lesson `durationMinutes` field

**Warnings**:
- Red warning if estimated total > 80% of free storage
- Disable "Tải về" button if estimated total > free storage
- Show current free space from `navigator.storage.estimate()`

**Interface**:
```typescript
interface DownloadOptions {
  videoQuality: 'none' | '360p' | '720p' | '1080p';
}
```

### 1.2 OOM Fix — Zero-RAM Video Playback

**Problem**: `OfflineVideoService.getVideoUrl()` does:
```
Cache API → response.blob() → URL.createObjectURL(blob) → <video src="blob:...">
```
Entire video loaded into RAM. 500MB video = 500MB RAM = crash on mobile.

**Fix**: Serve video directly from Cache API via custom fetch handler.

**Approach**: Register a route handler in the app. When `<video>` requests `/offline-video/{lessonId}`:

1. `OfflineVideoService.getVideoUrl()` returns URL string `/offline-video/{lessonId}` (no blob)
2. Add an Angular HTTP interceptor or a lightweight fetch override that:
   - Intercepts requests to `/offline-video/*`
   - Opens Cache API → `cache.match('/offline-video/{lessonId}')`
   - Returns the cached `Response` directly (browser streams chunk-by-chunk)
3. Browser handles Range requests natively from cached Response
4. Zero RAM usage — streaming from disk cache

**Files changed**:
- `offline-video.service.ts` — `getVideoUrl()` returns path string instead of blob URL
- New: lightweight fetch interceptor or use existing offline interceptor to handle `/offline-video/*`
- Remove `createObjectURL` / `revokeObjectURL` logic
- Remove `blobUrls` Map tracking

**Fallback**: If cache miss (video not downloaded), return `null` → component shows "Video chưa tải" message.

### 1.3 Sync Priority on Reconnect

**Current**: `window.online` → `syncAll()` treats all items equally.

**New priority order**:

1. **Immediate (auto, silent)**: Sync progress + quiz attempts + submissions + video progress
   - These are small payloads (< 1KB each)
   - Use existing `POST /api/v3/sync/push` batch endpoint
   - Toast: "Đã đồng bộ X mục" on completion

2. **After sync completes**: Check content freshness
   - `GET /api/v3/courses/{id}` for each offline course → compare `updatedAt` with local `downloadedAt`
   - If server `updatedAt` > local `downloadedAt` → mark as stale

3. **Notify user (non-blocking toast)**:
   - "X khóa học có cập nhật mới" → link to `/student/storage`
   - Never auto-download content updates
   - User decides when/what to re-download

**Files changed**:
- `offline-sync.service.ts` — add `syncWithPriority()` method
- `course-download.service.ts` — add `checkContentFreshness()` method
- `student-storage-management.component.ts` — show "stale" badge on outdated courses

### 1.4 Storage Management Link

Add link to `/student/storage` from:
- Student dashboard (in sidebar or quick-actions)
- My-courses page (top action bar)
- Download dialog (footer: "Quản lý bộ nhớ")

---

## Phase 2: Cloudflare Stream + Smart Cleanup

**Scope**: Backend infrastructure + FE integration. Requires Cloudflare Stream account.

### 2.1 Cloudflare Stream Integration

**Upload flow**:
1. Teacher uploads video in course editor
2. Backend receives file → uploads to Cloudflare Stream API
3. Stream auto-transcodes to HLS (360p/720p/1080p)
4. Backend stores `streamVideoUid` on lesson entity
5. API returns multi-quality download URLs

**Backend changes**:
- New: `CloudflareStreamService` — upload, get status, get download URLs
- `LessonJpaEntity` — add `streamVideoUid` field
- `CourseQueryControllerV3` — return quality-specific URLs in lesson response:
  ```json
  {
    "videoUrls": {
      "360p": "https://...",
      "720p": "https://...",
      "1080p": "https://..."
    },
    "videoDurationSeconds": 600,
    "videoSizes": {
      "360p": 31457280,
      "720p": 89128960,
      "1080p": 178257920
    }
  }
  ```

**FE changes**:
- Download dialog uses real sizes from API instead of heuristics
- `CourseDownloadService.downloadCourse()` picks URL based on selected quality
- `OfflineVideoService.downloadVideo()` unchanged (streams from URL to Cache API)

**Migration**: Existing R2 videos continue to work (single quality). New uploads go through Stream. Gradual migration.

### 2.2 Smart Cleanup

**Backend**:
- Add `contentVersion: int` to `courses` table (Flyway migration)
- Increment on any course content change (chapter/lesson/section CRUD)
- New endpoint: `GET /api/v3/courses/versions?ids=id1,id2,...` — batch version check

**Frontend**:
- `offlineDb.courses` table stores `contentVersion` at download time
- On reconnect (after progress sync): batch check versions
- Stale courses get badge in storage management: "Bản cũ — Cập nhật?"
- Completed courses (100%) get badge: "Hoàn thành — Xóa để giải phóng X MB"

**Cleanup rules**:
- Never auto-delete
- Suggest only, user decides
- Sort suggestions by: completed courses first, then oldest stale, then largest size

---

## Architecture Diagram

```
Student Device (PWA)
├── Download Dialog ──→ CourseDownloadService
│   └── videoQuality param    ├── fetch /api/v3/courses/{id}/content
│                             ├── write chapters/lessons to IndexedDB
│                             └── OfflineVideoService.downloadVideo(url, quality)
│                                  └── ReadableStream → Cache API (zero RAM)
│
├── Video Playback
│   └── <video src="/offline-video/{lessonId}">
│        └── Interceptor → Cache API → Stream Response (zero RAM)
│
├── Sync on Reconnect
│   ├── Step 1: OfflineSyncService.syncAll() → POST /api/v3/sync/push
│   ├── Step 2: checkContentFreshness() → GET /api/v3/courses/versions
│   └── Step 3: Toast notification if stale
│
└── Storage Management (/student/storage)
    ├── Per-course delete
    ├── Per-video delete
    ├── Stale badge (Phase 2)
    ├── Completed badge (Phase 2)
    └── Quota warnings
```

---

## Reference patterns

| Platform | Download dialog | Quality selection | Cleanup | Sync |
|----------|----------------|-------------------|---------|------|
| YouTube Premium | Size estimate + quality radio | 360p/720p/1080p | Expiry-based | Auto |
| O'Reilly | Simple yes/no | Standard/High | Manual | Auto progress |
| Coursera | Size estimate | Low/Medium/High | Suggest, never auto | Auto progress first |
| Netflix | Per-title quality | Ask once, remember | Smart suggestions | Auto |
| **LMS Maritime** | Size estimate + quality radio | none/360p/720p/1080p | Suggest, never auto | Priority: progress first |

---

## Files inventory

### Phase 1 — New files
- `fe/src/app/shared/components/download-dialog/download-dialog.component.ts`

### Phase 1 — Modified files
- `fe/src/app/shared/components/course-download-button/course-download-button.component.ts`
- `fe/src/app/core/services/course-download.service.ts`
- `fe/src/app/core/services/offline-video.service.ts`
- `fe/src/app/core/services/offline-sync.service.ts`
- `fe/src/app/api/interceptors/offline.interceptor.ts`
- `fe/src/app/features/student/storage/student-storage-management.component.ts`
- `fe/src/app/features/student/dashboard/student-dashboard.component.html`
- `fe/src/app/features/student/student-my-courses.component.ts`

### Phase 2 — New files (backend)
- `CloudflareStreamService.java`
- `V77__course_content_version.sql`

### Phase 2 — Modified files
- `CourseJpaEntity.java` / `Course.java` — add `contentVersion`
- `CourseQueryControllerV3.java` — return multi-quality URLs
- `LessonJpaEntity.java` — add `streamVideoUid`
- Download dialog — use real sizes from API
