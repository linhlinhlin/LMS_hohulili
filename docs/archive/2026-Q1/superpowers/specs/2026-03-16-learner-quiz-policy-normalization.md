# Spec: Chuẩn hóa learner quiz, offline policy, và certificate exam

> Ngày: 2026-03-16  
> Trạng thái: Đã implement ở code local, đã pass backend targeted tests và frontend build

## Mục tiêu

Batch này chốt 4 nhóm vấn đề:

1. Sửa learner runtime đang lỗi:
   - shell học bị vỡ text tiếng Việt ở route học
   - route `quiz/take` nhận `contentBlocks.data.content` nhưng renderer chỉ hiểu `html/text`
2. Chuẩn hóa taxonomy assessment:
   - `PRACTICE`
   - `ASSESSMENT`
   - `EXAM`
3. Chốt offline policy:
   - chỉ `PRACTICE` được tải và nộp ngoại tuyến
   - `ASSESSMENT` và `EXAM` luôn online-only
4. Chốt semantics chứng chỉ:
   - chỉ `EXAM` có `countsTowardCertificate = true` mới ảnh hưởng cấp chứng chỉ

## Quyết định sản phẩm

### 1. Ownership

- Quiz thuộc lesson/course content.
- Class không sở hữu quiz như một object riêng.
- Assessment giao thêm theo `courseId/classId` được xem là flow vận hành, không phải nguồn chân lý learner.

### 2. Offline integrity

- `PRACTICE`:
  - được tải offline
  - được queue submit offline
- `ASSESSMENT`:
  - không tải offline
  - không queue submit offline
- `EXAM`:
  - không tải offline
  - không queue submit offline

### 3. Certificate

- Chỉ lesson quiz hoặc section quiz loại `EXAM` với `countsTowardCertificate = true` mới được tính vào certificate.
- Khóa học vẫn phải hoàn thành 100%.
- Nếu course cũ không có exam chứng chỉ, rule cấp chứng chỉ cũ theo completion vẫn tiếp tục hoạt động.

## Thay đổi đã implement

### Backend

- Bổ sung metadata `quiz_type` và `counts_toward_certificate` cho `quizzes`.
- Expose `quizType`, `countsTowardCertificate`, `allowOffline` qua quiz API và learner payload.
- Section quiz submit sẽ ghi marker `quiz:{sectionId}` vào `completedSections` khi pass.
- Certificate issuance gọi `CertificateEligibilityPort` để kiểm tra:
  - lesson quiz `EXAM`
  - section quiz `EXAM`
  - chỉ những quiz có `countsTowardCertificate = true`
- API cấp chứng chỉ trả lỗi nghiệp vụ rõ ràng khi learner chưa đạt điều kiện, không nổ lỗi server.

### Frontend learner

- Shared text block renderer hiểu cả `html`, `text`, và `content`.
- Student quiz taking normalize question/options trước khi render.
- Learner lesson CTA hiển thị taxonomy rõ hơn:
  - loại quiz
  - badge offline/online-only
- Khi offline:
  - quiz online-only bị chặn ngay từ CTA hoặc route load
  - không còn rơi vào trạng thái blank/empty

### Frontend teacher

- Lesson quiz create/edit hỗ trợ chọn:
  - `PRACTICE`
  - `ASSESSMENT`
  - `EXAM`
- Chỉ `EXAM` mới hiện toggle `countsTowardCertificate`.
- Section quiz trong curriculum modal dùng cùng taxonomy.
- Route tạo quiz tổng quát `/teacher/quiz/create` không còn tạo quiz qua legacy course/class API.
  - route này giờ là hub điều hướng
  - teacher phải chọn đúng flow:
    - neo quiz vào lesson/chương
    - hoặc sang flow assessment được giao

## Verification đã chạy

### Backend

Đã pass:

- `CreateQuizUseCaseV3Test`
- `QuizControllerV3CreateFlowTest`
- `QuizControllerV3EmbeddedSectionFlowTest`
- `CourseQueryControllerV3ContractTest`
- `CertificateUseCaseTest`
- `UpdateLessonProgressUseCaseTest`
- `StudentEnrollmentControllerV3Test`

### Frontend

Đã pass:

- `npm run build`

## Residual còn lại

- Chưa chạy browser smoke production cho toàn bộ nhánh:
  - lesson quiz create/edit
  - quiz take online
  - practice quiz offline trong PWA thật
  - certificate issuance với exam thật
- `createCourseQuiz` backend vẫn còn để giữ runtime compatibility cho assignment flow legacy, nhưng teacher UI không nên coi đó là đường tạo quiz chuẩn nữa.

## Kỳ vọng review sau deploy

1. Route học hiển thị tiếng Việt đúng.
2. Route `quiz/take` hiển thị đầy đủ nội dung câu hỏi/đáp án.
3. `PRACTICE` quiz tải offline được và submit queue được.
4. `ASSESSMENT`/`EXAM` báo online-only rõ ràng.
5. Certificate chỉ cấp khi:
   - progress = 100%
   - mọi exam chứng chỉ bắt buộc đã pass.
