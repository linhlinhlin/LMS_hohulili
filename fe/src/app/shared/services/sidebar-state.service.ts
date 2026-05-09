import {
  Injectable,
  PLATFORM_ID,
  Signal,
  WritableSignal,
  computed,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SIDEBAR_STORAGE_KEY } from '../components/navigation/sidebar.tokens';

/**
 * Single source of truth for sidebar runtime state across all 4 role layouts.
 *
 * - `collapsed` — desktop expanded (256px) vs icon-rail (64px); persisted.
 * - `mobileOpen` — mobile drawer visible; ephemeral per tab.
 * - `hidden` — sidebar fully suppressed (full-bleed routes); ephemeral.
 *
 * SSR-safe: localStorage + storage listener registration deferred to afterNextRender.
 * Cross-tab sync: window.storage event keeps every tab in sync without reload.
 *
 * Contract: see specs/001-sidebar-redesign/contracts/sidebar-state-service.md
 */
@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _collapsed: WritableSignal<boolean> = signal(false);
  private readonly _mobileOpen: WritableSignal<boolean> = signal(false);
  private readonly _hidden: WritableSignal<boolean> = signal(false);

  readonly collapsed: Signal<boolean> = this._collapsed.asReadonly();
  readonly mobileOpen: Signal<boolean> = this._mobileOpen.asReadonly();
  readonly hidden: Signal<boolean> = this._hidden.asReadonly();
  readonly canShow: Signal<boolean> = computed(() => !this._hidden());

  private storageListener: ((e: StorageEvent) => void) | null = null;

  constructor() {
    // SSR-safe: isPlatformBrowser gate skips both branches on server. localStorage
    // does not depend on DOM, so we can hydrate + register listener synchronously
    // in the browser without waiting for first render.
    if (isPlatformBrowser(this.platformId)) {
      this.hydrateFromStorage();
      this.registerStorageListener();
    }

    this.destroyRef.onDestroy(() => this.unregisterStorageListener());
  }

  toggleCollapsed(): void {
    this.setCollapsed(!this._collapsed());
  }

  setCollapsed(value: boolean): void {
    if (this._collapsed() === value) {
      return; // idempotent — no write, no broadcast
    }
    this._collapsed.set(value);
    this.persistCollapsed(value);
  }

  openMobile(): void {
    this._mobileOpen.set(true);
  }

  closeMobile(): void {
    this._mobileOpen.set(false);
  }

  setHidden(value: boolean): void {
    this._hidden.set(value);
  }

  private hydrateFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (raw === null) return;
      this._collapsed.set(raw === 'true');
    } catch {
      // localStorage unavailable (incognito quota, security policy) → silent fallback
    }
  }

  private persistCollapsed(value: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
    } catch {
      // Quota exceeded or denied → in-memory state still works for this session
    }
  }

  private registerStorageListener(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.storageListener = (e: StorageEvent) => {
      if (e.key !== SIDEBAR_STORAGE_KEY) return;
      if (e.newValue === null) return; // key deleted — keep current
      const incoming = e.newValue === 'true';
      if (incoming === this._collapsed()) return; // no-op, prevents feedback loop
      this._collapsed.set(incoming);
    };
    window.addEventListener('storage', this.storageListener);
  }

  private unregisterStorageListener(): void {
    if (this.storageListener && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
  }
}
