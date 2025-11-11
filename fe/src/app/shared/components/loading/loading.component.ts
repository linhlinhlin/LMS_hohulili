import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Loading Component - Reusable loading indicator
 * Supports different sizes, custom messages, and overlay variant
 */
@Component({
  selector: 'app-loading',
  imports: [CommonModule],
  template: `
    <div *ngIf="show" [class]="getContainerClasses()">
      <div *ngIf="variant === 'overlay'" class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50 flex items-center justify-center">
        <div class="flex items-center space-x-2 bg-white p-6 rounded-lg shadow-xl">
          <div
            class="animate-spin rounded-full border-2 border-t-transparent"
            [class]="getSizeClasses() + ' ' + getColorClasses()"
          ></div>
          <span class="text-gray-600" *ngIf="message">{{ message }}</span>
          <span class="text-gray-600" *ngIf="subtext" class="block text-sm mt-1">{{ subtext }}</span>
        </div>
      </div>
      <div *ngIf="variant !== 'overlay'" class="flex items-center justify-center p-8">
        <div class="flex items-center space-x-2">
          <div
            class="animate-spin rounded-full border-2 border-t-transparent"
            [class]="getSizeClasses() + ' ' + getColorClasses()"
          ></div>
          <span class="text-gray-600" *ngIf="message">{{ message }}</span>
        </div>
      </div>
    </div>
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
  @Input() show = true;
  @Input() message = 'Đang tải...';
  @Input() subtext = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() variant: 'normal' | 'overlay' = 'normal';
  @Input() color: 'blue' | 'red' | 'purple' = 'blue';

  getContainerClasses(): string {
    return this.variant === 'overlay' ? '' : 'flex items-center justify-center p-8';
  }

  getSizeClasses(): string {
    switch (this.size) {
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
    switch (this.color) {
      case 'red':
        return 'border-red-500';
      case 'purple':
        return 'border-purple-500';
      case 'blue':
      default:
        return 'border-blue-500';
    }
  }
}