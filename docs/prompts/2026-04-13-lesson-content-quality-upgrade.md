# Session Prompt: Nâng cấp chất lượng bài giảng — từ "text thuần" thành "bài giảng chuyên nghiệp"

> **Dành cho Claude Code session tiếp theo. Copy toàn bộ nội dung này làm prompt đầu tiên.**

---

## Bối cảnh

Session 2026-04-12/13 đã hoàn thành:
- **Section editor redesign**: editor-card pattern, bỏ double scroll, expand/collapse full-screen
- **"Thêm nội dung" dropdown**: thay 4 nút riêng, SOTA Udemy/Notion pattern
- **Section rows**: status dot + content snippet
- **Preview toggle**: "Chỉnh sửa | Xem trước" inline + full student preview route `/teacher/courses/:id/preview`
- **Student prose styling**: headings, lists, tables, blockquote, highlight, YouTube iframe responsive
- **Title prefix stripping**: "Chương N:", "Bài N:", "N.M:" auto-removed
- **Tiptap click-to-focus**: click vùng trắng trống → auto focus editor
- **Backend security**: `verifyCourseAccess()` — private/unpublished courses blocked cho non-owner
- **4 commits**: `7d0e9fde`, `d49d5966`, `0350ea0d`, `f1e5e490`

---

## Vấn đề cốt lõi

Hiện tại, bài giảng teacher tạo ra trông giống **"trang text"** hơn là **"bài giảng chuyên nghiệp"**.

So sánh:
| Hiện tại | Mong muốn (SOTA) |
|----------|------------------|
| Headings + paragraphs thuần | Headings có visual hierarchy rõ (spacing, color, weight) |
| Text liên tục không ngắt | Sections chia rõ: text → media → callout → practice |
| Không có callout/highlight box | Info box, warning box, tip box (Notion/Gitbook pattern) |
| Hình ảnh raw (không caption) | Hình ảnh có caption, responsive, zoom-on-click |
| Không có embed interactive | Embed code sandbox, diagram, interactive quiz inline |
| Video chỉ là link/upload | Video player tích hợp với timestamp, chapters |
| Bảng basic | Bảng có header styling, alternating rows, responsive overflow |
| Không có progress/reading indicator | Reading progress, estimated time |

**Mục tiêu**: Teacher tạo bài giảng trông giống **Notion page, Gitbook docs, hoặc Coursera reading material** — không phải Word document.

---

## Nhiệm vụ: Nghiên cứu + Implement

### Phase 1: Nghiên cứu SOTA (BẮT BUỘC trước khi code)

Dùng `cot-research` nghiên cứu:
1. **Coursera Reading Material** — layout, typography, callout boxes, media handling
2. **Notion page rendering** — block types, callout, toggle, divider, table of contents
3. **Gitbook/Docusaurus** — info/warning/tip admonitions, code blocks, tabs
4. **edX course content** — interactive elements, knowledge checks inline
5. **Khan Academy** — lesson structure, video + text interleave, practice exercises

Output: bảng so sánh feature matrix + đề xuất cụ thể cho LMS Maritime.

### Phase 2: Cải thiện Tiptap Editor (công cụ tạo nội dung)

Kiểm tra và bổ sung extensions:
- **Callout/Admonition blocks**: Info (xanh), Warning (vàng), Tip (xanh lá), Danger (đỏ)
- **Image caption**: `<figure>` + `<figcaption>` thay vì `<img>` raw
- **Table of Contents**: auto-generate từ headings
- **Divider**: `<hr>` có styling (không chỉ đường kẻ)
- **Toggle/Accordion**: nội dung ẩn/hiện (FAQ, chi tiết bổ sung)
- **Code block** cải thiện: syntax highlighting, copy button
- **Embed**: YouTube responsive, iframe sandbox

### Phase 3: Cải thiện Student Rendering (giao diện học viên)

Nâng cấp `.prose` styling trong `lesson-content.component.scss`:
- Callout boxes rendering
- Image figure + caption
- Table responsive (horizontal scroll trên mobile)
- Code block với syntax highlighting
- Reading time estimate
- Section anchors + scroll-to

### Phase 4: Template bài giảng (nice-to-have)

- Teacher chọn template khi tạo bài giảng mới
- Templates: "Bài giảng lý thuyết", "Thực hành", "Case study", "Lab report"
- Mỗi template có cấu trúc sẵn (headings + placeholder text)

---

## URL test

```
# Teacher editor
http://localhost:4200/teacher/courses/{courseId}/editor/curriculum?chapterId={id}&lessonId={id}

# Student preview (teacher xem như học viên)
http://localhost:4200/teacher/courses/{courseId}/preview

# Student learning (cần enrollment)
http://localhost:4200/learning/course/{courseId}
```

---

## Đọc TRƯỚC khi bắt đầu

```
# Design guide
docs/EDITOR_PAGE_DESIGN_GUIDE.md

# Tiptap editor component (toolbar, extensions, styles)
fe/src/app/shared/components/tiptap-editor/tiptap-editor.component.ts

# Student prose rendering
fe/src/app/features/learning/components/lesson-content/lesson-content.component.scss
fe/src/app/features/learning/components/lesson-content/lesson-content.component.html

# Section editor (nơi teacher nhập nội dung)
fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/section-editor/section-editor.component.ts

# Tiptap upload helpers
fe/src/app/shared/components/tiptap-editor/tiptap-upload.ts

# Editor shared styles
fe/src/app/features/teacher/course-editor/pages/course-info/_editor-shared.scss

# Memory files
C:\Users\Admin\.claude\projects\E--Sach-Sua-LMS-hohulili\memory\session_main_content_editor_ux_audit.md
C:\Users\Admin\.claude\projects\E--Sach-Sua-LMS-hohulili\memory\feedback_teacher_language.md
C:\Users\Admin\.claude\projects\E--Sach-Sua-LMS-hohulili\memory\ux_ui_guidelines.md
```

---

## Quy trình bắt buộc

```
Research (cot-research) → Brainstorming → Approve → Implement → Verify (agent-browser)
```

### SKILLs sử dụng theo thứ tự:

| Bước | SKILL | Mục đích |
|------|-------|---------|
| 1 | `cot-research` | Nghiên cứu SOTA lesson content rendering — Coursera/Notion/Gitbook |
| 2 | `brainstorming` | Đánh giá Tiptap extensions cần thêm, chọn phương án |
| 3 | `frontend-design` | Implement callout blocks, image captions, improved rendering |
| 4 | `agent-browser` | Verify trước/sau trên browser, screenshot so sánh |
| 5 | `audit` | Kiểm tra accessibility, responsive, typography |

---

## Checklist đánh giá

### Tiptap Editor (Teacher side)
- [ ] Callout blocks (Info/Warning/Tip/Danger) — có toolbar button + rendering
- [ ] Image captions — teacher nhập caption, hiện dưới ảnh
- [ ] Table improvements — responsive, header row styling
- [ ] Code block — syntax highlighting (basic), copy button
- [ ] Divider — styled hr (không chỉ đường kẻ mỏng)
- [ ] Toggle/Accordion block (nếu Tiptap hỗ trợ)

### Student Rendering (Prose styles)
- [ ] Callout boxes hiện đúng styling (icon + color + border)
- [ ] Image figure + caption
- [ ] Table horizontal scroll trên mobile
- [ ] Code block với background + monospace
- [ ] Headings visual hierarchy rõ (size + weight + spacing + color)
- [ ] Paragraph readable (line-height 1.75, max-width ~720px)
- [ ] Blockquote có accent color

### Preview
- [ ] "Xem trước" hiện đúng callout boxes
- [ ] Preview responsive 375px / 768px / 1920px
- [ ] Preview y hệt student learning view

### Content Quality
- [ ] Tạo 1 bài giảng mẫu đầy đủ (text + callout + image + table + code)
- [ ] So sánh trước/sau bằng screenshot
- [ ] Giảng viên không cần biết HTML — chỉ dùng toolbar

---

## Design Tokens

```scss
// Primary
--color-primary: #0056D2;
--color-primary-hover: #004BB5;

// Callout colors (Notion/Gitbook pattern)
--callout-info: #dbeafe;       // blue-100
--callout-info-border: #3b82f6; // blue-500
--callout-warning: #fef3c7;    // amber-100
--callout-warning-border: #f59e0b; // amber-500
--callout-tip: #dcfce7;        // green-100
--callout-tip-border: #22c55e; // green-500
--callout-danger: #fee2e2;     // red-100
--callout-danger-border: #ef4444; // red-500

// Typography
--prose-heading-color: #1e293b;
--prose-body-color: #334155;
--prose-line-height: 1.75;
--prose-max-width: 720px;
```

---

## Quy tắc bắt buộc

- **KHÔNG code trước khi nghiên cứu xong** — research → design → approve → implement
- **Mọi text viết cho giảng viên** — không jargon kỹ thuật
- **Tuân thủ design tokens** — `#0056D2`, `rounded-lg`, `slate-` scale
- **Vietnamese UI** — tiếng Việt có dấu, capitalize first word only
- **Angular 20+** — signals, inject(), OnPush, viewChild(), computed()
- **Karpathy Guidelines** — Think before coding, simplicity first, surgical changes
- **Tiptap extensions** — dùng official extensions trước, custom extension chỉ khi cần
- **Backward compatible** — nội dung cũ vẫn render đúng sau khi thêm extensions mới

---

## Kết quả mong đợi

1. Bản nghiên cứu SOTA chi tiết (lesson content rendering comparison)
2. Tiptap editor với callout blocks + image captions (tối thiểu)
3. Student `.prose` styles nâng cấp — bài giảng trông chuyên nghiệp
4. Bài giảng mẫu đầy đủ (text + callout + image + table + code)
5. Screenshot trước/sau so sánh
6. Tất cả committed + build clean

---

*Tạo bởi Claude Code session 2026-04-12/13. Session trước đã hoàn thành section editor redesign + preview + security.*
