/**
 * CourseService - Refactored to use real API
 * Following the "Migrate to Real API" SOP from expert feedback
 */
import { Injectable, signal, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Course, CourseCategory, CourseLevel, Lesson, CourseProgress, FilterOptions, ExtendedCourse } from '../shared/types/course.types';
import { PaginatedResponse } from '../shared/types/common.types';
import { CourseApi, ClassSummary } from '../api/client/course.api';
import { CourseSummary, CourseDetail } from '../api/types/course.types';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private readonly courseApi = inject(CourseApi);

  // State signals
  private _courses = signal<ExtendedCourse[]>([]);
  private _currentCourse = signal<Course | null>(null);
  private _lessons = signal<Lesson[]>([]);
  private _progress = signal<CourseProgress[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Readonly signals
  readonly courses = this._courses.asReadonly();
  readonly currentCourse = this._currentCourse.asReadonly();
  readonly lessons = this._lessons.asReadonly();
  readonly progress = this._progress.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals
  readonly publishedCourses = computed(() =>
    this._courses().filter(course => course.isPublished)
  );

  readonly coursesByCategory = computed(() => {
    const courses = this.publishedCourses();
    return courses.reduce((acc, course) => {
      if (!acc[course.category]) {
        acc[course.category] = [];
      }
      acc[course.category].push(course);
      return acc;
    }, {} as Record<string, ExtendedCourse[]>);
  });

  /**
   * Get courses from real API with optional filters
   */
  async getCourses(filters?: FilterOptions, page: number = 1, limit: number = 12): Promise<PaginatedResponse<ExtendedCourse>> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // Build API params
      const params: Record<string, any> = {
        page: page - 1, // Backend uses 0-based pagination
        limit
      };

      if (filters?.search) {
        params['search'] = filters.search;
      }

      // Call real API
      const response = await firstValueFrom(this.courseApi.publicCourses(params));

      // Map API response to ExtendedCourse format
      let mappedCourses = this.mapCourseSummaryToExtended(response.data || []);

      // Apply client-side filters that backend doesn't support
      if (filters) {
        mappedCourses = this.applyClientFilters(mappedCourses, filters);
      }

      this._courses.set(mappedCourses);

      // Calculate pagination from response or data
      const totalItems = response.pagination?.totalItems || mappedCourses.length;
      const totalPages = response.pagination?.totalPages || Math.ceil(totalItems / limit);

      return {
        data: mappedCourses,
        pagination: {
          page,
          limit,
          total: totalItems,
          totalPages
        }
      };
    } catch (error) {
      this._error.set('Không thể tải danh sách khóa học');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Get course by ID from real API
   */
  async getCourseById(id: string): Promise<ExtendedCourse | null> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(this.courseApi.getCourseById(id));

      if (response.data) {
        const course = this.mapCourseDetailToExtended(response.data);
        this._currentCourse.set(course);
        return course;
      }

      this._currentCourse.set(null);
      return null;
    } catch (error) {
      this._error.set('Không thể tải thông tin khóa học');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Get lessons by course ID from real API
   */
  async getLessonsByCourseId(courseId: string): Promise<Lesson[]> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(this.courseApi.getCourseContent(courseId));

      // Flatten sections to lessons
      const lessons: Lesson[] = [];
      if (response.data) {
        for (const section of response.data) {
          if (section.lessons) {
            for (const lesson of section.lessons) {
              lessons.push({
                id: lesson.id,
                courseId,
                title: lesson.title,
                duration: 0, // Not available in LessonSummary
                type: 'video', // Default type
                isCompleted: false
              });
            }
          }
        }
      }

      this._lessons.set(lessons);
      return lessons;
    } catch (error) {
      this._error.set('Không thể tải danh sách bài học');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Enroll in a course via real API
   */
  async enrollInCourse(courseId: string, userId: string, classId?: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(this.courseApi.enrollCourse(courseId, classId));

      // Update local progress state
      const existingProgress = this._progress().find(p => p.courseId === courseId && p.userId === userId);
      if (!existingProgress) {
        const newProgress: CourseProgress = {
          id: `progress-${courseId}-${userId}`,
          courseId,
          userId,
          completedLessons: [],
          totalLessons: 0,
          progressPercentage: 0,
          lastAccessed: new Date()
        };

        this._progress.update(progress => [...progress, newProgress]);
      }
    } catch (error) {
      this._error.set('Không thể đăng ký khóa học');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async getAvailableClasses(courseId: string): Promise<ClassSummary[]> {
    try {
      const res = await firstValueFrom(this.courseApi.getAvailableClasses(courseId));
      return res.data || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Get course progress
   */
  getCourseProgress(courseId: string, userId: string): CourseProgress | null {
    return this._progress().find(p => p.courseId === courseId && p.userId === userId) || null;
  }

  /**
   * Map CourseSummary from API to ExtendedCourse format
   * FIXED Dec 2025: Now uses actual price from backend
   */
  private mapCourseSummaryToExtended(courses: CourseSummary[]): ExtendedCourse[] {
    return courses.map(course => {
      const isFree = course.priceType === 'FREE' || !course.price || course.price === 0;

      return {
        id: course.id,
        isEnrolled: course.enrolled || course.isEnrolled || false,
        title: course.title,
        description: course.description || '',
        shortDescription: course.description?.substring(0, 100) || '',
        thumbnail: 'https://via.placeholder.com/400x300/0288D1/FFFFFF?text=' + encodeURIComponent(course.title.substring(0, 20)),
        instructor: {
          id: '',
          name: course.teacherName || 'Giảng viên',
          avatar: 'https://via.placeholder.com/150',
          title: 'Giảng viên',
          credentials: [],
          experience: 0,
          rating: 4.5,
          studentsCount: course.enrolledCount || 0
        },
        category: CourseCategory.MARINE_ENGINEERING,
        level: 'beginner' as CourseLevel,
        duration: '30h',
        students: course.enrolledCount || 0,
        reviews: 0,
        // FIXED: Use actual price from backend
        price: course.price || 0,
        salePrice: course.salePrice,
        priceType: course.priceType,
        originalPrice: course.price || 0,
        rating: 4.5,
        tags: [],
        skills: [],
        prerequisites: [],
        certificate: {
          type: 'Professional',
          description: 'Chứng chỉ hoàn thành'
        },
        curriculum: {
          modules: 0,
          lessons: 0,
          duration: '30 giờ'
        },
        studentsCount: course.enrolledCount || 0,
        lessonsCount: 0,
        isPublished: course.status === 'PUBLISHED',
        isFree
      };
    });
  }

  /**
   * Map CourseDetail from API to ExtendedCourse format
   * FIXED Dec 2025: Now uses actual price from backend
   */
  private mapCourseDetailToExtended(course: CourseDetail): ExtendedCourse {
    // Determine if course is free
    const isFree = course.priceType === 'FREE' || !course.price || course.price === 0;

    return {
      id: course.id,
      isEnrolled: false,
      title: course.title,
      description: course.description || '',
      shortDescription: course.description?.substring(0, 100) || '',
      thumbnail: course.introVideoUrl || 'https://via.placeholder.com/400x300/0288D1/FFFFFF?text=' + encodeURIComponent(course.title.substring(0, 20)),
      instructor: {
        id: course.teacherId || '',
        name: course.teacherName || 'Giảng viên',
        avatar: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWVlZWVlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjIwIiBmaWxsPSIjOTk5OTk5Ij5QcmV2aWV3PC90ZXh0Pjwvc3ZnPg==',
        title: 'Giảng viên',
        credentials: [],
        experience: 0,
        rating: 4.5,
        studentsCount: course.enrolledCount || 0
      },
      category: course.categoryName || CourseCategory.MARINE_ENGINEERING,
      categoryName: course.categoryName,
      level: 'beginner' as CourseLevel,
      duration: '30h',
      students: course.enrolledCount || 0,
      reviews: 0,
      // FIXED: Use actual price from backend
      price: course.price || 0,
      salePrice: course.salePrice,
      priceType: course.priceType,
      originalPrice: course.price || 0,
      rating: 4.5,
      tags: course.tags || [],
      skills: [],
      prerequisites: [],
      certificate: {
        type: 'Professional',
        description: 'Chứng chỉ hoàn thành'
      },
      curriculum: {
        modules: course.chaptersCount || 0,
        lessons: 0,
        duration: '30 giờ'
      },
      studentsCount: course.enrolledCount || 0,
      lessonsCount: 0,
      isPublished: course.status === 'PUBLISHED',
      isFree
    };
  }

  /**
   * Apply client-side filters that backend doesn't support
   */
  private applyClientFilters(courses: ExtendedCourse[], filters: FilterOptions): ExtendedCourse[] {
    let filtered = [...courses];

    if (filters.category) {
      filtered = filtered.filter(course => course.category === filters.category);
    }

    if (filters.level) {
      filtered = filtered.filter(course => course.level === filters.level);
    }

    if (filters.priceRange) {
      filtered = filtered.filter(course =>
        course.price >= filters.priceRange!.min && course.price <= filters.priceRange!.max
      );
    }

    if (filters.rating) {
      filtered = filtered.filter(course => course.rating >= filters.rating!);
    }

    if (filters.sortBy) {
      filtered.sort((a, b) => {
        const aValue = a[filters.sortBy as keyof ExtendedCourse];
        const bValue = b[filters.sortBy as keyof ExtendedCourse];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return filters.sortOrder === 'desc'
            ? bValue.localeCompare(aValue)
            : aValue.localeCompare(bValue);
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return filters.sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
        }

        return 0;
      });
    }

    return filtered;
  }
}
