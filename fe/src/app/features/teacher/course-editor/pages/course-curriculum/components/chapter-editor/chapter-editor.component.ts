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

type LessonComposerType = 'LECTURE' | 'QUIZ' | 'ASSIGNMENT';

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
          @if (lessons().length > 0 && !showLessonComposer()) {
            <div style="display: flex; gap: 0.5rem; align-items: center">
              <button type="button" (click)="batchVideoUpload.emit()" class="add-lesson-header-btn add-lesson-header-btn--secondary"
                      data-wiii-id="upload-video-materials"
                      data-wiii-click-safe="true"
                      data-wiii-click-kind="open_panel"
                      title="Tải lên nhiều video, tự động chia vào các bài">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                Tải lên nhiều video
              </button>
              <button type="button" (click)="addLesson.emit()" class="add-lesson-header-btn"
                      data-wiii-id="open-lesson-composer"
                      data-wiii-click-safe="true"
                      data-wiii-click-kind="open_panel">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Thêm bài học
              </button>
            </div>
          }
        </div>

        @if (showLessonComposer()) {
          <div class="lesson-composer">
            <div class="lesson-composer__header">
              <div>
                <p class="lesson-composer__eyebrow">Tạo bài học mới</p>
                <p class="lesson-composer__description">
                  Chọn đúng loại bài học ngay từ đầu để flow soạn nội dung phía sau nhất quán với vùng soạn chính.
                </p>
              </div>
            </div>

            <div class="lesson-composer__type-grid">
              @for (type of ['LECTURE', 'QUIZ', 'ASSIGNMENT']; track type) {
                <button
                  type="button"
                  class="lesson-type-btn"
                  [attr.data-wiii-id]="'select-lesson-type-' + type"
                  [class.lesson-type-btn--active]="lessonDraftType() === type"
                  (click)="selectLessonDraftType($any(type))"
                >
                  <span class="lesson-type-btn__title">{{ lessonTypeTitle($any(type)) }}</span>
                  <span class="lesson-type-btn__hint">{{ lessonTypeHint($any(type)) }}</span>
                </button>
              }
            </div>

            <div class="editor-field" style="margin-bottom: 0">
              <label for="lesson-draft-title" class="editor-label">
                Tên bài học <span class="editor-field-error">*</span>
              </label>
              <input
                id="lesson-draft-title"
                data-wiii-id="lesson-draft-title-input"
                type="text"
                [ngModel]="lessonDraftTitle()"
                (ngModelChange)="onLessonDraftTitleChange($event)"
                (keydown.enter)="createLesson.emit()"
                class="editor-input"
                placeholder="Ví dụ: Giới thiệu công ước SOLAS"
              />
            </div>

            <div class="lesson-composer__footer">
              <button type="button" (click)="cancelLessonCreate.emit()" class="editor-secondary-button">
                Hủy
              </button>
              <button
                type="button"
                (click)="createLesson.emit()"
                data-wiii-id="create-lesson-draft"
                [disabled]="isCreatingLesson() || !lessonDraftTitle().trim()"
                class="editor-primary-button"
              >
                @if (isCreatingLesson()) {
                  <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                }
                {{ lessonCreateLabel() }}
              </button>
            </div>
          </div>
        }

        @if (lessons().length > 0) {
          <div class="editor-stack" style="gap: 0.375rem">
            @for (lesson of lessons(); track lesson.id; let i = $index) {
              <button type="button" (click)="lessonClicked.emit(lesson)" class="chapter-lesson-row"
                      [attr.data-wiii-id]="'open-lesson-editor-' + lesson.id"
                      data-wiii-click-safe="true"
                      data-wiii-click-kind="navigation">
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
        } @else if (!showLessonComposer()) {
          <div class="editor-empty-state" style="padding: 1.5rem; text-align: center">
            <p style="font-size: 0.8125rem; color: rgb(100 116 139); margin-bottom: 0.75rem">
              Chưa có bài học trong chương này
            </p>
            <button type="button" (click)="addLesson.emit()" class="editor-primary-button" style="font-size: 0.8125rem"
                    data-wiii-id="open-first-lesson-composer"
                    data-wiii-click-safe="true"
                    data-wiii-click-kind="open_panel">
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
          data-wiii-id="save-chapter"
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
    .add-lesson-header-btn--secondary {
      color: rgb(71 85 105);
      border-color: rgb(226 232 240);
    }
    .add-lesson-header-btn--secondary:hover {
      color: rgb(0 86 210);
      border-color: rgba(0, 86, 210, 0.3);
      background: rgba(0, 86, 210, 0.04);
    }
    .lesson-composer {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      margin-top: 0.875rem;
      padding: 1rem;
      border: 1px solid rgba(0, 86, 210, 0.14);
      border-radius: var(--editor-control-radius);
      background: linear-gradient(180deg, rgba(0, 86, 210, 0.05) 0%, rgba(255, 255, 255, 0.98) 100%);
    }
    .lesson-composer__eyebrow {
      margin: 0 0 0.25rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: rgb(0 86 210);
    }
    .lesson-composer__description {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: rgb(71 85 105);
    }
    .lesson-composer__type-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.625rem;
    }
    .lesson-type-btn {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
      padding: 0.75rem;
      border: 1px solid rgba(203, 213, 225, 0.9);
      border-radius: var(--editor-control-radius);
      background: rgb(255 255 255 / 0.92);
      text-align: left;
      cursor: pointer;
      transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
    }
    .lesson-type-btn:hover {
      border-color: rgba(0, 86, 210, 0.28);
      background: rgba(255, 255, 255, 1);
    }
    .lesson-type-btn--active {
      border-color: rgba(0, 86, 210, 0.4);
      background: rgba(0, 86, 210, 0.08);
      box-shadow: inset 0 0 0 1px rgba(0, 86, 210, 0.08);
    }
    .lesson-type-btn__title {
      font-size: 0.8125rem;
      font-weight: 700;
      color: rgb(15 23 42);
    }
    .lesson-type-btn__hint {
      font-size: 0.75rem;
      line-height: 1.4;
      color: rgb(100 116 139);
    }
    .lesson-composer__footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
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
    @media (max-width: 900px) {
      .lesson-composer__type-grid {
        grid-template-columns: 1fr;
      }
      .lesson-composer__footer {
        flex-direction: column-reverse;
      }
      .lesson-composer__footer .editor-primary-button,
      .lesson-composer__footer .editor-secondary-button {
        width: 100%;
        justify-content: center;
      }
    }
  `],
})
export class ChapterEditorComponent {
  readonly isLoading = input(false);
  readonly chapter = input.required<ChapterDraftDTO>();
  readonly chapterLabel = input('');
  readonly isSaving = input(false);
  readonly isDirty = input(false);
  readonly showLessonComposer = input(false);
  readonly lessonDraftTitle = input('');
  readonly lessonDraftType = input<LessonComposerType>('LECTURE');
  readonly isCreatingLesson = input(false);

  readonly titleChange = output<string>();
  readonly descriptionChange = output<string>();
  readonly saveClicked = output<void>();
  readonly lessonClicked = output<LessonDraftDTO>();
  readonly addLesson = output<void>();
  readonly batchVideoUpload = output<void>();
  readonly lessonDraftTitleChange = output<string>();
  readonly lessonDraftTypeChange = output<LessonComposerType>();
  readonly createLesson = output<void>();
  readonly cancelLessonCreate = output<void>();

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

  onLessonDraftTitleChange(value: string): void {
    this.lessonDraftTitleChange.emit(value);
  }

  selectLessonDraftType(type: LessonComposerType): void {
    this.lessonDraftTypeChange.emit(type);
  }

  lessonCreateLabel(): string {
    switch (this.lessonDraftType()) {
      case 'QUIZ':
        return 'Tạo bài kiểm tra';
      case 'ASSIGNMENT':
        return 'Tạo bài tập';
      default:
        return 'Tạo bài học';
    }
  }

  lessonTypeTitle(type: LessonComposerType): string {
    switch (type) {
      case 'QUIZ':
        return 'Bài kiểm tra';
      case 'ASSIGNMENT':
        return 'Bài tập';
      default:
        return 'Bài giảng';
    }
  }

  lessonTypeHint(type: LessonComposerType): string {
    switch (type) {
      case 'QUIZ':
        return 'Thiết lập câu hỏi ở builder riêng sau khi tạo.';
      case 'ASSIGNMENT':
        return 'Thiết lập mô tả, hạn nộp và giao bài ở bước tiếp theo.';
      default:
        return 'Dùng để thêm mục văn bản, video, tài liệu hoặc trắc nghiệm.';
    }
  }
}
