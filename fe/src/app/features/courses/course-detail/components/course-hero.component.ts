import { Component, input, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExtendedCourse } from '../../../../shared/types/course.types';
import { CourseDetailService } from '../services/course-detail.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-hero',
  imports: [CommonModule, RouterModule, NgOptimizedImage],
  templateUrl: './course-hero.component.html'
})
export class CourseHeroComponent {
  course = input<ExtendedCourse | null>(null);

  protected courseDetailService = inject(CourseDetailService);

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

  getPriceDisplay(price: number): string {
    return price === 0 ? 'Miễn phí' : `${price.toLocaleString()} VNĐ`;
  }

  getEnrollmentButtonText(): string {
    const course = this.course();
    if (!course) return 'Đăng ký khóa học';

    return course.price === 0 ? 'Đăng ký miễn phí' : 'Đăng ký ngay';
  }

  async enrollInCourse(): Promise<void> {
    const course = this.course();
    if (!course) return;

    try {
      // Mock user ID - trong thực tế sẽ lấy từ auth service
      const userId = 'current-user-id';
      await this.courseDetailService.enrollInCourse(course.id, userId);
    } catch (error) {
    }
  }

  scrollToCurriculum(): void {
    const curriculumElement = document.getElementById('curriculum');
    if (curriculumElement) {
      curriculumElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  playPreview(): void {
    // Mock preview functionality
    // Trong thực tế sẽ mở video player modal hoặc redirect đến preview page
  }
}
