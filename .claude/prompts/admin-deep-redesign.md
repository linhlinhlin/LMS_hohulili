# Session Prompt: Admin Portal — Deep Redesign (SCSS + SOTA)

## Ngữ cảnh

### Sessions trước đã hoàn thành:
- **Student Analytics** — SCSS design system, skeleton, print CSS, responsive
- **Student Payment History** — Metrics strip, filter tabs, table right-align, Load More → Show All, enrollment-centric
- **Student Grades** — Enrollment-centric API (Canvas pattern), status tabs, semester dropdown, delivery mode tags [Lớp học] / [Tự học]
- **Course Detail** — INSTRUCTOR_LED enrollment UX fix ("Giảng viên sẽ thêm bạn vào lớp học")
- **Global Print Fix** — `styles.scss` reset `min-h-screen` + `flex-1` cho layout wrappers

### Kết quả: Toàn bộ student portal đã done — SCSS design system, skeleton, print, responsive, enrollment-centric, delivery mode logic.

### Bây giờ: Admin portal cần redesign tương tự — đồng bộ với design system đã thiết lập ở student.

---

## BẮT BUỘC đọc trước:
1. **`CLAUDE.md`** — project overview, architecture, multi-tier admin system
2. **`fe/UX_UI_GUIDELINES.md`** — quy tắc thiết kế hệ thống
3. **`fe/src/styles/_variables.scss`** — design tokens ($blue-primary, $gray-*, spacing, shadows)
4. **`fe/src/app/features/analytics/student-analytics.component.scss`** — SCSS reference chuẩn (metrics strip, chart card, responsive, print)
5. **`fe/src/app/features/student/pages/student-payment-history.component.scss`** — SCSS mới nhất (table, filter tabs, card layout, print)
6. **`fe/src/app/features/student/grades/student-grades.component.scss`** — SCSS grades (tab-chip, grade cards, semester badge, delivery mode tags)
7. **Memory** — kiểm tra sessions trước

---

## Hiện trạng Admin Portal (25 components, 17 pages):

### Vấn đề chung (95% pages):
- **Tailwind inline** — KHÔNG dùng SCSS design system
- **Hardcoded colors** — `#0056D2`, `#004BB5`, `#E5E7EB` thay vì `$blue-primary`, `$gray-*`
- **Thiếu skeleton loading** — chỉ 4/16 pages có (dashboard, payouts, org-list, course-users)
- **Không có print CSS** — admin pages cần in: dashboard KPIs, user lists, analytics, audit logs
- **Không dùng design tokens** — spacing, shadows, radius hardcoded

### Ngoại lệ tốt (dùng làm reference):
- `course-users.component.scss` (11.7 KB) — ĐÃ dùng SCSS design system, skeleton, tab chips

---

## Danh sách pages + priority:

### P0 — Trang chính (dùng nhiều nhất)
| # | Page | Route | Component | Skeleton? | SCSS? |
|---|------|-------|-----------|-----------|-------|
| 1 | **Dashboard** | `/admin/dashboard` | `admin.component.ts` | ✅ Có | ❌ Tailwind |
| 2 | **User Management** | `/admin/users/all` | `user-management-refactored.component.ts` | ❌ | ❌ Tailwind |
| 3 | **Course Management** | `/admin/courses` | `course-management.component.ts` | ✅ Có | ❌ Tailwind |
| 4 | **Course Review** | `/admin/courses/review` | `course-review.component.ts` | ❌ | ❌ Tailwind |
| 5 | **Analytics** | `/admin/analytics` | `admin-analytics.component.ts` | ❌ | ❌ Tailwind |

### P1 — Trang quản lý
| # | Page | Route | Component | Skeleton? | SCSS? |
|---|------|-------|-----------|-----------|-------|
| 6 | **Category Management** | `/admin/categories` | `category-management.component.ts` | ❌ | ❌ Tailwind |
| 7 | **Teacher Management** | `/admin/users/teachers` | `teacher-management.component.ts` | ❌ | ❌ Tailwind |
| 8 | **Student Management** | `/admin/users/students` | `student-management.component.ts` | ❌ | ❌ Tailwind |
| 9 | **Payout Management** | `/admin/payouts` | `admin-payouts.component.ts` | ✅ Có | ❌ Tailwind |
| 10 | **Organization List** | `/admin/organizations` | `organization-list.component.ts` | ✅ Có | ❌ Tailwind |
| 11 | **Organization Detail** | `/admin/organizations/:id` | `organization-detail.component.ts` | ❌ | ❌ Tailwind |

### P2 — System Admin only
| # | Page | Route | Component | Skeleton? | SCSS? |
|---|------|-------|-----------|-----------|-------|
| 12 | **System Settings** | `/admin/settings` | `system-settings.component.ts` | ❌ | ❌ Tailwind |
| 13 | **Audit Logs** | `/admin/logs` | `audit-logs.component.ts` | ❌ | ❌ Tailwind |
| 14 | **Offline Telemetry** | `/admin/offline-storage` | `offline-storage-telemetry.component.ts` | ❌ | ❌ Tailwind |
| 15 | **Admin Users** | `/admin/users/admins` | `admin-user-management.component.ts` | ❌ | ❌ Tailwind |
| 16 | **Course Preview** | `/admin/courses/:id/preview` | `course-content-preview.component.ts` | — | ❌ Tailwind |
| 17 | **Users by Course** | `/admin/users/by-course` | `course-users.component.ts` | ✅ Có | ✅ SCSS |

---

## Cách tiếp cận — suy nghĩ kỹ theo SOTA:

### Bước 1: Nghiên cứu sâu (BẮT BUỘC dùng `cot-research` SKILL)
- [ ] **Admin dashboard SOTA**: Stripe Dashboard, Shopify Admin, Canvas Admin, Vercel Dashboard — KPI layout, charts, activity feed
- [ ] **Data table SOTA**: Material Design 3 Data Tables, Ant Design Pro, Shopify Polaris — pagination, sort, filter, bulk actions
- [ ] **Admin đa vai trò**: ADMIN vs ORG_ADMIN hiện tại đã tốt chưa? So sánh Canvas Admin vs Instructor vs TA
- [ ] **Print cho admin**: Dashboard KPIs, user lists, analytics — nên in được không? Format nào?

### Bước 2: Thiết kế (BẮT BUỘC dùng `brainstorming` SKILL)
- [ ] **SCSS migration strategy** — batch convert hay page-by-page?
- [ ] **Skeleton loading template** — tạo 1 pattern dùng chung cho tất cả admin tables
- [ ] **Admin table component** — nên tạo shared component hay mỗi page tự style?
- [ ] **Dashboard redesign** — metrics strip (analytics pattern) hay card grid?

### Bước 3: Implement theo priority
- [ ] P0 trước: Dashboard → User Management → Course Management → Course Review → Analytics
- [ ] P1 sau: Categories → Teacher/Student → Payouts → Orgs
- [ ] P2 cuối: Settings → Logs → Telemetry

---

## Quy tắc kỹ thuật (BẮT BUỘC):

### Angular 20+
```typescript
@Component({
  selector: 'app-admin-xxx',
  // standalone: true là DEFAULT — KHÔNG ghi
  imports: [CommonModule],  // Chỉ khi dùng pipes/directives
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-xxx.component.html',
  styleUrl: './admin-xxx.component.scss',
})
```
- `inject()` không constructor
- `signal()`, `computed()` cho state
- `input()`, `output()` cho I/O
- `@if`, `@for`, `@switch` — KHÔNG `*ngIf`, `*ngFor`

### SCSS Design System
```scss
@use '../../../../styles/variables' as *;

// Dùng tokens: $blue-primary, $gray-500, $spacing-4, $radius-md, $shadow-sm
// KHÔNG hardcode: #0056D2, 16px, 8px, 0 1px 2px rgba(0,0,0,0.05)
```

### Tách files
- Template > 50 dòng → tách `.html`
- Có custom styles → tách `.scss`
- KHÔNG inline template dài

### Table Pattern (admin data tables)
```scss
// Số tiền: text-align right (Material Design, Stripe, Apple HIG)
.col-amount { text-align: right; }

// Status/text: text-align left (KHÔNG center)
// Header (th) phải match data alignment

// Pagination: admin tables dùng server-side pagination
// Student pages < 50 items → show all
// Admin tables > 100 items → flanking pagination [< 1 2 3 >]
```

### Filter Tabs Pattern (đã chuẩn hóa)
```html
<div class="filter-bar" role="tablist">
  <button class="tab-chip" [class.active]="..." role="tab" [attr.aria-selected]="...">
    <span class="tab-label">Label (count)</span>
  </button>
</div>
```

### Responsive
```scss
@media screen and (max-width: $breakpoint-md) { /* tablet */ }
@media screen and (max-width: $breakpoint-sm) { /* mobile */ }
@media screen and (max-width: 340px) { /* ultra-small */ }
// LUÔN có `screen and` — tránh conflict với print
```

### Print CSS
```scss
@media print {
  :host { display: block; }
  .page { background: white !important; min-height: auto !important; overflow: visible !important; }
  // Ẩn: sidebar, nav, filters, actions
  // Hiện: table full, metrics, data
  // Condensed padding cho A4
  // break-inside: avoid cho table rows
  // print-color-adjust: exact cho badges
}
```

### Skeleton Loading
```html
@if (isLoading()) {
  <!-- Skeleton match layout thật -->
  <div class="skeleton-xxx animate-pulse">
    <div class="sk" style="height:Npx;width:Mpx"></div>
  </div>
}
```

---

## Multi-tier Admin System (CRITICAL):

| Role | Vietnamese | Access |
|------|-----------|--------|
| **ADMIN** | Quản trị hệ thống | Full — settings, logs, delete users/courses |
| **ORG_ADMIN** | Chuyên viên quản lý | Operations — review courses, user CRUD (teacher/student only), analytics |

### Security Rules:
- **ADMIN-only (3 endpoints)**: DELETE user, DELETE course, system settings
- **ORG_ADMIN CANNOT**: create/modify/promote ADMIN/ORG_ADMIN users
- **FE Guards**: `adminGuard = [ADMIN, ORG_ADMIN]`, `systemAdminGuard = [ADMIN]`

### UI Implications:
- ORG_ADMIN không thấy: Settings, Audit Logs, Offline Storage, Admin Users tab
- ORG_ADMIN thấy nhưng limited: User Management (chỉ teacher/student)
- Dashboard KPIs khác nhau giữa ADMIN vs ORG_ADMIN

---

## Design Tokens Reference:

```scss
// Colors
$blue-primary: #0056D2;    $blue-hover: #004BB8;
$gray-50 → $gray-900;      $success: #059669;
$warning: #D97706;          $error: #DC2626;

// Spacing (8px grid)
$spacing-1: 4px → $spacing-16: 64px;

// Radius
$radius-sm: 4px;  $radius-md: 8px;  $radius-full: 9999px;

// Shadows
$shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
$shadow-card: 0 1px 3px rgba(0,0,0,0.1);
```

---

## KHÔNG làm:
- Không sửa student pages (đã done)
- Không sửa teacher pages (team khác đang làm)
- Không sửa backend API (trừ khi phát hiện bug)
- Không thêm features mới (chỉ redesign visual + UX)
- Không dùng thư viện UI bên ngoài (Material, Ant Design) — native HTML + SCSS
- Không refactor architecture — chỉ chuyển Tailwind → SCSS + thêm skeleton/print

---

## Tham khảo design:
- **Stripe Dashboard** — KPI cards, data tables, clean navigation
- **Shopify Admin** — Table pagination, bulk actions, filter bar
- **Vercel Dashboard** — Minimal, fast, metrics-focused
- **Canvas Admin** — LMS-specific admin patterns (user management, course approval)
- **Student pages SCSS** — `student-analytics.component.scss`, `student-payment-history.component.scss`, `student-grades.component.scss` là mẫu SCSS chuẩn

---

## Deliverables mỗi page:
1. `.component.ts` — rewrite (external template/styles, signals, computed)
2. `.component.html` — tách từ inline template
3. `.component.scss` — SCSS dùng `_variables.scss` tokens
4. Skeleton loading match layout thật
5. Print CSS cho pages có data cần in
6. Responsive 3 breakpoints (desktop/tablet/mobile)
7. Build pass (`ng build` không lỗi)

---

## Lưu ý từ sessions trước (đã học được):
- **Print 2 trang**: Root cause = layout wrapper `min-h-screen` + `flex-1`. Đã fix global trong `styles.scss` — admin layout cũng được benefit.
- **Table alignment**: Số tiền right-align, text left-align, KHÔNG center cho status/method (Material Design, Stripe, Apple HIG)
- **Load More vs Pagination**: Student < 50 items → show all. Admin > 100 items → server-side pagination
- **Filter tabs**: Count trong ngoặc "Label (N)", `role="tablist"`, `aria-selected`, `flex-wrap` trên mobile
- **Delivery mode tags**: [Lớp học] tím (#7C3AED), [Tự học] xám — chỉ hiện trên Grades page, KHÔNG trên mọi page
- **Semester filter**: Chỉ hiện khi có INSTRUCTOR_LED courses với semester data

---

*Prompt viết bởi Claude Code — Session 2026-04-09 (Payment History + Grades Redesign + Enrollment-Centric API)*
