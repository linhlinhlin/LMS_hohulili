import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { QuizApi } from '../../../../../../api/endpoints/quiz.api';
import { PackageApi } from '../../../../../../api/endpoints/package.api';
import { ToastService } from '../../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../../core/services/confirm-dialog.service';

/**
 * Manages quiz question state for the curriculum editor.
 * Extracted from CourseCurriculumComponent to reduce its size.
 */
@Injectable()
export class QuizManagerState {
  private quizApi = inject(QuizApi);
  private packageApi = inject(PackageApi);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  // Lesson quiz questions
  readonly quizQuestions = signal<any[]>([]);
  readonly quizQuestionsLoading = signal(false);

  // Quiz packages (question banks)
  readonly quizPackages = signal<any[]>([]);
  selectedPackageId = '';
  readonly packageQuestions = signal<any[]>([]);
  readonly selectedQuestionIds = signal<Set<string>>(new Set());

  // Modals
  readonly showAddQuestionsModal = signal(false);
  readonly showRandomModal = signal(false);
  readonly randomCount = signal(10);

  // Section quiz fields
  sectionQuizType: 'ASSESSMENT' | 'EXAM' = 'ASSESSMENT';
  sectionQuizTimeLimit = 30;
  sectionQuizPassingScore = 60;
  sectionQuizMaxAttempts = 1;
  sectionQuizShuffleQuestions = true;
  sectionQuizShuffleOptions = true;
  sectionQuizShowResults = true;
  readonly sectionQuizSelectedQuestions = signal<any[]>([]);
  readonly showSectionQuizBankModal = signal(false);
  readonly showSectionQuizRandomModal = signal(false);
  readonly sectionQuizRandomCount = signal(5);

  // In-context question creation
  readonly showCreateQuestionModal = signal(false);

  async loadQuizPackages(): Promise<void> {
    try {
      const packages = await firstValueFrom(this.packageApi.getMyPackages());
      this.quizPackages.set(packages || []);
    } catch {
      this.quizPackages.set([]);
    }
  }

  async loadQuizQuestions(lessonId: string): Promise<void> {
    this.quizQuestionsLoading.set(true);
    try {
      const response = await firstValueFrom(this.quizApi.getQuizQuestions(lessonId));
      const questions = Array.isArray(response) ? response : (response as any).data || [];
      this.quizQuestions.set(questions.map((q: any) => ({
        id: q.id, content: q.content, difficulty: q.difficulty,
        tags: q.tags, correctOption: q.correctOption, options: q.options || []
      })));
    } catch {
      this.quizQuestions.set([]);
    } finally {
      this.quizQuestionsLoading.set(false);
    }
  }

  async loadPackageQuestions(): Promise<void> {
    if (!this.selectedPackageId) {
      this.packageQuestions.set([]);
      return;
    }
    try {
      const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(this.selectedPackageId));
      this.packageQuestions.set(questions || []);
      this.selectedQuestionIds.set(new Set());
    } catch {
      this.packageQuestions.set([]);
    }
  }

  selectAllQuestions(): void {
    this.selectedQuestionIds.set(new Set(this.packageQuestions().map((q: any) => q.id)));
  }

  clearQuestionSelection(): void {
    this.selectedQuestionIds.set(new Set());
  }

  toggleQuestionSelection(questionId: string): void {
    const newSet = new Set(this.selectedQuestionIds());
    newSet.has(questionId) ? newSet.delete(questionId) : newSet.add(questionId);
    this.selectedQuestionIds.set(newSet);
  }

  async addSelectedQuestionsToQuiz(lessonId: string): Promise<void> {
    if (this.selectedQuestionIds().size === 0) return;
    try {
      for (const questionId of this.selectedQuestionIds()) {
        await firstValueFrom(this.quizApi.addQuestionToQuiz(lessonId, questionId));
      }
      await this.loadQuizQuestions(lessonId);
      this.showAddQuestionsModal.set(false);
      this.selectedQuestionIds.set(new Set());
      this.selectedPackageId = '';
      this.packageQuestions.set([]);
    } catch (error) {
      this.toastService.error('Không thể thêm câu hỏi vào quiz');
    }
  }

  async removeQuestionFromQuiz(lessonId: string, questionId: string): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa câu hỏi',
      message: 'Bạn chắc chắn muốn xóa câu hỏi này?',
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;
    try {
      await firstValueFrom(this.quizApi.removeQuestionFromQuiz(lessonId, questionId));
      await this.loadQuizQuestions(lessonId);
    } catch (error) {
      this.toastService.error('Không thể xóa câu hỏi khỏi quiz');
    }
  }

  // Random questions
  openRandomizeModal(): void {
    this.showRandomModal.set(true);
    this.selectedPackageId = '';
    this.randomCount.set(1);
  }

  onRandomPackageChange(): void {
    this.randomCount.set(1);
  }

  getSelectedPackageCount(): number {
    return this.quizPackages().find(p => p.id === this.selectedPackageId)?.questionCount || 0;
  }

  updateRandomCount(delta: number): void {
    const max = this.getSelectedPackageCount();
    let newVal = this.randomCount() + delta;
    this.randomCount.set(Math.max(1, Math.min(newVal, max)));
  }

  validateRandomCount(value: number): void {
    const max = this.getSelectedPackageCount();
    this.randomCount.set(Math.max(1, Math.min(value, max)));
  }

  async generateRandomQuestions(lessonId: string): Promise<void> {
    if (!this.selectedPackageId) return;
    this.quizQuestionsLoading.set(true);
    try {
      const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(this.selectedPackageId));
      if (!questions?.length) {
        this.toastService.warning('Gói câu hỏi này không có dữ liệu!');
        return;
      }
      const selected = questions.sort(() => 0.5 - Math.random()).slice(0, this.randomCount());
      for (const q of selected) {
        try { await firstValueFrom(this.quizApi.addQuestionToQuiz(lessonId, q.id)); } catch {}
      }
      this.showRandomModal.set(false);
      await this.loadQuizQuestions(lessonId);
      this.selectedPackageId = '';
    } catch {
      this.toastService.error('Lỗi xảy ra khi tạo câu hỏi ngẫu nhiên.');
    } finally {
      this.quizQuestionsLoading.set(false);
    }
  }

  // Section quiz methods
  openSectionQuizBankModal(): void {
    this.showSectionQuizBankModal.set(true);
    this.selectedPackageId = '';
    this.packageQuestions.set([]);
    this.selectedQuestionIds.set(new Set());
  }

  openSectionQuizRandomModal(): void {
    this.showSectionQuizRandomModal.set(true);
    this.selectedPackageId = '';
    this.sectionQuizRandomCount.set(5);
  }

  async addSectionQuizQuestionsFromBank(): Promise<void> {
    if (this.selectedQuestionIds().size === 0) return;
    const questionIds = Array.from(this.selectedQuestionIds());
    const selectedQuestions = this.packageQuestions().filter(q => questionIds.includes(q.id));
    const currentIds = new Set(this.sectionQuizSelectedQuestions().map(q => q.id));
    const newQuestions = selectedQuestions.filter(q => !currentIds.has(q.id));
    this.sectionQuizSelectedQuestions.update(current => [...current, ...newQuestions]);
    this.showSectionQuizBankModal.set(false);
    this.selectedQuestionIds.set(new Set());
  }

  async generateSectionQuizRandomQuestions(): Promise<void> {
    if (!this.selectedPackageId) return;
    try {
      const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(this.selectedPackageId));
      if (!questions?.length) {
        this.toastService.warning('Gói câu hỏi này không có dữ liệu!');
        return;
      }
      const selected = questions.sort(() => 0.5 - Math.random()).slice(0, this.sectionQuizRandomCount());
      const currentIds = new Set(this.sectionQuizSelectedQuestions().map(q => q.id));
      const newQuestions = selected.filter((q: any) => !currentIds.has(q.id));
      this.sectionQuizSelectedQuestions.update(current => [...current, ...newQuestions]);
      this.showSectionQuizRandomModal.set(false);
    } catch {
      this.toastService.error('Lỗi khi tạo câu hỏi ngẫu nhiên.');
    }
  }

  removeSectionQuizQuestion(questionId: string): void {
    this.sectionQuizSelectedQuestions.update(current => current.filter(q => q.id !== questionId));
  }

  decreaseSectionQuizRandomCount(): void {
    const current = this.sectionQuizRandomCount();
    if (current > 1) this.sectionQuizRandomCount.set(current - 1);
  }

  increaseSectionQuizRandomCount(): void {
    this.sectionQuizRandomCount.update(v => v + 1);
  }

  resetSectionQuizFields(): void {
    this.sectionQuizType = 'ASSESSMENT';
    this.sectionQuizTimeLimit = 30;
    this.sectionQuizPassingScore = 60;
    this.sectionQuizMaxAttempts = 1;
    this.sectionQuizShuffleQuestions = true;
    this.sectionQuizShuffleOptions = true;
    this.sectionQuizShowResults = true;
    this.sectionQuizSelectedQuestions.set([]);
  }

  hydrateSectionQuizData(quizData: any): void {
    if (quizData) {
      this.sectionQuizTimeLimit = quizData.timeLimitMinutes || 30;
      this.sectionQuizPassingScore = quizData.passingScore || 60;
      this.sectionQuizMaxAttempts = quizData.maxAttempts || 1;
      this.sectionQuizShuffleQuestions = quizData.shuffleQuestions ?? true;
      this.sectionQuizShuffleOptions = quizData.shuffleOptions ?? true;
      this.sectionQuizShowResults = quizData.showResultsImmediately ?? true;
      if (quizData.questions?.length > 0) {
        this.sectionQuizSelectedQuestions.set(quizData.questions.map((q: any) => ({ id: q.id, content: q.content })));
      } else {
        this.sectionQuizSelectedQuestions.set([]);
      }
    } else {
      this.resetSectionQuizFields();
    }
  }

  buildQuizPayload(): any {
    return {
      quizType: this.sectionQuizType,
      timeLimitMinutes: this.sectionQuizTimeLimit,
      passingScore: this.sectionQuizPassingScore,
      maxAttempts: this.sectionQuizType === 'EXAM' ? this.sectionQuizMaxAttempts : 999,
      shuffleQuestions: this.sectionQuizShuffleQuestions,
      shuffleOptions: this.sectionQuizShuffleOptions,
      showResultsImmediately: this.sectionQuizShowResults,
      questionIds: this.sectionQuizSelectedQuestions().map(q => q.id)
    };
  }
}
