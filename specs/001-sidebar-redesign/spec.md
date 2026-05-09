# Feature Specification: Sidebar Redesign — Multi-Role, SOTA-aligned, Accessible

**Feature Branch**: `001-sidebar-redesign`
**Created**: 2026-05-09
**Status**: Draft
**Input**: User description: "Redesign the main left-rail sidebar across all 4 user roles (STUDENT, TEACHER, ADMIN, ORG_ADMIN) of LMS Maritime. Replace the awkward floating chevron toggle with a professional in-header toggle. Fix the mobile drawer so it auto-closes when a user taps a navigation item. Standardize breakpoints across roles. Add full WCAG 2.2 AA accessibility. Unify state management. Make the admin org-scoped mode-switch and the student/teacher mobile bottom navigation visually consistent with the redesigned sidebar."

## Clarifications

### Session 2026-05-09

- Q: When admin is in org context (`/admin/organizations/:id`) and opens the mobile drawer, what does the drawer show — main system nav or org-scoped sub-nav? → A: Org-scoped sub-nav (matches desktop behaviour; preserves user's current working context). The drawer also includes a clearly-labelled "Quay lại" affordance to return to the main system nav.
- Q: How are tooltips for icon-rail items (when sidebar is collapsed on desktop) implemented? → A: Custom popover with `aria-describedby` linkage — delay precisely controllable to ~500 ms, properly announced by screen readers, styled with project design tokens. Native HTML `title` attribute is rejected because it cannot meet WCAG 2.2 AA semantic linkage and has uncontrollable delay.
- Q: When the user toggles collapsed state in a different browser tab, does the current tab synchronise immediately? → A: Yes — listen to `window` storage events; the current tab updates its sidebar state without requiring a reload. This is industry-standard expected behaviour for a state shared across tabs of the same origin.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Desktop user collapses/expands the sidebar with a professional, integrated toggle (Priority: P1)

A user (any of the 4 roles) is working on a desktop or laptop screen (≥1024 px wide). They want to give themselves more horizontal room for their main content (a course they are reading, a grading view, an admin table) by collapsing the sidebar. They click a clearly-positioned, professional toggle button that lives **inside** the sidebar's top header row — not floating outside it — and the sidebar smoothly reduces from a full-width nav (256 px, with item labels) to a compact icon-only rail (64 px). The state is remembered the next time they load the app, on this device, regardless of which role-portal they are using.

When the sidebar is in the collapsed (icon-rail) state, hovering the cursor over an icon reveals the item's label as a tooltip after a short delay (~500 ms). Hovering does **not** automatically expand the whole sidebar — they must click the toggle to expand back.

**Why this priority**: This is the most visible defect in the current product (the "awkward floating chevron" complaint). Fixing it raises perceived professionalism for every logged-in user on every page. It is also the foundation for cross-role consistency (US3) — all role layouts will adopt the same toggle.

**Independent Test**: Open the app on a 1440×900 desktop browser as any role. Visually inspect the sidebar header row — the toggle MUST be inside the row aligned with other header content, never sticking outside the right edge. Click the toggle: sidebar narrows; click again: sidebar widens. Reload the page: previous width is restored. Hover an icon while collapsed: tooltip appears after ~500 ms; sidebar does NOT auto-expand. Switch to a different role-portal in another tab: previous collapsed/expanded state is also reflected there.

**Acceptance Scenarios**:

1. **Given** the user is on a ≥1024 px viewport with the sidebar in the expanded state, **when** they click the toggle, **then** the sidebar animates to the collapsed icon-rail state in 200 ms (or instantly if the user has reduced-motion preference enabled).
2. **Given** the user previously collapsed the sidebar, **when** they reload the page, **then** the sidebar restores to the collapsed state.
3. **Given** the sidebar is in the collapsed state, **when** the user hovers an icon for ~500 ms, **then** the item's label appears as a tooltip without expanding the whole sidebar.
4. **Given** the toggle has keyboard focus, **when** the user presses Space or Enter, **then** the sidebar toggles between collapsed and expanded.
5. **Given** the user toggles the sidebar in the STUDENT portal, **when** they later log in as a TEACHER on the same device, **then** the sidebar starts in the same collapsed/expanded state.
6. **Given** local storage is unavailable (private browsing, quota exceeded), **when** the user toggles the sidebar, **then** the toggle still works for the current session and the app does not crash; on next page load the sidebar uses its default expanded state.

---

### User Story 2 — Mobile/tablet user opens a drawer that auto-closes when they tap a nav item (Priority: P1)

A user (any of the 4 roles) is on a phone, small tablet, or narrow window (<1024 px). The full sidebar would obscure their content, so it is hidden by default. A clearly-visible hamburger button at the top-left of the screen opens the navigation as an off-canvas drawer that slides in from the left, dimming the rest of the screen with a translucent backdrop. The user taps a nav item (for example "Bài cần làm") — the app navigates to that page **and the drawer closes automatically**, revealing the destination page content. The user does not need a second tap to dismiss the drawer.

When the user taps a parent item that has a sub-menu (for example "Khoá học của tôi", which has the child "Tất cả khoá học"), the sub-menu expands and the drawer **stays open** so the user can choose a child item. Tapping a child (a leaf item) closes the drawer.

While the drawer is open, the user can dismiss it without navigating by: tapping the dimmed backdrop area, tapping a visible close (×) button at the top of the drawer, swiping the drawer left toward the screen edge, or pressing Escape on a keyboard.

**Why this priority**: The current behavior — drawer covers the destination page after navigation, forcing the user to manually close — is a critical UX defect that confuses every mobile user on every navigation event. This affects the highest-traffic surface (mobile users on student portal). Industry standard (Material Design 3 modal navigation drawer, Apple HIG, IBM Carbon, Atlassian) is auto-close. Fixing this brings LMS Maritime to the baseline expected of any modern web product in 2026.

**Independent Test**: Open the app on a 375 px wide phone viewport (or shrink the desktop browser to that width) as any role. Tap the hamburger top-left: drawer slides in, backdrop appears. Tap a leaf nav item: app navigates AND drawer + backdrop disappear. Repeat. Then tap a parent item with a sub-menu: sub-menu expands, drawer stays open. Tap the leaf child: drawer closes. Test all four dismiss methods (backdrop tap, × button, swipe, Escape).

**Acceptance Scenarios**:

1. **Given** the user is on a <1024 px viewport with the drawer closed, **when** they tap the hamburger button, **then** the drawer slides in from the left in 250 ms with a fading backdrop.
2. **Given** the drawer is open, **when** the user taps a leaf navigation item, **then** the app navigates to that page AND the drawer + backdrop both dismiss.
3. **Given** the drawer is open, **when** the user taps a parent item with a sub-menu, **then** the sub-menu expands inline AND the drawer remains open.
4. **Given** the drawer is open and the user has expanded a sub-menu, **when** they tap a child leaf item, **then** the app navigates AND the drawer + backdrop dismiss.
5. **Given** the drawer is open, **when** the user taps the dimmed backdrop, **then** the drawer + backdrop dismiss without navigating.
6. **Given** the drawer is open, **when** the user presses the Escape key, **then** the drawer + backdrop dismiss and keyboard focus returns to the hamburger button.
7. **Given** the drawer is open, **when** the user swipes the drawer toward the left edge of the screen, **then** the drawer + backdrop dismiss.
8. **Given** the drawer is open, **when** a screen-reader user moves keyboard focus with Tab, **then** focus cycles only among elements inside the drawer (focus trap) — focus does NOT escape to the dimmed content behind.
9. **Given** the user is on the ADMIN or ORG_ADMIN portal mobile view, **when** the drawer opens, **then** the same dialog semantics, focus trap, and Escape handling apply (current admin drawer is missing these — must be fixed).
10. **Given** the device viewport is rotated from portrait (<1024 px) to landscape (≥1024 px) while the drawer is open, **then** the drawer transitions cleanly to the desktop sidebar form factor without a flash of empty content.

---

### User Story 3 — Maintainer ships a single, unified sidebar across all 4 portals (Priority: P2)

A maintainer (developer or designer working on the codebase) needs to make a change to sidebar behavior — for example, add a new nav item, change the active-state colour, or fix a defect. They expect that change to apply to all 4 portals at once, because the sidebar is one product surface. They expect a single source of truth for the collapsed/expanded state and the mobile-drawer state, not three separate copies of the same logic across three wrapper layouts.

They also expect all 4 portals to switch from desktop to mobile presentation at the **same** viewport width — currently student/teacher use 768 px and admin uses 1024 px, which means a tablet user gets a different experience between portals. After this work, the breakpoint is uniform at 1024 px across all 4 portals.

**Why this priority**: Eliminates ~150 LOC of duplicated state-management code, makes future sidebar changes a single-file edit, and removes the tablet-inconsistency UX defect. Important but does not directly improve any end-user's first impression — that is what US1 and US2 do.

**Independent Test**: Search the codebase for the localStorage key managing sidebar collapsed state — exactly ONE key name should exist (no per-role variants). Search for the sidebar mobile/desktop breakpoint — all 4 layouts use 1024 px. Toggle the sidebar collapsed state in any one portal, navigate to another portal — collapsed state is shared.

**Acceptance Scenarios**:

1. **Given** all 4 portals (student, teacher, admin, org_admin) are inspected, **when** a code search is performed for the sidebar mobile-vs-desktop breakpoint, **then** all 4 use 1024 px and there is no 768 px / 1024 px split.
2. **Given** the user toggles the sidebar collapsed state in the STUDENT portal, **when** they navigate to the TEACHER portal, **then** the collapsed state is the same.
3. **Given** the active navigation item visual indicator is inspected across all 4 portals, **when** compared, **then** all use the same visual treatment (same fill colour, same shape, same typography weight, same spacing).
4. **Given** the sidebar's collapsed-state animation is observed across all 4 portals, **when** compared, **then** all use the same duration and easing.

---

### User Story 4 — Assistive-technology user can navigate the sidebar fully (Priority: P2)

A user with assistive technology — screen reader, keyboard-only, switch device, or motion-sensitivity — opens the app. They can:

- Reach the sidebar from anywhere on the page using a "Skip to navigation" / "Skip to content" link that appears on first Tab press.
- Hear the sidebar announced as "Điều hướng chính, navigation landmark" (or its assistive-tech-localised equivalent).
- Hear the currently active page announced as "current page" (not just visually highlighted).
- Hear parent items with sub-menus announced as "expanded" or "collapsed".
- See a clearly visible focus ring on whatever element they have focused.
- On mobile, when they open the drawer, hear it announced as a modal dialog; their focus is contained inside; pressing Escape closes it; focus returns to the trigger.
- If they have enabled "reduce motion" in their operating system, all slide / fade animations are skipped — the sidebar appears or disappears instantly.
- All tappable items meet a 48×48 px touch target on mobile (Material Design baseline; exceeds WCAG 2.5.8 minimum 24×24 px).

**Why this priority**: Accessibility is required by the project constitution (Principle V — though user-facing copy; Principle VI/IV implicitly through quality gates) and is a market expectation in 2026. Currently the sidebar is missing several WCAG 2.2 AA-floor behaviours (no `aria-current`, no `aria-expanded` on parents, no focus trap on admin drawer, no skip link, no reduced-motion respect). These are quick fixes but must all land together to be valuable.

**Independent Test**: Run automated accessibility audit (axe-core or Lighthouse Accessibility) on a page using the sidebar in any role — score ≥95. Manually keyboard-navigate the sidebar with Tab/Shift+Tab/Enter/Escape — every interactive element is reachable, the active page is identifiable, the mobile drawer traps focus, Escape works. Toggle "Reduce motion" in OS settings — animations stop.

**Acceptance Scenarios**:

1. **Given** a screen-reader user lands on the page, **when** they press Tab once, **then** a "Bỏ qua điều hướng" / skip link becomes visible and lets them jump past the sidebar to the main content.
2. **Given** a screen-reader user moves focus to the sidebar, **when** the screen reader announces it, **then** it identifies as a navigation landmark named "Điều hướng chính".
3. **Given** the user is on the page that corresponds to one of the nav items, **when** the screen reader announces that item, **then** it is announced as the current page.
4. **Given** a parent nav item has a sub-menu, **when** the screen reader announces it, **then** it announces "expanded" or "collapsed" matching the visible state.
5. **Given** a keyboard-only user, **when** they Tab to any sidebar element, **then** a clear focus ring (at least 2 px, in the brand colour, with offset for clarity) is visible on that element.
6. **Given** a mobile user with the drawer open, **when** the screen reader announces the drawer, **then** it identifies as a modal dialog and focus is contained inside it.
7. **Given** the user has "Reduce motion" enabled in OS settings, **when** they trigger any sidebar transition (collapse, expand, drawer open, drawer close), **then** the transition happens instantly without animation.
8. **Given** all interactive sidebar elements on mobile are measured, **when** measured, **then** none are smaller than 48×48 CSS pixels.

---

### User Story 5 — Admin in org-scoped mode sees a visually consistent sub-navigation (Priority: P3)

An admin or org-admin enters the management page for a specific organisation (`/admin/organizations/:id`). The sidebar's main navigation list is replaced with a context-scoped list of sub-pages for that organisation (Tổng quan, Thành viên, Lời mời, Thống kê, Cấu hình doanh thu, Cài đặt). Today this swap is functional but visually inconsistent with the rest of the sidebar — different active-indicator style, different spacing, no clear way back to the main nav. After this work, the org-scoped sub-nav uses the same visual language as the main sidebar (same active pill, same spacing, same section header style if any) and a clear "Quay lại" affordance lets the user exit org context back to the main system nav.

**Why this priority**: Affects only admins/org-admins inside org context — small audience but they are the heaviest users of the admin portal. Important for perceived polish; not a blocker.

**Independent Test**: As ADMIN, navigate into an organisation. The sub-nav looks visually identical in style to the main sidebar (same active pill colour, same indentation, same typography). A "Quay lại" or breadcrumb-style control is visible at the top of the sub-nav. Click it — the system returns to main system nav.

**Acceptance Scenarios**:

1. **Given** an admin enters `/admin/organizations/:id`, **when** the sidebar renders, **then** the org-scoped sub-nav uses the same active-item indicator (filled pill, brand-tint background) as the main sidebar.
2. **Given** the org-scoped sub-nav is visible, **when** the admin looks at the top of the sub-nav, **then** a clearly-labelled "Quay lại" or breadcrumb back-affordance is present.
3. **Given** the admin clicks the back affordance, **when** the navigation completes, **then** the sidebar restores the main system nav.
4. **Given** a screen-reader user enters org context, **when** the sub-nav is announced, **then** it identifies as a distinct navigation landmark named "Điều hướng tổ chức" (separate from "Điều hướng chính").
5. **Given** the admin navigates to a non-org route (for example clicks "Quay lại" then "Trang chủ"), **when** that navigation completes, **then** the sidebar restores main system nav and removes the org-scoped state.

---

### User Story 6 — Mobile bottom navigation visually matches the new sidebar (Priority: P3)

A student or teacher on a mobile phone sees both a top hamburger (opens drawer for full nav) and a bottom navigation bar (5 quick-access tabs with a centre "Wiii AI" button). Today these two surfaces have different visual languages — different active colours, different icon styles. After this work, both surfaces share the same active-indicator colour, the same iconography, and the same elevation/border treatment, so they feel like one product. The structure (tabs, items, position) does NOT change.

**Why this priority**: Polish item. Affects student and teacher mobile users only. Not a blocker.

**Independent Test**: As STUDENT or TEACHER on a 375 px viewport, observe both the top sidebar drawer (when opened) and the bottom navigation bar simultaneously. The active state on a bottom tab uses the same brand colour and weight as the active item in the sidebar. Icons in both surfaces are visibly from the same icon family. The Wiii AI centre button retains its branding but its border / shadow treatment matches the sidebar's elevation tokens.

**Acceptance Scenarios**:

1. **Given** the bottom navigation bar is visible, **when** an active tab is observed, **then** its colour and font weight match the active-item style of the sidebar.
2. **Given** icons in the bottom nav and the sidebar are observed side-by-side, **when** compared, **then** both use the same icon library and the same icon size class.
3. **Given** the Wiii AI centre button is observed, **when** compared with sidebar elevation styles, **then** its shadow and border use the same elevation tokens.
4. **Given** the bottom nav structure (tab count, position, items, Wiii AI placement), **when** compared before and after this change, **then** the structure is identical.

---

### Edge Cases

- **Viewport crosses the breakpoint mid-session**: User resizes browser from >1024 px down to <1024 px while the sidebar was in collapsed (rail) state. The sidebar transitions cleanly to the mobile drawer pattern (initially closed); the previous "collapsed" state is preserved for when they return to a desktop viewport.
- **Mobile drawer open during a viewport widen**: User opens the mobile drawer on a phone, then rotates device to landscape (now >1024 px). The drawer closes itself and the sidebar takes its desktop form (expanded by default unless the user previously collapsed it on desktop).
- **Reduced-motion preference toggled mid-session**: User changes OS "reduce motion" setting while the app is open. The next sidebar transition respects the new value (no application restart required).
- **localStorage unavailable**: Sidebar state cannot be persisted; the toggle still works for the current session, no error is shown, on next load the default state is used.
- **Navigation item is disabled or behind a role guard the user cannot satisfy**: The item is rendered but visibly disabled, is not focusable for keyboard, is not announced to screen readers as actionable, and tapping does nothing.
- **Three-level nesting** (the teacher item "Bài tập & Ngân hàng câu hỏi" → "Giao bài tập" → "Danh sách bài tập"): The visual indentation makes the hierarchy clear at all 3 levels. ARIA `aria-expanded` is correctly applied to every parent, not just first-level. Focus order proceeds depth-first.
- **Route change while drawer is animating closed**: The destination page begins rendering in parallel; the drawer continues its close animation; when the close completes the drawer is fully gone and the destination page is fully visible. No flash, no layout jank.
- **Tab focus exits the bottom of the sidebar**: Focus moves to the first focusable element of the main content area (in DOM order). The "Skip to content" link works in the reverse direction — pressing it always lands focus in main content.
- **Org-scoped mode-switch when user navigates to a non-org route**: The org-scoped sub-nav is replaced by the main system nav; no stale state remains.
- **Two open tabs, user toggles collapsed in one tab**: Both tabs reflect the new collapsed state immediately (storage-event sync). No reload required. If a third tab is opened later, it picks up the latest persisted value on init.
- **"Kết nối chậm" offline indicator visible at top of viewport**: The sidebar layout does not jump or shift when this indicator appears or disappears; the indicator and the sidebar coexist visually without overlap.

## Requirements *(mandatory)*

### Functional Requirements

**Desktop sidebar (≥1024 px viewport)**

- **FR-001**: System MUST present the sidebar in two stable states on desktop: an "expanded" state (showing icons + text labels, ~256 CSS px wide) and a "collapsed" state (icon-only rail, ~64 CSS px wide).
- **FR-002**: System MUST provide a single toggle control, integrated visually into the sidebar's top header row, that switches between expanded and collapsed states. The control MUST NOT be positioned outside the sidebar's outer edge.
- **FR-003**: System MUST animate the width transition over 200 ms (or instantly when the user prefers reduced motion).
- **FR-004**: System MUST persist the user's chosen collapsed/expanded state across page reloads on the same device.
- **FR-005**: System MUST share the persisted collapsed/expanded state across all 4 role-portals on the same device, using exactly one storage entry.
- **FR-005a**: System MUST synchronise sidebar state changes across browser tabs of the same origin in real time — when the user toggles the collapsed state in one tab, all other open tabs MUST update their sidebar state without requiring a page reload (achieved by listening to the browser's storage-change event).
- **FR-006**: System MUST, when the sidebar is collapsed and the user hovers an icon for ~500 ms, display the corresponding label as a tooltip without expanding the entire sidebar. The tooltip MUST be implemented as a custom popover (not the native HTML `title` attribute) with `aria-describedby` linkage to the icon, so screen readers announce it and the delay is exactly 500 ms regardless of browser.
- **FR-007**: System MUST allow keyboard activation (Space and Enter) of the toggle control, with the focused element having a clearly visible focus indicator.

**Mobile drawer (<1024 px viewport)**

- **FR-008**: System MUST hide the sidebar by default on viewports <1024 px and provide a hamburger button at the top-left of the app header to open it.
- **FR-009**: System MUST present the opened sidebar as a modal off-canvas drawer that slides in from the left edge.
- **FR-010**: Drawer width MUST be the smaller of 280 CSS px or 80 % of the viewport width, with the remaining viewport area covered by a translucent backdrop.
- **FR-011**: Slide-in MUST animate over 250 ms; backdrop fade over 200 ms; both skipped if the user prefers reduced motion.
- **FR-012**: System MUST automatically close the drawer (and dismiss the backdrop) when the user taps a leaf navigation item, in addition to navigating to that item.
- **FR-013**: System MUST NOT close the drawer when the user taps a parent navigation item that has a sub-menu — the sub-menu MUST expand inline and the drawer MUST remain open.
- **FR-014**: System MUST allow the user to dismiss the drawer without navigating, via four mechanisms: tapping the backdrop, tapping a visible close button (×) in the drawer, swiping the drawer toward the left edge, and pressing Escape on a keyboard.
- **FR-015**: System MUST, on drawer dismiss, return keyboard focus to the hamburger button that opened the drawer.
- **FR-016**: System MUST trap keyboard focus inside the drawer while it is open — Tab and Shift+Tab cycle only among elements within the drawer.
- **FR-017**: System MUST identify the open drawer to assistive technology as a modal dialog.

**Cross-role consistency**

- **FR-018**: All 4 role-portals (student, teacher, admin, org_admin) MUST use the same viewport breakpoint (1024 px) for the desktop-↔-mobile transition.
- **FR-019**: All 4 portals MUST use the same visual treatment for the active navigation item: a filled rounded pill in the brand colour at low opacity, with the brand colour for text, and increased font weight.
- **FR-020**: All 4 portals MUST use the same animation duration and easing curve for sidebar transitions.
- **FR-021**: There MUST be exactly one source of truth in the codebase for sidebar collapsed/expanded state, mobile-open state, and hidden state (no per-role duplication).

**Accessibility (WCAG 2.2 AA floor — required)**

- **FR-022**: Sidebar root MUST be a `<nav>` landmark with an accessible name "Điều hướng chính".
- **FR-023**: The currently-active page item MUST be marked with `aria-current="page"` (in addition to its visual indicator).
- **FR-024**: Parent items with sub-menus MUST expose `aria-expanded` reflecting the sub-menu's open state and `aria-controls` referencing the sub-menu's element.
- **FR-025**: The hamburger button MUST expose `aria-expanded` reflecting drawer open state, `aria-controls` referencing the drawer element, and an `aria-label` of "Mở/Đóng menu điều hướng".
- **FR-026**: A "Bỏ qua điều hướng" / skip link MUST become visible on the user's first Tab press and let them jump to a `<main>` landmark.
- **FR-027**: All interactive sidebar elements MUST have a visible focus indicator (≥2 CSS px outline, brand colour, with offset).
- **FR-028**: System MUST honour `prefers-reduced-motion: reduce` by skipping all sidebar slide and fade animations.
- **FR-029**: All tappable elements on mobile MUST measure at least 48×48 CSS px.
- **FR-030**: The drawer MUST satisfy WCAG 2.2 SC 2.5.7 (no drag-only operations) — every action available by drag MUST also be available without drag (the close button satisfies this for swipe-to-close).
- **FR-031**: ALL four role layouts MUST exhibit the same accessibility behaviour — admin/org_admin drawer MUST gain the dialog semantics, focus trap, and Escape handling that student/teacher already have.

**Org-scoped mode-switch (admin context)**

- **FR-032**: When the admin navigates into a specific organisation route, the sidebar MUST replace the main system nav with the org-scoped sub-nav while preserving overall sidebar form factor (collapse state, mobile drawer behaviour).
- **FR-032a**: When the admin opens the mobile drawer while in org context, the drawer MUST display the org-scoped sub-nav (NOT the main system nav). The "Quay lại" affordance inside the drawer MUST allow the admin to switch back to the main system nav without leaving the org context route.
- **FR-033**: Org-scoped sub-nav MUST use the same active-item indicator, spacing, typography, and section-header style as the main sidebar.
- **FR-034**: Org-scoped sub-nav MUST present a clearly-labelled "Quay lại" or equivalent back affordance to exit org context.
- **FR-035**: Org-scoped sub-nav MUST be exposed to assistive technology as a separate navigation landmark named "Điều hướng tổ chức".
- **FR-036**: When the admin navigates away from the organisation route, the sidebar MUST restore the main system nav and clear org-scoped state.

**Mobile bottom navigation (student/teacher only) — visual alignment**

- **FR-037**: The active-tab indicator on the mobile bottom navigation MUST use the same brand colour and font weight as the active-item indicator on the sidebar.
- **FR-038**: The bottom navigation MUST use icons from the same library and at the same size class as the sidebar.
- **FR-039**: The Wiii AI centre button MUST retain its existing branding but its elevation (border, shadow) MUST use the same tokens as the sidebar's elevation styles.
- **FR-040**: The bottom navigation MUST NOT change in structure (item count, item identity, item order, position on screen, presence of the Wiii AI centre button).

### Key Entities

- **Sidebar state** — one logical state object shared across roles, with three boolean fields: `collapsed` (desktop expanded vs icon rail), `mobileOpen` (drawer visible on mobile), `hidden` (sidebar fully suppressed for full-bleed pages such as in-class learning).
- **Sidebar configuration per role** — a static description of the navigation tree for each of the 4 roles, including section labels (e.g., "HỌC TẬP", "CÔNG CỤ", "TÀI KHOẢN"), items, icons, route targets, sub-items, and role-guard requirements.
- **Org-scoped configuration** — a separate static description of the org-scoped sub-nav (6 query-param tabs) that conditionally replaces the main config when admin enters an organisation route.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After this change, **100 %** of users on mobile/tablet, in any of the 4 roles, see the navigation drawer auto-dismiss after tapping a leaf navigation item — verifiable by observation of all 4 portals on a 375 px viewport with one leaf-item tap each.
- **SC-002**: Lighthouse Accessibility score on any page using the sidebar (any of the 4 portals) is **≥ 95**.
- **SC-003**: An automated accessibility audit (axe-core) reports **zero** ARIA validation errors against the sidebar component.
- **SC-004**: All 4 role-portals use the same viewport breakpoint for the desktop-↔-mobile transition (1024 px); a code-review check confirms no breakpoint variance between portals.
- **SC-005**: Exactly **one** persisted entry name exists in the codebase for sidebar collapsed state; legacy per-role entry names are removed.
- **SC-006**: Existing backend test suite continues to pass at its current count (806 / 806); frontend production build (`npm run build`) succeeds with no new warnings.
- **SC-007**: Manual visual review on **four** representative viewports (375 px iPhone, 768 px iPad portrait, 1024 px iPad landscape, 1440 px desktop) finds the sidebar behaviour to be consistent and correct in all 4 portals.
- **SC-008**: The "awkward floating chevron" defect originally reported by the product owner no longer reproduces — the toggle is visually inside the sidebar header in all 4 portals.
- **SC-009**: Keyboard-only navigation can reach every navigation item in the sidebar, identify the current page (via "current page" announcement), open and close the mobile drawer, and the focus indicator is visible at every step.
- **SC-010**: The mobile bottom navigation and the redesigned sidebar score visually consistent (same active colour, same icon family, same elevation tokens) on a side-by-side review of all 4 portals' mobile screens.

## Assumptions

- The 4 wrapper layouts (student-layout-simple, teacher-layout-simple, admin-layout-simple) and the shared sidebar component plus its config are the only consumers of sidebar logic — no other file in the codebase needs to be changed.
- The brand row at the top of the sidebar ("Cổng Học viên", "Cổng Giảng viên", "Quản trị") stays in place and is the host area for the new toggle control.
- The "Kết nối chậm" offline-mode indicator stays as a separate component above or beside the sidebar — its placement is not affected by this work.
- The mobile bottom navigation (student/teacher) keeps its 5-tab + Wiii AI centre structure; only its visual tokens are aligned with the new sidebar.
- The product's primary brand colour is `#0056D2` and the design tokens follow the existing CLAUDE.md brand spec.
- All user-facing copy is in Vietnamese with full diacritics, per project Constitution Principle V.
- ORG_ADMIN role uses the same wrapper layout as ADMIN; this work does not introduce a separate ORG_ADMIN wrapper.
- Browser support: latest two stable versions of Chrome, Edge, Safari, Firefox, and Safari on iOS 15+. Older browsers receive a graceful fallback (no animation, sidebar always expanded on desktop, no swipe-to-close).
- "Reduce motion" preference is read once on each transition; the system does not need to subscribe to changes via JS event listener (CSS `@media` query handles it).

## Out of Scope

- Adding, removing, or renaming navigation items in any role.
- Changing the app header / topbar beyond hosting the new mobile hamburger button.
- Backend changes (no API, schema, or migration changes).
- The right-rail AI sidebar (separate component, untouched).
- The in-course learning sidebar (course outline, table of contents) — separate component governed by the learning module.
- The mobile bottom-navigation **structure** (item count, items, order, position) — only its visual tokens align with the new sidebar.
- Introducing a new global state library or moving away from Angular signals.
- Internationalisation work beyond Vietnamese (no English copy added).
