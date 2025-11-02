import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlingService } from '../../../shared/services/error-handling.service';

export interface TeacherCourse {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  price: number;
  thumbnail: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  students: number;
  rating: number;
  revenue: number;
  createdAt: Date;
  updatedAt: Date;
  modules: number;
  lessons: number;
  tags: string[];
  skills: string[];
  prerequisites: string[];
  certificate: {
    type: 'STCW' | 'IMO' | 'Professional' | 'Completion';
    description: string;
  };
}

export interface TeacherAssignment {
  id: string;
  title: string;
  description: string;
  type: 'quiz' | 'assignment' | 'project' | 'discussion';
  courseId: string;
  courseTitle: string;
  dueDate: Date;
  maxScore: number;
  submissions: number;
  totalStudents: number;
  status: 'draft' | 'active' | 'completed' | 'graded';
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherStudent {
  id: string;
  name: string;
  email: string;
  avatar: string;
  courses: string[];
  totalCourses: number;
  completedCourses: number;
  averageGrade: number;
  lastActive: Date;
  enrollmentDate: Date;
  progress: number;
}

export interface TeacherAnalytics {
  totalCourses: number;
  totalStudents: number;
  totalAssignments: number;
  totalRevenue: number;
  averageRating: number;
  completionRate: number;
  activeStudents: number;
  pendingGrading: number;
  monthlyRevenue: number;
  coursePerformance: {
    courseId: string;
    courseTitle: string;
    students: number;
    completionRate: number;
    averageGrade: number;
    revenue: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorHandlingService);

  // API Configuration
  private readonly API_BASE_URL = 'https://api.lms-maritime.com/v1';
  private readonly ENDPOINTS = {
    courses: '/teacher/courses',
    assignments: '/teacher/assignments',
    students: '/teacher/students',
    analytics: '/teacher/analytics',
    notifications: '/teacher/notifications'
  };

  // Signals for reactive state management
  private _courses = signal<TeacherCourse[]>([]);
  private _assignments = signal<TeacherAssignment[]>([]);
  private _students = signal<TeacherStudent[]>([]);
  private _analytics = signal<TeacherAnalytics | null>(null);
  private _isLoading = signal<boolean>(false);

  // Readonly signals for external consumption
  readonly courses = this._courses.asReadonly();
  readonly assignments = this._assignments.asReadonly();
  readonly students = this._students.asReadonly();
  readonly analytics = this._analytics.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  // Computed signals
  readonly activeCourses = computed(() => 
    this._courses().filter(course => course.status === 'active')
  );

  readonly draftCourses = computed(() => 
    this._courses().filter(course => course.status === 'draft')
  );

  readonly pendingAssignments = computed(() => 
    this._assignments().filter(assignment => assignment.status === 'active')
  );

  readonly totalStudents = computed(() => 
    this._students().length
  );

  readonly totalRevenue = computed(() => 
    this._courses().reduce((sum, course) => sum + course.revenue, 0)
  );

  constructor() {
    this.loadMockData();
  }

  // Course Management Methods
  async getCourses(): Promise<TeacherCourse[]> {
    this._isLoading.set(true);
    try {
      // Try real API first, fallback to mock data
      const courses = await this.fetchCoursesFromAPI();
      this._courses.set(courses);
      return courses;
    } catch (error) {
      console.warn('API unavailable, using mock data:', error);
      this.errorService.showWarning('Đang sử dụng dữ liệu mẫu. Kết nối API sẽ được khôi phục sau.', 'api');
      return this._courses();
    } finally {
      this._isLoading.set(false);
    }
  }

  private async fetchCoursesFromAPI(): Promise<TeacherCourse[]> {
    // For now, simulate API call with mock data
    // In production, this would be a real HTTP call
    await this.simulateApiCall();
    
    // Return mock data as if from API
    return this.getMockCourses();
  }

  async createCourse(courseData: Partial<TeacherCourse>): Promise<TeacherCourse> {
    this._isLoading.set(true);
    try {
      // Validate required fields
      this.validateCourseData(courseData);
      
      // Try API first
      const newCourse = await this.createCourseViaAPI(courseData);
      
      // Update local state
      this._courses.update(courses => [...courses, newCourse]);
      
      this.errorService.showSuccess('Khóa học đã được tạo thành công!', 'course');
      return newCourse;
    } catch (error) {
      this.handleError(error, 'Tạo khóa học thất bại');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  private validateCourseData(courseData: Partial<TeacherCourse>): void {
    const requiredFields = ['title', 'description', 'shortDescription', 'category', 'level'];
    const missingFields = requiredFields.filter(field => !courseData[field as keyof TeacherCourse]);
    
    if (missingFields.length > 0) {
      throw new Error(`Thiếu thông tin bắt buộc: ${missingFields.join(', ')}`);
    }
  }

  private async createCourseViaAPI(courseData: Partial<TeacherCourse>): Promise<TeacherCourse> {
    // Simulate API call
    await this.simulateApiCall();
    
    const newCourse: TeacherCourse = {
      id: this.generateId(),
      title: courseData.title || '',
      description: courseData.description || '',
      shortDescription: courseData.shortDescription || '',
      category: courseData.category || '',
      level: courseData.level || 'beginner',
      duration: courseData.duration || '',
      price: courseData.price || 0,
      thumbnail: courseData.thumbnail || '',
      status: 'draft',
      students: 0,
      rating: 0,
      revenue: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      modules: courseData.modules || 1,
      lessons: courseData.lessons || 1,
      tags: courseData.tags || [],
      skills: courseData.skills || [],
      prerequisites: courseData.prerequisites || [],
      certificate: courseData.certificate || {
        type: 'Completion',
        description: ''
      }
    };

    return newCourse;
  }

  async updateCourse(courseId: string, updates: Partial<TeacherCourse>): Promise<TeacherCourse> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      this._courses.update(courses => 
        courses.map(course => 
          course.id === courseId 
            ? { ...course, ...updates, updatedAt: new Date() }
            : course
        )
      );

      const updatedCourse = this._courses().find(course => course.id === courseId);
      if (!updatedCourse) {
        throw new Error('Course not found');
      }
      
      return updatedCourse;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteCourse(courseId: string): Promise<void> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      this._courses.update(courses => courses.filter(course => course.id !== courseId));
    } finally {
      this._isLoading.set(false);
    }
  }

  // Assignment Management Methods
  async getAssignments(): Promise<TeacherAssignment[]> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      return this._assignments();
    } finally {
      this._isLoading.set(false);
    }
  }

  async createAssignment(assignmentData: Partial<TeacherAssignment>): Promise<TeacherAssignment> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      const newAssignment: TeacherAssignment = {
        id: this.generateId(),
        title: assignmentData.title || '',
        description: assignmentData.description || '',
        type: assignmentData.type || 'assignment',
        courseId: assignmentData.courseId || '',
        courseTitle: assignmentData.courseTitle || '',
        dueDate: assignmentData.dueDate || new Date(),
        maxScore: assignmentData.maxScore || 100,
        submissions: 0,
        totalStudents: assignmentData.totalStudents || 0,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this._assignments.update(assignments => [...assignments, newAssignment]);
      return newAssignment;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateAssignment(assignmentId: string, updates: Partial<TeacherAssignment>): Promise<TeacherAssignment> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      this._assignments.update(assignments => 
        assignments.map(assignment => 
          assignment.id === assignmentId 
            ? { ...assignment, ...updates, updatedAt: new Date() }
            : assignment
        )
      );

      const updatedAssignment = this._assignments().find(assignment => assignment.id === assignmentId);
      if (!updatedAssignment) {
        throw new Error('Assignment not found');
      }
      
      return updatedAssignment;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      this._assignments.update(assignments => assignments.filter(assignment => assignment.id !== assignmentId));
    } finally {
      this._isLoading.set(false);
    }
  }

  // Student Management Methods
  async getStudents(): Promise<TeacherStudent[]> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      return this._students();
    } finally {
      this._isLoading.set(false);
    }
  }

  async getStudentById(studentId: string): Promise<TeacherStudent | null> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      return this._students().find(student => student.id === studentId) || null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateStudent(studentId: string, updates: Partial<TeacherStudent>): Promise<TeacherStudent> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      this._students.update(students => 
        students.map(student => 
          student.id === studentId 
            ? { ...student, ...updates }
            : student
        )
      );

      const updatedStudent = this._students().find(student => student.id === studentId);
      if (!updatedStudent) {
        throw new Error('Student not found');
      }
      
      return updatedStudent;
    } finally {
      this._isLoading.set(false);
    }
  }

  // Analytics Methods
  async getAnalytics(): Promise<TeacherAnalytics> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      const analytics: TeacherAnalytics = {
        totalCourses: this._courses().length,
        totalStudents: this._students().length,
        totalAssignments: this._assignments().length,
        totalRevenue: this.totalRevenue(),
        averageRating: this.calculateAverageRating(),
        completionRate: this.calculateCompletionRate(),
        activeStudents: this._students().filter(s => s.lastActive > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
        pendingGrading: this._assignments().filter(a => a.status === 'active').length,
        monthlyRevenue: this.calculateMonthlyRevenue(),
        coursePerformance: this._courses().map(course => ({
          courseId: course.id,
          courseTitle: course.title,
          students: course.students,
          completionRate: Math.random() * 100,
          averageGrade: Math.random() * 10,
          revenue: course.revenue
        }))
      };

      this._analytics.set(analytics);
      return analytics;
    } finally {
      this._isLoading.set(false);
    }
  }

  // Helper Methods
  private async simulateApiCall(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private generateId(): string {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  }

  private calculateAverageRating(): number {
    const courses = this._courses().filter(course => course.rating > 0);
    if (courses.length === 0) return 0;
    return courses.reduce((sum, course) => sum + course.rating, 0) / courses.length;
  }

  private calculateCompletionRate(): number {
    const students = this._students();
    if (students.length === 0) return 0;
    return students.reduce((sum, student) => sum + student.progress, 0) / students.length;
  }

  private calculateMonthlyRevenue(): number {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return this._courses().reduce((sum, course) => {
      const courseDate = new Date(course.createdAt);
      if (courseDate.getMonth() === currentMonth && courseDate.getFullYear() === currentYear) {
        return sum + course.revenue;
      }
      return sum;
    }, 0);
  }

  // Error handling
  private handleError(error: any, context: string): void {
    console.error(`TeacherService Error [${context}]:`, error);
    
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          this.errorService.addError({ message: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.', type: 'error', context });
          break;
        case 401:
          this.errorService.addError({ message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', type: 'error', context });
          break;
        case 403:
          this.errorService.addError({ message: 'Bạn không có quyền thực hiện hành động này.', type: 'error', context });
          break;
        case 404:
          this.errorService.addError({ message: 'Không tìm thấy dữ liệu.', type: 'error', context });
          break;
        case 500:
          this.errorService.addError({ message: 'Lỗi máy chủ. Vui lòng thử lại sau.', type: 'error', context });
          break;
        default:
          this.errorService.addError({ message: 'Có lỗi xảy ra. Vui lòng thử lại.', type: 'error', context });
      }
    } else if (error instanceof Error) {
      this.errorService.addError({ message: error.message, type: 'error', context });
    } else {
      this.errorService.addError({ message: 'Có lỗi không xác định xảy ra.', type: 'error', context });
    }
  }

  private loadMockData(): void {
    // Mock courses
    const mockCourses: TeacherCourse[] = this.getMockCourses();
    const mockAssignments: TeacherAssignment[] = this.getMockAssignments();
    const mockStudents: TeacherStudent[] = this.getMockStudents();

    this._courses.set(mockCourses);
    this._assignments.set(mockAssignments);
    this._students.set(mockStudents);
  }

  private getMockCourses(): TeacherCourse[] {
    return [
      {
        id: 'course_1',
        title: 'Kỹ thuật Tàu biển Cơ bản',
        description: 'Khóa học cung cấp kiến thức cơ bản về kỹ thuật tàu biển, bao gồm cấu trúc tàu, hệ thống động cơ, và các quy trình bảo trì.',
        shortDescription: 'Kiến thức cơ bản về kỹ thuật tàu biển',
        category: 'engineering',
        level: 'beginner',
        duration: '40 giờ',
        price: 2500000,
        thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop',
        status: 'active',
        students: 45,
        rating: 4.8,
        revenue: 112500000,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-09-20'),
        modules: 6,
        lessons: 24,
        tags: ['kỹ thuật', 'tàu biển', 'cơ bản'],
        skills: ['Hiểu biết về cấu trúc tàu', 'Vận hành hệ thống động cơ', 'Bảo trì cơ bản'],
        prerequisites: ['Kiến thức vật lý cơ bản', 'Hiểu biết về toán học'],
        certificate: {
          type: 'STCW',
          description: 'Chứng chỉ STCW về kỹ thuật tàu biển'
        }
      },
      {
        id: 'course_2',
        title: 'An toàn Hàng hải',
        description: 'Các quy định và thực hành an toàn trong ngành hàng hải, bao gồm SOLAS, MARPOL và các tiêu chuẩn quốc tế.',
        shortDescription: 'Quy định và thực hành an toàn hàng hải',
        category: 'safety',
        level: 'intermediate',
        duration: '32 giờ',
        price: 2000000,
        thumbnail: 'https://images.unsplash.com/photo-1506905925346-14b1e3d71e51?w=300&h=200&fit=crop',
        status: 'active',
        students: 32,
        rating: 4.6,
        revenue: 64000000,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-09-18'),
        modules: 5,
        lessons: 20,
        tags: ['an toàn', 'hàng hải', 'quy định'],
        skills: ['Tuân thủ quy định SOLAS', 'Xử lý tình huống khẩn cấp', 'Quản lý an toàn'],
        prerequisites: ['Kiến thức hàng hải cơ bản'],
        certificate: {
          type: 'IMO',
          description: 'Chứng chỉ IMO về an toàn hàng hải'
        }
      },
      {
        id: 'course_3',
        title: 'Quản lý Cảng biển',
        description: 'Kiến thức về quản lý và vận hành cảng biển, bao gồm logistics, cảng container và quản lý hàng hóa.',
        shortDescription: 'Quản lý và vận hành cảng biển',
        category: 'logistics',
        level: 'advanced',
        duration: '48 giờ',
        price: 3000000,
        thumbnail: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=300&h=200&fit=crop',
        status: 'draft',
        students: 0,
        rating: 0,
        revenue: 0,
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-09-21'),
        modules: 8,
        lessons: 32,
        tags: ['quản lý', 'cảng biển', 'logistics'],
        skills: ['Quản lý cảng container', 'Logistics hàng hải', 'Quản lý hàng hóa'],
        prerequisites: ['Kiến thức logistics cơ bản', 'Kinh nghiệm quản lý'],
        certificate: {
          type: 'Professional',
          description: 'Chứng chỉ chuyên nghiệp về quản lý cảng biển'
        }
      }
    ];
  }

  private getMockAssignments(): TeacherAssignment[] {
    return [
      {
        id: 'assignment_1',
        title: 'Bài tập về Cấu trúc Tàu',
        description: 'Phân tích và trình bày về cấu trúc tàu biển',
        type: 'assignment',
        courseId: 'course_1',
        courseTitle: 'Kỹ thuật Tàu biển Cơ bản',
        dueDate: new Date('2024-09-25'),
        maxScore: 100,
        submissions: 35,
        totalStudents: 45,
        status: 'active',
        createdAt: new Date('2024-09-10'),
        updatedAt: new Date('2024-09-15')
      },
      {
        id: 'assignment_2',
        title: 'Quiz An toàn Hàng hải',
        description: 'Kiểm tra kiến thức về quy định an toàn hàng hải',
        type: 'quiz',
        courseId: 'course_2',
        courseTitle: 'An toàn Hàng hải',
        dueDate: new Date('2024-09-22'),
        maxScore: 100,
        submissions: 28,
        totalStudents: 32,
        status: 'graded',
        createdAt: new Date('2024-09-05'),
        updatedAt: new Date('2024-09-20')
      }
    ];
  }

  private getMockStudents(): TeacherStudent[] {
    return [
      {
        id: 'student_1',
        name: 'Nguyễn Văn A',
        email: 'nguyenvana@email.com',
        avatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+A&background=3b82f6&color=ffffff&size=150',
        courses: ['course_1', 'course_2'],
        totalCourses: 2,
        completedCourses: 1,
        averageGrade: 8.5,
        lastActive: new Date('2024-09-21'),
        enrollmentDate: new Date('2024-01-20'),
        progress: 85
      },
      {
        id: 'student_2',
        name: 'Trần Thị B',
        email: 'tranthib@email.com',
        avatar: 'https://ui-avatars.com/api/?name=Tran+Thi+B&background=10b981&color=ffffff&size=150',
        courses: ['course_1'],
        totalCourses: 1,
        completedCourses: 0,
        averageGrade: 9.0,
        lastActive: new Date('2024-09-20'),
        enrollmentDate: new Date('2024-02-15'),
        progress: 72
      },
      {
        id: 'student_3',
        name: 'Lê Văn C',
        email: 'levanc@email.com',
        avatar: 'https://ui-avatars.com/api/?name=Le+Van+C&background=8b5cf6&color=ffffff&size=150',
        courses: ['course_1', 'course_2'],
        totalCourses: 2,
        completedCourses: 2,
        averageGrade: 8.8,
        lastActive: new Date('2024-09-19'),
        enrollmentDate: new Date('2024-01-10'),
        progress: 90
      }
    ];
  }
}