# Flyway Migrations

## Convention

- Prefix `V<n>__` (double underscore)
- Snake_case description sau description
- Append-only — không sửa file đã apply production

Ví dụ: `V117__video_assets_source_attachment_unique.sql`.

## Version numbering

Hiện có **90 migration files** từ `V1` tới `V117` với một số gap:

| Range | Status | Lý do |
|---|---|---|
| `V1` | Present | Baseline schema — `V1__lms_complete_schema.sql` (1,249 dòng) consolidated từ V1-V25 trong lần squash ngày 2026-02-20 |
| `V2`–`V25` | **Gap intentional** | Đã squash vào `V1` để giảm noise khi restore fresh DB. Lịch sử vẫn trong git — xem `git log --follow` |
| `V26`–`V64` | Present | Migration tăng dần — enum normalization, performance indexes, FK constraints, assignment entities, student MVP, auto course code, seed categories, delivery mode, quiz multi-question, question bank, ... |
| `V65`–`V68` | **Gap intentional** | Được skip trong lúc renumber một batch migration khi backport từ branch parallel. Flyway không care về gap, nhưng reader nên biết |
| `V69`–`V117` | Present | Continuous |

Flyway **không fail** trên version gap — chỉ validate monotonic progress của những file đã apply. Nhưng khi dev query `V<n>` trong code/docs, nên reference file tồn tại (tránh `V20` vì không có).

## Pattern khi tạo migration mới

### 1. Chọn version tiếp theo

```bash
ls backend/src/main/resources/db/migration | grep -oE "^V[0-9]+" | sort -V | tail -1
# Kết quả: V117 → migration mới là V118
```

### 2. Đặt tên file

```
V118__<snake_case_description>.sql
```

Mô tả nên < 50 ký tự, đủ để đọc biết migration làm gì:

- ✅ `V118__add_teacher_feedback_rating.sql`
- ✅ `V119__index_courses_by_slug.sql`
- ❌ `V118__update_stuff.sql`
- ❌ `V119__TeacherFeedbackRating.sql`

### 3. Template

```sql
-- =============================================================================
-- V118__<description>.sql
-- Date: YYYY-MM-DD
-- Purpose: <1-2 câu mô tả>
-- Reference: issue #N hoặc ADR nếu có
-- =============================================================================

BEGIN;

-- Tạo table
CREATE TABLE IF NOT EXISTS <table> (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_<table>_<col> ON <table>(<col>);

COMMIT;
```

### 4. Edge case: JPA tạo table mà không có default

JPA (Hibernate ddl-auto in dev) sometimes tạo table thiếu default cho `id` và `created_at`. Khi migration phải alter table đó:

```sql
BEGIN;

-- Tạm SET DEFAULT để backfill
ALTER TABLE <table> ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE <table> ALTER COLUMN created_at SET DEFAULT NOW();

-- Backfill missing rows
INSERT INTO <table> (...) VALUES (...);

-- Drop default sau khi xong (để JPA định nghĩa lại nếu cần)
ALTER TABLE <table> ALTER COLUMN id DROP DEFAULT;
ALTER TABLE <table> ALTER COLUMN created_at DROP DEFAULT;

COMMIT;
```

Pattern này seen trong V54/V55. Không required nếu tạo table mới từ đầu trong migration.

### 5. Test migration

```bash
# Fresh test — drop + recreate
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db backend

# Check logs
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs backend --tail=100 | grep -i flyway
```

Nếu migration fail:

- Đọc lỗi Flyway (`Migration V<n>__xxx.sql failed`)
- Fix SQL
- Migration failure marker trong Flyway table `flyway_schema_history` phải clean trước khi retry:
  ```sql
  DELETE FROM flyway_schema_history WHERE version = '<N>' AND success = false;
  ```

## Production migration

- Migration apply qua `deploy.sh` khi container start
- **Không rollback** trong production — forward-only
- Nếu migration break production: mở hotfix PR với migration bổ sung (đừng rollback file)
- V1 baseline **không reset** — nếu cần restructure nặng, tạo V-mới + migrate data

## Validation

Backend Hibernate `ddl-auto: validate` ở production (`application-prod.yml`). Điều này có nghĩa:

- Sau khi Flyway apply, Hibernate check schema khớp với `@Entity` classes
- Nếu mismatch → app không start → deploy fail
- Phải đảm bảo migration kết quả match entity definition

Dev mode: `ddl-auto: update` — Hibernate tự auto-adjust schema (dễ migrate nhưng không reproducible)

## References

- [Flyway docs](https://documentation.red-gate.com/fd/)
- [`V1__lms_complete_schema.sql`](./V1__lms_complete_schema.sql) — full baseline
- `backend/src/main/resources/application*.yml` — datasource + flyway config
- `CLAUDE.md` §"COMMON ERRORS & FIXES" #4 — migration troubleshooting
