import { Component, ChangeDetectionStrategy, input, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../../../shared/components/ui/badge/badge.component';
import { ProgressBarComponent } from '../../../../shared/components/ui/progress-bar/progress-bar.component';

interface StudentEnrollment {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  progressPercentage: number;
  lessonsCompleted: number;
  totalLessons: number;
  quizScore: number | null;
  assignmentScore: number | null;
  lastActivityAt: string | null;
}

interface PageableResponse {
  content: StudentEnrollment[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    numberOfElements: number;
    first: boolean;
    last: boolean;
    empty: boolean;
  };
}

/**
 * Course Students List Component
 * 
 * Displays enrolled students with:
 * - Search functionality
 * - Pagination
 * - Progress tracking
 * - Status indicators
 */
@Component({
  selector: 'app-course-students-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    ButtonComponent,
    BadgeComponent,
    ProgressBarComponent
  ],
  templateUrl: './course-students-list.component.html',
  styleUrl: './course-students-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseStudentsListComponent implements OnInit {
  courseId = input.required<string>();
  
  private http = inject(HttpClient);
  
  // State
  students = signal<StudentEnrollment[]>([]);
  loading = signal(false);
  error = signal('');
  
  // Pagination
  currentPage = signal(0);
  pageSize = 20;
  totalPages = signal(1);
  totalStudents = signal(0);
  isFirstPage = signal(true);
  isLastPage = signal(false);
  
  // Search
  searchTerm = '';
  private searchTimeout: any;

  ngOnInit() {
    this.loadStudents();
  }

  loadStudents() {
    this.loading.set(true);
    this.error.set('');

    const searchParam = this.searchTerm ? `&search=${encodeURIComponent(this.searchTerm)}` : '';
    const url = `/api/v1/courses/${this.courseId()}/students?page=${this.currentPage()}&size=${this.pageSize}${searchParam}`;

    this.http.get<{ success: boolean; data: PageableResponse }>(url).subscribe({
      next: (response) => {
        if (response.success) {
          this.students.set(response.data.content);
          this.totalPages.set(response.data.pageable.totalPages);
          this.totalStudents.set(response.data.pageable.totalElements);
          this.isFirstPage.set(response.data.pageable.first);
          this.isLastPage.set(response.data.pageable.last);
        }
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Không thể tải danh sách học viên');
      },
      complete: () => this.loading.set(false)
    });
  }

  onSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(0);
      this.loadStudents();
    }, 500);
  }

  clearSearch() {
    this.searchTerm = '';
    this.currentPage.set(0);
    this.loadStudents();
  }

  prevPage() {
    if (!this.isFirstPage()) {
      this.currentPage.update(p => p - 1);
      this.loadStudents();
    }
  }

  nextPage() {
    if (!this.isLastPage()) {
      this.currentPage.update(p => p + 1);
      this.loadStudents();
    }
  }

  onPageSizeChange() {
    this.currentPage.set(0);
    this.loadStudents();
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
      case 'ACTIVE':
        return 'success';
      case 'COMPLETED':
        return 'info';
      case 'DROPPED':
        return 'error';
      default:
        return 'default';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Đang học';
      case 'COMPLETED':
        return 'Hoàn thành';
      case 'DROPPED':
        return 'Đã bỏ';
      default:
        return status;
    }
  }
}
