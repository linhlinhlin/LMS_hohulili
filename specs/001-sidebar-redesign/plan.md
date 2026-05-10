# Implementation Plan: Sidebar Redesign — Multi-Role, SOTA-aligned, Accessible

**Branch**: `001-sidebar-redesign` | **Date**: 2026-05-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-sidebar-redesign/spec.md`

## Summary

Replace the awkward floating chevron toggle (a 24×24 px button hanging off the sidebar's right edge) with a professional in-header toggle. Fix the mobile drawer to auto-close when a user taps a leaf navigation item. Standardise the desktop-↔-mobile breakpoint at 1024 px across all four role portals (student, teacher, admin, org_admin). Unify the three duplicated state-management implementations into a single `SidebarStateService` that owns collapsed/mobileOpen/hidden state via Angular signals, persists collapsed state to a single localStorage entry, and synchronises across browser tabs via the storage event. Add WCAG 2.2 AA-floor accessibility: `aria-current="page"`, `aria-expanded`/`aria-controls`, focus trap on the mobile drawer, Escape handler, skip-to-content link, visible focus rings, and `prefers-reduced-motion` respect. Visually align the admin org-scoped sub-nav (mode-switch) and the student/teacher mobile bottom navigation with the redesigned sidebar's tokens — without changing their structure.

Technical approach (consolidated from Fork A code exploration + Fork B SOTA research):
- Adopt the Stripe/Carbon/Fluent two-state pattern (256 px expanded ↔ 64 px icon rail) on desktop, with the toggle integrated into the sidebar's top header row (matches every tier-1 product surveyed; eliminates the 2014-era floating chevron pattern).
- Adopt the M3 Modal Navigation Drawer pattern on mobile (off-canvas slide-in + scrim + leaf-only auto-close + focus trap + Escape).
- Introduce one `SidebarStateService` (Angular signals) injected by all four wrapper layouts; eliminate the three duplicate `student_/teacher_/admin_sidebar_collapsed` keys in favour of a single `sidebar:collapsed` key.
- Build two new directives (`sidebar-tooltip` for icon-rail hover labels with `aria-describedby`; `focus-trap` for the mobile drawer) and one new presentational component (`skip-link` for WCAG bypass-block).
- Apply visual tokens (active-pill colour, animation easing, elevation) to the existing inline mobile bottom navigation in student/teacher layouts — token alignment only, no extraction.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Angular 20.3
**Primary Dependencies**: `@angular/core` 20.3, `@angular/router`, `@angular/common`, Tailwind CSS (utility-first); no new runtime dependencies
**Storage**: Browser `localStorage` for persisted collapsed state; `window.storage` event for cross-tab sync; **no** backend storage
**Testing**: Jasmine + Karma (existing FE test runner); axe-core for accessibility audit; manual visual smoke on 4 viewports × 4 roles
**Target Platform**: Browser (latest two stable versions of Chrome, Edge, Safari, Firefox; Safari iOS 15+); Angular SSR-safe (no `window` access in component constructors)
**Project Type**: Web application — frontend-only feature
**Performance Goals**: Sidebar transition ≤ 200 ms (desktop collapse) / 250 ms (mobile drawer slide); zero layout-shift on viewport-crossing-breakpoint; localStorage read/write on init only (one-time, ≤ 1 ms)
**Constraints**: Must respect `prefers-reduced-motion: reduce`; must be SSR-safe (no `localStorage` access during server render); must keep existing nav-item config shape backwards-compatible; no new runtime deps; bundle-size delta ≤ 5 KB gzipped
**Scale/Scope**: 4 user roles × ~10 nav items per role × 2 form factors (desktop + mobile drawer) × 4 viewport breakpoints to verify; 7 existing files modified, 5 new files created

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: `.specify/memory/constitution.md` v1.0.0. Mark each gate ✅ pass / ❌ fail / N/A.

| # | Gate (mapped to Principle) | Verdict | Notes |
|---|----------------------------|---------|-------|
| 1 | **I — Clean Architecture/DDD**: Backend changes respect `domain/ → application/ → infrastructure/` boundaries; JPA repos use `*JpaEntity`, not domain models; new write use cases follow `Command*` naming or are added to ArchUnit allowlist with justification. | N/A | Frontend-only feature. Zero backend changes. |
| 2 | **II — Angular 20 idiom**: New components use signals + OnPush + `inject()` + `input()`/`output()` + native control flow; no `standalone: true` declared; `CommonModule` imported only when pipes/[ngClass] used. | ✅ pass | Plan mandates: `SidebarStateService` uses signals; new component (`SkipLinkComponent`) uses OnPush + inject() + native `@if`; existing `SidebarComponent` already follows the idiom — keep that style; no `standalone: true` declarations; CommonModule only retained where existing templates use pipes. |
| 3 | **III — Security & RBAC**: Any new endpoint includes `@PreAuthorize` with correct role(s); `ORG_ADMIN` included by default unless system-only; ownership checks via `isAdminRole()`; user input validated at controller boundary; no secrets in source. | N/A | No new endpoints, no auth flow changes, no role-guard changes (existing per-item `requiredRoles` and `roleGuard` honoured unchanged). |
| 4 | **IV — Test/architecture gates**: New tests added for new behaviour; `mvn test` + `CleanArchitectureTest` + `npm run build` all green; persistence-layer tests use real DB (no JPA mocks). | ✅ pass | Plan mandates: unit tests for `SidebarStateService` (signal updates, localStorage round-trip, storage event); component tests for `SidebarComponent` (expanded/collapsed/role variants); integration test for mobile drawer auto-close per role; axe-core accessibility test; FE `npm run build` must pass; backend tests untouched (806/806 unaffected by FE-only change). |
| 5 | **V — Vietnamese UX**: Any user-facing copy is Vietnamese with full diacritics; teacher-portal copy is jargon-free; error messages are actionable. | ✅ pass | All ARIA labels are Vietnamese with diacritics: "Mở/Đóng menu điều hướng", "Bỏ qua điều hướng", "Điều hướng chính", "Điều hướng tổ chức", "Mở rộng / Thu gọn mục con". No new visible copy beyond ARIA labels (nav item labels remain unchanged per spec scope). |
| 6 | **VI — Surgical changes**: Diff is scoped to the feature; no speculative abstractions/features; no comments unless WHY is non-obvious; no emojis; existing files preferred over new ones. | ✅ pass | Diff bounded to 7 modified + 5 new files (all listed in Project Structure). New files exist only because they encapsulate a single, named responsibility (state service, tooltip directive, focus-trap directive, skip-link, design tokens). No speculative refactoring of adjacent admin/teacher/student layout code beyond the sidebar plumbing. No emojis. Comments restricted to WHY-only (e.g., "// SSR: localStorage read deferred to avoid server render"). |
| 7 | **VII — Deploy discipline**: Migrations are additive Flyway; no `ddl-auto: update` in prod; no force-push / `--no-verify` / `--force-recreate` in the workflow; runbook references included if touching deploy path. | N/A | No DB migrations, no deploy path changes. Production deploy remains gated by `DEPLOY_ENABLED` repo variable; this PR ships to GHCR but does not deploy. |

**Verdict**: All applicable gates pass; gates 1, 3, 7 are N/A for a frontend-only sidebar redesign. **No violations to track in Complexity Tracking.**

## Project Structure

### Documentation (this feature)

```text
specs/001-sidebar-redesign/
├── plan.md                              # This file (/speckit-plan output)
├── spec.md                              # /speckit-specify output
├── research.md                          # Phase 0 output — consolidated Fork A code scan + Fork B SOTA research
├── data-model.md                        # Phase 1 output — sidebar state shape + entity descriptions
├── quickstart.md                        # Phase 1 output — manual smoke-test checklist
├── contracts/
│   └── sidebar-state-service.md         # Phase 1 output — public API of SidebarStateService
├── checklists/
│   └── requirements.md                  # /speckit-specify output — quality validation
└── tasks.md                             # Phase 2 output — generated by /speckit-tasks (NOT here)
```

### Source Code (repository root)

```text
fe/src/app/
├── shared/
│   ├── components/
│   │   ├── navigation/
│   │   │   ├── sidebar.component.ts       # MODIFY (293 → ~260 LOC; remove duplicated state, adopt SidebarStateService)
│   │   │   ├── sidebar.component.html     # MODIFY (170 → ~190 LOC; new toggle position, ARIA wiring, skip-link slot)
│   │   │   ├── sidebar.component.css      # MODIFY (795 → ~600 LOC; remove floating-chevron CSS, use tokens)
│   │   │   ├── sidebar.config.ts          # MODIFY (343 → ~343 LOC; minor — add `kind: 'leaf' | 'parent'` discriminator if not derivable)
│   │   │   └── sidebar.tokens.ts          # NEW — design tokens (widths, durations, easings, breakpoint, storage key)
│   │   └── skip-link/
│   │       ├── skip-link.component.ts     # NEW — WCAG 2.4.1 bypass-block component
│   │       └── skip-link.component.html   # NEW — single anchor template
│   ├── directives/
│   │   ├── sidebar-tooltip.directive.ts   # NEW — 500 ms delayed tooltip with aria-describedby
│   │   └── focus-trap.directive.ts        # NEW — focus containment for mobile drawer
│   └── services/
│       └── sidebar-state.service.ts       # NEW — signal-based state, localStorage persistence, storage-event sync
├── features/
│   ├── student/shared/
│   │   └── student-layout-simple.component.ts  # MODIFY — inject SidebarStateService; remove local signals + localStorage; bump breakpoint md→lg; align bottom-nav visual tokens
│   ├── teacher/shared/
│   │   └── teacher-layout-simple.component.ts  # MODIFY — same as student
│   └── admin/presentation/components/
│       └── admin-layout-simple.component.ts    # MODIFY — same; also add role="dialog"/aria-modal/Esc/focus trap to mobile drawer (currently missing); also serves ORG_ADMIN
└── (no other files touched)

fe/src/app/shared/components/navigation/
└── sidebar.component.spec.ts              # NEW — component tests (expanded/collapsed/role variants/keyboard activation)

fe/src/app/shared/services/
└── sidebar-state.service.spec.ts          # NEW — unit tests (signals, localStorage, storage event)

fe/src/app/shared/directives/
├── sidebar-tooltip.directive.spec.ts      # NEW — directive tests (delay, aria linkage)
└── focus-trap.directive.spec.ts           # NEW — directive tests (Tab/Shift+Tab cycling, Esc)
```

**Structure Decision**: Web application — frontend-only. All work lives under `fe/src/app/`. No backend module touched, no `backend/` files in scope. Tests co-located with the units they test (Angular convention used elsewhere in this project).

## Phase 0: Research Output

See `research.md` for the consolidated findings from Fork A (current-code exploration) and Fork B (SOTA pattern survey). Key decisions captured there:
- Desktop pattern: Stripe/Carbon two-state rail/expanded with in-header toggle (rejected: floating-edge chevron, hover-to-expand, persistent fixed-width)
- Mobile pattern: M3 Modal Navigation Drawer (rejected: bottom nav as primary, push drawer)
- State management: single shared signal-based service (rejected: per-role services, NgRx, RxJS Subject)
- Tooltip: custom popover with `aria-describedby` (rejected: native HTML `title`, CDK Overlay)
- Cross-tab sync: `window.storage` event (rejected: BroadcastChannel API for SSR-safety reasons; reload-only sync for UX reasons)
- Animation: M3 emphasized + standard easings (rejected: linear, ease-in-out as primary)

**No `NEEDS CLARIFICATION` markers remain.** All Phase-0 ambiguities resolved by the prior Fork A + Fork B work and by `/speckit-clarify` Q1–Q3.

## Phase 1: Design & Contracts Output

See:
- `data-model.md` — `SidebarState` entity (collapsed, mobileOpen, hidden, modeContext); `SidebarConfig` entity per role; `SidebarItem` entity with `kind: leaf | parent` discriminator; visibility constraints.
- `contracts/sidebar-state-service.md` — `SidebarStateService` public API: signals (`collapsed`, `mobileOpen`, `hidden`), commands (`toggleCollapsed`, `setCollapsed`, `openMobile`, `closeMobile`, `setHidden`), keyboard-shortcut wiring (Cmd/Ctrl+B optional polish), storage-event handler.
- `quickstart.md` — manual smoke checklist: 4 viewports × 4 roles × 12 verification points; axe-core run; keyboard-only navigation pass.

**Agent context update**: `CLAUDE.md` already has the `<!-- SPECKIT START --> ... <!-- SPECKIT END -->` markers (added by spec-kit init); update the inner reference to point at this plan file (`specs/001-sidebar-redesign/plan.md`).

## Constitution Re-check (post-design)

Re-evaluating after Phase 1 design artefacts:

| # | Gate | Verdict | Notes |
|---|---|---|---|
| 1 | I — Clean Arch/DDD | N/A | Unchanged — backend untouched. |
| 2 | II — Angular 20 idiom | ✅ pass | Designed contracts (`SidebarStateService` API) use signals + computed; new component spec confirms OnPush + inject() + native control flow. No design departures. |
| 3 | III — Security/RBAC | N/A | Unchanged. |
| 4 | IV — Test gates | ✅ pass | Test artefacts planned: 4 new spec files (sidebar.component.spec, sidebar-state.service.spec, sidebar-tooltip.directive.spec, focus-trap.directive.spec) + axe-core check baked into quickstart smoke. |
| 5 | V — Vietnamese UX | ✅ pass | All ARIA labels enumerated in contracts/ are Vietnamese with diacritics; nav-item visible labels untouched (out of scope). |
| 6 | VI — Surgical | ✅ pass | File scope frozen: 7 modify + 5 new + 4 spec files. No design opportunities to creep beyond. |
| 7 | VII — Deploy | N/A | Unchanged. |

**Verdict**: Design holds. Proceed to `/speckit-tasks`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Section intentionally empty.
