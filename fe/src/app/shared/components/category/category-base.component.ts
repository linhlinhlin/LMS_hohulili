import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CategoryInfo, Course } from '../../types/course.types';

@Component({
  selector: 'app-category-base',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Hero Section -->
      <section class="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div class="absolute inset-0 bg-black opacity-20"></div>
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <!-- Left Content -->
            <div>
              <div class="flex items-center space-x-3 mb-6">
                <div class="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                     [style.background-color]="categoryInfo().color">
                  {{ categoryInfo().icon }}
                </div>
                <div>
                  <h1 class="text-4xl lg:text-5xl font-bold mb-2">{{ categoryInfo().name }}</h1>
                  <p class="text-xl text-blue-100">{{ categoryInfo().shortDescription }}</p>
                </div>
              </div>
              
              <p class="text-lg text-blue-100 mb-8 leading-relaxed">
                {{ categoryInfo().description }}
              </p>

              <!-- Stats -->
              <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="text-center">
                  <div class="text-3xl font-bold text-white">{{ categoryInfo().stats.courses }}</div>
                  <div class="text-sm text-blue-200">Khóa học</div>
                </div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-white">{{ categoryInfo().stats.students }}+</div>
                  <div class="text-sm text-blue-200">Học viên</div>
                </div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-white">{{ categoryInfo().stats.instructors }}</div>
                  <div class="text-sm text-blue-200">Giảng viên</div>
                </div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-white">{{ categoryInfo().stats.certificates }}</div>
                  <div class="text-sm text-blue-200">Chứng chỉ</div>
                </div>
              </div>

              <!-- CTA Buttons -->
              <div class="flex flex-col sm:flex-row gap-4">
                <a routerLink="#courses" 
                   class="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 text-center">
                  Khám phá khóa học
                </a>
                <a routerLink="#career" 
                   class="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-200 text-center">
                  Xem cơ hội nghề nghiệp
                </a>
              </div>
            </div>

            <!-- Right Content - Hero Image -->
            <div class="relative">
              <div class="relative z-10">
                <img [src]="categoryInfo().heroImage" 
                     [alt]="categoryInfo().name"
                     class="w-full h-96 object-cover rounded-2xl shadow-2xl">
              </div>
              <!-- Floating Cards -->
              <div class="absolute -top-4 -left-4 bg-white rounded-lg p-4 shadow-lg">
                <div class="flex items-center space-x-2">
                  <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span class="text-green-600 text-sm">✓</span>
                  </div>
                  <div>
                    <div class="text-sm font-semibold text-gray-900">Chứng chỉ quốc tế</div>
                    <div class="text-xs text-gray-500">STCW, IMO</div>
                  </div>
                </div>
              </div>
              <div class="absolute -bottom-4 -right-4 bg-white rounded-lg p-4 shadow-lg">
                <div class="flex items-center space-x-2">
                  <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span class="text-blue-600 text-sm">👨‍🏫</span>
                  </div>
                  <div>
                    <div class="text-sm font-semibold text-gray-900">Giảng viên chuyên môn</div>
                    <div class="text-xs text-gray-500">Kinh nghiệm thực tế</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Learning Path Section -->
      <section class="py-16 bg-white" id="learning-path">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-12">
            <h2 class="text-3xl font-bold text-gray-900 mb-4">Lộ trình học tập</h2>
            <p class="text-lg text-gray-600 max-w-3xl mx-auto">
              Bắt đầu từ cơ bản và tiến lên các cấp độ chuyên sâu với lộ trình học tập được thiết kế khoa học
            </p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Beginner -->
            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8">
              <div class="flex items-center space-x-3 mb-6">
                <div class="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <span class="text-white text-xl">🌱</span>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-gray-900">Cơ bản</h3>
                  <p class="text-green-600 font-medium">Bắt đầu hành trình</p>
                </div>
              </div>
              <div class="space-y-4">
                @for (course of categoryInfo().learningPath.beginner; track course.id) {
                  <div class="bg-white rounded-lg p-4 shadow-sm">
                    <h4 class="font-semibold text-gray-900 mb-2">{{ course.title }}</h4>
                    <div class="flex items-center justify-between text-sm text-gray-600">
                      <span>{{ course.duration }}</span>
                      <span>{{ course.students }}+ học viên</span>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Intermediate -->
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8">
              <div class="flex items-center space-x-3 mb-6">
                <div class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span class="text-white text-xl">🚀</span>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-gray-900">Trung cấp</h3>
                  <p class="text-blue-600 font-medium">Nâng cao kỹ năng</p>
                </div>
              </div>
              <div class="space-y-4">
                @for (course of categoryInfo().learningPath.intermediate; track course.id) {
                  <div class="bg-white rounded-lg p-4 shadow-sm">
                    <h4 class="font-semibold text-gray-900 mb-2">{{ course.title }}</h4>
                    <div class="flex items-center justify-between text-sm text-gray-600">
                      <span>{{ course.duration }}</span>
                      <span>{{ course.students }}+ học viên</span>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Advanced -->
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8">
              <div class="flex items-center space-x-3 mb-6">
                <div class="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span class="text-white text-xl">🏆</span>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-gray-900">Nâng cao</h3>
                  <p class="text-purple-600 font-medium">Trở thành chuyên gia</p>
                </div>
              </div>
              <div class="space-y-4">
                @for (course of categoryInfo().learningPath.advanced; track course.id) {
                  <div class="bg-white rounded-lg p-4 shadow-sm">
                    <h4 class="font-semibold text-gray-900 mb-2">{{ course.title }}</h4>
                    <div class="flex items-center justify-between text-sm text-gray-600">
                      <span>{{ course.duration }}</span>
                      <span>{{ course.students }}+ học viên</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Courses Section -->
      <section class="py-16 bg-gray-50" id="courses">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-12">
            <h2 class="text-3xl font-bold text-gray-900 mb-4">Khóa học {{ categoryInfo().name }}</h2>
            <p class="text-lg text-gray-600 max-w-3xl mx-auto">
              Khám phá các khóa học chuyên sâu được thiết kế bởi các chuyên gia hàng đầu trong lĩnh vực
            </p>
          </div>

          <!-- Course Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            @for (course of courses(); track course.id) {
              <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <!-- Course Image -->
                <div class="relative">
                  <img [src]="course.thumbnail" 
                       [alt]="course.title"
                       class="w-full h-48 object-cover">
                  @if (course.isPopular) {
                    <div class="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Phổ biến
                    </div>
                  }
                  @if (course.isNew) {
                    <div class="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Mới
                    </div>
                  }
                </div>

                <!-- Course Content -->
                <div class="p-6">
                  <div class="flex items-center justify-between mb-3">
                    <span class="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                      {{ course.level }}
                    </span>
                    <div class="flex items-center space-x-1">
                      <span class="text-yellow-400">★</span>
                      <span class="text-sm text-gray-600">{{ course.rating }} ({{ course.reviews }})</span>
                    </div>
                  </div>

                  <h3 class="text-xl font-bold text-gray-900 mb-2">{{ course.title }}</h3>
                  <p class="text-gray-600 mb-4 line-clamp-2">{{ course.shortDescription }}</p>

                  <!-- Instructor -->
                  <div class="flex items-center space-x-3 mb-4">
                    <img [src]="course.instructor.avatar" 
                         [alt]="course.instructor.name"
                         class="w-8 h-8 rounded-full">
                    <div>
                      <div class="text-sm font-medium text-gray-900">{{ course.instructor.name }}</div>
                      <div class="text-xs text-gray-500">{{ course.instructor.title }}</div>
                    </div>
                  </div>

                  <!-- Course Stats -->
                  <div class="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <span>{{ course.duration }}</span>
                    <span>{{ course.students }}+ học viên</span>
                    <span>{{ course.curriculum.modules }} modules</span>
                  </div>

                  <!-- Price and CTA -->
                  <div class="flex items-center justify-between">
                    <div>
                      @if (course.originalPrice && course.originalPrice > course.price) {
                        <div class="flex items-center space-x-2">
                          <span class="text-lg font-bold text-gray-900">{{ course.price | currency:'VND':'symbol':'1.0-0':'vi' }}</span>
                          <span class="text-sm text-gray-500 line-through">{{ course.originalPrice | currency:'VND':'symbol':'1.0-0':'vi' }}</span>
                        </div>
                      } @else {
                        <span class="text-lg font-bold text-gray-900">{{ course.price | currency:'VND':'symbol':'1.0-0':'vi' }}</span>
                      }
                    </div>
                    <a [routerLink]="['/courses', course.id]" 
                       class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200">
                      Xem chi tiết
                    </a>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Career Opportunities Section -->
      <section class="py-16 bg-white" id="career">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-12">
            <h2 class="text-3xl font-bold text-gray-900 mb-4">Cơ hội nghề nghiệp</h2>
            <p class="text-lg text-gray-600 max-w-3xl mx-auto">
              Khám phá các vị trí công việc và cơ hội thăng tiến trong lĩnh vực {{ categoryInfo().name }}
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            @for (career of categoryInfo().careerOpportunities; track career.title) {
              <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300">
                <h3 class="text-xl font-bold text-gray-900 mb-3">{{ career.title }}</h3>
                <p class="text-gray-600 mb-4">{{ career.description }}</p>
                <div class="text-lg font-semibold text-blue-600 mb-4">{{ career.salary }}</div>
                <div class="space-y-2">
                  <h4 class="font-medium text-gray-900">Yêu cầu:</h4>
                  <ul class="space-y-1">
                    @for (req of career.requirements; track req) {
                      <li class="text-sm text-gray-600 flex items-center">
                        <span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        {{ req }}
                      </li>
                    }
                  </ul>
                </div>
              </div>
            }
          </div>
        </div>
      </section>
    </div>
  `
})
export class CategoryBaseComponent {
  @Input() categoryInfo = signal<CategoryInfo>({} as CategoryInfo);
  @Input() courses = signal<Course[]>([]);
}

