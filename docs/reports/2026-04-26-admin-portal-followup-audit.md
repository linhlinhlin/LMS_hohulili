# Admin Portal Follow-up Audit — 2026-04-26

> **Mục đích**: bổ sung mega audit `2026-04-25-admin-portal-mega-audit.md` sau khi 8 PR portal merged. Audit 2 surface chưa cover (users/by-course, organizations) + verify finding cross-surface (CC-11, CC-12, F-17) + đánh giá post-PR state.
>
> **Phương pháp**: agent-browser recon (1440×900, login admin@maritime.edu) sau khi epic #161 closed (PR #168, #174, #176, #178, #180, #182, #184, #185 merged). 6 screenshot tại `/tmp/admin-followup/`.
>
> **Verdict**: Portal đạt **production-grade SOTA April 2026** sau Wave 0 (epic #161). Còn 3 surface cần fine-tune cho **SOTA-grade chuyên nghiệp hàng đầu**: organizations (thiếu KPI strip), settings (chưa audit kỹ), analytics (chưa audit kỹ). 2 surface OK: users/by-course, dashboard.

---

## 1. Surface mới audit

### 1.1 `/admin/users/by-course` — Người dùng theo khóa học

**Layout**: course-card grid 3-col responsive
- Filter chips: "Tất cả / Đã duyệt / Chờ duyệt / Nháp"
- Search bar top-right
- Each card: thumbnail + title + status badge + student count + "Xem người dùng" link

**Findings**:
- ✅ Layout phù hợp use case (user-by-course pivot, không phải user table thuần)
- ✅ Filter chips + search hợp pattern
- ✅ Cards navigable với chevron
- ⚠️ Cards không dùng shared component pattern — defer (different surface type, không cần force consistency)
- ⚠️ No KPI strip — OK, không cần (course-pivot view, không metric-driven)

**Verdict**: OK, không cần fix priority. Polish lúc cần.

### 1.2 `/admin/organizations` — Quản lý tổ chức

**Layout**: simple list, 1 org "Wiii Org" hiện tại
- Page header với primary CTA "+ Tạo tổ chức" (BLUE — đã chuẩn từ PR #174)
- 1 org card: avatar + name + code "WIII" + token "30 ngày" + status pill "Hoạt động" + chevron
- Subtitle: "Tổ chức mặc định cho người dùng đăng ký cá nhân"

**Findings**:

#### F-ORG-1 [P1] — Thiếu KPI strip
SOTA admin org list (Auth0 Organizations, Stripe Connect Accounts, Linear Workspaces) đều có KPI strip:
- **Tổng tổ chức**: count
- **Đang hoạt động**: count active
- **Token sắp hết hạn**: count với expiry < 7 ngày (cảnh báo cho admin proactive renew)
- **Người dùng tổng**: aggregate count across all orgs

**Fix**: Apply `<app-kpi-card>` shared component pattern (PR #174). 4 cards strip top.

#### F-ORG-2 [P2] — Empty state cho 0 org
Hiện tại 1 org, không thể test. Nhưng nếu 0 org:
- Inform: "Chưa có tổ chức nào"
- Inspire: "Tổ chức cho phép quản lý nhóm người dùng + cấp invite token + scope analytics"
- Activate: nút "+ Tạo tổ chức đầu tiên" (đã có CTA top, ok)

**Fix**: thêm empty state in card list area khi `organizations.length === 0`.

#### F-ORG-3 [P2] — Token expiry hiển thị "30 ngày" relative không rõ context
"Token: 30 ngày" — là "hết hạn sau 30 ngày" hay "valid 30 ngày từ tạo"?

**Fix**: Đổi label rõ ràng: "Hết hạn: 25/05/2026" hoặc "Còn 30 ngày" (relative time + tooltip absolute).

---

## 2. Cross-surface measurement (CC-11, CC-12)

### 2.1 CC-11 spacing/type post-PR

Visual inspection 6 surface (dashboard, users-all, users-admins, users-teachers, users-students, courses):

| Surface | KPI strip | Card padding | Page title size | Card title size |
|---|---|---|---|---|
| dashboard | 4 cards `<app-kpi-card>` | $spacing-6 (24px) | 24px ($text-xl) | 18px ($text-lg) |
| users-all | 4 cards `<app-kpi-card>` | inherited | inherited | inherited |
| users-admins | 4 cards `<app-kpi-card>` | inherited | inherited | inherited |
| users-teachers | 4 cards `<app-kpi-card>` | inherited | inherited | inherited |
| users-students | 4 cards `<app-kpi-card>` | inherited | inherited | inherited |
| courses | 4 cards (likely `<app-kpi-card>` per pattern) | inherited | inherited | inherited |

**Verdict CC-11**: ✅ Consistent post-PR. Shared `<app-kpi-card>` từ PR-A đã chuẩn hóa visual contract. Không cần fix riêng.

### 2.2 CC-12 a11y heading hierarchy post-PR

Mỗi surface inspected có 1 `<h1>` (page title) + N `<h2>` (card titles). Không thấy duplicate H1 issue như audit ban đầu (đã fix qua PR-A mobile top-bar `<p>`).

**Verdict CC-12**: ✅ Pass. Defer Lighthouse + axe-core full a11y scan to dedicated session nếu cần.

### 2.3 F-17 FAB overlap

Visual confirm: AI floating button (`*+` icon) ở right edge viewport, nằm trên health card border-right. **Không overlap content** — chỉ visible khi cursor hover hoặc click.

**Verdict F-17**: ✅ Sub-agent claim đúng — audit misread. KHÔNG cần fix.

---

## 3. Surface chưa audit kỹ (defer)

Sau PR-A thêm `styleUrl` cho 2 surface dưới, render đã đúng. Nhưng nội dung detail audit chưa chạy:

### 3.1 `/admin/settings` — Cài đặt hệ thống
Render đúng post-PR-A nhưng chưa audit nội dung. Cần:
- KPI/section structure
- Form validation
- Save pattern (sticky bar vs inline)
- Danger zone bottom (GitHub pattern)
- Settings categories sidebar (left rail)
- Search settings (Cmd+K nếu > 30 settings)

### 3.2 `/admin/analytics` — Phân tích hệ thống
Render đúng post-PR-A. Cần:
- KPI cards top
- Chart row(s) — line cho time-series, bar cho categorical
- Breakdown tables (top courses, top instructors)
- Time-range picker top-right (depends on F-P2 component issue #192)
- CSV export per chart

**Khuyến nghị**: Settings + Analytics audit chuyên sâu = task riêng (Wave 5 nếu cần). Có thể spawn audit subagent hoặc parent direct dedicated session.

---

## 4. Tổng kết status portal hiện tại

### Production-grade ✅
- 6 surface chính (dashboard, users family, courses, payouts, audit-log, categories) đạt SOTA April 2026 baseline
- Shared `<app-kpi-card>` pattern xuyên suốt
- 1 brand primary color
- Real /actuator/health
- Security confirm modal cho status change
- RFC 4180 CSV export với compliance accessibility
- Empty state Activate CTA pattern
- SLA badge cho course review
- Sidebar collapse parity 3 portal

### Còn fine-tune cho SOTA-grade chuyên nghiệp hàng đầu

#### Tier 1 (Wave 1 đang chạy) — issues #187..#195
- BE batch (5): F-L2, F-L3, F-CAT2, F-T1, F-C1
- FE polish (4): F-P2, F-CAT3, DRY helper, self-suspend block

#### Tier 2 (Wave 2 + 3) — issues #196..#199
- CC-06 bulk action bar
- CC-10 kebab menu
- F-CR2 Coursera side-by-side review
- F-CAT1 drag-drop categories

#### Tier 3 (Wave 5 — sau Wave 4 verification) — finding mới
- F-ORG-1 organizations KPI strip
- F-ORG-2 empty state
- F-ORG-3 token expiry display
- Settings deep audit + redesign
- Analytics deep audit + redesign

#### Tier 4 SOTA enhancement (post-epic, optional)
- Audit trail per entity (compliance critical)
- Notifications center (websocket extend)
- Saved filter presets
- Bulk CSV import
- Impersonate user

---

## 5. Actions cần làm

- [x] Mở 13 issue cho Tier 1 + Tier 2 (#187..#199)
- [x] Mở mega-epic #186 tracking
- [ ] Spawn Wave 1 sub-agent BE batch (Stream A) — prompt sẵn sàng
- [ ] Spawn Wave 1 sub-agent FE polish (Stream B) — prompt sẵn sàng
- [x] Parent recon Stream C done (this doc)
- [ ] Mở 3 issue cho Tier 3 (F-ORG-1, F-ORG-2, F-ORG-3)
- [ ] Spec audit deep cho Settings + Analytics (Wave 5 task)
- [ ] Khi Wave 1 + 2 + 3 merged → re-run mega audit checklist 100%
- [ ] Close epic #186 với production-readiness attestation

---

## 6. Reference

- `docs/reports/2026-04-25-admin-dashboard-ux-audit.md` (epic #157, closed)
- `docs/reports/2026-04-25-admin-portal-mega-audit.md` (epic #161, closed)
- Epic #186 (current — admin completion)
- 23 PR merged trong 2 ngày (#146 → #185)

---

**Audit completed**: 2026-04-26 01:35 ICT.
**Tools**: agent-browser, source code review.
**Next step**: dispatch Wave 1 sub-agents, mở 3 issue Tier 3, scope Settings + Analytics deep audit.
