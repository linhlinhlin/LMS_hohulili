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
            <h1 class="page-title">Tất cả khóa học</h1>
            <p class="page-subtitle">Quản lý và theo dõi các khóa học đang giảng dạy</p>
          </div>
          <a routerLink="/teacher/course-creation" class="cta-button">
            <svg class="cta-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Tạo khóa học
          </a>
        </div>

        <!-- 2-Column Grid (matching student /student/courses pattern) -->
        <div class="courses-grid">
        <!-- Main Content -->
        <div class="main-content">

        <!-- Search -->
        <div class="mb-4">
          <div class="relative">
            <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text"
              [value]="keyword"
              (input)="keyword = $any($event.target).value; applyFilters()"
              placeholder="Tìm theo tên hoặc mã khóa học..."
              class="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-shadow" />
          </div>
        </div>

        <!-- Mobile Toolbar: filter dropdown + sort + count (hidden on desktop) -->
        <div class="mobile-toolbar">
          <select [value]="activeFilter()" (change)="setFilter($any($event.target).value)"
            class="text-xs border border-gray-200 rounded-lg px-2.5 py-2 text-gray-700 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-[#0056D2]">
            <option value="ALL">Tất cả ({{ courses().length }})</option>
            <option value="APPROVED">Đã duyệt ({{ countByFilter('APPROVED') }})</option>
            <option value="EDITING">Đang soạn ({{ countByFilter('EDITING') }})</option>
            <option value="PENDING">Chờ duyệt ({{ countByFilter('PENDING') }})</option>
          </select>
          <select [value]="sortBy()" (change)="onSortChange($event)"
            class="text-xs border border-gray-200 rounded-lg px-2.5 py-2 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#0056D2]">
            <option value="recent">Mới nhất</option>
            <option value="title">Tên A-Z</option>
            <option value="students">Học viên</option>
            <option value="rating">Đánh giá</option>
          </select>
        </div>

        <!-- Filter Tabs — 5 tabs inline Tailwind (matching dashboard + assessments) -->
        <div class="desktop-tabs" role="tablist">
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
        </div>

        <!-- Skeleton Loading (matching dashboard pattern) -->
        @if (loading()) {
          <div class="courses-list">
            @for (i of [1, 2, 3, 4, 5]; track i) {
              <div class="course-card">
                <div class="course-card-body animate-pulse">
                  <div class="course-thumbnail" style="background:#E5E7EB"></div>
                  <div class="course-metadata" style="gap:10px">
                    <div style="height:16px;width:70%;background:#E5E7EB;border-radius:4px"></div>
                    <div style="height:12px;width:50%;background:#E5E7EB;border-radius:4px"></div>
                    <div style="height:10px;width:30%;background:#E5E7EB;border-radius:4px"></div>
                  </div>
                  <div class="course-actions" style="border-left-color:transparent">
                    <div style="height:20px;width:60px;background:#E5E7EB;border-radius:10px"></div>
                    <div style="height:12px;width:80px;background:#E5E7EB;border-radius:4px"></div>
                    <div style="height:32px;width:80px;background:#E5E7EB;border-radius:6px"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Course List -->
        @if (!loading()) {
        <div class="courses-list">
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

                <!-- Info (synced with dashboard card) -->
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
                    @if (c.deliveryMode === 'INSTRUCTOR_LED') {
                      <span class="delivery-badge class-mode">Lớp học</span>
                    }
                    @if ((c.averageRating ?? 0) > 0) {
                      <span class="rating-badge">
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="#D97706"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        {{ (c.averageRating ?? 0).toFixed(1) }}
                      </span>
                    }
                  </div>
                </div>

                <!-- Status + Action — visible buttons per status (no hidden kebab) -->
                <div class="course-actions">
                  <div class="flex items-center gap-2">
                    <span class="status-badge"
                          [class.badge-approved]="c.status === 'APPROVED'"
                          [class.badge-pending]="c.status === 'PENDING'"
                          [class.badge-draft]="c.status === 'DRAFT'"
                          [class.badge-rejected]="c.status === 'REJECTED'">
                      {{ getStatusLabel(c.status) }}
                    </span>
                    @if (c.teacherRole === 'CO_TEACHER') {
                    <span class="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded">
                      Đồng giảng viên
                    </span>
                    }
                    <span class="course-date">{{ formatDate(c.updatedAt || c.createdAt) }}</span>
                  </div>

                  @if (c.status === 'REJECTED') {
                    <button (click)="viewReviewComment(c.id); $event.stopPropagation()"
                      class="text-xs text-purple-600 hover:text-purple-800 font-medium transition-colors">
                      Xem phản hồi admin
                    </button>
                  }

                  <div class="flex items-center gap-2">
                    @if (c.status === 'DRAFT' || c.status === 'REJECTED') {
                      <button class="submit-button"
                        [disabled]="submittingId() === c.id"
                        (click)="submitForApproval(c.id); $event.stopPropagation()">
                        @if (submittingId() === c.id) {
                          Đang gửi...
                        } @else {
                          Gửi duyệt
                        }
                      </button>
                    }
                    @if (c.status === 'PENDING') {
                      <button class="cancel-button"
                        [disabled]="cancellingId() === c.id"
                        (click)="cancelApproval(c.id); $event.stopPropagation()">
                        Hủy duyệt
                      </button>
                    }
                    <button class="edit-button" (click)="onEdit(c.id); $event.stopPropagation()">
                      Chỉnh sửa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
        }

        <!-- Empty State -->
        @if (!loading() && filtered().length === 0 && !error()) {
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

        </div><!-- /main-content -->

        <!-- Sidebar Filter (matching student /student/courses pattern) -->
        <aside class="filter-sidebar">
          <div class="sidebar-section">
            <h3 class="sidebar-title">Bộ lọc</h3>

            <!-- Sort By -->
            <div class="filter-group">
              <label class="filter-label">Sắp xếp theo</label>
              <select class="filter-select" [value]="sortBy()" (change)="onSortChange($event)">
                <option value="recent">Gần đây nhất</option>
                <option value="title">Tên A-Z</option>
                <option value="students">Học viên nhiều nhất</option>
                <option value="rating">Đánh giá cao nhất</option>
              </select>
            </div>

            <!-- Statistics -->
            <div class="stats-section">
              <h4 class="stats-title">Thống kê</h4>
              <div class="stat-item">
                <span class="stat-label">Tổng khóa học</span>
                <span class="stat-value">{{ statTotal() }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Đã duyệt</span>
                <span class="stat-value">{{ statApproved() }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Tổng học viên</span>
                <span class="stat-value">{{ statStudents() }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Đánh giá TB</span>
                <span class="stat-value">{{ statAvgRating() > 0 ? statAvgRating().toFixed(1) : '—' }}</span>
              </div>
            </div>
          </div>
        </aside>

        </div><!-- /courses-grid -->
      </div>
    </div>

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

    /* ===== 2-COLUMN GRID (matching student pattern) ===== */
    .courses-grid {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 16px;
    }

    .main-content { min-width: 0; }

    .desktop-tabs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
    }

    .mobile-toolbar {
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 12px;
    }

    /* ===== SIDEBAR FILTER (matching student) ===== */
    .filter-sidebar {
      position: sticky;
      top: 24px;
      height: fit-content;
      max-height: calc(100vh - 48px);
      overflow-y: auto;
    }

    .sidebar-section {
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .sidebar-title {
      font-size: 18px;
      font-weight: 600;
      color: #1F1F1F;
      margin: 0 0 16px 0;
    }

    .filter-group { margin-bottom: 20px; }

    .filter-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 8px;
    }

    .filter-select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      font-size: 14px;
      color: #1F1F1F;
      background: white;
      cursor: pointer;
      transition: border-color 0.2s ease;

      &:hover { border-color: #9CA3AF; }
      &:focus {
        outline: none;
        border-color: #0056D2;
        box-shadow: 0 0 0 3px rgba(0, 86, 210, 0.1);
      }
    }

    .stats-section {
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
    }

    .stats-title {
      font-size: 14px;
      font-weight: 600;
      color: #1F1F1F;
      margin: 0 0 12px 0;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: 14px;

      &:not(:last-child) { border-bottom: 1px solid #F3F4F6; }
    }

    .stat-label { color: #6B7280; }
    .stat-value { font-weight: 600; color: #1F1F1F; }

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

      &.class-mode {
        color: #7C3AED;
      }
    }

    .rating-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      font-weight: 500;
      color: #D97706;

      svg { flex-shrink: 0; }
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
      min-width: 72px;
      text-align: center;
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

    .submit-button {
      padding: 6px 14px;
      border: 1px solid #059669;
      border-radius: 6px;
      background: white;
      color: #059669;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;

      &:hover { background: #059669; color: white; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .cancel-button {
      padding: 6px 14px;
      border: 1px solid #D97706;
      border-radius: 6px;
      background: white;
      color: #D97706;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;

      &:hover { background: #D97706; color: white; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
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
      white-space: nowrap;

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
      .page-header { flex-direction: column; align-items: stretch; gap: 12px; }
      .cta-button { justify-content: center; }
      .courses-grid { grid-template-columns: 1fr; }
      .filter-sidebar { display: none; }
      .desktop-tabs { display: none; }
      .mobile-toolbar { display: flex; }
      .course-card-body { flex-direction: column; align-items: stretch; }
      .course-thumbnail { width: 100%; height: 140px; }
      .course-title {
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      .course-actions {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        padding-left: 0;
        padding-top: 12px;
        border-left: none;
        border-top: 1px solid #F3F4F6;
        min-width: unset;
      }
      /* Row 1: status + date */
      .course-actions > div:first-child {
        justify-content: space-between;
      }
      /* Row 2: buttons full-width */
      .course-actions > div:last-child {
        display: flex;
        gap: 8px;
      }
      .edit-button, .submit-button, .cancel-button {
        flex: 1;
        text-align: center;
        padding: 10px 12px;
        font-size: 13px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .page-inner { padding: 16px 12px; }
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
  loading = signal(true);
  courses = signal<CourseSummary[]>([]);
  filtered = signal<CourseSummary[]>([]);
  error = signal('');
  keyword = '';
  activeFilter = signal<'ALL' | 'APPROVED' | 'EDITING' | 'PENDING'>('ALL');
  sortBy = signal<'recent' | 'title' | 'students' | 'rating'>('recent');

  // Statistics (matching student sidebar pattern)
  statTotal = computed(() => this.courses().length);
  statApproved = computed(() => this.courses().filter(c => c.status === 'APPROVED').length);
  statStudents = computed(() => this.courses().reduce((sum, c) => sum + (c.enrolledCount || 0), 0));
  statAvgRating = computed(() => {
    const rated = this.courses().filter(c => (c.averageRating ?? 0) > 0);
    if (rated.length === 0) return 0;
    return rated.reduce((sum, c) => sum + (c.averageRating ?? 0), 0) / rated.length;
  });
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
    this.loading.set(true);
    this.api.myCourses().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: any) => {
        const list = res?.data || [];
        this.courses.set(list);
        this.filtered.set(list);
        this.visibleLimit.set(this.INITIAL_COUNT);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.message || 'Không tải được danh sách');
        this.loading.set(false);
      }
    });
  }

  setFilter(f: 'ALL' | 'APPROVED' | 'EDITING' | 'PENDING') {
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

  onSortChange(event: Event) {
    this.sortBy.set((event.target as HTMLSelectElement).value as any);
    this.applyFilters();
  }

  applyFilters() {
    const kw = this.keyword.trim().toLowerCase();
    const f = this.activeFilter();
    const sort = this.sortBy();
    let result = this.courses()
      .filter(c => {
        switch (f) {
          case 'APPROVED': return c.status === 'APPROVED';
          case 'EDITING': return c.status === 'DRAFT' || c.status === 'REJECTED';
          case 'PENDING': return c.status === 'PENDING';
          default: return true;
        }
      })
      .filter(c => !kw || c.code?.toLowerCase().includes(kw) || c.title?.toLowerCase().includes(kw));

    // Sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'title': return (a.title || '').localeCompare(b.title || '', 'vi');
        case 'students': return (b.enrolledCount || 0) - (a.enrolledCount || 0);
        case 'rating': return (b.averageRating || 0) - (a.averageRating || 0);
        default: return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
      }
    });

    this.filtered.set(result);
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
