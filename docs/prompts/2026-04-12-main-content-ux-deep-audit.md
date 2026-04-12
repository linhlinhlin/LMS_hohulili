# Session Prompt: Main Content Editor UX — Deep Audit & Redesign

> **Dành cho Claude Code session tiếp theo. Copy toàn bộ nội dung này làm prompt đầu tiên.**

---

## Bối cảnh

Session 2026-04-12 đã hoàn thành:
- **Sidebar redesign hoàn chỉnh**: 3-level tree (Chương → Bài → Mục), hierarchical numbering auto từ index, drag-drop fix duplicate, kebab menu, compact empty states, font sizes tăng
- **Layout fix**: Tabs cố định vị trí (trên grid), sidebar 360px, content max-width 880px
- **Design system**: Import `_editor-shared.scss`, flat workspace thay card-based
- **Vietnamese text**: 13 jargon fixes, bỏ pre-fill prefix, strip old prefixes
- **Section editor inline**: Click mục trong sidebar → section editor mở đúng
- **E2E tests**: 5/5 pass (drag, expand, create, kebab, numbering)

**Commit chưa tạo** — tất cả thay đổi đang staged.

---

## Nhiệm vụ: Redesign Main Content Editor (Lesson Editor)

### URL test
```
http://localhost:4200/teacher/courses/{courseId}/editor/curriculum?chapterId={id}&lessonId={id}
```

### Trạng thái hiện tại

Main content area khi chọn lesson hiện:
1. **Breadcrumb** nhẹ: "Bài giảng · {title}" (vừa đổi từ card header)
2. **Tiêu đề input**: `<input class="editor-input">`
3. **Lecture sections panel**: "Nội dung (N mục)" + 4 nút thêm (+ Bài giảng, + Video, + Tài liệu, + Trắc nghiệm) + section rows
4. **Section editor inline**: Mở khi click section (Tiptap, video upload, file, quiz)
5. **Footer**: "Lưu thay đổi" button aligned right

### Vấn đề cần giải quyết

#### 1. Logic trình bày nội dung (Content Flow)
- Giảng viên thêm bài giảng → thêm sections (văn bản, video, tài liệu) → nhưng **không thấy kết quả cuối cùng**
- Cần **Preview mode** — "Học viên sẽ thấy gì?" 
- SOTA: Udemy có "Preview as Student", Teachable có "Preview Lesson"
- Cần xem xét: preview ở đâu? Tab riêng? Panel bên phải? Modal?

#### 2. Section Editor UX
- Inline section editor (slide-down panel) hoạt động nhưng **chiếm toàn bộ workspace**
- Khi editor mở → sections panel bị đẩy lên, user không thấy context
- SOTA: Udemy dùng expandable inline (accordion), Canvas dùng modal

#### 3. Section List UX
- 4 nút "+" cùng hàng với label — cramped trên mobile
- Section rows chỉ hiện title + type badge — thiếu preview/summary
- Drag-drop sections cần visual feedback rõ hơn
- Section row click → mở editor → nhưng không rõ trạng thái "đang edit" vs "đã đóng"

#### 4. Content Type Workflows
- **TEXT (Bài giảng)**: Tiptap editor — OK nhưng cần verify mobile responsive
- **VIDEO**: Upload → processing → ready — progress feedback
- **FILE**: Upload → preview PDF — cần verify
- **QUIZ**: Question bank selection — complex flow
- Mỗi type có flow riêng — cần kiểm tra từng flow

#### 5. Responsive / Mobile
- Sidebar ẩn trên mobile (overlay) — OK
- Main content cần test 375px, 768px
- Section editor panels cần responsive

---

## Quy trình bắt buộc

```
Research (cot-research) → Design → Approve → Implement → Verify (agent-browser)
```

### Đọc TRƯỚC khi bắt đầu
```
# Design guide (BẮT BUỘC)
docs/EDITOR_PAGE_DESIGN_GUIDE.md

# Main content components
fe/src/app/features/teacher/course-editor/pages/course-curriculum/course-curriculum.component.ts
fe/src/app/features/teacher/course-editor/pages/course-curriculum/course-curriculum.component.html
fe/src/app/features/teacher/course-editor/pages/course-curriculum/course-curriculum.component.scss

# Lesson editor (vừa redesign)
fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/lesson-editor/lesson-editor.component.ts

# Section editor (inline panel)
fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/section-editor.component.ts

# Lecture sections panel (section list + add buttons)
fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/lecture-sections-panel/lecture-sections-panel.component.ts
fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/lecture-sections-panel/lecture-sections-panel.component.html

# Chapter editor
fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/chapter-editor/chapter-editor.component.ts

# Services
fe/src/app/features/teacher/course-editor/services/curriculum-editor.service.ts
fe/src/app/features/teacher/course-editor/services/curriculum-selection.service.ts

# Store
fe/src/app/features/teacher/course-editor/store/course-editor.store.ts

# Student learning view (reference — "học viên thấy gì")
fe/src/app/features/learning/pages/course-learning.component.ts
fe/src/app/features/learning/pages/course-learning.component.html

# Shared editor styles
fe/src/app/features/teacher/course-editor/pages/course-info/_editor-shared.scss

# E2E tests
fe/e2e/curriculum-sidebar-drag.spec.ts
fe/e2e/curriculum-sidebar-editor-sync.spec.ts

# Memory files
C:\Users\Admin\.claude\projects\E--Sach-Sua-LMS-hohulili\memory\feedback_teacher_language.md
C:\Users\Admin\.claude\projects\E--Sach-Sua-LMS-hohulili\memory\ux_ui_guidelines.md
```

---

## Checklist đánh giá

### Content Flow & Preview
- [ ] Giảng viên có thể xem trước nội dung như học viên sẽ thấy?
- [ ] Preview mode: tab riêng, panel, hay modal?
- [ ] Preview cho từng section hay toàn bộ lesson?
- [ ] Mobile preview (responsive)?

### Section Editor UX
- [ ] Section editor mở → user có mất context không?
- [ ] Accordion pattern vs modal vs slide-in panel?
- [ ] Save/cancel flow rõ ràng?
- [ ] Unsaved changes guard?

### Section List
- [ ] 4 nút "+" responsive trên mobile?
- [ ] Section rows có đủ info (title, type, preview)?
- [ ] Drag-drop visual feedback?
- [ ] Empty state khi chưa có section?

### Content Types
- [ ] TEXT: Tiptap editor responsive? Image/video embed?
- [ ] VIDEO: Upload progress? Processing status? Player preview?
- [ ] FILE: Upload? PDF preview? Download link?
- [ ] QUIZ: Question selection flow? Settings inline?

### Responsive
- [ ] 375px mobile
- [ ] 768px tablet
- [ ] 1920px desktop
- [ ] Section editor panels responsive?

### SOTA Comparison
- [ ] Udemy lesson editor workflow
- [ ] Canvas content editor
- [ ] Teachable lesson builder
- [ ] Coursera Course Builder

---

## Design Tokens (từ _editor-shared.scss)

```scss
--editor-card-radius: 0.625rem;
--editor-control-radius: 0.5rem;
--editor-card-border: rgb(217 226 236);
--editor-control-border: rgb(193 204 218);

// Primary: #0056D2
// Labels: 0.875rem, font-weight 600, color rgb(51 65 85)
// Hints: 0.75rem, color rgb(100 116 139)
// Cards: bg-white, border, shadow-sm
// Page BG: bg-slate-50
```

## SKILLs nên dùng

1. **`cot-research`** — Nghiên cứu SOTA lesson editor workflows
2. **`brainstorming`** — Đánh giá preview mode options
3. **`agent-browser`** — Screenshot trước/sau, verify trên browser
4. **`audit`** — Đánh giá accessibility, responsive
5. **`frontend-design`** — Implement nếu cần redesign lớn

## Quy tắc bắt buộc

- **KHÔNG code trước khi nghiên cứu xong** — research → design → approve → implement
- **Đọc `docs/EDITOR_PAGE_DESIGN_GUIDE.md` TRƯỚC**
- **Mọi text viết cho giảng viên** — không jargon kỹ thuật
- **Tuân thủ design tokens** — `#0056D2`, `rounded-lg`, `slate-` scale
- **Vietnamese UI** — tiếng Việt có dấu, capitalize first word only
- **Angular 20+** — signals, inject(), OnPush, viewChild(), computed()
- **Karpathy Guidelines** — Think before coding, simplicity first, surgical changes
- **E2E test** — Playwright verify mọi thay đổi

## Kết quả mong đợi

1. Bản phân tích SOTA chi tiết (lesson editor workflow comparison)
2. Preview mode design (nếu cần)
3. Section editor UX improvements
4. Section list redesign (nếu cần)
5. Responsive verification (375px, 768px, 1920px)
6. Tất cả committed + E2E pass

---

*Tạo bởi Claude Code session 2026-04-12. Session trước đã hoàn thành sidebar redesign.*
