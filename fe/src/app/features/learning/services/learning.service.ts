import { Injectable, signal, computed, inject, DestroyRef, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of, Observable, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CourseApi } from '../../../api/client/course.api';
import { LessonApi } from '../../../api/client/lesson.api';
import { ApiClient } from '../../../api/client/api-client';
import { CourseContentChapter, LessonSummary as ApiLessonSummary } from '../../../api/types/course.types';
import {
  CourseOverview,
  CourseState,
  LessonState,
  ProgressState,
  Section,
  LessonSummary,
  LessonDetail,
  SectionContent,
  ErrorType
} from '../models/learning.models';
import { getLessonTypeFromTitle, LessonType } from '../models/lesson-types.enum';
import { CourseDownloadService } from '../../../core/services/course-download.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { offlineDb, getCurrentUserId } from '../../../core/db/lms-offline.db';
import type { InteractiveVideoSpec } from '../../../api/types/interactive-video.types';

/**
 * Learning Service
 * 
 * Centralized service for managing learning interface state and API calls.
 * Uses Angular Signals for reactive state management.
 */
@Injectable({
  providedIn: 'root'
})
export class LearningService {
  private courseApi = inject(CourseApi);
  private lessonApi = inject(LessonApi);
  private api = inject(ApiClient);
  private courseDownload = inject(CourseDownloadService);
  private network = inject(NetworkStatusService);
  private destroyRef = inject(DestroyRef);

  private bgCourseRefreshSub: Subscription | null = null;
  private bgLessonRefreshSub: Subscription | null = null;
  private currentCourseId: string | null = null;

  // Private state signals
  private courseState = signal<CourseState>({
    course: null,
    sections: [],
    loading: false,
    error: null
  });

  private lessonState = signal<LessonState>({
    currentLesson: null,
    loading: false,
    error: null
  });

  private progressState = signal<ProgressState>({
    completedLessons: new Set<string>(),
    progressPercentage: 0,
    lastAccessedLessonId: undefined
  });

  // New signals for progress tracking
  private courseProgress = signal<{ completedLessonIds: string[] } | null>(null);

  // Lesson cache for performance.
  // Stores `cachedAt` timestamp so we can apply TTL (SWR pattern).
  // Pattern: TanStack Query `staleTime` — data older than TTL is shown
  // immediately (instant render) but triggers background revalidation.
  private lessonCache = new Map<string, { detail: LessonDetail; cachedAt: number }>();

  // Stale-time before considering a cached lesson worth re-fetching when the
  // tab regains focus or visibility changes. 30s — long enough to avoid
  // refetch storms on rapid Alt-Tab, short enough that a teacher's edit
  // shows up within ~30s of the student returning to the tab.
  private static readonly LESSON_STALE_MS = 30_000;

  // Cache of lesson sections from /content endpoint (lessonId -> SectionContent[])
  private lessonSectionsCache = new Map<string, SectionContent[]>();
  private lessonCompletedSignalCache = new Map<string, Signal<boolean>>();

  // Public computed signals for components to consume

  /** Current course information */
  course = computed(() => this.courseState().course);

  /** All sections with lessons */
  sections = computed(() => this.courseState().sections);

  /** Current selected lesson */
  currentLesson = computed(() => this.lessonState().currentLesson);

  constructor() {
    // Refetch-on-focus pattern (TanStack Query / SWR default).
    // When the student switches back to this tab/window, silently refresh
    // the currently visible lesson if its cache entry is older than
    // LESSON_STALE_MS. Lets a teacher's edit propagate within ~30s of the
    // student returning to the tab — without a full F5.
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return; // SSR: no-op
    }
    const refreshIfStale = () => {
      if (document.visibilityState !== 'visible') return;
      if (!this.network.online()) return;
      const lessonId = this.currentLesson()?.id;
      if (!lessonId) return;
      const cached = this.lessonCache.get(lessonId);
      if (!cached) return;
      const age = Date.now() - cached.cachedAt;
      if (age > LearningService.LESSON_STALE_MS) {
        this.backgroundRefreshLesson(lessonId);
      }
    };
    document.addEventListener('visibilitychange', refreshIfStale);
    window.addEventListener('focus', refreshIfStale);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', refreshIfStale);
      window.removeEventListener('focus', refreshIfStale);
    });
  }

  /** Is loading course data */
  isLoadingCourse = computed(() => this.courseState().loading);

  /** Is loading lesson data */
  isLoadingLesson = computed(() => this.lessonState().loading);

  /** Course loading error */
  courseError = computed(() => this.courseState().error);

  /** Lesson loading error */
  lessonError = computed(() => this.lessonState().error);

  /** Set of completed lesson IDs */
  completedLessons = computed(() => this.progressState().completedLessons);

  /** Overall progress percentage (0-100) */
  progressPercentage = computed(() => this.progressState().progressPercentage);

  /** Last accessed lesson ID */
  lastAccessedLessonId = computed(() => this.progressState().lastAccessedLessonId);

  /** All lessons flattened from sections */
  allLessons = computed(() => {
    return this.sections().flatMap(section => section.lessons);
  });

  /** Total number of lessons */
  totalLessons = computed(() => this.allLessons().length);

  /** Number of completed lessons */
  completedLessonsCount = computed(() => this.completedLessons().size);

  /** Check if a specific lesson is completed */
  isLessonCompleted = (lessonId: string) => {
    const cached = this.lessonCompletedSignalCache.get(lessonId);
    if (cached) {
      return cached;
    }

    const completed = computed(() => {
      // Check both progress state and sections state
      const fromProgress = this.completedLessons().has(lessonId);
      const fromSections = this.sections().some(section =>
        section.lessons.some(lesson => lesson.id === lessonId && lesson.isCompleted)
      );
      return fromProgress || fromSections;
    });

    this.lessonCompletedSignalCache.set(lessonId, completed);
    return completed;
  };

  /** Get current lesson index in the flat list */
  currentLessonIndex = computed(() => {
    const current = this.currentLesson();
    if (!current) return -1;
    return this.allLessons().findIndex(l => l.id === current.id);
  });

  /** Can navigate to previous lesson */
  canGoPrevious = computed(() => this.currentLessonIndex() > 0);

  /** Can navigate to next lesson */
  canGoNext = computed(() => {
    const index = this.currentLessonIndex();
    const total = this.totalLessons();
    return index >= 0 && index < total - 1;
  });

  /** Get previous lesson */
  previousLesson = computed(() => {
    const index = this.currentLessonIndex();
    if (index <= 0) return null;
    return this.allLessons()[index - 1];
  });

  /** Get next lesson */
  nextLesson = computed(() => {
    const index = this.currentLessonIndex();
    const lessons = this.allLessons();
    if (index < 0 || index >= lessons.length - 1) return null;
    return lessons[index + 1];
  });

  /**
   * Check if student is enrolled in the course
   */
  checkEnrollment(courseId: string): Observable<boolean> {
    return this.courseApi.getCourseContent(courseId).pipe(
      map(() => true), // If we can fetch content, student is enrolled
      catchError(err => {
        if (err.status === 403) {
          return of(false); // 403 = not enrolled
        }
        throw err; // Other errors should be thrown
      })
    );
  }

  /**
   * Enroll in a course
   */
  enrollCourse(courseId: string): Observable<any> {
    return this.courseApi.enrollCourse(courseId);
  }

  /**
   * Load course data — Download-First pattern.
   *
   * If course was previously downloaded:
   *   → Load from IndexedDB instantly (no loading spinner)
   *   → Background refresh from server if online (stale-while-revalidate)
   *
   * If not downloaded:
   *   → Standard server-first flow with loading spinner
   *   → On network error + offline → fall back to IndexedDB
   */
  loadCourse(courseId: string): void {
    // Clear lesson cache when switching courses
    this.lessonCache.clear();
    this.lessonCompletedSignalCache.clear();
    this.currentCourseId = courseId;

    // Download-First: if course is downloaded, show local data instantly
    if (this.courseDownload.isDownloadedSync(courseId)) {
      this.loadCourseOffline(courseId);
      // Skip background refresh for downloaded courses to prevent overwriting
      // offline progress with stale server data before sync completes.
      // User will see fresh data after sync + next page load.
      return;
    }

    // Not downloaded → standard server-first flow
    this.courseState.update(state => ({
      ...state,
      loading: true,
      error: null
    }));

    forkJoin({
      courseInfo: this.courseApi.getCourseById(courseId).pipe(
        catchError(() => of(null))
      ),
      courseContent: this.courseApi.getCourseContent(courseId).pipe(
        catchError(() => of(null))
      ),
      courseProgress: this.getCourseProgress(courseId).pipe(
        catchError(() => of(null))
      )
    }).subscribe({
      next: ({ courseInfo, courseContent, courseProgress }) => {
        this.applyCourseData(courseId, courseInfo, courseContent, courseProgress);
      },
      error: (err) => {
        // If offline, try loading from IndexedDB directly
        if (!this.network.online()) {
          this.loadCourseOffline(courseId);
          return;
        }
        const errorMessage = this.getErrorMessage(err);
        this.courseState.update(state => ({
          ...state,
          loading: false,
          error: errorMessage
        }));
      }
    });
  }

  /**
   * Background refresh course data from server (stale-while-revalidate).
   * Silently updates signals if server has newer data. Never shows loading spinner.
   */
  private backgroundRefreshCourse(courseId: string): void {
    this.bgCourseRefreshSub?.unsubscribe();
    this.bgCourseRefreshSub = forkJoin({
      courseInfo: this.courseApi.getCourseById(courseId).pipe(
        catchError(() => of(null))
      ),
      courseContent: this.courseApi.getCourseContent(courseId).pipe(
        catchError(() => of(null))
      ),
      courseProgress: this.getCourseProgress(courseId).pipe(
        catchError(() => of(null))
      )
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ({ courseInfo, courseContent, courseProgress }) => {
        // Guard: only apply if still viewing the same course
        if (this.currentCourseId === courseId && courseInfo && courseContent) {
          this.applyCourseData(courseId, courseInfo, courseContent, courseProgress);
        }
      },
      // Silently ignore errors — stale local data is already showing
    });
  }

  /**
   * Apply fetched course data to state signals.
   * Shared by both server-first and background refresh flows.
   */
  private applyCourseData(
    courseId: string,
    courseInfo: any,
    courseContent: any,
    courseProgress: any,
  ): void {
    if (!courseInfo || !courseContent) {
      this.courseState.update(state => ({
        ...state,
        loading: false,
        error: 'Failed to load course data'
      }));
      return;
    }

    const courseData = courseInfo?.data;
    const course: CourseOverview = {
      id: courseData?.id || courseId,
      title: courseData?.title || '',
      description: courseData?.description || '',
      instructor: courseData?.teacherName || 'Unknown',
      thumbnail: '',
      sectionsCount: courseData?.chapterCount || 0,
      lessonsCount: this.countLessons(courseContent.data || []),
      duration: this.calculateTotalDuration(courseContent.data || []),
      isEnrolled: true,
      isOfflinePackage: false,
      isStale: false,
      staleReason: null,
    };

    const sections = this.mapSections(courseContent.data || []);
    const mergedSections = this.mergeProgressIntoSections(sections, courseProgress);

    this.courseState.set({
      course,
      sections: mergedSections,
      loading: false,
      error: null
    });

    if (courseProgress?.completedLessonIds && Array.isArray(courseProgress.completedLessonIds)) {
      const completedLessonIds = courseProgress.completedLessonIds;
      this.progressState.update(state => ({
        ...state,
        completedLessons: new Set(completedLessonIds)
      }));

      // Use local mergedSections to avoid signal timing issues
      const total = mergedSections.reduce((sum, s) => sum + s.lessons.length, 0);
      const completed = completedLessonIds.length;
      const progressPercentage = total > 0
        ? Math.round((completed / total) * 100)
        : 0;

      this.progressState.update(state => ({
        ...state,
        progressPercentage
      }));
    } else {
      void this.loadOfflineProgressState(courseId);
    }
  }

  private mapSectionContent(section: any): SectionContent {
    const offlineVideoUrl = (section.videoOfflineUri && section.videoOfflineUri !== 'undefined' && section.videoOfflineUri !== 'null')
      ? section.videoOfflineUri
      : undefined;
    const offlineFileUrl = (section.fileOfflineUri && section.fileOfflineUri !== 'undefined' && section.fileOfflineUri !== 'null')
      ? section.fileOfflineUri
      : undefined;

    return {
      id: section.id,
      title: section.title || '',
      type: (section.type?.toUpperCase() || 'TEXT') as 'VIDEO' | 'TEXT' | 'QUIZ' | 'FILE' | 'ASSIGNMENT',
      content: (section.content && section.content !== 'undefined' && section.content !== 'null') ? section.content : undefined,
      videoAssetId: (section.videoAssetId && section.videoAssetId !== 'undefined' && section.videoAssetId !== 'null')
        ? section.videoAssetId
        : undefined,
      videoProcessingStatus: (section.videoProcessingStatus && section.videoProcessingStatus !== 'undefined' && section.videoProcessingStatus !== 'null')
        ? section.videoProcessingStatus
        : undefined,
      videoSourceKind: (section.videoSourceKind && section.videoSourceKind !== 'undefined' && section.videoSourceKind !== 'null')
        ? section.videoSourceKind
        : undefined,
      videoUrl: offlineVideoUrl || ((section.videoUrl && section.videoUrl !== 'undefined' && section.videoUrl !== 'null') ? section.videoUrl : undefined),
      videoType: section.videoType,
      streamVideoUid: (section.streamVideoUid && section.streamVideoUid !== 'undefined' && section.streamVideoUid !== 'null')
        ? section.streamVideoUid
        : undefined,
      videoOfflineUri: offlineVideoUrl,
      fileUrl: offlineFileUrl || ((section.fileUrl && section.fileUrl !== 'undefined' && section.fileUrl !== 'null') ? section.fileUrl : undefined),
      duration: section.duration,
      orderIndex: section.orderIndex ?? 0,
      isRequired: section.isRequired ?? false,
      completionThreshold: section.completionThreshold,
      interactiveVideoSpec: this.normalizeInteractiveVideoSpec(section.interactiveVideoSpec),
      quizData: section.quizData ? {
        quizType: section.quizData.quizType,
        countsTowardCertificate: section.quizData.countsTowardCertificate,
        allowOffline: section.quizData.allowOffline,
        timeLimitMinutes: section.quizData.timeLimitMinutes,
        passingScore: section.quizData.passingScore,
        maxAttempts: section.quizData.maxAttempts,
        shuffleQuestions: section.quizData.shuffleQuestions,
        shuffleOptions: section.quizData.shuffleOptions,
        showResultsImmediately: section.quizData.showResultsImmediately,
        showCorrectAnswers: section.quizData.showCorrectAnswers,
        questions: Array.isArray(section.quizData.questions)
          ? section.quizData.questions.map((question: any) => ({
              id: question.id,
              content: question.content || '',
              difficulty: question.difficulty,
            }))
          : [],
      } : undefined,
    };
  }

  private normalizeInteractiveVideoSpec(value: unknown): InteractiveVideoSpec | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const record = value as Record<string, unknown>;
    const timeline = Array.isArray(record['timeline']) ? record['timeline'] : [];
    if (timeline.length === 0 && record['enabled'] !== true) {
      return null;
    }

    return {
      version: 1,
      enabled: record['enabled'] !== false,
      timeline: timeline
        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        .map((item, index) => ({
          id: typeof item['id'] === 'string' && item['id'].length > 0 ? item['id'] : `interaction-${index + 1}`,
          type: this.normalizeInteractiveVideoInteractionType(item['type']),
          atSeconds: this.toNumber(item['atSeconds'] ?? item['at'] ?? item['time'], 0),
          endSeconds: item['endSeconds'] == null ? null : this.toNumber(item['endSeconds'], 0),
          title: typeof item['title'] === 'string' ? item['title'] : null,
          body: typeof item['body'] === 'string' ? item['body'] : (typeof item['prompt'] === 'string' ? item['prompt'] : null),
          pause: item['pause'] !== false,
          required: item['required'] === true,
          choices: Array.isArray(item['choices'])
            ? item['choices']
                .filter((choice): choice is Record<string, unknown> => !!choice && typeof choice === 'object')
                .map((choice, choiceIndex) => ({
                  id: typeof choice['id'] === 'string' && choice['id'].length > 0 ? choice['id'] : `choice-${choiceIndex + 1}`,
                  label: typeof choice['label'] === 'string'
                    ? choice['label']
                    : (typeof choice['text'] === 'string' ? choice['text'] : `Lua chon ${choiceIndex + 1}`),
                  feedback: typeof choice['feedback'] === 'string' ? choice['feedback'] : null,
                  isCorrect: choice['isCorrect'] === true,
                  targetTimeSeconds: choice['targetTimeSeconds'] == null ? null : this.toNumber(choice['targetTimeSeconds'], 0),
                  targetInteractionId: typeof choice['targetInteractionId'] === 'string' ? choice['targetInteractionId'] : null,
                }))
            : [],
        }))
        .sort((a, b) => a.atSeconds - b.atSeconds),
    };
  }

  private normalizeInteractiveVideoInteractionType(rawType: unknown): InteractiveVideoSpec['timeline'][number]['type'] {
    const type = typeof rawType === 'string' ? rawType.toLowerCase() : 'checkpoint';
    if (type === 'single_choice' || type === 'branch' || type === 'hotspot') {
      return type;
    }
    return 'checkpoint';
  }

  private toNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }

  private applyLessonOfflineVideoFallback(
    sections: SectionContent[],
    lessonOfflineVideoUri?: string,
  ): SectionContent[] {
    if (!lessonOfflineVideoUri) {
      return sections;
    }

    return sections.map(section => {
      if (section.type !== 'VIDEO' || section.videoOfflineUri || section.videoType === 'YOUTUBE' || section.streamVideoUid) {
        return section;
      }

      return {
        ...section,
        videoUrl: lessonOfflineVideoUri,
        videoOfflineUri: lessonOfflineVideoUri,
      };
    });
  }

  /**
   * Load course data from IndexedDB (download-first).
   * Uses real chapter titles from IndexedDB instead of generic "Chương X".
   */
  private async loadCourseOffline(courseId: string): Promise<void> {
    try {
      const [offlineLessons, offlineChapters, offlineCourse] = await Promise.all([
        this.courseDownload.getOfflineLessons(courseId),
        this.courseDownload.getOfflineChapters(courseId),
        this.courseDownload.getOfflineCourse(courseId),
      ]);

      if (offlineLessons.length === 0) {
        this.courseState.update(s => ({
          ...s, loading: false,
          error: 'Khóa học chưa được tải xuống. Kết nối mạng và tải khóa học để xem ngoại tuyến.',
        }));
        return;
      }

      // Build chapter title lookup
      const chapterTitleMap = new Map(offlineChapters.map(ch => [ch.id, ch.title]));

      // Build course overview from offline data
      const courseData = this.courseDownload.downloadedCourses().find(c => c.id === courseId);

      const course: CourseOverview = {
        id: courseId,
        title: offlineCourse?.title || courseData?.title || 'Khóa học ngoại tuyến',
        description: offlineCourse?.description || '',
        instructor: 'LMS Maritime',
        thumbnail: '',
        sectionsCount: offlineChapters.length,
        lessonsCount: offlineLessons.length,
        duration: '',
        isEnrolled: true,
        isOfflinePackage: true,
        isStale: offlineCourse?.isStale === true,
        staleReason: offlineCourse?.staleReason ?? null,
      };

      // Group lessons by chapter (preserve chapter order from offlineChapters)
      const lessonsByChapter = new Map<string, typeof offlineLessons>();
      for (const lesson of offlineLessons) {
        const group = lessonsByChapter.get(lesson.chapterId) || [];
        group.push(lesson);
        lessonsByChapter.set(lesson.chapterId, group);
      }

      // Build sections using real chapter order and titles
      const sections: Section[] = offlineChapters.map((ch, idx) => ({
        id: ch.id,
        title: chapterTitleMap.get(ch.id) || `Chương ${idx + 1}`,
        description: '',
        orderIndex: ch.sortOrder ?? idx,
        lessons: (lessonsByChapter.get(ch.id) || [])
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((l, i) => ({
            id: l.id,
            title: l.title,
            description: '',
            lessonType: (l.lessonType as LessonType | undefined) || (l.videoManifestUrl ? LessonType.LECTURE : LessonType.READING),
            duration: 0,
            orderIndex: l.sortOrder ?? i,
            isCompleted: false,
            quizType: l.quizType,
            countsTowardCertificate: l.countsTowardCertificate,
            quizAllowOffline: l.quizAllowOffline,
            sections: Array.isArray(l.sections)
              ? this.applyLessonOfflineVideoFallback(
                  l.sections.map(section => this.mapSectionContent(section)),
                  l.videoOfflineUri,
                )
              : [],
          })),
      }));

      // Merge progress from localStorage
      this.courseState.set({ course, sections, loading: false, error: null });
      await this.loadOfflineProgressState(courseId);
    } catch {
      this.courseState.update(s => ({
        ...s, loading: false,
        error: 'Không thể tải dữ liệu ngoại tuyến',
      }));
    }
  }

  /**
   * Load lesson from IndexedDB when offline.
   */
  private async loadLessonOffline(lessonId: string): Promise<void> {
    try {
      const offlineLesson = await this.courseDownload.getOfflineLesson(lessonId);
      if (!offlineLesson) {
        this.lessonState.update(s => ({
          ...s, loading: false,
          error: 'Bài học chưa được tải xuống cho chế độ ngoại tuyến',
        }));
        return;
      }

      const lessonDetail: LessonDetail = {
        id: offlineLesson.id,
        title: offlineLesson.title,
        description: '',
        lessonType: (offlineLesson.lessonType as LessonType | undefined) || (offlineLesson.videoManifestUrl ? LessonType.LECTURE : LessonType.READING),
        duration: 0,
        orderIndex: offlineLesson.sortOrder,
        content: offlineLesson.contentHtml,
        videoUrl: offlineLesson.videoOfflineUri || offlineLesson.videoManifestUrl,
        streamVideoUid: offlineLesson.streamVideoUid,
        videoOfflineUri: offlineLesson.videoOfflineUri,
        thumbnail: '',
        attachments: [],
        sectionId: offlineLesson.chapterId,
        sectionTitle: '',
        courseId: offlineLesson.courseId,
        courseTitle: '',
        durationMinutes: 0,
        quizType: offlineLesson.quizType,
        countsTowardCertificate: offlineLesson.countsTowardCertificate,
        quizAllowOffline: offlineLesson.quizAllowOffline,
        sections: Array.isArray(offlineLesson.sections) && offlineLesson.sections.length > 0
          ? this.applyLessonOfflineVideoFallback(
              offlineLesson.sections.map(section => this.mapSectionContent(section)),
              offlineLesson.videoOfflineUri,
            )
          : (offlineLesson.contentHtml ? [{
              id: `${offlineLesson.id}-text`,
              title: offlineLesson.title,
              type: 'TEXT' as const,
              content: offlineLesson.contentHtml,
              orderIndex: 0,
              isRequired: true,
            }] : []),
      };

      this.lessonCache.set(lessonId, { detail: lessonDetail, cachedAt: Date.now() });
      this.lessonState.set({ currentLesson: lessonDetail, loading: false, error: null });
      this.updateLastAccessedLesson(lessonId);
    } catch {
      this.lessonState.update(s => ({
        ...s, loading: false,
        error: 'Không thể tải bài học ngoại tuyến',
      }));
    }
  }

  /**
   * Load lesson details — Download-First pattern.
   *
   * Priority: memory cache → IndexedDB (if downloaded) → API → offline fallback.
   * For downloaded courses, IndexedDB read is instant (no spinner).
   */
  loadLesson(lessonId: string): void {
    // 1. Check memory cache first (instant). SWR pattern: serve cached data
    // immediately, but if entry is older than LESSON_STALE_MS, kick off a
    // silent background refetch so teacher edits propagate without F5.
    const cached = this.lessonCache.get(lessonId);
    if (cached) {
      this.lessonState.set({
        currentLesson: cached.detail,
        loading: false,
        error: null
      });
      this.updateLastAccessedLesson(lessonId);
      const age = Date.now() - cached.cachedAt;
      if (age > LearningService.LESSON_STALE_MS && this.network.online()) {
        this.backgroundRefreshLesson(lessonId);
      }
      return;
    }

    // 1.5. When device is offline, always prefer the IndexedDB package over
    // any stale API response that may still be served from NGSW data cache.
    if (!this.network.online()) {
      void this.loadLessonOffline(lessonId);
      return;
    }

    // 2. Download-First: check if lesson's course is downloaded
    const courseId = this.course()?.id;
    if (courseId && this.courseDownload.isDownloadedSync(courseId)) {
      // Load from IndexedDB instantly (no loading spinner)
      this.loadLessonOffline(lessonId).then(() => {
        // Background refresh from API if online
        if (this.network.online()) {
          this.backgroundRefreshLesson(lessonId);
        }
      });
      return;
    }

    // 3. Not downloaded → standard API-first flow
    this.lessonState.update(state => ({
      ...state,
      loading: true,
      error: null
    }));

    // Fire-and-forget: fetchLessonFromApi is now async (pre-reads offline
    // metadata before API call) but still subscribes internally for state.
    void this.fetchLessonFromApi(lessonId);
  }

  /**
   * Fetch lesson from API and update state.
   * Shared by both API-first and background refresh flows.
   *
   * Pre-loads offline metadata từ IndexedDB (videoOfflineUri at lesson- và
   * section-level) trước khi fire API request. Khi API trả về fresh data,
   * `mergeOfflineFields` re-injects `videoOfflineUri` để video player vẫn
   * dùng cached video thay vì raw `videoUrl`. Same preservation pattern as
   * `backgroundRefreshLesson` (commit eeb6420f) — extended here cho FIRST
   * load case (no in-memory state) khi user vừa mở lesson sau khi đã
   * download course → IndexedDB có offline URIs nhưng `currentLesson()`
   * còn null. Without this, video player falls back to raw videoUrl →
   * network → 504 timeout (production bug 2026-04-28).
   */
  private async fetchLessonFromApi(lessonId: string): Promise<void> {
    // Pre-load offline metadata so we can merge into the API response below.
    // Read happens BEFORE subscribe so we don't race the network request.
    const offlineData = await this.loadOfflineDataForLesson(lessonId);

    this.lessonApi.getLessonById(lessonId).subscribe({
      next: (response) => {
        const data = response?.data;
        if (!data) {
          this.lessonState.update(state => ({
            ...state,
            loading: false,
            error: 'Lesson data not found'
          }));
          return;
        }

        const lessonDetail = this.mapLessonResponse(data);

        // Preserve offline-only fields (videoOfflineUri) from IndexedDB.
        // Server doesn't know about user's downloaded videos, so fresh API
        // response has `videoOfflineUri = undefined`. Merge re-attaches the
        // local URIs so the video player can keep using the cached file.
        if (offlineData) {
          this.mergeOfflineFields(lessonDetail, offlineData);
        }

        this.lessonCache.set(lessonId, { detail: lessonDetail, cachedAt: Date.now() });

        this.lessonState.set({
          currentLesson: lessonDetail,
          loading: false,
          error: null
        });
        this.updateLastAccessedLesson(lessonId);
      },
      error: (err) => {
        if (!this.network.online()) {
          this.loadLessonOffline(lessonId);
          return;
        }
        const errorMessage = this.getErrorMessage(err);
        this.lessonState.update(state => ({
          ...state,
          loading: false,
          error: errorMessage
        }));
      }
    });
  }

  /**
   * Read minimal offline metadata (videoOfflineUri at lesson + section
   * level) từ IndexedDB shaped như a `LessonDetail` so it can be passed
   * directly to `mergeOfflineFields(target, source)`. Returns `null` when
   * the lesson hasn't been downloaded or IndexedDB read fails — caller
   * handles `null` by skipping the merge.
   */
  private async loadOfflineDataForLesson(lessonId: string): Promise<LessonDetail | null> {
    try {
      const userId = getCurrentUserId();
      const offline = await offlineDb.lessons.get([userId, lessonId]);
      if (!offline) return null;
      // Construct minimal LessonDetail-shaped object — only fields used
      // by `mergeOfflineFields`. Rest cast through Partial → LessonDetail
      // to keep TS happy without duplicating the full mapping logic.
      return {
        videoOfflineUri: offline.videoOfflineUri,
        sections: (offline.sections || []).map(s => ({
          id: s.id,
          videoOfflineUri: s.videoOfflineUri,
        } as any)),
      } as Partial<LessonDetail> as LessonDetail;
    } catch {
      return null;
    }
  }

  /**
   * Background refresh lesson from API (stale-while-revalidate).
   * Silently updates cache and state if server has newer data.
   */
  private backgroundRefreshLesson(lessonId: string): void {
    this.bgLessonRefreshSub?.unsubscribe();
    this.bgLessonRefreshSub = this.lessonApi.getLessonById(lessonId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (response) => {
        const data = response?.data;
        if (data) {
          const lessonDetail = this.mapLessonResponse(data);
          // Preserve offline-only fields (videoOfflineUri) from current state.
          // SWR refresh only updates content, MUST NOT wipe local-cache info
          // because server doesn't know about user's downloaded videos.
          // Without this preservation, video player falls back to raw
          // videoUrl → network → 504 timeout (production bug 2026-04-28).
          const current = this.currentLesson();
          if (current?.id === lessonId) {
            this.mergeOfflineFields(lessonDetail, current);
          }
          this.lessonCache.set(lessonId, { detail: lessonDetail, cachedAt: Date.now() });
          if (this.currentLesson()?.id === lessonId) {
            this.lessonState.set({
              currentLesson: lessonDetail,
              loading: false,
              error: null
            });
          }
        }
      },
      // Silently ignore errors — stale local data is already showing
    });
  }

  /**
   * Merge offline-only fields từ existing state vào fresh API data.
   * Server không biết về local cache nên không trả `videoOfflineUri`.
   * Preserve để video player vẫn dùng cached video sau SWR refresh.
   */
  private mergeOfflineFields(target: LessonDetail, source: LessonDetail): void {
    if (source.videoOfflineUri && !target.videoOfflineUri) {
      target.videoOfflineUri = source.videoOfflineUri;
    }
    if (target.sections && source.sections) {
      const sourceById = new Map(source.sections.map(s => [s.id, s]));
      target.sections.forEach(section => {
        const localSection = sourceById.get(section.id);
        if (localSection?.videoOfflineUri && !section.videoOfflineUri) {
          section.videoOfflineUri = localSection.videoOfflineUri;
        }
      });
    }
  }

  /**
   * Map API lesson response to LessonDetail model.
   */
  private mapLessonResponse(data: any): LessonDetail {
    let mappedSections: SectionContent[] = (data.sections || []).map((s: any) => this.mapSectionContent(s));

    if (mappedSections.length === 0) {
      const fromCourseContent = this.findSectionsFromCourseContent(data.id);
      if (fromCourseContent && fromCourseContent.length > 0) {
        mappedSections = fromCourseContent;
      }
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      lessonType: (data.lessonType as any) || getLessonTypeFromTitle(data.title),
      duration: data.durationMinutes || 0,
      orderIndex: 0,
      content: data.content || '',
      videoUrl: data.videoUrl,
      videoOfflineUri: data.videoOfflineUri,
      thumbnail: '',
      attachments: (data.attachments || []) as any,
      sectionId: data.sectionId,
      sectionTitle: data.sectionTitle || '',
      courseId: data.courseId,
      courseTitle: data.courseTitle || '',
      durationMinutes: data.durationMinutes,
      quizType: data.quizType,
      countsTowardCertificate: data.countsTowardCertificate,
      quizAllowOffline: data.quizAllowOffline,
      sections: mappedSections
    };
  }

  /**
   * Select a lesson (load if not current)
   */
  selectLesson(lesson: LessonSummary): void {
    const current = this.currentLesson();
    if (current && current.id === lesson.id) {
      return; // Already selected
    }
    this.loadLesson(lesson.id);
  }

  /**
   * Navigate to previous lesson
   */
  goToPreviousLesson(): void {
    const prev = this.previousLesson();
    if (prev) {
      this.loadLesson(prev.id);
    }
  }

  /**
   * Navigate to next lesson
   */
  goToNextLesson(): void {
    const next = this.nextLesson();
    if (next) {
      this.loadLesson(next.id);
    }
  }

  /**
   * Mark a lesson as completed
   */
  markLessonComplete(lessonId: string): void {
    this.progressState.update(state => {
      const newCompleted = new Set(state.completedLessons);
      newCompleted.add(lessonId);

      const total = this.totalLessons();
      const progressPercentage = total > 0
        ? Math.round((newCompleted.size / total) * 100)
        : 0;

      const newState = {
        completedLessons: newCompleted,
        progressPercentage,
        lastAccessedLessonId: state.lastAccessedLessonId
      };

      return newState;
    });

    this.saveProgressToStorage();
    const courseId = this.course()?.id;
    if (courseId && this.courseDownload.isDownloadedSync(courseId)) {
      void this.courseDownload.markLessonCompletedOffline(courseId, lessonId);
    }

    // Update sections to reflect completion
    this.courseState.update(state => ({
      ...state,
      sections: state.sections.map(section => ({
        ...section,
        lessons: section.lessons.map(lesson =>
          lesson.id === lessonId
            ? { ...lesson, isCompleted: true }
            : lesson
        )
      }))
    }));
  }

  /**
   * Mark current lesson as completed
   */
  markCurrentLessonComplete(): void {
    const current = this.currentLesson();
    if (current) {
      this.markLessonComplete(current.id);
    }
  }

  /**
   * Clear lesson cache (useful for refresh)
   */
  clearCache(): void {
    this.lessonCache.clear();
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.bgCourseRefreshSub?.unsubscribe();
    this.bgLessonRefreshSub?.unsubscribe();
    this.bgCourseRefreshSub = null;
    this.bgLessonRefreshSub = null;
    this.currentCourseId = null;

    this.courseState.set({
      course: null,
      sections: [],
      loading: false,
      error: null
    });

    this.lessonState.set({
      currentLesson: null,
      loading: false,
      error: null
    });

    this.progressState.set({
      completedLessons: new Set<string>(),
      progressPercentage: 0,
      lastAccessedLessonId: undefined
    });

    this.lessonCache.clear();
  }

  // Private helper methods

  private getCourseProgress(courseId: string) {
    const url = `/api/v3/student/progress/courses/${courseId}/completed-ids`;
    return this.api.get<any>(url).pipe(
      map(res => {
        // API returns { data: ["id1", "id2", ...] } — flat array in data
        const data = res?.data;
        const completedLessonIds = Array.isArray(data)
          ? data
          : (data?.completedLessonIds ?? res?.completedLessonIds ?? []);

        return { completedLessonIds };
      })
    );
  }




  private mergeProgressIntoSections(sections: Section[], progress: any): Section[] {
    if (!progress?.completedLessonIds || !Array.isArray(progress.completedLessonIds)) {
      return sections;
    }

    const completedSet = new Set(progress.completedLessonIds);

    return sections.map(section => ({
      ...section,
      lessons: section.lessons.map(lesson => ({
        ...lesson,
        isCompleted: completedSet.has(lesson.id)
      }))
    }));
  }


  private mapSections(data: CourseContentChapter[]): Section[] {
    // Clear the sections cache for new course
    this.lessonSectionsCache.clear();

    // Deduplicate chapters by ID to prevent duplicates from backend
    const seenChapterIds = new Set<string>();
    const uniqueChapters = data.filter(chapter => {
      if (seenChapterIds.has(chapter.id)) {
        return false;
      }
      seenChapterIds.add(chapter.id);
      return true;
    });

    return uniqueChapters
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
      .map(section => {
        // Deduplicate lessons within each chapter
        const seenLessonIds = new Set<string>();
        const uniqueLessons = (section.lessons || []).filter(lesson => {
          if (seenLessonIds.has(lesson.id)) {
            return false;
          }
          seenLessonIds.add(lesson.id);
          return true;
        });

        return {
          id: section.id,
          title: section.title,
          description: section.description || '',
          orderIndex: section.orderIndex || 0,
          lessons: uniqueLessons
            .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
            .map((lesson: ApiLessonSummary, idx) => {
              // Cache sections from /content for later use in loadLesson()
              if (lesson.sections && lesson.sections.length > 0) {
                this.lessonSectionsCache.set(lesson.id, lesson.sections.map(s => this.mapSectionContent(s)));
              }
              return {
                id: lesson.id,
                title: lesson.title,
                description: lesson.description || '',
                lessonType: (lesson as any).lessonType || getLessonTypeFromTitle(lesson.title),
                duration: 0, // Will be loaded when lesson is selected
                orderIndex: lesson.orderIndex || idx,
                isFree: (lesson as any).isFree === true,
                locked: (lesson as any).locked === true,
                quizType: (lesson as any).quizType,
                countsTowardCertificate: (lesson as any).countsTowardCertificate,
                quizAllowOffline: (lesson as any).quizAllowOffline,
                sections: (lesson.sections || []).map(s => this.mapSectionContent(s))
              };
            })
        };
      });
  }

  private countLessons(sections: CourseContentChapter[]): number {
    return sections.reduce((total, section) =>
      total + (section.lessons?.length || 0), 0
    );
  }

  private calculateTotalDuration(sections: CourseContentChapter[]): string {
    // Placeholder - would need lesson durations to calculate accurately
    const lessonCount = this.countLessons(sections);
    const estimatedHours = Math.ceil(lessonCount * 0.5); // Assume 30 min per lesson
    return `${estimatedHours} hours`;
  }

  private getErrorMessage(err: any): string {
    if (err?.status === 403) {
      return 'Access denied. Please enroll in this course.';
    }
    if (err?.status === 404) {
      return 'Course or lesson not found.';
    }
    if (err?.message) {
      return err.message;
    }
    return 'An error occurred while loading data.';
  }

  private findSectionsFromCourseContent(lessonId: string): SectionContent[] | null {
    return this.lessonSectionsCache.get(lessonId) ?? null;
  }

  private updateLastAccessedLesson(lessonId: string): void {
    this.progressState.update(state => ({
      ...state,
      lastAccessedLessonId: lessonId
    }));
    this.saveProgressToStorage();
  }

  private getUserId(): string {
    try {
      const userJson = localStorage.getItem('lms_user');
      if (userJson) {
        const user = JSON.parse(userJson);
        if (user?.id) return user.id;
      }
    } catch { /* ignore */ }
    return 'anonymous';
  }

  private getStorageKey(courseId: string): string {
    const userId = this.getUserId();
    return `learning_progress_${userId}_${courseId}`;
  }

  private async loadOfflineProgressState(courseId: string): Promise<void> {
    try {
      const progress = await this.courseDownload.getOfflineProgressState(courseId);
      const completedLessons = new Set(progress.completedLessons || []);
      const total = this.totalLessons();
      const progressPercentage = total > 0
        ? Math.round((completedLessons.size / total) * 100)
        : 0;

      this.progressState.update(state => ({
        ...state,
        completedLessons,
        lastAccessedLessonId: progress.lastAccessedLessonId,
        progressPercentage
      }));

      this.courseState.update(state => ({
        ...state,
        sections: state.sections.map(section => ({
          ...section,
          lessons: section.lessons.map(lesson => ({
            ...lesson,
            isCompleted: completedLessons.has(lesson.id)
          }))
        }))
      }));
    } catch {
      // Best-effort only.
    }
  }

  private loadProgressFromStorage(courseId: string): void {
    try {
      const key = this.getStorageKey(courseId);
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored);
        this.progressState.update(state => ({
          ...state,
          completedLessons: new Set(data.completedLessons || []),
          lastAccessedLessonId: data.lastAccessedLessonId
        }));

        // Recalculate progress percentage
        const total = this.totalLessons();
        const completed = this.completedLessons().size;
        const progressPercentage = total > 0
          ? Math.round((completed / total) * 100)
          : 0;

        this.progressState.update(state => ({
          ...state,
          progressPercentage
        }));
      }
    } catch (error) {
      // Progress calculation — non-critical, UI shows stale data
    }
  }

  private saveProgressToStorage(): void {
    try {
      const course = this.course();
      if (!course) return;

      const key = this.getStorageKey(course.id);
      const data = {
        completedLessons: Array.from(this.completedLessons()),
        lastAccessedLessonId: this.lastAccessedLessonId(),
        progressPercentage: this.progressPercentage(),
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      // localStorage write — silent, progress saved to API separately
    }
  }
}
