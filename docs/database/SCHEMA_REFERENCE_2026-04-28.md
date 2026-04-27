# LMS Maritime — Database Schema Reference

> **Snapshot date**: 2026-04-28 (TTTN VIMARU defense day)
> **Production**: PostgreSQL 16.13 trên GCP Compute Engine (asia-southeast1-c)
> **Schema dump**: [`PRODUCTION_SCHEMA_DUMP_2026-04-28.sql`](./PRODUCTION_SCHEMA_DUMP_2026-04-28.sql) (5,791 lines)
> **Migrations applied**: V1 → V121 (121 versions, 100% success)

---

## 1. Tổng quan

- **76 tables** trong public schema
- **10+ domain modules** (theo Clean Architecture / DDD bounded contexts)
- **Extension**: `pg_trgm` (full-text search trigram)
- **Storage strategy**: hybrid — relational tables + JSONB cho flexible content
- **Audit pattern**: append-only event tables (`audit_log`, `course_review_events`,
  `grading_audit_log`, `learning_events`, `outbox_messages`)

---

## 2. Tables theo Bounded Context

### 2.1 Identity & Auth (5 tables)

| Table | Cols | Idx | Mô tả |
|---|---|---|---|
| `users` | 18 | 8 | Người dùng (ADMIN, ORG_ADMIN, TEACHER, STUDENT) — bcrypt password, role, status, organization, avatar |
| `user_external_identities` | 10 | 4 | OAuth Google login mapping (Wiii-style) |
| `email_verification_tokens` | 6 | 4 | Email verification flow |
| `password_reset_tokens` | 6 | 4 | Reset password flow |
| `login_attempts` | 7 | 5 | Brute-force protection (rate limit per email/IP) |

### 2.2 Organizations & Multi-tenant (3 tables)

| Table | Cols | Idx | Mô tả |
|---|---|---|---|
| `organizations` | 10 | 4 | Multi-tenant org (UNIVERSITY, COMPANY, PERSONAL) |
| `organization_invites` | 13 | 6 | Invite teachers to org |
| `org_payment_configs` | 5 | 1 | Per-org payment gateway config (VNPay tmnCode, etc.) |

### 2.3 Course Authoring (15 tables)

| Table | Cols | Idx | Mô tả |
|---|---|---|---|
| `courses` | **28** | **10** | Course aggregate root — title, description, teacher, status (DRAFT/PENDING/APPROVED/REJECTED), category, price, content_version, version_mode |
| `chapters` | 7 | 4 | Course chapter (1:N to courses) |
| `lessons` | 13 | 5 | Lesson (1:N to chapters) — `content_blocks JSONB` chứa array sections |
| `sections` | 12 | 2 | (Legacy/cached view) Sections breakdown từ lesson.content_blocks |
| `lesson_attachments` | 11 | 2 | Files đính kèm lesson (R2 hoặc local) |
| `lesson_assignments` | 5 | 3 | Many-to-many lesson ↔ assignment |
| `course_categories` | 12 | 6 | 2-level taxonomy (V70 redesign) |
| `course_tags` | 4 | 3 | Controlled vocabulary tags |
| `course_tag_assignments` | 2 | 2 | M:N course ↔ tag |
| `course_tags_legacy` | 2 | 1 | Pre-V70 free-text tags (backward compat) |
| `course_embedded_tags` | 2 | 1 | Search-optimized tag denorm |
| `categories` | 6 | 4 | (Legacy table — flat categories) |
| `course_reviews` | 7 | 6 | Student rating + review |
| `course_review_events` | 7 | 3 | Audit log: APPROVED/REJECTED events with category |
| `course_versions` | 5 | 3 | (Legacy — replaced by course_publications) |

### 2.4 Course Publishing (1 table)

| Table | Cols | Idx | Mô tả |
|---|---|---|---|
| `course_publications` | 9 | 4 | Snapshot table — full course state at publish time. `snapshot JSONB` → student/preview reads. `publication_number` increments. Pattern Coursera/edX release-stamping |

### 2.5 Learning Delivery (10 tables)

| Table | Cols | Idx | Mô tả |
|---|---|---|---|
| `learning_classes` | 15 | 6 | Class (cohort) with `version_mode` (PINNED/FOLLOW_LATEST), `course_version_id` |
| `class_teachers` | 5 | 4 | Co-teachers per class |
| `enrollments` | 12 | 8 | Student enrollment — `progress JSONB` (Map<UUID, LessonProgressData>) |
| `student_lesson_progress` | 10 | 5 | (Phase 10 future — relational replacement for enrollments.progress JSONB) |
| `video_progress` | 12 | 5 | Watched seconds per lesson video |
| `learning_events` | 7 | 4 | Activity stream (login, view_lesson, complete_section, etc.) |
| `learning_streaks` | 7 | 3 | Daily streak tracking |
| `bookmarks` | 9 | 4 | Student bookmarks |
| `student_notes` | 10 | 3 | Per-lesson notes |
| `student_achievements` | 4 | 3 | Earned achievements |
| `achievements` | 7 | 2 | Achievement definitions (gamification) |

### 2.6 Assessment (12 tables)

| Table | Cols | Idx | Mô tả |
|---|---|---|---|
| `quizzes` | 21 | 6 | Quiz config (time_limit, passing_score, max_attempts, assessment_type) |
| `questions` | 16 | 11 | Question bank — `content_blocks JSONB`, `correct_option`, difficulty |
| `question_options` | 8 | 2 | A/B/C/D/E/F options per question |
| `quiz_questions` | 7 | 3 | M:N quiz ↔ question với order |
| `quiz_assignments` | 7 | 3 | Quiz allocation to class/students |
| `quiz_attempts` | 12 | 6 | Student attempt — `items JSONB` (Map of answers), score, status (IN_PROGRESS/SUBMITTED/GRADED/EXPIRED/TIMEOUT) |
| `assignments` | 15 | 6 | Assignment definition (title, description, instructions, due_date, max_score) |
| `assignment_attachments` | **11** | 5 | Files dính kèm — `submission_id IS NULL` = teacher instruction (V121), NOT NULL = student submission |
| `assignment_allocations` | 8 | 5 | Distribute to ALL_STUDENTS / CLASS / SPECIFIC_STUDENTS |
| `assignment_allocation_students` | 5 | 5 | M:N for SPECIFIC_STUDENTS distribution |
| `assignment_submissions` | 17 | **13** | Submission — content, file_url, grade, feedback, status (DRAFT/SUBMITTED/RESUBMITTED/LATE/GRADED/RETURNED) |
| `assignment_rubrics` | 9 | 5 | Rubric với `criteria JSONB` (List<RubricCriterion>) |
| `grading_audit_log` | 13 | 4 | Audit: previous grade → new grade, who, when, comment |

### 2.7 Question Bank (2 tables)

| Table | Cols | Idx | Mô tả |
|---|---|---|---|
| `packages` | 15 | 4 | Question bank package (community sharing, copy-to-my-bank) |
| `question_bank_categories` | 9 | 3 | Hierarchical categories within package |

### 2.8 Communication (8 tables)

| Table | Cols | Idx | Mô tả |
|---|---|---|---|
| `conversations` | 11 | 5 | DM/group chat aggregate |
| `messages` | 10 | 7 | Chat messages — recall, reply support |
| `message_reactions` | 5 | 3 | Emoji reactions |
| `announcements` | 9 | 4 | Class-level broadcasts |
| `announcement_reads` | 3 | 2 | Read receipts |
| `notifications` | 8 | 3 | System notifications |
| `chat_sessions` | 8 | 3 | AI chat session (Wiii AI) |
| `chat_messages` | 6 | 3 | AI chat history |

### 2.9 Payments & Revenue (5 tables)

| Table | Cols | Idx | Mô tả |
|---|---|---|---|
| `payment_transactions` | **21** | 8 | VNPay/SePay payment records — gateway, status, refund support |
| `revenue_splits` | 13 | 5 | Multi-tenant revenue split (org % + teacher %) |
| `payout_requests` | 10 | 3 | Teacher payout (bank transfer to teacher_bank_accounts) |
| `teacher_bank_accounts` | 8 | 4 | Teacher banking info |
| `teacher_invitations` | 12 | 4 | Invite teacher to org with role |

### 2.10 File Management & Video (5 tables)

| Table | Cols | Idx | Mô tả |
|---|---|---|---|
| `file_attachments` | 12 | 5 | Generic file metadata (R2 storage_key, file_url, size) |
| `upload_sessions` | 13 | 4 | 3-step presigned upload (init → put → confirm), multipart support |
| `video_assets` | **25** | 6 | Video master record — duration, thumbnails, processing status |
| `video_renditions` | 11 | 3 | Per-quality variants (360p, 720p, 1080p) — adaptive streaming |
| `video_ingest_jobs` | 10 | 3 | Async transcoding job queue |

### 2.11 AI / Analytics (4 tables)

| Table | Cols | Idx | Mô tả |
|---|---|---|---|
| `ai_alerts` | 8 | 4 | AI-detected issues (e.g. struggling student, suspicious quiz pattern) |
| `ai_insights` | 7 | 4 | AI-generated learning insights |
| `audit_log` | 8 | 4 | Generic audit trail (encrypted payload via AES-256) |
| `client_offline_storage_telemetry` | 16 | 4 | PWA offline usage telemetry |

### 2.12 Certificates (1 table)

| Table | Cols | Idx | Mô tả |
|---|---|---|---|
| `certificates` | 6 | 7 | STCW-compliant certificates issued on course completion |

### 2.13 System (3 tables)

| Table | Cols | Idx | Mô tả |
|---|---|---|---|
| `flyway_schema_history` | 10 | 2 | Migration tracking (Flyway managed) |
| `outbox_messages` | 11 | 4 | Outbox pattern for reliable event publishing (avoid dual-write problem) |
| `admin_settings` | 3 | 1 | Key-value system config |

---

## 3. Key Design Decisions

### 3.1 JSONB cho flexible content

| Field | Type | Lý do |
|---|---|---|
| `lessons.content_blocks` | `JSONB` (List<ContentBlock>) | Polymorphic block types (TEXT/VIDEO/FILE/QUIZ) trong cùng lesson, schema evolution mượt |
| `enrollments.progress` | `JSONB` (Map<UUID, LessonProgressData>) | Per-lesson progress với metadata variable. **Phase 10 plan**: refactor → `student_lesson_progress` table cho indexed analytics |
| `quiz_attempts.items` | `JSONB` (List<AttemptItem>) | Snapshot question state khi student làm bài (immutable) |
| `assignment_rubrics.criteria` | `JSONB` (List<RubricCriterion>) | Variable-length grading criteria |
| `course_publications.snapshot` | `JSONB` (full course state) | Release-stamped content cho student delivery |
| `questions.content_blocks` | `JSONB` (List<ContentBlock>) | Rich question content (math LaTeX, images, code) |

### 3.2 Audit & Event Sourcing

- `audit_log` — encrypted generic audit (AES-256-GCM)
- `course_review_events` — append-only approve/reject log
- `grading_audit_log` — grade change history
- `learning_events` — activity stream
- `outbox_messages` — outbox pattern for reliable cross-aggregate events

### 3.3 Soft delete vs hard delete

Hầu hết tables dùng **hard delete** với CASCADE FK. Exceptions:
- `courses.status` lifecycle (DRAFT → APPROVED → ARCHIVED) thay vì delete
- `users.account_status` (ACTIVE / DEACTIVATED / DELETED) — preserve student records

### 3.4 Indexes & Performance

Tổng **~280 indexes** across 76 tables. Key patterns:
- Composite indexes cho frequent lookups (e.g. `assignment_submissions(assignment_id, student_id)` UNIQUE)
- Partial indexes cho filtered queries (e.g. `assignment_attachments(assignment_id, display_order) WHERE submission_id IS NULL` — V121)
- GIN indexes cho `pg_trgm` full-text search trên `course_categories.name`, etc.

### 3.5 Foreign Key Strategy

- `ON DELETE CASCADE` cho 1:N parent-child (chapter → lessons → sections)
- `ON DELETE SET NULL` cho optional refs (assignment_attachments.submission_id)
- `ON DELETE RESTRICT` cho critical refs (payment_transactions.user_id)

---

## 4. Migration Lineage (V1 → V121)

| Range | Theme |
|---|---|
| V1-V25 | Foundation — auth, courses, lessons, sections, enrollments |
| V26-V50 | Quiz + Assignment + grading + rubric |
| V51-V70 | Question bank, course taxonomy redesign (2-level), payment gateways |
| V71-V90 | Communication (chat, announcements), AI integration, video pipeline |
| V91-V100 | Course publications + version modes, video adaptive streaming, telemetry |
| V101-V120 | Grading audit, security hardening (account status, must change password), multi-org |
| V121 | Assignment instruction attachments (this session) |

Latest applied: 2026-04-27 15:20:51 UTC.

---

## 5. Key Constraints & Invariants

### 5.1 UNIQUE constraints
- `users(email)`, `users(username)`
- `enrollments(student_id, course_id)` — one enrollment per student per course
- `assignment_submissions(assignment_id, student_id)` — one submission slot
- `course_publications(course_id, publication_number)`
- `course_tag_assignments(course_id, tag_id)`

### 5.2 Domain rules enforced via DB
- `courses.status` CHECK IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')
- `assignments.status` CHECK IN ('DRAFT', 'PUBLISHED', 'CLOSED')
- `quiz_attempts.status` CHECK IN ('IN_PROGRESS', 'SUBMITTED', 'GRADED', 'EXPIRED', 'TIMEOUT')
- `payment_transactions.status` lifecycle enforced

### 5.3 Cross-aggregate invariants
- Course can only be APPROVED if has ≥1 chapter (enforced in app layer use case)
- Submission cannot be LATE if before assignment.due_date (computed)
- Quiz attempt cannot exceed quiz.max_attempts (counted in app layer)

---

## 6. Storage Sizes (production at snapshot time)

| Aspect | Size |
|---|---|
| Tables (data) | ~485 KB (current state — small dev/test data) |
| Indexes | ~512 KB |
| Total DB | ~1.2 MB |
| Backup file | `backups/prod-2026-04-24.dump` 483 KB (custom format, before pause) |

Production scale assumptions:
- 1,000 students → ~50 MB
- 10,000 students → ~500 MB + indexes
- 100,000 students → ~5 GB (would need partitioning of `learning_events`, `quiz_attempts`)

---

## 7. Future Schema Roadmap

### Phase 10 (Q3 2026 sau TTTN)
- `student_lesson_progress` table replace `enrollments.progress JSONB`
- Indexed completion rate analytics
- Optimistic locking per-lesson

### Future considerations
- Time-series partitioning cho `learning_events`, `audit_log` (>1M rows)
- Read replica for analytics queries
- Materialized views cho dashboard metrics

---

## 8. References

- **Full schema dump**: [`PRODUCTION_SCHEMA_DUMP_2026-04-28.sql`](./PRODUCTION_SCHEMA_DUMP_2026-04-28.sql)
- **Phase 10 design**: [`docs/architecture/PHASE10_SCHEMA_REFACTOR_PROGRESS_TABLE.md`](../architecture/PHASE10_SCHEMA_REFACTOR_PROGRESS_TABLE.md)
- **Lessons learned**: [`docs/LESSONS_LEARNED_2026-04-27.md`](../LESSONS_LEARNED_2026-04-27.md)
- **Migration files**: `backend/src/main/resources/db/migration/V*.sql` (V1-V121)

---

*Generated 2026-04-28 from production database snapshot. For TTTN VIMARU defense.*
