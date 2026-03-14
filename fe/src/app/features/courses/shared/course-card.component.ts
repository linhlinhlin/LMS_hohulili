import { Component, input, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LEVEL_LABELS, CourseLevel, ExtendedCourse } from '../../../shared/types/course.types';
import { AuthService } from '../../../core/services/auth.service';
import { StudentEnrollmentService } from '../../../features/student/services/enrollment.service';

@Component({
  selector: 'app-course-card',
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <!-- Thumbnail -->
      <a [routerLink]="['/courses', course().id]" class="block">
        <div class="relative h-44 overflow-hidden">
          @if (course().thumbnail && !course().thumbnail.includes('placeholder')) {
            <img [src]="course().thumbnail"
                 [alt]="course().title"
                 (error)="$any($event.target).style.display='none'"
                 class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105">
          }
          <!-- Maritime gradient fallback -->
          <div class="absolute inset-0 -z-10" [class]="getCategoryGradient(course().category)">
            <svg class="absolute bottom-3 right-3 h-14 w-14 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="0.8">
              <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20"/><path d="M2 12h20"/>
            </svg>
          </div>
          <!-- Category badge -->
          <span class="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-medium text-gray-700 backdrop-blur-sm">
            {{ getCategoryName(course().category) }}
          </span>
          <!-- Price badge -->
          <span class="absolute right-3 top-3 rounded-md px-2 py-0.5 text-[11px] font-bold backdrop-blur-sm"
                [class]="course().price === 0 ? 'bg-green-500/90 text-white' : 'bg-white/90 text-gray-900'">
            {{ course().price === 0 ? 'Miễn phí' : formatPrice(course().price) }}
          </span>
        </div>
      </a>

      <!-- Content -->
      <div class="p-4">
        <!-- Title -->
        <a [routerLink]="['/courses', course().id]">
          <h3 class="line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900 group-hover:text-[#0056D2] transition-colors">
            {{ course().title }}
          </h3>
        </a>

        <!-- Instructor -->
        <div class="mt-2 flex items-center gap-2">
          <div class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
            {{ (course().instructor?.name || 'G')[0] }}
          </div>
          <span class="text-xs text-gray-500">{{ course().instructor?.name || 'Giảng viên' }}</span>
        </div>

        <!-- Rating + Stats -->
        <div class="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <div class="flex items-center gap-1">
            <svg class="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span class="text-xs font-semibold text-gray-900">{{ course().rating || 5 }}</span>
            <span class="text-[11px] text-gray-400">({{ course().studentsCount || 0 }})</span>
          </div>
          <span class="text-[11px] text-gray-400">{{ course().lessonsCount || 0 }} bài học</span>
        </div>
      </div>
    </article>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class CourseCardComponent {
  readonly course = input.required<ExtendedCourse>();
  protected readonly authService = inject(AuthService);
  protected readonly enrollmentService = inject(StudentEnrollmentService);

  levelLabelSafe(level?: CourseLevel): string {
    if (!level) return '';
    return LEVEL_LABELS[level] ?? level;
  }

  getCategoryName(category: string): string {
    const names: Record<string, string> = {
      'engineering': 'Kỹ thuật tàu biển',
      'logistics': 'Logistics hàng hải',
      'safety': 'An toàn hàng hải',
      'navigation': 'Điều khiển tàu',
      'law': 'Luật hàng hải',
      'cargo': 'Xếp dỡ hàng hóa'
    };
    return names[category] || category;
  }

  getCategoryGradient(category: string): string {
    const map: Record<string, string> = {
      'safety': 'bg-gradient-to-br from-red-100 to-red-50',
      'navigation': 'bg-gradient-to-br from-blue-100 to-blue-50',
      'engineering': 'bg-gradient-to-br from-slate-200 to-slate-100',
      'logistics': 'bg-gradient-to-br from-amber-100 to-amber-50',
      'law': 'bg-gradient-to-br from-purple-100 to-purple-50',
      'cargo': 'bg-gradient-to-br from-teal-100 to-teal-50',
    };
    return map[category] || 'bg-gradient-to-br from-[#0056D2]/15 to-[#0056D2]/5';
  }

  formatPrice(price?: number): string {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }

  isEnrolledInCourse(courseId?: string): boolean {
    if (!courseId) return false;
    return this.enrollmentService.enrolledCourseIds().has(courseId);
  }
}
