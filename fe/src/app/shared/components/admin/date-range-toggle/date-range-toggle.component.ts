import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';

/**
 * Reusable segmented control for "7 / 30 / 90 ngày" windows on the admin
 * portal — Stripe / Linear pattern (F-P2 in 2026-04-25 mega audit).
 *
 * The dashboard, payouts, and any future analytics surface that needs a
 * temporal window selector share this single source of truth so we don't
 * end up with three slightly different toggles. Backs the windowed
 * analytics endpoint shipped in PR #171
 * (`GET /api/v3/admin/courses/analytics/window?days={7|30|90}`).
 *
 * Anatomy:
 * - 40px tall (WCAG 2.2 SC 2.5.8 desktop target).
 * - role="radiogroup" + per-button role="radio" + aria-checked so screen
 *   readers announce "selected: 7 ngày" rather than three lone buttons.
 * - Keyboard: Tab focuses the strip, Arrow keys move the selection (browser
 *   default for radio in a radiogroup with arrow nav handled here).
 *
 * Usage:
 * ```html
 * <app-date-range-toggle
 *   [value]="windowDays()"
 *   (change)="windowDays.set($event)" />
 * ```
 *
 * Custom options:
 * ```html
 * <app-date-range-toggle [value]="14" [options]="[7, 14, 30]" (change)="..." />
 * ```
 */
@Component({
  selector: 'app-date-range-toggle',
  imports: [],
  templateUrl: './date-range-toggle.component.html',
  styleUrl: './date-range-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateRangeToggleComponent {
  // Currently selected window in days. Required so the parent owns state
  // (signal-up, render-down) — the component does NOT keep its own copy.
  value = input.required<number>();

  // Override the default 7/30/90 set if a surface needs a different
  // cadence (telemetry uses 7/14/30 for example). Defaulted via fallback
  // because Angular's input() does not support a default for a typed
  // array literal cleanly.
  options = input<readonly number[]>([7, 30, 90]);

  // Optional aria-label override for surfaces where "Khoảng thời gian"
  // is too generic (e.g. multiple toggles on one page). Defaults to the
  // generic label.
  ariaLabel = input<string>('Khoảng thời gian');

  // Emits whenever the user picks a different window. Identical semantics
  // to a native radio change — no event when the user clicks the already
  // selected button.
  readonly change = output<number>();

  // Pre-formatted label "{N} ngày" — keeps the template lean.
  buttons = computed(() =>
    this.options().map((days) => ({ days, label: `${days} ngày` })),
  );

  onSelect(days: number): void {
    if (days === this.value()) {
      // No-op: emit only when the value actually changes. Mirrors native
      // radio semantics and prevents redundant analytics fetches.
      return;
    }
    this.change.emit(days);
  }

  /**
   * Arrow-key navigation within the strip. Mirrors the WAI-ARIA radiogroup
   * pattern: Left/Up moves to previous, Right/Down moves to next, Home/End
   * jump to first/last. We update by emitting `change` so the parent
   * remains the source of truth (signal-up, render-down).
   */
  onKeydown(event: KeyboardEvent): void {
    const opts = this.options();
    const current = opts.indexOf(this.value());
    if (current === -1) return;

    let nextIdx = current;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIdx = (current + 1) % opts.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIdx = (current - 1 + opts.length) % opts.length;
        break;
      case 'Home':
        nextIdx = 0;
        break;
      case 'End':
        nextIdx = opts.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.change.emit(opts[nextIdx]);
  }
}
