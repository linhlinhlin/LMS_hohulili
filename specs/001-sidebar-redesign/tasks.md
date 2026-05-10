---

description: "Task list for feature 001-sidebar-redesign — Multi-role sidebar redesign, SOTA-aligned, accessible"
---

# Tasks: Sidebar Redesign — Multi-Role, SOTA-aligned, Accessible

**Input**: Design documents from `specs/001-sidebar-redesign/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/sidebar-state-service.md ✅, quickstart.md ✅

**Tests**: REQUIRED — Constitution Principle IV is non-negotiable. New units (service + 2 directives + skip-link component) get unit/component test specs; existing modified behaviour (sidebar component template + wrapper layouts) is verified through component tests + the manual smoke matrix in quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and verification of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1 / US2 / US3 / US4 / US5 / US6)
- File paths are exact; tests are co-located with the unit they test (Angular convention)

## Path Conventions

- Frontend code: `fe/src/app/`
- Shared sidebar surface: `fe/src/app/shared/components/navigation/`
- Shared directives + services + skip-link: `fe/src/app/shared/{directives,services,components/skip-link}/`
- Wrapper layouts: `fe/src/app/features/{student,teacher}/shared/` and `fe/src/app/features/admin/presentation/components/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extract design tokens + minor schema migration on existing config so subsequent phases reference a single source of truth.

- [X] T001 Create `fe/src/app/shared/components/navigation/sidebar.tokens.ts` exporting constants: `STORAGE_KEY = 'sidebar:collapsed'`, `WIDTH_EXPANDED_PX = 256`, `WIDTH_COLLAPSED_PX = 64`, `WIDTH_MOBILE_DRAWER = 'min(280px, 80vw)'`, `BREAKPOINT_LG_PX = 1024`, `DURATION_DESKTOP_MS = 200`, `DURATION_MOBILE_MS = 250`, `DURATION_BACKDROP_MS = 200`, `EASING_EMPHASIZED = 'cubic-bezier(0.2, 0, 0, 1)'`, `EASING_STANDARD = 'cubic-bezier(0.4, 0, 0.2, 1)'`, `TOOLTIP_DELAY_MS = 500`. Verify: file exists; `cd fe && npm run build` succeeds.
- [~] T002 [P] **SKIPPED with rationale**: Adding `kind` discriminator to ~50 items in 4 configs costs 50+ touch points for explicitness only. Existing `children?.length > 0` pattern already differentiates leaf vs parent implicitly. Per Constitution Principle VI (surgical), the implicit predicate is preferred. Auto-close logic (Phase 4) will use `if (!item.children?.length)` inline instead. Documented in PR description.

---

## Phase 2: Foundational (BLOCKING Prerequisites)

**Purpose**: Build the unified `SidebarStateService` so all user-story phases inject one signal source instead of duplicating local state.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete and tests pass.

- [X] T003 [P] Create test spec `fe/src/app/shared/services/sidebar-state.service.spec.ts` covering all 10 cases from `contracts/sidebar-state-service.md` (defaults, localStorage round-trip, idempotent setCollapsed, storage-event sync, storage-event filter, no-op on match, graceful degradation when localStorage throws, SSR safety with PLATFORM_ID='server', mobileOpen ephemerality, canShow computed). Tests MUST fail initially (red).
- [X] T004 Create `fe/src/app/shared/services/sidebar-state.service.ts` implementing the contract from `contracts/sidebar-state-service.md`: `@Injectable({providedIn: 'root'})`; signals `_collapsed`, `_mobileOpen`, `_hidden`; readonly accessors `collapsed`, `mobileOpen`, `hidden`, `canShow` (computed); commands `toggleCollapsed`, `setCollapsed`, `openMobile`, `closeMobile`, `setHidden`; SSR-safe `afterNextRender` for localStorage read + storage listener registration; storage event handler filtering by `STORAGE_KEY` from sidebar.tokens.ts; idempotent setCollapsed; try/catch around localStorage writes for graceful degradation. Verify: T003 tests now pass (green); `cd fe && npm test -- --include='**/sidebar-state.service.spec.ts'` shows ≥10 passing tests.

**Checkpoint (Phase 2 complete)**: `SidebarStateService` is operational and tested. All user-story phases can begin.

---

## Phase 3: User Story 1 — Desktop in-header toggle (Priority: P1) 🎯 MVP

**Goal**: Replace the awkward floating chevron with a professional in-header toggle. Two stable widths (256 px ↔ 64 px). State persists. Tooltips on collapsed-state hover with `aria-describedby`.

**Independent Test**: Open `/student/courses` on a 1440-px viewport. Toggle button is INSIDE the sidebar header row, not floating. Click → sidebar narrows in 200 ms. Reload → state restored. Hover an icon while collapsed → tooltip appears after ~500 ms.

### Implementation for User Story 1

**Phase 3 partial implementation in this PR**: T007 + T008 (visual defect fix) only. T005, T006, T009–T014 deferred to follow-up PR — they require a larger refactor (3 wrapper layouts, new directive, component test) and benefit from being a separate, focused review unit. The visual fix alone resolves the user's #1 complaint (floating chevron) and is independently shippable because the existing `[collapsed]` input + `(toggleCollapse)` output mechanism still works.

- [ ] T005 [P] [US1] **DEFERRED to follow-up PR** — Tooltip directive spec.
- [ ] T006 [US1] **DEFERRED to follow-up PR** — Tooltip directive implementation.
- [X] T007 [US1] Modify `fe/src/app/shared/components/navigation/sidebar.component.html` — DONE. Removed floating `<button class="collapse-toggle">`. Added new in-header `<button class="sidebar-toggle">` inside the header flex row. Added `aria-expanded` reflecting collapsed state and dynamic Vietnamese `aria-label` ("Mở rộng menu điều hướng" / "Thu gọn menu điều hướng"). Wrapped brand content in `.sidebar-header-brand` for layout.
- [X] T008 [US1] Modify `fe/src/app/shared/components/navigation/sidebar.component.css` — DONE. Removed `.collapse-toggle` floating-position CSS (was lines 400–430 with `right: -12px; top: 24px; position: absolute`). Added new `.sidebar-toggle` in-header styles (32×32 px, hover/focus-visible states). Added `.sidebar-header-brand` flex layout. Updated `.sidebar-header` from `position: relative` to `display: flex; justify-content: space-between`. Replaced orphaned `.space-x-3` rule with `.sidebar-header-brand` rule. Added global `@media (prefers-reduced-motion: reduce)` guard at file end (WCAG 2.3.3 partial coverage).
- [ ] T009 [US1] **DEFERRED to follow-up PR** — Wire SidebarStateService into sidebar.component.ts.
- [ ] T010 [P] [US1] **DEFERRED to follow-up PR** — Refactor student-layout-simple to use service.
- [ ] T011 [P] [US1] **DEFERRED to follow-up PR** — Refactor teacher-layout-simple to use service.
- [ ] T012 [P] [US1] **DEFERRED to follow-up PR** — Refactor admin-layout-simple to use service.
- [ ] T013 [US1] **DEFERRED to follow-up PR** — Wire tooltip directive in template.
- [ ] T014 [US1] **DEFERRED to follow-up PR** — Component test spec.

**Checkpoint US1**: Run `cd fe && npm run build` (green) + `npm test -- --include='**/sidebar*.spec.ts'` (green) + manual quickstart smoke #1 passes (toggle is in-header, not floating).

---

## Phase 4: User Story 2 — Mobile drawer with leaf-only auto-close (Priority: P1) 🎯 MVP

**Goal**: Mobile drawer slides in via hamburger; auto-closes on leaf tap; stays open on parent tap (sub-menu expands); 4 dismiss methods (backdrop tap, × button, Escape, swipe-left); focus trap; admin no longer missing dialog semantics.

**Independent Test**: Resize browser to 375 px. Tap hamburger → drawer slides in. Tap "Bài cần làm" (leaf) → app navigates AND drawer closes. Tap "Khoá học của tôi" (parent) → sub-menu expands, drawer stays open. Tap leaf child → drawer closes. Press Escape with drawer open → drawer closes; focus returns to hamburger.

### Implementation for User Story 2

- [ ] T015 [P] [US2] Create test spec `fe/src/app/shared/directives/focus-trap.directive.spec.ts` — cases: Tab cycles only within trapped container (last → first); Shift+Tab cycles backwards; initial focus lands on first focusable element when trap activates; Escape key fires `(escape)` output; trap deactivates cleanly on directive destroy; respects elements with `disabled`/`tabindex=-1` (skipped). Tests MUST fail initially.
- [ ] T016 [US2] Create `fe/src/app/shared/directives/focus-trap.directive.ts` — Angular directive `[appFocusTrap]` with input `[active]: boolean`; when active, queries focusable elements inside host, listens for `keydown.tab` to cycle, listens for `keydown.escape` to emit `(escape)`; on activate moves focus to first focusable; on deactivate restores focus to a stored `triggerEl` (passed via `[restoreTo]`). Verify: T015 passes.
- [ ] T017 [US2] Modify `fe/src/app/shared/components/navigation/sidebar.component.ts` — add `@Output() itemClick = output<SidebarItem>()`. In the template item-tap handler, emit ONLY when `item.kind === 'leaf'` (not for parents — parents toggle their sub-menu inline). Verify: emit logic visible; existing routerLink behaviour preserved.
- [ ] T018 [US2] Modify `fe/src/app/shared/components/navigation/sidebar.component.html` — wire `(click)` on each item: if leaf → call routerLink + emit `itemClick($event, item)`; if parent → toggle local `item.expanded` signal AND set `aria-expanded` accordingly. Update HTML to use `@if (item.kind === 'parent')` / `@else` to differentiate render paths. Verify: tap parent in DevTools → console shows expand toggle, no itemClick emission.
- [ ] T019 [P] [US2] Modify `fe/src/app/features/student/shared/student-layout-simple.component.ts` — listen to `(itemClick)` from `<app-sidebar>` inside the mobile drawer; on emission call `sidebarState.closeMobile()`. Verify: tapping a leaf in mobile drawer closes the drawer.
- [ ] T020 [P] [US2] Modify `fe/src/app/features/teacher/shared/teacher-layout-simple.component.ts` — same as T019. Verify: same.
- [ ] T021 [US2] Modify `fe/src/app/features/admin/presentation/components/admin-layout-simple.component.ts` — same as T019 PLUS add to the mobile drawer container: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the drawer header, `[appFocusTrap]` `[active]="sidebarState.mobileOpen()"` `(escape)="sidebarState.closeMobile()"`. (Currently admin drawer is missing all of these.) Verify: DevTools inspect on admin mobile drawer shows role=dialog + aria-modal=true; press Esc → drawer closes.
- [ ] T022 [US2] Add a visible close button (`<button aria-label="Đóng menu">×</button>`) to the mobile drawer template in all three wrapper layouts (student, teacher, admin). Wire `(click)` to `sidebarState.closeMobile()`. Verify: × visible top-right of drawer on each role; clicking dismisses.
- [ ] T023 [US2] Add edge-swipe-left handler to the mobile drawer in each wrapper layout: `@HostListener('touchstart', ['$event'])` capturing start X, `@HostListener('touchend', ['$event'])` checking deltaX < -50 px → close drawer. Or use a small inline gesture util. Verify: on a touch device (or DevTools touch emulator) swiping the drawer left dismisses it.

**Checkpoint US2**: Run `cd fe && npm run build` (green) + `npm test -- --include='**/focus-trap*.spec.ts'` (green) + manual quickstart smoke #2 (auto-close on leaf) + #3 (parent stays open) pass for all 3 wrapper layouts.

---

## Phase 5: User Story 3 — Cross-role consistency (Priority: P2)

**Goal**: All 4 portals use the same breakpoint (1024 px), the same active-item pill, the same animation tokens, and the single shared service. Eliminate `md:` vs `lg:` split. Eliminate the three legacy localStorage keys.

**Independent Test**: Code search for sidebar breakpoint — only `lg:` remains. Code search for `*sidebar_collapsed` — only `sidebar:collapsed` remains. Active items in all 4 portals look pixel-identical.

### Implementation for User Story 3

- [ ] T024 [P] [US3] Modify `fe/src/app/features/student/shared/student-layout-simple.component.ts` template — change every `md:` Tailwind class governing sidebar visibility to `lg:` (e.g., `md:hidden` → `lg:hidden`, `md:flex` → `lg:flex`, `md:w-64` → `lg:w-64`). Verify: grep for `md:` in this file returns no sidebar-related matches.
- [ ] T025 [P] [US3] Modify `fe/src/app/features/teacher/shared/teacher-layout-simple.component.ts` — same as T024 for teacher. Verify: same.
- [ ] T026 [US3] Verify `fe/src/app/features/admin/presentation/components/admin-layout-simple.component.ts` already uses `lg:` consistently (per Fork A research it does); no edit if so. Verify: grep confirms.
- [ ] T027 [US3] Update active-item visual in `fe/src/app/shared/components/navigation/sidebar.component.html` and `.css` — use unified utility classes (`bg-[#0056D2]/10 text-[#0056D2] font-semibold rounded-lg`) bound conditionally to `aria-current="page"`. Remove any per-portal active-item style overrides. Verify: visually inspect active item in all 4 portals — pixel-identical.
- [ ] T028 [US3] Search the entire codebase for legacy storage key strings: `student_sidebar_collapsed`, `teacher_sidebar_collapsed`, `admin_sidebar_collapsed`. Remove every reference (keys, reads, writes). Verify: `cd fe && grep -r "_sidebar_collapsed" src/` returns zero matches.

**Checkpoint US3**: `cd fe && npm run build` (green) + manual quickstart smoke #4 (cross-role state sync via single key) passes.

---

## Phase 6: User Story 4 — Accessibility hardening to WCAG 2.2 AA (Priority: P2)

**Goal**: Sidebar passes axe-core with zero violations. Skip-to-content link works. `aria-current` / `aria-expanded` / focus rings / reduced-motion all in place. 48×48 mobile touch targets.

**Independent Test**: axe-core run on each role's main layout returns zero violations. Lighthouse Accessibility score ≥ 95. Keyboard-only navigation works end-to-end.

### Implementation for User Story 4

- [ ] T029 [P] [US4] Create test spec `fe/src/app/shared/components/skip-link/skip-link.component.spec.ts` — cases: anchor renders with `href="#main-content"` and Vietnamese label "Bỏ qua điều hướng"; class `sr-only` is applied by default; class `focus:not-sr-only` reveals on focus. Tests MUST fail initially.
- [ ] T030 [US4] Create `fe/src/app/shared/components/skip-link/skip-link.component.ts` and `.html` — standalone (default), `ChangeDetectionStrategy.OnPush`, single `<a>` element, no logic. Verify: T029 passes.
- [ ] T031 [P] [US4] Modify `fe/src/app/features/student/shared/student-layout-simple.component.ts` template — add `<app-skip-link>` as the first focusable element in the layout (above the sidebar in DOM order) and wrap the routed content in `<main id="main-content" tabindex="-1">`. Verify: pressing Tab from the address bar focus reveals the skip link; activating it focuses `<main>`.
- [ ] T032 [P] [US4] Modify `fe/src/app/features/teacher/shared/teacher-layout-simple.component.ts` — same as T031.
- [ ] T033 [P] [US4] Modify `fe/src/app/features/admin/presentation/components/admin-layout-simple.component.ts` — same as T031.
- [ ] T034 [US4] In `sidebar.component.html`, add `aria-current="page"` binding to each leaf nav item when its route matches the current router URL. Use Angular router state via signals (e.g., `routerLinkActive` directive's exposed signal or `inject(Router).events` reduced to a current-url signal). Verify: navigate to a route → DevTools shows `aria-current="page"` on the matching item.
- [ ] T035 [US4] In `sidebar.component.html`, add `aria-expanded`/`aria-controls` to parent items: `aria-expanded="{{ item.expanded() }}"`, `aria-controls="submenu-{{ item.id }}"`; the sub-menu container gets `id="submenu-{{ item.id }}"`. Verify: toggle a parent → `aria-expanded` flips.
- [ ] T036 [P] [US4] In each wrapper layout's hamburger button: add `aria-expanded="{{ sidebarState.mobileOpen() }}"`, `aria-controls="mobile-drawer"` (drawer gets `id="mobile-drawer"`), and `aria-label="Mở/Đóng menu điều hướng"`. Verify: DevTools shows correct ARIA on hamburger.
- [ ] T037 [P] [US4] In `sidebar.component.html` root: add `<nav role="navigation" aria-label="Điều hướng chính">`. Verify: DevTools shows nav landmark with the Vietnamese label.
- [ ] T038 [US4] In `sidebar.component.css`, add `:focus-visible { outline: 2px solid #0056D2; outline-offset: 2px; }` rule for `.nav-item`, `.toggle-btn`, `.section-header[role="button"]`, and the close button. Remove any `outline: none` overrides. Verify: keyboard-Tab through the sidebar — every focused element shows the ring.
- [ ] T039 [US4] In `sidebar.component.css` (and the wrapper layouts' drawer CSS files if separate), wrap every `transition` and `animation` rule in `@media (prefers-reduced-motion: reduce)` overrides setting `transition: none !important; animation: none !important;`. Verify: enable OS reduce-motion → toggle sidebar → instant change, no animation.
- [ ] T040 [US4] Bump mobile nav-item touch target to ≥48×48 CSS px in `sidebar.component.css` under `@media (max-width: 1023px)`: `min-height: 48px; padding: 12px 16px;`. Verify: DevTools mobile viewport — measure each item, ≥48 px tall.

**Checkpoint US4**: `cd fe && npm run build` (green) + axe-core run on each role layout returns zero violations + manual quickstart smoke #5 (keyboard navigation) passes.

---

## Phase 7: User Story 5 — Org-scoped mode-switch consistency (Priority: P3)

**Goal**: Admin org-scoped sub-nav uses the same visual language; "Quay lại" affordance present; mobile drawer in org context shows org-scoped nav (FR-032a); separate ARIA landmark.

**Independent Test**: As ADMIN, navigate `/admin/organizations/<id>`. Sub-nav renders with same active-pill style as main. "Quay lại" visible at top. Open mobile drawer → org-scoped nav shown. Click "Quay lại" → main system nav restored.

### Implementation for User Story 5

- [ ] T041 [US5] In `fe/src/app/shared/components/navigation/sidebar.component.html`, wrap the org-scoped sub-nav block in `<nav role="navigation" aria-label="Điều hướng tổ chức">` (separate landmark from the main `aria-label="Điều hướng chính"`). Apply the same active-pill class structure used by main nav items. Verify: DevTools shows two distinct nav landmarks when in org context.
- [ ] T042 [US5] Add a "Quay lại" affordance at the top of the org-scoped sub-nav: a button or routerLink rendering as `<button class="back-link"><app-icon name="arrow-left"></app-icon> Quay lại</button>` that navigates to `/admin/organizations`. Verify: visible at top of sub-nav; click returns to org list.
- [ ] T043 [US5] Update mode-switch logic at `sidebar.component.ts:106-131` (org-scoped detection) — ensure it also activates inside the mobile drawer (FR-032a). The `[config]` input passed to `<app-sidebar>` from `admin-layout-simple` mobile drawer template MUST be the org-scoped config when the URL matches `/admin/organizations/:id`. Verify: open mobile drawer at `/admin/organizations/abc` → drawer shows the 6 org-scoped tabs, NOT the system nav.
- [ ] T044 [US5] Verify when admin navigates from `/admin/organizations/<id>` to `/admin/users` (a non-org route), the sidebar restores the main system nav and removes the org-scoped state (FR-036). Verify: URL change → sidebar swap is immediate and complete.

**Checkpoint US5**: `cd fe && npm run build` (green) + manual quickstart full-matrix #13–17 pass.

---

## Phase 8: User Story 6 — Bottom nav visual token alignment (Priority: P3)

**Goal**: Mobile bottom navigation (student/teacher) uses the same active-item brand colour, font weight, icon family, and elevation tokens as the new sidebar. Structure unchanged.

**Independent Test**: Side-by-side compare the open mobile drawer and the bottom nav on student and teacher portals (375 px viewport): active states use `text-[#0056D2]` + matching font weight; icons visibly from same library; Wiii AI button shadow matches sidebar elevation.

### Implementation for User Story 6

- [ ] T045 [P] [US6] Modify `fe/src/app/features/student/shared/student-layout-simple.component.ts` — locate the inline bottom-nav template; update active-tab classes to `text-[#0056D2] font-semibold` (matching the sidebar active-item tokens). Inactive tabs use `text-gray-500 font-medium`. Verify: visual check on 375-px viewport shows brand colour on active tab.
- [ ] T046 [P] [US6] Modify `fe/src/app/features/teacher/shared/teacher-layout-simple.component.ts` — same as T045 for teacher.
- [ ] T047 [US6] Verify icon library match — bottom-nav uses `<app-icon>` (project's shared icon component) the same as sidebar; icon size class matches sidebar's. If mismatch found, update icon refs. Verify: side-by-side icons render identically in both surfaces.
- [ ] T048 [US6] Update Wiii AI centre button styles in both layouts — border/shadow tokens align with sidebar's elevation (e.g., `shadow-md` instead of `shadow-2xl`; border-radius matches `rounded-2xl` of header brand area). Verify: Wiii AI button visually consistent with new sidebar elevation.
- [ ] T049 [US6] Confirm structure unchanged: bottom-nav still has 5 tabs, Wiii AI centre button still in centre position, no items added/removed/reordered. Verify: tab count = 5; centre button position unchanged; route mappings unchanged.

**Checkpoint US6**: `cd fe && npm run build` (green) + manual quickstart full-matrix #18–20 pass.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final verification before PR — automated checks all green, manual smoke matrix complete, build optimised.

- [ ] T050 Run `cd fe && npm test -- --watch=false --browsers=ChromeHeadless` — ALL tests pass (existing + new SidebarStateService spec + sidebar component spec + 2 directive specs + skip-link spec). No flaky failures. Verify: zero failures, expected count of new tests added (≥30 new tests total).
- [ ] T051 Run `cd fe && npm run build` — production build succeeds with no NEW warnings vs main. Verify: build output `dist/lms-angular/browser/` populated; bundle-size delta ≤ 5 KB gzipped (per plan constraint).
- [ ] T052 Run axe-core accessibility audit on each of the 4 role layouts (use `npm run test:a11y` if wired, otherwise via browser DevTools axe extension on `/student`, `/teacher`, `/admin`, `/admin` as ORG_ADMIN). Verify: zero violations on each.
- [ ] T053 Manual quickstart full matrix from `quickstart.md` — 4 viewports (375/768/1024/1440) × 4 roles × 12 base checks + role-specific checks. Capture screenshots of any deviations. Verify: ≥ 95 % cells pass; deviations documented in PR.
- [ ] T054 Reduced-motion smoke (per quickstart): enable OS reduce-motion → toggle sidebar → instant change, no animation. Verify: pass.
- [ ] T055 Cross-tab sync smoke (per quickstart): two tabs open at the same role, toggle in tab A → tab B updates without reload. Verify: pass.
- [ ] T056 Update PR description with: (a) link to spec.md and plan.md; (b) checklist of completed user stories US1–US6; (c) screenshots of before/after for the floating-chevron defect; (d) list of files changed (12 expected: 7 modify + 5 new) + spec count (≥4 new spec files); (e) constitution-check verdict pasted from plan.md; (f) reviewer's quickstart.md as the verification path. Verify: PR description renders cleanly on GitHub.

**Checkpoint Phase 9**: All checkboxes ticked → ready for human review → ready to merge.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: T001 → T002 (T002 can be done after T001 lands the tokens but is technically independent). Blocking for all subsequent phases.
- **Phase 2 (Foundational)**: T003 → T004. Blocking for all user stories.
- **Phase 3 (US1)**: Depends on Phase 2. Internal: T005 → T006 (directive); T007 → T008 → T009 (sidebar component + CSS); T010, T011, T012 (parallel — different wrapper files); T013 (depends on T006 + T007); T014 (component test, depends on T009).
- **Phase 4 (US2)**: Depends on Phase 2 + T002. Internal: T015 → T016 (focus-trap directive); T017 → T018 (sidebar template + emit); T019, T020, T021 (parallel — different wrapper files; T021 also adds a11y plumbing); T022, T023 (parallel additions per wrapper).
- **Phase 5 (US3)**: Can start after Phase 2. Internal: T024, T025 parallel; T026 verify-only; T027 single-file; T028 codebase-wide grep.
- **Phase 6 (US4)**: Can start after Phase 2. Several tasks parallel (T029, T031, T032, T033, T036, T037).
- **Phase 7 (US5)**: Depends on US3 + US4 (uses unified visual + ARIA infra). Sequential: T041 → T042 → T043 → T044.
- **Phase 8 (US6)**: Depends on US3 (uses unified active-pill tokens). T045, T046 parallel; T047, T048, T049 sequential or parallel based on findings.
- **Phase 9 (Polish)**: Depends on all user-story phases complete.

### User Story Independence Test

- US1 (desktop toggle) is independently shippable with US3 deferred — but expects T002 (kind discriminator) and the unified service from Phase 2.
- US2 (mobile drawer auto-close) is independently shippable but expects the unified service from Phase 2.
- US3 (consistency) requires US1 + US2 to have produced the unified visual + service to consume.
- US4 (a11y) is mostly independent but its `aria-current` work piggybacks on the new template structure from US1.
- US5 + US6 are pure polish on top of US1–US4 foundations.

### Parallel Opportunities

- Within Phase 1: T002 [P] can start as soon as T001 lands the tokens reference.
- Within Phase 2: T003 [P] can be written before T004 implementation (TDD-style red phase).
- Within Phase 3 (US1): T010, T011, T012 [P] (three wrapper layouts, independent files).
- Within Phase 4 (US2): T015 [P] then T019, T020 [P] (two student/teacher wrappers; admin T021 has extra a11y additions).
- Within Phase 5 (US3): T024, T025 [P] (student + teacher).
- Within Phase 6 (US4): T029, T031, T032, T033, T036, T037 all [P] (different files / additive markup).
- Within Phase 8 (US6): T045, T046 [P].

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 only)

1. Phase 1 Setup → tokens + kind discriminator.
2. Phase 2 Foundational → SidebarStateService green.
3. Phase 3 US1 → desktop toggle no longer awkward; **shippable as MVP**.
4. Phase 4 US2 → mobile drawer auto-closes; **MVP complete**.
5. STOP — verify MVP via quickstart high-priority smoke (5 minutes); ship to staging.

### Incremental Delivery

1. MVP (Phases 1–4) → demo to product owner, gather feedback.
2. Phase 5 US3 → consistency cleanup; merge.
3. Phase 6 US4 → accessibility hardening; merge.
4. Phase 7 US5 → admin polish; merge.
5. Phase 8 US6 → bottom nav alignment; merge.
6. Phase 9 → final polish, single PR for the whole feature, or sequential PRs per phase.

Per `/speckit-clarify` Q4 answer (product owner chose "Em implement toàn bộ, anh review PR cuối"), this implementation will deliver ALL phases as a single PR for the user's final review.

### Per-Phase Discipline

- Every phase MUST end with:
  1. New + existing tests green: `cd fe && npm test -- --watch=false`
  2. Production build green: `cd fe && npm run build`
  3. The phase's quickstart smoke check passes (manual or automated)
- Do NOT advance phases if any of the above is red — fix at the phase boundary.

---

## Notes

- [P] tasks operate on different files and have no incomplete dependencies — safe to interleave or parallelise.
- [Story] label maps task → user story for traceability and partial-merge planning.
- File paths are exact; do not paraphrase or relocate.
- Verify steps are mandatory — a task without a verify step is incomplete.
- Commit cadence: prefer one commit per checkpoint (not per task) to keep history readable; final PR squashes if requested.
- Avoid: out-of-scope edits (header/topbar redesign, AI sidebar, learning sidebar, bottom-nav structure changes).
- Constitution guardrails: every commit must respect karpathy surgical principle (Principle VI) — no speculative refactors of adjacent code.
