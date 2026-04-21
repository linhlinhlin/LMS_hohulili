import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { QuizApi } from '../../../../api/endpoints/quiz.api';
import { CourseApi } from '../../../../api/client/course.api';
import { ChapterApi } from '../../../../api/client/chapter.api';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

type StatusFilter = '' | 'NEEDS_GRADING' | 'OPEN' | 'DRAFT' | 'CLOSED';
type QuizTypeFilter = '' | 'PRACTICE' | 'ASSESSMENT' | 'EXAM';
type SortKey = 'NEWEST' | 'OLDEST' | 'TITLE_AZ' | 'TITLE_ZA' | 'AVG_SCORE' | 'PASS_RATE';

interface TeacherQuiz {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  quizType?: 'PRACTICE' | 'ASSESSMENT' | 'EXAM';
  assignmentScope?: 'LESSON' | 'COURSE' | 'CLASS';
  deliveryMode?: 'SELF_PACED' | 'INSTRUCTOR_LED' | string;
  courseId?: string;
  courseTitle?: string;
  classId?: string;
  className?: string;
  timeLimitMinutes?: number;
  maxAttempts?: number;
  passingScore?: number;
  questionCount: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  availableFrom?: string;
  lockAt?: string;
  essayQuestionCount?: number;
  pendingEssayCount?: number;
  attemptStudentCount?: number;
  completedAttempts?: number;
  totalAttempts?: number;
  averageScore?: number | null;
  passRate?: number | null;
  passedCount?: number;
  totalEnrolled?: number;
}

interface CourseGroup {
  courseId: string;
  actualCourseId?: string;
  courseTitle: string;
  quizzes: TeacherQuiz[];
  totalCount: number;
  pendingEssayCount: number;
  openCount: number;
  draftCount: number;
  closedCount: number;
}

@Component({
  selector: 'app-quiz-list',
  imports: [CommonModule, RouterModule, LucideAngularModule, FormsModule, DialogComponent, EmptyStateComponent],
  templateUrl: './quiz-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent implements OnInit {
  private readonly quizApi = inject(QuizApi);
  private readonly courseApi = inject(CourseApi);
  private readonly chapterApi = inject(ChapterApi);
  private readonly router = inject(Router);

  readonly showCreateModal = signal(false);
  readonly createStep = signal<1 | 2>(1);
  readonly createCourses = signal<any[]>([]);
  readonly createSelectedCourseId = signal('');
  readonly createSearchTerm = signal('');
  readonly createChapters = signal<any[]>([]);
  readonly createSelectedChapterId = signal('');
  readonly createTitle = signal('');
  readonly createLoading = signal(false);
  readonly createError = signal('');

  readonly quizzes = signal<TeacherQuiz[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedCourseId = signal<string | null>(null);
  readonly catalogVisibleLimit = signal(8);
  readonly detailVisibleLimit = signal(10);

  readonly searchQuery = signal('');
  readonly statusFilter = signal<StatusFilter>('');
  readonly typeFilter = signal<QuizTypeFilter>('');
  readonly courseFilter = signal('');
  readonly sortKey = signal<SortKey>('NEWEST');
  readonly openDropdown = signal<string | null>(null);

  readonly filteredCreateCourses = computed(() => {
    const term = this.createSearchTerm().toLowerCase().trim();
    const courses = this.createCourses();
    if (!term) {
      return courses;
    }

    return courses.filter((course: any) =>
      (course.title || '').toLowerCase().includes(term) ||
      (course.code || '').toLowerCase().includes(term)
    );
  });

  readonly availableCourses = computed(() => {
    const seen = new Map<string, string>();

    for (const quiz of this.quizzes()) {
      if (quiz.courseId && quiz.courseTitle && !seen.has(quiz.courseId)) {
        seen.set(quiz.courseId, quiz.courseTitle);
      }
    }

    return Array.from(seen.entries())
      .map(([id, title]) => ({ id, title }))
      .sort((left, right) => left.title.localeCompare(right.title, 'vi'));
  });

  readonly showCourseFilter = computed(() => this.availableCourses().length >= 2);

  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.statusFilter()) count++;
    if (this.typeFilter()) count++;
    if (this.courseFilter()) count++;
    return count;
  });

  readonly contextFilteredQuizzes = computed(() => {
    let list = this.quizzes();
    const status = this.statusFilter();
    const type = this.typeFilter();
    const course = this.courseFilter();

    if (status) {
      switch (status) {
        case 'NEEDS_GRADING':
          list = list.filter(quiz => (quiz.pendingEssayCount ?? 0) > 0);
          break;
        case 'OPEN':
          list = list.filter(quiz => this.isQuizOpen(quiz));
          break;
        case 'DRAFT':
          list = list.filter(quiz => quiz.status?.toUpperCase() === 'DRAFT');
          break;
        case 'CLOSED':
          list = list.filter(quiz => this.isQuizClosed(quiz));
          break;
      }
    }

    if (type) {
      list = list.filter(quiz => quiz.quizType === type);
    }

    if (course) {
      list = list.filter(quiz => quiz.courseId === course);
    }

    return this.applySorting(list);
  });

  readonly allCourseGroups = computed<CourseGroup[]>(() => this.buildCourseGroups(this.quizzes()));

  readonly catalogCourseGroups = computed<CourseGroup[]>(() => {
    const searchTerm = this.searchQuery().toLowerCase().trim();
    const groups = this.buildCourseGroups(this.contextFilteredQuizzes());

    if (!searchTerm) {
      return groups;
    }

    return groups.filter(group =>
      group.courseTitle.toLowerCase().includes(searchTerm) ||
      group.quizzes.some(quiz =>
        (quiz.title || '').toLowerCase().includes(searchTerm) ||
        (quiz.className || '').toLowerCase().includes(searchTerm)
      )
    );
  });

  readonly selectedCourseGroup = computed<CourseGroup | null>(() => {
    const courseId = this.selectedCourseId();
    if (!courseId) {
      return null;
    }

    return this.allCourseGroups().find(group => group.courseId === courseId) ?? null;
  });

  readonly selectedCourseQuizzes = computed<TeacherQuiz[]>(() => {
    const courseId = this.selectedCourseId();
    if (!courseId) {
      return [];
    }

    const searchTerm = this.searchQuery().toLowerCase().trim();
    let list = this.contextFilteredQuizzes().filter(quiz => this.getQuizCourseKey(quiz) === courseId);

    if (searchTerm) {
      list = list.filter(quiz =>
        (quiz.title || '').toLowerCase().includes(searchTerm) ||
        (quiz.courseTitle || '').toLowerCase().includes(searchTerm) ||
        (quiz.className || '').toLowerCase().includes(searchTerm)
      );
    }

    return this.applySorting(list);
  });

  readonly catalogTotal = computed(() => this.catalogCourseGroups().length);
  readonly visibleCourseGroups = computed(() =>
    this.catalogCourseGroups().slice(0, this.catalogVisibleLimit())
  );
  readonly hasMoreCourseGroups = computed(() =>
    this.visibleCourseGroups().length < this.catalogTotal()
  );
  readonly remainingCourseGroups = computed(() =>
    Math.max(0, this.catalogTotal() - this.visibleCourseGroups().length)
  );

  readonly detailTotal = computed(() => this.selectedCourseQuizzes().length);
  readonly visibleSelectedQuizzes = computed(() =>
    this.selectedCourseQuizzes().slice(0, this.detailVisibleLimit())
  );
  readonly hasMoreSelectedQuizzes = computed(() =>
    this.visibleSelectedQuizzes().length < this.detailTotal()
  );
  readonly remainingSelectedQuizzes = computed(() =>
    Math.max(0, this.detailTotal() - this.visibleSelectedQuizzes().length)
  );

  readonly totalPendingEssays = computed(() =>
    this.quizzes().reduce((sum, quiz) => sum + (quiz.pendingEssayCount ?? 0), 0)
  );
  readonly quizzesWithPendingEssays = computed(() =>
    this.quizzes().filter(quiz => (quiz.pendingEssayCount ?? 0) > 0).length
  );

  readonly statusFilterLabel = computed(() => {
    const labels: Record<string, string> = {
      '': 'Tr\u1ea1ng th\u00e1i',
      'NEEDS_GRADING': 'C\u1ea7n ch\u1ea5m',
      OPEN: '\u0110ang m\u1edf',
      DRAFT: 'B\u1ea3n nh\u00e1p',
      CLOSED: 'K\u1ebft th\u00fac',
    };
    return labels[this.statusFilter()] || 'Tr\u1ea1ng th\u00e1i';
  });

  readonly typeFilterLabel = computed(() => {
    const labels: Record<string, string> = {
      '': 'Lo\u1ea1i',
      PRACTICE: 'Luy\u1ec7n t\u1eadp',
      ASSESSMENT: 'Ki\u1ec3m tra',
      EXAM: 'B\u00e0i thi',
    };
    return labels[this.typeFilter()] || 'Lo\u1ea1i';
  });

  readonly courseFilterLabel = computed(() => {
    const id = this.courseFilter();
    if (!id) {
      return 'Kh\u00f3a h\u1ecdc';
    }

    return this.availableCourses().find(course => course.id === id)?.title || 'Kh\u00f3a h\u1ecdc';
  });

  readonly sortLabel = computed(() => {
    const labels: Record<SortKey, string> = {
      NEWEST: 'M\u1edbi nh\u1ea5t',
      OLDEST: 'C\u0169 nh\u1ea5t',
      TITLE_AZ: 'T\u00ean A-Z',
      TITLE_ZA: 'T\u00ean Z-A',
      AVG_SCORE: '\u0110i\u1ec3m TB cao nh\u1ea5t',
      PASS_RATE: 'T\u1ef7 l\u1ec7 \u0111\u1ea1t cao nh\u1ea5t',
    };
    return labels[this.sortKey()];
  });

  readonly needsGradingCount = computed(() =>
    this.quizzes().filter(quiz => (quiz.pendingEssayCount ?? 0) > 0).length
  );
  readonly openCount = computed(() =>
    this.quizzes().filter(quiz => this.isQuizOpen(quiz)).length
  );
  readonly draftCount = computed(() =>
    this.quizzes().filter(quiz => quiz.status?.toUpperCase() === 'DRAFT').length
  );
  readonly closedCount = computed(() =>
    this.quizzes().filter(quiz => this.isQuizClosed(quiz)).length
  );

  ngOnInit(): void {
    this.loadQuizzes();
  }

  loadQuizzes(): void {
    this.loading.set(true);
    this.error.set(null);

    this.quizApi.getTeacherQuizzes().subscribe({
      next: (response: any) => {
        const data: TeacherQuiz[] = response?.data ?? response ?? [];
        this.quizzes.set(data);
      },
      error: () => {
        this.error.set('Kh\u00f4ng th\u1ec3 t\u1ea3i danh s\u00e1ch b\u00e0i ki\u1ec3m tra. Vui l\u00f2ng th\u1eed l\u1ea1i.');
        this.quizzes.set([]);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }

  updateSearchQuery(query: string): void {
    this.searchQuery.set(query);
    this.catalogVisibleLimit.set(8);
    this.detailVisibleLimit.set(10);
  }

  setStatusFilter(value: StatusFilter): void {
    this.statusFilter.set(value);
    this.openDropdown.set(null);
    this.catalogVisibleLimit.set(8);
    this.detailVisibleLimit.set(10);
  }

  setTypeFilter(value: QuizTypeFilter): void {
    this.typeFilter.set(value);
    this.openDropdown.set(null);
    this.catalogVisibleLimit.set(8);
    this.detailVisibleLimit.set(10);
  }

  setCourseFilter(value: string): void {
    this.courseFilter.set(value);
    this.openDropdown.set(null);
    this.catalogVisibleLimit.set(8);
    this.detailVisibleLimit.set(10);
  }

  setSortKey(value: SortKey): void {
    this.sortKey.set(value);
    this.openDropdown.set(null);
    this.catalogVisibleLimit.set(8);
    this.detailVisibleLimit.set(10);
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.typeFilter.set('');
    this.courseFilter.set('');
    this.sortKey.set('NEWEST');
    this.catalogVisibleLimit.set(8);
    this.detailVisibleLimit.set(10);
    this.openDropdown.set(null);
  }

  toggleDropdown(name: string): void {
    this.openDropdown.update(current => current === name ? null : name);
  }

  closeDropdowns(): void {
    this.openDropdown.set(null);
  }

  openCourse(courseId: string): void {
    this.selectedCourseId.set(courseId);
    this.detailVisibleLimit.set(10);
    this.closeDropdowns();
  }

  backToCatalog(): void {
    this.selectedCourseId.set(null);
    this.catalogVisibleLimit.set(8);
  }

  loadMoreCatalog(): void {
    this.catalogVisibleLimit.update(current => current + 8);
  }

  loadMoreDetails(): void {
    this.detailVisibleLimit.update(current => current + 10);
  }

  selectCreateCourse(courseId: string): void {
    this.createSelectedCourseId.set(courseId);
  }

  getCreateSelectedCourseTitle(): string {
    const id = this.createSelectedCourseId();
    if (!id) {
      return '';
    }

    return this.createCourses().find((course: any) => course.id === id)?.title || '';
  }

  openCreateModal(preselectedCourseId?: string | null): void {
    this.showCreateModal.set(true);
    this.createStep.set(1);
    this.createSelectedCourseId.set(preselectedCourseId || '');
    this.createSearchTerm.set('');
    this.createChapters.set([]);
    this.createSelectedChapterId.set('');
    this.createTitle.set('');
    this.createError.set('');

    if (this.createCourses().length === 0) {
      this.courseApi.myCourses().subscribe({
        next: (response: any) => {
          const list = Array.isArray(response) ? response : (response?.data ?? []);
          this.createCourses.set(list);
        }
      });
    }
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  proceedToStep2(): void {
    const courseId = this.createSelectedCourseId();
    if (!courseId) {
      return;
    }

    this.createStep.set(2);
    this.createLoading.set(true);

    this.chapterApi.listChaptersFlat(courseId).subscribe({
      next: (response: any) => {
        const chapters = Array.isArray(response) ? response : (response?.data ?? []);
        this.createChapters.set(chapters);
        if (chapters.length > 0) {
          this.createSelectedChapterId.set(chapters[0].id);
        }
      },
      error: () => this.createChapters.set([]),
      complete: () => this.createLoading.set(false),
    });
  }

  backToStep1(): void {
    this.createStep.set(1);
  }

  async submitCreate(): Promise<void> {
    const courseId = this.createSelectedCourseId();
    const chapterId = this.createSelectedChapterId();
    const title = this.createTitle().trim();

    if (!courseId || !chapterId || !title) {
      this.createError.set('Vui l\u00f2ng \u0111i\u1ec1n \u0111\u1ea7y \u0111\u1ee7 th\u00f4ng tin.');
      return;
    }

    this.createLoading.set(true);
    this.createError.set('');

    try {
      const result: any = await firstValueFrom(
        this.quizApi.createCourseQuizV3(courseId, {
          title,
          chapterId,
          quizType: 'ASSESSMENT',
          questionIds: [],
          publishImmediately: false,
          passingScore: 70,
          maxAttempts: 1,
          timeLimitMinutes: 30,
        } as any)
      );

      const quizId = result?.data?.id || result?.data?.quizId || result?.quizId || result?.id;
      this.closeCreateModal();

      if (quizId) {
        this.router.navigate(
          ['/teacher/assessments/classes/quizzes', quizId, 'editor'],
          { queryParams: { tab: 'settings' } }
        );
      } else {
        this.loadQuizzes();
      }
    } catch (error: any) {
      this.createError.set(error?.error?.message || 'Kh\u00f4ng th\u1ec3 t\u1ea1o b\u00e0i ki\u1ec3m tra. Vui l\u00f2ng th\u1eed l\u1ea1i.');
    } finally {
      this.createLoading.set(false);
    }
  }

  navigateToQuiz(quiz: TeacherQuiz): void {
    this.router.navigate(['/teacher/assessments/classes/quizzes', quiz.id, 'results']);
  }

  getCourseEditorLink(courseId: string): string[] {
    return ['/teacher/courses', courseId, 'editor', 'curriculum'];
  }

  getStatusClass(quiz: TeacherQuiz): string {
    if (quiz.status?.toUpperCase() === 'DRAFT') {
      return 'bg-slate-50 text-slate-600 border border-slate-200';
    }

    if (this.isQuizClosed(quiz)) {
      return 'bg-slate-100 text-slate-600 border border-slate-200';
    }

    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }

  getStatusText(quiz: TeacherQuiz): string {
    if (quiz.status?.toUpperCase() === 'DRAFT') {
      return 'B\u1ea3n nh\u00e1p';
    }

    if (this.isQuizClosed(quiz)) {
      return 'K\u1ebft th\u00fac';
    }

    return '\u0110ang m\u1edf';
  }

  getQuizTypeClass(quizType?: string): string {
    switch (quizType) {
      case 'PRACTICE':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'EXAM':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-200';
    }
  }

  getQuizTypeText(quizType?: string): string {
    switch (quizType) {
      case 'PRACTICE':
        return 'Luy\u1ec7n t\u1eadp';
      case 'EXAM':
        return 'B\u00e0i thi';
      default:
        return 'Ki\u1ec3m tra';
    }
  }

  getQuizTypeIcon(quizType?: string): string {
    switch (quizType) {
      case 'PRACTICE':
        return 'refresh-cw';
      case 'EXAM':
        return 'shield-check';
      default:
        return 'clipboard-check';
    }
  }

  getPassRateClass(passRate: number | null | undefined): string {
    if (passRate == null) {
      return '';
    }

    if (passRate >= 70) {
      return 'bg-emerald-50 text-emerald-700';
    }

    if (passRate >= 40) {
      return 'bg-amber-50 text-amber-700';
    }

    return 'bg-red-50 text-red-700';
  }

  isQuizOpen(quiz: TeacherQuiz): boolean {
    if (quiz.status?.toUpperCase() !== 'PUBLISHED') {
      return false;
    }

    if (quiz.lockAt && new Date(quiz.lockAt) < new Date()) {
      return false;
    }

    return true;
  }

  isQuizClosed(quiz: TeacherQuiz): boolean {
    if (quiz.status?.toUpperCase() !== 'PUBLISHED') {
      return false;
    }

    if (!quiz.lockAt) {
      return false;
    }

    return new Date(quiz.lockAt) < new Date();
  }

  hasEssayQuestions(quiz: TeacherQuiz): boolean {
    return (quiz.essayQuestionCount ?? 0) > 0;
  }

  private getQuizCourseKey(quiz: TeacherQuiz): string {
    return quiz.courseId || quiz.courseTitle || `course-${quiz.id}`;
  }

  private buildCourseGroups(quizzes: TeacherQuiz[]): CourseGroup[] {
    const groups = new Map<string, CourseGroup>();

    for (const quiz of this.applySorting(quizzes)) {
      const key = this.getQuizCourseKey(quiz);
      const current = groups.get(key);

      if (current) {
        current.quizzes.push(quiz);
        current.totalCount += 1;
        current.pendingEssayCount += quiz.pendingEssayCount ?? 0;
        current.openCount += this.isQuizOpen(quiz) ? 1 : 0;
        current.draftCount += quiz.status?.toUpperCase() === 'DRAFT' ? 1 : 0;
        current.closedCount += this.isQuizClosed(quiz) ? 1 : 0;
      } else {
        groups.set(key, {
          courseId: key,
          actualCourseId: quiz.courseId,
          courseTitle: quiz.courseTitle || 'Kh\u00f3a h\u1ecdc ch\u01b0a x\u00e1c \u0111\u1ecbnh',
          quizzes: [quiz],
          totalCount: 1,
          pendingEssayCount: quiz.pendingEssayCount ?? 0,
          openCount: this.isQuizOpen(quiz) ? 1 : 0,
          draftCount: quiz.status?.toUpperCase() === 'DRAFT' ? 1 : 0,
          closedCount: this.isQuizClosed(quiz) ? 1 : 0,
        });
      }
    }

    return Array.from(groups.values()).sort((left, right) =>
      left.courseTitle.localeCompare(right.courseTitle, 'vi')
    );
  }

  private applySorting(quizzes: TeacherQuiz[]): TeacherQuiz[] {
    const sorted = [...quizzes];
    const key = this.sortKey();

    sorted.sort((left, right) => {
      const leftPending = left.pendingEssayCount ?? 0;
      const rightPending = right.pendingEssayCount ?? 0;

      if (leftPending > 0 && rightPending === 0) return -1;
      if (rightPending > 0 && leftPending === 0) return 1;

      switch (key) {
        case 'NEWEST':
          return (Date.parse(right.updatedAt || right.createdAt || '') || 0) -
            (Date.parse(left.updatedAt || left.createdAt || '') || 0);
        case 'OLDEST':
          return (Date.parse(left.createdAt || '') || 0) -
            (Date.parse(right.createdAt || '') || 0);
        case 'TITLE_AZ':
          return (left.title || '').localeCompare(right.title || '', 'vi');
        case 'TITLE_ZA':
          return (right.title || '').localeCompare(left.title || '', 'vi');
        case 'AVG_SCORE':
          return (right.averageScore ?? -1) - (left.averageScore ?? -1);
        case 'PASS_RATE':
          return (right.passRate ?? -1) - (left.passRate ?? -1);
        default:
          return 0;
      }
    });

    return sorted;
  }
}
