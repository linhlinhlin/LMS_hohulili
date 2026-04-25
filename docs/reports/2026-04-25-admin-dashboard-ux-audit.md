# Admin Dashboard UX/UI Audit — 2026-04-25

> **Mục đích**: đánh giá trang `/admin/dashboard` (System Admin view) so với chuẩn SOTA của LMS hàng đầu (Canvas, Moodle 4.x, Open edX, Coursera, Udemy, Khan Academy) và các SaaS dashboard top (Stripe, Linear, Vercel) tính tới ngày 2026-04-25. Liệt kê issue có severity, kèm số đo cụ thể bằng `agent-browser`, đề xuất sửa, và roadmap implementation.
>
> **Phương pháp**: kết hợp browser inspection (agent-browser skill — DOM measurement + screenshot ở viewport 1440×900 và 375×812), web research (Canvas, Moodle docs, Linear best practices, Stripe Dashboard, Carbon Design System, WCAG 2.2), và đối chiếu với template HTML/SCSS hiện tại.
>
> **Trạng thái sau audit**: 18 finding. Phân loại P0 (4) / P1 (8) / P2 (6).

---

## 1. Executive summary

Dashboard hiện tại đã có nền tảng tốt từ PR #153 (gỡ synthetic chart, dùng signals, OnPush, accessible reject modal). Nhưng so với SOTA 2026 còn **chênh ở 4 trụ chính**:

| Trụ | Hiện trạng | SOTA |
|---|---|---|
| **Information density** | 4 KPI text-only + 1 redundant summary card | 4-6 KPI có sparkline/trend; 1 chart chính + 1 list/table |
| **Action density** | 0 primary action ở header | 1 prominent primary action (Stripe, Linear, Vercel) |
| **Math/grid rigor** | Spacing không token hóa, type scale không nhất quán (2 H1, h1=h2=18px) | 8pt grid + 4pt baseline, modular type scale 1.125-1.25 |
| **Mobile re-flow** | Stack đơn giản, KPI 2×2 grid OK | Đạt tiêu chuẩn — không cần redesign mobile |

**Rủi ro nếu không sửa**: dashboard tỏ ra "demo-grade" thay vì "product-grade". Người mới đăng nhập (admin trường) dễ kết luận hệ thống chưa sẵn sàng.

**Khuyến nghị scope**: 1-2 PR, ưu tiên P0+P1. P2 đưa vào backlog.

---

## 2. Current state inventory

### 2.1 Screenshot evidence

- Desktop 1440×900: KPI strip 4 cells + 60/40 split (Tổng quan nhanh / Trạng thái hệ thống) + full-width Pending list
- Mobile 375×812: KPI strip 2×2 grid + cards stacked vertically. Mobile re-flow đúng pattern.

### 2.2 Đo bằng agent-browser

```json
{
  "viewport": "1440x900",
  "h1": { "text": "Quản trị hệ thống", "fontSize": "18px", "fontWeight": "600", "lineHeight": "28px" },
  "h2_first": { "text": "Cổng Quản trị", "fontSize": "18px", "fontWeight": "700" },
  "cardsInfo": [
    { "title": "Tổng quan nhanh", "width": 725, "height": 290, "borderRadius": "8px" },
    { "title": "Trạng thái hệ thống", "width": 362, "height": 290, "borderRadius": "8px" },
    { "title": "Danh sách chờ duyệt", "width": 1103, "height": 271, "borderRadius": "8px" }
  ]
}
```

Tỷ lệ 2-col split: 725 / (725+362+gap) ≈ **66.6/33.4** — gần `2:1` nhưng không khớp golden ratio (61.8/38.2). Carbon/Stripe khuyến nghị **60/40** hoặc **70/30**, không 66.6/33.4.

### 2.3 Cấu trúc DOM hiện tại

```
.dashboard-page
├── .header-bar
│   └── h1.page-title  "Bảng điều khiển hệ thống"  (chỉ title, không action)
└── .dashboard-main
    ├── .metrics-strip        (4 metric-cell)
    ├── .content-grid.grid-2-1
    │   ├── .card.summary-card   "Tổng quan nhanh" — list 3-4 dòng từ analytics
    │   └── .card.health-card    "Trạng thái hệ thống" — 4 service rows
    └── .card                 "Danh sách chờ duyệt" — table hoặc empty state
```

---

## 3. SOTA benchmarks (tóm tắt từ research 2026-04-25)

### 3.1 LMS admin dashboards

| Platform | Sidebar nav | KPI count | Charts | Notable |
|---|---|---|---|---|
| Canvas LMS | LHN 6-9 items | 0 mặc định (Card-grid courses); Analytics Beta: 4 | Time-series line, stacked bar | Course-card centric — không phải KPI strip |
| Moodle 4.x Boost | Top 5 + overflow | Configurable blocks | None default | Block-based, admin tự lắp |
| Open edX | Flat top nav, Insights tách riêng | Enrollment, Engagement, Performance | Enrollment line, cohort funnel | **Tách authoring khỏi analytics** |
| Coursera Business | LHN 5 | 4-6 (Active Learners, Hours, Skills, Completion) | Donut skill, line hours | Skill-centric KPIs |
| Udemy Business | LHN 5 | 4 (Users, Minutes, Top Courses, Engagement) | Heatmap activity, top-N tables | Operational tables > charts |

### 3.2 SaaS dashboard SOTA

| Platform | Sidebar | KPI count | KPI anatomy |
|---|---|---|---|
| **Stripe** | 240-280px | **4** (Revenue, Charges, Payouts, Disputes) | number + trend arrow + sparkline (1 micro-viz) |
| Linear | 220px | Modular widgets | per-widget |
| Vercel (Feb 2026) | 240-280px | 3-4 | number + delta + sparkline |
| GitHub Org | Top-tab | 3-4 | number + delta only |

**Consensus**: 4-6 KPI, mỗi card = number + ONE micro-viz. Bên dưới: 60/40 hoặc 70/30 split (chart chính + table/list).

### 3.3 Math/design principles

- **8pt grid** cho component, **4pt baseline** cho typography (Material 3, Carbon, Polaris)
- **Type scale 1.125** (major second) cho dense data UI; 1.2-1.25 cho marketing/content
- **Base 14px** cho dashboard (vs 16-18px content site)
- **Miller's Law**: nav ≤ 7 (hoặc grouped); KPI ≤ 7 primary
- **Touch target**: WCAG 2.2 SC 2.5.8 ≥ 24×24 CSS px (AA), ≥ 44×44pt iOS, ≥ 48×48dp Android
- **Contrast**: WCAG 2.2 — 4.5:1 body, 3:1 large/UI components, 3:1 chart neighbors
- **Color**: separate semantic (success/warn/error) khỏi brand

---

## 4. Findings (severity-rated)

### P0 — Critical (4)

#### F-01. **Heading hierarchy gãy: 2 `<h1>` trên cùng 1 trang, h1=h2=18px**

**Đo**: H1 "Quản trị hệ thống" (sidebar header) + H1 "Bảng điều khiển hệ thống" (page title) cùng tồn tại. Cả hai đều `font-size: 18px`. H2 cards cũng 18px.

**Vi phạm**: WCAG 1.3.1 (Info & Relationships), HTML5 outline. SR đọc 2 H1 → user mất ngữ cảnh.

**Fix**:
- Sidebar header dùng `<div>` hoặc `<p class="brand-name">`, không phải `<h1>`
- Page title `h1.page-title` tăng size theo type scale (đề xuất 24px desktop, 20px mobile)
- Card title `h2.card-title` giữ 16-18px

**Tham chiếu**: WCAG 1.3.1, MDN HTML outline best practice.

---

#### F-02. **`Tổng quan nhanh` redundant với KPI strip**

**Quan sát**: Card "Tổng quan nhanh" hiện liệt kê:
- "67 lượt đăng ký khóa học"
- "28 học viên trong hệ thống"
- "10 khóa học đã tạo"

Đây là **subset** của KPI strip (đã có "Tổng người dùng 43", "Tổng khóa học 10"). Lặp thông tin → tăng cognitive load (Miller's Law violation), giảm tin cậy.

**Fix**: Loại card này. Thay thế bằng 1 trong 3 lựa chọn:
1. **Activity feed thật** — nếu BE có endpoint `/api/v3/admin/activity-log` (cần check)
2. **Quick actions card** — 4-6 action buttons: "Mời người dùng", "Tạo danh mục", "Xem báo cáo doanh thu", "Cấu hình hệ thống"
3. **Top courses / Top instructors** mini-list (top-N pattern Udemy Business)

**Khuyến nghị mặc định**: option 2 (Quick actions) — không cần BE mới, ship được trong scope FE thuần.

---

#### F-03. **Không có primary action ở header**

**Đo**: `.header-bar` chỉ chứa H1, không có button.

**SOTA pattern**: Stripe/Linear/Vercel header luôn có **1 primary action** ở top-right (e.g., "Add user", "New project", "Create deployment"). Hick's Law: 1 prominent action giảm time-to-decision.

**Fix**: Thêm action group bên phải H1. Đề xuất:
- **Primary**: "Mời người dùng" (link tới `/admin/users/new` hoặc mở modal invite)
- **Secondary** (icon button): "Cài đặt hệ thống" (link tới `/admin/settings`), "Xem báo cáo" (link tới `/admin/analytics`)

```html
<div class="header-bar">
  <div class="header-inner">
    <h1 class="page-title">Bảng điều khiển hệ thống</h1>
    <div class="header-actions">
      <button class="btn-secondary">Xem báo cáo</button>
      <button class="btn-primary">Mời người dùng</button>
    </div>
  </div>
</div>
```

---

#### F-04. **Sidebar header (`<h2>Cổng Quản trị</h2>` + subtitle) lạm dụng heading + DOM duplicate label**

**Đo**: Snapshot `agent-browser` báo `"Trang chủTrang chủ", "Người dùngNgười dùng"...` — text duplicated trong DOM.

**Nguyên nhân**: Sidebar item có cả visible text + `aria-label` (hoặc `<span class="sr-only">`) cùng nội dung → screen reader đọc 2 lần. Vi phạm WCAG 1.3.1 / 4.1.2.

**Fix**: Trong `sidebar.component.ts`, một là remove `sr-only` text (không cần khi đã có visible text), hai là đặt `aria-hidden="true"` cho 1 trong 2.

---

### P1 — High (8)

#### F-05. **KPI cards thiếu micro-viz** (sparkline / trend arrow)

**Hiện tại**: KPI = number + label + plain text "+0% so với tháng trước".

**SOTA**: Stripe/Vercel/Linear KPI = number + trend arrow (▲▼) + sparkline 7-30 day.

**Fix**: 
- Thêm icon `▲` (xanh) khi growth > 0, `▼` (đỏ) khi < 0, `→` (xám) khi = 0
- Optional: sparkline mini SVG (cần endpoint daily series từ BE — defer to backlog nếu chưa có)

---

#### F-06. **`Trạng thái hệ thống` data nguồn không rõ là real hay mock**

**Code path**: `analytics().systemHealth.{api,database,email,storage}` — bind từ `getSystemAnalytics()` API. Cần verify BE thực sự check (hit DB query, ping email service, check disk).

Hiện tại có khả năng cao BE return hard-coded `'healthy'` cho tất cả. Nếu vậy → cùng anti-pattern PR #145 đã fix cho ORG_ADMIN dashboard.

**Fix tạm**:
1. Verify backend logic (`AdminAnalyticsService.checkSystemHealth()` hoặc tương tự) — nếu mock, gỡ card hoặc thay bằng `<actuator/health>` summary có thật
2. Nếu BE thực sự check, thêm timestamp "Cập nhật {{ lastChecked | date }}" để minh bạch

---

#### F-07. **Không có chart chính**

**Hiện tại**: Sau khi gỡ synthetic chart trong PR #153, dashboard không còn chart nào. Vùng KPI strip → thẳng card list — thiếu visual rest cho mắt.

**SOTA**: Có ít nhất 1 chart chính (line chart for activity hoặc enrollment trend).

**Fix tùy chọn BE-readiness**:
- **Nếu BE có endpoint trend** (`/api/v3/admin/analytics/enrollment-trend?days=30`): vẽ chart thật (Chart.js / ngx-charts đã có)
- **Nếu chưa có**: card placeholder "Biểu đồ hoạt động đang được phát triển" với illustration — KHÔNG phải Math.sin synthetic data

Mở task BE riêng nếu chưa có endpoint.

---

#### F-08. **Không có date range filter**

**SOTA**: "Last 7 / 30 / 90 days" segmented control ở top-right (Stripe/Linear chuẩn). Cho phép user thu/giãn time window.

**Fix**: Component `<app-date-range-toggle>` (nếu chưa có thì viết mới — reusable cho cả ORG_ADMIN dashboard sau này).

---

#### F-09. **Spacing không tuân 8pt grid**

**Đo nhanh** (cần inspect chi tiết hơn):
- Card padding: 0px (CSS encapsulation), nội dung dùng padding tùy biến
- Gap giữa metric cell, content-grid, card: chưa verify đồng nhất 8/16/24/32px

**Fix**: Audit toàn bộ SCSS, thay magic numbers (`12px`, `14px`, `18px`, `22px`) bằng spacing tokens trong `_tokens.scss` (8, 16, 24, 32, 48). Card padding mặc định 24px (3×8).

---

#### F-10. **Type scale không có rhythm**

**Đo**: 
- H1 sidebar: 18px / 700
- H1 page-title: 18px / 600 (cùng size!)
- H2 card-title: 18px (cùng size!)
- Body: ?
- Metric value: ?

Không có hierarchy rõ. Đề xuất type scale **1.125 (major second)** cho dense UI:

| Level | Size (1.125 ratio) | Use |
|---|---|---|
| Display | 30px | Metric value |
| H1 | 24px | Page title |
| H2 | 20px | Section title |
| H3 | 18px | Card title |
| Body | 14px | Default |
| Small | 12px | Label, sub |

Áp dụng qua CSS variables hoặc Tailwind text-size config.

---

#### F-11. **Pending list empty state thiếu Activate**

**Hiện tại**: Empty state có icon ✓ + "Không có khóa học nào đang chờ duyệt". 

Theo Carbon/PatternFly: empty state cần **Inform + Inspire + Activate** (CTA). Hiện chỉ có Inform.

**Fix**: Thêm CTA "Xem tất cả khóa học" (link tới `/admin/courses`) và mô tả ngắn "Khi giảng viên nộp khóa học mới, sẽ hiện ở đây để bạn duyệt.".

---

#### F-12. **Không có quick search/jump global**

**SOTA**: Stripe Cmd+K, Linear Cmd+K, Notion Cmd+K — quick search bar ở top.

**Fix**: Defer to `feat/admin-cmdk-search` task riêng (out of scope dashboard refresh).

---

### P2 — Medium (6)

#### F-13. KPI cell width inconsistent với 8pt
**Fix**: width = 100% / 4, gap = 16px. Verify metric-cell SCSS.

#### F-14. Border radius mixed 4px/8px/12px khắp dashboard
**Fix**: token hóa `--radius-sm: 4px`, `--radius-md: 8px`, `--radius-lg: 12px`. Card luôn dùng `--radius-md`.

#### F-15. Không có dark mode tokens (nếu có plan dark mode)
**Fix**: Defer task riêng nếu chưa quyết dark mode scope.

#### F-16. Color "Hoạt động" badge dùng green nhưng project primary không phải green
**Fix**: OK theo Atlassian (semantic ≠ brand). Nhưng nên verify `--color-success` có trong design tokens chưa.

#### F-17. AI floating button (`floating action`) đè lên card "Trạng thái hệ thống" góc phải-dưới
**Đo**: Screenshot thấy globe icon overlay border-bottom-right của card health.
**Fix**: Tăng `bottom` offset của FAB hoặc tính container không bị cắt.

#### F-18. `(toggle sidebar)` button collapsed indicator thiếu
**Hiện tại**: Admin sidebar không collapsible (teacher/student có).
**Fix**: Thêm collapse toggle như teacher để consistency. Defer nếu scope nhỏ.

---

## 5. Math & layout analysis

### 5.1 Grid system

**Đề xuất 8pt grid**:
- Container padding: 24 (lg), 16 (md), 12 (sm)
- Gap between sections: 24
- Gap inside section (card-to-card): 16
- Card padding: 24
- Element spacing inside card: 12 hoặc 16

### 5.2 Column ratios

**Hiện tại**: 725 / 362 ≈ 2:1 → **66.6 / 33.4**

**Đề xuất**: 60/40 (Stripe/Vercel) hoặc 70/30 (Linear).

| Pattern | Tỷ lệ | Ứng dụng |
|---|---|---|
| 60/40 | 60% chính / 40% phụ | Chart chính + sidebar widget |
| 70/30 | 70% chính / 30% phụ | Table dense + filter rail |
| 50/50 | đều | 2 cards equal weight |
| Golden 61.8/38.2 | math elegant | Editorial, không recommend cho data UI |

Cho dashboard này (table chính + health rail): **70/30** phù hợp hơn 66.6/33.4 hiện tại.

### 5.3 Type scale (1.125 ratio)

```scss
$text-xs:    12px;  // labels, captions
$text-sm:    14px;  // body default
$text-base:  16px;  // emphasis body
$text-md:    18px;  // h3 card title
$text-lg:    20px;  // h2 section
$text-xl:    24px;  // h1 page
$text-2xl:   30px;  // metric value
$text-3xl:   36px;  // hero number (no use this dashboard)
```

### 5.4 Touch targets

WCAG 2.2 SC 2.5.8: ≥ 24×24 CSS px. Hiện tại button reject/approve trong table cần verify. Recommend **40×32** padding-based (button height = 32px content + 4px padding-top + 4px padding-bottom = 40px effective).

---

## 6. Recommended changes (ordered by impact/effort)

| # | Finding | Effort | Impact | Priority |
|---|---|---|---|---|
| F-01 | Fix heading hierarchy | S | High (a11y + visual) | P0 |
| F-02 | Replace `Tổng quan nhanh` với Quick actions | S | High | P0 |
| F-03 | Add header primary action | S | High | P0 |
| F-04 | Sidebar duplicate label cleanup | XS | Med (a11y) | P0 |
| F-09 | Spacing token audit + 8pt grid | M | Med-High | P1 |
| F-10 | Type scale establishment | M | Med | P1 |
| F-05 | KPI trend arrows | S | Med | P1 |
| F-06 | Verify systemHealth real | S | Med | P1 |
| F-08 | Date range toggle | M | Med | P1 |
| F-07 | Activity chart (defer if no BE) | L | Med | P1 |
| F-11 | Empty state Activate CTA | XS | Low-Med | P1 |
| F-13-F-18 | Polish items | S each | Low-Med | P2 |

**Suggested PR split**:
- **PR-A** (P0, ~200-300 LOC): F-01, F-02, F-03, F-04
- **PR-B** (P1 design system, ~300-500 LOC): F-09, F-10, F-05, F-11
- **PR-C** (P1 features, ~200 LOC): F-06, F-08
- **PR-D** (P2 polish, optional): F-13 to F-18
- F-07 (activity chart): mở issue riêng + task BE

---

## 7. References

### LMS dashboards
- [Canvas LMS Admin Analytics Beta](https://community.canvaslms.com/t5/Admin-Guide/How-do-I-use-Admin-Analytics/ta-p/525043)
- [Moodle 4.0 Navigation Improvements](https://docs.moodle.org/dev/Moodle_4.0_navigation_improvements)
- [Khan Academy Teacher Dashboard](https://support.khanacademy.org/hc/en-us/articles/360030826991)

### SaaS SOTA
- [Linear: Best Practices for Designing Dashboards](https://linear.app/now/dashboards-best-practices)
- [Stripe Dashboard Product Design (Medium)](https://medium.com/swlh/exploring-the-product-design-of-the-stripe-dashboard-for-iphone-e54e14f3d87e)
- [Vercel: New Dashboard (Feb 2026)](https://vercel.com/try/new-dashboard)
- [Atlassian Jira Dashboard Layout](https://support.atlassian.com/analytics/docs/dashboard-layout/)

### Design systems
- [Designsystems.com — Spacing, grids, layouts](https://www.designsystems.com/space-grids-and-layouts/)
- [Cieden — Spacing system choice](https://cieden.com/book/sub-atomic/spacing/choosing-a-spacing-system)
- [Cieden — Type scale](https://cieden.com/book/sub-atomic/typography/establishing-a-type-scale)
- [Carbon Design — Empty States](https://carbondesignsystem.com/patterns/empty-states-pattern/)
- [Atlassian Color Foundations](https://atlassian.design/foundations/color)

### A11y
- [WCAG 2.2 SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [WCAG 2.2 spec](https://www.w3.org/TR/WCAG22/)

### Internal
- `backend/docs/adr/ADR-004-angular-signals-adoption.md` (FE convention)
- `docs/reference/FRONTEND_GOTCHAS.md` (gotchas catalog)
- PR #145 (gỡ synthetic chart cho ORG_ADMIN — pattern cho F-06)
- PR #153 (gỡ synthetic chart cho SYSTEM admin — đã làm trước audit này)

---

## 8. Audit checklist (re-run sau implementation)

- [ ] F-01: Chỉ 1 `<h1>` trên page; type scale có hierarchy
- [ ] F-02: `Tổng quan nhanh` thay bằng Quick actions hoặc activity feed thật
- [ ] F-03: Header có primary action button
- [ ] F-04: Sidebar SR-only label không duplicate
- [ ] F-05: KPI có trend arrow (sparkline tùy BE)
- [ ] F-06: `systemHealth` confirmed real source
- [ ] F-07: Activity chart hoặc placeholder rõ ràng
- [ ] F-08: Date range toggle hoạt động
- [ ] F-09: Spacing dùng token, card padding consistent 24px
- [ ] F-10: Type scale theo 1.125 ratio
- [ ] F-11: Empty state có CTA
- [ ] Chạy `agent-browser` đo lại desktop + mobile sau fix; gắn screenshot trong PR body

---

**Audit completed**: 2026-04-25 09:00 ICT.
**Tools used**: agent-browser (DOM + screenshot), web research subagent (general-purpose), source code review.
**Next step**: handoff prompt cho session sub-agent implement (xem `docs/handoff/2026-04-25-admin-dashboard-refresh.md` nếu được tạo, hoặc inline trong issue tracking).
