# Course Info Page — Header & Layout Redesign

> **Date**: 2026-03-04 | **Scope**: course-editor header + course-info layout | **Type**: UX/UI redesign

## Problems Identified

### 1. Header thiếu rõ ràng về màu sắc và thiết kế

**Hiện tại**: `course-editor/components/header/header.component.ts`
- h-14 (56px), `bg-white`, `border-b border-slate-200`
- **Inconsistency**: Divider dùng `bg-gray-200` (1 chỗ), preview button dùng `gray-*` classes → phải là `slate-*` theo design token system
- Preview button: `border-gray-300 text-gray-700 hover:bg-gray-50` — không đúng design token (`slate-*`)
- **Quá nhiều element nhỏ** chen nhau bên phải: save status + readiness badge + divider + preview + publish → visual clutter
- Save status indicator text quá nhỏ (`text-xs`) và ẩn trên mobile (`hidden sm:inline`)
- Readiness badge thiếu visual weight — dễ bị bỏ qua

### 2. Layout bất cân xứng — trái thừa, phải co rúm

**Hiện tại**: `max-w-screen-2xl` (1536px) + `grid-cols-[1fr_280px]`

```
At 1536px viewport:
┌──────────────────────────────────── 1536px ────────────────────────────────────┐
│  px-8  │          Main column (~1232px)              │ gap │ Sidebar (280px) │ px-8 │
│  32px  │  ███████████████████████████████████████████ │ 24px│ ██████████████  │ 32px │
└────────┴─────────────────────────────────────────────┴─────┴─────────────────┴──────┘
         Main = 80% (quá rộng cho form inputs)           Sidebar = 18% (quá hẹp)
```

**Vấn đề cụ thể**:
- Text input `<input class="w-full">` kéo dài ~1200px → gần không thể đọc
- Textarea kéo dài 1200px → user phải nhìn qua lại quá nhiều
- Rich Text Editor cũng bị kéo rộng quá mức
- Sidebar 280px bị co rúm — price fields, category picker bị chật
- **Tỷ lệ 80/20 là anti-pattern** cho form-heavy pages

## SOTA Research Findings

### Header Design (Shopify / WordPress / Material Design 3)

| Platform | Height | Structure | Save Pattern |
|----------|--------|-----------|-------------|
| Shopify Admin | 56px | `[← Products]  ...  [Discard] [Save]` | Contextual save bar appears when dirty |
| WordPress Gutenberg | 61px | `[← arrow]  Title  ...  [Draft] [Preview] [Publish]` | Actions right-aligned |
| Material Design 3 | 64dp | App bar with contextual actions | Primary action rightmost |

**SOTA Consensus**: White bg, 56-64px, back navigation left, actions right, subtle bottom border.

### Two-Column Layout Ratios

| Platform | Ratio | Implementation | Max-width |
|----------|-------|----------------|-----------|
| **Shopify Polaris** | **2fr : 1fr** (66/33) | `grid-template-columns: 2fr 1fr` | Fluid within admin |
| WordPress Gutenberg | 620px + 280px | Fixed px | Content 620px centered |
| Bootstrap Admin | 8:4 (on 12-col) | 66.7% / 33.3% | 1140-1200px |
| General SaaS | 70/30 hoặc 75/25 | Various | 1100-1200px |

**Key Insight**: Shopify dùng **2fr:1fr** — tức sidebar chiếm 33% thay vì fixed 280px. Trên container 1100px: main ≈ 710px, sidebar ≈ 366px.

### Sidebar Widths

| Type | Width | Examples |
|------|-------|---------|
| Navigation sidebar (left) | 224-260px | Notion 224px, typical 240px |
| **Content sidebar (right)** | **280-360px** | WordPress 280px, Material 360px, **sweet spot: 300-340px** |

### Max-Width for Form Pages

| Width | Best For | Examples |
|-------|----------|---------|
| 620-700px | Text editing | WordPress Gutenberg, Medium |
| 900-1000px | Single-column forms | Notion, settings pages |
| **1100-1200px** | **Two-column form editors** | **Shopify product, admin panels** |
| 1200-1440px | Dashboards, data tables | Analytics pages |

## Proposed Changes

### A. Header Redesign

**File**: `fe/src/app/features/teacher/course-editor/components/header/header.component.ts`

1. **Fix color inconsistency**: All `gray-*` → `slate-*` (design tokens)
2. **Simplify right section**: Group actions more clearly
   - Remove standalone readiness badge → integrate into save status or move to tooltip
   - Merge dividers where redundant
3. **Add subtle header bg treatment**: Consider `bg-white shadow-sm` instead of just `border-b` for more visual weight
4. **Optional**: Consider a slightly taller header (h-16 = 64px) for more breathing room — Material Design 3 standard

### B. Layout Rebalance

**File**: `fe/src/app/features/teacher/course-editor/pages/course-info/course-info.component.ts`

#### Option A: Constrained container + 2fr:1fr (Recommended)
```
max-w-[1200px] mx-auto + grid-cols-[1fr_340px]

At 1200px:
┌────────── 1200px ──────────┐
│ Main (~836px) │ gap │ Sidebar (340px) │
│     69.7%     │ 24px│     28.3%       │
└───────────────┴─────┴─────────────────┘
```

- Container: `max-w-screen-2xl` → `max-w-[1200px]`
- Grid: `grid-cols-[1fr_280px]` → `grid-cols-[1fr_340px]`
- Sidebar gets 60px more width → price fields, pickers breathe
- Main column ~836px — ideal for forms (readable line length)
- **Tradeoff**: User trước đó muốn giữ 1536px → cần giải thích lý do

#### Option B: Keep 1536px + wider sidebar
```
max-w-screen-2xl + grid-cols-[1fr_380px]

At 1536px:
┌────────────────── 1536px ──────────────────┐
│  Main (~1132px)        │ gap │ Sidebar (380px) │
│       73.7%            │ 24px│     24.7%       │
└────────────────────────┴─────┴─────────────────┘
```

- Keep `max-w-screen-2xl` (user's preference)
- Grid: `grid-cols-[1fr_280px]` → `grid-cols-[1fr_380px]`
- Sidebar gets 100px more → much more comfortable
- Main still wide (~1132px) but form fields can have `max-w-2xl` (672px) internal constraint
- **Tradeoff**: Main column still wide, need to add `max-w-*` to individual form sections

#### Option C: Hybrid — keep 1536px + add inner max-width to main column
```
max-w-screen-2xl + grid-cols-[1fr_360px]
Main column cards: max-w-3xl (768px) or max-w-4xl (896px)

At 1536px:
┌────────────────────────── 1536px ────────────────────────────┐
│  ┌─ Main card (max 768px) ─┐  empty   │ gap │ Sidebar (360px) │
│  │ ████████████████████████ │          │ 24px│ ████████████████ │
│  └─────────────────────────┘          │     │                  │
└───────────────────────────────────────┴─────┴──────────────────┘
```

- Container stays `max-w-screen-2xl`
- Main column cards get internal `max-w-3xl` (768px) → form inputs are readable
- Sidebar: 280px → 360px
- Page feels spacious without cramping either side
- **This matches WordPress Gutenberg pattern**: wide container but constrained content area

## Recommendation

**Option C (Hybrid)** là lựa chọn tốt nhất vì:
1. Tôn trọng yêu cầu user giữ 1536px
2. Form inputs có readable width (~768px) — SOTA cho form pages
3. Sidebar rộng hơn (360px) — không còn co rúm
4. Page vẫn cảm giác spacious, professional

## Impact
- 2 files modified: header + course-info
- Pure CSS/layout changes — no logic affected
- course-settings cần update tương tự
