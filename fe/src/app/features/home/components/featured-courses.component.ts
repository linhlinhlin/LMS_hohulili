import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Course {
  id: number;
  title: string;
  description: string;
  image: string;
  price: string;
  students: string;
  instructor: string;
  rating: number;
  level: string;
}

@Component({
  selector: 'app-featured-courses',
  imports: [CommonModule, RouterModule, NgOptimizedImage],
  encapsulation: ViewEncapsulation.None,
  template: `
    <section class="py-16 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Trending Courses -->
        <div class="mb-12">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900 flex items-center">
              <span class="w-6 h-6 text-red-500 mr-2 text-lg">🔥</span>
              Khóa học thịnh hành
            </h2>
            <a routerLink="/courses" class="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200">
              Xem tất cả →
            </a>
          </div>
          <div class="grid md:grid-cols-3 gap-6">
            @for (course of trendingCourses; track course.id) {
              <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
                <div class="relative">
                  <img
                    [ngSrc]="course.image || '/images/placeholder.svg'"
                    [alt]="course.title"
                    width="400"
                    height="192"
                    class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div class="absolute top-4 left-4">
                    <span class="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      HOT
                    </span>
                  </div>
                  <div class="absolute top-4 right-4">
                    <div class="bg-white/90 backdrop-blur-sm rounded-full p-2">
                      <span class="w-4 h-4 text-gray-600 text-sm">❤️</span>
                    </div>
                  </div>
                </div>
                <div class="p-6">
                  <div class="flex items-center justify-between mb-2">
                    <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                      {{ course.level }}
                    </span>
                    <span class="text-sm text-gray-500">{{ course.students }} học viên</span>
                  </div>
                  <h3 class="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-200">
                    {{ course.title }}
                  </h3>
                  <p class="text-gray-600 text-sm mb-4 line-clamp-2">{{ course.description }}</p>
                  
                  <!-- Instructor -->
                  <div class="flex items-center mb-4">
                    <div class="w-8 h-8 bg-gray-200 rounded-full mr-3 flex items-center justify-center">
                      <span class="w-4 h-4 text-gray-600 text-sm">👤</span>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900">{{ course.instructor }}</p>
                      <div class="flex items-center">
                        <div class="flex items-center">
                          @for (star of [1,2,3,4,5]; track star) {
                            <span 
                              class="w-3 h-3 mr-1 text-xs"
                              [class.text-yellow-400]="star <= course.rating"
                              [class.text-gray-300]="star > course.rating"
                            >⭐</span>
                          }
                        </div>
                        <span class="text-xs text-gray-500 ml-1">{{ course.rating }}.0</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex items-center justify-between">
                    <span class="text-lg font-bold text-blue-600">{{ course.price }}</span>
                    <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105">
                      Đăng ký
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- New Courses -->
        <div class="mb-12">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900 flex items-center">
              <span class="w-6 h-6 text-green-500 mr-2 text-lg">✨</span>
              Khóa học mới
            </h2>
            <a routerLink="/courses?filter=new" class="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200">
              Xem tất cả →
            </a>
          </div>
          <div class="grid md:grid-cols-3 gap-6">
            @for (course of newCourses; track course.id) {
              <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
                <div class="relative">
                  <img
                    [ngSrc]="course.image || '/images/placeholder.svg'"
                    [alt]="course.title"
                    width="400"
                    height="192"
                    class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div class="absolute top-4 left-4">
                    <span class="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      MỚI
                    </span>
                  </div>
                </div>
                <div class="p-6">
                  <div class="flex items-center justify-between mb-2">
                    <span class="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                      {{ course.level }}
                    </span>
                    <span class="text-sm text-gray-500">{{ course.students }} học viên</span>
                  </div>
                  <h3 class="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-200">
                    {{ course.title }}
                  </h3>
                  <p class="text-gray-600 text-sm mb-4 line-clamp-2">{{ course.description }}</p>
                  
                  <div class="flex items-center justify-between">
                    <span class="text-lg font-bold text-blue-600">{{ course.price }}</span>
                    <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105">
                      Đăng ký
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Beginner Courses -->
        <div>
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900 flex items-center">
              <span class="w-6 h-6 text-purple-500 mr-2 text-lg">🎯</span>
              Dành cho người mới bắt đầu
            </h2>
            <a routerLink="/courses?filter=beginner" class="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200">
              Xem tất cả →
            </a>
          </div>
          <div class="grid md:grid-cols-3 gap-6">
            @for (course of beginnerCourses; track course.id) {
              <div class="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
                <div class="relative">
                  <img
                    [ngSrc]="course.image || '/images/placeholder.svg'"
                    [alt]="course.title"
                    width="400"
                    height="192"
                    class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div class="absolute top-4 left-4">
                    <span class="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      CƠ BẢN
                    </span>
                  </div>
                </div>
                <div class="p-6">
                  <div class="flex items-center mb-4">
                    <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                      <span class="w-6 h-6 text-purple-600 text-lg">📖</span>
                    </div>
                    <div>
                      <h3 class="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors duration-200">
                        {{ course.title }}
                      </h3>
                      <p class="text-sm text-gray-600">{{ course.students }} học viên</p>
                    </div>
                  </div>
                  <p class="text-gray-600 text-sm mb-4 line-clamp-2">{{ course.description }}</p>
                  
                  <div class="flex items-center justify-between">
                    <span class="text-lg font-bold text-purple-600">{{ course.price }}</span>
                    <button class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 transform hover:scale-105">
                      Bắt đầu học
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturedCoursesComponent {
  trendingCourses: Course[] = [
    {
      id: 1,
      title: "An toàn hàng hải cơ bản",
      description: "Khóa học cơ bản về an toàn trên biển theo tiêu chuẩn STCW",
      image: "/images/courses/marine-engine.jpg",
      price: "2.500.000đ",
      students: "1,234",
      instructor: "Thuyền trưởng Nguyễn Văn A",
      rating: 4.8,
      level: "Cơ bản"
    },
    {
      id: 2,
      title: "Điều khiển tàu nâng cao",
      description: "Kỹ năng điều khiển tàu cho thuyền trưởng và sĩ quan",
      image: "/images/testimonials/captain-portrait.jpg",
      price: "4.500.000đ",
      students: "856",
      instructor: "Thuyền trưởng Trần Văn B",
      rating: 4.9,
      level: "Nâng cao"
    },
    {
      id: 3,
      title: "Kỹ thuật máy tàu",
      description: "Bảo trì và vận hành hệ thống máy tàu hiện đại",
      image: "/images/courses/marine-engine.jpg",
      price: "3.800.000đ",
      students: "642",
      instructor: "Kỹ sư Lê Thị C",
      rating: 4.7,
      level: "Trung cấp"
    },
  ];

  newCourses: Course[] = [
    {
      id: 4,
      title: "Logistics hàng hải số",
      description: "Ứng dụng công nghệ số trong quản lý logistics",
      image: "/images/courses/marine-engine.jpg",
      price: "3.200.000đ",
      students: "234",
      instructor: "Chuyên gia Phạm Văn D",
      rating: 4.6,
      level: "Nâng cao"
    },
    {
      id: 5,
      title: "Luật hàng hải quốc tế 2024",
      description: "Cập nhật các quy định mới nhất về luật hàng hải",
      image: "/images/testimonials/captain-portrait.jpg",
      price: "2.800.000đ",
      students: "156",
      instructor: "Luật sư Nguyễn Thị E",
      rating: 4.8,
      level: "Trung cấp"
    },
    {
      id: 6,
      title: "Quản lý rủi ro cảng biển",
      description: "Đánh giá và quản lý rủi ro trong hoạt động cảng",
      image: "/images/courses/marine-engine.jpg",
      price: "4.200.000đ",
      students: "89",
      instructor: "Chuyên gia Trần Văn F",
      rating: 4.9,
      level: "Nâng cao"
    },
  ];

  beginnerCourses: Course[] = [
    {
      id: 7,
      title: "Giới thiệu ngành hàng hải",
      description: "Tổng quan về ngành hàng hải và cơ hội nghề nghiệp",
      image: "/images/testimonials/diverse-student-portraits.png",
      price: "1.500.000đ",
      students: "2,145",
      instructor: "Giảng viên Lê Văn G",
      rating: 4.5,
      level: "Cơ bản"
    },
    {
      id: 8,
      title: "Tiếng Anh hàng hải cơ bản",
      description: "Từ vựng và giao tiếp tiếng Anh chuyên ngành",
      image: "/images/courses/marine-engine.jpg",
      price: "1.800.000đ",
      students: "1,876",
      instructor: "Giảng viên Nguyễn Thị H",
      rating: 4.6,
      level: "Cơ bản"
    },
    {
      id: 9,
      title: "Kỹ năng sống trên tàu",
      description: "Chuẩn bị tâm lý và kỹ năng cho cuộc sống trên biển",
      image: "/images/testimonials/captain-portrait.jpg",
      price: "1.200.000đ",
      students: "1,543",
      instructor: "Thuyền trưởng Phạm Văn I",
      rating: 4.7,
      level: "Cơ bản"
    },
  ];
}
