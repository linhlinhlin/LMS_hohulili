import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';

/**
 * One bulk action descriptor. The handler is intentionally synchronous (or
 * fires its own async work) — the bar does not wait for resolution. Callers
 * own the modal/confirm flow per action.
 *
 * - `key` — stable identifier, used as `track` key in the action @for.
 * - `icon` — optional inline SVG path data (the `d` attr of the `<path>`).
 *   Pass empty string to omit the icon glyph.
 * - `variant` — `default` keeps the action neutral. `danger` paints it red
 *   (Khóa, Reject, Delete). Mutually exclusive — exactly one variant.
 * - `disabled` — derived per-render by the caller (e.g. block "Khóa" if the
 *   selection contains the current user — F-AD2 self-suspend guard).
 */
export type BulkActionVariant = 'default' | 'danger';

export interface BulkAction {
  key: string;
  label: string;
  icon?: string;
  variant?: BulkActionVariant;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * Sticky bottom bulk action bar (Linear / GitHub / Stripe pattern). Slides
 * up from the bottom of the viewport when the parent component has at least
 * one item selected; collapses when selection is cleared.
 *
 * Anatomy: `[N selected | Action 1 | Action 2 | ... | Bỏ chọn]`.
 *
 * Accessibility:
 * - `role="region"` + `aria-live="polite"` so screen readers announce the
 *   selection count change without stealing focus from the table.
 * - Each action button forwards `aria-label` (falls back to `label`).
 * - Bar is hidden via `display: none` when `selectedCount === 0`, so it does
 *   not capture keyboard focus when collapsed.
 *
 * Mobile (< 640px):
 * - Bottom-sheet style: full-width pill, actions wrap onto a second line if
 *   needed; "Bỏ chọn" stays visible.
 *
 * Usage:
 * ```html
 * <app-bulk-action-bar
 *   [selectedCount]="selectedCount()"
 *   [actions]="bulkActions()"
 *   (actionClick)="onBulkAction($event)"
 *   (clear)="clearSelection()" />
 * ```
 */
@Component({
  selector: 'app-bulk-action-bar',
  imports: [],
  templateUrl: './bulk-action-bar.component.html',
  styleUrl: './bulk-action-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkActionBarComponent {
  // Number of selected items. Bar is visible iff > 0.
  selectedCount = input.required<number>();

  // Action descriptors. Order = render order (left → right).
  actions = input.required<BulkAction[]>();

  // Vietnamese label rendered before the action buttons. The component
  // formats the count itself; caller passes singular/plural noun via this
  // prop (e.g. "đã chọn" → "{N} đã chọn"). Falls back to "đã chọn".
  countLabel = input<string>('đã chọn');

  // Custom Vietnamese label for the trailing clear button.
  clearLabel = input<string>('Bỏ chọn');

  // Emitted with the action's `key` when its button is clicked. Caller
  // dispatches by key and runs the per-action handler (modal, API, toast).
  actionClick = output<string>();

  // Emitted when the trailing clear button is clicked.
  clear = output<void>();

  // Visibility — Bar collapses entirely when nothing is selected. We render
  // the host element conditionally (parent's @if) OR keep it mounted with
  // `aria-hidden`. Here we render unconditionally and toggle a class so the
  // slide-up transition runs naturally on selection change.
  isVisible = computed(() => this.selectedCount() > 0);

  onAction(action: BulkAction): void {
    if (action.disabled) return;
    this.actionClick.emit(action.key);
  }

  onClear(): void {
    this.clear.emit();
  }
}
