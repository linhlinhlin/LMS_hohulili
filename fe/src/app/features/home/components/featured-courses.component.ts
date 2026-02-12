import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CourseApi } from '../../../api/client/course.api';
import { CourseSummary } from '../../../api/types/course.types';

@Component({
  selector: 'app-featured-courses',
  imports: [RouterModule, IconComponent],
  template: `
    <section class="py-16 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        @if (isLoading()) {
          <div class="text-center py-12">
            <div class="inline-block w-8 h-8 border-4 border-[#0056D2] border-t-transparent rounded-full animate-spin"></div>
            <p class="mt-4 text-gray-500">Đang tải khóa học...</p>
          </div>
        } @else if (courses().length === 0) {
          <div class="text-center py-12">
            <app-icon name="courses" size="xl" class="text-gray-300 mb-4"/>
            <h3 class="text-lg font-semibold text-gray-600">Chưa có khóa học nào</h3>
            <p class="text-gray-400 mt-2">Các khóa học sẽ xuất hiện tại đây khi được phê duyệt</p>
          </div>
        } @else {
          <!-- Featured Courses -->
          <div class="mb-12">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-2xl font-bold text-gray-900 flex items-center">
                <app-icon name="fire" size="lg" class="text-orange-500 mr-2"/>
                Khóa học nổi bật
              </h2>
              <a routerLink="/courses" class="text-[#0056D2] hover:text-[#004BB5] font-medium transition-colors duration-200">
                Xem tất cả →
              </a>
            </div>
            <div class="grid md:grid-cols-3 gap-6">
              @for (course of featuredCourses(); track course.id) {
                <a [routerLink]="['/courses', course.id]"
                   class="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group block">
                  <div class="relative">
                    @if (course.thumbnailUrl) {
                      <img
                        [src]="course.thumbnailUrl"
                        [alt]="course.title"
                        class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    } @else {
                      <div class="w-full h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                        <app-icon name="courses" size="xl" class="text-[#0056D2]/40"/>
                      </div>
                    }
                    @if (course.priceType === 'FREE') {
                      <div class="absolute top-3 left-3">
                        <span class="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                          Miễn phí
                        </span>
                      </div>
                    }
                  </div>
                  <div class="p-5">
                    @if (course.categoryName) {
                      <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {{ course.categoryName }}
                      </span>
                    }
                    <h3 class="font-semibold text-gray-900 mt-1 mb-2 line-clamp-2 group-hover:text-[#0056D2] transition-colors duration-200">
                      {{ course.title }}
                    </h3>
                    <p class="text-gray-500 text-sm mb-4 line-clamp-2">{{ course.description }}</p>

                    <!-- Instructor -->
                    <div class="flex items-center mb-4">
                      <div class="w-7 h-7 bg-[#0056D2]/10 rounded-full mr-2.5 flex items-center justify-center">
                        <app-icon name="user" size="xs" class="text-[#0056D2]"/>
                      </div>
                      <span class="text-sm text-gray-700">{{ course.teacherName || 'Giảng viên' }}</span>
                    </div>

                    <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div class="flex items-center gap-3 text-sm text-gray-500">
                        <span class="flex items-center gap-1">
                          <app-icon name="user" size="xs" class="text-gray-400"/>
                          {{ course.enrolledCount || 0 }}
                        </span>
                        @if (course.lessonCount) {
                          <span class="flex items-center gap-1">
                            <app-icon name="courses" size="xs" class="text-gray-400"/>
                            {{ course.lessonCount }} bài
                          </span>
                        }
                      </div>
                      @if (course.priceType === 'PAID' && course.price) {
                        <span class="text-base font-bold text-[#0056D2]">{{ formatPrice(course.price) }}</span>
                      } @else {
                        <span class="text-sm font-semibold text-green-600">Miễn phí</span>
                      }
                    </div>
                  </div>
                </a>
              }
            </div>
          </div>

          <!-- More Courses (if available) -->
          @if (moreCourses().length > 0) {
            <div>
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-2xl font-bold text-gray-900 flex items-center">
                  <app-icon name="sparkles" size="lg" class="text-[#0056D2] mr-2"/>
                  Khóa học khác
                </h2>
              </div>
              <div class="grid md:grid-cols-3 gap-6">
                @for (course of moreCourses(); track course.id) {
                  <a [routerLink]="['/courses', course.id]"
                     class="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group block">
                    <div class="relative">
                      @if (course.thumbnailUrl) {
                        <img
                          [src]="course.thumbnailUrl"
                          [alt]="course.title"
                          class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      } @else {
                        <div class="w-full h-48 bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                          <app-icon name="courses" size="xl" class="text-gray-300"/>
                        </div>
                      }
                    </div>
                    <div class="p-5">
                      @if (course.categoryName) {
                        <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {{ course.categoryName }}
                        </span>
                      }
                      <h3 class="font-semibold text-gray-900 mt-1 mb-2 line-clamp-2 group-hover:text-[#0056D2] transition-colors duration-200">
                        {{ course.title }}
                      </h3>
                      <p class="text-gray-500 text-sm mb-3 line-clamp-2">{{ course.description }}</p>
                      <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-500">{{ course.teacherName || 'Giảng viên' }}</span>
                        @if (course.priceType === 'PAID' && course.price) {
                          <span class="font-bold text-[#0056D2]">{{ formatPrice(course.price) }}</span>
                        } @else {
                          <span class="font-semibold text-green-600">Miễn phí</span>
                        }
                      </div>
                    </div>
                  </a>
                }
              </div>
            </div>
          }
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturedCoursesComponent implements OnInit {
  private courseApi = inject(CourseApi);

  courses = signal<CourseSummary[]>([]);
  isLoading = signal(true);

  // First 3 courses = featured, rest = more
  featuredCourses = () => this.courses().slice(0, 3);
  moreCourses = () => this.courses().slice(3, 6);

  ngOnInit(): void {
    this.courseApi.publicCourses({ page: 0, size: 9 }).subscribe({
      next: (res) => {
        this.courses.set(res.data || []);
      },
      error: () => {
        this.courses.set([]);
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }
}
