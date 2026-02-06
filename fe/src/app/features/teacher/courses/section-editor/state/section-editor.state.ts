import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { LessonApi } from '../../../../../api/client/lesson.api';
import { LessonAttachmentApi } from '../../../../../api/client/lesson-attachment.api';
import { QuizApi } from '../../../../../api/endpoints/quiz.api';
import { PackageApi } from '../../../../../api/endpoints/package.api';
import { firstValueFrom } from 'rxjs';

export interface LessonItem {
  id: string;
  title: string;
  description?: string;
  lessonType: 'LECTURE' | 'ASSIGNMENT' | 'QUIZ';
  content?: string;
  videoUrl?: string;
  attachments?: any[];
  assignment?: any;
  sections?: any[];
  quizTimeLimit?: number;
  quizMaxScore?: number;
  quizMaxAttempts?: number;
}

export interface QuizQuestion {
  id: string;
  content: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags?: string;
  correctOption: string;
  options: { key: string; optionKey?: string; content: string }[];
}

/**
 * Signal-based Store for Section Editor
 * Extracted from section-editor.component.ts to follow Feature Slice Pattern
 */
@Injectable()
export class SectionEditorState {
  private destroyRef = inject(DestroyRef);
  private lessonApi = inject(LessonApi);
  private lessonAttachmentApi = inject(LessonAttachmentApi);
  private quizApi = inject(QuizApi);
  private packageApi = inject(PackageApi);

  // Core State
  courseId = signal<string>('');
  sectionId = signal<string>('');
  lessons = signal<LessonItem[]>([]);

  // Loading & Error States
  loading = signal(false);
  error = signal<string>('');
  opError = signal<string>('');

  // Selection State
  editingId = signal<string | null>(null);
  selected = signal<LessonItem | null>(null);

  // Create Form State
  showCreateForm = signal(false);
  isCreating = signal(false);

  // Delete Modal State
  showDeleteModal = signal(false);
  lessonToDelete = signal<LessonItem | null>(null);
  isDeleting = signal(false);
  showSuccessToast = signal(false);

  // Quiz State
  currentViewingQuizId = signal<string | null>(null);
  quizQuestions = signal<QuizQuestion[]>([]);
  quizQuestionsLoading = signal(false);
  quizPackages = signal<any[]>([]);

  // Smart Editor State
  showSmartEditor = signal(false);
  activeLessonIdForEditor = signal<string | null>(null);

  // Add Questions Modal State
  showInlineAddQuestionsModal = signal(false);
  inlineAddQuizLessonId = signal<string | null>(null);
  inlinePackageId = '';
  inlinePackageQuestions = signal<any[]>([]);
  selectedInlineQuestions = signal<string[]>([]);
  addingInlineQuestions = signal(false);

  // Attachment State
  expandedAttachment = signal<number | null>(null);

  // Computed
  lessonCount = computed(() => this.lessons().length);
  hasLessons = computed(() => this.lessons().length > 0);
  isQuizLesson = computed(() => this.selected()?.lessonType === 'QUIZ');
  isAssignmentLesson = computed(() => this.selected()?.lessonType === 'ASSIGNMENT');
  isLectureLesson = computed(() => {
    const lesson = this.selected();
    return !lesson?.lessonType || lesson.lessonType === 'LECTURE';
  });

  // Initialize
  init(courseId: string, sectionId: string): void {
    this.courseId.set(courseId);
    this.sectionId.set(sectionId);
    this.loadLessons();
  }

  // Load Lessons
  loadLessons(): void {
    const sectionId = this.sectionId();
    if (!sectionId) return;

    this.loading.set(true);
    this.lessonApi.listBySection(sectionId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.lessons.set(res?.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Không tải được danh sách bài học');
        this.loading.set(false);
      }
    });
  }

  // Select Lesson for Viewing
  selectLesson(lesson: LessonItem): void {
    this.editingId.set(null);
    this.selected.set(lesson);

    if (lesson.lessonType === 'QUIZ') {
      this.loadQuizQuestions(lesson.id);
      this.loadQuizPackages();
    }

    this.loadLessonAttachments(lesson.id);
  }

  // Close Viewer
  closeViewer(): void {
    this.selected.set(null);
    this.expandedAttachment.set(null);
  }

  // Start Editing
  startEdit(lesson: LessonItem): void {
    this.selected.set(null);
    this.expandedAttachment.set(null);
    this.editingId.set(lesson.id);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  // Delete Operations
  confirmDelete(lesson: LessonItem): void {
    this.lessonToDelete.set(lesson);
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.isDeleting.set(false);
    this.lessonToDelete.set(null);
  }

  async executeDelete(): Promise<void> {
    const lesson = this.lessonToDelete();
    if (!lesson) return;

    this.isDeleting.set(true);

    this.lessonApi.deleteLesson(lesson.id, this.courseId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.lessons.update(list => list.filter(i => i.id !== lesson.id));
        this.showDeleteModal.set(false);
        this.lessonToDelete.set(null);
        this.isDeleting.set(false);
        this.showSuccessToast.set(true);
        setTimeout(() => this.showSuccessToast.set(false), 3000);
      },
      error: (err) => {
        this.opError.set(err?.message || 'Xóa bài học thất bại');
        this.isDeleting.set(false);
      }
    });
  }

  // Quiz Operations
  async loadQuizQuestions(lessonId: string): Promise<void> {
    this.quizQuestionsLoading.set(true);
    this.currentViewingQuizId.set(lessonId);

    try {
      const response = await firstValueFrom(this.quizApi.getQuizQuestions(lessonId));
      const questions = Array.isArray(response) ? response : (response as any).data || [];

      this.quizQuestions.set(questions.map((q: any) => ({
        id: q.id,
        content: q.content,
        difficulty: q.difficulty,
        tags: q.tags,
        correctOption: q.correctOption,
        options: (q.options || []).sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0)).map((opt: any) => ({
          key: opt.optionKey || opt.key,
          optionKey: opt.optionKey || opt.key,
          content: opt.content
        }))
      })));
    } catch {
      this.quizQuestions.set([]);
    } finally {
      this.quizQuestionsLoading.set(false);
    }
  }

  async loadQuizPackages(): Promise<void> {
    try {
      const packages = await firstValueFrom(this.packageApi.getMyPackages());
      this.quizPackages.set(packages || []);
    } catch {
      this.quizPackages.set([]);
    }
  }

  async removeQuestionFromQuiz(lessonId: string, questionId: string): Promise<boolean> {
    try {
      await firstValueFrom(this.quizApi.removeQuestionFromQuiz(lessonId, questionId));
      await this.loadQuizQuestions(lessonId);
      return true;
    } catch {
      return false;
    }
  }

  // Add Questions Modal
  openAddQuestionsModal(lessonId: string): void {
    this.loadQuizPackages();
    this.inlineAddQuizLessonId.set(lessonId);
    this.showInlineAddQuestionsModal.set(true);
    this.inlinePackageId = '';
    this.inlinePackageQuestions.set([]);
    this.selectedInlineQuestions.set([]);
  }

  closeAddQuestionsModal(): void {
    this.showInlineAddQuestionsModal.set(false);
    this.inlineAddQuizLessonId.set(null);
    this.inlinePackageId = '';
    this.inlinePackageQuestions.set([]);
    this.selectedInlineQuestions.set([]);
  }

  async loadPackageQuestions(packageId: string): Promise<void> {
    if (!packageId) {
      this.inlinePackageQuestions.set([]);
      return;
    }

    try {
      const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(packageId));
      this.inlinePackageQuestions.set(Array.isArray(questions) ? questions : []);
    } catch {
      this.inlinePackageQuestions.set([]);
    }
  }

  toggleInlineQuestion(questionId: string): void {
    const current = this.selectedInlineQuestions();
    if (current.includes(questionId)) {
      this.selectedInlineQuestions.set(current.filter(id => id !== questionId));
    } else {
      this.selectedInlineQuestions.set([...current, questionId]);
    }
  }

  selectAllInlineQuestions(): void {
    const allIds = this.inlinePackageQuestions().map(q => q.id);
    if (this.selectedInlineQuestions().length === allIds.length) {
      this.selectedInlineQuestions.set([]);
    } else {
      this.selectedInlineQuestions.set(allIds);
    }
  }

  async addSelectedQuestionsToQuiz(): Promise<{ added: number; skipped: number }> {
    const lessonId = this.inlineAddQuizLessonId();
    const selectedIds = this.selectedInlineQuestions();

    if (!lessonId || selectedIds.length === 0) {
      return { added: 0, skipped: 0 };
    }

    this.addingInlineQuestions.set(true);
    let added = 0;
    let skipped = 0;

    try {
      for (const questionId of selectedIds) {
        try {
          await firstValueFrom(this.quizApi.addQuestionToQuiz(lessonId, questionId));
          added++;
        } catch (error: any) {
          if (error?.error?.message?.includes('đã tồn tại')) {
            skipped++;
          }
        }
      }

      await this.loadQuizQuestions(lessonId);
      this.selectedInlineQuestions.set([]);

      return { added, skipped };
    } finally {
      this.addingInlineQuestions.set(false);
    }
  }

  // Attachment Operations
  private loadLessonAttachments(lessonId: string): void {
    this.lessonAttachmentApi.getAttachments(lessonId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (attachments) => {
        this.selected.update(lesson => {
          if (lesson && lesson.id === lessonId) {
            return { ...lesson, attachments };
          }
          return lesson;
        });

        this.lessons.update(lessonList =>
          lessonList.map(l =>
            l.id === lessonId ? { ...l, attachments } : l
          )
        );
      },
      error: (err) => {
        this.opError.set(`Không thể tải attachments: ${err?.message || 'Lỗi không xác định'}`);
      }
    });
  }

  toggleAttachmentViewer(index: number): void {
    this.expandedAttachment.set(this.expandedAttachment() === index ? null : index);
  }

  // Smart Editor
  openSmartEditor(lessonId: string): void {
    this.activeLessonIdForEditor.set(lessonId);
    this.showSmartEditor.set(true);
  }

  closeSmartEditor(): void {
    this.showSmartEditor.set(false);
    this.activeLessonIdForEditor.set(null);
  }

  onSmartEditorSaved(): void {
    this.showSuccessToast.set(true);
    setTimeout(() => this.showSuccessToast.set(false), 3000);
    this.loadLessons();
  }

  // Create Form
  toggleCreateForm(): void {
    this.showCreateForm.update(show => !show);
    if (this.showCreateForm()) {
      this.selected.set(null);
      this.currentViewingQuizId.set(null);
      this.editingId.set(null);
    }
  }

  // Update lesson in list after edit
  updateLessonInList(lessonId: string, updates: Partial<LessonItem>): void {
    this.lessons.update(list =>
      list.map(l => l.id === lessonId ? { ...l, ...updates } : l)
    );
  }

  // Add new lesson to list
  addLessonToList(lesson: LessonItem): void {
    this.lessons.update(list => [...list, lesson]);
  }
}
