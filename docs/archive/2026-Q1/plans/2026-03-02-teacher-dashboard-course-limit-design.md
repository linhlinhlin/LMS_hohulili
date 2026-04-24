# Teacher Dashboard Course Limit — Design Doc

> **Date**: 2026-03-02 | **Session**: S114b | **Status**: Approved

## Problem

Teacher dashboard currently displays up to 6 courses per tab. With 17+ courses, the dashboard becomes a scrollable list rather than a quick-glance overview. This violates the SOTA dashboard pattern where dashboards serve as "quick re-entry surfaces" showing only the most relevant items.

## SOTA Research

| Platform | Default Items | Sort | "See More" Pattern |
|----------|--------------|------|-------------------|
| Canvas LMS | 20 cards | Alphabetical | View switching |
| Moodle | 12 + "Recently Accessed" (3-5) | Last accessed | Dropdown count selector |
| GitHub | 6-8 "Top Repos" | Recency-weighted | "Show more" link |
| Notion | 20 "Recently visited" | Most recently visited | Horizontal scroll |
| Google Classroom | All (no cap) | Most recent | Infinite scroll |

**Key insight**: GitHub (6-8 items, recency sort, "Show more" link) and Moodle dual-block pattern (small "recently accessed" widget + full list page) are the most relevant patterns for our 2-column teacher dashboard.

## Chosen Approach: Tabs + Smart Footer Bar

### Display Rules
- Show **4 courses** maximum per tab (sorted by `updatedAt` DESC)
- Tab counts show **real totals**: `Tất cả (17)`, `Đã duyệt (6)`, etc.
- Footer bar always visible when filtered total > displayed count

### Footer Bar UX
```
┌──────────────────────────────────────────────────────────────┐
│  Hiển thị 4/17 khóa học gần nhất      Xem tất cả khóa học → │
└──────────────────────────────────────────────────────────────┘
```

Footer text adapts to active tab:
- "Tất cả" tab: "Hiển thị 4/17 khóa học gần nhất"
- "Đã duyệt" tab: "Hiển thị 4/6 khóa học đã duyệt"
- "Nháp" tab: "Hiển thị 4/11 khóa học nháp"
- When total ≤ 4: footer hidden (no need)

### Sort Order
- `updatedAt DESC` — most recently edited courses appear first
- Fallback to `createdAt DESC` when `updatedAt` is null

## Files to Modify

| File | Changes |
|------|---------|
| `teacher-dashboard.component.ts` | `filteredCourses`: sort + slice(0,4), add `totalFilteredCount` + `footerText` computed |
| `teacher-dashboard.component.html` | Add footer bar after course list, update threshold from `> 6` |
| `teacher-dashboard.component.scss` | Style `.courses-footer` bar |

## Implementation

### TS Changes
```typescript
private readonly DISPLAY_LIMIT = 4;

filteredCourses = computed(() => {
  const tab = this.activeTab();
  const courses = this.teacher.courses();
  const filtered = tab === 'all' ? courses : courses.filter(c => this.matchTab(c.originalStatus, tab));
  return this.sortByRecent(filtered).slice(0, this.DISPLAY_LIMIT);
});

totalFilteredCount = computed(() => {
  const tab = this.activeTab();
  const courses = this.teacher.courses();
  if (tab === 'all') return courses.length;
  return courses.filter(c => this.matchTab(c.originalStatus, tab)).length;
});

hasMoreCourses = computed(() => this.totalFilteredCount() > this.DISPLAY_LIMIT);

footerText = computed(() => {
  const shown = Math.min(this.DISPLAY_LIMIT, this.totalFilteredCount());
  const total = this.totalFilteredCount();
  const tab = this.activeTab();
  const suffix = tab === 'all' ? 'gần nhất' : this.getTabSuffix(tab);
  return `Hiển thị ${shown}/${total} khóa học ${suffix}`;
});
```

### HTML Footer
```html
@if (hasMoreCourses()) {
  <div class="courses-footer">
    <span class="footer-summary">{{ footerText() }}</span>
    <a routerLink="/teacher/courses" class="footer-link">
      Xem tất cả khóa học
      <svg>→</svg>
    </a>
  </div>
}
```

### SCSS Footer
- Muted text left + link right
- `border-top: 1px solid #E5E7EB`, padding 12px 16px
- Match student dashboard design tokens

## Verification
1. Build: `npx ng build` — 0 errors
2. Browser: verify 4 courses shown (not 6)
3. Tab counts: verify totals are real (17, 6, 11, 0)
4. Footer: verify "Hiển thị 4/17 khóa học gần nhất" text
5. Footer: verify text changes per tab
6. Sort: verify most recently edited course appears first
7. Click "Xem tất cả" → navigates to `/teacher/courses`
8. Edge case: tab with ≤4 courses → no footer shown
