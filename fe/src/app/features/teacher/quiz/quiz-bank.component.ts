import { Component, signal, OnInit, inject, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { QuestionApi, Question, QuestionImportResult } from '../../../api/endpoints/question.api';
import { PackageApi, PackageDTO, CreatePackageRequest } from '../../../api/endpoints/package.api';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { firstValueFrom } from 'rxjs';
import { QuestionImportModalComponent } from './components/question-import-modal.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-quiz-bank',
  imports: [CommonModule, FormsModule, QuestionImportModalComponent],
  templateUrl: './quiz-bank.component.html',
  styles: [`
    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
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
  private packageApi = inject(PackageApi);
  private quizApi = inject(QuizApi);

  packages = signal<PackageDTO[]>([]);
  selectedPackageId = 'ALL';
  selectedPackage = signal<PackageDTO | null>(null);
  questions = signal<Question[]>([]);
  filteredQuestions = signal<Question[]>([]);
  selectedQuestions = signal<string[]>([]);

  showCreatePackageModal = false;
  showMoveModal = false;
  showManagePackageMenu = false;

  // Add to Quiz mode
  addToQuizLessonId: string | null = null;
  returnUrl: string | null = null;
  addingToQuiz = signal<boolean>(false);

  newPackage: CreatePackageRequest = {
    name: '',
    description: '',
    subject: '',
    visibility: 'PRIVATE'
  };

  filters = {
    search: '',
    difficulty: ''
  };

  async ngOnInit() {
    // Check for query params
    this.route.queryParams.subscribe(async params => {
      this.addToQuizLessonId = params['addToQuiz'] || null;
      this.returnUrl = params['returnUrl'] || null;

      // Check for packageId to auto-select
      const packageIdFromUrl = params['packageId'] || null;
      if (packageIdFromUrl) {
        this.selectedPackageId = packageIdFromUrl;
      }
    });

    await this.loadPackages();
  }

  async loadPackages() {
    try {
      const packages = await firstValueFrom(this.packageApi.getMyPackages());
      this.packages.set(packages);

      // Auto-select 'ALL' if nothing selected
      if (!this.selectedPackageId) {
        this.selectedPackageId = 'ALL';
      }
      // Always trigger change to load questions
      await this.onPackageChange();
    } catch {
    }
  }

  async onPackageChange() {
    if (this.selectedPackageId === 'ALL') {
      this.selectedPackage.set(null);
      this.clearSelection();
      // Load ALL questions
      try {
        const allQuestions = await firstValueFrom(this.questionApi.getMyQuestions());
        if (allQuestions) {
          this.questions.set(allQuestions);
          this.filteredQuestions.set(allQuestions);
        } else {
          this.questions.set([]);
          this.filteredQuestions.set([]);
        }
      } catch {
        this.questions.set([]);
        this.filteredQuestions.set([]);
      }
    } else {
      const pkg = this.packages().find(p => p.id === this.selectedPackageId);
      if (pkg) {
        this.selectedPackage.set(pkg);
        this.clearSelection();
        await this.loadQuestionsInPackage(pkg.id);
      } else {
        // Fallback
        this.selectedPackage.set(null);
        this.questions.set([]);
        this.filteredQuestions.set([]);
      }
    }
    this.showManagePackageMenu = false;
  }

  async loadQuestionsInPackage(packageId: string) {
    try {
      const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(packageId));
      this.questions.set(questions);
      this.filteredQuestions.set(questions);
    } catch {
      this.questions.set([]);
      this.filteredQuestions.set([]);
    }
  }

  filterQuestions() {
    let filtered = [...this.questions()];

    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(q => q.content.toLowerCase().includes(search));
    }

    if (this.filters.difficulty) {
      filtered = filtered.filter(q => q.difficulty === this.filters.difficulty);
    }

    this.filteredQuestions.set(filtered);
  }

  async createPackage() {
    if (!this.newPackage.name.trim()) {
      alert('Vui lòng nhập tên gói!');
      return;
    }

    try {
      const created = await firstValueFrom(this.packageApi.createPackage(this.newPackage));
      alert('Đã tạo gói câu hỏi thành công!');
      this.showCreatePackageModal = false;
      this.newPackage = {
        name: '',
        description: '',
        subject: '',
        visibility: 'PRIVATE'
      };
      await this.loadPackages();

      // Auto-select the newly created package
      if (created && created.id) {
        this.selectedPackageId = created.id;
        await this.onPackageChange();
      }
    } catch (error: any) {
      alert('Lỗi khi tạo gói: ' + (error?.message || 'Lỗi không xác định'));
    }
  }

  async deleteCurrentPackage() {
    const pkg = this.selectedPackage();
    if (!pkg) return;

    const confirmed = confirm(`Bạn có chắc chắn muốn xóa gói "${pkg.name}"?\n\nCác câu hỏi trong gói sẽ được chuyển về gói "Chưa phân loại".`);
    if (!confirmed) return;

    try {
      await firstValueFrom(this.packageApi.deletePackage(pkg.id));
      alert('Đã xóa gói thành công!');

      this.selectedPackageId = '';
      this.selectedPackage.set(null);
      this.questions.set([]);
      this.filteredQuestions.set([]);

      await this.loadPackages();
    } catch (error: any) {
      alert('Lỗi khi xóa gói: ' + (error?.message || 'Lỗi không xác định'));
    }
  }

  getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'EASY': return 'Dễ';
      case 'MEDIUM': return 'Trung bình';
      case 'HARD': return 'Khó';
      default: return 'Không xác định';
    }
  }

  createNewQuestion() {
    // If specific package selected, use it. If 'ALL', don't pass packageId.
    // if (!this.selectedPackage()) { ... } remove check
    const queryParams: any = {};
    if (this.selectedPackage()) {
      queryParams.packageId = this.selectedPackage()!.id;
    }
    this.router.navigate(['/teacher/quiz/question/create'], {
      queryParams
    });
  }

  editQuestion(question: Question) {
    this.router.navigate(['/teacher/quiz/question', question.id, 'edit']);
  }

  async deleteQuestion(question: Question) {
    const confirmed = confirm(`Bạn có chắc chắn muốn xóa câu hỏi:\n\n"${question.content}"\n\nHành động này không thể hoàn tác!`);
    if (!confirmed) return;

    try {
      await firstValueFrom(this.questionApi.deleteQuestion(question.id));
      alert('Đã xóa câu hỏi thành công!');

      if (this.selectedPackage()) {
        await this.loadQuestionsInPackage(this.selectedPackage()!.id);
        await this.loadPackages(); // Refresh package counts
      } else {
        // Refresh ALL mode
        await this.onPackageChange();
      }
    } catch (error: any) {
      alert('Lỗi khi xóa câu hỏi: ' + (error?.message || 'Lỗi không xác định'));
    }
  }

  // Selection methods
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

  // Add selected questions to quiz
  async addSelectedToQuiz() {
    if (!this.addToQuizLessonId) {
      alert('Không tìm thấy Quiz để thêm câu hỏi');
      return;
    }

    const selectedIds = this.selectedQuestions();
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất một câu hỏi');
      return;
    }

    this.addingToQuiz.set(true);

    try {
      let addedCount = 0;
      let skippedCount = 0;

      // Add each question using the API
      for (const questionId of selectedIds) {
        try {
          const result = await firstValueFrom(this.quizApi.addQuestionToQuiz(this.addToQuizLessonId!, questionId));
          addedCount++;
        } catch (error: any) {
          // Question might already exist
          if (error?.error?.message?.includes('đã tồn tại')) {
            skippedCount++;
          }
        }
      }

      // Show result
      if (addedCount > 0) {
        let msg = `Đã thêm ${addedCount} câu hỏi vào Quiz!`;
        if (skippedCount > 0) {
          msg += `\n${skippedCount} câu đã có sẵn trong Quiz.`;
        }
        alert(msg);
      } else if (skippedCount > 0) {
        alert('Tất cả câu hỏi đã có trong Quiz rồi!');
      }

      this.clearSelection();

      // Navigate back if returnUrl is provided
      if (this.returnUrl) {
        this.router.navigateByUrl(this.returnUrl);
      }
    } catch (error: any) {
      alert('Lỗi khi thêm câu hỏi: ' + (error?.message || 'Lỗi không xác định'));
    } finally {
      this.addingToQuiz.set(false);
    }
  }

  // Navigate back to return URL
  goBack() {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  async moveQuestionsToPackage(targetPackageId: string) {
    try {
      await firstValueFrom(this.packageApi.moveQuestionsToPackage({
        questionIds: this.selectedQuestions(),
        targetPackageId
      }));

      alert('Đã di chuyển câu hỏi thành công!');
      this.showMoveModal = false;
      this.clearSelection();

      if (this.selectedPackage()) {
        await this.loadQuestionsInPackage(this.selectedPackage()!.id);
      } else {
        await this.onPackageChange();
      }
      await this.loadPackages(); // Refresh package counts
    } catch (error: any) {
      alert('Lỗi khi di chuyển câu hỏi: ' + (error?.message || 'Lỗi không xác định'));
    }
  }

  // ==================== IMPORT METHODS ====================

  openImportModal() {
    if (!this.selectedPackageId) {
      alert('Vui lòng chọn gói câu hỏi trước khi import');
      return;
    }
    const importModal = this.importModal();
    if (importModal) {
      importModal.open();
    }
  }

  async onQuestionsImported(result: QuestionImportResult) {
    // Reload questions in current package
    if (this.selectedPackage()) {
      await this.loadQuestionsInPackage(this.selectedPackage()!.id);
    }
    // Refresh package counts
    await this.loadPackages();
  }

  onImportModalClosed() {
  }
}
