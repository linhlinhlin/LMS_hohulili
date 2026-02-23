import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { StudentEnrollmentService } from './services/enrollment.service';
import { CourseApi } from '../../api/client/course.api';
import { EnrolledCourse } from './types';
import { IconComponent } from '../../shared/components/ui/icon/icon.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { CardComponent } from '../../shared/components/ui/card/card.component';
import { ProgressBarComponent } from '../../shared/components/ui/progress-bar/progress-bar.component';
import { TabsComponent, Tab } from '../../shared/components/ui/tabs/tabs.component';
import { ToastService } from '../../core/services/toast.service';
import { CourseDownloadButtonComponent } from '../../shared/components/course-download-button/course-download-button.component';

// Enhanced course with modules
interface LessonSection {
  id: string;
  title: string;
  type: string;
}

interface EnhancedEnrolledCourse extends EnrolledCourse {
  showModules?: boolean;
  estimatedCompletion?: string;
  modules?: Array<{
    id: string;
    title: string;
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
        <!-- Coursera-Style Header -->
        <div class="coursera-header">
          <div class="header-content">
            <div class="avatar-circle">
              {{ getUserInitials() }}
            </div>
            <div class="greeting-section">
              <h1 class="greeting-title">{{ getGreeting() }}, {{ getUserFirstName() }}</h1>
              <p class="greeting-subtitle">Tiếp tục hành trình học tập của bạn</p>
            </div>
          </div>
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
                    <span class="partner-name">LMS Maritime</span>
                  </div>
                  <h3 class="course-title">
                    <a [routerLink]="['/student/course', course.id]">
                      {{ course.title }}
                    </a>
                  </h3>
                  <div class="course-meta">
                    <span>Khóa học</span>
                    <span class="separator">·</span>
                    <span>{{ course.progress }}% hoàn thành</span>
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
                    {{ activeTab() === 'completed' ? 'Xem lại' : 'Tiếp tục học' }}
                  </app-button>
                  <app-course-download-button [courseId]="course.id" [courseTitle]="course.title" />
                  <button class="dropdown-button" (click)="toggleModules(course.id)" aria-label="Show lessons">
                    <app-icon [name]="course.showModules ? 'chevron-up' : 'chevron-down'" size="sm" />
                  </button>
                </div>

                <!-- Progress Bar -->
                <div class="progress-bar-thin">
                  <div class="progress-fill" [style.width.%]="course.progress"></div>
                </div>
              </div>

              <!-- Modules Dropdown -->
              @if (course.showModules && course.modules && course.modules.length > 0) {
                <div class="modules-dropdown">
                  @for (module of course.modules; track module.id) {
                    <div class="module-item">
                      <div class="module-header">
                        <app-icon name="book-open" size="xs" />
                        <span class="module-title">{{ module.title }}</span>
                      </div>
                      <div class="lessons-list">
                        @for (lesson of module.lessons; track lesson.id) {
                          <a
                            [routerLink]="['/student/learn/course', course.id, 'lesson', lesson.id]"
                            class="lesson-item"
                            [class.completed]="lesson.completed">
                            <span class="lesson-title">{{ lesson.title }}</span>
                            @if (lesson.completed) {
                              <app-icon name="check-circle" size="xs" class="check-icon" />
                            }
                          </a>
                          @if (lesson.sections && lesson.sections.length > 0) {
                            <div style="padding-left:24px;display:flex;flex-direction:column;gap:2px;margin-top:2px">
                              @for (sec of lesson.sections; track sec.id) {
                                <div style="display:flex;align-items:center;gap:6px;padding:4px 8px;font-size:12px;color:#6B7280">
                                  @if (sec.type === 'VIDEO') {
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                                  } @else if (sec.type === 'QUIZ') {
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                                  } @else {
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                  }
                                  <span>{{ sec.title }}</span>
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
              <option value="title">Tên khóa học</option>
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
        grid-template-columns: auto 1fr;
        grid-template-rows: auto auto auto;
        grid-template-areas:
          "logo metadata"
          "logo progress"
          "actions actions";
        row-gap: 8px;
        padding: 12px;
      }

      .course-thumbnail {
        width: 160px;
        height: 90px;
      }

      .action-buttons {
        justify-self: stretch;
        
        app-button {
          flex: 1;
        }
      }
    }

    .main-content {
      min-width: 0;
    }

    /* Coursera-Style Header */
    .coursera-header {
      margin-bottom: 24px;
      padding: 24px 16px 16px 16px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: $spacing-4;
    }

    .avatar-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: $blue-primary;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: $text-2xl;
      font-weight: $font-bold;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 86, 210, 0.2);

      @include mobile {
        width: 48px;
        height: 48px;
        font-size: $text-lg;
      }
    }

    .greeting-section {
      flex: 1;
      min-width: 0;
    }

    .greeting-title {
      font-size: $text-3xl;
      font-weight: $font-bold;
      color: $text-primary;
      margin: 0 0 $spacing-1 0;
      line-height: 1.2;

      @include mobile {
        font-size: $text-2xl;
      }
    }

    .greeting-subtitle {
      font-size: $text-base;
      color: $text-secondary;
      margin: 0;
      line-height: 1.5;

      @include mobile {
        font-size: $text-sm;
      }
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

    .course-card-wrapper {
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      overflow: visible;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease;
      display: grid;
      grid-template-columns: auto 1fr auto;
      grid-template-rows: auto auto;
      grid-template-areas:
        "logo metadata actions"
        "logo progress actions";
      column-gap: 16px;
      row-gap: 10px;
      padding: 8px;
      align-items: start;

      &:hover {
        background: #F9FAFB;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }
    }

    /* Left Section - Course Thumbnail */
    .course-thumbnail {
      grid-area: logo;
      width: 160px;
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      flex-shrink: 0;
      align-self: center;
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
      grid-area: metadata;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      overflow: visible;
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
    }

    /* Progress Bar - Compact Style */
    .progress-bar-thin {
      grid-area: progress;
      width: 100%;
      height: 6px;
      background: #E5E7EB;
      border-radius: 3px;
      overflow: hidden;
      position: relative;
      align-self: start;
      margin-top: 2px;
    }

    .progress-fill {
      height: 100%;
      background: $blue-primary;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    /* Action Buttons - Compact Style */
    .action-buttons {
      grid-area: actions;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-self: end;
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

    /* Modules Dropdown */
    .modules-dropdown {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-top: none;
      border-radius: 0 0 8px 8px;
      padding: 16px;
      margin: -8px 0 0 0;
    }

    .module-item {
      margin-bottom: 16px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .module-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;

      app-icon {
        color: #6B7280;
        width: 14px;
        height: 14px;
      }
    }

    .module-title {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }

    .lessons-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-left: 22px;
    }

    .lesson-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: white;
      border-radius: 6px;
      text-decoration: none;
      transition: all 0.2s ease;
      border: 1px solid transparent;

      &:hover {
        background: #E5E7EB;
        border-color: #D1D5DB;
      }

      &.completed {
        .lesson-title {
          color: #9CA3AF;
          text-decoration: line-through;
        }
      }
    }

    .lesson-title {
      font-size: 13px;
      color: #374151;
      flex: 1;
      line-height: 1.4;
    }

    .check-icon {
      color: #10B981;
      flex-shrink: 0;
      width: 14px;
      height: 14px;
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
    }
    // 'recent' = default order from API

    return result;
  });

  readonly inProgressCount = computed(() =>
    this.enrolledCourses().filter(c => c['status'] === 'in-progress').length
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
      const response = await firstValueFrom(this.courseApi.getCourseContent(courseId));
      const sections = response.data || [];

      // Transform API response to module format
      const modules = sections.map((section: any) => ({
        id: section.id,
        title: section.title,
        lessons: (section.lessons || []).map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          type: this.getLessonType(lesson.lessonType),
          duration: lesson.durationMinutes ? `${lesson.durationMinutes} phút` : '',
          completed: lesson.completed || false,
          sections: (lesson.sections || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            type: s.type || 'TEXT'
          }))
        }))
      }));

      // Update the specific course with loaded modules
      this.enrolledCourses.update(courses =>
        courses.map(c =>
          c['id'] === courseId ? { ...c, modules } : c
        )
      );
    } catch {
      this.toast.error('Không thể tải nội dung khóa học.');
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
    const fullName = this.authService.currentUser()?.name || 'Bạn';
    return fullName.split(' ').pop() || fullName;
  }

  getUserInitials(): string {
    const fullName = this.authService.currentUser()?.name || 'U';
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
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
        // Fallback to course overview
        this.router.navigate(['/student/learn/course', courseId]);
      }
    } catch (error) {
      // Fallback to course overview
      this.router.navigate(['/student/learn/course', courseId]);
    }
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
}
