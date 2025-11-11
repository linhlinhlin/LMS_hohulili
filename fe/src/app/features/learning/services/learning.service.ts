import { Injectable, signal, computed, inject } from '@angular/core';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { CourseApi } from '../../../api/client/course.api';
import { LessonApi } from '../../../api/client/lesson.api';
import { CourseContentSection } from '../../../api/types/course.types';
import {
  CourseOverview,
  CourseState,
  LessonState,
  ProgressState,
  Section,
  LessonSummary,
  LessonDetail,
  ErrorType
} from '../models/learning.models';
import { getLessonTypeFromTitle } from '../models/lesson-types.enum';

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

  // Lesson cache for performance
  private lessonCache = new Map<string, LessonDetail>();

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
    return computed(() => this.completedLessons().has(lessonId));
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
    // TODO: Implement actual enrollment API when available
    // For now, return success to test the flow
    return of({ success: true }).pipe(
      tap(() => {
        console.log('Enrolled in course:', courseId);
      })
    );
  }

  /**
   * Load course data including course info and content structure
   */
  loadCourse(courseId: string): void {
    // Set loading state
    this.courseState.update(state => ({
      ...state,
      loading: true,
      error: null
    }));

    // Load course info and content in parallel
    forkJoin({
      courseInfo: this.courseApi.getCourseById(courseId).pipe(
        catchError(err => {
          console.error('Error loading course info:', err);
          return of(null);
        })
      ),
      courseContent: this.courseApi.getCourseContent(courseId).pipe(
        catchError(err => {
          console.error('Error loading course content:', err);
          return of(null);
        })
      )
    }).subscribe({
      next: ({ courseInfo, courseContent }) => {
        if (!courseInfo || !courseContent) {
          this.courseState.update(state => ({
            ...state,
            loading: false,
            error: 'Failed to load course data'
          }));
          return;
        }

        // Map course info
        const courseData = courseInfo?.data;
        const course: CourseOverview = {
          id: courseData?.id || courseId,
          title: courseData?.title || '',
          description: courseData?.description || '',
          instructor: courseData?.teacherName || 'Unknown',
          thumbnail: '',
          sectionsCount: courseData?.sectionsCount || 0,
          lessonsCount: this.countLessons(courseContent.data || []),
          duration: this.calculateTotalDuration(courseContent.data || []),
          isEnrolled: true // If we can fetch content, assume enrolled
        };

        // Map sections
        const sections = this.mapSections(courseContent.data || []);

        // Update state
        this.courseState.set({
          course,
          sections,
          loading: false,
          error: null
        });

        // Load progress from localStorage
        this.loadProgressFromStorage(courseId);
      },
      error: (err) => {
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
   * Load lesson details by ID
   */
  loadLesson(lessonId: string): void {
    // Check cache first
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

    // Set loading state
    this.lessonState.update(state => ({
      ...state,
      loading: true,
      error: null
    }));

    // Fetch from API
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

        const lessonDetail: LessonDetail = {
          id: data.id,
          title: data.title,
          description: data.description || '',
          lessonType: getLessonTypeFromTitle(data.title),
          duration: data.durationMinutes || 0,
          orderIndex: 0, // Will be set from section data
          content: data.content || '',
          videoUrl: data.videoUrl,
          thumbnail: '',
          attachments: (data.attachments || []) as any,
          sectionId: data.sectionId,
          sectionTitle: data.sectionTitle || '',
          courseId: data.courseId,
          courseTitle: data.courseTitle || '',
          durationMinutes: data.durationMinutes
        };

        // Cache the lesson
        this.lessonCache.set(lessonId, lessonDetail);

        // Update state
        this.lessonState.set({
          currentLesson: lessonDetail,
          loading: false,
          error: null
        });

        // Update last accessed
        this.updateLastAccessedLesson(lessonId);
      },
      error: (err) => {
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

  private mapSections(data: CourseContentSection[]): Section[] {
    return data
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
      .map(section => ({
        id: section.id,
        title: section.title,
        description: section.description || '',
        orderIndex: section.orderIndex || 0,
        lessons: (section.lessons || [])
          .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
          .map((lesson, idx) => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description || '',
            lessonType: getLessonTypeFromTitle(lesson.title),
            duration: 0, // Will be loaded when lesson is selected
            orderIndex: lesson.orderIndex || idx
          }))
      }));
  }

  private countLessons(sections: CourseContentSection[]): number {
    return sections.reduce((total, section) => 
      total + (section.lessons?.length || 0), 0
    );
  }

  private calculateTotalDuration(sections: CourseContentSection[]): string {
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
      console.error('Error loading progress from storage:', error);
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
      console.error('Error saving progress to storage:', error);
    }
  }
}
