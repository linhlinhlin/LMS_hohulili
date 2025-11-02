import { Component, ChangeDetectionStrategy, ViewEncapsulation, signal, inject, OnInit, OnDestroy, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-privacy-policy',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50 text-gray-900 relative overflow-hidden">
      <!-- Hero Section -->
      <section class="relative h-[50vh] md:h-[60vh] flex items-center justify-center overflow-hidden">
        <div class="absolute inset-0 z-0">
          <div class="absolute inset-0 bg-gradient-to-b from-blue-50/80 to-gray-50"></div>
        </div>

        <div class="relative z-10 text-center px-4">
          <div class="mb-6 inline-block">
            <div class="relative">
              <div class="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 blur-xl opacity-30"></div>
              <div class="relative w-24 h-24 mx-auto rounded-full bg-white flex items-center justify-center border border-blue-200 shadow-lg">
                <svg class="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              </div>
            </div>
          </div>

          <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 relative">
            Chính Sách Bảo Mật
            <div class="absolute inset-0 blur-xl bg-gradient-to-r from-blue-600 to-blue-800 opacity-20 -z-10 scale-110"></div>
          </h1>

          <p class="max-w-2xl mx-auto text-lg text-gray-600">
            Bảo vệ dữ liệu cá nhân và đảm bảo tính minh bạch là ưu tiên hàng đầu của chúng tôi
          </p>

          <div class="mt-8">
            <button
              (click)="scrollToSection('gioi-thieu')"
              class="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full font-medium hover:shadow-lg hover:shadow-blue-100 transition-all duration-300 transform hover:scale-105">
              Tìm Hiểu Thêm
            </button>
          </div>
        </div>
      </section>

      <!-- Main Content -->
      <main class="container mx-auto px-4 py-12 relative z-10">
        <div class="flex flex-col lg:flex-row gap-8">
          <!-- Sidebar - Table of Contents -->
          <aside class="w-full lg:w-1/4 lg:sticky lg:top-24 lg:self-start mb-8 lg:mb-0">
            <div class="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div class="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 class="text-xl font-bold flex items-center">
                  <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Mục Lục
                </h2>
                <button
                  (click)="setIsTocVisible(!isTocVisible())"
                  class="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Toggle table of contents">
                  @if (isTocVisible()) {
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                    </svg>
                  } @else {
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  }
                </button>
              </div>

              @if (isTocVisible()) {
                <nav class="p-4">
                  <ul class="space-y-3">
                    @for (section of sections; track section.id) {
                      <li>
                        <button
                          (click)="scrollToSection(section.id)"
                          [class]="getSectionClass(section.id)"
                          class="w-full text-left px-3 py-2 rounded-lg flex items-center transition-colors">
                          <span class="mr-3 text-blue-500">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                          </span>
                          <span>{{ section.title }}</span>
                        </button>
                      </li>
                    }
                  </ul>
                </nav>
              }

              <div class="p-4 border-t border-gray-200">
                <a routerLink="/" class="flex items-center text-blue-600 hover:text-blue-700 transition-colors">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                  </svg>
                  <span>Quay Lại Trang Chủ</span>
                </a>
              </div>
            </div>

            <!-- Last Updated Info -->
            <div class="mt-6 bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
              <div class="flex items-center text-sm">
                <svg class="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-gray-600">Cập nhật lần cuối: 01/03/2025</span>
              </div>
            </div>
          </aside>

          <!-- Main Content -->
          <div class="w-full lg:w-3/4 space-y-12">
            <!-- Introduction Section -->
            <section
              id="gioi-thieu"
              class="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-lg">
              <div class="flex items-center mb-6">
                <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <h2 class="text-2xl md:text-3xl font-bold">Giới Thiệu</h2>
              </div>

              <div class="space-y-4">
                <p>
                  Chào mừng bạn đến với nền tảng LMS Maritime của chúng tôi. Tại LMS Maritime Academy, 
                  chúng tôi cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của bạn với tiêu chuẩn cao nhất. 
                  Chính sách Bảo mật này mô tả cách chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ thông tin 
                  của bạn khi bạn sử dụng nền tảng của chúng tôi.
                </p>

                <div class="bg-blue-50 border-l-4 border-blue-200 p-4 rounded-r-lg">
                  <p class="font-medium flex items-center">
                    <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    Quan trọng:
                  </p>
                  <p class="mt-1 text-gray-600">
                    Bằng cách sử dụng nền tảng của chúng tôi, bạn đồng ý với các điều khoản của
                    Chính sách Bảo mật này. Nếu bạn không đồng ý với chính sách này, vui lòng không
                    sử dụng dịch vụ của chúng tôi.
                  </p>
                </div>

                <p>
                  Chính sách này áp dụng cho tất cả người dùng của nền tảng, bao gồm học viên, giảng viên, 
                  quản trị viên và khách truy cập. Chúng tôi cam kết duy trì tính minh bạch trong cách chúng tôi 
                  xử lý dữ liệu của bạn, đồng thời đảm bảo rằng bạn luôn có quyền kiểm soát thông tin cá nhân của mình.
                </p>

                <div class="flex items-center mt-6">
                  <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <p class="italic">Ngày có hiệu lực: 01/03/2025</p>
                </div>
              </div>
            </section>

            <!-- Information Collection Section -->
            <section
              id="thong-tin-thu-thap"
              class="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-lg">
              <div class="flex items-center mb-6">
                <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
                  </svg>
                </div>
                <h2 class="text-2xl md:text-3xl font-bold">Thông Tin Thu Thập</h2>
              </div>

              <div class="space-y-6">
                <div>
                  <h3 class="text-xl font-semibold mb-3">Thông Tin Cá Nhân</h3>
                  <p class="mb-4">
                    Chúng tôi thu thập các thông tin cá nhân sau đây từ người dùng:
                  </p>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="p-4 rounded-lg border border-gray-200 bg-gray-50">
                      <div class="flex items-start">
                        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-1">
                          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                          </svg>
                        </div>
                        <div>
                          <h4 class="font-medium">Thông Tin Nhận Dạng</h4>
                          <ul class="mt-2 space-y-1 text-gray-600 text-sm">
                            <li>• Họ và tên</li>
                            <li>• Ngày sinh</li>
                            <li>• Số CMND/CCCD</li>
                            <li>• Ảnh đại diện (nếu cung cấp)</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div class="p-4 rounded-lg border border-gray-200 bg-gray-50">
                      <div class="flex items-start">
                        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-1">
                          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                          </svg>
                        </div>
                        <div>
                          <h4 class="font-medium">Thông Tin Liên Hệ</h4>
                          <ul class="mt-2 space-y-1 text-gray-600 text-sm">
                            <li>• Địa chỉ email</li>
                            <li>• Số điện thoại</li>
                            <li>• Địa chỉ thường trú</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div class="p-4 rounded-lg border border-gray-200 bg-gray-50">
                      <div class="flex items-start">
                        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-1">
                          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                          </svg>
                        </div>
                        <div>
                          <h4 class="font-medium">Thông Tin Tài Khoản</h4>
                          <ul class="mt-2 space-y-1 text-gray-600 text-sm">
                            <li>• Tên đăng nhập</li>
                            <li>• Mật khẩu (được mã hóa)</li>
                            <li>• Mã số học viên</li>
                            <li>• Thông tin học tập</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div class="p-4 rounded-lg border border-gray-200 bg-gray-50">
                      <div class="flex items-start">
                        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-1">
                          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"></path>
                          </svg>
                        </div>
                        <div>
                          <h4 class="font-medium">Dữ Liệu Kỹ Thuật</h4>
                          <ul class="mt-2 space-y-1 text-gray-600 text-sm">
                            <li>• Địa chỉ IP</li>
                            <li>• Loại thiết bị và trình duyệt</li>
                            <li>• Thông tin đăng nhập</li>
                            <li>• Dữ liệu cookie</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 class="text-xl font-semibold mb-3">Dữ Liệu Học Tập</h3>
                  <p class="mb-4">
                    Khi tham gia học tập trên nền tảng của chúng tôi, chúng tôi thu thập các dữ liệu sau:
                  </p>

                  <ul class="space-y-2">
                    <li class="flex items-start">
                      <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-1">
                        <svg class="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                      </div>
                      <span>Tiến độ học tập và điểm số</span>
                    </li>
                    <li class="flex items-start">
                      <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-1">
                        <svg class="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                      </div>
                      <span>Thời gian học và tương tác với nội dung</span>
                    </li>
                    <li class="flex items-start">
                      <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-1">
                        <svg class="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                      </div>
                      <span>Bài tập và bài kiểm tra</span>
                    </li>
                  </ul>

                  <div class="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p class="font-medium flex items-center">
                      <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      </svg>
                      Bảo mật dữ liệu học tập:
                    </p>
                    <p class="mt-1 text-gray-600">
                      Dữ liệu học tập của bạn được mã hóa và chỉ được sử dụng để cải thiện trải nghiệm học tập 
                      và đánh giá tiến độ của bạn. Chúng tôi không chia sẻ thông tin này với bên thứ ba mà không có sự đồng ý của bạn.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <!-- Contact Section -->
            <section
              id="lien-he"
              class="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-lg">
              <div class="flex items-center mb-6">
                <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <h2 class="text-2xl md:text-3xl font-bold">Liên Hệ</h2>
              </div>

              <div class="space-y-4">
                <p>
                  Nếu bạn có bất kỳ câu hỏi, thắc mắc hoặc yêu cầu nào liên quan đến Chính sách Bảo
                  mật này hoặc cách chúng tôi xử lý dữ liệu cá nhân của bạn, vui lòng liên hệ với
                  chúng tôi:
                </p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div class="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
                    <h3 class="text-lg font-semibold mb-4 flex items-center">
                      <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                      </svg>
                      Email
                    </h3>
                    <p class="mb-2">
                      <span class="font-medium">Chung:</span>
                      <a href="mailto:contact@lms-maritime.vn" class="text-blue-600 hover:text-blue-700">
                        contact@lms-maritime.vn
                      </a>
                    </p>
                    <p class="mb-2">
                      <span class="font-medium">Bảo mật dữ liệu:</span>
                      <a href="mailto:privacy@lms-maritime.vn" class="text-blue-600 hover:text-blue-700">
                        privacy@lms-maritime.vn
                      </a>
                    </p>
                    <p>
                      <span class="font-medium">Hỗ trợ kỹ thuật:</span>
                      <a href="mailto:support@lms-maritime.vn" class="text-blue-600 hover:text-blue-700">
                        support@lms-maritime.vn
                      </a>
                    </p>
                  </div>

                  <div class="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
                    <h3 class="text-lg font-semibold mb-4 flex items-center">
                      <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                      Địa Chỉ
                    </h3>
                    <p class="mb-2">
                      <span class="font-medium">Trụ sở chính:</span> 484 Lạch Tray, Kênh Dương,
                      Lê Chân, Hải Phòng, Việt Nam
                    </p>
                    <p>
                      <span class="font-medium">Điện thoại:</span> +84 123 456 789
                    </p>
                  </div>
                </div>

                <div class="mt-6 flex flex-col sm:flex-row gap-4">
                  <a
                    routerLink="/contact"
                    class="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full font-medium hover:shadow-lg hover:shadow-blue-100 transition-all duration-300 transform hover:scale-105 flex items-center justify-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                    Liên Hệ Ngay
                  </a>

                  <a
                    routerLink="/terms"
                    class="px-6 py-3 border border-gray-300 rounded-full font-medium hover:bg-blue-50 transition-all duration-300 flex items-center justify-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    Điều Khoản Sử Dụng
                  </a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="mt-16 py-8 border-t border-gray-200 bg-gray-50">
        <div class="container mx-auto px-4 text-center">
          <p class="text-gray-600">
            © 2025 LMS Maritime Academy. Bảo lưu mọi quyền.
          </p>
          <div class="flex justify-center space-x-4 mt-4">
            <a routerLink="/" class="text-blue-600 hover:text-blue-700">
              Trang Chủ
            </a>
            <a routerLink="/terms" class="text-blue-600 hover:text-blue-700">
              Điều Khoản Sử Dụng
            </a>
            <a routerLink="/contact" class="text-blue-600 hover:text-blue-700">
              Liên Hệ
            </a>
          </div>
        </div>
      </footer>
    </div>
  `,
})
export class PrivacyPolicyComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  // Signals
  isTocVisible = signal(true);
  activeSection = signal('');
  showBackToTop = signal(false);
  
  // Sections for the privacy policy
  sections = [
    { id: 'gioi-thieu', title: 'Giới Thiệu' },
    { id: 'thong-tin-thu-thap', title: 'Thông Tin Thu Thập' },
    { id: 'lien-he', title: 'Liên Hệ' },
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.updateActiveSection();
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.updateActiveSection();
      this.showBackToTop.set(window.scrollY > 300);
    }
  }

  private updateActiveSection(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    let currentSection = '';
    this.sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          currentSection = id;
        }
      }
    });
    this.activeSection.set(currentSection);
  }

  scrollToSection(id: string): void {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100,
        behavior: 'smooth',
      });
    }
  }

  getSectionClass(sectionId: string): string {
    return this.activeSection() === sectionId
      ? 'bg-blue-50 text-blue-700'
      : 'hover:bg-gray-100 text-gray-700';
  }

  setIsTocVisible(value: boolean): void {
    this.isTocVisible.set(value);
  }
}