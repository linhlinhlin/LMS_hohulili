# Phase 1 Data Model — Sidebar Redesign

**Feature**: 001-sidebar-redesign
**Date**: 2026-05-09

This feature is frontend-only; no database schema changes. The "data model" here describes the in-memory state entities that the UI manipulates and the configuration entities that drive the sidebar's content per role.

---

## Entity 1 — `SidebarState`

The single source of truth for sidebar runtime state. Held in `SidebarStateService` and exposed as Angular signals.

| Field | Type | Default | Persistence | Notes |
|---|---|---|---|---|
| `collapsed` | `boolean` | `false` | `localStorage['sidebar:collapsed']` | True = icon-rail (64 px). False = expanded (256 px). Desktop only — ignored on mobile. |
| `mobileOpen` | `boolean` | `false` | (none — ephemeral) | True = mobile drawer is visible. Auto-cleared on viewport widening past 1024 px. |
| `hidden` | `boolean` | `false` | (none — ephemeral, route-driven) | True = sidebar fully suppressed (e.g., in-class learning, full-bleed AI chat). Set by route-aware effect in wrapper layouts. |
| `lastTabSync` | `number \| null` | `null` | (none) | Internal timestamp of the last cross-tab sync to prevent feedback loops. |

### Lifecycle / state transitions

```
INITIAL ──read localStorage──► RESTORED (collapsed = persisted value)
         │
         │  user clicks toggle
         ▼
EXPANDED ◄──toggleCollapsed────► COLLAPSED
         │                          │
         │  viewport < 1024 px      │
         ▼                          ▼
MOBILE_DRAWER_CLOSED ◄──open/close──► MOBILE_DRAWER_OPEN
         │                          │
         │  route changes to        │
         │  full-bleed page         │
         ▼                          ▼
HIDDEN ◄────────────set/unset────────► VISIBLE
```

### Validation rules

- `collapsed` and `mobileOpen` are mutually orthogonal — collapsed is desktop-only state; mobileOpen is mobile-only state. The wrapper layout decides which to honour based on viewport.
- When `hidden` is true, both `collapsed` and `mobileOpen` are irrelevant (no sidebar surface visible).
- `lastTabSync` is opaque internal state; never exposed in the public API.

### Constraints

- Persistence layer (localStorage) MAY be unavailable (incognito, quota exceeded). Service MUST degrade gracefully: in-memory state still works for the session; no persistence; no thrown errors visible to user.
- Persistence MUST be deferred from constructor to a browser-only `effect()` so SSR rendering does not access `localStorage`.

---

## Entity 2 — `SidebarItem`

A single node in the navigation tree. Already exists in `sidebar.config.ts` — minor extension to add a discriminator field.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | ✅ | Stable identifier (e.g., `'student.courses.mine'`). Used for `aria-controls` linkage. |
| `label` | `string` | ✅ | Vietnamese with diacritics (e.g., "Khoá học của tôi"). |
| `icon` | `IconName` | ✅ | Reference to project's icon library. |
| `route` | `string \| null` | conditional | Required for leaves; null/omitted for parent-only items. |
| `kind` | `'leaf' \| 'parent'` | ✅ (NEW) | Discriminator. Replaces ad-hoc `children?.length > 0` check; makes leaf-only auto-close logic explicit. |
| `children` | `SidebarItem[] \| undefined` | conditional | Required when `kind === 'parent'`. |
| `requiredRoles` | `UserRole[] \| undefined` | optional | Hide item from users not in any of these roles. |
| `roleGuard` | `(user) => boolean \| undefined` | optional | Custom predicate (e.g., feature-flag checks). |
| `disabled` | `boolean \| undefined` | optional | Render but non-interactive. Skip from focus order. |
| `badge` | `string \| number \| undefined` | optional | Notification count display (e.g., "3" for unread messages). |

### Validation rules

- `kind === 'leaf'` ↔ `route !== null && children === undefined`
- `kind === 'parent'` ↔ `route === null && children.length > 0`
- A leaf MUST have a route; a parent MUST have at least one child.
- `id` MUST be unique within the sidebar config.
- `label` MUST NOT contain raw HTML.

---

## Entity 3 — `SidebarConfig`

Describes the navigation tree for one role. Static — defined per-role at module-load time.

| Field | Type | Notes |
|---|---|---|
| `role` | `UserRole` | Which role this config applies to. |
| `brandLabel` | `string` | "Cổng Học viên" / "Cổng Giảng viên" / "Quản trị" / "Chuyên viên quản lý". |
| `brandIcon` | `IconName` | Logo / brand mark for the header row. |
| `sections` | `SidebarSection[]` | Top-level groupings, each with a header label and item list. |

```ts
interface SidebarSection {
  id: string;                // e.g., 'student-learning'
  label: string;             // e.g., "Học tập" — visible section header
  items: SidebarItem[];
}
```

### Constraints

- A role MUST have at least one section with at least one item.
- Section `label` is rendered in collapsed state as a horizontal divider with no text — purely decorative on desktop-collapsed, but read by screen readers.

---

## Entity 4 — `OrgScopedConfig`

Describes the org-scoped sub-nav that conditionally replaces the main config when admin enters `/admin/organizations/:id`.

| Field | Type | Notes |
|---|---|---|
| `orgId` | `string` | The organisation being managed (extracted from route param). |
| `orgName` | `string \| null` | Display name (loaded async; null while loading). |
| `tabs` | `SidebarItem[]` | The 6 tabs (Tổng quan, Thành viên, Lời mời, Thống kê, Cấu hình doanh thu, Cài đặt). All `kind: 'leaf'`. |
| `backTo` | `string` | Route to navigate to when "Quay lại" is clicked (e.g., `/admin/organizations`). |

### Constraints

- `tabs` items use query-param routing (e.g., `?tab=members`); item `route` field encodes the full URL with query params.
- When admin navigates away from `/admin/organizations/:id`, the wrapper layout MUST clear the `OrgScopedConfig` from the active sidebar source.

---

## Entity relationships

```
SidebarStateService ─── owns ──► SidebarState (singleton)

WrapperLayout (per role) ─── injects ──► SidebarStateService
                          ├── selects ──► SidebarConfig (role-specific)
                          └── conditionally selects ──► OrgScopedConfig (admin only, in org route)

SidebarComponent ─── reads ──► SidebarStateService.collapsed/mobileOpen/hidden (signals)
                ├── reads ──► [config] @Input — either SidebarConfig OR OrgScopedConfig
                └── emits ──► (navigate) @Output — wrapper layout reacts to close drawer if leaf

SidebarItem (with kind: 'leaf' | 'parent') drives:
  ├── auto-close logic (only leaf taps close mobile drawer)
  └── aria-expanded/aria-controls wiring (only parents)
```

---

## Backwards compatibility

- Existing `SidebarItem` consumers in `sidebar.config.ts` rely on the absence of `kind` and use `item.children?.length > 0` to detect parents. The migration path is:
  1. Add `kind: 'leaf' | 'parent'` to every existing item.
  2. Replace the `children?.length` checks with `kind === 'parent'`.
  3. Both can be done in a single PR atomically — no partial-state risk.
- The single localStorage key `sidebar:collapsed` is NEW. The three legacy keys (`student_sidebar_collapsed`, `teacher_sidebar_collapsed`, `admin_sidebar_collapsed`) are removed; on the user's first load after the change they get default expanded state. This is acceptable — collapse preference is low-stakes.

---

## Out of scope (no entities here)

- The right-rail AI sidebar — separate component, its own state.
- The in-course learning outline sidebar — separate component, owned by the learning module.
- The bottom navigation bar (student/teacher) — visual token alignment only; its state is local to its own component (which tab is active is derived from current route, no separate store).
