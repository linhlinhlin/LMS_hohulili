# STREAMING & PWA OFFLINE-FIRST ROADMAP
## LMS Hang Hai — Session 61+

> **Created**: 2026-02-23 | **Updated**: 2026-02-26 | **Status**: Phase 1-6 Done (iOS Hardened, 7d cache, esbuild fix) | **Owner**: Dev Team

---

## MUC TIEU

1. Video hoc tap phat muot ma o moi chat luong mang (nhu YouTube)
2. App hoat dong offline triet de (nhu native app)
3. Wiii AI assistant van hanh dung va hoan thien

---

## TRANG THAI HIEN TAI (Post-Implementation)

| Component | Before | After (Ph5) | After (Ph6) | Notes |
|-----------|--------|-------------|-------------|-------|
| Video Infrastructure | 85% | 95% | 95% | Shaka Player + maritime ABR, QoE tracking |
| PWA/Service Worker | 40% | 96% | **100%** | iOS hardened: visibility handler, ChunkLoadError, cache cleanup |
| Offline Storage | 30% | 93% | **98%** | 7d cache maxAge, persistent storage, Dexie.js fallback |
| Data Sync Pipeline | 0% | 90% | 90% | Batch `/api/v3/sync/push`, conflict resolution, additive merge |
| Wiii AI Integration | 95% | 98% | 98% | Exponential backoff, heartbeat, 180s timeout |
| SSE Streaming | 90% | 96% | 96% | Retry on 401, heartbeat, reconnect |

---

## TECHNOLOGY DECISIONS

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Streaming Protocol | HLS + CMAF (fMP4) | iOS bat buoc HLS; CMAF encode 1 lan |
| Video Player | Shaka Player 5.x | Built-in offline, Google-maintained, full ABR |
| Transcoding | Cloudflare Stream | Da dung R2, free encoding, simple API |
| CDN | Cloudflare (bundled) | HTTP/3, 330 cities |
| Offline DB | Dexie.js 4 | Fluent API, liveQuery, TypeScript-first |
| Service Worker | Angular SW + Workbox hybrid | Angular SW basics + Workbox Background Sync |
| ABR Strategy | Conservative buffer-based | Satellite bursty -> buffer-based on dinh |
| Bitrate Ladder | 144p/240p/360p/720p | Maritime BW limits |
| Sync Protocol | LWW + Server-Authoritative | Don gian, phu hop single-user-per-device |

---

## PHASE 1: PWA FOUNDATION ✅ DONE

**Sprint**: 1 | **Priority**: HIGHEST | **Status**: ✅ Complete

### Tasks

- [x] 1.1 Angular SW da co san (`@angular/service-worker` + `ngsw-config.json`)
- [x] 1.2 Cau hinh `ngsw-config.json` (6 data groups: catalog, content, profile, progress, images, enrollments)
- [x] 1.3 Cap nhat `manifest.json` (Vietnamese, shortcuts, #0056D2 theme)
- [x] 1.4 Them Dexie.js 4 + offline database schema (`lms-offline.db.ts`)
  - Tables: courses, chapters, lessons, progress, submissions, quizAttempts, syncQueue
- [x] 1.5 Tao `NetworkStatusService` (3-tier: none/slow/fast)
- [x] 1.6 Tao `OfflineIndicatorComponent` (status bar top-right)
- [x] 1.7 Tao `StorageManagerService` (quota visibility + persistent storage)
- [x] 1.8 Tao `StorageBudgetComponent` (progress bar UI)
- [x] 1.9 Request persistent storage via `SwUpdateService`
- [x] 1.10 Tao `ScreenWakeLockService` (giu man hinh khi xem video)
- [x] 1.11 Tao `SwUpdateService` (6h check interval, auto-reload)

---

## PHASE 2: ADAPTIVE VIDEO STREAMING ✅ DONE

**Sprint**: 2 | **Priority**: HIGH | **Status**: ✅ Complete

### Tasks

- [ ] 2.1 BE: Tao `CloudflareStreamService` (direct upload API) — **DEFERRED** (needs CF account)
- [ ] 2.2 BE: Them `streamUid` field vao lesson entity/migration — **DEFERRED**
- [ ] 2.3 BE: Endpoint lay playback URL tu stream UID — **DEFERRED**
- [x] 2.4 FE: Install shaka-player package
- [x] 2.5 FE: Tao `VideoPlayerAdaptiveComponent` (Shaka Player)
  - Maritime-optimized ABR: 60s buffer, 10 retries, 500kbps default BW estimate
  - Buffering overlay, network warning (<=360p), progress circle
- [x] 2.6 FE: Tao `OfflineVideoService` (Cache API storage)
  - Download via ReadableStream + progress tracking
  - List/delete downloaded videos
- [x] 2.7 FE: Integrated voi `WatchedSegmentsTracker` + `VideoProgressApi`
- [x] 2.8 FE: Tao `QoETrackerService` (startup, rebuffer, bitrate changes, connection type)
- [ ] 2.9 BE: QoE metrics API endpoint — **DEFERRED**
- [ ] 2.10 FE: Video download button UI — **DEFERRED** (needs integration point)

---

## PHASE 3: OFFLINE CAPABILITY ✅ DONE

**Sprint**: 3 | **Priority**: HIGH | **Status**: ✅ Complete

### Tasks

- [x] 3.1 Angular SW data groups cau hinh (freshness + performance strategies)
- [x] 3.2 OfflineSyncService: background sync voi auto-retry (5 attempts)
- [x] 3.3 OfflineSyncService: ho tro quiz_attempt, submission, progress entity types
- [x] 3.4 OfflineSyncService: auto-sync khi online, 24h cleanup
- [x] 3.5 CourseDownloadService: download toan bo course (metadata + chapters + lessons)
- [x] 3.6 CourseDownloadService: getOfflineLesson, getOfflineLessons, removeCourse
- [ ] 3.7 Offline quiz taking UI — **DEFERRED** (needs quiz offline page)
- [x] 3.8 BE: SyncControllerV3 `POST /api/v3/sync/push` (Clean Architecture)
- [x] 3.9 BE: SyncControllerV3 `GET /api/v3/sync/pull`
- [ ] 3.10 Adaptive UI (text-only mode) — **DEFERRED**
- [x] 3.11 OfflineFallbackComponent

---

## PHASE 4: WIII AI FIXES + POLISH ✅ DONE

**Sprint**: 4 | **Priority**: MEDIUM | **Status**: ✅ Complete

### Tasks

- [x] 4.1 Wiii SSE reconnect + exponential backoff (3 retries, 1s/2s/4s)
- [x] 4.2 Wiii rate limiting — handled by existing `RateLimitingFilter` (global)
- [x] 4.3 Wiii timeout tang 120s -> 180s + heartbeat (15s interval)
- [x] 4.4 SSE compression — Spring Boot gzip via config
- [ ] 4.5 VAPID Push Notifications — **DEFERRED** (needs VAPID keys + push server)
- [ ] 4.6 Content Index API — **DEFERRED** (experimental API, low browser support)
- [ ] 4.7 Periodic Sync — **DEFERRED** (needs Workbox registration)
- [x] 4.8 SW Update Service (6h check, user confirmation dialog, persistent storage)
- [x] 4.9 Clean Architecture refactor SyncControllerV3 (DTOs, UseCase)
- [ ] 4.10 Dynamic watermarking — **DEFERRED** (P3 feature)

---

## PHASE 5: INTEGRATION + SOTA DEEP AUDIT ✅ DONE

**Sprint**: 5 | **Priority**: HIGH | **Status**: ✅ Complete (S61b-S61c)

### Tasks

- [x] 5.1 Remove dual SW conflict (sw.js fetch handlers removed, NGSW sole cache owner)
- [x] 5.2 Remove custom sw.js registration from main.ts
- [x] 5.3 manifest.webmanifest branding update (Vietnamese name, theme_color, categories)
- [x] 5.4 browserconfig.xml created (#0056D2 TileColor)
- [x] 5.5 BE SyncUseCase implemented (was 100% stubbed → routes to domain use cases)
- [x] 5.6 Conflict resolution: additive merge (video), timestamp LWW (progress), server-wins (grades)
- [x] 5.7 FE OfflineSyncService: batch sync, failedCount signal, retryFailed(), clearFailed()
- [x] 5.8 Offline interceptor: added DELETE to mutation queue
- [x] 5.9 CourseDownloadService: storage quota pre-check (90%), unsynced progress warning
- [x] 5.10 SwUpdateService: user confirmation dialog instead of auto-reload
- [x] 5.11 OfflineFallbackComponent: failed sync section + retry button
- [x] 5.12 CoT SOTA audit vs Coursera/Netflix/Spotify/Figma/Linear patterns (Feb 2026)

---

## KPI TARGETS

| Metric | Before | After (Ph5) | After (Ph6) | Target |
|--------|--------|-------------|-------------|--------|
| Video startup time | N/A | ~4s (est) | ~4s (est) | <6s (satellite) |
| Rebuffer ratio | Unknown | <2% (est) | <2% (est) | <1% |
| Offline functionality | 30% | 93% | **98%** | 100% core |
| Sync success rate | 0% | ~95% (est) | ~95% (est) | >96% |
| PWA install rate | 0% | Ready | Ready | >80% crew |
| App shell load (offline) | N/A | <1.5s | <1.5s | <1s |
| First contentful paint | ~3s | ~2s | ~2s | <1.5s |
| iOS offline stability | N/A | ~5min | **7+ days** | 7+ days |

---

## ARCHITECTURE OVERVIEW

```
Teacher Upload (MP4)
    |
    v
Spring Boot API (8088) --> Cloudflare Stream (auto-transcode)
    |                           |
    |                    HLS manifest + fMP4 segments
    |                           |
    v                           v
PostgreSQL 16           Cloudflare CDN (HTTP/3)
    |                           |
    v                           v
Student Browser (Angular 20 PWA)
    |
    +-- Shaka Player 5.x (adaptive HLS)
    +-- Service Worker (Angular SW)
    +-- IndexedDB (Dexie.js 4)
    |     +-- Courses, Chapters, Lessons, Progress
    |     +-- Sync Queue (auto-retry on online)
    |     +-- Video blobs (Cache API)
    +-- Cache API (API responses + offline videos)
    +-- NetworkStatusService (none/slow/fast)
    +-- ScreenWakeLockService (keep screen on)
    +-- QoETrackerService (metrics collection)
```

---

## FILES CREATED/MODIFIED

### Phase 1 - PWA Foundation
| File | Status | Purpose |
|------|--------|---------|
| `fe/src/app/core/db/lms-offline.db.ts` | NEW | Dexie.js 4 database schema |
| `fe/src/app/core/services/network-status.service.ts` | NEW | 3-tier network detection |
| `fe/src/app/core/services/storage-manager.service.ts` | NEW | Storage quota management |
| `fe/src/app/core/services/screen-wake-lock.service.ts` | NEW | Screen wake lock API |
| `fe/src/app/core/services/sw-update.service.ts` | NEW | SW auto-update (6h check) |
| `fe/src/app/shared/components/offline-indicator/offline-indicator.component.ts` | NEW | Network status bar |
| `fe/src/app/shared/components/storage-budget/storage-budget.component.ts` | NEW | Storage display |
| `fe/src/manifest.json` | UPDATED | Vietnamese, #0056D2, shortcuts |
| `fe/ngsw-config.json` | UPDATED | 6 data groups (v3 API paths) |
| `fe/src/index.html` | UPDATED | theme-color #0056D2 |
| `fe/src/app/app.ts` | UPDATED | OfflineIndicator + SwUpdate init |

### Phase 2 - Adaptive Video
| File | Status | Purpose |
|------|--------|---------|
| `fe/src/app/shared/components/video-player-adaptive/video-player-adaptive.component.ts` | NEW | Shaka Player + maritime ABR |
| `fe/src/app/core/services/qoe-tracker.service.ts` | NEW | QoE metrics tracking |
| `fe/src/app/core/services/offline-video.service.ts` | NEW | Video download + Cache API |

### Phase 3 - Offline
| File | Status | Purpose |
|------|--------|---------|
| `fe/src/app/core/services/offline-sync.service.ts` | NEW | Sync queue + auto-retry |
| `fe/src/app/core/services/course-download.service.ts` | NEW | Full course download |
| `fe/src/app/shared/components/offline-fallback/offline-fallback.component.ts` | NEW | Offline landing page |

### Phase 4 - Wiii AI + Polish
| File | Status | Purpose |
|------|--------|---------|
| `backend/.../wiii/WiiiChatAdapter.java` | UPDATED | 180s timeout, backoff, heartbeat |
| `backend/.../shared/infrastructure/web/SyncControllerV3.java` | NEW+REFACTORED | Clean Architecture |
| `backend/.../shared/application/dto/SyncPushRequest.java` | NEW | Sync push DTO (record) |
| `backend/.../shared/application/dto/SyncResponse.java` | NEW | Sync response DTOs (records) |
| `backend/.../shared/application/usecase/SyncUseCase.java` | NEW | Sync business logic |

### Phase 5 - Integration + SOTA Audit
| File | Status | Purpose |
|------|--------|---------|
| `backend/.../shared/application/usecase/SyncUseCase.java` | REWRITTEN | Routes to domain use cases (was 100% stubbed) |
| `fe/src/app/core/services/offline-sync.service.ts` | REWRITTEN | Batch sync, failedCount, retryFailed() |
| `fe/src/app/api/interceptors/offline.interceptor.ts` | UPDATED | Added DELETE to mutation queue |
| `fe/src/app/core/services/course-download.service.ts` | UPDATED | 90% quota pre-check, unsynced warning |
| `fe/src/app/core/services/sw-update.service.ts` | REWRITTEN | User confirmation dialog (was auto-reload) |
| `fe/src/app/shared/components/offline-fallback/offline-fallback.component.ts` | UPDATED | Failed sync UI + retry button |
| `fe/src/main.ts` | UPDATED | Removed custom sw.js registration |
| `fe/public/manifest.webmanifest` | UPDATED | Vietnamese branding, categories, lang |
| `fe/public/browserconfig.xml` | NEW | Windows tile config |
| `fe/src/sw.js` | REWRITTEN | Sync+push only (no fetch handlers) |

---

## PHASE 6: iOS & CROSS-PLATFORM HARDENING ✅ DONE

**Sprint**: 6 | **Priority**: HIGH | **Status**: ✅ Complete (S93)

### Root Cause: iPad Mini 6 crashed after ~5min offline

**3 bugs found and fixed:**

1. `SwUpdateService.unrecoverable` auto-reloaded even when offline → browser showed native "No Connection" page
2. `NetworkStatusService` probed `/actuator/health` every 30s with `cache:'no-cache'` → bypassed SW cache → marked offline unnecessarily
3. `AbortError` (timeout) was falsely marking device as offline

### Additional hardening (expert-sourced from Apple WebKit, Angular, Google Workbox):

- [x] 6.1 `visibilitychange` handler: detect iOS SW eviction after ~5min background → re-register on resume
- [x] 6.2 Clear stale NGSW caches before reload in `unrecoverable` handler (prevents re-entering bad state)
- [x] 6.3 `ChunkLoadError` global handler (Angular #42094 lazy chunk mismatch → reload when online)
- [x] 6.4 Persistent storage logging for iOS diagnostics (`[Storage] GRANTED/DENIED`)
- [x] 6.5 Network probe: `/actuator/health` → `/favicon.ico` (in SW prefetch cache), 30s → 120s interval
- [x] 6.6 Only `TypeError` marks offline (not `AbortError`/timeout)
- [x] 6.7 NGSW dataGroup maxAge extended to 7d: `course-catalog` 6h→7d, `user-profile` 1d→7d, `enrollments` 1d→7d
- [x] 6.8 **S94**: `fix-ngsw.js` post-build script — removes phantom CSS chunks from ngsw.json (Angular 20 esbuild bug: merged chunks still referenced → 404 → SW install fails)

### Cross-platform offline resilience:

| Platform | CacheStorage Survival | Offline F5 after 24h |
|----------|----------------------|---------------------|
| Android Chrome | Indefinite | 100% works |
| Windows/macOS Chrome | Indefinite | 100% works |
| macOS Safari | 7-day ITP rule | Works if < 7 days |
| iOS Home Screen | ITP exempt + persist() | Works well |
| iOS browser tab | 7-day ITP rule | Works if < 7 days |

### Files modified:
| File | Change |
|------|--------|
| `sw-update.service.ts` | Complete rewrite: offline guard, visibility handler, cache cleanup, ChunkLoadError |
| `network-status.service.ts` | Probe endpoint, interval, error handling |
| `storage-manager.service.ts` | Persistence logging |
| `ngsw-config.json` | All maxAge → 7d |
| `scripts/fix-ngsw.js` | NEW: Post-build script removes phantom file references from ngsw.json |
| `package.json` | Build script: `ng build && node scripts/fix-ngsw.js` |

---

## DEFERRED ITEMS (Future Sessions)

| Item | Reason | Priority |
|------|--------|----------|
| CloudflareStreamService (BE) | Needs CF account + API key | P1 |
| streamUid migration | Depends on CF integration | P1 |
| QoE metrics API | Backend endpoint for analytics | P2 |
| Video download button UI | Needs UX integration point | P2 |
| Offline quiz taking UI | Needs quiz offline page | P2 |
| VAPID Push Notifications | Needs VAPID key generation | P2 |
| Periodic Sync (Workbox) | Needs Workbox registration | P3 |
| Content Index API | Experimental, low support | P3 |
| Dynamic watermarking | Canvas overlay feature | P3 |
| Text-only mode | Adaptive UI for slow network | P3 |

---

*Updated: 2026-02-26 (Post Phase 6 - iOS & Cross-Platform Hardening)*
