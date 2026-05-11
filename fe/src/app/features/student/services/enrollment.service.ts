import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CourseApi } from '../../../api/client/course.api';
import { StudentApi } from '../../../api/client/student.api';
import { CourseSummary } from '../../../api/types/course.types';
import { CourseDownloadService, type DownloadableCourse } from '../../../core/services/course-download.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { EnrolledCourse } from '../../../shared/types/course.types';
import { ErrorHandlingService } from '../../../shared/services/error-handling.service';

@Injectable({
  providedIn: 'root'
})
export class StudentEnrollmentService {
  private courseApi = inject(CourseApi);
  private studentApi = inject(StudentApi);
  private courseDownload = inject(CourseDownloadService);
  private networkStatus = inject(NetworkStatusService);
  private errorService = inject(ErrorHandlingService);

  private _enrolledCourses = signal<EnrolledCourse[]>([]);
  private _availableCourses = signal<CourseSummary[]>([]);
  private _enrolledIdCache = signal<Set<string>>(new Set());
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _currentPage = signal<number>(1);
  private _totalPages = signal<number>(1);
  private _totalCount = signal<number>(0);

  readonly enrolledCourses = this._enrolledCourses.asReadonly();
  readonly availableCourses = this._availableCourses.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();
  readonly totalPages = this._totalPages.asReadonly();
  readonly totalCount = this._totalCount.asReadonly();

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

  readonly enrolledCourseIds = this._enrolledIdCache.asReadonly();

  async loadEnrolledCourses(page: number = 0, size: number = 50): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    const safePage = Math.max(page, 0);

    try {
      const response = await firstValueFrom(this.courseApi.enrolledCourses({ page: safePage, size }));
      const apiCourses = response?.data ?? [];

      if (apiCourses.length === 0 && !this.networkStatus.online()) {
        const loadedFromOffline = await this.tryLoadOfflineDownloadedCourses();
        if (loadedFromOffline) {
          return;
        }
      }

      const enrolledCourses: EnrolledCourse[] = apiCourses.map(course =>
        this.mapToEnrolledCourse(course)
      );
      this._enrolledCourses.set(enrolledCourses);
      this._enrolledIdCache.update(prev => {
        const next = new Set(prev);
        for (const c of enrolledCourses) next.add(c.id);
        return next;
      });

      if (response?.pagination) {
        this._currentPage.set(response.pagination.page || page);
        this._totalPages.set(response.pagination.totalPages || 1);
        this._totalCount.set(response.pagination.totalItems || 0);
      } else {
        this._currentPage.set(safePage);
        this._totalPages.set(1);
        this._totalCount.set(enrolledCourses.length);
      }
    } catch (error: any) {
      const loadedFromOffline = await this.tryLoadOfflineDownloadedCourses();
      if (!loadedFromOffline) {
        const errorMessage = error?.message || 'Không thể tải danh sách khóa học đã đăng ký';
        this._error.set(errorMessage);
        this.errorService.handleApiError(error, 'enrollment');
      }
    } finally {
      this._isLoading.set(false);
    }
  }

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

  async enrollInCourse(courseId: string): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(this.courseApi.enrollCourse(courseId));
      this._enrolledIdCache.update(prev => new Set(prev).add(courseId));
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

  async refreshCourseProgress(courseId: string): Promise<void> {
    const courseIndex = this._enrolledCourses().findIndex(c => c.id === courseId);
    if (courseIndex === -1) return;

    try {
      const response = await firstValueFrom(this.courseApi.getCourseProgress(courseId));
      const data = response?.data ?? response;

      this._enrolledCourses.update(courses => {
        const nextCourses = [...courses];
        const existing = nextCourses[courseIndex];

        const progress = Math.round(data?.progressPercentage ?? existing.progress);
        const completedLessons = data?.completedLessons ?? existing.completedLessons;
        const totalLessons = data?.totalLessons ?? existing.totalLessons;

        nextCourses[courseIndex] = {
          ...existing,
          progress,
          completedLessons,
          totalLessons,
          status: this.determineEnrollmentStatus(existing as any, progress)
        };

        return nextCourses;
      });
    } catch {
      // Keep existing progress silently when refresh is unavailable.
    }
  }

  isEnrolledInCourse(courseId: string): boolean {
    return this._enrolledIdCache().has(courseId);
  }

  getEnrolledCourse(courseId: string): EnrolledCourse | undefined {
    return this._enrolledCourses().find(course => course.id === courseId);
  }

  clearState(): void {
    this._enrolledCourses.set([]);
    this._availableCourses.set([]);
    this._enrolledIdCache.set(new Set());
    this._error.set(null);
    this._currentPage.set(1);
    this._totalPages.set(1);
    this._totalCount.set(0);
  }

  private mapToEnrolledCourse(course: CourseSummary): EnrolledCourse {
    const courseAny = course as any;
    const actualProgress = courseAny.progress ?? 0;
    const status = this.determineEnrollmentStatus(course, actualProgress);
    const totalLessons = courseAny.totalLessons ?? 0;
    const completedLessons = courseAny.completedLessons ?? (
      totalLessons > 0 ? Math.round((actualProgress / 100) * totalLessons) : 0
    );

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
      thumbnail: courseAny.thumbnailUrl || courseAny.thumbnail || '',
      category: courseAny.categoryName || undefined,
      deliveryMode: course.deliveryMode || 'SELF_PACED',
      allowOfflineDownload: courseAny.allowOfflineDownload !== false,
      priceType: courseAny.priceType || 'FREE',
      isPaid: courseAny.isPaid !== undefined ? !!courseAny.isPaid : (courseAny.priceType !== 'FREE'),
      rating: undefined,
      lastAccessed: courseAny.lastAccessedAt || courseAny.enrolledAt || new Date().toISOString(),
      enrolledAt: course.createdAt ? new Date(course.createdAt) : new Date(),
      studyTime: this.calculateStudyTime(course)
    };
  }

  private async tryLoadOfflineDownloadedCourses(): Promise<boolean> {
    try {
      const downloads = await this.courseDownload.listDownloadedCourses();
      if (downloads.length === 0) {
        return false;
      }

      const enrolledCourses = downloads.map(download => this.mapOfflineDownloadToEnrolledCourse(download));
      this._enrolledCourses.set(enrolledCourses);
      this._enrolledIdCache.update(prev => {
        const next = new Set(prev);
        for (const c of enrolledCourses) next.add(c.id);
        return next;
      });
      this._currentPage.set(0);
      this._totalPages.set(1);
      this._totalCount.set(enrolledCourses.length);
      this._error.set(null);
      return true;
    } catch {
      return false;
    }
  }

  private mapOfflineDownloadToEnrolledCourse(download: DownloadableCourse): EnrolledCourse {
    const totalLessons = download.totalLessons ?? 0;
    const progress = Math.max(0, Math.min(100, download.completionPercent ?? 0));
    const completedLessons = totalLessons > 0
      ? Math.min(totalLessons, Math.round((progress / 100) * totalLessons))
      : 0;

    let status: EnrolledCourse['status'] = 'enrolled';
    if (progress >= 100) {
      status = 'completed';
    } else if (progress > 0) {
      status = 'in-progress';
    }

    return {
      id: download.id,
      title: download.title,
      description: download.description || '',
      instructor: download.teacherName || 'LMS Maritime',
      thumbnail: download.thumbnailUrl || '',
      progress,
      totalLessons,
      completedLessons,
      duration: totalLessons > 0 ? `${Math.ceil(totalLessons * 0.5)} giờ` : '',
      deadline: undefined,
      status,
      category: undefined,
      deliveryMode: download.deliveryMode || 'SELF_PACED',
      allowOfflineDownload: true,
      priceType: 'FREE',
      isPaid: false,
      rating: undefined,
      lastAccessed: download.downloadedAt || new Date().toISOString(),
      studyTime: totalLessons > 0 ? totalLessons * 30 : 0
    };
  }

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

  private calculateStudyTime(course: CourseSummary): number {
    const totalLessons = (course as any).totalLessons ?? 0;
    return totalLessons > 0 ? totalLessons * 30 : 0;
  }
}
