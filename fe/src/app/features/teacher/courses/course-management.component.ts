import { Component, ChangeDetectionStrategy, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
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

        <!-- Course List -->
        <div class="courses-list mt-6">
          @for (c of paged(); track c.id) {
            <div class="course-card" (click)="onEdit(c.id)">
              <div class="course-card-body">
                <!-- Thumbnail -->
                <div class="course-thumbnail">
                  @if (c.thumbnailUrl) {
                    <img [src]="c.thumbnailUrl" [alt]="c.title" class="thumbnail-image" loading="lazy" />
                  } @else {
                    <div class="thumbnail-placeholder">
                      <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
                      </svg>
                    </div>
                  }
                </div>

                <!-- Info -->
                <div class="course-metadata">
                  <h3 class="course-title">{{ c.title }}</h3>
                  <div class="course-meta">
                    @if (c.code) {
                      <span class="meta-code">{{ c.code }}</span>
                      <span class="separator">&middot;</span>
                    }
                    <span>{{ c.enrolledCount || 0 }} học viên</span>
                    @if (c.sectionCount) {
                      <span class="separator">&middot;</span>
                      <span>{{ c.sectionCount }} chương</span>
                    }
                  </div>
                  <div class="course-badges">
                    <span class="delivery-badge" [class.class-mode]="c.deliveryMode === 'INSTRUCTOR_LED'">
                      @if (c.deliveryMode === 'INSTRUCTOR_LED') {
                        <app-icon name="graduation-cap" size="xs" class="mr-1 inline-block" />
                        Lớp học
                      } @else {
                        <app-icon name="video" size="xs" class="mr-1 inline-block" />
                        Khóa học
                      }
                    </span>
                  </div>
                </div>

                <!-- Status + Action -->
                <div class="course-actions">
                  <span [class]="getStatusClasses(c.status)">
                    {{ getStatusLabel(c.status) }}
                  </span>
                  <span class="course-date">Cập nhật: {{ formatDate(c.updatedAt || c.createdAt) }}</span>
                  
                  <div class="flex items-center gap-2">
                    <button class="edit-button" (click)="onEdit(c.id); $event.stopPropagation()">
                      Chỉnh sửa
                    </button>
                    
                    <!-- Kebab Menu -->
                    <div class="relative">
                      <button (click)="toggleMenu(c.id); $event.stopPropagation()"
                        class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                        <svg class="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                        </svg>
                      </button>
                      
                      @if (openMenuId() === c.id) {
                        <div class="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <button (click)="onStatistics(c.id); closeMenu()"
                            class="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium">
                            <app-icon name="bar-chart" size="xs" class="text-blue-500" />
                            Thống kê
                          </button>
                          
                          @if (c.status === 'DRAFT' || c.status === 'REJECTED') {
                            <button (click)="submitForApproval(c.id); closeMenu()"
                              class="w-full text-left px-3 py-2 text-xs text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 font-medium">
                              <app-icon name="check" size="xs" />
                              Gửi duyệt
                            </button>
                          }
                          
                          @if (c.status === 'PENDING') {
                            <button (click)="cancelApproval(c.id); closeMenu()"
                              class="w-full text-left px-3 py-2 text-xs text-amber-600 hover:bg-amber-50 flex items-center gap-2 font-medium">
                              <app-icon name="x" size="xs" />
                              Hủy duyệt
                            </button>
                          }
                          
                          @if (c.status === 'REJECTED') {
                            <button (click)="viewReviewComment(c.id); closeMenu()"
                              class="w-full text-left px-3 py-2 text-xs text-purple-600 hover:bg-purple-50 flex items-center gap-2 font-medium">
                              <app-icon name="info" size="xs" />
                              Xem phản hồi
                            </button>
                          }
                          
                          <div class="border-t border-gray-100 my-1"></div>
                          
                          <button (click)="deleteCourse(c.id, c.title); closeMenu()"
                            class="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium">
                            <app-icon name="trash" size="xs" />
                            Xóa khóa học
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Empty State -->
        @if (paged().length === 0 && !error()) {
          <div class="empty-state mt-8">
            <div class="empty-state-icon">
              <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
              </svg>
            </div>
            <h3 class="empty-state-title">Không tìm thấy khóa học</h3>
            <p class="empty-state-text">Thử thay đổi bộ lọc hoặc tạo khóa học mới để bắt đầu giảng dạy</p>
            <a routerLink="/teacher/course-creation" class="retry-link">Tạo khóa học ngay &rarr;</a>
          </div>
        }

        <!-- Pagination -->
        @if (total() > 0) {
          <div class="courses-footer mt-8">
            <div class="flex items-center gap-3">
              <span class="footer-summary">Hiển thị</span>
              <select class="border border-gray-200 rounded px-2 py-1 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                [ngModel]="pageSize()"
                (ngModelChange)="onPageSizeChange($event)">
                <option [ngValue]="5">5</option>
                <option [ngValue]="10">10</option>
                <option [ngValue]="20">20</option>
                <option [ngValue]="50">50</option>
              </select>
              <span class="footer-summary">dòng / trang</span>
            </div>
            
            <div class="flex items-center gap-4">
              <span class="footer-summary">Trang <strong>{{ pageIndex() }}</strong> / {{ totalPages() }}</span>
              <div class="flex items-center gap-1.5">
                <button class="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-500 disabled:opacity-30 transition-colors"
                  [disabled]="pageIndex() <= 1"
                  (click)="prevPage()">
                  <app-icon name="chevron-left" size="sm" />
                </button>
                <button class="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-500 disabled:opacity-30 transition-colors"
                  [disabled]="pageIndex() >= totalPages()"
                  (click)="nextPage()">
                  <app-icon name="chevron-right" size="sm" />
                </button>
              </div>
            </div>
            
            <div class="footer-summary">
              Tổng số <span class="text-blue-600 font-bold">{{ total() }}</span> khóa học
            </div>
          </div>
        }
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
  styles: [`
    .courses-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .course-card {
      background: white;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
      overflow: hidden;
      cursor: pointer;

      &:hover {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        border-color: #D1D5DB;

        .course-title {
          color: #0056D2;
        }
      }
    }

    .course-card-body {
      display: flex;
      gap: 16px;
      padding: 12px;
      align-items: center;
    }

    .course-thumbnail {
      width: 140px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      flex-shrink: 0;
      overflow: hidden;
      background: #F3F4F6;
      border: 1px solid #F3F4F6;
    }

    .thumbnail-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .thumbnail-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94A3B8;
      background: #F1F5F9;
    }

    .course-metadata {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .course-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      line-height: 1.4;
      transition: color 0.2s ease;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .course-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 12px;
      color: #6B7280;
    }

    .meta-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      color: #9CA3AF;
    }

    .separator {
      color: #D1D5DB;
    }

    .course-badges {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }

    .delivery-badge {
      font-size: 11px;
      font-weight: 600;
      color: #0056D2;
      background: #EFF6FF;
      padding: 2px 8px;
      border-radius: 9999px;

      &.class-mode {
        color: #059669;
        background: #ECFDF5;
      }
    }

    .course-actions {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      min-width: 160px;
      padding-left: 16px;
      border-left: 1px solid #F3F4F6;
    }

    .status-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.025em;

      &.badge-approved, &.badge-published {
        background: #ECFDF5;
        color: #059669;
      }

      &.badge-pending {
        background: #FFFBEB;
        color: #D97706;
      }

      &.badge-draft {
        background: #F3F4F6;
        color: #6B7280;
      }

      &.badge-rejected {
        background: #FEF2F2;
        color: #DC2626;
      }
    }

    .course-date {
      font-size: 11px;
      color: #9CA3AF;
    }

    .edit-button {
      padding: 6px 16px;
      border: 1px solid #0056D2;
      border-radius: 6px;
      background: white;
      color: #0056D2;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: #0056D2;
        color: white;
      }
    }

    /* Footer / Pagination Styles */
    .courses-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }

    .footer-summary {
      font-size: 13px;
      color: #6B7280;
    }

    /* Empty State Styles */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      background: white;
      border-radius: 12px;
      border: 2px dashed #E5E7EB;
      text-align: center;
    }

    .empty-state-icon {
      color: #D1D5DB;
      margin-bottom: 12px;
    }

    .empty-state-title {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 4px;
    }

    .empty-state-text {
      font-size: 14px;
      color: #6B7280;
      margin-bottom: 16px;
      max-width: 320px;
    }

    .retry-link {
      font-size: 14px;
      font-weight: 600;
      color: #0056D2;
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }

    @media (max-width: 768px) {
      .course-card-body {
        flex-direction: column;
        align-items: flex-start;
      }
      .course-thumbnail {
        width: 100%;
        height: 160px;
      }
      .course-actions {
        width: 100%;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        padding-left: 0;
        padding-top: 12px;
        border-left: none;
        border-top: 1px solid #F3F4F6;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseManagementComponent {
  private api = inject(CourseApi);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

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

  getStatusClasses(status: string): string {
    const m: Record<string, string> = {
      'APPROVED': 'badge-approved',
      'PUBLISHED': 'badge-published',
      'PENDING': 'badge-pending',
      'DRAFT': 'badge-draft',
      'REJECTED': 'badge-rejected',
      'ARCHIVED': 'badge-archived'
    };
    return 'status-badge ' + (m[status?.toUpperCase()] || 'badge-draft');
  }

  getStatusLabel(status: string): string {
    const m: Record<string, string> = {
      'APPROVED': 'Đã duyệt',
      'PUBLISHED': 'Xuất bản',
      'PENDING': 'Chờ duyệt',
      'DRAFT': 'Nháp',
      'REJECTED': 'Từ chối',
      'ARCHIVED': 'Lưu trữ'
    };
    return m[status?.toUpperCase()] || status;
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffDays === 0) return 'Hôm nay';
      if (diffDays === 1) return 'Hôm qua';
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return d.toLocaleDateString('vi-VN');
    } catch {
      return '';
    }
  }

  getThumbnailGradient(title: string): string {
    const hash = title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return this.GRADIENTS[hash % this.GRADIENTS.length];
  }

  onEdit(id: string) {
    this.router.navigate(['/teacher/courses', id, 'editor']);
  }

  onStatistics(id: string) {
    this.router.navigate(['/teacher/courses', id, 'statistics']);
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
