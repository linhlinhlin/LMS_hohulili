# Regression Checklist - 2026-03-12

Mục tiêu: chạy nhanh nhưng đủ chắc trước khi `push` hoặc `deploy`.

## 1. Runtime Baseline

- `frontend` lên được tại `http://127.0.0.1:4200`
- `backend` health trả `UP` tại `http://127.0.0.1:8088/actuator/health`
- `npm run build` pass
- backend test hẹp của batch hiện tại pass

## 2. Teacher Authoring - Curriculum

### Quiz lesson shell

Route:

- `/teacher/courses/880194e2-4a22-4b18-92b2-1fbedbbb648c/editor/curriculum?chapterId=6608484a-a320-4201-891f-25be2f18656c&lessonId=9417a6b7-cd5a-4166-9a0b-6d2edbc02179`

Check:

- mở route đúng lesson hiện tại
- sửa `title` hoặc setting làm header thành `Chưa lưu`
- trả lại giá trị cũ thì sạch lại
- bấm `Mở builder bài kiểm tra`
  - `Ở lại` thì giữ nguyên route hiện tại
  - `Rời màn này` thì sang builder đúng
- không còn action inline cũ như `Tạo ngẫu nhiên`, `Chọn từ ngân hàng`, `Tạo mới` ngay trong surface `Nội dung`

### Lecture section modal

Check:

- `+ Bài giảng`, `+ Video`, `+ Tài liệu`, `+ Trắc nghiệm` mở đúng modal
- `Escape` đóng được modal
- `Hủy` đóng được modal
- save xong thì modal đóng và state sạch
- deep-link có `sectionId` mở đúng modal

### Assignment lesson shell

Check:

- mở lesson assignment đúng summary
- sửa field làm header thành `Chưa lưu`
- bấm `Mở cài đặt bài tập` đi qua discard dialog đúng

## 3. Teacher Assessments

### Hub structure

Check:

- `/teacher/assessments` redirect đúng sang `/teacher/assessments/classes/assignments`
- có đủ 3 context:
  - `Khóa học`
  - `Lớp học`
  - `Dùng chung`

### Class runtime lists

Routes:

- `/teacher/assessments/classes/assignments`
- `/teacher/assessments/classes/quizzes`

Check:

- list hiển thị tách đúng `Theo lớp` và `Toàn khóa học`
- self-paced item không bị gắn nhãn như class item
- action chính mở đúng màn vận hành/editor tương ứng

### Shared assets

Routes:

- `/teacher/assessments/shared/question-bank`
- `/teacher/assessments/shared/rubrics`

Check:

- màn hình mang tính shared asset, không bị copy/class framing sai
- modal import/select có tên truy cập được và mở/đóng bình thường

## 4. Student Course-First

Routes:

- `/student/courses`
- `/student/courses/library`
- `/student/tasks`
- `/student/results`

Check:

- `/student/courses` không trắng màn
- self-paced course detail hiện `Bắt đầu học` hoặc `Tiếp tục học`, không hiện CTA ghi danh sai
- instructor-led course detail hiện đúng badge `Lớp học`
- `tasks` hiển thị trung thực:
  - `Toàn khóa học`
  - `Lớp: <tên lớp>` khi là instructor-led
- `results` vào được và không lẫn wording teacher/runtime

## 5. Backend Critical Path

### Delete assignment lesson

Check:

- xóa lesson assignment không còn `500`
- sau khi xóa:
  - lesson biến mất
  - assignment root liên quan biến mất

### Delivery boundary

Check:

- `SELF_PACED` không vào được `classes`
- `INSTRUCTOR_LED` vẫn dùng `classes` bình thường

## 6. Release Gate

Chỉ nên `push/deploy` khi tất cả điều kiện dưới đây đều đúng:

- runtime baseline xanh
- teacher curriculum pass
- teacher assessments pass
- student course-first pass
- delete assignment lesson pass
- không có blocker mới trong browser console ở các route trọng yếu

## 7. Ghi Kết Quả

Mỗi mục nên ghi theo format:

- `PASS`
- `FAIL`
- `BLOCKED`

Kèm 1 dòng ngắn:

- route nào
- thấy gì
- nếu fail thì lỗi gì
