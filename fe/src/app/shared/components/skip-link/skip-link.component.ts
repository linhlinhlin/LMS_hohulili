import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * "Bỏ qua điều hướng" skip link — WCAG 2.4.1 Bypass Blocks (Level A).
 *
 * Visually hidden by default; appears when keyboard focus lands on it
 * (typically the first Tab press after page load). Activating it jumps
 * focus to the host page's main content landmark.
 *
 * Hosting layouts MUST render this as the first focusable element in the
 * DOM and ensure their main content area has matching `id` (default
 * `main-content`) and `tabindex="-1"` so the anchor can move focus there.
 *
 * Usage in a wrapper layout:
 *   <app-skip-link/>
 *   ...layout chrome...
 *   <main id="main-content" tabindex="-1">
 *     <router-outlet/>
 *   </main>
 */
@Component({
  selector: 'app-skip-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [href]="'#' + targetId()" class="skip-link">{{ label() }}</a>
  `,
  styles: [`
    .skip-link {
      position: absolute;
      top: -100px;
      left: 8px;
      z-index: 100;
      padding: 0.5rem 1rem;
      background: #0056D2;
      color: white;
      font-weight: 600;
      border-radius: 0.5rem;
      text-decoration: none;
      transition: top 0.15s ease;
    }
    .skip-link:focus,
    .skip-link:focus-visible {
      top: 8px;
      outline: 2px solid white;
      outline-offset: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      .skip-link { transition: none; }
    }
  `],
})
export class SkipLinkComponent {
  /** ID of the main-content landmark to jump to. Default 'main-content'. */
  readonly targetId = input<string>('main-content');
  /** Visible label. Vietnamese with diacritics per Constitution V. */
  readonly label = input<string>('Bỏ qua điều hướng');
}
