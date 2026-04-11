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
import { LessonDraftDTO, SectionDraftDTO } from '../../../../services/course-authoring.service';
import { CurriculumEditorService } from '../../../../services/curriculum-editor.service';
import { LectureSectionsPanelComponent } from '../lecture-sections-panel/lecture-sections-panel.component';
import { CurriculumAssessmentSummaryComponent } from '../curriculum-assessment-summary/curriculum-assessment-summary.component';
import { CurriculumAssignmentDetailsComponent } from '../curriculum-assignment-details/curriculum-assignment-details.component';
import { CurriculumQuizManagerComponent } from '../curriculum-quiz-manager/curriculum-quiz-manager.component';
import { SectionEditorComponent } from '../section-editor/section-editor.component';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';

/**
 * Lesson Editor — focused component for editing a single lesson.
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
  ],
  template: `
    <div class="editor-workspace-card bg-white shadow-sm border border-gray-200 flex-grow overflow-hidden flex flex-col">

      @if (isLoading()) {
        <!-- Skeleton -->
        <div class="p-6 space-y-4 animate-pulse">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div class="space-y-2 flex-1">
              <div class="h-5 bg-gray-200 rounded w-1/4"></div>
              <div class="h-3 bg-gray-100 rounded w-1/5"></div>
            </div>
          </div>
          <div class="h-10 bg-gray-200 rounded-lg w-full"></div>
          <div class="space-y-3">
            <div class="h-32 bg-gray-100 rounded-xl w-full"></div>
            <div class="grid grid-cols-3 gap-2">
              <div class="h-20 bg-gray-100 rounded-lg"></div>
              <div class="h-20 bg-gray-100 rounded-lg"></div>
              <div class="h-20 bg-gray-100 rounded-lg"></div>
            </div>
          </div>
        </div>
      } @else {

      <!-- ═══ Header ═══ -->
      <div class="editor-workspace-card__header px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center"
               [class]="getTypeBgClass()">
            <svg class="w-5 h-5" [class]="getTypeTextClass()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              @switch (lessonType()) {
                @case ('QUIZ') {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01" />
                }
                @case ('ASSIGNMENT') {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                }
                @default {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                }
              }
            </svg>
          </div>
          <div class="min-w-0">
            <h2 class="text-lg font-semibold text-gray-900 truncate">{{ getTypeLabel() }}</h2>
            <p class="text-sm text-gray-500 truncate">{{ lesson().title }}</p>
          </div>
        </div>
      </div>

      <!-- ═══ Body ═══ -->
      <div class="editor-workspace-card__body p-6 space-y-4 flex-1 overflow-y-auto">

        <!-- Title (shared) -->
        <div>
          <label for="lesson-title" class="block text-sm font-medium text-gray-700 mb-2">
            Tiêu đề <span class="text-red-500">*</span>
          </label>
          <input id="lesson-title" type="text"
            [value]="title()"
            (input)="onTitleChange($any($event.target).value)"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                   focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] transition-colors"
            placeholder="Nhập tiêu đề bài học..." />
        </div>

        <!-- ═══ LECTURE ═══ -->
        @if (lessonType() === 'LECTURE') {
          <div class="space-y-4">
            <!-- Legacy video warning -->
            @if (hasLegacyVideo()) {
              <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-amber-900">Video legacy ở cấp bài học</p>
                    <p class="mt-1 text-sm text-amber-800">{{ legacyVideoCopy() }}</p>
                  </div>
                  @if (!hasVideoSections()) {
                    <button type="button"
                      (click)="createSection.emit('VIDEO')"
                      class="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900 transition hover:bg-amber-100">
                      Tạo mục video chuẩn mới
                    </button>
                  }
                </div>
              </div>
            }

            <!-- Sections panel -->
            <app-lecture-sections-panel
              [sections]="lesson().sections || []"
              (createSection)="createSection.emit($event)"
              (editSection)="editSection.emit($event)"
              (deleteSection)="deleteSection.emit($event)"
              (dropSection)="dropSection.emit($event)">
            </app-lecture-sections-panel>

            <!-- Inline section editor -->
            @if (editorSvc.isSectionSurfaceOpen()) {
              <app-section-editor
                [lessonId]="lesson().id"
                [courseId]="courseId()"
                (saved)="sectionSaved.emit()"
                (closed)="sectionClosed.emit()">
              </app-section-editor>
            }
          </div>
        }

        <!-- ═══ QUIZ ═══ -->
        @if (lessonType() === 'QUIZ') {
          <div class="flex flex-col gap-6">
            <app-curriculum-assessment-summary
              accent="purple"
              eyebrow="Bài kiểm tra trong bài học"
              title="Giữ cấu hình chính ở bài học, chuyển quản lý câu hỏi sang builder"
              [description]="quizFlowDescription()"
              [placementLabel]="placementLabel()"
              [audienceLabel]="audienceLabel()"
              [distributionLabel]="distributionLabel()"
              actionLabel="Mở builder bài kiểm tra"
              (actionClick)="goToQuizBuilder.emit()">
            </app-curriculum-assessment-summary>

            <app-curriculum-quiz-manager
              [timeLimit]="quizTimeLimit()"
              [passingScore]="quizPassingScore()"
              [maxAttempts]="quizMaxAttempts()"
              [questions]="quizQuestions()"
              [loading]="quizQuestionsLoading()"
              (timeLimitChange)="quizTimeLimitChange.emit(+$event)"
              (passingScoreChange)="quizPassingScoreChange.emit(+$event)"
              (maxAttemptsChange)="quizMaxAttemptsChange.emit(+$event)">
            </app-curriculum-quiz-manager>
          </div>
        }

        <!-- ═══ ASSIGNMENT ═══ -->
        @if (lessonType() === 'ASSIGNMENT') {
          <div class="space-y-4">
            <app-curriculum-assessment-summary
              accent="green"
              eyebrow="Bài tập trong bài học"
              title="Giữ tiêu chí mặc định ở bài học, tách riêng phần giao cho người học"
              [description]="assignmentFlowDescription()"
              [placementLabel]="placementLabel()"
              [audienceLabel]="audienceLabel()"
              [distributionLabel]="distributionLabel()"
              actionLabel="Mở cài đặt bài tập"
              (actionClick)="goToAssignmentSettings.emit()">
            </app-curriculum-assessment-summary>

            <app-curriculum-assignment-details
              [description]="assignmentDescription()"
              [instructions]="assignmentInstructions()"
              [dueDate]="assignmentDueDate()"
              [maxScore]="assignmentMaxScore()"
              (descriptionChange)="assignmentDescriptionChange.emit($event)"
              (instructionsChange)="assignmentInstructionsChange.emit($event)"
              (dueDateChange)="assignmentDueDateChange.emit($event)"
              (maxScoreChange)="assignmentMaxScoreChange.emit(+$event)">
            </app-curriculum-assignment-details>
          </div>
        }
      </div>

      <!-- ═══ Footer ═══ -->
      <div class="editor-workspace-card__footer px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
        <button type="button" (click)="backClicked.emit()"
          class="text-gray-600 hover:text-gray-800 text-sm transition-colors">
          Quay lại
        </button>
        <button type="button" (click)="saveClicked.emit()"
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
      }
    </div>
  `,
})
export class LessonEditorComponent {
  readonly isLoading = input(false);
  readonly editorSvc = inject(CurriculumEditorService);

  // Core inputs
  readonly lesson = input.required<LessonDraftDTO>();
  readonly courseId = input.required<string>();
  readonly isSaving = input(false);

  // Lesson form state (managed by parent, passed as inputs)
  readonly title = signal('');

  // Quiz inputs (from parent)
  readonly quizTimeLimit = input(30);
  readonly quizPassingScore = input(60);
  readonly quizMaxAttempts = input(1);
  readonly quizQuestions = input<any[]>([]);
  readonly quizQuestionsLoading = input(false);

  // Assignment inputs (from parent)
  readonly assignmentDescription = input('');
  readonly assignmentInstructions = input('');
  readonly assignmentDueDate = input('');
  readonly assignmentMaxScore = input(100);

  // Context labels (from parent)
  readonly quizFlowDescription = input('');
  readonly assignmentFlowDescription = input('');
  readonly placementLabel = input('');
  readonly audienceLabel = input('');
  readonly distributionLabel = input('');
  readonly legacyVideoCopy = input('');

  // Core outputs
  readonly titleChange = output<string>();
  readonly saveClicked = output<void>();
  readonly backClicked = output<void>();

  // Section outputs (LECTURE type)
  readonly createSection = output<string>();
  readonly editSection = output<SectionDraftDTO>();
  readonly deleteSection = output<string>();
  readonly dropSection = output<CdkDragDrop<SectionDraftDTO[]>>();
  readonly sectionSaved = output<void>();
  readonly sectionClosed = output<void>();

  // Quiz outputs
  readonly goToQuizBuilder = output<void>();
  readonly quizTimeLimitChange = output<number>();
  readonly quizPassingScoreChange = output<number>();
  readonly quizMaxAttemptsChange = output<number>();

  // Assignment outputs
  readonly goToAssignmentSettings = output<void>();
  readonly assignmentDescriptionChange = output<string>();
  readonly assignmentInstructionsChange = output<string>();
  readonly assignmentDueDateChange = output<string>();
  readonly assignmentMaxScoreChange = output<number>();

  // Derived
  readonly lessonType = computed(() => {
    const type = (this.lesson().type || 'LECTURE').toUpperCase();
    if (type === 'QUIZ' || type === 'ASSIGNMENT') return type;
    return 'LECTURE';
  });

  readonly hasVideoSections = computed(() =>
    (this.lesson().sections || []).some(s => s.type === 'VIDEO')
  );

  constructor() {
    effect(() => {
      const lesson = this.lesson();
      this.title.set(lesson.title || '');
    });
  }

  hasLegacyVideo(): boolean {
    const l = this.lesson();
    return !!(l.videoUrl || l.streamVideoUid);
  }

  onTitleChange(value: string): void {
    this.title.set(value);
    this.titleChange.emit(value);
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
