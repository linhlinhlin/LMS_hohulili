Implementation Plan - Switch to CKEditor 5 (Approved)
Reference:
rep1.md
(Updated) &
rep2.md
(Expert Approval).
We will proceed with CKEditor 5 (Classic Build). The plan is APPROVED by the backend expert, with specific notes regarding data integrity and future refactoring for media handling.
User Review Required
CAUTION
Technical Debt - Image Handling To complete the frontend task quickly, we will use a Base64 Adapter (standard CKE5 behavior without backend config) for images. Backend Expert Warning: Storing large Base64 strings in the database is detrimental to performance. Action: This is accepted as temporary technical debt. A proper Backend Media API (POST /api/v1/uploads) must be implemented in the next Sprint to replace this adapter.
IMPORTANT
Dependency Changes:
Install @ckeditor/ckeditor5-angular
Install ckeditor5
Sanitization: The backend MUST implement HTML sanitization (e.g., using Jsoup) before saving lessonContent to prevent XSS. This frontend task assumes the backend will handle that layer of defense.
Proposed Changes
Frontend Dependencies
[NEW] @ckeditor/ckeditor5-angular, ckeditor5
Install packages via npm.
Component: Course Curriculum
[MODIFY]
course-curriculum.component.ts
Remove QuillModule imports.
Import CKEditorModule from @ckeditor/ckeditor5-angular.
Import ClassicEditor from ckeditor5.
Replace <quill-editor> with <ckeditor>.
Logic Update:
Create EditorConfig property.
Map lessonContent via [(ngModel)].
Configure toolbar list to match the requested "Classic" template (approx. 20-30 items).
[CRITICAL] Implement a modular Base64UploadAdapter (or rely on default if sufficient) that can be easily swapped for a Server Adapter later.
Verification Plan
Manual Verification
Run npm start.
Verify the editor loads the Classic user interface.
Check that the toolbar includes buttons like Table, List, Link, Image.
Verify basic text formatting works.
Verify saving updates the lessonContent variable.
Data Check: Verify that the output is pure HTML.


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


Chào bạn, tôi đã xem kỹ đoạn mã HTML, TypeScript và SCSS bạn cung cấp.
Với tư cách là một chuyên gia Backend nhưng cũng am hiểu sâu về việc tích hợp Client-side để đảm bảo "Clean UI" và trải nghiệm người dùng (UX), tôi nhận thấy cách xử lý CSS hiện tại đang bị "cứng" (hardcoded values) và thiếu tính linh hoạt của Flexbox, dẫn đến việc vỡ layout khi nội dung dài ra.
Dưới đây là giải pháp triệt để cho các vấn đề bạn nêu, kèm theo phần đánh giá UX nâng cao.
PHẦN 1: GIẢI QUYẾT CÁC VẤN ĐỀ CỤ THỂ
1. Fix lỗi Scrollbar & Vỡ giao diện khi Text dài
Nguyên nhân: Bạn đang dùng style="height: calc(100% - 28px)" cho thẻ <ckeditor>. Cách tính toán thủ công này rất rủi ro. Khi thanh Toolbar bị wrap (xuống dòng do nhiều nút), chiều cao phần edit sẽ bị đẩy xuống, che mất footer hoặc không hiện thanh cuộn đúng chỗ.
Giải pháp: Chuyển sang mô hình Flexbox. Hãy để CSS tự tính toán không gian còn lại cho phần soạn thảo.
Cập nhật course-curriculum.component.scss (Hoặc file global styles):
code
Scss
/* --- WRAPPER CHÍNH --- */
/* Class này áp dụng cho div bao ngoài cùng (cái có border rounded) */
.editor-container-wrapper {
  display: flex;
  flex-direction: column;
  position: relative;
  background: #fff;
  /* Giữ nguyên logic resize của bạn */
}

/* --- CKEDITOR COMPONENT FIX --- */
/* Bắt buộc component angular phải fill chiều cao và dùng flex */
ckeditor {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden; /* Tránh thanh cuộn cấp cha */
  height: 100%;     /* Quan trọng */
}

/* --- DEEP STYLING CHO CKEDITOR INTERNAL STRUCTURE --- */
/* Xâm nhập vào cấu trúc DOM của CKEditor để chỉnh layout */
::ng-deep .ck.ck-editor {
  display: flex;
  flex-direction: column;
  height: 100% !important;
}

::ng-deep .ck.ck-editor__top {
  flex-shrink: 0; /* Toolbar không bị co lại */
  border-bottom: 1px solid #e5e7eb !important; /* border-gray-200 */
}

::ng-deep .ck.ck-editor__main {
  flex-grow: 1;
  overflow-y: auto !important; /* BẮT BUỘC: Thanh cuộn sẽ hiện ở đây */
  height: auto !important; /* Override style inline của lib */
}

::ng-deep .ck.ck-content {
  min-height: 100%;
  border: none !important;
  box-shadow: none !important;
  padding: 16px 20px !important; /* Padding rộng hơn chút cho thoáng */
  padding-bottom: 40px !important; /* Tránh text bị che bởi thanh footer custom */
}
Cập nhật course-curriculum.component.html:
Bạn cần thêm class editor-container-wrapper và bỏ bớt các style tính toán thủ công:
code
Html
<!-- Wrapper div -->
<div class="border border-gray-300 rounded-lg overflow-hidden bg-white relative editor-container-wrapper"
     [style.height.px]="editorHeight()">
     
    <!-- CKEditor: Bỏ style height calc đi -->
    <ckeditor
      [editor]="Editor"
      [(ngModel)]="lessonContent"
      [config]="editorConfig"
      (ready)="onEditorReady($event)">
    </ckeditor>

    <!-- Footer giữ nguyên -->
    <div class="absolute bottom-0 left-0 right-0 h-7 bg-gray-100 ...">
        <!-- content -->
    </div>
    <!-- Resize handle giữ nguyên -->
</div>
2. Ẩn dòng chữ "Powered by CKEditor"
Dòng chữ này thường xuất hiện ở dạng "Balloon" góc dưới bên phải màn hình hoặc neo vào vùng edit.
Thêm vào styles.scss (Global styles) hoặc component style với ::ng-deep:
code
Scss
/* Ẩn logo bản quyền */
::ng-deep .ck.ck-powered-by-balloon {
  display: none !important;
}

/* Ẩn các tooltip quảng cáo nếu có */
::ng-deep .ck-balloon-panel[class*="ck-powered-by"] {
  display: none !important;
}
3. Set Font mặc định là Arial
Mặc dù bạn đã có cấu hình fontFamily trong Toolbar, nhưng để editor hiển thị ngay lập tức là Arial khi chưa chọn gì, bạn cần set CSS cho .ck-content.
Trong course-curriculum.component.scss:
code
Scss
::ng-deep .ck.ck-content {
  font-family: Arial, Helvetica, sans-serif !important;
  font-size: 15px; /* Khuyên dùng 15px hoặc 16px cho dễ đọc, 13-14px hơi bé */
  line-height: 1.6; /* Tăng khoảng cách dòng cho giống văn bản chuyên nghiệp */
  color: #374151; /* text-gray-700 để dịu mắt hơn đen tuyền */
}
Đồng thời, trong file .ts config, hãy đưa Arial lên đầu list:
code
TypeScript
this.editorConfig = {
    fontFamily: {
        options: [
            'default',
            'Arial, Helvetica, sans-serif',
            'Courier New, Courier, monospace',
            'Georgia, serif',
            // ... các font khác
        ],
        supportAllValues: true
    },
    // ...
};
PHẦN 2: ĐÁNH GIÁ UX NÂNG CAO (EXPERT REVIEW)
Dựa trên đoạn mã HTML bạn gửi, tôi phát hiện thêm một số vấn đề về trải nghiệm người dùng (UX) mà bạn nên cân nhắc cải thiện cho một dự án LMS chuyên nghiệp:
1. Toolbar quá chật chội (Cluttered Toolbar)
Vấn đề: Bạn đang bật tất cả các nút (Subscript, Superscript, Code, Block Quote, Page Break, v.v.). Trong ngữ cảnh LMS Hàng hải, giảng viên thường chỉ cần các tính năng soạn thảo cơ bản và chèn ảnh/video.
Hậu quả: Người dùng bị rối mắt (Cognitive Load). Trên màn hình laptop nhỏ, toolbar sẽ bị wrap thành 3-4 dòng, chiếm mất 1/3 diện tích soạn thảo.
Đề xuất: Gom nhóm toolbar và loại bỏ nút thừa.
Config lại toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|', 'outdent', 'indent', '|', 'imageUpload', 'blockQuote', 'insertTable', '|', 'undo', 'redo'].
Sử dụng tính năng shouldNotGroupWhenFull: false để nó tự động gom vào nút "3 chấm" nếu thiếu chỗ.
2. Thiếu Placeholder (Chỉ dẫn ban đầu)
Vấn đề: Khi vào editor trống trơn, người dùng chỉ thấy một khoảng trắng.
Đề xuất: Thêm config placeholder.
code
TypeScript
this.editorConfig = {
    placeholder: 'Nhập nội dung bài học chi tiết tại đây (hỗ trợ văn bản, hình ảnh, bảng biểu)...',
    //...
}
3. Vấn đề Focus Ring (Viền xanh)
Vấn đề: Mặc định khi click vào soạn thảo, CKEditor có một viền xanh bao quanh (--ck-focus-ring). Trong thiết kế của bạn đã có viền xám (border-gray-300) ở container ngoài. Khi focus lại có thêm 1 viền nữa bên trong trông sẽ bị "kép" (double border).
Fix CSS:
code
Scss
::ng-deep .ck.ck-editor__main > .ck-editor__editable:focus {
  border: none !important;
  box-shadow: none !important; /* Loại bỏ glow xanh mặc định */
}
4. Upload Adapter UX
Vấn đề: Nút upload ảnh (ck-file-dialog-button) hiện tại đang hoạt động theo cơ chế mặc định. Nếu bạn chưa implement adapter, khi người dùng chọn ảnh, nó có thể không làm gì hoặc chèn Base64 làm treo trình duyệt như ta đã thảo luận ở các prompt trước.
Lưu ý: Hãy chắc chắn Adapter Base64 tạm thời của bạn có hiển thị Loading Indicator (thanh progress upload giả) để người dùng biết ảnh đang được xử lý.
5. Footer thông tin (Path & Word count)
Vấn đề: CSS hiện tại bottom-0 đè lên nội dung nếu nội dung dài chạm đáy.
Fix: Ở phần CSS trên tôi đã thêm padding-bottom: 40px cho .ck-content. Đây là "vùng đệm" an toàn để khi user gõ đến dòng cuối cùng, chữ không bị thanh footer che mất.
TỔNG KẾT CODE FIX (Copy đoạn này vào SCSS)
Đây là đoạn SCSS "sạch" nhất giải quyết mọi vấn đề trên:
code
Scss
/* --- CONTAINER --- */
.editor-container-wrapper {
  display: flex;
  flex-direction: column;
  position: relative;
  background: #fff;
  /* Đảm bảo border radius container hoạt động tốt */
  overflow: hidden; 
}

/* --- CKEDITOR CORE LAYOUT --- */
ckeditor {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0; /* Quan trọng cho Firefox/Flexbox nested */
}

::ng-deep .ck.ck-editor {
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
}

::ng-deep .ck.ck-editor__top {
  border-bottom: 1px solid #e2e8f0 !important;
  background: #f8fafc !important; /* Màu nền toolbar nhẹ nhàng */
  flex-shrink: 0;
}

::ng-deep .ck.ck-editor__main {
  flex-grow: 1;
  overflow: hidden; /* Main ẩn, scroll ở content */
  display: flex;
  flex-direction: column;
}

::ng-deep .ck.ck-content {
  flex-grow: 1;
  overflow-y: auto !important; /* Scroll nằm ở đây */
  padding: 20px 24px !important;
  padding-bottom: 48px !important; /* Tránh footer */
  
  /* Typography */
  font-family: Arial, Helvetica, sans-serif !important;
  font-size: 15px !important;
  line-height: 1.6 !important;
  color: #334155 !important;
}

/* --- HIDE ELEMENTS --- */
::ng-deep .ck.ck-powered-by-balloon,
::ng-deep .ck-balloon-panel[class*="ck-powered-by"] {
  display: none !important;
}

/* --- FOCUS STATE --- */
::ng-deep .ck-focused {
  border: none !important;
  box-shadow: none !important;
}