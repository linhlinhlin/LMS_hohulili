# Quickstart — Sidebar Redesign Verification

**Feature**: 001-sidebar-redesign
**Audience**: Reviewer / QA
**Time required**: ~15 minutes for the full smoke matrix; ~5 minutes for the high-priority subset.

This document is the manual smoke-test checklist used to verify the sidebar redesign before merge. Pair this with the automated test suites (`npm test`, axe-core check) for full coverage.

---

## Prerequisites

```bash
# 1. Pull the branch
git checkout 001-sidebar-redesign
git pull

# 2. Install (if needed) and build
cd fe
npm install
npm run build           # Must succeed with no new warnings

# 3. Start dev server
npm start               # → http://localhost:4200
```

Backend can stay paused — no backend changes in this PR. If the FE proxy needs the API for auth, run the backend per project README.

---

## High-priority smoke (5 minutes)

This subset MUST pass for the PR to merge.

### 1. Floating-chevron defect is fixed (US1, SC-008)
- Open `http://localhost:4200/student/courses` on a 1440-px-wide browser.
- ✅ The collapse toggle is **inside** the sidebar's top header row (aligned with the brand "Cổng Học viên").
- ❌ FAIL CONDITION: a small circular button is hanging off the right edge of the sidebar.

### 2. Mobile drawer auto-closes on leaf tap (US2, SC-001)
- Resize browser to 375 px wide (or use DevTools device toolbar).
- Tap the hamburger top-left → drawer slides in.
- Tap a leaf nav item, e.g., "Bài cần làm".
- ✅ App navigates to "Bài cần làm" AND the drawer + backdrop disappear.
- ❌ FAIL CONDITION: drawer stays visible covering the new page.

### 3. Parent item with sub-menu does NOT auto-close (US2, FR-013)
- On the same 375-px viewport, open the drawer.
- Tap "Khoá học của tôi" (a parent item with sub-menu).
- ✅ Sub-menu expands inline AND the drawer stays open.
- Tap the leaf child "Tất cả khoá học" → app navigates AND drawer closes.

### 4. Cross-role state sync (US3, FR-005)
- On 1440 px, log in as STUDENT, collapse the sidebar.
- Open a new tab, log in as TEACHER (or use a separate account window).
- ✅ Teacher portal sidebar starts collapsed (same persisted state).

### 5. Keyboard navigation works (US4, SC-009)
- On 1440 px, press Tab from the address bar focus.
- ✅ First Tab reveals "Bỏ qua điều hướng" skip link.
- Tab through sidebar — every item shows a visible focus ring (≥ 2 px brand-colour outline).
- Press Enter on the toggle button → sidebar collapses/expands.
- On mobile (375 px), open drawer with hamburger; press Escape → drawer closes; focus returns to hamburger.

---

## Full matrix (15 minutes)

Run the matrix below for each role × viewport combination.

### Roles

| Role | Login | Path |
|---|---|---|
| STUDENT | `student@maritime.edu` / `student123` | `/student/courses` |
| TEACHER | `teacher@maritime.edu` / `teacher123` | `/teacher/courses` |
| ADMIN | `admin@maritime.edu` / `admin123` | `/admin` |
| ORG_ADMIN | `orgadmin@maritime.edu` / `orgadmin123` | `/admin` |

### Viewports

| Name | Width × Height | Form factor |
|---|---|---|
| iPhone 12 | 390 × 844 | Mobile |
| iPad portrait | 768 × 1024 | Mobile (post-redesign — was tablet on student/teacher) |
| iPad landscape | 1024 × 768 | Desktop (boundary) |
| MacBook | 1440 × 900 | Desktop |

### Per-cell verification points (12)

For each (role, viewport) cell:

| # | Check | Pass criteria |
|---|---|---|
| 1 | Toggle is inside header row (desktop) or hamburger is top-left (mobile) | Visual inspection |
| 2 | Active nav item uses brand-pill indicator | `bg-[#0056D2]/10` + `text-[#0056D2]` + `font-semibold` |
| 3 | Section headers visible and styled consistently | "HỌC TẬP", "CÔNG CỤ", etc. |
| 4 | Mobile (≤1024 px): drawer slides + backdrop fades | 250 ms slide, 200 ms fade |
| 5 | Mobile leaf-tap closes drawer | Spec FR-012 |
| 6 | Mobile parent-tap keeps drawer open | Spec FR-013 |
| 7 | Mobile drawer Esc closes; focus returns | Spec FR-014 / FR-015 |
| 8 | Mobile drawer focus trap holds | Tab cycles inside drawer only |
| 9 | Mobile drawer has visible × close button | Spec FR-014 |
| 10 | Skip link appears on first Tab | Spec FR-026 |
| 11 | Active item has `aria-current="page"` | DevTools inspect element |
| 12 | All ARIA labels are Vietnamese with diacritics | Inspect `aria-label`, `aria-labelledby` |

**Special checks for ADMIN role**:

| # | Check | Pass criteria |
|---|---|---|
| 13 | Navigate to `/admin/organizations/<some-id>` | Sidebar swaps to org-scoped sub-nav |
| 14 | Org-scoped sub-nav uses same active-pill style | Visual match with main sidebar |
| 15 | "Quay lại" affordance visible at top of sub-nav | Spec FR-034 |
| 16 | Open mobile drawer in org context — drawer shows org-scoped sub-nav | Spec FR-032a |
| 17 | Click "Quay lại" → returns to main system nav | Spec FR-036 |

**Special checks for STUDENT and TEACHER on mobile (≤1024 px)**:

| # | Check | Pass criteria |
|---|---|---|
| 18 | Bottom nav present (5 tabs + centre Wiii AI) | Existing component, structure unchanged |
| 19 | Active bottom-nav tab uses same brand-pill colour as sidebar | `text-[#0056D2]` + matching font weight |
| 20 | Bottom-nav icons match sidebar icon family/size | Visual match |

---

## Automated checks (run in CI; reproducible locally)

```bash
# Frontend unit + component tests
cd fe
npm test -- --watch=false --browsers=ChromeHeadless

# Frontend production build
npm run build

# Accessibility audit (axe-core via headless)
npm run test:a11y       # If wired; otherwise see spec for manual axe-core run via DevTools
```

Expected results:
- All existing FE tests still pass.
- 4 NEW test files pass:
  - `sidebar-state.service.spec.ts` (≥ 10 tests)
  - `sidebar.component.spec.ts` (≥ 8 tests)
  - `sidebar-tooltip.directive.spec.ts` (≥ 4 tests)
  - `focus-trap.directive.spec.ts` (≥ 4 tests)
- `npm run build` succeeds.
- axe-core: zero violations on each role's main layout page.

---

## Reduced-motion check (5-second test)

1. macOS: System Settings → Accessibility → Display → Reduce motion → ON. Windows: Settings → Accessibility → Visual effects → Animation effects → OFF.
2. Reload `http://localhost:4200`.
3. Toggle the sidebar collapse.
- ✅ State changes INSTANTLY — no slide animation, no fade.

---

## Cross-tab sync check (10-second test)

1. Open `http://localhost:4200/student/courses` in tab A.
2. Open the same URL in tab B.
3. In tab A, collapse the sidebar.
- ✅ Tab B's sidebar collapses immediately (no reload).
4. In tab B, expand the sidebar.
- ✅ Tab A's sidebar expands immediately.

---

## Failure triage

If any high-priority check fails:
- Re-run `npm run build` to ensure latest assets shipped.
- Hard reload (Cmd+Shift+R) to bypass service-worker cache.
- Clear `localStorage` for `localhost:4200` and reload.
- Check browser console for errors related to `SidebarStateService` or `localStorage`.
- Compare against the visual spec in `research.md` Decision 1, 2, 7.

If any full-matrix check fails:
- Capture screenshot at the exact viewport.
- Note the (role, viewport, check#) coordinates and post in PR review.

---

## Sign-off criteria

- [ ] All 5 high-priority smokes pass.
- [ ] Full matrix: ≥ 95 % of cells pass; any failures noted with screenshots.
- [ ] All automated checks green.
- [ ] Reduced-motion check passes.
- [ ] Cross-tab sync check passes.

When all boxes are ticked, the PR is ready for human design review.
