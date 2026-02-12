import { Component, inject, output , ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CurriculumEditorState } from '../../state/curriculum-editor.state';
import { LessonDraftDTO } from '../../../../services/course-authoring.service';

@Component({
  selector: 'app-chapter-editor',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="bg-white shadow-sm border border-gray-200 flex-grow overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-[#0056D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
          </svg>
        </div>
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Chỉnh sửa chương</h2>
          <p class="text-sm text-gray-500">Cập nhật thông tin chương</p>
        </div>
      </div>
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tên chương <span class="text-red-500">*</span></label>
          <input type="text"
                 [ngModel]="state.chapterTitle()"
                 (ngModelChange)="state.chapterTitle.set($event)"
                 class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
          <textarea [ngModel]="state.chapterDescription()"
                    (ngModelChange)="state.chapterDescription.set($event)"
                    rows="3"
                    class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] resize-none"></textarea>
        </div>
        <div class="border-t border-gray-200 pt-6">
          <h3 class="font-medium text-gray-900 mb-4">Bài học ({{ state.selectedChapterLessons().length }})</h3>
          @if (state.selectedChapterLessons().length > 0) {
            <div class="space-y-2">
              @for (lesson of state.selectedChapterLessons(); track lesson.id; let i = $index) {
                <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                     (click)="selectLesson.emit(lesson)">
                  <span class="text-sm text-gray-500 w-6">{{ i + 1 }}.</span>
                  <span class="text-sm text-gray-900 flex-1">{{ lesson.title }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full"
                        [class.bg-blue-100]="state.getLessonType(lesson) === 'LECTURE'"
                        [class.text-[#004BB5]]="state.getLessonType(lesson) === 'LECTURE'"
                        [class.bg-purple-100]="state.getLessonType(lesson) === 'QUIZ'"
                        [class.text-purple-700]="state.getLessonType(lesson) === 'QUIZ'"
                        [class.bg-green-100]="state.getLessonType(lesson) === 'ASSIGNMENT'"
                        [class.text-green-700]="state.getLessonType(lesson) === 'ASSIGNMENT'">
                    {{ state.getLessonTypeLabel(state.getLessonType(lesson)) }}
                  </span>
                </div>
              }
            </div>
          } @else {
            <div class="text-center py-8 bg-gray-50 rounded-lg">
              <p class="text-gray-500 text-sm">Chưa có bài học</p>
            </div>
          }
        </div>
      </div>
      <div class="px-6 py-4 border-t border-gray-200 flex justify-end flex-shrink-0">
        <button (click)="onSave()"
                [disabled]="state.isSaving()"
                class="px-5 py-2.5 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] disabled:opacity-50 flex items-center gap-2">
          @if (state.isSaving()) {
            <span class="animate-spin">⏳</span>
          }
          Lưu thay đổi
        </button>
      </div>
    </div>
  `
})
export class ChapterEditorComponent {
  readonly state = inject(CurriculumEditorState);

  selectLesson = output<LessonDraftDTO>();
  saved = output<void>();

  async onSave(): Promise<void> {
    const success = await this.state.saveChapter();
    if (success) {
      this.saved.emit();
    }
  }
}
