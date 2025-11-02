import { Injectable, signal, computed, inject } from '@angular/core';
import { 
  ExtendedCourse, 
  CourseReview, 
  FAQ, 
  CourseModule, 
  RelatedCourse, 
  CourseEnrollment,
  CourseDetailState,
  CourseCategory 
} from '../../../../shared/types/course.types';

/**
 * Repository Pattern cho Course Data Access
 */
@Injectable({ providedIn: 'root' })
export class CourseRepository {
  async getCourseById(id: string): Promise<ExtendedCourse | null> {
    // Mock implementation - sẽ được thay thế bằng real API
    await this.simulateApiCall();
    return this.getMockCourseById(id);
  }

  async getRelatedCourses(courseId: string, category: string, limit: number = 4): Promise<RelatedCourse[]> {
    await this.simulateApiCall();
    return this.getMockRelatedCourses(courseId, category, limit);
  }

  private getMockCourseById(id: string): ExtendedCourse | null {
    const mockCourses = this.getMockCourses();
    return mockCourses.find(course => course.id === id) || null;
  }

  private getMockRelatedCourses(courseId: string, category: string, limit: number): RelatedCourse[] {
    const mockCourses = this.getMockCourses();
    return mockCourses
      .filter(course => course.id !== courseId && course.category === category)
      .slice(0, limit)
      .map(course => ({
        id: course.id,
        title: course.title,
        thumbnail: course.thumbnail,
        level: course.level,
        duration: course.duration,
        rating: course.rating,
        studentsCount: course.studentsCount,
        price: course.price,
        category: course.category,
        similarity: Math.random() * 0.3 + 0.7 // 0.7-1.0 similarity
      }));
  }

  private getMockCourses(): ExtendedCourse[] {
    return [
      {
        id: '1',
        title: 'Kỹ thuật Tàu biển Cơ bản',
        description: 'Khóa học cung cấp kiến thức cơ bản về kỹ thuật tàu biển, cấu trúc tàu và hệ thống động lực. Học viên sẽ được trang bị kiến thức từ cơ bản đến nâng cao về các hệ thống trên tàu.',
        shortDescription: 'Khóa học cơ bản về kỹ thuật tàu biển',
        thumbnail: 'https://via.placeholder.com/800x400/0288D1/FFFFFF?text=Kỹ+thuật+Tàu+biển',
        instructor: {
          id: '1',
          name: 'ThS. Nguyễn Văn Hải',
          avatar: 'https://via.placeholder.com/150',
          title: 'Giảng viên Khoa Hàng hải',
          credentials: ['Thạc sĩ Kỹ thuật Hàng hải', '15 năm kinh nghiệm'],
          experience: 15,
          rating: 4.8,
          studentsCount: 1200
        },
        category: CourseCategory.MARINE_ENGINEERING,
        level: 'beginner',
        duration: '30h',
        students: 856,
        reviews: 120,
        price: 0,
        rating: 4.7,
        tags: ['Kỹ thuật', 'Tàu biển', 'Cơ bản'],
        skills: ['Kỹ thuật tàu', 'Hệ thống động lực'],
        prerequisites: ['Toán học cơ bản'],
        certificate: {
          type: 'Professional',
          description: 'Chứng chỉ Kỹ thuật Tàu biển'
        },
        curriculum: {
          modules: 6,
          lessons: 12,
          duration: '30 giờ'
        },
        studentsCount: 856,
        lessonsCount: 12,
        isPublished: true
      },
      {
        id: '2',
        title: 'Hàng hải và Định vị',
        description: 'Khóa học về kỹ thuật hàng hải, định vị GPS, và quy tắc an toàn trên biển. Bao gồm các kỹ thuật điều hướng hiện đại và truyền thống.',
        shortDescription: 'Kỹ thuật hàng hải và định vị',
        thumbnail: 'https://via.placeholder.com/800x400/2E7D32/FFFFFF?text=Hàng+hải',
        instructor: {
          id: '2',
          name: 'TS. Lê Minh Đức',
          avatar: 'https://via.placeholder.com/150',
          title: 'Giảng viên Khoa Hàng hải',
          credentials: ['Tiến sĩ Hàng hải', '20 năm kinh nghiệm'],
          experience: 20,
          rating: 4.9,
          studentsCount: 1500
        },
        category: CourseCategory.NAVIGATION,
        level: 'intermediate',
        duration: '40h',
        students: 1200,
        reviews: 180,
        price: 2500000,
        rating: 4.8,
        tags: ['Hàng hải', 'Định vị', 'GPS'],
        skills: ['Định vị GPS', 'Quy tắc hàng hải'],
        prerequisites: ['Toán học', 'Vật lý cơ bản'],
        certificate: {
          type: 'Professional',
          description: 'Chứng chỉ Hàng hải'
        },
        curriculum: {
          modules: 8,
          lessons: 16,
          duration: '40 giờ'
        },
        studentsCount: 1200,
        lessonsCount: 16,
        isPublished: true
      }
    ];
  }

  private simulateApiCall(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
  }
}

@Injectable({ providedIn: 'root' })
export class ReviewRepository {
  async getReviewsByCourseId(courseId: string): Promise<CourseReview[]> {
    await this.simulateApiCall();
    return this.getMockReviews(courseId);
  }

  private getMockReviews(courseId: string): CourseReview[] {
    return [
      {
        id: '1',
        courseId,
        userId: '1',
        userName: 'Nguyễn Văn Hải',
        userAvatar: 'https://via.placeholder.com/40',
        userRole: 'Thuyền trưởng',
        rating: 5,
        comment: 'Khóa học rất hay và thực tế. Giảng viên có kinh nghiệm và giải thích rõ ràng. Tôi đã áp dụng được nhiều kiến thức vào công việc.',
        createdAt: new Date('2024-01-10'),
        helpful: 12,
        isVerified: true
      },
      {
        id: '2',
        courseId,
        userId: '2',
        userName: 'Trần Thị Lan',
        userAvatar: 'https://via.placeholder.com/40',
        userRole: 'Kỹ sư cảng',
        rating: 4,
        comment: 'Nội dung khóa học phong phú, dễ hiểu. Tuy nhiên cần thêm một số ví dụ thực tế hơn.',
        createdAt: new Date('2024-01-08'),
        helpful: 8,
        isVerified: true
      },
      {
        id: '3',
        courseId,
        userId: '3',
        userName: 'Lê Minh Tuấn',
        userAvatar: 'https://via.placeholder.com/40',
        userRole: 'Sinh viên năm 3',
        rating: 5,
        comment: 'Giao diện dễ sử dụng, bài giảng sinh động. Đây là nền tảng học tập tuyệt vời cho sinh viên hàng hải.',
        createdAt: new Date('2024-01-05'),
        helpful: 15,
        isVerified: true
      }
    ];
  }

  private simulateApiCall(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 200);
    });
  }
}

@Injectable({ providedIn: 'root' })
export class FAQRepository {
  async getFAQByCourseId(courseId: string): Promise<FAQ[]> {
    await this.simulateApiCall();
    return this.getMockFAQ(courseId);
  }

  private getMockFAQ(courseId: string): FAQ[] {
    return [
      {
        id: '1',
        courseId,
        question: 'Tôi có thể học khóa học này mà không cần kinh nghiệm trước không?',
        answer: 'Có, khóa học này được thiết kế cho người mới bắt đầu. Chúng tôi sẽ cung cấp kiến thức từ cơ bản nhất.',
        order: 1,
        category: 'general'
      },
      {
        id: '2',
        courseId,
        question: 'Sau khi hoàn thành khóa học, tôi sẽ nhận được chứng chỉ gì?',
        answer: 'Bạn sẽ nhận được chứng chỉ hoàn thành khóa học được công nhận bởi Trường Đại học Hàng hải Việt Nam.',
        order: 2,
        category: 'certificate'
      },
      {
        id: '3',
        courseId,
        question: 'Tôi có thể truy cập khóa học trong bao lâu sau khi đăng ký?',
        answer: 'Bạn có thể truy cập khóa học trong vòng 12 tháng kể từ ngày đăng ký.',
        order: 3,
        category: 'enrollment'
      },
      {
        id: '4',
        courseId,
        question: 'Có hỗ trợ kỹ thuật không nếu tôi gặp vấn đề?',
        answer: 'Có, chúng tôi có đội ngũ hỗ trợ kỹ thuật 24/7 qua email và chat.',
        order: 4,
        category: 'technical'
      }
    ];
  }

  private simulateApiCall(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 150);
    });
  }
}

@Injectable({ providedIn: 'root' })
export class ModuleRepository {
  async getModulesByCourseId(courseId: string): Promise<CourseModule[]> {
    await this.simulateApiCall();
    return this.getMockModules(courseId);
  }

  private getMockModules(courseId: string): CourseModule[] {
    return [
      {
        id: '1',
        courseId,
        title: 'Giới thiệu về Kỹ thuật Tàu biển',
        description: 'Tổng quan về ngành kỹ thuật tàu biển và các khái niệm cơ bản',
        order: 1,
        lessons: [
          { id: '1', courseId, title: 'Lịch sử phát triển tàu biển', duration: 30, type: 'video', isCompleted: false },
          { id: '2', courseId, title: 'Phân loại tàu biển', duration: 25, type: 'video', isCompleted: false },
          { id: '3', courseId, title: 'Cấu trúc cơ bản của tàu', duration: 35, type: 'video', isCompleted: false }
        ],
        duration: 90,
        isCompleted: false
      },
      {
        id: '2',
        courseId,
        title: 'Hệ thống Động lực',
        description: 'Các hệ thống động lực chính trên tàu biển',
        order: 2,
        lessons: [
          { id: '4', courseId, title: 'Động cơ diesel chính', duration: 40, type: 'video', isCompleted: false },
          { id: '5', courseId, title: 'Hệ thống truyền động', duration: 35, type: 'video', isCompleted: false },
          { id: '6', courseId, title: 'Hệ thống làm mát', duration: 30, type: 'video', isCompleted: false }
        ],
        duration: 105,
        isCompleted: false
      }
    ];
  }

  private simulateApiCall(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
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
      console.error('Error loading course detail:', error);
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
      console.error('Error loading related courses:', error);
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
      console.error('Error loading reviews:', error);
    }
  }

  /**
   * Load FAQ
   */
  async loadFAQ(courseId: string): Promise<void> {
    try {
      const faq = await this.faqRepository.getFAQByCourseId(courseId);
      this._faq.set(faq);
    } catch (error) {
      console.error('Error loading FAQ:', error);
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
      console.error('Error loading modules:', error);
    }
  }

  /**
   * Enroll in course
   */
  async enrollInCourse(courseId: string, userId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // Mock enrollment logic
      await this.simulateApiCall();
      
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

  private simulateApiCall(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }
}