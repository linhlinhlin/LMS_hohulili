# Teacher Dashboard Sidebar Removal — Single-Column Layout

**Date**: 2026-03-02
**Status**: Approved

## Problem

Teacher dashboard sidebar contains two cards ("Trạng thái" status distribution + "Hiệu suất" course performance) that are redundant and distracting:
- Status counts duplicate tab counts (both read from same `teacher.courses()` signal)
- Performance card is a condensed version of data already visible in course cards
- User feedback: "làm tôi mất tập trung nhiều hơn là có ích"

## SOTA Research (8 platforms)

| Platform | Right Sidebar? | Content |
|----------|---------------|---------|
| Canvas LMS | Yes | To Do + Coming Up (action items ONLY, no charts) |
| Google Classroom | No | Single-column, tabs |
| Moodle | Collapsible | Calendar + Timeline only |
| Udemy | No | Left nav + single-column |
| Coursera | No | Left nav + single-column |
| Teachable | No | Left nav + single-column |
| Thinkific | No | Left nav + single-column |
| Open edX | No (removed) | Top tabs + single-column |

**Key finding**: 0/8 platforms put status distribution charts or performance analytics in a sidebar. Analytics are always on dedicated full pages.

## Decision

Remove sidebar entirely → single-column layout (Udemy/Coursera/Teachable pattern, 6/8 platforms).

## Changes

### Remove
- Sidebar HTML (`.sidebar`, both cards)
- CSS 2-column grid → single-column
- `statusItems()`, `statusPercent()`, `countStatus()` computed/methods
- `analytics()` signal + `loadAnalytics()` + `isLoadingAnalytics`
- All sidebar SCSS (`.sidebar-*`, `.status-*`, `.perf-*`)

### Keep (unchanged)
- Header (avatar + greeting + CTA)
- KPI cards (4 icon cards)
- Tabs with counts
- Course cards (max 4, sorted by recency)
- Footer bar

### Result
- 1 fewer API call (`/api/v3/teacher/analytics`)
- ~150 lines dead code removed
- Cleaner, focused dashboard matching SOTA patterns
