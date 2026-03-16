# Sync Conflict Runbook

## Mục đích

Runbook này hướng dẫn team phân biệt:

- lỗi sync thật
- stale package
- policy online-only đúng thiết kế

## Conflict classes hiện hành

### 1. Stale publication

Triệu chứng thường gặp:

- package đã tải nhưng learner bị nhắc cập nhật
- progress push/pull không khớp publication hiện tại

Hướng xử lý:

1. kiểm tra `publicationId` local
2. kiểm tra `versionModeSnapshot`
3. gọi `/api/v3/courses/versions`
4. nếu self-paced và publication đổi:
   - mark `UPDATE_AVAILABLE`
   - yêu cầu refresh package
5. nếu instructor-led và class chưa adopt:
   - không coi là bug

### 2. Offline queue không được ack

Triệu chứng:

- reconnect xong queue không giảm
- learner thấy progress cũ

Hướng xử lý:

1. kiểm tra payload push có:
   - `clientOperationId`
   - `courseId`
   - `publicationId`
2. kiểm tra response push có `ackedOperationIds`
3. chỉ đánh dấu synced cho item được ack thật

### 3. Assessment online-only

Triệu chứng:

- learner offline không mở được quiz

Cần xác định trước khi gọi là bug:

- quiz là `PRACTICE` hay `ASSESSMENT/EXAM`
- nếu là `ASSESSMENT` hoặc `EXAM`, đây là behavior đúng

## Dữ liệu tối thiểu cần thu thập

- user role
- `courseId`
- `publicationId`
- `entityType`
- `clientOperationId`
- thời điểm `occurredAt`
- trạng thái mạng lúc xảy ra lỗi
- response của `sync/push` hoặc `sync/pull`

## Quy tắc merge hiện hành

- video progress: additive merge
- lesson progress: forward-only
- practice quiz: server-authoritative grading
- assessment/exam: online-only

## Lưu ý

Ở nhánh hiện tại, `sync/pull` đã có contract nền nhưng UX conflict đầy đủ vẫn còn ở phase sau. Vì vậy:

- ưu tiên xác minh metadata publication trước
- không kết luận backend conflict sai nếu frontend chưa render conflict rõ
