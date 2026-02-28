# Student Lesson View — Tailwind-First Redesign

> **Date**: 2026-02-28 | **Status**: Approved | **Approach**: Tailwind-First Rewrite

## Overview

Full UI/UX redesign of the Student Lesson View matching the reference template (stitch_maritime_lms_student_dashboard). Migrate from 1100 LOC SCSS to Tailwind inline classes. Keep `#0056D2` design token system.

## Files to Modify

| File | Action |
|------|--------|
| `course-learning.component.html` | Rewrite (366 LOC → Tailwind) |
| `course-learning.component.scss` | Delete/empty (1100 LOC → ~0) |
| `course-learning.component.ts` | Minor additions (tab signal, breadcrumb computed) |
| `lesson-content.component.html` | Rewrite (243 LOC → Tailwind) |
| `lesson-content.component.scss` | Delete/empty |
| `lesson-content.component.ts` | Minor additions (tab handling) |

## Design Sections

### Section 1: Sidebar (Approved)

**Layout**: `w-[300px] flex-col border-r border-gray-200 bg-white h-full`

**Header**:
- Back link: `← Danh sách khóa học` (text-xs font-medium text-slate-500, hover:text-[#0056D2])
- Course title: `font-bold text-[#0056D2] text-base leading-tight mb-3`
- Progress bar: `h-1.5 bg-slate-100 rounded-full` + fill `bg-green-600`
- Percentage: `text-xs font-bold text-slate-700`

**Navigation levels**:
- **Level 1 (Chapter)**: `px-4 py-3 bg-gray-50 border-b border-gray-100`, bold title, expand/collapse icon
  - Active chapter: `bg-slate-100 text-[#0056D2]` (both title and icon)
- **Level 2 (Lesson)**: `px-4 py-2.5 border-l-4 border-transparent hover:bg-slate-50`
  - Active: `bg-[#E6F0FA] border-[#0056D2]`, title `font-bold text-[#0056D2]`
  - Completed: `border-l-4 border-green-500` + `check_circle` icon green-600
  - Locked: `opacity-60` + `lock` icon slate-400
- **Level 3 (Section)**: `pl-12 pr-4 py-1.5 text-xs text-slate-500`
  - Completed: `text-green-600`
  - Active: `font-semibold text-[#0056D2] bg-blue-50/50`
  - Icons: `play_circle` (VIDEO), `description` (TEXT), `quiz` (QUIZ)

**Removed from current design**:
- Search box (not in reference)
- "CẤU TRÚC KHÓA HỌC" header
- Sidebar collapse button
- Folder icons

### Section 2: Main Content Area (Approved)

**Breadcrumb** (desktop only, `hidden md:flex`):
- `px-6 py-3 text-xs text-slate-500 border-b border-gray-100`
- Separator: `chevron_right` text-[10px]
- Active item: `font-semibold text-[#0056D2]`
- Hover: `hover:text-[#0056D2] cursor-pointer`

**Video player**:
- Container: `w-full bg-black relative aspect-video md:max-h-[55vh] shadow-sm`
- Play overlay: `w-16 h-16 bg-[#0056D2]/90 hover:bg-[#004BB5] rounded-full`
- Bottom gradient: `bg-gradient-to-t from-black/90 via-black/50 to-transparent`
- Custom controls visual overlay (poster state only)
- Keep all existing video logic (YouTube, offline, tracking)

**Pill tabs** (new):
- Container: `flex gap-2 p-1 bg-gray-50/50 rounded-full border border-gray-100`
- Active: `px-6 py-1.5 rounded-full bg-[#0056D2] text-white text-sm font-semibold shadow-sm`
- Inactive: `px-6 py-1.5 rounded-full text-slate-600 text-sm font-medium hover:bg-gray-100`
- Tabs: Tổng quan (default) | Tài liệu | Thảo luận (placeholder)

**Lesson title + metadata**:
- Container: `max-w-5xl mx-auto px-4 md:px-8 pt-4`
- Title: `text-xl md:text-2xl font-bold text-[#0056D2] mb-2 leading-tight`
- Format: "Bài {chapter}.{lesson}: {title}"
- Metadata: instructor avatar + name + date + rating

**Content body**:
- Container: `space-y-5 text-slate-800 text-[15px] leading-relaxed max-w-none pb-8`
- Headings: `text-base font-bold text-[#0056D2] mb-1`
- Paragraphs: `text-slate-600 text-justify mb-4`
- Callout boxes: `bg-blue-50 border-l-4 border-[#0056D2] p-3 rounded-r-md`
- Check lists: Material Symbols `check_circle` text-[#0056D2]

**Attachments**:
- Container: `mt-8 pt-6 border-t border-gray-100`
- File cards: `flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg`
- Hover: `hover:border-[#0056D2] hover:bg-blue-50/20`
- PDF icon: `bg-red-50 text-red-600`
- Download: Material Symbols icon, `group-hover:text-[#0056D2]`

### Section 3: Bottom Navigation Bar (Approved)

**Container**:
- `fixed bottom-0 md:absolute md:bottom-0 left-0 right-0`
- `bg-white border-t border-gray-200 px-4 py-3 z-30`
- `shadow-[0_-4px_20px_rgba(0,0,0,0.03)]`

**3 buttons**:
- **Bài trước**: `text-slate-500 hover:text-[#0056D2] hover:bg-slate-50` + `arrow_back` icon
- **Đánh dấu hoàn thành**: `bg-gradient-to-b from-[#0066E6] to-[#0056D2] text-white px-6 py-2.5 rounded shadow-md font-bold`
  - Completed: `bg-green-600` + check icon + "Đã hoàn thành"
- **Bài tiếp theo**: same as Bài trước + `arrow_forward` icon
- Labels: `hidden sm:inline text-sm font-medium`

### Section 4: Mobile Responsive (Approved)

**Mobile header** (`md:hidden`):
- `flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white z-20`
- Left: hamburger `menu` icon
- Center: course title `text-sm font-bold truncate text-[#0056D2] max-w-[220px]`
- Right: `more_vert` icon

**Mobile sidebar**:
- Overlay: `fixed inset-0 bg-black/50 z-40`
- Panel: `fixed left-0 top-0 bottom-0 w-[85vw] max-w-[320px] bg-white z-50`
- Slide animation: `translate-x` transition

**Bottom nav mobile**:
- `fixed bottom-0` always
- Labels hidden on small screens (`hidden sm:inline`)
- Center button smaller: `px-4 py-2`

## Technical Notes

- **Icons**: Migrate from custom SVG icons to Material Symbols Outlined (already loaded via Google Fonts in index.html)
- **Color mapping**: All `--navy-primary` in template → `#0056D2`, all `--active-item-bg` → `bg-[#0056D2]/10` or `#E6F0FA`-equivalent
- **No TS logic changes** to video tracking, section navigation, payment gating, keyboard shortcuts
- **Tab state**: Add `activeTab = signal<'overview' | 'materials' | 'discussion'>('overview')` to component
- **Breadcrumb**: Compute from `currentChapterIndex()` + `currentLessonIndex()` + section data
- **SCSS deletion**: Both `course-learning.component.scss` and `lesson-content.component.scss` reduced to empty or minimal (only :host display rules if needed)
