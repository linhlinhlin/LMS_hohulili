# Question Type Expansion — Phase 1: Option-Based Types

> **Date**: 2026-04-01 | **Status**: Approved | **Scope**: FE + BE + SQL (real data, no mocks)

## Goal

Enable teachers to create **3 option-based question types** in the question create/edit UI:

1. **SINGLE_CHOICE** — 1 correct answer (existing, keep as-is)
2. **MULTIPLE_CHOICE** — multiple correct answers (new)
3. **TRUE_FALSE** — binary choice (new)

All types support rich media in question content (images, math formulas, tables, lists). SINGLE_CHOICE and MULTIPLE_CHOICE support rich media in answer options. Backend already has full support (grading strategies, answer_key JSONB, question_options.is_correct).

## Architecture: Hybrid Parameterization (Approach B)

Keep one answer section, parameterize behavior by selected `questionType`. No separate components per type — the 3 types share 90% UI (option rows + EnrichedInput).

## Current State

| Layer | Status |
|-------|--------|
| DB schema | ✅ `question_type VARCHAR(30)`, `answer_key JSONB`, `question_options.is_correct BOOLEAN` — all exist (V35 migration) |
| Backend grading | ✅ Strategy pattern: `SingleChoiceGradingStrategy`, `MultipleChoiceGradingStrategy`, `TrueFalseGradingStrategy` |
| Backend API | ✅ `CreateQuestionRequest` accepts `questionType`, `answerKey`, `correctOption` |
| FE API types | ✅ `QuestionTypeEnum`, `answerKey` field in request interfaces |
| FE Create UI | ❌ Hardcoded SINGLE_CHOICE, type selector disabled |
| FE Edit UI | ❌ No type awareness, radio-only |
| FE Student | ✅ All 6 types rendered (radio, checkbox, text, textarea) |
| FE Preview | ⚠️ Doesn't render tables/lists from block editor |

## Design

### 1. Type Selector (Create Page — Sidebar)

**Location**: Sidebar "Thuộc tính" card, **first field** (above Độ khó).

**Widget**: `<select>` dropdown (consistent with Độ khó below it).

```html
<select formControlName="questionType">
  <option value="SINGLE_CHOICE">Trắc nghiệm (1 đáp án đúng)</option>
  <option value="MULTIPLE_CHOICE">Trắc nghiệm (nhiều đáp án đúng)</option>
  <option value="TRUE_FALSE">Đúng / Sai</option>
</select>
```

**Behavior on type change**:
- SINGLE → MULTIPLE: Radio → Checkbox, keep existing options
- SINGLE → TRUE_FALSE: Replace options with fixed "Đúng"/"Sai", reset correctOption
- MULTIPLE → SINGLE: Keep options, reset to first correct only (warn if multiple were selected)
- TRUE_FALSE → SINGLE/MULTIPLE: Clear fixed options, add 4 default empty options
- Default: SINGLE_CHOICE (backward compatible)

**Edit page**: Type selector **disabled** (read-only). Changing type post-creation would break answer_key format and student submissions. Matches Canvas/Moodle pattern.

### 2. Answer Section Adaptations

#### SINGLE_CHOICE (existing — no change)
- Radio buttons, 1 correct
- Dynamic options (min 2, add/remove)
- EnrichedInput with images + math
- Answer key: `correctOption: "A"`

#### MULTIPLE_CHOICE (new)
- **Checkboxes** instead of radio buttons
- Dynamic options (min 2, add/remove)
- EnrichedInput with images + math (same as SINGLE)
- **Multiple** options can be marked correct
- **Validation**: At least 1 option must be checked as correct
- **Warning**: If only 1 checked → suggest using SINGLE_CHOICE instead
- Answer key: `answerKey: {"correctOptions": ["A","C"]}` + `correctOption: "A,C"`

#### TRUE_FALSE (new)
- **Radio buttons**, 1 correct (same widget as SINGLE)
- **Fixed 2 options**: "Đúng" (key A) and "Sai" (key B)
- **No add/remove buttons** (hidden)
- **No EnrichedInput** — plain text labels only (options are always "Đúng"/"Sai")
- Question content still supports full rich media (Block Editor with images, math, tables)
- Answer key: `answerKey: {"correctOption": "TRUE"}` + `correctOption: "A"` (if A=Đúng)

### 3. Data Flow

#### FE → BE (Create)

**SINGLE_CHOICE** (unchanged):
```json
{
  "packageId": "uuid",
  "questionType": "SINGLE_CHOICE",
  "content": "extracted text",
  "blocks": [...],
  "options": ["Option A text", "Option B text", ...],
  "optionBlocks": [[...], [...]],
  "correctOption": "A",
  "difficulty": "MEDIUM",
  "tags": "math,algebra"
}
```

**MULTIPLE_CHOICE**:
```json
{
  "packageId": "uuid",
  "questionType": "MULTIPLE_CHOICE",
  "content": "extracted text",
  "blocks": [...],
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "optionBlocks": [[...], [...]],
  "correctOption": "A,C",
  "answerKey": {"correctOptions": ["A", "C"]},
  "difficulty": "MEDIUM",
  "tags": "math"
}
```

**TRUE_FALSE**:
```json
{
  "packageId": "uuid",
  "questionType": "TRUE_FALSE",
  "content": "extracted text",
  "blocks": [...],
  "options": ["Đúng", "Sai"],
  "correctOption": "A",
  "answerKey": {"correctOption": "TRUE"},
  "difficulty": "EASY"
}
```

#### BE → FE (Load for Edit)

Question response includes `questionType` field. FE reads this to set:
- Which input mode (radio vs checkbox)
- Whether options are editable or fixed
- How to parse `answerKey` for pre-selecting correct answers

For MULTIPLE_CHOICE: read `answerKey.correctOptions` array → mark multiple checkboxes.
For TRUE_FALSE: read `answerKey.correctOption` ("TRUE"/"FALSE") → map to option index.

### 4. Preview Component Fixes

Current `question-preview.component.ts` only renders: text, `[IMG:url]`, `$math$`, `$$math$$`.

**Add rendering for**:
- **Tables**: Parse table blocks → `<table>` HTML
- **Lists**: Parse list blocks → `<ul>`/`<ol>` HTML
- **Warning blocks**: Parse warning → styled `<div>` with title + message

### 5. Backend Verification

**Needs checking during implementation:**

The controller (`QuestionControllerV3.java` lines 181-195) sets `isCorrect` per option by matching against `correctOption`. For MULTIPLE_CHOICE where `correctOption = "A,C"`:
- Verify the controller splits comma-separated values when setting `is_correct` on each option
- If it does exact string match (`"A".equals("A,C")` → false), this is a bug and needs fixing
- Fix: split `correctOption` by comma, check if option key is in the resulting set

### 6. Files to Modify

**Frontend (primary)**:
| File | Change |
|------|--------|
| `question-create.component.ts` | Add `questionType` form control, type change handler, adapt answer key building |
| `question-create.component.html` | Type selector in sidebar, conditional radio/checkbox, TRUE_FALSE fixed options |
| `question-edit.component.ts` | Read `questionType` from loaded question, set correct mode, disabled type selector |
| `question-edit.component.html` | Same template adaptations, type selector disabled |
| `question-preview.component.ts` | Add table/list/warning block rendering |
| `question.api.ts` | No change needed (types already support all fields) |

**Backend (if needed)**:
| File | Change |
|------|--------|
| `QuestionControllerV3.java` | Fix `isCorrect` logic for comma-separated `correctOption` in MULTIPLE_CHOICE |

**SQL**: No migration needed — schema already supports all types (V35).

## Out of Scope (Phase 2+)

- FILL_IN_BLANK, SHORT_ANSWER, ESSAY question types
- Video/audio embedding in block editor
- Rubric system for essays
- Question pooling / randomization per student
- Partial credit display in student results
- Answer explanation / hints per option

## Success Criteria

1. Teacher can create SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE questions
2. All question types support rich media in question content (images, math, tables)
3. SINGLE_CHOICE and MULTIPLE_CHOICE support rich media in answer options
4. Preview renders all block types correctly (including tables/lists)
5. Student quiz-taking works correctly for all 3 types (already implemented)
6. Grading works correctly for all 3 types (already implemented via strategy pattern)
7. Edit page loads correct type and renders appropriate answer editor
8. Real data flows end-to-end: FE → API → DB → Grading → Student view
