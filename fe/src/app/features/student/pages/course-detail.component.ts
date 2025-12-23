import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { CourseApi } from '../../../api/client/course.api';
import { CourseContentChapter, LessonSummary } from '../../../api/types/course.types';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { PaymentService, PaymentStatusResponse } from '../services/payment.service';
import { catchError, of } from 'rxjs';

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  teacherName: string;
  enrolledCount: number;
  chaptersCount: number;
  progress?: number;
  price?: number; // Thêm giá khóa học
}

interface Section {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  lessons: Lesson[];
}

interface SectionContent {
  id: string;
  title: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'FILE' | 'ASSIGNMENT';
  content?: string;
  videoUrl?: string;
  duration?: number;
  orderIndex: number;
  isRequired: boolean;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  durationMinutes?: number;
  isCompleted?: boolean;
  hasQuiz?: boolean;
  sections: SectionContent[];
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
  private quizApi = inject(QuizApi);
  private paymentService = inject(PaymentService);

  // Số bài học miễn phí
  readonly FREE_LESSONS_COUNT = 2;

  // State
  isLoading = signal(false);
  course = signal<CourseDetail | null>(null);
  sections = signal<Section[]>([]);
  expandedSections = signal<Set<string>>(new Set());
  isDescriptionExpanded = signal(false);

  // Payment state
  hasPaid = signal(false);
  paymentLoading = signal(false);

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

  // Computed: Số bài học có thể truy cập (dựa trên payment)
  accessibleLessonsCount = computed(() => {
    if (this.hasPaid()) return this.totalLessons();
    return Math.min(this.FREE_LESSONS_COUNT, this.totalLessons());
  });

  ngOnInit(): void {
    const courseId = this.route.snapshot.paramMap.get('id');
    if (courseId) {
      this.loadCourse(courseId);
      this.checkPaymentStatus(courseId);
    }
  }

  loadCourse(courseId: string): void {
    this.isLoading.set(true);

    // Load course info
    this.courseApi.getCourseById(courseId).subscribe({
      next: (res: any) => {
        const detail = res?.data;
        this.course.set({
          id: courseId,
          title: detail?.title || '',
          description: detail?.description || '',
          teacherName: detail?.teacherName || '',
          enrolledCount: detail?.enrolledCount || 0,
          chaptersCount: (detail as any)?.chaptersCount || 0,
          price: detail?.price || 500000 // Default price
        });
      },
      error: (err: any) => {
        console.error('Error loading course:', err);
      }
    });

    // Load course content
    this.courseApi.getCourseContent(courseId).subscribe({
      next: (res) => {
        const contentSections: CourseContentChapter[] = res?.data || [];
        const mappedSections: Section[] = contentSections
          .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
          .map(section => ({
            id: section.id,
            title: section.title,
            description: section.description || '',
            orderIndex: section.orderIndex ?? 0,
            lessons: (section.lessons || [])
              .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
              .map((lesson: LessonSummary) => ({
                id: lesson.id,
                title: lesson.title,
                description: lesson.description || '',
                orderIndex: lesson.orderIndex ?? 0,
                durationMinutes: lesson.sections?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0,
                isCompleted: false, // TODO: Get from progress tracking
                hasQuiz: lesson.sections?.some(s => s.type === 'QUIZ') || false,
                sections: (lesson.sections || []).map(s => ({
                  id: s.id,
                  title: s.title,
                  type: s.type as 'VIDEO' | 'TEXT' | 'QUIZ' | 'FILE' | 'ASSIGNMENT',
                  content: s.content,
                  videoUrl: s.videoUrl,
                  duration: s.duration,
                  orderIndex: s.orderIndex ?? 0,
                  isRequired: s.isRequired ?? false
                }))
              }))
          }));

        this.sections.set(mappedSections);

        // Check for quizzes for each lesson
        mappedSections.forEach(section => {
          section.lessons.forEach(lesson => {
            this.checkLessonQuiz(lesson.id);
          });
        });

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

  checkLessonQuiz(lessonId: string): void {
    this.quizApi.getQuizByLessonId(lessonId)
      .pipe(
        catchError((error) => {
          console.log(`No quiz found for lesson ${lessonId}`, error);
          return of(null);
        })
      )
      .subscribe(response => {
        console.log(`Quiz check for lesson ${lessonId}:`, response);

        // Check if quiz exists
        if (response && response.id) {
          console.log(`✅ Quiz found for lesson ${lessonId}`, response);
          // Update the lesson to mark it has a quiz
          this.sections.update(sections => {
            return sections.map(section => ({
              ...section,
              lessons: section.lessons.map(lesson =>
                lesson.id === lessonId ? { ...lesson, hasQuiz: true } : lesson
              )
            }));
          });
        } else {
          console.log(`❌ No quiz for lesson ${lessonId}`);
        }
      });
  }

  goToQuiz(lessonId: string, lessonTitle: string): void {
    // Navigate to quiz attempt with lesson ID
    this.router.navigate(['/student/quiz/take', lessonId]);
  }

  // ============ Payment Methods ============

  /**
   * Kiểm tra trạng thái thanh toán khóa học
   */
  checkPaymentStatus(courseId: string): void {
    this.paymentLoading.set(true);
    this.paymentService.getPaymentStatus(courseId).subscribe({
      next: (response) => {
        if (response.data) {
          this.hasPaid.set(response.data.hasPaid);
        }
        this.paymentLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error checking payment status:', err);
        this.paymentLoading.set(false);
      }
    });
  }

  /**
   * Kiểm tra bài học có được truy cập không
   * @param lessonIndex index trong danh sách flatten (0-based)
   */
  canAccessLesson(lessonIndex: number): boolean {
    if (this.hasPaid()) return true;
    return lessonIndex < this.FREE_LESSONS_COUNT;
  }

  /**
   * Lấy global index của lesson trong tất cả sections
   */
  getLessonGlobalIndex(sectionIndex: number, lessonIndexInSection: number): number {
    let globalIndex = 0;
    for (let i = 0; i < sectionIndex; i++) {
      globalIndex += this.sections()[i]?.lessons.length || 0;
    }
    return globalIndex + lessonIndexInSection;
  }

  /**
   * Điều hướng đến trang thanh toán
   */
  goToCheckout(): void {
    const courseId = this.course()?.id;
    if (!courseId) return;
    this.router.navigate(['/student/checkout', courseId]);
  }

  /**
   * Format giá tiền
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  }
}
