import { Injectable, signal, computed } from '@angular/core';
import { Course, CourseCategory, CourseLevel, Lesson, CourseProgress, FilterOptions, ExtendedCourse } from '../shared/types/course.types';
import { PaginatedResponse } from '../shared/types/common.types';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
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

  constructor() {
    this.initializeMockData();
  }

  async getCourses(filters?: FilterOptions, page: number = 1, limit: number = 12): Promise<PaginatedResponse<ExtendedCourse>> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await this.simulateApiCall();
      
      let filteredCourses = [...this.publishedCourses()];

      if (filters) {
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          filteredCourses = filteredCourses.filter(course =>
            course.title.toLowerCase().includes(searchTerm) ||
            course.description.toLowerCase().includes(searchTerm) ||
            course.instructor.name.toLowerCase().includes(searchTerm)
          );
        }

        if (filters.category) {
          filteredCourses = filteredCourses.filter(course => course.category === filters.category);
        }

        if (filters.level) {
          filteredCourses = filteredCourses.filter(course => course.level === filters.level);
        }

        if (filters.priceRange) {
          filteredCourses = filteredCourses.filter(course =>
            course.price >= filters.priceRange!.min && course.price <= filters.priceRange!.max
          );
        }

        if (filters.rating) {
          filteredCourses = filteredCourses.filter(course => course.rating >= filters.rating!);
        }

        if (filters.sortBy) {
          filteredCourses.sort((a, b) => {
            const aValue = a[filters.sortBy as keyof Course];
            const bValue = b[filters.sortBy as keyof Course];
            
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
      }

      // Calculate pagination
      const total = filteredCourses.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCourses = filteredCourses.slice(startIndex, endIndex);

      this._courses.set(paginatedCourses);

      return {
        data: paginatedCourses,
        pagination: {
          page,
          limit,
          total,
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

  async getCourseById(id: string): Promise<ExtendedCourse | null> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await this.simulateApiCall();
      
      const course = this._courses().find(c => c.id === id);
      this._currentCourse.set(course || null);
      return course || null;
    } catch (error) {
      this._error.set('Không thể tải thông tin khóa học');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async getLessonsByCourseId(courseId: string): Promise<Lesson[]> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await this.simulateApiCall();
      
      // Mock lessons data
      const mockLessons: Lesson[] = [
        {
          id: '1',
          courseId,
          title: 'Giới thiệu về Hàng hải',
          duration: 45,
          type: 'video',
          isCompleted: false
        },
        {
          id: '2',
          courseId,
          title: 'Quy tắc An toàn Hàng hải',
          duration: 30,
          type: 'text',
          isCompleted: false
        }
      ];

      this._lessons.set(mockLessons);
      return mockLessons;
    } catch (error) {
      this._error.set('Không thể tải danh sách bài học');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async enrollInCourse(courseId: string, userId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await this.simulateApiCall();
      
      // Mock enrollment logic
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

  getCourseProgress(courseId: string, userId: string): CourseProgress | null {
    return this._progress().find(p => p.courseId === courseId && p.userId === userId) || null;
  }

  private initializeMockData(): void {
    const mockCourses: ExtendedCourse[] = [
      {
        id: '1',
        title: 'Kỹ thuật Tàu biển Cơ bản',
        description: 'Khóa học cung cấp kiến thức cơ bản về kỹ thuật tàu biển, cấu trúc tàu và hệ thống động lực',
        shortDescription: 'Khóa học cơ bản về kỹ thuật tàu biển',
        thumbnail: 'https://via.placeholder.com/400x300/0288D1/FFFFFF?text=Kỹ+thuật+Tàu+biển',
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
        description: 'Khóa học về kỹ thuật hàng hải, định vị GPS, và quy tắc an toàn trên biển',
        shortDescription: 'Kỹ thuật hàng hải và định vị',
        thumbnail: 'https://via.placeholder.com/400x300/2E7D32/FFFFFF?text=Hàng+hải',
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
      },
      {
        id: '3',
        title: 'Quản lý Cảng biển',
        description: 'Khóa học về quản lý cảng biển, logistics và chuỗi cung ứng hàng hải',
        shortDescription: 'Quản lý cảng biển và logistics',
        thumbnail: 'https://via.placeholder.com/400x300/FF6F00/FFFFFF?text=Quản+lý+Cảng',
        instructor: {
          id: '3',
          name: 'ThS. Trần Thị Lan',
          avatar: 'https://via.placeholder.com/150',
          title: 'Giảng viên Khoa Logistics',
          credentials: ['Thạc sĩ Logistics', '12 năm kinh nghiệm'],
          experience: 12,
          rating: 4.6,
          studentsCount: 900
        },
        category: CourseCategory.PORT_MANAGEMENT,
        level: 'beginner',
        duration: '35h',
        students: 650,
        reviews: 95,
        price: 1800000,
        rating: 4.5,
        tags: ['Cảng biển', 'Logistics', 'Chuỗi cung ứng'],
        skills: ['Quản lý cảng', 'Logistics'],
        prerequisites: ['Kinh tế cơ bản'],
        certificate: {
          type: 'Professional',
          description: 'Chứng chỉ Quản lý Cảng'
        },
        curriculum: {
          modules: 7,
          lessons: 14,
          duration: '35 giờ'
        },
        studentsCount: 650,
        lessonsCount: 14,
        isPublished: true
      },
      {
        id: '4',
        title: 'An toàn Hàng hải Quốc tế',
        description: 'Khóa học về các quy tắc an toàn hàng hải quốc tế và quản lý rủi ro',
        shortDescription: 'An toàn hàng hải quốc tế',
        thumbnail: 'https://via.placeholder.com/400x300/D32F2F/FFFFFF?text=An+toàn',
        instructor: {
          id: '4',
          name: 'TS. Phạm Văn Nam',
          avatar: 'https://via.placeholder.com/150',
          title: 'Giảng viên Khoa An toàn',
          credentials: ['Tiến sĩ An toàn Hàng hải', '18 năm kinh nghiệm'],
          experience: 18,
          rating: 4.7,
          studentsCount: 1100
        },
        category: CourseCategory.MARITIME_SAFETY,
        level: 'advanced',
        duration: '45h',
        students: 800,
        reviews: 140,
        price: 3200000,
        rating: 4.6,
        tags: ['An toàn', 'Quốc tế', 'Rủi ro'],
        skills: ['Quản lý rủi ro', 'An toàn hàng hải'],
        prerequisites: ['Kinh nghiệm hàng hải'],
        certificate: {
          type: 'STCW',
          description: 'Chứng chỉ An toàn Quốc tế'
        },
        curriculum: {
          modules: 9,
          lessons: 18,
          duration: '45 giờ'
        },
        studentsCount: 800,
        lessonsCount: 18,
        isPublished: true
      },
      {
        id: '5',
        title: 'Luật Hàng hải và Bảo hiểm',
        description: 'Khóa học về luật hàng hải quốc tế, bảo hiểm tàu biển và giải quyết tranh chấp',
        shortDescription: 'Luật hàng hải và bảo hiểm',
        thumbnail: 'https://via.placeholder.com/400x300/7B1FA2/FFFFFF?text=Luật+Hàng+hải',
        instructor: {
          id: '5',
          name: 'TS. Nguyễn Thị Mai',
          avatar: 'https://via.placeholder.com/150',
          title: 'Giảng viên Khoa Luật',
          credentials: ['Tiến sĩ Luật Hàng hải', '16 năm kinh nghiệm'],
          experience: 16,
          rating: 4.8,
          studentsCount: 750
        },
        category: CourseCategory.MARITIME_LAW,
        level: 'intermediate',
        duration: '38h',
        students: 500,
        reviews: 85,
        price: 2800000,
        rating: 4.7,
        tags: ['Luật', 'Bảo hiểm', 'Tranh chấp'],
        skills: ['Luật hàng hải', 'Bảo hiểm tàu'],
        prerequisites: ['Luật cơ bản'],
        certificate: {
          type: 'Professional',
          description: 'Chứng chỉ Luật Hàng hải'
        },
        curriculum: {
          modules: 8,
          lessons: 15,
          duration: '38 giờ'
        },
        studentsCount: 500,
        lessonsCount: 15,
        isPublished: true
      },
      {
        id: '6',
        title: 'Chứng chỉ Thuyền trưởng Hạng 2',
        description: 'Khóa học đào tạo thuyền trưởng hạng 2 theo tiêu chuẩn quốc tế',
        shortDescription: 'Chứng chỉ thuyền trưởng hạng 2',
        thumbnail: 'https://via.placeholder.com/400x300/00695C/FFFFFF?text=Thuyền+trưởng',
        instructor: {
          id: '6',
          name: 'ThS. Võ Minh Tuấn',
          avatar: 'https://via.placeholder.com/150',
          title: 'Thuyền trưởng Cao cấp',
          credentials: ['Thuyền trưởng Hạng 1', '25 năm kinh nghiệm'],
          experience: 25,
        rating: 4.9,
          studentsCount: 2000
        },
        category: CourseCategory.CERTIFICATES,
        level: 'advanced',
        duration: '60h',
        students: 1200,
        reviews: 200,
        price: 5000000,
        rating: 4.8,
        tags: ['Thuyền trưởng', 'Chứng chỉ', 'Quốc tế'],
        skills: ['Lãnh đạo tàu', 'Quản lý thủy thủ'],
        prerequisites: ['Kinh nghiệm hàng hải 5 năm'],
        certificate: {
          type: 'STCW',
          description: 'Chứng chỉ Thuyền trưởng Hạng 2'
        },
        curriculum: {
          modules: 12,
          lessons: 24,
          duration: '60 giờ'
        },
        studentsCount: 1200,
        lessonsCount: 24,
        isPublished: true
      }
    ];

    // Generate more mock data for pagination testing
    const additionalCourses: ExtendedCourse[] = [];
    const categories: CourseCategory[] = [
      CourseCategory.MARINE_ENGINEERING, 
      CourseCategory.NAVIGATION, 
      CourseCategory.PORT_MANAGEMENT, 
      CourseCategory.MARITIME_SAFETY, 
      CourseCategory.MARITIME_LAW, 
      CourseCategory.CERTIFICATES
    ];
    const levels: CourseLevel[] = ['beginner', 'intermediate', 'advanced'];
    const instructors = [
      { id: '7', name: 'ThS. Hoàng Văn Long', title: 'Giảng viên Khoa Kỹ thuật' },
      { id: '8', name: 'TS. Lê Thị Hương', title: 'Giảng viên Khoa Logistics' },
      { id: '9', name: 'ThS. Phạm Đức Minh', title: 'Giảng viên Khoa An toàn' },
      { id: '10', name: 'TS. Nguyễn Văn Tài', title: 'Giảng viên Khoa Hàng hải' }
    ];

    for (let i = 7; i <= 25; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const instructor = instructors[Math.floor(Math.random() * instructors.length)];
      
      additionalCourses.push({
        id: i.toString(),
        title: `Khóa học ${category} ${i}`,
        description: `Mô tả chi tiết cho khóa học ${category} số ${i}`,
        shortDescription: `Khóa học ${category} ${i}`,
        thumbnail: `https://via.placeholder.com/400x300/0288D1/FFFFFF?text=Course+${i}`,
        instructor: {
          ...instructor,
          avatar: 'https://via.placeholder.com/150',
          credentials: ['Thạc sĩ', '10+ năm kinh nghiệm'],
          experience: 10 + Math.floor(Math.random() * 15),
          rating: 4.5 + Math.random() * 0.4,
          studentsCount: 500 + Math.floor(Math.random() * 1000)
        },
        category,
        level,
        duration: `${20 + Math.floor(Math.random() * 40)}h`,
        students: 300 + Math.floor(Math.random() * 800),
        reviews: 50 + Math.floor(Math.random() * 150),
        price: Math.random() > 0.3 ? Math.floor(Math.random() * 5000000) : 0,
        rating: 4.0 + Math.random() * 1.0,
        tags: [category, level, 'Chuyên nghiệp'],
        skills: ['Kỹ năng 1', 'Kỹ năng 2'],
        prerequisites: ['Kiến thức cơ bản'],
        certificate: {
          type: 'Professional',
          description: `Chứng chỉ ${category}`
        },
        curriculum: {
          modules: 5 + Math.floor(Math.random() * 8),
          lessons: 10 + Math.floor(Math.random() * 15),
          duration: `${20 + Math.floor(Math.random() * 40)} giờ`
        },
        studentsCount: 300 + Math.floor(Math.random() * 800),
        lessonsCount: 10 + Math.floor(Math.random() * 15),
        isPublished: true
      });
    }

    this._courses.set([...mockCourses, ...additionalCourses]);
  }

  private simulateApiCall(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }
}
