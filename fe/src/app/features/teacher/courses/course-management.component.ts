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
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Khóa học của tôi</h1>
          <p class="text-gray-600 mt-1">Quản lý và theo dõi các khóa học bạn đang giảng dạy</p>
        </div>

        <!-- Search & Filter Card -->
        <div class="bg-white rounded-lg shadow mb-6">
          <div class="p-4 flex gap-3 items-center">
            <div class="flex-1 relative">
              <svg class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <input class="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50" 
                     placeholder="Tìm kiếm theo mã hoặc tên khóa học..." 
                     [(ngModel)]="keyword"
                     (keyup.enter)="applyFilters()" />
            </div>
            <select class="border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50 min-w-[160px]" 
                    [(ngModel)]="status"
                    (ngModelChange)="applyFilters()">
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">Nháp</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Bị từ chối</option>
            </select>
            <a routerLink="/teacher/course-creation" 
               class="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium text-sm flex items-center gap-2 whitespace-nowrap">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              Tạo khóa học
            </a>
          </div>
        </div>

        <!-- Courses Table Card -->
          <div class="bg-white rounded-lg shadow overflow-hidden">
            <table class="min-w-full">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">STT</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên khóa học</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-64">Trạng thái</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Học viên</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-64">Thao tác</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr *ngFor="let c of paged(); let i = index; trackBy: trackById" class="hover:bg-blue-50/50 transition-colors">
                  <td class="px-6 py-4 text-sm text-gray-500 font-medium text-center">
                    {{ (pageIndex() - 1) * pageSize() + i + 1 }}
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-start gap-3">
                      <div class="min-w-0">
                        <div class="text-sm font-semibold text-gray-900 truncate">{{ c.title }}</div>
                        <div class="text-xs text-gray-500 mt-0.5" *ngIf="c.description">{{ c.description.substring(0, 80) }}{{ c.description.length > 80 ? '...' : '' }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span *ngIf="c.status === 'APPROVED'" class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <span class="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                      Đã duyệt
                    </span>
                    <span *ngIf="c.status === 'PENDING'" class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                      Chờ duyệt
                    </span>
                    <span *ngIf="c.status === 'DRAFT'" class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <span class="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5"></span>
                      Nháp
                    </span>
                    <span *ngIf="c.status === 'REJECTED'" class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      <span class="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
                      Bị từ chối
                    </span>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <div class="inline-flex items-center gap-1.5 text-sm text-gray-700 w-full">
                      <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path>
                      </svg>
                      <span class="font-semibold ml-auto">{{ c.enrolledCount || 0 }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center justify-center gap-2 flex-wrap">
                      <!-- Edit button - disabled for PENDING courses -->
                      <a *ngIf="c.status?.toUpperCase() !== 'PENDING'" 
                         [routerLink]="['/teacher/courses', c.id, 'edit']" 
                         class="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors text-xs font-medium inline-flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                        Sửa
                      </a>
                      <button *ngIf="c.status?.toUpperCase() === 'PENDING'" 
                              disabled
                              title="Không thể chỉnh sửa khóa học đang chờ duyệt"
                              class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-md text-xs font-medium inline-flex items-center gap-1 cursor-not-allowed">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                        Sửa
                      </button>

                      <!-- Submit for Approval button - show for DRAFT and REJECTED -->
                      <button *ngIf="c.status === 'DRAFT' || c.status === 'REJECTED'"
                              class="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-md transition-colors text-xs font-medium disabled:opacity-50 inline-flex items-center gap-1"
                              [disabled]="submittingId() === c.id"
                              (click)="submitForApproval(c.id)">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Gửi duyệt
                      </button>

                      <!-- Cancel Approval button - show for PENDING -->
                      <button *ngIf="c.status === 'PENDING'"
                              class="px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-md transition-colors text-xs font-medium disabled:opacity-50 inline-flex items-center gap-1"
                              [disabled]="cancellingId() === c.id"
                              (click)="cancelApproval(c.id)">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                        Hủy yêu cầu
                      </button>

                      <!-- View Review Comment button - show for REJECTED -->
                      <button *ngIf="c.status === 'REJECTED'"
                              class="px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-md transition-colors text-xs font-medium inline-flex items-center gap-1"
                              (click)="viewReviewComment(c.id)">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                        </svg>
                        Xem phản hồi
                      </button>

                      <!-- Delete button -->
                      <button class="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors text-xs font-medium disabled:opacity-50 inline-flex items-center gap-1"
                              [disabled]="deletingId() === c.id"
                              (click)="deleteCourse(c.id, c.title)">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
        
        <!-- Empty State -->
        <div *ngIf="paged().length === 0 && !error()" class="text-center py-12">
          <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Không tìm thấy khóa học</h3>
          <p class="text-gray-500 mb-4">Thử thay đổi bộ lọc hoặc tạo khóa học mới</p>
        </div>

        <!-- Error State -->
        <div class="p-8 text-center" *ngIf="error()">
          <svg class="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-red-600 font-medium">{{ error() }}</p>
        </div>

        <!-- Pagination -->
        <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div class="flex items-center gap-2 text-sm text-gray-600">
            <span>Hiển thị</span>
            <select class="border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    [ngModel]="pageSize()" 
                    (ngModelChange)="onPageSizeChange($event)">
              <option [ngValue]="5">5</option>
              <option [ngValue]="10">10</option>
              <option [ngValue]="20">20</option>
              <option [ngValue]="50">50</option>
            </select>
            <span>/ trang</span>
          </div>
          <div class="flex items-center gap-3">
            <button class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center gap-2" 
                    [disabled]="pageIndex() <= 1" 
                    (click)="prevPage()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Trước
            </button>
            <span class="text-sm text-gray-700 font-medium px-3">Trang {{ pageIndex() }} / {{ totalPages() }}</span>
            <button class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center gap-2" 
                    [disabled]="pageIndex() >= totalPages()" 
                    (click)="nextPage()">
              Sau
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
          <div class="text-sm text-gray-600 font-medium">
            Tổng: <span class="text-blue-600 font-semibold">{{ total() }}</span> khóa học
          </div>
        </div>
      </div>
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
  status: '' | 'APPROVED' | 'PENDING' | 'DRAFT' | 'REJECTED' = '';
  publishingId = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  submittingId = signal<string | null>(null);
  cancellingId = signal<string | null>(null);
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

  submitForApproval(id: string) {
    this.submittingId.set(id);
    this.api.submitForApproval(id).subscribe({
      next: (res: any) => {
        // Update course status to PENDING in both lists
        const updateStatus = (list: CourseSummary[]) => 
          list.map(item => item.id === id ? { ...item, status: 'PENDING' } : item);
        this.courses.set(updateStatus(this.courses()));
        this.filtered.set(updateStatus(this.filtered()));
        alert('Khóa học đã được gửi để phê duyệt');
      },
      error: (err: any) => {
        alert('Không thể gửi khóa học: ' + (err?.error?.message || err?.message || 'Lỗi không xác định'));
      },
      complete: () => this.submittingId.set(null)
    });
  }

  cancelApproval(id: string) {
    const confirmed = confirm('Bạn có chắc chắn muốn hủy yêu cầu phê duyệt?\n\nKhóa học sẽ chuyển về trạng thái Nháp và bạn có thể chỉnh sửa lại.');
    if (!confirmed) return;

    this.cancellingId.set(id);
    this.api.cancelApprovalRequest(id).subscribe({
      next: (res: any) => {
        // Update course status to DRAFT in both lists
        const updateStatus = (list: CourseSummary[]) => 
          list.map(item => item.id === id ? { ...item, status: 'DRAFT' } : item);
        this.courses.set(updateStatus(this.courses()));
        this.filtered.set(updateStatus(this.filtered()));
        alert('Đã hủy yêu cầu phê duyệt');
      },
      error: (err: any) => {
        alert('Không thể hủy yêu cầu: ' + (err?.error?.message || err?.message || 'Lỗi không xác định'));
      },
      complete: () => this.cancellingId.set(null)
    });
  }

  viewReviewComment(id: string) {
    this.api.getReviewStatus(id).subscribe({
      next: (res: any) => {
        const status = res?.data;
        if (status?.reviewComment) {
          alert(`Phản hồi từ Admin:\n\n${status.reviewComment}\n\n${status.reviewedByName ? `Người duyệt: ${status.reviewedByName}` : ''}\n${status.reviewedAt ? `Thời gian: ${new Date(status.reviewedAt).toLocaleString('vi-VN')}` : ''}`);
        } else {
          alert('Không có phản hồi từ admin');
        }
      },
      error: (err: any) => {
        alert('Không thể tải phản hồi: ' + (err?.error?.message || err?.message || 'Lỗi không xác định'));
      }
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