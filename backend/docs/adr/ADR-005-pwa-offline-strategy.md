# ADR-005: PWA Offline-first Strategy via IndexedDB + Service Worker

## Status

Accepted — 2026-04-24 (retroactive; architecture stabilized through S110-S126, documented now).

## Context

Maritime LMS phục vụ sinh viên thường xuyên ở environment kết nối yếu (trên tàu, rig offshore) hoặc hoàn toàn offline. Learner cần:

- Xem lại lesson + video đã download
- Làm practice quiz offline, sync kết quả khi online lại
- Track progress lesson + section completion
- Nhận publication updates khi course teacher sửa

Yêu cầu kỹ thuật:

- **Multi-tenant isolation**: nhiều user share một device (public lab, ship computer) → IndexedDB không được rò rỉ data giữa users
- **Publication model**: self-paced vs instructor-led class có version semantics khác nhau
- **Video streaming**: Cloudflare Stream + private R2 + HLS/DASH adaptive
- **Quiz policy**: PRACTICE offline được, ASSESSMENT + EXAM online-only

## Decision

Triển khai **offline-first** với 4 layer:

### 1. Persistence: IndexedDB via Dexie.js v6

```
offlineDb
├── courses           (PK [userId+courseId])
├── chapters          (PK [userId+chapterId])
├── lessons           (PK [userId+lessonId])
├── sections          (PK [userId+sectionId])
├── quizData          (PK [userId+quizId], student-safe only)
├── lessonProgress    (PK [userId+lessonId])
├── videoProgress     (PK [userId+lessonId])
├── quizAttempts      (PK [userId+quizId+attemptId])
├── syncQueue         (pending operations)
└── offlineLessons    (metadata for CF Stream videos)
```

Compound key `[userId+...]` cho multi-account isolation — user A + user B trên cùng device vẫn thấy data riêng.

### 2. Video: Cache API via Service Worker route

Videos KHÔNG lưu IndexedDB (quá lớn). Dùng Service Worker intercept `/offline-video/{lessonId}` + Cache API với Range request support → zero-RAM streaming.

### 3. Sync queue

Every offline mutation enqueue `SyncQueueItem`:

```typescript
{
  clientOperationId: string,  // client-generated UUID for ack dedup
  occurredAt: number,         // timestamp
  courseId: string,
  publicationId: string,
  entityType: 'quizAttempt' | 'lessonProgress' | 'videoProgress' | ...,
  entityId: string,
  payload: unknown,
  baseServerUpdatedAt: number
}
```

Batch POST `/api/v3/sync/push` → `SyncUseCase` routes by `entityType`. Background Sync via `navigator.serviceWorker.ready.sync.register('lms-offline-sync')` để retry khi reconnect.

### 4. Service Worker

`sw-wrapper.js` (active SW) imports NGSW (Angular Service Worker) + inline sync/push handlers. Pattern này:

- NGSW handle app-shell caching + asset versioning
- Wrapper thêm custom route handlers cho offline video + sync

## Rationale

- **Dexie.js over raw IndexedDB**: API ergonomic, transaction semantics rõ hơn, TypeScript support tốt
- **Compound key isolation over separate DB per user**: đơn giản + 1 DB connection thay vì N, vẫn an toàn
- **Cache API for video**: Browser-managed storage quota, Range support natively, no RAM overhead
- **Background Sync over polling**: Battery-friendly, retry khi có network
- **NGSW + wrapper**: Best-of-both — NGSW mature, custom logic tách riêng

## Consequences

### Positive

- Learner có thể học offline hàng giờ với package đã download
- Quiz practice không mất dữ liệu khi mất mạng
- Video streaming stable trên slow network (HLS adaptive bitrate)
- Multi-user share device an toàn (school lab scenario)
- Telemetry offline → admin thấy patterns failure tại `admin/offline-storage`

### Negative

- 10 storage scenarios phải test (online/offline × 2 users × 2 devices × …)
- Storage quota: browser cap ~60% disk — user có thể hit quota trước khi hết course
- Publication model + pinned class thêm complexity cho sync conflict resolution
- SW debugging khó (multiple lifecycle events, Chrome DevTools limitations)

### Risks

- **IndexedDB corruption**: backing store fail → có recovery ladder trong `OFFLINE_STORAGE_CORRUPTION_RUNBOOK.md`
- **SW version skew**: wrapper version ≠ NGSW version → hydration mismatch. Must ship together.
- **Quota exhaustion**: chưa có eviction strategy (LRU) — user tự xóa course qua UI
- **Stale package**: class pinned publication A → course publishes B → learner cần adopt manually

## Implementation milestones

- **S110-S115** (2026-03-01 → 2026-03-06): IndexedDB isolation, Dexie v6 schema v6, multi-account test matrix
- **S116-S119** (2026-03-06 → 2026-03-10): ADMIN/ORG_ADMIN role separation, org-scoped offline telemetry
- **S120-S123** (2026-03-10 → 2026-03-14): Publication model finalization, sync queue with conflict
- **S124-S126** (2026-03-15 → 2026-03-20): SyncUseCase backend, quiz offline flow (start→convert→submit 3-step), sw-wrapper merge with NGSW

## Compliance check khi code review

- [ ] IndexedDB table primary key phải là `[userId+*]` compound — flag nếu thấy single key
- [ ] Quiz offline: chỉ `quizType === 'PRACTICE'`; `ASSESSMENT` / `EXAM` phải reject
- [ ] Sync payload có đầy đủ metadata: `clientOperationId`, `occurredAt`, `publicationId`, `baseServerUpdatedAt`
- [ ] Video không lưu IndexedDB — dùng `offlineVideoService.cache()`
- [ ] SW changes phải update cả `sw-wrapper.js` + NGSW config version

## References

- `fe/src/app/core/db/lms-offline.db.ts` — Dexie schema
- `fe/src/app/core/services/offline-sync.service.ts` — sync orchestration
- `fe/src/app/core/services/offline-video.service.ts` — Cache API integration
- `backend/src/main/java/com/example/lms/shared/application/usecase/SyncUseCase.java` — BE sync handler
- `docs/runbooks/PWA_OFFLINE_RUNBOOK.md` — operational runbook
- `docs/runbooks/OFFLINE_STORAGE_CORRUPTION_RUNBOOK.md` — recovery
- `docs/runbooks/SYNC_CONFLICT_RUNBOOK.md` — conflict resolution
- `docs/research/PWA_ACADEMIC_RESEARCH_PAPER.md` — long-form rationale
- `docs/archive/2026-Q1/architecture-snapshots/2026-03-16-course-publication-pwa-sync-model.md` — historical plan
- CLAUDE.md §"PWA Offline System" — current state summary

## Supersedes

Không.

## Superseded by

Chưa — đang là current strategy.
