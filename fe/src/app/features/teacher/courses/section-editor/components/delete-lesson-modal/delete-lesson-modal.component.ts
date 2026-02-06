import { Component, inject, input, output , ChangeDetectionStrategy } from '@angular/core';

import { SectionEditorState, LessonItem } from '../../state/section-editor.state';

@Component({
  selector: 'app-delete-lesson-modal',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    @if (state.showDeleteModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/20 backdrop-blur-sm" (click)="onCancel()"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-2xl shadow-xl max-w-sm w-full animate-slideUp">
          <div class="p-6 text-center">
            <!-- Icon -->
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </div>

            <!-- Title -->
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              Xóa bài học?
            </h3>

            <!-- Message -->
            <p class="text-gray-600 text-sm mb-6">
              Bạn có chắc muốn xóa "<span class="font-medium text-gray-900">{{ state.lessonToDelete()?.title }}</span>"?
              <span class="text-red-600">{{ getDeleteWarningMessage() }}</span>
            </p>

            <!-- Actions -->
            <div class="flex gap-3">
              <button type="button"
                      (click)="onCancel()"
                      [disabled]="state.isDeleting()"
                      class="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium disabled:opacity-50">
                Hủy
              </button>
              <button type="button"
                      (click)="onConfirm()"
                      [disabled]="state.isDeleting()"
                      class="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                @if (state.isDeleting()) {
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                } @else {
                  Xóa
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class DeleteLessonModalComponent {
  readonly state = inject(SectionEditorState);

  deleted = output<void>();

  onCancel(): void {
    this.state.cancelDelete();
  }

  onConfirm(): void {
    this.state.executeDelete().then(() => {
      this.deleted.emit();
    });
  }

  getDeleteWarningMessage(): string {
    const lesson = this.state.lessonToDelete();
    if (!lesson) return '';

    if (lesson.lessonType === 'QUIZ') {
      return 'Tất cả câu hỏi trong quiz và kết quả làm bài của học viên sẽ bị xóa vĩnh viễn.';
    } else if (lesson.lessonType === 'ASSIGNMENT') {
      return 'Tất cả bài nộp của học viên sẽ bị xóa vĩnh viễn.';
    }
    return 'Hành động này không thể hoàn tác.';
  }
}
