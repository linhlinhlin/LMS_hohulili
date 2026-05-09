# Phase 0 Research — Sidebar Redesign

**Feature**: 001-sidebar-redesign
**Date**: 2026-05-09
**Sources**: Fork A (current-code exploration of `fe/src`) + Fork B (SOTA pattern survey of 19 reference systems including Linear, Vercel, Notion, Slack, Discord, GitHub, Stripe, Figma, Coursera, edX, Canvas LMS, Khan Academy, Udemy, Material Design 3, Apple HIG, IBM Carbon, Microsoft Fluent UI 2, Atlassian, WCAG 2.2 AA)

This document records every decision required for implementation, with the rationale and the alternatives considered. No `NEEDS CLARIFICATION` markers remain.

---

## Decision 1 — Desktop collapse pattern

**Decision**: Two-state rail/expanded with the toggle integrated into the sidebar's top header row. Expanded width 256 px, collapsed width 64 px. Toggle is a 32×32 px button visually aligned with the brand row content.

**Rationale**:
- Used by Stripe, IBM Carbon, Microsoft Fluent UI 2, Atlassian — the cohort of products designed for multi-hour workflow tools (matches LMS Maritime use case).
- Keeps the toggle inside the sidebar's bounding box → never covers content, always discoverable, keyboard-reachable from the natural focus order.
- Two stable widths satisfy two distinct user intents: maximise content width (collapsed) vs full label glanceability (expanded).
- Bundles with persistent state (localStorage) so a user's choice survives reloads — required by spec FR-004.

**Alternatives considered**:
- *Floating chevron stuck on right edge of sidebar* (current implementation): 2014-era Bootstrap pattern, absent from 100 % of tier-1 products surveyed in 2026. Looks like a dev affordance left in production. **Rejected** — this is the very defect the user reported.
- *Persistent fixed-width sidebar (no collapse)*: Linear, Vercel, Discord. Removes the toggle complexity entirely. **Rejected** — gives up 256 px on small laptops; instructors grading on 13″ screens have repeatedly asked for more horizontal room.
- *Full-hide with hover hamburger* (Notion, Figma): maximises canvas. **Rejected** — Nielsen Norman Group flagged "hidden navigation reduces discoverability"; only acceptable in deep-focus tools (canvas, doc editor), not navigation-heavy LMS contexts where users browse between courses, assignments, messages.
- *Hover-to-expand on collapsed rail* (rejected by Canvas): flickers when cursor passes over; user explicitly disliked this in past UX research.

---

## Decision 2 — Mobile pattern

**Decision**: Off-canvas modal navigation drawer, M3 Modal Drawer specification. Drawer slides in from left at width `min(280px, 80vw)`. Translucent backdrop `bg-black/50`. Dismiss via tap-backdrop, tap close button (×), Escape key, or edge-swipe-left. Tap-leaf-item navigates AND closes; tap-parent-with-submenu expands and stays open.

**Rationale**:
- Industry consensus across M3, Apple HIG, IBM Carbon, Atlassian Design System.
- Auto-close on leaf tap is the universal pattern — quoting M3: *"Modal navigation drawers are dismissed when the user taps the scrim or selects a destination"*.
- Leaf-only auto-close (decided in `/speckit-clarify` Q1) preserves the parent-expand-then-pick-child UX without forcing a re-open.
- Four dismiss mechanisms satisfy WCAG 2.5.7 (no drag-only): backdrop tap + close button + Escape are non-drag alternatives to the swipe-to-close gesture.

**Alternatives considered**:
- *Bottom navigation bar as primary* (M3 Nav Bar < 600 dp; Khan Academy mobile): thumb-zone optimised. **Rejected** — caps at 5 destinations; LMS Maritime has 7+ items per role and needs section grouping.
- *Push drawer (content shifts)* (older Material 2, some Slack views): largely deprecated post-2024 because content reflow on small screens causes layout jank during the slide.
- *No mobile drawer; collapse to icons + scroll horizontally*: violates touch-target sizing and breaks hierarchy.

---

## Decision 3 — Breakpoint standardisation

**Decision**: Single breakpoint at 1024 px (Tailwind `lg:` modifier) for the desktop ↔ mobile-drawer transition across ALL four role portals.

**Rationale**:
- Current state has student/teacher at `md:` (768 px) and admin at `lg:` (1024 px) — inconsistency on tablet (768–1024 px).
- 1024 px chosen because:
  - Matches admin's existing breakpoint (smaller migration cost on the most complex portal).
  - Better fits content-dense admin/teacher tables that need ≥ 768 px of content area when sidebar is open.
  - Aligns with Tailwind's standard `lg` token, no custom breakpoint needed.

**Alternatives considered**:
- *Standardise on 768 px (`md:`)*: would force admin to redesign its table layouts. **Rejected** — much higher migration cost.
- *Add a third intermediate state for tablets* (sidebar collapsed-rail at 768–1024 px, full mobile drawer < 768 px): adds complexity for marginal benefit. **Rejected** — none of the surveyed tier-1 products do this.

---

## Decision 4 — State management

**Decision**: One Angular service `SidebarStateService` injected at the root, owning three signals (`collapsed`, `mobileOpen`, `hidden`) plus derived `computed` signals. Persists `collapsed` to a single `localStorage` key `sidebar:collapsed`. Synchronises across tabs via `window.storage` event listener.

**Rationale**:
- Eliminates ~150 LOC of duplicated state plumbing across three wrapper layouts.
- Signals are the project's mandated state primitive (Constitution Principle II).
- Single localStorage key satisfies spec FR-005 (one source of truth) and reduces cognitive overhead when debugging.
- `window.storage` event sync (decided in `/speckit-clarify` Q3) is the universal pattern for same-origin cross-tab state.

**Alternatives considered**:
- *Per-role services* (`StudentSidebarStateService`, etc.): 3× the surface, no reuse benefit. **Rejected**.
- *NgRx / Signal Store*: overkill for 3 booleans + 1 storage key. Constitution Principle II prohibits introducing new state libraries. **Rejected**.
- *RxJS BehaviorSubject*: project is signals-first per CLAUDE.md and constitution. **Rejected**.
- *BroadcastChannel API for cross-tab sync*: works but adds an SSR-incompatible global; `window.storage` event is universally supported and SSR-safe (only fires in browser). **Rejected**.
- *Reload-only sync (no live cross-tab)*: simpler but produces inconsistent UX between tabs. Considered in `/speckit-clarify` Q3 and rejected by product owner.

---

## Decision 5 — Tooltip implementation (collapsed-state icon labels)

**Decision**: Custom directive `SidebarTooltipDirective` showing a positioned popover after 500 ms hover delay, linked to its trigger via `aria-describedby`. Styled with project design tokens. Disposed cleanly on mouse-leave or focus-out.

**Rationale**:
- Native HTML `title` attribute has uncontrollable browser-defined delay (~700 ms on most browsers, hidden after a few seconds, no style control, screen readers may announce inconsistently).
- `aria-describedby` linkage required for WCAG 2.2 AA — Constitution Principle IV gates on accessibility.
- 500 ms delay is the M3 / Fluent UI / Carbon convention.
- Custom directive is ~50 LOC, lightweight, no new dependency.

**Alternatives considered**:
- *Native `title`*: rejected for a11y reasons above.
- *Angular CDK Overlay*: powerful but adds CDK dependency surface for a single use case; current project does not consistently use CDK Overlay across components. **Rejected** — keep dependency footprint minimal.
- *Ngx-Floating-UI / Tippy.js*: third-party deps, bundle-size cost, redundant for our scope. **Rejected**.

---

## Decision 6 — Animation tokens

**Decision**:
- Desktop collapse / expand: **200 ms** with easing `cubic-bezier(0.2, 0, 0, 1)` (M3 emphasized).
- Mobile drawer slide: **250 ms** with easing `cubic-bezier(0.4, 0, 0.2, 1)` (M3 standard).
- Backdrop fade: **200 ms** with easing `ease-in-out`.
- All transitions wrapped in `@media (prefers-reduced-motion: reduce) { animation: none !important; transition: none !important; }` so motion-sensitive users see instant state changes.
- Animate only: `width`, `transform: translateX`, label `opacity`, scrim `opacity`.
- Do NOT animate: `background-color` of nav items (paint-heavy and causes flash); active-indicator pill colour (snap); item heights (jank); font-size (reflow).

**Rationale**: Material Design 3 motion specifications, validated against Carbon and Fluent equivalents; all three converge on these durations and easings for navigation-surface transitions.

**Alternatives considered**:
- *Linear easing*: feels mechanical. **Rejected**.
- *Longer durations (300+ ms)*: contradicts user perception research — 200–250 ms is the sweet spot for "responsive but smooth".
- *Animation libraries* (Angular Animations module / Motion One): adds dependency for what amounts to two CSS transitions. **Rejected**.

---

## Decision 7 — Active-item visual indicator

**Decision**: Filled rounded pill — `rounded-lg`, `bg-[#0056D2]/10` (10 % brand tint), `text-[#0056D2]`, `font-semibold`. Apply uniformly to all four roles' main nav and to the org-scoped sub-nav.

**Rationale**:
- Matches the project's design tokens (CLAUDE.md primary `#0056D2`).
- Subtle background fill is the 2026 norm (Stripe, Atlassian, Carbon, Notion).
- `aria-current="page"` is added independently for screen readers — visual indicator and semantic indicator are decoupled.

**Alternatives considered**:
- *Thick (4–6 px) left border bar*: heavy 2015-era Material 1 pattern. **Rejected** — feels dated.
- *Underline*: requires more vertical space; not used by any tier-1 sidebar surveyed.
- *Dot beside the label*: Canvas-style; small and easy to miss. **Rejected** for primary indicator.

---

## Decision 8 — Accessibility floor

**Decision**: WCAG 2.2 AA, all required SCs in scope, with a brief mapping:

| WCAG SC | Implementation |
|---|---|
| 1.4.13 Content on Hover or Focus (Dismissable) | Tooltip dismisses on Esc and on mouse-out; drawer dismisses on Esc and on backdrop click |
| 2.1.2 No Keyboard Trap | Drawer focus trap allows Esc to exit; Tab cycle is finite and includes the close button |
| 2.4.1 Bypass Blocks | "Bỏ qua điều hướng" skip-link visible on first Tab focus, jumps to `<main id="main-content">` |
| 2.4.7 Focus Visible | All interactive elements get `outline: 2px solid #0056D2; outline-offset: 2px` on `:focus-visible` |
| 2.4.11 Focus Not Obscured (Minimum) | Sidebar items are not obscured by sticky chrome |
| 2.5.7 Dragging Movements | Swipe-to-close drawer is supplementary; backdrop tap, close button, Esc are alternatives |
| 2.5.8 Target Size (Minimum) | All mobile tappable elements ≥ 48 × 48 CSS px (exceeds the 24×24 minimum) |
| 4.1.2 Name, Role, Value | All controls expose `role`, `aria-label`/`aria-labelledby`, `aria-expanded`, `aria-controls`, `aria-current` |

**Rationale**: Constitution Principle IV (test gates) treats accessibility as a non-negotiable; Lighthouse + axe-core run baked into quickstart smoke.

**Alternatives considered**: WCAG 2.1 AA only (skipping 2.4.11, 2.5.7, 2.5.8 introduced in 2.2). **Rejected** — these three are exactly the ones our current implementation fails most often, and the cost of compliance is small.

---

## Decision 9 — Skip-to-content link

**Decision**: New `SkipLinkComponent` rendered as a single `<a href="#main-content" class="sr-only focus:not-sr-only">` placed inside each wrapper layout's header area, above the sidebar. Target requires the wrapper layouts to have a `<main id="main-content" tabindex="-1">` element wrapping the routed content.

**Rationale**:
- WCAG 2.4.1 bypass-block requirement.
- Each wrapper layout (student, teacher, admin) already has a `<main>` or equivalent — adding `id="main-content" tabindex="-1"` is a one-line touch per layout.
- Component exists once and is rendered in three places — pure presentation, no logic.

**Alternatives considered**:
- *Inline anchor in each layout HTML*: works but duplicates ~10 lines of class/style markup three times. **Rejected** — small extraction is cheaper.
- *Multiple skip links* ("Skip to nav", "Skip to content", "Skip to search"): over-engineering for our scope. **Rejected** — single skip-to-main suffices.

---

## Decision 10 — Mobile drawer in admin org context

**Decision** (per `/speckit-clarify` Q1): When the admin opens the mobile drawer while in an org route (`/admin/organizations/:id`), the drawer shows the **org-scoped sub-nav** (matching the desktop behaviour). A "Quay lại" affordance inside the drawer lets the admin switch back to the main system nav without navigating away from the org context.

**Rationale**: Matches desktop mode-switch behaviour; preserves the user's working context; aligns with how Coursera and Canvas handle nested navigation contexts on mobile.

**Alternatives considered**:
- *Always show main system nav on mobile drawer*: simpler but inconsistent with desktop. **Rejected**.
- *Toggle inside the drawer to switch between org-scoped and main nav*: extra UI surface, low-frequency use. **Rejected** — "Quay lại" link is the simpler primitive.

---

## Decision 11 — Fork A code observations applied

These confirmed facts from the code exploration drive specific Phase-2 task decisions:

- `SidebarComponent` already exists as a single shared component — only behaviour and styles need updates; **no** new top-level sidebar component.
- The `ResizableSidebarDirective` exists but is consumed only by AI-sidebar resize handles in each layout — **out of scope**, untouched.
- Three wrapper layouts (student/teacher/admin) duplicate ~150 LOC of state plumbing — collapsed/mobileOpen/hidden — to be replaced by `SidebarStateService` injection.
- Admin layout serves both ADMIN and ORG_ADMIN roles via `org-admin.routes.ts:7` — single layout file edit covers two roles.
- Mode-switch logic at `sidebar.component.ts:106-131` (admin org-scoped nav) — keep behaviour, restyle visuals.
- Mobile bottom nav (5 tabs + centre Wiii AI button) is implemented inline in student-layout-simple and teacher-layout-simple — token alignment only, no extraction.
- `mvn test` and the backend test suite are unaffected by FE changes — no backend gate for this PR beyond build pass.

---

## Outstanding (deferred to /speckit-tasks Phase 2)

- Exact Vietnamese-localised tooltip text per role/item (will be derived from existing nav-item labels in `sidebar.config.ts` — no new copy).
- Specific Tailwind utility classes for the new toggle button — pixel-level visual decisions belong in implementation, not research.
- Test fixture data for the four role permutations — straightforward extension of existing test patterns.

---

**No further research required.** Phase 0 outputs are stable. Phase 1 design artefacts (`data-model.md`, `contracts/sidebar-state-service.md`, `quickstart.md`) follow.
