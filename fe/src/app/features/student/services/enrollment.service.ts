import { Injectable, inject, signal, computed } from '@angular/core';
import { CourseApi } from '../../../api/client/course.api';
import { StudentApi } from '../../../api/client/student.api';
import { CourseSummary } from '../../../api/types/course.types';
import { EnrolledCourse } from '../types';
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
    this._enrolledCourses().filter(course => course.status === 'in-progress')
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

  // === PUBLIC METHODS ===

  /**
   * Load danh sách courses đã enroll của student
   */
  async loadEnrolledCourses(page: number = 1, limit: number = 10): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    // Ensure page is always >= 1
    const safePage = Math.max(page, 1);

    try {
      console.log('🔄 StudentEnrollmentService: Loading enrolled courses...', { page: safePage, limit });

      // DEVELOPMENT MODE: Use mock data for testing UI
      if (this.isDevelopmentMode()) {
        const { MOCK_ENROLLED_COURSES } = await import('../../../shared/test-data/mock-courses');
        this._enrolledCourses.set(MOCK_ENROLLED_COURSES);
        this._currentPage.set(safePage);
        this._totalPages.set(1);
        this._totalCount.set(MOCK_ENROLLED_COURSES.length);
        
        console.log('🧪 StudentEnrollmentService: Mock enrolled courses loaded for testing', {
          count: MOCK_ENROLLED_COURSES.length
        });
        return;
      }

      // PRODUCTION MODE: Use real API
        const response = await firstValueFrom(this.courseApi.enrolledCourses({ page: safePage, limit }));

      if (response?.data) {
        const enrolledCourses: EnrolledCourse[] = response.data.map(course => this.mapToEnrolledCourse(course));
        this._enrolledCourses.set(enrolledCourses);
        
        // Update pagination info
        if (response.pagination) {
          this._currentPage.set(response.pagination.page || page);
          this._totalPages.set(response.pagination.totalPages || 1);
          this._totalCount.set(response.pagination.totalItems || 0);
        }

        console.log('✅ StudentEnrollmentService: Enrolled courses loaded successfully', {
          count: enrolledCourses.length,
          pagination: response.pagination
        });
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Không thể tải danh sách khóa học đã đăng ký';
      this._error.set(errorMessage);
      this.errorService.handleApiError(error, 'enrollment');
      
      console.error('❌ StudentEnrollmentService: Error loading enrolled courses:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load danh sách courses available để enroll
   */
  async loadAvailableCourses(page: number = 1, limit: number = 10, filters?: {
    search?: string;
    teacher?: string;
  }): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      console.log('🔄 StudentEnrollmentService: Loading available courses...', { page, limit, filters });

      // DEVELOPMENT MODE: Use mock data for testing UI
      if (this.isDevelopmentMode()) {
        const { MOCK_COURSES_FOR_TESTING } = await import('../../../shared/test-data/mock-courses');
        let filteredCourses = MOCK_COURSES_FOR_TESTING;
        
        // Apply search filter if provided
        if (filters?.search) {
          filteredCourses = filteredCourses.filter(course => 
            course.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
            course.description.toLowerCase().includes(filters.search!.toLowerCase())
          );
        }
        
        this._availableCourses.set(filteredCourses);
        this._currentPage.set(page);
        this._totalPages.set(1);
        this._totalCount.set(filteredCourses.length);
        
        console.log('🧪 StudentEnrollmentService: Mock courses loaded for testing', {
          count: filteredCourses.length
        });
        return;
      }

      // PRODUCTION MODE: Use real API
      const response = await firstValueFrom(this.courseApi.publicCourses({ 
        page, 
        limit, 
        ...filters 
      }));

      if (response?.data) {
        this._availableCourses.set(response.data);
        
        console.log('✅ StudentEnrollmentService: Available courses loaded successfully', {
          count: response.data.length
        });
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Không thể tải danh sách khóa học';
      this._error.set(errorMessage);
      this.errorService.handleApiError(error, 'enrollment');
      
      console.error('❌ StudentEnrollmentService: Error loading available courses:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Enroll vào một course
   */
  async enrollInCourse(courseId: string): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      console.log('🔄 StudentEnrollmentService: Enrolling in course...', courseId);

      await firstValueFrom(this.courseApi.enrollCourse(courseId));
      
      // Reload enrolled courses after successful enrollment
      await this.loadEnrolledCourses();

      this.errorService.showSuccess('Đăng ký khóa học thành công!', 'enrollment');
      
      console.log('✅ StudentEnrollmentService: Successfully enrolled in course:', courseId);
      return true;
    } catch (error: any) {
      const errorMessage = error?.message || 'Không thể đăng ký khóa học';
      this._error.set(errorMessage);
      this.errorService.handleApiError(error, 'enrollment');
      
      console.error('❌ StudentEnrollmentService: Error enrolling in course:', error);
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
  private mapToEnrolledCourse(course: CourseSummary): EnrolledCourse {
    // Extract progress from course metadata or set default
    const progress = this.extractProgressFromCourse(course);
    const status = this.determineEnrollmentStatus(course, progress);
    
    return {
      id: course.id,
      title: course.title,
      description: course.description || 'Mô tả khóa học',
      instructor: course.teacherName || 'Giảng viên',
      progress: progress,
      totalLessons: 10, // Default value - can be fetched from course details if needed
      completedLessons: Math.floor((progress / 100) * 10),
      duration: '40 giờ', // Default duration
      deadline: undefined, // No deadline info in CourseSummary
      status: status,
      thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop',
      category: 'general',
      rating: 4.5,
      lastAccessed: new Date(),
      enrolledAt: course.createdAt ? new Date(course.createdAt) : new Date(),
      studyTime: this.calculateStudyTime(course)
    };
  }

  /**
   * Extract progress từ course metadata  
   */
  private extractProgressFromCourse(course: CourseSummary): number {
    // CourseSummary doesn't have progress info - will be fetched separately
    // For now, return 0 for new courses, random for demo
    return Math.floor(Math.random() * 100);
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
    // Default estimated study time (40 hours = 2400 minutes)
    return 2400;
  }

  /**
   * Check if running in development mode for mock data
   */
  private isDevelopmentMode(): boolean {
    return typeof window !== 'undefined' && 
           (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('dev'));
  }
}