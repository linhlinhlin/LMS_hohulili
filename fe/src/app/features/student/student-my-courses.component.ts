import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StudentEnrollmentService } from './services/enrollment.service';
import { EnrolledCourse } from './types';
import { IconComponent } from '../../shared/components/ui/icon/icon.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { CardComponent } from '../../shared/components/ui/card/card.component';
import { ProgressBarComponent } from '../../shared/components/ui/progress-bar/progress-bar.component';
import { TabsComponent, Tab } from '../../shared/components/ui/tabs/tabs.component';

// Enhanced course with modules
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
  selector: 'app-student-my-courses',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IconComponent,
    ButtonComponent,
    CardComponent,
    ProgressBarComponent,
    TabsComponent
  ],
  template: `
    <div class="my-courses-container">
      <!-- Main Content Area (70%) -->
      <div class="main-content">
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
                <!-- Top Section: Metadata -->
                <div class="course-metadata">
                  <div class="partner-info">
                    <div class="partner-logo">
                      <app-icon name="academic-cap" size="sm" />
                    </div>
                    <span class="partner-name">LMS Maritime</span>
                  </div>

                  <h3 class="course-title">
                    <a [routerLink]="['/student/learn/course', course.id]">
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

                  <div class="progress-bar-thin">
                    <div class="progress-fill" [style.width.%]="course.progress"></div>
                  </div>
                </div>

                <!-- Bottom Section: Next Item & Actions -->
                <div class="course-actions-section">
                  <div class="next-item-expandable" (click)="toggleModules(course.id)">
                    <div class="next-item-header">
                      <div class="next-item-info">
                        <app-icon name="play" size="sm" />
                        <div class="next-item-text">
                          <p class="next-item-title">Tiếp theo: Bài học 1</p>
                          <p class="next-item-meta">Video (15 phút)</p>
                        </div>
                      </div>
                      <app-icon 
                        [name]="course.showModules ? 'chevron-up' : 'chevron-down'" 
                        size="sm" 
                      />
                    </div>

                    <!-- Modules Dropdown -->
                    @if (course.showModules && course.modules) {
                      <div class="modules-dropdown" (click)="$event.stopPropagation()">
                        @for (module of course.modules; track module.id) {
                          <div class="module-item">
                            <div class="module-header">
                              <app-icon name="book-open" size="xs" />
                              <span class="module-title">{{ module.title }}</span>
                            </div>
                            <div class="lessons-list">
                              @for (lesson of module.lessons; track lesson.id) {
                                <a 
                                  [routerLink]="['/student/learn/course', course.id]"
                                  class="lesson-item"
                                  [class.completed]="lesson.completed">
                                  <span class="lesson-title">{{ lesson.title }}</span>
                                  @if (lesson.completed) {
                                    <app-icon name="check-circle" size="xs" class="check-icon" />
                                  }
                                </a>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  <!-- Action Buttons -->
                  <div class="action-buttons">
                    <app-button 
                      variant="primary" 
                      [fullWidth]="true"
                      (clicked)="resumeCourse(course.id)">
                      {{ activeTab() === 'completed' ? 'Xem lại' : 'Tiếp tục học' }}
                    </app-button>
                    <button class="menu-button" aria-label="More options">
                      <app-icon name="ellipsis-vertical" size="sm" />
                    </button>
                  </div>
                </div>
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
    @import '../../../styles/variables';

    .my-courses-container {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 32px;
      max-width: 1400px;
      margin: 0 auto;
      padding: 40px 48px;
      background: #FAFAFA;
      min-height: 100vh;

      @include mobile {
        grid-template-columns: 1fr;
        padding: 24px 16px;
        gap: 24px;
      }
    }

    .main-content {
      min-width: 0;
    }

    /* Coursera-Style Header */
    .coursera-header {
      margin-bottom: $spacing-8;
      padding: $spacing-6 0;
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
      background: linear-gradient(135deg, $blue-primary 0%, #0073E6 100%);
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
      padding: 16px 0;
      margin: 0 0 24px 0;
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

    /* Courses List - Horizontal Cards */
    .courses-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .course-card-wrapper {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 16px;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }
    }

    /* Course Metadata Section */
    .course-metadata {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .partner-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .partner-logo {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: $blue-primary;
    }

    .partner-name {
      font-size: 13px;
      color: #6B7280;
      font-weight: 500;
    }

    .course-title {
      margin: 0;

      a {
        font-size: 18px;
        font-weight: 600;
        color: #1F1F1F;
        text-decoration: none;
        display: block;
        line-height: 1.4;

        &:hover {
          color: $blue-primary;
        }
      }
    }

    .course-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #6B7280;
      flex-wrap: wrap;

      .separator {
        color: #D1D5DB;
      }

      .estimated {
        color: #9CA3AF;
      }
    }

    .progress-bar-thin {
      height: 4px;
      background: #E5E7EB;
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: $blue-primary;
      transition: width 0.3s ease;
    }

    /* Next Item Section */
    .next-item-section {
      flex: 1;
    }

    .next-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $spacing-3;
      background: $gray-50;
      border-radius: $radius-md;
      cursor: pointer;
      transition: background $transition-fast;

      &:hover {
        background: $gray-100;
      }
    }

    .next-item-info {
      display: flex;
      align-items: center;
      gap: $spacing-3;
      flex: 1;
      min-width: 0;

      app-icon {
        color: $blue-primary;
        flex-shrink: 0;
      }
    }

    .next-item-title {
      font-size: $text-sm;
      font-weight: $font-semibold;
      color: $text-primary;
      margin: 0 0 $spacing-1 0;
      @include line-clamp(1);
    }

    .next-item-meta {
      font-size: $text-xs;
      color: $text-secondary;
      margin: 0;
    }

    /* Modules Dropdown */
    .modules-dropdown {
      margin-top: $spacing-3;
      padding: $spacing-3;
      background: $gray-50;
      border-radius: $radius-md;
      max-height: 400px;
      overflow-y: auto;
    }

    .module-item {
      margin-bottom: $spacing-4;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .module-header {
      display: flex;
      align-items: center;
      gap: $spacing-2;
      margin-bottom: $spacing-2;
      padding: $spacing-2 0;

      app-icon {
        color: $text-muted;
      }
    }

    .module-title {
      font-size: $text-sm;
      font-weight: $font-semibold;
      color: $text-primary;
    }

    .lessons-list {
      display: flex;
      flex-direction: column;
      gap: $spacing-1;
    }

    .lesson-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $spacing-2 $spacing-3;
      background: white;
      border-radius: $radius-sm;
      text-decoration: none;
      transition: all $transition-fast;

      &:hover {
        background: $blue-light;
      }

      &.completed {
        .lesson-title {
          color: $text-secondary;
        }
      }
    }

    .lesson-info {
      display: flex;
      align-items: center;
      gap: $spacing-2;
      flex: 1;
      min-width: 0;

      app-icon {
        color: $text-muted;
        flex-shrink: 0;
      }
    }

    .lesson-title {
      font-size: $text-xs;
      color: $text-primary;
      @include line-clamp(1);
    }

    .lesson-meta {
      display: flex;
      align-items: center;
      gap: $spacing-2;
      flex-shrink: 0;

      .check-icon {
        color: $success;
      }
    }

    .lesson-duration {
      font-size: $text-xs;
      color: $text-muted;
    }

    /* Course Actions Section */
    .course-actions-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .next-item-expandable {
      cursor: pointer;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .menu-button {
      padding: 8px;
      background: transparent;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      cursor: pointer;
      color: #6B7280;
      transition: all 0.2s ease;
      flex-shrink: 0;

      &:hover {
        background: #F3F4F6;
        border-color: #D1D5DB;
      }
    }

    /* Filter Sidebar - Sticky */
    .filter-sidebar {
      position: sticky;
      top: 90px;
      height: fit-content;
      max-height: calc(100vh - 110px);
      overflow-y: auto;

      @include mobile {
        display: none;
      }
    }

    .sidebar-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
  private router = inject(Router);

  // State
  enrolledCourses = signal<EnhancedEnrolledCourse[]>([]);
  activeTab = signal<string>('in-progress');
  
  // Filter state
  sortBy = signal<string>('recent');
  filterNotStarted = signal<boolean>(false);
  filterInProgress = signal<boolean>(false);
  filterCompleted = signal<boolean>(false);

  // Tabs
  courseTabs: Tab[] = [
    { id: 'in-progress', label: 'Đang học' },
    { id: 'completed', label: 'Hoàn thành' }
  ];

  // Computed
  readonly filteredCourses = computed(() => {
    const courses = this.enrolledCourses();
    const tab = this.activeTab();
    
    if (tab === 'in-progress') {
      return courses.filter(c => c['status'] === 'in-progress' || c['status'] === 'enrolled');
    }
    return courses.filter(c => c['status'] === 'completed');
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
      
      // Enhance courses with modules
      const enhancedCourses: EnhancedEnrolledCourse[] = courses.map((course: any) => ({
        ...course,
        showModules: false,
        modules: this.generateMockModules(course['id'])
      }));

      this.enrolledCourses.set(enhancedCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  }

  private generateMockModules(courseId: string) {
    return [
      {
        id: '1',
        title: 'Chương 1: Giới thiệu',
        lessons: [
          { id: '1', title: 'Bài 1: Tổng quan', type: 'video' as const, duration: '15 phút', completed: true },
          { id: '2', title: 'Bài 2: Khái niệm cơ bản', type: 'reading' as const, duration: '10 phút', completed: false }
        ]
      },
      {
        id: '2',
        title: 'Chương 2: Thực hành',
        lessons: [
          { id: '3', title: 'Bài 3: Bài tập 1', type: 'quiz' as const, duration: '20 phút', completed: false }
        ]
      }
    ];
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
    this.enrolledCourses.update(courses =>
      courses.map(c =>
        c['id'] === courseId ? { ...c, showModules: !c.showModules } : c
      )
    );
  }

  toggleMenu(courseId: string): void {
    console.log('Menu clicked for course:', courseId);
  }

  resumeCourse(courseId: string): void {
    this.router.navigate(['/student/learn/course', courseId]);
  }

  onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.sortBy.set(value);
    console.log('Sort by:', value);
  }

  toggleFilterNotStarted(): void {
    this.filterNotStarted.update(v => !v);
    this.applyFilters();
  }

  toggleFilterInProgress(): void {
    this.filterInProgress.update(v => !v);
    this.applyFilters();
  }

  toggleFilterCompleted(): void {
    this.filterCompleted.update(v => !v);
    this.applyFilters();
  }

  applyFilters(): void {
    // Implement filter logic
    console.log('Filters applied');
  }
}
