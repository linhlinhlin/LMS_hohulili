import { Component, input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { LEVEL_LABELS, CourseLevel, ExtendedCourse } from '../../../shared/types/course.types';
import { AuthService } from '../../../core/services/auth.service';
import { StudentEnrollmentService } from '../../../features/student/services/enrollment.service';

@Component({
  selector: 'app-course-card',
  imports: [CommonModule, RouterModule, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Coursera SOTA Course Card (Dec 2025) -->
    <article class="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
             [attr.aria-label]="'Khóa học: ' + (course().title || '')">
      
      <!-- Image Section with Hover Overlay -->
      <div class="relative overflow-hidden">
        <img [ngSrc]="course().thumbnail || 'assets/images/courses/placeholder.png'" 
             width="400" height="225" 
             [alt]="'Hình ảnh khóa học ' + (course().title || '')" 
             class="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105" />
        
        <!-- Hover Overlay with Play Button -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div class="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <svg class="w-6 h-6 text-blue-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
        
        <!-- Badges (Top Left) -->
        <div class="absolute top-3 left-3 flex flex-wrap gap-1.5" role="group" aria-label="Nhãn khóa học">
          @if (course().isNew) {
            <span class="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
              ✨ Mới
            </span>
          }
          @if (course().isPopular) {
            <span class="bg-gradient-to-r from-orange-500 to-red-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
              🔥 HOT
            </span>
          }
          @if (isEnrolledInCourse(course().id)) {
            <span class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
              ✓ Enrolled
            </span>
          }
        </div>
        
        <!-- Price Badge (Top Right) -->
        <div class="absolute top-3 right-3">
          <span class="bg-white/95 backdrop-blur-sm text-gray-900 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">
            {{ course().price === 0 ? 'Miễn phí' : (course().price | currency:'VND':'symbol':'1.0-0':'vi') }}
          </span>
        </div>
      </div>

      <!-- Content Section -->
      <div class="p-5">
        <!-- Category + Level Row -->
        <div class="flex items-center justify-between mb-3">
          <span class="inline-flex items-center bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {{ getCategoryName(course().category) }}
          </span>
          <span class="text-xs text-gray-500 font-medium">{{ levelLabelSafe(course().level) }}</span>
        </div>

        <!-- Title -->
        <h3 class="text-base font-bold text-gray-900 mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
          {{ course().title }}
        </h3>
        
        <!-- Description (shorter) -->
        <p class="text-gray-500 text-sm mb-4 line-clamp-2 leading-relaxed">{{ course().description }}</p>

        <!-- Instructor Section -->
        <div class="flex items-center mb-4 pb-4 border-b border-gray-100">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 mr-3">
            {{ (course().instructor.name || 'G')[0] }}
          </div>
          <div>
            <p class="text-sm font-medium text-gray-800">{{ course().instructor.name || 'Giảng viên' }}</p>
            <p class="text-xs text-gray-400">{{ course().instructor.title || 'Giảng viên' }}</p>
          </div>
        </div>

        <!-- Rating + Stats Row -->
        <div class="flex items-center justify-between mb-4">
          <!-- Rating Stars -->
          <div class="flex items-center">
            <div class="flex mr-1.5">
              @for (star of [1,2,3,4,5]; track star) {
                <svg class="w-4 h-4" [class.text-yellow-400]="star <= (course().rating || 0)" [class.text-gray-200]="star > (course().rating || 0)" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              }
            </div>
            <span class="text-sm font-semibold text-gray-900">{{ course().rating || 5 }}</span>
            <span class="text-xs text-gray-400 ml-1">({{ course().studentsCount || 0 }})</span>
          </div>
          <span class="text-xs text-gray-500">{{ course().lessonsCount || 0 }} bài học</span>
        </div>

        <!-- Action Button -->
        <div class="flex gap-2">
          @if (authService.isAuthenticated() && authService.userRole() === 'student') {
            @if (isEnrolledInCourse(course().id)) {
              <a [routerLink]="['/student/learn/course', course().id]"
                 class="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold text-center transition-all shadow-sm hover:shadow-md">
                Tiếp tục học →
              </a>
            } @else {
              <a [routerLink]="['/courses', course().id]"
                 class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold text-center transition-all shadow-sm hover:shadow-md">
                Đăng ký ngay
              </a>
            }
          } @else {
            <a [routerLink]="['/courses', course().id]"
               class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold text-center transition-all shadow-sm hover:shadow-md">
              Xem chi tiết
            </a>
          }
        </div>
      </div>
    </article>
  `
})
export class CourseCardComponent {
  // Signal input (Angular v20+)
  readonly course = input.required<ExtendedCourse>();

  // Services
  protected readonly authService = inject(AuthService);
  protected readonly enrollmentService = inject(StudentEnrollmentService);
  private readonly router = inject(Router);

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
    // Use reactive signal from enrollmentService for proper change detection
    // enrolledCourseIds is a computed signal that updates when enrolledCourses changes
    return this.enrollmentService.enrolledCourseIds().has(courseId);
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

    try {
      const success = await this.enrollmentService.enrollInCourse(courseId);
      if (success) {
        this.handleEnrollmentSuccess(courseId);
      }
    } catch (error: any) {
      // Handle multiple classes case
      if (error.availableClasses && error.availableClasses.length > 0) {
        this.showClassPicker(courseId, error.availableClasses);
      } else {
        alert(error.message || 'Không thể đăng ký khóa học. Vui lòng thử lại.');
      }
    }
  }

  private handleEnrollmentSuccess(courseId: string): void {
    // Enrollment successful - update the course's isEnrolled property
    // Note: With signal inputs, we can't mutate the input directly
    // The parent component should handle this state change

    // Also update the parent CoursesComponent's enrolledCourseIds Set if available
    const coursesComponent = this.getCoursesComponent();
    if (coursesComponent && typeof coursesComponent.enrolledCourseIds?.add === 'function') {
      coursesComponent.enrolledCourseIds.add(courseId);
    }

    // Navigate to learning page after successful enrollment
    this.router.navigate(['/student/learn/course', courseId]).catch(error => {
    });
  }

  private async showClassPicker(courseId: string, classes: any[]): Promise<void> {
    // Create a simple prompt with class options
    const options = classes.map((c, i) => `${i + 1}. ${c.name} (${c.code})`).join('\n');
    const message = `Khóa học có nhiều lớp học. Vui lòng chọn (nhập số):\n\n${options}`;

    const choice = window.prompt(message);
    if (choice) {
      const index = parseInt(choice, 10) - 1;
      if (index >= 0 && index < classes.length) {
        const selectedClass = classes[index];

        // Retry enrollment with selected classId
        try {
          const success = await this.enrollmentService.enrollInCourse(courseId, selectedClass.id);
          if (success) {
            this.handleEnrollmentSuccess(courseId);
          }
        } catch (err: any) {
          alert(err.message || 'Không thể đăng ký. Vui lòng thử lại.');
        }
      } else {
        alert('Lựa chọn không hợp lệ. Vui lòng thử lại.');
      }
    }
  }
}
