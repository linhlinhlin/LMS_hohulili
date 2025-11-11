import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'text';
type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [class]="buttonClasses()"
      (click)="handleClick($event)">
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    @import '../../../../../styles/variables';

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: $spacing-2;
      font-family: $font-family-primary;
      font-weight: $font-semibold;
      border-radius: $radius-sm;
      border: none;
      cursor: pointer;
      transition: all $transition-fast;
      white-space: nowrap;
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:not(:disabled):active {
        transform: translateY(1px);
      }

      @include focus-visible;
    }

    /* Sizes */
    .btn-sm {
      padding: $spacing-2 $spacing-3;
      font-size: $text-sm;
      height: $btn-height-sm;
    }

    .btn-md {
      padding: $spacing-2 $spacing-4;
      font-size: $text-sm;
      height: $btn-height-md;
    }

    .btn-lg {
      padding: $spacing-3 $spacing-6;
      font-size: $text-base;
      height: $btn-height-lg;
    }

    /* Variants */
    .btn-primary {
      background: $blue-primary;
      color: $text-inverse;

      &:not(:disabled):hover {
        background: $blue-hover;
      }

      &:not(:disabled):active {
        background: $blue-pressed;
      }
    }

    .btn-ghost {
      background: transparent;
      color: $text-secondary;

      &:not(:disabled):hover {
        background: $bg-hover;
        color: $text-primary;
      }
    }

    .btn-outline {
      background: transparent;
      color: $blue-primary;
      border: 1px solid $border-default;

      &:not(:disabled):hover {
        background: $blue-light;
        border-color: $blue-primary;
      }
    }

    .btn-text {
      background: transparent;
      color: $blue-primary;
      padding: $spacing-2;

      &:not(:disabled):hover {
        background: $blue-light;
      }
    }

    /* Full width */
    .btn-full {
      width: 100%;
    }
  `]
})
export class ButtonComponent {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input<boolean>(false);
  fullWidth = input<boolean>(false);
  
  clicked = output<MouseEvent>();

  buttonClasses() {
    return [
      'btn',
      `btn-${this.size()}`,
      `btn-${this.variant()}`,
      this.fullWidth() ? 'btn-full' : ''
    ].filter(Boolean).join(' ');
  }

  handleClick(event: MouseEvent) {
    if (!this.disabled()) {
      this.clicked.emit(event);
    }
  }
}
