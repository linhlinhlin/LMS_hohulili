# Changelog

Mọi thay đổi đáng chú ý của dự án này sẽ được ghi ở đây.

Định dạng bám theo tinh thần của [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), nhưng dùng tiếng Việt và phù hợp với cách vận hành của repo này.

## [Chưa phát hành]

### Learner / Quiz

- Sửa guard truy cập `section quiz` để không chặn student trong khóa học `FREE`.
- Cho phép truy cập khi student có enrollment hợp lệ (`ACTIVE` hoặc `COMPLETED`) dù không đi qua payment flow.
- Sửa learner quiz renderer để hiểu `contentBlocks.data.content`, không còn vào `quiz/take` rồi trắng nội dung câu hỏi/đáp án.
- Chuẩn hóa metadata assessment cho quiz:
  - `PRACTICE`
  - `ASSESSMENT`
  - `EXAM`
- Chỉ cho phép `PRACTICE` tải và nộp offline; `ASSESSMENT` và `EXAM` là online-only.
- Route `/teacher/quiz/create` không còn tạo quiz qua legacy course/class path; nay là hub điều hướng sang flow lesson quiz hoặc assignment assessment.
- Gắn certificate issuance với rule:
  - phải hoàn thành 100%
  - phải pass mọi `EXAM` có `countsTowardCertificate = true`

### PWA / Publication / Sync

- Thêm `course_publications` làm learner-facing source of truth cho course đã publish.
- Thêm `draftChangeStatus` cho course shell để tách draft workflow khỏi publication đang live.
- Kích hoạt `learning_classes.courseVersionId` và `versionMode` (`PINNED` / `FOLLOW_LATEST`) cho class.
- Tách teacher draft content query khỏi learner/public course query.
- Chuẩn hóa offline package metadata theo publication:
  - `publicationId`
  - `publicationNumber`
  - `versionModeSnapshot`
  - `staleReason`
- Mở rộng sync contract cho offline queue:
  - `clientOperationId`
  - `occurredAt`
  - `courseId`
  - `publicationId`
  - `entityId`
  - `baseServerUpdatedAt`
- `sync/pull` trả thêm snapshot tối thiểu cho `courseStates`, `lessonProgress`, `videoProgress`, `quizAttempts`, và `conflicts`.

### Tài liệu

- Dựng lại trục tài liệu chuẩn theo hướng Việt-first.
- Thêm `CONTRIBUTING.md`, nhóm `docs/reference/`, và `docs/runbooks/`.
- Làm sạch docs index, tách rõ tài liệu chuẩn, tài liệu working, và tài liệu historical.
- Thêm spec `docs/superpowers/specs/2026-03-16-learner-quiz-policy-normalization.md`.
- Rewrite `docs/architecture/STREAMING_PWA_ROADMAP.md` theo truth pass, không overclaim PWA/offline đã hoàn tất.
- Thêm canonical spec `docs/architecture/2026-03-16-course-publication-pwa-sync-model.md`.
- Thêm runbook:
  - `docs/runbooks/PWA_OFFLINE_RUNBOOK.md`
  - `docs/runbooks/PUBLICATION_REFRESH_RUNBOOK.md`
  - `docs/runbooks/SYNC_CONFLICT_RUNBOOK.md`

## [2026-03-15]

### Thêm

- Bổ sung spec triển khai video adaptive streaming theo section ở `docs/architecture/2026-03-15-adaptive-video-v1-implementation-plan.md`.

### Cải thiện

- Làm sạch kho tài liệu và xóa bộ export trùng lặp của investigation PWA.

## [2026-03-14]

### Payment / Payout

- Hoàn thiện kiểm soát payment completion, revoke access sau refund, payout guardrails, và soft-cancel payout.
- Chuẩn hóa message `Đã hủy` cho payout teacher/admin.
- Sửa malformed JSON ở login để trả `400` thay vì `500`.

## [2026-03-12] - [2026-03-13]

### Authoring / Learner

- Hardening các luồng curriculum section-level quiz.
- Sửa create/edit question với `text + formula + image`.
- Ổn định learner embedded quiz, media section, và các regression liên quan.

## [2026-03-04]

### Upload / Course Editor

- Nâng cấp upload system sang flow presigned URL 3 bước.
- Redesign course info page và cải thiện course editor consistency.

## Ghi chú cập nhật

- Chỉ ghi các thay đổi có tác động đến hành vi hệ thống, vận hành, docs chuẩn, hoặc trải nghiệm người dùng.
- Nếu thay đổi lớn nhưng vẫn đang trong quá trình triển khai, ghi vào `Chưa phát hành`.
- Mỗi thay đổi runtime quan trọng nên cập nhật cả `CHANGELOG.md` và tài liệu chuẩn tương ứng trong `docs/`.
