# PWA Offline v3 — Completed Badge, Bulk Update, Offline Quiz, Cloudflare Stream

> **Date**: 2026-03-11 | **Status**: Approved | **Phases**: 3A (UX) → 3B (Quiz) → 3C (CF Stream)

---

## Context

Maritime sailors use this LMS offline for 2-3 months. Phase 1 (download dialog, OOM fix) and Phase 2 (content versioning, stale detection) are complete and deployed. This spec covers three remaining work packages.

---

## Phase 3A — Completed Course Badges + Bulk Stale Update (FE-only)

### Problem
Students who finished all lessons in a downloaded course have no indication of completion, and no easy way to reclaim storage. When multiple courses are stale, re-downloading each one individually is tedious.

### SOTA Reference
- **Spotify**: "Downloaded" library distinguishes completed/unfinished playlists visually. Completed content can be auto-removed.
- **Coursera**: Certificate earned → explicit "Course Completed" state on dashboard.
- **Netflix Downloads**: "Delete watched episodes" bulk action reclaims storage.

### Design

#### 3A-1: Completion Tracking
- `CourseDownloadService.refreshDownloadedCourses()` queries `offlineDb.progress` per course to compute `completionPercent` (lessons with `completedAt != null || progressPercent >= 100` ÷ total lessons).
- `DownloadableCourse` gains `completionPercent: number` field.

#### 3A-2: Storage Management Badges
- **"Hoàn thành" badge** (emerald green): shown on course row when `completionPercent === 100`.
- **Storage cleanup suggestion**: when storage ≥ 80%, show banner "X khóa học hoàn thành chiếm Y MB — Xóa để giải phóng?".
- Per-course: "Hoàn thành — Xóa để giải phóng X MB" action button.

#### 3A-3: Bulk Stale Update
- **"Cập nhật tất cả (N)"** button in section header when `staleCourseCount() > 0`.
- Runs sequentially: remove → re-download each stale course.
- In-progress indicator: "Đang cập nhật 2/3 khóa học...".
- Locks out individual delete buttons during bulk operation.

---

## Phase 3B — Offline Quiz Download + Retry Hardening (FE + minor BE)

### Problem
Students can't take quizzes offline — `startAttempt` requires the server. When sync fails, items retry immediately with no backoff. No visual indicator for pending quiz attempts.

### SOTA Reference
- **Duolingo**: Full offline lesson mode; queues all results and syncs silently.
- **Khan Academy**: Offline mode stores exercise attempts; shows "Practice saved, will sync when online".
- **Google Forms offline**: Stores response locally, syncs when reconnected.

### Design

#### 3B-1: Offline Quiz Data Download
- During `CourseDownloadService.downloadCourse()`, after lesson loop: for each lesson, `GET /api/v3/quizzes/lessons/{lessonId}` → if quiz exists, `GET /api/v3/quizzes/{quizId}/questions` (student view — no correct answers).
- Store in `offlineDb.quizData` (new Dexie table, v6 schema).
- New `OfflineQuizData` interface: `{ quizId, lessonId, courseId, userId, title, passingScore, timeLimit, questions: OfflineQuestion[] }`.

#### 3B-2: Offline Quiz Taking
- `OfflineQuizService.getQuizForLesson(lessonId)` → checks IndexedDB first, falls back to API.
- When offline: generate client-side `attemptId` (UUID), store answers in `offlineDb.quizAttempts`, show "Bài làm đã lưu — kết quả hiển thị sau khi đồng bộ".
- No auto-grading client-side (correct answers not downloaded, integrity preserved).
- Pending badge "⏳ Chờ đồng bộ" on quiz lesson items.

#### 3B-3: Sync Retry Hardening
- Exponential backoff already implemented (`handleSyncFailure` in `offline-sync.service.ts`). Verify and harden.
- Add `failedWithNoRetry` computed: items at max retries (retryCount ≥ 5) — surface in storage UI.
- Visual clarity: show retry countdown "Thử lại sau 8 phút" in sync queue panel.

---

## Phase 3C — Cloudflare Stream Integration (BE + FE)

### Problem
Videos are served as a single raw R2 file. No adaptive bitrate, no quality-specific downloads, quality selection in download dialog has no effect.

### SOTA Reference
- **Cloudflare Stream**: HLS/DASH adaptive, per-resolution download, JWT-signed playback URLs (Netflix pattern).
- **Moodle**: Pluggable video service (YouTube → Kaltura → Cloudflare).
- **Coursera**: Cloudflare-based CDN with 360p/720p/1080p tiers for offline download.

### Design

#### 3C-1: Backend — CloudflareStreamService (actual implementation)
- `uploadVideo(InputStream, fileName, lessonId)` → CF Stream TUS upload → returns `{ uid, playbackId }`.
- `getSignedPlaybackUrl(uid)` → CF API `/token` → `https://videodelivery.net/{uid}/manifest/video.m3u8?token={jwt}`.
- `getDownloadUrl(uid, quality)` → CF `/downloads/{uid}/{quality}` (quality: `360p` / `720p` / `1080p`).
- JWT signed with `cloudflare.stream.keyId` + `cloudflare.stream.privateKey` (new config fields), 4h expiry.

#### 3C-2: Backend — New Endpoints
- `POST /api/v3/lessons/{lessonId}/video` (multipart) → upload to CF, save `stream_video_uid`, return `{ streamVideoUid, playbackUrl }`.
- `GET /api/v3/lessons/{lessonId}/video/play` → generate + return fresh signed URL (called by FE at playback time).
- `GET /api/v3/lessons/{lessonId}/video/download?quality=720p` → return quality-specific download URL.

#### 3C-3: Frontend — Teacher Video Upload
- Replace raw URL input in lesson editor with file upload button for video section type.
- Shows upload progress, thumbnail preview after upload.
- Stores `streamVideoUid` from response; teacher can still paste external URL as fallback.

#### 3C-4: Frontend — Student Playback
- `lesson-content.component`: if `lesson.streamVideoUid`, call `GET /api/v3/lessons/{id}/video/play` → use returned signed URL with native `<video>` (HLS via hls.js or Shaka Player).
- Fallback to raw `videoUrl` if no `streamVideoUid`.

#### 3C-5: Frontend — Quality-Specific Download
- `CourseDownloadService`: if `lesson.streamVideoUid` and quality ≠ `'none'`, call `GET /api/v3/lessons/{id}/video/download?quality={q}` → use returned URL instead of raw `videoManifestUrl`.
- Download dialog: fetch real file sizes via `GET /api/v3/lessons/{lessonId}/video/sizes` (CF provides them per resolution). Replace heuristic estimates.

---

## Implementation Order

| Phase | Effort | Dependencies | Deliverable |
|-------|--------|-------------|-------------|
| **3A** | 2h | None (FE only) | Completed badge, bulk update |
| **3B** | 4h | 3A done | Offline quiz, retry hardening |
| **3C-BE** | 4h | CF account + credentials | Upload, signed URL, download endpoints |
| **3C-FE** | 3h | 3C-BE done | Quality download, CF playback |

---

## Data Model Changes

### Dexie v6 (new table)
```typescript
quizData: '[userId+quizId], [userId+lessonId], [userId+courseId]'
```

### OfflineQuizData interface
```typescript
interface OfflineQuizData {
  quizId: string;
  lessonId: string;
  courseId: string;
  userId: string;
  title: string;
  passingScore: number;
  timeLimit?: number;    // minutes
  questions: OfflineQuestion[];
  downloadedAt: Date;
}

interface OfflineQuestion {
  id: string;
  content: string;
  questionType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_IN_BLANK' | 'SHORT_ANSWER' | 'ESSAY';
  options: Array<{ optionKey: string; content: string }>;
  displayOrder: number;
}
```

### CloudflareStreamConfig additions
```yaml
cloudflare:
  stream:
    enabled: false
    account-id: ${CLOUDFLARE_ACCOUNT_ID:}
    api-token: ${CLOUDFLARE_API_TOKEN:}
    key-id: ${CLOUDFLARE_STREAM_KEY_ID:}
    private-key: ${CLOUDFLARE_STREAM_PRIVATE_KEY:}
```
