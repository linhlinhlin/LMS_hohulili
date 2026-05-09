# Contract — `SidebarStateService`

**Feature**: 001-sidebar-redesign
**File**: `fe/src/app/shared/services/sidebar-state.service.ts`
**Scope**: Singleton service injected at the application root; provides the only source of truth for sidebar runtime state across all four role layouts.

---

## Public API surface

```ts
@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  // ───── Read-only signals ─────
  readonly collapsed: Signal<boolean>;        // Desktop expanded vs icon-rail
  readonly mobileOpen: Signal<boolean>;       // Mobile drawer visible
  readonly hidden: Signal<boolean>;           // Sidebar fully suppressed
  readonly canShow: Signal<boolean>;          // computed: !hidden && (desktop || mobileOpen)

  // ───── Commands ─────
  toggleCollapsed(): void;                    // Flip collapsed; persist + broadcast to other tabs
  setCollapsed(value: boolean): void;         // Set explicit; persist + broadcast
  openMobile(): void;                         // mobileOpen = true (no persistence)
  closeMobile(): void;                        // mobileOpen = false (no persistence)
  setHidden(value: boolean): void;            // hidden flag; called by route-aware effect in wrapper layouts

  // ───── Lifecycle (called automatically by Angular DI; not part of public contract) ─────
  // - constructor(): initialises signals to defaults; registers storage event listener (browser only)
  // - ngOnDestroy(): unregisters storage event listener
}
```

---

## Behavioural contract

### Initialisation

1. On construction, signals start with defaults: `collapsed=false`, `mobileOpen=false`, `hidden=false`.
2. The service uses `afterNextRender` (Angular 20 SSR-safe) to:
   - Read `localStorage['sidebar:collapsed']` if present and parse to boolean.
   - Update the `collapsed` signal to the parsed value.
3. If `localStorage` is unavailable or the key is absent / invalid, the signal stays at the default `false`.

### `toggleCollapsed()`

1. Flips the `collapsed` signal value.
2. Writes the new value to `localStorage['sidebar:collapsed']` (string `'true'` / `'false'`).
3. The write fires a `storage` event in **other** open tabs of the same origin (browser-native behaviour) — those tabs' listeners react, updating their `collapsed` signal.
4. If `localStorage` write fails (quota, security policy), the in-memory signal still updates; no error thrown.

### `setCollapsed(value)`

Same as `toggleCollapsed` but accepts an explicit boolean. Idempotent — setting to the current value does NOT trigger a write or broadcast.

### `openMobile()` / `closeMobile()`

1. Updates `mobileOpen` signal.
2. NOT persisted (mobile-open is ephemeral, per-session, per-tab).
3. NOT broadcast cross-tab (different windows can have independent drawer state).

### `setHidden(value)`

1. Updates `hidden` signal.
2. NOT persisted.
3. Called by wrapper-layout route effects when entering / leaving full-bleed pages (in-class learning, AI chat).

### Storage event handler

Registered on `window` in browser environment only:

```ts
private onStorageEvent = (e: StorageEvent) => {
  if (e.key !== 'sidebar:collapsed') return;
  if (e.newValue === null) return;             // Key deleted; ignore
  const incoming = e.newValue === 'true';
  if (incoming === this._collapsed()) return;  // No-op; prevents feedback loop
  this._collapsed.set(incoming);
};
```

Behaviour:
- Fires only in tabs OTHER than the one that wrote (browser semantics).
- Filtered to the single key we own.
- Idempotent — no-op if value matches current.
- No-op for `null` (key deletion) — keeps current value.

---

## SSR safety

This service is provided at the root and may be instantiated during server render. Constraints:

- Constructor MUST NOT touch `window` or `localStorage` directly.
- All browser-only logic (localStorage read, storage listener registration) MUST be guarded behind `afterNextRender` or `isPlatformBrowser(inject(PLATFORM_ID))`.
- Tests MUST exercise both branches (browser path and SSR path).

---

## Concurrency model

- Single-threaded (browser main thread). No race conditions within a tab.
- Cross-tab race: tab A and tab B both toggle within the same millisecond. Result: each tab's local toggle wins for itself; the storage events arrive in the OTHER tab; one of the values "wins" deterministically by the order of `localStorage` write completion (which the browser serialises). Acceptable.

---

## Test contract

The service's test file `sidebar-state.service.spec.ts` MUST cover:

1. **Defaults**: `collapsed=false, mobileOpen=false, hidden=false` immediately after construction.
2. **localStorage round-trip**: After `toggleCollapsed()`, `localStorage.getItem('sidebar:collapsed')` returns `'true'`. A new instance constructed in a fresh test reads it back.
3. **Idempotent setCollapsed**: Setting to current value does NOT call `localStorage.setItem` (assertion via spy).
4. **Storage event sync**: Dispatching a synthetic `StorageEvent` on `window` with `key='sidebar:collapsed'`, `newValue='true'` updates the `collapsed` signal to true.
5. **Storage event filter**: Synthetic `StorageEvent` with a different `key` is ignored.
6. **Storage event no-op on match**: Synthetic event with `newValue` matching current does NOT cause an additional signal emission (verifiable via `effect` spy count).
7. **Graceful degradation**: When `localStorage.setItem` throws (mocked), `toggleCollapsed` still updates the in-memory signal and does NOT propagate the error.
8. **SSR safety**: When `PLATFORM_ID` is `'server'`, constructor does NOT register the storage listener; signals work in-memory only.
9. **mobileOpen ephemerality**: `openMobile()` / `closeMobile()` do NOT touch localStorage.
10. **`canShow` computed**: Returns false when `hidden=true`; true otherwise irrespective of collapsed/mobileOpen.

Total expected: ≥ 10 unit tests; coverage ≥ 95 % statements.

---

## Consumer contract (for wrapper layouts)

Layouts inject the service and react to its signals:

```ts
@Component({ ... })
export class StudentLayoutSimpleComponent {
  protected sidebarState = inject(SidebarStateService);
  // Template reads: sidebarState.collapsed(), sidebarState.mobileOpen(), sidebarState.hidden()
  // Template writes (event handlers): sidebarState.toggleCollapsed(), sidebarState.openMobile(), etc.
  // Route-aware effect: effect(() => { sidebarState.setHidden(this.shouldHide()); })
}
```

Layouts MUST NOT:
- Maintain their own local sidebar state signals (the duplication this service eliminates).
- Read or write to legacy localStorage keys (`student_sidebar_collapsed`, etc.) — those are removed.
- Bypass the service to write `sidebar:collapsed` directly.
