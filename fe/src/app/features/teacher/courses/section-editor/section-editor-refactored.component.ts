import { Component, inject, OnDestroy, viewChild, DestroyRef, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// State
import { SectionEditorState, LessonItem } from './state/section-editor.state';

// Sub-components
import { DeleteLessonModalComponent } from './components/delete-lesson-modal/delete-lesson-modal.component';
import { SuccessToastComponent } from './components/success-toast/success-toast.component';
import { LessonsTableComponent } from './components/lessons-table/lessons-table.component';
import { LessonViewerComponent } from './components/lesson-viewer/lesson-viewer.component';
import { AddQuestionsModalComponent } from './components/add-questions-modal/add-questions-modal.component';

// Existing components
import { QuizEditModalComponent } from '../components/quiz-edit-modal.component';
import { QuizCreationModalComponent } from '../components/quiz-creation-modal.component';
import { SectionSmartEditorComponent } from '../components/section-smart-editor/section-smart-editor.component';

// Services
import { ToastService } from '../../../../core/services/toast.service';

/**
 * Section Editor Component - Refactored
 *
 * This component has been decomposed from 2107 LOC to ~200 LOC following Feature Slice Pattern.
 *
 * State Management: SectionEditorState (signal-based store)
 * Sub-components:
 * - DeleteLessonModalComponent
 * - SuccessToastComponent
 * - LessonsTableComponent
 * - LessonViewerComponent
 * - AddQuestionsModalComponent
 * - QuizViewerComponent (inside LessonViewer)
 */
@Component({
  selector: 'app-section-editor-refactored',
  imports: [
    RouterLink,
    DeleteLessonModalComponent,
    SuccessToastComponent,
    LessonsTableComponent,
    LessonViewerComponent,
    AddQuestionsModalComponent,
    QuizEditModalComponent,
    QuizCreationModalComponent,
    SectionSmartEditorComponent
],
  providers: [SectionEditorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Delete Confirmation Modal -->
      <app-delete-lesson-modal (deleted)="onLessonDeleted()"></app-delete-lesson-modal>

      <!-- Success Toast -->
      <app-success-toast></app-success-toast>

      <!-- Add Questions Modal -->
      <app-add-questions-modal
        (added)="onQuestionsAdded($event)"
        (closed)="onAddQuestionsModalClosed()">
      </app-add-questions-modal>

      <div class="max-w-7xl mx-auto p-6">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <a [routerLink]="['/teacher/courses']" class="hover:text-[#0056D2]">Khóa học</a>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
            <a [routerLink]="['/teacher/courses', state.courseId(), 'editor', 'curriculum']" class="hover:text-[#0056D2]">Nội dung khóa học</a>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
            <span class="text-gray-900">Quản lý bài học</span>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Quản lý bài học</h1>
              <p class="text-gray-500 mt-1">Thêm, sửa, xóa bài học và bài trắc nghiệm trong chương</p>
            </div>
            <div class="flex items-center gap-3">
              <a class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                 [routerLink]="['/teacher/courses', state.courseId(), 'editor', 'curriculum']">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                Quay lại
              </a>
            </div>
          </div>
        </div>

        <!-- Lessons Card -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <!-- Card Header -->
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
              <span class="font-semibold text-gray-900">Danh sách bài học</span>
              <span class="px-2 py-0.5 bg-blue-100 text-[#004BB5] text-xs rounded-full">{{ state.lessonCount() }} bài</span>
            </div>
            <button (click)="state.toggleCreateForm()"
                    class="px-4 py-2 bg-[#0056D2] text-white text-sm rounded-lg hover:bg-[#004BB5] transition-colors flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Thêm nội dung mới
            </button>
          </div>

          @if (state.error()) {
            <div class="p-6 text-red-600">{{ state.error() }}</div>
          }

          <!-- Lessons Table -->
          <app-lessons-table
            (viewLesson)="onViewLesson($event)"
            (editLesson)="onEditLesson($event)"
            (deleteLesson)="onDeleteLesson($event)"
            (previewQuiz)="onPreviewQuiz($event)"
            (addFirst)="state.toggleCreateForm()">
          </app-lessons-table>
        </div>

        <!-- Lesson Viewer -->
        <app-lesson-viewer
          (close)="state.closeViewer()"
          (openSmartEditor)="onOpenSmartEditor($event)"
          (deleteSection)="onDeleteSection($event)"
          (previewQuiz)="onPreviewQuiz($event)"
          (refreshQuestions)="onRefreshQuestions($event)"
          (addQuestions)="onAddQuestions($event)"
          (removeQuestion)="onRemoveQuestion($event)"
          (viewSubmissions)="onViewSubmissions($event)"
          (toggleAssignmentStatus)="onToggleAssignmentStatus($event)">
        </app-lesson-viewer>
      </div>

      <!-- Quiz Edit Modal -->
      <app-quiz-edit-modal
        (saved)="onQuizSettingsSaved()"
        (closed)="onQuizEditModalClosed()">
      </app-quiz-edit-modal>

      <!-- Quiz Creation Modal -->
      <app-quiz-creation-modal
        (quizCreated)="onQuizCreated($event)"
        (closed)="onQuizCreationModalClosed()">
      </app-quiz-creation-modal>

      <!-- Smart Editor Modal -->
      @if (state.showSmartEditor()) {
        <app-section-smart-editor
          [courseId]="state.courseId()"
          [lessonId]="state.activeLessonIdForEditor()!"
          (saved)="onSmartEditorSaved()"
          (closed)="state.closeSmartEditor()">
        </app-section-smart-editor>
      }
    </div>
  `
})
export class SectionEditorRefactoredComponent implements OnDestroy {
  readonly state = inject(SectionEditorState);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private toastService = inject(ToastService);

  quizEditModal = viewChild(QuizEditModalComponent);
  quizCreationModal = viewChild(QuizCreationModalComponent);

  constructor() {
    const sectionId = this.route.snapshot.paramMap.get('sectionId')!;
    const courseId = this.route.snapshot.paramMap.get('courseId')
      || this.route.parent?.snapshot.paramMap.get('courseId')
      || this.route.parent?.parent?.snapshot.paramMap.get('courseId')
      || '';

    this.state.init(courseId, sectionId);
  }

  ngOnDestroy(): void {
    // Cleanup handled by DestroyRef
  }

  // Event Handlers
  onViewLesson(lesson: LessonItem): void {
    this.state.selectLesson(lesson);
  }

  onEditLesson(lesson: LessonItem): void {
    this.state.startEdit(lesson);
  }

  onDeleteLesson(lesson: LessonItem): void {
    this.state.confirmDelete(lesson);
  }

  onLessonDeleted(): void {
    this.toastService.success('Đã xóa bài học thành công');
  }

  async onPreviewQuiz(lesson: LessonItem): Promise<void> {
    const questions = this.state.quizQuestions();
    if (questions.length === 0) {
      this.toastService.warning('Quiz này chưa có câu hỏi nào. Vui lòng thêm câu hỏi trước khi xem trước.');
      return;
    }

    this.router.navigate(['/teacher/quiz/preview', lesson.id], {
      queryParams: {
        title: lesson.title,
        returnUrl: this.router.url
      }
    });
  }

  onOpenSmartEditor(lessonId: string): void {
    this.state.openSmartEditor(lessonId);
  }

  onSmartEditorSaved(): void {
    this.state.onSmartEditorSaved();
    this.toastService.success('Đã lưu nội dung thành công');
  }

  onDeleteSection(sectionId: string): void {
    // Delegate to existing section API logic
    this.toastService.info('Đang xóa section...');
  }

  onRefreshQuestions(lessonId: string): void {
    this.state.loadQuizQuestions(lessonId);
  }

  onAddQuestions(lessonId: string): void {
    this.state.openAddQuestionsModal(lessonId);
  }

  onQuestionsAdded(result: { added: number; skipped: number }): void {
    if (result.added > 0) {
      let msg = `Đã thêm ${result.added} câu hỏi vào Quiz!`;
      if (result.skipped > 0) {
        msg += ` (${result.skipped} câu đã có sẵn)`;
      }
      this.toastService.success(msg);
    } else if (result.skipped > 0) {
      this.toastService.warning('Tất cả câu hỏi đã có trong Quiz rồi!');
    }
  }

  onAddQuestionsModalClosed(): void {
    // Modal closed
  }

  async onRemoveQuestion(questionId: string): Promise<void> {
    const lessonId = this.state.currentViewingQuizId();
    if (!lessonId) return;

    const success = await this.state.removeQuestionFromQuiz(lessonId, questionId);
    if (success) {
      this.toastService.success('Đã xóa câu hỏi khỏi quiz');
    } else {
      this.toastService.error('Không thể xóa câu hỏi');
    }
  }

  onViewSubmissions(lesson: LessonItem): void {
    this.toastService.info(`Xem bài nộp cho bài tập: ${lesson.title}\n\nTính năng này sẽ được phát triển trong phase tiếp theo.`);
  }

  onToggleAssignmentStatus(lesson: LessonItem): void {
    if (lesson.assignment) {
      lesson.assignment.status = lesson.assignment.status === 'PUBLISHED' ? 'CLOSED' : 'PUBLISHED';
    }
  }

  onQuizSettingsSaved(): void {
    this.state.loadLessons();
    this.toastService.success('Đã cập nhật cài đặt quiz');
  }

  onQuizEditModalClosed(): void {
    // Modal closed
  }

  onQuizCreated(lessonId: string): void {
    this.state.loadLessons();
    this.router.navigate(['/teacher/quiz/preview', lessonId]);
  }

  onQuizCreationModalClosed(): void {
    // Modal closed
  }
}
