# Course Creation UX Fixes — Design Document

> **Date**: 2026-03-02 | **Status**: Approved | **Approach**: B (2-Step Wizard)

## Context

Deep UX/UI analysis of `/teacher/course-creation` identified 6 issues against SOTA patterns (Canvas, Udemy, Teachable, Thinkific, Google Classroom, Coursera). Current flow: 3-step wizard. Decision: merge to 2-step wizard + fix all issues.

## Issues to Fix

| # | Priority | Issue | Description |
|---|----------|-------|-------------|
| 1 | P1 | Sale price validation | No FE validation that sale price < original price |
| 2 | P2 | Price placeholder | Spinbuttons default to `0` instead of empty with placeholder |
| 3 | P2 | Unsaved data guard | No `canDeactivate` — data lost on accidental navigation |
| 4 | P3 | Clickable stepper | Completed steps not clickable for quick navigation |
| 5 | P3 | Cancel button | No explicit "Hủy" button in action bar |
| 6 | P3 | Merge Step 2+3 | Step 3 (confirmation) is redundant — merge into Step 2 |

## Design

### New 2-Step Wizard

**Step 1: Thông tin cơ bản** (unchanged)
- Delivery mode selector (SELF_PACED / INSTRUCTOR_LED)
- Tên khóa học (required, max 255)
- Danh mục (required, dropdown)
- Auto-generated code preview

**Step 2: Hoàn tất & Tạo** (merged old Step 2 + Step 3)

Layout (top to bottom):
1. **Mô tả khóa học** — textarea (optional, 5 rows), helper: "Có thể bỏ qua"
2. **Loại giá** — Miễn phí / Trả phí toggle buttons
   - If PAID: price fields with placeholders "VD: 500000" / "VD: 400000"
   - Inline validation errors
3. **INSTRUCTOR_LED info card** — conditional (emerald)
4. **Tóm tắt** — compact summary card (auto-updating from step 1 + current fields)
   - Hình thức, Tên, Danh mục, Giá — 1 row each, inline layout
5. **Info note** — "Sau khi tạo, bạn sẽ được chuyển đến trang chỉnh sửa để..."
6. **Button bar**: `[Hủy]  [Quay lại]  [+ Tạo khóa học]`

### Validation Rules

| Field | Rule | Error Message (Vietnamese) |
|-------|------|---------------------------|
| Price (PAID) | Required, > 0 | "Giá gốc bắt buộc và phải lớn hơn 0" |
| Sale Price | Optional; if set: > 0 | "Giá khuyến mãi phải lớn hơn 0" |
| Sale Price | Optional; if set: < price | "Giá khuyến mãi phải nhỏ hơn giá gốc" |

### Price Input UX
- `priceControl = fb.control<number | null>(null)` (keep null, not 0)
- HTML: `placeholder="VD: 500000"` and `placeholder="VD: 400000"`
- Remove default `0` display in spinbuttons

### Unsaved Data Guard (`canDeactivate`)
- Route guard on `course-creation` route in `teacher.routes.ts`
- `hasUnsavedData()`: true if title OR category OR description has value, OR priceType is PAID with price entered
- Uses `window.confirm("Bạn có dữ liệu chưa lưu. Bạn có chắc muốn rời trang?")`
- Also handles browser back/tab close via `@HostListener('window:beforeunload')`

### Clickable Stepper
- Completed steps get `cursor-pointer` + hover effect
- Click on Step 1 (if on Step 2) → navigate back to Step 1
- Step 2 clickable only if Step 1 is valid

### Cancel Button
- Position: left side of button bar
- Style: `text-slate-500 hover:text-slate-700` (text-only, no border)
- Label: "Hủy"
- Action: `router.navigate(['/teacher/courses'])` (triggers canDeactivate guard)

### Stepper Visual Update
- Old: `steps = [{num: 1, label: 'Thông tin'}, {num: 2, label: 'Mô tả & Giá'}, {num: 3, label: 'Xác nhận'}]`
- New: `steps = [{num: 1, label: 'Thông tin'}, {num: 2, label: 'Hoàn tất'}]`
- Connector line between steps stays the same

## File Scope

| # | File | Changes |
|---|------|---------|
| 1 | `fe/src/app/features/teacher/courses/course-creation.component.ts` | Merge steps, add validation, placeholders, clickable stepper, cancel button, `beforeunload` listener, `canDeactivate` interface |
| 2 | `fe/src/app/features/teacher/teacher.routes.ts` | Add `canDeactivate` guard to course-creation route |

## Verification
1. `cd fe && npx ng build` — 0 errors
2. Step 1 → fill title + category → "Tiếp theo" → see merged Step 2
3. Click "Trả phí" → enter sale price > original → see error
4. Price fields show placeholder, not "0"
5. Click step 1 circle on step 2 → jumps back
6. Fill data → click sidebar link → confirm dialog appears
7. "Hủy" button → navigates to /teacher/courses (with guard)
8. Full flow: create course → redirects to editor
