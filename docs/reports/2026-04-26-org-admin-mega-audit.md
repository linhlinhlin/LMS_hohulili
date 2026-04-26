# Org-Admin Portal Mega Audit — 2026-04-26

> **Phạm vi**: toàn bộ `/org-admin/*` portal (8 surface) đối chiếu SOTA April 2026 + đã ship cho admin portal (epic #157, #161, #186).
>
> **Khám phá quan trọng**: org-admin **chia sẻ phần lớn component với admin portal** — hầu hết cải thiện từ epic #186 đã tự động kế thừa. Audit này tập trung vào surface UNIQUE cho org-admin + verify các fix admin có rendered đúng cho ORG_ADMIN role.
>
> **Phương pháp**: source code review (FE dev server node_modules corrupted nên skip browser audit). Cross-reference admin epic findings + org-admin routes inventory.

---

## 1. Surface inventory

`fe/src/app/features/org-admin/org-admin.routes.ts` — 7 routes hợp lệ:

| Path | Component | Source | Notes |
|---|---|---|---|
| `/org-admin/dashboard` | `AdminComponent` → `AdminOrgDashboardComponent` (role-routed) | `dashboard/admin-org-dashboard.component` | **UNIQUE** rendering cho ORG_ADMIN |
| `/org-admin/users/teachers` | `TeacherManagementComponent` | shared with admin | ✅ Inherited PR #176, #178, #206 |
| `/org-admin/users/students` | `StudentManagementComponent` | shared with admin | ✅ Inherited PR #176, #178, #206 |
| `/org-admin/courses` | `CourseManagementComponent` | shared with admin | ✅ Inherited PR #180 |
| `/org-admin/courses/review` | `CourseReviewComponent` | shared with admin | ✅ Inherited PR #180 |
| `/org-admin/courses/:id/preview` | `CourseContentPreviewComponent` | shared with admin | inherited |
| `/org-admin/analytics` | `AdminAnalyticsComponent` | shared with admin | ✅ Inherited PR #174 styleUrl fix |
| `/org-admin/organization` | `OrganizationDetailComponent` | shared with admin (singleton view for ORG_ADMIN's own org) | **UNIQUE rendering** |
| `/org-admin/profile` | `StudentProfileComponent` | shared cross-portal | inherited |

**Sidebar**: `orgAdminSidebarConfig` trong `sidebar.config.ts` — 7 menu items (dashboard, teachers, students, courses, review, analytics, organization). Đã chuẩn 288px width (PR #155 inherited).

## 2. Inherited from admin epic (no work needed)

Mọi fix sau đã apply tự động qua shared components:

| Issue | Inherited via | Org-admin benefit |
|---|---|---|
| F-ST1 students icon bug fix | PR #168 styleUrl | Dùng cùng student-management |
| F-AD2 + F-U3 status confirm modal | PR #178 + #206 DRY helper | Dùng cùng teacher/student-management |
| Sidebar 288px width | PR #155 | layout shared |
| KPI cards users family shared | PR #176 | TeacherManagement + StudentManagement |
| Courses split column + SLA badge | PR #180 | CourseManagement + CourseReview |
| Categories empty state | PR #206 | (KHÔNG apply — org-admin không có /categories nav) |
| F-CAT2 courseCount badge | PR #204 | (KHÔNG apply — same as above) |
| Self-suspend block | PR #206 | TeacherManagement + StudentManagement |
| `<app-date-range-toggle>` shared | PR #206 | KHÔNG inherited (xem F-OA-3) |
| `<app-kpi-card>` shared | PR #174 | Inherited cho user surfaces, NOT inherited cho dashboard (xem F-OA-1) |
| Audit log Vietnamese labels | PR #184 | KHÔNG apply — org-admin không có logs nav |
| Analytics styleUrl fix | PR #174 | Inherited via shared component |

## 3. Findings unique to org-admin (4)

### F-OA-1 [P1] — `AdminOrgDashboardComponent` không dùng shared `<app-kpi-card>`

**Quan sát**: `dashboard/admin-org-dashboard.component.html` line 55-71 dùng 3 bespoke `.action-card.accent-{warning,primary,success}` markup thay vì shared `<app-kpi-card>` (PR #174).

**Vi phạm**: CC-01 cross-cutting consistency — admin system dashboard, users family, payouts, organizations đều migrated sang shared kpi-card. Org dashboard remains outlier.

**Lưu ý**: `.action-card` có CTA link "Xem danh sách →" / "Quản lý →" — semantic khác KPI strip thuần (clickable nav vs metric display). Có thể giữ pattern cards nhưng styled-consistent với kpi-card variant `clickable` extension, OR tạo shared `<app-action-card>` component mới.

**Fix**:
- **Option A (recommend)**: Tạo `<app-action-card>` shared component (mirror kpi-card pattern: value + label + accent + clickable CTA). Apply org-dashboard 3 cards.
- **Option B**: Add `clickable` variant cho existing kpi-card. Less clean.

### F-OA-2 [P1] — Dashboard thiếu header primary action

**Quan sát**: `admin-org-dashboard.component.html` line 48-52 chỉ có H1 "Bảng điều khiển quản lý", không có button group bên phải.

**Vi phạm**: F-03 admin dashboard đã fix (PR #159) — primary "Thêm người dùng" + secondary "Xem báo cáo". Org dashboard kế thừa pattern này: primary "Mời thành viên" + secondary "Xem analytics".

**Fix**: Apply same pattern → 2 buttons top-right header. Routes:
- "Mời thành viên" → `/org-admin/organization` (existing OrganizationDetail có invite UI)
- "Xem analytics" → `/org-admin/analytics`

### F-OA-3 [P1] — Dashboard thiếu date range toggle

**Quan sát**: `<app-date-range-toggle>` (PR #206) đã wired vào admin system dashboard (windowDays signal + analytics window endpoint). Org dashboard chưa adopt.

**Fix**:
- BE: Verify endpoint `/admin/courses/analytics/window?days=N` đã ORG_ADMIN-scoped (theo PR #171, đã có logic — verify lại)
- FE: AdminComponent (parent) đã có windowDays state cho system variant. Pass-through cho org variant — add `windowDays` input + integrate toggle trong `admin-org-dashboard.component`.

### F-OA-4 [P2] — `OrganizationDetailComponent` chưa audit kỹ

**Status**: Component tồn tại, render `/admin/organizations/:id` (admin) + `/org-admin/organization` (org-admin own org). Khả năng có UX issue tương tự admin pattern (KPI strip, empty states, modal patterns).

**Fix**: Open issue follow-up cho deep audit — defer if time-budget tight, OR roll vào Wave 5 polish.

## 4. Findings cross-cutting (verify needed)

### F-OA-5 [P2] — Verify sidebar config items

`orgAdminMenuItems` 7 items. Kiểm tra:
- [ ] Sidebar collapse parity (CC-04 inherited via admin-layout-simple? need verify works correctly cho org-admin)
- [ ] Active route highlight đúng cho mỗi item
- [ ] Icon consistency với admin sidebar

**Fix**: agent-browser verify sau khi node_modules fix. Defer to next wave audit.

## 5. Roadmap

### Wave 1 — Quick polish (~1 PR, 200-300 LOC)
- F-OA-2 header actions (small)
- F-OA-3 date range toggle integration (medium)

### Wave 2 — Shared component creation (~1 PR, 300-500 LOC)
- F-OA-1 `<app-action-card>` shared component (Option A)
- Migrate org-dashboard 3 cards

### Wave 3 — Deep audit (~1 PR, varies)
- F-OA-4 OrganizationDetailComponent audit + fix
- F-OA-5 Sidebar verification

### Wave 4 — Verification + close
- Re-run audit checklist
- agent-browser cross-portal measure (admin + org-admin should look unified)
- Close epic

## 6. Acceptance criteria toàn epic

- [ ] All 4-5 findings F-OA-* fixed hoặc explicitly defer
- [ ] OrgAdminDashboardComponent dùng shared kpi-card hoặc shared action-card
- [ ] Header primary action ở org dashboard
- [ ] Date range toggle wired
- [ ] OrganizationDetail component audit + fix
- [ ] Cross-portal visual unity verified

## 7. References

- `docs/reports/2026-04-25-admin-portal-mega-audit.md` (epic #161, parent)
- `docs/reports/2026-04-26-admin-portal-followup-audit.md` (epic #186, parent)
- PR #145 — ORG_ADMIN org-scoped analytics precedent
- PR #171 — windowed analytics endpoint
- PR #174 — `<app-kpi-card>` shared component
- PR #206 — `<app-date-range-toggle>` shared component, dashboard wiring

---

**Audit completed**: 2026-04-26 03:00 ICT (parent autonomous, source code review only do FE dev server corrupted).
**Next step**: Open epic + 4-5 sub-issue → spawn fresh sub-agents at token reset (4:20am Saigon).
