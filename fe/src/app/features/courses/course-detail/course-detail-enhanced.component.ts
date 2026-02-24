import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { CourseDetailService } from './services/course-detail.service';
import { CourseHeroComponent } from './components/course-hero.component';
import { CourseCurriculumComponent } from './components/course-curriculum.component';
import { CourseInstructorComponent } from './components/course-instructor.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-course-detail-enhanced',
  imports: [
    CommonModule,
    CourseHeroComponent,
    CourseCurriculumComponent,
    CourseInstructorComponent,
    IconComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './course-detail-enhanced.component.html'
})
export class CourseDetailEnhancedComponent implements OnInit, OnDestroy {
  protected courseDetailService = inject(CourseDetailService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private title = inject(Title);
  private meta = inject(Meta);
  private toast = inject(ToastService);
  private authService = inject(AuthService);

  private openFAQs = new Set<string>();

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadCourseDetail(params['id']);
      }
    });
  }

  ngOnDestroy(): void {
    this.courseDetailService.clearData();
  }

  private async loadCourseDetail(courseId: string): Promise<void> {
    try {
      await this.courseDetailService.loadCourseDetail(courseId);
      const course = this.courseDetailService.course();

      if (course) {
        this.updateSEO(course);
      }
    } catch (error) {
      this.toast.error('Không thể tải thông tin khóa học');
    }
  }

  private updateSEO(course: any): void {
    const pageTitle = `${course.title} - ${this.getCategoryName(course.category)} | LMS Maritime`;
    this.title.setTitle(pageTitle);

    const description = course.description?.slice(0, 160) || course.shortDescription || course.title;
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
  }

  getPriceDisplay(price: number | null | undefined): string {
    if (price === null || price === undefined) {
      return 'Liên hệ';
    }
    return price === 0 ? 'Miễn phí' : `${price.toLocaleString()} VNĐ`;
  }

  getLevelLabel(level: string): string {
    const labels: Record<string, string> = {
      'beginner': 'Cơ bản',
      'intermediate': 'Trung cấp',
      'advanced': 'Nâng cao'
    };
    return labels[level] || level;
  }

  getCategoryName(category: string): string {
    const categoryNames: Record<string, string> = {
      'engineering': 'Kỹ thuật tàu biển',
      'logistics': 'Quản lý cảng',
      'safety': 'An toàn hàng hải',
      'navigation': 'Hàng hải',
      'law': 'Luật hàng hải',
      'certificates': 'Chứng chỉ chuyên môn'
    };
    return categoryNames[category] || category;
  }

  getEnrollmentButtonText(): string {
    const course = this.courseDetailService.course();
    if (!course) return 'Đăng ký khóa học';

    return course.price === 0 ? 'Đăng ký miễn phí' : 'Đăng ký ngay';
  }

  async enrollInCourse(): Promise<void> {
    const course = this.courseDetailService.course();
    if (!course) return;

    try {
      const userId = this.authService.getCurrentUser()?.id || '';
      await this.courseDetailService.enrollInCourse(course.id, userId);
    } catch (error) {
      this.toast.error('Đăng ký khóa học thất bại');
    }
  }

  getStars(rating: number): number[] {
    return Array.from({ length: Math.floor(rating) }, (_, i) => i);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN');
  }

  toggleFAQ(faqId: string): void {
    if (this.openFAQs.has(faqId)) {
      this.openFAQs.delete(faqId);
    } else {
      this.openFAQs.add(faqId);
    }
  }

  isFAQOpen(faqId: string): boolean {
    return this.openFAQs.has(faqId);
  }

  continueLearning(): void {
    const course = this.courseDetailService.course();
    if (course) {
      this.router.navigate(['/learn/course', course.id]);
    }
  }

  scrollToReviews(): void {
    const reviewsElement = document.querySelector('[data-reviews]');
    if (reviewsElement) {
      reviewsElement.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
