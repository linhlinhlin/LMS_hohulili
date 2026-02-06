import { Component, inject, output , ChangeDetectionStrategy } from '@angular/core';

import { SectionEditorState, LessonItem } from '../../state/section-editor.state';

@Component({
  selector: 'app-lessons-table',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    @if (state.hasLessons()) {
      <table class="min-w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">STT</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên bài học</th>
            <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Loại</th>
            <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Trạng thái</th>
            <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-100">Thao tác</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (lesson of state.lessons(); track lesson.id; let i = $index) {
            <tr class="hover:bg-blue-50/50 transition-colors">
              <td class="px-6 py-2 text-sm text-gray-500 font-medium text-center">{{ i + 1 }}</td>
              <td class="px-6 py-2">
                <div class="flex items-start gap-3">
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-gray-900 truncate">{{ lesson.title }}</div>
                    @if (lesson.description) {
                      <div class="text-xs text-gray-500 mt-0.5">
                        {{ lesson.description.length > 80 ? lesson.description.slice(0, 80) + '...' : lesson.description }}
                      </div>
                    }
                  </div>
                </div>
              </td>
              <td class="px-6 py-2 text-center">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                      [class.bg-blue-100]="!lesson.lessonType || lesson.lessonType === 'LECTURE'"
                      [class.text-blue-700]="!lesson.lessonType || lesson.lessonType === 'LECTURE'"
                      [class.bg-green-100]="lesson.lessonType === 'ASSIGNMENT'"
                      [class.text-green-700]="lesson.lessonType === 'ASSIGNMENT'"
                      [class.bg-purple-100]="lesson.lessonType === 'QUIZ'"
                      [class.text-purple-700]="lesson.lessonType === 'QUIZ'">
                  {{ getLessonTypeLabel(lesson.lessonType) }}
                </span>
              </td>
              <td class="px-6 py-2 text-center">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <span class="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                  Đã xuất bản
                </span>
              </td>
              <td class="px-6 py-2">
                <div class="flex items-center justify-center gap-2">
                  <!-- View button -->
                  <button (click)="viewLesson.emit(lesson)"
                          class="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-xs font-medium inline-flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                    Xem
                  </button>

                  <!-- Quiz preview button -->
                  @if (lesson.lessonType === 'QUIZ') {
                    <button (click)="previewQuiz.emit(lesson)"
                            class="px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-md transition-colors text-xs font-medium inline-flex items-center gap-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Thử làm
                    </button>
                  }

                  <!-- Edit button (non-quiz) -->
                  @if (lesson.lessonType !== 'QUIZ') {
                    <button (click)="editLesson.emit(lesson)"
                            class="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors text-xs font-medium inline-flex items-center gap-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                      Sửa
                    </button>
                  }

                  <!-- Delete button -->
                  <button (click)="deleteLesson.emit(lesson); $event.stopPropagation()"
                          class="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors text-xs font-medium disabled:opacity-50 inline-flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    Xóa
                  </button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    } @else {
      <!-- Empty State -->
      <div class="p-12 text-center">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-1">Chưa có bài học</h3>
        <p class="text-gray-500 mb-4">Bắt đầu thêm nội dung cho chương này</p>
        <button (click)="addFirst.emit()"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Thêm bài học đầu tiên
        </button>
      </div>
    }
  `
})
export class LessonsTableComponent {
  readonly state = inject(SectionEditorState);

  viewLesson = output<LessonItem>();
  editLesson = output<LessonItem>();
  deleteLesson = output<LessonItem>();
  previewQuiz = output<LessonItem>();
  addFirst = output<void>();

  getLessonTypeLabel(type: string | undefined): string {
    switch (type) {
      case 'ASSIGNMENT': return 'Bài tập';
      case 'QUIZ': return 'Trắc nghiệm';
      default: return 'Bài học';
    }
  }
}
