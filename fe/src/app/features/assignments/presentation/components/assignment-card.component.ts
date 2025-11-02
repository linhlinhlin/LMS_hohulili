import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AssignmentView } from '../../application/use-cases/get-student-assignments.use-case';

/**
 * Assignment Card Component
 * Displays assignment information in both list and grid layouts
 * Follows Angular 20 patterns with standalone components and signals
 */
@Component({
  selector: 'app-assignment-card',
  imports: [CommonModule, RouterModule],
  template: `
    <!-- List View -->
    @if (viewMode() === 'list') {
      <div class="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 p-6"
           [class.ring-2]="isSelected()"
           [class.ring-blue-500]="isSelected()"
           [class.bg-blue-50]="isSelected()">

        <!-- Selection Checkbox -->
        @if (showSelection()) {
          <div class="flex items-start space-x-4">
            <input type="checkbox"
                   [checked]="isSelected()"
                   (change)="onSelectionChange($event)"
                   class="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
          </div>
        }

        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <!-- Header -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900 truncate mb-1">
                  {{ assignment().title }}
                </h3>
                <p class="text-sm text-gray-600 mb-2">
                  {{ assignment().courseName }} • {{ assignment().instructorName }}
                </p>
              </div>

              <!-- Priority Badge -->
              <div class="ml-4 flex-shrink-0">
                <span [class]="getPriorityBadgeClasses()"
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                  {{ getPriorityText() }}
                </span>
              </div>
            </div>

            <!-- Description -->
            <p class="text-sm text-gray-700 mb-4 line-clamp-2">
              {{ assignment().description }}
            </p>

            <!-- Progress Bar -->
            @if (assignment().progressPercentage > 0) {
              <div class="mb-4">
                <div class="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>Tiến độ</span>
                  <span>{{ assignment().progressPercentage }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                       [style.width.%]="assignment().progressPercentage"></div>
                </div>
              </div>
            }

            <!-- Metadata Row -->
            <div class="flex items-center justify-between text-sm text-gray-600 mb-4">
              <div class="flex items-center space-x-4">
                <!-- Due Date -->
                <div class="flex items-center space-x-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <span [class]="getDueDateClasses()">
                    {{ formatDueDate() }}
                  </span>
                </div>

                <!-- Submission Status -->
                @if (assignment().submissionStatus !== 'not_submitted') {
                  <div class="flex items-center space-x-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span class="capitalize">
                      {{ getSubmissionStatusText() }}
                    </span>
                  </div>
                }

                <!-- Grade -->
                @if (assignment().grade) {
                  <div class="flex items-center space-x-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                    </svg>
                    <span class="font-medium text-green-600">
                      {{ assignment().grade.score }}/{{ assignment().maxGrade }}
                    </span>
                  </div>
                }
              </div>

              <!-- Type Badge -->
              <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                {{ getTypeText() }}
              </span>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <button (click)="onViewDetails($event)"
                        class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Xem chi tiết
                </button>

                @if (assignment().progressPercentage === 0) {
                  <span class="text-gray-400">•</span>
                  <button (click)="onStartWorking($event)"
                          class="text-green-600 hover:text-green-800 text-sm font-medium">
                    Bắt đầu làm
                  </button>
                } @else if (assignment().progressPercentage < 100) {
                  <span class="text-gray-400">•</span>
                  <button (click)="onContinueWorking($event)"
                          class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Tiếp tục
                  </button>
                }
              </div>

              <!-- Quick Actions -->
              <div class="flex items-center space-x-1">
                <button (click)="onBookmark($event)"
                        [class.text-yellow-500]="isBookmarked()"
                        class="p-1 text-gray-400 hover:text-yellow-500 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Grid View -->
    @if (viewMode() === 'grid') {
      <div class="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden"
           [class.ring-2]="isSelected()"
           [class.ring-blue-500]="isSelected()"
           [class.bg-blue-50]="isSelected()">

        <!-- Selection Checkbox (Top Right) -->
        @if (showSelection()) {
          <div class="absolute top-3 right-3 z-10">
            <input type="checkbox"
                   [checked]="isSelected()"
                   (change)="onSelectionChange($event)"
                   class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
          </div>
        }

        <div class="p-6">
          <!-- Header -->
          <div class="mb-4">
            <div class="flex items-start justify-between mb-2">
              <span [class]="getPriorityBadgeClasses()"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">
                {{ getPriorityText() }}
              </span>
              <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                {{ getTypeText() }}
              </span>
            </div>

            <h3 class="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
              {{ assignment().title }}
            </h3>

            <p class="text-sm text-gray-600 mb-2">
              {{ assignment().courseName }}
            </p>
          </div>

          <!-- Progress -->
          @if (assignment().progressPercentage > 0) {
            <div class="mb-4">
              <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Tiến độ</span>
                <span>{{ assignment().progressPercentage }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                     [style.width.%]="assignment().progressPercentage"></div>
              </div>
            </div>
          }

          <!-- Due Date -->
          <div class="mb-4">
            <div class="flex items-center space-x-1 text-sm">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <span [class]="getDueDateClasses()">
                {{ formatDueDate() }}
              </span>
            </div>
          </div>

          <!-- Status -->
          @if (assignment().submissionStatus !== 'not_submitted') {
            <div class="mb-4">
              <div class="flex items-center space-x-1 text-sm">
                <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-gray-700 capitalize">
                  {{ getSubmissionStatusText() }}
                </span>
                @if (assignment().grade) {
                  <span class="font-medium text-green-600 ml-2">
                    {{ assignment().grade.score }}/{{ assignment().maxGrade }}
                  </span>
                }
              </div>
            </div>
          }

          <!-- Actions -->
          <div class="flex items-center justify-between pt-4 border-t border-gray-100">
            <button (click)="onViewDetails($event)"
                    class="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Xem chi tiết
            </button>

            <div class="flex items-center space-x-1">
              @if (assignment().progressPercentage === 0) {
                <button (click)="onStartWorking($event)"
                        class="text-green-600 hover:text-green-800 text-sm font-medium">
                  Bắt đầu
                </button>
              } @else if (assignment().progressPercentage < 100) {
                <button (click)="onContinueWorking($event)"
                        class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Tiếp tục
                </button>
              } @else {
                <button (click)="onViewSubmission($event)"
                        class="text-gray-600 hover:text-gray-800 text-sm font-medium">
                  Xem nộp
                </button>
              }

              <button (click)="onBookmark($event)"
                      [class.text-yellow-500]="isBookmarked()"
                      class="p-1 text-gray-400 hover:text-yellow-500 transition-colors ml-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class AssignmentCardComponent {
  // ========================================
  // INPUTS
  // ========================================

  assignment = input.required<AssignmentView>();
  viewMode = input<'list' | 'grid'>('list');
  showSelection = input<boolean>(false);
  isSelected = input<boolean>(false);

  // ========================================
  // OUTPUTS
  // ========================================

  assignmentSelected = output<string>();
  viewDetails = output<string>();
  startWorking = output<string>();
  continueWorking = output<string>();
  viewSubmission = output<string>();
  bookmark = output<string>();

  // ========================================
  // INTERNAL STATE
  // ========================================

  private isBookmarkedSignal = signal<boolean>(false);

  // ========================================
  // COMPUTED PROPERTIES
  // ========================================

  isBookmarked = this.isBookmarkedSignal.asReadonly();

  // ========================================
  // EVENT HANDLERS
  // ========================================

  onSelectionChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.assignmentSelected.emit(this.assignment().id);
    }
  }

  onViewDetails(event: Event): void {
    event.stopPropagation();
    this.viewDetails.emit(this.assignment().id);
  }

  onStartWorking(event: Event): void {
    event.stopPropagation();
    this.startWorking.emit(this.assignment().id);
  }

  onContinueWorking(event: Event): void {
    event.stopPropagation();
    this.continueWorking.emit(this.assignment().id);
  }

  onViewSubmission(event: Event): void {
    event.stopPropagation();
    this.viewSubmission.emit(this.assignment().id);
  }

  onBookmark(event: Event): void {
    event.stopPropagation();
    this.isBookmarkedSignal.update(bookmarked => !bookmarked);
    this.bookmark.emit(this.assignment().id);
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  getPriorityBadgeClasses(): string {
    const priority = this.assignment().priority;
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getPriorityText(): string {
    const priority = this.assignment().priority;
    switch (priority) {
      case 'urgent':
        return 'Khẩn cấp';
      case 'high':
        return 'Cao';
      case 'medium':
        return 'Trung bình';
      case 'low':
        return 'Thấp';
      default:
        return 'Không xác định';
    }
  }

  getDueDateClasses(): string {
    const assignment = this.assignment();
    if (assignment.isOverdue) {
      return 'text-red-600 font-medium';
    } else if (assignment.daysUntilDue <= 3) {
      return 'text-orange-600 font-medium';
    } else {
      return 'text-gray-600';
    }
  }

  formatDueDate(): string {
    const assignment = this.assignment();
    const now = new Date();
    const dueDate = assignment.dueDate;

    if (assignment.isOverdue) {
      return `Quá hạn ${Math.abs(assignment.daysUntilDue)} ngày`;
    } else if (assignment.daysUntilDue === 0) {
      return 'Hôm nay';
    } else if (assignment.daysUntilDue === 1) {
      return 'Ngày mai';
    } else if (assignment.daysUntilDue <= 7) {
      return `${assignment.daysUntilDue} ngày nữa`;
    } else {
      return dueDate.toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'short'
      });
    }
  }

  getSubmissionStatusText(): string {
    const status = this.assignment().submissionStatus;
    switch (status) {
      case 'submitted':
        return 'Đã nộp';
      case 'graded':
        return 'Đã chấm';
      case 'draft':
        return 'Bản nháp';
      default:
        return 'Chưa nộp';
    }
  }

  getTypeText(): string {
    const type = this.assignment().type;
    switch (type) {
      case 'assignment':
        return 'Bài tập';
      case 'quiz':
        return 'Bài kiểm tra';
      case 'project':
        return 'Dự án';
      case 'discussion':
        return 'Thảo luận';
      default:
        return 'Bài tập';
    }
  }
}