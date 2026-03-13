import { Component, signal, OnInit, inject, viewChild, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { QuestionApi, Question, QuestionImportResult } from '../../../api/endpoints/question.api';
import { QuestionBankApi } from '../../../api/endpoints/question-bank.api';
import {
  QuestionBankDTO,
  QuestionBankCategoryDTO,
  CreateBankRequest,
  BankQuestionDTO
} from '../../../api/types/question-bank.types';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { firstValueFrom, take } from 'rxjs';
import { QuestionImportModalComponent } from './components/question-import-modal.component';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-quiz-bank',
  imports: [CommonModule, FormsModule, QuestionImportModalComponent, LucideAngularModule],
  templateUrl: './quiz-bank.component.html',
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class QuizBankComponent implements OnInit {
  readonly importModal = viewChild.required(QuestionImportModalComponent);

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private questionApi = inject(QuestionApi);
  private questionBankApi = inject(QuestionBankApi);
  private quizApi = inject(QuizApi);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  // Bank state
  banks = signal<QuestionBankDTO[]>([]);
  selectedBankId = signal<string>('ALL');
  selectedBank = signal<QuestionBankDTO | null>(null);

  // Category state
  categoryTree = signal<QuestionBankCategoryDTO[]>([]);
  selectedCategoryId = signal<string | null>(null);
  flatCategories = signal<{ cat: QuestionBankCategoryDTO; depth: number }[]>([]);

  // Questions state
  questions = signal<(Question | BankQuestionDTO)[]>([]);
  filteredQuestions = signal<(Question | BankQuestionDTO)[]>([]);
  selectedQuestions = signal<string[]>([]);

  // Modal state
  showCreateBankModal = signal(false);
  showMoveModal = signal(false);
  showAddCategoryModal = signal(false);
  showManageBankMenu = signal(false);

  // Add to Quiz mode
  addToQuizLessonId: string | null = null;
  returnUrl: string | null = null;
  pendingSelectedQuestionId: string | null = null;
  addingToQuiz = signal<boolean>(false);

  // Create bank form
  newBank: CreateBankRequest = {
    name: '',
    description: '',
    subject: '',
    bankType: 'PERSONAL',
    visibility: 'PRIVATE'
  };

  // Add category form
  newCategoryName = '';
  newCategoryParentId: string | null = null;

  // Move target
  moveBankId = '';
  moveCategoryId: string | null = null;
  moveBankCategories = signal<{ cat: QuestionBankCategoryDTO; depth: number }[]>([]);

  filters = {
    search: '',
    difficulty: '',
    categoryId: '',
    tag: ''
  };

  // Dynamic filter options based on current dataset
  availableCategories = computed(() => {
    const ids = new Set(this.questions().map(q => (q as any).categoryId).filter(id => !!id));
    return this.flatCategories().filter(f => ids.has(f.cat.id));
  });

  availableTags = computed(() => {
    const tags = new Set<string>();
    this.questions().forEach(q => {
      if ((q as any).tags) {
        (q as any).tags.split(',').forEach((t: string) => tags.add(t.trim()));
      }
    });
    return Array.from(tags).sort();
  });

  availableDifficulties = computed(() => {
    const diffs = new Set(this.questions().map(q => q.difficulty));
    return Array.from(diffs).sort();
  });

  // Catalog view data
  bankStats = computed(() => {
    return this.banks().map(bank => {
      const bankQuestions = this.questions().filter(q => (q as any).packageId === bank.id);
      const total = bankQuestions.length || bank.questionCount || 0;
      
      const counts = {
        EASY: bankQuestions.filter(q => q.difficulty === 'EASY').length,
        MEDIUM: bankQuestions.filter(q => q.difficulty === 'MEDIUM').length,
        HARD: bankQuestions.filter(q => q.difficulty === 'HARD').length
      };

      return {
        ...bank,
        realCount: total,
        dist: {
          easy: total ? (counts.EASY / total) * 100 : 0,
          medium: total ? (counts.MEDIUM / total) * 100 : 0,
          hard: total ? (counts.HARD / total) * 100 : 0
        }
      };
    });
  });

  // Expose for template - the bank id to use as packageId for import
  get selectedPackageId(): string {
    return this.selectedBankId() === 'ALL' ? '' : this.selectedBankId();
  }

  async ngOnInit() {
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      this.addToQuizLessonId = params['addToQuiz'] || null;
      this.returnUrl = this.normalizeInternalReturnUrl(params['returnUrl'] || null);
      this.pendingSelectedQuestionId = params['selectQuestionId'] || null;

      const bankIdFromUrl = params['packageId'] || params['bankId'] || null;
      if (bankIdFromUrl) {
        this.selectedBankId.set(bankIdFromUrl);
      }
    });

    await this.loadBanks();
  }

  async loadBanks() {
    try {
      const banks = await firstValueFrom(this.questionBankApi.getMyBanks());
      this.banks.set(banks.filter(b => b.status === 'ACTIVE'));
      await this.onBankChange();
    } catch {
      this.banks.set([]);
      this.toast.error('Không thể tải ngân hàng câu hỏi. Vui lòng thử lại.');
    }
  }

  async onBankChange() {
    this.showManageBankMenu.set(false);

    if (this.selectedBankId() === 'ALL') {
      this.selectedBank.set(null);
      this.categoryTree.set([]);
      this.flatCategories.set([]);
      this.selectedCategoryId.set(null);
      this.clearSelection();
      // Load ALL questions
      try {
        const allQuestions = await firstValueFrom(this.questionApi.getMyQuestions());
        this.questions.set(allQuestions || []);
        this.filterQuestions();
        await this.restorePendingSelectionIfPresent();
      } catch {
        this.questions.set([]);
        this.filteredQuestions.set([]);
      }
    } else {
      const bank = this.banks().find(b => b.id === this.selectedBankId());
      if (bank) {
        // Load bank with categories
        try {
          const fullBank = await firstValueFrom(this.questionBankApi.getBankById(bank.id));
          this.selectedBank.set(fullBank);
          this.categoryTree.set(fullBank.categories || []);
          this.flatCategories.set(this.flattenTree(fullBank.categories || []));
        } catch {
          this.selectedBank.set(bank);
          this.categoryTree.set([]);
          this.flatCategories.set([]);
        }

        this.selectedCategoryId.set(null);
        this.clearSelection();
        await this.loadBankQuestions(bank.id);
      } else {
        this.selectedBank.set(null);
        this.categoryTree.set([]);
        this.flatCategories.set([]);
        this.questions.set([]);
        this.filteredQuestions.set([]);
      }
    }
  }

  async loadBankQuestions(bankId: string, categoryId?: string) {
    try {
      const questions = await firstValueFrom(
        this.questionBankApi.getBankQuestions(bankId, categoryId || undefined)
      );
      this.questions.set(questions);
      this.filterQuestions();
      await this.restorePendingSelectionIfPresent();
    } catch {
      this.questions.set([]);
      this.filteredQuestions.set([]);
    }
  }


  async onCategorySelect(categoryId: string | null) {
    this.selectedCategoryId.set(categoryId);
    this.clearSelection();

    const bank = this.selectedBank();
    if (!bank) return;

    if (categoryId) {
      await this.loadBankQuestions(bank.id, categoryId);
    } else {
      await this.loadBankQuestions(bank.id);
    }
  }

  filterQuestions() {
    let filtered = [...this.questions()];

    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(q => {
        const content = (q as any).content || '';
        return content.toLowerCase().includes(search);
      });
    }

    if (this.filters.difficulty) {
      filtered = filtered.filter(q => q.difficulty === this.filters.difficulty);
    }

    if (this.filters.categoryId) {
      filtered = filtered.filter(q => (q as any).categoryId === this.filters.categoryId);
    }

    if (this.filters.tag) {
      filtered = filtered.filter(q => {
        const tags = (q as any).tags || '';
        return tags.split(',').map((t: string) => t.trim()).includes(this.filters.tag);
      });
    }

    this.filteredQuestions.set(filtered);
  }

  // ==================== Bank CRUD ====================

  async createBank() {
    if (!this.newBank.name.trim()) {
      this.toast.warning('Vui lòng nhập tên ngân hàng!');
      return;
    }

    try {
      const created = await firstValueFrom(this.questionBankApi.createBank(this.newBank));
      this.toast.success('Đã tạo ngân hàng câu hỏi thành công!');
      this.showCreateBankModal.set(false);
      this.newBank = {
        name: '',
        description: '',
        subject: '',
        bankType: 'PERSONAL',
        visibility: 'PRIVATE'
      };
      await this.loadBanks();

      if (created?.id) {
        this.selectedBankId.set(created.id);
        await this.onBankChange();
      }
    } catch (error: any) {
      this.toast.error('Lỗi khi tạo ngân hàng: ' + (error?.message || 'Lỗi không xác định'));
    }
  }

  async archiveCurrentBank() {
    const bank = this.selectedBank();
    if (!bank) return;
    await this.deleteBank(bank.id, bank.name);
  }

  async deleteBank(bankId: string, bankName: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Lưu trữ ngân hàng',
      message: `Bạn có chắc chắn muốn lưu trữ ngân hàng "${bankName}"?\n\nNgân hàng sẽ bị ẩn khỏi danh sách nhưng không bị xóa hoàn toàn.`,
      variant: 'danger',
      confirmText: 'Lưu trữ',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    try {
      await firstValueFrom(this.questionBankApi.archiveBank(bankId));
      this.toast.success('Đã lưu trữ ngân hàng thành công!');

      if (this.selectedBankId() === bankId) {
        this.selectedBankId.set('ALL');
        this.selectedBank.set(null);
        this.categoryTree.set([]);
        this.flatCategories.set([]);
      }

      await this.loadBanks();
    } catch (error: any) {
      this.toast.error('Lỗi khi lưu trữ: ' + (error?.message || 'Lỗi không xác định'));
    }
  }

  editBank(bank: any) {
    // For now, this could open the create modal in "edit" mode if we had that, 
    // or just show a toast that this feature is coming.
    this.toast.info('Tính năng chỉnh sửa thông tin ngân hàng đang được cập nhật.');
  }

  // ==================== Category CRUD ====================

  async addCategory() {
    if (!this.newCategoryName.trim()) {
      this.toast.warning('Vui lòng nhập tên danh mục!');
      return;
    }

    const bank = this.selectedBank();
    if (!bank) return;

    try {
      await firstValueFrom(this.questionBankApi.addCategory(bank.id, {
        name: this.newCategoryName.trim(),
        parentId: this.newCategoryParentId || undefined
      }));

      this.newCategoryName = '';
      this.newCategoryParentId = null;
      this.showAddCategoryModal.set(false);

      // Reload categories
      const fullBank = await firstValueFrom(this.questionBankApi.getBankById(bank.id));
      this.selectedBank.set(fullBank);
      this.categoryTree.set(fullBank.categories || []);
      this.flatCategories.set(this.flattenTree(fullBank.categories || []));
    } catch (error: any) {
      this.toast.error('Lỗi khi thêm danh mục: ' + (error?.message || 'Lỗi không xác định'));
    }
  }

  async deleteCategory(catId: string, catName: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa danh mục',
      message: `Xóa danh mục "${catName}"?\n\nCâu hỏi trong danh mục sẽ được chuyển về "Chưa phân loại".`,
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    try {
      await firstValueFrom(this.questionBankApi.deleteCategory(catId));

      const bank = this.selectedBank();
      if (bank) {
        const fullBank = await firstValueFrom(this.questionBankApi.getBankById(bank.id));
        this.selectedBank.set(fullBank);
        this.categoryTree.set(fullBank.categories || []);
        this.flatCategories.set(this.flattenTree(fullBank.categories || []));

        if (this.selectedCategoryId() === catId) {
          this.selectedCategoryId.set(null);
          await this.loadBankQuestions(bank.id);
        }
      }
    } catch (error: any) {
      this.toast.error('Lỗi khi xóa danh mục: ' + (error?.message || 'Lỗi không xác định'));
    }
  }

  // ==================== Helpers ====================

  flattenTree(categories: QuestionBankCategoryDTO[], depth = 0): { cat: QuestionBankCategoryDTO; depth: number }[] {
    const result: { cat: QuestionBankCategoryDTO; depth: number }[] = [];
    for (const cat of categories) {
      result.push({ cat, depth });
      if (cat.children?.length) {
        result.push(...this.flattenTree(cat.children, depth + 1));
      }
    }
    return result;
  }

  getCategoryName(categoryId: string | null): string {
    if (!categoryId) return 'Chưa phân loại';
    const flat = this.flatCategories();
    const found = flat.find(f => f.cat.id === categoryId);
    return found ? found.cat.name : 'Chưa phân loại';
  }

  getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'EASY': return 'Dễ';
      case 'MEDIUM': return 'Trung bình';
      case 'HARD': return 'Khó';
      default: return 'Không xác định';
    }
  }

  getBankTypeLabel(bankType: string): string {
    switch (bankType) {
      case 'PERSONAL': return 'Cá nhân';
      case 'DEPARTMENT': return 'Khoa';
      case 'INSTITUTIONAL': return 'Trường';
      default: return bankType;
    }
  }

  getQuestionCheckboxLabel(question: Question | BankQuestionDTO): string {
    const content = String((question as any).content || '').replace(/\s+/g, ' ').trim();
    if (!content) {
      return 'Chọn câu hỏi không có tiêu đề';
    }

    const preview = content.length > 80 ? `${content.slice(0, 77)}...` : content;
    return `Chọn câu hỏi: ${preview}`;
  }

  // ==================== Question actions ====================

  createNewQuestion() {
    if (!this.selectedBank()) {
      this.toast.warning('Vui lòng chọn ngân hàng câu hỏi trước khi tạo câu hỏi mới');
      return;
    }
    const queryParams: any = { packageId: this.selectedBank()!.id };
    if (this.selectedCategoryId()) {
      queryParams.categoryId = this.selectedCategoryId();
    }
    if (this.addToQuizLessonId) {
      queryParams.addToQuiz = this.addToQuizLessonId;
    }
      if (this.returnUrl) {
        queryParams.returnUrl = this.returnUrl;
      }
    this.router.navigate(['/teacher/quiz/question/create'], { queryParams });
  }

  editQuestion(question: Question | BankQuestionDTO) {
    this.router.navigate(['/teacher/quiz/question', question.id, 'edit']);
  }

  async deleteQuestion(question: Question | BankQuestionDTO) {
    const content = (question as any).content || '';
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa câu hỏi',
      message: `Bạn có chắc chắn muốn xóa câu hỏi:\n\n"${content}"\n\nHành động này không thể hoàn tác!`,
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    try {
      await firstValueFrom(this.questionApi.deleteQuestion(question.id));
      this.toast.success('Đã xóa câu hỏi thành công!');

      if (this.selectedBank()) {
        await this.loadBankQuestions(this.selectedBank()!.id, this.selectedCategoryId() || undefined);
        await this.loadBanks();
      } else {
        await this.onBankChange();
      }
    } catch (error: any) {
      this.toast.error('Lỗi khi xóa câu hỏi: ' + (error?.message || 'Lỗi không xác định'));
    }
  }

  // ==================== Selection ====================

  toggleQuestionSelection(questionId: string) {
    const selected = this.selectedQuestions();
    if (selected.includes(questionId)) {
      this.selectedQuestions.set(selected.filter(id => id !== questionId));
    } else {
      this.selectedQuestions.set([...selected, questionId]);
    }
  }

  isQuestionSelected(questionId: string): boolean {
    return this.selectedQuestions().includes(questionId);
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.clearSelection();
    } else {
      this.selectedQuestions.set(this.filteredQuestions().map(q => q.id));
    }
  }

  isAllSelected(): boolean {
    const filtered = this.filteredQuestions();
    return filtered.length > 0 && this.selectedQuestions().length === filtered.length;
  }

  clearSelection() {
    this.selectedQuestions.set([]);
  }

  private async restorePendingSelectionIfPresent() {
    const questionId = this.pendingSelectedQuestionId;
    if (!questionId) {
      return;
    }

    const existsInCurrentBank = this.questions().some(question => question.id === questionId);
    if (!existsInCurrentBank) {
      return;
    }

    this.selectedQuestions.set([questionId]);
    this.pendingSelectedQuestionId = null;

    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { selectQuestionId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });

    if (this.addToQuizLessonId) {
      this.toast.success('Đã tạo câu hỏi mới. Hãy nhấn "Thêm vào Quiz" để gắn vào bài kiểm tra.');
    }
  }

  // ==================== Add to Quiz ====================

  async addSelectedToQuiz() {
    if (!this.addToQuizLessonId) {
      this.toast.warning('Không tìm thấy Quiz để thêm câu hỏi');
      return;
    }

    const selectedIds = this.selectedQuestions();
    if (selectedIds.length === 0) {
      this.toast.warning('Vui lòng chọn ít nhất một câu hỏi');
      return;
    }

    this.addingToQuiz.set(true);

    try {
      const quizId = await firstValueFrom(this.quizApi.resolveQuizIdByLessonId(this.addToQuizLessonId!));
      let addedCount = 0;
      let skippedCount = 0;

      for (const questionId of selectedIds) {
        try {
          await firstValueFrom(this.quizApi.addQuestionToQuiz(quizId, questionId));
          addedCount++;
        } catch (error: any) {
          if (error?.error?.message?.includes('đã tồn tại')) {
            skippedCount++;
          }
        }
      }

      if (addedCount > 0) {
        let msg = `Đã thêm ${addedCount} câu hỏi vào Quiz!`;
        if (skippedCount > 0) {
          msg += `\n${skippedCount} câu đã có sẵn trong Quiz.`;
        }
        this.toast.success(msg);
      } else if (skippedCount > 0) {
        this.toast.info('Tất cả câu hỏi đã có trong Quiz rồi!');
      }

      this.clearSelection();

      if (this.returnUrl) {
        this.router.navigateByUrl(this.returnUrl);
      }
    } catch (error: any) {
      this.toast.error('Lỗi khi thêm câu hỏi: ' + (error?.message || 'Lỗi không xác định'));
    } finally {
      this.addingToQuiz.set(false);
    }
  }

  goBack() {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  // ==================== Move questions ====================

  async openMoveModal() {
    this.showMoveModal.set(true);
    this.moveBankId = '';
    this.moveCategoryId = null;
    this.moveBankCategories.set([]);
  }

  async onMoveBankSelect(bankId: string) {
    this.moveBankId = bankId;
    this.moveCategoryId = null;

    if (bankId) {
      try {
        const bank = await firstValueFrom(this.questionBankApi.getBankById(bankId));
        this.moveBankCategories.set(this.flattenTree(bank.categories || []));
      } catch {
        this.moveBankCategories.set([]);
      }
    } else {
      this.moveBankCategories.set([]);
    }
  }

  async moveQuestionsToBank() {
    if (!this.moveBankId) {
      this.toast.warning('Vui lòng chọn ngân hàng đích!');
      return;
    }

    try {
      await firstValueFrom(this.questionBankApi.moveQuestions({
        questionIds: this.selectedQuestions(),
        targetBankId: this.moveBankId,
        targetCategoryId: this.moveCategoryId || undefined
      }));

      this.toast.success('Đã di chuyển câu hỏi thành công!');
      this.showMoveModal.set(false);
      this.clearSelection();

      if (this.selectedBank()) {
        await this.loadBankQuestions(this.selectedBank()!.id, this.selectedCategoryId() || undefined);
      } else {
        await this.onBankChange();
      }
      await this.loadBanks();
    } catch (error: any) {
      this.toast.error('Lỗi khi di chuyển câu hỏi: ' + (error?.message || 'Lỗi không xác định'));
    }
  }

  // ==================== Import ====================

  openImportModal() {
    if (!this.selectedBankId() || this.selectedBankId() === 'ALL') {
      this.toast.warning('Vui lòng chọn ngân hàng câu hỏi trước khi import');
      return;
    }
    const importModal = this.importModal();
    if (importModal) {
      importModal.open();
    }
  }

  async onQuestionsImported(_result: QuestionImportResult) {
    if (this.selectedBank()) {
      await this.loadBankQuestions(this.selectedBank()!.id, this.selectedCategoryId() || undefined);
    }
    await this.loadBanks();
  }

  onImportModalClosed() {
  }

  private normalizeInternalReturnUrl(returnUrl: string | null): string | null {
    if (!returnUrl) {
      return null;
    }

    if (returnUrl.startsWith('/')) {
      return returnUrl;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const parsed = new URL(returnUrl, window.location.origin);
      if (parsed.origin !== window.location.origin) {
        return null;
      }

      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  }
}
