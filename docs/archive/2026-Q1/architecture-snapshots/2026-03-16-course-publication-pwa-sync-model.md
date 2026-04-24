# Course Publication, Offline Package, và Sync Model

> Ngày: 2026-03-16  
> Trạng thái: canonical spec cho nhánh publication/PWA hiện tại  
> Phạm vi: backend model, learner/public boundary, offline package metadata, sync contract

## 1. Mục tiêu

Tài liệu này khóa mô hình chung để các batch PWA/offline không tiếp tục vá chắp vá quanh `contentVersion`.

Ba câu hỏi trung tâm:

1. Learner đang học **phiên bản course nào**?
2. Package offline trên máy learner thuộc **publication nào**?
3. Khi course đổi nội dung, learner self-paced và learner trong class instructor-led phải **phản ứng khác nhau** ra sao?

## 2. Nguồn chân lý

### 2.1 Teacher authoring

Teacher luôn sửa **draft workspace**.

- Course chưa live: draft là workspace chính.
- Course đã live: teacher tiếp tục sửa draft, không sửa thẳng learner-facing publication.

### 2.2 Learner

Learner chỉ đọc từ `CoursePublication`.

- Public course detail
- Public course content
- Lesson learner detail
- Offline package download

đều phải resolve từ publication snapshot, không đọc trực tiếp draft tables.

## 3. Mô hình dữ liệu

### 3.1 Course shell

`Course.status`:

- `DRAFT`
- `PENDING`
- `APPROVED`
- `REJECTED`

`Course.draftChangeStatus`:

- `NONE`
- `DRAFT`
- `PENDING_REVIEW`
- `CHANGES_REQUESTED`

Ý nghĩa:

- `APPROVED + NONE`: publication hiện hành khớp với draft shell
- `APPROVED + DRAFT`: course đang live nhưng đã có chỉnh sửa chưa gửi duyệt lại
- `APPROVED + PENDING_REVIEW`: draft thay đổi đang chờ duyệt để tạo publication mới

### 3.2 CoursePublication

Mỗi publication gồm:

- `id`
- `courseId`
- `publicationNumber`
- `contentVersion`
- `publishedAt`
- `publishedById`
- `snapshot` JSONB

Snapshot learner-facing tối thiểu phải chứa:

- metadata course
- chapters / lessons / sections
- lesson/section quiz metadata
- file/video asset refs
- `allowOfflineDownload`

## 4. Version mode

### 4.1 `FOLLOW_LATEST`

Dùng cho self-paced.

- Learner online luôn học publication mới nhất.
- Offline package cũ bị đánh dấu `UPDATE_AVAILABLE` khi latest publication đổi.

### 4.2 `PINNED`

Dùng cho instructor-led class.

- Class pin vào một `courseVersionId`.
- Course có publication mới không làm learner class đó tự nhảy version.
- Chỉ khi teacher/admin `adopt publication`, class mới chuyển sang publication mới.

## 5. Offline package

Mỗi `OfflineCourse` phải gắn với:

- `courseId`
- `publicationId`
- `publicationNumber`
- `contentVersion`
- `downloadedAt`
- `versionModeSnapshot`
- `staleReason`

`staleReason` hiện hành:

- `UPDATE_AVAILABLE`
- `CLASS_ADOPTED_NEW_PUBLICATION`
- `LEGACY_PACKAGE`
- `UNKNOWN`

## 6. Sync contract

### 6.1 Push

`SyncQueueItem` phải mang:

- `clientOperationId`
- `occurredAt`
- `courseId`
- `publicationId`
- `entityType`
- `entityId`
- `baseServerUpdatedAt`

Backend chỉ coi item là đồng bộ thành công khi ack trả về `clientOperationId` tương ứng.

### 6.2 Pull

`sync/pull` V1 phải cung cấp tối thiểu:

- `courseStates`
- `lessonProgress`
- `videoProgress`
- `quizAttempts`
- `conflicts`

Ở giai đoạn hiện tại, đây là **contract nền**; conflict UX đầy đủ vẫn còn ở phase sau.

### 6.3 Conflict policy for learning progress

Không phải mọi khác biệt giữa local progress và server progress đều là "conflict".

Quy tắc hiện hành:

- `videoProgress`: merge cộng dồn theo watched range / max progress
- `lessonProgress.status`: forward-only, `COMPLETED` không bị hạ xuống
- `lessonProgress.completedSections`: set-union theo `lessonId`
- `quizAttempts`: server authoritative

Điều này có nghĩa:

- người học có thể hoàn thành nhiều lesson liên tiếp khi offline
- người học có thể hoàn thành section trên thiết bị A và tiếp tục lesson trên thiết bị B
- khi hai thiết bị cùng sync lại, server hợp nhất tiến độ học theo bản chất domain thay vì last-write-wins

Hard conflict chỉ nên dùng cho các trường hợp như:

- package offline đã stale do publication đổi
- class pinned đã adopt publication mới và local package cũ không còn an toàn để replay

## 7. Policy content update

### 7.1 Khi course self-paced có publication mới

- learner online thấy publication mới
- package offline cũ không bị xóa ngay
- UI phải cho learner biết có bản cập nhật
- refresh package cần giữ progress local nếu lesson/section IDs vẫn còn

### 7.2 Khi class instructor-led chưa adopt publication mới

- learner tiếp tục học publication cũ
- package cũ không bị coi là stale chỉ vì course có publication mới

### 7.3 Khi class adopt publication mới

- package cũ chuyển sang trạng thái stale
- learner được yêu cầu refresh package

## 8. Policy assessment và offline

Giữ nguyên hướng đã khóa:

- `PRACTICE`: được offline
- `ASSESSMENT`: online-only
- `EXAM`: online-only

Publication model không thay đổi quyết định này; ngược lại, nó giúp offline package biết quiz nào được phép đi theo package.

## 9. Trạng thái triển khai của nhánh hiện tại

### Đã có trong code

- `course_publications`
- `draft_change_status`
- `learning_classes.version_mode`
- `learning_classes.course_version_id`
- learner query đọc publication snapshot có fallback
- teacher draft content query riêng
- offline package metadata publication-aware
- sync queue metadata publication-aware

### Chưa xong hoàn toàn

- publish request/review UI đầy đủ
- production rollout và smoke
- conflict UX đầy đủ trên frontend
- delta refresh / asset reuse tối ưu

## 10. Non-goals của V1

- Không clone full relational tree cho publication.
- Không làm delta patch cho toàn bộ offline package.
- Không tạo course mới cho mỗi lần update nội dung.
- Không tạo quiz/class-owned certificate object riêng.

## 11. Rollout tối thiểu

1. deploy migration `V92__course_publications_and_version_modes.sql`
2. deploy backend publication-aware query path
3. deploy FE offline metadata + stale detection mới
4. re-download bắt buộc cho `LEGACY_PACKAGE`
5. smoke:
   - self-paced latest
   - instructor-led pinned
   - class adopt publication
   - offline refresh giữ progress
