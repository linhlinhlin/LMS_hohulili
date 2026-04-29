# LMS Maritime — Page UX/UI Standard

> **Last Updated**: 2026-04-30 | **Status**: Active reference. Áp dụng cho tất cả pages trong `/teacher/*`, `/admin/*`, `/student/*`, `/org-admin/*`. Reference implementation: `fe/src/app/features/teacher/dashboard/teacher-dashboard.component.{ts,html,scss}` (Khóa học của tôi) và `fe/src/app/features/teacher/students/student-management.component.{ts,html,scss}` (Quản lý học viên).

Tài liệu này tổng hợp tiêu chuẩn UX/UI hiện tại của project sau wave đồng bộ Q1 2026. Mọi page mới hoặc rewrite phải tuân theo các nguyên tắc dưới đây để giữ consistency.

---

## 1. Architecture & Component conventions

### 1.1 File structure
- **Mọi component ≥ 100 LOC**: tách 3 files `.ts` / `.html` (templateUrl) / `.scss` (styleUrls)
- **Component < 100 LOC**: inline template + inline styles được, nhưng vẫn ưu tiên 3-file
- **KHÔNG** dồn template + styles vào `.ts` cho component lớn (vd 500 LOC như anti-pattern cũ)

### 1.2 Angular 20+ conventions (BẮT BUỘC)
```typescript
@Component({
  selector: 'app-feature',
  // standalone: true là DEFAULT — KHÔNG specify
  imports: [RouterModule, FormsModule, CommonModule, NgOptimizedImage],
  templateUrl: './feature.component.html',
  styleUrls: ['./feature.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush  // BẮT BUỘC
})
export class FeatureComponent {
  private service = inject(MyService);              // inject(), không constructor
  data = input.required<Data>();                    // input(), không @Input()
  itemSelected = output<Item>();                    // output(), không @Output()
  items = signal<Item[]>([]);                       // signal cho state
  itemCount = computed(() => this.items().length);  // computed cho derived
}
```

### 1.3 Template syntax (Angular 20)
- `@if` / `@for` / `@switch` thay cho `*ngIf` / `*ngFor` / `*ngSwitch`
- `@for ... track item.id` — luôn track by ID
- `@empty` cho fallback list rỗng

---

## 2. Design Tokens (`@use '../styles/variables' as *`)

### 2.1 Colors
```scss
// Primary (Coursera Blue)
$blue-primary: #0056D2;   $blue-hover: #004BB8;   $blue-light: #E6F0FF;

// Neutrals (Gray scale)
$gray-50 → $gray-900;     $border-default: $gray-200;

// Semantic
$success: #059669;   $success-light: #D1FAE5;   // ECFDF5 bg in badges
$warning: #D97706;   $warning-light: #FEF3C7;   // FFFBEB bg in badges
$error: #DC2626;     $error-light: #FEE2E2;     // FEF2F2 bg in badges
$info: #2563EB;      $info-light: #DBEAFE;
```

**Quy tắc**: KHÔNG hardcode colors trong component SCSS. Luôn dùng tokens. Hardcoded chỉ chấp nhận cho 1-off design accents nếu thật sự cần thiết.

### 2.2 Spacing (8px grid)
```scss
$spacing-1: 4px   $spacing-2: 8px    $spacing-3: 12px   $spacing-4: 16px
$spacing-5: 20px  $spacing-6: 24px   $spacing-8: 32px   $spacing-10: 40px
```

### 2.3 Radius
```scss
$radius-sm: 4px    $radius-md: 8px    $radius-lg: 12px   $radius-full: 9999px
```

### 2.4 Shadows
```scss
$shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
$shadow-md: 0 1px 3px rgba(0,0,0,0.1)
$shadow-card: 0 1px 3px rgba(0,0,0,0.1)
$shadow-card-hover: 0 4px 6px rgba(0,0,0,0.1)
```

### 2.5 Typography
```scss
$text-xs: 12px    $text-sm: 14px    $text-base: 16px
$text-lg: 18px    $text-xl: 20px    $text-2xl: 24px
$font-medium: 500    $font-semibold: 600    $font-bold: 700
```

---

## 3. Layout

### 3.1 Page container
```scss
.page-container {
  background: #FAFAFA;
  min-height: 100vh;
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;          // Desktop
}

@media (max-width: 768px) { padding: 24px 16px; }   // Tablet
@media (max-width: 640px) { padding: 16px 12px; }   // Mobile
```

### 3.2 Page header
- Title: `28px font-bold #1F1F1F` (mobile: `20px`)
- Subtitle: `$text-sm #636363`
- Back link (drill-down): SVG arrow trái + `$blue-primary` + `$text-xs $font-medium`
- CTA button (nếu có): primary blue, đặt phải

---

## 4. Section header (filter + search bar)

```html
<div class="section-header">
  <!-- Tabs (left) -->
  <div role="tablist" aria-label="..." class="flex flex-wrap items-center gap-2">
    @for (tab of tabs; track tab.key) {
      <button role="tab" [attr.aria-selected]="active === tab.key"
              class="rounded-full border px-3.5 py-1.5 text-sm font-medium ..."
              [class.bg-[#0056D2]]="active === tab.key"
              [class.text-white]="active === tab.key">
        {{ tab.label }} ({{ getTabCount(tab.key) }})
      </button>
    }
  </div>

  <!-- Search (right) -->
  <div class="search-wrapper">
    <svg class="search-icon" aria-hidden="true">...</svg>
    <input type="search" class="search-input" aria-label="..." />
  </div>
</div>
```

**Quy tắc**:
- Tabs dùng inline Tailwind utilities (consistent với reference)
- ARIA: `role="tablist"` + `aria-label` mô tả filter, mỗi tab `role="tab"` + `aria-selected`
- **NẾU hiện count cho 1 tab → phải hiện count cho TẤT CẢ tabs** (consistency). Tránh "Tất cả (5)" mà các tab khác trống.
- Search: 36px height, `type="search"`, `aria-label`, focus ring rgba(0,86,210,0.1)
- Border-bottom 1px `$border-default` separating from content

---

## 5. Cards (course/list cards)

### 5.1 Cấu trúc
```html
<button type="button" class="course-card" [attr.aria-label]="'Mở: ' + item.title">
  <div class="course-card-body">
    <div class="course-thumbnail">160x90 image hoặc placeholder</div>
    <div class="course-metadata">
      <h3 class="course-title">{{ item.title }}</h3>
      <div class="course-meta">code · count · stats</div>
    </div>
    <div class="course-actions">
      <span class="status-badge badge-approved">...</span>
      <span class="course-date">Hôm nay</span>
      <span class="card-arrow">→</span>
    </div>
  </div>
</button>
```

### 5.2 Quy tắc
- Card click element BẮT BUỘC là `<button>` hoặc `<a>` — KHÔNG phải `<div>` (a11y)
- `aria-label` mô tả destination
- Thumbnail 160x90 (mobile 120x72 → 100% × 140px khi stack)
- Title 15px semibold, truncate
- Hover: shadow tăng + title → blue, arrow translate 2px
- Padding: `$spacing-2`, gap: `$spacing-4`
- Border: `1px solid $border-default`, radius: `$radius-md`
- Shadow: `$shadow-sm`

---

## 6. Status badges

### 6.1 Format
```scss
.status-badge {
  font-size: 11px;
  font-weight: $font-medium;
  padding: 3px 10px;
  border-radius: $radius-full;
  min-width: 72px;
  text-align: center;
}
```

### 6.2 Naming convention
**BẮT BUỘC dùng `badge-{semantic}`**, KHÔNG `pill-*` hoặc `chip-*`:

| Class | Background | Color | Use case |
|-------|-----------|-------|----------|
| `badge-approved` | #ECFDF5 | #059669 | Course đã duyệt |
| `badge-pending` | #FFFBEB | #D97706 | Course chờ duyệt |
| `badge-draft` | $gray-100 | $gray-500 | Course nháp |
| `badge-rejected` | #FEF2F2 | #DC2626 | Course bị từ chối |
| `badge-active` | #ECFDF5 | #059669 | Student đang học |
| `badge-completed` | $info-light | $info | Student hoàn thành |
| `badge-suspended` | #FEF2F2 | #DC2626 | Student tạm khóa |
| `badge-muted` | $gray-100 | $gray-500 | Status neutral (dropped/expired) |

---

## 7. Empty state

```html
<div class="empty-state">
  <div class="empty-state-icon"><svg width="40" height="40">...</svg></div>
  <h3 class="empty-state-title">Tiêu đề ngắn</h3>
  <p class="empty-state-text">Mô tả contextual + actionable hint</p>
  <a routerLink="/..." class="retry-link">Action CTA &rarr;</a>
</div>
```

```scss
.empty-state {
  padding: 40px 24px;
  background: white;
  border: 1px dashed $border-dark;
  border-radius: $radius-md;
  text-align: center;
}
.empty-state-icon { width: 40px; height: 40px; color: $gray-400; }
.empty-state-title { font-size: 15px; font-weight: $font-semibold; color: $gray-700; }
.empty-state-text { font-size: 13px; color: #636363; max-width: 320px; }
.retry-link { font-size: $text-sm; color: $blue-primary; }
```

**Quy tắc**:
- Multi-variant empty states: phân biệt "no data" vs "filter no match" vs "error"
- Empty CTA phải actionable (link đến trang tạo, hoặc clear filter)

---

## 8. Skeleton loading

### 8.1 Pattern
```scss
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeleton-thumb { animation: pulse 1.5s ease-in-out infinite; background: $gray-100; }
.skeleton-line { height: 14px; border-radius: $radius-sm; ... }
.skeleton-row  { height: 36px; ... }
```

### 8.2 Usage
- Loading list: 3 skeleton cards/rows giữ structure layout
- KHÔNG dùng plain text "Đang tải..." — luôn skeleton

---

## 9. Pagination

### 9.1 BẮT BUỘC dùng shared `<app-pagination>`
```html
@if (totalPages() > 1) {
  <app-pagination
    [currentPage]="pageIndex()"
    [totalPages]="totalPages()"
    [totalItems]="total()"
    [itemsPerPage]="pageSize"
    (pageChange)="goToPage($event)" />
}
```

### 9.2 Pattern
- Desktop: "Hiển thị **X** đến **Y** trong tổng số **Z** kết quả" + numbered buttons + ellipsis (1 ... 5 6 7 ... 20)
- Mobile: prev/next + "Trang X/Y"
- Page size cố định 10 (KISS — không cần page size selector trừ khi có lý do specific)
- KHÔNG dùng custom prev/next + "Trang X/Y" → luôn dùng shared component

### 9.3 Reference implementations
- `fe/src/app/shared/components/pagination/pagination.component.ts`
- Used in: `public/courses`, `admin/users-table`, `admin/organization-list`, `teacher/students`

---

## 10. Tables

### 10.1 Header
```scss
.students-table th {
  background: $gray-50;
  color: $text-muted;
  font-size: 11px;
  font-weight: $font-bold;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 14px 20px;
}
```

### 10.2 Row
- `padding: 14px 20px` — desktop, `12px 14px` — tablet
- `border-bottom: 1px solid $border-default`
- Last row: `border-bottom: 0`
- Hover: `background: $gray-50`

### 10.3 Action column
- Header: text-right
- Multiple actions: cùng style (cùng `action-btn` outline hoặc cùng link)
- KHÔNG mix link "Chi tiết" + button "Nhắn tin" — visual inconsistency
- Spacing: `gap: $spacing-3`
- Justify: flex-end

### 10.4 Mobile responsive
- Wrap trong `.table-card` với `overflow-x: auto`
- `min-width: 640px` để đảm bảo readable trên mobile (horizontal scroll)

---

## 11. A11y (BẮT BUỘC)

### 11.1 Focus visible
```scss
@mixin focus-visible {
  &:focus-visible {
    outline: 2px solid $blue-primary;
    outline-offset: 2px;
  }
}
```
Áp dụng cho **TẤT CẢ** interactive: buttons, links, inputs, cards, tabs, pagination buttons.

### 11.2 Semantic HTML
- Clickable card → `<button>` (không `<div>` với onclick)
- Navigation link → `<a routerLink>`
- Form input → `<input>` với `<label>` hoặc `aria-label`

### 11.3 ARIA
- `role="tablist"` parent, `role="tab"` children, `aria-selected`
- `role="progressbar"` với `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`
- `aria-label` mô tả button action (đặc biệt icon-only buttons)
- `aria-current="page"` cho active nav link
- `aria-hidden="true"` cho decorative SVG

### 11.4 Keyboard navigation
- Tab order theo visual flow
- Enter/Space activate buttons
- Search input: `(keyup.enter)` cho explicit submit

---

## 12. Microcopy (Vietnamese)

### 12.1 Quy tắc
- **Tiếng Việt CÓ DẤU** — không "Quan ly hoc vien"
- Không dùng jargon kỹ thuật ("CRUD", "GET request", "404") cho UI giảng viên
- Action buttons: động từ rõ ràng ("Tạo khóa học mới", "Xem chi tiết", "Nhắn tin")
- Subtitle: contextual và informative

### 12.2 Conventions
| English (avoid) | Vietnamese (use) |
|----------------|------------------|
| Last accessed | Hoạt động gần nhất |
| Enrolled at | Ngày ghi danh |
| Updated at | Cập nhật lúc |
| Loading... | Đang tải... |
| No results found | Không tìm thấy kết quả phù hợp |
| Try again | Thử lại |
| Clear filter | Xóa bộ lọc |
| View details | Xem chi tiết |
| Send message | Nhắn tin |
| Today / Yesterday / N days ago | Hôm nay / Hôm qua / N ngày trước |

### 12.3 Date formatting
- Recent: "Hôm nay", "Hôm qua", "3 ngày trước"
- Older: `toLocaleDateString('vi-VN')` → "30/04/2026"

---

## 13. Filter logic (SOTA)

### 13.1 Hide irrelevant data by default
- Quản lý học viên CHỈ hiện courses APPROVED/PUBLISHED (course DRAFT/PENDING không có students)
- Reference: Coursera Learners, Udemy Students, Canvas People — đều ẩn draft/pending

### 13.2 Sort meaningful
- Course pickers: `enrolledCount DESC` (course nhiều học viên lên đầu)
- Recent activity: `updatedAt DESC` hoặc `lastAccessed DESC`
- Always provide a deterministic sort

### 13.3 Real data
- KHÔNG dùng mock/fake counts trong production code
- Per-status counts: gọi API thật (parallel forkJoin nếu cần) hoặc BE endpoint dedicated
- Tab counts phải accurate

---

## 14. Mobile responsive breakpoints

```scss
$breakpoint-sm: 640px   // Mobile landscape
$breakpoint-md: 768px   // Tablet
$breakpoint-lg: 1024px  // Desktop
$breakpoint-xl: 1280px  // Large desktop
```

### Quy tắc
- `< 640px`: section header stack vertical, cards stack column, table horizontal scroll
- `640-768px`: card thumbnail giảm xuống 120x72
- `> 768px`: full desktop layout

---

## 15. Reference implementations

| Surface | Path | Notes |
|---------|------|-------|
| Teacher Khóa học của tôi | `fe/src/app/features/teacher/dashboard/` | Reference cho header + tab + card pattern |
| Teacher Quản lý học viên | `fe/src/app/features/teacher/students/student-management.component.*` | Reference cho 2-view drill-down + table |
| Public Courses | `fe/src/app/features/courses/courses.component.*` | Reference cho `<app-pagination>` usage |
| Admin Users | `fe/src/app/features/admin/.../users-table.component.*` | Reference cho table + badge pattern |
| Shared Pagination | `fe/src/app/shared/components/pagination/pagination.component.ts` | DÙNG component này, không tự code |

---

## Changelog

- **2026-04-30**: Initial draft sau wave đồng bộ Q1 2026 — `teacher/students` PR #299 + #301
- **2026-04-30**: Add Section 13 (Filter logic SOTA), Section 12 (Microcopy conventions)
