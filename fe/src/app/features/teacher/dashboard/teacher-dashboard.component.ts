import { Component, inject, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TeacherService } from '../infrastructure/services/teacher.service';
import { TeacherCourse } from '../types/teacher.types';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent, IconName } from '../../../shared/components/ui/icon/icon.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { CardComponent } from '../../../shared/components/ui/card/card.component';
import { ProgressBarComponent } from '../../../shared/components/ui/progress-bar/progress-bar.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';

interface Activity {
  id: string;
  icon: string;
  text: string;
  time: string;
}

/**
 * Teacher Dashboard - Coursera Style
 * 
 * Professional dashboard with:
 * - Greeting + KPI cards
 * - Recent courses with status badges
 * - Pending assignments with progress
 * - Sidebar widgets (Stats, Top Students, Activities)
 */
@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IconComponent,
    ButtonComponent,
    CardComponent,
    ProgressBarComponent,
    BadgeComponent
  ],
  templateUrl: './teacher-dashboard.component.html',
  styleUrl: './teacher-dashboard.component.scss'
  // Removed OnPush - signals work better with default change detection
})
export class TeacherDashboardComponent implements OnInit {
  protected teacher = inject(TeacherService);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    // Effect to log when data changes
    effect(() => {
      console.log('[TEACHER DASHBOARD] Courses updated:', this.teacher.courses().length);
      console.log('[TEACHER DASHBOARD] Loading state:', this.teacher.isLoading());
    });
  }

  ngOnInit(): void {
    // Explicitly load data when component initializes
    console.log('[TEACHER DASHBOARD] Component initialized, loading data...');
    this.teacher.loadMyCourses()
      .then(() => {
        console.log('[TEACHER DASHBOARD] ✅ Data loaded successfully');
      })
      .catch(error => {
        console.error('[TEACHER DASHBOARD] ❌ Failed to load courses:', error);
      });
  }

  // Tab state
  activeTab = computed(() => 'courses' as 'courses' | 'assignments');
  private _activeTab = 'courses' as 'courses' | 'assignments';

  // Computed values - Show only 2 most recent items
  recentCourses = computed(() => 
    this.teacher.courses().slice(0, 2)
  );

  pendingAssignments = computed(() =>
    this.teacher.assignments()
      .filter(a => a.status === 'pending' || a.status === 'submitted')
      .slice(0, 2)
  );

  pendingAssignmentsCount = computed(() =>
    this.teacher.assignments()
      .filter(a => a.status === 'pending' || a.status === 'submitted')
      .length
  );

  averageRating = computed(() => {
    const courses = this.teacher.courses();
    if (courses.length === 0) return '0.0';
    const sum = courses.reduce((acc, c) => acc + (c.rating || 0), 0);
    return (sum / courses.length).toFixed(1);
  });

  topStudents = computed(() => 
    [...this.teacher.students()]
      .sort((a, b) => (b.averageGrade || 0) - (a.averageGrade || 0))
      .slice(0, 3)
  );

  pendingGradingCount = computed(() =>
    this.teacher.assignments()
      .filter(a => a.status === 'submitted')
      .reduce((sum, a) => sum + (a.submissions || 0), 0)
  );

  newStudentsThisWeek = computed(() => {
    // Mock data - in real app, filter by enrollment date
    return 12;
  });

  recentActivities = computed<Activity[]>(() => [
    {
      id: '1',
      icon: 'users',
      text: '5 học viên mới đăng ký khóa học',
      time: '2 giờ trước'
    },
    {
      id: '2',
      icon: 'clipboard-document-check',
      text: '12 bài tập mới được nộp',
      time: '4 giờ trước'
    },
    {
      id: '3',
      icon: 'star',
      text: 'Nhận được 3 đánh giá 5 sao',
      time: '1 ngày trước'
    }
  ]);

  // Helper methods
  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }

  getUserFirstName(): string {
    const fullName = this.authService.currentUser()?.name || 'Giảng viên';
    return fullName.split(' ').pop() || fullName;
  }

  getStatusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
    switch (status) {
      case 'active':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'default';
      default:
        return 'info';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Đang hoạt động';
      case 'draft':
        return 'Nháp';
      case 'archived':
        return 'Đã lưu trữ';
      default:
        return status;
    }
  }

  getAssignmentStatusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
    switch (status) {
      case 'graded':
        return 'success';
      case 'pending':
        return 'warning';
      case 'submitted':
        return 'info';
      default:
        return 'default';
    }
  }

  getAssignmentStatusLabel(status: string): string {
    switch (status) {
      case 'graded':
        return 'Đã chấm';
      case 'pending':
        return 'Chờ nộp';
      case 'submitted':
        return 'Đã nộp';
      default:
        return status;
    }
  }

  getSubmissionProgress(assignment: any): number {
    if (!assignment.totalStudents) return 0;
    return Math.round((assignment.submissions / assignment.totalStudents) * 100);
  }

  // Navigation methods
  editCourse(courseId: string): void {
    this.router.navigate(['/teacher/courses', courseId, 'edit']);
  }

  viewCourse(courseId: string): void {
    this.router.navigate(['/teacher/courses', courseId]);
  }

  gradeAssignment(assignmentId: string): void {
    this.router.navigate(['/teacher/assignments', assignmentId, 'grade']);
  }

  viewAllStudents(): void {
    this.router.navigate(['/teacher/students']);
  }

  getCourseCode(course: TeacherCourse): string {
    // Generate course code from id or use a default pattern
    return `COURSE-${course.id.toUpperCase().slice(0, 6)}`;
  }

  getActivityIcon(iconName: string): IconName {
    // Map activity icon names to valid IconName type
    const iconMap: Record<string, IconName> = {
      'users': 'users',
      'clipboard-document-check': 'clipboard-document-check',
      'star': 'star',
      'user': 'user',
      'bell': 'bell',
      'check-circle': 'check-circle'
    };
    return iconMap[iconName] || 'bell';
  }

  // Tab switching
  switchTab(tab: 'courses' | 'assignments'): void {
    this._activeTab = tab;
  }

  isActiveTab(tab: 'courses' | 'assignments'): boolean {
    return this._activeTab === tab;
  }
}