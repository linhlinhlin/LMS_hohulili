import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { StudentEnrollmentService } from './services/enrollment.service';
import { CourseApi } from '../../api/client/course.api';
import { EnrolledCourse } from '../../shared/types/course.types';
import { IconComponent } from '../../shared/components/ui/icon/icon.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { CardComponent } from '../../shared/components/ui/card/card.component';
import { ProgressBarComponent } from '../../shared/components/ui/progress-bar/progress-bar.component';
import { TabsComponent, Tab } from '../../shared/components/ui/tabs/tabs.component';
import { ToastService } from '../../core/services/toast.service';
import { CourseDownloadButtonComponent } from '../../shared/components/course-download-button/course-download-button.component';
import { CourseDownloadService } from '../../core/services/course-download.service';

// Enhanced course with modules
interface LessonSection {
  id: string;
  title: string;
  type: string;
}

interface EnhancedEnrolledCourse extends EnrolledCourse {
  showModules?: boolean;
  estimatedCompletion?: string;
  currentLessonId?: string | null;
  modules?: Array<{
    id: string;
    title: string;
    completedCount?: number;
    totalCount?: number;
    lessons: Array<{
      id: string;
      title: string;
      type: 'video' | 'reading' | 'quiz';
      duration: string;
      completed: boolean;
      sections?: LessonSection[];
    }>;
  }>;
}

/**
 * Student My Courses - Coursera Style with Modules
 * 
 * Trang khóa học với:
 * - Coursera header (avatar + greeting)
 * - Tab navigation (In Progress / Completed)
 * - Course cards với dropdown modules
 * - Responsive grid layout
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-student-my-courses',
  imports: [
    FormsModule,
    RouterModule,
    IconComponent,
    ButtonComponent,
    CourseDownloadButtonComponent,
  ],
  template: `
    <div class="my-courses-container">
      <!-- Main Content Area (70%) -->
      <div class="main-content">
        @if (error()) {
          <div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px 16px;border-radius:8px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
            <span>{{ error() }}</span>
            <button (click)="error.set(null)" style="background:none;border:none;cursor:pointer;font-size:18px">&times;</button>
          </div>
        }
        <!-- Page Header -->
        <div class="page-header">
          <h1 class="page-title">Khóa học của tôi</h1>
          <p class="page-subtitle">Quản lý và theo dõi tiến độ các khóa học đã đăng ký</p>
        </div>

        <div style="margin:-4px 0 16px;display:flex;flex-wrap:wrap;gap:8px">
          <a routerLink="/student/courses"
             style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8;text-decoration:none;font-size:13px;font-weight:500">
            Quay lại tổng quan
          </a>
          <a routerLink="/student/tasks"
             style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;border:1px solid #e5e7eb;background:#fff;color:#374151;text-decoration:none;font-size:13px;font-weight:500">
            Xem bài cần làm
          </a>
        </div>

        <!-- Tabs -->
        <div class="tabs-section">
          <div class="tabs-container" role="tablist">
            <button 
              class="tab-chip"
              [class.active]="activeTab() === 'in-progress'"
              (click)="onTabChange('in-progress')"
              role="tab"
              [attr.aria-selected]="activeTab() === 'in-progress'"
              type="button">
              <span class="tab-label">Đang học ({{ inProgressCount() }})</span>
            </button>
            <button 
              class="tab-chip"
              [class.active]="activeTab() === 'completed'"
              (click)="onTabChange('completed')"
              role="tab"
              [attr.aria-selected]="activeTab() === 'completed'"
              type="button">
              <span class="tab-label">Đã hoàn thành ({{ completedCount() }})</span>
            </button>
          </div>
        </div>

        <!-- Empty State -->
        @if (filteredCourses().length === 0) {
          <div class="empty-state">
            <app-icon name="book-open" size="xl" />
            <h3>{{ activeTab() === 'in-progress' ? 'Chưa có khóa học đang học' : 'Chưa hoàn thành khóa học nào' }}</h3>
            <p>{{ activeTab() === 'in-progress' ? 'Hãy bắt đầu học một khóa học mới' : 'Tiếp tục học để hoàn thành khóa học đầu tiên' }}</p>
          </div>
        }

        <!-- Courses List - Horizontal Cards -->
        @else {
          <div class="courses-list">
            @for (course of filteredCourses(); track course.id) {
              <div class="course-card-outer">
              <div class="course-card-wrapper">
                <!-- Course Thumbnail -->
                <div class="course-thumbnail">
                  @if (course.thumbnail) {
                    <img [src]="course.thumbnail" [alt]="course.title" class="thumbnail-image" />
                  } @else {
                    <div class="thumbnail-placeholder">
                      <app-icon name="academic-cap" size="lg" />
                    </div>
                  }
                </div>

                <!-- Course Metadata -->
                <div class="course-metadata">
                  <div class="partner-info">
                    <span class="partner-name">{{ getInstructorName(course) }}</span>
                  </div>
                  <h3 class="course-title">
                    <a [routerLink]="['/student/courses', course.id]">
                      {{ course.title }}
                    </a>
                  </h3>
                  <div class="course-meta">
                    <span class="delivery-badge" [class.class-mode]="course.deliveryMode === 'INSTRUCTOR_LED'">
                      {{ course.deliveryMode === 'INSTRUCTOR_LED' ? 'Lớp học' : 'Khóa học' }}
                    </span>
                    <span class="separator">·</span>
                    @if (course.progress >= 100) {
                      <span class="progress-label-completed">Đã hoàn thành</span>
                    } @else {
                      <span>{{ course.progress > 0 ? course.progress + '% hoàn thành' : 'Chưa bắt đầu' }}</span>
                    }
                    @if (course['estimatedCompletion']) {
                      <span class="separator">·</span>
                      <span class="estimated">Dự kiến: {{ course['estimatedCompletion'] }}</span>
                    }
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="action-buttons">
                  <app-button
                    variant="primary"
                    (clicked)="resumeCourse(course.id)">
                    {{ course.progress >= 100 ? 'Xem lại' : course.progress > 0 ? 'Tiếp tục học' : 'Bắt đầu ngay' }}
                  </app-button>
                  @if (canDownload(course)) {
                    <app-course-download-button
                      [courseId]="course.id"
                      [courseTitle]="course.title"
                      [allowOfflineDownload]="true" />
                  }
                  <button class="dropdown-button" (click)="toggleModules(course.id)" aria-label="Show lessons">
                    <app-icon [name]="course.showModules ? 'chevron-up' : 'chevron-down'" size="sm" />
                  </button>
                </div>
              </div>
              <!-- Progress Bar (full-width below card body) -->
              <div class="progress-bar-thin" style="margin: 0 8px 4px 8px;">
                <div class="progress-fill" [class.completed]="course.progress >= 100" [style.width.%]="course.progress"></div>
              </div>

              <!-- Modules Dropdown -->
              @if (course.showModules && course.modules && course.modules.length > 0) {
                <div class="syllabus-section">
                  @for (module of course.modules; track module.id) {
                    <div class="module-item">
                      <div class="module-header">
                        <svg class="module-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                        <span class="module-title">{{ module.title }}</span>
                        <span class="module-count">{{ module.completedCount }}/{{ module.totalCount }}</span>
                      </div>
                      <div class="lessons-list">
                        @for (lesson of module.lessons; track lesson.id) {
                          <a
                            [routerLink]="['/student/learn/course', course.id, 'lesson', lesson.id]"
                            class="lesson-item"
                            [class.completed]="lesson.completed"
                            [class.current]="lesson.id === course.currentLessonId">
                            <span class="lesson-status-icon">
                              @if (lesson.completed) {
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="#10B981"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                              } @else if (lesson.id === course.currentLessonId) {
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="#0056D2"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>
                              } @else {
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#D1D5DB" stroke-width="1.5"><circle cx="10" cy="10" r="7"/></svg>
                              }
                            </span>
                            <span class="lesson-title">{{ lesson.title }}</span>
                          </a>
                          @if (lesson.sections && lesson.sections.length > 0) {
                            <div class="section-list">
                              @for (sec of lesson.sections; track sec.id) {
                                <div class="section-item" [class.completed]="lesson.completed">
                                  <span class="section-type-icon">
                                    @if (lesson.completed) {
                                      <svg width="12" height="12" viewBox="0 0 20 20" fill="#10B981"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                                    } @else if (sec.type === 'VIDEO') {
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                                    } @else if (sec.type === 'QUIZ') {
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                                    } @else {
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                    }
                                  </span>
                                  <span class="section-title">{{ sec.title }}</span>
                                </div>
                              }
                            </div>
                          }
                        }
                      </div>
                    </div>
                  }
                </div>
              }
              </div>
            }
          </div>
        }
      </div>

      <!-- Sidebar (30%) - Filters -->
      <aside class="filter-sidebar">
        <div class="sidebar-section">
          <h3 class="sidebar-title">Bộ lọc</h3>
          
          <!-- Sort By -->
          <div class="filter-group">
            <label class="filter-label">Sắp xếp theo</label>
            <select class="filter-select" [value]="sortBy()" (change)="onSortChange($event)">
              <option value="recent">Gần đây nhất</option>
              <option value="name">Tên khóa học</option>
              <option value="progress">Tiến độ</option>
            </select>
          </div>

          <!-- Filter by Progress -->
          <div class="filter-group">
            <label class="filter-label">Tiến độ</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" [checked]="filterNotStarted()" (change)="toggleFilterNotStarted()">
                <span>Chưa bắt đầu</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" [checked]="filterInProgress()" (change)="toggleFilterInProgress()">
                <span>Đang học</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" [checked]="filterCompleted()" (change)="toggleFilterCompleted()">
                <span>Hoàn thành</span>
              </label>
            </div>
          </div>

          <!-- Statistics -->
          <div class="stats-section">
            <h4 class="stats-title">Thống kê</h4>
            <div class="stat-item">
              <span class="stat-label">Tổng khóa học</span>
              <span class="stat-value">{{ enrolledCourses().length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Đang học</span>
              <span class="stat-value">{{ inProgressCount() }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Hoàn thành</span>
              <span class="stat-value">{{ completedCount() }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Tiến độ trung bình</span>
              <span class="stat-value">{{ averageProgress() }}%</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    @use '../../../styles/variables' as *;

    .my-courses-container {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 16px;
      margin: 0;
      padding: 0 16px;
      background: #FAFAFA;
      min-height: 100vh;
      max-width: 1400px;
      margin-left: auto;
      margin-right: auto;

      @include mobile {
        grid-template-columns: 1fr;
        padding: 0 12px;
        gap: 12px;
      }
    }

    @media (max-width: 640px) {
      .course-card-wrapper {
        flex-direction: column;
        gap: 10px;
        padding: 12px;
      }

      .course-thumbnail {
        width: 100%;
        height: 140px;
      }

      .action-buttons {
        align-self: stretch;
        justify-content: flex-start;
      }
    }

    .main-content {
      min-width: 0;
    }

    /* Coursera-Style Header */
    .page-header {
      margin-bottom: 20px;
      padding: 24px 16px 0 16px;
    }

    .page-title {
      font-size: $text-2xl;
      font-weight: $font-bold;
      color: $text-primary;
      margin: 0 0 $spacing-1 0;
      line-height: 1.3;
    }

    .page-subtitle {
      font-size: $text-sm;
      color: $text-secondary;
      margin: 0;
    }

    /* Tabs - Sticky */
    .tabs-section {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #FAFAFA;
      padding: 0 16px 16px 16px;
      margin: 0 0 16px 0;
      border-bottom: 1px solid #E5E7EB;
    }

    .tabs-container {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .tab-chip {
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      border: 1px solid #D1D5DB;
      border-radius: 20px;
      background: #FFFFFF;
      color: #374151;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;

      &:hover {
        background: #F9FAFB;
        border-color: #9CA3AF;
      }

      &.active {
        background: $blue-primary;
        color: #FFFFFF;
        border-color: $blue-primary;

        &:hover {
          background: #004BB8;
          border-color: #004BB8;
        }
      }

      .tab-label {
        line-height: 1;
      }
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: $spacing-16 $spacing-6;
      color: $text-secondary;

      app-icon {
        color: $text-muted;
        margin-bottom: $spacing-4;
      }

      h3 {
        font-size: $text-xl;
        font-weight: $font-semibold;
        color: $text-primary;
        margin: 0 0 $spacing-2 0;
      }

      p {
        margin: 0;
      }
    }

    /* Courses List - Single Column Layout */
    .courses-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .course-card-outer {
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease;
      overflow: hidden;

      &:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }
    }

    .course-card-wrapper {
      display: flex;
      gap: 16px;
      padding: 8px;
      align-items: center;
    }

    /* Left Section - Course Thumbnail */
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
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
      color: $blue-primary;
      background: #E3F2FD;
    }

    /* Metadata Section */
    .course-metadata {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .partner-info {
      margin: 0;
    }

    .partner-name {
      font-size: 11px;
      color: #6B7280;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .course-title {
      margin: 0;

      a {
        font-size: 15px;
        font-weight: 600;
        color: #1F1F1F;
        text-decoration: none;
        line-height: 1.4;
        display: block;
        word-wrap: break-word;
        overflow-wrap: break-word;

        &:hover {
          color: $blue-primary;
          text-decoration: underline;
        }
      }
    }

    .course-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
      font-size: 12px;
      color: #6B7280;
      margin: 0;

      .separator {
        color: #D1D5DB;
      }

      .estimated {
        color: #9CA3AF;
      }

      .progress-label-completed {
        color: #10B981;
        font-weight: 600;
      }
    }

    .delivery-badge {
      font-weight: 500;
      color: $blue-primary;

      &.class-mode {
        color: #7C3AED;
      }
    }

    /* Progress Bar - Compact Style */
    .progress-bar-thin {
      width: 100%;
      height: 6px;
      background: #E5E7EB;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 2px;
    }

    .progress-fill {
      height: 100%;
      background: $blue-primary;
      border-radius: 3px;
      transition: width 0.3s ease;

      &.completed {
        background: #10B981;
      }
    }

    /* Action Buttons - Compact Style */
    .action-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      align-self: center;

      app-button {
        white-space: nowrap;
        font-size: 14px;
        font-weight: 600;
        padding: 8px 20px;
        height: 36px;
      }
    }

    .dropdown-button {
      padding: 4px;
      background: transparent;
      border: 1px solid #E5E7EB;
      border-radius: 4px;
      cursor: pointer;
      color: #6B7280;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;

      &:hover {
        background: #F9FAFB;
        border-color: #D1D5DB;
        color: #374151;
      }

      app-icon {
        width: 16px;
        height: 16px;
      }
    }

    /* Syllabus / Accordion (matches dashboard) */
    .syllabus-section {
      border-top: 1px solid #E5E7EB;
      background: #FAFAFA;
      max-height: 360px;
      overflow-y: auto;

      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-track { background: transparent; }
      &::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 2px; }
    }

    .module-item {
      &:not(:first-child) {
        .module-header {
          border-top: 1px solid #F3F4F6;
          margin-top: 2px;
        }
      }
    }

    .module-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 10px 16px;
      background: white;
      border-bottom: 1px solid #F3F4F6;
    }

    .module-icon {
      color: #9CA3AF;
      flex-shrink: 0;
      margin-right: 4px;
    }

    .module-title {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .module-count {
      font-size: 10px;
      font-weight: 500;
      color: #636363;
      white-space: nowrap;
      flex-shrink: 0;
      background: #F3F4F6;
      padding: 1px 6px;
      border-radius: 3px;
    }

    .lessons-list {
      display: flex;
      flex-direction: column;
    }

    .lesson-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px 10px 32px;
      text-decoration: none;
      transition: background 0.15s ease;
      border-bottom: 1px solid #F3F4F6;
      cursor: pointer;

      &:last-child { border-bottom: none; }
      &:hover { background: white; }

      &.completed {
        .lesson-title { color: #9CA3AF; }
      }

      &.current {
        .lesson-title {
          color: $blue-primary;
          font-weight: 500;
        }
      }
    }

    .lesson-status-icon {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;

      svg { display: block; }
    }

    .lesson-title {
      font-size: 13px;
      color: #374151;
      flex: 1;
      line-height: 1.4;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Section items (3rd level) */
    .section-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-left: 44px;
      margin-top: 2px;
    }

    .section-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      font-size: 12px;
      color: #6B7280;

      &.completed {
        .section-title { color: #9CA3AF; }
        .section-type-icon { color: #10B981; }
      }
    }

    .section-type-icon {
      flex-shrink: 0;
      width: 12px;
      height: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9CA3AF;

      svg { display: block; }
    }

    .section-title {
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Filter Sidebar - Sticky */
    .filter-sidebar {
      position: sticky;
      top: 24px;
      height: fit-content;
      max-height: calc(100vh - 48px);
      overflow-y: auto;
      padding: 24px 16px 16px 16px;

      @include mobile {
        display: none;
      }
    }

    .sidebar-section {
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition: box-shadow 0.2s ease;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      }
    }

    .sidebar-title {
      font-size: 18px;
      font-weight: 600;
      color: #1F1F1F;
      margin: 0 0 16px 0;
    }

    .filter-group {
      margin-bottom: 20px;

      &:last-child {
        margin-bottom: 0;
      }
    }

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

      &:hover {
        border-color: #9CA3AF;
      }

      &:focus {
        outline: none;
        border-color: $blue-primary;
        box-shadow: 0 0 0 3px rgba(0, 86, 210, 0.1);
      }
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #374151;
      cursor: pointer;

      input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }
    }

    .stats-section {
      margin-top: 24px;
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

      &:not(:last-child) {
        border-bottom: 1px solid #F3F4F6;
      }
    }

    .stat-label {
      color: #6B7280;
    }

    .stat-value {
      font-weight: 600;
      color: #1F1F1F;
    }
  `]
})
export class StudentMyCoursesComponent implements OnInit {
  protected authService = inject(AuthService);
  private enrollmentService = inject(StudentEnrollmentService);
  private courseApi = inject(CourseApi);
  private courseDownload = inject(CourseDownloadService);
  private router = inject(Router);
  private toast = inject(ToastService);

  // State
  enrolledCourses = signal<EnhancedEnrolledCourse[]>([]);
  activeTab = signal<string>('in-progress');

  // Filter state
  sortBy = signal<string>('recent');
  filterNotStarted = signal<boolean>(false);
  filterInProgress = signal<boolean>(false);
  filterCompleted = signal<boolean>(false);
  error = signal<string | null>(null);

  // Tabs
  courseTabs: Tab[] = [
    { id: 'in-progress', label: 'Đang học' },
    { id: 'completed', label: 'Hoàn thành' }
  ];

  // Computed
  readonly filteredCourses = computed(() => {
    const courses = this.enrolledCourses();
    const tab = this.activeTab();
    const sort = this.sortBy();
    const fNotStarted = this.filterNotStarted();
    const fInProgress = this.filterInProgress();
    const fCompleted = this.filterCompleted();
    const hasProgressFilter = fNotStarted || fInProgress || fCompleted;

    // Tab filter
    let result = tab === 'in-progress'
      ? courses.filter(c => c['status'] === 'in-progress' || c['status'] === 'enrolled')
      : courses.filter(c => c['status'] === 'completed');

    // Progress filters (checkbox - OR logic)
    if (hasProgressFilter) {
      result = result.filter(c => {
        if (fNotStarted && c['progress'] === 0) return true;
        if (fInProgress && c['progress'] > 0 && c['progress'] < 100) return true;
        if (fCompleted && c['progress'] >= 100) return true;
        return false;
      });
    }

    // Sort
    if (sort === 'name') {
      result = [...result].sort((a, b) => a['title'].localeCompare(b['title']));
    } else if (sort === 'progress') {
      result = [...result].sort((a, b) => b['progress'] - a['progress']);
    } else {
      // 'recent' = sort by lastAccessed DESC (SOTA: Canvas/Coursera pattern)
      result = [...result].sort((a, b) => {
        const aTime = String(a.lastAccessed || '');
        const bTime = String(b.lastAccessed || '');
        return bTime.localeCompare(aTime);
      });
    }

    return result;
  });

  readonly inProgressCount = computed(() =>
    this.enrolledCourses().filter(c => c['status'] === 'in-progress' || c['status'] === 'enrolled').length
  );

  readonly completedCount = computed(() =>
    this.enrolledCourses().filter(c => c['status'] === 'completed').length
  );

  readonly averageProgress = computed(() => {
    const courses = this.enrolledCourses();
    if (courses.length === 0) return 0;
    return Math.round(courses.reduce((sum, c) => sum + c['progress'], 0) / courses.length);
  });

  ngOnInit(): void {
    this.loadCourses();
  }

  private async loadCourses(): Promise<void> {
    try {
      await this.enrollmentService.loadEnrolledCourses();
      const courses = this.enrollmentService.enrolledCourses();

      // Enhance courses with empty modules (will be loaded on demand)
      const enhancedCourses: EnhancedEnrolledCourse[] = courses.map((course: any) => ({
        ...course,
        showModules: false,
        modules: [] // Empty initially, will load from API when expanded
      }));

      this.enrolledCourses.set(enhancedCourses);
    } catch (err: any) {
      this.error.set(err?.message || 'Không thể tải danh sách khóa học. Vui lòng thử lại.');
    }
  }

  // Load course content (modules/lessons) from API
  private async loadCourseContent(courseId: string): Promise<void> {
    try {
      // Fetch content + progress + completed lesson IDs in parallel
      const [contentRes, progressRes, completedIds] = await Promise.all([
        firstValueFrom(this.courseApi.getCourseContent(courseId)),
        firstValueFrom(this.courseApi.getCourseProgress(courseId)),
        this.fetchCompletedLessonIds(courseId)
      ]);
      
      const sections = contentRes.data || [];
      const completedSet = new Set(completedIds);
      
      // Get real progress from API
      const progressData = progressRes?.data;
      const totalLessons = progressData?.totalLessons || 0;
      const completedLessons = progressData?.completedLessons || 0;
      
      // Transform API response to module format with completion status
      const modules = sections.map((section: any) => {
        const lessons = (section.lessons || []).map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          type: this.getLessonType(lesson.lessonType),
          duration: lesson.durationMinutes ? `${lesson.durationMinutes} phút` : '',
          completed: completedSet.has(lesson.id),
          sections: (lesson.sections || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            type: s.type || 'TEXT'
          }))
        }));
        return {
          id: section.id,
          title: section.title,
          lessons,
          // Calculate module-level completed count from lessons
          completedCount: lessons.filter((l: any) => l.completed).length,
          totalCount: lessons.length,
        };
      });

      // Find the first incomplete lesson (current lesson) across all modules
      let currentLessonId: string | null = null;
      for (const mod of modules) {
        for (const lesson of mod.lessons) {
          if (!lesson.completed) {
            currentLessonId = lesson.id;
            break;
          }
        }
        if (currentLessonId) break;
      }

      // Update the specific course with loaded modules
      this.enrolledCourses.update(courses =>
        courses.map(c => {
          if (c['id'] !== courseId) return c;
          return { 
            ...c, 
            modules, 
            currentLessonId,
            // Use real progress from API
            progress: progressData?.progressPercentage || c.progress,
            completedLessons: completedLessons,
            totalLessons: totalLessons
          };
        })
      );

      // Force refresh progress from BE via service
      await this.enrollmentService.refreshCourseProgress(courseId);
    } catch (err: any) {
      this.toast.error('Không thể tải nội dung khóa học.');
    }
  }

  private async fetchCompletedLessonIds(courseId: string): Promise<string[]> {
    try {
      const res = await firstValueFrom(
        this.courseApi.getCompletedLessonIds(courseId)
      );
      // API returns { data: ["id1", "id2", ...] } — flat array
      const data = res?.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  private getLessonType(lessonType: string): 'video' | 'reading' | 'quiz' {
    const type = lessonType?.toLowerCase();
    if (type === 'quiz') return 'quiz';
    if (type === 'reading') return 'reading';
    return 'video';
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }

  getUserFirstName(): string {
    const user = this.authService.currentUser();
    const fullName = user?.fullName || user?.name || 'Bạn';
    return fullName.split(' ').pop() || fullName;
  }

  getUserInitials(): string {
    const user = this.authService.currentUser();
    const fullName = user?.fullName || user?.name || 'U';
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }

  getInstructorName(course: EnhancedEnrolledCourse): string {
    if (!course.instructor) return 'LMS Maritime';
    if (typeof course.instructor === 'string') return course.instructor || 'LMS Maritime';
    return course.instructor.name || 'LMS Maritime';
  }

  onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  toggleModules(courseId: string): void {
    const course = this.enrolledCourses().find(c => c['id'] === courseId);
    const isCurrentlyExpanded = course?.showModules || false;

    // Toggle the showModules state
    this.enrolledCourses.update(courses =>
      courses.map(c =>
        c['id'] === courseId ? { ...c, showModules: !c.showModules } : c
      )
    );

    // Load course content if expanding and modules not yet loaded
    if (!isCurrentlyExpanded && course && (!course.modules || course.modules.length === 0)) {
      this.loadCourseContent(courseId);
    }
  }

  async resumeCourse(courseId: string): Promise<void> {
    try {
      // Get next lesson from backend
      const response = await firstValueFrom(this.courseApi.getNextLesson(courseId)) as any;
      const nextLessonId = response?.data;

      if (nextLessonId) {
        // Navigate to specific lesson
        this.router.navigate(['/student/learn/course', courseId, 'lesson', nextLessonId]);
      } else {
        await this.navigateToBestLesson(courseId);
      }
    } catch (error) {
      await this.navigateToBestLesson(courseId);
    }
  }

  private async navigateToBestLesson(courseId: string): Promise<void> {
    if (this.courseDownload.isDownloadedSync(courseId)) {
      const offlineLessonId = await this.courseDownload.getOfflineResumeLessonId(courseId);
      if (offlineLessonId) {
        this.router.navigate(['/student/learn/course', courseId, 'lesson', offlineLessonId]);
        return;
      }
    }

    this.router.navigate(['/student/learn/course', courseId]);
  }

  onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.sortBy.set(value);
  }

  toggleFilterNotStarted(): void {
    this.filterNotStarted.update(v => !v);
  }

  toggleFilterInProgress(): void {
    this.filterInProgress.update(v => !v);
  }

  toggleFilterCompleted(): void {
    this.filterCompleted.update(v => !v);
  }

  canDownload(course: EnhancedEnrolledCourse): boolean {
    // Only show download if: teacher enabled offline download AND (course is FREE or student has paid)
    const allowDownload = (course as any).allowOfflineDownload !== false;
    const isPaid = (course as any).isPaid !== false;
    return allowDownload && isPaid;
  }
}
