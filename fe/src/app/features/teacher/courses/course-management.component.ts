import { Component, ChangeDetectionStrategy, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CourseApi } from '../../../api/client/course.api';
import { CourseSummary } from '../../../api/types/course.types';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-course-management',
  imports: [RouterModule, FormsModule, IconComponent],
  template: `
    <div class="min-h-screen bg-slate-50 p-6">
      <div class="max-w-[1400px] mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Khóa học của tôi</h1>
            <p class="text-sm text-gray-500 mt-1">Quản lý và theo dõi các khóa học bạn đang giảng dạy</p>
          </div>
          <a routerLink="/teacher/course-creation"
            class="px-5 py-2.5 bg-[#0056D2] text-white hover:bg-[#004BB5] rounded-lg transition-colors font-medium text-sm flex items-center gap-2 whitespace-nowrap shadow-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            Tạo khóa học
          </a>
        </div>

        <!-- Filter Bar -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm mb-5">
          <div class="px-5 py-3 flex flex-wrap gap-3 items-center">
            <!-- Delivery mode filter pills -->
            <div class="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
              <button (click)="setModeFilter('')"
                class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                [class]="modeFilter() === '' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
                Tất cả
              </button>
              <button (click)="setModeFilter('SELF_PACED')"
                class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                [class]="modeFilter() === 'SELF_PACED' ? 'bg-white text-[#0056D2] shadow-sm' : 'text-gray-500 hover:text-gray-700'">
                Khóa học
              </button>
              <button (click)="setModeFilter('INSTRUCTOR_LED')"
                class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                [class]="modeFilter() === 'INSTRUCTOR_LED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
                Lớp học
              </button>
            </div>

            <!-- Search -->
            <div class="flex-1 relative min-w-[220px]">
              <svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <input class="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-transparent text-sm"
                placeholder="Tìm kiếm theo mã hoặc tên khóa học..."
                [(ngModel)]="keyword"
                (keyup.enter)="applyFilters()" />
            </div>

            <!-- Status filter -->
            <select class="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-transparent text-sm min-w-[150px]"
              [(ngModel)]="status"
              (ngModelChange)="applyFilters()">
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">Nháp</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Bị từ chối</option>
            </select>

            <span class="text-xs text-gray-400">{{ total() }} khóa học</span>
          </div>
        </div>

        <!-- Table Card -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50/80">
                <th class="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Khóa học</th>
                <th class="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">Hình thức</th>
                <th class="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">Trạng thái</th>
                <th class="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[110px]">Học viên</th>
                <th class="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[110px]">Nội dung</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[220px]">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (c of paged(); track c.id; let i = $index) {
                <tr class="hover:bg-blue-50/40 transition-colors group">
                  <!-- Col 1: Course info (thumbnail + title + desc + category) -->
                  <td class="px-5 py-3">
                    <div class="flex items-center gap-3">
                      <!-- Thumbnail -->
                      <div class="w-[72px] h-[48px] rounded-lg overflow-hidden flex-shrink-0 border border-gray-200/60">
                        @if (c.thumbnailUrl) {
                          <img [src]="c.thumbnailUrl" [alt]="c.title" class="w-full h-full object-cover"/>
                        } @else {
                          <div class="w-full h-full flex items-center justify-center" [style.background]="getThumbnailGradient(c.title)">
                            <span class="text-base font-bold text-white/90">{{ c.title.charAt(0).toUpperCase() }}</span>
                          </div>
                        }
                      </div>
                      <!-- Info -->
                      <div class="min-w-0 flex-1">
                        <div class="text-sm font-semibold text-gray-900 line-clamp-1 break-words">{{ c.title }}</div>
                        @if (c.description) {
                          <div class="text-xs text-gray-500 line-clamp-1 mt-0.5">{{ c.description }}</div>
                        }
                        <div class="flex items-center gap-1.5 mt-1">
                          @if (c.categoryName) {
                            <span class="inline-flex items-center bg-blue-50 text-[#0056D2] text-[10px] font-medium px-1.5 py-px rounded">{{ c.categoryName }}</span>
                          }
                          @if (c.code) {
                            <span class="text-[10px] text-gray-400 font-mono">{{ c.code }}</span>
                          }
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Col 2: Delivery mode -->
                  <td class="px-4 py-3 text-center">
                    @if (c.deliveryMode === 'INSTRUCTOR_LED') {
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        <app-icon name="graduation-cap" size="xs" class="text-emerald-500"/>
                        Lớp học
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-[#0056D2]">
                        <app-icon name="video" size="xs" class="text-[#0056D2]"/>
                        Khóa học
                      </span>
                    }
                  </td>

                  <!-- Col 3: Status -->
                  <td class="px-4 py-3 text-center">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      [class]="getStatusBadgeClass(c.status)">
                      <span class="w-1.5 h-1.5 rounded-full mr-1" [class]="getStatusDotClass(c.status)"></span>
                      {{ getStatusLabel(c.status) }}
                    </span>
                  </td>

                  <!-- Col 4: Learner count (differentiated) -->
                  <td class="px-4 py-3 text-center">
                    @if (c.deliveryMode === 'INSTRUCTOR_LED') {
                      <div class="flex flex-col items-center">
                        <span class="text-sm font-semibold text-gray-800">
                          {{ c.enrolledCount || 0 }}@if (c.maxStudents) {<span class="text-gray-400 font-normal"> / {{ c.maxStudents }}</span>}
                        </span>
                        <span class="text-[10px] text-emerald-600 font-medium">sĩ số</span>
                      </div>
                    } @else {
                      <div class="flex flex-col items-center">
                        <span class="text-sm font-semibold text-gray-800">{{ c.enrolledCount || 0 }}</span>
                        <span class="text-[10px] text-[#0056D2] font-medium">người học</span>
                      </div>
                    }
                  </td>

                  <!-- Col 5: Content stats -->
                  <td class="px-4 py-3 text-center">
                    <div class="flex flex-col items-center gap-0.5 text-[11px] text-gray-500">
                      @if (c.sectionCount) {
                        <span>{{ c.sectionCount }} chương</span>
                      }
                      @if (c.lessonCount) {
                        <span>{{ c.lessonCount }} bài</span>
                      }
                      @if (!c.sectionCount && !c.lessonCount) {
                        <span class="text-gray-300">--</span>
                      }
                    </div>
                  </td>

                  <!-- Col 6: Actions (3-slot fixed layout for alignment) -->
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-1.5 justify-end">
                      <!-- Slot 1: Edit button (fixed width) -->
                      @if (c.status.toUpperCase() !== 'PENDING') {
                        <a [routerLink]="['/teacher/courses', c.id, 'editor']"
                          class="w-[52px] py-1 bg-[#0056D2] text-white hover:bg-[#004BB5] rounded-md transition-colors text-xs font-medium inline-flex items-center justify-center gap-1">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                          Sửa
                        </a>
                      } @else {
                        <button disabled
                          class="w-[52px] py-1 bg-gray-100 text-gray-400 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1 cursor-not-allowed">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                          Sửa
                        </button>
                      }

                      <!-- Slot 2: Context action (fixed width, preserves alignment) -->
                      <div class="w-[80px] flex justify-center">
                        @if (c.status === 'DRAFT' || c.status === 'REJECTED') {
                          <button
                            class="w-full py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors text-xs font-medium disabled:opacity-50 text-center"
                            [disabled]="submittingId() === c.id"
                            (click)="submitForApproval(c.id)">
                            Gửi duyệt
                          </button>
                        }
                        @if (c.status === 'PENDING') {
                          <button
                            class="w-full py-1 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-md transition-colors text-xs font-medium disabled:opacity-50 text-center"
                            [disabled]="cancellingId() === c.id"
                            (click)="cancelApproval(c.id)">
                            Hủy duyệt
                          </button>
                        }
                      </div>

                      <!-- Slot 3: Kebab menu (always same position) -->
                      <div class="relative">
                        <button (click)="toggleMenu(c.id)"
                          class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                          </svg>
                        </button>
                        @if (openMenuId() === c.id) {
                          <div class="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                            @if (c.status === 'REJECTED') {
                              <button (click)="viewReviewComment(c.id); closeMenu()"
                                class="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                <svg class="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                                </svg>
                                Xem phản hồi
                              </button>
                            }
                            <button (click)="deleteCourse(c.id, c.title); closeMenu()"
                              class="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                              [disabled]="deletingId() === c.id">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                              </svg>
                              Xóa khóa học
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          <!-- Empty State -->
          @if (paged().length === 0 && !error()) {
            <div class="text-center py-16">
              <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <app-icon name="file-text" size="xl" class="text-gray-300"/>
              </div>
              <h3 class="text-base font-medium text-gray-900 mb-1">Không tìm thấy khóa học</h3>
              <p class="text-sm text-gray-500 mb-5">Thử thay đổi bộ lọc hoặc tạo khóa học mới</p>
              <a routerLink="/teacher/course-creation"
                class="inline-flex items-center gap-2 px-4 py-2 bg-[#0056D2] text-white hover:bg-[#004BB5] rounded-lg transition-colors font-medium text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                Tạo khóa học
              </a>
            </div>
          }

          <!-- Error State -->
          @if (error()) {
            <div class="p-8 text-center">
              <svg class="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-red-600 font-medium text-sm">{{ error() }}</p>
            </div>
          }

          <!-- Pagination -->
          <div class="px-5 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <span>Hiển thị</span>
              <select class="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0056D2]"
                [ngModel]="pageSize()"
                (ngModelChange)="onPageSizeChange($event)">
                <option [ngValue]="5">5</option>
                <option [ngValue]="10">10</option>
                <option [ngValue]="20">20</option>
                <option [ngValue]="50">50</option>
              </select>
              <span>/ trang</span>
            </div>
            <div class="flex items-center gap-2">
              <button class="px-3 py-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                [disabled]="pageIndex() <= 1"
                (click)="prevPage()">
                Trước
              </button>
              <span class="text-xs text-gray-600 px-1">Trang {{ pageIndex() }} / {{ totalPages() }}</span>
              <button class="px-3 py-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                [disabled]="pageIndex() >= totalPages()"
                (click)="nextPage()">
                Sau
              </button>
            </div>
            <div class="text-xs text-gray-500">
              Tổng: <span class="font-semibold text-[#0056D2]">{{ total() }}</span> khóa học
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Click-outside overlay for kebab menu -->
    @if (openMenuId()) {
      <div class="fixed inset-0 z-10" (click)="closeMenu()"></div>
    }

    <!-- Review Comment Modal -->
    @if (showReviewModal()) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" (click)="closeReviewModal()">
        <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden" (click)="$event.stopPropagation()">
          <div class="p-5 border-b border-gray-100 flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900">Phản hồi từ Admin</h3>
          </div>
          <div class="p-5">
            <p class="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{{ reviewComment() }}</p>
          </div>
          <div class="p-4 bg-gray-50 flex justify-end">
            <button (click)="closeReviewModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">
              Đóng
            </button>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseManagementComponent {
  private api = inject(CourseApi);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private destroyRef = inject(DestroyRef);

  showReviewModal = signal(false);
  reviewComment = signal('');
  courses = signal<CourseSummary[]>([]);
  filtered = signal<CourseSummary[]>([]);
  error = signal('');
  keyword = '';
  status: '' | 'APPROVED' | 'PENDING' | 'DRAFT' | 'REJECTED' = '';
  modeFilter = signal<'' | 'SELF_PACED' | 'INSTRUCTOR_LED'>('');
  publishingId = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  submittingId = signal<string | null>(null);
  cancellingId = signal<string | null>(null);
  openMenuId = signal<string | null>(null);
  pageIndex = signal(1);
  pageSize = signal(10);
  paged = computed(() => {
    const start = (this.pageIndex() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  private readonly GRADIENTS = [
    'linear-gradient(135deg, #0056D2 0%, #4A90D9 100%)',
    'linear-gradient(135deg, #059669 0%, #34D399 100%)',
    'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
    'linear-gradient(135deg, #D97706 0%, #FBBF24 100%)',
    'linear-gradient(135deg, #DC2626 0%, #F87171 100%)',
  ];

  constructor() {
    this.api.myCourses().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: any) => {
        const list = res?.data || [];
        this.courses.set(list);
        this.filtered.set(list);
        this.pageIndex.set(1);
      },
      error: (err: any) => this.error.set(err?.message || 'Không tải được danh sách')
    });
  }

  setModeFilter(mode: '' | 'SELF_PACED' | 'INSTRUCTOR_LED') {
    this.modeFilter.set(mode);
    this.applyFilters();
  }

  applyFilters() {
    const kw = this.keyword.trim().toLowerCase();
    const mode = this.modeFilter();
    this.filtered.set(
      this.courses()
        .filter(c => !this.status || c.status === this.status)
        .filter(c => !mode || c.deliveryMode === mode)
        .filter(c => !kw || c.code?.toLowerCase().includes(kw) || c.title?.toLowerCase().includes(kw))
    );
    this.pageIndex.set(1);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700';
      case 'PENDING': return 'bg-amber-50 text-amber-700';
      case 'REJECTED': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-500';
      case 'PENDING': return 'bg-amber-500';
      case 'REJECTED': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'APPROVED': return 'Đã duyệt';
      case 'PENDING': return 'Chờ duyệt';
      case 'REJECTED': return 'Từ chối';
      default: return 'Nháp';
    }
  }

  getThumbnailGradient(title: string): string {
    const hash = title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return this.GRADIENTS[hash % this.GRADIENTS.length];
  }

  toggleMenu(id: string) {
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  closeMenu() {
    this.openMenuId.set(null);
  }

  publish(id: string) {
    this.publishingId.set(id);
    this.api.publishCourse(id).subscribe({
      next: () => {
        const apply = (list: CourseSummary[]) => list.map(item => item.id === id ? { ...item, status: 'APPROVED' } : item);
        this.courses.set(apply(this.courses()));
        this.filtered.set(apply(this.filtered()));
      },
      error: (err: any) => {
        this.toast.error('Xuất bản thất bại: ' + (err?.message || 'Lỗi không xác định'));
        this.publishingId.set(null);
      },
      complete: () => this.publishingId.set(null)
    });
  }

  submitForApproval(id: string) {
    this.submittingId.set(id);
    this.api.submitForApproval(id).subscribe({
      next: () => {
        const updateStatus = (list: CourseSummary[]) =>
          list.map(item => item.id === id ? { ...item, status: 'PENDING' } : item);
        this.courses.set(updateStatus(this.courses()));
        this.filtered.set(updateStatus(this.filtered()));
        this.toast.success('Khóa học đã được gửi để phê duyệt');
      },
      error: (err: any) => {
        this.toast.error('Không thể gửi khóa học: ' + (err?.message || 'Lỗi không xác định'));
      },
      complete: () => this.submittingId.set(null)
    });
  }

  async cancelApproval(id: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Hủy yêu cầu phê duyệt',
      message: 'Khóa học sẽ chuyển về trạng thái Nháp và bạn có thể chỉnh sửa lại.',
      variant: 'warning',
      confirmText: 'Hủy yêu cầu',
      cancelText: 'Quay lại'
    });
    if (!confirmed) return;

    this.cancellingId.set(id);
    this.api.cancelApprovalRequest(id).subscribe({
      next: () => {
        const updateStatus = (list: CourseSummary[]) =>
          list.map(item => item.id === id ? { ...item, status: 'DRAFT' } : item);
        this.courses.set(updateStatus(this.courses()));
        this.filtered.set(updateStatus(this.filtered()));
        this.toast.success('Đã hủy yêu cầu phê duyệt');
      },
      error: (err: any) => {
        this.toast.error('Không thể hủy yêu cầu: ' + (err?.message || 'Lỗi không xác định'));
      },
      complete: () => this.cancellingId.set(null)
    });
  }

  viewReviewComment(id: string) {
    this.api.getReviewStatus(id).subscribe({
      next: (res: any) => {
        const status = res?.data;
        if (status?.reviewComment) {
          const reviewer = status.reviewedByName ? `\nNgười duyệt: ${status.reviewedByName}` : '';
          const time = status.reviewedAt ? `\nThời gian: ${new Date(status.reviewedAt).toLocaleString('vi-VN')}` : '';
          this.reviewComment.set(`${status.reviewComment}${reviewer}${time}`);
          this.showReviewModal.set(true);
        } else {
          this.toast.info('Không có phản hồi từ admin');
        }
      },
      error: (err: any) => {
        this.toast.error('Không thể tải phản hồi: ' + (err?.message || 'Lỗi không xác định'));
      }
    });
  }

  closeReviewModal() {
    this.showReviewModal.set(false);
    this.reviewComment.set('');
  }

  async deleteCourse(id: string, title: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa khóa học',
      message: `Bạn có chắc chắn muốn xóa khóa học "${title}"?\n\nTất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác!`,
      variant: 'danger',
      confirmText: 'Xóa vĩnh viễn',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    this.deletingId.set(id);
    this.api.deleteCourse(id).subscribe({
      next: () => {
        const removeFromList = (list: CourseSummary[]) => list.filter(item => item.id !== id);
        this.courses.set(removeFromList(this.courses()));
        this.filtered.set(removeFromList(this.filtered()));
        this.toast.success('Đã xóa khóa học thành công');
      },
      error: (err: any) => {
        this.toast.error('Không thể xóa khóa học: ' + (err?.message || 'Lỗi không xác định'));
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
}
