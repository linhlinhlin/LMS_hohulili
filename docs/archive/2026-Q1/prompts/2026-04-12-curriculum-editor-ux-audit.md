# Session Prompt: Curriculum Editor (Nội dung) UX Audit & Improvements

> **Dành cho Claude Code session tiếp theo. Copy toàn bộ nội dung này làm prompt đầu tiên.**

---

## Bối cảnh

Session 2026-04-12 đã hoàn thành trang **Thông tin** (Course Info):
- Scroll-spy sidebar + stacked sections (GitHub Settings pattern)
- 5 sections: Cơ bản → Ảnh & video → Mô tả khóa học → Hiển thị → Học phí
- Section "Trải nghiệm" xóa, gộp "Bạn sẽ học được gì" vào Mô tả
- Vietnamese text audit — 7 jargon fixes
- Tiptap: image resize (WebP, max 1920×1080) + video upload (presigned R2)
- Completion dots (xanh lá = filled, xanh dương = active, xám = empty)
- Skeleton fix, tab micro UX (hover bg, compact padding)
- Design guide: `docs/EDITOR_PAGE_DESIGN_GUIDE.md`

**Commit**: `262a8534` — `feat: course info page UX deep audit`

---

## Nhiệm vụ: Audit & cải thiện trang Nội dung (Curriculum)

### Trạng thái hiện tại

| Metric | Value |
|--------|-------|
| Main component | `course-curriculum.component.ts` — **1,607 LOC** |
| Sub-components | 8 components — **1,502 LOC** |
| Tổng | **3,109 LOC** |
| Features | Drag-drop chapters/sections, CRUD, video upload, quiz/assignment integration |
| Services | 12 injected services |

### Vấn đề tiềm ẩn cần kiểm tra

1. **Main component 1,607 LOC** — có cần decompose không? (Course Info đã decompose từ 960 → 5 components)
2. **Section editor inline** — UX phù hợp hay nên modal/panel?
3. **Vietnamese text** — kiểm tra jargon (legacy, pipeline, metadata, asset)
4. **Empty states** — "Bắt đầu xây dựng nội dung" có đủ helpful không?
5. **Drag-drop UX** — touch targets, visual feedback, handle size
6. **Legacy video migration** — copy dài dòng, giảng viên có hiểu không?
7. **Skeleton loading** — có match layout không?
8. **Keyboard navigation** — Ctrl+S, Esc, Tab order
9. **Consistency với trang Thông tin** — card style, spacing, colors

---

## Quy trình bắt buộc

```
Research (cot-research) → Design → Approve → Implement → Verify (agent-browser)
```

### Đọc TRƯỚC khi bắt đầu

```
# Design guide (BẮT BUỘC đọc đầu tiên)
docs/EDITOR_PAGE_DESIGN_GUIDE.md

# Curriculum components
fe/src/app/features/teacher/course-editor/pages/course-curriculum/course-curriculum.component.ts
fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/section-editor.component.ts
fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/lesson-editor/lesson-editor.component.ts
fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/chapter-editor/chapter-editor.component.ts

# Sidebar (curriculum tree)
fe/src/app/features/teacher/course-editor/components/sidebar/sidebar.component.ts

# Services
fe/src/app/features/teacher/course-editor/services/curriculum-editor.service.ts
fe/src/app/features/teacher/course-editor/services/curriculum-selection.service.ts

# Reference: Course Info page (pattern to follow)
fe/src/app/features/teacher/course-editor/pages/course-info/course-info.component.ts
fe/src/app/features/teacher/course-editor/pages/course-info/_editor-shared.scss

# Memory files
C:\Users\Admin\.claude\projects\E--Sach-Sua-LMS-hohulili\memory\feedback_teacher_language.md
C:\Users\Admin\.claude\projects\E--Sach-Sua-LMS-hohulili\memory\ux_ui_guidelines.md
```

---

## Checklist đánh giá (từ Design Guide)

### Layout & Structure
- [ ] Sidebar curriculum tree — touch targets ≥ 44px?
- [ ] Chapter/lesson hierarchy — visual indent rõ ràng?
- [ ] Empty state — helpful onboarding hay generic text?
- [ ] Skeleton match layout thật?
- [ ] Section editor panel — position, size, animation?

### Form & Interaction
- [ ] Drag-drop: visual feedback (placeholder line, opacity change)?
- [ ] Drag-drop: touch device delay?
- [ ] Save: auto-save hay manual? Feedback rõ ràng?
- [ ] Delete: confirmation dialog cho destructive actions?
- [ ] Add chapter/lesson: flow trực quan?

### Content Types
- [ ] LECTURE → section editor (TEXT/VIDEO/FILE) — flow rõ ràng?
- [ ] QUIZ → quiz integration — inline hay redirect?
- [ ] ASSIGNMENT → assignment settings — inline hay redirect?
- [ ] Video upload — dùng presigned pipeline (R2)?

### Vietnamese Text
- [ ] Tất cả tiếng Việt có dấu
- [ ] Không jargon (legacy, pipeline, metadata, asset, render, hydrate)
- [ ] Error messages viết cho giảng viên
- [ ] Labels/hints descriptive

### Accessibility
- [ ] ARIA tree roles cho sidebar
- [ ] Keyboard: Tab order hợp lý
- [ ] Focus management khi add/delete items
- [ ] Color contrast WCAG AA

### SOTA Comparison
- [ ] So sánh với Udemy curriculum builder
- [ ] So sánh với Canvas module editor
- [ ] So sánh với Coursera Course Builder
- [ ] Inline editing vs modal editing pattern

---

## Design Tokens (từ _editor-shared.scss)

```scss
--editor-card-radius: 0.625rem;      // 10px
--editor-control-radius: 0.5rem;     // 8px
--editor-card-border: rgb(217 226 236);
--editor-control-border: rgb(193 204 218);

// Cards: bg-white, border, shadow-sm
// Page BG: bg-slate-50
// Primary: #0056D2
// Labels: 0.875rem, font-weight 600, color rgb(51 65 85)
// Hints: 0.75rem, color rgb(100 116 139)
```

## SKILLs nên dùng

1. **`cot-research`** — Nghiên cứu SOTA curriculum builder patterns
2. **`agent-browser`** — Screenshot trước/sau, verify trên browser
3. **`audit`** — Đánh giá accessibility, responsive, visual hierarchy
4. **`brainstorming`** — Đánh giá nếu cần decompose 1,607 LOC component

## Quy tắc bắt buộc

- **KHÔNG code trước khi nghiên cứu xong** — research → design → approve → implement
- **Đọc `docs/EDITOR_PAGE_DESIGN_GUIDE.md` TRƯỚC** — tuân thủ mọi pattern
- **Mọi text viết cho giảng viên** — không jargon kỹ thuật
- **Tuân thủ design tokens** — `#0056D2`, `rounded-lg`, `slate-` scale
- **Vietnamese UI** — tiếng Việt có dấu, capitalize first word only
- **Mobile-first** — test 375px trước, 768px, rồi 1440px
- **Clean architecture** — mỗi component 1 trách nhiệm, ≤ 300 LOC ideal
- **Angular 20+** — signals, inject(), OnPush, viewChild(), computed()
- **Không AI slop** — không gradient cards, không generic subtitles, không dual shadows

## Kết quả mong đợi

1. Bản phân tích SOTA chi tiết (comparison table)
2. Vietnamese text audit — danh sách jargon cần fix
3. UX improvements (nếu cần)
4. Component decompose (nếu 1,607 LOC quá lớn)
5. Screenshots before/after
6. Tất cả committed

---

*Tạo bởi Claude Code session 2026-04-12. Ref commit: 262a8534*
