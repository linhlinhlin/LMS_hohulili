import { Component, signal, OnInit, inject, viewChild, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { QuestionApi, Question, QuestionImportResult } from '../../../api/endpoints/question.api';
import { ImoModelCourseApi, ImoModelCourse } from '../../../api/endpoints/imo-model-course.api';
import { QuestionBankApi } from '../../../api/endpoints/question-bank.api';
import {
  QuestionBankDTO,
  QuestionBankCategoryDTO,
  CreateBankRequest,
  UpdateBankRequest,
  BankQuestionDTO
} from '../../../api/types/question-bank.types';
import { StripHtmlPipe } from '../../../shared/pipes/strip-html.pipe';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { firstValueFrom, take } from 'rxjs';
import { QuestionImportModalComponent } from './components/question-import-modal.component';
import { QuizBankCategorySidebarComponent } from './components/quiz-bank-category-sidebar.component';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-quiz-bank',
  imports: [CommonModule, FormsModule, QuestionImportModalComponent, QuizBankCategorySidebarComponent, LucideAngularModule, StripHtmlPipe],
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
  private authService = inject(AuthService);
  private imoModelCourseApi = inject(ImoModelCourseApi);

  imoCoursesAll = signal<ImoModelCourse[]>([]);
  imoCoursesMap = signal<Map<number, { code: string; title: string }>>(new Map());
  imoCoursesGrouped = computed<Record<string, ImoModelCourse[]>>(() => {
    const grouped: Record<string, ImoModelCourse[]> = {};
    for (const c of this.imoCoursesAll()) {
      (grouped[c.category] ??= []).push(c);
    }
    return grouped;
  });
  imoGroupedEntries = computed<[string, ImoModelCourse[]][]>(() => Object.entries(this.imoCoursesGrouped()));

  // Ownership: true when the selected bank belongs to the current user (or no bank selected yet)
  isOwner = computed(() => {
    const bank = this.selectedBank();
    const user = this.authService.currentUserSignal();
    if (!bank || !user) return true;
    return (bank as any).ownerId === user.id;
  });

  // Bank state
  banks = signal<QuestionBankDTO[]>([]);
  selectedBankId = signal<string>('ALL');
  selectedBank = signal<QuestionBankDTO | null>(null);
  bankSearchQuery = signal('');

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
  bankFormMode = signal<'create' | 'edit'>('create');
  editingBankId = signal<string | null>(null);

  // Sidebar state
  sidebarCollapsed = signal(false);
  savingCategoryId = signal<string | null>(null);
  showBulkCategoryMenu = signal(false);

  // Add to Quiz mode
  addToQuizLessonId: string | null = null;
  returnUrl: string | null = null;
  pendingSelectedQuestionId: string | null = null;
  addingToQuiz = signal<boolean>(false);
  loadingBank = signal(false);

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
    tag: '',
    imoFilter: ''   // '' = all, 'none' = unclassified, '3' = specific id
  };

  sortColumn = signal<string>('');
  sortDir = signal<'asc' | 'desc'>('asc');

  sortBy(col: string) {
    if (this.sortColumn() === col) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(col);
      this.sortDir.set('asc');
    }
    this.filterQuestions();
  }

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

  // Bank list filters
  bankTypeFilter = signal<string>('');
  visibilityFilter = signal<string>('');

  // Bulk assign IMO
  showBulkImoModal = signal(false);
  bulkImoId = '';
  bulkAssigning = signal(false);

  // IMO stats panel
  showImoStats = signal(false);
  imoStats = signal<{ imoCourseId: number | null; code: string | null; title: string; count: number }[]>([]);
  imoStatsTotal = signal(0);
  imoStatsCoursesWithQuestions = signal(0);
  loadingImoStats = signal(false);

  // Public banks (Browse Community tab)
  bankTab = signal<'my' | 'public'>('my');
  publicBanks = signal<QuestionBankDTO[]>([]);
  publicBankSearch = signal('');
  loadingPublicBanks = signal(false);
  showCopyModal = signal(false);
  copyTargetBankId = signal('');
  copyingQuestions = signal(false);

  filteredPublicBanks = computed(() => {
    const query = this.publicBankSearch().trim().toLowerCase();
    return this.publicBanks().filter(b =>
      !query ||
      b.name.toLowerCase().includes(query) ||
      (b.subject || '').toLowerCase().includes(query)
    );
  });

  clearBankFilters() {
    this.bankTypeFilter.set('');
    this.visibilityFilter.set('');
    this.bankSearchQuery.set('');
  }

  getActiveBankFilterCount = computed(() => {
    let count = 0;
    if (this.bankSearchQuery().trim()) count++;
    if (this.bankTypeFilter()) count++;
    if (this.visibilityFilter()) count++;
    return count;
  });

  // Catalog view data
  bankStats = computed(() => {
    return this.banks().map(bank => ({
      ...bank,
      realCount: bank.questionCount || 0
    }));
  });

  filteredBankStats = computed(() => {
    const query = this.bankSearchQuery().trim().toLowerCase();
    const typeFilter = this.bankTypeFilter();
    const visFilter = this.visibilityFilter();

    return this.bankStats().filter(bank => {
      if (query && !(
        bank.name.toLowerCase().includes(query) ||
        (bank.subject || '').toLowerCase().includes(query) ||
        (bank.description || '').toLowerCase().includes(query)
      )) return false;
      if (typeFilter && bank.bankType !== typeFilter) return false;
      if (visFilter && bank.visibility !== visFilter) return false;
      return true;
    });
  });

  totalBankQuestionCount = computed(() =>
    this.bankStats().reduce((sum, bank) => sum + bank.realCount, 0)
  );

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

    this.imoModelCourseApi.getImoModelCourses().subscribe({
      next: (res) => {
        const list = res.data ?? [];
        this.imoCoursesAll.set(list);
        const map = new Map<number, { code: string; title: string }>();
        list.forEach(c => map.set(c.id, { code: c.code, title: c.title }));
        this.imoCoursesMap.set(map);
      },
      error: () => {}
    });
  }

  getImoCourseCode(imoCourseId: number | null | undefined): string | null {
    if (!imoCourseId) return null;
    return this.imoCoursesMap().get(imoCourseId)?.code ?? null;
  }

  getImoCourseTitle(imoCourseId: number | null | undefined): string | null {
    if (!imoCourseId) return null;
    const entry = this.imoCoursesMap().get(imoCourseId);
    return entry ? `${entry.code} — ${entry.title}` : null;
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

  async switchToPublicTab() {
    this.bankTab.set('public');
    if (this.publicBanks().length === 0 && !this.loadingPublicBanks()) {
      await this.loadPublicBanks();
    }
  }

  async loadPublicBanks() {
    this.loadingPublicBanks.set(true);
    try {
      // Backend returns ALL PUBLIC+ACTIVE banks — including caller's own (shown with badge)
      const banks = await firstValueFrom(this.questionBankApi.getPublicBanks());
      this.publicBanks.set(banks);
    } catch {
      this.publicBanks.set([]);
    } finally {
      this.loadingPublicBanks.set(false);
    }
  }

  isMyPublicBank(bank: QuestionBankDTO): boolean {
    return (bank as any).ownerId === this.authService.currentUserSignal()?.id;
  }

  async openPublicBank(bank: QuestionBankDTO) {
    this.bankTab.set('my');
    this.selectedBankId.set(bank.id);
    // Clear stale data synchronously BEFORE any await — prevents flash of old content
    this.selectedBank.set(null);
    this.questions.set([]);
    this.filteredQuestions.set([]);
    this.categoryTree.set([]);
    this.flatCategories.set([]);
    this.selectedCategoryId.set(null);
    this.clearSelection();
    // If it's the user's own bank, add it to their banks list so isOwner() resolves correctly
    if (this.isMyPublicBank(bank) && !this.banks().find(b => b.id === bank.id)) {
      this.banks.update(list => [...list, bank]);
    }
    this.loadingBank.set(true);
    try {
      const fullBank = await firstValueFrom(this.questionBankApi.getBankById(bank.id));
      this.selectedBank.set(fullBank);
      const cats = (fullBank as any).categories || [];
      this.categoryTree.set(cats);
      this.flatCategories.set(this.flattenTree(cats));
      await this.loadBankQuestions(bank.id);
    } catch {
      this.toast.error('Không thể tải ngân hàng câu hỏi.');
    } finally {
      this.loadingBank.set(false);
    }
  }

  async confirmCopyToMyBank() {
    const targetBankId = this.copyTargetBankId();
    if (!targetBankId) { this.toast.error('Vui lòng chọn ngân hàng đích'); return; }
    const ids = this.selectedQuestions();
    if (!ids.length) return;

    this.copyingQuestions.set(true);
    try {
      const result = await firstValueFrom(
        this.questionBankApi.copyQuestionsToBank(ids, targetBankId)
      );
      this.toast.success(`Đã sao chép ${result.copiedCount} câu hỏi vào ngân hàng của bạn!`);
      this.showCopyModal.set(false);
      this.copyTargetBankId.set('');
      this.clearSelection();
      await this.loadBanks();
    } catch {
      this.toast.error('Sao chép thất bại. Vui lòng thử lại.');
    } finally {
      this.copyingQuestions.set(false);
    }
  }

  async onBankChange() {
    this.showManageBankMenu.set(false);
    this.clearQuestionFilters();
    this.showImoStats.set(false);
    this.imoStats.set([]);

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
      // Clear stale data synchronously BEFORE any await — prevents 100ms flash of old bank content
      this.selectedBank.set(null);
      this.questions.set([]);
      this.filteredQuestions.set([]);
      this.categoryTree.set([]);
      this.flatCategories.set([]);
      this.selectedCategoryId.set(null);
      this.clearSelection();

      const bank = this.banks().find(b => b.id === this.selectedBankId());
      if (bank) {
        this.loadingBank.set(true);
        try {
          const fullBank = await firstValueFrom(this.questionBankApi.getBankById(bank.id));
          this.selectedBank.set(fullBank);
          this.categoryTree.set(fullBank.categories || []);
          this.flatCategories.set(this.flattenTree(fullBank.categories || []));
        } catch {
          this.selectedBank.set(bank);
          this.categoryTree.set([]);
          this.flatCategories.set([]);
        } finally {
          this.loadingBank.set(false);
        }
        await this.loadBankQuestions(bank.id);
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

    if (this.filters.imoFilter) {
      if (this.filters.imoFilter === 'none') {
        filtered = filtered.filter(q => !(q as any).imoCourseId);
      } else {
        const id = Number(this.filters.imoFilter);
        filtered = filtered.filter(q => (q as any).imoCourseId === id);
      }
    }

    // Apply column sort
    const col = this.sortColumn();
    const dir = this.sortDir();
    if (col) {
      const diffOrder: Record<string, number> = { EASY: 0, MEDIUM: 1, HARD: 2 };
      filtered.sort((a, b) => {
        if (col === 'difficulty') {
          const diff = (diffOrder[a.difficulty] ?? 1) - (diffOrder[b.difficulty] ?? 1);
          return dir === 'asc' ? diff : -diff;
        }
        let aVal = '', bVal = '';
        if (col === 'type') {
          aVal = this.getQuestionTypeBadge((a as any).questionType).label;
          bVal = this.getQuestionTypeBadge((b as any).questionType).label;
        } else if (col === 'category') {
          aVal = this.getCategoryName((a as any).categoryId);
          bVal = this.getCategoryName((b as any).categoryId);
        }
        const cmp = aVal.localeCompare(bVal, 'vi');
        return dir === 'asc' ? cmp : -cmp;
      });
    }

    this.filteredQuestions.set(filtered);
  }

  clearQuestionFilters() {
    this.filters.search = '';
    this.filters.difficulty = '';
    this.filters.categoryId = '';
    this.filters.tag = '';
    this.filters.imoFilter = '';
  }

  getActiveQuestionFilterCount(): number {
    let count = 0;
    if (this.filters.search.trim()) count++;
    if (this.filters.difficulty) count++;
    if (this.filters.categoryId) count++;
    if (this.filters.tag) count++;
    if (this.filters.imoFilter) count++;
    return count;
  }

  async viewAllBanks() {
    this.selectedBankId.set('ALL');
    await this.onBankChange();
  }

  async switchBank(bankId: string) {
    this.selectedBankId.set(bankId);
    await this.onBankChange();
  }

  // ==================== Bank CRUD ====================

  closeBankModal() {
    this.showCreateBankModal.set(false);
    this.resetBankForm();
  }

  resetBankForm() {
    this.newBank = { name: '', description: '', subject: '', bankType: 'PERSONAL', visibility: 'PRIVATE' };
    this.bankFormMode.set('create');
    this.editingBankId.set(null);
  }

  async saveBankForm() {
    if (!this.newBank.name.trim()) {
      this.toast.warning('Vui lòng nhập tên ngân hàng!');
      return;
    }

    try {
      if (this.bankFormMode() === 'edit' && this.editingBankId()) {
        const updateReq: UpdateBankRequest = {
          name: this.newBank.name,
          description: this.newBank.description,
          subject: this.newBank.subject,
          visibility: this.newBank.visibility
        };
        await firstValueFrom(this.questionBankApi.updateBank(this.editingBankId()!, updateReq));
        this.toast.success('Đã cập nhật ngân hàng câu hỏi thành công!');
        this.closeBankModal();
        await this.loadBanks();
        if (this.editingBankId() === this.selectedBankId()) {
          await this.onBankChange();
        }
      } else {
        const created = await firstValueFrom(this.questionBankApi.createBank(this.newBank));
        this.toast.success('Đã tạo ngân hàng câu hỏi thành công!');
        this.closeBankModal();
        await this.loadBanks();
        if (created?.id) {
          this.selectedBankId.set(created.id);
          await this.onBankChange();
        }
      }
    } catch (error: any) {
      this.toast.error('Lỗi: ' + (error?.message || 'Lỗi không xác định'));
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

  editBank(bank: QuestionBankDTO | any) {
    this.newBank = {
      name: bank.name,
      description: bank.description || '',
      subject: bank.subject || '',
      bankType: bank.bankType || 'PERSONAL',
      visibility: bank.visibility || 'PRIVATE'
    };
    this.editingBankId.set(bank.id);
    this.bankFormMode.set('edit');
    this.showCreateBankModal.set(true);
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

  async onSidebarAddCategory(req: { name: string; parentId: string | null }) {
    const bank = this.selectedBank();
    if (!bank) return;

    this.savingCategoryId.set('__adding__');
    try {
      await firstValueFrom(this.questionBankApi.addCategory(bank.id, {
        name: req.name,
        parentId: req.parentId || undefined
      }));
      const fullBank = await firstValueFrom(this.questionBankApi.getBankById(bank.id));
      this.selectedBank.set(fullBank);
      this.categoryTree.set(fullBank.categories || []);
      this.flatCategories.set(this.flattenTree(fullBank.categories || []));
    } catch (error: any) {
      this.toast.error('Lỗi khi thêm danh mục: ' + (error?.message || 'Lỗi không xác định'));
    } finally {
      this.savingCategoryId.set(null);
    }
  }

  async onSidebarRenameCategory(req: { id: string; name: string }) {
    const bank = this.selectedBank();
    if (!bank) return;

    this.savingCategoryId.set(req.id);
    try {
      await firstValueFrom(this.questionBankApi.updateCategory(req.id, { name: req.name }));
      const fullBank = await firstValueFrom(this.questionBankApi.getBankById(bank.id));
      this.selectedBank.set(fullBank);
      this.categoryTree.set(fullBank.categories || []);
      this.flatCategories.set(this.flattenTree(fullBank.categories || []));
    } catch (error: any) {
      this.toast.error('Lỗi khi đổi tên: ' + (error?.message || 'Lỗi không xác định'));
    } finally {
      this.savingCategoryId.set(null);
    }
  }

  async assignQuestionToCategory(questionId: string, event: Event) {
    const bank = this.selectedBank();
    if (!bank) return;

    const categoryId = (event.target as HTMLSelectElement).value || null;

    // Optimistic update
    this.questions.update(qs => qs.map(q =>
      q.id === questionId ? { ...q, categoryId } as any : q
    ));
    this.filterQuestions();

    try {
      await firstValueFrom(this.questionBankApi.assignQuestionCategory(questionId, bank.id, categoryId));
      // Refresh counts in sidebar
      const fullBank = await firstValueFrom(this.questionBankApi.getBankById(bank.id));
      this.selectedBank.set(fullBank);
      this.categoryTree.set(fullBank.categories || []);
      this.flatCategories.set(this.flattenTree(fullBank.categories || []));
    } catch (error: any) {
      // Rollback: reload questions
      await this.loadBankQuestions(bank.id, this.selectedCategoryId() || undefined);
      this.toast.error('Lỗi khi gán danh mục: ' + (error?.message || 'Lỗi không xác định'));
    }
  }

  async bulkAssignCategory(categoryId: string | null) {
    const bank = this.selectedBank();
    const selectedIds = this.selectedQuestions();
    if (!bank || selectedIds.length === 0) return;

    this.showBulkCategoryMenu.set(false);

    try {
      await firstValueFrom(this.questionBankApi.assignQuestionCategory(selectedIds[0], bank.id, categoryId));
      // Sequential for remaining
      for (let i = 1; i < selectedIds.length; i++) {
        await firstValueFrom(this.questionBankApi.assignQuestionCategory(selectedIds[i], bank.id, categoryId));
      }
      this.toast.success(`Đã gán ${selectedIds.length} câu hỏi vào danh mục`);
      this.clearSelection();
      await this.loadBankQuestions(bank.id, this.selectedCategoryId() || undefined);
      const fullBank = await firstValueFrom(this.questionBankApi.getBankById(bank.id));
      this.selectedBank.set(fullBank);
      this.categoryTree.set(fullBank.categories || []);
      this.flatCategories.set(this.flattenTree(fullBank.categories || []));
    } catch (error: any) {
      this.toast.error('Lỗi khi gán danh mục: ' + (error?.message || 'Lỗi không xác định'));
    }
  }

  // ==================== Bulk assign IMO ====================

  async bulkAssignImo() {
    const selectedIds = this.selectedQuestions();
    if (!selectedIds.length) return;

    this.bulkAssigning.set(true);
    const imoCourseId = this.bulkImoId ? Number(this.bulkImoId) : null;
    try {
      await firstValueFrom(
        this.questionApi.bulkAssignImo(selectedIds, imoCourseId || null)
      );
      const label = imoCourseId
        ? `IMO ${this.getImoCourseCode(imoCourseId)}`
        : 'bỏ gán IMO';
      this.toast.success(`Đã ${label} cho ${selectedIds.length} câu hỏi`);
      this.showBulkImoModal.set(false);
      this.bulkImoId = '';
      this.clearSelection();
      const bank = this.selectedBank();
      if (bank) {
        await this.loadBankQuestions(bank.id, this.selectedCategoryId() || undefined);
      } else {
        await this.onBankChange();
      }
    } catch (error: any) {
      this.toast.error('Lỗi khi gán IMO: ' + (error?.error?.message || error?.message));
    } finally {
      this.bulkAssigning.set(false);
    }
  }

  // ==================== IMO Stats ====================

  async toggleImoStats() {
    const showing = !this.showImoStats();
    this.showImoStats.set(showing);
    if (showing && this.selectedBank()) {
      await this.loadImoStats();
    }
  }

  async loadImoStats() {
    const bank = this.selectedBank();
    if (!bank) return;
    this.loadingImoStats.set(true);
    try {
      const result = await firstValueFrom(
        this.questionBankApi.getImoStats(bank.id)
      );
      this.imoStats.set(result.stats ?? []);
      this.imoStatsTotal.set(result.totalQuestions ?? 0);
      this.imoStatsCoursesWithQuestions.set(result.coursesWithQuestions ?? 0);
    } catch {
      this.imoStats.set([]);
    } finally {
      this.loadingImoStats.set(false);
    }
  }

  filterByImoFromStats(imoCourseId: number | null) {
    this.filters.imoFilter = imoCourseId === null ? 'none' : String(imoCourseId);
    this.filterQuestions();
    this.showImoStats.set(false);
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
    const queryParams: any = {};
    if (this.selectedBank()) queryParams.packageId = this.selectedBank()!.id;
    if (this.addToQuizLessonId) queryParams.addToQuiz = this.addToQuizLessonId;
    if (this.returnUrl) queryParams.returnUrl = this.returnUrl;
    this.router.navigate(['/teacher/quiz/question', question.id, 'edit'], { queryParams });
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

  getQuestionTypeBadge(type: string): { label: string; classes: string } {
    switch (type) {
      case 'SINGLE_CHOICE':
      case 'MULTIPLE_CHOICE': return { label: 'Trắc nghiệm',    classes: 'bg-blue-50 text-blue-600 border-blue-100' };
      case 'TRUE_FALSE':      return { label: 'Đúng / Sai',     classes: 'bg-orange-50 text-orange-600 border-orange-100' };
      case 'SHORT_ANSWER':    return { label: 'Trả lời ngắn',   classes: 'bg-teal-50 text-teal-600 border-teal-100' };
      case 'ESSAY':           return { label: 'Tự luận',        classes: 'bg-purple-50 text-purple-600 border-purple-100' };
      case 'FILL_IN_BLANK':   return { label: 'Điền chỗ trống', classes: 'bg-amber-50 text-amber-600 border-amber-100' };
      default: return { label: type || '—', classes: 'bg-slate-50 text-slate-500 border-slate-200' };
    }
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
