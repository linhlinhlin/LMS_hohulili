// src/app/shared/components/footer/footer.component.ts
import { Component, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="bg-gray-900 text-white">
      <!-- Main Footer Content -->
      <div class="py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <!-- Company Info -->
            <div class="lg:col-span-1">
              <div class="flex items-center space-x-3 mb-6">
                <img src="/icons/logo-master.png" alt="LMS Maritime" class="w-10 h-10 rounded-lg">
                <span class="text-xl font-bold">LMS Maritime</span>
              </div>
              <p class="text-gray-400 mb-6">
                Nền tảng đào tạo hàng hải hiện đại, tích hợp AI và hoạt động ngoại tuyến.
              </p>
              <p class="text-gray-500 text-xs mb-4">Sản phẩm của <span class="text-gray-400">The Wiii Lab</span></p>
              <div class="flex space-x-4">
                <a href="https://www.youtube.com/@jungjiwiii3327" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors duration-200" aria-label="YouTube">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <a href="https://www.facebook.com/thewiiilab" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors duration-200" aria-label="Facebook">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="https://x.com/HngNguy10342145" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors duration-200" aria-label="X">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="https://www.linkedin.com/in/nguy%E1%BB%85n-h%C3%B9ng-0705083b5/" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors duration-200" aria-label="LinkedIn">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>

            <!-- Quick Links -->
            <div>
              <h3 class="text-lg font-semibold mb-6">Liên kết nhanh</h3>
              <ul class="space-y-3">
                <li><a routerLink="/" class="text-gray-400 hover:text-white">Trang chủ</a></li>
                <li><a routerLink="/courses" class="text-gray-400 hover:text-white">Khóa học</a></li>
                <li><a routerLink="/about" class="text-gray-400 hover:text-white">Giới thiệu</a></li>
                <li><a routerLink="/contact" class="text-gray-400 hover:text-white">Liên hệ</a></li>
              </ul>
            </div>

            <!-- Courses -->
            <div>
              <h3 class="text-lg font-semibold mb-6">Khóa học</h3>
              <ul class="space-y-3">
                <li><a routerLink="/courses" [queryParams]="{category: 'safety'}" class="text-gray-400 hover:text-white">An toàn hàng hải</a></li>
                <li><a routerLink="/courses" [queryParams]="{category: 'navigation'}" class="text-gray-400 hover:text-white">Điều khiển tàu</a></li>
                <li><a routerLink="/courses" [queryParams]="{category: 'engineering'}" class="text-gray-400 hover:text-white">Kỹ thuật máy tàu</a></li>
                <li><a routerLink="/courses" [queryParams]="{category: 'logistics'}" class="text-gray-400 hover:text-white">Logistics hàng hải</a></li>
                <li><a routerLink="/courses" [queryParams]="{category: 'law'}" class="text-gray-400 hover:text-white">Luật hàng hải</a></li>
                <li><a routerLink="/courses" [queryParams]="{category: 'certificates'}" class="text-gray-400 hover:text-white">Chứng chỉ STCW</a></li>
              </ul>
            </div>

            <!-- Organization Links + Language -->
            <div>
              <h3 class="text-lg font-semibold mb-6">Dành cho tổ chức</h3>
              <ul class="space-y-3">
                <li><a routerLink="/contact" [queryParams]="{type: 'enterprise'}" class="text-gray-400 hover:text-white">Đào tạo doanh nghiệp</a></li>
                <li><a routerLink="/contact" [queryParams]="{type: 'consulting'}" class="text-gray-400 hover:text-white">Tư vấn chuyên môn</a></li>
                <li><a routerLink="/contact" [queryParams]="{type: 'partnership'}" class="text-gray-400 hover:text-white">Hợp tác đối tác</a></li>
                <li><a routerLink="/contact" [queryParams]="{type: 'internship'}" class="text-gray-400 hover:text-white">Chương trình thực tập</a></li>
              </ul>

              <!-- Language -->
              <div class="mt-8">
                <p class="text-xs text-gray-500">Ngôn ngữ: Tiếng Việt</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="border-t border-gray-800 py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex flex-col md:flex-row justify-between items-center">
            <div class="text-gray-400 text-sm mb-4 md:mb-0">
              © 2026 The Wiii Lab · LMS Maritime. Tất cả quyền được bảo lưu.
            </div>
            <div class="flex space-x-6 text-sm">
              <a routerLink="/privacy" class="text-gray-400 hover:text-white">Chính sách bảo mật</a>
              <a routerLink="/terms" class="text-gray-400 hover:text-white">Điều khoản sử dụng</a>
              <a routerLink="/refund-policy" class="text-gray-400 hover:text-white">Chính sách hoàn tiền</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {}
