import { Injectable, signal, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ExtendedCourse,
  CourseReview,
  FAQ,
  CourseModule,
  RelatedCourse,
  CourseEnrollment,
  CourseDetailState,
  CourseCategory,
  Lesson
} from '../../../../shared/types/course.types';
import { CourseRepositoryImpl } from '../../infrastructure/repositories/course.repository.impl';
import { Course } from '../../domain/entities/course.entity';
import { CourseReviewApi } from '../../../../api/endpoints/course-review.api';
import { CourseApi } from '../../../../api/client/course.api';

/**
 * Repository Pattern cho Course Data Access
 * Uses real API via CourseRepositoryImpl
 */
@Injectable({ providedIn: 'root' })
export class CourseRepository {
  private courseRepoImpl = inject(CourseRepositoryImpl);

  async getCourseById(id: string): Promise<ExtendedCourse | null> {
    try {
      const course = await firstValueFrom(this.courseRepoImpl.findById(id as any));
      if (!course) return null;
      return this.mapDomainToExtended(course);
    } catch (error) {
      return null;
    }
  }

  async getRelatedCourses(courseId: string, category: string, limit: number = 4): Promise<RelatedCourse[]> {
    try {
      const result = await firstValueFrom(
        this.courseRepoImpl.findByCategory(category, undefined, undefined, { page: 1, limit: limit + 1 })
      );
      return result.items
        .filter(course => course.id !== courseId)
        .slice(0, limit)
        .map(course => this.mapDomainToRelated(course));
    } catch (error) {
      return [];
    }
  }

  private mapDomainToExtended(course: Course): ExtendedCourse {
    return {
      id: course.id as string,
      isEnrolled: course.metadata?.isEnrolled ?? false,
      title: course.title,
      description: course.description,
      shortDescription: course.shortDescription,
      thumbnail: course.thumbnail || '/assets/images/courses/placeholder.png',
      instructor: {
        id: course.instructorId as string,
        name: course.instructorId as string, // Will be populated from API
        avatar: '/assets/images/avatar-placeholder.png',
        title: 'Giảng viên',
        credentials: [],
        experience: 0,
        rating: 4.5,
        studentsCount: 0
      },
      category: course.category as CourseCategory,
      level: course.specifications?.level || 'beginner',
      duration: `${course.specifications?.durationHours || 0}h`,
      students: course.metadata?.studentsCount || 0,
      reviews: course.metadata?.reviewsCount || 0,
      price: course.specifications?.price || 0,
      rating: course.metadata?.rating || 4.5,
      tags: course.tags || [],
      skills: [],
      prerequisites: course.specifications?.prerequisites || [],
      certificate: {
        type: course.specifications?.certificateType || 'completion',
        description: 'Chứng chỉ hoàn thành khóa học'
      },
      curriculum: {
        modules: course.specifications?.modulesCount || 0,
        lessons: course.specifications?.lessonsCount || 0,
        duration: `${course.specifications?.durationHours || 0} giờ`
      },
      studentsCount: course.metadata?.studentsCount || 0,
      lessonsCount: course.specifications?.lessonsCount || 0,
      isPublished: course.status === 'published'
    };
  }

  private mapDomainToRelated(course: Course): RelatedCourse {
    return {
      id: course.id as string,
      title: course.title,
      thumbnail: course.thumbnail || '/assets/images/courses/placeholder.png',
      level: course.specifications?.level || 'beginner',
      duration: `${course.specifications?.durationHours || 0}h`,
      rating: course.metadata?.rating || 4.5,
      studentsCount: course.metadata?.studentsCount || 0,
      price: course.specifications?.price || 0,
      category: course.category,
      similarity: 0.8
    };
  }
}



@Injectable({ providedIn: 'root' })
export class ReviewRepository {
  private reviewApi = inject(CourseReviewApi);

  async getReviewsByCourseId(courseId: string): Promise<CourseReview[]> {
    try {
      const response = await firstValueFrom(this.reviewApi.getReviews(courseId));
      const data = response?.data || response || [];
      const reviews = Array.isArray(data) ? data : [];
      return reviews.map((r: any) => ({
        id: r.id,
        courseId: r.courseId || courseId,
        userId: r.studentId || r.userId || '',
        userName: r.studentName || r.userName || 'Học viên',
        userAvatar: '/assets/images/avatar-placeholder.png',
        userRole: 'Học viên',
        rating: r.rating || 0,
        comment: r.comment || '',
        createdAt: new Date(r.createdAt || Date.now()),
        helpful: 0,
        isVerified: true
      }));
    } catch {
      return [];
    }
  }
}

@Injectable({ providedIn: 'root' })
export class FAQRepository {
  // No backend FAQ API yet - returns default FAQ data
  getFAQByCourseId(courseId: string): FAQ[] {
    return [
      { id: '1', courseId, question: 'Tôi có thể học khóa học này mà không cần kinh nghiệm trước không?', answer: 'Có, khóa học này được thiết kế cho người mới bắt đầu. Chúng tôi sẽ cung cấp kiến thức từ cơ bản nhất.', order: 1, category: 'general' },
      { id: '2', courseId, question: 'Sau khi hoàn thành khóa học, tôi sẽ nhận được chứng chỉ gì?', answer: 'Bạn sẽ nhận được chứng chỉ hoàn thành khóa học được công nhận bởi Trường Đại học Hàng hải Việt Nam.', order: 2, category: 'certificate' },
      { id: '3', courseId, question: 'Tôi có thể truy cập khóa học trong bao lâu sau khi đăng ký?', answer: 'Bạn có thể truy cập khóa học trong vòng 12 tháng kể từ ngày đăng ký.', order: 3, category: 'enrollment' },
      { id: '4', courseId, question: 'Có hỗ trợ kỹ thuật không nếu tôi gặp vấn đề?', answer: 'Có, chúng tôi có đội ngũ hỗ trợ kỹ thuật 24/7 qua email và chat.', order: 4, category: 'technical' }
    ];
  }
}

@Injectable({ providedIn: 'root' })
export class ModuleRepository {
  private courseApi = inject(CourseApi);

  async getModulesByCourseId(courseId: string): Promise<CourseModule[]> {
    try {
      const response = await firstValueFrom(this.courseApi.getCourseContent(courseId));
      const chapters = response?.data || [];
      if (!Array.isArray(chapters)) return [];
      return chapters.map((ch: any, idx: number) => ({
        id: ch.id,
        courseId,
        title: ch.title || `Chương ${idx + 1}`,
        description: ch.description || '',
        order: ch.orderIndex ?? idx + 1,
        lessons: (ch.lessons || []).map((l: any) => ({
          id: l.id,
          courseId,
          title: l.title || '',
          duration: l.durationMinutes || 0,
          type: 'video' as const,
          isCompleted: false
        } as Lesson)),
        duration: (ch.lessons || []).reduce((sum: number, l: any) => sum + (l.durationMinutes || 0), 0),
        isCompleted: false
      }));
    } catch {
      return [];
    }
  }
}

/**
 * Main Course Detail Service với Signal-based State Management
 */
@Injectable({ providedIn: 'root' })
export class CourseDetailService {
  // Repository injections
  private courseRepository = inject(CourseRepository);
  private reviewRepository = inject(ReviewRepository);
  private faqRepository = inject(FAQRepository);
  private moduleRepository = inject(ModuleRepository);
  private courseApi = inject(CourseApi);

  // Private signals
  private _course = signal<ExtendedCourse | null>(null);
  private _relatedCourses = signal<RelatedCourse[]>([]);
  private _reviews = signal<CourseReview[]>([]);
  private _faq = signal<FAQ[]>([]);
  private _modules = signal<CourseModule[]>([]);
  private _enrollment = signal<CourseEnrollment | null>(null);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Readonly signals
  readonly course = this._course.asReadonly();
  readonly relatedCourses = this._relatedCourses.asReadonly();
  readonly reviews = this._reviews.asReadonly();
  readonly faq = this._faq.asReadonly();
  readonly modules = this._modules.asReadonly();
  readonly enrollment = this._enrollment.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals
  readonly courseStats = computed(() => {
    const course = this._course();
    if (!course) return null;

    return {
      totalDuration: this.calculateTotalDuration(course.duration),
      averageRating: course.rating,
      totalStudents: course.studentsCount,
      totalReviews: course.reviews,
      completionRate: 85, // Mock data
      satisfactionRate: 92 // Mock data
    };
  });

  readonly enrollmentStatus = computed(() => {
    const enrollment = this._enrollment();
    const course = this._course();

    if (!course) return 'not-enrolled';
    if (!enrollment) return 'not-enrolled';
    if (!enrollment.isActive) return 'expired';

    return 'enrolled';
  });

  readonly canEnroll = computed(() => {
    return this.enrollmentStatus() === 'not-enrolled';
  });

  /**
   * Load complete course detail data
   */
  async loadCourseDetail(courseId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // Load course data
      const course = await this.courseRepository.getCourseById(courseId);
      this._course.set(course);

      if (!course) {
        this._error.set('Không tìm thấy khóa học');
        return;
      }

      // Load related data in parallel
      await Promise.all([
        this.loadRelatedCourses(courseId, course.category),
        this.loadReviews(courseId),
        this.loadFAQ(courseId),
        this.loadModules(courseId)
      ]);

    } catch (error) {
      this._error.set('Không thể tải thông tin khóa học');
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load related courses
   */
  async loadRelatedCourses(courseId: string, category: string): Promise<void> {
    try {
      const relatedCourses = await this.courseRepository.getRelatedCourses(courseId, category, 4);
      this._relatedCourses.set(relatedCourses);
    } catch (error) {
      // Non-critical — related courses section remains empty
    }
  }

  /**
   * Load course reviews
   */
  async loadReviews(courseId: string): Promise<void> {
    try {
      const reviews = await this.reviewRepository.getReviewsByCourseId(courseId);
      this._reviews.set(reviews);
    } catch (error) {
      // Non-critical — reviews section remains empty
    }
  }

  /**
   * Load FAQ
   */
  async loadFAQ(courseId: string): Promise<void> {
    try {
      const faq = this.faqRepository.getFAQByCourseId(courseId);
      this._faq.set(faq);
    } catch (error) {
      // Non-critical — FAQ section remains empty
    }
  }

  /**
   * Load course modules
   */
  async loadModules(courseId: string): Promise<void> {
    try {
      const modules = await this.moduleRepository.getModulesByCourseId(courseId);
      this._modules.set(modules);
    } catch (error) {
      // Non-critical — modules section remains empty
    }
  }

  /**
   * Enroll in course
   */
  async enrollInCourse(courseId: string, userId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(this.courseApi.enrollCourse(courseId));

      const enrollment: CourseEnrollment = {
        id: `enrollment-${courseId}-${userId}`,
        courseId,
        userId,
        enrolledAt: new Date(),
        progress: {
          id: `progress-${courseId}-${userId}`,
          courseId,
          userId,
          completedLessons: [],
          totalLessons: 0,
          progressPercentage: 0,
          lastAccessed: new Date()
        },
        isActive: true
      };

      this._enrollment.set(enrollment);
    } catch (error) {
      this._error.set('Không thể đăng ký khóa học');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this._course.set(null);
    this._relatedCourses.set([]);
    this._reviews.set([]);
    this._faq.set([]);
    this._modules.set([]);
    this._enrollment.set(null);
    this._error.set(null);
  }

  /**
   * Get current state
   */
  getState(): CourseDetailState {
    return {
      course: this._course(),
      relatedCourses: this._relatedCourses(),
      reviews: this._reviews(),
      faq: this._faq(),
      modules: this._modules(),
      enrollment: this._enrollment(),
      isLoading: this._isLoading(),
      error: this._error()
    };
  }

  // Helper methods
  private calculateTotalDuration(duration: string): number {
    const match = duration.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
}
