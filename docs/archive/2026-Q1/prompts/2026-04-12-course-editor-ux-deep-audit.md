# Session Prompt: Course Editor UX Deep Audit & Layout Fix

> **Dành cho Claude Code session tiếp theo. Copy toàn bộ nội dung này làm prompt đầu tiên.**

---

## Bối cảnh

Session 2026-04-11 đã thực hiện:
- Header redesign: `[←] Title [Xuất bản ▾]` + tabs `gap-6` match student page
- Decompose course-info 960 LOC → 8 files (service + 6 sections + parent shell)
- Pill tabs navigation (1 section tại 1 thời điểm, Coursera/Udemy pattern)
- SCSS normalization (flat cards, 4px grid, standard font scale)
- Tiptap duplicate extension fix
- 14 text jargon → ngôn ngữ giảng viên
- Credits field xóa khỏi UI (orphaned)
- Backend API 500 defensive fixes
- Sidebar touch targets + highlights

**Vấn đề còn lại (user feedback cuối session)**:
1. Không gian trang editor quá trống — đặc biệt các section ít fields (Học phí: 2 fields, Trải nghiệm: 2 fields) để lại ~60% viewport trắng
2. Teacher portal sidebar (menu trái: Khóa học, Học viên, Phân tích...) biến mất khi vào editor → cảm giác "nhầm app"
3. Tab "Nội dung" có sidebar riêng (curriculum tree) → conflict nếu thêm app sidebar

---

## Nhiệm vụ

### 1. Nghiên cứu SOTA — Layout cho course editor

Dùng `cot-research` + `agent-browser` để phân tích:

**a) App shell consistency:**
- Coursera: sidebar navigation có duy trì khi vào editor không?
- Canvas LMS: global nav sidebar có ẩn trong editing mode không?
- Udemy: teacher sidebar checklist pattern
- Notion: sidebar luôn hiện, content area thay đổi
- Google Classroom: có sidebar navigation trong teacher view không?

**b) Empty space handling trên các platform:**
- Khi section chỉ có 2-3 fields, SOTA editor làm gì?
- Center content vertically? Giữ top-aligned? Thêm sidebar?
- Max-width cho form content: 600px? 720px? 800px?

**c) Dual sidebar conflict resolution:**
- Nếu app sidebar + curriculum sidebar cùng tồn tại, cách nào để không confuse?
- Canvas: global nav (icon strip 60px) + course nav (expandable sidebar)
- VS Code: activity bar (icon strip) + sidebar panel (expandable)

### 2. Đánh giá 3 phương án layout

**Option A: Giữ nguyên full-screen editor (hiện tại)**
- Pro: Clean, focused editing
- Con: Trống, mất continuity với app

**Option B: Giữ app sidebar (collapsed/icon-only) + editor content**
```
[Icon sidebar 56px] | [Header + Tabs + Content]
📚 Khóa học           |  [←] Title        [Xuất bản ▾]
👥 Học viên           |  Thông tin  Nội dung  Cài đặt
📊 Phân tích          |  [Pills: Cơ bản | Mô tả | ...]
💰 Doanh thu          |  [Card content]
```
- Pro: Teacher luôn biết mình đang ở đâu trong app
- Con: Sidebar icon-only có thể confusing, thêm complexity

**Option C: Sidebar settings navigation (Udemy pattern)**
```
[← Quay lại]           |  [Card content - full width]
─────────────           |
● Cơ bản                |  Thông tin cơ bản
○ Mô tả                 |  ...fields...
○ Trải nghiệm           |
○ Ảnh & video            |
○ Hiển thị               |
○ Học phí                |
──────────              |
▸ Nội dung (12 bài)     |
──────────              |
▸ Cài đặt               |
```
- Pro: Xóa top tabs + pills → 1 navigation system, fill empty space, scalable
- Con: Refactor lớn (merge tabs + pills → sidebar routes)

### 3. Đánh giá chi tiết UX từng section

Dùng `audit` skill để đánh giá mỗi section trên:
- Desktop 1440px, Tablet 768px, Mobile 375px
- Spacing analysis (4px grid compliance)
- Visual hierarchy (label > input > hint)
- Color contrast (WCAG AA)
- Interaction states (hover, focus, error, disabled)
- Vietnamese text review (dấu, capitalize, ngôn ngữ giảng viên)

### 4. Các vấn đề cụ thể cần kiểm tra

- [ ] Card header `bg-slate-50` trên nền `bg-slate-50` → có contrast đủ không?
- [ ] Upload dropzone: hover state, focus state khi tab navigation
- [ ] Choice cards: keyboard navigation (Tab + Space/Enter)
- [ ] Tag buttons: hover state, remove confirmation?
- [ ] Save bar: test trên mobile (stack vertical)
- [ ] Error summary: test với multiple errors
- [ ] Tiptap editor: toolbar overflow trên mobile
- [ ] Select dropdowns: native vs custom styling consistency

### 5. Implement

Sau khi nghiên cứu và chọn layout option, implement:
- Clean code, clean architecture
- Angular 20+: signals, inject(), OnPush, NO standalone: true
- Tuân thủ design tokens: `#0056D2` primary, `slate-` text scale
- Mọi text viết cho giảng viên, không phải developer
- Skeleton loading cho mỗi section
- Responsive: mobile-first

---

## Files quan trọng cần đọc

```
# Course editor layout
fe/src/app/features/teacher/course-editor/layouts/course-editor-layout/course-editor-layout.component.ts
fe/src/app/features/teacher/course-editor/layouts/course-editor-layout/course-editor-layout.component.scss

# Header
fe/src/app/features/teacher/course-editor/components/header/header.component.ts

# Course info page (parent + service)
fe/src/app/features/teacher/course-editor/pages/course-info/course-info.component.ts
fe/src/app/features/teacher/course-editor/pages/course-info/course-info.component.html
fe/src/app/features/teacher/course-editor/pages/course-info/course-info.component.scss
fe/src/app/features/teacher/course-editor/pages/course-info/course-info-form.service.ts
fe/src/app/features/teacher/course-editor/pages/course-info/_editor-shared.scss

# Course info sections
fe/src/app/features/teacher/course-editor/pages/course-info/sections/course-info-basic.component.ts
fe/src/app/features/teacher/course-editor/pages/course-info/sections/course-info-description.component.ts
fe/src/app/features/teacher/course-editor/pages/course-info/sections/course-info-learner.component.ts
fe/src/app/features/teacher/course-editor/pages/course-info/sections/course-info-media.component.ts
fe/src/app/features/teacher/course-editor/pages/course-info/sections/course-info-visibility.component.ts
fe/src/app/features/teacher/course-editor/pages/course-info/sections/course-info-pricing.component.ts

# Sidebar (curriculum tree)
fe/src/app/features/teacher/course-editor/components/sidebar/sidebar.component.ts

# Teacher portal sidebar (for reference — app-level sidebar)
fe/src/app/features/teacher/teacher.routes.ts

# Student pages (design language reference)
fe/src/app/features/student/assignments/student-assignments-page.component.html
fe/src/app/features/learning/pages/course-learning.component.html

# Design system
fe/src/styles.scss
fe/UX_UI_GUIDELINES.md

# Memory files
C:\Users\Admin\.claude\projects\E--Sach-Sua-LMS-hohulili\memory\session_header_sidebar_redesign.md
C:\Users\Admin\.claude\projects\E--Sach-Sua-LMS-hohulili\memory\feedback_teacher_language.md
C:\Users\Admin\.claude\projects\E--Sach-Sua-LMS-hohulili\memory\ux_ui_guidelines.md
```

## Quy tắc bắt buộc

- **KHÔNG code trước khi nghiên cứu xong** — research → design → approve → implement
- **Mọi text viết cho giảng viên** — không jargon kỹ thuật (metadata, pipeline, asset, catalog)
- **Tuân thủ design tokens** — `#0056D2`, `rounded-lg`, `slate-` scale
- **Vietnamese UI** — tiếng Việt có dấu, capitalize first word only
- **Mobile-first** — test 375px trước, 768px, rồi 1440px
- **Clean architecture** — mỗi component 1 trách nhiệm, ≤200 LOC
- **Angular 20+** — signals, inject(), OnPush, viewChild(), computed()
- **Tham khảo SOTA** — Coursera, Canvas, Udemy, Notion, GOV.UK Design System
- **Không AI slop** — không gradient cards, không generic subtitles, không dual shadows

## SKILLs nên dùng

1. **`cot-research`** — Nghiên cứu SOTA layout patterns
2. **`agent-browser`** — Chụp screenshots trước/sau
3. **`audit`** — Đánh giá accessibility, responsive, visual hierarchy
4. **`frontend-design`** — Implement nếu cần redesign layout
5. **`adapt`** — Responsive testing

## Kết quả mong đợi

1. Bản phân tích SOTA chi tiết (comparison table)
2. Chọn layout option (A/B/C) với rationale
3. Implementation nếu cần thay đổi layout
4. Screenshots before/after
5. Tất cả committed

---

*Tạo bởi Claude Code session 2026-04-11.*
