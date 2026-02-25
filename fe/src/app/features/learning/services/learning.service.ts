import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
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

  // Lesson cache for performance
  private lessonCache = new Map<string, LessonDetail>();

  // Cache of lesson sections from /content endpoint (lessonId -> SectionContent[])
  private lessonSectionsCache = new Map<string, SectionContent[]>();

  // Public computed signals for components to consume

  /** Current course information */
  course = computed(() => this.courseState().course);

  /** All sections with lessons */
  sections = computed(() => this.courseState().sections);

  /** Current selected lesson */
  currentLesson = computed(() => this.lessonState().currentLesson);

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
    return computed(() => {
      // Check both progress state and sections state
      const fromProgress = this.completedLessons().has(lessonId);
      const fromSections = this.sections().some(section =>
        section.lessons.some(lesson => lesson.id === lessonId && lesson.isCompleted)
      );
      return fromProgress || fromSections;
    });
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
      isEnrolled: true
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

      const total = this.totalLessons();
      const completed = completedLessonIds.length;
      const progressPercentage = total > 0
        ? Math.round((completed / total) * 100)
        : 0;

      this.progressState.update(state => ({
        ...state,
        progressPercentage
      }));
    } else {
      this.loadProgressFromStorage(courseId);
    }
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
            lessonType: l.videoManifestUrl ? LessonType.LECTURE : LessonType.READING,
            duration: 0,
            orderIndex: l.sortOrder ?? i,
            isCompleted: false,
          })),
      }));

      // Merge progress from localStorage
      this.courseState.set({ course, sections, loading: false, error: null });
      this.loadProgressFromStorage(courseId);
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
        lessonType: offlineLesson.videoManifestUrl ? LessonType.LECTURE : LessonType.READING,
        duration: 0,
        orderIndex: offlineLesson.sortOrder,
        content: offlineLesson.contentHtml,
        videoUrl: offlineLesson.videoOfflineUri || offlineLesson.videoManifestUrl,
        thumbnail: '',
        attachments: [],
        sectionId: offlineLesson.chapterId,
        sectionTitle: '',
        courseId: offlineLesson.courseId,
        courseTitle: '',
        durationMinutes: 0,
        sections: offlineLesson.contentHtml ? [{
          id: `${offlineLesson.id}-text`,
          title: offlineLesson.title,
          type: 'TEXT' as const,
          content: offlineLesson.contentHtml,
          orderIndex: 0,
          isRequired: true,
        }] : [],
      };

      this.lessonCache.set(lessonId, lessonDetail);
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
    // 1. Check memory cache first (instant)
    const cached = this.lessonCache.get(lessonId);
    if (cached) {
      this.lessonState.set({
        currentLesson: cached,
        loading: false,
        error: null
      });
      this.updateLastAccessedLesson(lessonId);
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

    this.fetchLessonFromApi(lessonId);
  }

  /**
   * Fetch lesson from API and update state.
   * Shared by both API-first and background refresh flows.
   */
  private fetchLessonFromApi(lessonId: string): void {
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
        this.lessonCache.set(lessonId, lessonDetail);

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
          this.lessonCache.set(lessonId, lessonDetail);
          // Only update if this is still the current lesson
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
   * Map API lesson response to LessonDetail model.
   */
  private mapLessonResponse(data: any): LessonDetail {
    let mappedSections: SectionContent[] = (data.sections || []).map((s: any) => ({
      id: s.id,
      title: s.title || '',
      type: (s.type?.toUpperCase() || 'TEXT') as 'VIDEO' | 'TEXT' | 'QUIZ' | 'FILE' | 'ASSIGNMENT',
      content: (s.content && s.content !== 'undefined' && s.content !== 'null') ? s.content : undefined,
      videoUrl: (s.videoUrl && s.videoUrl !== 'undefined' && s.videoUrl !== 'null') ? s.videoUrl : undefined,
      fileUrl: (s.fileUrl && s.fileUrl !== 'undefined' && s.fileUrl !== 'null') ? s.fileUrl : undefined,
      duration: s.duration,
      orderIndex: s.orderIndex ?? 0,
      isRequired: s.isRequired ?? false
    }));

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
      thumbnail: '',
      attachments: (data.attachments || []) as any,
      sectionId: data.sectionId,
      sectionTitle: data.sectionTitle || '',
      courseId: data.courseId,
      courseTitle: data.courseTitle || '',
      durationMinutes: data.durationMinutes,
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

      // Save to localStorage
      this.saveProgressToStorage();

      return newState;
    });

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
        // Extract completedLessonIds from either direct response or data wrapper
        const completedLessonIds =
          res?.data?.completedLessonIds ??
          res?.completedLessonIds ??
          [];

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

    return data
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
      .map(section => ({
        id: section.id,
        title: section.title,
        description: section.description || '',
        orderIndex: section.orderIndex || 0,
        lessons: (section.lessons || [])
          .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
          .map((lesson: ApiLessonSummary, idx) => {
            // Cache sections from /content for later use in loadLesson()
            if (lesson.sections && lesson.sections.length > 0) {
              this.lessonSectionsCache.set(lesson.id, lesson.sections.map(s => ({
                id: s.id,
                title: s.title,
                type: (s.type?.toUpperCase() || 'TEXT') as 'VIDEO' | 'TEXT' | 'QUIZ' | 'FILE' | 'ASSIGNMENT',
                content: s.content,
                videoUrl: s.videoUrl,
                fileUrl: s.fileUrl,
                duration: s.duration,
                orderIndex: s.orderIndex ?? 0,
                isRequired: s.isRequired ?? false
              })));
            }
            return {
              id: lesson.id,
              title: lesson.title,
              description: lesson.description || '',
              lessonType: (lesson as any).lessonType || getLessonTypeFromTitle(lesson.title),
              duration: 0, // Will be loaded when lesson is selected
              orderIndex: lesson.orderIndex || idx,
              sections: (lesson.sections || []).map(s => ({
                id: s.id,
                title: s.title,
                type: (s.type?.toUpperCase() || 'TEXT') as 'VIDEO' | 'TEXT' | 'QUIZ' | 'FILE' | 'ASSIGNMENT',
                content: s.content,
                videoUrl: s.videoUrl,
                fileUrl: s.fileUrl,
                duration: s.duration,
                orderIndex: s.orderIndex ?? 0,
                isRequired: s.isRequired ?? false
              }))
            };
          })
      }));
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

  private getStorageKey(courseId: string): string {
    return `learning_progress_${courseId}`;
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
