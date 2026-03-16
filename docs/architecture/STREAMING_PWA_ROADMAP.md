# Streaming & PWA Roadmap

> Cập nhật: 2026-03-16  
> Trạng thái: truth pass sau batch publication/PWA, dùng làm tài liệu định hướng hiện hành  
> Lưu ý: tài liệu này phản ánh **trạng thái thực của nhánh code hiện tại**, không mặc định đồng nghĩa với “đã verify production”

## Mục tiêu

1. Video nội bộ của LMS phát ổn trên mạng yếu, ưu tiên ổn định hơn độ nét.
2. PWA cho phép tải khóa học, học ngoại tuyến, và đồng bộ tiến trình khi có mạng lại.
3. Course đã publish có draft workflow riêng; learner chỉ học trên bản publication đã phát hành.

## Sự thật hiện tại

### Đã có trong codebase

- Download course vào IndexedDB.
- Offline queue cho progress, submission, quiz attempt.
- Internal video offline path qua `OfflineVideoService`.
- `sync/push` và `sync/pull` backend đã tồn tại.
- Metadata quiz đã được chuẩn hóa:
  - `PRACTICE`
  - `ASSESSMENT`
  - `EXAM`
- Chỉ `PRACTICE` được phép offline.

### Đã cấy xong ở nhánh hiện tại nhưng chưa coi là production-truth

- `course_publications` làm nguồn chân lý cho learner/PWA.
- `draftChangeStatus` cho course shell.
- `learning_classes.course_version_id` và `version_mode` được dùng thật:
  - `FOLLOW_LATEST`
  - `PINNED`
- Learner/public course query đọc từ publication snapshot, có fallback cho dữ liệu cũ.
- Teacher draft content đã tách khỏi public learner query.
- Offline package lưu thêm:
  - `publicationId`
  - `publicationNumber`
  - `versionModeSnapshot`
  - `staleReason`
- Sync queue gửi thêm metadata:
  - `clientOperationId`
  - `occurredAt`
  - `courseId`
  - `publicationId`
  - `entityId`
  - `baseServerUpdatedAt`
- `sync/pull` trả thêm snapshot tối thiểu cho:
  - `courseStates`
  - `lessonProgress`
  - `videoProgress`
  - `quizAttempts`
  - `conflicts`

### Vẫn là partial, chưa nên overclaim

- Publication review workflow trên UI teacher/admin chưa hoàn tất end-to-end.
- `sync/pull` mới là contract nền; chưa có conflict UX hoàn chỉnh trên frontend.
- Chưa có delta refresh cho package; V1 vẫn theo hướng refresh an toàn.
- Chưa có reuse asset fingerprint đầy đủ cho video khi refresh package.
- Chưa verify production cho nhánh:
  - self-paced `FOLLOW_LATEST`
  - instructor-led `PINNED`
  - stale package refresh
  - sync conflict sau khi content publication thay đổi

## Quyết định sản phẩm đã khóa

- Không tạo course mới chỉ để sửa nội dung thông thường.
- Course live phải có draft workspace tách khỏi published learner content.
- Self-paced learner mặc định theo publication mới nhất.
- Instructor-led class mặc định pin vào một publication cụ thể.
- `PRACTICE` có thể offline.
- `ASSESSMENT` và `EXAM` là online-only.
- Internal LMS video có thể offline nếu package hợp lệ.
- YouTube/external video là online-only.

## Mô hình publication

### Course shell

- `Course.status` tiếp tục giữ vai trò moderation/live availability.
- `draftChangeStatus` mô tả draft workspace đang ở đâu:
  - `NONE`
  - `DRAFT`
  - `PENDING_REVIEW`
  - `CHANGES_REQUESTED`

### CoursePublication

`CoursePublication` là snapshot learner-facing của course tại thời điểm publish, gồm:

- metadata learner-facing của course
- chapters / lessons / sections
- quiz metadata
- video / file asset refs
- `allowOfflineDownload`
- `contentVersion`
- `publishedAt`
- `publicationNumber`

V1 dùng snapshot JSONB thay vì clone cả relational tree.

## Version mode của learner

### Self-paced

- class mặc định `FOLLOW_LATEST`
- learner online thấy publication mới nhất
- package offline cũ được gắn `UPDATE_AVAILABLE` khi latest publication đổi

### Instructor-led

- class mặc định `PINNED`
- class tiếp tục dùng publication cũ cho tới khi giáo viên/quản trị `adopt publication`
- package không bị coi là stale chỉ vì course có release mới, nếu class chưa adopt

## Offline package model

Mỗi package phải gắn với:

- `courseId`
- `publicationId`
- `publicationNumber`
- `contentVersion`
- `downloadedAt`
- `versionModeSnapshot`

Legacy package không có `publicationId` phải được coi là `LEGACY_PACKAGE` và buộc re-download sau rollout publication model.

## Sync contract V1

### Push

`POST /api/v3/sync/push` nhận batch operation với metadata chuẩn:

- `clientOperationId`
- `occurredAt`
- `courseId`
- `publicationId`
- `entityType`
- `entityId`
- `baseServerUpdatedAt`

### Pull

`GET /api/v3/sync/pull` phải kéo được tối thiểu:

- trạng thái package/course theo publication
- lesson progress summary
- video progress summary
- quiz attempt sync state
- conflict/rejection summary

### Conflict policy

- video progress: additive merge
- lesson progress: forward-only
- practice quiz attempt: server-authoritative grading
- stale publication: learner được yêu cầu refresh package

## Trạng thái video offline

### Đã có

- Internal video offline path trong app shell.
- Metadata publication/package đủ chỗ để gắn video theo version.

### Chưa chốt production

- Refresh package mà vẫn reuse local video an toàn.
- Full smoke cho video offline sau khi publication thay đổi.

## Roadmap ngắn hạn

### Phase A: khóa truth và boundary

- hoàn tất docs truth pass
- khóa authoring guard cho draft/live
- verify publication snapshot path bằng tests

### Phase B: rollout publication model

- migrate production
- deploy learner/public query theo publication
- deploy teacher draft query tách khỏi public query
- smoke self-paced và instructor-led

### Phase C: rollout stale/refresh/sync UX

- badge `Có bản cập nhật`
- flow refresh package giữ progress
- runbook cho stale package và conflict

### Phase D: tối ưu media/offline

- video asset fingerprint reuse
- sync pull hoàn chỉnh hơn cho quiz attempts/conflicts
- QoE và offline telemetry rõ ràng hơn

## Không nên kết luận sai

Các câu sau **không còn đúng** và không nên dùng trong trao đổi nội bộ:

- “PWA đã 100% hoàn chỉnh”
- “Offline sync đã xong hết”
- “Publish rồi vẫn sửa trực tiếp live content bình thường”
- “Nếu course đổi nội dung thì cứ tạo course mới”

## Tài liệu đi kèm

- `docs/architecture/2026-03-16-course-publication-pwa-sync-model.md`
- `docs/runbooks/PWA_OFFLINE_RUNBOOK.md`
- `docs/runbooks/PUBLICATION_REFRESH_RUNBOOK.md`
- `docs/runbooks/SYNC_CONFLICT_RUNBOOK.md`
- `docs/reference/RUNTIME_CONVENTIONS.md`
