import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { CourseApi } from '../../../api/client/course.api';
import { CourseContentChapter, LessonSummary } from '../../../api/types/course.types';
import { PaymentService } from '../../payment/payment.service';
import { CourseReviewApi, ReviewDTO, ReviewSummary, SubmitReviewRequest } from '../../../api/endpoints/course-review.api';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { StudentEnrollmentService } from '../services/enrollment.service';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../state/course.service';

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  teacherName: string;
  enrolledCount: number;
  chapterCount: number;
  progress?: number;
  price?: number;
  salePrice?: number;
  priceType?: string;
  deliveryMode?: 'SELF_PACED' | 'INSTRUCTOR_LED';
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
  hasQuiz?: boolean;
  primaryType?: 'VIDEO' | 'TEXT' | 'QUIZ' | 'FILE' | 'ASSIGNMENT';
  sections: SectionContent[];
}

@Component({
  selector: 'app-course-detail',
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseDetailComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private courseApi = inject(CourseApi);
  private paymentService = inject(PaymentService);
  private reviewApi = inject(CourseReviewApi);
  private toast = inject(ToastService);
  private enrollmentService = inject(StudentEnrollmentService);
  private authService = inject(AuthService);
  private courseService = inject(CourseService);

  readonly FREE_LESSONS_COUNT = 2;

  // State
  isLoading = signal(false);
  loadError = signal<string | null>(null);
  course = signal<CourseDetail | null>(null);
  sections = signal<Section[]>([]);
  expandedSections = signal<Set<string>>(new Set());
  isDescriptionExpanded = signal(false);
  allExpanded = signal(false);

  // Enrollment state
  isEnrolled = signal(false);
  isEnrolling = signal(false);

  // Payment state
  hasPaid = signal(false);
  paymentLoading = signal(false);

  // Real progress from enrollment API
  private _realProgress = signal<{ percentage: number; completed: number; total: number } | null>(null);

  // Completed lesson IDs from API (S107 pattern)
  private _completedLessonIds = signal<Set<string>>(new Set());

  // Review state
  reviews = signal<ReviewDTO[]>([]);
  reviewSummary = signal<ReviewSummary>({ averageRating: 0, totalReviews: 0 });
  myReview = signal<ReviewDTO | null>(null);
  reviewRating = signal(5);
  reviewComment = signal('');
  reviewSubmitting = signal(false);
  showReviewForm = signal(false);

  // Computed
  totalLessons = computed(() =>
    this.sections().reduce((sum, section) => sum + section.lessons.length, 0)
  );

  chapterCount = computed(() => this.sections().length);

  completedLessons = computed(() => {
    const real = this._realProgress();
    if (real) return real.completed;
    return this._completedLessonIds().size;
  });

  progressPercentage = computed(() => {
    const real = this._realProgress();
    if (real) return real.percentage;
    const total = this.totalLessons();
    if (total === 0) return 0;
    return Math.round((this._completedLessonIds().size / total) * 100);
  });

  totalDuration = computed(() => {
    const fromSections = this.sections().reduce((sum, section) =>
      sum + section.lessons.reduce((ls, lesson) =>
        ls + (lesson.durationMinutes || 0), 0), 0);
    // If API doesn't provide duration, estimate ~15 min per lesson
    if (fromSections === 0) {
      return this.totalLessons() * 15;
    }
    return fromSections;
  });

  accessibleLessonsCount = computed(() => {
    if (this.hasPaid()) return this.totalLessons();
    return Math.min(this.FREE_LESSONS_COUNT, this.totalLessons());
  });

  // Per-chapter completion counts
  chapterCompletionMap = computed(() => {
    const completedIds = this._completedLessonIds();
    const map = new Map<string, { completed: number; total: number }>();
    for (const section of this.sections()) {
      const total = section.lessons.length;
      const completed = section.lessons.filter(l => completedIds.has(l.id)).length;
      map.set(section.id, { completed, total });
    }
    return map;
  });

  ngOnInit(): void {
    const courseId = this.route.snapshot.paramMap.get('id');
    if (courseId) {
      this.loadCourse(courseId);
      this.checkPaymentStatus(courseId);
      // Check enrollment status - this is async but we don't await because we want to show loading state
      this.checkEnrollmentStatus(courseId).then(() => {
        // Enrollment status loaded, trigger change detection
      });
      this.loadReviews(courseId);
      this.loadMyReview(courseId);
      this.loadProgress(courseId);
      this.loadCompletedLessonIds(courseId);
    }
  }

  /** Check enrollment status for the course using progress API */
  private async checkEnrollmentStatus(courseId: string): Promise<void> {
    if (!this.authService.isAuthenticated()) {
      this.isEnrolled.set(false);
      return;
    }
    
    // Use a direct approach: try to get course progress
    // Backend returns status: "not_enrolled" when user is not enrolled (HTTP 200)
    try {
      const res = await firstValueFrom(this.courseApi.getCourseProgress(courseId));
      const data = res?.data;
      
      // Check if response indicates NOT enrolled
      // Backend returns status: "not_enrolled" or "not_authenticated" in the data
      const status = data?.status || '';
      const isNotEnrolled = status === 'not_enrolled' || status === 'not_authenticated';
      
      if (isNotEnrolled) {
        this.isEnrolled.set(false);
        console.log('[CourseDetail] User not enrolled in course', courseId, '- status:', status);
      } else {
        // User is enrolled (status is 'active', 'completed', etc.)
        this.isEnrolled.set(true);
        console.log('[CourseDetail] User enrolled in course', courseId, '- status:', status);
      }
    } catch (e: any) {
      // API error - treat as not enrolled
      this.isEnrolled.set(false);
      console.error('[CourseDetail] Error checking enrollment:', e?.message);
    }
  }

  /** Handle enrollment for SELF_PACED free courses */
  async handleEnroll(): Promise<void> {
    const courseId = this.course()?.id;
    if (!courseId) return;

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.isEnrolling.set(true);
    try {
      // For SELF_PACED courses, enroll directly
      await this.courseService.enrollInCourse(courseId, this.authService.currentUser()!.id);
      this.toast.success('Đăng ký khóa học thành công!');
      this.isEnrolled.set(true);
      
      // Refresh enrollment data
      await this.enrollmentService.loadEnrolledCourses(0, 100);
      
      // Start learning
      this.startLearning();
    } catch (e: any) {
      this.toast.error('Đăng ký thất bại: ' + (e.error?.message || e.message || 'Có lỗi xảy ra'));
    } finally {
      this.isEnrolling.set(false);
    }
  }

  loadCourse(courseId: string): void {
    this.isLoading.set(true);

    this.courseApi.getCourseById(courseId).subscribe({
      next: (res: any) => {
        const detail = res?.data;
        const price = detail?.price ?? 0;
        const priceType = detail?.priceType;
        this.course.set({
          id: courseId,
          title: detail?.title || '',
          description: detail?.description || '',
          teacherName: detail?.teacherName || '',
          enrolledCount: detail?.enrolledCount || 0,
          chapterCount: detail?.chapterCount || 0,
          price,
          salePrice: detail?.salePrice,
          priceType,
          deliveryMode: detail?.deliveryMode
        });
        if (!price || price === 0 || priceType === 'FREE') {
          this.hasPaid.set(true);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set('Không thể tải thông tin khóa học. Vui lòng thử lại.');
      }
    });

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
              .map((lesson: LessonSummary) => {
                const lessonAny = lesson as any;
                const sections = (lesson.sections || []).map(s => ({
                  id: s.id,
                  title: s.title,
                  type: s.type as 'VIDEO' | 'TEXT' | 'QUIZ' | 'FILE' | 'ASSIGNMENT',
                  content: s.content,
                  videoUrl: s.videoUrl,
                  duration: s.duration,
                  orderIndex: s.orderIndex ?? 0,
                  isRequired: s.isRequired ?? false
                }));
                // Detect type: prefer sections-based detection, fall back to lesson-level type from API
                const apiType = lessonAny.type as string | undefined;
                const primaryType = sections.length > 0
                  ? this.detectPrimaryType(lesson.sections || [])
                  : (apiType as Lesson['primaryType']) || 'TEXT';
                return {
                  id: lesson.id,
                  title: lesson.title,
                  description: lesson.description || '',
                  orderIndex: lesson.orderIndex ?? 0,
                  durationMinutes: lessonAny.durationMinutes || sections.reduce((sum, s) => sum + (s.duration || 0), 0) || 0,
                  hasQuiz: sections.some(s => s.type === 'QUIZ') || false,
                  primaryType,
                  sections
                };
              })
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
      error: () => {
        this.isLoading.set(false);
        this.loadError.set('Không thể tải nội dung khóa học. Vui lòng thử lại.');
      }
    });
  }

  /** Detect dominant content type for lesson icon */
  private detectPrimaryType(sections: any[]): Lesson['primaryType'] {
    if (!sections || sections.length === 0) return 'TEXT';
    const hasVideo = sections.some((s: any) => s.type === 'VIDEO');
    if (hasVideo) return 'VIDEO';
    const hasQuiz = sections.some((s: any) => s.type === 'QUIZ');
    if (hasQuiz) return 'QUIZ';
    const hasAssignment = sections.some((s: any) => s.type === 'ASSIGNMENT');
    if (hasAssignment) return 'ASSIGNMENT';
    const hasFile = sections.some((s: any) => s.type === 'FILE');
    if (hasFile) return 'FILE';
    return 'TEXT';
  }

  /** Fetch completed lesson IDs (S107 pattern) */
  private async loadCompletedLessonIds(courseId: string): Promise<void> {
    try {
      const res = await firstValueFrom(this.courseApi.getCompletedLessonIds(courseId));
      const data = res?.data;
      const ids = Array.isArray(data) ? data : [];
      this._completedLessonIds.set(new Set(ids));
    } catch {
      // Supplementary — silent fallback
    }
  }

  isLessonCompleted(lessonId: string): boolean {
    return this._completedLessonIds().has(lessonId);
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

  toggleAllSections(): void {
    const sections = this.sections();
    if (this.allExpanded()) {
      // Collapse all
      this.expandedSections.set(new Set());
      this.allExpanded.set(false);
    } else {
      // Expand all
      const allIds = new Set(sections.map(s => s.id));
      this.expandedSections.set(allIds);
      this.allExpanded.set(true);
    }
  }

  startLearning(): void {
    const courseId = this.course()?.id;
    if (!courseId) return;
    
    // Verify enrollment before navigating
    this.verifyEnrollmentAndNavigate(courseId);
  }

  /** Verify enrollment and navigate to learning page */
  private async verifyEnrollmentAndNavigate(courseId: string): Promise<void> {
    try {
      // Try to get course progress - if user is enrolled, this will succeed
      await firstValueFrom(this.courseApi.getCourseProgress(courseId));
      
      // User is enrolled, navigate to learning
      const firstSection = this.sections()[0];
      if (firstSection && firstSection.lessons.length > 0) {
        const firstLesson = firstSection.lessons[0];
        this.router.navigate(['/student/learn/course', courseId, 'lesson', firstLesson.id]);
      } else {
        this.router.navigate(['/student/learn/course', courseId]);
      }
    } catch (error: any) {
      // User is NOT enrolled - show error and display enrollment CTA
      const errorMsg = error?.error?.message || error?.message || '';
      if (errorMsg.includes('not enrolled') || errorMsg.includes('chưa đăng ký') || error?.status === 403 || error?.status === 404) {
        this.toast.warning('Bạn chưa đăng ký khóa học này. Vui lòng đăng ký để học.');
        this.isEnrolled.set(false);
      } else {
        this.toast.error('Không thể truy cập khóa học. Vui lòng thử lại.');
      }
    }
  }

  resumeLearning(): void {
    const courseId = this.course()?.id;
    if (!courseId) return;

    // Verify enrollment before navigating
    this.verifyEnrollmentAndNavigate(courseId);
  }

  goToLesson(lessonId: string): void {
    const courseId = this.course()?.id;
    if (!courseId) return;
    this.router.navigate(['/student/learn/course', courseId, 'lesson', lessonId]);
  }

  goBack(): void {
    this.router.navigate(['/student/my-courses']);
  }

  toggleDescription(): void {
    this.isDescriptionExpanded.update(expanded => !expanded);
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  goToQuiz(lessonId: string): void {
    this.router.navigate(['/student/quiz/take', lessonId]);
  }

  // ============ Payment Methods ============

  async checkPaymentStatus(courseId: string): Promise<void> {
    this.paymentLoading.set(true);
    try {
      const course = this.course();
      const isFree = !course?.price || course.price === 0 || course.priceType === 'FREE';
      if (isFree) {
        this.hasPaid.set(true);
        return;
      }
      const state = await this.paymentService.loadPaymentStatus(courseId);
      this.hasPaid.set(state.hasPaid);
    } catch {
      const course = this.course();
      if (!course?.price || course.price === 0 || course.priceType === 'FREE') {
        this.hasPaid.set(true);
      }
    } finally {
      this.paymentLoading.set(false);
    }
  }

  private loadProgress(courseId: string): void {
    this.courseApi.getCourseProgress(courseId).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        const pct = data?.progressPercentage;
        if (pct !== undefined && pct !== null) {
          this._realProgress.set({
            percentage: Math.round(pct),
            completed: data.completedLessons || 0,
            total: data.totalLessons || 0
          });
        }
      },
      error: () => { /* supplementary — silent fallback */ }
    });
  }

  canAccessLesson(lessonIndex: number): boolean {
    if (this.hasPaid()) return true;
    return lessonIndex < this.FREE_LESSONS_COUNT;
  }

  getLessonGlobalIndex(sectionIndex: number, lessonIndexInSection: number): number {
    let globalIndex = 0;
    for (let i = 0; i < sectionIndex; i++) {
      globalIndex += this.sections()[i]?.lessons.length || 0;
    }
    return globalIndex + lessonIndexInSection;
  }

  goToCheckout(): void {
    const courseId = this.course()?.id;
    if (!courseId) return;
    this.router.navigate(['/courses', courseId]);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  }

  // ============ Review Methods ============

  loadReviews(courseId: string): void {
    this.reviewApi.getReviews(courseId).subscribe({
      next: (res: any) => { this.reviews.set(res?.data || []); },
      error: () => {}
    });
    this.reviewApi.getReviewSummary(courseId).subscribe({
      next: (res: any) => {
        if (res?.data) this.reviewSummary.set(res.data);
      },
      error: () => {}
    });
  }

  loadMyReview(courseId: string): void {
    this.reviewApi.getMyReview(courseId).subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.myReview.set(res.data);
          this.reviewRating.set(res.data.rating);
          this.reviewComment.set(res.data.comment || '');
        }
      },
      error: () => {}
    });
  }

  async submitReview(): Promise<void> {
    const courseId = this.course()?.id;
    if (!courseId) return;

    this.reviewSubmitting.set(true);
    try {
      const request: SubmitReviewRequest = {
        rating: this.reviewRating(),
        comment: this.reviewComment() || undefined
      };
      await firstValueFrom(this.reviewApi.submitReview(courseId, request));
      this.showReviewForm.set(false);
      this.loadReviews(courseId);
      this.loadMyReview(courseId);
    } catch {} finally {
      this.reviewSubmitting.set(false);
    }
  }

  async deleteMyReview(): Promise<void> {
    const courseId = this.course()?.id;
    const review = this.myReview();
    if (!courseId || !review) return;

    try {
      await firstValueFrom(this.reviewApi.deleteReview(courseId, review.id));
      this.myReview.set(null);
      this.reviewRating.set(5);
      this.reviewComment.set('');
      this.loadReviews(courseId);
    } catch {}
  }

  setRating(star: number): void {
    this.reviewRating.set(star);
  }

  starArray = [1, 2, 3, 4, 5];

  // Helper to strip lesson prefix if already present in title
  getLessonDisplayTitle(title: string): string {
    // If title already starts with "Bài X:", strip it to avoid duplication
    if (title.toLowerCase().startsWith('bài') && title.includes(':')) {
      const parts = title.split(':');
      if (parts.length > 1) {
        return parts.slice(1).join(':').trim();
      }
    }
    return title;
  }
}
