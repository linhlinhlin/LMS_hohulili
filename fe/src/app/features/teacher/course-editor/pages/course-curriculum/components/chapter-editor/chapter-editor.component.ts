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
    <div class="chapter-workspace">
      <!-- Breadcrumb -->
      <p class="chapter-breadcrumb"><span class="chapter-breadcrumb__type">Chương</span> · {{ title() || 'Chưa đặt tên' }}</p>

      <!-- Tên chương -->
      <div class="editor-field">
          <label for="chapter-title" class="editor-label">
            Tên chương <span class="editor-field-error">*</span>
          </label>
          <input id="chapter-title" type="text"
            [ngModel]="title()"
            (ngModelChange)="onTitleChange($event)"
            class="editor-input"
            placeholder="Nhập tên chương..." />
        </div>

        <!-- Description -->
        <div class="editor-field">
          <label for="chapter-desc" class="editor-label">Mô tả</label>
          <textarea id="chapter-desc"
            [ngModel]="description()"
            (ngModelChange)="onDescriptionChange($event)"
            rows="3"
            class="editor-textarea"
            placeholder="Mô tả ngắn về nội dung chương..."></textarea>
        </div>

        <!-- Lesson list -->
        <div class="editor-field" style="padding-top: 0.5rem; border-top: 1px solid var(--editor-card-header-border, rgb(226 232 240))">
          <label class="editor-label">Bài học ({{ lessons().length }})</label>

          @if (lessons().length > 0) {
            <div class="editor-stack" style="gap: 0.375rem">
              @for (lesson of lessons(); track lesson.id; let i = $index) {
                <button type="button"
                  (click)="lessonClicked.emit(lesson)"
                  class="chapter-lesson-row">
                  <span class="chapter-lesson-row__index">{{ i + 1 }}.</span>
                  <span class="chapter-lesson-row__title"><span style="color: rgb(148 163 184); font-size: 0.6875rem; font-weight: 600">Bài {{ i + 1 }}</span> {{ stripLessonPrefix(lesson.title) }}</span>
                  <span class="chapter-lesson-row__badge"
                    [class.chapter-lesson-row__badge--quiz]="(lesson.type || 'LECTURE').toUpperCase() === 'QUIZ'"
                    [class.chapter-lesson-row__badge--assignment]="(lesson.type || 'LECTURE').toUpperCase() === 'ASSIGNMENT'">
                    {{ getLessonTypeLabel(lesson) }}
                  </span>
                </button>
              }
            </div>
          } @else {
            <p class="editor-empty-state" style="padding: 1.5rem; text-align: center">Chưa có bài học. Thêm bài học từ sidebar bên trái.</p>
          }
        </div>

        <!-- Lưu -->
        <div class="chapter-footer">
          <button type="button"
            (click)="saveClicked.emit()"
            [disabled]="isSaving() || !title().trim()"
            class="editor-primary-button">
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
  styles: [`
    @import '../../../course-info/editor-shared';
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .chapter-workspace { display: flex; flex-direction: column; flex: 1; gap: 1rem; }
    .chapter-breadcrumb {
      font-size: 0.8125rem;
      color: rgb(100 116 139);
      margin-bottom: 0.25rem;
    }
    .chapter-breadcrumb__type {
      font-weight: 600;
      color: rgb(0 86 210);
    }
    .chapter-footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 0.75rem;
      border-top: 1px solid rgb(226 232 240);
      margin-top: auto;
    }
    @import '../../../course-info/editor-shared';

    .chapter-lesson-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--editor-control-border);
      border-radius: var(--editor-control-radius);
      background: #fff;
      text-align: left;
      cursor: pointer;
      transition: border-color 160ms ease, background-color 160ms ease;
    }
    .chapter-lesson-row:hover {
      border-color: rgba(0, 86, 210, 0.3);
      background: rgba(0, 86, 210, 0.03);
    }
    .chapter-lesson-row__index {
      font-size: 0.8125rem;
      color: rgb(148 163 184);
      min-width: 1.5rem;
      font-variant-numeric: tabular-nums;
    }
    .chapter-lesson-row__title {
      flex: 1;
      font-size: 0.875rem;
      font-weight: 500;
      color: rgb(15 23 42);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .chapter-lesson-row__badge {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      background: rgba(0, 86, 210, 0.08);
      color: rgb(0 75 181);
      white-space: nowrap;
    }
    .chapter-lesson-row__badge--quiz {
      background: rgba(139, 92, 246, 0.1);
      color: rgb(109 40 217);
    }
    .chapter-lesson-row__badge--assignment {
      background: rgba(16, 185, 129, 0.1);
      color: rgb(4 120 87);
    }
  `],
})
export class ChapterEditorComponent {
  // Inputs
  readonly isLoading = input(false);
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
    // Strip legacy "Chương N:" prefix to avoid user confusion
    // (sidebar auto-numbers chapters by position)
    effect(() => {
      const ch = this.chapter();
      this.title.set(this.stripChapterPrefix(ch.title || ''));
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

  stripChapterPrefix(title: string): string {
    const pattern = /^chương\s+\d+[.:.]\s*/i;
    const match = title.match(pattern);
    return match ? title.slice(match[0].length).trim() : title;
  }

  stripLessonPrefix(title: string): string {
    const pattern = /^bài\s+\d+[.:.]\s*/i;
    const match = title.match(pattern);
    return match ? title.slice(match[0].length).trim() : title;
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
