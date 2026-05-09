import {
  Directive,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/**
 * Focus trap for modal mobile drawers (and any other modal surface).
 *
 * When the input signal `appFocusTrap` flips to true, the directive:
 *   - Records the currently-focused element as the "return" target.
 *   - Moves focus to the first focusable descendant of the host.
 *   - Intercepts Tab / Shift+Tab to cycle focus only within the host.
 *   - Emits `(escape)` when the user presses Escape, leaving close-on-Esc
 *     to the parent (so it can also handle backdrop / button close).
 *
 * When the input flips back to false (drawer closes), focus returns to
 * the recorded element so keyboard users land where they started.
 *
 * Per spec FR-016 (focus trap mobile drawer) + FR-014 (Escape closes).
 */
@Directive({
  selector: '[appFocusTrap]',
})
export class FocusTrapDirective {
  /** When true, the trap is active. */
  readonly active = input(false, { alias: 'appFocusTrap' });

  /** Emits when the user presses Escape inside the trap. */
  readonly escape = output<void>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);

  private returnFocusEl: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const isActive = this.active();
      if (!isPlatformBrowser(this.platformId)) return;
      if (isActive) {
        this.activate();
      } else {
        this.deactivate();
      }
    });
  }

  @HostListener('keydown.tab', ['$event'])
  onTab(event: KeyboardEvent): void {
    if (!this.active()) return;
    this.cycleFocus(event, /* reverse */ false);
  }

  @HostListener('keydown.shift.tab', ['$event'])
  onShiftTab(event: KeyboardEvent): void {
    if (!this.active()) return;
    this.cycleFocus(event, /* reverse */ true);
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    if (!this.active()) return;
    this.escape.emit();
  }

  private activate(): void {
    this.returnFocusEl = (document.activeElement as HTMLElement | null) ?? null;
    const first = this.firstFocusable();
    if (first) first.focus();
  }

  private deactivate(): void {
    if (this.returnFocusEl && document.contains(this.returnFocusEl)) {
      this.returnFocusEl.focus();
    }
    this.returnFocusEl = null;
  }

  private cycleFocus(event: KeyboardEvent, reverse: boolean): void {
    const focusables = this.allFocusable();
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (reverse && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!reverse && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private firstFocusable(): HTMLElement | null {
    return this.allFocusable()[0] ?? null;
  }

  private allFocusable(): HTMLElement[] {
    const root = this.host.nativeElement as HTMLElement;
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null,
    );
  }
}
