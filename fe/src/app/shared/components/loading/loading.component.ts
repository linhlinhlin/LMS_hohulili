import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Loading Component - Reusable loading indicator
 * Supports different sizes and custom messages
 */
@Component({
  selector: 'app-loading',
  imports: [CommonModule],
  template: `
    <div *ngIf="show" class="flex items-center justify-center p-8">
      <div class="flex items-center space-x-2">
        <div
          class="animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
          [class]="getSizeClasses()"
        ></div>
        <span class="text-gray-600" *ngIf="message">{{ message }}</span>
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
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

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
}