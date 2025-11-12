import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CourseApi } from '../../../api/client/course.api';
import { CourseSummary } from '../../../api/types/course.types';
import { IconComponent, IconName } from '../../../shared/components/ui/icon/icon.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { CardComponent } from '../../../shared/components/ui/card/card.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';

interface Activity {
  id: string;
  icon: IconName;
  text: string;
  time: string;
}

/**
 * Course Management - Coursera Style
 * 
 * Professional course management with:
 * - Clean table design with status badges
 * - Search and filter functionality
 * - Sidebar widgets (Stats, Recent Activity)
 * - Pagination controls
 */
@Component({
  selector: 'app-course-management',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    IconComponent,
    ButtonComponent,
    CardComponent,
    BadgeComponent
  ],
  templateUrl: './course-management.component.html',
  styleUrl: './course-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseManagementComponent {
  private api = inject(CourseApi);
  private router = inject(Router);

  // State
  courses = signal<CourseSummary[]>([]);
  filtered = signal<CourseSummary[]>([]);
  loading = signal(true);
  error = signal('');
  
  // Filter state
  keyword = '';
  status: '' | 'APPROVED' | 'PENDING' | 'DRAFT' = '';
  
  // Action state
  publishingId = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  
  // Pagination state
  pageIndex = signal(1);
  pageSize = signal(10);

  // Computed
  paged = computed(() => {
    const start = (this.pageIndex() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  total = computed(() => this.filtered().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  activeCourses = computed(() => 
    this.courses().filter(c => c.status === 'APPROVED')
  );

  draftCourses = computed(() =>
    this.courses().filter(c => c.status === 'DRAFT')
  );

  totalStudents = computed(() =>
    this.courses().reduce((sum, c) => sum + (c.enrolledCount || 0), 0)
  );

  recentActivities = computed<Activity[]>(() => [
    {
      id: '1',
      icon: 'academic-cap',
      text: 'Khóa học mới được tạo',
      time: '2 giờ trước'
    },
    {
      id: '2',
      icon: 'users',
      text: '5 học viên mới đăng ký',
      time: '4 giờ trước'
    },
    {
      id: '3',
      icon: 'check-circle',
      text: 'Khóa học được phê duyệt',
      time: '1 ngày trước'
    }
  ]);

  constructor() {
    this.loadCourses();
  }

  // Load courses
  loadCourses() {
    this.loading.set(true);
    this.error.set('');
    
    this.api.myCourses().subscribe({
      next: (res) => {
        const list = res?.data || [];
        this.courses.set(list);
        this.filtered.set(list);
        this.pageIndex.set(1);
      },
      error: (err) => this.error.set(err?.message || 'Không tải được danh sách'),
      complete: () => this.loading.set(false)
    });
  }

  // Filter methods
  applyFilters() {
    const kw = this.keyword.trim().toLowerCase();
    this.filtered.set(
      this.courses()
        .filter(c => !this.status || c.status === this.status)
        .filter(c => !kw || c.code?.toLowerCase().includes(kw) || c.title?.toLowerCase().includes(kw))
    );
    this.pageIndex.set(1);
  }

  clearSearch() {
    this.keyword = '';
    this.applyFilters();
  }

  resetFilters() {
    this.keyword = '';
    this.status = '';
    this.applyFilters();
  }

  // Action methods
  createCourse() {
    this.router.navigate(['/teacher/course-creation']);
  }

  editCourse(id: string) {
    this.router.navigate(['/teacher/courses', id, 'edit']);
  }

  publish(id: string) {
    this.publishingId.set(id);
    this.api.publishCourse(id).subscribe({
      next: () => {
        // Update local state
        const apply = (list: CourseSummary[]) => 
          list.map(item => item.id === id ? { ...item, status: 'APPROVED' } : item);
        this.courses.set(apply(this.courses()));
        this.filtered.set(apply(this.filtered()));
      },
      complete: () => this.publishingId.set(null)
    });
  }

  deleteCourse(id: string, title: string) {
    const confirmed = confirm(
      `Bạn có chắc chắn muốn xóa khóa học "${title}"?\n\n` +
      `Tất cả dữ liệu liên quan (chương, bài học, bài tập,...) sẽ bị xóa vĩnh viễn.\n` +
      `Hành động này không thể hoàn tác!`
    );
    if (!confirmed) return;

    this.deletingId.set(id);
    this.api.deleteCourse(id).subscribe({
      next: () => {
        // Remove course from both master and filtered lists
        const removeFromList = (list: CourseSummary[]) => 
          list.filter(item => item.id !== id);
        this.courses.set(removeFromList(this.courses()));
        this.filtered.set(removeFromList(this.filtered()));
      },
      error: (err) => {
        alert('Không thể xóa khóa học: ' + (err?.message || 'Lỗi không xác định'));
      },
      complete: () => this.deletingId.set(null)
    });
  }

  // Helper methods
  getStatusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'DRAFT':
        return 'default';
      default:
        return 'info';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'Đang hoạt động';
      case 'PENDING':
        return 'Chờ duyệt';
      case 'DRAFT':
        return 'Nháp';
      default:
        return status;
    }
  }

  // Pagination methods
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

  trackById(_index: number, item: CourseSummary) {
    return item.id;
  }
}