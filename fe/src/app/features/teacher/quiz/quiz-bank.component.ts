import { Component, signal, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { QuestionApi, Question, QuestionImportResult } from '../../../api/endpoints/question.api';
import { PackageApi, PackageDTO, CreatePackageRequest } from '../../../api/endpoints/package.api';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { firstValueFrom } from 'rxjs';
import { QuestionImportModalComponent } from './components/question-import-modal.component';

@Component({
  selector: 'app-quiz-bank',
  standalone: true,
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
  @ViewChild(QuestionImportModalComponent) importModal!: QuestionImportModalComponent;

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
        console.log('đŸ“¦ Auto-selecting package from URL:', packageIdFromUrl);
      }

      if (this.addToQuizLessonId) {
        console.log('đŸ“ Add to Quiz mode - Lesson ID:', this.addToQuizLessonId);
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
    } catch (error) {
      console.error('Error loading packages:', error);
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
      } catch (error) {
        console.error('Error loading all questions:', error);
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
    } catch (error) {
      console.error('Error loading questions:', error);
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
      alert('Vui lĂ²ng nháº­p tĂªn gĂ³i!');
      return;
    }

    try {
      const created = await firstValueFrom(this.packageApi.createPackage(this.newPackage));
      alert('âœ… ÄĂ£ táº¡o gĂ³i cĂ¢u há»i thĂ nh cĂ´ng!');
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
      console.error('Error creating package:', error);
      alert('Lá»—i khi táº¡o gĂ³i: ' + (error?.message || 'Lá»—i khĂ´ng xĂ¡c Ä‘á»‹nh'));
    }
  }

  async deleteCurrentPackage() {
    const pkg = this.selectedPackage();
    if (!pkg) return;

    const confirmed = confirm(`Báº¡n cĂ³ cháº¯c cháº¯n muá»‘n xĂ³a gĂ³i "${pkg.name}"?\n\nCĂ¡c cĂ¢u há»i trong gĂ³i sáº½ Ä‘Æ°á»£c chuyá»ƒn vá» gĂ³i "ChÆ°a phĂ¢n loáº¡i".`);
    if (!confirmed) return;

    try {
      await firstValueFrom(this.packageApi.deletePackage(pkg.id));
      alert('âœ… ÄĂ£ xĂ³a gĂ³i thĂ nh cĂ´ng!');

      this.selectedPackageId = '';
      this.selectedPackage.set(null);
      this.questions.set([]);
      this.filteredQuestions.set([]);

      await this.loadPackages();
    } catch (error: any) {
      console.error('Error deleting package:', error);
      alert('Lá»—i khi xĂ³a gĂ³i: ' + (error?.message || 'Lá»—i khĂ´ng xĂ¡c Ä‘á»‹nh'));
    }
  }

  getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'EASY': return 'Dá»…';
      case 'MEDIUM': return 'Trung bĂ¬nh';
      case 'HARD': return 'KhĂ³';
      default: return 'KhĂ´ng xĂ¡c Ä‘á»‹nh';
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
    const confirmed = confirm(`Báº¡n cĂ³ cháº¯c cháº¯n muá»‘n xĂ³a cĂ¢u há»i:\n\n"${question.content}"\n\nHĂ nh Ä‘á»™ng nĂ y khĂ´ng thá»ƒ hoĂ n tĂ¡c!`);
    if (!confirmed) return;

    try {
      await firstValueFrom(this.questionApi.deleteQuestion(question.id));
      alert('âœ… ÄĂ£ xĂ³a cĂ¢u há»i thĂ nh cĂ´ng!');

      if (this.selectedPackage()) {
        await this.loadQuestionsInPackage(this.selectedPackage()!.id);
        await this.loadPackages(); // Refresh package counts
      } else {
        // Refresh ALL mode
        await this.onPackageChange();
      }
    } catch (error: any) {
      console.error('Error deleting question:', error);
      alert('Lá»—i khi xĂ³a cĂ¢u há»i: ' + (error?.message || 'Lá»—i khĂ´ng xĂ¡c Ä‘á»‹nh'));
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
      alert('KhĂ´ng tĂ¬m tháº¥y Quiz Ä‘á»ƒ thĂªm cĂ¢u há»i');
      return;
    }

    const selectedIds = this.selectedQuestions();
    if (selectedIds.length === 0) {
      alert('Vui lĂ²ng chá»n Ă­t nháº¥t má»™t cĂ¢u há»i');
      return;
    }

    this.addingToQuiz.set(true);

    try {
      let addedCount = 0;
      let skippedCount = 0;

      // Add each question using the API
      for (const questionId of selectedIds) {
        try {
          console.log('đŸ”„ Adding question to quiz - lessonId:', this.addToQuizLessonId, 'questionId:', questionId);
          const result = await firstValueFrom(this.quizApi.addQuestionToQuiz(this.addToQuizLessonId!, questionId));
          console.log('âœ… Add question result:', result);
          addedCount++;
        } catch (error: any) {
          console.error('âŒ Error adding question:', questionId, error);
          // Question might already exist
          if (error?.error?.message?.includes('Ä‘Ă£ tá»“n táº¡i')) {
            skippedCount++;
          } else {
            console.error('Full error:', JSON.stringify(error, null, 2));
          }
        }
      }

      // Show result
      if (addedCount > 0) {
        let msg = `âœ… ÄĂ£ thĂªm ${addedCount} cĂ¢u há»i vĂ o Quiz!`;
        if (skippedCount > 0) {
          msg += `\nâ ï¸ ${skippedCount} cĂ¢u Ä‘Ă£ cĂ³ sáºµn trong Quiz.`;
        }
        alert(msg);
      } else if (skippedCount > 0) {
        alert('â ï¸ Táº¥t cáº£ cĂ¢u há»i Ä‘Ă£ cĂ³ trong Quiz rá»“i!');
      }

      this.clearSelection();

      // Navigate back if returnUrl is provided
      if (this.returnUrl) {
        this.router.navigateByUrl(this.returnUrl);
      }
    } catch (error: any) {
      console.error('Error adding questions to quiz:', error);
      alert('âŒ Lá»—i khi thĂªm cĂ¢u há»i: ' + (error?.message || 'Lá»—i khĂ´ng xĂ¡c Ä‘á»‹nh'));
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

      alert('âœ… ÄĂ£ di chuyá»ƒn cĂ¢u há»i thĂ nh cĂ´ng!');
      this.showMoveModal = false;
      this.clearSelection();

      if (this.selectedPackage()) {
        await this.loadQuestionsInPackage(this.selectedPackage()!.id);
      } else {
        await this.onPackageChange();
      }
      await this.loadPackages(); // Refresh package counts
    } catch (error: any) {
      console.error('Error moving questions:', error);
      alert('Lá»—i khi di chuyá»ƒn cĂ¢u há»i: ' + (error?.message || 'Lá»—i khĂ´ng xĂ¡c Ä‘á»‹nh'));
    }
  }

  // ==================== IMPORT METHODS ====================

  openImportModal() {
    if (!this.selectedPackageId) {
      alert('Vui lĂ²ng chá»n gĂ³i cĂ¢u há»i trÆ°á»›c khi import');
      return;
    }
    if (this.importModal) {
      this.importModal.open();
    }
  }

  async onQuestionsImported(result: QuestionImportResult) {
    console.log('âœ… Questions imported:', result);
    // Reload questions in current package
    if (this.selectedPackage()) {
      await this.loadQuestionsInPackage(this.selectedPackage()!.id);
    }
    // Refresh package counts
    await this.loadPackages();
  }

  onImportModalClosed() {
    console.log('Import modal closed');
  }
}

