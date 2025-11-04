import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { LEVEL_LABELS, CourseLevel, ExtendedCourse } from '../../../shared/types/course.types';
import { AuthService } from '../../../core/services/auth.service';
import { StudentEnrollmentService } from '../../../features/student/services/enrollment.service';

@Component({
  selector: 'app-course-card',
  standalone: true,
  imports: [CommonModule, RouterModule, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow" [attr.aria-label]="'Khóa học: ' + (course?.title || '')">
      <div class="relative">
        <img [ngSrc]="course?.thumbnail || 'assets/images/courses/placeholder.png'" width="800" height="320" [alt]="'Hình ảnh khóa học ' + (course?.title || '')" class="w-full h-48 object-cover" />
        <div class="absolute top-3 left-3 flex gap-2" role="group" aria-label="Nhãn khóa học">
          <span *ngIf="course.isPopular" class="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold" aria-label="Khóa học phổ biến">Phổ biến</span>
          <span *ngIf="course.isNew" class="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold" aria-label="Khóa học mới">Mới</span>
        </div>
      </div>

      <div class="p-6">
        <div class="flex items-center justify-between mb-2">
          <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded" [attr.aria-label]="'Danh mục: ' + getCategoryName(course.category)">
            {{ getCategoryName(course.category) }}
          </span>
          <span class="text-sm text-gray-500" [attr.aria-label]="'Cấp độ: ' + levelLabelSafe(course?.level)">{{ levelLabelSafe(course?.level) }}</span>
        </div>

  <h3 class="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{{ course?.title }}</h3>
  <p class="text-gray-600 text-sm mb-4 line-clamp-2">{{ course?.description }}</p>

        <div class="flex items-center mb-4" role="group" [attr.aria-label]="'Thông tin giảng viên'">
          <img [ngSrc]="course?.instructor?.avatar || 'assets/avatar-default.png'" width="96" height="64" [alt]="'Ảnh đại diện giảng viên ' + (course?.instructor?.name || '')" class="w-8 h-8 rounded-full mr-3" />
          <div>
            <p class="text-sm font-medium text-gray-900">{{ course?.instructor?.name }}</p>
            <p class="text-xs text-gray-500">{{ course?.instructor?.title }}</p>
          </div>
        </div>

        <div class="flex items-center justify-between mb-4" role="group" aria-label="Thông tin đánh giá và nội dung">
          <div class="flex items-center">
            <svg class="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span class="text-sm font-medium text-gray-900" [attr.aria-label]="'Đánh giá ' + (course?.rating || 0) + ' sao'">{{ course?.rating }}</span>
            <span class="text-sm text-gray-500 ml-1" [attr.aria-label]="'Số học viên: ' + (course?.studentsCount || 0)">({{ course?.studentsCount }})</span>
          </div>
          <div class="text-sm text-gray-500" [attr.aria-label]="'Số bài học: ' + (course?.lessonsCount || 0)">{{ course?.lessonsCount }} bài học</div>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-lg font-bold text-gray-900" [attr.aria-label]="'Giá khóa học: ' + (course?.price === 0 ? 'Miễn phí' : ((course?.price || 0) | currency:'VND':'symbol':'1.0-0':'vi'))">
            {{ course?.price === 0 ? 'Miễn phí' : (course?.price | currency:'VND':'symbol':'1.0-0':'vi') }}
          </div>

          <!-- Enrollment Button for Students -->
           @if (authService.isAuthenticated() && authService.userRole() === 'student') {
             <button
               class="w-full px-4 py-2 rounded-md text-sm font-medium transition-colors"
               [class.bg-gray-200]="course?.isEnrolled"
               [class.text-gray-700]="course?.isEnrolled"
               [class.bg-blue-600]="!course?.isEnrolled"
               [class.text-white]="!course?.isEnrolled"
               [class.hover:bg-blue-700]="!course?.isEnrolled"
               [class.cursor-not-allowed]="course?.isEnrolled"
               [disabled]="course?.isEnrolled"
               (click)="!course?.isEnrolled && enrollInCourse(course?.id)">
               {{ course?.isEnrolled ? 'Đã đăng ký' : 'Đăng ký' }}
             </button>
           } @else {
            <a [routerLink]="['/courses', course?.id]"
               [attr.aria-label]="'Xem chi tiết khóa học ' + (course?.title || '')"
               class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              Xem chi tiết
            </a>
          }
        </div>
      </div>
    </article>
  `
})
export class CourseCardComponent {
  @Input() course!: ExtendedCourse;

  // Services
  protected authService = inject(AuthService);
  protected enrollmentService = inject(StudentEnrollmentService);
  private router = inject(Router);

  levelLabel(level: CourseLevel): string {
    return LEVEL_LABELS[level] ?? level;
  }

  levelLabelSafe(level?: CourseLevel): string {
    if (!level) return 'Không rõ';
    return this.levelLabel(level);
  }

  getCategoryName(category: string): string {
    const categoryNames: Record<string, string> = {
      'engineering': 'Kỹ thuật tàu biển',
      'logistics': 'Quản lý cảng',
      'safety': 'An toàn hàng hải',
      'navigation': 'Hàng hải',
      'law': 'Luật hàng hải'
    };
    return categoryNames[category] || category;
  }

  isEnrolledInCourse(courseId?: string): boolean {
    if (!courseId) return false;
    // Use the component's isEnrolled method if available, otherwise fallback to service
    const coursesComponent = this.getCoursesComponent();
    if (coursesComponent && typeof coursesComponent.isEnrolled === 'function') {
      const isEnrolled = coursesComponent.isEnrolled(courseId);
      console.log(`[COURSE CARD] Course ${courseId} enrolled status:`, isEnrolled);
      return isEnrolled;
    }
    // Fallback to service method
    const isEnrolled = this.enrollmentService.isEnrolledInCourse(courseId);
    console.log(`[COURSE CARD] Course ${courseId} enrolled status (fallback):`, isEnrolled);
    return isEnrolled;
  }

  private getCoursesComponent(): any {
    // Try to find the parent CoursesComponent (only in browser environment)
    if (typeof window !== 'undefined') {
      return (window as any).coursesComponent;
    }
    return null;
  }

  async enrollInCourse(courseId?: string): Promise<void> {
    if (!courseId) return;

    const success = await this.enrollmentService.enrollInCourse(courseId);
    if (success) {
      // Enrollment successful - update the course's isEnrolled property
      this.course.isEnrolled = true;

      // Also update the parent CoursesComponent's enrolledCourseIds Set if available
      const coursesComponent = this.getCoursesComponent();
      if (coursesComponent && typeof coursesComponent.enrolledCourseIds?.add === 'function') {
        coursesComponent.enrolledCourseIds.add(courseId);
        console.log(`[COURSE CARD] Updated enrolled course IDs in parent component:`, Array.from(coursesComponent.enrolledCourseIds));
      }

      // Navigate to learning page after successful enrollment
      this.router.navigate(['/student/learn/course', courseId]).catch(error => {
        console.error('Navigation error after enrollment:', error);
      });
    }
  }
}


