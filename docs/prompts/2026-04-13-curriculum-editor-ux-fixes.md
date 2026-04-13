# Session Prompt: Curriculum Editor UX Fixes — Layout + Logic Sync

> **Dành cho Claude Code session tiếp theo.**

---

## Bối cảnh

Session 2026-04-13 đã hoàn thành nâng cấp Tiptap editor (14 features + Playwright tests).
Phát hiện 5 vấn đề ở **curriculum editor** (layout + logic flow):

---

## Vấn đề cần fix

### P0: "Thêm nội dung" dropdown trong main area không hoạt động
- **Hiện tượng**: Click dropdown → chọn loại (Bài giảng/Video/Tài liệu/Trắc nghiệm) → KHÔNG có gì xảy ra
- **Root cause**: `openSectionEditor()` gọi `confirmDiscardChangesIfNeeded()` → return false khi lesson title dirty
- **Fix**: Skip confirm khi creating section (not switching away), hoặc auto-save trước khi open
- **Files**: `course-curriculum.component.ts:1398`, `lecture-sections-panel.component.ts:266`

### P1: Chapter trống — main area không có nút "Thêm bài học"
- **Hiện tượng**: Click chapter trống → main hiện form (Tên chương, Mô tả, Bài học (0)) nhưng không có CTA
- **SOTA pattern**: Canvas/Udemy hiện "Thêm bài học đầu tiên" button khi chapter trống
- **Fix**: Thêm empty state với CTA button trong `chapter-editor.component`
- **Files**: `chapter-editor.component.ts`

### P2: Chapter mới đánh số 1 thay vì tiếp theo
- **Hiện tượng**: Có 3 chương → tạo chương mới → chương mới là "Chương 1" thay vì "Chương 4"
- **Root cause**: Backend insert chapter không có `orderIndex` → mặc định position 0
- **Fix**: Gửi `orderIndex: chapters.length` khi tạo chapter mới
- **Files**: `sidebar.component.ts:createChapter()`, backend `ChapterController`

### P3: Main content không sát sidebar
- **Hiện tượng**: Khoảng cách lớn giữa sidebar tree và main content area
- **Fix**: CSS grid/flex tighten, remove excess padding/margin
- **Files**: `course-curriculum.component.html` layout CSS

### P4: Logic hỗn loạn giữa Chapter view vs Lesson view
- **Hiện tượng**: Click Chương → hiện form chương; Click Bài → hiện form bài + sections
- **Insight**: Đây là thiết kế đúng (2 views khác nhau) nhưng UX transition chưa smooth
- **SOTA**: Canvas dùng breadcrumb navigation, không switch view in-place
- **Fix**: Thêm breadcrumb + smooth transition animation giữa chapter/lesson views

---

## Files cần đọc trước khi bắt đầu

```
fe/src/app/features/teacher/course-editor/pages/course-curriculum/
├── course-curriculum.component.ts + .html     ← Main orchestrator
├── components/
│   ├── lesson-editor/lesson-editor.component.ts
│   ├── chapter-editor/chapter-editor.component.ts   ← Cần thêm empty state
│   ├── lecture-sections-panel/lecture-sections-panel.component.ts
│   └── section-editor/section-editor.component.ts
└── ../../components/sidebar/sidebar.component.ts  ← Chapter creation + numbering

fe/src/app/features/teacher/course-editor/services/
├── curriculum-editor.service.ts    ← Section editing state
└── curriculum-selection.service.ts ← Chapter/lesson selection state
```

---

## Kiến trúc đã phân tích (từ session trước)

### Data flow khi "Thêm nội dung" click:
```
lecture-sections-panel.onCreateSection('TEXT')
  → emits createSection output
  → course-curriculum catches: (createSection)="openSectionEditor($any($event))"
  → openSectionEditor(type):
      → confirmDiscardChangesIfNeeded()  ← ĐÂY LÀ CHỖ BỊ BLOCK
      → editorSvc.openSectionCreate(type)
      → sectionSurfaceMode.set('create')
      → <app-section-editor> hiện
```

### State management:
- `CurriculumSelectionService` — selectedChapterId, selectedLessonId, selectedSectionId
- `CurriculumEditorService` — sectionSurfaceMode, editingSectionId, section form signals
- `sidebar.component` — expandedChapters, expandedLessons, modal states
- **2 paths tạo section**: sidebar (modal) vs main area (inline editor) — cần đồng bộ

### Chapter numbering:
- UI dùng `chapterIdx + 1` để hiện số (theo vị trí trong array)
- Backend có thể dùng `orderIndex` field
- Khi tạo mới, cần gửi `orderIndex: chapters.length` để append cuối

---

## URL test
```
# Teacher editor — curriculum
http://localhost:4200/teacher/courses/{courseId}/editor/curriculum

# Login
teacher@maritime.edu / teacher123
```

---

## Quy tắc
- Vietnamese có dấu, viết cho giảng viên
- Không thay đổi API contracts (backend) — chỉ fix frontend
- Test trước/sau bằng Playwright hoặc agent-browser
- Commit từng fix riêng biệt
- Dùng `cot-research` nếu cần nghiên cứu SOTA pattern
- Tham khảo repo: `/tmp/angular-tiptap-editor` (FloGeez) nếu cần

---

## Quy trình
```
Đọc files → Phân tích → Fix P0 → Build → Test → Commit → Fix P1 → ... → Push all
```
