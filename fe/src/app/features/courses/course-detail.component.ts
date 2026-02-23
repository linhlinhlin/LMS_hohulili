import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';
import { CourseService } from '../../state/course.service';
import { ExtendedCourse } from '../../shared/types/course.types';
import { AuthService } from '../../core/services/auth.service';
import { ClassSummary, CourseApi } from '../../api/client/course.api';
import { firstValueFrom } from 'rxjs';
import { StudentEnrollmentService } from '../student/services/enrollment.service';
import { PaymentModalComponent, CoursePaymentInfo } from '../payment/payment-modal.component';
import { PaymentService } from '../payment/payment.service';
import { ToastService } from '../../core/services/toast.service';
import { CourseDownloadButtonComponent } from '../../shared/components/course-download-button/course-download-button.component';

/**
 * CourseDetailComponent - Coursera/Udemy-inspired Design (Dec 2025 SOTA)
 * 
 * Features:
 * - Dark gradient hero section
 * - Sticky sidebar with price card
 * - Curriculum accordion with lesson previews
 * - Class picker modal for enrollment
 * - Payment simulation flow
 */
@Component({
  selector: 'app-course-detail',
  imports: [CommonModule, RouterModule, PaymentModalComponent, CourseDownloadButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './course-detail.component.html'
})
export class CourseDetailComponent implements OnInit {
  private document = inject<Document>(DOCUMENT);
  private platformId = inject<Object>(PLATFORM_ID);

  protected courseService = inject(CourseService);
  protected authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private title = inject(Title);
  private meta = inject(Meta);
  private courseApi = inject(CourseApi);

  // State
  course = signal<ExtendedCourse | null>(null);
  availableClasses = signal<ClassSummary[]>([]);
  showClassModal = signal(false);
  selectedClass = signal<string | null>(null);
  isEnrolling = signal(false);
  expandedChapters = signal<Set<number>>(new Set([1])); // First chapter expanded by default
  isEnrolled = signal(false); // Student enrollment status
  isPaid = signal(false); // Payment status
  showPaymentModal = signal(false); // Payment modal visibility

  // Inject services
  private enrollmentService = inject(StudentEnrollmentService);
  private paymentService = inject(PaymentService);
  private toast = inject(ToastService);

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadCourse(params['id']);

        // Preload enrollment status for logged-in students
        if (this.authService.isAuthenticated() && this.authService.userRole() === 'student') {
          this.enrollmentService.loadEnrolledCourses(0, 100).then(() => {
            // Check if student is enrolled in this course
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

  // === PAYMENT METHODS ===

  getPaymentInfo(): CoursePaymentInfo {
    const c = this.course();
    // Handle instructor which could be string or object
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
      salePrice: (c as any)?.salePrice,
      instructorName
    };
  }

  openPaymentModal() {
    this.showPaymentModal.set(true);
  }

  onPaymentModalClose(startLearning?: boolean | void) {
    this.showPaymentModal.set(false);
    if (startLearning === true) {
      // Payment successful, start learning
      this.isPaid.set(true);
      this.continueLearning();
    }
  }

  onPaymentComplete() {
    // Payment was successful, update state
    this.isPaid.set(true);
  }

  async handleEnrollClick() {
    if (!this.authService.currentUser()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const courseId = this.course()?.id;
    if (!courseId) return;

    this.isEnrolling.set(true);
    try {
      const classes = await this.courseService.getAvailableClasses(courseId);
      if (classes.length === 0) {
        this.toast.warning('Hiện tại chưa có lớp nào mở cho khóa học này.');
      } else if (classes.length === 1) {
        await this.enroll(classes[0].id);
      } else {
        this.availableClasses.set(classes);
        this.selectedClass.set(null);
        this.showClassModal.set(true);
      }
    } catch (e) {
      this.toast.error('Có lỗi xảy ra khi kiểm tra lớp học.');
    } finally {
      this.isEnrolling.set(false);
    }
  }

  async confirmEnrollment() {
    const clsId = this.selectedClass();
    if (clsId) {
      this.isEnrolling.set(true);
      await this.enroll(clsId);
      this.showClassModal.set(false);
      this.isEnrolling.set(false);
    }
  }

  private async enroll(classId: string) {
    const user = this.authService.currentUser();
    if (!user || !this.course()) return;

    try {
      await this.courseService.enrollInCourse(this.course()!.id, user.id, classId);
      this.toast.success('Đăng ký thành công! Chuyển đến trang học.');
      this.router.navigate(['/student/learn/course', this.course()!.id]);
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
    } catch (error) {
      this.toast.error('Không thể tải thông tin khóa học');
    }
  }

  toggleChapter(chapterIndex: number): void {
    this.expandedChapters.update(set => {
      const newSet = new Set(set);
      if (newSet.has(chapterIndex)) {
        newSet.delete(chapterIndex);
      } else {
        newSet.add(chapterIndex);
      }
      return newSet;
    });
  }

  getChapterTitle(index: number): string {
    const titles = ['Giới thiệu tổng quan', 'Kiến thức cơ bản', 'Ứng dụng thực tiễn'];
    return titles[index - 1] || `Chương ${index}`;
  }

  getLessonTitle(chapter: number, lesson: number): string {
    const lessons: Record<number, string[]> = {
      1: ['Tổng quan khóa học', 'Mục tiêu học tập', 'Tài liệu tham khảo'],
      2: ['Khái niệm cơ bản', 'Nguyên lý hoạt động', 'Bài tập thực hành'],
      3: ['Case study', 'Dự án thực tế', 'Đánh giá cuối khóa']
    };
    return lessons[chapter]?.[lesson - 1] || `Bài ${lesson}`;
  }

  getCategoryName(category: string): string {
    const names: Record<string, string> = {
      'safety': 'An toàn Hàng hải',
      'navigation': 'Điều khiển Tàu',
      'engineering': 'Kỹ thuật Máy tàu',
      'logistics': 'Logistics Hàng hải',
      'law': 'Luật Hàng hải',
      'certificates': 'Chứng chỉ Chuyên môn'
    };
    return names[category] || category || 'Khóa học';
  }

  getDurationInHours(duration: string): number {
    const match = duration?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 40;
  }

  getPriceDisplay(price: number): string {
    if (!price || price === 0) return 'Miễn phí';
    return price.toLocaleString('vi-VN') + '₫';
  }

  getDiscountPercent(): number {
    const c = this.course();
    if (!c?.price || !c?.salePrice || c.price <= 0) return 0;
    const discount = Math.round(((c.price - c.salePrice) / c.price) * 100);
    return Math.max(0, Math.min(99, discount)); // Clamp 0-99
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
