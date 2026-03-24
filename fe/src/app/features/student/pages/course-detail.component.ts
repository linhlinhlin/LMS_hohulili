import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { CourseApi } from '../../../api/client/course.api';
import { CourseContentChapter, LessonSummary } from '../../../api/types/course.types';
import {
  PaymentAccessActivationState,
  PaymentService
} from '../../payment/payment.service';
import { CourseReviewApi, ReviewDTO, ReviewSummary, SubmitReviewRequest } from '../../../api/endpoints/course-review.api';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { QuizApi } from '../../../api/endpoints/quiz.api';

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
  isFree?: boolean;
  locked?: boolean;
  durationMinutes?: number;
  hasQuiz?: boolean;
  quizType?: string;
  quizAllowOffline?: boolean;
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
  private quizApi = inject(QuizApi);

  // State
  isLoading = signal(false);
  loadError = signal<string | null>(null);
  course = signal<CourseDetail | null>(null);
  sections = signal<Section[]>([]);
  expandedSections = signal<Set<string>>(new Set());
  isDescriptionExpanded = signal(false);
  allExpanded = signal(false);

  // Payment & enrollment state
  hasPaid = signal(false);
  paymentLoading = signal(false);
  isEnrolled = signal(false);
  isEnrolling = signal(false);
  paymentAccessState = signal<PaymentAccessActivationState | null>(null);

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
    if (this.hasReadyPaidAccess()) return this.totalLessons();
    return this.sections()
      .flatMap(section => section.lessons)
      .filter(lesson => this.isLessonPreviewAvailable(lesson))
      .length;
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
      this.loadReviews(courseId);
      this.loadMyReview(courseId);
      this.loadProgress(courseId);
      this.loadCompletedLessonIds(courseId);
    }
  }

  loadCourse(courseId: string): void {
    this.isLoading.set(true);

    this.courseApi.getCourseById(courseId).subscribe({
      next: (res: any) => {
        const detail = res?.data;
        const price = detail?.price ?? 0;
        const priceType = detail?.priceType;
        const courseDetail: CourseDetail = {
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
        };
        this.course.set(courseDetail);
        if (!price || price === 0 || priceType === 'FREE') {
          this.hasPaid.set(true);
        } else {
          void this.checkPaymentStatus(courseId, courseDetail);
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
                  isFree: lessonAny.isFree === true,
                  locked: lessonAny.locked === true,
                  durationMinutes: lessonAny.durationMinutes || sections.reduce((sum, s) => sum + (s.duration || 0), 0) || 0,
                  hasQuiz: sections.some(s => s.type === 'QUIZ') || false,
                  quizType: lessonAny.quizType,
                  quizAllowOffline: lessonAny.quizAllowOffline === true,
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
    const firstSection = this.sections()[0];
    if (firstSection && firstSection.lessons.length > 0) {
      const firstLesson = firstSection.lessons[0];
      this.router.navigate(['/student/learn/course', courseId, 'lesson', firstLesson.id]);
    } else {
      this.router.navigate(['/student/learn/course', courseId]);
    }
  }

  resumeLearning(): void {
    const courseId = this.course()?.id;
    if (!courseId) return;

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
    } catch {
      // silent fallback
    }

    // Find first incomplete lesson
    const completedIds = this._completedLessonIds();
    for (const section of this.sections()) {
      for (const lesson of section.lessons) {
        if (!completedIds.has(lesson.id)) {
          this.router.navigate(['/student/learn/course', courseId, 'lesson', lesson.id]);
          return;
        }
      }
    }

    this.startLearning();
  }

  goToLesson(lessonId: string): void {
    const courseId = this.course()?.id;
    if (!courseId) return;
    this.router.navigate(['/student/learn/course', courseId, 'lesson', lessonId]);
  }

  goBack(): void {
    this.router.navigate(['/student/courses/library']);
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

  async goToQuiz(lessonId: string): Promise<void> {
    try {
      const lesson = this.sections()
        .flatMap(section => section.lessons)
        .find(item => item.id === lessonId);
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

      if (isOffline && lesson?.quizAllowOffline === true) {
        await this.router.navigate(['/student/quiz/take', lessonId], {
          queryParams: {
            lessonId,
            courseId: this.course()?.id,
            quizType: lesson.quizType,
            allowOffline: true,
            returnUrl: this.router.url
          }
        });
        return;
      }

      const quizId = await firstValueFrom(this.quizApi.resolveQuizIdByLessonId(lessonId));
      await this.router.navigate(['/student/quiz/take', quizId], {
        queryParams: {
          lessonId,
          courseId: this.course()?.id,
          quizType: lesson?.quizType,
          allowOffline: lesson?.quizAllowOffline === true,
          returnUrl: this.router.url
        }
      });
    } catch {
      this.toast.error('Không thể mở bài kiểm tra của bài học này');
    }
  }

  // ============ Payment Methods ============

  async checkPaymentStatus(courseId: string, courseDetail?: CourseDetail | null): Promise<void> {
    this.paymentLoading.set(true);
    try {
      const course = courseDetail ?? this.course();
      if (!course) {
        this.hasPaid.set(false);
        return;
      }

      const isFree = !course.price || course.price === 0 || course.priceType === 'FREE';
      if (isFree) {
        this.hasPaid.set(true);
        return;
      }
      const state = await this.paymentService.loadPaymentStatus(courseId);
      this.hasPaid.set(state.hasPaid);
      this.paymentAccessState.set(state.accessActivationState);
    } catch {
      const course = courseDetail ?? this.course();
      if (course && (!course.price || course.price === 0 || course.priceType === 'FREE')) {
        this.hasPaid.set(true);
        this.paymentAccessState.set('READY');
      } else {
        this.paymentAccessState.set(null);
      }
    } finally {
      this.paymentLoading.set(false);
    }
  }

  private loadProgress(courseId: string): void {
    this.courseApi.getCourseProgress(courseId).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        const status = String(data?.status || '').toLowerCase();
        const isActuallyEnrolled = status === 'active' || status === 'completed';
        this.isEnrolled.set(isActuallyEnrolled);
        if (!isActuallyEnrolled) {
          this._realProgress.set(null);
          return;
        }
        const pct = data?.progressPercentage;
        if (pct !== undefined && pct !== null) {
          this._realProgress.set({
            percentage: Math.round(pct),
            completed: data.completedLessons || 0,
            total: data.totalLessons || 0
          });
        }
      },
      error: () => {
        this.isEnrolled.set(false);
        this._realProgress.set(null);
        /* supplementary — silent fallback */
      }
    });
  }

  isLessonPreviewAvailable(lesson: Lesson): boolean {
    return lesson.isFree === true || lesson.locked === false;
  }

  canAccessLesson(lesson: Lesson): boolean {
    if (this.hasReadyPaidAccess()) return true;
    return this.isLessonPreviewAvailable(lesson);
  }

  isAwaitingManualActivation(): boolean {
    return this.paymentAccessState() === 'MANUAL_ACTIVATION_REQUIRED';
  }

  isAccessPending(): boolean {
    return this.paymentAccessState() === 'ACCESS_PENDING';
  }

  hasReadyPaidAccess(): boolean {
    return this.hasPaid()
      && this.paymentAccessState() !== 'MANUAL_ACTIVATION_REQUIRED'
      && this.paymentAccessState() !== 'ACCESS_PENDING';
  }

  goToCheckout(): void {
    const courseId = this.course()?.id;
    if (!courseId) return;
    this.router.navigate(['/courses', courseId]);
  }

  async handleEnroll(): Promise<void> {
    const courseId = this.course()?.id;
    if (!courseId) return;

    if (this.isAwaitingManualActivation()) {
      this.toast.info('Thanh toán đã được ghi nhận. Khóa học dạng lớp học sẽ mở khi bạn được xếp lớp hoặc kích hoạt.');
      this.router.navigate(['/student/payments']);
      return;
    }

    if (this.isAccessPending()) {
      this.toast.info('Thanh toán đã được ghi nhận, nhưng quyền học vẫn đang được kích hoạt. Vui lòng kiểm tra lại tại lịch sử thanh toán.');
      this.router.navigate(['/student/payments']);
      return;
    }

    this.isEnrolling.set(true);
    try {
      await firstValueFrom(this.courseApi.enrollCourse(courseId));
      this.isEnrolled.set(true);
      this.toast.success('Đăng ký thành công!');
      this.startLearning();
    } catch (e: any) {
      this.toast.error('Đăng ký thất bại: ' + (e?.error?.message || e?.message || 'Lỗi không xác định'));
    } finally {
      this.isEnrolling.set(false);
    }
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

  getLessonDisplayTitle(title: string): string {
    if (title?.toLowerCase().startsWith('bài') && title.includes(':')) {
      const parts = title.split(':');
      if (parts.length > 1) {
        return parts.slice(1).join(':').trim();
      }
    }
    return title;
  }
}
