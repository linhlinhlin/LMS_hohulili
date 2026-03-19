# Publication Refresh Runbook

## Mục đích

Runbook này dùng khi course đã có publication mới và team cần xác minh:

- learner nào phải refresh
- learner nào không nên bị ép refresh
- progress có được giữ sau refresh hay không

## Khái niệm cần phân biệt

### Self-paced

- mặc định theo `FOLLOW_LATEST`
- publication mới có thể làm package cũ stale

### Instructor-led class

- mặc định theo `PINNED`
- chỉ stale khi class adopt publication mới

### Case quan trọng: video nội bộ trên course đã APPROVED

- nếu teacher thêm section video mới hoặc đổi `videoAssetId` trong draft của course đã `APPROVED`, learner sẽ chưa thấy thay đổi ngay
- lý do: learner đọc từ `course_publications` snapshot, không đọc trực tiếp draft `content_blocks`
- muốn learner thấy video mới, team phải:
  1. `POST /api/v3/teacher/courses/{courseId}/submit-for-approval`
  2. `PATCH /api/v3/admin/courses/{courseId}/approve`
- chỉ sau khi publication snapshot mới được tạo, learner `/api/v3/courses/{courseId}/content` mới phản ánh `videoAssetId` / `videoSourceKind=ADAPTIVE_R2` mới

## Trình tự smoke cho self-paced

1. learner A tải package của course
2. teacher/admin publish release mới
3. learner A online lại
4. kiểm tra:
   - learner thấy có bản cập nhật
   - package cũ không bị xóa âm thầm
   - learner vẫn đọc được package cũ trong lúc chưa refresh
5. learner A refresh package
6. kiểm tra:
   - `publicationId` mới đã được ghi
   - lesson/section cũ còn tồn tại thì progress được giữ

## Trình tự smoke cho instructor-led

1. class đang pin publication A
2. learner tải package của class
3. course publish publication B
4. learner online lại
5. kiểm tra:
   - learner vẫn thấy publication A
   - package không bị stale sai
6. admin/teacher adopt publication B cho class
7. learner online lại
8. kiểm tra:
   - package cũ bị mark stale
   - learner được yêu cầu refresh package

## Legacy package

Nếu package không có `publicationId`:

- gắn `LEGACY_PACKAGE`
- không cố suy đoán mapping cũ
- yêu cầu learner tải lại một lần

## Expected behavior

- refresh package không được làm mất tiến trình học đã sync hoặc đang queue local
- stale package không được cho learner làm `ASSESSMENT` hoặc `EXAM`
- stale package có thể vẫn cho đọc text/video cũ nếu team chấp nhận trong V1
- nếu course đã `APPROVED` nhưng chưa submit + approve lại sau khi đổi video nội bộ, learner phải tiếp tục thấy publication cũ thay vì draft mới

## Nếu có lỗi

Ghi lại tối thiểu:

- `courseId`
- `publicationId` cũ và mới
- `versionModeSnapshot`
- `staleReason`
- route learner đang mở
- ảnh màn hình + console error đầu tiên
