import { Injectable, inject, signal, computed } from '@angular/core';
import { CourseApi } from '../../../api/client/course.api';
import { StudentApi } from '../../../api/client/student.api';
import { CourseSummary } from '../../../api/types/course.types';
import { EnrolledCourse } from '../../../shared/types/course.types';
import { firstValueFrom } from 'rxjs';
import { ErrorHandlingService } from '../../../shared/services/error-handling.service';

/**
 * Student Enrollment Service
 * 
 * Quản lý việc đăng ký và theo dõi progress của student trong các khóa học
 * - Clean Architecture: Service layer tách biệt UI
 * - Domain-Driven Design: Focus on enrollment domain
 * - Reactive State Management: Signals cho realtime updates
 */
@Injectable({
  providedIn: 'root'
})
export class StudentEnrollmentService {
  private courseApi = inject(CourseApi);
  private studentApi = inject(StudentApi);
  private errorService = inject(ErrorHandlingService);

  // === REACTIVE STATE ===
  private _enrolledCourses = signal<EnrolledCourse[]>([]);
  private _availableCourses = signal<CourseSummary[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _currentPage = signal<number>(1);
  private _totalPages = signal<number>(1);
  private _totalCount = signal<number>(0);

  // === PUBLIC READONLY SIGNALS ===
  readonly enrolledCourses = this._enrolledCourses.asReadonly();
  readonly availableCourses = this._availableCourses.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();
  readonly totalPages = this._totalPages.asReadonly();
  readonly totalCount = this._totalCount.asReadonly();

  // === COMPUTED SIGNALS ===
  readonly hasNextPage = computed(() => this._currentPage() < this._totalPages());
  readonly hasPrevPage = computed(() => this._currentPage() > 1);

  readonly inProgressCourses = computed(() =>
    this._enrolledCourses().filter(course => course.status === 'in-progress' || course.status === 'enrolled')
  );

  readonly completedCourses = computed(() =>
    this._enrolledCourses().filter(course => course.status === 'completed')
  );

  readonly totalProgress = computed(() => {
    const courses = this._enrolledCourses();
    if (courses.length === 0) return 0;
    return Math.round(courses.reduce((sum, course) => sum + course.progress, 0) / courses.length);
  });

  readonly enrollmentStats = computed(() => ({
    total: this._enrolledCourses().length,
    inProgress: this.inProgressCourses().length,
    completed: this.completedCourses().length,
    averageProgress: this.totalProgress()
  }));

  readonly coursesWithProgress = computed(() =>
    this._enrolledCourses().filter(course => course.progress > 0)
  );

  readonly coursesWithoutProgress = computed(() =>
    this._enrolledCourses().filter(course => course.progress === 0)
  );

  /**
   * Set of enrolled course IDs for reactive UI binding
   * Course cards can use this signal to reactively check enrollment status
   */
  readonly enrolledCourseIds = computed(() =>
    new Set(this._enrolledCourses().map(course => course.id))
  );

  // === PUBLIC METHODS ===

  /**
   * Load danh sách courses đã enroll của student
   */
  async loadEnrolledCourses(page: number = 0, size: number = 10): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    // Ensure page is always >= 0 (Spring Data 0-indexed)
    const safePage = Math.max(page, 0);

    try {
      const response = await firstValueFrom(this.courseApi.enrolledCourses({ page: safePage, size }));

      if (response?.data) {
        // Fetch progress for each course and map to EnrolledCourse
        const enrolledCourses: EnrolledCourse[] = await Promise.all(
          response.data.map(async (course) => {
            const progress = await this.fetchCourseProgress(course.id);
            return this.mapToEnrolledCourse(course, progress);
          })
        );
        this._enrolledCourses.set(enrolledCourses);

        // Update pagination info
        if (response.pagination) {
          this._currentPage.set(response.pagination.page || page);
          this._totalPages.set(response.pagination.totalPages || 1);
          this._totalCount.set(response.pagination.totalItems || 0);
        }

      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Không thể tải danh sách khóa học đã đăng ký';
      this._error.set(errorMessage);
      this.errorService.handleApiError(error, 'enrollment');

    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load danh sách courses available để enroll
   */
  async loadAvailableCourses(page: number = 0, size: number = 10, filters?: {
    search?: string;
    teacher?: string;
  }): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(this.courseApi.publicCourses({
        page,
        size,
        ...filters
      }));

      if (response?.data) {
        this._availableCourses.set(response.data);

      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Không thể tải danh sách khóa học';
      this._error.set(errorMessage);
      this.errorService.handleApiError(error, 'enrollment');

    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Enroll vào một course
   * Nếu course có nhiều lớp, sẽ throw error để UI hiển thị class picker
   */
  async enrollInCourse(courseId: string): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(this.courseApi.enrollCourse(courseId));

      // Reload enrolled courses after successful enrollment
      await this.loadEnrolledCourses();

      this.errorService.showSuccess('Đăng ký khóa học thành công!', 'enrollment');

      return true;
    } catch (error: any) {
      const errorMessage = error?.message || 'Không thể đăng ký khóa học';
      this._error.set(errorMessage);
      this.errorService.handleApiError(error, 'enrollment');

      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Check xem student đã enroll course này chưa
   */
  isEnrolledInCourse(courseId: string): boolean {
    return this._enrolledCourses().some(course => course.id === courseId);
  }

  /**
   * Get thông tin một enrolled course
   */
  getEnrolledCourse(courseId: string): EnrolledCourse | undefined {
    return this._enrolledCourses().find(course => course.id === courseId);
  }

  /**
   * Clear tất cả state
   */
  clearState(): void {
    this._enrolledCourses.set([]);
    this._availableCourses.set([]);
    this._error.set(null);
    this._currentPage.set(1);
    this._totalPages.set(1);
    this._totalCount.set(0);
  }

  // === PRIVATE METHODS ===

  /**
   * Map CourseSummary từ API thành EnrolledCourse cho UI
   */
  private mapToEnrolledCourse(course: CourseSummary, progress?: number): EnrolledCourse {
    // Use provided progress or extract from course data
    const courseAny = course as any;
    const actualProgress = progress !== undefined ? progress : (courseAny.progress ?? 0);
    const status = this.determineEnrollmentStatus(course, actualProgress);
    const totalLessons = courseAny.totalLessons ?? 0;
    const completedLessons = courseAny.completedLessons ?? (totalLessons > 0 ? Math.round((actualProgress / 100) * totalLessons) : 0);

    return {
      id: course.id,
      title: course.title,
      description: course.description || '',
      instructor: course.teacherName || '',
      progress: actualProgress,
      totalLessons,
      completedLessons,
      duration: totalLessons > 0 ? `${Math.ceil(totalLessons * 0.5)} giờ` : '',
      deadline: undefined,
      status,
      thumbnail: courseAny.thumbnailUrl || null,
      category: courseAny.categoryName || undefined,
      deliveryMode: course.deliveryMode || 'SELF_PACED',
      rating: undefined,
      lastAccessed: courseAny.lastAccessedAt || courseAny.enrolledAt || new Date().toISOString(),
      enrolledAt: course.createdAt ? new Date(course.createdAt) : new Date(),
      studyTime: this.calculateStudyTime(course)
    };
  }

  /**
   * Fetch actual progress for enrolled courses from backend
   */
  private async fetchCourseProgress(courseId: string): Promise<number> {
    try {
      const response = await firstValueFrom(this.courseApi.getCourseProgress(courseId));
      if (response?.data?.progressPercentage !== undefined) {
        return Math.round(response.data.progressPercentage);
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Determine enrollment status based on course data
   */
  private determineEnrollmentStatus(course: CourseSummary, progress: number): EnrolledCourse['status'] {
    if (progress >= 100) {
      return 'completed';
    }

    if (course.status === 'archived' || course.status === 'deleted') {
      return 'paused';
    }

    if (progress > 0) {
      return 'in-progress';
    }

    return 'enrolled';
  }

  /**
   * Calculate estimated study time
   */
  private calculateStudyTime(course: CourseSummary): number {
    const totalLessons = (course as any).totalLessons ?? 0;
    return totalLessons > 0 ? totalLessons * 30 : 0; // ~30 min per lesson estimate
  }

}
