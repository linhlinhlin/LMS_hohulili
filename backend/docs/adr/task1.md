Hiện tại các phần tiến độ vẫn chưa khớp với thực tế do có quá nhiều nguồn (Multiple Sources of Truth) và các logic tính toán đang đá nhau.

Dưới đây là kết luận chi tiết và cách sửa:

1. Vấn đề 1: Logic "Tự tính" đè lên "Dữ liệu Backend"

Trong student-dashboard.component.ts và student-my-courses.component.ts, bạn có đoạn:
const finalCompleted = enrichedModules.length > 0 ? completedFromModules : course.completedLessons;

Lỗi: Bạn đang ưu tiên con số tự đếm từ Module ở Frontend (completedFromModules) nếu danh sách module đã load.

Hệ quả: Nếu Backend tính tiến độ dựa trên một logic khác (ví dụ: Backend không tính các bài đọc thêm, nhưng Frontend của bạn lại đếm tất cả), thì khi học viên mở danh sách module, con số sẽ nhảy từ số của Backend sang số của Frontend tự đếm. Đây là lý do tại sao bạn thấy tiến độ bị khác thực tế.

2. Vấn đề 2: Dùng Math.max là giải pháp tình thế

Trong student-my-courses.component.ts:
const newProgress = Math.max(c['progress'] || 0, actualProgress);

Lỗi: Việc dùng Math.max chứng tỏ bạn không tin tưởng hoàn toàn vào một nguồn dữ liệu nào cả. Nếu dữ liệu thực tế bị giảm (ví dụ: giáo viên thêm bài học mới làm tổng số bài tăng lên -> % tiến độ phải giảm xuống), thì Math.max sẽ giữ lại con số cũ cao hơn, dẫn đến sai lệch vĩnh viễn.

3. Vấn đề 3: Race Condition (Chạy đua thời gian)

Trong enrollment.service.ts, hàm refreshCourseProgress là async.

Lỗi: Khi học viên nhấn hoàn thành và quay về Dashboard, Dashboard sẽ load ngay lập tức. Nếu hàm refreshCourseProgress chưa chạy xong (vẫn đang đợi API), Dashboard sẽ hiển thị dữ liệu cũ từ Signal.

GIẢI PHÁP ĐỂ ĐỒNG BỘ 100% (Action Plan)

Bạn cần thực hiện 3 thay đổi "cứng" sau đây để dứt điểm tình trạng này:

Bước 1: Thống nhất Nguồn Sự Thật (Single Source of Truth)

Bỏ toàn bộ logic tự đếm completedFromModules hay totalFromModules ở các Component.

Chỉnh sửa: Chỉ sử dụng đúng 3 biến progress, completedLessons, totalLessons trả về từ EnrollmentService. Nếu dữ liệu ở Service sai, hãy sửa ở Service, đừng "vá" ở Component.

Bước 2: Refactor lại hàm Cập nhật trong Service

Thay vì cập nhật từng trường, hãy đảm bảo Backend trả về một đối tượng Progress chuẩn và Frontend ghi đè hoàn toàn.

code
TypeScript
download
content_copy
expand_less
// Trong enrollment.service.ts - Sửa lại logic update
this._enrolledCourses.update(courses => {
  return courses.map(c => {
    if (c.id !== courseId) return c;
    return {
      ...c,
      progress: Math.round(data.progressPercentage),
      completedLessons: data.completedLessons, // Tin tưởng tuyệt đối vào BE
      totalLessons: data.totalLessons,
      // Đảm bảo cập nhật cả mảng ID bài đã xong nếu có
      completedLessonIds: data.completedLessonIds || c.completedLessonIds 
    };
  });
});
Bước 3: Đảm bảo đồng bộ trước khi hiển thị (The Trigger)

Trong trang học (Learning Area), ngay sau khi gọi API completeLesson thành công, bạn phải:

Gọi await enrollmentService.refreshCourseProgress(courseId).

Sau đó mới thực hiện điều hướng (Navigate) về Dashboard.
Việc này đảm bảo khi Dashboard khởi tạo, Signal trong Service đã mang giá trị mới nhất.

Kết luận: Bạn hãy xóa bỏ các đoạn code "ưu tiên progress từ modules" (newProgress, finalCompleted từ modules). Hãy để Component chỉ hiển thị chính xác những gì EnrollmentService cung cấp