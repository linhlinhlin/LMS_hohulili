import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { QuizApi } from '../../../../api/endpoints/quiz.api';
import { CourseApi } from '../../../../api/client/course.api';
import { ChapterApi } from '../../../../api/client/chapter.api';
import { firstValueFrom } from 'rxjs';

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
  courseTitle: string;
  quizzes: TeacherQuiz[];
}

@Component({
  selector: 'app-quiz-list',
  imports: [CommonModule, RouterModule, LucideAngularModule, FormsModule],
  templateUrl: './quiz-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent implements OnInit {
  private readonly quizApi = inject(QuizApi);
  private readonly courseApi = inject(CourseApi);
  private readonly chapterApi = inject(ChapterApi);
  private readonly router = inject(Router);

  // Create quiz modal
  readonly showCreateModal = signal(false);
  readonly createStep = signal<1 | 2>(1);  // step 1: chọn khóa, step 2: chương + tiêu đề
  readonly createCourses = signal<any[]>([]);
  readonly createSelectedCourseId = signal('');
  readonly createSearchTerm = signal('');
  readonly createChapters = signal<any[]>([]);
  readonly createSelectedChapterId = signal('');
  readonly createTitle = signal('');
  readonly createLoading = signal(false);
  readonly createError = signal('');

  readonly filteredCreateCourses = computed(() => {
    const term = this.createSearchTerm().toLowerCase().trim();
    const courses = this.createCourses();
    if (!term) return courses;
    return courses.filter((c: any) =>
      (c.title || '').toLowerCase().includes(term) ||
      (c.code || '').toLowerCase().includes(term)
    );
  });

  readonly quizzes = signal<TeacherQuiz[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // --- Filters (all dropdowns, 1 row) ---
  readonly searchQuery = signal('');
  readonly statusFilter = signal<StatusFilter>('');
  readonly typeFilter = signal<QuizTypeFilter>('');
  readonly courseFilter = signal('');
  readonly sortKey = signal<SortKey>('NEWEST');

  // --- Dropdown state ---
  readonly openDropdown = signal<string | null>(null);

  // --- Derived: available courses ---
  readonly availableCourses = computed(() => {
    const seen = new Map<string, string>();
    for (const q of this.quizzes()) {
      if (q.courseId && q.courseTitle && !seen.has(q.courseId)) {
        seen.set(q.courseId, q.courseTitle);
      }
    }
    return Array.from(seen.entries())
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title, 'vi'));
  });

  readonly showCourseFilter = computed(() => this.availableCourses().length >= 2);

  // --- Active filters count ---
  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.statusFilter()) count++;
    if (this.typeFilter()) count++;
    if (this.courseFilter()) count++;
    return count;
  });

  // --- Filtered + sorted quizzes ---
  readonly filteredQuizzes = computed(() => {
    let list = this.quizzes();
    const q = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    const type = this.typeFilter();
    const course = this.courseFilter();

    if (q) {
      list = list.filter(quiz =>
        (quiz.title || '').toLowerCase().includes(q) ||
        (quiz.courseTitle || '').toLowerCase().includes(q) ||
        (quiz.className || '').toLowerCase().includes(q)
      );
    }

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

  // --- Grouped by course ---
  readonly groupedQuizzes = computed<CourseGroup[]>(() => {
    const quizzes = this.filteredQuizzes();
    const groups = new Map<string, CourseGroup>();

    for (const quiz of quizzes) {
      const key = quiz.courseId || 'unknown';
      const group = groups.get(key);
      if (group) {
        group.quizzes.push(quiz);
      } else {
        groups.set(key, {
          courseId: key,
          courseTitle: quiz.courseTitle || 'Khóa học chưa xác định',
          quizzes: [quiz],
        });
      }
    }

    return Array.from(groups.values());
  });

  // --- Alert banner ---
  readonly totalPendingEssays = computed(() =>
    this.quizzes().reduce((sum, q) => sum + (q.pendingEssayCount ?? 0), 0)
  );
  readonly quizzesWithPendingEssays = computed(() =>
    this.quizzes().filter(q => (q.pendingEssayCount ?? 0) > 0).length
  );

  // --- Labels ---
  readonly statusFilterLabel = computed(() => {
    const labels: Record<string, string> = {
      '': 'Trạng thái',
      'NEEDS_GRADING': 'Cần chấm',
      'OPEN': 'Đang mở',
      'DRAFT': 'Bản nháp',
      'CLOSED': 'Kết thúc',
    };
    return labels[this.statusFilter()] || 'Trạng thái';
  });

  readonly typeFilterLabel = computed(() => {
    const labels: Record<string, string> = {
      '': 'Loại',
      'PRACTICE': 'Luyện tập',
      'ASSESSMENT': 'Kiểm tra',
      'EXAM': 'Bài thi',
    };
    return labels[this.typeFilter()] || 'Loại';
  });

  readonly courseFilterLabel = computed(() => {
    const id = this.courseFilter();
    if (!id) return 'Khóa học';
    return this.availableCourses().find(c => c.id === id)?.title || 'Khóa học';
  });

  readonly sortLabel = computed(() => {
    const labels: Record<SortKey, string> = {
      NEWEST: 'Mới nhất',
      OLDEST: 'Cũ nhất',
      TITLE_AZ: 'Tên A-Z',
      TITLE_ZA: 'Tên Z-A',
      AVG_SCORE: 'Điểm TB cao nhất',
      PASS_RATE: 'Tỷ lệ đạt cao nhất',
    };
    return labels[this.sortKey()];
  });

  // --- Counts for status dropdown badges ---
  readonly needsGradingCount = computed(() =>
    this.quizzes().filter(q => (q.pendingEssayCount ?? 0) > 0).length
  );
  readonly openCount = computed(() =>
    this.quizzes().filter(q => this.isQuizOpen(q)).length
  );
  readonly draftCount = computed(() =>
    this.quizzes().filter(q => q.status?.toUpperCase() === 'DRAFT').length
  );
  readonly closedCount = computed(() =>
    this.quizzes().filter(q => this.isQuizClosed(q)).length
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
        this.error.set('Không thể tải danh sách bài kiểm tra. Vui lòng thử lại.');
        this.quizzes.set([]);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }

  // --- Actions ---
  setStatusFilter(val: StatusFilter): void {
    this.statusFilter.set(val);
    this.openDropdown.set(null);
  }

  setTypeFilter(val: QuizTypeFilter): void {
    this.typeFilter.set(val);
    this.openDropdown.set(null);
  }

  setCourseFilter(val: string): void {
    this.courseFilter.set(val);
    this.openDropdown.set(null);
  }

  setSortKey(val: SortKey): void {
    this.sortKey.set(val);
    this.openDropdown.set(null);
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.typeFilter.set('');
    this.courseFilter.set('');
    this.sortKey.set('NEWEST');
  }

  toggleDropdown(name: string): void {
    this.openDropdown.update(cur => cur === name ? null : name);
  }

  closeDropdowns(): void {
    this.openDropdown.set(null);
  }

  selectCreateCourse(courseId: string): void {
    this.createSelectedCourseId.set(courseId);
  }

  getCreateSelectedCourseTitle(): string {
    const id = this.createSelectedCourseId();
    if (!id) return '';
    return this.createCourses().find((c: any) => c.id === id)?.title || '';
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
    this.createStep.set(1);
    this.createSelectedCourseId.set('');
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
    if (!courseId) return;
    this.createStep.set(2);
    this.createLoading.set(true);
    // Load chapters for selected course
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
      this.createError.set('Vui lòng điền đầy đủ thông tin.');
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
    } catch (err: any) {
      this.createError.set(err?.error?.message || 'Không thể tạo bài kiểm tra. Vui lòng thử lại.');
    } finally {
      this.createLoading.set(false);
    }
  }

  navigateToQuiz(quiz: TeacherQuiz): void {
    this.router.navigate(['/teacher/assessments/classes/quizzes', quiz.id, 'results']);
  }

  // --- Display helpers ---
  getStatusClass(quiz: TeacherQuiz): string {
    if (quiz.status?.toUpperCase() === 'DRAFT') return 'bg-slate-50 text-slate-600 border border-slate-200';
    if (this.isQuizClosed(quiz)) return 'bg-slate-100 text-slate-600 border border-slate-200';
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }

  getStatusText(quiz: TeacherQuiz): string {
    if (quiz.status?.toUpperCase() === 'DRAFT') return 'Bản nháp';
    if (this.isQuizClosed(quiz)) return 'Kết thúc';
    return 'Đang mở';
  }

  getQuizTypeClass(quizType?: string): string {
    switch (quizType) {
      case 'PRACTICE': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'EXAM': return 'bg-purple-50 text-purple-700 border border-purple-200';
      default: return 'bg-blue-50 text-blue-700 border border-blue-200';
    }
  }

  getQuizTypeText(quizType?: string): string {
    switch (quizType) {
      case 'PRACTICE': return 'Luyện tập';
      case 'EXAM': return 'Bài thi';
      default: return 'Kiểm tra';
    }
  }

  getQuizTypeIcon(quizType?: string): string {
    switch (quizType) {
      case 'PRACTICE': return 'refresh-cw';
      case 'EXAM': return 'shield-check';
      default: return 'clipboard-check';
    }
  }

  getPassRateClass(passRate: number | null | undefined): string {
    if (passRate == null) return '';
    if (passRate >= 70) return 'bg-emerald-50 text-emerald-700';
    if (passRate >= 40) return 'bg-amber-50 text-amber-700';
    return 'bg-red-50 text-red-700';
  }

  isQuizOpen(quiz: TeacherQuiz): boolean {
    if (quiz.status?.toUpperCase() !== 'PUBLISHED') return false;
    if (quiz.lockAt && new Date(quiz.lockAt) < new Date()) return false;
    return true;
  }

  isQuizClosed(quiz: TeacherQuiz): boolean {
    if (quiz.status?.toUpperCase() !== 'PUBLISHED') return false;
    if (!quiz.lockAt) return false;
    return new Date(quiz.lockAt) < new Date();
  }

  hasEssayQuestions(quiz: TeacherQuiz): boolean {
    return (quiz.essayQuestionCount ?? 0) > 0;
  }

  private applySorting(quizzes: TeacherQuiz[]): TeacherQuiz[] {
    const sorted = [...quizzes];
    const key = this.sortKey();

    sorted.sort((a, b) => {
      // Pending essays always float to top
      const aPending = a.pendingEssayCount ?? 0;
      const bPending = b.pendingEssayCount ?? 0;
      if (aPending > 0 && bPending === 0) return -1;
      if (bPending > 0 && aPending === 0) return 1;

      switch (key) {
        case 'NEWEST':
          return (Date.parse(b.updatedAt || b.createdAt || '') || 0) -
                 (Date.parse(a.updatedAt || a.createdAt || '') || 0);
        case 'OLDEST':
          return (Date.parse(a.createdAt || '') || 0) -
                 (Date.parse(b.createdAt || '') || 0);
        case 'TITLE_AZ':
          return (a.title || '').localeCompare(b.title || '', 'vi');
        case 'TITLE_ZA':
          return (b.title || '').localeCompare(a.title || '', 'vi');
        case 'AVG_SCORE':
          return (b.averageScore ?? -1) - (a.averageScore ?? -1);
        case 'PASS_RATE':
          return (b.passRate ?? -1) - (a.passRate ?? -1);
        default:
          return 0;
      }
    });

    return sorted;
  }
}
