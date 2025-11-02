import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-learning',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <!-- Learning Header -->
      <div class="bg-white shadow-xl border-b border-gray-800">
        <div class="max-w-7xl mx-auto px-6 py-6">
          <div class="flex items-center space-x-4">
            <div class="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
              <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Học tập: Giới thiệu về Hàng hải</h1>
              <p class="text-lg text-gray-600">Tiếp tục hành trình khám phá biển cả</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Learning Content -->
      <div class="max-w-7xl mx-auto px-6 py-8">
        <div class="grid grid-cols-12 gap-6">
          <!-- Main Content (8 columns) -->
          <div class="col-span-12 xl:col-span-8 space-y-6">
            <!-- Video Player -->
            <div class="bg-white rounded-xl shadow-lg overflow-hidden">
              <div class="bg-gray-900 aspect-video flex items-center justify-center relative">
                <div class="text-center text-white">
                  <svg class="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"></path>
                  </svg>
                  <p class="text-lg font-semibold">Video Player</p>
                  <p class="text-sm text-gray-400">Bài 1: An toàn Hàng hải Cơ bản</p>
                </div>
                <!-- Play Button -->
                <button class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-40 transition-all duration-200">
                  <div class="w-20 h-20 bg-white bg-opacity-90 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all duration-200">
                    <svg class="w-8 h-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path>
                    </svg>
                  </div>
                </button>
              </div>
              
              <!-- Video Controls -->
              <div class="p-4 bg-gray-50 border-t border-gray-800">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-4">
                    <button class="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                      </svg>
                      <span class="text-sm">Tua lại 10s</span>
                    </button>
                    <button class="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                      </svg>
                      <span class="text-sm">Tua tới 10s</span>
                    </button>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-600">1.5x</span>
                    <button class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Course Progress -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900">Tiến độ khóa học</h3>
                <span class="text-sm font-medium text-blue-600">75%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div class="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500" style="width: 75%"></div>
              </div>
              <div class="flex justify-between text-sm text-gray-600">
                <span>Bài 3/4</span>
                <span>15 phút còn lại</span>
              </div>
            </div>

            <!-- Lesson Content -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-4">Bài 1: An toàn Hàng hải Cơ bản</h3>
              <div class="prose max-w-none">
                <p class="text-gray-700 mb-4">
                  Trong bài học này, chúng ta sẽ tìm hiểu về các quy tắc an toàn cơ bản trong hàng hải, 
                  bao gồm các quy định quốc tế và các biện pháp phòng ngừa tai nạn.
                </p>
                <h4 class="text-lg font-semibold text-gray-900 mb-2">Nội dung chính:</h4>
                <ul class="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Quy tắc COLREG (Convention on the International Regulations for Preventing Collisions at Sea)</li>
                  <li>Hệ thống phân luồng giao thông hàng hải</li>
                  <li>Thiết bị an toàn trên tàu</li>
                  <li>Quy trình xử lý tình huống khẩn cấp</li>
                </ul>
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div class="flex items-start">
                    <svg class="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                    <div>
                      <h5 class="font-semibold text-blue-900 mb-1">Lưu ý quan trọng</h5>
                      <p class="text-blue-800 text-sm">Hãy ghi chú lại những điểm quan trọng để tham khảo sau này.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Navigation -->
            <div class="flex justify-between">
              <button class="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                <span>Bài trước</span>
              </button>
              <button class="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <span>Bài tiếp theo</span>
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Right Sidebar (4 columns) -->
          <div class="col-span-12 xl:col-span-4 space-y-6">
            <!-- Course Outline -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Nội dung khóa học</h3>
              <div class="space-y-3">
                <div class="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-medium text-gray-900">Bài 1: An toàn Hàng hải Cơ bản</h4>
                    <p class="text-sm text-gray-600">Đang học • 15 phút</p>
                  </div>
                </div>

                <div class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span class="text-sm font-medium text-gray-600">2</span>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-medium text-gray-900">Bài 2: Quy tắc COLREG</h4>
                    <p class="text-sm text-gray-600">Chưa mở khóa • 20 phút</p>
                  </div>
                </div>

                <div class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span class="text-sm font-medium text-gray-600">3</span>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-medium text-gray-900">Bài 3: Thiết bị An toàn</h4>
                    <p class="text-sm text-gray-600">Chưa mở khóa • 18 phút</p>
                  </div>
                </div>

                <div class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span class="text-sm font-medium text-gray-600">4</span>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-medium text-gray-900">Bài 4: Xử lý Tình huống Khẩn cấp</h4>
                    <p class="text-sm text-gray-600">Chưa mở khóa • 25 phút</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Resources -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Tài liệu tham khảo</h3>
              <div class="space-y-3">
                <a href="#" class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-medium text-gray-900">COLREG 1972.pdf</h4>
                    <p class="text-sm text-gray-600">2.4 MB</p>
                  </div>
                </a>

                <a href="#" class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-medium text-gray-900">Hướng dẫn An toàn.pdf</h4>
                    <p class="text-sm text-gray-600">1.8 MB</p>
                  </div>
                </a>

                <a href="#" class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-medium text-gray-900">Checklist An toàn.xlsx</h4>
                    <p class="text-sm text-gray-600">856 KB</p>
                  </div>
                </a>
              </div>
            </div>

            <!-- Quiz Section -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Kiểm tra kiến thức</h3>
              <div class="space-y-4">
                <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div class="flex items-center space-x-2 mb-2">
                    <svg class="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="font-medium text-yellow-800">Quiz sẵn sàng</span>
                  </div>
                  <p class="text-sm text-yellow-700 mb-3">Hoàn thành bài học để mở khóa quiz</p>
                  <button class="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium">
                    Làm Quiz
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LearningComponent {
}
