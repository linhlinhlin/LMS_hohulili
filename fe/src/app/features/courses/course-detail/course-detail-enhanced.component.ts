import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { CourseDetailService } from './services/course-detail.service';
import { CourseHeroComponent } from './components/course-hero.component';
import { CourseCurriculumComponent } from './components/course-curriculum.component';
import { CourseInstructorComponent } from './components/course-instructor.component';

@Component({
  selector: 'app-course-detail-enhanced',
  imports: [
    CommonModule,
    CourseHeroComponent,
    CourseCurriculumComponent,
    CourseInstructorComponent
  ],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Hero Section -->
      <app-course-hero [course]="courseDetailService.course"></app-course-hero>
      
      <!-- Main Content -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Left Column - Main Content -->
          <div class="lg:col-span-2 space-y-8">
            <!-- Curriculum -->
            <app-course-curriculum [course]="courseDetailService.course"></app-course-curriculum>
            
            <!-- Instructor -->
            <app-course-instructor [instructor]="courseDetailService.course()?.instructor || null"></app-course-instructor>
            
            <!-- Reviews Section -->
            <div class="bg-white rounded-lg shadow-sm p-6">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Đánh giá học viên</h2>
              
              @if (courseDetailService.reviews().length === 0) {
                <div class="text-center py-8">
                  <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  <h3 class="mt-2 text-sm font-medium text-gray-900">Chưa có đánh giá</h3>
                  <p class="mt-1 text-sm text-gray-500">Hãy là người đầu tiên đánh giá khóa học này</p>
                </div>
              } @else {
                <!-- Reviews Summary -->
                <div class="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                      <div class="text-3xl font-bold text-gray-900">
                        {{ courseDetailService.course()?.rating }}
                      </div>
                      <div>
                        <div class="flex items-center space-x-1">
                          @for (star of getStars(courseDetailService.course()?.rating!); track star) {
                            <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                          }
                        </div>
                        <div class="text-sm text-gray-600">
                          {{ courseDetailService.course()?.reviews }} đánh giá
                        </div>
                      </div>
                    </div>
                    <button 
                      (click)="scrollToReviews()"
                      class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Xem tất cả →
                    </button>
                  </div>
                </div>

                <!-- Reviews List -->
                <div class="space-y-6">
                  @for (review of courseDetailService.reviews().slice(0, 3); track review.id) {
                    <div class="border-b border-gray-200 pb-6 last:border-b-0">
                      <div class="flex items-start space-x-4">
                        <img 
                          [src]="review.userAvatar" 
                          [alt]="review.userName"
                          class="w-10 h-10 rounded-full" />
                        <div class="flex-1">
                          <div class="flex items-center justify-between mb-2">
                            <div>
                              <h4 class="text-sm font-semibold text-gray-900">{{ review.userName }}</h4>
                              <p class="text-xs text-gray-500">{{ review.userRole }}</p>
                            </div>
                            <div class="flex items-center space-x-1">
                              @for (star of getStars(review.rating); track star) {
                                <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                              }
                            </div>
                          </div>
                          <p class="text-gray-700 leading-relaxed">{{ review.comment }}</p>
                          <div class="flex items-center justify-between mt-3">
                            <span class="text-xs text-gray-500">
                              {{ formatDate(review.createdAt) }}
                            </span>
                            <div class="flex items-center space-x-2">
                              <button class="text-xs text-gray-500 hover:text-gray-700">
                                👍 {{ review.helpful }} hữu ích
                              </button>
                              @if (review.isVerified) {
                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  ✓ Đã xác minh
                                </span>
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- FAQ Section -->
            <div class="bg-white rounded-lg shadow-sm p-6">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Câu hỏi thường gặp</h2>
              
              @if (courseDetailService.faq().length === 0) {
                <div class="text-center py-8">
                  <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <h3 class="mt-2 text-sm font-medium text-gray-900">Chưa có câu hỏi</h3>
                  <p class="mt-1 text-sm text-gray-500">Câu hỏi thường gặp đang được cập nhật</p>
                </div>
              } @else {
                <div class="space-y-4">
                  @for (faq of courseDetailService.faq(); track faq.id) {
                    <div class="border border-gray-200 rounded-lg">
                      <button 
                        (click)="toggleFAQ(faq.id)"
                        class="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <span class="font-medium text-gray-900">{{ faq.question }}</span>
                        <svg 
                          class="w-5 h-5 text-gray-500 transform transition-transform"
                          [class.rotate-180]="isFAQOpen(faq.id)"
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>
                      @if (isFAQOpen(faq.id)) {
                        <div class="px-6 pb-4">
                          <p class="text-gray-700 leading-relaxed">{{ faq.answer }}</p>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Right Column - Sidebar -->
          <div class="lg:col-span-1">
            <!-- Enrollment Card -->
            <div class="bg-white rounded-lg shadow-sm p-6 mb-6 sticky top-8">
              <div class="text-center mb-6">
                <div class="text-3xl font-bold text-gray-900 mb-2">
                  {{ getPriceDisplay(courseDetailService.course()?.price) }}
                </div>
                @if (courseDetailService.course()?.originalPrice && courseDetailService.course()?.originalPrice! > courseDetailService.course()?.price!) {
                  <div class="text-lg text-gray-500 line-through">
                    {{ courseDetailService.course()?.originalPrice! | currency:'VND':'symbol':'1.0-0':'vi' }}
                  </div>
                }
              </div>

              @if (courseDetailService.canEnroll()) {
                <button 
                  (click)="enrollInCourse()"
                  [disabled]="courseDetailService.isLoading()"
                  class="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all mb-4 disabled:opacity-50 disabled:cursor-not-allowed">
                  @if (courseDetailService.isLoading()) {
                    <span class="flex items-center justify-center">
                      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                  (click)="continueLearning()"
                  class="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all mb-4">
                  Tiếp tục học
                </button>
              }

              <div class="space-y-3 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Thời lượng:</span>
                  <span class="font-medium">{{ courseDetailService.course()?.duration }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Cấp độ:</span>
                  <span class="font-medium">{{ getLevelLabel(courseDetailService.course()?.level!) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Đánh giá:</span>
                  <span class="font-medium">{{ courseDetailService.course()?.rating }}/5</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Học viên:</span>
                  <span class="font-medium">{{ courseDetailService.course()?.studentsCount }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Chứng chỉ:</span>
                  <span class="font-medium">{{ courseDetailService.course()?.certificate?.type || 'N/A' }}</span>
                </div>
              </div>
            </div>

            <!-- Related Courses -->
            @if (courseDetailService.relatedCourses().length > 0) {
              <div class="bg-white rounded-lg shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Khóa học liên quan</h3>
                <div class="space-y-4">
                  @for (course of courseDetailService.relatedCourses(); track course.id) {
                    <div class="flex space-x-3">
                      <img 
                        [src]="course.thumbnail" 
                        [alt]="course.title"
                        class="w-16 h-12 object-cover rounded" />
                      <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-medium text-gray-900 line-clamp-2">{{ course.title }}</h4>
                        <div class="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <span>{{ course.rating }} ⭐</span>
                          <span>{{ course.studentsCount }} học viên</span>
                        </div>
                        <div class="text-sm font-semibold text-gray-900 mt-1">
                          {{ getPriceDisplay(course.price) }}
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class CourseDetailEnhancedComponent implements OnInit, OnDestroy {
  protected courseDetailService = inject(CourseDetailService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private title = inject(Title);
  private meta = inject(Meta);

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
      console.error('Error loading course detail:', error);
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
      const userId = 'current-user-id'; // Mock user ID
      await this.courseDetailService.enrollInCourse(course.id, userId);
    } catch (error) {
      console.error('Error enrolling in course:', error);
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