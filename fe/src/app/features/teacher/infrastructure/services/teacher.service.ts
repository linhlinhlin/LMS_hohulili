import { Injectable, signal, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../../../api/client/api-client';
import { TeacherCourse, TeacherStudent, TeacherAssignment } from '../../types/teacher.types';

/**
 * Teacher Service - Manages teacher-specific data and operations
 * All methods call real backend APIs (V3 endpoints).
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

  // ============== Course Methods (Real API) ==============

  async loadMyCourses(page: number = 0, size: number = 100): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.apiClient.get<any>(`/api/v3/teacher/courses/my-courses?page=${page}&size=${size}`)
      );

      const apiData = response.data || response;
      const coursesData = apiData.content || apiData || [];
      const coursesList = Array.isArray(coursesData) ? coursesData : [];

      const courses: TeacherCourse[] = coursesList.map((course: any) => ({
        id: course.id,
        code: course.code || course.slug || '',
        title: course.title || '',
        description: course.description || '',
        category: course.categoryName || 'General',
        status: this.mapCourseStatus(course.status),
        originalStatus: course.status || 'DRAFT',
        enrolledStudents: course.enrolledCount || course.studentsCount || 0,
        rating: course.averageRating || 0,
        revenue: course.revenue || 0,
        deliveryMode: course.deliveryMode || 'SELF_PACED',
        createdAt: course.createdAt || '',
        updatedAt: course.updatedAt || '',
        modules: course.sectionCount || 0,
        lessons: course.lessonCount || 0,
        thumbnail: course.thumbnail || course.thumbnailUrl || undefined
      }));

      this._courses.set(courses);
    } catch {
      this._error.set('Không thể tải danh sách khóa học');
      this._courses.set([]);
    } finally {
      this._isLoading.set(false);
    }
  }

  async getCourses(): Promise<TeacherCourse[]> {
    await this.loadMyCourses();
    return this._courses();
  }

  async createCourse(course: Omit<TeacherCourse, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeacherCourse> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      this.validateCourseData(course);

      const response = await firstValueFrom(
        this.apiClient.post<any>('/api/v3/teacher/courses', {
          title: course.title,
          description: course.description,
          categoryId: null,
          deliveryMode: 'SELF_PACED'
        })
      );

      const data = response.data || response;
      const newCourse: TeacherCourse = {
        ...course,
        id: data.id || data.courseId || Date.now().toString(),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };

      this._courses.update(courses => [...courses, newCourse]);
      return newCourse;
    } catch (error) {
      this._error.set('Không thể tạo khóa học');
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
      await firstValueFrom(
        this.apiClient.put<any>(`/api/v3/teacher/courses/${courseId}`, updates)
      );

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
      this._error.set('Không thể cập nhật khóa học');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteCourse(courseId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.apiClient.delete<any>(`/api/v3/teacher/courses/${courseId}`)
      );

      this._courses.update(courses => courses.filter(course => course.id !== courseId));
    } catch (error) {
      this._error.set('Không thể xóa khóa học');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  // ============== Student Methods (Real API) ==============

  async getStudents(): Promise<TeacherStudent[]> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.apiClient.get<any>('/api/v3/teacher/students?page=0&size=100')
      );

      const apiData = response.data || response;
      const pageData = apiData.content || apiData || [];
      const studentsList = Array.isArray(pageData) ? pageData : [];

      const students: TeacherStudent[] = studentsList.map((s: any) => ({
        id: s.id || s.studentId,
        name: s.fullName || s.name || '',
        email: s.email || '',
        studentId: s.studentCode || s.studentId || s.id,
        department: s.department || '',
        enrolledCourses: s.enrolledCourseIds || [],
        averageGrade: s.averageGrade || 0,
        progress: s.completionPercent || s.progress || 0,
        lastActive: s.lastAccessedAt || s.lastActive || '',
        status: s.status?.toLowerCase() || 'active'
      }));

      this._students.set(students);
      return students;
    } catch {
      this._error.set('Không thể tải danh sách học viên');
      this._students.set([]);
      return [];
    } finally {
      this._isLoading.set(false);
    }
  }

  async getStudentById(studentId: string): Promise<TeacherStudent | null> {
    this._isLoading.set(true);
    try {
      const response = await firstValueFrom(
        this.apiClient.get<any>(`/api/v3/teacher/students/${studentId}`)
      );

      const data = response.data || response;
      return {
        id: data.id || studentId,
        name: data.fullName || data.name || '',
        email: data.email || '',
        studentId: data.studentCode || data.studentId || studentId,
        department: data.department || '',
        enrolledCourses: data.enrolledCourseIds || [],
        averageGrade: data.averageGrade || 0,
        progress: data.completionPercent || data.progress || 0,
        lastActive: data.lastAccessedAt || data.lastActive || '',
        status: data.status?.toLowerCase() || 'active'
      };
    } catch {
      return this._students().find(student => student.id === studentId) || null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateStudent(studentId: string, updates: Partial<TeacherStudent>): Promise<TeacherStudent> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.apiClient.patch<any>(`/api/v3/teacher/students/${studentId}/status`, {
          status: updates.status?.toUpperCase()
        })
      );

      this._students.update(students =>
        students.map(student =>
          student.id === studentId ? { ...student, ...updates } : student
        )
      );

      const updatedStudent = this._students().find(student => student.id === studentId);
      if (!updatedStudent) throw new Error('Student not found');

      return updatedStudent;
    } catch (error) {
      this._error.set('Không thể cập nhật học viên');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  // ============== Assignment Methods (Real API) ==============

  async getAssignments(): Promise<TeacherAssignment[]> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.apiClient.get<any>('/api/v3/assignments/summary')
      );

      const apiData = response.data || response;
      const assignmentsList = Array.isArray(apiData) ? apiData : [];

      const assignments: TeacherAssignment[] = assignmentsList.map((a: any) => ({
        id: a.id,
        title: a.title || '',
        courseId: a.courseId || '',
        courseTitle: a.courseTitle || '',
        description: a.description || '',
        dueDate: a.dueDate || '',
        status: a.status?.toLowerCase() || 'pending',
        submissions: a.submissionsCount || 0,
        totalStudents: a.totalStudents || 0,
        averageScore: a.averageScore || 0,
        createdAt: a.createdAt || '',
        updatedAt: a.updatedAt || ''
      }));

      this._assignments.set(assignments);
      return assignments;
    } catch {
      this._error.set('Không thể tải danh sách bài tập');
      this._assignments.set([]);
      return [];
    } finally {
      this._isLoading.set(false);
    }
  }

  async createAssignment(assignment: Omit<TeacherAssignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeacherAssignment> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.apiClient.post<any>(`/api/v3/assignments/courses/${assignment.courseId}`, {
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.dueDate,
          maxScore: assignment.maxScore || 100
        })
      );

      const data = response.data || response;
      const newAssignment: TeacherAssignment = {
        ...assignment,
        id: data.id || Date.now().toString(),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };

      this._assignments.update(assignments => [...assignments, newAssignment]);
      return newAssignment;
    } catch (error) {
      this._error.set('Không thể tạo bài tập');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateAssignment(assignmentId: string, updates: Partial<TeacherAssignment>): Promise<TeacherAssignment> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.apiClient.put<any>(`/api/v3/assignments/${assignmentId}`, updates)
      );

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
      this._error.set('Không thể cập nhật bài tập');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.apiClient.delete<any>(`/api/v3/assignments/${assignmentId}`)
      );

      this._assignments.update(assignments => assignments.filter(a => a.id !== assignmentId));
    } catch (error) {
      this._error.set('Không thể xóa bài tập');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  // ============== Analytics Methods (Real API) ==============

  async getAnalytics(): Promise<any> {
    this._isLoading.set(true);
    try {
      const response = await firstValueFrom(
        this.apiClient.get<any>('/api/v3/teacher/analytics')
      );

      const data = response.data || response;
      return {
        totalCourses: data.totalCourses || 0,
        totalStudents: data.totalStudents || 0,
        totalAssignments: this._assignments().length,
        totalRevenue: data.totalRevenue || 0,
        averageRating: data.averageRating || 0,
        completionRate: this.completionRate(),
        activeCourses: data.activeCourses || 0,
        pendingGrading: data.pendingGrading || 0,
        coursePerformance: data.coursePerformance || []
      };
    } catch {
      // Fallback to computed values from local state
      return {
        totalCourses: this.totalCourses(),
        totalStudents: this.totalStudents(),
        totalAssignments: this._assignments().length,
        totalRevenue: this.totalRevenue(),
        averageRating: this.averageRating(),
        completionRate: this.completionRate(),
        activeCourses: this.activeCourses().length,
        pendingGrading: this.pendingAssignments().length,
        coursePerformance: []
      };
    } finally {
      this._isLoading.set(false);
    }
  }

  // ============== Utility Methods ==============

  getCourseById(courseId: string): TeacherCourse | undefined {
    return this._courses().find(course => course.id === courseId);
  }

  getAssignmentsByCourse(courseId: string): TeacherAssignment[] {
    return this._assignments().filter(assignment => assignment.courseId === courseId);
  }

  getStudentsByCourse(courseId: string): TeacherStudent[] {
    return this._students().filter(student => student.enrolledCourses.includes(courseId));
  }

  private mapCourseStatus(status: string | undefined): 'active' | 'draft' | 'archived' {
    if (!status) return 'draft';
    const s = status.toUpperCase();
    if (s === 'APPROVED') return 'active';
    if (s === 'DRAFT' || s === 'PENDING' || s === 'REJECTED') return 'draft';
    if (s === 'ARCHIVED') return 'archived';
    return 'draft';
  }

  private validateCourseData(courseData: Partial<TeacherCourse>): void {
    const requiredFields = ['title', 'description'];
    const missingFields = requiredFields.filter(field => !courseData[field as keyof TeacherCourse]);

    if (missingFields.length > 0) {
      throw new Error(`Thiếu thông tin bắt buộc: ${missingFields.join(', ')}`);
    }

    if (courseData.title && courseData.title.length < 3) {
      throw new Error('Tiêu đề khóa học phải có ít nhất 3 ký tự');
    }
  }

  private handleError(error: any, _context: string): void {
    if (error instanceof Error) return;

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
