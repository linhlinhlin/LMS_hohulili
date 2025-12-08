Tuyệt vời. Đây là một bản kế hoạch trưởng thành (mature) và thực tế (pragmatic).
Bạn đã cân bằng được giữa áp lực tiến độ (Delivery) và tiêu chuẩn kỹ thuật (Quality). Việc chấp nhận "Technical Debt" một cách có ý thức (Conscious Debt) và có kế hoạch trả nợ (Refactoring Plan) chính là tư duy của một Senior Engineer/Architect.
Dưới góc độ chuyên gia Backend, tôi phê duyệt (GREEN LIGHT) bản kế hoạch này để đội Frontend bắt đầu triển khai ngay.
Để hỗ trợ bạn tốt nhất, tôi xin cung cấp một Checklist Backend "Phản ứng nhanh" tương ứng với plan này. Bạn có thể gửi checklist này cho đội Backend để họ chuẩn bị hạ tầng đón dữ liệu từ Frontend mới.
BACKEND IMMEDIATE ACTION CHECKLIST
(Cần thực hiện ngay để code FE chạy được mà không gây lỗi hệ thống)
1. Database Schema (Critical for Base64)
Vì chúng ta tạm chấp nhận Base64, kích thước của field content sẽ tăng đột biến (1 ảnh nhỏ cũng có thể là 50KB-100KB text).
Action: Kiểm tra ngay cột lưu nội dung bài học trong Database.
Requirement: Bắt buộc phải là LONGTEXT (MySQL) hoặc TEXT (PostgreSQL - type text trong PG lưu được rất lớn).
Warning: Nếu đang để VARCHAR(4000) hay TEXT (MySQL - giới hạn 64KB), việc lưu bài học có ảnh sẽ bị Crash ngay lập tức.
2. Security Layer (Jsoup Integration)
Frontend đã "tin tưởng" giao việc lọc XSS cho Backend, nên Backend không được phép lơ là.
Vị trí implementation: Application Service Layer (trước khi gọi repository.save()).
Snippet mẫu (Spring Boot + Jsoup):
code
Java
// Dependency: org.jsoup:jsoup:1.17.2

public void updateLessonContent(Long lessonId, String rawHtmlContent) {
    // 1. Define Safelist (Cho phép các thẻ cơ bản của CKEditor: p, b, i, table, img, v.v...)
    Safelist safelist = Safelist.relaxed()
        .addAttributes("table", "class", "style", "border") // Cho phép style bảng
        .addAttributes("img", "src", "alt", "width", "height") // Cho phép ảnh Base64
        .addProtocols("img", "src", "http", "https", "data"); // Quan trọng: "data" cho phép Base64

    // 2. Clean
    String cleanHtml = Jsoup.clean(rawHtmlContent, safelist);

    // 3. Save to Domain Entity
    Lesson lesson = lessonRepository.findById(lessonId).orElseThrow();
    lesson.updateContent(cleanHtml); // Method trong Domain Model
    lessonRepository.save(lesson);
}
Lời khuyên cuối cùng cho đội Frontend (Angular)
Trong mục Verification Plan, hãy thêm một test case nhỏ để đảm bảo tương thích dữ liệu:
Test Case: Copy một đoạn văn bản từ Word hoặc một trang web khác và Paste vào CKEditor 5.
Lý do: CKEditor 5 xử lý paste rất khác CKEditor 4. Cần đảm bảo định dạng (format) không bị vỡ quá nhiều, vì đây là tính năng giảng viên dùng rất nhiều.
Kết luận: Plan đã duyệt. Hãy tiến hành triển khai (Execute). Hẹn gặp lại bạn ở Sprint sau với task "Backend Media API" để xử lý món nợ Base64 này!