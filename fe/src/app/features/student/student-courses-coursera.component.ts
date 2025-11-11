import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { StudentEnrollmentService } from './services/enrollment.service';
import { EnrolledCourse } from './types';
import { IconComponent } from '../../shared/components/ui/icon/icon.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { CardComponent } from '../../shared/components/ui/card/card.component';
import { ProgressBarComponent } from '../../shared/components/ui/progress-bar/progress-bar.component';
import { TabsComponent, Tab } from '../../shared/components/ui/tabs/tabs.component';
import { LoadingSpinnerComponent } from '../../shared/components/ui/loading-spinner/loading-spinner.component';

/**
 * Student Courses Page - Coursera Style
 * 
 * Simple, clean course list with:
 * - Tab navigation (In Progress / Completed)
 * - Coursera-style course cards
 * - Responsive grid layout
 * - No gamification, no complex features
 */
@Component({
  selector: 'app-student-courses-coursera',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IconComponent,
    ButtonComponent,
    CardComponent,
    ProgressBarComponent,
    TabsComponent,
    LoadingSpinnerComponent
  ],
  template: `
    <div class="courses-container">
      <!-- Header -->
      <div class="courses-header">
        <div>
          <h1 class="page-title">Khóa học của tôi</h1>
          <p class="page-subtitle">Quản lý và theo dõi tiến độ học tập</p>
        </div>
        <app-button variant="primary" (clicked)="browseCourses()">
          <app-icon name="plus" size="sm" />
          Khám phá khóa học
        </app-button>
      </div>

      <!-- Stats Summary -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon bg-blue">
            <app-icon name="book-open" size="md" />
          </div>
          <div class="stat-content">
            <p class="stat-label">Tổng khóa học</p>
            <p class="stat-value">{{ enrolledCourses().length }}</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon bg-green">
            <app-icon name="clock" size="md" />
          </div>
          <div class="stat-content">
            <p class="stat-label">Đang học</p>
            <p class="stat-value">{{ inProgressCount() }}</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon bg-purple">
            <app-icon name="check-circle" size="md" />
          </div>
          <div class="stat-content">
            <p class="stat-label">Hoàn thành</p>
            <p class="stat-value">{{ completedCount() }}</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon bg-orange">
            <app-icon name="trophy" size="md" />
          </div>
          <div class="stat-content">
            <p class="stat-label">Chứng chỉ</p>
            <p class="stat-value">{{ certificatesCount() }}</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-section">
        <app-tabs
          [tabs]="courseTabs"
          [activeTabId]="activeTab()"
          (tabChanged)="onTabChange($event)"
          ariaLabel="Course filter tabs">
        </app-tabs>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-container">
          <app-loading-spinner size="lg" text="Đang tải khóa học..." />
        </div>
      }

      <!-- Empty State -->
      @else if (filteredCourses().length === 0) {
        <div class="empty-state">
          <app-icon name="book-open" size="xl" />
          <h3>{{ activeTab() === 'in-progress' ? 'Chưa có khóa học đang học' : 'Chưa hoàn thành khóa học nào' }}</h3>
          <p>{{ activeTab() === 'in-progress' ? 'Hãy bắt đầu học một khóa học mới' : 'Tiếp tục học để hoàn thành khóa học đầu tiên' }}</p>
          @if (activeTab() === 'in-progress') {
            <app-button variant="primary" (clicked)="browseCourses()">
              Khám phá khóa học
            </app-button>
          }
        </div>
      }

      <!-- Courses Grid -->
      @else {
        <div class="courses-grid">
          @for (course of filteredCourses(); track course.id) {
            <app-card class="course-card" [hover]="true" [padding]="false">
              <!-- Course Thumbnail -->
              <div class="course-thumbnail">
                <img [src]="course.thumbnail" [alt]="course.title" />
                @if (course.status === 'completed') {
                  <div class="completion-badge">
                    <app-icon name="check-circle" size="sm" />
                    <span>Hoàn thành</span>
                  </div>
                }
              </div>

              <!-- Course Content -->
              <div class="course-content">
                <!-- Course Info -->
                <div class="course-info">
                  <h3 class="course-title">
                    <a [routerLink]="['/student/learn/course', course.id]">
                      {{ course.title }}
                    </a>
                  </h3>
                  <p class="course-instructor">
                    <app-icon name="user" size="xs" />
                    {{ getInstructorName(course.instructor) }}
                  </p>
                </div>

                <!-- Progress (for in-progress courses) -->
                @if (course.status === 'in-progress') {
                  <div class="course-progress">
                    <div class="progress-info">
                      <span class="progress-label">
                        {{ course.completedLessons }} / {{ course.totalLessons }} bài học
                      </span>
                      <span class="progress-percentage">{{ course.progress }}%</span>
                    </div>
                    <app-progress-bar [progress]="course.progress" [thin]="true" />
                  </div>
                }

                <!-- Course Meta -->
                <div class="course-meta">
                  <span class="meta-item">
                    <app-icon name="clock" size="xs" />
                    {{ course.duration }}
                  </span>
                  @if (course.category) {
                    <span class="meta-item">
                      <app-icon name="academic-cap" size="xs" />
                      {{ getCategoryLabel(course.category) }}
                    </span>
                  }
                </div>

                <!-- Actions -->
                <div class="course-actions">
                  @if (course.status === 'in-progress') {
                    <app-button 
                      variant="primary" 
                      [fullWidth]="true"
                      (clicked)="continueCourse(course.id)">
                      Tiếp tục học
                      <app-icon name="arrow-right" size="sm" />
                    </app-button>
                  } @else if (course.status === 'completed') {
                    <app-button 
                      variant="outline" 
                      [fullWidth]="true"
                      (clicked)="reviewCourse(course.id)">
                      Xem lại
                    </app-button>
                  } @else {
                    <app-button 
                      variant="primary" 
                      [fullWidth]="true"
                      (clicked)="startCourse(course.id)">
                      Bắt đầu học
                    </app-button>
                  }
                </div>
              </div>
            </app-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    @import '../../../styles/variables';

    .courses-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: $spacing-8;
      background: $bg-page;
      min-height: 100vh;

      @include mobile {
        padding: $spacing-4;
      }
    }

    /* Header */
    .courses-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: $spacing-8;
      gap: $spacing-4;

      @include mobile {
        flex-direction: column;
        align-items: stretch;
      }
    }

    .page-title {
      font-size: $text-3xl;
      font-weight: $font-bold;
      color: $text-primary;
      margin: 0 0 $spacing-2 0;
    }

    .page-subtitle {
      font-size: $text-base;
      color: $text-secondary;
      margin: 0;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: $spacing-6;
      margin-bottom: $spacing-8;

      @include mobile {
        grid-template-columns: repeat(2, 1fr);
        gap: $spacing-4;
      }
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: $spacing-4;
      padding: $spacing-5;
      background: $bg-surface;
      border-radius: $radius-lg;
      box-shadow: $shadow-sm;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: $radius-lg;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: $blue-light;
      color: $blue-primary;
    }

    .stat-content {
      flex: 1;
      min-width: 0;
    }

    .stat-label {
      font-size: $text-sm;
      color: $text-secondary;
      margin: 0 0 $spacing-1 0;
    }

    .stat-value {
      font-size: $text-2xl;
      font-weight: $font-bold;
      color: $text-primary;
      margin: 0;
    }

    /* Tabs */
    .tabs-section {
      margin-bottom: $spacing-6;
    }

    /* Loading */
    .loading-container {
      display: flex;
      justify-content: center;
      padding: $spacing-16;
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
        margin: 0 0 $spacing-6 0;
      }
    }

    /* Courses Grid */
    .courses-grid {
      display: grid;
      gap: $spacing-6;
      grid-template-columns: 1fr;

      @media (min-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (min-width: 1024px) {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .course-card {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: transform $transition-fast;

      &:hover {
        transform: translateY(-4px);
      }
    }

    /* Course Thumbnail */
    .course-thumbnail {
      position: relative;
      width: 100%;
      height: 180px;
      overflow: hidden;
      background: $gray-200;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .completion-badge {
      position: absolute;
      top: $spacing-3;
      right: $spacing-3;
      display: flex;
      align-items: center;
      gap: $spacing-1;
      padding: $spacing-1 $spacing-3;
      background: $success;
      color: white;
      border-radius: $radius-full;
      font-size: $text-xs;
      font-weight: $font-semibold;
    }

    /* Course Content */
    .course-content {
      padding: $spacing-4;
      display: flex;
      flex-direction: column;
      gap: $spacing-4;
      flex: 1;
    }

    .course-info {
      flex: 1;
    }

    .course-title {
      margin: 0 0 $spacing-2 0;

      a {
        font-size: $text-lg;
        font-weight: $font-semibold;
        color: $text-primary;
        text-decoration: none;
        @include line-clamp(2);

        &:hover {
          color: $blue-primary;
        }
      }
    }

    .course-instructor {
      display: flex;
      align-items: center;
      gap: $spacing-1;
      font-size: $text-sm;
      color: $text-secondary;
      margin: 0;
    }

    /* Progress */
    .course-progress {
      padding-top: $spacing-3;
      border-top: 1px solid $border-light;
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $spacing-2;
    }

    .progress-label {
      font-size: $text-xs;
      color: $text-secondary;
      font-weight: $font-medium;
    }

    .progress-percentage {
      font-size: $text-xs;
      color: $text-primary;
      font-weight: $font-semibold;
    }

    /* Course Meta */
    .course-meta {
      display: flex;
      align-items: center;
      gap: $spacing-3;
      flex-wrap: wrap;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: $spacing-1;
      font-size: $text-xs;
      color: $text-muted;
    }

    /* Actions */
    .course-actions {
      padding-top: $spacing-3;
      border-top: 1px solid $border-light;
    }
  `]
})
export class StudentCoursesCourseraComponent implements OnInit {
  private enrollmentService = inject(StudentEnrollmentService);
  private router = inject(Router);

  // State
  enrolledCourses = signal<EnrolledCourse[]>([]);
  isLoading = signal(false);
  activeTab = signal<string>('in-progress');

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
      return courses.filter(c => c.status === 'in-progress' || c.status === 'enrolled');
    }
    return courses.filter(c => c.status === 'completed');
  });

  readonly inProgressCount = computed(() =>
    this.enrolledCourses().filter(c => c.status === 'in-progress' || c.status === 'enrolled').length
  );

  readonly completedCount = computed(() =>
    this.enrolledCourses().filter(c => c.status === 'completed').length
  );

  readonly certificatesCount = computed(() =>
    this.enrolledCourses().filter(c => c.certificate).length
  );

  ngOnInit(): void {
    this.loadCourses();
  }

  private async loadCourses(): Promise<void> {
    try {
      this.isLoading.set(true);
      await this.enrollmentService.loadEnrolledCourses();
      this.enrolledCourses.set(this.enrollmentService.enrolledCourses());
    } catch (error) {
      console.error('[ERROR] Error loading courses:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  continueCourse(courseId: string): void {
    this.router.navigate(['/student/learn/course', courseId]);
  }

  startCourse(courseId: string): void {
    this.router.navigate(['/student/learn/course', courseId]);
  }

  reviewCourse(courseId: string): void {
    this.router.navigate(['/student/learn/course', courseId]);
  }

  browseCourses(): void {
    this.router.navigate(['/courses']);
  }

  getInstructorName(instructor: any): string {
    if (typeof instructor === 'string') return instructor;
    return instructor?.name || 'Giảng viên';
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'safety': 'An toàn hàng hải',
      'navigation': 'Hàng hải',
      'engineering': 'Kỹ thuật',
      'logistics': 'Quản lý cảng',
      'law': 'Luật',
      'certificates': 'Chứng chỉ'
    };
    return labels[category] || category;
  }
}
