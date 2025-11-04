import { Component, Input, computed } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExtendedCourse } from '../../../../shared/types/course.types';

@Component({
  selector: 'app-course-instructor',
  imports: [CommonModule, RouterModule, NgOptimizedImage],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Giảng viên</h2>
      
      @if (instructor) {
        <div class="flex flex-col md:flex-row gap-6">
          <!-- Instructor Avatar -->
          <div class="flex-shrink-0">
            <div class="relative">
              <img 
                [ngSrc]="instructor.avatar!" 
                width="150" 
                height="150" 
                class="w-32 h-32 rounded-full object-cover border-4 border-blue-100"
                [alt]="instructor.name" />
              
              <!-- Verified Badge -->
              <div class="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Instructor Info -->
          <div class="flex-1">
            <div class="space-y-4">
              <!-- Name and Title -->
              <div>
                <h3 class="text-2xl font-bold text-gray-900">{{ instructor.name }}</h3>
                <p class="text-lg text-gray-600">{{ instructor.title }}</p>
              </div>

              <!-- Stats -->
              <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div class="text-center p-3 bg-blue-50 rounded-lg">
                  <div class="text-2xl font-bold text-blue-600">{{ instructor.rating }}</div>
                  <div class="text-sm text-gray-600">Đánh giá</div>
                </div>
                <div class="text-center p-3 bg-green-50 rounded-lg">
                  <div class="text-2xl font-bold text-green-600">{{ instructor.studentsCount }}</div>
                  <div class="text-sm text-gray-600">Học viên</div>
                </div>
                <div class="text-center p-3 bg-purple-50 rounded-lg">
                  <div class="text-2xl font-bold text-purple-600">{{ instructor.experience }}</div>
                  <div class="text-sm text-gray-600">Năm kinh nghiệm</div>
                </div>
              </div>

              <!-- Credentials -->
              <div>
                <h4 class="text-lg font-semibold text-gray-900 mb-2">Chứng chỉ & Bằng cấp</h4>
                <div class="flex flex-wrap gap-2">
                  @for (credential of instructor.credentials; track credential) {
                    <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      {{ credential }}
                    </span>
                  }
                </div>
              </div>

              <!-- Bio -->
              <div>
                <h4 class="text-lg font-semibold text-gray-900 mb-2">Giới thiệu</h4>
                <p class="text-gray-600 leading-relaxed">
                  {{ getInstructorBio() }}
                </p>
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-col sm:flex-row gap-3">
                <button 
                  [routerLink]="['/instructor', instructor.id]"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                  Xem hồ sơ
                </button>
                <button 
                  (click)="contactInstructor()"
                  class="border border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors">
                  Liên hệ
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Instructor's Other Courses -->
        <div class="mt-8 pt-6 border-t border-gray-200">
          <h4 class="text-lg font-semibold text-gray-900 mb-4">Khóa học khác của giảng viên</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (course of getOtherCourses(); track course.id) {
              <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <img 
                  [ngSrc]="course.thumbnail" 
                  width="200" 
                  height="120" 
                  class="w-full h-24 object-cover rounded-lg mb-3"
                  [alt]="course.title" />
                <h5 class="font-semibold text-gray-900 mb-1 line-clamp-2">{{ course.title }}</h5>
                <div class="flex items-center justify-between text-sm text-gray-600">
                  <span>{{ course.rating }} ⭐</span>
                  <span>{{ course.studentsCount }} học viên</span>
                </div>
                <a 
                  [routerLink]="['/courses', course.id]"
                  class="block mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Xem chi tiết →
                </a>
              </div>
            }
          </div>
        </div>
      } @else {
        <!-- Loading State -->
        <div class="animate-pulse">
          <div class="flex flex-col md:flex-row gap-6">
            <div class="w-32 h-32 bg-gray-200 rounded-full"></div>
            <div class="flex-1 space-y-4">
              <div class="h-6 bg-gray-200 rounded w-1/3"></div>
              <div class="h-4 bg-gray-200 rounded w-1/2"></div>
              <div class="grid grid-cols-3 gap-4">
                @for (item of [1,2,3]; track item) {
                  <div class="h-16 bg-gray-200 rounded"></div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class CourseInstructorComponent {
  @Input() instructor!: ExtendedCourse['instructor'] | null;

  getInstructorBio(): string {
    const instructor = this.instructor;
    if (!instructor) return '';

    // Mock bio based on instructor data
    return `Với ${instructor.experience} năm kinh nghiệm trong lĩnh vực hàng hải, ${instructor.name} đã đào tạo hơn ${instructor.studentsCount} học viên và nhận được đánh giá ${instructor.rating}/5 từ cộng đồng. ${instructor.name} chuyên sâu về ${instructor.title.toLowerCase()} và luôn cam kết mang đến những kiến thức thực tế, hữu ích cho học viên.`;
  }

  getOtherCourses(): ExtendedCourse[] {
    // Mock data - trong thực tế sẽ lấy từ service
    return [
      {
        id: 'other-1',
        title: 'Kỹ thuật Tàu biển Nâng cao',
        thumbnail: 'https://via.placeholder.com/200x120/0288D1/FFFFFF?text=Advanced',
        rating: 4.8,
        studentsCount: 650,
        description: '',
        shortDescription: '',
        level: 'advanced',
        duration: '45h',
        students: 650,
        reviews: 95,
        price: 3500000,
        instructor: this.instructor!,
        category: 'engineering',
        tags: [],
        skills: [],
        prerequisites: [],
        certificate: { type: 'Professional', description: '' },
        curriculum: { modules: 0, lessons: 0, duration: '' },
        lessonsCount: 0,
        isPublished: true,
        isEnrolled: false // Default for instructor courses
      },
      {
        id: 'other-2',
        title: 'Bảo trì Hệ thống Tàu',
        thumbnail: 'https://via.placeholder.com/200x120/2E7D32/FFFFFF?text=Maintenance',
        rating: 4.6,
        studentsCount: 420,
        description: '',
        shortDescription: '',
        level: 'intermediate',
        duration: '35h',
        students: 420,
        reviews: 78,
        price: 2800000,
        instructor: this.instructor!,
        category: 'engineering',
        tags: [],
        skills: [],
        prerequisites: [],
        certificate: { type: 'Professional', description: '' },
        curriculum: { modules: 0, lessons: 0, duration: '' },
        lessonsCount: 0,
        isPublished: true,
        isEnrolled: false // Default for instructor courses
      }
    ];
  }

  contactInstructor(): void {
    // Mock contact functionality
    console.log('Contacting instructor:', this.instructor?.name);
    // Trong thực tế sẽ mở contact modal hoặc redirect đến contact page
  }
}