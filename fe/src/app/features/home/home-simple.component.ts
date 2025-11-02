import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home-simple',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Hero Section -->
    <section class="relative bg-gradient-to-r from-blue-600 via-blue-700 to-blue-900 text-white overflow-hidden">
      <div class="absolute inset-0 bg-black bg-opacity-40 z-10"></div>
      
      <div class="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div class="text-center">
          <h1 class="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance">
            Nâng tầm sự nghiệp
            <span class="block text-yellow-400">Hàng hải của bạn</span>
          </h1>
          <p class="text-xl md:text-2xl mb-8 text-blue-100 max-w-4xl mx-auto text-pretty">
            Học hỏi từ các chuyên gia hàng đầu và nhận chứng chỉ được công nhận để vươn ra biển lớn
          </p>
          
          <!-- Key Benefits -->
          <div class="flex flex-wrap justify-center gap-6 mb-10 text-sm md:text-base">
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>50+ môn học chuyên nghiệp</span>
            </div>
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>2.500+ học viên tin tưởng</span>
            </div>
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>Học mọi lúc, mọi nơi</span>
            </div>
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>Chứng chỉ uy tín</span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a routerLink="/courses" 
               class="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 hover:shadow-lg">
              Khám phá khóa học
            </a>
            <a routerLink="/auth/login" 
               class="bg-white hover:bg-gray-100 text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 hover:shadow-lg border-2 border-blue-600">
              Đăng nhập
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="py-16 bg-blue-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div class="text-center">
            <div class="text-4xl font-bold text-blue-600 mb-2">50+</div>
            <div class="text-gray-600">Khóa học chuyên nghiệp</div>
          </div>
          <div class="text-center">
            <div class="text-4xl font-bold text-blue-600 mb-2">2.500+</div>
            <div class="text-gray-600">Học viên tin tưởng</div>
          </div>
          <div class="text-center">
            <div class="text-4xl font-bold text-blue-600 mb-2">25+</div>
            <div class="text-gray-600">Chuyên gia giảng dạy</div>
          </div>
          <div class="text-center">
            <div class="text-4xl font-bold text-blue-600 mb-2">1.200+</div>
            <div class="text-gray-600">Chứng chỉ đã cấp</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">Tại sao chọn LMS Maritime?</h2>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto">
            Nền tảng học tập được thiết kế đặc biệt cho ngành hàng hải với các tính năng vượt trội
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div class="text-center group">
            <div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-gray-900 mb-4">Nội dung chuyên nghiệp</h3>
            <p class="text-gray-600 leading-relaxed">
              Khóa học được thiết kế bởi các chuyên gia hàng hải có kinh nghiệm thực tế và được cập nhật liên tục
            </p>
          </div>

          <div class="text-center group">
            <div class="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-gray-900 mb-4">Học mọi lúc mọi nơi</h3>
            <p class="text-gray-600 leading-relaxed">
              Truy cập khóa học 24/7 trên mọi thiết bị, học tập linh hoạt theo lịch trình và tốc độ của bạn
            </p>
          </div>

          <div class="text-center group">
            <div class="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-gray-900 mb-4">Chứng chỉ uy tín</h3>
            <p class="text-gray-600 leading-relaxed">
              Nhận chứng chỉ được công nhận bởi Trường Đại học Hàng hải Việt Nam và các tổ chức quốc tế
            </p>
          </div>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeSimpleComponent {
  constructor() {
    // Component initialized
  }
}