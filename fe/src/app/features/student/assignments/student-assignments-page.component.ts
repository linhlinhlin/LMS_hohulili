import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { QuizApi, QuizAttemptResponse } from '../../../api/endpoints/quiz.api';
import { StudentTaskService, StudentWorkItem, WorkType } from '../services/student-task.service';
import {
  TaskTab,
  AssignmentFilters,
  filterByTab,
  countByTab,
  filterAssignments,
  formatDeadlineRelative,
  sortByDueDate,
  getUniqueCourses,
  canRetryQuiz,
} from './utils/assignment-utils';

interface CourseGroup {
  courseId: string;
  courseTitle: string;
  items: StudentWorkItem[];
}

const ITEMS_PER_GROUP = 5;

type ContentTab = 'assignments' | 'quizzes';

@Component({
  selector: 'app-student-assignments-page',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-assignments-page.component.html',
  styleUrl: './student-assignments-page.component.scss',
})
export class StudentAssignmentsPageComponent implements OnInit {
  protected authService = inject(AuthService);
  private taskService = inject(StudentTaskService);
  private quizApi = inject(QuizApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  // Data
  allItems = signal<StudentWorkItem[]>([]);
  courses = signal<{ id: string; title: string }[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Navigation: content type tab
  contentTab = signal<ContentTab>('assignments');

  // Filters
  activeTab = signal<TaskTab>('todo');
  selectedCourse = signal('');
  searchQuery = signal('');

  // Content tab counts (from ALL items, not filtered)
  assignmentCount = computed(() =>
    this.allItems().filter((i) => i.workType === 'ASSIGNMENT').length
  );
  quizCount = computed(() =>
    this.allItems().filter((i) => i.workType !== 'ASSIGNMENT').length
  );

  // Items filtered by content tab
  private contentItems = computed(() => {
    const all = this.allItems();
    return this.contentTab() === 'assignments'
      ? all.filter((i) => i.workType === 'ASSIGNMENT')
      : all.filter((i) => i.workType !== 'ASSIGNMENT');
  });

  // Status tab counts (within current content tab)
  tabCounts = computed(() => countByTab(this.contentItems()));

  /** Quiz "Cần làm" count — only genuinely pending items */
  quizTodoCount = computed(() => {
    return this.tabCounts().todo;
  });

  // Final filtered + sorted items
  filteredItems = computed(() => {
    const items = this.contentItems();
    const tab = this.activeTab();

    let result: StudentWorkItem[];
    result = filterByTab(items, tab);

    const filters: AssignmentFilters = {};
    if (this.selectedCourse()) filters.courseId = this.selectedCourse();
    if (this.searchQuery()) filters.searchQuery = this.searchQuery();

    result = filterAssignments(result, filters);
    return sortByDueDate(result);
  });

  // Group by course (teacher quiz-list pattern: lightweight headers)
  courseGroups = computed(() => {
    const items = this.filteredItems();
    const map = new Map<string, CourseGroup>();

    for (const item of items) {
      if (!map.has(item.courseId)) {
        map.set(item.courseId, {
          courseId: item.courseId,
          courseTitle: item.courseTitle,
          items: [],
        });
      }
      map.get(item.courseId)!.items.push(item);
    }

    return Array.from(map.values());
  });

  hasActiveFilters = computed(() =>
    !!(this.selectedCourse() || this.searchQuery())
  );

  // Page-level Load More — limit visible course groups (library pattern)
  private readonly INITIAL_GROUPS = 3;
  private readonly LOAD_MORE_GROUPS = 3;
  visibleGroupCount = signal(3);

  visibleGroups = computed(() => this.courseGroups().slice(0, this.visibleGroupCount()));
  hasMoreGroups = computed(() => this.visibleGroupCount() < this.courseGroups().length);
  remainingGroupCount = computed(() => Math.max(0, this.courseGroups().length - this.visibleGroupCount()));

  // "Show more / Collapse" per course group
  expandedGroups = signal<Set<string>>(new Set());

  ngOnInit(): void {
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'quizzes') {
      this.contentTab.set('quizzes');
    }
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading.set(true);
    this.error.set(null);
    this.taskService.getStudentTasks().subscribe({
      next: (items) => {
        this.allItems.set(items);
        this.courses.set(getUniqueCourses(items));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Không thể tải danh sách. Vui lòng thử lại.');
        this.loading.set(false);
      },
    });
  }

  loadMoreGroups(): void {
    this.visibleGroupCount.update(c => c + this.LOAD_MORE_GROUPS);
  }

  setContentTab(tab: ContentTab): void {
    this.contentTab.set(tab);
    this.activeTab.set('todo');
    this.expandedGroups.set(new Set());
    this.visibleGroupCount.set(this.INITIAL_GROUPS);
  }

  setTab(tab: TaskTab): void {
    this.activeTab.set(tab);
    this.expandedGroups.set(new Set());
    this.visibleGroupCount.set(this.INITIAL_GROUPS);
  }

  resetFilters(): void {
    this.selectedCourse.set('');
    this.searchQuery.set('');
    this.visibleGroupCount.set(this.INITIAL_GROUPS);
  }

  navigateToItem(item: StudentWorkItem): void {
    if (item.status === 'NOT_AVAILABLE' || item.status === 'LOCKED') return;

    if (item.workType === 'ASSIGNMENT') {
      this.router.navigate(['/student/tasks', item.itemId, 'work']);
      return;
    }

    // Quiz/Exam/Practice — pre-check BEFORE navigating (Coursera/Canvas pattern: no blank error pages)
    const isExhausted = item.maxAttempts != null
      && item.maxAttempts > 0
      && (item.attemptCount ?? 0) >= item.maxAttempts;

    const isOverdueNoAttempt = item.status === 'OVERDUE' && (item.attemptCount ?? 0) === 0;

    // Case 1: Exhausted + has result → view result
    if (isExhausted && item.attemptId) {
      this.router.navigate(['/student/quiz/result'], {
        queryParams: { attemptId: item.attemptId, returnUrl: '/student/tasks?tab=quizzes' },
      });
      return;
    }

    // Case 2: Exhausted, no result → toast inline
    if (isExhausted) {
      this.toast.warning('Bạn đã sử dụng hết số lần làm bài cho phép.');
      return;
    }

    // Case 3: Overdue, never attempted → toast inline (server will reject anyway)
    if (isOverdueNoAttempt) {
      this.toast.warning('Bài kiểm tra này đã quá hạn.');
      return;
    }

    // Case 4: Graded, can't retry → view result
    if (item.status === 'GRADED' && !canRetryQuiz(item) && item.attemptId) {
      this.router.navigate(['/student/quiz/result'], {
        queryParams: { attemptId: item.attemptId, returnUrl: '/student/tasks?tab=quizzes' },
      });
      return;
    }

    // Case 5: Can take/retake → navigate to quiz
    this.router.navigate(['/student/quiz/take', item.itemId], {
      queryParams: { returnUrl: '/student/tasks?tab=quizzes' },
    });
  }

  // Template helpers
  formatRelativeDeadline(item: StudentWorkItem): string {
    return formatDeadlineRelative(item.daysUntilDue);
  }

  getActionLabel(item: StudentWorkItem): string {
    const isQuiz = item.workType !== 'ASSIGNMENT';
    switch (item.status) {
      case 'NOT_STARTED': return isQuiz ? 'Bắt đầu làm' : 'Bắt đầu';
      case 'IN_PROGRESS': return isQuiz ? 'Tiếp tục làm' : 'Tiếp tục';
      case 'SUBMITTED': return isQuiz ? 'Xem kết quả' : 'Xem bài nộp';
      case 'GRADED':
        if (isQuiz && canRetryQuiz(item)) return 'Làm lại';
        return isQuiz ? 'Xem kết quả' : 'Xem điểm';
      case 'OVERDUE': return isQuiz ? 'Làm bài' : 'Nộp muộn';
      case 'NOT_AVAILABLE': return 'Chưa mở';
      case 'LOCKED': return 'Đã đóng';
      default: return 'Xem';
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  getWorkTypeLabel(type: WorkType): string {
    switch (type) {
      case 'ASSIGNMENT': return 'Bài tập';
      case 'QUIZ': return 'Kiểm tra';
      case 'EXAM': return 'Bài thi';
      case 'PRACTICE': return 'Luyện tập';
    }
  }

  getVisibleItems(group: CourseGroup): StudentWorkItem[] {
    if (this.expandedGroups().has(group.courseId)) return group.items;
    return group.items.slice(0, ITEMS_PER_GROUP);
  }

  hasMoreItems(group: CourseGroup): boolean {
    return group.items.length > ITEMS_PER_GROUP && !this.expandedGroups().has(group.courseId);
  }

  isGroupExpanded(group: CourseGroup): boolean {
    return this.expandedGroups().has(group.courseId) && group.items.length > ITEMS_PER_GROUP;
  }

  toggleGroupExpand(courseId: string): void {
    const current = new Set(this.expandedGroups());
    if (current.has(courseId)) {
      current.delete(courseId);
    } else {
      current.add(courseId);
    }
    this.expandedGroups.set(current);
  }

  isOverdue(item: StudentWorkItem): boolean {
    return item.status === 'OVERDUE' || item.isOverdue;
  }

  isRetryable(item: StudentWorkItem): boolean {
    return canRetryQuiz(item);
  }

  /** Quizzes are auto-graded → "Đã nộp" tab irrelevant for quizzes */
  showSubmittedTab(): boolean {
    return this.contentTab() === 'assignments';
  }

  /** Whether to show quiz-style 2-tab (Cần làm + Đã hoàn thành) */
  isQuizTab(): boolean {
    return this.contentTab() === 'quizzes';
  }

  // ============ Attempt History ============

  /** Map of quizId → attempts (lazy-loaded on toggle) */
  attemptHistoryMap = signal<Record<string, QuizAttemptResponse[]>>({});
  /** Set of quizIds with history panel open */
  expandedHistoryIds = signal<Set<string>>(new Set());
  /** Set of quizIds currently loading */
  loadingHistoryIds = signal<Set<string>>(new Set());

  hasAttemptHistory(item: StudentWorkItem): boolean {
    return item.workType !== 'ASSIGNMENT' && (item.attemptCount ?? 0) > 0;
  }

  isHistoryExpanded(itemId: string): boolean {
    return this.expandedHistoryIds().has(itemId);
  }

  isHistoryLoading(itemId: string): boolean {
    return this.loadingHistoryIds().has(itemId);
  }

  getAttemptHistory(itemId: string): QuizAttemptResponse[] {
    return this.attemptHistoryMap()[itemId] || [];
  }

  async toggleAttemptHistory(item: StudentWorkItem, event: Event): Promise<void> {
    event.stopPropagation();
    const id = item.itemId;
    const expanded = new Set(this.expandedHistoryIds());

    if (expanded.has(id)) {
      expanded.delete(id);
      this.expandedHistoryIds.set(expanded);
      return;
    }

    // If already loaded, just expand
    if (this.attemptHistoryMap()[id]) {
      expanded.add(id);
      this.expandedHistoryIds.set(expanded);
      return;
    }

    // Fetch from API
    const loading = new Set(this.loadingHistoryIds());
    loading.add(id);
    this.loadingHistoryIds.set(loading);

    try {
      const response = await firstValueFrom(this.quizApi.getStudentAttempts(id));
      const attempts = (response as any)?.content || (response as any)?.data?.content || [];
      const map = { ...this.attemptHistoryMap() };
      map[id] = attempts;
      this.attemptHistoryMap.set(map);
      expanded.add(id);
      this.expandedHistoryIds.set(expanded);
    } catch {
      // Silently fail — button remains clickable
    } finally {
      const l = new Set(this.loadingHistoryIds());
      l.delete(id);
      this.loadingHistoryIds.set(l);
    }
  }

  formatAttemptDate(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  navigateToAttemptResult(attemptId: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/student/quiz/result'], {
      queryParams: { attemptId, returnUrl: '/student/tasks?tab=quizzes' },
    });
  }
}

