import { Injectable, signal, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../../../api/client/api-client';
import { TeacherCourse, TeacherStudent, TeacherAssignment } from '../../types/teacher.types';

/**
 * Teacher Service - Manages teacher-specific data and operations
 * Follows signal-based state management pattern
 */
@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  private apiClient = inject(ApiClient);

  // Core signals for state management
  private _courses = signal<TeacherCourse[]>([]);
  private _students = signal<TeacherStudent[]>([]);
  private _assignments = signal<TeacherAssignment[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Computed signals for external consumption
  readonly courses = computed(() => this._courses());
  readonly students = computed(() => this._students());
  readonly assignments = computed(() => this._assignments());
  readonly isLoading = computed(() => this._isLoading());
  readonly error = computed(() => this._error());

  // Computed analytics
  readonly totalStudents = computed(() => this._students().length);
  readonly totalCourses = computed(() => this._courses().length);
  readonly activeCourses = computed(() =>
    this._courses().filter(course => course.status === 'active')
  );
  readonly draftCourses = computed(() =>
    this._courses().filter(course => course.status === 'draft')
  );
  readonly archivedCourses = computed(() =>
    this._courses().filter(course => course.status === 'archived')
  );
  readonly totalRevenue = computed(() =>
    this._courses().reduce((sum, course) => sum + (course.revenue || 0), 0)
  );
  readonly averageRating = computed(() => {
    const coursesWithRating = this._courses().filter(c => c.rating > 0);
    if (coursesWithRating.length === 0) return 0;
    return coursesWithRating.reduce((sum, c) => sum + c.rating, 0) / coursesWithRating.length;
  });
  readonly pendingAssignments = computed(() =>
    this._assignments().filter(a => a.status === 'pending')
  );
  readonly completionRate = computed(() => {
    const students = this._students();
    if (students.length === 0) return 0;
    return students.reduce((sum, s) => sum + s.progress, 0) / students.length;
  });

  constructor() {
    // Load real data from API
    this.loadMyCourses();
  }

  private initializeMockData(): void {
    // Fallback mock data when API fails
    const mockCourses: TeacherCourse[] = [
      {
        id: '1',
        title: 'Maritime Safety Fundamentals',
        description: 'Comprehensive safety training for maritime professionals',
        category: 'Safety',
        status: 'active',
        enrolledStudents: 45,
        rating: 4.8,
        revenue: 4500,
        createdAt: '2024-01-15',
        updatedAt: '2024-09-01'
      },
      {
        id: '2',
        title: 'Navigation Systems Advanced',
        description: 'Advanced navigation techniques and systems',
        category: 'Navigation',
        status: 'active',
        enrolledStudents: 32,
        rating: 4.6,
        revenue: 3200,
        createdAt: '2024-02-20',
        updatedAt: '2024-08-15'
      },
      {
        id: '3',
        title: 'Marine Engineering Basics',
        description: 'Fundamental marine engineering principles',
        category: 'Engineering',
        status: 'draft',
        enrolledStudents: 0,
        rating: 0,
        revenue: 0,
        createdAt: '2024-09-01',
        updatedAt: '2024-09-01'
      }
    ];

    this._courses.set(mockCourses);
    this.initializeMockStudentsAndAssignments();
  }

  private initializeMockStudentsAndAssignments(): void {
    // Mock students data (until backend provides API)
    const mockStudents: TeacherStudent[] = [
      {
        id: '1',
        name: 'Nguyễn Văn An',
        email: 'an.nguyen@student.edu.vn',
        studentId: 'SV2024001',
        department: 'Khoa Hàng hải',
        enrolledCourses: ['1', '2'],
        averageGrade: 8.5,
        progress: 75,
        lastActive: '2024-09-15',
        status: 'active'
      },
      {
        id: '2',
        name: 'Trần Thị Bình',
        email: 'binh.tran@student.edu.vn',
        studentId: 'SV2024002',
        department: 'Khoa Hàng hải',
        enrolledCourses: ['1'],
        averageGrade: 9.2,
        progress: 90,
        lastActive: '2024-09-14',
        status: 'active'
      },
      {
        id: '3',
        name: 'Lê Văn Cường',
        email: 'cuong.le@student.edu.vn',
        studentId: 'SV2024003',
        department: 'Khoa Hàng hải',
        enrolledCourses: ['2'],
        averageGrade: 7.8,
        progress: 60,
        lastActive: '2024-09-10',
        status: 'active'
      }
    ];

    // Mock assignments data (until backend provides API)
    const mockAssignments: TeacherAssignment[] = [
      {
        id: '1',
        title: 'Safety Procedures Quiz',
        courseId: '1',
        courseTitle: 'Maritime Safety Fundamentals',
        description: 'Test knowledge of maritime safety procedures',
        dueDate: '2024-11-20',
        status: 'pending',
        submissions: 35,
        totalStudents: 45,
        averageScore: 0,
        createdAt: '2024-09-01',
        updatedAt: '2024-09-15'
      },
      {
        id: '2',
        title: 'Navigation Project',
        courseId: '2',
        courseTitle: 'Navigation Systems Advanced',
        description: 'Practical navigation exercise',
        dueDate: '2024-11-25',
        status: 'submitted',
        submissions: 28,
        totalStudents: 32,
        averageScore: 8.7,
        createdAt: '2024-09-05',
        updatedAt: '2024-09-14'
      }
    ];

    this._students.set(mockStudents);
    this._assignments.set(mockAssignments);
  }

  // API Methods - Real Backend Integration
  async loadMyCourses(page: number = 1, limit: number = 100): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // Call real API: GET /api/v1/courses/my-courses
      const response = await firstValueFrom(
        this.apiClient.get<any>(`/api/v1/courses/my-courses?page=${page}&limit=${limit}`)
      );
      
      // Backend returns: { success: true, data: { content: [...], pageable: {...} } }
      const apiData = response.data || response;
      const coursesData = apiData.content || [];
      
      // Map backend response to TeacherCourse format
      const courses: TeacherCourse[] = coursesData.map((course: any) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        category: 'General', // Backend doesn't provide category yet
        status: 'active', // Assume active for now
        enrolledStudents: course.enrolledCount || 0,
        rating: 0, // Backend doesn't provide rating yet
        revenue: 0, // Backend doesn't provide revenue yet
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        // Additional fields from backend
        sectionCount: course.sectionCount,
        lessonCount: course.lessonCount
      }));

      this._courses.set(courses);
      
      // Initialize mock data for students and assignments (until backend provides these)
      this.initializeMockStudentsAndAssignments();
    } catch (error) {
      console.error('Failed to load courses:', error);
      this._error.set('Failed to load courses');
      // Fallback to mock data on error
      this.initializeMockData();
    } finally {
      this._isLoading.set(false);
    }
  }

  async getCourses(): Promise<TeacherCourse[]> {
    await this.loadMyCourses();
    return this._courses();
  }

  async getStudents(): Promise<TeacherStudent[]> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: Replace with real API call
      // const response = await this.apiClient.get<TeacherStudent[]>('/api/v1/teacher/students');
      // this._students.set(response);
      await this.simulateApiCall();
      return this._students();
    } catch (error) {
      this._error.set('Failed to load students');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async getAssignments(): Promise<TeacherAssignment[]> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: Replace with real API call
      // const response = await this.apiClient.get<TeacherAssignment[]>('/api/v1/teacher/assignments');
      // this._assignments.set(response);
      await this.simulateApiCall();
      return this._assignments();
    } catch (error) {
      this._error.set('Failed to load assignments');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async createCourse(course: Omit<TeacherCourse, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeacherCourse> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // Validate course data
      this.validateCourseData(course);

      // TODO: Replace with real API call
      // const response = await this.apiClient.post<TeacherCourse>('/api/v1/teacher/courses', course);
      await this.simulateApiCall();

      const newCourse: TeacherCourse = {
        ...course,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this._courses.update(courses => [...courses, newCourse]);
      return newCourse;
    } catch (error) {
      this._error.set('Failed to create course');
      this.handleError(error, 'Tạo khóa học thất bại');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateCourse(courseId: string, updates: Partial<TeacherCourse>): Promise<TeacherCourse> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: Replace with real API call
      // const response = await this.apiClient.put<TeacherCourse>(`/api/v1/teacher/courses/${courseId}`, updates);
      await this.simulateApiCall();

      this._courses.update(courses =>
        courses.map(course =>
          course.id === courseId
            ? { ...course, ...updates, updatedAt: new Date().toISOString() }
            : course
        )
      );

      const updatedCourse = this._courses().find(c => c.id === courseId);
      if (!updatedCourse) throw new Error('Course not found');

      return updatedCourse;
    } catch (error) {
      this._error.set('Failed to update course');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteCourse(courseId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: Replace with real API call
      // await this.apiClient.delete(`/api/v1/teacher/courses/${courseId}`);
      await this.simulateApiCall();

      this._courses.update(courses => courses.filter(course => course.id !== courseId));
    } catch (error) {
      this._error.set('Failed to delete course');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async createAssignment(assignment: Omit<TeacherAssignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeacherAssignment> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: Replace with real API call
      // const response = await this.apiClient.post<TeacherAssignment>('/api/v1/teacher/assignments', assignment);
      await this.simulateApiCall();

      const newAssignment: TeacherAssignment = {
        ...assignment,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this._assignments.update(assignments => [...assignments, newAssignment]);
      return newAssignment;
    } catch (error) {
      this._error.set('Failed to create assignment');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateAssignment(assignmentId: string, updates: Partial<TeacherAssignment>): Promise<TeacherAssignment> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: Replace with real API call
      // const response = await this.apiClient.put<TeacherAssignment>(`/api/v1/teacher/assignments/${assignmentId}`, updates);
      await this.simulateApiCall();

      this._assignments.update(assignments =>
        assignments.map(assignment =>
          assignment.id === assignmentId
            ? { ...assignment, ...updates, updatedAt: new Date().toISOString() }
            : assignment
        )
      );

      const updatedAssignment = this._assignments().find(a => a.id === assignmentId);
      if (!updatedAssignment) throw new Error('Assignment not found');

      return updatedAssignment;
    } catch (error) {
      this._error.set('Failed to update assignment');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: Replace with real API call
      // await this.apiClient.delete(`/api/v1/teacher/assignments/${assignmentId}`);
      await this.simulateApiCall();

      this._assignments.update(assignments => assignments.filter(assignment => assignment.id !== assignmentId));
    } catch (error) {
      this._error.set('Failed to delete assignment');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  // Utility methods
  private async simulateApiCall(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Business logic methods
  getCourseById(courseId: string): TeacherCourse | undefined {
    return this._courses().find(course => course.id === courseId);
  }

  getAssignmentsByCourse(courseId: string): TeacherAssignment[] {
    return this._assignments().filter(assignment => assignment.courseId === courseId);
  }

  getStudentsByCourse(courseId: string): TeacherStudent[] {
    return this._students().filter(student => student.enrolledCourses.includes(courseId));
  }

  // Student Management Methods
  async getStudentById(studentId: string): Promise<TeacherStudent | null> {
    this._isLoading.set(true);
    try {
      // TODO: Replace with real API call
      await this.simulateApiCall();
      return this._students().find(student => student.id === studentId) || null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateStudent(studentId: string, updates: Partial<TeacherStudent>): Promise<TeacherStudent> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: Replace with real API call
      await this.simulateApiCall();

      this._students.update(students =>
        students.map(student =>
          student.id === studentId ? { ...student, ...updates } : student
        )
      );

      const updatedStudent = this._students().find(student => student.id === studentId);
      if (!updatedStudent) throw new Error('Student not found');

      return updatedStudent;
    } catch (error) {
      this._error.set('Failed to update student');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  // Analytics Methods
  async getAnalytics(): Promise<any> {
    this._isLoading.set(true);
    try {
      // TODO: Replace with real API call
      await this.simulateApiCall();

      const analytics = {
        totalCourses: this.totalCourses(),
        totalStudents: this.totalStudents(),
        totalAssignments: this._assignments().length,
        totalRevenue: this.totalRevenue(),
        averageRating: this.averageRating(),
        completionRate: this.completionRate(),
        activeStudents: this._students().filter(s => {
          const lastActive = new Date(s.lastActive);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return lastActive > weekAgo;
        }).length,
        pendingGrading: this.pendingAssignments().length,
        monthlyRevenue: this.calculateMonthlyRevenue(),
        coursePerformance: this._courses().map(course => ({
          courseId: course.id,
          courseTitle: course.title,
          students: course.enrolledStudents,
          completionRate: Math.random() * 100, // TODO: Calculate from real data
          averageGrade: Math.random() * 10, // TODO: Calculate from real data
          revenue: course.revenue || 0
        }))
      };

      return analytics;
    } finally {
      this._isLoading.set(false);
    }
  }

  private calculateMonthlyRevenue(): number {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return this._courses().reduce((sum, course) => {
      const courseDate = new Date(course.createdAt);
      if (courseDate.getMonth() === currentMonth && courseDate.getFullYear() === currentYear) {
        return sum + (course.revenue || 0);
      }
      return sum;
    }, 0);
  }

  // Validation Methods
  private validateCourseData(courseData: Partial<TeacherCourse>): void {
    const requiredFields = ['title', 'description', 'category'];
    const missingFields = requiredFields.filter(field => !courseData[field as keyof TeacherCourse]);

    if (missingFields.length > 0) {
      throw new Error(`Thiếu thông tin bắt buộc: ${missingFields.join(', ')}`);
    }

    if (courseData.title && courseData.title.length < 3) {
      throw new Error('Tiêu đề khóa học phải có ít nhất 3 ký tự');
    }

    if (courseData.description && courseData.description.length < 10) {
      throw new Error('Mô tả khóa học phải có ít nhất 10 ký tự');
    }
  }

  // Error Handling
  private handleError(error: any, context: string): void {
    console.error(`TeacherService Error [${context}]:`, error);

    if (error instanceof Error) {
      // Already a proper error with message
      return;
    }

    // Handle HTTP errors if needed
    if (error?.status) {
      switch (error.status) {
        case 400:
          this._error.set('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
          break;
        case 401:
          this._error.set('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          break;
        case 403:
          this._error.set('Bạn không có quyền thực hiện hành động này.');
          break;
        case 404:
          this._error.set('Không tìm thấy dữ liệu.');
          break;
        case 500:
          this._error.set('Lỗi máy chủ. Vui lòng thử lại sau.');
          break;
        default:
          this._error.set('Có lỗi xảy ra. Vui lòng thử lại.');
      }
    }
  }
}