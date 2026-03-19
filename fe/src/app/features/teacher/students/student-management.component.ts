import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { StudentApi, StudentSummary } from '../../../api/client/student.api';
import { CourseApi } from '../../../api/client/course.api';
import { CourseSummary } from '../../../api/types/course.types';

@Component({
  selector: 'app-student-management',
  imports: [RouterModule, FormsModule, CommonModule, NgOptimizedImage],
  template: `
    <div class="students-page">
      <div class="page-inner">

        <!-- ===== PAGE HEADER ===== -->
        <div class="page-header">
          <div class="page-title-group">
            @if (selectedCourse()) {
              <button (click)="backToCourses()" class="back-btn">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Quay lại danh sách khóa học
              </button>
            }
            <h1 class="page-title">
              {{ selectedCourse() ? selectedCourse()!.title : 'Quản lý học viên' }}
            </h1>
            <p class="page-subtitle">
              {{ selectedCourse() ? ('Học viên đang ghi danh · ' + total() + ' người') : 'Theo dõi tiến độ học viên theo từng khóa học' }}
            </p>
          </div>
        </div>

        @if (!selectedCourse()) {
          <!-- ===== VIEW 1: Danh sách khóa học + Search ===== -->

          <!-- Section header: search + status filter -->
          <div class="section-header">
            <!-- Status tab-chips -->
            <div class="tabs-container" role="tablist">
              <button type="button" class="tab-chip" role="tab"
                [class.active]="courseStatusFilter() === ''"
                (click)="setCourseStatusFilter('')">
                <span class="tab-label">Tất cả</span>
                <span class="tab-count">({{ courses().length }})</span>
              </button>
              <button type="button" class="tab-chip" role="tab"
                [class.active]="courseStatusFilter() === 'APPROVED'"
                (click)="setCourseStatusFilter('APPROVED')">
                <span class="tab-label">Đã duyệt</span>
              </button>
              <button type="button" class="tab-chip" role="tab"
                [class.active]="courseStatusFilter() === 'PENDING'"
                (click)="setCourseStatusFilter('PENDING')">
                <span class="tab-label">Chờ duyệt</span>
              </button>
              <button type="button" class="tab-chip" role="tab"
                [class.active]="courseStatusFilter() === 'DRAFT'"
                (click)="setCourseStatusFilter('DRAFT')">
                <span class="tab-label">Nháp</span>
              </button>
            </div>

            <!-- Search khóa học -->
            <div class="search-box">
              <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input class="search-input"
                placeholder="Tìm theo tên hoặc mã khóa học..."
                [ngModel]="courseKeyword()"
                (input)="courseKeyword.set($any($event.target).value)"
              />
              @if (courseKeyword()) {
                <button class="search-clear" (click)="courseKeyword.set('')" aria-label="Xóa">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              }
            </div>
          </div>

          @if (loading()) {
            <div class="flex flex-col gap-3">
              @for (i of [1, 2, 3]; track i) {
                <div class="course-card animate-pulse">
                  <div class="w-40 h-24 bg-gray-100 rounded-md flex-shrink-0"></div>
                  <div class="flex-1 space-y-2 py-1">
                    <div class="h-4 bg-gray-100 rounded w-3/4"></div>
                    <div class="h-3 bg-gray-100 rounded w-1/2"></div>
                  </div>
                </div>
              }
            </div>
          }

          @if (error() && !loading()) {
            <div class="empty-state">
              <p style="color:#DC2626">{{ error() }}</p>
              <button (click)="onReload()" class="cta-button" style="margin-top:12px">Thử lại</button>
            </div>
          }

          @if (!loading() && !error() && courses().length === 0) {
            <div class="empty-state">
              <svg width="48" height="48" fill="none" stroke="#D1D5DB" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
              <p style="color:#6B7280;margin-top:12px">Bạn chưa có khóa học nào</p>
            </div>
          }

          @if (!loading() && !error() && courses().length > 0) {
            @if (filteredCourses().length === 0) {
              <div class="empty-state">
                <svg width="40" height="40" fill="none" stroke="#D1D5DB" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <p style="color:#6B7280;margin-top:10px">Không tìm thấy khóa học phù hợp</p>
                <button class="tab-chip active" style="margin-top:10px" (click)="clearCourseFilters()">Xóa bộ lọc</button>
              </div>
            } @else {
            <!-- Course List -->
            <div class="courses-list">
            @for (course of filteredCourses(); track course.id) {
              <div class="course-card" (click)="viewCourseStudents(course)">
                <div class="course-card-inner">
                  <!-- Thumbnail -->
                  <div class="course-thumb">
                    @if (course.thumbnailUrl) {
                      <img [ngSrc]="course.thumbnailUrl"
                           width="160" height="90"
                           [alt]="course.title"
                           class="course-thumb-img"
                           (error)="onThumbError($event)">
                    } @else {
                      <div class="course-thumb-placeholder">
                        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 716-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
                        </svg>
                      </div>
                    }
                  </div>

                  <!-- Course Info -->
                  <div class="course-info">
                    <h3 class="course-title">{{ course.title }}</h3>
                    <div class="course-meta">
                      @if (course.code) {
                        <span class="meta-code">{{ course.code }}</span>
                        <span class="meta-dot">·</span>
                      }
                      <span>{{ course.enrolledCount || 0 }} học viên</span>
                      @if (course.lessonCount) {
                        <span class="meta-dot">·</span>
                        <span>{{ course.lessonCount }} bài học</span>
                      }
                    </div>
                    <div style="margin-top:6px">
                      <span class="status-badge"
                            [class.badge-green]="course.status === 'PUBLISHED' || course.status === 'APPROVED'"
                            [class.badge-yellow]="course.status === 'PENDING'"
                            [class.badge-gray]="course.status === 'DRAFT'">
                        {{ getStatusLabel(course.status) }}
                      </span>
                    </div>
                  </div>

                  <!-- Action -->
                  <div class="course-action">
                    <span class="course-date">{{ formatDate(course.updatedAt || course.createdAt) }}</span>
                    <button class="view-btn" (click)="viewCourseStudents(course); $event.stopPropagation()">
                      Xem học viên
                    </button>
                  </div>
                </div>
              </div>
            }
            </div><!-- end courses-list -->
            }<!-- end filteredCourses empty check -->
          }
      } @else {
        <!-- ===== VIEW 2: Học viên trong khóa đã chọn ===== -->
        <div class="bg-white rounded-xl" style="border:1px solid #E5E7EB; overflow:hidden">
          <!-- Section Header: search + status filter -->
          <div class="section-header" style="margin:0; padding:16px 20px; border-bottom: 1px solid #E5E7EB; border-radius:0">
            <!-- Status tab-chips -->
            <div class="tabs-container" role="tablist">
              <button type="button" class="tab-chip" role="tab"
                [class.active]="status === ''"
                (click)="status = ''; applyFilters()">
                <span class="tab-label">Tất cả</span>
                <span class="tab-count">({{ total() }})</span>
              </button>
              <button type="button" class="tab-chip" role="tab"
                [class.active]="status === 'active'"
                (click)="status = 'active'; applyFilters()">
                <span class="tab-label">Đang học</span>
              </button>
              <button type="button" class="tab-chip" role="tab"
                [class.active]="status === 'inactive'"
                (click)="status = 'inactive'; applyFilters()">
                <span class="tab-label">Không HĐ</span>
              </button>
              <button type="button" class="tab-chip" role="tab"
                [class.active]="status === 'suspended'"
                (click)="status = 'suspended'; applyFilters()">
                <span class="tab-label">Tạm khóa</span>
              </button>
            </div>

            <!-- Search học viên -->
            <div class="search-box">
              <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input class="search-input"
                placeholder="Tìm theo tên hoặc email học viên..."
                [(ngModel)]="keyword"
                (keyup.enter)="applyFilters()"
                (input)="onStudentSearchInput($event)"
              />
              @if (keyword) {
                <button class="search-clear" (click)="keyword = ''; applyFilters()" aria-label="Xóa">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              }
            </div>
          </div>
      
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tiến độ</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Điểm</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th class="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
      
                @if (loading()) {
                  <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-gray-600">
                      <div class="flex items-center justify-center gap-2">
                        <svg class="animate-spin h-5 w-5 text-[#0056D2]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Đang tải danh sách học viên...</span>
                      </div>
                    </td>
                  </tr>
                }
      
                @if (!loading() && error()) {
                  <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-red-600">
                      {{ error() }}
                      <button (click)="onReload()" class="ml-2 text-[#0056D2] underline text-sm">Tải lại</button>
                    </td>
                  </tr>
                }
      
                @if (!loading() && !error() && paged().length === 0) {
                  <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                      Không tìm thấy học viên nào.
                    </td>
                  </tr>
                }
      
                @for (s of paged(); track trackById($index, s)) {
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{{ s.name }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ s.email }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div class="flex items-center">
                        <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div class="bg-[#0056D2] h-2 rounded-full" [style.width.%]="s.progress"></div>
                        </div>
                        <span>{{ s.progress }}%</span>
                      </div>
                    </td>
                    <td class="px-6 py-5 whitespace-nowrap text-sm text-gray-600 text-center">
                      <span [class.text-green-600]="s.averageGrade >= 8"
                        [class.text-yellow-600]="s.averageGrade >= 6 && s.averageGrade < 8"
                        [class.text-red-600]="s.averageGrade < 6">
                        {{ s.averageGrade.toFixed(1) }}
                      </span>
                    </td>
                    <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg">
                      <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                        [class.bg-green-100]="s.status === 'active'"
                        [class.text-green-800]="s.status === 'active'"
                        [class.bg-gray-100]="s.status === 'inactive'"
                        [class.text-gray-800]="s.status === 'inactive'"
                        [class.bg-red-100]="s.status === 'suspended'"
                        [class.text-red-800]="s.status === 'suspended'">
                        {{ s.status === 'active' ? 'Đang học' : s.status === 'inactive' ? 'Không hoạt động' : 'Tạm khóa' }}
                      </span>
                    </td>
                    <td class="px-6 py-5 whitespace-nowrap text-right text-base md:text-lg">
                      <a [routerLink]="['/teacher/students', s.id]"
                        class="px-3 py-1.5 bg-[#0056D2]/5 text-[#0056D2] hover:text-[#004BB5] rounded-md transition-colors text-xs font-medium inline-flex items-center gap-1 mr-2">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Chi tiết
                        </a>
                      <button (click)="sendMessage(s.id)"
                        class="px-3 py-1.5 bg-[#0056D2]/5 text-[#0056D2] hover:bg-[#0056D2]/10 rounded-md transition-colors text-xs font-medium inline-flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M7 8h10M7 12h6m2 8l-4-4H7a3 3 0 01-3-3V7a3 3 0 013-3h10a3 3 0 013 3v6a3 3 0 01-3 3h-3l-4 4" />
                        </svg>
                        Nhắn tin
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
  
        <!-- Pagination -->
        @if (total() > 0) {
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
        }
      }<!-- end @else selectedCourse -->

      </div><!-- end page-inner -->
    </div><!-- end students-page -->
  `,
  styles: [`
    .students-page { min-height: 100vh; background: #FAFAFA; }
    .page-inner { max-width: 1300px; margin: 0 auto; padding: 32px; }

    .page-header { margin-bottom: 24px; }
    .back-btn {
      display: inline-flex; align-items: center; gap: 6px;
      color: #0056D2; background: none; border: none; cursor: pointer;
      font-size: 13px; font-weight: 500; margin-bottom: 8px; padding: 0;
      &:hover { color: #004BB5; }
    }
    .page-title { font-size: 26px; font-weight: 700; color: #1F1F1F; margin: 0 0 4px; }
    .page-subtitle { font-size: 14px; color: #6B7280; margin: 0; }

    /* Section header */
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; margin-bottom: 16px; padding-bottom: 12px;
      border-bottom: 1px solid #E5E7EB; flex-wrap: wrap;
    }
    .tabs-container { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    /* Tab chips */
    .tab-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 8px 16px; border: 1px solid #D1D5DB; border-radius: 20px;
      background: white; color: #374151; font-size: 14px; font-weight: 500;
      cursor: pointer; transition: all 0.2s ease; outline: none; white-space: nowrap;
      &:hover { background: #F9FAFB; border-color: #9CA3AF; }
      &.active { background: #0056D2; color: white; border-color: #0056D2;
        &:hover { background: #004BB5; }
        .tab-count { color: rgba(255,255,255,0.8); }
      }
    }
    .tab-label { line-height: 1; }
    .tab-count { font-size: 12px; color: #9CA3AF; line-height: 1; }

    /* Search box */
    .search-box { position: relative; flex-shrink: 0; }
    .search-icon {
      position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
      width: 16px; height: 16px; color: #9CA3AF; pointer-events: none;
    }
    .search-input {
      height: 38px; width: 260px; padding-left: 34px; padding-right: 32px;
      border: 1px solid #E5E7EB; border-radius: 8px; background: white;
      font-size: 14px; color: #111827; outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      &:focus { border-color: #0056D2; box-shadow: 0 0 0 3px rgba(0,86,210,0.1); }
      &::placeholder { color: #9CA3AF; }
    }
    .search-clear {
      position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; color: #9CA3AF; padding: 4px;
      display: flex; align-items: center;
      &:hover { color: #EF4444; }
    }

    /* Course cards */
    .courses-list { display: flex; flex-direction: column; gap: 12px; }
    .course-card {
      background: white; border: 1px solid #E5E7EB; border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: pointer;
      transition: box-shadow 0.2s, border-color 0.2s; overflow: hidden;
      &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: #D1D5DB;
        .course-title { color: #0056D2; }
      }
    }
    .course-card-inner { display: flex; gap: 16px; padding: 10px; align-items: center; }
    .course-thumb { width: 160px; height: 90px; flex-shrink: 0; border-radius: 8px; overflow: hidden; background: #F3F4F6; }
    .course-thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .course-thumb-placeholder {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
      background: #EFF6FF; color: rgba(0,86,210,0.35);
    }
    .course-info { flex: 1; min-width: 0; }
    .course-title {
      font-size: 15px; font-weight: 600; color: #1F1F1F; margin: 0 0 4px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color 0.2s;
    }
    .course-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6B7280; flex-wrap: wrap; }
    .meta-code { font-family: ui-monospace, monospace; color: #9CA3AF; }
    .meta-dot { color: #D1D5DB; }
    .status-badge {
      display: inline-block; font-size: 11px; font-weight: 600;
      padding: 2px 8px; border-radius: 9999px; background: #F3F4F6; color: #6B7280;
      &.badge-green { background: #ECFDF5; color: #059669; }
      &.badge-yellow { background: #FFFBEB; color: #D97706; }
    }
    .course-action { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; min-width: 100px; }
    .course-date { font-size: 11px; color: #9CA3AF; }
    .view-btn {
      padding: 5px 14px; border: 1px solid #D1D5DB; border-radius: 6px;
      background: white; color: #374151; font-size: 12px; font-weight: 500;
      cursor: pointer; transition: all 0.2s;
      &:hover { background: #0056D2; color: white; border-color: #0056D2; }
    }

    /* Empty state */
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 48px 24px; background: white;
      border-radius: 10px; border: 1px dashed #E5E7EB; text-align: center;
    }
    .cta-button {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px; background: #0056D2; color: white; border: none;
      border-radius: 8px; font-size: 14px; font-weight: 600;
      cursor: pointer; text-decoration: none; transition: background 0.2s;
      &:hover { background: #004BB5; }
    }

    @media (max-width: 768px) {
      .page-inner { padding: 20px 16px; }
      .page-title { font-size: 20px; }
      .section-header { flex-direction: column; align-items: flex-start; }
      .search-input { width: 100%; }
      .search-box { width: 100%; }
      .course-thumb { width: 100px; height: 60px; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentManagementComponent {
  private studentApi = inject(StudentApi);
  private courseApi = inject(CourseApi);
  private router = inject(Router);

  keyword = '';
  status: '' | 'active' | 'inactive' | 'suspended' = '';

  // View 1 (courses) filter signals
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

  // Client-side filtered courses (View 1)
  filteredCourses = computed(() => {
    const kw = this.courseKeyword().trim().toLowerCase();
    const statusF = this.courseStatusFilter();
    return this.courses().filter(c => {
      const matchKw = !kw ||
        c.title.toLowerCase().includes(kw) ||
        (c.code || '').toLowerCase().includes(kw);
      const matchStatus = !statusF ||
        c.status === statusF ||
        (statusF === 'APPROVED' && c.status === 'PUBLISHED');
      return matchKw && matchStatus;
    });
  });

  paged = computed(() => this.students());
  total = computed(() => this.totalElements());
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));


  constructor() {
    this.loadData();
  }

  setCourseStatusFilter(s: '' | 'APPROVED' | 'PENDING' | 'DRAFT' | 'PUBLISHED') {
    this.courseStatusFilter.set(s);
  }

  clearCourseFilters() {
    this.courseKeyword.set('');
    this.courseStatusFilter.set('');
  }

  // Debounced student search
  private studentSearchTimer: any;
  onStudentSearchInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.keyword = val;
    clearTimeout(this.studentSearchTimer);
    this.studentSearchTimer = setTimeout(() => this.applyFilters(), 400);
  }

  private loadData() {
    this.error.set('');
    this.loading.set(true);

    this.courseApi.myCourses().subscribe({
      next: (response) => {
        if (response.data) {
          this.courses.set(response.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Không thể tải danh sách khóa học');
        this.loading.set(false);
      }
    });
  }

  getStatusLabel(status?: string): string {
    const statusMap: Record<string, string> = {
      'PUBLISHED': 'Đã xuất bản',
      'APPROVED': 'Đã duyệt',
      'PENDING': 'Chờ duyệt',
      'DRAFT': 'Bản nháp',
      'REJECTED': 'Từ chối',
      'ARCHIVED': 'Lưu trữ'
    };
    return statusMap[status || ''] || status || 'Không xác định';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  onThumbError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = '/icons/icon-192x192.png';
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
    this.keyword = '';
    this.status = '';
  }

  private loadStudents() {
    if (!this.selectedCourse()) return;

    this.loading.set(true);
    this.error.set('');

    const params: any = {
      page: this.pageIndex() - 1,
      size: this.pageSize(),
      courseId: this.selectedCourse()!.id
    };

    if (this.status) {
      params.status = this.status;
    }

    if (this.keyword && this.keyword.trim()) {
      params.search = this.keyword.trim();
    }

    this.studentApi.getTeacherStudents(params).subscribe({
      next: (response) => {
        if (response.data) {
          const mappedStudents = response.data.map((s: any) => ({
            id: s.id,
            name: s.fullName,
            email: s.email,
            enrolledAt: s.enrolledAt,
            lastAccessed: s.lastAccessed,
            progress: s.progressPercentage || 0,
            averageGrade: s.averageGrade || 0,
            status: s.status || 'active',
            completedCourses: s.completedCourses || 0,
            totalCourses: s.totalCourses || 0
          }));
          this.students.set(mappedStudents);

          if (response.pagination) {
            this.totalElements.set(response.pagination.totalItems || 0);
          }
        } else {
          this.students.set([]);
          this.totalElements.set(0);
        }

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

  applyFilters() {
    this.pageIndex.set(1);
    this.loadStudents();
  }

  onStatusChange() {
    this.pageIndex.set(1);
    this.loadStudents();
  }

  goToPage(n: number) {
    this.pageIndex.set(Math.min(Math.max(1, n), this.totalPages()));
    this.loadStudents();
  }

  nextPage() {
    this.goToPage(this.pageIndex() + 1);
  }

  prevPage() {
    this.goToPage(this.pageIndex() - 1);
  }

  onPageSizeChange(v?: any) {
    if (v !== undefined) this.pageSize.set(Number(v));
    this.goToPage(1);
  }

  trackById(_index: number, student: any): string {
    return student.id;
  }

  sendMessage(studentId: string) {
    this.router.navigate(['/teacher/students', studentId], { queryParams: { tab: 'messages' } });
  }

  onReload() {
    if (this.selectedCourse()) {
      this.loadStudents();
    } else {
      this.loadData();
    }
  }
}
