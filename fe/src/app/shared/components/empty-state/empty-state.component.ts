import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Shared empty-state primitive — icon + title + optional description + optional CTA.
 *
 * Replaces ad-hoc "Không tìm thấy / Chưa có..." markup scattered across the app.
 * Use for: empty lists (no courses, no announcements), no-search-results, initial blank states.
 *
 * ## Icon
 * Render your own SVG inside the `icon` slot — this component doesn't prescribe
 * an icon library. That way callers keep matching their surrounding iconography.
 *
 * ## Action
 * Provide `actionLabel` and subscribe to `(actionClick)` for a primary CTA.
 * Omit `actionLabel` for a pure informational empty state.
 *
 * ## Variants
 * - `default` — list/page empty state (padding 3rem)
 * - `compact` — inside cards or small panels (padding 1.5rem)
 *
 * @example
 * ```html
 * <app-empty-state
 *   title="Chưa có thông báo nào"
 *   description="Tạo thông báo đầu tiên để gửi tới sinh viên."
 *   actionLabel="Tạo thông báo"
 *   (actionClick)="openCreateForm()">
 *   <svg icon ...></svg>
 * </app-empty-state>
 * ```
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state" [class.empty-state--compact]="variant() === 'compact'">
      <div class="empty-state__icon" aria-hidden="true">
        <ng-content select="[icon]"></ng-content>
      </div>
      <h3 class="empty-state__title">{{ title() }}</h3>
      @if (description()) {
        <p class="empty-state__description">{{ description() }}</p>
      }
      @if (actionLabel()) {
        <button type="button"
                class="empty-state__action"
                (click)="actionClick.emit()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1.5rem;
      text-align: center;
    }

    .empty-state--compact {
      padding: 1.5rem 1rem;
    }

    .empty-state__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      color: rgb(203 213 225); /* slate-300 */
    }

    .empty-state__icon ::ng-deep svg {
      width: 4rem;
      height: 4rem;
    }

    .empty-state--compact .empty-state__icon ::ng-deep svg {
      width: 3rem;
      height: 3rem;
    }

    .empty-state__title {
      margin: 0 0 0.25rem;
      font-size: 1.125rem;
      font-weight: 600;
      color: rgb(15 23 42); /* slate-900 */
    }

    .empty-state--compact .empty-state__title {
      font-size: 1rem;
    }

    .empty-state__description {
      margin: 0 0 1rem;
      font-size: 0.875rem;
      color: rgb(100 116 139); /* slate-500 */
      max-width: 32rem;
      line-height: 1.5;
    }

    .empty-state__action {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #ffffff;
      background: #0056D2;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background-color 150ms ease;

      &:hover {
        background: #004BB5;
      }

      &:focus-visible {
        outline: 2px solid #0056D2;
        outline-offset: 2px;
      }
    }
  `]
})
export class EmptyStateComponent {
  /** Main heading — required. */
  readonly title = input.required<string>();
  /** Optional supporting sentence below the title. */
  readonly description = input<string>('');
  /** Label for the primary action button. Omit to hide the button. */
  readonly actionLabel = input<string>('');
  /** Layout variant — `compact` for in-card usage, `default` for full-page empties. */
  readonly variant = input<'default' | 'compact'>('default');
  /** Fires when the user clicks the primary action. */
  readonly actionClick = output<void>();
}
