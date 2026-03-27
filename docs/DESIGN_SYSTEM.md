# LMS Maritime — Design System

> **Style**: Coursera-inspired. Clean, professional, sharp.
> **Anti-pattern**: NO AI slop (over-rounded, gradient text, glassmorphism, marshmallow cards)
> **Last Updated**: 2026-03-22

---

## Color Palette

### Brand
```
Primary:        #0056D2
Primary Hover:  #004BB5
Primary Light:  #0056D2/5   (bg tint)
Primary Medium: #0056D2/10  (badges, highlights)
```

### Semantic (GIỮU nguyên — không thay bằng brand)
```
Success:  emerald-500 / emerald-50 / emerald-700   → completion, active, healthy
Warning:  amber-500 / amber-50 / amber-700         → pending, offline, stale
Error:    red-500 / red-50 / red-700                → failed, danger, destructive
```

### Neutrals
```
Text Primary:    text-gray-900
Text Secondary:  text-gray-600
Text Tertiary:   text-gray-500
Text Disabled:   text-gray-400
Placeholder:     text-gray-400
Background:      bg-slate-50
Card Background: bg-white
Border:          border-gray-200
Border Hover:    border-gray-300
Divider:         border-gray-100
```

### Forbidden Colors (non-brand, non-semantic)
```
indigo-*    → use #0056D2
cyan-*      → use #0056D2
purple-*    → use #0056D2
pink-*      → NEVER (except semantic error rose)
blue-500/600/700 → use #0056D2 (exact hex, not Tailwind blue)
```

---

## Border Radius (Coursera Style — Sharp, Professional)

```
Cards:           rounded-lg    (8px)
Inner cards:     rounded-lg    (8px)
Modals:          rounded-lg    (8px)
Buttons:         rounded-md    (6px)
Inputs:          rounded-md    (6px)
Select:          rounded-md    (6px)
Tab pills:       rounded-full  (999px) — pills only
Badges:          rounded-full  (999px) — status pills
Toggles:         rounded-full  (999px) — switch tracks
Progress bars:   rounded-full  (999px) — thin bars
Avatars:         rounded-full  (999px)
```

### FORBIDDEN
```
rounded-xl     (12px) — quá tròn, AI slop
rounded-2xl    (16px) — marshmallow
rounded-3xl    (24px) — cartoon
```

---

## Shadows

```
Cards:           shadow-sm     (0 1px 2px rgba(0,0,0,.05))
Card Hover:      hover:shadow-md (khi cần interactive feedback)
Modals:          shadow-lg
Dropdowns:       shadow-lg
Tooltips:        shadow-md
```

### FORBIDDEN
```
shadow-xl / shadow-2xl trên cards — quá nặng
ring-* shadow combos — over-designed
```

---

## Typography

```
Page Title:      text-2xl font-bold text-gray-900    (24px)
Section Title:   text-base font-semibold text-gray-900 (16px)
Card Title:      text-sm font-semibold text-gray-900  (14px)
Body:            text-sm text-gray-600                (14px)
Caption:         text-xs text-gray-500                (12px)
Label:           text-xs font-medium uppercase tracking-wide text-gray-400
KPI Numbers:     text-3xl font-bold text-gray-900     (30px) — chỉ trong dashboard
```

### FORBIDDEN
```
text-4xl+ cho non-hero context
font-black (quá nặng)
gradient text (AI slop)
```

---

## Layout

### Container
```
max-w-[1400px] mx-auto px-4 sm:px-6 py-6
```

### Page Background
```
bg-slate-50     (standard)
bg-white        (khi page đã có card nesting)
```

### FORBIDDEN
```
bg-gradient-to-br from-slate-50 via-[#0056D2]/5 to-[#0056D2]/10
  → quá decorative, AI slop. Dùng bg-slate-50 flat.
```

---

## Cards

### Standard Card
```html
<div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
  <h2 class="text-base font-semibold text-gray-900">Title</h2>
  <p class="mt-1 text-sm text-gray-500">Description</p>
</div>
```

### Stat Card (inside card)
```html
<div class="rounded-lg bg-slate-50 px-3 py-3 text-sm">
  <p class="text-gray-500">Label</p>
  <p class="mt-1 font-semibold text-gray-900">Value</p>
</div>
```

### Interactive Card (selectable)
```html
<button class="rounded-lg border p-4 text-left transition-colors
               [selected]: border-[#0056D2] bg-[#0056D2]/5
               [default]: border-gray-200 hover:border-gray-300">
</button>
```

---

## Buttons

### Primary
```html
<button class="rounded-md bg-[#0056D2] px-4 py-2 text-sm font-medium text-white
               hover:bg-[#004BB5] transition-colors">
  Action
</button>
```

### Secondary
```html
<button class="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium
               text-gray-700 hover:bg-gray-50 transition-colors">
  Cancel
</button>
```

### Danger
```html
<button class="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium
               text-red-600 hover:bg-red-100 transition-colors">
  Delete
</button>
```

### Ghost / Icon
```html
<button class="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600
               transition-colors">
  <svg>...</svg>
</button>
```

### Disabled
```
disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
```

---

## Tab Chips (Pills)

```html
<div class="flex gap-2" role="tablist">
  <!-- Active -->
  <button class="rounded-full bg-[#0056D2] px-4 py-2 text-sm font-medium text-white
                 border border-[#0056D2]" role="tab" aria-selected="true">
    Tab Name (count)
  </button>
  <!-- Inactive -->
  <button class="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700
                 border border-gray-200 hover:border-gray-300" role="tab" aria-selected="false">
    Tab Name
  </button>
</div>
```

---

## Form Inputs

```html
<input class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
              focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]/20
              placeholder:text-gray-400" />
```

---

## Status Badges

```html
<!-- Active/Info -->
<span class="rounded-full bg-[#0056D2]/10 px-2.5 py-0.5 text-xs font-medium text-[#0056D2]">
  Đang học
</span>

<!-- Completed -->
<span class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
  Hoàn thành
</span>

<!-- Warning -->
<span class="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
  Chờ duyệt
</span>

<!-- Error -->
<span class="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
  Thất bại
</span>
```

---

## Empty States

```html
<div class="py-12 text-center">
  <svg class="mx-auto h-12 w-12 text-gray-300">...</svg>
  <p class="mt-3 text-sm font-medium text-gray-600">Title</p>
  <p class="mt-1 text-xs text-gray-400">Description</p>
  <a class="mt-4 inline-flex rounded-md bg-[#0056D2] px-4 py-2 text-sm font-medium text-white
            hover:bg-[#004BB5]">
    CTA Button
  </a>
</div>
```

---

## Toggle Switches

```html
<button class="inline-flex h-6 w-11 items-center rounded-full transition-colors
               [on]: bg-[#0056D2]  [off]: bg-gray-300">
  <span class="ml-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform
               [on]: translate-x-5"></span>
</button>
```

---

## Responsive Breakpoints

```
sm: 640px    (tablet portrait)
md: 768px    (tablet landscape)
lg: 1024px   (desktop)
xl: 1280px   (wide desktop)
```

### Grid Patterns
```
Stats: grid-cols-1 sm:grid-cols-2 xl:grid-cols-4
Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
2-col: grid-cols-1 lg:grid-cols-[2fr_1fr]
```

---

## Icon System

Dùng **inline SVG** (heroicons style) làm primary. Kích thước chuẩn:
```
Small:  w-4 h-4   (trong buttons, badges)
Medium: w-5 h-5   (trong cards, list items)
Large:  w-6 h-6   (trong stat cards)
XL:     w-12 h-12 (trong empty states)
```

---

## Loading States

### Skeleton (preferred — Coursera pattern)
```html
<div class="animate-pulse rounded-lg bg-gray-200 h-4 w-3/4"></div>
```

### Spinner (inline/small)
```html
<div class="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#0056D2]"></div>
```

---

## Anti-Patterns Checklist

```
[ ] NO rounded-xl/2xl/3xl trên cards (dùng rounded-lg)
[ ] NO gradient backgrounds trên page containers
[ ] NO purple/indigo/cyan (dùng #0056D2)
[ ] NO shadow-xl trên cards (dùng shadow-sm)
[ ] NO text-4xl+ ngoài hero/KPI
[ ] NO glassmorphism / backdrop-blur
[ ] NO gradient text
[ ] NO bouncy animations (dùng transition-colors, transition-all)
[ ] NO fixed pixel widths (dùng Tailwind responsive)
[ ] NO font-black (dùng font-bold max)
```

---

*Tài liệu này là source of truth cho design decisions. Update khi có thay đổi design system.*
