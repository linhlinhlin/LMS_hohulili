import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CourseApi } from '../../../api/client/course.api';
import {
  StudentApi,
  StudentEnrollmentStatus,
  StudentStatusCounts,
  StudentSummary
} from '../../../api/client/student.api';
import { CourseSummary } from '../../../api/types/course.types';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

type StudentTabKey = '' | StudentEnrollmentStatus;

const COURSE_PAGE_SIZE = 10;
const STUDENT_PAGE_SIZE = 10;

/**
 * SOTA reference (Coursera/Udemy/Canvas/Moodle): Quản lý học viên chỉ nên
 * liệt kê khóa học đã APPROVED/PUBLISHED. Course DRAFT/PENDING chưa publish
 * không thể có học viên ghi danh → hiển thị chúng làm rối UI.
 */
const VISIBLE_COURSE_STATUSES = new Set(['APPROVED', 'PUBLISHED']);

@Component({
  selector: 'app-student-management',
  imports: [RouterModule, FormsModule, CommonModule, NgOptimizedImage, PaginationComponent],
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
  students = signal<StudentSummary[]>([]);
  courses = signal<CourseSummary[]>([]);
  error = signal('');
  loading = signal(false);
  selectedCourse = signal<CourseSummary | null>(null);
  pageIndex = signal(1);
  totalElements = signal(0);
  coursePageIndex = signal(1);
  /**
   * Counts theo enrollment status cho course đang chọn — fetch riêng từ
   * BE qua `getTeacherStudentCounts()`. Null khi chưa load hoặc lỗi.
   */
  studentCounts = signal<StudentStatusCounts | null>(null);

  private studentSearchTimer: ReturnType<typeof setTimeout> | null = null;

  // ===== CONSTANTS =====
  readonly coursePageSize = COURSE_PAGE_SIZE;
  readonly studentPageSize = STUDENT_PAGE_SIZE;

  // ===== TAB CONFIG (student enrollment status only) =====
  readonly studentTabItems: { key: StudentTabKey; label: string }[] = [
    { key: '', label: 'Tất cả' },
    { key: 'ACTIVE', label: 'Đang học' },
    { key: 'COMPLETED', label: 'Hoàn thành' },
    { key: 'SUSPENDED', label: 'Tạm khóa' }
  ];

  // ===== COMPUTED =====
  /**
   * Course list cho Quản lý học viên: chỉ APPROVED/PUBLISHED, sort theo
   * enrolledCount DESC (course nhiều học viên lên đầu — Coursera pattern).
   */
  filteredCourses = computed(() => {
    const kw = this.courseKeyword().trim().toLowerCase();
    return this.courses()
      .filter((course) => VISIBLE_COURSE_STATUSES.has(course.status))
      .filter((course) => {
        if (!kw) return true;
        return (
          course.title.toLowerCase().includes(kw) ||
          (course.code || '').toLowerCase().includes(kw)
        );
      })
      .sort((a, b) => (b.enrolledCount ?? 0) - (a.enrolledCount ?? 0));
  });

  pagedCourses = computed(() => {
    const start = (this.coursePageIndex() - 1) * this.coursePageSize;
    return this.filteredCourses().slice(start, start + this.coursePageSize);
  });

  courseTotal = computed(() => this.filteredCourses().length);
  courseTotalPages = computed(() => Math.max(1, Math.ceil(this.courseTotal() / this.coursePageSize)));
  paged = computed(() => this.students());
  total = computed(() => this.totalElements());
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.studentPageSize)));

  constructor() {
    this.loadData();
  }

  // ===== TAB HELPERS =====
  /**
   * Tab count từ BE (`studentCounts` signal).
   * Trả về null khi đang loading → template hiện label-only,
   * tránh flicker "(0)" sai dữ liệu.
   */
  getStudentTabCount(key: StudentTabKey): number | null {
    const counts = this.studentCounts();
    if (!counts) return null;
    switch (key) {
      case '': return counts.total;
      case 'ACTIVE': return counts.active;
      case 'COMPLETED': return counts.completed;
      case 'SUSPENDED': return counts.suspended;
      default: return null;
    }
  }

  setStudentStatus(status: StudentTabKey) {
    this.status = status;
    this.applyFilters();
  }

  // ===== FILTER ACTIONS =====
  clearCourseSearch() {
    this.courseKeyword.set('');
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
      size: this.studentPageSize,
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
    this.studentCounts.set(null); // reset trước khi fetch counts mới
    this.loadStudents();
    this.loadStudentCounts(course.id);
  }

  backToCourses() {
    this.selectedCourse.set(null);
    this.students.set([]);
    this.totalElements.set(0);
    this.studentCounts.set(null);
    this.pageIndex.set(1);
    this.keyword = '';
    this.status = '';
  }

  /**
   * Fetch tab counts riêng — không block render chính.
   * Lỗi (nếu có) silent fail: tabs hiện label-only, không phá UX.
   */
  private loadStudentCounts(courseId: string) {
    this.studentApi.getTeacherStudentCounts(courseId).subscribe({
      next: (counts) => this.studentCounts.set(counts),
      error: () => this.studentCounts.set(null)
    });
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

  goToCoursePage(page: number) {
    this.coursePageIndex.set(Math.min(Math.max(1, page), this.courseTotalPages()));
  }

  trackById(_index: number, student: StudentSummary): string {
    return student.id;
  }

  sendMessage(studentId: string) {
    this.router.navigate(['/teacher/students', studentId], { queryParams: { tab: 'messages' } });
  }

  onReload() {
    const course = this.selectedCourse();
    if (course) {
      this.loadStudents();
      this.loadStudentCounts(course.id);
      return;
    }
    this.loadData();
  }
}
