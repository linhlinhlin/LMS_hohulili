import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExtendedCourse } from '../../../../shared/types/course.types';
import { CourseDetailService } from '../services/course-detail.service';

@Component({
  selector: 'app-course-hero',
  imports: [CommonModule, RouterModule, NgOptimizedImage],
  template: `
    <section class="relative bg-gradient-to-r from-blue-600 via-blue-700 to-blue-900 text-white overflow-hidden">
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="course-waves" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 20 Q25 0 50 20 T100 20 V0 H0 Z" fill="currentColor"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#course-waves)"/>
        </svg>
      </div>

      <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        @if (course()) {
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <!-- Left Column - Course Info -->
            <div class="space-y-8">
              <!-- Course Category Badge -->
              <div class="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
                <span class="text-sm font-semibold">{{ getCategoryName(course()?.category!) }}</span>
              </div>

              <!-- Course Title -->
              <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {{ course()?.title }}
              </h1>

              <!-- Course Description -->
              <p class="text-xl text-blue-100 leading-relaxed max-w-2xl">
                {{ course()?.description }}
              </p>

              <!-- Course Stats -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div class="text-center">
                  <div class="text-3xl font-bold text-yellow-400">{{ course()?.rating }}</div>
                  <div class="text-sm text-blue-200">Đánh giá</div>
                </div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-yellow-400">{{ course()?.studentsCount }}</div>
                  <div class="text-sm text-blue-200">Học viên</div>
                </div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-yellow-400">{{ course()?.duration }}</div>
                  <div class="text-sm text-blue-200">Thời lượng</div>
                </div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-yellow-400">{{ course()?.level }}</div>
                  <div class="text-sm text-blue-200">Cấp độ</div>
                </div>
              </div>

              <!-- Course Tags -->
              <div class="flex flex-wrap gap-2">
                @for (tag of course()?.tags; track tag) {
                  <span class="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm">
                    {{ tag }}
                  </span>
                }
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-col sm:flex-row gap-4">
                @if (courseDetailService.canEnroll()) {
                  <button 
                    (click)="enrollInCourse()"
                    [disabled]="courseDetailService.isLoading()"
                    class="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    @if (courseDetailService.isLoading()) {
                      <span class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang đăng ký...
                      </span>
                    } @else {
                      {{ getEnrollmentButtonText() }}
                    }
                  </button>
                } @else {
                  <button 
                    [routerLink]="['/learn', course()?.id]"
                    class="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 hover:shadow-lg">
                    Tiếp tục học
                  </button>
                }
                
                <button 
                  (click)="scrollToCurriculum()"
                  class="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105">
                  Xem nội dung
                </button>
              </div>
            </div>

            <!-- Right Column - Course Thumbnail -->
            <div class="relative">
              <div class="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  [ngSrc]="course()?.thumbnail!" 
                  width="800" 
                  height="600" 
                  class="w-full h-96 lg:h-[500px] object-cover"
                  [alt]="course()?.title" />
                
                <!-- Play Button Overlay -->
                <div class="absolute inset-0 flex items-center justify-center bg-black/20">
                  <button 
                    (click)="playPreview()"
                    class="w-20 h-20 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg">
                    <svg class="w-8 h-8 text-blue-600 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Course Price -->
              <div class="absolute -bottom-6 -right-6 bg-white rounded-2xl p-6 shadow-xl">
                <div class="text-center">
                  <div class="text-3xl font-bold text-gray-900 mb-2">
                    {{ getPriceDisplay(course()?.price!) }}
                  </div>
                  @if (course()?.originalPrice && course()?.originalPrice! > course()?.price!) {
                    <div class="text-lg text-gray-500 line-through">
                      {{ course()?.originalPrice! | currency:'VND':'symbol':'1.0-0':'vi' }}
                    </div>
                  }
                  <div class="text-sm text-gray-600 mt-2">Trọn đời</div>
                </div>
              </div>
            </div>
          </div>
        } @else {
          <!-- Loading State -->
          <div class="animate-pulse">
            <div class="h-8 bg-white/20 rounded w-1/3 mb-6"></div>
            <div class="h-12 bg-white/20 rounded w-2/3 mb-4"></div>
            <div class="h-6 bg-white/20 rounded w-full mb-8"></div>
            <div class="grid grid-cols-4 gap-4">
              @for (item of [1,2,3,4]; track item) {
                <div class="h-16 bg-white/20 rounded"></div>
              }
            </div>
          </div>
        }
      </div>
    </section>
  `
})
export class CourseHeroComponent {
  @Input() course = computed<ExtendedCourse | null>(() => null);
  
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
      console.error('Error enrolling in course:', error);
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
    console.log('Playing course preview...');
    // Trong thực tế sẽ mở video player modal hoặc redirect đến preview page
  }
}