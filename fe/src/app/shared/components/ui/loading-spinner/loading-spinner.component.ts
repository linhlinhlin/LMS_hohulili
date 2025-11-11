import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

type SpinnerSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="containerClasses()">
      <div [class]="spinnerClasses()" role="status" [attr.aria-label]="ariaLabel()">
        <svg class="spinner-svg" viewBox="0 0 50 50">
          <circle
            class="spinner-circle"
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke-width="4">
          </circle>
        </svg>
      </div>
      @if (text()) {
        <p class="spinner-text">{{ text() }}</p>
      }
    </div>
  `,
  styles: [`
    @import '../../../../../styles/variables';

    .spinner-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: $spacing-3;
    }

    .spinner-inline {
      display: inline-flex;
      align-items: center;
      gap: $spacing-2;
    }

    .spinner {
      display: inline-block;
      animation: rotate 1s linear infinite;
    }

    .spinner-svg {
      display: block;
    }

    .spinner-circle {
      stroke: $blue-primary;
      stroke-linecap: round;
      stroke-dasharray: 1, 150;
      stroke-dashoffset: 0;
      animation: dash 1.5s ease-in-out infinite;
    }

    /* Sizes */
    .spinner-sm {
      width: 16px;
      height: 16px;
    }

    .spinner-md {
      width: 24px;
      height: 24px;
    }

    .spinner-lg {
      width: 40px;
      height: 40px;
    }

    .spinner-text {
      margin: 0;
      color: $text-secondary;
      font-size: $text-sm;
      font-weight: $font-medium;
    }

    @keyframes rotate {
      100% {
        transform: rotate(360deg);
      }
    }

    @keyframes dash {
      0% {
        stroke-dasharray: 1, 150;
        stroke-dashoffset: 0;
      }
      50% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -35;
      }
      100% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -124;
      }
    }

    /* Centered variant */
    .spinner-centered {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: $z-modal;
    }

    /* Overlay variant */
    .spinner-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: $z-modal;
    }
  `]
})
export class LoadingSpinnerComponent {
  size = input<SpinnerSize>('md');
  text = input<string>('');
  centered = input<boolean>(false);
  overlay = input<boolean>(false);
  inline = input<boolean>(false);
  ariaLabel = input<string>('Loading');

  containerClasses() {
    if (this.overlay()) return 'spinner-overlay';
    if (this.centered()) return 'spinner-centered';
    if (this.inline()) return 'spinner-inline';
    return 'spinner-container';
  }

  spinnerClasses() {
    return ['spinner', `spinner-${this.size()}`].join(' ');
  }
}
