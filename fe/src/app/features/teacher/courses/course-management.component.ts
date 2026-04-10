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
    <div class="courses-page">
      <div class="page-inner">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-title-group">
            <h1 class="page-title">Khóa học của tôi</h1>
            <p class="page-subtitle">Quản lý và theo dõi các khóa học đang giảng dạy</p>
          </div>
          <a routerLink="/teacher/course-creation" class="cta-button">
            <svg class="cta-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Tạo khóa học
          </a>
        </div>

        <!-- Search + Create (same row) -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center mb-6">
          <div class="search-box flex-1 sm:max-w-md">
            <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input class="search-input"
              placeholder="Tìm theo tên hoặc mã khóa học..."
              [(ngModel)]="keyword"
              (input)="applyFilters()"
              (keyup.enter)="applyFilters()" />
          </div>
        </div>

        <!-- Filter Tabs — 5 tabs inline Tailwind (matching dashboard + assessments) -->
        <div class="flex flex-wrap items-center gap-2 mb-6" role="tablist">
          <button type="button" role="tab"
            [attr.aria-selected]="activeFilter() === 'ALL'"
            class="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors"
            [class.bg-[#0056D2]]="activeFilter() === 'ALL'"
            [class.text-white]="activeFilter() === 'ALL'"
            [class.border-[#0056D2]]="activeFilter() === 'ALL'"
            [class.bg-white]="activeFilter() !== 'ALL'"
            [class.text-gray-700]="activeFilter() !== 'ALL'"
            [class.border-gray-200]="activeFilter() !== 'ALL'"
            [class.hover:border-gray-300]="activeFilter() !== 'ALL'"
            (click)="setFilter('ALL')">
            Tất cả ({{ courses().length }})
          </button>
          <button type="button" role="tab"
            [attr.aria-selected]="activeFilter() === 'APPROVED'"
            class="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors"
            [class.bg-[#0056D2]]="activeFilter() === 'APPROVED'"
            [class.text-white]="activeFilter() === 'APPROVED'"
            [class.border-[#0056D2]]="activeFilter() === 'APPROVED'"
            [class.bg-white]="activeFilter() !== 'APPROVED'"
            [class.text-gray-700]="activeFilter() !== 'APPROVED'"
            [class.border-gray-200]="activeFilter() !== 'APPROVED'"
            [class.hover:border-gray-300]="activeFilter() !== 'APPROVED'"
            (click)="setFilter('APPROVED')">
            Đã duyệt ({{ countByFilter('APPROVED') }})
          </button>
          <button type="button" role="tab"
            [attr.aria-selected]="activeFilter() === 'EDITING'"
            class="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors"
            [class.bg-[#0056D2]]="activeFilter() === 'EDITING'"
            [class.text-white]="activeFilter() === 'EDITING'"
            [class.border-[#0056D2]]="activeFilter() === 'EDITING'"
            [class.bg-white]="activeFilter() !== 'EDITING'"
            [class.text-gray-700]="activeFilter() !== 'EDITING'"
            [class.border-gray-200]="activeFilter() !== 'EDITING'"
            [class.hover:border-gray-300]="activeFilter() !== 'EDITING'"
            (click)="setFilter('EDITING')">
            Đang soạn ({{ countByFilter('EDITING') }})
          </button>
          <button type="button" role="tab"
            [attr.aria-selected]="activeFilter() === 'PENDING'"
            class="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors"
            [class.bg-[#0056D2]]="activeFilter() === 'PENDING'"
            [class.text-white]="activeFilter() === 'PENDING'"
            [class.border-[#0056D2]]="activeFilter() === 'PENDING'"
            [class.bg-white]="activeFilter() !== 'PENDING'"
            [class.text-gray-700]="activeFilter() !== 'PENDING'"
            [class.border-gray-200]="activeFilter() !== 'PENDING'"
            [class.hover:border-gray-300]="activeFilter() !== 'PENDING'"
            (click)="setFilter('PENDING')">
            Chờ duyệt ({{ countByFilter('PENDING') }})
          </button>
          <button type="button" role="tab"
            [attr.aria-selected]="activeFilter() === 'INSTRUCTOR_LED'"
            class="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors"
            [class.bg-[#0056D2]]="activeFilter() === 'INSTRUCTOR_LED'"
            [class.text-white]="activeFilter() === 'INSTRUCTOR_LED'"
            [class.border-[#0056D2]]="activeFilter() === 'INSTRUCTOR_LED'"
            [class.bg-white]="activeFilter() !== 'INSTRUCTOR_LED'"
            [class.text-gray-700]="activeFilter() !== 'INSTRUCTOR_LED'"
            [class.border-gray-200]="activeFilter() !== 'INSTRUCTOR_LED'"
            [class.hover:border-gray-300]="activeFilter() !== 'INSTRUCTOR_LED'"
            (click)="setFilter('INSTRUCTOR_LED')">
            Lớp học ({{ countByFilter('INSTRUCTOR_LED') }})
          </button>
        </div>

        <!-- Course List -->
        <div class="courses-list mt-6">
          @for (c of visible(); track c.id) {
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
                  <span class="status-badge"
                        [class.badge-approved]="c.status === 'APPROVED'"
                        [class.badge-pending]="c.status === 'PENDING'"
                        [class.badge-draft]="c.status === 'DRAFT'"
                        [class.badge-rejected]="c.status === 'REJECTED'">
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
        @if (filtered().length === 0 && !error()) {
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

        <!-- Load More (matching dashboard + student + UX Guidelines) -->
        @if (hasMore()) {
          <div class="pt-6 text-center space-y-2">
            <button type="button" (click)="loadMore()"
              class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-[#0056D2] hover:text-[#0056D2] hover:bg-[#f0f7ff]">
              Xem thêm {{ remainingCount() }} khóa học
            </button>
            <p class="text-xs text-gray-400">Đang hiện {{ visibleCount() }} / {{ filtered().length }}</p>
          </div>
        } @else if (filtered().length > 0) {
          <p class="pt-4 text-center text-xs text-gray-400">Đã hiện tất cả {{ filtered().length }} khóa học</p>
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
    /* ===== PAGE LAYOUT ===== */
    .courses-page {
      min-height: 100vh;
      background: #FAFAFA;
    }

    .page-inner {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }

    /* ===== PAGE HEADER ===== */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
    }

    .page-title-group {
      flex: 1;
      min-width: 0;
    }

    .page-title {
      font-size: 28px;
      font-weight: 700;
      color: #1F1F1F;
      margin: 0 0 4px 0;
      line-height: 1.2;
    }

    .page-subtitle {
      font-size: 14px;
      color: #636363;
      margin: 0;
    }

    .cta-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: #0056D2;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      text-decoration: none;
      transition: background 0.2s ease;
      flex-shrink: 0;

      &:hover { background: #004BB5; }
    }

    .cta-icon {
      width: 16px;
      height: 16px;
    }

    /* Tabs: inline Tailwind (see template) */

    /* ===== SEARCH BOX ===== */
    .search-box {
      position: relative;
      flex-shrink: 0;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: #9CA3AF;
      pointer-events: none;
    }

    .search-input {
      height: 36px;
      width: 220px;
      padding-left: 34px;
      padding-right: 12px;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      background: white;
      font-size: 14px;
      color: #111827;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;

      &:focus {
        border-color: #0056D2;
        box-shadow: 0 0 0 3px rgba(0, 86, 210, 0.1);
      }

      &::placeholder { color: #9CA3AF; }
    }

    /* ===== COURSE LIST ===== */
    .courses-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .course-card {
      background: white;
      border-radius: 8px;
      border: 1px solid #E5E7EB;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
      overflow: hidden;
      cursor: pointer;

      &:hover {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        border-color: #D1D5DB;

        .course-title { color: #0056D2; }
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
      color: rgba(0, 86, 210, 0.35);
      background: #E3F2FD;
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
      font-size: 15px;
      font-weight: 600;
      color: #1F1F1F;
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
      gap: 4px;
      font-size: 12px;
      color: #6B7280;
    }

    .meta-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #9CA3AF;
    }

    .separator { color: #D1D5DB; }

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

    .course-date { font-size: 11px; color: #9CA3AF; }

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

      &:hover { background: #0056D2; color: white; }
    }

    /* Load More: inline Tailwind (see template) */

    /* ===== EMPTY STATE ===== */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      background: white;
      border-radius: 8px;
      border: 2px dashed #E5E7EB;
      text-align: center;
    }

    .empty-state-icon { color: #D1D5DB; margin-bottom: 12px; }
    .empty-state-title { font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px; }
    .empty-state-text { font-size: 14px; color: #6B7280; margin-bottom: 16px; max-width: 320px; }

    .retry-link {
      font-size: 14px;
      font-weight: 600;
      color: #0056D2;
      text-decoration: none;
      background: none;
      border: none;
      cursor: pointer;
      &:hover { text-decoration: underline; }
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 768px) {
      .page-inner { padding: 20px 16px; }
      .page-title { font-size: 22px; }
      .section-header { flex-direction: column; align-items: flex-start; }
      .search-input { width: 100%; }
      .search-box { width: 100%; }
      .course-card-body { flex-direction: column; align-items: flex-start; }
      .course-thumbnail { width: 100%; height: 160px; }
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

    @media (max-width: 480px) {
      .tab-chip { padding: 6px 12px; font-size: 13px; }
      .cta-button .cta-icon { display: none; }
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
  activeFilter = signal<'ALL' | 'APPROVED' | 'EDITING' | 'PENDING' | 'INSTRUCTOR_LED'>('ALL');
  publishingId = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  submittingId = signal<string | null>(null);
  cancellingId = signal<string | null>(null);
  openMenuId = signal<string | null>(null);

  // Load More pattern (matching dashboard + student)
  private readonly INITIAL_COUNT = 10;
  private readonly LOAD_MORE_COUNT = 10;
  visibleLimit = signal(this.INITIAL_COUNT);

  visible = computed(() => this.filtered().slice(0, this.visibleLimit()));
  visibleCount = computed(() => Math.min(this.visibleLimit(), this.filtered().length));
  hasMore = computed(() => this.visibleLimit() < this.filtered().length);
  remainingCount = computed(() => Math.max(0, this.filtered().length - this.visibleLimit()));

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
        this.visibleLimit.set(this.INITIAL_COUNT);
      },
      error: (err: any) => this.error.set(err?.message || 'Không tải được danh sách')
    });
  }

  setFilter(f: 'ALL' | 'APPROVED' | 'EDITING' | 'PENDING' | 'INSTRUCTOR_LED') {
    this.activeFilter.set(f);
    this.applyFilters();
  }

  countByFilter(f: string): number {
    const all = this.courses();
    switch (f) {
      case 'APPROVED': return all.filter(c => c.status === 'APPROVED').length;
      case 'EDITING': return all.filter(c => c.status === 'DRAFT' || c.status === 'REJECTED').length;
      case 'PENDING': return all.filter(c => c.status === 'PENDING').length;
      case 'INSTRUCTOR_LED': return all.filter(c => c.deliveryMode === 'INSTRUCTOR_LED').length;
      default: return all.length;
    }
  }

  loadMore() {
    this.visibleLimit.update(v => v + this.LOAD_MORE_COUNT);
  }

  applyFilters() {
    const kw = this.keyword.trim().toLowerCase();
    const f = this.activeFilter();
    this.filtered.set(
      this.courses()
        .filter(c => {
          switch (f) {
            case 'APPROVED': return c.status === 'APPROVED';
            case 'EDITING': return c.status === 'DRAFT' || c.status === 'REJECTED';
            case 'PENDING': return c.status === 'PENDING';
            case 'INSTRUCTOR_LED': return c.deliveryMode === 'INSTRUCTOR_LED';
            default: return true;
          }
        })
        .filter(c => !kw || c.code?.toLowerCase().includes(kw) || c.title?.toLowerCase().includes(kw))
    );
    this.visibleLimit.set(this.INITIAL_COUNT);
  }

  getStatusLabel(status: string): string {
    const m: Record<string, string> = {
      'APPROVED': 'Đã duyệt',
      'PENDING': 'Chờ duyệt',
      'DRAFT': 'Nháp',
      'REJECTED': 'Bị từ chối'
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

}
