# Archive 2026-Q1

**Phạm vi**: Feb 2026 → 23 Apr 2026 (cuối milestone cấp khoa, trước khi tạm dừng production VM lần 1).

**Ranh giới**: mọi working doc có date-stamp `2026-02-*` tới `2026-04-19` (bao gồm) và đã ship. Các doc date-stamp `2026-04-20+` giữ lại trong `docs/plans/`, `docs/superpowers/` vì có thể còn đang handoff.

## Nội dung

### plans/ (18 file)

Design docs cho các feature đã ship trong quý: lesson-view redesign, IndexedDB multi-account isolation, storage management, teacher dashboard, KPI rating, category/taxonomy redesign, course editor consistency, delivery mode enforcement, admin pagination, course creation UX.

### reports/ (14 file + 1 subfolder)

Session reports / status snapshots:

- Hệ thống: `AUDIT_REPORT_S62`, `BAO_CAO_HE_THONG_LMS`, `BAO_CAO_TOAN_BO_HE_THONG_S53`
- Runtime / deploy: `2026-03-07-authoring-and-runtime-status`, `2026-03-14-payment-runtime-status`, `2026-03-16-*` (8 files — phase-A validation, offline telemetry, production deploy batches), `2026-03-17-*` (2 files)
- Landing: `2026-03-25-main-landing-summary`
- Audit chi tiết: `audit-2026-03-28/`

### superpowers/ (21 file)

Design specs + plans + mockups:

- `specs/`: 19 file (PWA offline v2/v3, storage control center, telemetry UI, media edge auth, AI lesson generation, messaging, question bank, teacher-student bugfix, org-admin split, Google login JWT, Caddy/edge-security fixes)
- `plans/`: 1 file (teacher-student management bugfix)
- `mockups/`: 1 HTML (payment history mockup)

### architecture-snapshots/ (10 file)

Date-stamped architecture plans cho các hệ thống đã impl: adaptive video V1, publication-PWA sync, video R2/Shaka/Stream delivery (4 files Mar 17-18), media domain edge auth, video worker + playback scale, admin-approval SOTA analysis, architecture-patterns-reference.

> Các doc architecture **tên cố định** (`LESSON_VIEW_ARCHITECTURE.md`, `COURSE_VS_CLASS_LESSON_BOUNDARY.md`, `STREAMING_PWA_ROADMAP.md`, `STUDENT_COURSE_FIRST_EXPERIENCE.md`, `TEACHER_ASSESSMENTS_CONTEXT_SPLIT.md`, `README.md`) giữ trong `docs/architecture/` vì là chuẩn sống.

### prompts/ (6 file)

Claude Code session prompts từ các audit tháng 4 (header/sidebar, course-editor, curriculum, main-content, lesson-content).

### screenshots/ (86 PNG, ~4.7 MB)

Evidence kèm các audit session trong Q1 (curriculum editor, callout, chapter flow, quiz, delivery mode, ...). Không đi kèm markdown cần thiết nào hiện tại; giữ lại làm chứng cứ thiết kế.

### testing/ (2 file)

`2026-03-12-regression-checklist`, `2026-03-12-regression-results` — regression batch đã chạy.

> `E2E_MATRIX.md`, `TEST_CHECKLIST.md`, `README.md` là sống → giữ trong `docs/testing/`.

### bugs/ (2 file)

Hai bug report đã đóng: `BUG_SECTION_QUIZ_403_FREE_COURSE`, `FRONTEND-BUG-REPORT-2026-03-22`.

> `docs/bugs/README.md` (index sống) giữ nguyên.

## Không archive ở Q1

- `docs/research/` — toàn bộ (reference tri thức dài hạn, không time-boxed)
- `docs/reference/` — source of truth
- `docs/runbooks/` — tài liệu vận hành sống
- `docs/deployment/` — 2 file vận hành sống
- `docs/reports/AUDIT_TRACKER.md`, `PHASE_B_EXECUTION_REPORT_TEMPLATE.md`, `README.md` — tracker/template/index sống (giữ trong `docs/reports/`)

## Kiểm tra broken link

```bash
# Nhanh: tìm reference tới file đã move
grep -rn "docs/plans/" --include='*.md' docs/ | grep -v docs/archive
grep -rn "docs/superpowers/" --include='*.md' docs/ | grep -v docs/archive
# Tương tự cho reports, prompts, screenshots
```

## Commit tạo archive này

Xem `git log --follow` của bất kỳ file nào trong đây để truy vết lần di chuyển.
