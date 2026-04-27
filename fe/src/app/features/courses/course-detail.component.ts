import { Component, signal, inject, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CourseService } from '../../state/course.service';
import { SeoService } from '../../core/services/seo.service';
import { ExtendedCourse } from '../../shared/types/course.types';
import { AuthService } from '../../core/services/auth.service';
import { CourseApi } from '../../api/client/course.api';
import { StudentEnrollmentService } from '../student/services/enrollment.service';
import {
  CoursePaymentInfo,
  PaymentCompletionOutcome,
  PaymentModalComponent
} from '../payment/payment-modal.component';
import {
  PaymentAccessActivationState,
  PaymentService
} from '../payment/payment.service';
import { ToastService } from '../../core/services/toast.service';
import { CourseDownloadService } from '../../core/services/course-download.service';

/**
 * CourseDetailComponent - Coursera/Udemy-inspired Design (Dec 2025 SOTA)
 *
 * Features:
 * - Dark gradient hero section
 * - Sticky sidebar with price card
 * - Curriculum accordion with lesson previews
 * - Payment simulation flow
 */
@Component({
  selector: 'app-course-detail',
  imports: [CommonModule, RouterModule, PaymentModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './course-detail.component.html'
})
export class CourseDetailComponent implements OnInit {
  private document = inject<Document>(DOCUMENT);

  protected courseService = inject(CourseService);
  protected authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);
  private courseApi = inject(CourseApi);

  course = signal<ExtendedCourse | null>(null);
  isEnrolling = signal(false);
  expandedChapters = signal<Set<string>>(new Set());
  isEnrolled = signal(false);
  isPaid = signal(false);
  paymentAccessState = signal<PaymentAccessActivationState | null>(null);
  showPaymentModal = signal(false);
  courseContent = signal<any[]>([]);
  totalLessons = signal(0);
  totalDurationMinutes = signal(0);
  parsedBenefits = signal<string[]>([]);

  private enrollmentService = inject(StudentEnrollmentService);
  private paymentService = inject(PaymentService);
  private toast = inject(ToastService);
  private courseDownload = inject(CourseDownloadService);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params['id']) {
        this.loadCourse(params['id']);

        if (this.authService.isAuthenticated() && this.authService.userRole() === 'student') {
          this.enrollmentService.loadEnrolledCourses(0, 100).then(() => {
            this.isEnrolled.set(this.enrollmentService.isEnrolledInCourse(params['id']));
          });
        }
      }
    });
  }

  async continueLearning(): Promise<void> {
    const courseId = this.course()?.id;
    if (courseId) {
      if (this.courseDownload.isDownloadedSync(courseId)) {
        const offlineLessonId = await this.courseDownload.getOfflineResumeLessonId(courseId);
        if (offlineLessonId) {
          this.router.navigate(['/student/learn/course', courseId, 'lesson', offlineLessonId]);
          return;
        }
      }

      this.router.navigate(['/student/learn/course', courseId]);
    }
  }

  getPaymentInfo(): CoursePaymentInfo {
    const c = this.course();
    let instructorName = 'Giảng viên';
    if (c?.instructor) {
      if (typeof c.instructor === 'string') {
        instructorName = c.instructor;
      } else if (c.instructor.name) {
        instructorName = c.instructor.name;
      }
    }

    return {
      courseId: c?.id || '',
      title: c?.title || '',
      thumbnail: c?.thumbnail || '',
      price: c?.price || 0,
      salePrice: c?.salePrice,
      instructorName
    };
  }

  openPaymentModal() {
    this.showPaymentModal.set(true);
  }

  onPaymentModalClose(startLearning?: boolean | void) {
    this.showPaymentModal.set(false);
    if (startLearning === true) {
      this.isPaid.set(true);
      this.paymentAccessState.set('READY');
      this.continueLearning();
    }
  }

  onPaymentComplete(outcome: PaymentCompletionOutcome) {
    this.isPaid.set(true);
    this.paymentAccessState.set(outcome.accessActivation.state);
    this.isEnrolled.set(outcome.accessActivation.state === 'READY');
    if (outcome.accessActivation.message) {
      this.toast.info(outcome.accessActivation.message);
    }
  }

  handleFreeTrial(): void {
    const allIds = this.courseContent().map((ch: any) => ch.id);
    this.expandedChapters.set(new Set(allIds));
    this.scrollToCurriculumPreview();
  }

  async onLessonClick(lesson: any, chapterIndex: number, lessonIndex: number): Promise<void> {
    const courseId = this.course()?.id;
    if (!courseId) return;

    if (this.hasLearningAccess()) {
      this.router.navigate(['/student/learn/course', courseId, 'lesson', lesson.id]);
      return;
    }

    if (!lesson.isFree && !this.hasLearningAccess()) return;

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    if (this.authService.userRole() !== 'student') {
      this.toast.info('Đăng nhập bằng tài khoản học viên để xem bài học.');
      return;
    }

    if (!this.isCoursePaid()) {
      try {
        await this.enroll();
      } catch {
        return;
      }
      this.router.navigate(['/student/learn/course', courseId, 'lesson', lesson.id]);
      return;
    }

    this.toast.info('Đăng ký khóa học để xem toàn bộ nội dung, kể cả bài xem trước.');
    this.handleFreeTrial();
  }

  async handleEnrollClick() {
    if (!this.ensureStudentReadyForEnrollment()) {
      return;
    }

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

    if (this.getEffectivePrice() > 0) {
      this.openPaymentModal();
      return;
    }

    this.isEnrolling.set(true);
    try {
      await this.enroll();
    } finally {
      this.isEnrolling.set(false);
    }
  }

  private ensureStudentReadyForEnrollment(): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return false;
    }

    if (this.authService.userRole() !== 'student') {
      this.toast.warning('Chỉ tài khoản học viên mới có thể đăng ký khóa học từ trang này.');
      return false;
    }

    return true;
  }

  private async enroll() {
    const user = this.authService.currentUser();
    const course = this.course();
    if (!user || !course) return;

    try {
      await this.courseService.enrollInCourse(course.id, user.id);
      this.isEnrolled.set(true);
      this.isPaid.set(true);
      this.toast.success('Đăng ký thành công. Đang chuyển đến trang học.');
      this.router.navigate(['/student/learn/course', course.id]);
    } catch (e: any) {
      this.toast.error('Đăng ký thất bại: ' + (e.error?.message || e.message));
    }
  }

  private async loadCourse(id: string): Promise<void> {
    try {
      const course = await this.courseService.getCourseById(id);
      this.course.set(course);
      if (course) {
        this.updateSeo(course);
        if (course.benefits) {
          const lines = course.benefits.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
          this.parsedBenefits.set(lines);
        }
      }

      this.loadCurriculum(id);

      if (this.authService.isAuthenticated() && this.getEffectivePrice(course) > 0) {
        try {
          const state = await this.paymentService.loadPaymentStatus(id);
          this.isPaid.set(state.hasPaid);
          this.paymentAccessState.set(state.accessActivationState);
        } catch {
          this.paymentAccessState.set(null);
        }
      } else if (this.getEffectivePrice(course) === 0) {
        this.isPaid.set(true);
        this.paymentAccessState.set('READY');
      }
    } catch {
      this.toast.error('Không thể tải thông tin khóa học');
    }
  }

  private loadCurriculum(courseId: string): void {
    this.courseApi.getCourseContent(courseId).subscribe({
      next: (response: any) => {
        if (response?.data) {
          this.courseContent.set(response.data);
          if (response.data.length > 0) {
            this.expandedChapters.set(new Set([response.data[0].id]));
          }
          let lessons = 0;
          let duration = 0;
          for (const ch of response.data) {
            if (ch.lessons) {
              lessons += ch.lessons.length;
              for (const l of ch.lessons) {
                if (l.durationMinutes) duration += l.durationMinutes;
              }
            }
          }
          this.totalLessons.set(lessons);
          this.totalDurationMinutes.set(duration);
        }
      },
      error: () => {}
    });
  }

  isAwaitingManualActivation(): boolean {
    return this.paymentAccessState() === 'MANUAL_ACTIVATION_REQUIRED';
  }

  isAccessPending(): boolean {
    return this.paymentAccessState() === 'ACCESS_PENDING';
  }

  hasReadyPaidAccess(): boolean {
    return this.isPaid()
      && this.paymentAccessState() !== 'MANUAL_ACTIVATION_REQUIRED'
      && this.paymentAccessState() !== 'ACCESS_PENDING';
  }

  hasLearningAccess(): boolean {
    return this.isEnrolled() || this.hasReadyPaidAccess() || !this.isCoursePaid();
  }

  toggleChapter(chapterId: string): void {
    this.expandedChapters.update(set => {
      const newSet = new Set(set);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  }

  getCategoryName(category: string): string {
    const names: Record<string, string> = {
      safety: 'An toàn Hàng hải',
      navigation: 'Điều khiển tàu',
      engineering: 'Kỹ thuật máy tàu',
      logistics: 'Logistics hàng hải',
      law: 'Luật hàng hải',
      certificates: 'Chứng chỉ chuyên môn'
    };
    return names[category] || category || 'Khóa học';
  }

  getTotalDurationDisplay(): string {
    const mins = this.totalDurationMinutes();
    if (mins <= 0) return '';
    if (mins < 60) return `${mins} phút`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
  }

  getPriceDisplay(price: number): string {
    if (!price || price === 0) return 'Miễn phí';
    return price.toLocaleString('vi-VN') + '₫';
  }

  getDiscountPercent(): number {
    const c = this.course();
    if (!c?.price || !c?.salePrice || c.price <= 0) return 0;
    const discount = Math.round(((c.price - c.salePrice) / c.price) * 100);
    return Math.max(0, Math.min(99, discount));
  }

  isCoursePaid(): boolean {
    return this.getEffectivePrice() > 0;
  }

  private scrollToCurriculumPreview(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const curriculum = this.document.getElementById('course-curriculum');
    curriculum?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private getEffectivePrice(course: ExtendedCourse | null = this.course()): number {
    if (!course) {
      return 0;
    }

    if (course.salePrice !== undefined && course.salePrice !== null) {
      return course.salePrice;
    }

    return course.price ?? 0;
  }

  private updateSeo(course: ExtendedCourse): void {
    const description = course.description?.slice(0, 160) || course.title;
    // Fallback og:image to default if course thumbnail missing — avoid empty social shares
    const ogImage = course.thumbnail || 'https://holilihu.online/og-image.png';
    this.seo.setPageMeta(course.title, description, ogImage, `https://holilihu.online/courses/${course.id}`);
    this.seo.setCanonical(`https://holilihu.online/courses/${course.id}`);
    // SEO Phase 6: BreadcrumbList Trang chủ → Khóa học → {tên}
    this.seo.setBreadcrumb([
      { name: 'Trang chủ', url: 'https://holilihu.online/' },
      { name: 'Khóa học', url: 'https://holilihu.online/courses' },
      { name: course.title }
    ]);
    this.injectCourseJsonLd(course);
  }

  private injectCourseJsonLd(course: ExtendedCourse): void {
    const instructorName = typeof course.instructor === 'string'
      ? course.instructor
      : course.instructor?.name || 'Giảng viên';

    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: course.title,
      description: (course.description || course.title).slice(0, 500),
      url: `https://holilihu.online/courses/${course.id}`,
      provider: {
        '@type': 'Organization',
        name: 'LMS Maritime',
        sameAs: 'https://holilihu.online'
      },
      instructor: {
        '@type': 'Person',
        name: instructorName
      },
      inLanguage: 'vi',
      isAccessibleForFree: !course.price || course.price === 0
    };

    if (course.thumbnail) {
      jsonLd['image'] = course.thumbnail;
    }

    if (course.price && course.price > 0) {
      jsonLd['offers'] = {
        '@type': 'Offer',
        price: course.salePrice ?? course.price,
        priceCurrency: 'VND',
        availability: 'https://schema.org/InStock'
      };
    }

    this.seo.setJsonLd('jsonld-course-detail', jsonLd);
  }
}
