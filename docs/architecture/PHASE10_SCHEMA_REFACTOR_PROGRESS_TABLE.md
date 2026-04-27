# Phase 10 Design — Refactor `enrollments.progress` JSONB → `lesson_progress` Table

**Status**: 📋 Design only. **DO NOT execute trước đồ án TTTN.**

**Author**: 2026-04-27 audit (3 incidents NonSerializableObjectException trên prod).
**Reviewers**: TBD.

---

## 1. Vấn đề hiện tại

`EnrollmentJpaEntity` lưu progress của student như JSONB map:

```java
@Type(JsonType.class)
@Column(name = "progress", columnDefinition = "jsonb")
private Map<String, LessonProgressData> progress;  // key = lessonId UUID string
```

### Hậu quả

| Vấn đề | Mức độ |
|---|---|
| Queries không index được progress fields (status, watchSeconds, completion date) | 🔴 |
| Hibernate MERGE phải deepCopy entire JSON map mỗi save → O(N) khi N lessons | 🟡 |
| Concurrent updates race condition (optimistic locking on whole enrollment row) | 🟡 |
| Analytics khó: muốn "tỷ lệ completion theo course", phải full scan + JSON parse | 🔴 |
| `LessonProgressData` POJO phải implements Serializable (Phase 8 fix) | 🟢 (đã fix) |
| Storage bloat: JSON keys redundant ("status", "watchSeconds" lặp mỗi entry) | 🟢 (acceptable) |

### Khi nào trigger refactor

- ✅ Khi student count > 1,000 — analytics queries chậm
- ✅ Khi cần real-time leaderboard / progress dashboard
- ✅ Khi concurrent updates (multi-device same student) gây xung đột
- ❌ Hiện tại < 100 students — defer

---

## 2. Target schema

```sql
CREATE TABLE lesson_progress (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id   UUID         NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    lesson_id       UUID         NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'LOCKED'
                                 CHECK (status IN ('LOCKED', 'UNLOCKED', 'COMPLETED')),
    watch_seconds   INT          NOT NULL DEFAULT 0,
    grade           NUMERIC(5,2),
    last_activity   TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version         BIGINT       NOT NULL DEFAULT 0,    -- @Version optimistic lock
    UNIQUE(enrollment_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_enrollment ON lesson_progress(enrollment_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX idx_lesson_progress_status_completed
    ON lesson_progress(status, completed_at)
    WHERE status = 'COMPLETED';

-- For completed sections (currently in LessonProgressData.completedSections JSON list)
CREATE TABLE lesson_section_progress (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_progress_id UUID      NOT NULL REFERENCES lesson_progress(id) ON DELETE CASCADE,
    section_id      UUID         NOT NULL,
    completed_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(lesson_progress_id, section_id)
);

CREATE INDEX idx_section_progress_lesson ON lesson_section_progress(lesson_progress_id);
```

### Lợi ích

- ✅ Indexed queries: completion rate, last activity, lesson-specific lookups O(log N)
- ✅ Row-level optimistic locking — concurrent updates tới different lessons không xung đột
- ✅ Analytics SQL straightforward (`COUNT(*) WHERE status = 'COMPLETED'`)
- ✅ Storage compact (no JSON key redundancy)
- ✅ NonSerializableObjectException không thể xảy ra (no JSONB Map<K, POJO>)

---

## 3. Migration plan (4 phases — non-disruptive)

### Phase 10.1: Dual-write (1 tuần)

- **V200** Flyway: tạo `lesson_progress` + `lesson_section_progress` tables
- Use case `MarkLessonCompleteUseCase` ghi cả 2 nơi:
  - JSONB `enrollments.progress` (legacy, source of truth còn lại)
  - Mới: `lesson_progress` table
- Reads vẫn từ JSONB
- Verify: data consistency check daily — count(JSON entries) == count(table rows)

### Phase 10.2: Backfill (vài giờ)

- One-time script: SELECT enrollments → parse JSON → INSERT vào `lesson_progress`
- Idempotent (ON CONFLICT DO NOTHING)
- Run trong window low-traffic, monitor count match

### Phase 10.3: Switch reads (1 tuần)

- API endpoints chuyển từ `enrollment.progress.get(lessonId)` → `lessonProgressRepo.findByEnrollmentAndLesson()`
- Feature flag `ENABLE_LESSON_PROGRESS_TABLE_READS` — rollback nhanh nếu issue
- Monitor latency p99 / error rate

### Phase 10.4: Drop JSONB (1 ngày)

- **V210** Flyway: `ALTER TABLE enrollments DROP COLUMN progress;`
- Remove JSONB code paths
- Final test sweep

---

## 4. API contract impact

### Public API endpoints (không đổi)

`POST /api/v3/student/progress/lessons/{id}/complete` — **same contract**.

Internal implementation thay đổi từ `enrollment.markLessonComplete()` (JSONB save) → `lessonProgressRepo.upsert()` (table write).

### Internal API (DTO)

`EnrollmentResponse.progress` field giữ format `Map<UUID, LessonProgressDto>` — backward compat. Resolved server-side bằng query `lesson_progress` rồi map sang DTO format.

---

## 5. Performance benchmarks (expected)

| Operation | Before (JSONB) | After (table) | Delta |
|---|---|---|---|
| Get single lesson progress | O(1) JSON parse, ~5ms | O(log N) index, ~1ms | **5x faster** |
| List all lesson progress (1 enrollment) | O(N) JSON parse, ~10ms | O(N) seq scan, ~3ms | **3x faster** |
| Complete lesson (UPDATE) | O(N) deepCopy + UPDATE row, ~20ms | O(1) UPSERT, ~3ms | **6x faster** |
| Course completion rate analytics | Full scan + parse, ~500ms / 1000 enrollments | Indexed COUNT, ~10ms | **50x faster** |
| Storage per enrollment | ~2-5KB JSON | ~200-500B rows | **~10x smaller** |

---

## 6. Rollback plan

Mỗi phase reversible:

- Phase 10.1: drop new tables, remove dual-write code
- Phase 10.2: TRUNCATE tables, restart backfill
- Phase 10.3: feature flag → reads back to JSONB
- Phase 10.4: V210 reversed by V211 — restore `progress` column từ table

---

## 7. Effort estimate

| Phase | Time | Risk |
|---|---|---|
| 10.1 Dual-write | 3 days | Low (additive) |
| 10.2 Backfill | 1 day | Low (idempotent) |
| 10.3 Switch reads | 5 days | Medium (feature flag mitigates) |
| 10.4 Drop JSONB | 1 day | Low (test sweep mitigates) |
| **Total** | **~2 weeks engineering** | **Low overall** |

---

## 8. Decision

**KHÔNG execute trước đồ án TTTN.** Lý do:
- Site đang stable
- Phase 8 Level 3 (Custom JsonSerializer) đã eliminate bug class
- Thesis priority cao hơn schema refactor
- Cần benchmark thực tế sau scale-up (>500 students) để biết chính xác bottleneck

**Điều kiện trigger Phase 10.1:**
- Concurrent users > 50
- Average enrollment lesson count > 30 (JSON map quá lớn)
- Analytics dashboard requires < 100ms query latency
- Hoặc: thesis approved + có 2 tuần engineering bandwidth

---

**Last updated**: 2026-04-27
**Next review**: 2026-Q3 (sau đồ án)
