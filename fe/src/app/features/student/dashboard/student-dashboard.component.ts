import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { StudentEnrollmentService } from '../services/enrollment.service';
import { CourseApi } from '../../../api/client/course.api';
import { LearningActivityApi } from '../../../api/client/learning-activity.api';
import { IconComponent } from '../../../shared/components/ui/icon/icon.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
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
  completedCount?: number;
  totalCount?: number;
}

interface Course {
  id: string;
  title: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  status: 'in-progress' | 'completed';
  showModules: boolean;
  modules: Module[];
  currentLessonId: string | null;
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
    ButtonComponent
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
  private toast = inject(ToastService);

  // State
  activeTab = signal<'in-progress' | 'completed'>('in-progress');

  // "Continue where you left off" state
  continueData = signal<{
    lessonId: string;
    sectionId: string | null;
    courseId: string | null;
    courseTitle: string | null;
    lessonTitle: string | null;
    lastActivityAt: string;
  } | null>(null);

  // Featured card: merge continueData with enrolled course data (thumbnail, progress)
  continueCardData = computed(() => {
    const data = this.continueData();
    if (!data?.courseId) return null;
    const course = this.enrolledCourses().find(c => c.id === data.courseId);
    return {
      ...data,
      thumbnail: course?.thumbnail ?? null,
      progress: course?.progress ?? 0,
      completedLessons: course?.completedLessons ?? 0,
      totalLessons: course?.totalLessons ?? 0,
    };
  });

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
          lessonTitle: data.lessonTitle || null,
          lastActivityAt: data.lastActivityAt
        });
      }
    } catch {
      // Silent — widget won't show
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

    return this.enrolledCourses().map(course => {
      const rawModules = contents.get(course.id) || [];
      // Enrich modules with per-chapter progress counts
      const enrichedModules: Module[] = rawModules.map(m => ({
        ...m,
        completedCount: m.lessons.filter(l => l.completed).length,
        totalCount: m.lessons.length,
      }));
      // Find the first incomplete lesson across all modules (= current lesson)
      const currentLessonId = this.findFirstIncompleteLessonId(rawModules);

      return {
        id: course.id,
        title: course.title,
        progress: course.progress,
        completedLessons: course.completedLessons,
        totalLessons: course.totalLessons,
        status: (course.status === 'enrolled' ? 'in-progress' : course.status) as 'in-progress' | 'completed',
        showModules: expanded.has(course.id),
        modules: enrichedModules,
        currentLessonId,
        thumbnail: course.thumbnail
      };
    });
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

  // Computed - Get recent in-progress + enrolled courses (exclude hero card to avoid duplication)
  recentInProgress = computed(() => {
    const heroId = this.continueCardData()?.courseId;
    return this.courses()
      .filter(c => c.status === 'in-progress' && c.id !== heroId)
      .slice(0, 10);
  });

  recentCompleted = computed(() =>
    this.courses()
      .filter(c => c.status === 'completed')
      .slice(0, 5) // Show up to 5 completed courses
  );

  // Use enrollment service stats as computed signals
  inProgressCount = computed(() => this.enrollmentService.enrollmentStats().inProgress);
  averageProgress = computed(() => this.enrollmentService.enrollmentStats().averageProgress);

  private findFirstIncompleteLessonId(modules: Module[]): string | null {
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        if (!lesson.completed) return lesson.id;
      }
    }
    return null;
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }

  getUserFirstName(): string {
    const fullName = this.authService.currentUser()?.fullName || 'Bạn';
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

}
