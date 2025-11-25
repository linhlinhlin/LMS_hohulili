import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-container">
      @if (showLabel()) {
        <div class="progress-label">
          <span class="progress-text">{{ label() }}</span>
          <span class="progress-percentage">{{ progress() }}%</span>
        </div>
      }
      <div 
        class="progress-bar"
        [class.progress-thin]="thin()"
        role="progressbar"
        [attr.aria-valuenow]="progress()"
        [attr.aria-valuemin]="0"
        [attr.aria-valuemax]="100"
        [attr.aria-label]="ariaLabel()">
        <div 
          class="progress-fill"
          [style.width.%]="clampedProgress()">
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import '../../../../../styles/variables';

    .progress-container {
      width: 100%;
    }

    .progress-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $spacing-2;
      font-size: $text-sm;
    }

    .progress-text {
      color: $text-secondary;
      font-weight: $font-medium;
    }

    .progress-percentage {
      color: $text-primary;
      font-weight: $font-semibold;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: $progress-bg;
      border-radius: $radius-full;
      overflow: hidden;
      position: relative;
    }

    .progress-thin {
      height: $progress-height; // 4px - Coursera style
    }

    .progress-fill {
      height: 100%;
      background: $progress-fill;
      border-radius: $radius-full;
      transition: width $transition-normal;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.3) 50%,
          rgba(255, 255, 255, 0) 100%
        );
        animation: shimmer 2s infinite;
      }
    }

    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }

    /* Color variants */
    .progress-success .progress-fill {
      background: $success;
    }

    .progress-warning .progress-fill {
      background: $warning;
    }

    .progress-error .progress-fill {
      background: $error;
    }
  `]
})
export class ProgressBarComponent {
  progress = input.required<number>();
  label = input<string>('');
  showLabel = input<boolean>(false);
  thin = input<boolean>(true); // Coursera style - thin by default
  ariaLabel = input<string>('Progress');

  // Ensure progress is between 0 and 100
  clampedProgress = computed(() => {
    const value = this.progress();
    return Math.min(Math.max(value, 0), 100);
  });
}
