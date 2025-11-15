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
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Khóa học của tôi</h1>
        <a routerLink="/teacher/course-creation" 
           class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors font-semibold text-sm">
          Tạo khóa học
        </a>
      </div>

      <!-- Simple search bar -->
      <div class="mb-4 flex gap-3 items-center">
        <input class="border border-gray-300 rounded px-4 py-2 flex-1 focus:outline-none focus:border-blue-600 text-base" 
               placeholder="Tìm kiếm theo mã hoặc tên khóa học..." 
               [(ngModel)]="keyword"
               (keyup.enter)="applyFilters()" />
        <select class="border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-blue-600 text-base" [(ngModel)]="status">
          <option value="">Tất cả trạng thái</option>
          <option value="APPROVED">APPROVED</option>
          <option value="PENDING">PENDING</option>
          <option value="DRAFT">DRAFT</option>
        </select>
        <button class="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded transition-colors font-semibold text-sm" 
                (click)="applyFilters()">
          Lọc
        </button>
      </div>

      <div class="bg-white border border-gray-200 rounded">
        <table class="min-w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Mã</th>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Tên</th>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Trạng thái</th>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Học viên</th>
              <th class="px-6 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr *ngFor="let c of paged(); trackBy: trackById" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ c.code }}</td>
              <td class="px-6 py-4 text-sm text-gray-900">{{ c.title }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span *ngIf="c.status === 'APPROVED'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Đã xuất bản
                </span>
                <span *ngIf="c.status === 'PENDING'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Chờ duyệt
                </span>
                <span *ngIf="c.status === 'DRAFT'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Nháp
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ c.enrolledCount || 0 }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <div class="inline-flex gap-2">
                  <a [routerLink]="['/teacher/courses', c.id, 'edit']" 
                     class="px-3 py-1 shadow-sm text-blue-600 hover:shadow-md hover:text-blue-700 transition-all duration-200">
                    Sửa
                  </a>
                  <button *ngIf="c.status !== 'APPROVED'"
                          class="px-3 py-1 shadow-sm text-green-600 hover:shadow-md hover:text-green-700 transition-all duration-200 disabled:opacity-50"
                          [disabled]="publishingId() === c.id"
                          (click)="publish(c.id)">
                    Xuất bản
                  </button>
                  <button class="px-3 py-1 shadow-sm text-red-600 hover:shadow-md hover:text-red-700 transition-all duration-200 disabled:opacity-50"
                          [disabled]="deletingId() === c.id"
                          (click)="deleteCourse(c.id, c.title)">
                    Xóa
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div class="p-6 text-red-600 text-center text-base" *ngIf="error()">{{ error() }}</div>
      </div>

      <!-- Pagination -->
      <div class="mt-4 flex items-center justify-between">
        <div class="flex items-center gap-2 text-base text-gray-600">
          <span>Hiển thị</span>
          <select class="border border-gray-300 rounded px-2 py-1" [ngModel]="pageSize()" (ngModelChange)="onPageSizeChange($event)">
            <option [ngValue]="5">5</option>
            <option [ngValue]="10">10</option>
            <option [ngValue]="20">20</option>
          </select>
          <span>mỗi trang</span>
        </div>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50 text-base font-medium" 
                  [disabled]="pageIndex() <= 1" 
                  (click)="prevPage()">
            Trước
          </button>
          <span class="text-base text-gray-700 font-medium">Trang {{ pageIndex() }} / {{ totalPages() }}</span>
          <button class="px-3 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50 text-base font-medium" 
                  [disabled]="pageIndex() >= totalPages()" 
                  (click)="nextPage()">
            Sau
          </button>
        </div>
        <div class="text-base text-gray-600 font-medium">Tổng: {{ total() }}</div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseManagementComponent {
  private api = inject(CourseApi);
  courses = signal<CourseSummary[]>([]);
  filtered = signal<CourseSummary[]>([]);
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
      next: (res: any) => {
        const list = res?.data || [];
        this.courses.set(list);
        this.filtered.set(list);
        this.pageIndex.set(1);
      },
      error: (err: any) => this.error.set(err?.message || 'Không tải được danh sách')
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
      error: (err: any) => {
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