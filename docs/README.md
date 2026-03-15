# Bản đồ tài liệu

Kho tài liệu này được tổ chức theo 4 nhóm:

- **Tài liệu chuẩn đang dùng**
- **Tài liệu kiến trúc và giải thích**
- **Tài liệu work-in-progress**
- **Tài liệu lịch sử để tham chiếu**

Nếu có mâu thuẫn giữa tài liệu và runtime thực tế, ưu tiên:

1. code
2. runbook/reference hiện hành
3. changelog
4. tài liệu lịch sử

## Đọc trước nếu mới vào dự án

- `../README.md`
- `../ONBOARDING.md`
- `../CHANGELOG.md`
- `../CONTRIBUTING.md`
- `reference/RUNTIME_CONVENTIONS.md`
- `runbooks/PRODUCTION_SMOKE_TEST.md`

## 1. Tài liệu chuẩn đang dùng

### Tham chiếu nhanh

- `reference/README.md`
- `reference/DOCUMENTATION_POLICY.md`
- `reference/BACKEND_OVERVIEW.md`
- `reference/FRONTEND_OVERVIEW.md`
- `reference/RUNTIME_CONVENTIONS.md`
- `reference/LOCAL_DEV_MATRIX.md`
- `reference/ROLE_ACCESS_MATRIX.md`
- `reference/PRODUCTION_SURFACES.md`

### Runbook thao tác

- `runbooks/README.md`
- `runbooks/PRODUCTION_SMOKE_TEST.md`
- `runbooks/PWA_OFFLINE_RUNBOOK.md`
- `runbooks/PAYMENT_PAYOUT_RUNBOOK.md`
- `runbooks/LEARNER_FLOW_RUNBOOK.md`

### Kiểm thử

- `testing/TEST_CHECKLIST.md`
- `testing/2026-03-12-regression-checklist.md`
- `testing/2026-03-12-regression-results.md`

## 2. Kiến trúc và boundary hiện hành

- `architecture/COURSE_VS_CLASS_LESSON_BOUNDARY.md`
- `architecture/TEACHER_ASSESSMENTS_CONTEXT_SPLIT.md`
- `architecture/STUDENT_COURSE_FIRST_EXPERIENCE.md`
- `architecture/LESSON_VIEW_ARCHITECTURE.md`
- `architecture/STREAMING_PWA_ROADMAP.md`
- `PWA_OFFLINE_RESEARCH.md`

## 3. Tài liệu đang triển khai

- `architecture/2026-03-15-adaptive-video-v1-implementation-plan.md`
- `bugs/README.md`
- `bugs/*.md`
- `plans/README.md`
- `plans/*.md`
- `superpowers/specs/*.md`

Nhóm này có thể mô tả công việc đang làm dở hoặc chưa ship xong. Không coi đây là runtime truth nếu chưa verify.

## 4. Tài liệu historical/reference

- `reports/README.md`
- `research/README.md`

Các file trong đây vẫn hữu ích, nhưng không phải nơi đọc đầu tiên khi ra quyết định hiện tại.

## 5. Specs và handoff từ quá trình design

- `superpowers/README.md`
- `superpowers/specs/README.md`

## Quy tắc bảo trì docs

- thay đổi runtime lớn -> cập nhật `CHANGELOG.md` + tài liệu chuẩn tương ứng
- hướng dẫn thao tác -> đưa vào `runbooks/`
- thông tin tham chiếu ngắn, ổn định -> đưa vào `reference/`
- proposal hoặc plan -> đưa vào `plans/` hoặc `superpowers/specs/`
- audit/research cũ -> giữ ở `reports/` hoặc `research/`
