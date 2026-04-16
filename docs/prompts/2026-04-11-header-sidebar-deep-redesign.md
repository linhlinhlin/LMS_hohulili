# Session Prompt: Header & Sidebar Deep Redesign — SOTA 2026

> **Dành cho Claude Code session tiếp theo. Copy toàn bộ nội dung này làm prompt đầu tiên.**

---

## Bối cảnh

Session trước (2026-04-11) đã thực hiện 14 commits trên trang Teacher Course Editor:
- Tiptap thay CKEditor (MIT thay GPL)
- Decompose God component 2,332 LOC → 6 focused components + CurriculumEditorService
- UX fixes: mobile sidebar, section icons, whitespace, compact header

**Nhưng header vẫn gây khó chịu và bối rối cho người dùng.** Vấn đề gốc: quá nhiều thông tin (8 items) trong 1 hàng mà không có visual hierarchy rõ ràng.

## Nhiệm vụ cụ thể

### 1. Nghiên cứu SOTA — PHẢI làm trước khi code

Dùng các SKILL phù hợp (`cot-research`, `brainstorming`, `agent-browser`) để:

**a) Chụp screenshot thực tế** của header/navigation từ:
- **Coursera** instructor course editor (teach.coursera.org nếu có, hoặc tìm screenshot)
- **Canvas LMS** module editor header
- **Notion** page header (compact, clean)
- **Linear** project view header (minimal, focused)
- **Figma** file editor header
- **Google Classroom** teacher view

**b) Phân tích từng platform:**
- Header chiếm bao nhiêu px chiều cao?
- Có bao nhiêu items trong header?
- Visual hierarchy: item nào nổi bật nhất?
- Breadcrumb pattern: inline hay separate row?
- Save status: hiện ở đâu, kích thước nào?
- Primary action (publish/share): vị trí, style?

**c) So sánh với header hiện tại** của LMS Maritime:
```
Hiện tại: [← Back] [≡ Sidebar] [Course Title] | [Đã lưu ✓] [5/8] [Xem trước] [Xuất bản]
         [Thông tin] [Nội dung] [Cài đặt]
         [≡ > Chương 1: d > Bài 1: vs]
= 3 hàng, 8+ items, ~112px vertical space
```

### 2. Đánh giá UX audit

Dùng SKILL `cot-research` hoặc `audit` để đánh giá:

**Nguyên tắc UX cần tuân thủ:**
- **Hick's Law**: Nhiều lựa chọn = thời gian quyết định tăng. Header có quá nhiều actions?
- **Fitts' Law**: Primary action (Xuất bản) phải dễ target nhất
- **Visual Hierarchy**: Mắt đọc từ trái → phải, từ trên → dưới. Item quan trọng nhất phải ở vị trí focal point
- **Progressive Disclosure**: Chỉ hiện gì cần thiết, ẩn phần còn lại vào menu
- **Consistency**: Header pattern phải giống nhau trên mọi tab (info, curriculum, settings)

**Câu hỏi cần trả lời:**
1. Teacher đang edit curriculum — thực sự CẦN thấy gì ở header?
2. "5/8 readiness" có cần hiện permanent không? Hay chỉ khi hover?
3. "Xem trước" có cần nút riêng không? Hay đặt trong dropdown?
4. Save status có cần hiện khi "Đã lưu" không? Canvas chỉ hiện khi unsaved.
5. Breadcrumb cần không? Sidebar đã hiện hierarchy rồi.

### 3. Đề xuất thiết kế mới

Sau nghiên cứu, đề xuất **2-3 phương án** header, ví dụ:

**Option A: Canvas minimal**
```
[← ] [Course Title ▾] [Thông tin | Nội dung | Cài đặt]     [Xuất bản]
```

**Option B: Notion compact**
```
[← ] [≡] [Course Title] / [Chương 1] / [Bài 1]     [⚡ Unsaved] [Xuất bản]
```

**Option C: Linear focused**
```
[← Course Title]  [Thông tin | Nội dung | Cài đặt]  [•Chưa lưu] [▶ Xem trước] [Xuất bản]
```

### 4. Fix API 500 error

Endpoint: `GET /api/v3/courses/lessons/3d9ef70d-5d57-4db1-ab48-a0de411aeb97`
- Returns 500 Internal Server Error
- Toast hiện "Không thể tải chi tiết bài học"
- Check backend logs, controller, use case, JPA query
- Có thể lesson ID không tồn tại hoặc data mapping error

### 5. Sidebar issues cần fix

- Click expand arrow trên chapter đôi khi trigger "Thêm bài học" popup thay vì expand
- Sidebar highlight cho lesson đang chọn không rõ ràng
- "CẤU TRÚC KHÓA HỌC" uppercase header chiếm space

## Files quan trọng cần đọc

```
# Header
fe/src/app/features/teacher/course-editor/components/header/header.component.ts

# Layout (tabs + breadcrumb + sidebar grid)
fe/src/app/features/teacher/course-editor/layouts/course-editor-layout/course-editor-layout.component.ts
fe/src/app/features/teacher/course-editor/layouts/course-editor-layout/course-editor-layout.component.scss

# Sidebar
fe/src/app/features/teacher/course-editor/components/sidebar/sidebar.component.ts

# Design system
fe/src/styles.scss (design tokens)
fe/UX_UI_GUIDELINES.md
C:\Users\Admin\.claude\projects\E--Sach-Sua-LMS-hohulili\memory\ux_ui_guidelines.md

# Context từ session trước
C:\Users\Admin\.claude\projects\E--Sach-Sua-LMS-hohulili\memory\session_header_sidebar_audit.md
C:\Users\Admin\.claude\projects\E--Sach-Sua-LMS-hohulili\memory\session_curriculum_decomposition.md
```

## SKILLs nên dùng (theo thứ tự)

1. **`cot-research`** — Nghiên cứu SOTA header patterns, so sánh industry leaders
2. **`agent-browser`** — Chụp screenshots thực tế từ Coursera/Canvas/Notion
3. **`brainstorming`** — Đề xuất 2-3 header design options, chọn best
4. **`audit`** — Đánh giá accessibility, responsive, visual hierarchy
5. **`frontend-design`** — Implement header mới sau khi approved

## Quy tắc bắt buộc

- **KHÔNG code trước khi nghiên cứu xong** — research → design → approve → implement
- **KHÔNG thêm features** — chỉ simplify, remove clutter
- **Đánh giá bằng screenshots thực tế** — dùng agent-browser chụp before/after
- **Tuân thủ design tokens** — `#0056D2` primary, `rounded-lg` buttons, design system trong `styles.scss`
- **Vietnamese UI** — tất cả text tiếng Việt có dấu, capitalize first word only
- **Mobile-first** — test viewport 375px trước, rồi 768px, rồi 1440px
- **Toán học trong thiết kế** — spacing theo 4px grid (4, 8, 12, 16, 24, 32), visual hierarchy theo golden ratio

## Kết quả mong đợi

1. Bản đánh giá SOTA chi tiết (comparison table)
2. 2-3 design options cho header mới
3. Header redesigned và verified bằng screenshots
4. API 500 fixed
5. Sidebar click target issue fixed
6. Tất cả committed và pushed

---

*Tạo bởi Claude Code session 2026-04-11. Dùng làm prompt cho session tiếp theo.*
