import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CourseApi } from '../../../api/client/course.api';
import { StudentApi, StudentEnrollmentStatus, StudentSummary } from '../../../api/client/student.api';
import { CourseSummary } from '../../../api/types/course.types';

@Component({
  selector: 'app-student-management',
  imports: [RouterModule, FormsModule, CommonModule, NgOptimizedImage],
  template: `
    <div class="students-page">
      <div class="page-inner">
        <div class="page-header">
          <div>
            @if (selectedCourse()) {
              <button class="back-btn" (click)="backToCourses()">Quay lại danh sách khóa học</button>
            }
            <h1 class="page-title">{{ selectedCourse() ? selectedCourse()!.title : 'Quản lý học viên' }}</h1>
            <p class="page-subtitle">
              {{ selectedCourse() ? ('Học viên đang ghi danh · ' + total() + ' người') : 'Theo dõi học viên theo từng khóa học' }}
            </p>
          </div>
        </div>

        @if (!selectedCourse()) {
          <div class="toolbar">
            <div class="tabs-container" role="tablist">
              <button class="tab-chip" [class.active]="courseStatusFilter() === ''" (click)="setCourseStatusFilter('')">Tất cả ({{ courseTotal() }})</button>
              <button class="tab-chip" [class.active]="courseStatusFilter() === 'APPROVED'" (click)="setCourseStatusFilter('APPROVED')">Đã duyệt</button>
              <button class="tab-chip" [class.active]="courseStatusFilter() === 'PENDING'" (click)="setCourseStatusFilter('PENDING')">Chờ duyệt</button>
              <button class="tab-chip" [class.active]="courseStatusFilter() === 'DRAFT'" (click)="setCourseStatusFilter('DRAFT')">Nháp</button>
            </div>
            <input class="search-input" placeholder="Tìm tên hoặc mã khóa học..." [ngModel]="courseKeyword()" (input)="onCourseSearchInput($event)" />
          </div>

          @if (loading()) {
            <div class="panel muted">Đang tải danh sách khóa học...</div>
          }

          @if (!loading() && error()) {
            <div class="panel error-state">
              <p>{{ error() }}</p>
              <button class="primary-btn" (click)="onReload()">Thử lại</button>
            </div>
          }

          @if (!loading() && !error() && courses().length === 0) {
            <div class="panel muted">Bạn chưa có khóa học nào.</div>
          }

          @if (!loading() && !error() && courses().length > 0) {
            @if (filteredCourses().length === 0) {
              <div class="panel muted">
                <p>Không tìm thấy khóa học phù hợp.</p>
                <button class="secondary-btn" (click)="clearCourseFilters()">Xóa bộ lọc</button>
              </div>
            } @else {
              <div class="courses-list">
                @for (course of pagedCourses(); track course.id) {
                  <div class="course-card" (click)="viewCourseStudents(course)">
                    <div class="course-thumb">
                      @if (course.thumbnailUrl) {
                        <img [ngSrc]="course.thumbnailUrl" width="160" height="90" [alt]="course.title" class="course-thumb-img" (error)="onThumbError($event)" />
                      } @else {
                        <div class="course-thumb-placeholder">Kh\u00f3a h\u1ecdc</div>
                      }
                    </div>
                    <div class="course-main">
                      <h3 class="course-title">{{ course.title }}</h3>
                      <p class="course-meta">
                        @if (course.code) {
                          <span>{{ course.code }}</span>
                          <span>·</span>
                        }
                        <span>{{ course.enrolledCount || 0 }} học viên</span>
                        @if (course.lessonCount) {
                          <span>·</span>
                          <span>{{ course.lessonCount }} bài học</span>
                        }
                      </p>
                      <span class="status-badge">{{ getStatusLabel(course.status) }}</span>
                    </div>
                    <div class="course-side">
                      <span class="course-date">{{ formatDate(course.updatedAt || course.createdAt) }}</span>
                      <button class="secondary-btn" (click)="viewCourseStudents(course); $event.stopPropagation()">Xem học viên</button>
                    </div>
                  </div>
                }
              </div>

              @if (courseTotal() > 0) {
                <div class="footer-bar">
                  <div class="footer-group">
                    <span>Hiển thị</span>
                    <select [ngModel]="coursePageSize()" (ngModelChange)="onCoursePageSizeChange($event)">
                      <option [ngValue]="5">5</option>
                      <option [ngValue]="10">10</option>
                      <option [ngValue]="20">20</option>
                      <option [ngValue]="50">50</option>
                    </select>
                    <span>dòng / trang</span>
                  </div>
                  <div class="footer-group">
                    <button class="secondary-btn" [disabled]="coursePageIndex() <= 1" (click)="prevCoursePage()">Trước</button>
                    <span>Trang {{ coursePageIndex() }} / {{ courseTotalPages() }}</span>
                    <button class="secondary-btn" [disabled]="coursePageIndex() >= courseTotalPages()" (click)="nextCoursePage()">Sau</button>
                  </div>
                  <div class="footer-group">Tổng số {{ courseTotal() }} khóa học</div>
                </div>
              }
            }
          }
        } @else {
          <div class="panel table-panel">
            <div class="toolbar compact-toolbar">
              <div class="tabs-container" role="tablist">
                <button class="tab-chip" [class.active]="status === ''" (click)="setStudentStatus('')">Tất cả ({{ total() }})</button>
                <button class="tab-chip" [class.active]="status === 'ACTIVE'" (click)="setStudentStatus('ACTIVE')">Đang học</button>
                <button class="tab-chip" [class.active]="status === 'COMPLETED'" (click)="setStudentStatus('COMPLETED')">Hoàn thành</button>
                <button class="tab-chip" [class.active]="status === 'SUSPENDED'" (click)="setStudentStatus('SUSPENDED')">Tạm khóa</button>
              </div>
              <input class="search-input" placeholder="Tìm tên hoặc email học viên..." [(ngModel)]="keyword" (keyup.enter)="applyFilters()" (input)="onStudentSearchInput($event)" />
            </div>

            <div class="overflow-x-auto">
              <table class="students-table">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Email</th>
                    <th>Tiến độ</th>
                    <th>Khóa học</th>
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @if (loading()) {
                    <tr>
                      <td colspan="6" class="muted center">Đang tải danh sách học viên...</td>
                    </tr>
                  }

                  @if (!loading() && error()) {
                    <tr>
                      <td colspan="6" class="center error-text">
                        {{ error() }}
                        <button class="inline-link" (click)="onReload()">Tải lại</button>
                      </td>
                    </tr>
                  }

                  @if (!loading() && !error() && paged().length === 0) {
                    <tr>
                      <td colspan="6" class="muted center">Không tìm thấy học viên nào.</td>
                    </tr>
                  }

                  @for (s of paged(); track trackById($index, s)) {
                    <tr>
                      <td class="strong">{{ s.name }}</td>
                      <td>{{ s.email }}</td>
                      <td>
                        <div class="progress-cell">
                          <div class="progress-track"><div class="progress-fill" [style.width.%]="s.progress"></div></div>
                          <span>{{ s.progress }}%</span>
                        </div>
                      </td>
                      <td class="center">{{ s.completedCourses }}/{{ s.totalCourses }}</td>
                      <td>
                        <span class="status-pill" [class.pill-active]="s.status === 'ACTIVE'" [class.pill-completed]="s.status === 'COMPLETED'" [class.pill-suspended]="s.status === 'SUSPENDED'" [class.pill-muted]="s.status === 'DROPPED' || s.status === 'EXPIRED'">
                          {{ getStudentStatusLabel(s.status) }}
                        </span>
                      </td>
                      <td class="actions-cell">
                        <a [routerLink]="['/teacher/students', s.id]" class="secondary-link">Chi tiết</a>
                        <button class="secondary-btn" (click)="sendMessage(s.id)">Nhắn tin</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          @if (total() > 0) {
            <div class="footer-bar">
              <div class="footer-group">
                <span>Hiển thị</span>
                <select [ngModel]="pageSize()" (ngModelChange)="onStudentPageSizeChange($event)">
                  <option [ngValue]="5">5</option>
                  <option [ngValue]="10">10</option>
                  <option [ngValue]="20">20</option>
                  <option [ngValue]="50">50</option>
                </select>
                <span>dòng / trang</span>
              </div>
              <div class="footer-group">
                <button class="secondary-btn" [disabled]="pageIndex() <= 1" (click)="prevPage()">Trước</button>
                <span>Trang {{ pageIndex() }} / {{ totalPages() }}</span>
                <button class="secondary-btn" [disabled]="pageIndex() >= totalPages()" (click)="nextPage()">Sau</button>
              </div>
              <div class="footer-group">Tổng: {{ total() }}</div>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [
    `
      .students-page { min-height: 100vh; background: #fafafa; }
      .page-inner { max-width: 1280px; margin: 0 auto; padding: 32px; }
      .page-header { margin-bottom: 24px; }
      .page-title { margin: 0; font-size: 28px; font-weight: 700; color: #111827; }
      .page-subtitle { margin: 6px 0 0; color: #6b7280; font-size: 14px; }
      .back-btn { border: 0; background: none; color: #0056d2; padding: 0; margin-bottom: 8px; font-size: 13px; cursor: pointer; }
      .toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
      .compact-toolbar { margin-bottom: 0; padding-bottom: 0; }
      .tabs-container { display: flex; gap: 8px; flex-wrap: wrap; }
      .tab-chip { border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
      .tab-chip.active { background: #0056d2; border-color: #0056d2; color: white; }
      .search-input { height: 40px; min-width: 260px; padding: 0 14px; border: 1px solid #e5e7eb; border-radius: 10px; background: white; }
      .search-input:focus { outline: none; border-color: #0056d2; box-shadow: 0 0 0 3px rgba(0, 86, 210, 0.1); }
      .panel { background: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; }
      .table-panel { padding: 0; overflow: hidden; }
      .muted { color: #6b7280; }
      .center { text-align: center; }
      .error-state { display: flex; flex-direction: column; gap: 12px; align-items: center; }
      .error-text { color: #dc2626; }
      .courses-list { display: flex; flex-direction: column; gap: 12px; }
      .course-card { display: flex; gap: 16px; align-items: center; padding: 14px; border: 1px solid #e5e7eb; border-radius: 14px; background: white; cursor: pointer; }
      .course-card:hover { border-color: #c7d2fe; box-shadow: 0 6px 20px rgba(15, 23, 42, 0.06); }
      .course-thumb { width: 160px; height: 90px; border-radius: 10px; overflow: hidden; background: #eff6ff; flex-shrink: 0; }
      .course-thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .course-thumb-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #0056d2; font-size: 12px; font-weight: 700; }
      .course-main { flex: 1; min-width: 0; }
      .course-title { margin: 0 0 4px; font-size: 16px; font-weight: 700; color: #111827; }
      .course-meta { display: flex; gap: 6px; flex-wrap: wrap; margin: 0 0 8px; color: #6b7280; font-size: 13px; }
      .course-side { display: flex; flex-direction: column; gap: 10px; align-items: flex-end; }
      .course-date { color: #9ca3af; font-size: 12px; }
      .status-badge, .status-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; }
      .status-badge { background: #eff6ff; color: #0056d2; }
      .status-pill { background: #f3f4f6; color: #4b5563; }
      .pill-active { background: #dcfce7; color: #166534; }
      .pill-completed { background: #dbeafe; color: #1d4ed8; }
      .pill-suspended { background: #fee2e2; color: #b91c1c; }
      .pill-muted { background: #f3f4f6; color: #4b5563; }
      .students-table { width: 100%; border-collapse: collapse; }
      .students-table th, .students-table td { padding: 16px 20px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: left; }
      .students-table th { background: #f9fafb; color: #6b7280; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
      .students-table tbody tr:last-child td { border-bottom: 0; }
      .strong { font-weight: 700; color: #111827; }
      .actions-cell { text-align: right; white-space: nowrap; }
      .secondary-link { color: #0056d2; font-weight: 600; margin-right: 12px; text-decoration: none; }
      .secondary-btn, .primary-btn { border-radius: 10px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
      .secondary-btn { border: 1px solid #d1d5db; background: white; color: #374151; }
      .secondary-btn:disabled { opacity: 0.4; cursor: default; }
      .primary-btn { border: 1px solid #0056d2; background: #0056d2; color: white; }
      .inline-link { margin-left: 8px; border: 0; background: none; color: #0056d2; cursor: pointer; }
      .progress-cell { display: flex; align-items: center; gap: 10px; }
      .progress-track { width: 72px; height: 8px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
      .progress-fill { height: 100%; background: #0056d2; border-radius: 999px; }
      .footer-bar { margin-top: 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 16px 20px; background: white; border: 1px solid #e5e7eb; border-radius: 14px; }
      .footer-group { display: flex; align-items: center; gap: 10px; color: #6b7280; font-size: 13px; }
      select { border: 1px solid #d1d5db; border-radius: 8px; padding: 6px 10px; background: white; }
      @media (max-width: 768px) {
        .page-inner { padding: 20px 16px; }
        .course-card { flex-direction: column; align-items: stretch; }
        .course-thumb { width: 100%; }
        .course-side { align-items: flex-start; }
        .search-input { min-width: 100%; width: 100%; }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentManagementComponent {
  private studentApi = inject(StudentApi);
  private courseApi = inject(CourseApi);
  private router = inject(Router);

  keyword = '';
  status: '' | StudentEnrollmentStatus = '';
  courseKeyword = signal('');
  courseStatusFilter = signal<'' | 'APPROVED' | 'PENDING' | 'DRAFT' | 'PUBLISHED'>('');
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

  filteredCourses = computed(() => {
    const kw = this.courseKeyword().trim().toLowerCase();
    const filter = this.courseStatusFilter();
    return this.courses().filter((course) => {
      const matchesKeyword = !kw || course.title.toLowerCase().includes(kw) || (course.code || '').toLowerCase().includes(kw);
      const matchesStatus = !filter || course.status === filter || (filter === 'APPROVED' && course.status === 'PUBLISHED');
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
  private studentSearchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadData();
  }

  setCourseStatusFilter(status: '' | 'APPROVED' | 'PENDING' | 'DRAFT' | 'PUBLISHED') {
    this.courseStatusFilter.set(status);
    this.coursePageIndex.set(1);
  }

  setStudentStatus(status: '' | StudentEnrollmentStatus) {
    this.status = status;
    this.applyFilters();
  }

  clearCourseFilters() {
    this.courseKeyword.set('');
    this.courseStatusFilter.set('');
    this.coursePageIndex.set(1);
  }

  clearCourseKeyword() {
    this.courseKeyword.set('');
    this.coursePageIndex.set(1);
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

  getStatusLabel(status?: string): string {
    const labels: Record<string, string> = {
      PUBLISHED: 'Đã xuất bản',
      APPROVED: 'Đã duyệt',
      PENDING: 'Chờ duyệt',
      DRAFT: 'Nháp',
      REJECTED: 'Từ chối',
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

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN');
  }

  onThumbError(event: Event) {
    (event.target as HTMLImageElement).src = '/icons/icon-192x192.png';
  }

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
