import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  effect,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LessonDraftDTO, SectionDraftDTO } from '../../../../services/course-authoring.service';
import { CurriculumEditorService } from '../../../../services/curriculum-editor.service';
import { LectureSectionsPanelComponent } from '../lecture-sections-panel/lecture-sections-panel.component';
import { CurriculumAssessmentSummaryComponent } from '../curriculum-assessment-summary/curriculum-assessment-summary.component';
import { CurriculumAssignmentDetailsComponent } from '../curriculum-assignment-details/curriculum-assignment-details.component';
import { CurriculumQuizManagerComponent } from '../curriculum-quiz-manager/curriculum-quiz-manager.component';
import { SectionEditorComponent } from '../section-editor/section-editor.component';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { stripCurriculumPrefix } from '../../../../utils/curriculum-labels';
import { CompetencyPanelComponent } from '../competency-panel/competency-panel.component';

/**
 * Lesson Editor - focused component for editing a single lesson.
 *
 * Routes content by lesson type:
 * - LECTURE: sections panel + inline section-editor
 * - QUIZ: assessment summary + quiz manager
 * - ASSIGNMENT: assessment summary + assignment details
 *
 * Title editing is shared across all types.
 * Save/back actions delegated to parent via outputs.
 */
@Component({
  selector: 'app-lesson-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DragDropModule,
    LectureSectionsPanelComponent,
    CurriculumAssessmentSummaryComponent,
    CurriculumAssignmentDetailsComponent,
    CurriculumQuizManagerComponent,
    SectionEditorComponent,
    CompetencyPanelComponent,
  ],
  styles: [`
    @import '../../../course-info/editor-shared';
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .lesson-workspace { display: flex; flex-direction: column; flex: 1; gap: 1rem; }
    .lesson-breadcrumb {
      font-size: 0.8125rem;
      color: rgb(100 116 139);
      margin-bottom: 0.25rem;
    }
    .lesson-breadcrumb__back {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 0.8125rem;
      color: rgb(100 116 139);
      padding: 0;
      transition: color 120ms ease;
    }
    .lesson-breadcrumb__back:hover {
      color: rgb(0 86 210);
    }
    .lesson-breadcrumb__sep {
      color: rgb(203 213 225);
      margin: 0 0.25rem;
    }
    .lesson-breadcrumb__type {
      font-weight: 600;
      color: rgb(0 86 210);
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
    .unsaved-hint--cascade {
      color: rgb(0 86 210);
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 0.55; }
      50% { opacity: 1; }
    }
    .lesson-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgb(226 232 240);
      margin-top: auto;
    }
  `],
  template: `
    <div class="lesson-workspace" data-wiii-id="lesson-editor">
      <div class="lesson-breadcrumb">
        @if (chapterTitle() || chapterLabel()) {
          <button type="button" class="lesson-breadcrumb__back" (click)="backClicked.emit()"
                  data-wiii-id="back-to-chapter"
                  data-wiii-click-safe="true"
                  data-wiii-click-kind="navigation">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            {{ chapterLabel() || chapterTitle() }}
          </button>
          <span class="lesson-breadcrumb__sep">›</span>
        }
        <span class="lesson-breadcrumb__type">{{ lessonLabel() || 'Bài học' }}</span>
        <span class="lesson-breadcrumb__sep">·</span>
        <span>{{ getTypeLabel() }}</span>
      </div>

      <div class="editor-field">
        <label for="lesson-title" class="editor-label">
          Tiêu đề <span class="editor-field-error">*</span>
        </label>
        <input
          id="lesson-title"
          data-wiii-id="lesson-title-input"
          type="text"
          [value]="title()"
          (input)="onTitleChange($any($event.target).value)"
          class="editor-input"
          placeholder="Nhập tiêu đề bài học..."
        />
      </div>

      @if (lessonType() === 'LECTURE') {
        @if (hasLegacyVideo()) {
          <div
            class="editor-callout--warning"
            style="display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 0.75rem; padding: 0.75rem 1rem; border: 1px solid rgba(217,119,6,0.22); border-radius: var(--editor-control-radius); background: rgba(245,158,11,0.1)"
          >
            <div style="min-width: 0">
              <p style="font-size: 0.8125rem; font-weight: 600; color: rgb(146 64 14)">Video cũ ở bài học</p>
              <p style="margin-top: 0.25rem; font-size: 0.8125rem; color: rgb(146 64 14)">{{ legacyVideoCopy() }}</p>
            </div>
            @if (!hasVideoSections()) {
              <button
                type="button"
                (click)="createSection.emit('VIDEO')"
                data-wiii-id="add-video-section-from-legacy"
                class="editor-secondary-button"
                style="font-size: 0.75rem; min-height: 2rem; padding: 0.25rem 0.75rem"
              >
                Tạo mục video mới
              </button>
            }
          </div>
        }

        <app-lecture-sections-panel
          [sections]="lesson().sections || []"
          [activeSectionId]="editorSvc.editingSectionId()"
          (createSection)="createSection.emit($event)"
          (batchVideoUpload)="batchVideoUpload.emit()"
          (editSection)="editSection.emit($event)"
          (deleteSection)="deleteSection.emit($event)"
          (dropSection)="dropSection.emit($event)"
        >
        </app-lecture-sections-panel>

        @if (editorSvc.isSectionSurfaceOpen()) {
          <app-section-editor
            [lessonId]="lesson().id"
            [courseId]="courseId()"
            (saved)="sectionSaved.emit()"
            (closed)="sectionClosed.emit()"
            (batchVideoUpload)="batchVideoUpload.emit()"
          >
          </app-section-editor>
        }
      }

      @if (lessonType() === 'QUIZ') {
        <app-curriculum-assessment-summary
          accent="purple"
          eyebrow="Bài kiểm tra trong bài học"
          title="Thiết lập bài kiểm tra tại đây, quản lý câu hỏi ở trang riêng"
          [description]="quizFlowDescription()"
          [placementLabel]="placementLabel()"
          [audienceLabel]="audienceLabel()"
          [distributionLabel]="distributionLabel()"
          actionLabel="Mở trang quản lý bài kiểm tra"
          (actionClick)="goToQuizBuilder.emit()"
        >
        </app-curriculum-assessment-summary>

        <app-curriculum-quiz-manager
          [timeLimit]="quizTimeLimit()"
          [passingScore]="quizPassingScore()"
          [maxAttempts]="quizMaxAttempts()"
          [questions]="quizQuestions()"
          [loading]="quizQuestionsLoading()"
          (timeLimitChange)="quizTimeLimitChange.emit(+$event)"
          (passingScoreChange)="quizPassingScoreChange.emit(+$event)"
          (maxAttemptsChange)="quizMaxAttemptsChange.emit(+$event)"
        >
        </app-curriculum-quiz-manager>
      }

      @if (lessonType() === 'ASSIGNMENT') {
        <app-curriculum-assessment-summary
          accent="green"
          eyebrow="Bài tập trong bài học"
          title="Thiết lập bài tập tại đây, giao bài cho học viên ở trang riêng"
          [description]="assignmentFlowDescription()"
          [placementLabel]="placementLabel()"
          [audienceLabel]="audienceLabel()"
          [distributionLabel]="distributionLabel()"
          actionLabel="Mở cài đặt bài tập"
          (actionClick)="goToAssignmentSettings.emit()"
        >
        </app-curriculum-assessment-summary>

        <app-curriculum-assignment-details
          [description]="assignmentDescription()"
          [instructions]="assignmentInstructions()"
          [dueDate]="assignmentDueDate()"
          [maxScore]="assignmentMaxScore()"
          (descriptionChange)="assignmentDescriptionChange.emit($event)"
          (instructionsChange)="assignmentInstructionsChange.emit($event)"
          (dueDateChange)="assignmentDueDateChange.emit($event)"
          (maxScoreChange)="assignmentMaxScoreChange.emit(+$event)"
        >
        </app-curriculum-assignment-details>
      }

      <app-competency-panel [lessonId]="lesson().id" />

      <div class="lesson-footer">
        @if (saveStatusHint(); as hint) {
          <span class="unsaved-hint" [class.unsaved-hint--cascade]="hint.cascade">
            @if (hint.cascade) {
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            } @else {
              <span class="unsaved-hint__dot"></span>
            }
            {{ hint.label }}
          </span>
        }
        <button
          type="button"
          (click)="saveClicked.emit()"
          data-wiii-id="save-lesson"
          [disabled]="isSaving() || !title().trim()"
          [title]="saveButtonTooltip()"
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
          {{ saveButtonLabel() }}
        </button>
      </div>
    </div>
  `,
})
export class LessonEditorComponent {
  readonly isLoading = input(false);
  readonly editorSvc = inject(CurriculumEditorService);

  readonly lesson = input.required<LessonDraftDTO>();
  readonly courseId = input.required<string>();
  readonly chapterTitle = input('');
  readonly chapterLabel = input('');
  readonly lessonLabel = input('');
  readonly isSaving = input(false);
  readonly isDirty = input(false);

  readonly title = signal('');

  // SOTA save UX (Notion / Linear / Canvas pattern): button label + status
  // hint reflect cascade behavior — khi section editor đang dirty, "Lưu
  // thay đổi" sẽ save section trước rồi save lesson. Honest UI = label
  // hiển thị đúng những gì sẽ được lưu, không silently skip.
  readonly hasDirtySection = computed(() =>
    this.editorSvc.isSectionSurfaceOpen() && this.editorSvc.isDirty()
  );
  readonly saveButtonLabel = computed(() =>
    this.hasDirtySection() ? 'Lưu mục + bài học' : 'Lưu thay đổi'
  );
  readonly saveButtonTooltip = computed(() => {
    if (this.hasDirtySection()) {
      return 'Lưu nội dung mục đang sửa, sau đó lưu bài học';
    }
    return this.isDirty() ? 'Lưu các thay đổi của bài học' : 'Không có thay đổi cần lưu';
  });
  readonly saveStatusHint = computed(() => {
    const sectionDirty = this.hasDirtySection();
    if (sectionDirty) {
      return { label: 'Có thay đổi trong mục đang sửa', cascade: true };
    }
    if (this.isDirty()) {
      return { label: 'Có thay đổi chưa lưu', cascade: false };
    }
    return null;
  });

  readonly quizTimeLimit = input(30);
  readonly quizPassingScore = input(60);
  readonly quizMaxAttempts = input(1);
  readonly quizQuestions = input<any[]>([]);
  readonly quizQuestionsLoading = input(false);

  readonly assignmentDescription = input('');
  readonly assignmentInstructions = input('');
  readonly assignmentDueDate = input('');
  readonly assignmentMaxScore = input(100);

  readonly quizFlowDescription = input('');
  readonly assignmentFlowDescription = input('');
  readonly placementLabel = input('');
  readonly audienceLabel = input('');
  readonly distributionLabel = input('');
  readonly legacyVideoCopy = input('');

  readonly titleChange = output<string>();
  readonly saveClicked = output<void>();
  readonly backClicked = output<void>();

  readonly createSection = output<string>();
  readonly batchVideoUpload = output<void>();
  readonly editSection = output<SectionDraftDTO>();
  readonly deleteSection = output<string>();
  readonly dropSection = output<CdkDragDrop<SectionDraftDTO[]>>();
  readonly sectionSaved = output<void>();
  readonly sectionClosed = output<void>();

  readonly goToQuizBuilder = output<void>();
  readonly quizTimeLimitChange = output<number>();
  readonly quizPassingScoreChange = output<number>();
  readonly quizMaxAttemptsChange = output<number>();

  readonly goToAssignmentSettings = output<void>();
  readonly assignmentDescriptionChange = output<string>();
  readonly assignmentInstructionsChange = output<string>();
  readonly assignmentDueDateChange = output<string>();
  readonly assignmentMaxScoreChange = output<number>();

  readonly lessonType = computed(() => {
    const type = (this.lesson().type || 'LECTURE').toUpperCase();
    if (type === 'QUIZ' || type === 'ASSIGNMENT') return type;
    return 'LECTURE';
  });

  readonly hasVideoSections = computed(() =>
    (this.lesson().sections || []).some(section => section.type === 'VIDEO')
  );

  constructor() {
    effect(() => {
      const lesson = this.lesson();
      this.title.set(this.stripLessonPrefix(lesson.title || ''));
    });
  }

  hasLegacyVideo(): boolean {
    const lesson = this.lesson();
    return !!(lesson.videoUrl || lesson.streamVideoUid);
  }

  onTitleChange(value: string): void {
    this.title.set(value);
    this.titleChange.emit(value);
  }

  private stripLessonPrefix(title: string): string {
    return stripCurriculumPrefix(title, 'lesson');
  }

  getTypeLabel(): string {
    switch (this.lessonType()) {
      case 'QUIZ': return 'Bài kiểm tra';
      case 'ASSIGNMENT': return 'Bài tập';
      default: return 'Bài giảng';
    }
  }

  getTypeBgClass(): string {
    switch (this.lessonType()) {
      case 'QUIZ': return 'bg-purple-100';
      case 'ASSIGNMENT': return 'bg-green-100';
      default: return 'bg-[#0056D2]/10';
    }
  }

  getTypeTextClass(): string {
    switch (this.lessonType()) {
      case 'QUIZ': return 'text-purple-600';
      case 'ASSIGNMENT': return 'text-green-600';
      default: return 'text-[#0056D2]';
    }
  }
}
