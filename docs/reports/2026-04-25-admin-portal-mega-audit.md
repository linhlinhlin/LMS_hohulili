# Admin Portal Mega Audit — 2026-04-25

> **Phạm vi**: toàn bộ admin portal `/admin/*` (14 surface) đối chiếu với SOTA 2026 baseline (Stripe Dashboard, Linear, Vercel, GitHub Org, Auth0, Okta, Canvas LMS, Moodle 4.x, Open edX, Coursera Business, Atlassian, Notion).
>
> **Phương pháp**: `agent-browser` recon (login admin@maritime.edu / admin123, viewport 1440×900) chụp 14 surface, đo DOM, đối chiếu route + source code. Research subagent SOTA cho 8 admin surface family (list/detail/hierarchical/operational/settings/audit/cross-cutting).
>
> **Đầu ra**: 32 finding (12 cross-cutting + 20 per-surface), phân loại P0/P1/P2, kèm acceptance criteria. Phục vụ multi-agent implementation theo roadmap PR sequencing.
>
> **Bổ sung cho audit dashboard 2026-04-25** (`docs/reports/2026-04-25-admin-dashboard-ux-audit.md`) — không trùng lặp với 18 finding dashboard ở doc trước.

---

## 1. Executive summary

Admin portal hiện tại có **3 vấn đề kiến trúc** lớn xuyên suốt toàn bộ surface:

| Vấn đề | Mức độ | Surface ảnh hưởng |
|---|---|---|
| **KPI card visual không thống nhất** (5 style khác nhau khắp các surface) | P0 | dashboard, users/all, users/admins, users/teachers, users/students, courses, offline-storage |
| **Primary action color không nhất quán** (purple/orange/red/blue tùy page) | P0 | users/all (purple), users/admins (orange-red), users/teachers (purple), categories (blue) |
| **Một số route render sai content** (settings, analytics → fall back về dashboard) | P0 | settings, analytics |

**3 surface chất lượng đáng tham khảo**:
- `/admin/offline-storage` — best designed: KPI strip + date range + 4 mini-chart + filter + table với empty state. Dùng làm reference cho các surface khác.
- `/admin/categories` — master-detail layout chuẩn cho hierarchical CRUD.
- `/admin/logs` — table-only nhưng có pagination + filter + detail link đầy đủ.

**3 surface yếu nhất**:
- `/admin/users/students` — **icon rendering bug** (P0, render giant black blocks full-width)
- `/admin/payouts` — không có KPI strip, không có time-range filter, empty state generic
- `/admin/settings` + `/admin/analytics` — render sai (fall back về dashboard)

**Khuyến nghị scope**: 4-5 PR, ưu tiên P0+P1. P2 đưa backlog. Implementation tuần tự theo dashboard PR-A → dashboard PR-B (design tokens) → portal PR-A (cross-cutting consistency) → portal PR-B đến PR-D (per-surface).

---

## 2. Methodology

### 2.1 Recon

- 14 screenshot full-page tại viewport 1440×900 (xem `/tmp/admin-audit/*.png`)
- Login admin@maritime.edu, role SYSTEM_ADMIN
- DOM measurements + sidebar highlight verification

### 2.2 Surface inventory

Theo `fe/src/app/features/admin/admin.routes.ts`:

| # | Path | Component | canActivate | Status |
|---|---|---|---|---|
| 1 | `/admin/dashboard` | AdminComponent (system/org variant) | `systemAdminPortalGuard` | Audited (PR #156) |
| 2 | `/admin/users/all` | UserManagementRefactored | — | Recon ✓ |
| 3 | `/admin/users/admins` | AdminUserManagement | `systemAdminGuard` | Recon ✓ |
| 4 | `/admin/users/teachers` | TeacherManagement | — | Recon ✓ |
| 5 | `/admin/users/students` | StudentManagement | — | Recon ✓ — **bug icon** |
| 6 | `/admin/users/by-course` | CourseUsers | — | Recon (skipped detail) |
| 7 | `/admin/courses` | CourseManagement | — | Recon ✓ |
| 8 | `/admin/courses/review` | CourseReview | — | Recon ✓ — empty state |
| 9 | `/admin/categories` | CategoryManagement | — | Recon ✓ |
| 10 | `/admin/organizations` | OrganizationList | — | Recon (skipped detail) |
| 11 | `/admin/analytics` | AdminAnalytics | — | Recon — **redirect bug** |
| 12 | `/admin/payouts` | AdminPayouts | — | Recon ✓ |
| 13 | `/admin/settings` | SystemSettings | `systemAdminGuard` | Recon — **redirect bug** |
| 14 | `/admin/logs` | AuditLogs | `systemAdminGuard` | Recon ✓ |
| 15 | `/admin/offline-storage` | OfflineStorageTelemetry | `systemAdminGuard` | Recon ✓ — **best designed** |

### 2.3 SOTA references chính

- **List/table**: Stripe Customers, Auth0 Users, Linear Members, GitHub org People → top toolbar (search + filter chip + primary CTA), bulk action sticky bar, default columns ≤ 6, drawer for view + page for edit
- **Course review**: Coursera Partner, Open edX Studio → side-by-side preview + decision panel, taxonomy reject reason, SLA badge
- **Hierarchical**: Notion, Confluence, WordPress, Moodle → master-detail, inline rename, drag-drop, course count badge, soft-delete reassignment picker
- **Analytics**: Stripe, Vercel Analytics → 4 KPI + 2 chart + 2 breakdown table + time-range top-right + CSV export
- **Payouts**: Stripe Connect → status tabs (Pending default), confirmation modal with amount echo, accounting CSV
- **Settings**: GitHub, Linear, Stripe → left sidebar of categories + per-section sticky save bar + danger zone
- **Audit log**: Auth0 Logs, GitHub audit → time-range, row-click drawer JSON, no row actions, CSV export
- **Telemetry**: Sentry, Firebase, Mixpanel → KPI + histogram + drill-in table with quota warnings

---

## 3. Cross-cutting findings (12)

### CC-01 [P0] — KPI card visual không thống nhất

**Quan sát**: 5 style khác nhau khắp các surface:
- Dashboard: text-only number + label + sub
- users/all: brand-tinted icon trong colored square box (10 hoạt động blue, 4 giảng viên purple, 2 học sinh green, 4 mới amber)
- users/admins: orange/red/gray icon trong tinted square (TỔNG ADMIN, SUPER ADMIN, BỊ KHÓA, HOẠT ĐỘNG GẦN ĐÂY)
- users/teachers: green/purple variant
- users/students: BROKEN — icon render full-page-width black blocks
- courses: 4 KPI text-only similar to dashboard
- offline-storage: 5 KPI với background tint colors (orange, blue, red, gray) — most polished

**SOTA**: 1 KPI card style xuyên suốt portal (Stripe pattern: number + label + delta/sparkline + ONE micro-viz). Color = semantic (success/warn/error), không brand decoration.

**Fix**: 
- Tạo shared `<app-kpi-card [value] [label] [trend] [variant]>` component
- Variant: `default | warning | success | error` — chỉ thay accent color, không icon decoration
- Tất cả surface admin dùng component này
- Token color theo `--color-success/warning/error/info` (không hard-code)

---

### CC-02 [P0] — Primary action color không nhất quán

**Quan sát**:
- users/all: "+ Thêm người dùng" PURPLE
- users/admins: "+ Thêm Quản trị viên" ORANGE/RED
- users/teachers: "+ Thêm Giảng viên" PURPLE
- categories: "+ Danh mục gốc" BLUE (#0056D2)
- offline-storage: "Làm mới" BLUE
- dashboard (sau PR #157 PR-A): "Thêm người dùng" BLUE

**Vi phạm**: Atlassian Color Foundations — 1 brand primary cho tất cả primary action; semantic color (red/orange) chỉ cho destructive hoặc warning.

**Fix**: Tất cả primary action button → `bg-[#0056D2] hover:bg-[#004BB5]` (theo design token CLAUDE.md). Dạng `<app-button variant="primary">`. Variant `danger` chỉ cho destructive.

---

### CC-03 [P0] — Route `/admin/settings` + `/admin/analytics` render sai (fall back dashboard)

**Bằng chứng**: Screenshot 2 page trên hiển thị nội dung dashboard (Bảng điều khiển hệ thống + KPI strip + Hành động nhanh + Trạng thái hệ thống), sidebar highlight "Trang chủ".

**Khả năng**:
- Component fail to load → router fall back
- Guard fail silently → redirect
- Component code render dashboard-like nội dung (sai logic)

**Fix**: 
1. Investigate `system-settings.component.ts` + `admin-analytics.component.ts`
2. Verify `systemAdminGuard` không reject admin@maritime.edu
3. Nếu component thật sự render sai → rewrite minimal placeholder nếu chưa có scope
4. Verify với agent-browser sau fix

---

### CC-04 [P1] — Sidebar không có collapsed state cho admin (vs teacher/student có)

**Quan sát**: Admin layout không có toggle collapse sidebar (288px fixed). Teacher + student có (288 ↔ 64).

**Fix**: Apply teacher pattern → add toggle + state persistence (localStorage). Symmetry across 3 portal types.

---

### CC-05 [P1] — Nav item hierarchy không thống nhất

**Quan sát**:
- users/admins screenshot: sidebar "Người dùng" expanded với sub-items (Tất cả, Giảng viên, Học viên)
- users/all + users/teachers screenshots: sidebar không expand (chỉ "Người dùng" flat)

**Vi phạm**: trạng thái expand không đồng nhất.

**Fix**: Sidebar config (`sidebar.config.ts`) — `users` parent với `children: [{label:'Tất cả', path:'/admin/users/all'}, ...]`. Auto-expand khi current route trong children.

---

### CC-06 [P1] — Bulk actions thiếu khắp các table

**Quan sát**: Tất cả table (users, courses, payouts, logs) chỉ có per-row actions. Không có checkbox + sticky bar.

**SOTA**: Linear, GitHub, Stripe Connect → checkbox cột đầu + bar sticky bottom hiện khi có selection ("3 selected | Suspend | Delete | Clear").

**Fix**: Tạo shared `<app-data-table>` với `selectable: true` flag + `<app-bulk-action-bar>` component. Apply cho users/all, courses (không cho audit-log vì append-only).

---

### CC-07 [P1] — Empty state không đủ Inform + Inspire + Activate

**Quan sát**:
- courses/review: "Không tìm thấy khóa học nào / Thử điều chỉnh từ khóa..." — Inform + Inspire OK, không Activate
- payouts: "Không có yêu cầu nào trong trạng thái này" — chỉ Inform
- offline-storage: "Chưa có bản ghi phù hợp / Hãy đổi bộ lọc..." — OK

**Fix**: Theo Carbon/PatternFly:
- Inform: "Không có X"
- Inspire: nguyên nhân ngắn ("Khi giảng viên nộp khóa học, sẽ hiện ở đây...")
- Activate: CTA button (link tới relevant page)

---

### CC-08 [P1] — Search bar style không nhất quán

**Quan sát**:
- users/all: search bar full-width với placeholder "Tìm kiếm theo tên hoặc email"
- users/admins: search bar full-width
- courses: search top + filter
- courses/review: search top-right small
- categories: không có search
- payouts: không có search
- logs: chỉ filter dropdown, không search

**Fix**: Standardize search location + style. Recommendation: search bar luôn ở top toolbar (cùng row với primary CTA), placeholder cụ thể per surface.

---

### CC-09 [P1] — Table column header style không thống nhất

**Quan sát**:
- users/all: NGƯỜI DÙNG, VAI TRÒ, TRẠNG THÁI (UPPERCASE)
- users/admins: QUẢN TRỊ VIÊN, VAI TRÒ, TRẠNG THÁI (UPPERCASE)
- courses: KHÓA HỌC, GIẢNG VIÊN, DOANH THU/HỌC VIÊN (UPPERCASE)
- logs: ID, BẢNG, HÀNH ĐỘNG (UPPERCASE)

OK uppercase consistent. Nhưng:
- Font-size không đồng nhất (12-14px)
- Letter-spacing không token hóa
- Color: gray-500 chỗ này, gray-600 chỗ khác

**Fix**: Token hóa `.table-header` style trong shared SCSS.

---

### CC-10 [P1] — Per-row action style không nhất quán

**Quan sát**:
- users/all: dropdown "Hoạt động ▾" trong cột Trạng thái (inline edit) + icon eye/edit
- users/admins: dropdown "Trạng thái ▾" + icon disable
- users/teachers: button "Hoạt động" + icon
- courses: 5-6 icon buttons trong 1 cell (eye, edit, ...)

**Fix**: Pattern:
- 1 primary action button (Approve/Open) per row
- Kebab menu `⋮` cho secondary (Edit, Suspend, Delete, View audit)
- Status pill (read-only) — KHÔNG inline-edit dropdown (nguy hiểm)

---

### CC-11 [P2] — Spacing/type inconsistency cross-surface

**Quan sát**: Cards padding 16/20/24px tùy chỗ. KPI font-size 24/30/36px tùy chỗ.

**Fix**: Sau khi dashboard PR-B (design token foundation) merged, apply token cho tất cả admin surface. Audit lần 2 đo lại.

---

### CC-12 [P2] — A11y: heading hierarchy có thể có vấn đề tương tự dashboard F-01 ở các surface khác

**Cần verify**: 
- 1 H1 per page
- Sidebar `<h2>Cổng Quản trị</h2>` lặp khắp page

**Fix**: Audit lần 2 sau khi dashboard F-01 fix lan ra cross-cutting.

---

## 4. Per-surface findings (20)

### S-USERS-ALL [P1]

#### F-U1: KPI label "Vai trò chính" không rõ semantics
"Vai trò chính (4 giảng viên)" — không rõ có nghĩa gì. Nên đổi thành "Giảng viên (4)" + thêm KPI "Học viên (2)" tương xứng.

#### F-U2: Button "Audit Edit" cụm từ lạ trong tiếng Việt
Top-right table button "Audit Edit". Nên đổi "Lịch sử chỉnh sửa" hoặc "Nhật ký thay đổi".

#### F-U3: Status inline-edit dropdown nguy hiểm
Per-row `Trạng thái ▾` dropdown cho phép đổi active/suspend ngay tại row → admin có thể click nhầm → suspend user. Nên thay bằng status pill (read-only) + kebab menu → "Khóa tài khoản" (modal confirm).

---

### S-USERS-ADMINS [P0]

#### F-AD1: Primary CTA màu RED/ORANGE nguy hiểm về visual
"+ Thêm Quản trị viên" red/orange button — màu này dành cho destructive (delete). Đổi BLUE per CC-02.

#### F-AD2: Inline-edit role dropdown ("Quản trị viên ▾") cực kỳ nguy hiểm
Cho phép đổi role admin ngay tại row → click nhầm → user mất quyền. Phải đặt sau modal confirm với re-auth.

---

### S-USERS-TEACHERS [P1]

#### F-T1: KPI "Đang dạy (0)" + "Tài khoản kích hoạt (0)" với data 0/0/0
Tất cả 3 KPI cuối = 0 trong khi total = 11 → KPI tính sai hoặc data chưa có. Verify backend.

#### F-T2: Primary CTA PURPLE
"+ Thêm Giảng viên" purple. Đổi BLUE per CC-02.

---

### S-USERS-STUDENTS [P0 — BLOCKING]

#### F-ST1: Icon rendering bug — full-page-width black blocks
Screenshot show 4-5 icon SVG full-width hàng dọc, mỗi cao ~500px. Lý do có khả năng:
- KPI card icon không có `width/height` constrain trong CSS
- Class `w-X` `h-X` bị purge
- Component template lỗi rendering

**Đây là blocker P0** — page hoàn toàn unusable. Phải fix trước mọi audit khác.

**Fix**: Inspect `student-management.component.{html,scss,ts}`. Tìm icon container, ép width/height.

---

### S-USERS-BY-COURSE [P2 — chưa recon detail]

Cần audit riêng — defer round 2.

---

### S-COURSES [P1]

#### F-C1: KPI "Chờ duyệt: 10" mâu thuẫn với /admin/courses/review (empty state)
Số liệu không nhất quán giữa 2 page. Verify nguồn data.

#### F-C2: Cột "Doanh thu/Học viên" gộp 2 metric trong 1 cell
Khó scan. Tách thành 2 cột hoặc dùng tooltip.

#### F-C3: Per-row 5-6 icon buttons không có label
Eye, edit, ..., không tooltip rõ ràng. Dùng kebab menu thay.

---

### S-COURSES-REVIEW [P1]

#### F-CR1: Empty state thiếu Activate
"Không tìm thấy khóa học nào / Thử điều chỉnh từ khóa..." — Inform + Inspire OK, không có Activate (tab "Tất cả" để clear filter).

#### F-CR2: Không có side-by-side review pane (theo Coursera/Open edX SOTA)
Reviewers phải click vào course detail page → mất context. Cần preview pane bên phải khi select 1 row.

#### F-CR3: Không có SLA badge "đang chờ X ngày"
Reviewer không biết cái nào urgent.

---

### S-CATEGORIES [P1]

#### F-CAT1: Master-detail layout tốt nhưng thiếu drag-drop reorder
Chỉ "+ Danh mục gốc" — admin phải dùng order numeric input nếu cần sort. Add drag-drop với `@angular/cdk/drag-drop`.

#### F-CAT2: Thiếu course count badge per category
"Kỹ thuật máy tàu biển ENG" — không biết bao nhiêu course đang ở category này. Add badge `(47)`.

#### F-CAT3: Empty state right pane "Chọn một danh mục..." OK nhưng có thể cải thiện
Add illustration + sub text.

---

### S-PAYOUTS [P0]

#### F-P1: Không có KPI strip
Payouts page bare bone — không thấy "Tổng pending amount", "Đã duyệt tháng này", "Trung bình per request". So với Stripe Connect Payouts: 4 KPI top.

#### F-P2: Thiếu time-range filter (primary control cho operational surface)
Stripe pattern: thời gian top-right "Last 7 / 30 / 90 days".

#### F-P3: Empty state generic "Không có yêu cầu nào trong trạng thái này"
Add Activate CTA + Inspire ("Khi giảng viên gửi yêu cầu rút tiền...").

---

### S-ANALYTICS [P0]

#### F-A1: Route render sai (fall back dashboard) — đã list trong CC-03

---

### S-SETTINGS [P0]

#### F-S1: Route render sai (fall back dashboard) — đã list trong CC-03

---

### S-LOGS [P1]

#### F-L1: Hành động hiển thị raw "INSERT/UPDATE" không human-readable
Auth0 pattern: `users.suspended` machine name + label "Suspended user". Map thành Vietnamese label.

#### F-L2: Thiếu time-range filter
Default "Tất cả" → table render hết log. Add date range top-right.

#### F-L3: Thiếu search by actor email/name
Khi điều tra incident, admin tìm kiếm "Ai đã làm X?" — phải search by actor.

#### F-L4: Thiếu CSV/JSON export (compliance need)
SOC2/ISO27001 audit thường yêu cầu export log. Add button "Xuất CSV" / "Xuất JSON".

---

### S-OFFLINE-STORAGE [—] BEST IN PORTAL

#### Reference design — không có finding mới
Layout này gần đạt SOTA: KPI + date range + 4 mini-chart + filter rail + table với empty state. **Dùng làm template** cho payouts/analytics/users redesign.

---

### S-ORGANIZATIONS [P2 — chưa recon detail]

Defer round 2.

---

## 5. Implementation roadmap

### PR sequencing dependency

```
[Dashboard PR-A: P0 a11y + redundant card] ──┐
                                              ├──> [Dashboard PR-B: design tokens] ──┐
                                              │                                       │
                                              v                                       v
                                              ├──> [Portal PR-A: cross-cutting CC-01..CC-03]
                                              │                                       │
                                              │    ┌──────────────────────────────────┘
                                              │    v
                                              │    ├──> [Portal PR-B: users family unify + fix S-ST1 P0]
                                              │    ├──> [Portal PR-C: courses + review redesign]
                                              │    ├──> [Portal PR-D: payouts + analytics + settings rebuild]
                                              │    └──> [Portal PR-E: logs improvements]
                                              v
                                              [Portal PR-Z: polish CC-04..CC-12]
```

### PR breakdown

| PR | Scope | Findings | LOC est | Priority | Sequence |
|---|---|---|---|---|---|
| **Dashboard PR-A/B** | (đã trong issue #157) | F-01..F-11 dashboard | — | P0/P1 | First |
| **Portal PR-A** | Cross-cutting unifications | CC-01, CC-02, CC-03 | 400-600 | P0 | After Dashboard PR-B |
| **Portal PR-B** | Users family + students bug | F-ST1, F-U1..U3, F-AD1..AD2, F-T1..T2 | 400-600 | P0 | Parallel with PR-A |
| **Portal PR-C** | Courses + review SOTA | F-C1..C3, F-CR1..CR3 | 500-800 | P1 | After PR-A |
| **Portal PR-D** | Payouts + analytics + settings rebuild | F-P1..P3, F-A1, F-S1 | 800-1200 | P0/P1 | After PR-A |
| **Portal PR-E** | Audit log improvements | F-L1..L4 | 200-400 | P1 | Parallel |
| **Portal PR-Z** | Polish + categories drag-drop | F-CAT1..CAT3, CC-04..CC-12 | 200-500 | P2 | Last |

### Out of scope (mở task riêng nếu cần)

- Dark mode
- Cmd+K global search
- Real-time activity feed (cần endpoint BE)
- Course preview side-by-side trong review (nặng — tách feature riêng)
- Re-auth flow trên role escalation (security-related, audit riêng)

---

## 6. Audit checklist (re-run sau implementation)

### Cross-cutting
- [ ] CC-01: Tất cả KPI dùng shared `<app-kpi-card>`, 1 visual style
- [ ] CC-02: Tất cả primary action `bg-[#0056D2]`
- [ ] CC-03: `/admin/settings` + `/admin/analytics` render đúng component
- [ ] CC-04: Admin sidebar có collapse toggle
- [ ] CC-05: Sidebar nav users family expand đồng nhất
- [ ] CC-06: Users + courses table có bulk action bar
- [ ] CC-07: Empty state đủ Inform + Inspire + Activate
- [ ] CC-08: Search bar position + style nhất quán
- [ ] CC-09: Table header style token hóa
- [ ] CC-10: Per-row action chuẩn (status pill read-only + kebab menu)
- [ ] CC-11: Spacing/type theo design token
- [ ] CC-12: A11y heading hierarchy

### Per-surface
- [ ] S-USERS-ALL: F-U1, F-U2, F-U3
- [ ] S-USERS-ADMINS: F-AD1, F-AD2
- [ ] S-USERS-TEACHERS: F-T1, F-T2
- [ ] S-USERS-STUDENTS: F-ST1 (P0 BLOCKING)
- [ ] S-COURSES: F-C1, F-C2, F-C3
- [ ] S-COURSES-REVIEW: F-CR1, F-CR2, F-CR3
- [ ] S-CATEGORIES: F-CAT1, F-CAT2, F-CAT3
- [ ] S-PAYOUTS: F-P1, F-P2, F-P3
- [ ] S-ANALYTICS: F-A1
- [ ] S-SETTINGS: F-S1
- [ ] S-LOGS: F-L1, F-L2, F-L3, F-L4
- [ ] S-OFFLINE-STORAGE: reference design (no change)

---

## 7. References

### LMS admin
- [Canvas LMS Admin Tools](https://canvas.instructure.com/doc/api/account_admin_tools.html)
- [Moodle 4.0 Site Admin](https://docs.moodle.org/dev/Moodle_4.0_navigation_improvements)
- [Open edX Studio docs](https://docs.openedx.org/)

### SaaS dashboards
- [Stripe Dashboard](https://stripe.com/docs/dashboard)
- [Stripe Connect Payouts](https://stripe.com/docs/connect/payouts)
- [Linear Members](https://linear.app/docs/members)
- [Vercel Analytics](https://vercel.com/docs/analytics)
- [GitHub Audit Log](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/reviewing-the-audit-log-for-your-organization)
- [Auth0 Logs](https://auth0.com/docs/deploy-monitor/logs)
- [Auth0 User Management](https://auth0.com/docs/manage-users/user-accounts)

### Design systems
- [Carbon Design System — Empty States](https://carbondesignsystem.com/patterns/empty-states-pattern/)
- [Carbon Data Visualization](https://carbondesignsystem.com/data-visualization/getting-started/)
- [Atlassian Design — Color](https://atlassian.design/foundations/color)
- [Atlassian Design — Settings pattern](https://atlassian.design/patterns/settings)
- [Primer (GitHub) — Settings](https://primer.style/product/components/settings)
- [Primer Table component](https://primer.style/components/table)

### Internal
- `docs/reports/2026-04-25-admin-dashboard-ux-audit.md` (precedent audit, 18 finding dashboard)
- `docs/reference/FRONTEND_GOTCHAS.md` (FE gotchas catalog)
- `backend/docs/adr/ADR-004-angular-signals-adoption.md`
- `.coderabbit.yaml` (path_instructions)
- Issue #157 (epic dashboard refresh)

---

**Audit completed**: 2026-04-25 10:30 ICT.
**Tool used**: agent-browser (skill), general-purpose subagent (web research), source code review.
**Next step**: meta-epic issue tracking implementation. Sub-agent session sẽ pickup theo PR sequencing trong §5.
