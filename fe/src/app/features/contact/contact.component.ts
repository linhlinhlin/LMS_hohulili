import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Hero Section -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div class="container mx-auto px-4 text-center">
          <h1 class="text-4xl md:text-6xl font-bold mb-6">Liên hệ với chúng tôi</h1>
          <p class="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            Chúng tôi luôn sẵn sàng hỗ trợ và giải đáp mọi thắc mắc của bạn
          </p>
        </div>
      </div>

      <div class="py-16">
        <div class="container mx-auto px-4">
          <div class="grid lg:grid-cols-2 gap-12">
            <!-- Contact Form -->
            <div class="bg-white rounded-lg shadow-lg p-8">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Gửi tin nhắn</h2>
              
              <form (ngSubmit)="onSubmit()" #contactForm="ngForm" class="space-y-6">
                <div>
                  <label for="name" class="block text-sm font-medium text-gray-700 mb-2">Họ và tên *</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name"
                    [(ngModel)]="formData.name"
                    required
                    class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập họ và tên của bạn">
                </div>

                <div>
                  <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email"
                    [(ngModel)]="formData.email"
                    required
                    email
                    class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập email của bạn">
                </div>

                <div>
                  <label for="phone" class="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                  <input 
                    type="tel" 
                    id="phone" 
                    name="phone"
                    [(ngModel)]="formData.phone"
                    class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập số điện thoại của bạn">
                </div>

                <div>
                  <label for="subject" class="block text-sm font-medium text-gray-700 mb-2">Chủ đề *</label>
                  <select 
                    id="subject" 
                    name="subject"
                    [(ngModel)]="formData.subject"
                    required
                    class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Chọn chủ đề</option>
                    <option value="general">Thông tin chung</option>
                    <option value="technical">Hỗ trợ kỹ thuật</option>
                    <option value="course">Về khóa học</option>
                    <option value="billing">Thanh toán</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div>
                  <label for="message" class="block text-sm font-medium text-gray-700 mb-2">Nội dung tin nhắn *</label>
                  <textarea 
                    id="message" 
                    name="message"
                    [(ngModel)]="formData.message"
                    required
                    rows="5"
                    class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập nội dung tin nhắn của bạn"></textarea>
                </div>

                <div class="flex items-center">
                  <input 
                    type="checkbox" 
                    id="agree"
                    name="agree"
                    [(ngModel)]="formData.agree"
                    required
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-800 rounded">
                  <label for="agree" class="ml-2 block text-sm text-gray-700">
                    Tôi đồng ý với <a href="#" class="text-blue-600 hover:underline">chính sách bảo mật</a> và 
                    <a href="#" class="text-blue-600 hover:underline">điều khoản sử dụng</a>
                  </label>
                </div>

                @if (isSubmitting()) {
                  <div class="flex items-center justify-center py-4">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span class="ml-2 text-gray-600">Đang gửi tin nhắn...</span>
                  </div>
                } @else {
                  <button 
                    type="submit"
                    [disabled]="!contactForm.form.valid || !formData.agree"
                    class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                    Gửi tin nhắn
                  </button>
                }

                @if (submitMessage()) {
                  <div class="mt-4 p-4 rounded-lg" [class]="isSuccess() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                    {{ submitMessage() }}
                  </div>
                }
              </form>
            </div>

            <!-- Contact Information -->
            <div class="space-y-8">
              <div class="bg-white rounded-lg shadow-lg p-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">Thông tin liên hệ</h2>
                
                <div class="space-y-6">
                  <div class="flex items-start">
                    <div class="bg-blue-100 p-3 rounded-lg mr-4">
                      <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-semibold text-gray-900">Địa chỉ</h3>
                      <p class="text-gray-600">123 Đường ABC, Quận XYZ<br>Thành phố Hồ Chí Minh, Việt Nam</p>
                    </div>
                  </div>

                  <div class="flex items-start">
                    <div class="bg-green-100 p-3 rounded-lg mr-4">
                      <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-semibold text-gray-900">Điện thoại</h3>
                      <p class="text-gray-600">+84 123 456 789<br>+84 987 654 321</p>
                    </div>
                  </div>

                  <div class="flex items-start">
                    <div class="bg-purple-100 p-3 rounded-lg mr-4">
                      <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-semibold text-gray-900">Email</h3>
                      <p class="text-gray-600">info@lmsmaritime.com<br>support@lmsmaritime.com</p>
                    </div>
                  </div>

                  <div class="flex items-start">
                    <div class="bg-orange-100 p-3 rounded-lg mr-4">
                      <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-semibold text-gray-900">Giờ làm việc</h3>
                      <p class="text-gray-600">Thứ 2 - Thứ 6: 8:00 - 17:00<br>Thứ 7: 8:00 - 12:00</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Social Media -->
              <div class="bg-white rounded-lg shadow-lg p-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">Theo dõi chúng tôi</h2>
                <div class="flex space-x-4">
                  <a href="#" class="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                    </svg>
                  </a>
                  <a href="#" class="bg-blue-800 text-white p-3 rounded-lg hover:bg-blue-900 transition-colors">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a href="#" class="bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transition-colors">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ContactComponent {
  isSubmitting = signal(false);
  submitMessage = signal('');
  isSuccess = signal(false);

  formData = {
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    agree: false
  };

  onSubmit(): void {
    if (this.formData.agree) {
      this.isSubmitting.set(true);
      
      // Simulate form submission
      setTimeout(() => {
        this.isSubmitting.set(false);
        this.isSuccess.set(true);
        this.submitMessage.set('Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi trong vòng 24 giờ.');
        
        // Reset form
        this.formData = {
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
          agree: false
        };
      }, 2000);
    } else {
      this.isSuccess.set(false);
      this.submitMessage.set('Vui lòng đồng ý với chính sách bảo mật và điều khoản sử dụng.');
    }
  }
}
