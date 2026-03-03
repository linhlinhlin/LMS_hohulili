# Course Editor Pages — Design Consistency Audit

> **Date**: 2026-03-04 | **Scope**: course-info + course-settings | **Type**: UX/UI consistency fix

## Problem

The course-info ("Thông Tin") and course-settings ("Cài đặt") pages in the course editor use different layout parameters than the established design system. Key inconsistencies with the course-creation page (the reference standard set in S121):

| Property | course-info/settings (current) | course-creation (standard) |
|---|---|---|
| Container max-width | `max-w-screen-2xl` (1536px) | `max-w-[1100px]` |
| Padding | `px-8 py-6` | `px-5 sm:px-8 py-5` |
| Grid sidebar | `lg:grid-cols-[1fr_340px]` | `w-[280px]` |
| Card shadow | none | `shadow-sm` |
| Sticky offset | `lg:top-4` | `top-5` |

## SOTA Reference

Professional LMS course editors use centered, constrained layouts:
- **Teachable**: ~1100px max-width, sidebar ~280px
- **Thinkific**: Similar pattern, subtle card shadows
- **WordPress/Shopify**: Sidebar 280-300px, centered content

## Changes

### course-info.component.ts
1. Container: `max-w-screen-2xl mx-auto px-8 py-6` → `max-w-[1100px] mx-auto px-5 sm:px-8 py-5`
2. Grid: `lg:grid-cols-[1fr_340px]` → `lg:grid-cols-[1fr_280px]`
3. Cards: Add `shadow-sm` to all 6 cards (3 main + 3 sidebar)
4. Sidebar sticky: `lg:top-4` → `lg:top-5`

### course-settings.component.ts
1. Same container, grid, shadow, sticky fixes
2. Cards: Add `shadow-sm` to all cards (including danger zone)

## Impact
- Pure CSS/layout changes — no logic or data flow affected
- 2 files modified
- 0 new files
