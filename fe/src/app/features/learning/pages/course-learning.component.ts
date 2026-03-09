import { Component, signal, computed, inject, OnInit, DestroyRef, ChangeDetectionStrategy, HostListener, effect, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { LearningService } from '../services/learning.service';
import { LessonContentComponent } from '../components/lesson-content/lesson-content.component';
import { firstValueFrom, catchError, of } from 'rxjs';
import { LessonApi } from '../../../api/client/lesson.api';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { VideoProgressApi } from '../../../api/client/video-progress.api';
import { ApiClient } from '../../../api/client/api-client';
import { ToastService } from '../../../core/services/toast.service';
import { PaymentService } from '../../payment/payment.service';
import { PaymentModalComponent, CoursePaymentInfo } from '../../payment/payment-modal.component';
import { AuthService } from '../../../core/services/auth.service';
import { StudentEnrollmentService } from '../../student/services/enrollment.service';

/**
 * Course Learning Component
 * 
 * Main container for the learning interface.
 * Manages layout, sidebar state, and coordinates child components.
 */
@Component({
  selector: 'app-course-learning',
  imports: [RouterModule, LessonContentComponent, PaymentModalComponent],
  templateUrl: './course-learning.component.html',
  styleUrls: ['./course-learning.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseLearningComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  protected learningService = inject(LearningService);
  private lessonApi = inject(LessonApi);
  private quizApi = inject(QuizApi);
  private videoProgressApi = inject(VideoProgressApi);
  private apiClient = inject(ApiClient);
  private toast = inject(ToastService);
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private enrollmentService = inject(StudentEnrollmentService);
  private destroyRef = inject(DestroyRef);

  // Payment state
  showPaymentModal = signal(false);
  hasPaid = signal(false);
  coursePaid = signal(false); // true if course.price > 0

  // Local UI state
  isMobileView = signal(false);
  showMobileSidebar = signal(false);
  error = signal<string | null>(null);

  // Active content tab
  activeTab = signal<'overview' | 'notes' | 'materials'>('overview');

  // Video progress tracking for 75% rule
  canCompleteCurrentLesson = signal<boolean>(true); // Default true for non-video lessons
  videoProgressMessage = signal<string>('');

  // Section completion tracking
  completedSections = signal<Set<string>>(new Set<string>());

  // Section collapse state - track which sections are expanded
  expandedSections = signal<Set<string>>(new Set<string>());

  // Lesson collapse state - track which lessons are expanded (to show sections)
  expandedLessons = signal<Set<string>>(new Set<string>());

  // Current section index for sidebar sync (signal for OnPush reactivity)
  currentSectionIndex = signal(0);

  // Quiz availability - track which lessons have quizzes
  lessonsWithQuiz = signal<Set<string>>(new Set<string>());

  // Pending lesson ID for auto-expand (set from route, resolved reactively when sections load)
  private pendingExpandLessonId = signal<string | null>(null);

  // Detect if course has locked lessons (paid course, user hasn't paid)
  private paymentDetectEffect = effect(() => {
    const sections = this.sections();
    if (sections.length > 0) {
      const hasLockedLesson = sections.some(s =>
        s.lessons.some((l: any) => l.locked === true)
      );
      untracked(() => {
        this.coursePaid.set(hasLockedLesson);
        if (!hasLockedLesson) this.hasPaid.set(true); // Free course or already paid
      });
    }
  });

  // Sync section completion with lesson completion:
  // When a lesson is COMPLETED (from backend), all its sections must show completed.
  // Fixes: dashboard shows 5/5 sections green but lesson view only shows 3/5.
  // Root cause: onVideoEnded/quizComplete mark lesson complete WITHOUT marking each section.
  private syncSectionCompletionEffect = effect(() => {
    const sections = this.sections();
    const completedLessons = this.learningService.completedLessons();

    if (sections.length === 0 || completedLessons.size === 0) return;

    // Collect all section IDs from completed lessons
    const sectionIdsToAdd: string[] = [];
    for (const section of sections) {
      for (const lesson of section.lessons) {
        if (completedLessons.has(lesson.id) && (lesson as any).sections?.length > 0) {
          for (const sec of (lesson as any).sections) {
            sectionIdsToAdd.push(sec.id);
          }
        }
      }
    }

    if (sectionIdsToAdd.length > 0) {
      untracked(() => {
        this.completedSections.update(completed => {
          const newSet = new Set(completed);
          let changed = false;
          for (const id of sectionIdsToAdd) {
            if (!newSet.has(id)) {
              newSet.add(id);
              changed = true;
            }
          }
          if (changed) {
            localStorage.setItem('completed_sections', JSON.stringify(Array.from(newSet)));
          }
          return changed ? newSet : completed;
        });
      });
    }
  });

  private autoExpandEffect = effect(() => {
    const sections = this.sections();
    const lessonId = this.pendingExpandLessonId();
    if (sections.length > 0 && lessonId) {
      untracked(() => {
        this.autoExpandChapterForLesson(lessonId);
        this.pendingExpandLessonId.set(null);
      });
    } else if (sections.length > 0 && !lessonId) {
      // No specific lesson — expand first section
      untracked(() => {
        const firstSection = sections[0];
        if (firstSection && this.expandedSections().size === 0) {
          this.expandedSections.update(expanded => {
            const newExpanded = new Set(expanded);
            newExpanded.add(firstSection.id);
            return newExpanded;
          });
        }
      });
    }
  });

  // Computed from service
  course = this.learningService.course;
  sections = this.learningService.sections;
  currentLesson = this.learningService.currentLesson;
  isLoadingCourse = this.learningService.isLoadingCourse;
  isLoadingLesson = this.learningService.isLoadingLesson;
  courseError = this.learningService.courseError;
  lessonError = this.learningService.lessonError;
  canGoPrevious = this.learningService.canGoPrevious;
  canGoNext = this.learningService.canGoNext;
  progressPercentage = this.learningService.progressPercentage;

  /** Index of the chapter (section) containing the current lesson */
  currentChapterIndex = computed(() => {
    const lesson = this.currentLesson();
    if (!lesson) return 0;
    const idx = this.sections().findIndex(s => s.lessons.some((l: any) => l.id === lesson.id));
    return idx >= 0 ? idx : 0;
  });

  /** Index of the current lesson within its chapter */
  currentLessonIndex = computed(() => {
    const lesson = this.currentLesson();
    if (!lesson) return 0;
    const section = this.sections()[this.currentChapterIndex()];
    if (!section) return 0;
    const idx = section.lessons.findIndex((l: any) => l.id === lesson.id);
    return idx >= 0 ? idx : 0;
  });

  /** Total chapter count for sidebar header */
  totalChapters = computed(() => this.sections().length);

  /** Total lesson count for sidebar header */
  totalLessons = computed(() => this.sections().reduce((sum, s) => sum + s.lessons.length, 0));

  // Filtered sections based on search
  filteredSections = computed(() => this.sections());

  ngOnInit(): void {
    this.checkMobileView();
    this.loadCourseFromRoute();
    this.loadCompletedSections();
    this.loadPaymentStatus();

    // Set pending lesson ID — the autoExpandEffect will handle expansion reactively when sections load
    const lessonId = this.route.snapshot.paramMap.get('lessonId');
    if (lessonId) {
      this.pendingExpandLessonId.set(lessonId);
    }

    // Check for quizzes for all lessons
    this.checkAllLessonsForQuizzes();

    // Listen for quiz completion via query params
    // Security: Validate quiz completion server-side before marking lesson complete
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params['quizCompleted'] === 'true' && params['attemptId']) {
        this.validateAndCompleteQuizLesson(params['attemptId']);
      }
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobileView();
  }

  private checkMobileView(): void {
    this.isMobileView.set(window.innerWidth < 768);
    if (!this.isMobileView()) {
      this.showMobileSidebar.set(false);
    }
  }

  loadCourseFromRoute(): void {
    const courseId = this.route.snapshot.paramMap.get('courseId') || this.route.snapshot.paramMap.get('id');
    const lessonId = this.route.snapshot.paramMap.get('lessonId');

    if (!courseId) {
      return;
    }

    try {
      // Load course
      this.learningService.loadCourse(courseId);

      // Load specific lesson if provided, or auto-select next uncompleted lesson
      if (lessonId) {
        this.learningService.loadLesson(lessonId);
      } else {
        // Auto-select next uncompleted lesson after course loads
        this.selectNextUncompletedLesson();
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Không thể tải khóa học. Vui lòng thử lại.');
    }
  }

  private selectNextUncompletedLesson(): void {
    const sections = this.learningService.sections();
    const allLessons = sections.flatMap(s => s.lessons);

    // Find first uncompleted lesson
    const nextLesson = allLessons.find(l => !l.isCompleted) ?? allLessons[0];

    if (nextLesson) {
      this.learningService.loadLesson(nextLesson.id);

      // Update URL
      const courseId = this.course()?.id;
      if (courseId) {
        this.router.navigate(
          ['/student/learn/course', courseId, 'lesson', nextLesson.id],
          { replaceUrl: true }
        );
      }
    }
  }

  // Sidebar actions
  toggleSidebar(): void {
    this.showMobileSidebar.update(show => !show);
  }

  closeMobileSidebar(): void {
    if (this.isMobileView()) {
      this.showMobileSidebar.set(false);
    }
  }

  // Lesson selection
  onLessonSelect(lessonId: string): void {
    const lesson = this.learningService.allLessons().find(l => l.id === lessonId);
    if (!lesson) return;

    // Block selection of locked lessons
    if (this.isLessonLocked(lesson)) {
      this.toast.warning('Cần thanh toán để xem bài này');
      this.showPaymentModal.set(true);
      return;
    }

    if (lesson) {
      this.learningService.selectLesson(lesson);
      this.currentSectionIndex.set(0); // Reset section index on lesson change
      this.closeMobileSidebar();

      // Auto-expand parent chapter in sidebar (Coursera pattern: always show context)
      this.autoExpandChapterForLesson(lessonId);

      // Auto-expand lesson if it has sections (keep others expanded)
      const lessonSections = (lesson as any).sections;
      if (lessonSections && lessonSections.length > 0) {
        this.expandedLessons.update(expanded => {
          const newExpanded = new Set(expanded);
          newExpanded.add(lessonId);
          return newExpanded;
        });
      }

      // Update URL
      const courseId = this.course()?.id;
      if (courseId) {
        this.router.navigate(
          ['/student/learn/course', courseId, 'lesson', lessonId],
          { replaceUrl: true }
        );
      }
    }
  }

  /** Auto-expand the chapter that contains the given lesson */
  private autoExpandChapterForLesson(lessonId: string): void {
    const sections = this.sections();
    for (const section of sections) {
      if (section.lessons.some((l: any) => l.id === lessonId)) {
        this.expandedSections.update(expanded => {
          const newExpanded = new Set(expanded);
          if (!newExpanded.has(section.id)) {
            newExpanded.clear(); // Accordion: collapse others
            newExpanded.add(section.id);
          }
          return newExpanded;
        });
        break;
      }
    }
  }

  // Navigation
  previousLesson(): void {
    const currentLesson = this.currentLesson();
    if (currentLesson?.sections && currentLesson.sections.length > 0) {
      if (this.currentSectionIndex() > 0) {
        this.currentSectionIndex.update(v => v - 1);
        return;
      }
    }
    this.learningService.goToPreviousLesson();
    // Reset section index for new lesson (handled in onLessonSelect/loadLesson but good to be explicit if needed)
    this.currentSectionIndex.set(0);
    this.updateUrlForCurrentLesson();
  }

  async nextLesson(): Promise<void> {
    const currentLesson = this.currentLesson();
    
    // Check if we're navigating within sections of current lesson
    if (currentLesson?.sections && currentLesson.sections.length > 0) {
      if (this.currentSectionIndex() < currentLesson.sections.length - 1) {
        // 🔒 CHECK 75% RULE before going to next section
        const currentSection = currentLesson.sections[this.currentSectionIndex()];
        
        if (currentSection.type === 'VIDEO' && currentSection.videoUrl) {
          try {
            const progressCheck: any = await firstValueFrom(
              this.videoProgressApi.canProceedToNext(currentSection.id)
            );

            if (progressCheck.success && progressCheck.data && !progressCheck.data.canProceed) {
              this.toast.warning('Bạn cần xem ít nhất 50% video để chuyển sang phần tiếp theo.');
              return;
            }
          } catch (error) {
            this.toast.error('Không thể kiểm tra tiến độ video. Vui lòng thử lại.');
            return;
          }
        }

        // All checks passed, proceed to next section
        this.currentSectionIndex.update(v => v + 1);
        return;
      }
    }
    
    // No more sections, go to next lesson
    this.learningService.goToNextLesson();
    this.currentSectionIndex.set(0);
    this.updateUrlForCurrentLesson();
  }

  private updateUrlForCurrentLesson(): void {
    const courseId = this.course()?.id;
    const lessonId = this.currentLesson()?.id;
    if (courseId && lessonId) {
      this.router.navigate(
        ['/student/learn/course', courseId, 'lesson', lessonId],
        { replaceUrl: true }
      );
    }
  }

  // Progress
  async onMarkComplete(): Promise<void> {
    // Lấy lesson và section hiện tại
    const lesson = this.currentLesson();
    if (!lesson) {
      return;
    }

    // Nếu lesson có sections, đánh dấu hoàn thành section hiện tại
    if (lesson.sections && lesson.sections.length > 0) {
      const currentSection = lesson.sections[this.currentSectionIndex()];
      if (!currentSection) {
        return;
      }

      // 🔒 CHECK 50% RULE for VIDEO sections
      if (currentSection.type === 'VIDEO' && currentSection.videoUrl) {
        try {
          const progressCheck: any = await firstValueFrom(
            this.videoProgressApi.canProceedToNext(currentSection.id)
          );

          if (progressCheck.success && progressCheck.data && !progressCheck.data.canProceed) {
            this.toast.warning('Bạn cần xem ít nhất 50% video để hoàn thành phần này.');
            return;
          }
        } catch (error) {
          this.toast.error('Không thể kiểm tra tiến độ video. Vui lòng thử lại.');
          return;
        }
      }

      // Mark section as completed
      this.markSectionAsCompleted(currentSection.id);

      // Check if ALL sections are now completed
      const allSectionsCompleted = lesson.sections.every(s =>
        this.isSectionCompleted(s.id) || s.id === currentSection.id
      );

      if (allSectionsCompleted) {
        // All sections done → mark lesson as complete on backend
        try {
          await firstValueFrom(this.lessonApi.markLessonComplete(lesson.id));
          
          // Refresh enrollment service before moving on
          await this.enrollmentService.refreshCourseProgress(lesson.courseId);

          this.learningService.markCurrentLessonComplete();
          this.toast.success(`Đã hoàn thành bài: ${lesson.title}`);
        } catch {
          this.toast.success(`Đã hoàn thành phần: ${currentSection.title}`);
        }
      } else {
        this.toast.success(`Đã hoàn thành phần: ${currentSection.title}`);
      }

      // Auto advance to next section if available
      if (this.currentSectionIndex() < lesson.sections.length - 1) {
        this.currentSectionIndex.update(v => v + 1);
      }

      return;
    }

    // No sections - mark lesson as complete (original logic)

    // Nếu đã completed rồi thì không gọi API nữa
    try {
      const alreadyCompleted = this.learningService
        .isLessonCompleted(lesson.id)();
      if (alreadyCompleted) {
        return;
      }
    } catch {
      // Nếu lỡ isLessonCompleted lỗi / chưa có thì bỏ qua check này
    }

    // 🔒 CHECK 75% RULE for VIDEO lessons
    if (this.hasVideoContent(lesson)) {
      // Get section ID from lesson's first video section
      const videoSection = this.getFirstVideoSection(lesson);
      if (!videoSection) {
        this.toast.error('Không tìm thấy video trong bài học này.');
        return;
      }

      try {
        const progressCheck: any = await firstValueFrom(
          this.videoProgressApi.canProceedToNext(videoSection.id)
        );

        if (progressCheck.success && progressCheck.data && !progressCheck.data.canProceed) {
          this.toast.warning('Bạn cần xem ít nhất 50% video để hoàn thành bài học.');
          return;
        }
      } catch (error) {
        this.toast.error('Không thể kiểm tra tiến độ video. Vui lòng thử lại.');
        return;
      }
    }

    try {
      const apiResult = await firstValueFrom(
        this.lessonApi.markLessonComplete(lesson.id)
      );

      // Refresh enrollment service
      await this.enrollmentService.refreshCourseProgress(lesson.courseId);

      // Cập nhật state phía FE qua service chung
      this.learningService.markCurrentLessonComplete();

      // (tuỳ bạn) có thể expand section hiện tại để user thấy rõ
      this.expandCurrentLessonSection();

    } catch (error: any) {
      this.toast.error('Không thể cập nhật trạng thái hoàn thành. Vui lòng thử lại.');
    }
  }

  // Helper: Check if lesson has video content
  private hasVideoContent(lesson: any): boolean {
    // Check if lesson has videoUrl (fallback)
    if (lesson.videoUrl) {
      return true;
    }
    // Check if lesson has sections with VIDEO type
    if (lesson.sections && lesson.sections.length > 0) {
      return lesson.sections.some((s: any) => s.type === 'VIDEO' && s.videoUrl);
    }
    return false;
  }

  // Helper: Get first video section from lesson
  private getFirstVideoSection(lesson: any): any {
    if (lesson.sections && lesson.sections.length > 0) {
      return lesson.sections.find((s: any) => s.type === 'VIDEO' && s.videoUrl);
    }
    return null;
  }

  // Section completion helpers
  isSectionCompleted(sectionId: string): boolean {
    return this.completedSections().has(sectionId);
  }

  private markSectionAsCompleted(sectionId: string): void {
    this.completedSections.update(completed => {
      const newSet = new Set(completed);
      newSet.add(sectionId);
      // Save to localStorage as fallback
      localStorage.setItem('completed_sections', JSON.stringify(Array.from(newSet)));
      return newSet;
    });

    // Persist to backend
    const lessonId = this.currentLesson()?.id;
    if (lessonId) {
      this.apiClient.post<any>(`/api/v3/student/progress/lessons/${lessonId}/sections/${sectionId}/complete`, {})
        .subscribe({ error: () => {} }); // Non-blocking
    }
  }

  private loadCompletedSections(): void {
    try {
      const saved = localStorage.getItem('completed_sections');
      if (saved) {
        const sections = JSON.parse(saved);
        this.completedSections.set(new Set(sections));
      }
    } catch (error) {
      // localStorage parse — silent, start from scratch
    }
  }

  // Video events
  onVideoEnded(): void {
    this.learningService.markCurrentLessonComplete();

    // Auto-advance to next lesson after 2s (Netflix pattern)
    if (this.canGoNext()) {
      setTimeout(() => {
        this.nextLesson();
      }, 2000);
    }
  }

  /**
   * Called when a TEXT section has been read (80%+ scrolled).
   * Auto-marks the section as complete.
   */
  onSectionReadComplete(sectionId: string): void {
    this.markSectionAsCompleted(sectionId);
  }

  // Section accordion
  toggleSection(sectionId: string): void {
    this.expandedSections.update(expanded => {
      const newExpanded = new Set(expanded);
      if (newExpanded.has(sectionId)) {
        newExpanded.delete(sectionId);
      } else {
        newExpanded.clear(); // Collapse others
        newExpanded.add(sectionId);
      }
      return newExpanded;
    });
  }

  isSectionExpanded(sectionId: string): boolean {
    return this.expandedSections().has(sectionId);
  }

  // Expand section containing current lesson
  expandCurrentLessonSection(): void {
    const current = this.currentLesson();
    if (current) {
      this.expandedSections.update(expanded => {
        const newExpanded = new Set(expanded);
        newExpanded.clear(); // Maintain accordion behavior
        newExpanded.add(current.sectionId);
        return newExpanded;
      });
    }
  }

  // Count completed lessons in a section (for sidebar "2/5 bài học")
  getCompletedLessonCount(section: any): number {
    return section.lessons.filter((l: any) => this.learningService.isLessonCompleted(l.id)()).length;
  }

  // Chapter progress percentage (for mini progress bar in sidebar)
  getChapterProgress(section: any): number {
    if (!section.lessons || section.lessons.length === 0) return 0;
    return Math.round((this.getCompletedLessonCount(section) / section.lessons.length) * 100);
  }

  // Lesson type label
  getLessonTypeLabel(lessonType: any): string {
    const labels: Record<string, string> = {
      'LECTURE': 'Bài giảng',
      'READING': 'Đọc',
      'QUIZ': 'Kiểm tra',
      'ASSIGNMENT': 'Bài tập',
      'LAB': 'Thực hành'
    };
    return labels[lessonType] || 'Bài học';
  }

  // Section type label for sidebar
  getSectionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'VIDEO': 'Video',
      'TEXT': 'Văn bản',
      'QUIZ': 'Trắc nghiệm',
      'FILE': 'Tài liệu',
      'ASSIGNMENT': 'Bài tập'
    };
    return labels[type] || type;
  }

  // Lesson expansion for Level 3 sections
  isLessonExpanded(lessonId: string): boolean {
    return this.expandedLessons().has(lessonId);
  }

  toggleLesson(lesson: any): void {
    const isExpanded = this.expandedLessons().has(lesson.id);
    if (isExpanded) {
      // Just collapse, don't navigate
      this.expandedLessons.update(set => { const n = new Set(set); n.delete(lesson.id); return n; });
    } else {
      // Expand + navigate
      this.onLessonSelect(lesson.id);
    }
  }

  selectSectionInSidebar(sectionIndex: number, event: Event): void {
    event.stopPropagation();
    this.currentSectionIndex.set(sectionIndex);
  }

  // Handle section index change from lesson-content component
  onSectionIndexChange(index: number): void {
    this.currentSectionIndex.set(index);
  }

  // === Payment / Paywall ===

  private async loadPaymentStatus(): Promise<void> {
    const courseId = this.route.snapshot.paramMap.get('courseId') || this.route.snapshot.paramMap.get('id');
    if (!courseId || !this.authService.isAuthenticated()) return;

    try {
      const state = await this.paymentService.loadPaymentStatus(courseId);
      this.hasPaid.set(state.hasPaid);
    } catch {
      // Default to unpaid — content gating is enforced server-side anyway
    }
  }

  /** Check if a lesson is locked (paid course + not paid + not free lesson) */
  isLessonLocked(lesson: any): boolean {
    if (!this.coursePaid()) return false;
    if (this.hasPaid()) return false;
    if (lesson.isFree) return false;
    // Also check server-side locked flag
    if (lesson.locked === true) return true;
    return true;
  }

  /** Get payment info for the payment modal */
  getPaymentInfo(): CoursePaymentInfo {
    const c = this.course();
    return {
      courseId: c?.id || '',
      title: c?.title || '',
      thumbnail: '',
      price: (c as any)?.price || 0,
      salePrice: (c as any)?.salePrice,
      instructorName: ''
    };
  }

  onPaymentModalClose(startLearning?: boolean | void): void {
    this.showPaymentModal.set(false);
    if (startLearning === true) {
      this.hasPaid.set(true);
      this.coursePaid.set(false); // No longer locked
      // Reload course content to get unlocked content from server
      this.loadCourseFromRoute();
    }
  }

  onPaymentComplete(): void {
    this.hasPaid.set(true);
  }

  // Navigation
  goBack(): void {
    const courseId = this.course()?.id;
    if (courseId) {
      this.router.navigate(['/student/course', courseId]);
    } else {
      this.router.navigate(['/student/my-courses']);
    }
  }

  // Keyboard shortcuts
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Ignore if user is typing in an input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        if (this.canGoPrevious()) {
          event.preventDefault();
          this.previousLesson();
        }
        break;
      case 'ArrowRight':
        if (this.canGoNext()) {
          event.preventDefault();
          this.nextLesson();
        }
        break;
      case 'Escape':
        if (this.showMobileSidebar()) {
          event.preventDefault();
          this.closeMobileSidebar();
        }
        break;
    }
  }

  /**
   * Validate quiz attempt server-side before marking lesson as complete.
   * SOTA (Canvas/Moodle): Never trust client-side quiz completion signals.
   */
  private async validateAndCompleteQuizLesson(attemptId: string): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.quizApi.getQuizResult(attemptId).pipe(catchError(() => of(null)))
      );
      if (result && (result as any)?.data?.isPassed !== false) {
        const lessonId = this.currentLesson()?.id;
        if (lessonId) {
          await firstValueFrom(this.lessonApi.markLessonComplete(lessonId));
          this.learningService.markCurrentLessonComplete();
        }
      }
    } catch {
      // Failed to validate - don't mark as complete
    }
  }

  // Quiz functionality
  checkAllLessonsForQuizzes(): void {
    const allLessons = this.learningService.allLessons();
    allLessons.forEach(lesson => {
      // Only check for quiz if lesson type is QUIZ
      if (lesson.lessonType === 'QUIZ') {
        this.checkLessonQuiz(lesson.id);
      }
    });
  }

  checkLessonQuiz(lessonId: string): void {
    this.quizApi.getQuizByLessonId(lessonId)
      .pipe(
        catchError(() => of(null))
      )
      .subscribe(response => {
        if (response && response.id) {
          this.lessonsWithQuiz.update(lessons => {
            const newSet = new Set(lessons);
            newSet.add(lessonId);
            return newSet;
          });
        }
      });
  }

  hasQuiz(lessonId: string): boolean {
    return this.lessonsWithQuiz().has(lessonId);
  }

  goToQuiz(lessonId: string, event: Event): void {
    event.stopPropagation(); // Prevent lesson selection
    this.router.navigate(['/student/quiz/take', lessonId]);
  }
}
