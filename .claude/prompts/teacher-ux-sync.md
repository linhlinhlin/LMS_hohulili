# Session Prompt: Teacher Portal UX/UI Sync & Polish

## BƯỚC 1 — NGHIÊN CỨU TRƯỚC (BẮT BUỘC, KHÔNG BỎ QUA)

Trước khi sửa BẤT KỲ dòng code nào, PHẢI nghiên cứu sâu:

### 1.1 Nghiên cứu SOTA Teacher Portal từ các nền tảng hàng đầu:
- **Canvas LMS** (Instructure) — Teacher dashboard, course management, gradebook, analytics
- **Moodle** — Teacher workspace, course editing, grading interface
- **Coursera for Campus** — Instructor dashboard, course analytics, student management
- **edX Studio** — Course authoring, content management, instructor tools
- **Google Classroom** — Teacher view, assignment management, class stream
- **Blackboard Learn** — Instructor dashboard, grade center, course tools

### 1.2 Phân tích từng trang teacher cần sync:
Với MỖI trang, tạo bảng so sánh:
| Trang | Hiện tại (LMS) | Canvas | Moodle | Coursera | Gap | Action |
|-------|---------------|--------|--------|----------|-----|--------|

### 1.3 Tham khảo UX/UI chuyên gia:
- Nielsen Norman Group — Dashboard design patterns, data-heavy interfaces
- Material Design — Teacher/admin patterns, data tables, forms
- Shopify Polaris — Admin management patterns
- Apple HIG — Content management, list/detail patterns

### 1.4 Khảo sát code hiện tại:
- Đọc TẤT CẢ teacher components, liệt kê vấn đề UX/UI
- So sánh với student portal đã hoàn thiện
- Xác định ưu tiên P0/P1/P2

### 1.5 Output nghiên cứu:
Trình bày kết quả nghiên cứu CHO USER XEM TRƯỚC khi code:
- Bảng so sánh SOTA
- Danh sách vấn đề P0/P1/P2
- Đề xuất thiết kế cho từng trang
- User xác nhận → mới bắt đầu code

**KHÔNG viết code trước khi user xác nhận kết quả nghiên cứu.**

---

## BƯỚC 2 — Mục tiêu thực thi
Đồng bộ UX/UI teacher portal với student portal đã hoàn thiện. Student đã xong — teacher cần match cùng chuẩn.

## BẮT BUỘC đọc trước:
1. **`CLAUDE.md`** — project overview, architecture, conventions
2. **`fe/UX_UI_GUIDELINES.md`** — design tokens, spacing, button layout, responsive rules
3. **Memory** — đọc `session_messaging_announcements_rewrite.md` để hiểu các thay đổi vừa làm
4. **Student pages** — tham khảo trực tiếp code student để match:
   - `fe/src/app/features/student/student-my-courses.component.ts` — tabs, load-more, skeleton pattern
   - `fe/src/app/features/student/assignments/student-assignments-page.component.html` — pill tabs, filter, card layout
   - `fe/src/app/features/student/announcements/` — tách file .ts/.html/.scss pattern

## Trạng thái hiện tại:

### Student (ĐÃ XONG):
- ✅ Khóa học của tôi — tabs, load-more, skeleton, responsive
- ✅ Bài cần làm — pill tabs, filter, responsive  
- ✅ Kết quả — expanded grades
- ✅ Tin nhắn — Messenger pattern, desktop split layout, mobile full-screen
- ✅ Thông báo — Canvas pattern, tabs, load-more, course names
- ✅ Lưu trữ ngoại tuyến
- ❌ Phân tích — chưa xong (có lỗi build analytics component)

### Teacher (CẦN SYNC):
- Kiểm tra từng trang teacher, so sánh với student tương ứng
- Dashboard, Courses, Assessments, Analytics, Revenue, Messages, Announcements
- Focus: consistent design tokens, responsive mobile, tabs pattern, skeleton, load-more

## Quy tắc QUAN TRỌNG:

### Design Tokens (PHẢI tuân thủ):
```
Primary: #0056D2 | Hover: #004BB5
Cards: bg-white rounded-lg border border-gray-200 (8px, KHÔNG rounded-xl)
Page BG: bg-slate-50
Max width: max-w-[1400px] px-4 sm:px-6
Tabs: pill chips rounded-full border px-3.5 py-1.5 text-sm (inline Tailwind, KHÔNG SCSS)
Load More: GitHub pattern — button + "Đang hiện X / Y"
Red: CHỈ semantic (errors, destructive)
```

### Angular 20+ Conventions:
- `standalone: true` là DEFAULT — KHÔNG ghi ra
- `inject()` thay constructor
- `signal()`, `computed()`, `input()`, `output()`
- `ChangeDetectionStrategy.OnPush` — 100%
- Components lớn (200+ lines template): tách `templateUrl` + `styleUrl`
- Components nhỏ: inline template OK
- `[class.xxx]="boolean"` — KHÔNG `[class]="string"` (đè static classes)

### Responsive Mobile:
- Header: `sticky top-0` + `max-h` collapse animation khi full-screen views
- Bottom nav: `translate-y-full` animation
- Touch targets: 44x44px minimum
- Text: min 14px trên mobile
- `flex-wrap` cho tabs trên mobile

### Testing:
- Playwright E2E cho các trang quan trọng
- `--workers=1` nếu bị rate limit
- Login accounts: `tranngocdai@maritime.edu` / `Maritime@2026` (teacher)

### Lưu ý từ session trước:
- `[class]="string"` REPLACES static classes → luôn dùng `[class.xxx]="boolean"`
- `min-h-screen` trên wrapper phá `sticky` → dùng content-based height
- `overflow: hidden` trên parent phá `sticky` → chỉ dùng khi cần
- Messages layout: `display: block` trên mobile inbox, `flex` chỉ desktop/conversation
- Analytics component có lỗi build pre-existing (scss import) — cần stash khi build

## Files reference:
- Student layout: `fe/src/app/features/student/shared/student-layout-simple.component.ts`
- Teacher layout: `fe/src/app/features/teacher/shared/teacher-layout-simple.component.ts`
- Sidebar config: `fe/src/app/shared/components/navigation/sidebar.config.ts`
- Design guidelines: `fe/UX_UI_GUIDELINES.md`
