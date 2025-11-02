import { Injectable, signal, computed, inject } from '@angular/core';
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
  readonly totalRevenue = computed(() =>
    this._courses().reduce((sum, course) => sum + (course.revenue || 0), 0)
  );

  constructor() {
    // Initialize with mock data for development
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Mock courses data
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

    // Mock students data
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

    // Mock assignments data
    const mockAssignments: TeacherAssignment[] = [
      {
        id: '1',
        title: 'Safety Procedures Quiz',
        courseId: '1',
        description: 'Test knowledge of maritime safety procedures',
        dueDate: '2024-09-20',
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
        description: 'Practical navigation exercise',
        dueDate: '2024-09-25',
        status: 'submitted',
        submissions: 28,
        totalStudents: 32,
        averageScore: 8.7,
        createdAt: '2024-09-05',
        updatedAt: '2024-09-14'
      }
    ];

    this._courses.set(mockCourses);
    this._students.set(mockStudents);
    this._assignments.set(mockAssignments);
  }

  // API Methods (to be implemented with real backend)
  async getCourses(): Promise<TeacherCourse[]> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: Replace with real API call
      // const response = await this.apiClient.get<TeacherCourse[]>('/api/v1/teacher/courses');
      // this._courses.set(response);
      await this.simulateApiCall();
      return this._courses();
    } catch (error) {
      this._error.set('Failed to load courses');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
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

  getStudentById(studentId: string): TeacherStudent | undefined {
    return this._students().find(student => student.id === studentId);
  }

  getAssignmentsByCourse(courseId: string): TeacherAssignment[] {
    return this._assignments().filter(assignment => assignment.courseId === courseId);
  }

  getStudentsByCourse(courseId: string): TeacherStudent[] {
    return this._students().filter(student => student.enrolledCourses.includes(courseId));
  }
}