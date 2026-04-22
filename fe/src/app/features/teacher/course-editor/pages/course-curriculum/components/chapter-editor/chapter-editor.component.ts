import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChapterDraftDTO, LessonDraftDTO } from '../../../../services/course-authoring.service';
import { buildCurriculumLabel, stripCurriculumPrefix } from '../../../../utils/curriculum-labels';

/**
 * Chapter Editor - focused component for editing a single chapter.
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
      <p class="chapter-breadcrumb">
        <span class="chapter-breadcrumb__type">{{ chapterLabel() || 'Chương' }}</span>
        ·
        {{ title() || 'Chưa đặt tên' }}
      </p>

      <div class="editor-field">
        <label for="chapter-title" class="editor-label">
          Tên chương <span class="editor-field-error">*</span>
        </label>
        <input
          id="chapter-title"
          type="text"
          [ngModel]="title()"
          (ngModelChange)="onTitleChange($event)"
          class="editor-input"
          placeholder="Nhập tên chương..."
        />
      </div>

      <div class="editor-field">
        <label for="chapter-desc" class="editor-label">Mô tả</label>
        <textarea
          id="chapter-desc"
          [ngModel]="description()"
          (ngModelChange)="onDescriptionChange($event)"
          rows="3"
          class="editor-textarea"
          placeholder="Mô tả ngắn về nội dung chương..."
        ></textarea>
      </div>

      <div
        class="editor-field"
        style="padding-top: 0.5rem; border-top: 1px solid var(--editor-card-header-border, rgb(226 232 240))"
      >
        <div style="display: flex; justify-content: space-between; align-items: center">
          <label class="editor-label">Bài học ({{ lessons().length }})</label>
          @if (lessons().length > 0) {
            <button type="button" (click)="addLesson.emit()" class="add-lesson-header-btn">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Thêm bài học
            </button>
          }
        </div>

        @if (lessons().length > 0) {
          <div class="editor-stack" style="gap: 0.375rem">
            @for (lesson of lessons(); track lesson.id; let i = $index) {
              <button type="button" (click)="lessonClicked.emit(lesson)" class="chapter-lesson-row">
                <span
                  class="chapter-lesson-row__dot"
                  [class.chapter-lesson-row__dot--ready]="lesson.sections.length > 0"
                ></span>
                <span class="chapter-lesson-row__title">
                  <span style="color: rgb(148 163 184); font-size: 0.6875rem; font-weight: 600">
                    {{ lessonLabel(i) }}
                  </span>
                  {{ stripLessonPrefix(lesson.title) }}
                </span>
                <span class="chapter-lesson-row__meta">{{ lessonsSectionCount(lesson) }} mục</span>
                <svg class="chapter-lesson-row__arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            }
          </div>
        } @else {
          <div class="editor-empty-state" style="padding: 1.5rem; text-align: center">
            <p style="font-size: 0.8125rem; color: rgb(100 116 139); margin-bottom: 0.75rem">
              Chưa có bài học trong chương này
            </p>
            <button type="button" (click)="addLesson.emit()" class="editor-primary-button" style="font-size: 0.8125rem">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Thêm bài học đầu tiên
            </button>
          </div>
        }
      </div>

      <div class="chapter-footer">
        @if (isDirty()) {
          <span class="unsaved-hint">
            <span class="unsaved-hint__dot"></span>
            Có thay đổi chưa lưu
          </span>
        }
        <button
          type="button"
          (click)="saveClicked.emit()"
          [disabled]="isSaving() || !title().trim()"
          class="editor-primary-button"
        >
          @if (isSaving()) {
            <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
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
    .add-lesson-header-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
      padding: 0.375rem 0.75rem;
      border: 1px solid var(--editor-control-border);
      border-radius: var(--editor-control-radius);
      background: #fff;
      color: rgb(0 86 210);
      cursor: pointer;
      transition: border-color 160ms ease, background 160ms ease;
    }
    .add-lesson-header-btn:hover {
      border-color: rgba(0, 86, 210, 0.4);
      background: rgba(0, 86, 210, 0.04);
    }
    .unsaved-hint {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: rgb(217 119 6);
      font-weight: 500;
    }
    .unsaved-hint__dot {
      width: 0.375rem;
      height: 0.375rem;
      border-radius: 50%;
      background: rgb(245 158 11);
      animation: pulse-dot 1.4s ease-in-out infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 0.55; }
      50% { opacity: 1; }
    }
    .chapter-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgb(226 232 240);
      margin-top: auto;
    }
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
    .chapter-lesson-row__dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: rgb(203 213 225);
      flex-shrink: 0;
    }
    .chapter-lesson-row__dot--ready {
      background: rgb(34 197 94);
    }
    .chapter-lesson-row__meta {
      font-size: 0.6875rem;
      color: rgb(148 163 184);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .chapter-lesson-row__arrow {
      width: 1rem;
      height: 1rem;
      color: rgb(203 213 225);
      flex-shrink: 0;
    }
    .chapter-lesson-row:hover .chapter-lesson-row__arrow {
      color: rgb(0 86 210);
    }
  `],
})
export class ChapterEditorComponent {
  readonly isLoading = input(false);
  readonly chapter = input.required<ChapterDraftDTO>();
  readonly chapterLabel = input('');
  readonly isSaving = input(false);
  readonly isDirty = input(false);

  readonly titleChange = output<string>();
  readonly descriptionChange = output<string>();
  readonly saveClicked = output<void>();
  readonly lessonClicked = output<LessonDraftDTO>();
  readonly addLesson = output<void>();

  readonly title = signal('');
  readonly description = signal('');

  readonly lessons = computed(() => this.chapter().lessons || []);

  constructor() {
    effect(() => {
      const chapter = this.chapter();
      this.title.set(this.stripChapterPrefix(chapter.title || ''));
      this.description.set(chapter.description || '');
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

  lessonsSectionCount(lesson: LessonDraftDTO): number {
    return lesson.sections?.length || 0;
  }

  stripChapterPrefix(title: string): string {
    return stripCurriculumPrefix(title, 'chapter');
  }

  stripLessonPrefix(title: string): string {
    return stripCurriculumPrefix(title, 'lesson');
  }

  lessonLabel(index: number): string {
    return buildCurriculumLabel('lesson', index);
  }
}
