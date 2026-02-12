import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { StudentEnrollmentService } from '../services/enrollment.service';
import { CourseApi } from '../../../api/client/course.api';
import { LearningActivityApi, ContinueWhereLeftOffResponse, StudyTimeResponse } from '../../../api/client/learning-activity.api';
import { GamificationApi, GamificationProfile, AchievementResponse, HeatmapEntry } from '../../../api/client/gamification.api';
import { IconComponent } from '../../../shared/components/ui/icon/icon.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { CardComponent } from '../../../shared/components/ui/card/card.component';
import { ToastService } from '../../../core/services/toast.service';


interface LessonSection {
  id: string;
  title: string;
  type: string;
}

interface Lesson {
  id: string;
  title: string;
  completed: boolean;
  sections?: LessonSection[];
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface NextItem {
  title: string;
  type: string;
  duration: string;
}

interface Course {
  id: string;
  title: string;
  instructor: string;
  partner: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  status: 'in-progress' | 'completed';
  estimatedCompletion: string;
  showModules: boolean;
  nextItem: NextItem;
  modules: Module[];
  thumbnail?: string;
}

/**
 * Student Dashboard - LMS Style with Course Cards
 * 
 * Dashboard with:
 * - Greeting + Career goal
 * - Course cards with tabs (In Progress / Completed)
 * - Sidebar widgets (Goals, Learning Plan, Statistics)
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-student-dashboard',
  imports: [
    RouterModule,
    IconComponent,
    ButtonComponent,
    CardComponent
],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.scss']
})
export class StudentDashboardComponent implements OnInit {
  protected authService = inject(AuthService);
  protected router = inject(Router);
  private enrollmentService = inject(StudentEnrollmentService);
  private courseApi = inject(CourseApi);
  private activityApi = inject(LearningActivityApi);
  private gamificationApi = inject(GamificationApi);
  private toast = inject(ToastService);

  // State
  careerGoal = signal<string>('Chuyên gia Hàng hải');
  todayGoalProgress = signal<number>(0);
  learningStreak = signal<number>(0);
  completedGoals = signal<number>(0);
  totalStudyTime = signal<number>(0);

  // Gamification data
  achievements = signal<AchievementResponse[]>([]);
  totalAchievements = signal<number>(0);
  activeTab = signal<'in-progress' | 'completed'>('in-progress');

  // "Continue where you left off" state
  continueData = signal<{
    lessonId: string;
    sectionId: string | null;
    courseId: string | null;
    courseTitle: string | null;
    lastActivityAt: string;
  } | null>(null);

  // Today's study time from server
  todayStudyTime = signal<string>('0 phút');
  todayStudySeconds = signal<number>(0);

  // Loading state
  isLoading = this.enrollmentService.isLoading;

  // Error state
  error = signal<string | null>(null);

  // Get enrolled courses from service
  enrolledCourses = this.enrollmentService.enrolledCourses;

  // Track which courses have modules expanded
  private expandedModules = signal<Set<string>>(new Set());

  ngOnInit(): void {
    try {
      // Mark body as loaded to prevent FOUC
      if (typeof document !== 'undefined') {
        document.body.classList.add('loaded');
      }

      // Load enrolled courses on component init
      this.enrollmentService.loadEnrolledCourses(0, 20);

      // Load "continue where you left off" data
      this.loadContinueData();

      // Load today's study time
      this.loadTodayStudyTime();

      // Load gamification profile (streak, achievements, daily goal)
      this.loadGamificationProfile();

      // Load real heatmap data
      this.loadHeatmapData();
    } catch (err) {
      this.error.set('Không thể tải danh sách khóa học. Vui lòng thử lại sau.');
    }
  }

  private async loadContinueData(): Promise<void> {
    try {
      const res = await firstValueFrom(this.activityApi.getContinueWhereLeftOff());
      if (res?.success && res.data) {
        const data = res.data as any;
        this.continueData.set({
          lessonId: data.lessonId,
          sectionId: data.sectionId || null,
          courseId: data.courseId || null,
          courseTitle: data.courseTitle || null,
          lastActivityAt: data.lastActivityAt
        });
      }
    } catch {
      // Silent — widget won't show
    }
  }

  private async loadTodayStudyTime(): Promise<void> {
    try {
      const res = await firstValueFrom(this.activityApi.getTodayStudyTime());
      if (res?.success && res.data) {
        const data = res.data as StudyTimeResponse;
        this.todayStudyTime.set(data.todayFormatted);
        this.todayStudySeconds.set(data.todaySeconds);
      }
    } catch {
      // Silent
    }
  }

  continueLastActivity(): void {
    const data = this.continueData();
    if (!data) return;

    if (data.courseId) {
      this.router.navigate(['/student/learn/course', data.courseId, 'lesson', data.lessonId]);
    } else {
      // Fallback: navigate to my courses
      this.router.navigate(['/student/my-courses']);
    }
  }

  // Store course content (modules/lessons) loaded from API
  private courseContents = signal<Map<string, Module[]>>(new Map());

  // Map enrolled courses to dashboard course format with modules
  courses = computed(() => {
    const expanded = this.expandedModules();
    const contents = this.courseContents();

    return this.enrolledCourses().map(course => ({
      id: course.id,
      title: course.title,
      instructor: typeof course.instructor === 'string' ? course.instructor : course.instructor.name,
      partner: 'LMS Maritime',
      progress: course.progress,
      completedLessons: course.completedLessons,
      totalLessons: course.totalLessons,
      status: (course.status === 'enrolled' ? 'in-progress' : course.status) as 'in-progress' | 'completed',
      estimatedCompletion: course.status === 'completed' ? 'Completed' : 'Đang học',
      showModules: expanded.has(course.id),
      nextItem: {
        title: course.status === 'completed' ? 'Khóa học đã hoàn thành' : 'Tiếp theo: Bài học 1',
        type: course.status === 'completed' ? 'Certificate' : 'Video',
        duration: course.status === 'completed' ? '' : '(15 phút)'
      },
      modules: contents.get(course.id) || [],
      thumbnail: course.thumbnail
    }));
  });

  // Load course content (modules/lessons) from API
  private async loadCourseContent(courseId: string): Promise<void> {
    try {
      const response = await firstValueFrom(this.courseApi.getCourseContent(courseId));
      const sections = response.data || [];

      // Transform API response to Module format
      const modules: Module[] = sections.map((section: any) => ({
        id: section.id,
        title: section.title,
        lessons: (section.lessons || []).map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          completed: lesson.completed || false,
          sections: (lesson.sections || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            type: s.type || 'TEXT'
          }))
        }))
      }));

      // Update courseContents map
      this.courseContents.update(contents => {
        const newMap = new Map(contents);
        newMap.set(courseId, modules);
        return newMap;
      });
    } catch {
      this.toast.error('Không thể tải nội dung khóa học.');
    }
  }

  // Computed - Get recent in-progress + enrolled courses (show more for dashboard)
  recentInProgress = computed(() =>
    this.courses()
      .filter(c => c.status === 'in-progress') // enrolled is already normalized to in-progress
      .slice(0, 10) // Show up to 10 courses on dashboard
  );

  recentCompleted = computed(() =>
    this.courses()
      .filter(c => c.status === 'completed')
      .slice(0, 5) // Show up to 5 completed courses
  );

  // Use enrollment service stats as computed signals
  inProgressCount = computed(() => this.enrollmentService.enrollmentStats().inProgress);
  averageProgress = computed(() => this.enrollmentService.enrollmentStats().averageProgress);

  // Learning heatmap (12 months / 52 weeks) - GitHub style with maritime blue
  learningHeatmap = signal(this.generateEmptyHeatmap());

  private generateEmptyHeatmap() {
    const weeks = [];
    const today = new Date();
    for (let weekIndex = 0; weekIndex < 52; weekIndex++) {
      const days = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const daysAgo = (51 - weekIndex) * 7 + (6 - dayIndex);
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);
        days.push({ date: date.toISOString().split('T')[0], level: 0, count: 0 });
      }
      weeks.push({ week: weekIndex + 1, days });
    }
    return weeks;
  }

  private async loadGamificationProfile(): Promise<void> {
    try {
      const res = await firstValueFrom(this.gamificationApi.getProfile());
      if (res?.success && res.data) {
        const profile = res.data as GamificationProfile;
        this.learningStreak.set(profile.streak?.currentStreak ?? 0);
        this.totalAchievements.set(profile.totalAchievements ?? 0);
        this.achievements.set(profile.achievements ?? []);
        if (profile.todayStudyMinutes != null && profile.dailyGoalMinutes) {
          const progress = Math.min(3, Math.floor(profile.todayStudyMinutes / (profile.dailyGoalMinutes / 3)));
          this.todayGoalProgress.set(progress);
        }
      }
    } catch {
      // Silent — use defaults
    }
    // Also trigger streak check
    this.gamificationApi.checkStreak().subscribe({
      error: () => {} // Non-blocking — next visit will retry
    });
  }

  private async loadHeatmapData(): Promise<void> {
    try {
      const res = await firstValueFrom(this.gamificationApi.getHeatmap(12));
      if (res?.success && res.data) {
        const entries = res.data as HeatmapEntry[];
        const entryMap = new Map<string, HeatmapEntry>();
        for (const e of entries) {
          entryMap.set(e.date, e);
        }
        // Merge real data into heatmap grid
        const weeks = this.generateEmptyHeatmap();
        for (const week of weeks) {
          for (const day of week.days) {
            const entry = entryMap.get(day.date);
            if (entry) {
              day.count = entry.count;
              day.level = entry.level;
            }
          }
        }
        this.learningHeatmap.set(weeks);
      }
    } catch {
      // Silent — keep empty heatmap
    }
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

  async continueCourse(courseId: string): Promise<void> {
    try {
      // Get next lesson from backend
      const response = await firstValueFrom(this.courseApi.getNextLesson(courseId));
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

  isEditingGoal = signal(false);

  editGoal(): void {
    this.isEditingGoal.update(v => !v);
  }

  saveGoal(value: string): void {
    if (value.trim()) {
      this.careerGoal.set(value.trim());
    }
    this.isEditingGoal.set(false);
  }

  setLearningPlan(): void {
    this.router.navigate(['/student/my-courses']);
  }

  toggleModules(courseId: string): void {
    const isCurrentlyExpanded = this.expandedModules().has(courseId);

    this.expandedModules.update(expanded => {
      const newSet = new Set(expanded);
      if (isCurrentlyExpanded) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
        // Load course content if not already loaded
        if (!this.courseContents().has(courseId)) {
          this.loadCourseContent(courseId);
        }
      }
      return newSet;
    });
  }

  switchTab(tab: 'in-progress' | 'completed'): void {
    this.activeTab.set(tab);
  }

  getAchievementIcon(icon: string): string {
    const map: Record<string, string> = {
      flame: 'fire', fire: 'fire', trophy: 'trophy', star: 'star',
      anchor: 'anchor', bullseye: 'target', clock: 'clock', ship: 'ship', footsteps: 'footprints'
    };
    return map[icon] || 'certificate';
  }

  getRelativeTime(isoString: string): string {
    if (!isoString) return '';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  }
}
