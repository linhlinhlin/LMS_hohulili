import { Component, input, ChangeDetectionStrategy } from '@angular/core';


/**
 * Loading Component - Reusable loading indicator
 * Supports different sizes, custom messages, and overlay variant
 * Angular v20+ signal inputs
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-loading',
  imports: [],
  template: `
    @if (show()) {
      <div [class]="getContainerClasses()">
        @if (variant() === 'overlay') {
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50 flex items-center justify-center">
            <div class="flex items-center space-x-2 bg-white p-6 rounded-lg shadow-xl">
              <div
                class="animate-spin rounded-full border-2 border-t-transparent"
                [class]="getSizeClasses() + ' ' + getColorClasses()"
              ></div>
              @if (message()) {
                <span class="text-gray-600">{{ message() }}</span>
              }
              @if (subtext()) {
                <span class="text-gray-600 block text-sm mt-1">{{ subtext() }}</span>
              }
            </div>
          </div>
        } @else {
          <div class="flex items-center justify-center p-8">
            <div class="flex items-center space-x-2">
              <div
                class="animate-spin rounded-full border-2 border-t-transparent"
                [class]="getSizeClasses() + ' ' + getColorClasses()"
              ></div>
              @if (message()) {
                <span class="text-gray-600">{{ message() }}</span>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .animate-spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class LoadingComponent {
  // Signal inputs - Angular v20+
  show = input<boolean>(true);
  message = input<string>('Đang tải...');
  subtext = input<string>('');
  size = input<'sm' | 'md' | 'lg'>('md');
  variant = input<'normal' | 'overlay'>('normal');
  color = input<'blue' | 'red' | 'purple'>('blue');

  getContainerClasses(): string {
    return this.variant() === 'overlay' ? '' : 'flex items-center justify-center p-8';
  }

  getSizeClasses(): string {
    switch (this.size()) {
      case 'sm':
        return 'h-4 w-4';
      case 'lg':
        return 'h-8 w-8';
      case 'md':
      default:
        return 'h-6 w-6';
    }
  }

  getColorClasses(): string {
    switch (this.color()) {
      case 'red':
        return 'border-red-500';
      case 'purple':
        return 'border-purple-500';
      case 'blue':
      default:
        return 'border-[#0056D2]';
    }
  }
}
