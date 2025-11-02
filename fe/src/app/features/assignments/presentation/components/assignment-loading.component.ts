import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Assignment Loading Component
 * Provides loading states for assignment lists and individual assignments
 * Supports different variants and customization options
 */
@Component({
  selector: 'app-assignment-loading',
  imports: [CommonModule],
  template: `
    <!-- List Loading -->
    @if (variant() === 'list') {
      <div class="space-y-4">
        @for (item of loadingItems(); track $index) {
          <div class="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div class="flex items-start space-x-4">
              <!-- Selection checkbox skeleton -->
              @if (showSelection()) {
                <div class="w-4 h-4 bg-gray-200 rounded mt-1"></div>
              }

              <div class="flex-1 min-w-0">
                <!-- Header skeleton -->
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1">
                    <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  </div>
                  <div class="w-16 h-6 bg-gray-200 rounded-full"></div>
                </div>

                <!-- Description skeleton -->
                <div class="space-y-2 mb-4">
                  <div class="h-4 bg-gray-200 rounded w-full"></div>
                  <div class="h-4 bg-gray-200 rounded w-4/5"></div>
                </div>

                <!-- Progress bar skeleton -->
                @if (showProgress()) {
                  <div class="mb-4">
                    <div class="h-2 bg-gray-200 rounded w-full mb-2"></div>
                  </div>
                }

                <!-- Metadata skeleton -->
                <div class="flex items-center justify-between text-sm mb-4">
                  <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-1">
                      <div class="w-4 h-4 bg-gray-200 rounded"></div>
                      <div class="w-16 h-4 bg-gray-200 rounded"></div>
                    </div>
                    <div class="flex items-center space-x-1">
                      <div class="w-4 h-4 bg-gray-200 rounded"></div>
                      <div class="w-12 h-4 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div class="w-12 h-4 bg-gray-200 rounded"></div>
                </div>

                <!-- Action buttons skeleton -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <div class="w-20 h-8 bg-gray-200 rounded"></div>
                    <div class="w-16 h-8 bg-gray-200 rounded"></div>
                  </div>
                  <div class="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    }

    <!-- Grid Loading -->
    @if (variant() === 'grid') {
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (item of loadingItems(); track $index) {
          <div class="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
            <!-- Selection checkbox skeleton -->
            @if (showSelection()) {
              <div class="absolute top-3 right-3 w-4 h-4 bg-gray-200 rounded"></div>
            }

            <div class="p-6">
              <!-- Header skeleton -->
              <div class="mb-4">
                <div class="flex items-start justify-between mb-2">
                  <div class="w-16 h-6 bg-gray-200 rounded-full"></div>
                  <div class="w-12 h-6 bg-gray-200 rounded-full"></div>
                </div>

                <div class="h-6 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              </div>

              <!-- Progress skeleton -->
              @if (showProgress()) {
                <div class="mb-4">
                  <div class="h-2 bg-gray-200 rounded w-full mb-2"></div>
                </div>
              }

              <!-- Due date skeleton -->
              <div class="mb-4">
                <div class="flex items-center space-x-1">
                  <div class="w-4 h-4 bg-gray-200 rounded"></div>
                  <div class="w-20 h-4 bg-gray-200 rounded"></div>
                </div>
              </div>

              <!-- Status skeleton -->
              <div class="mb-4">
                <div class="flex items-center space-x-1">
                  <div class="w-4 h-4 bg-gray-200 rounded"></div>
                  <div class="w-16 h-4 bg-gray-200 rounded"></div>
                </div>
              </div>

              <!-- Actions skeleton -->
              <div class="flex items-center justify-between pt-4 border-t border-gray-100">
                <div class="w-20 h-8 bg-gray-200 rounded"></div>
                <div class="flex items-center space-x-1">
                  <div class="w-16 h-8 bg-gray-200 rounded"></div>
                  <div class="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    }

    <!-- Card Loading -->
    @if (variant() === 'card') {
      <div class="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div class="space-y-4">
          <!-- Title skeleton -->
          <div class="h-6 bg-gray-200 rounded w-3/4"></div>

          <!-- Description skeleton -->
          <div class="space-y-2">
            <div class="h-4 bg-gray-200 rounded w-full"></div>
            <div class="h-4 bg-gray-200 rounded w-5/6"></div>
            <div class="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>

          <!-- Progress skeleton -->
          @if (showProgress()) {
            <div class="h-2 bg-gray-200 rounded w-full"></div>
          }

          <!-- Metadata skeleton -->
          <div class="flex justify-between items-center">
            <div class="flex space-x-4">
              <div class="h-4 bg-gray-200 rounded w-16"></div>
              <div class="h-4 bg-gray-200 rounded w-12"></div>
            </div>
            <div class="h-6 bg-gray-200 rounded w-16"></div>
          </div>

          <!-- Actions skeleton -->
          <div class="flex justify-end space-x-2">
            <div class="h-8 bg-gray-200 rounded w-20"></div>
            <div class="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </div>
    }

    <!-- Overlay Loading -->
    @if (variant() === 'overlay') {
      <div class="fixed inset-0 bg-black bg-opacity-25 z-50 flex items-center justify-center">
        <div class="bg-white rounded-xl p-6 shadow-xl flex items-center space-x-4">
          <svg class="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div>
            <p class="font-medium text-gray-900">{{ message() }}</p>
            @if (subtext()) {
              <p class="text-sm text-gray-600">{{ subtext() }}</p>
            }
          </div>
        </div>
      </div>
    }

    <!-- Inline Loading -->
    @if (variant() === 'inline') {
      <div class="flex items-center justify-center p-8">
        <div class="flex items-center space-x-3">
          <svg class="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div>
            <p class="text-sm font-medium text-gray-900">{{ message() }}</p>
            @if (subtext()) {
              <p class="text-xs text-gray-600">{{ subtext() }}</p>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: .5;
      }
    }

    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
  `]
})
export class AssignmentLoadingComponent {
  // ========================================
  // INPUTS
  // ========================================

  variant = input<'list' | 'grid' | 'card' | 'overlay' | 'inline'>('list');
  count = input<number>(3);
  showSelection = input<boolean>(false);
  showProgress = input<boolean>(true);
  message = input<string>('Đang tải...');
  subtext = input<string>('');

  // ========================================
  // COMPUTED PROPERTIES
  // ========================================

  loadingItems = computed(() => {
    return Array.from({ length: this.count() }, (_, i) => i);
  });
}