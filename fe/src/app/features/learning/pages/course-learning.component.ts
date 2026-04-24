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
import {
  PaymentAccessActivationState,
  PaymentService
} from '../../payment/payment.service';
import {
  PaymentModalComponent,
  CoursePaymentInfo,
  PaymentCompletionOutcome,
} from '../../payment/payment-modal.component';
import { AuthService } from '../../../core/services/auth.service';
import { StudentEnrollmentService } from '../../student/services/enrollment.service';
import { CourseDownloadService } from '../../../core/services/course-download.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import { getOfflineCourseStaleCopy } from '../../../core/utils/offline-course-staleness';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * Course Learning Component
 * 
 * Main container for the learning interface.
 * Manages layout, sidebar state, and coordinates child components.
 */
@Component({
  selector: 'app-course-learning',
  imports: [RouterModule, LessonContentComponent, PaymentModalComponent, IconComponent],
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
  private courseDownload = inject(CourseDownloadService);
  private network = inject(NetworkStatusService);
  private syncService = inject(OfflineSyncService);
  private destroyRef = inject(DestroyRef);

  // Payment state
  showPaymentModal = signal(false);
  hasPaid = signal(false);
  coursePaid = signal(false); // true if course.price > 0
  paymentAccessState = signal<PaymentAccessActivationState | null>(null);
  awaitingManualActivation = computed(() => this.paymentAccessState() === 'MANUAL_ACTIVATION_REQUIRED');
  accessPending = computed(() => this.paymentAccessState() === 'ACCESS_PENDING');

  // Preview mode (teacher viewing as student)
  readonly isPreview = signal(false);

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
  private shouldAutoSelectInitialLesson = signal(false);
  private handledReturnKeys = new Set<string>();
  private pendingReturnedQuizAttemptId = signal<string | null>(null);
  private pendingReturnedSectionQuiz = signal<{ sectionId: string; passed: boolean } | null>(null);
  private lastCompletedSectionsHydrationKey: string | null = null;
  private pendingSectionCompletionSyncs = new Map<string, Promise<void>>();
  private confirmedSectionCompletionSyncs = new Set<string>();

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
    const course = this.course();
    const courseId = course?.id;
    const shouldPersistOffline = course?.isOfflinePackage === true || !this.network.online();
    const sections = this.sections();
    const completedLessons = this.learningService.completedLessons();

    if (sections.length === 0 || completedLessons.size === 0) return;

    // Collect all section IDs from completed lessons
    const sectionIdsToAdd: string[] = [];
    const lessonSectionMerges: Array<{ lessonId: string; sectionIds: string[] }> = [];
    for (const section of sections) {
      for (const lesson of section.lessons) {
        if (completedLessons.has(lesson.id) && (lesson as any).sections?.length > 0) {
          const sectionIds = (lesson as any).sections
            .map((sec: any) => sec.id)
            .filter((sectionId: unknown): sectionId is string => typeof sectionId === 'string' && sectionId.length > 0);
          sectionIdsToAdd.push(...sectionIds);
          lessonSectionMerges.push({ lessonId: lesson.id, sectionIds });
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
          return changed ? newSet : completed;
        });
      });

      if (courseId && shouldPersistOffline) {
        for (const merge of lessonSectionMerges) {
          void this.courseDownload.mergeCompletedSectionsOffline(courseId, merge.lessonId, merge.sectionIds);
        }
      }
    }
  });

  private hydrateCompletedSectionsEffect = effect(() => {
    const courseId = this.course()?.id;
    const lessonId = this.currentLesson()?.id ?? null;
    const online = this.network.online();

    if (!courseId) {
      return;
    }

    const hydrationKey = `${courseId}:${lessonId ?? 'course'}:${online ? 'online' : 'offline'}`;
    if (this.lastCompletedSectionsHydrationKey === hydrationKey) {
      return;
    }

    this.lastCompletedSectionsHydrationKey = hydrationKey;
    untracked(() => {
      void this.hydrateCompletedSections(courseId, lessonId, online);
    });
  });

  private postSyncRefreshEffect = effect(() => {
    const result = this.syncService.lastSyncResult();
    if (!result || result.synced === 0) return;

    untracked(() => {
      const courseId = this.course()?.id;
      const lessonId = this.currentLesson()?.id ?? null;
      const online = this.network.online();

      if (courseId) {
        this.lastCompletedSectionsHydrationKey = '';
        void this.hydrateCompletedSections(courseId, lessonId, online);
        void this.enrollmentService.refreshCourseProgress(courseId);
      }
    });
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

  private autoExpandCurrentLessonEffect = effect(() => {
    const lesson = this.currentLesson();
    const sections = this.sections();

    if (!lesson || sections.length === 0) {
      return;
    }

    const lessonSummary = sections
      .flatMap(section => section.lessons)
      .find(candidate => candidate.id === lesson.id);

    if (!lessonSummary?.sections?.length) {
      return;
    }

    untracked(() => {
      this.expandedLessons.update(expanded => {
        if (expanded.has(lesson.id)) {
          return expanded;
        }

        const next = new Set(expanded);
        next.add(lesson.id);
        return next;
      });
    });
  });

  private autoSelectInitialLessonEffect = effect(() => {
    const shouldAutoSelect = this.shouldAutoSelectInitialLesson();
    const sections = this.sections();

    if (!shouldAutoSelect || sections.length === 0) {
      return;
    }

    const currentLesson = this.currentLesson();
    const currentLessonExistsInSections = !!currentLesson
      && sections.some(section => section.lessons.some((lesson: any) => lesson.id === currentLesson.id));

    if (currentLessonExistsInSections) {
      untracked(() => {
        this.shouldAutoSelectInitialLesson.set(false);
      });
      return;
    }

    const nextLesson = this.resolveInitialLessonSelection(sections);
    if (!nextLesson) {
      return;
    }

    untracked(() => {
      this.openLessonFromSelection(nextLesson.id);
      this.shouldAutoSelectInitialLesson.set(false);
    });
  });

  private returnedQuizCompletionEffect = effect(() => {
    const lesson = this.currentLesson();
    const attemptId = this.pendingReturnedQuizAttemptId();
    if (!lesson || !attemptId) {
      return;
    }

    const completionKey = `lesson:${attemptId}`;
    if (this.handledReturnKeys.has(completionKey)) {
      untracked(() => this.pendingReturnedQuizAttemptId.set(null));
      return;
    }

    this.handledReturnKeys.add(completionKey);
    untracked(() => this.pendingReturnedQuizAttemptId.set(null));
    void this.validateAndCompleteQuizLesson(attemptId);
  });

  private returnedSectionQuizCompletionEffect = effect(() => {
    const lesson = this.currentLesson();
    const pending = this.pendingReturnedSectionQuiz();
    if (!lesson || !pending) {
      return;
    }

    const completionKey = `section:${pending.sectionId}:${pending.passed}`;
    if (this.handledReturnKeys.has(completionKey)) {
      untracked(() => this.pendingReturnedSectionQuiz.set(null));
      return;
    }

    this.handledReturnKeys.add(completionKey);
    untracked(() => this.pendingReturnedSectionQuiz.set(null));
    void this.handleReturnedSectionQuizCompletion(pending.sectionId, pending.passed);
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

  readonly staleOfflineBanner = computed(() => {
    const course = this.course();
    if (!course?.isOfflinePackage || !course.isStale) {
      return null;
    }

    const copy = getOfflineCourseStaleCopy(course.staleReason);
    return {
      title: copy.title,
      message: copy.description,
    };
  });

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
    this.isPreview.set(!!this.route.snapshot.data['preview']);
    this.checkMobileView();
    this.loadCourseFromRoute();
    if (!this.isPreview()) {
      void this.loadCompletedSections();
      this.loadPaymentStatus();
    }

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
        const completionKey = `lesson:${params['attemptId']}`;
        if (!this.handledReturnKeys.has(completionKey)) {
          this.pendingReturnedQuizAttemptId.set(params['attemptId']);
        }
      }

      if (params['sectionQuizCompleted'] === 'true' && params['completedSectionId']) {
        const completionKey = `section:${params['completedSectionId']}:${params['passed']}`;
        if (!this.handledReturnKeys.has(completionKey)) {
          this.pendingReturnedSectionQuiz.set({
            sectionId: params['completedSectionId'],
            passed: params['passed'] !== 'false',
          });
        }
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

    // Preview mode: verify ownership for TEACHER role (ADMIN/ORG_ADMIN can preview any)
    if (this.isPreview()) {
      this.verifyPreviewAccess(courseId);
    }

    try {
      // Load course
      this.learningService.loadCourse(courseId);

      // Load specific lesson if provided, or auto-select next uncompleted lesson
      if (lessonId) {
        this.shouldAutoSelectInitialLesson.set(false);
        this.learningService.loadLesson(lessonId);
      } else {
        // Wait until sections are hydrated before picking the lesson to open.
        this.shouldAutoSelectInitialLesson.set(true);
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Không thể tải khóa học. Vui lòng thử lại.');
    }
  }

  private verifyPreviewAccess(courseId: string): void {
    const user = this.authService.currentUser();
    if (!user) return;

    const role = user.role?.toUpperCase();
    // ADMIN and ORG_ADMIN can preview any course
    if (role === 'ADMIN' || role === 'ORG_ADMIN') return;

    // TEACHER: must verify ownership via API
    this.apiClient.get<any>(`/api/v3/courses/${courseId}`).subscribe({
      next: (res: any) => {
        const teacherId = res?.data?.teacherId;
        if (teacherId && teacherId !== user.id) {
          this.toast.error('Bạn không có quyền xem trước khóa học này.');
          this.router.navigate(['/teacher/courses']);
        }
      },
      error: () => {
        this.router.navigate(['/teacher/courses']);
      }
    });
  }

  private resolveInitialLessonSelection(sections = this.learningService.sections()) {
    const allLessons = sections.flatMap(section => section.lessons);
    if (allLessons.length === 0) {
      return null;
    }

    const isAccessible = (lesson: any) => !lesson.locked;
    const lastAccessedLessonId = this.learningService.lastAccessedLessonId();

    if (lastAccessedLessonId) {
      const lastAccessedLesson = allLessons.find(
        lesson => lesson.id === lastAccessedLessonId && isAccessible(lesson)
      );
      if (lastAccessedLesson) {
        return lastAccessedLesson;
      }
    }

    return allLessons.find(lesson => !lesson.isCompleted && isAccessible(lesson))
      ?? allLessons.find(lesson => isAccessible(lesson))
      ?? allLessons[0]
      ?? null;
  }

  private openLessonFromSelection(lessonId: string): void {
    this.learningService.loadLesson(lessonId);
    this.pendingExpandLessonId.set(lessonId);

    if (this.isPreview()) return; // Preview mode: don't update URL

    const courseId = this.course()?.id
      || this.route.snapshot.paramMap.get('courseId')
      || this.route.snapshot.paramMap.get('id');

    if (courseId) {
      this.router.navigate(
        ['/student/learn/course', courseId, 'lesson', lessonId],
        { replaceUrl: true }
      );
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

      // Update URL (skip in preview mode)
      if (!this.isPreview()) {
        const courseId = this.course()?.id;
        if (courseId) {
          this.router.navigate(
            ['/student/learn/course', courseId, 'lesson', lessonId],
            { replaceUrl: true }
          );
        }
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
        const currentSection = currentLesson.sections[this.currentSectionIndex()];

        // 🔒 VIDEO: always check server-side threshold
        if (currentSection.type === 'VIDEO' && (currentSection.videoUrl || currentSection.streamVideoUid)) {
          const canProceed = await this.ensureVideoProgressThreshold(currentSection.id, 'next-section');
          if (!canProceed) return;
        }
        // 🔒 Required non-VIDEO sections: must be completed before proceeding
        else if (currentSection.isRequired && !this.completedSections().has(currentSection.id)) {
          const messages: Record<string, string> = {
            'TEXT': 'Bạn cần đọc hết nội dung phần này trước khi chuyển tiếp.',
            'QUIZ': 'Bạn cần hoàn thành bài kiểm tra trước khi chuyển tiếp.',
            'FILE': 'Bạn cần xem và xác nhận tài liệu trước khi chuyển tiếp.',
          };
          this.toast.warning(messages[currentSection.type] || 'Bạn cần hoàn thành phần này trước khi tiếp tục.');
          return;
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
    if (this.isPreview()) return;
    const courseId = this.course()?.id;
    const lessonId = this.currentLesson()?.id;
    if (courseId && lessonId) {
      this.router.navigate(
        ['/student/learn/course', courseId, 'lesson', lessonId],
        { replaceUrl: true }
      );
    }
  }

  private async ensureVideoProgressThreshold(
    sectionId: string,
    action: 'next-section' | 'complete-section' | 'complete-lesson'
  ): Promise<boolean> {
    if (!this.network.online()) {
      return true;
    }

    try {
      const progressCheck: any = await firstValueFrom(
        this.videoProgressApi.canProceedToNext(sectionId)
      );

      if (progressCheck.success && progressCheck.data && !progressCheck.data.canProceed) {
        const messageByAction = {
          'next-section': 'Bạn cần xem đủ video để chuyển sang phần tiếp theo.',
          'complete-section': 'Bạn cần xem đủ video để hoàn thành phần này.',
          'complete-lesson': 'Bạn cần xem đủ video để hoàn thành bài học.',
        } as const;
        this.toast.warning(messageByAction[action]);
        return false;
      }

      return true;
    } catch {
      this.toast.error('Không thể kiểm tra tiến độ video. Vui lòng thử lại.');
      return false;
    }
  }

  // Progress
  async onMarkComplete(): Promise<boolean> {
    if (this.isPreview()) {
      this.toast.info('Chế độ xem trước — không ghi nhận tiến độ.');
      return false;
    }
    const currentLessonForCompletion = this.currentLesson();
    if (!currentLessonForCompletion) {
      return false;
    }

    if (currentLessonForCompletion.sections && currentLessonForCompletion.sections.length > 0) {
      return this.completeCurrentSection(currentLessonForCompletion);
    }

    return this.completeCurrentLesson(currentLessonForCompletion);
  }

  private async completeCurrentSection(lesson: any): Promise<boolean> {
    const currentSection = lesson.sections?.[this.currentSectionIndex()];
    if (!currentSection) {
      return false;
    }

    // 🔒 VIDEO: always check server-side threshold
    if (currentSection.type === 'VIDEO' && (currentSection.videoUrl || currentSection.streamVideoUid)) {
      const canProceed = await this.ensureVideoProgressThreshold(currentSection.id, 'complete-section');
      if (!canProceed) {
        return false;
      }
    }

    // 🔒 QUIZ: cannot be manually completed — must pass the quiz
    if (currentSection.type === 'QUIZ' && currentSection.isRequired && !this.completedSections().has(currentSection.id)) {
      this.toast.warning('Bạn cần hoàn thành bài kiểm tra để đánh dấu phần này là hoàn thành.');
      return false;
    }

    const nextCompletedSections = new Set(this.completedSections());
    nextCompletedSections.add(currentSection.id);
    const allSectionsCompleted = lesson.sections.every((section: any) => nextCompletedSections.has(section.id));
    await this.markSectionAsCompleted(currentSection.id, { persistBackend: true });

    if (allSectionsCompleted) {
      try {
        await this.waitForSectionCompletionSync(lesson.id, currentSection.id);
        await firstValueFrom(this.lessonApi.markLessonComplete(lesson.id, this.buildLessonCompletionPayload(lesson)));
        await this.enrollmentService.refreshCourseProgress(lesson.courseId);
        this.learningService.markCurrentLessonComplete();
        this.toast.success(`Đã hoàn thành bài: ${lesson.title}`);
      } catch {
        if (!this.network.online()) {
          this.learningService.markCurrentLessonComplete();
          const courseId = lesson?.courseId ?? this.course()?.id;
          if (courseId) {
            const allSectionIds = lesson.sections.map((s: any) => s.id).filter(Boolean);
            await this.courseDownload.mergeCompletedSectionsOffline(courseId, lesson.id, allSectionIds).catch(() => undefined);
          }
          this.toast.success(`Hoàn thành bài: ${lesson.title} (sẽ đồng bộ khi có mạng)`);
        } else {
          this.toast.error('Đã hoàn thành phần cuối nhưng chưa thể cập nhật tiến độ bài học. Vui lòng thử lại.');
          return false;
        }
      }
    } else {
      this.toast.success(`Đã hoàn thành phần: ${currentSection.title}`);
    }

    if (this.currentSectionIndex() < lesson.sections.length - 1) {
      this.currentSectionIndex.update((value) => value + 1);
    }

    return true;
  }

  private async completeCurrentLesson(lesson: any): Promise<boolean> {
    try {
      const alreadyCompleted = this.learningService.isLessonCompleted(lesson.id)();
      if (alreadyCompleted) {
        return true;
      }
    } catch {
      // Ignore best-effort completion lookup and continue with backend sync.
    }

    if (this.hasVideoContent(lesson)) {
      const videoSection = this.getFirstVideoSection(lesson);
      if (!videoSection) {
        this.toast.error('Không tìm thấy video trong bài học này.');
        return false;
      }

      const canProceed = await this.ensureVideoProgressThreshold(videoSection.id, 'complete-lesson');
      if (!canProceed) {
        return false;
      }
    }

    try {
      await firstValueFrom(this.lessonApi.markLessonComplete(lesson.id, this.buildLessonCompletionPayload(lesson)));
      await this.enrollmentService.refreshCourseProgress(lesson.courseId);
      this.learningService.markCurrentLessonComplete();
      this.expandCurrentLessonSection();
      return true;
    } catch {
      if (!this.network.online()) {
        this.learningService.markCurrentLessonComplete();
        this.expandCurrentLessonSection();
        this.toast.success(`Hoàn thành bài: ${lesson.title} (sẽ đồng bộ khi có mạng)`);
        return true;
      }
      this.toast.error('Không thể cập nhật trạng thái hoàn thành. Vui lòng thử lại.');
      return false;
    }
  }

  // Helper: Check if lesson has video content
  private hasVideoContent(lesson: any): boolean {
    // Check if lesson has videoUrl (fallback)
    if (lesson.videoUrl || lesson.streamVideoUid) {
      return true;
    }
    // Check if lesson has sections with VIDEO type
    if (lesson.sections && lesson.sections.length > 0) {
      return lesson.sections.some((s: any) => s.type === 'VIDEO' && (s.videoUrl || s.streamVideoUid));
    }
    return false;
  }

  // Helper: Get first video section from lesson
  private getFirstVideoSection(lesson: any): any {
    if (lesson.sections && lesson.sections.length > 0) {
      return lesson.sections.find((s: any) => s.type === 'VIDEO' && (s.videoUrl || s.streamVideoUid));
    }
    return null;
  }

  // Section completion helpers
  isSectionCompleted(sectionId: string): boolean {
    return this.completedSections().has(sectionId);
  }

  private async markSectionAsCompleted(
    sectionId: string,
    options: { persistBackend?: boolean } = {},
  ): Promise<void> {
    this.completedSections.update(completed => {
      const newSet = new Set(completed);
      newSet.add(sectionId);
      return newSet;
    });

    const lesson = this.currentLesson();
    const lessonId = lesson?.id;
    const courseId = lesson?.courseId ?? this.course()?.id;
    const shouldPersistOffline = this.course()?.isOfflinePackage === true || !this.network.online();

    if (courseId && lessonId && shouldPersistOffline) {
      await this.courseDownload.mergeCompletedSectionsOffline(courseId, lessonId, [sectionId]);
    }

    if (options.persistBackend !== false && lessonId) {
      const syncKey = this.buildSectionSyncKey(lessonId, sectionId);
      if (this.confirmedSectionCompletionSyncs.has(syncKey)) {
        return;
      }

      const inFlightSync = this.pendingSectionCompletionSyncs.get(syncKey);
      if (inFlightSync) {
        await inFlightSync;
      } else {
        const syncPromise = firstValueFrom(
          this.apiClient.post<any>(`/api/v3/student/progress/lessons/${lessonId}/sections/${sectionId}/complete`, {})
        )
          .then(() => {
            this.confirmedSectionCompletionSyncs.add(syncKey);
          })
          .catch(() => undefined)
          .finally(() => {
            this.pendingSectionCompletionSyncs.delete(syncKey);
          });
        this.pendingSectionCompletionSyncs.set(syncKey, syncPromise);
        await syncPromise;
      }
    }
  }

  private buildLessonCompletionPayload(lesson: any): Record<string, unknown> {
    const completedSectionIds = Array.isArray(lesson?.sections)
      ? lesson.sections
        .map((section: any) => section?.id)
        .filter((sectionId: unknown): sectionId is string => typeof sectionId === 'string' && sectionId.length > 0)
      : [];

    return {
      courseId: lesson?.courseId ?? this.course()?.id ?? null,
      completedSectionIds,
    };
  }

  private async loadCompletedSections(): Promise<void> {
    try {
      const courseId = this.course()?.id
        ?? this.route.snapshot.paramMap.get('courseId')
        ?? this.route.snapshot.paramMap.get('id');
      if (!courseId) {
        return;
      }

      const sections = await this.courseDownload.getOfflineCompletedSectionIds(courseId);
      this.completedSections.set(new Set(sections));
    } catch {
      // Best-effort only.
    }
  }

  private async hydrateCompletedSections(
    courseId: string,
    lessonId: string | null,
    online: boolean,
  ): Promise<void> {
    const offlineSections = await this.courseDownload.getOfflineCompletedSectionIds(courseId);
    const merged = new Set(offlineSections);

    if (online && lessonId) {
      try {
        const response: any = await firstValueFrom(
          this.lessonApi.getLessonProgress(lessonId).pipe(catchError(() => of(null)))
        );
        const completedSections = Array.isArray(response?.data?.completedSections)
          ? response.data.completedSections.filter(
            (sectionId: unknown): sectionId is string => typeof sectionId === 'string' && sectionId.length > 0,
          )
          : [];
        for (const sectionId of completedSections) {
          merged.add(sectionId);
        }
      } catch {
        // Best-effort hydration only.
      }
    }

    this.completedSections.set(merged);
  }

  // Video events
  async onVideoEnded(): Promise<void> {
    const lesson = this.currentLesson();
    const currentSectionIndex = this.currentSectionIndex();
    const isLastSection = !lesson?.sections?.length || currentSectionIndex >= lesson.sections.length - 1;
    const completed = await this.onMarkComplete();
    if (!completed) {
      return;
    }

    // Auto-advance to next lesson after 2s (Netflix pattern)
    if (isLastSection && this.canGoNext()) {
      setTimeout(() => {
        void this.nextLesson();
      }, 2000);
    }
  }

  /**
   * Called when a TEXT section has been read (80%+ scrolled).
   * Auto-marks the section as complete.
   */
  onSectionReadComplete(sectionId: string): void {
    if (this.completedSections().has(sectionId)) {
      return;
    }

    void this.markSectionAsCompleted(sectionId);
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

  // Get section number (e.g., "1.1", "1.2", "2.1")
  getSectionNumber(chapterIndex: number, lessonIndex: number, sectionIndex: number): string {
    return `${chapterIndex + 1}.${lessonIndex + 1}.${sectionIndex + 1}`;
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

  /** Check if a section is locked because a previous required section is incomplete */
  isSectionLockedByPrereqs(lesson: any, sectionIndex: number): boolean {
    if (!lesson?.sections) return false;
    for (let i = 0; i < sectionIndex; i++) {
      const section = lesson.sections[i];
      if (section.isRequired && !this.completedSections().has(section.id)) {
        return true;
      }
    }
    return false;
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

    // 🔒 Sequential progression: reuse the same check as the sidebar lock indicator
    const lesson = this.currentLesson();
    if (lesson && this.isSectionLockedByPrereqs(lesson, sectionIndex)) {
      this.toast.warning('Bạn cần hoàn thành các phần bắt buộc trước đó.');
      return;
    }

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
      this.paymentAccessState.set(state.accessActivationState);
    } catch {
      this.paymentAccessState.set(null);
    }
  }

  /** Check if a lesson is locked (paid course + not paid + not free lesson) */
  isLessonLocked(lesson: any): boolean {
    if (!this.coursePaid()) return false;
    if (lesson.locked === true) return true;
    if (lesson.isFree) return false;
    return !this.hasPaid() || this.paymentAccessState() === 'MANUAL_ACTIVATION_REQUIRED' || this.paymentAccessState() === 'ACCESS_PENDING';
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
      this.paymentAccessState.set('READY');
      this.coursePaid.set(false); // No longer locked
      // Reload course content to get unlocked content from server
      this.loadCourseFromRoute();
    }
  }

  onPaymentComplete(outcome: PaymentCompletionOutcome): void {
    this.hasPaid.set(true);
    this.paymentAccessState.set(outcome.accessActivation.state);
    if (outcome.accessActivation.state === 'READY') {
      this.coursePaid.set(false);
      this.loadCourseFromRoute();
      return;
    }
    if (outcome.accessActivation.message) {
      this.toast.info(outcome.accessActivation.message);
    }
  }

  // Navigation
  goBack(): void {
    const courseId = this.course()?.id;
    if (this.isPreview()) {
      if (courseId) {
        this.router.navigate(['/teacher/courses', courseId, 'editor', 'curriculum']);
      } else {
        this.router.navigate(['/teacher/courses']);
      }
      return;
    }
    if (courseId) {
      this.router.navigate(['/student/courses', courseId]);
    } else {
      this.router.navigate(['/student/courses']);
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

      const shouldComplete = result
        ? (result as any)?.data?.isPassed !== false
        : !this.network.online();

      if (shouldComplete) {
        const lesson = this.currentLesson();
        if (lesson?.id) {
          await firstValueFrom(this.lessonApi.markLessonComplete(lesson.id, this.buildLessonCompletionPayload(lesson)));
          this.learningService.markCurrentLessonComplete();
        }
      }
    } catch {
      if (!this.network.online()) {
        this.learningService.markCurrentLessonComplete();
      }
    }
  }

  private async handleReturnedSectionQuizCompletion(sectionId: string, passed: boolean): Promise<void> {
    if (!passed) {
      return;
    }

    const lesson = this.currentLesson();
    if (!lesson?.sections?.length) {
      return;
    }

    const completedSection = lesson.sections.find(section => section.id === sectionId);
    if (!completedSection) {
      return;
    }

    const nextCompletedSections = new Set(this.completedSections());
    nextCompletedSections.add(sectionId);
    const allSectionsCompleted = lesson.sections.every(section => nextCompletedSections.has(section.id));
    const alreadyCompleted = this.isSectionCompleted(sectionId);
    if (!alreadyCompleted) {
      await this.markSectionAsCompleted(sectionId, { persistBackend: true });
    }

    if (!allSectionsCompleted) {
      if (!alreadyCompleted) {
        this.toast.success(`Đã hoàn thành phần: ${completedSection.title}`);
      }
      return;
    }

    try {
      const lessonAlreadyCompleted = this.learningService.isLessonCompleted(lesson.id)();
      if (!lessonAlreadyCompleted) {
        await this.waitForSectionCompletionSync(lesson.id, sectionId);
        await firstValueFrom(this.lessonApi.markLessonComplete(lesson.id, this.buildLessonCompletionPayload(lesson)));
        await this.enrollmentService.refreshCourseProgress(lesson.courseId);
        this.learningService.markCurrentLessonComplete();
      }
      this.toast.success(`Đã hoàn thành bài: ${lesson.title}`);
    } catch {
      if (!this.network.online()) {
        this.learningService.markCurrentLessonComplete();
        const courseId = lesson?.courseId ?? this.course()?.id;
        if (courseId) {
          const allSectionIds = lesson.sections.map((s: any) => s.id).filter(Boolean);
          await this.courseDownload.mergeCompletedSectionsOffline(courseId, lesson.id, allSectionIds).catch(() => undefined);
        }
        this.toast.success(`Hoàn thành bài: ${lesson.title} (sẽ đồng bộ khi có mạng)`);
      } else if (!alreadyCompleted) {
        this.toast.success(`Đã hoàn thành phần: ${completedSection.title}`);
      }
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
      .subscribe(quiz => {
        if (quiz?.id) {
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

  async goToQuiz(lessonId: string, event: Event): Promise<void> {
    event.stopPropagation(); // Prevent lesson selection
    try {
      const lesson = this.sections()
        .flatMap(section => section.lessons)
        .find(item => item.id === lessonId);
      const courseId = this.course()?.id;
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

      if (isOffline && lesson?.quizAllowOffline === true) {
        await this.router.navigate(['/student/quiz/take', lessonId], {
          queryParams: {
            lessonId,
            courseId,
            quizType: lesson.quizType,
            allowOffline: true,
            returnUrl: this.router.url
          }
        });
        return;
      }

      const quizId = await firstValueFrom(this.quizApi.resolveQuizIdByLessonId(lessonId));
      await this.router.navigate(['/student/quiz/take', quizId], {
        queryParams: {
          lessonId,
          courseId,
          quizType: lesson?.quizType,
          allowOffline: lesson?.quizAllowOffline === true,
          returnUrl: this.router.url
        }
      });
    } catch {
      this.toast.error('Không thể mở bài kiểm tra của bài học này');
    }
  }

  // Helper to strip chapter prefix if already present in title
  getChapterDisplayTitle(title: string, index: number): string {
    // If title already starts with "Chương X:", strip it to avoid duplication
    if (title.toLowerCase().startsWith('chương') && title.includes(':')) {
      const parts = title.split(':');
      if (parts.length > 1) {
        return parts.slice(1).join(':').trim();
      }
    }
    return title;
  }

  // Helper to strip lesson prefix if already present in title
  getLessonDisplayTitle(title: string, index: number): string {
    // If title already starts with "Bài X:", strip it to avoid duplication
    if (title.toLowerCase().startsWith('bài') && title.includes(':')) {
      const parts = title.split(':');
      if (parts.length > 1) {
        return parts.slice(1).join(':').trim();
      }
    }
    return title;
  }

  private buildSectionSyncKey(lessonId: string, sectionId: string): string {
    return `${lessonId}:${sectionId}`;
  }

  private async waitForSectionCompletionSync(lessonId: string, sectionId: string): Promise<void> {
    const syncPromise = this.pendingSectionCompletionSyncs.get(this.buildSectionSyncKey(lessonId, sectionId));
    if (syncPromise) {
      await syncPromise;
    }
  }
}
