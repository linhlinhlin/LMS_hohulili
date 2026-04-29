import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CourseApi } from '../../../api/client/course.api';
import { StudentApi, StudentEnrollmentStatus, StudentSummary } from '../../../api/client/student.api';
import { CourseSummary } from '../../../api/types/course.types';

type CourseTabKey = '' | 'APPROVED' | 'PENDING' | 'DRAFT';
type StudentTabKey = '' | StudentEnrollmentStatus;

@Component({
  selector: 'app-student-management',
  imports: [RouterModule, FormsModule, CommonModule, NgOptimizedImage],
  templateUrl: './student-management.component.html',
  styleUrls: ['./student-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentManagementComponent {
  private studentApi = inject(StudentApi);
  private courseApi = inject(CourseApi);
  private router = inject(Router);

  // ===== STATE =====
  keyword = '';
  status: StudentTabKey = '';
  courseKeyword = signal('');
  courseStatusFilter = signal<CourseTabKey>('');
  students = signal<StudentSummary[]>([]);
  courses = signal<CourseSummary[]>([]);
  error = signal('');
  loading = signal(false);
  selectedCourse = signal<CourseSummary | null>(null);
  pageIndex = signal(1);
  pageSize = signal(10);
  totalElements = signal(0);
  coursePageIndex = signal(1);
  coursePageSize = signal(10);

  private studentSearchTimer: ReturnType<typeof setTimeout> | null = null;

  // ===== TAB CONFIG =====
  readonly courseTabItems: { key: CourseTabKey; label: string }[] = [
    { key: '', label: 'Tất cả' },
    { key: 'APPROVED', label: 'Đã duyệt' },
    { key: 'PENDING', label: 'Chờ duyệt' },
    { key: 'DRAFT', label: 'Nháp' }
  ];

  readonly studentTabItems: { key: StudentTabKey; label: string }[] = [
    { key: '', label: 'Tất cả' },
    { key: 'ACTIVE', label: 'Đang học' },
    { key: 'COMPLETED', label: 'Hoàn thành' },
    { key: 'SUSPENDED', label: 'Tạm khóa' }
  ];

  // ===== COMPUTED =====
  filteredCourses = computed(() => {
    const kw = this.courseKeyword().trim().toLowerCase();
    const filter = this.courseStatusFilter();
    return this.courses().filter((course) => {
      const matchesKeyword =
        !kw || course.title.toLowerCase().includes(kw) || (course.code || '').toLowerCase().includes(kw);
      const matchesStatus =
        !filter || course.status === filter || (filter === 'APPROVED' && course.status === 'PUBLISHED');
      return matchesKeyword && matchesStatus;
    });
  });

  pagedCourses = computed(() => {
    const start = (this.coursePageIndex() - 1) * this.coursePageSize();
    return this.filteredCourses().slice(start, start + this.coursePageSize());
  });

  courseTotal = computed(() => this.filteredCourses().length);
  courseTotalPages = computed(() => Math.max(1, Math.ceil(this.courseTotal() / this.coursePageSize())));
  paged = computed(() => this.students());
  total = computed(() => this.totalElements());
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  constructor() {
    this.loadData();
  }

  // ===== TAB HELPERS =====
  getCourseTabCount(key: CourseTabKey): number {
    if (!key) return this.courses().length;
    return this.courses().filter((c) => {
      if (key === 'APPROVED') return c.status === 'APPROVED' || c.status === 'PUBLISHED';
      return c.status === key;
    }).length;
  }

  setCourseStatusFilter(status: CourseTabKey) {
    this.courseStatusFilter.set(status);
    this.coursePageIndex.set(1);
  }

  setStudentStatus(status: StudentTabKey) {
    this.status = status;
    this.applyFilters();
  }

  // ===== FILTER ACTIONS =====
  clearCourseFilters() {
    this.courseKeyword.set('');
    this.courseStatusFilter.set('');
    this.coursePageIndex.set(1);
  }

  clearStudentFilters() {
    this.keyword = '';
    this.status = '';
    this.applyFilters();
  }

  onCourseSearchInput(event: Event) {
    this.courseKeyword.set((event.target as HTMLInputElement).value ?? '');
    this.coursePageIndex.set(1);
  }

  onStudentSearchInput(event: Event) {
    this.keyword = (event.target as HTMLInputElement).value ?? '';
    if (this.studentSearchTimer) clearTimeout(this.studentSearchTimer);
    this.studentSearchTimer = setTimeout(() => this.applyFilters(), 400);
  }

  // ===== DATA LOADING =====
  private loadData() {
    this.error.set('');
    this.loading.set(true);
    this.courseApi.myCourses().subscribe({
      next: (response) => {
        this.courses.set(response.data ?? []);
        this.coursePageIndex.set(1);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Không thể tải danh sách khóa học.');
        this.loading.set(false);
      }
    });
  }

  private loadStudents() {
    const course = this.selectedCourse();
    if (!course) return;

    this.loading.set(true);
    this.error.set('');

    const params: { page: number; size: number; courseId: string; status?: string; search?: string } = {
      page: this.pageIndex() - 1,
      size: this.pageSize(),
      courseId: course.id
    };

    if (this.status) params.status = this.status;
    if (this.keyword.trim()) params.search = this.keyword.trim();

    this.studentApi.getTeacherStudents(params).subscribe({
      next: (response) => {
        const items = response.data ?? [];
        this.students.set(items);
        this.totalElements.set(response.pagination?.totalItems ?? items.length);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Không thể tải danh sách học viên. Vui lòng thử lại.');
        this.students.set([]);
        this.totalElements.set(0);
        this.loading.set(false);
      }
    });
  }

  // ===== STATUS HELPERS =====
  isApprovedStatus(status?: string): boolean {
    return status === 'APPROVED' || status === 'PUBLISHED';
  }

  getStatusLabel(status?: string): string {
    const labels: Record<string, string> = {
      PUBLISHED: 'Đã duyệt',
      APPROVED: 'Đã duyệt',
      PENDING: 'Chờ duyệt',
      DRAFT: 'Nháp',
      REJECTED: 'Bị từ chối',
      ARCHIVED: 'Lưu trữ'
    };
    return labels[status || ''] || status || 'Không xác định';
  }

  getStudentStatusLabel(status: StudentEnrollmentStatus): string {
    const labels: Record<StudentEnrollmentStatus, string> = {
      ACTIVE: 'Đang học',
      COMPLETED: 'Hoàn thành',
      DROPPED: 'Đã dừng',
      EXPIRED: 'Hết hạn',
      SUSPENDED: 'Tạm khóa'
    };
    return labels[status] || status;
  }

  // ===== FORMATTING =====
  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Hôm qua';
    if (days < 7) return `${days} ngày trước`;
    return d.toLocaleDateString('vi-VN');
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  onThumbError(event: Event) {
    (event.target as HTMLImageElement).src = '/icons/icon-192x192.png';
  }

  // ===== NAVIGATION =====
  viewCourseStudents(course: CourseSummary) {
    this.selectedCourse.set(course);
    this.pageIndex.set(1);
    this.loadStudents();
  }

  backToCourses() {
    this.selectedCourse.set(null);
    this.students.set([]);
    this.totalElements.set(0);
    this.pageIndex.set(1);
    this.keyword = '';
    this.status = '';
  }

  applyFilters() {
    this.pageIndex.set(1);
    this.loadStudents();
  }

  // ===== PAGINATION =====
  goToPage(page: number) {
    this.pageIndex.set(Math.min(Math.max(1, page), this.totalPages()));
    this.loadStudents();
  }

  nextPage() { this.goToPage(this.pageIndex() + 1); }
  prevPage() { this.goToPage(this.pageIndex() - 1); }

  onStudentPageSizeChange(value: number) {
    this.pageSize.set(Number(value));
    this.pageIndex.set(1);
    this.loadStudents();
  }

  goToCoursePage(page: number) {
    this.coursePageIndex.set(Math.min(Math.max(1, page), this.courseTotalPages()));
  }

  nextCoursePage() { this.goToCoursePage(this.coursePageIndex() + 1); }
  prevCoursePage() { this.goToCoursePage(this.coursePageIndex() - 1); }

  onCoursePageSizeChange(value: number) {
    this.coursePageSize.set(Number(value));
    this.coursePageIndex.set(1);
  }

  trackById(_index: number, student: StudentSummary): string {
    return student.id;
  }

  sendMessage(studentId: string) {
    this.router.navigate(['/teacher/students', studentId], { queryParams: { tab: 'messages' } });
  }

  onReload() {
    if (this.selectedCourse()) {
      this.loadStudents();
      return;
    }
    this.loadData();
  }
}
