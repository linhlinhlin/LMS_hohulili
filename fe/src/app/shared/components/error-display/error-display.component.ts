import { Component, signal, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErrorHandlingService, AppError } from '../../services/error-handling.service';

@Component({
  selector: 'app-error-display',
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
    <!-- Error Container -->
    <div class="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      @for (error of errorService.errors(); track error.id) {
        <div class="bg-white rounded-lg shadow-lg border-l-4 p-4 transition-all duration-300 transform"
             [class]="getErrorClass(error.type)"
             [class.border-red-500]="error.type === 'error'"
             [class.border-yellow-500]="error.type === 'warning'"
             [class.border-blue-500]="error.type === 'info'">
          
          <!-- Error Header -->
          <div class="flex items-start justify-between">
            <div class="flex items-start space-x-3">
              <!-- Error Icon -->
              <div class="flex-shrink-0">
                @if (error.type === 'error') {
                  <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 1.414l2-2a1 1 0 00-1.414-1.414L8.707 7.293z" clip-rule="evenodd"></path>
                  </svg>
                } @else if (error.type === 'warning') {
                  <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                  </svg>
                } @else {
                  <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                  </svg>
                }
              </div>
              
              <!-- Error Content -->
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-medium text-gray-900">
                  {{ getErrorTitle(error.type) }}
                </h4>
                <p class="text-sm text-gray-600 mt-1">{{ error.message }}</p>
                
                @if (error.context) {
                  <p class="text-xs text-gray-500 mt-1">Context: {{ error.context }}</p>
                }
                
                <p class="text-xs text-gray-400 mt-1">
                  {{ formatTime(error.timestamp) }}
                </p>
              </div>
            </div>
            
            <!-- Close Button -->
            <button (click)="removeError(error.id)"
                    class="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
              </svg>
            </button>
          </div>
          
          <!-- Action Button -->
          @if (error.action) {
            <div class="mt-3 flex justify-end">
              <button (click)="error.action!.handler()"
                      class="px-3 py-1 text-xs font-medium rounded-md transition-colors"
                      [class]="getActionClass(error.type)">
                {{ error.action.label }}
              </button>
            </div>
          }
        </div>
      }
    </div>

    <!-- Loading Overlay -->
    @if (errorService.isLoading()) {
      <div class="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 shadow-lg">
          <div class="flex items-center space-x-3">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span class="text-gray-700">Đang tải...</span>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorDisplayComponent {
  protected errorService = inject(ErrorHandlingService);

  removeError(errorId: string): void {
    this.errorService.removeError(errorId);
  }

  getErrorClass(type: string): string {
    switch (type) {
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      case 'info':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  }

  getErrorTitle(type: string): string {
    switch (type) {
      case 'error':
        return 'Lỗi';
      case 'warning':
        return 'Cảnh báo';
      case 'info':
        return 'Thông báo';
      default:
        return 'Thông báo';
    }
  }

  getActionClass(type: string): string {
    switch (type) {
      case 'error':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) {
      return `${seconds} giây trước`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} phút trước`;
    } else {
      return timestamp.toLocaleTimeString('vi-VN');
    }
  }
}