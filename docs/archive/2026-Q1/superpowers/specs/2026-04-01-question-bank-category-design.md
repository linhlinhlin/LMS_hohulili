# Question Bank Category Management — Design Spec

**Date:** 2026-04-01  
**Status:** Approved  
**Scope:** FE only (backend category CRUD APIs already exist)

---

## 1. Problem

Teachers have question banks (`question_bank_categories` table per bank) but currently have no UI to create or manage categories. The `DANH MỤC` column in the question table shows `—` for all questions because no categories exist — teachers have no way to create them.

---

## 2. Approved Decisions

| Decision | Choice | Reason |
|---|---|---|
| Category management location | Left sidebar (collapsible 220px) | SOTA: Canvas, Moodle 4.x, Notion, Linear |
| Category hierarchy depth | 2-level max (parent + child) | Matches teacher mental model (Chương → Bài), avoids infinite nesting |
| Question assignment method | Hybrid (per-row dropdown + bulk toolbar) | Covers both single-edit and mass-assign workflows |

---

## 3. Layout Change

### Current layout (bank detail view `@else` branch)
```
[Header toolbar]
[Filter bar]
[Question table]
```

### New layout
```
┌──────────────────────────────────────────────────────────────┐
│ [Header toolbar: bank switcher, import, + câu hỏi, settings]│
├────────────────────┬─────────────────────────────────────────┤
│  SIDEBAR (220px)   │  [Filter bar]                           │
│  [collapse ◀]      ├─────────────────────────────────────────┤
│                    │  [Bulk toolbar — visible when ≥1 ticked]│
│  [+ Thêm danh mục] ├─────────────────────────────────────────┤
│  ─────────────── │  [Question table with Danh mục dropdown] │
│  📁 Tất cả  (42)  │                                         │
│  📁 Chương 1 (12) │                                         │
│    └ Bài 1.1 (5)  │                                         │
│    └ Bài 1.2 (7)  │                                         │
│  📁 Chương 2 (8)  │                                         │
│    └ Bài 2.1 (3)  │                                         │
└────────────────────┴─────────────────────────────────────────┘
```

Sidebar collapses to 40px (icon-only) with `[▶]` re-expand button.  
Sidebar only appears in bank detail view (the `@else` branch), not in ALL-banks view.

---

## 4. Sidebar Component

### File
`fe/src/app/features/teacher/quiz/components/quiz-bank-category-sidebar.component.ts`

### Inputs / Outputs
```typescript
// Inputs (signal)
categories = input<QuestionBankCategoryDTO[]>([])   // full tree from parent
selectedId = input<string | null>(null)             // currently active filter
collapsed = input(false)
savingId = input<string | null>(null)               // shows spinner on row

// Outputs
categorySelect = output<string | null>()            // null = "Tất cả"
addCategory = output<{ name: string; parentId: string | null }>()
renameCategory = output<{ id: string; name: string }>()
deleteCategory = output<{ id: string; name: string }>()
toggleCollapse = output<void>()
```

### Own signals (internal UI state)
```typescript
editingId = signal<string | null>(null)     // category being renamed
editingName = signal('')                    // inline input value
addingParentId = signal<string | 'ROOT' | null>(null)  // null=closed, 'ROOT'=root, id=child
newCategoryName = signal('')
```

### Category tree UX rules
- **"Tất cả"** always first row, not deletable/renameable, count = total bank questions
- **Hover** any category row → show ✏️ + 🗑️ + (if depth=0) ➕ icons
- **Rename (✏️)**: label becomes `<input>`, pre-filled, Enter=save, Escape=cancel
- **Add child (➕)**: only on depth-0 rows (enforcement: 2-level max), opens inline input below that parent
- **Add root (+ Thêm danh mục)**: opens inline input at bottom of list
- **Delete (🗑️)**: fires `deleteCategory` output, parent handles `confirmDialog`
- **Inline input**: auto-focus, max 60 chars, Enter=confirm, Escape=cancel, empty=no-op
- **Active state**: selected row → `bg-[#0056D2]/10 text-[#0056D2] font-semibold`
- **Counts**: `{{ cat.name }} ({{ cat.questionCount }})` — always visible
- **Saving state**: spinner (Loader2 icon) on row where `savingId()` matches

### Design tokens
```css
sidebar bg: bg-white border-r border-gray-200
header: text-[10px] font-semibold uppercase tracking-wider text-gray-400
category row: h-8 px-3 text-sm rounded-lg mx-1 hover:bg-gray-50
active row: bg-[#0056D2]/10 text-[#0056D2]
indent (child): pl-6
icons: text-gray-300 hover:text-[#0056D2] (rename), hover:text-rose-500 (delete)
inline input: border border-[#0056D2] rounded-md px-2 h-7 text-sm focus:ring-2 focus:ring-[#0056D2]/20
```

---

## 5. Question–Category Assignment

### 5a. Per-row Danh mục dropdown
In the question table, the `Danh mục` column changes from a static badge to an interactive `<select>`:

```html
<td class="hidden px-4 py-3 lg:table-cell">
  <div class="relative">
    <select [value]="$any(question).categoryId || ''"
            (change)="assignQuestionToCategory(question.id, $event)"
            class="appearance-none rounded-md border border-transparent bg-transparent
                   px-2 pr-6 py-0.5 text-[11px] font-medium text-[#0056D2]
                   hover:border-gray-200 focus:border-[#0056D2] focus:outline-none
                   transition-colors cursor-pointer">
      <option value="">— Chưa gán</option>
      @for (item of flatCategories(); track item.cat.id) {
        <option [value]="item.cat.id">
          {{ item.depth > 0 ? '  ' : '' }}{{ item.cat.name }}
        </option>
      }
    </select>
    <lucide-icon name="chevron-down" [size]="10"
      class="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-gray-300">
    </lucide-icon>
  </div>
</td>
```

- Only visible when `flatCategories().length > 0` (same rule as before)
- On change: calls `assignQuestionToCategory(questionId, categoryId | null)`
- Optimistic UI: update `questions` signal locally, then call API

### 5b. Bulk assign in toolbar
Existing bulk toolbar (bottom-fixed `bg-gray-900`) gets a new button:

```
[N câu hỏi] | [Gán danh mục ▾] [Di chuyển] [Bỏ chọn]
```

- "Gán danh mục" → opens a small popover/dropdown with flat list of categories
- Select → calls `bulkAssignCategory(categoryId)` on all `selectedQuestions()`
- After success: reload questions, clear selection, refresh category counts

---

## 6. New Methods in quiz-bank.component.ts

```typescript
// Sidebar collapse
sidebarCollapsed = signal(false)
savingCategoryId = signal<string | null>(null)

// Sidebar handlers (called from sidebar outputs)
async onSidebarAddCategory(req: { name: string; parentId: string | null })
async onSidebarRenameCategory(req: { id: string; name: string })
// deleteCategory() already exists — reuse it
// onCategorySelect() already exists — reuse it

// Question assignment
async assignQuestionToCategory(questionId: string, event: Event)
async bulkAssignCategory(categoryId: string | null)
showBulkCategoryMenu = signal(false)
```

---

## 7. API Layer Changes

### question-bank.api.ts — new method
```typescript
assignQuestionCategory(questionId: string, categoryId: string | null): Observable<void> {
  // Reuse moveQuestions with same bankId
  // OR: dedicated PATCH endpoint if moveQuestions has side effects
}
```

**Backend strategy:** Use `POST /api/v3/question-banks/move-questions` with `targetBankId = currentBankId` and `targetCategoryId = categoryId`. This reassigns category within the same bank with zero new backend code.  
If this has unintended side effects (e.g. audit logging), add a dedicated `PATCH /api/v3/question-banks/questions/{questionId}/category` endpoint instead.

---

## 8. Files Changed

| File | Type | Change |
|---|---|---|
| `fe/.../quiz/components/quiz-bank-category-sidebar.component.ts` | **NEW** | Sidebar UI + inline CRUD state |
| `fe/.../quiz/quiz-bank.component.ts` | MODIFY | New signals, sidebar handlers, assign methods |
| `fe/.../quiz/quiz-bank.component.html` | MODIFY | Two-column layout, sidebar slot, per-row dropdown, bulk assign button |
| `fe/.../api/endpoints/question-bank.api.ts` | MODIFY | Add `assignQuestionCategory()` method |

Backend: No changes required (using existing `moveQuestions` endpoint).

---

## 9. Out of Scope

- Drag-and-drop reorder of categories (sortOrder exists in backend but not needed for MVP)
- Category color/icon customization
- Category-level bulk delete
- Keyboard navigation in sidebar
