import { Component, signal, inject, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { CourseService } from '../../state/course.service';
import { ExtendedCourse } from '../../shared/types/course.types';
import { AuthService } from '../../core/services/auth.service';
import { CourseApi } from '../../api/client/course.api';
import { StudentEnrollmentService } from '../student/services/enrollment.service';
import { PaymentModalComponent, CoursePaymentInfo } from '../payment/payment-modal.component';
import { PaymentService } from '../payment/payment.service';
import { ToastService } from '../../core/services/toast.service';

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
  private title = inject(Title);
  private meta = inject(Meta);
  private courseApi = inject(CourseApi);

  course = signal<ExtendedCourse | null>(null);
  isEnrolling = signal(false);
  expandedChapters = signal<Set<string>>(new Set());
  isEnrolled = signal(false);
  isPaid = signal(false);
  showPaymentModal = signal(false);
  courseContent = signal<any[]>([]);

  private enrollmentService = inject(StudentEnrollmentService);
  private paymentService = inject(PaymentService);
  private toast = inject(ToastService);
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

  continueLearning() {
    const courseId = this.course()?.id;
    if (courseId) {
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
      this.isEnrolled.set(true);
      this.continueLearning();
    }
  }

  onPaymentComplete() {
    this.isPaid.set(true);
    this.isEnrolled.set(true);
  }

  handleFreeTrial(): void {
    this.scrollToCurriculumPreview();
  }

  async handleEnrollClick() {
    if (!this.ensureStudentReadyForEnrollment()) {
      return;
    }

    const courseId = this.course()?.id;
    if (!courseId) return;

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
      }

      this.loadCurriculum(id);

      if (this.authService.isAuthenticated() && this.getEffectivePrice(course) > 0) {
        try {
          const state = await this.paymentService.loadPaymentStatus(id);
          this.isPaid.set(state.hasPaid);
          if (state.hasPaid) {
            this.isEnrolled.set(true);
          }
        } catch {
          // Default unpaid
        }
      } else if (this.getEffectivePrice(course) === 0) {
        this.isPaid.set(true);
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
        }
      },
      error: () => {
        // Silently fail - course detail still shows
      }
    });
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

  getDurationInHours(duration: string): number {
    const match = duration?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 40;
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
    const pageTitle = `${course.title} - LMS Maritime`;
    this.title.setTitle(pageTitle);

    const description = course.description?.slice(0, 160) || course.title;
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
  }
}
