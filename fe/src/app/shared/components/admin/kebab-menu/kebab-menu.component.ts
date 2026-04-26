import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
  effect,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * One kebab-menu action descriptor.
 *
 * - `key` — stable identifier, used as `track` key in the action @for + emitted
 *   to the parent's `actionClick` handler.
 * - `label` — Vietnamese label rendered inside the menu item.
 * - `icon` — optional inline SVG path data (the `d` attr of a 20×20 `<path>`).
 *   Pass empty / omit to render label-only.
 * - `variant` — `default` keeps the item neutral. `danger` paints it red
 *   (Khóa, Xóa, Từ chối, Thu hồi). Mutually exclusive — exactly one variant.
 * - `disabled` — derived per-render by the caller (e.g. block "Khóa" if the
 *   target is the current user — F-AD2 self-suspend guard mirror).
 * - `ariaLabel` — overrides `label` for SR. Useful when the visible label is
 *   short ("Khóa") but the SR copy needs the target name ("Khóa Nguyễn Văn A").
 */
export type KebabActionVariant = 'default' | 'danger';

export interface KebabAction {
  key: string;
  label: string;
  icon?: string;
  variant?: KebabActionVariant;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * Per-row kebab menu (`⋮`) — the admin portal's row-level overflow action
 * surface. Replaces the inline-edit `<select>` dropdowns + 5–7 icon-button
 * stripes that bloat row height and confuse non-power users.
 *
 * Anatomy: trigger button (`⋮`) → on activation pops a floating menu panel
 * positioned to the bottom-right of the trigger. Each entry is a `<button
 * role="menuitem">`; danger variant turns red.
 *
 * Behaviour:
 * - Open: click trigger, or focus + Enter / Space / ArrowDown.
 * - Navigate: ArrowUp / ArrowDown wraps. Home / End jump to ends.
 * - Select: Enter / Space fires the action then closes.
 * - Dismiss: click outside, Esc, Tab away — focus returns to the trigger.
 *
 * Accessibility (WAI-ARIA Authoring Practices §3.16 — menu button):
 * - Trigger: `aria-haspopup="menu"`, `aria-expanded`, `aria-label`.
 * - Panel: `role="menu"`, each item `role="menuitem"`. `aria-orientation`
 *   defaults to vertical which is what we want.
 * - Touch targets: each item ≥ 44×24 (label) ⨉ 40px tall (touch-friendly).
 * - `:focus-visible` ring honours the design system's primary blue.
 *
 * Positioning: pure CSS via the local stacking context (`position: absolute`
 * on the panel, `position: relative` on the host). Default placement is
 * bottom-right; the panel uses `right: 0` so it tucks under the trigger
 * without overflowing the table's right edge. For a single-action surface
 * the menu naturally compresses.
 *
 * Usage:
 * ```html
 * <app-kebab-menu
 *   [actions]="actionsFor(user)"
 *   triggerAriaLabel="Mở menu thao tác cho {{ user.name }}"
 *   (actionClick)="onRowAction(user, $event)" />
 * ```
 */
@Component({
  selector: 'app-kebab-menu',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kebab-menu.component.html',
  styleUrl: './kebab-menu.component.scss',
})
export class KebabMenuComponent {
  private host = inject(ElementRef<HTMLElement>);
  private platformId = inject(PLATFORM_ID);

  // Ordered list of menu items rendered in the panel. Order = render order
  // (top → bottom).
  actions = input.required<KebabAction[]>();

  // SR label for the trigger. Falls back to a generic Vietnamese label.
  triggerAriaLabel = input<string>('Mở menu thao tác');

  // SR label for the menu panel. Defaults to "Thao tác".
  menuAriaLabel = input<string>('Thao tác');

  // Optional disabled state for the trigger (e.g. row has no actions). When
  // true the kebab still renders but is non-interactive — preserves layout
  // alignment with rows that do have a working menu.
  disabled = input<boolean>(false);

  // Emitted with the action's `key` when its menuitem is activated. Caller
  // dispatches by key and runs the per-action handler (modal, API, toast).
  actionClick = output<string>();

  // Open / close state. Public-readonly via computed below — direct mutation
  // happens only via toggle / open / close to keep the focus-management story
  // local to this component.
  private _isOpen = signal(false);
  isOpen = computed(() => this._isOpen());

  // Index of the active (visually highlighted) menuitem during keyboard
  // navigation. -1 when no item is highlighted (mouse hover takes over via
  // `:hover` then). Reset on close.
  activeIndex = signal(-1);

  // Refs needed for focus restoration.
  triggerRef = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  panelRef = viewChild<ElementRef<HTMLDivElement>>('panel');

  constructor() {
    // When the panel opens, schedule focus to land on the active item (or
    // first item if none is active). Done in an effect so we react to both
    // initial open and re-open without bespoke wiring.
    effect(() => {
      if (!this._isOpen()) return;
      if (!isPlatformBrowser(this.platformId)) return;

      // Defer to next tick so the @if-rendered panel is in the DOM.
      queueMicrotask(() => {
        const panel = this.panelRef()?.nativeElement;
        if (!panel) return;
        const items = this.menuItems();
        const idx = this.activeIndex();
        const target = idx >= 0 && idx < items.length ? items[idx] : items[0];
        target?.focus();
      });
    });
  }

  // ----- Trigger handlers -----

  toggle(): void {
    if (this.disabled()) return;
    if (this._isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open(initialIndex = 0): void {
    if (this.disabled()) return;
    if (this._isOpen()) return;
    // Skip past disabled items at the front so the focus ring lands somewhere
    // useful.
    const acts = this.actions();
    let idx = initialIndex;
    while (idx < acts.length && acts[idx]?.disabled) idx++;
    if (idx >= acts.length) idx = -1;
    this.activeIndex.set(idx);
    this._isOpen.set(true);
  }

  close(restoreFocus = true): void {
    if (!this._isOpen()) return;
    this._isOpen.set(false);
    this.activeIndex.set(-1);
    if (restoreFocus) {
      // Microtask so the panel teardown isn't fighting the focus call.
      queueMicrotask(() => this.triggerRef()?.nativeElement.focus());
    }
  }

  onTriggerClick(event: MouseEvent): void {
    event.stopPropagation();
    this.toggle();
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        this.open(0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.open(this.actions().length - 1);
        break;
      case 'Escape':
        if (this._isOpen()) {
          event.preventDefault();
          this.close();
        }
        break;
    }
  }

  // ----- Menu item handlers -----

  onItemClick(action: KebabAction, event: MouseEvent): void {
    event.stopPropagation();
    if (action.disabled) return;
    this.actionClick.emit(action.key);
    this.close();
  }

  onItemKeydown(event: KeyboardEvent, index: number): void {
    const items = this.actions();
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const next = this.findNextEnabled(index, 1);
        if (next !== -1) this.focusItem(next);
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prev = this.findNextEnabled(index, -1);
        if (prev !== -1) this.focusItem(prev);
        break;
      }
      case 'Home': {
        event.preventDefault();
        const first = this.findNextEnabled(-1, 1);
        if (first !== -1) this.focusItem(first);
        break;
      }
      case 'End': {
        event.preventDefault();
        const last = this.findNextEnabled(items.length, -1);
        if (last !== -1) this.focusItem(last);
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const action = items[index];
        if (action && !action.disabled) {
          this.actionClick.emit(action.key);
          this.close();
        }
        break;
      }
      case 'Escape': {
        event.preventDefault();
        this.close();
        break;
      }
      case 'Tab':
        // Tabbing out of the panel closes — focus naturally moves on; we do
        // NOT restore focus to the trigger because the user's intent was to
        // leave the menu surface entirely.
        this.close(false);
        break;
    }
  }

  // ----- Outside-click + escape global handlers -----

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this._isOpen()) return;
    const target = event.target as Node | null;
    if (target && this.host.nativeElement.contains(target)) return;
    // Outside click — close without restoring focus (the user clicked
    // somewhere else on purpose; stealing focus back would be surprising).
    this.close(false);
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    if (this._isOpen()) this.close();
  }

  // ----- Helpers -----

  /** Find the next non-disabled item index in `direction` (+1 or -1). */
  private findNextEnabled(from: number, direction: 1 | -1): number {
    const items = this.actions();
    const len = items.length;
    if (len === 0) return -1;

    // Wrap-around: "next from last" → first; "prev from first" → last.
    let idx = from + direction;
    let safety = len;
    while (safety-- > 0) {
      if (idx < 0) idx = len - 1;
      else if (idx >= len) idx = 0;
      if (!items[idx]?.disabled) return idx;
      idx += direction;
    }
    return -1;
  }

  private menuItems(): HTMLButtonElement[] {
    const panel = this.panelRef()?.nativeElement;
    if (!panel) return [];
    return Array.from(
      panel.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')
    );
  }

  private focusItem(index: number): void {
    this.activeIndex.set(index);
    const items = this.menuItems();
    items[index]?.focus();
  }
}
