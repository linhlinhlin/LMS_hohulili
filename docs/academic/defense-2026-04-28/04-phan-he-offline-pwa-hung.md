# Phân hệ 4 — Tối ưu Offline / PWA (Nguyễn Mạnh Hùng) — TRỌNG TÂM MARITIME

> Sinh viên: Nguyễn Mạnh Hùng — Lớp CNT63ĐH — VIMARU
> Phụ trách: phân hệ tối ưu hoá dữ liệu trên thiết bị người dùng (PWA, offline, sync)
>
> **Đây là TRỌNG TÂM SOTA của đề tài**: "Xử lý vấn đề đặc thù học viên công tác trên tàu, chất lượng mạng internet kém hoặc không có"

---

## 1. Kiến trúc PWA + Sequence

### Sơ đồ tầng

```
┌─────────────────────────────────────────────────────┐
│              Browser (Crew Tablet/Phone)            │
├─────────────────────────────────────────────────────┤
│ TẦNG 1: Service Worker (sw-wrapper.js)              │
│  - Bắt fetch /offline-video/* + /offline-file/*     │
│  - Kiểm tra Cache API -> trả Response (206 Range)   │
│  - Ủy thác NGSW xử lý các request khác              │
├─────────────────────────────────────────────────────┤
│ TẦNG 2: HTTP Interceptor (offline.interceptor.ts)   │
│  - Kiểm tra navigator.onLine + NetworkStatusService │
│  - GET request -> fallback IndexedDB                │
│  - POST/PUT/DELETE -> queueMutation(syncService)    │
├─────────────────────────────────────────────────────┤
│ TẦNG 3: Dexie.js Database (lms-offline.db.ts)       │
│  - 8 bảng: courses, chapters, lessons, progress,    │
│           submissions, quizAttempts, syncQueue,     │
│           downloadCheckpoints, quizData             │
│  - Compound key [userId+...] v4+ (multi-user)       │
│  - Schema migration v1->v7 (graceful evolution)     │
├─────────────────────────────────────────────────────┤
│ TẦNG 4: Cache API (offline-videos/ + offline-files/)│
│  - HTTP Range request (206 Partial Content)         │
│  - Streaming write (không load cả video vào RAM)    │
│  - Video + file blobs (50-500MB per course)         │
├─────────────────────────────────────────────────────┤
│ TẦNG 5: Services (Offline-centric)                  │
│  - CourseDownloadService (orchestrate tải xuống)    │
│  - OfflineVideoService (manage Cache API)           │
│  - OfflineSyncService (queue + batch sync)          │
│  - OfflineQuizService (quiz offline + queue submit) │
└─────────────────────────────────────────────────────┘
         ↓ (Background Sync API khi online)
┌─────────────────────────────────────────────────────┐
│         Backend: Spring Boot 3.2 (SyncUseCase)      │
│  POST /api/v3/sync/push { operations[] }            │
│  - Route by entityType -> use case                  │
│  - Conflict detection (SOTA Feb 2026)               │
│  - Exponential backoff nếu fail                     │
│  - Return ackedOperationIds + conflicts             │
└─────────────────────────────────────────────────────┘
```

### Các tầng + File đại diện

| Tầng | File | LOC |
|---|---|---|
| SW | `fe/public/sw-wrapper.js` | ~250 |
| HTTP | `fe/src/app/api/interceptors/offline.interceptor.ts` | ~350 |
| DB | `fe/src/app/core/db/lms-offline.db.ts` | 1,004 |
| Cache | `fe/src/app/core/services/offline-video.service.ts` | 415 |
| Sync | `fe/src/app/core/services/offline-sync.service.ts` | ~900 |
| Quiz | `fe/src/app/core/services/offline-quiz.service.ts` | 210 |
| Download | `fe/src/app/core/services/course-download.service.ts` | ~650 |
| Backend | `backend/.../usecase/SyncUseCase.java` | ~550 |

**Tổng FE:** ~16 file, ~3,500 LOC
**Tổng BE:** ~8 file (SyncUseCase + DTOs + tests)

---

## 2. Business Logic chính (6 flow trọng tâm)

### Flow 1 — Download Khoá Học (Trước khi Rời Cảng)

```
1. Thuyền viên vào /student/storage -> click "Tải về"
2. CourseDownloadService.downloadCourse(courseId):
   - requestPersistence() -> permanent storage
   - navigator.storage.estimate() -> nếu > 90% abort
   - GET /api/v3/courses/{courseId} -> metadata
   - Dexie: courses.put(OfflineCourse)
3. Download chapters + lessons:
   - GET /chapters -> foreach chapter
   - GET /chapters/{chId}/lessons
   - Atomic: chapters.bulkPut() -> lessons.bulkPut() per chapter (crash-safe)
   - Checkpoint: downloadCheckpoints.update({completedChapterIds})
4. Video streaming:
   - OfflineVideoService.downloadVideo(videoUrl, lessonId)
   - fetch(videoUrl) -> response.body.getReader()
   - ReadableStream -> Cache API (offline-videos:{userId})
   - Progress bar update
   - Header Accept-Ranges: bytes -> Range request sau
5. Quiz data:
   - GET /quizzes/{quizId} -> questions (NO correct answers)
   - Dexie: quizData.put({quizId, lessonId, questions[], ...})
6. Feedback:
   - UI: "Đã tải 3/5 chương" -> "Hoàn thành (250MB)"
   - localStorage: offlineCourseDownloadState[courseId] = 'ready'
```

**Evidence:**
- `course-download.service.ts:120-280` — orchestration + checkpoint
- `lms-offline.db.ts:305-399` — Dexie schema v1-v6
- `offline-video.service.ts:47-75` — streaming
- `sw-wrapper.js:92-146` — Range handler

---

### Flow 2 — Học Offline (Trên Tàu)

```
1. navigator.onLine = false
2. /student/learn/course/{cId}/lesson/{lId}
3. offlineInterceptor bắt GET:
   - networkStatus.online() = false
   - getOfflineFallback(url) -> query IDB
   - Pattern match:
     /api/v3/courses/{id} -> courses.get([userId, courseId])
     /api/v3/courses/{id}/chapters -> chapters.where('[userId+courseId]').equals([userId, courseId])
     /api/v3/courses/{id}/chapters/{chId}/lessons -> lessons filter chapter
   - Return {success, data, _offline: true}
4. Lesson load Dexie:
   - contentHtml hiển thị
   - Sections (VIDEO, TEXT, QUIZ, FILE) render local
5. Video play:
   - <video src="/offline-video/{sectionId}">
   - SW handleOfflineVideo() -> query offline-videos:{userId} cache
   - Range header (Shaka seek) -> handleRangeRequest() -> 206
   - Shaka adaptive bitrate playback
6. Progress local:
   - OfflineSyncService.queueOperation('progress', ...)
   - Dexie syncQueue.add({entityType:'progress', endpoint, payload, syncStatus:'pending'})
   - progress.update({progressPercent, videoPosition, updatedAt})
7. UI badge:
   - "Offline — Đang học"
   - "Tiến độ sẽ đồng bộ khi có mạng"
```

**Evidence:**
- `offline.interceptor.ts:49-69` — GET fallback
- `offline.interceptor.ts:99-150` — pattern match
- `sw-wrapper.js:11-22` — fetch routing
- `offline-sync.service.ts:115-167` — queueOperation

---

### Flow 3 — Quiz Offline

```
1. Offline -> quiz lesson
2. OfflineQuizService.getQuizForLesson(lessonId):
   - Dexie: quizData.where('[userId+lessonId]').equals([userId, lessonId])
   - Return OfflineQuizData {questions[], passingScore, timeLimitMinutes}
   - NO correct answers (academic integrity)
3. UI render quiz:
   - questions + options local
   - Timer
   - Student chọn answers
4. Submit (vẫn offline):
   - OfflineQuizService.queueOfflineSubmission(submission)
   - Check quiz.quizType === 'PRACTICE'
   - Nếu GRADED -> error "Bài kiểm tra này chỉ làm online"
5. Queue + double store:
   - quizAttempts.add({quizId, answers, syncStatus:'pending'})
   - syncQueue.add({entityType:'quizAttempt', endpoint:'/api/v3/quizzes/{quizId}/attempts/start', payload:{quizId, answers, ...}})
   - Toast: "Bài làm đã lưu — kết quả sẽ hiển thị khi có mạng"
6. Badge: pendingSubmissionCount.set(+1)
```

**Evidence:**
- `offline-quiz.service.ts:61-102, 113-166`
- `lms-offline.db.ts:230-259` (OfflineQuizData)

---

### Flow 4 — Sync Khi Cập Cảng

```
1. Tàu cập cảng -> Internet -> window.online event
2. OfflineSyncService:
   - listener: window.online -> syncWithPriority() (2s delay)
3. syncWithPriority():
   - Step 1: syncAll(force=true) -> batch push
   - Step 2: pullServerState() -> fetch updates
   - Step 3: checkContentFreshness() -> compare version
4. Batch sync:
   - Query Dexie: syncQueue pending items
   - Filter backoff window (item.nextRetryAt > now)
   - Split: batchableItems vs fallbackItems
5. POST /api/v3/sync/push:
{
  "operations": [
    {
      "entityType": "progress",
      "operationType": "UPDATE",
      "endpoint": "/api/v3/student/progress/lessons/{lessonId}/complete",
      "payload": {"lessonId": "...", "status": "COMPLETED"},
      "clientOperationId": "uuid",
      "occurredAt": "2026-04-26T10:30:00Z"
    },
    {"entityType": "videoProgress", ...},
    {"entityType": "quizAttempt", ...}
  ]
}
6. Backend SyncUseCase.pushChanges():
   - Loop operations
   - Detect publication conflict
   - Route:
     processVideoProgress() -> TrackVideoProgressUseCase.trackSegments() (additive merge)
     processLessonProgress() -> UpdateLessonProgressUseCase (forward-only)
     processQuizAttempt() -> QuizAttemptUseCase.submitAttempt() (server-wins)
   - Return {accepted, rejected, conflicts, ackedOperationIds}
7. Frontend process:
   - ackedOperationIds -> syncQueue.update(item.id, {syncStatus:'synced'})
   - Conflicts -> syncStatus:'failed' + error msg
   - quizAttempts.update({syncStatus:'synced'})
8. Cleanup:
   - synced > 24h -> delete
   - Toast: "Đồng bộ thành công 5 mục"
```

**Evidence:**
- `offline-sync.service.ts:269-282` (syncWithPriority 3-step)
- `offline-sync.service.ts:174-258` (syncAll batch)
- `offline-sync.service.ts:468-550` (tryBatchSync POST + conflict)
- `SyncUseCase.java:54-105` (pushChanges routing)
- `SyncUseCase.java:200-213` (switch entityType)

---

### Flow 5 — Conflict Resolution (SOTA Feb 2026)

| Entity Type | Strategy | Ví dụ | File |
|---|---|---|---|
| **videoProgress** | Additive merge | Server: 0-30s + 50-80s. Client: 20-60s. Result: 0-80s union | `SyncUseCase:215-259` |
| **lessonProgress** | Forward-only | Server UNLOCKED. Client COMPLETED. Result COMPLETED. Reverse abort | `SyncUseCase:261-320` |
| **quizAttempt** | Server-wins | Server graded 8/10. Client offline attempt. Discard client | `SyncUseCase:353-380` |
| **publicationConflict** | Course version mismatch | Server publication_id changed. Client old version. 409 + mark stale | `SyncUseCase:192-198` |

**Conflict display:**
- syncQueue.update({syncStatus:'failed', lastError:'Xung đột: ...'})
- UI tab "Xung đột" hiển thị items cần resolve
- Button "Giải quyết": delete or accept server version
- Separate queue: `isConflictQueueItem(item)` để tránh auto-retry

**Evidence:**
- `offline-sync.service.ts:503-531, 612-629`
- `SyncUseCase.java:192-213`

---

### Flow 6 — Multi-User Isolation (Compound Key)

**Problem (P0):** Trước v4, không có userId trong courses/chapters/lessons → User A download, User B thấy → privacy leak.

**Solution v4+:** Compound primary key `[userId+id]`

```typescript
// lms-offline.db.ts:352-359 (v4)
this.version(4).stores({
  courses: '[userId+id], userId, downloadedAt',
  chapters: '[userId+id], [userId+courseId], [userId+courseId+sortOrder]',
  lessons: '[userId+id], [userId+courseId], [userId+chapterId], [userId+courseId+sortOrder]',
}).upgrade(tx => {
  tx.table('courses').clear();
  tx.table('chapters').clear();
  tx.table('lessons').clear();
});
```

**Query pattern:**
```typescript
// v1-v3 (NOT SAFE):
const course = await offlineDb.courses.get(courseId);

// v4+ (SAFE):
const userId = getCurrentUserId();
const course = await offlineDb.courses.get([userId, courseId]);
```

**Multi-user test:**
1. User A login → download Course X (tablet)
2. User B login (same tablet)
3. Query: `courses.where('[userId+id]').equals([userB_id, courseX_id])` → NOT FOUND
4. User B thấy empty offline library

**Evidence:**
- `lms-offline.db.ts:352-368` (v4)
- `lms-offline.db.ts:388-398` (v6 quizData same pattern)
- `lms-offline.db.ts:277-287` (getCurrentUserId từ localStorage)

---

## 3. Quyết định kỹ thuật (12 cái) — Stack PWA

### TD-01: Dexie.js (không raw IndexedDB)

**WHAT:** ORM-like wrapper (~1.5MB minified)

**WHY:**
- API: `db.courses.where('userId').equals(userId).toArray()` vs raw 50 dòng callback hell
- Transaction safety: `await db.transaction('rw', db.courses, db.chapters, async () => {...})` → atomic multi-table
- Index abstraction: tự build index từ schema → migrate dễ
- Type safety: TS definitions
- Backward compat: v1→v6 migrations built-in

**ALTERNATIVES:**
- Raw IDB: verbose, error-prone
- PouchDB: CRDT sync overkill cho single-writer
- WatermelonDB: RN-only

**EVIDENCE:** `lms-offline.db.ts:305-427`

---

### TD-02: Cache API cho video (không Dexie blob)

**WHAT:** Cache API = HTTP Cache layer, video → blob (50-500MB) → Cache API, không IDB

**WHY:**
- **Range request:** HTTP 206 Partial → Shaka seek `currentTime=60s` → fetch bytes 100MB-102MB
- **Streaming write:** `response.body.getReader()` → chunk → cache.put() → ZERO RAM
- **Browser optimization:** disk-backed
- **Player compat:** Shaka expects HTTP Range

**Math:**
```
Video 1GB + Shaka buffering 20s @ 5Mbps = 12.5MB chunk
- Cache API: Range [0-12.5MB] -> 12.5MB RAM (OK)
- Dexie blob: Load full 1GB -> ArrayBuffer -> RAM spike (CRASH on 8GB device)
```

**ALTERNATIVES:**
- Dexie blob: no Range support → load full → crash
- LocalStorage: 5-10MB limit
- File System API: restricted, no iOS

**EVIDENCE:** `offline-video.service.ts:323-396`, `sw-wrapper.js:92-146`

---

### TD-03: Service Worker custom (sw-wrapper, không chỉ NGSW)

**WHAT:** Custom `sw-wrapper.js` import NGSW + thêm Range handler

**WHY:**
- **NGSW limitation:** không handle `/offline-video/` custom protocol
- **Range request:** NGSW caching không preserve 206 response
- **Video header preservation:** `Accept-Ranges: bytes` → custom handler `buildVideoResponseHeaders()`
- **iPhone/Safari:** strict MP4 + Range → custom handler tested

**NGSW vẫn cần:**
- App shell prefetch (index, main.js, CSS)
- Data groups (API responses)
- Update check + SW registration

**Strategy:**
```javascript
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/offline-video/')) {
    event.respondWith(handleOfflineVideo(event.request));
    return;
  }
  // Fall through to NGSW
});
```

**ALTERNATIVES:**
- Full custom: reimplement NGSW (200+ LOC)
- NGSW only: video offline impossible

**EVIDENCE:** `sw-wrapper.js:1-70`, `ngsw-config.json:1-91`

---

### TD-04: Background Sync API (không setInterval)

**WHAT:** W3C 2024 OS-level sync queue, sync ngay cả khi app đóng

**WHY:**
- **Maritime:** thuyền viên đóng app, Internet 3AM → sync tự động
- **Battery:** setInterval keeps CPU/radio awake 24/7 (drain pin)
- **Browser integration:** Android FCM, iOS push → OS sync
- **Reliability:** OS guarantee retry exponential backoff

```typescript
private registerBackgroundSync(): void {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(reg => {
      (reg as any).sync?.register('lms-offline-sync').catch(() => {});
    });
  }
}
```

**ALTERNATIVES:**
- setInterval: battery drain
- SW timer: spec không support
- WebSocket: tàu offline impossible

**EVIDENCE:** `offline-sync.service.ts:165-166, 452-460`

---

### TD-05: Shaka Player (không HTML5 native)

**WHAT:** DASH/HLS player + adaptive bitrate (ABR) + offline

**WHY:**
- **Adaptive:** satellite 256kbps → switch 480p ← 720p (no buffer)
- **Offline HLS/DASH:** parse m3u8 → fetch segments
- **Shaka Packager output:** native support
- **DRM-ready:** Widevine

**Stack:**
```
Cloudflare R2 -> Shaka Packager -> HLS + DASH manifest
                                    -> Cache API (segments)
                                    -> Shaka Player (offline aware)
                                    -> <video> element
```

**EVIDENCE:** `offline-video.service.ts` (serve via /offline-video/)

---

### TD-06: Cloudflare R2 (không upload backend)

**WHAT:** S3-compatible; presigned URL upload (3-step)

**WHY:**
- **Bandwidth:** backend 8GB upload + 1000 ships × 50 students = 400GB/month → $500+ (R2 cheaper)
- **Multipart resume:** drop @ 300MB → resume từ byte 300MB
- **Geography:** CF CDN nearest edge
- **Presigned:** backend issue 4h JWT → student upload direct R2

**ALTERNATIVES:**
- Backend stream: slow, expensive
- Direct browser→R2 CORS: security issue (arbitrary MIME)

**EVIDENCE:** `PresignedUploadUseCase.java`, `V74__upload_sessions.sql`

---

### TD-07: Shaka Packager (HLS+DASH, không raw MP4)

**WHAT:** Transcoding + packaging tool; output HLS (.m3u8 + .ts segments) + DASH (.mpd + .m4s)

**WHY:**
- **Segment caching:** 1GB → 1000 × 1MB segment → cache 1-2 at time → bỏ unused
- **Bandwidth adaptive:** satellite → pick 480p (smaller) vs 720p
- **Cross-platform:** HLS (iPhone), DASH (Android+web)
- **DRM (future):** Widevine key rotation

**Flow:**
```
Teacher upload .mp4 -> Backend Shaka Packager
-> OUTPUT: HLS (720p, 480p, 360p) + DASH manifests
-> R2 storage
-> Student offline: cache HLS segments (not full file)
-> Shaka Player adaptive playback
```

---

### TD-08: Compound Key `[userId+...]`

**WHAT:** Dexie v4 thay primary key `'id'` → `'[userId+id]'`

**WHY:**
- **Tablet shared:** thuyền viên chung tablet → cùng IndexedDB origin
- **Privacy:** B không thấy A's downloads
- **Content access:** B không truy cập content của A
- **Data integrity:** B DELETE course → không xóa A data

**Without compound (v1-v3):**
```
User A download Course X
IDB: courses = { id: 'course-x', ... }

User B login (same browser)
Query: courses.get('course-x') -> return Course X (BUG: leaked)
```

**With compound (v4+):**
```
User A (uuid-a) download Course X
IDB: courses = { [userId+id]: [uuid-a, 'course-x'], ... }

User B (uuid-b) login
Query: courses.get([uuid-b, 'course-x']) -> NOT FOUND (correct)
```

**EVIDENCE:** `lms-offline.db.ts:352-368`

---

### TD-09: Tách Conflict Queue vs Failed Queue

**WHAT:** syncStatus='failed' subcategorize:
- Conflict items: user choice needed (manual)
- Network error: auto-retry exponential backoff

**WHY:**
- **UX clarity:** "Xung đột" tab vs "Lỗi" tab
- **Retry logic:** network → 2^n backoff, max 5 retry; conflict → skip auto-retry
- **User action:** "Giải quyết" vs "Thử lại ngay"

**Conflict detection:**
```typescript
// offline-sync.service.ts:374-375
const retryableItems = failedItems.filter(item => !this.isConflictQueueItem(item));
const conflictItems = failedItems.length - retryableItems.length;
```

**EVIDENCE:** `offline-sync.service.ts:374-380, 503-531`

---

### TD-10: 3-Step Quiz Attempt Sync

**WHAT:** Offline quiz → queue → sync → 2-step server:
1. POST `/api/v3/quizzes/{quizId}/attempts/start` → attemptId
2. POST `/api/v3/quizzes/attempts/{attemptId}/submit`

**WHY:**
- **Server-side grading:** client không biết answer
- **Academic integrity:** offline không correct answers
- **Attempt tracking:** retry-able

```typescript
// offline-sync.service.ts:677-720
if (item.entityType === 'quizAttempt') {
  const startRes = await http.post(`/api/v3/quizzes/${quizId}/attempts/start`, {});
  const attemptId = startRes.data.id;
  await http.post(`/api/v3/quizzes/attempts/${attemptId}/submit`, answersArray);
}
```

**ALTERNATIVES:**
- 1-step: không match Dexie offline record (missing attemptId)
- Direct offline grading: violate academic integrity

**EVIDENCE:** `offline-sync.service.ts:674-721`, `offline-quiz.service.ts:113-166`

---

### TD-11: Signed URL JWT 4h Expiry

**WHAT:** Presigned upload return JWT embedding permission + 4h expiry

**WHY:**
- **Student upload:** teacher allow → presigned token → student PUT
- **4h expiry:** student disconnect, resume 2h later (4h buffer); secure (4h later token invalid)
- **Scope:** JWT scoped specific R2 bucket path

**Token:**
```json
{
  "sub": "user-id-uuid",
  "scope": "/lms-videos/course-123/lesson-456/*",
  "iat": 1714118400,
  "exp": 1714132800,
  "uploadSessionId": "session-uuid"
}
```

**ALTERNATIVES:**
- No expiry: token leak forever
- 1h: too short maritime
- 24h: too long vulnerability

---

### TD-12: Schema v6 Migration (v1→v7)

**WHAT:** Dexie v1 basic → v7 (current) thêm quizData, publicationId, staleReason; graceful migration

**WHY:**
- **Backward compat:** auto upgrade
  - v1→v2: + downloadCheckpoints
  - v2→v3: + syncStatus+createdAt index
  - v4: + userId (P0 isolation)
  - v5: + contentVersion + isStale
  - v6: + quizData
  - v7: + publicationId + clientOperationId
- **Crash-safe:** explicit upgrade callback
- **No data loss:** v4 clear (acceptable cost cho isolation), v5+ additive

**v4 (only breaking):**
```typescript
this.version(4).upgrade(tx => {
  tx.table('courses').clear();  // Re-download
});
```

**EVIDENCE:** `lms-offline.db.ts:319-427`

---

## 4. Đặc thù MARITIME — TRỌNG TÂM

### Problem Statement

Đề tài: "Xử lý vấn đề đặc thù học viên công tác trên tàu, chất lượng mạng internet kém hoặc không có"

### Cách phân hệ giải quyết

#### 1. Tàu 30 ngày không Internet — Download trước rời cảng

**Tình huống:**
- Khoá "An toàn hàng hải" 30h video
- Cập cảng Hải Phòng (Internet 72h)
- Tải xuống 100% trước khi ra khơi

**Cơ chế:**
1. `CourseDownloadService.downloadCourse()` streaming
   - Không load cả file vào RAM (8GB tablet)
   - Checkpoint per chapter → crash = resume chapter
   - Video Cache API (Range) → Shaka adaptive
2. Dexie storage:
   - Course meta 50KB
   - 30 lesson 500KB
   - Quiz (no answers) 200KB
   - Video 8GB
   - **Total 8.7GB** (Dexie no limit nếu persistent)
3. Multi-user (v4 compound):
   - A download → `[userA_id, courseId]`
   - B share later → query `[userB_id, courseId]` → NOT FOUND

**Evidence:**
- `course-download.service.ts:120-280`
- `offline-video.service.ts:324-396`
- `lms-offline.db.ts:352-368`

#### 2. Hành trình 30 ngày offline — Học từ cache

**Tình huống:**
- Tàu giữa Thái Bình Dương, 0 Internet
- Học 3h/ngày

**Cơ chế:**
1. HTTP request → `offlineInterceptor` bắt:
   - `navigator.onLine = false` → fallback IDB
   - Pattern match → query Dexie
   - Trả response 200 OK (fake) → UI không nhận biết offline
2. Video play:
   - `<video src="/offline-video/{sectionId}">` → SW handler
   - Query `offline-videos:{userId}` cache → Shaka Range → 206
   - Adaptive 480p
3. Progress saved local:
   - `progress.update({videoPosition: 42})`
   - `syncQueue.add({entityType:'progress', syncStatus:'pending'})`
   - Badge: "15 tiến độ đợi đồng bộ"
4. Quiz offline:
   - `OfflineQuizService.getQuizForLesson()` → IDB
   - Submit → `queueOfflineSubmission()` → syncQueue
   - Toast: "Bài làm lưu — kết quả khi có mạng"

**Persistence guarantee:**
- Dexie + Cache API persistent (requestPersistence approved)
- iOS Home Screen PWA EXEMPT 7-day ITP eviction (Safari 17+)
- Pin yếu: IDB persistent, không memory

**Evidence:**
- `offline.interceptor.ts:50-69, 99-150`
- `sw-wrapper.js:38-70`
- `offline-sync.service.ts:115-167`
- `lms-offline.db.ts:289-291` (isOfflinePersistenceSupported)

#### 3. Cập cảng — Sync 15 progress + 3 quiz

**Tình huống:**
- Tàu cập cảng Kobe (Internet trở lại)
- Auto-sync (Background Sync API)

**Cơ chế:**
1. Window online → 2s delay → `syncWithPriority()`:
   - Step 1: syncAll → POST /sync/push (batch 15)
   - Step 2: pullServerState → check version conflict
   - Step 3: checkContentFreshness
2. Batch payload:
```json
{"operations": [
   {"entityType":"progress", "payload":{"lessonId":"...", "status":"COMPLETED"}},
   {"entityType":"videoProgress", "payload":{"sectionId":"...", "watchedSeconds":3600}},
   {"entityType":"quizAttempt", "payload":{"quizId":"...", "answers":{...}}}
]}
```
3. Backend SyncUseCase:
   - Route per entityType
   - Detect publication conflict → 409
   - Return {accepted:14, rejected:0, conflicts:[1 quiz]}
4. Frontend:
   - 14 → syncStatus='synced'
   - 1 quiz conflict → syncStatus='failed', lastError
   - Toast: "Đồng bộ 14/15"
   - User resolve manually
5. Cleanup synced > 24h

**Evidence:**
- `offline-sync.service.ts:269-282, 503-531, 235-250`
- `SyncUseCase.java:200-213`

#### 4. Bandwidth tiết kiệm — R2 + Shaka Packager

**Tình huống:**
- Satellite 1GB/month = $50

**Cơ chế:**
1. Backend Shaka Packager → HLS + DASH multiple bitrates
   - 720p (10Mbps) + 480p (8Mbps) + 360p (6Mbps)
2. Student download cache only used segments
   - Internet 720p → 720p segments
   - Satellite 256kbps → adaptive 360p
3. R2 cost:
   - Teacher upload direct R2 (không backend)
   - Student download Cache API (browser disk)
   - Bandwidth: teacher upload 10GB once → 1000 ships download (R2 edge) → **Tiết kiệm 90% so với backend relay**

**Evidence:**
- `V74__upload_sessions.sql`
- `offline-video.service.ts:324-396`

---

## 5. Số liệu cụ thể

### Frontend

| Component | File | LOC |
|---|---|---|
| Dexie schema | `lms-offline.db.ts` | 1,004 |
| Sync service | `offline-sync.service.ts` | ~950 |
| Course download | `course-download.service.ts` | ~650 |
| Video service | `offline-video.service.ts` | 415 |
| Quiz service | `offline-quiz.service.ts` | 210 |
| HTTP interceptor | `offline.interceptor.ts` | 350 |
| Service Worker | `sw-wrapper.js` | ~250 |
| NGSW config | `ngsw-config.json` | 92 |
| Storage health | `offline-storage-health.service.ts` | ~300 |
| Storage telemetry | `offline-storage-telemetry.service.ts` | ~200 |
| Utils | `offline-http-error.ts`, ... | ~200 |
| UI Components | dialog, indicator, repair | ~500 |
| Tests | E2E + unit | ~400 |
| **TOTAL** | | **~5,500** |

### Backend

| Component | File | LOC |
|---|---|---|
| SyncUseCase | `SyncUseCase.java` | ~550 |
| SyncPushRequest | `SyncPushRequest.java` | ~100 |
| SyncResponse | `SyncResponse.java` | ~150 |
| V74 migration | `V74__upload_sessions.sql` | 22 |
| VideoProgressRepository | | ~50 |
| QuizAttemptUseCase + ... | | ~300 |
| **TOTAL** | | **~1,200** |

**Endpoints:**
- POST /api/v3/sync/push
- GET /api/v3/sync/pull
- POST /api/v3/quizzes/{quizId}/attempts/start
- POST /api/v3/quizzes/attempts/{attemptId}/submit
- POST /api/v3/student/progress/lessons/{lessonId}/complete
- POST /api/v3/video-progress/track

### Migrations

| Migration | Purpose |
|---|---|
| V54 | Seed users + courses + content |
| V55 | Seed assessment |
| V70 | Categories + tags |
| V74 | Upload sessions |

**Dexie schema:** 8 table (v7), compound key `[userId+id]` (v4+), 25+ indexes

---

## 6. Q&A Defense (12 câu)

### Q1: Vì sao Dexie, không raw IDB?

**A:** ORM → transaction safety (multi-table atomic), index abstraction, type safety. Raw IDB = callback hell. Dexie 1.5MB worth crash-safe download.
**Evidence:** `lms-offline.db.ts:305-427`

---

### Q2: Vì sao Cache API cho video, không Dexie blob?

**A:** Cache API hỗ trợ HTTP 206 Range → Shaka seek không load full file. Dexie blob → full RAM → 1GB/8GB tablet = crash. Streaming write zero RAM spike.
**Evidence:** `offline-video.service.ts:324-396`, `sw-wrapper.js:92-146`

---

### Q3: Thuyền viên chia sẻ tablet — tách dữ liệu sao?

**A:** Dexie v4 compound primary key `[userId+id]`. A download → `[userA_id, courseId]`. B query `[userB_id, courseId]` → NOT FOUND. Privacy fixed. v4 clear old data (force re-download) = acceptable trade-off.
**Evidence:** `lms-offline.db.ts:352-368`

---

### Q4: Pin yếu, app crash đang download — recover được?

**A:** `DownloadCheckpoint` table. Per-chapter atomic write → checkpoint sau mỗi chapter success. App restart → resume từ `completedChapterIds.length`, không từ đầu. Max loss = 1 chapter (~500MB), not 8.7GB.
**Evidence:** `course-download.service.ts:180-200`, `lms-offline.db.ts:263-270`

---

### Q5: Video 1GB tablet 8GB RAM — lag không?

**A:** Cache API streaming (no RAM) + Shaka adaptive. Range buffer 20s @ 5Mbps = 12.5MB peak (not 1GB). Shaka pick bitrate per bandwidth → smooth satellite yếu.
**Evidence:** `offline-video.service.ts:346-369`, `sw-wrapper.js:92-146`

---

### Q6: Học viên xuất video offline ra ngoài được?

**A:** Video lưu Cache API (binary opaque) + IDB blob (LevelDB). Không export GUI. File manager → folder visible nhưng binary không mở được. Technically với DB tools có thể extract, nhưng casual = safe.
**Reference:** `PWA_OFFLINE_RESEARCH.md §3.2`

---

### Q7: Sync conflict 2 device cùng quiz — xử sao?

**A:** Quiz = server-wins. A grade 8/10, B grade 7/10. Sync both → SyncUseCase detect → return last (server authoritative). Frontend mark conflict → user "Xung đột: quizAttempt đã chấm" → resolve hoặc discard.
**Evidence:** `SyncUseCase.java:353-380`, `offline-sync.service.ts:503-531`

---

### Q8: Tàu 30 ngày không Internet, 30GB bài học — Dexie chứa được?

**A:** IDB quota ~60% disk (tablet 64GB = 38GB quota). 30GB < 38GB. Dexie no hard limit nếu persistent storage approved. requestPersistence() → user grant → no eviction. iOS Home Screen PWA EXEMPT 7-day ITP.
**Evidence:** `lms-offline.db.ts:289-291`

---

### Q9: App crash giữa sync — duplicate request không?

**A:** `clientOperationId` dedup. Frontend generate UUID per operation → queue. Backend check: same clientOperationId → skip (idempotent). Crash trước POST → next retry same clientOperationId → no duplicate.
**Evidence:** `offline-sync.service.ts:470-481`, `SyncUseCase.java:74-76`

---

### Q10: Satellite 256kbps video giật — giải pháp?

**A:** Shaka Player + HLS/DASH multi-bitrate. Backend Shaka Packager output 360p (6Mbps) + 480p (8Mbps) + 720p (10Mbps). Shaka detect 256kbps → auto-switch 360p (smooth). User can manual select too.

---

### Q11: Học viên đóng app, tàu offline 5 ngày, online lại — sync tự động?

**A:** Background Sync API. Offline items queued. App closed. Tàu online → OS trigger sync event (via SW) → POST /sync/push automatic. iOS PWA: local notification + link.
**Evidence:** `offline-sync.service.ts:452-460`

---

### Q12: Migration v1→v7 phức tạp — user encounter issue thì sao?

**A:** Dexie + `offlineDbReady` promise. Auto upgrade on first load. Upgrade fail (UpgradeError, BackingStoreError) → recovery: (1) recreate same name, (2) rotate DB name, (3) fallback online-only. Health snapshot + telemetry log issue. UI shows "Bộ nhớ offline đang phục hồi" (non-blocking).
**Evidence:** `lms-offline.db.ts:844-893` (openOfflineDbWithRecovery)

---

## 7. Kết luận Maritime Fit

Phân hệ này GIẢI QUYẾT ĐẦY ĐỦ vấn đề đặc thù đề tài:

| Vấn đề | Giải pháp | Bằng chứng |
|---|---|---|
| Tàu 30 ngày không Internet | Download trước + offline cache | CourseDownloadService + offlineInterceptor |
| Thuyền viên chia sẻ tablet | v4 compound key | `[userId+courseId]` |
| Bandwidth tiết kiệm satellite | Shaka + HLS segments + R2 | Shaka Packager + Cache API |
| Video lag (8GB RAM, 1GB video) | Streaming + Range + adaptive | offline-video.service + sw-wrapper |
| Sync conflict 2 device | Conflict queue separate | SyncUseCase routing |
| Quiz academic integrity | Server-side grading offline | 2-step submit + server-wins |
| App crash recovery | Checkpoint per chapter | DownloadCheckpoint + atomic tx |
| Persistent storage iOS ITP | Home Screen PWA exempt | Apple Safari 17+ |

**LOC**: ~5,500 FE + ~1,200 BE = **6,700 LOC** đặc hữu phân hệ offline.

**Test:** E2E smoke `offline-learning-smoke.spec.ts` (250+ dòng) cover download → offline learn → sync.

**SOTA:** Align Moodle Mobile (SQLite) + Canvas Student (native partition) + Coursera (per-account folder), nhưng trên web browser PWA constraints.
