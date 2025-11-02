import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Hero Section -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div class="container mx-auto px-4 text-center">
          <h1 class="text-4xl md:text-6xl font-bold mb-6">Về LMS Maritime</h1>
          <p class="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            Hệ thống quản lý học tập hàng hải chuyên nghiệp, đào tạo nhân lực chất lượng cao cho ngành hàng hải Việt Nam
          </p>
        </div>
      </div>

      <!-- Mission Section -->
      <div class="py-16 bg-white">
        <div class="container mx-auto px-4">
          <div class="max-w-4xl mx-auto">
            <h2 class="text-3xl font-bold text-gray-900 mb-8 text-center">Sứ mệnh của chúng tôi</h2>
            <div class="grid md:grid-cols-2 gap-8">
              <div class="bg-blue-50 p-6 rounded-lg">
                <h3 class="text-xl font-semibold text-blue-900 mb-4">🎯 Mục tiêu</h3>
                <p class="text-gray-700">
                  Cung cấp nền tảng học tập trực tuyến hiện đại, đào tạo chuyên sâu về kiến thức hàng hải, 
                  góp phần nâng cao chất lượng nhân lực ngành hàng hải Việt Nam.
                </p>
              </div>
              <div class="bg-green-50 p-6 rounded-lg">
                <h3 class="text-xl font-semibold text-green-900 mb-4">🌟 Tầm nhìn</h3>
                <p class="text-gray-700">
                  Trở thành hệ thống LMS hàng đầu trong lĩnh vực đào tạo hàng hải, 
                  được tin tưởng bởi các tổ chức và cá nhân trong ngành.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Features Section -->
      <div class="py-16 bg-gray-50">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-gray-900 mb-12 text-center">Tính năng nổi bật</h2>
          <div class="grid md:grid-cols-3 gap-8">
            <div class="text-center">
              <div class="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">Khóa học chuyên sâu</h3>
              <p class="text-gray-600">Nội dung đào tạo được thiết kế bởi các chuyên gia hàng hải giàu kinh nghiệm</p>
            </div>
            <div class="text-center">
              <div class="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">Hệ thống đánh giá</h3>
              <p class="text-gray-600">Quiz và bài tập thực tế giúp đánh giá chính xác năng lực học viên</p>
            </div>
            <div class="text-center">
              <div class="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">Học tập linh hoạt</h3>
              <p class="text-gray-600">Học mọi lúc, mọi nơi với giao diện thân thiện và dễ sử dụng</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Team Section -->
      <div class="py-16 bg-white">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-gray-900 mb-12 text-center">Đội ngũ chuyên gia</h2>
          <div class="grid md:grid-cols-3 gap-8">
            <div class="text-center">
              <div class="bg-gray-200 w-32 h-32 rounded-full mx-auto mb-4"></div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">ThS. Nguyễn Văn A</h3>
              <p class="text-blue-600 mb-2">Chuyên gia Hàng hải</p>
              <p class="text-gray-600">15 năm kinh nghiệm trong lĩnh vực đào tạo hàng hải</p>
            </div>
            <div class="text-center">
              <div class="bg-gray-200 w-32 h-32 rounded-full mx-auto mb-4"></div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">TS. Trần Thị B</h3>
              <p class="text-blue-600 mb-2">Chuyên gia Công nghệ</p>
              <p class="text-gray-600">Chuyên gia về hệ thống LMS và công nghệ giáo dục</p>
            </div>
            <div class="text-center">
              <div class="bg-gray-200 w-32 h-32 rounded-full mx-auto mb-4"></div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">ThS. Lê Văn C</h3>
              <p class="text-blue-600 mb-2">Chuyên gia Đào tạo</p>
              <p class="text-gray-600">Chuyên gia về phương pháp đào tạo và phát triển nhân lực</p>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="py-16 bg-blue-600 text-white">
        <div class="container mx-auto px-4 text-center">
          <h2 class="text-3xl font-bold mb-4">Sẵn sàng bắt đầu hành trình học tập?</h2>
          <p class="text-xl mb-8">Tham gia ngay để trải nghiệm hệ thống đào tạo hàng hải chuyên nghiệp</p>
          <div class="space-x-4">
            <a routerLink="/auth/register" 
               class="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Đăng ký ngay
            </a>
            <a routerLink="/courses" 
               class="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Xem khóa học
            </a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AboutComponent {}
