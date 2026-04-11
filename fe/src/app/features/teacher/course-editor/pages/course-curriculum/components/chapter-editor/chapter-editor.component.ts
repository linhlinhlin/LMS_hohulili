import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  signal,
  computed,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChapterDraftDTO, LessonDraftDTO } from '../../../../services/course-authoring.service';

/**
 * Chapter Editor — focused component for editing a single chapter.
 *
 * Responsibilities:
 * - Chapter title + description form
 * - Lesson list preview with type badges
 * - Save action (delegated to parent via output)
 *
 * Design: editor-workspace-card pattern (header / body / footer)
 * following the existing course editor visual language.
 */
@Component({
  selector: 'app-chapter-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="editor-workspace-card bg-white shadow-sm border border-gray-200 flex-grow overflow-hidden flex flex-col">

      <!-- ═══ Header ═══ -->
      <div class="editor-workspace-card__header px-6 py-4 border-b border-gray-200 flex items-center gap-3 flex-shrink-0">
        <div class="w-10 h-10 bg-[#0056D2]/10 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-[#0056D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <div class="min-w-0">
          <h2 class="text-lg font-semibold text-gray-900 truncate">Chỉnh sửa chương</h2>
          <p class="text-sm text-gray-500">Cập nhật thông tin chương</p>
        </div>
      </div>

      <!-- ═══ Body ═══ -->
      <div class="editor-workspace-card__body p-6 space-y-4 flex-1 overflow-y-auto">

        <!-- Title -->
        <div>
          <label for="chapter-title" class="block text-sm font-medium text-gray-700 mb-2">
            Tên chương <span class="text-red-500">*</span>
          </label>
          <input id="chapter-title" type="text"
            [ngModel]="title()"
            (ngModelChange)="onTitleChange($event)"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                   focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2]
                   transition-colors"
            placeholder="Nhập tên chương..." />
        </div>

        <!-- Description -->
        <div>
          <label for="chapter-desc" class="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
          <textarea id="chapter-desc"
            [ngModel]="description()"
            (ngModelChange)="onDescriptionChange($event)"
            rows="3"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none
                   focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2]
                   transition-colors"
            placeholder="Mô tả ngắn về nội dung chương..."></textarea>
        </div>

        <!-- Lesson list -->
        <div class="border-t border-gray-200 pt-6">
          <h3 class="font-medium text-gray-900 mb-4">
            Bài học ({{ lessons().length }})
          </h3>

          @if (lessons().length > 0) {
            <div class="space-y-2">
              @for (lesson of lessons(); track lesson.id; let i = $index) {
                <button type="button"
                  (click)="lessonClicked.emit(lesson)"
                  class="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg
                         hover:bg-gray-100 cursor-pointer text-left transition-colors">
                  <span class="text-sm text-gray-400 w-6 tabular-nums">{{ i + 1 }}.</span>
                  <span class="text-sm text-gray-900 flex-1 truncate">{{ lesson.title }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                    [class]="getLessonTypeBadgeClass(lesson)">
                    {{ getLessonTypeLabel(lesson) }}
                  </span>
                </button>
              }
            </div>
          } @else {
            <div class="text-center py-8 bg-gray-50 rounded-lg">
              <p class="text-gray-500 text-sm">Chưa có bài học</p>
            </div>
          }
        </div>
      </div>

      <!-- ═══ Footer ═══ -->
      <div class="editor-workspace-card__footer px-6 py-4 border-t border-gray-200 flex justify-end flex-shrink-0">
        <button type="button"
          (click)="saveClicked.emit()"
          [disabled]="isSaving() || !title().trim()"
          class="px-5 py-2.5 bg-[#0056D2] text-white text-sm font-medium rounded-lg
                 hover:bg-[#004BB5] disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center gap-2 transition-colors">
          @if (isSaving()) {
            <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          }
          Lưu thay đổi
        </button>
      </div>
    </div>
  `,
})
export class ChapterEditorComponent {
  // Inputs
  readonly chapter = input.required<ChapterDraftDTO>();
  readonly isSaving = input(false);

  // Outputs
  readonly titleChange = output<string>();
  readonly descriptionChange = output<string>();
  readonly saveClicked = output<void>();
  readonly lessonClicked = output<LessonDraftDTO>();

  // Local form state derived from chapter input
  readonly title = signal('');
  readonly description = signal('');

  readonly lessons = computed(() => this.chapter().lessons || []);

  constructor() {
    // Sync form when chapter input changes (new selection)
    effect(() => {
      const ch = this.chapter();
      this.title.set(ch.title || '');
      this.description.set(ch.description || '');
    });
  }

  onTitleChange(value: string): void {
    this.title.set(value);
    this.titleChange.emit(value);
  }

  onDescriptionChange(value: string): void {
    this.description.set(value);
    this.descriptionChange.emit(value);
  }

  getLessonTypeLabel(lesson: LessonDraftDTO): string {
    const type = (lesson.type || 'LECTURE').toUpperCase();
    switch (type) {
      case 'QUIZ': return 'Trắc nghiệm';
      case 'ASSIGNMENT': return 'Bài tập';
      default: return 'Bài giảng';
    }
  }

  getLessonTypeBadgeClass(lesson: LessonDraftDTO): string {
    const type = (lesson.type || 'LECTURE').toUpperCase();
    switch (type) {
      case 'QUIZ': return 'bg-purple-100 text-purple-700';
      case 'ASSIGNMENT': return 'bg-green-100 text-green-700';
      default: return 'bg-[#0056D2]/10 text-[#004BB5]';
    }
  }
}
