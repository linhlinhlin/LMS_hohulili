import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { CourseApi } from '../../../api/client/course.api';
import { CourseContentSection } from '../../../api/types/course.types';

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  teacherName: string;
  enrolledCount: number;
  sectionsCount: number;
  progress?: number;
}

interface Section {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  durationMinutes?: number;
  isCompleted?: boolean;
}

@Component({
  selector: 'app-course-detail',
  imports: [CommonModule, RouterModule],
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseDetailComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private courseApi = inject(CourseApi);

  // State
  isLoading = signal(false);
  course = signal<CourseDetail | null>(null);
  sections = signal<Section[]>([]);
  expandedSections = signal<Set<string>>(new Set());
  isDescriptionExpanded = signal(false);

  // Computed
  totalLessons = computed(() => {
    return this.sections().reduce((sum, section) => sum + section.lessons.length, 0);
  });

  completedLessons = computed(() => {
    return this.sections().reduce((sum, section) => {
      return sum + section.lessons.filter(l => l.isCompleted).length;
    }, 0);
  });

  progressPercentage = computed(() => {
    const total = this.totalLessons();
    if (total === 0) return 0;
    return Math.round((this.completedLessons() / total) * 100);
  });

  totalDuration = computed(() => {
    return this.sections().reduce((sum, section) => {
      return sum + section.lessons.reduce((lessonSum, lesson) => {
        return lessonSum + (lesson.durationMinutes || 0);
      }, 0);
    }, 0);
  });

  ngOnInit(): void {
    const courseId = this.route.snapshot.paramMap.get('id');
    if (courseId) {
      this.loadCourse(courseId);
    }
  }

  loadCourse(courseId: string): void {
    this.isLoading.set(true);

    // Load course info
    this.courseApi.getCourseById(courseId).subscribe({
      next: (res) => {
        const detail = res?.data;
        this.course.set({
          id: courseId,
          title: detail?.title || '',
          description: detail?.description || '',
          teacherName: detail?.teacherName || '',
          enrolledCount: detail?.enrolledCount || 0,
          sectionsCount: detail?.sectionsCount || 0
        });
      },
      error: (err) => {
        console.error('Error loading course:', err);
      }
    });

    // Load course content
    this.courseApi.getCourseContent(courseId).subscribe({
      next: (res) => {
        const contentSections: CourseContentSection[] = res?.data || [];
        const mappedSections: Section[] = contentSections
          .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
          .map(section => ({
            id: section.id,
            title: section.title,
            description: section.description || '',
            orderIndex: section.orderIndex ?? 0,
            lessons: (section.lessons || [])
              .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
              .map(lesson => ({
                id: lesson.id,
                title: lesson.title,
                description: lesson.description || '',
                orderIndex: lesson.orderIndex ?? 0,
                durationMinutes: 0, // TODO: Get from API
                isCompleted: false // TODO: Get from progress tracking
              }))
          }));

        this.sections.set(mappedSections);
        
        // Expand first section by default
        if (mappedSections.length > 0) {
          this.expandedSections.update(set => {
            set.add(mappedSections[0].id);
            return new Set(set);
          });
        }

        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading course content:', err);
        this.isLoading.set(false);
      }
    });
  }

  toggleSection(sectionId: string): void {
    this.expandedSections.update(set => {
      if (set.has(sectionId)) {
        set.delete(sectionId);
      } else {
        set.add(sectionId);
      }
      return new Set(set);
    });
  }

  isSectionExpanded(sectionId: string): boolean {
    return this.expandedSections().has(sectionId);
  }

  startLearning(): void {
    const courseId = this.course()?.id;
    if (!courseId) return;

    // Navigate to first lesson
    const firstSection = this.sections()[0];
    if (firstSection && firstSection.lessons.length > 0) {
      const firstLesson = firstSection.lessons[0];
      this.router.navigate(['/student/learn/course', courseId, 'lesson', firstLesson.id]);
    } else {
      // No lessons, just navigate to course learning page
      this.router.navigate(['/student/learn/course', courseId]);
    }
  }

  resumeLearning(): void {
    const courseId = this.course()?.id;
    if (!courseId) return;

    // Try to get last viewed lesson from localStorage
    const storageKey = `learning_progress_${courseId}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.lastAccessedLessonId) {
          this.router.navigate(['/student/learn/course', courseId, 'lesson', data.lastAccessedLessonId]);
          return;
        }
      }
    } catch (error) {
      console.error('Error loading last viewed lesson:', error);
    }

    // Fallback to start learning
    this.startLearning();
  }

  goToLesson(lessonId: string): void {
    const courseId = this.course()?.id;
    if (!courseId) return;
    // Navigate to learning interface with specific lesson
    this.router.navigate(['/student/learn/course', courseId, 'lesson', lessonId]);
  }

  goBack(): void {
    this.router.navigate(['/student/my-courses']);
  }

  toggleDescription(): void {
    this.isDescriptionExpanded.update(expanded => !expanded);
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} phút`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}
