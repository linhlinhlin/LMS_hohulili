# PWA Offline-First Architecture: Deep Technical Research

> **Project**: Maritime LMS (holilihu.online) | **Date**: 2026-03-01 | **Version**: 1.0
> **Authors**: Dev Team | **Status**: Research Complete — Implementation Pending (P0 Multi-Account Isolation)

---

## Abstract

This document presents a comprehensive technical analysis of the Progressive Web Application (PWA) offline-first architecture implemented for a maritime Learning Management System (LMS). The system serves maritime crews who may operate at sea for extended periods (1-2 years) with intermittent satellite connectivity. Our implementation leverages modern Web APIs — IndexedDB (Dexie.js 4), Cache API, Angular Service Worker (NGSW), and Web Crypto — to provide near-native offline capabilities within browser constraints. We compare our approach against industry leaders (Moodle Mobile, Canvas Student, Coursera) and identify critical gaps including multi-account data isolation and storage management.

**Keywords**: PWA, Offline-First, IndexedDB, Service Worker, Maritime LMS, Cache API, Dexie.js, Angular

---

## 1. Introduction

### 1.1 Problem Domain

Maritime education presents unique challenges for digital learning platforms:

- **Extended offline periods**: Crews at sea for 1-24 months with limited or no internet
- **Satellite connectivity**: High latency (500-700ms RTT), low bandwidth (256kbps-2Mbps), expensive data
- **Shared devices**: Multiple crew members may share tablets/computers onboard
- **Diverse platforms**: iPad, Android tablets, Windows/macOS desktops
- **Content-heavy**: Video lectures, technical manuals, assessment materials (50-200MB per course)

### 1.2 Design Philosophy

We adopt a **Download-First** approach (distinct from full Local-First):

| Approach | Description | Used By |
|----------|-------------|---------|
| **API-First** | Always fetch from server, cache as fallback | Traditional web apps |
| **Download-First** (ours) | Downloaded courses read from IndexedDB instantly; non-downloaded use API-first | Spotify, Netflix |
| **Local-First** | All data lives locally, sync in background | Figma, Linear |

**Rationale**: Full Local-First requires CRDT conflict resolution complexity unsuitable for our domain. LMS data is predominantly single-writer (one student's progress, one student's quiz attempt), making simpler conflict strategies sufficient.

---

## 2. Architecture Overview

### 2.1 Storage Layer Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Environment                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  LocalStorage │  │  IndexedDB   │  │    Cache API     │   │
│  │  (~5-10KB)   │  │  (Dexie.js)  │  │                  │   │
│  │              │  │  (~50-500MB) │  │  (~50-500MB)     │   │
│  │ • JWT tokens │  │              │  │                  │   │
│  │ • User data  │  │ 8 tables:    │  │ • offline-videos │   │
│  │ • Session    │  │ • courses    │  │   (video blobs)  │   │
│  │   state      │  │ • chapters   │  │                  │   │
│  │              │  │ • lessons    │  │ • ngsw caches    │   │
│  │              │  │ • progress   │  │   (app shell,    │   │
│  │              │  │ • submissions│  │    API responses) │   │
│  │              │  │ • quizAttemps│  │                  │   │
│  │              │  │ • syncQueue  │  │                  │   │
│  │              │  │ • checkpoints│  │                  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Angular NGSW (Service Worker)               │   │
│  │  • App shell prefetch (index, main.js, CSS, fonts)    │   │
│  │  • 9 dataGroups (freshness + performance strategies)  │   │
│  │  • navigationRequestStrategy: "freshness"             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow — End-to-End

```
Phase 1: INSTALL
  User opens web → NGSW install
  → Prefetch: app-shell (index.html, main.js, polyfills, CSS)
  → Lazy: chunks, images, fonts

Phase 2: DOWNLOAD (user-initiated per course)
  CourseDownloadService.downloadCourse(courseId)
  → requestPersistence() (request permanent storage)
  → Check quota (>90% → abort with warning)
  → GET /api/v3/courses/{id} → course metadata → IndexedDB
  → GET /api/v3/courses/{id}/content → chapters + lessons → IndexedDB
  → Per-chapter atomic write (Dexie transaction)
  → Checkpoint after each chapter (crash-safe resume)
  → Video: ReadableStream → Cache API (zero-RAM pipe)

Phase 3: OFFLINE ACCESS
  HTTP GET → offlineInterceptor → check IndexedDB fallback
  Video request → OfflineVideoService → Cache API → blob URL
  HTTP POST/PUT/DELETE → syncQueue (IndexedDB) → fake 202 response

Phase 4: SYNC (when connectivity returns)
  window.online event → 2s stabilization delay
  → POST /api/v3/sync/push { operations[] }
  → SyncUseCase routes: progress/video/quiz/submission
  → Conflict resolution per entity type
  → Exponential backoff on failure (2s → 4s → 8s → 16s → 300s max)
```

### 2.3 IndexedDB Schema (Dexie.js 4)

**Database name**: `lms-maritime-offline`

| Table | Primary Key | Indexes | Fields | Has userId? |
|-------|------------|---------|--------|------------|
| `courses` | `id` | `downloadedAt` | id, title, description, thumbnailUrl, totalLessons, downloadedAt, version, sizeBytes | **NO** |
| `chapters` | `id` | `courseId, [courseId+sortOrder]` | id, courseId, title, sortOrder | **NO** |
| `lessons` | `id` | `courseId, chapterId, [courseId+sortOrder]` | id, courseId, chapterId, title, contentHtml, videoManifestUrl, videoOfflineUri, sortOrder, downloadedAt | **NO** |
| `progress` | `++id` (auto) | `lessonId, courseId, userId, syncStatus, updatedAt` | lessonId, courseId, **userId**, progressPercent, videoPosition, completedAt, completedSectionIds, syncStatus, updatedAt | **YES** |
| `submissions` | `++id` (auto) | `assignmentId, userId, syncStatus, submittedAt` | assignmentId, **userId**, content, submittedAt, syncStatus, retryCount | **YES** |
| `quizAttempts` | `++id` (auto) | `quizId, userId, syncStatus, submittedAt` | quizId, **userId**, answers, score, passed, submittedAt, syncStatus, retryCount | **YES** |
| `syncQueue` | `++id` (auto) | `entityType, [syncStatus+createdAt], createdAt` | entityType, operationType, endpoint, payload, createdAt, syncStatus, retryCount, lastError, nextRetryAt | Via payload |
| `downloadCheckpoints` | `courseId` | — | courseId, completedChapterIds, totalChapters, startedAt, updatedAt | **NO** |

**Critical finding**: Content tables (courses, chapters, lessons) lack `userId` field — data is shared across all users on the same browser profile.

---

## 3. Multi-Device Behavior

### 3.1 Storage Quotas per Platform

| Platform | IndexedDB Quota | Cache API Quota | Eviction Policy | Persistent Storage API |
|----------|----------------|-----------------|-----------------|----------------------|
| Chrome Desktop (Win/Mac/Linux) | ~60% of disk (~30GB on 50GB) | Same pool | No auto-eviction if persistent | Auto-granted (engagement heuristic) |
| Chrome Android | ~60% of disk | Same pool | Same as desktop | User prompt required |
| Safari Desktop (17+) | ~60% of disk | Same pool | 7-day if unused (tab) | Supported |
| iOS Safari (tab) | ~500MB IDB, ~50MB Cache | Separate pools | **7-day ITP eviction** | Supported but may be denied |
| iOS PWA (Home Screen) | ~60% of disk (Safari 17+) | Same pool | **EXEMPT from 7-day** | Supported |
| Firefox Desktop | ~10% of disk | Same pool | LRU when near full | User prompt required |

**Maritime-critical finding**: iOS Home Screen PWA is EXEMPT from 7-day ITP eviction (confirmed Safari 17+, WebKit blog March 2024). Crew members MUST use "Add to Home Screen", not Safari tab browsing.

### 3.2 Physical File Locations

| Platform | IndexedDB Path | User Browsable? | Content Extractable? |
|----------|---------------|----------------|---------------------|
| Windows Chrome | `%LocalAppData%\Google\Chrome\User Data\Default\IndexedDB\` | YES (folder visible) | NO (LevelDB binary format) |
| Windows Edge | `%LocalAppData%\Microsoft\Edge\User Data\Default\IndexedDB\` | YES | NO |
| macOS Chrome | `~/Library/Application Support/Google/Chrome/Default/IndexedDB/` | YES | NO |
| macOS Safari | `~/Library/Safari/Databases/IndexedDB/` | YES | NO |
| Android Chrome | `/data/data/com.android.chrome/app_chrome/Default/IndexedDB/` | NO (requires root) | NO |
| iOS Safari | Sandboxed WebKit container | NO (no filesystem access) | NO |

**Security assessment**: On desktop platforms, the IndexedDB folder is visible in the file system but contains LevelDB binary data that cannot be directly opened as HTML or video files. Video blobs in Cache API are similarly stored as opaque binary, not extractable `.mp4` files. A technically sophisticated user with database tools could theoretically extract content, but casual browsing to a folder to view lectures is not possible.

### 3.3 Cross-Platform Behavior Matrix

| Scenario | Chrome Desktop | Chrome Android | iOS Home Screen | iOS Safari Tab |
|----------|---------------|---------------|-----------------|---------------|
| First load offline | App shell from NGSW cache | Same | Same | Same |
| Downloaded course offline | Full access (IndexedDB) | Full access | Full access | Full access (if <7 days) |
| Non-downloaded course offline | NGSW cached API response (stale) | Same | Same | Same |
| Video offline | Cache API blob → `<video>` | Same | Same | Same |
| Quiz offline | Answers saved to IndexedDB | Same | Same | Same |
| Sync on reconnect | Auto batch push | Same | Same | Same |
| After 7 days unused | Data persists | Data persists | **Data persists** | **ALL DATA DELETED** |
| After 30 days unused | Data persists | Data persists | Data persists | ALL DATA DELETED |
| Browser update | SW re-validates | Same | Same | Same |
| Storage full | Download aborts (90% check) | Same | Same | Same |

---

## 4. Edge Cases Analysis

### 4.1 Two Accounts on Same Device (P0 — Critical)

**Current behavior**:
```
1. User A logs in → downloads Course X → IndexedDB stores course data
2. User A logs out (soft logout) → UI session cleared, tokens + IDB preserved
3. User B logs in on same browser → navigates to offline page
4. User B sees Course X in IndexedDB (was downloaded by User A)
5. User B's progress writes to separate rows (progress table HAS userId)
6. But User B can READ User A's downloaded course content
```

**Root cause**: IndexedDB is scoped per **origin** (holilihu.online), not per user. The `courses`, `chapters`, and `lessons` tables have no `userId` field.

**Impact**:
- Privacy leak: User B sees what courses User A downloaded
- Content leak: User B can access course content offline without enrollment
- Delete risk: User B could delete a course, removing User A's offline data
- Progress is isolated correctly (has userId), but content is not

**SOTA comparison**:

| Product | Isolation Strategy |
|---------|-------------------|
| Moodle Mobile | SQLite database per-site (effectively per-account per-server) |
| Canvas Student | Native app with per-user data partition |
| Coursera | Native app with per-account folder in app sandbox |
| Google Drive PWA | Single DB, userId filter on all queries |
| Our system | **No isolation** on content tables |

**Proposed fix**: Add `userId` field to courses/chapters/lessons tables via Dexie.js version migration (v4). Filter all reads by current userId. On logout, hide (not delete) other users' data.

### 4.2 Storage Exhaustion

**Current safeguards**:
- `CourseDownloadService` checks quota before download (>90% → abort + Toast warning)
- `requestPersistence()` prevents browser from auto-evicting our data
- `StorageManagerService.estimate()` exposes current usage

**Gaps**:
- No UI component showing "Used X of Y MB" to end users
- No suggestion system ("Delete Course X to free Y MB")
- No automatic cleanup of old/completed courses
- No per-course size estimation before download

**SOTA**: Spotify shows storage usage in settings with per-playlist sizes. Netflix shows download sizes before downloading.

### 4.3 iOS Safari Tab 7-Day Eviction

**Current mitigations** (implemented in Phase 6):
- `ngsw-config.json`: All dataGroups maxAge set to 7 days (matching ITP window)
- `navigationRequestStrategy: "freshness"` prevents stale cache loops
- `visibilitychange` handler detects SW eviction after iOS background suspension
- `ChunkLoadError` global handler for lazy chunk mismatch after SW update
- Persistent storage request on first visit

**Remaining risk**: If user uses Safari tab (not Home Screen) and doesn't visit for 7+ days, ALL offline data is purged by WebKit ITP. This is a platform limitation with no workaround except "Add to Home Screen".

**Recommendation**: Add in-app prompt encouraging "Add to Home Screen" for maritime users, with explanation of data preservation benefits.

### 4.4 Browser Crash During Download

**Current handling** (implemented in Phase 3):
- `downloadCheckpoints` table tracks `completedChapterIds` per course
- Download resumes from last successful chapter checkpoint
- Per-chapter atomic transaction via Dexie.js `.transaction()`
- `.put()` operations are idempotent (re-download doesn't create duplicates)

**Assessment**: Well-implemented crash recovery. Follows Google's recommended pattern for large IndexedDB writes.

### 4.5 Multi-Device Conflict Resolution

**Current strategy** (implemented in Phase 5):

| Entity Type | Strategy | Rationale |
|-------------|----------|-----------|
| Video progress (watched segments) | **Additive merge** | Segments accumulate, union of all watched ranges |
| Lesson completion | **Forward-only** | COMPLETED never reverts to IN_PROGRESS |
| Section completion | **Set union** | Completed section IDs accumulate across devices without duplication |
| Quiz attempts | **Server-wins** | Server grading is authoritative |
| Assignment submissions | **Deferred** | Replay to individual endpoint, server decides |

**Example scenario**:
```
Device A (offline): Completes Lesson 1, 2, 3
Device B (offline): Completes Lesson 2, 3, 4
Both sync → Server: Lessons 1, 2, 3, 4 all COMPLETED ✓
```

**Assessment**: Appropriate for LMS domain. CRDT would be over-engineered for single-writer data. The forward-only strategy for lesson completion prevents accidental regression.

**2026-03-23 clarification**:
- The browser copy is an **optimistic local overlay**, not the system of record.
- The server remains canonical for enrollment status, certificate issuance, and quiz grading.
- Divergence between device A and device B learning progress is **not** treated as a hard conflict by default.
- A real sync conflict is reserved for cases such as **stale publication/package mismatch** where replaying local progress against old content would be unsafe.

### 4.6 Concurrent Downloads

**Current behavior**: Downloads are sequential per course. Multiple courses can be queued but processed one at a time to avoid overwhelming the connection.

**Satellite consideration**: Maritime satellite connections are shared across the vessel. Parallel downloads would consume disproportionate bandwidth. Sequential is the correct choice.

---

## 5. Security Analysis

### 5.1 Encryption at Rest

| Storage Layer | Encrypted? | Risk Level | Mitigation |
|--------------|-----------|-----------|-----------|
| IndexedDB | NO (plaintext) | Medium | Same-Origin Policy prevents cross-origin access |
| Cache API | NO (plaintext) | Medium | Same-Origin Policy |
| LocalStorage | NO (plaintext) | High (tokens!) | Short-lived access tokens (24h) |
| NGSW Cache | NO (plaintext) | Low | App shell code only |

**Industry comparison**: Neither Moodle Mobile nor Canvas Student encrypt offline content at rest. Coursera uses DRM (Widevine/FairPlay) for video but not text content. Encryption at rest for web storage is not standard practice and would require Web Crypto API with key management complexity.

**Risk assessment**: On shared maritime devices, the primary risk is another user on the same browser profile accessing content via DevTools (F12 → Application → IndexedDB). This requires technical knowledge beyond typical maritime crew members. Physical device security (screen locks, user accounts) provides adequate protection for educational content.

### 5.2 Cross-Origin Security

The Same-Origin Policy (SOP) provides strong isolation:
- Only JavaScript from `holilihu.online` can read IndexedDB data for that origin
- A malicious website on another domain cannot access our IndexedDB
- Service Worker scope is limited to the registration origin

### 5.3 XSS Vulnerability Impact

If an XSS attack succeeds on our domain, the attacker could:
- Read all IndexedDB content (courses, progress, quiz answers)
- Read all Cache API data (videos)
- Read LocalStorage (JWT tokens)
- Exfiltrate data to external server

**Current mitigations**:
- Angular's built-in XSS sanitization (DomSanitizer)
- Content Security Policy headers (via Caddy)
- No `innerHTML` usage for user-generated content
- All API responses are JSON (not rendered as HTML)

### 5.4 Token Security (Soft Logout)

The soft logout pattern preserves tokens in LocalStorage for offline session resume:

| Scenario | Tokens | IndexedDB | Security Impact |
|----------|--------|-----------|----------------|
| Online full logout | CLEARED | Preserved | Secure — tokens invalidated |
| Offline soft logout | PRESERVED | Preserved | Acceptable — offline resume needed |
| Browser close + reopen | Preserved | Preserved | Same as any persistent login |
| Different user same browser | Previous user's tokens visible in LS | Shared content | **P0 issue** — should scope by user |

---

## 6. SOTA Comparison

### 6.1 Feature Matrix

| Feature | Our PWA | Moodle Mobile | Canvas Student | Coursera |
|---------|---------|--------------|---------------|----------|
| **Platform** | PWA (web) | Ionic + Cordova | React Native | Native (iOS/Android) |
| **Offline DB** | IndexedDB (Dexie.js) | SQLite (Cordova) | SQLite | SQLite |
| **Video offline** | Cache API (zero-RAM) | File system download | File system | DRM-protected download |
| **Multi-account** | No isolation (P0) | Per-site DB isolation | Per-user partition | Per-account folder |
| **Encryption** | No | No | No | DRM for video only |
| **Storage limit** | Browser quota (~60% disk) | Device storage | Device storage | Device storage |
| **iOS support** | Home Screen PWA | Native App Store | Native App Store | Native App Store |
| **Sync strategy** | Batch push + conflict resolution | Sync on demand | Real-time | Sync on open |
| **Crash recovery** | Chapter checkpoints | Transaction-based | Unknown | Re-download |
| **Install required** | No (Add to Home Screen optional) | Yes (App Store) | Yes (App Store) | Yes (App Store) |
| **Update mechanism** | NGSW auto-update | App Store update | App Store update | App Store update |
| **Cross-platform** | Any modern browser | iOS + Android | iOS + Android | iOS + Android |

### 6.2 Advantages of PWA Approach

1. **Zero install friction**: Users access via URL, no App Store approval needed
2. **Instant updates**: NGSW auto-updates without user action or store review
3. **Cross-platform**: Single codebase works on all platforms
4. **Storage efficiency**: Cache API streaming avoids RAM duplication (Google Kino pattern)
5. **Lower maintenance**: No separate iOS/Android codebases
6. **Offline-capable**: Near-native offline experience with proper implementation

### 6.3 Limitations vs Native Apps

1. **Storage quota**: Browser-imposed limits vs full device storage
2. **Background sync**: Limited to Service Worker lifecycle vs always-on background
3. **Push notifications**: Web Push vs native push (different reliability)
4. **DRM**: No hardware-level DRM for video content
5. **File system**: No direct file access for video export
6. **iOS restrictions**: Safari-only engine, potential WebKit limitations

---

## 7. Identified Issues & Remediation Plan

### Priority 0 — Critical

| # | Issue | Impact | Proposed Fix | Effort |
|---|-------|--------|-------------|--------|
| 1 | Multi-account no data isolation | Privacy leak between users on shared device | Add `userId` to courses/chapters/lessons/checkpoints. Dexie v4 migration. Filter all reads. | Medium |

### Priority 1 — Medium

| # | Issue | Impact | Proposed Fix | Effort |
|---|-------|--------|-------------|--------|
| 2 | No storage management UI | Users can't see how much space offline data uses | Build StorageUsageComponent with per-course sizes | Low |
| 3 | Full logout doesn't clean offline data | Previous user's content lingers in IndexedDB | Clear IDB + Cache API on online full logout | Low |
| 4 | No "Add to Home Screen" prompt | iOS Safari tab users lose data after 7 days | Smart install prompt for maritime users | Low |

### Priority 2 — Low

| # | Issue | Impact | Proposed Fix | Effort |
|---|-------|--------|-------------|--------|
| 5 | No encryption at rest | Content readable via DevTools | Web Crypto API (not standard practice) | High |
| 6 | No download size estimation | Users don't know course size before download | Calculate from content + video sizes | Low |

---

## 8. Implementation Technologies

### 8.1 Key Libraries

| Library | Version | Purpose | Documentation |
|---------|---------|---------|--------------|
| Dexie.js | 4.x | IndexedDB wrapper with TypeScript, transactions, liveQuery | https://dexie.org |
| Angular NGSW | 20.x | Service Worker for app shell + API caching | https://angular.dev/ecosystem/service-workers |
| Shaka Player | 5.x | Adaptive video streaming (HLS/DASH) with offline support | https://shaka-player-demo.appspot.com |
| Cache API | Web Standard | Video blob storage with streaming support | https://developer.mozilla.org/en-US/docs/Web/API/Cache |

### 8.2 Key Files

| File | Purpose | LOC |
|------|---------|-----|
| `fe/src/app/core/db/lms-offline.db.ts` | Dexie.js schema (8 tables, 3 versions) | ~150 |
| `fe/src/app/core/services/course-download.service.ts` | Course download with checkpoints | ~200 |
| `fe/src/app/core/services/offline-video.service.ts` | Video Cache API with zero-RAM streaming | ~150 |
| `fe/src/app/core/services/offline-sync.service.ts` | Sync queue with exponential backoff | ~200 |
| `fe/src/app/core/services/network-status.service.ts` | 3-tier network detection (none/slow/fast) | ~100 |
| `fe/src/app/core/services/storage-manager.service.ts` | Storage quota management | ~80 |
| `fe/src/app/api/interceptors/offline.interceptor.ts` | GET→IDB fallback, POST→syncQueue | ~100 |
| `fe/ngsw-config.json` | NGSW config (9 dataGroups, freshness strategy) | ~100 |
| `backend/.../shared/infrastructure/web/SyncControllerV3.java` | Push/pull/status sync endpoints | ~150 |
| `backend/.../shared/application/usecase/SyncUseCase.java` | Sync business logic routing | ~100 |

---

## 9. References

### Academic & Industry

1. Google Web Fundamentals — "Offline Storage for Progressive Web Apps" (2024)
2. Apple WebKit Blog — "Updates to Storage Policy" (March 2024) — https://webkit.org/blog/14403/
3. MDN Web Docs — "Storage quotas and eviction criteria" — https://developer.mozilla.org/en-US/docs/Web/API/Storage_API
4. Google Kino — Zero-RAM video streaming via ReadableStream pipe
5. W3C IndexedDB Specification — https://www.w3.org/TR/IndexedDB/

### LMS Industry

6. Moodle Mobile Offline Features — https://docs.moodle.org/501/en/Moodle_app_offline_features
7. Canvas LMS API Documentation — https://canvas.instructure.com/doc/api/
8. Coursera Mobile Offline — https://blog.coursera.org/mobile-offline-features/
9. Open edX Architecture — https://docs.openedx.org/

### PWA Best Practices

10. web.dev — "Learn PWA: Offline Data" — https://web.dev/learn/pwa/offline-data
11. Smashing Magazine — "Building Offline-First Web Apps" (2025)
12. BrowserTech Digest — "Encrypting Offline Storage for PWAs"
13. Dexie.js Documentation — https://dexie.org/docs/
14. Angular Service Worker Documentation — https://angular.dev/ecosystem/service-workers

### iOS/Safari Specific

15. Apple Developer — "WKWebView Service Worker Lifecycle"
16. BrainHub — "PWA on iOS: Limitations and Safari Support" — https://brainhub.eu/library/pwa-on-ios
17. MagicBell — "PWA iOS Limitations" — https://www.magicbell.com/blog/pwa-ios-limitations

---

## 10. Appendix

### A. Conflict Resolution Decision Matrix

```
Entity: video_progress
  Strategy: ADDITIVE
  Merge: Union of watched segment ranges
  Example: A=[0-30s, 60-90s] + B=[20-50s] → [0-50s, 60-90s]

Entity: lesson_completion
  Strategy: FORWARD-ONLY
  Merge: MAX(status) where COMPLETED > IN_PROGRESS > NOT_STARTED
  Example: A=COMPLETED + B=IN_PROGRESS → COMPLETED

Entity: section_completion
  Strategy: SET-UNION
  Merge: Union of completed section IDs for the same lesson
  Example: A=[s1,s2] + B=[s2,s3] → [s1,s2,s3]

Entity: quiz_attempt
  Strategy: SERVER-WINS
  Merge: Server grading is authoritative, client score is advisory
  Example: Client=85% + Server=82% → 82% (server's calculation)

Entity: assignment_submission
  Strategy: DEFERRED
  Merge: Replay to individual endpoint, let server apply business rules
  Example: Offline submission → POST to submit endpoint → server validates
```

### B. Session State Machine (Soft Logout)

```
                    ┌──────────────────────┐
                    │  ONLINE_AUTHENTICATED │
                    │  (normal operation)   │
                    └──────┬───────────────┘
                           │
              ┌────────────┴────────────┐
              │ network lost            │ explicit logout
              ▼                         ▼
  ┌───────────────────────┐   ┌─────────────────────┐
  │ OFFLINE_AUTHENTICATED │   │   UNAUTHENTICATED   │
  │ (full offline access) │   │   (no tokens)       │
  └──────────┬────────────┘   └─────────────────────┘
             │                          ▲
             │ refresh token            │ explicit
             │ expired                  │ logout (online)
             ▼                          │
  ┌───────────────────────┐             │
  │   OFFLINE_DEGRADED    │─────────────┘
  │ (read-only cached)    │  user clicks
  │ [amber banner shown]  │  "Đăng nhập lại"
  └───────────────────────┘  (when online)
```

### C. NGSW DataGroup Configuration

| Group | Strategy | maxSize | maxAge | URLs |
|-------|----------|---------|--------|------|
| course-catalog | freshness | 200 | 7d | /api/v3/courses, /api/v3/categories |
| course-content | performance | 500 | 30d | /api/v3/courses/*/content, /api/v3/courses/*/chapters |
| user-profile | freshness | 50 | 7d | /api/v3/auth/me, /api/v3/users/profile |
| enrollments | freshness | 200 | 7d | /api/v3/student/enrollments |
| progress-data | freshness | 500 | 7d | /api/v3/student/progress |
| messages-data | freshness | 100 | 1d | /api/v3/messages, /api/v3/conversations |
| images | performance | 200 | 30d | /uploads/**, CDN images |
| api-general | freshness | 300 | 1d | /api/v3/** (catch-all) |
| ai-assistant | freshness | 50 | 1d | /api/v3/ai/** |

---

*Document version 1.0 — Created 2026-03-01*
*Next update: After P0 multi-account isolation implementation*
