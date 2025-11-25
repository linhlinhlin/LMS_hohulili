import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';
type BadgeSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="badgeClasses()">
      <ng-content></ng-content>
    </span>
  `,
  styles: [`
    @import '../../../../../styles/variables';

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: $font-family-primary;
      font-weight: $font-semibold;
      border-radius: $radius-full;
      white-space: nowrap;
      line-height: 1;
    }

    /* Sizes */
    .badge-sm {
      padding: 2px 8px;
      font-size: $text-xs;
      height: 20px;
    }

    .badge-md {
      padding: 4px 12px;
      font-size: $text-sm;
      height: 24px;
    }

    .badge-lg {
      padding: 6px 16px;
      font-size: $text-base;
      height: 32px;
    }

    /* Variants */
    .badge-success {
      background: $success-light;
      color: $success;
    }

    .badge-warning {
      background: $warning-light;
      color: $warning;
    }

    .badge-error {
      background: $error-light;
      color: $error;
    }

    .badge-info {
      background: $info-light;
      color: $info;
    }

    .badge-default {
      background: $gray-100;
      color: $gray-700;
    }

    /* Dot variant */
    .badge-dot {
      padding-left: 20px;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 6px;
        height: 6px;
        border-radius: $radius-full;
        background: currentColor;
      }
    }
  `]
})
export class BadgeComponent {
  variant = input<BadgeVariant>('default');
  size = input<BadgeSize>('md');
  dot = input<boolean>(false);

  badgeClasses() {
    return [
      'badge',
      `badge-${this.size()}`,
      `badge-${this.variant()}`,
      this.dot() ? 'badge-dot' : ''
    ].filter(Boolean).join(' ');
  }
}
