import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CourseApi } from '../../../api/client/course.api';
import { CourseSummary } from '../../../api/types/course.types';

@Component({
  selector: 'app-course-management',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Khóa học của tôi</h1>
        <a routerLink="/teacher/course-creation" class="px-4 py-2 bg-blue-600 text-white rounded">Tạo khóa học</a>
      </div>

      <div class="bg-white rounded-lg shadow p-4 flex flex-wrap gap-3 items-center">
        <input class="border rounded px-3 py-2 w-64" placeholder="Tìm kiếm theo mã hoặc tên" [(ngModel)]="keyword" />
        <select class="border rounded px-3 py-2" [(ngModel)]="status">
          <option value="">Tất cả trạng thái</option>
          <option value="APPROVED">APPROVED</option>
          <option value="PENDING">PENDING</option>
          <option value="DRAFT">DRAFT</option>
        </select>
        <button class="px-4 py-2 border rounded" (click)="applyFilters()">Lọc</button>
      </div>

      <div class="bg-white rounded-lg shadow">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Mã</th>
              <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Tên</th>
              <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
              <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Học viên</th>
              <th class="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let c of paged(); trackBy: trackById">
              <td class="px-6 py-5 whitespace-nowrap font-mono text-base md:text-lg text-gray-900">{{ c.code }}</td>
              <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-900">{{ c.title }}</td>
              <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      [class.bg-green-100]="c.status === 'APPROVED'"
                      [class.text-green-800]="c.status === 'APPROVED'"
                      [class.bg-yellow-100]="c.status !== 'APPROVED'"
                      [class.text-yellow-800]="c.status !== 'APPROVED'">
                  {{ c.status }}
                </span>
              </td>
              <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-900">{{ c.enrolledCount }}</td>
              <td class="px-6 py-5 whitespace-nowrap text-right text-base md:text-lg">
                <div class="inline-flex items-center gap-3">
                  <a [routerLink]="['/teacher/courses', c.id, 'edit']" class="text-indigo-600 hover:text-indigo-900">Chỉnh sửa</a>
                  <button *ngIf="c.status !== 'APPROVED'"
                          class="px-3 py-1 border rounded text-sm disabled:opacity-50"
                          [disabled]="publishingId() === c.id"
                          (click)="publish(c.id)">
                    {{ publishingId() === c.id ? 'Đang xuất bản...' : 'Xuất bản' }}
                  </button>
                  <button class="px-3 py-1 bg-red-500 text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-red-600 transition-colors"
                          [disabled]="deletingId() === c.id"
                          (click)="deleteCourse(c.id, c.title)">
                    <span *ngIf="deletingId() === c.id">⏳</span>
                    <span *ngIf="deletingId() !== c.id">🗑️</span>
                    {{ deletingId() === c.id ? 'Đang xóa...' : 'Xóa' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="p-6 text-gray-500" *ngIf="!loading() && filtered().length === 0">Không có kết quả.</div>
        <div class="p-6 text-gray-500" *ngIf="loading()">Đang tải...</div>
        <div class="p-6 text-red-600" *ngIf="error()">{{ error() }}</div>
      </div>

      <!-- Pagination Controls -->
      <div class="bg-white rounded-lg shadow p-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Hiển thị</span>
          <select class="border rounded px-2 py-1" [ngModel]="pageSize()" (ngModelChange)="onPageSizeChange($event)">
            <option [ngValue]="5">5</option>
            <option [ngValue]="10">10</option>
            <option [ngValue]="20">20</option>
          </select>
          <span class="text-sm text-gray-600">mỗi trang</span>
        </div>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1 border rounded disabled:opacity-50" [disabled]="pageIndex() <= 1" (click)="prevPage()">Trước</button>
          <span class="text-sm text-gray-700">Trang {{ pageIndex() }} / {{ totalPages() }}</span>
          <button class="px-3 py-1 border rounded disabled:opacity-50" [disabled]="pageIndex() >= totalPages()" (click)="nextPage()">Sau</button>
        </div>
        <div class="text-sm text-gray-600">Tổng: {{ total() }}</div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseManagementComponent {
  private api = inject(CourseApi);
  courses = signal<CourseSummary[]>([]);
  filtered = signal<CourseSummary[]>([]);
  loading = signal(true);
  error = signal('');
  keyword = '';
  status: '' | 'APPROVED' | 'PENDING' | 'DRAFT' = '';
  publishingId = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  pageIndex = signal(1);
  pageSize = signal(10);
  paged = computed(() => {
    const start = (this.pageIndex() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  constructor() {
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

  applyFilters() {
    const kw = this.keyword.trim().toLowerCase();
    this.filtered.set(
      this.courses()
        .filter(c => !this.status || c.status === this.status)
        .filter(c => !kw || c.code?.toLowerCase().includes(kw) || c.title?.toLowerCase().includes(kw))
    );
    this.pageIndex.set(1);
  }

  publish(id: string) {
    this.publishingId.set(id);
    this.api.publishCourse(id).subscribe({
      next: () => {
        // reflect change locally in both master and filtered lists
        const apply = (list: CourseSummary[]) => list.map(item => item.id === id ? { ...item, status: 'APPROVED' } : item);
        this.courses.set(apply(this.courses()));
        this.filtered.set(apply(this.filtered()));
      },
      complete: () => this.publishingId.set(null)
    });
  }

  deleteCourse(id: string, title: string) {
    const confirmed = confirm(`Bạn có chắc chắn muốn xóa khóa học "${title}"?\n\nTất cả dữ liệu liên quan (chương, bài học, bài tập,...) sẽ bị xóa vĩnh viễn.\nHành động này không thể hoàn tác!`);
    if (!confirmed) return;

    this.deletingId.set(id);
    this.api.deleteCourse(id).subscribe({
      next: () => {
        // Remove course from both master and filtered lists
        const removeFromList = (list: CourseSummary[]) => list.filter(item => item.id !== id);
        this.courses.set(removeFromList(this.courses()));
        this.filtered.set(removeFromList(this.filtered()));
      },
      error: (err) => {
        alert('Không thể xóa khóa học: ' + (err?.message || 'Lỗi không xác định'));
      },
      complete: () => this.deletingId.set(null)
    });
  }

  total = computed(() => this.filtered().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  goToPage(n: number) { this.pageIndex.set(Math.min(Math.max(1, n), this.totalPages())); }
  nextPage() { this.goToPage(this.pageIndex() + 1); }
  prevPage() { this.goToPage(this.pageIndex() - 1); }
  onPageSizeChange(v?: any) { if (v !== undefined) this.pageSize.set(Number(v)); this.goToPage(1); }

  trackById(_index: number, item: CourseSummary) { return item.id; }
}