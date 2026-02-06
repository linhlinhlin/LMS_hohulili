// src/app/shared/components/footer/footer.component.ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, signal } from '@angular/core';

import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-footer',
  imports: [RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="bg-gray-900 text-white">
      <!-- Newsletter Section -->
      <div class="bg-blue-600 py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center">
            <h2 class="text-3xl font-bold mb-4">Đăng ký nhận thông tin mới nhất</h2>
            <p class="text-blue-100 mb-8 max-w-2xl mx-auto">
              Cập nhật các khóa học mới, tin tức ngành hàng hải và cơ hội nghề nghiệp
            </p>
            <div class="max-w-md mx-auto flex gap-4">
              <input
                type="email"
                [ngModel]="newsletterEmail()"
                (ngModelChange)="newsletterEmail.set($event)"
                placeholder="Nhập email của bạn"
                class="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              />
              <button
                (click)="subscribeNewsletter()"
                class="px-6 py-3 bg-yellow-400 text-blue-900 font-bold rounded-lg hover:bg-yellow-300 transition-colors duration-200 flex items-center"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                Đăng ký
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Footer Content -->
      <div class="py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <!-- Company Info -->
            <div class="lg:col-span-1">
              <div class="flex items-center space-x-2 mb-6">
                <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <span class="text-xl font-bold">Maritime Academy</span>
              </div>
              <p class="text-gray-400 mb-6">
                Nền tảng đào tạo hàng hải hiện đại, kết nối kiến thức với thực tiễn.
              </p>
              <div class="flex space-x-4">
                <a href="https://twitter.com/maritime_academy" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors duration-200">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a href="https://facebook.com/maritime_academy" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors duration-200">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="https://linkedin.com/company/maritime-academy" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors duration-200">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="https://instagram.com/maritime_academy" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors duration-200">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="m16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
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
                <li><a routerLink="/instructors" class="text-gray-400 hover:text-white">Giảng viên</a></li>
                <li><a routerLink="/news" class="text-gray-400 hover:text-white">Tin tức</a></li>
                <li><a routerLink="/contact" class="text-gray-400 hover:text-white">Liên hệ</a></li>
              </ul>
            </div>

            <!-- Courses -->
            <div>
              <h3 class="text-lg font-semibold mb-6">Khóa học</h3>
              <ul class="space-y-3">
                <li><a routerLink="/courses/safety" class="text-gray-400 hover:text-white">An toàn hàng hải</a></li>
                <li><a routerLink="/courses/navigation" class="text-gray-400 hover:text-white">Điều khiển tàu</a></li>
                <li><a routerLink="/courses/engineering" class="text-gray-400 hover:text-white">Kỹ thuật máy tàu</a></li>
                <li><a routerLink="/courses/logistics" class="text-gray-400 hover:text-white">Logistics hàng hải</a></li>
                <li><a routerLink="/courses/law" class="text-gray-400 hover:text-white">Luật hàng hải</a></li>
                <li><a routerLink="/courses/certificates" class="text-gray-400 hover:text-white">Chứng chỉ STCW</a></li>
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

              <!-- Language Switcher -->
              <div class="mt-8">
                <h4 class="text-sm font-semibold mb-3 text-gray-300">Ngôn ngữ</h4>
                <select
                  [ngModel]="selectedLanguage()"
                  (ngModelChange)="selectedLanguage.set($event)"
                  class="bg-gray-800 text-white border border-gray-800 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="vi">🇻🇳 Tiếng Việt</option>
                  <option value="en">🇺🇸 English</option>
                  <option value="ko">🇰🇷 한국어</option>
                </select>
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
              © 2025 HoLiLiHu Maritime Academy. Tất cả quyền được bảo lưu.
            </div>
            <div class="flex space-x-6 text-sm">
              <a routerLink="/privacy" class="text-gray-400 hover:text-white">Chính sách bảo mật</a>
              <a routerLink="/terms" class="text-gray-400 hover:text-white">Điều khoản sử dụng</a>
              <a routerLink="/privacy" [queryParams]="{section: 'cookies'}" class="text-gray-400 hover:text-white">Cookies</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  newsletterEmail = signal('');
  selectedLanguage = signal<'vi' | 'en' | 'ko'>('vi');

  subscribeNewsletter(): void {
    if (this.newsletterEmail()) {
      alert('Cảm ơn bạn đã đăng ký! Chúng tôi sẽ gửi thông tin mới nhất đến email của bạn.');
      this.newsletterEmail.set('');
    }
  }
}
