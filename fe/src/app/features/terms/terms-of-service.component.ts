import { Component, ChangeDetectionStrategy, ViewEncapsulation, signal, inject, OnInit, OnDestroy, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-terms-of-service',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50 text-gray-900 relative overflow-hidden">
      <!-- Hero Section -->
      <div class="relative py-16 bg-blue-50 border-b border-blue-100 overflow-hidden">
        <!-- Background Elements -->
        <div class="absolute inset-0 z-0 opacity-10">
          <div class="absolute top-0 left-0 w-64 h-64 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full filter blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
          <div class="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full filter blur-3xl opacity-20 translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div class="container mx-auto px-4 relative z-10">
          <div class="max-w-4xl mx-auto text-center">
            <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-gray-900">
              Điều Khoản Sử Dụng
            </h1>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              Hiểu rõ quyền và trách nhiệm của bạn khi tham gia vào hệ thống học tập hàng hải minh bạch và an toàn của chúng tôi
            </p>

            <div class="mt-8 flex flex-wrap justify-center gap-4">
              <div class="flex items-center space-x-2 px-4 py-2 rounded-full bg-gray-100 text-gray-600">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Cập nhật: 15/03/2025</span>
              </div>
              <div class="flex items-center space-x-2 px-4 py-2 rounded-full bg-gray-100 text-gray-600">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Phiên bản: 2.1.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <main class="container mx-auto px-4 py-12 flex flex-col lg:flex-row gap-8">
        <!-- Table of Contents - Sidebar -->
        <aside class="w-full lg:w-1/4 lg:sticky lg:top-24 lg:self-start mb-8 lg:mb-0">
          <div class="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden transition-all duration-300">
            <div class="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 class="text-xl font-bold flex items-center">
                <svg class="h-5 w-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Mục lục
              </h2>
              <button
                (click)="setIsTocVisible(!isTocVisible())"
                class="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Toggle Table of Contents">
                @if (isTocVisible()) {
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                  </svg>
                } @else {
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                }
              </button>
            </div>

            @if (isTocVisible()) {
              <nav class="p-4">
                <ul class="space-y-1">
                  @for (section of sections; track section.id) {
                    <li>
                      <button
                        (click)="scrollToSection(section.id)"
                        [class]="getSectionClass(section.id)"
                        class="w-full text-left px-3 py-2 rounded-lg flex items-center transition-colors">
                        <div [class]="getDotClass(section.id)" class="w-1.5 h-1.5 rounded-full mr-2"></div>
                        {{ section.title }}
                      </button>
                    </li>
                  }
                </ul>
              </nav>
            }

            <div class="p-4 border-t border-gray-200">
              <a routerLink="/privacy" class="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
                <svg class="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
                <span>Xem Chính Sách Bảo Mật</span>
              </a>
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <div class="w-full lg:w-3/4">
          <div class="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden mb-8">
            <div class="p-6 md:p-8">
              <section id="gioi-thieu" class="mb-12">
                <div class="flex items-center mb-4">
                  <div class="mr-4 p-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                    <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h2 class="text-2xl md:text-3xl font-bold">Giới Thiệu</h2>
                </div>

                <div class="ml-16">
                  <p class="text-gray-600 mb-4 leading-relaxed">
                    Chào mừng bạn đến với nền tảng LMS Maritime - một hệ thống học tập hiện đại
                    chuyên về lĩnh vực hàng hải, được thiết kế để đảm bảo tính minh bạch, bảo mật
                    và hiệu quả trong việc đào tạo và học tập.
                  </p>

                  <p class="text-gray-600 mb-4 leading-relaxed">
                    Điều khoản sử dụng này ("Điều Khoản") quy định các điều kiện và điều khoản chi
                    phối việc sử dụng nền tảng LMS Maritime của chúng tôi, bao gồm tất cả các
                    tính năng, chức năng và dịch vụ liên quan (gọi chung là "Nền Tảng"). Bằng
                    việc truy cập hoặc sử dụng Nền Tảng, bạn đồng ý bị ràng buộc bởi các Điều Khoản
                    này.
                  </p>

                  <div class="p-4 rounded-lg bg-blue-50 flex items-start space-x-3 mb-4">
                    <svg class="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <p class="text-sm text-gray-700">
                      Vui lòng đọc kỹ các Điều Khoản này trước khi sử dụng Nền Tảng. Nếu bạn không
                      đồng ý với bất kỳ phần nào của Điều Khoản, vui lòng không sử dụng Nền Tảng.
                    </p>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div class="p-4 rounded-lg border border-gray-200 bg-white">
                      <svg class="h-8 w-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                      </svg>
                      <h3 class="font-semibold mb-2">Bảo Mật Tuyệt Đối</h3>
                      <p class="text-sm text-gray-600">
                        Dữ liệu được mã hóa và lưu trữ an toàn trên hệ thống
                      </p>
                    </div>
                    <div class="p-4 rounded-lg border border-gray-200 bg-white">
                      <svg class="h-8 w-8 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                      </svg>
                      <h3 class="font-semibold mb-2">Minh Bạch Hoàn Toàn</h3>
                      <p class="text-sm text-gray-600">
                        Mọi hoạt động học tập đều được ghi lại và có thể kiểm chứng
                      </p>
                    </div>
                    <div class="p-4 rounded-lg border border-gray-200 bg-white">
                      <svg class="h-8 w-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      </svg>
                      <h3 class="font-semibold mb-2">Không Thể Thay Đổi</h3>
                      <p class="text-sm text-gray-600">
                        Dữ liệu một khi đã được ghi vào hệ thống không thể bị sửa đổi
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section id="chap-nhan-dieu-khoan" class="mb-12">
                <div class="flex items-center mb-4">
                  <div class="mr-4 p-3 rounded-full bg-gradient-to-br from-green-500 to-teal-600">
                    <svg class="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <h2 class="text-2xl md:text-3xl font-bold">Chấp Nhận Điều Khoản</h2>
                </div>

                <div class="ml-16">
                  <p class="text-gray-600 mb-4 leading-relaxed">
                    Bằng việc truy cập hoặc sử dụng Nền Tảng, bạn xác nhận rằng bạn đã đọc, hiểu và
                    đồng ý bị ràng buộc bởi các Điều Khoản này. Nếu bạn không đồng ý với bất kỳ phần
                    nào của Điều Khoản, vui lòng không sử dụng Nền Tảng.
                  </p>

                  <h3 class="text-xl font-semibold mb-3">Điều Kiện Sử Dụng</h3>
                  <ul class="list-disc pl-5 space-y-2 mb-4">
                    <li class="text-gray-600">
                      <span class="font-medium">Độ tuổi:</span> Bạn phải từ 16 tuổi trở lên để sử dụng nền tảng học tập.
                    </li>
                    <li class="text-gray-600">
                      <span class="font-medium">Năng lực pháp lý:</span> Bạn phải có đầy đủ năng
                      lực pháp lý để tham gia vào một thỏa thuận ràng buộc pháp lý.
                    </li>
                    <li class="text-gray-600">
                      <span class="font-medium">Tuân thủ pháp luật:</span> Bạn đồng ý sử dụng
                      Nền Tảng tuân theo tất cả các luật và quy định hiện hành.
                    </li>
                  </ul>

                  <div class="p-4 rounded-lg bg-gray-50 border-l-4 border-blue-600 mb-4">
                    <h4 class="font-semibold mb-2">Lưu ý quan trọng</h4>
                    <p class="text-sm text-gray-700">
                      Chúng tôi có quyền thay đổi, sửa đổi, bổ sung hoặc xóa bỏ các phần của Điều
                      Khoản này vào bất kỳ lúc nào. Những thay đổi sẽ có hiệu lực ngay khi được đăng
                      tải trên Nền Tảng. Việc bạn tiếp tục sử dụng Nền Tảng sau khi các thay đổi
                      được đăng tải đồng nghĩa với việc bạn chấp nhận những thay đổi đó.
                    </p>
                  </div>

                  <div class="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                    <div class="flex items-center">
                      <svg class="h-10 w-10 text-white mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                      </svg>
                      <div>
                        <h3 class="text-white font-bold">Cam Kết Bảo Mật</h3>
                        <p class="text-white text-opacity-90 text-sm">
                          Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn
                        </p>
                      </div>
                    </div>
                    <a
                      routerLink="/privacy"
                      class="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                      Tìm hiểu thêm
                    </a>
                  </div>
                </div>
              </section>

              <section id="muc-dich-su-dung" class="mb-12">
                <div class="flex items-center mb-4">
                  <div class="mr-4 p-3 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600">
                    <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                  </div>
                  <h2 class="text-2xl md:text-3xl font-bold">Mục Đích Sử Dụng</h2>
                </div>

                <div class="ml-16">
                  <p class="text-gray-600 mb-4 leading-relaxed">
                    Nền Tảng của chúng tôi được thiết kế để cung cấp một hệ thống học tập minh bạch,
                    an toàn và đáng tin cậy chuyên về lĩnh vực hàng hải. Mục đích sử dụng của Nền
                    Tảng bao gồm:
                  </p>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div class="p-4 rounded-lg border border-gray-200 bg-white">
                      <h3 class="font-semibold mb-2 flex items-center">
                        <span class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2">
                          1
                        </span>
                        Đào Tạo Hàng Hải
                      </h3>
                      <p class="text-sm text-gray-600">
                        Cung cấp các khóa học chuyên sâu về hàng hải, an toàn biển, điều khiển tàu và các chứng chỉ chuyên môn.
                      </p>
                    </div>
                    <div class="p-4 rounded-lg border border-gray-200 bg-white">
                      <h3 class="font-semibold mb-2 flex items-center">
                        <span class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2">
                          2
                        </span>
                        Học Tập Tương Tác
                      </h3>
                      <p class="text-sm text-gray-600">
                        Cho phép học viên tham gia học tập một cách tương tác, làm bài tập và kiểm tra trực tuyến.
                      </p>
                    </div>
                    <div class="p-4 rounded-lg border border-gray-200 bg-white">
                      <h3 class="font-semibold mb-2 flex items-center">
                        <span class="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-2">
                          3
                        </span>
                        Quản Lý Tiến Độ
                      </h3>
                      <p class="text-sm text-gray-600">
                        Theo dõi và đánh giá tiến độ học tập của học viên một cách chính xác và minh bạch.
                      </p>
                    </div>
                    <div class="p-4 rounded-lg border border-gray-200 bg-white">
                      <h3 class="font-semibold mb-2 flex items-center">
                        <span class="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-2">
                          4
                        </span>
                        Cấp Chứng Chỉ
                      </h3>
                      <p class="text-sm text-gray-600">
                        Cấp phát các chứng chỉ chuyên môn hàng hải được công nhận và có giá trị pháp lý.
                      </p>
                    </div>
                  </div>

                  <h3 class="text-xl font-semibold mb-3">Đối Tượng Sử Dụng</h3>
                  <ul class="list-disc pl-5 space-y-2 mb-4">
                    <li class="text-gray-600">
                      <span class="font-medium">Học viên:</span> Cá nhân tham gia các khóa học hàng hải trên Nền Tảng.
                    </li>
                    <li class="text-gray-600">
                      <span class="font-medium">Giảng viên:</span> Cá nhân hoặc tổ chức tạo và quản lý các khóa học.
                    </li>
                    <li class="text-gray-600">
                      <span class="font-medium">Quản trị viên:</span> Cá nhân hoặc tổ chức được
                      ủy quyền để quản lý hệ thống và giám sát hoạt động.
                    </li>
                    <li class="text-gray-600">
                      <span class="font-medium">Doanh nghiệp:</span> Các công ty hàng hải sử dụng
                      nền tảng để đào tạo nhân viên.
                    </li>
                  </ul>

                  <div class="p-4 rounded-lg bg-amber-50 border-l-4 border-amber-500 mb-4">
                    <h4 class="font-semibold mb-2 flex items-center">
                      <svg class="h-5 w-5 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>
                      Hạn chế sử dụng
                    </h4>
                    <p class="text-sm text-gray-700">
                      Nền Tảng không được sử dụng cho các mục đích bất hợp pháp, gian lận, hoặc bất
                      kỳ hoạt động nào vi phạm pháp luật hiện hành. Chúng tôi có quyền từ chối dịch
                      vụ đối với bất kỳ người dùng nào vi phạm các điều khoản này.
                    </p>
                  </div>
                </div>
              </section>

              <section id="lien-he" class="mb-12">
                <div class="flex items-center mb-4">
                  <div class="mr-4 p-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                    <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h2 class="text-2xl md:text-3xl font-bold">Liên Hệ</h2>
                </div>

                <div class="ml-16">
                  <p class="text-gray-600 mb-4 leading-relaxed">
                    Nếu bạn có bất kỳ câu hỏi, thắc mắc hoặc phản hồi nào về các Điều Khoản này hoặc
                    Nền Tảng, vui lòng liên hệ với chúng tôi qua:
                  </p>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div class="p-4 rounded-lg border border-gray-200 bg-white flex items-start space-x-3">
                      <div class="p-2 rounded-full bg-blue-50">
                        <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                      <div>
                        <h3 class="font-semibold mb-1">Email</h3>
                        <a href="mailto:contact@lms-maritime.vn" class="text-blue-600 hover:text-blue-700">
                          contact@lms-maritime.vn
                        </a>
                      </div>
                    </div>
                    <div class="p-4 rounded-lg border border-gray-200 bg-white flex items-start space-x-3">
                      <div class="p-2 rounded-full bg-blue-50">
                        <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                        </svg>
                      </div>
                      <div>
                        <h3 class="font-semibold mb-1">Điện Thoại</h3>
                        <a href="tel:+84123456789" class="text-blue-600 hover:text-blue-700">
                          +84 123 456 789
                        </a>
                      </div>
                    </div>
                    <div class="p-4 rounded-lg border border-gray-200 bg-white flex items-start space-x-3">
                      <div class="p-2 rounded-full bg-blue-50">
                        <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                      </div>
                      <div>
                        <h3 class="font-semibold mb-1">Địa Chỉ</h3>
                        <p class="text-gray-600">
                          484 Lạch Tray, Kênh Dương, Lê Chân, Hải Phòng, Việt Nam
                        </p>
                      </div>
                    </div>
                    <div class="p-4 rounded-lg border border-gray-200 bg-white flex items-start space-x-3">
                      <div class="p-2 rounded-full bg-blue-50">
                        <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      <div>
                        <h3 class="font-semibold mb-1">Hỗ Trợ</h3>
                        <a routerLink="/contact" class="text-blue-600 hover:text-blue-700">
                          Gửi yêu cầu hỗ trợ
                        </a>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col md:flex-row items-center justify-between p-6 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                    <div class="mb-4 md:mb-0 text-center md:text-left">
                      <h3 class="text-white font-bold text-xl mb-2">Còn Thắc Mắc?</h3>
                      <p class="text-white text-opacity-90">
                        Chúng tôi luôn sẵn sàng giải đáp mọi thắc mắc của bạn
                      </p>
                    </div>
                    <a
                      routerLink="/contact"
                      class="px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors shadow-lg">
                      Liên Hệ Ngay
                    </a>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <!-- Footer -->
          <footer class="text-center mb-8">
            <p class="text-gray-600">Cập nhật lần cuối: 15/03/2025 | Phiên bản: 2.1.0</p>
            <div class="flex justify-center mt-4 space-x-4">
              <a routerLink="/" class="text-blue-600 hover:text-blue-700">
                Trang Chủ
              </a>
              <span class="text-gray-600">•</span>
              <a routerLink="/privacy" class="text-blue-600 hover:text-blue-700">
                Chính Sách Bảo Mật
              </a>
              <span class="text-gray-600">•</span>
              <a routerLink="/contact" class="text-blue-600 hover:text-blue-700">
                Liên Hệ
              </a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  `,
})
export class TermsOfServiceComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  // Signals
  isTocVisible = signal(true);
  activeSection = signal('');
  showBackToTop = signal(false);
  
  // Sections for the table of contents
  sections = [
    { id: 'gioi-thieu', title: 'Giới Thiệu' },
    { id: 'chap-nhan-dieu-khoan', title: 'Chấp Nhận Điều Khoản' },
    { id: 'muc-dich-su-dung', title: 'Mục Đích Sử Dụng' },
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
      ? 'bg-blue-50 text-blue-600'
      : 'hover:bg-gray-100 text-gray-700';
  }

  getDotClass(sectionId: string): string {
    return this.activeSection() === sectionId
      ? 'bg-blue-600'
      : 'bg-gray-300';
  }

  setIsTocVisible(value: boolean): void {
    this.isTocVisible.set(value);
  }
}