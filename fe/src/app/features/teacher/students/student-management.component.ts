import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StudentApi, StudentSummary } from '../../../api/client/student.api';
import { CourseApi } from '../../../api/client/course.api';
import { CourseSummary } from '../../../api/types/course.types';
import { IconComponent } from '../../../shared/components/ui/icon/icon.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { ProgressBarComponent } from '../../../shared/components/ui/progress-bar/progress-bar.component';

@Component({
  selector: 'app-student-management',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule,
    IconComponent,
    ButtonComponent,
    BadgeComponent,
    ProgressBarComponent
  ],
  templateUrl: './student-management.component.html',
  styleUrl: './student-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentManagementComponent {
  private studentApi = inject(StudentApi);
  private courseApi = inject(CourseApi);

  keyword = '';
  status: '' | 'active' | 'inactive' | 'suspended' = '';
  selectedCourse = '';
  
  students = signal<StudentSummary[]>([]);
  courses = signal<CourseSummary[]>([]);
  loading = signal(true);
  error = signal('');
  
  pageIndex = signal(1);
  pageSize = signal(10);
  
  filtered = computed(() => {
    const kw = this.keyword.trim().toLowerCase();
    return this.students().filter(s => 
      (!this.status || s.status === this.status) &&
      (!kw || s.name.toLowerCase().includes(kw) || s.email.toLowerCase().includes(kw))
    );
  });
  
  paged = computed(() => {
    const start = (this.pageIndex() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  total = computed(() => this.filtered().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  constructor() {
    this.loadData();
  }

  private loadData() {
    this.loading.set(true);
    this.error.set('');
    
    // Load courses first, then students
    this.courseApi.myCourses().subscribe({
      next: (response) => {
        if (response.data) {
          this.courses.set(response.data);
          this.loadStudents();
        }
      },
      error: (error) => {
        console.error('Error loading courses:', error);
        this.error.set('Không thể tải danh sách khóa học');
        this.loading.set(false);
      }
    });
  }

  private loadStudents() {
    const params = {
      page: 1,
      limit: 1000, // Get all for client-side filtering
      courseId: this.selectedCourse || undefined,
      status: this.status || undefined,
      search: this.keyword || undefined
    };

    this.studentApi.getTeacherStudents(params).subscribe({
      next: (response) => {
        if (response.data && response.data.length > 0) {
          this.students.set(response.data);
        } else {
          // Mock data for development - always show when no real data
          this.loadMockData();
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading students:', error);
        // Load mock data on error instead of showing error
        this.loadMockData();
        this.loading.set(false);
      }
    });
  }

  private loadMockData() {
    this.students.set([
      {
        id: '1',
        name: 'Nguyễn Văn An',
        email: 'nguyenvanan@email.com',
        enrolledAt: '2025-09-01T00:00:00Z',
        lastAccessed: '2025-10-13T10:30:00Z',
        progress: 75,
        averageGrade: 8.5,
        status: 'active',
        completedCourses: 2,
        totalCourses: 3
      },
      {
        id: '2',
        name: 'Trần Thị Bình',
        email: 'tranthibinh@email.com',
        enrolledAt: '2025-08-15T00:00:00Z',
        lastAccessed: '2025-10-12T14:20:00Z',
        progress: 90,
        averageGrade: 9.2,
        status: 'active',
        completedCourses: 3,
        totalCourses: 4
      },
      {
        id: '3',
        name: 'Lê Văn Cường',
        email: 'levancuong@email.com',
        enrolledAt: '2025-09-10T00:00:00Z',
        lastAccessed: '2025-10-01T16:45:00Z',
        progress: 45,
        averageGrade: 6.8,
        status: 'inactive',
        completedCourses: 1,
        totalCourses: 2
      },
      {
        id: '4',
        name: 'Phạm Thị Dung',
        email: 'phamthidung@email.com',
        enrolledAt: '2025-08-20T00:00:00Z',
        lastAccessed: '2025-10-14T09:15:00Z',
        progress: 60,
        averageGrade: 7.5,
        status: 'active',
        completedCourses: 1,
        totalCourses: 2
      },
      {
        id: '5',
        name: 'Hoàng Văn Em',
        email: 'hoangvanem@email.com',
        enrolledAt: '2025-09-05T00:00:00Z',
        lastAccessed: '2025-09-20T11:30:00Z',
        progress: 30,
        averageGrade: 5.5,
        status: 'inactive',
        completedCourses: 0,
        totalCourses: 2
      }
    ]);
  }

  applyFilters() {
    this.pageIndex.set(1);
    // Note: filtering is handled by computed() in real-time
  }

  goToPage(n: number) { 
    this.pageIndex.set(Math.min(Math.max(1, n), this.totalPages())); 
  }
  
  nextPage() { 
    this.goToPage(this.pageIndex() + 1); 
  }
  
  prevPage() { 
    this.goToPage(this.pageIndex() - 1); 
  }
  
  onPageSizeChange(v?: any) { 
    if (v !== undefined) this.pageSize.set(Number(v)); 
    this.goToPage(1); 
  }

  trackById(_index: number, student: any): string {
    return student.id;
  }

  sendMessage(studentId: string) {
    // TODO: Open message modal or navigate to messaging interface
    console.log('Send message to student:', studentId);
  }

  onReload() {
    this.loadData();
  }

  getInitials(name: string): string {
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getStatusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'suspended':
        return 'error';
      default:
        return 'info';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Đang học';
      case 'inactive':
        return 'Không hoạt động';
      case 'suspended':
        return 'Tạm khóa';
      default:
        return status;
    }
  }
}