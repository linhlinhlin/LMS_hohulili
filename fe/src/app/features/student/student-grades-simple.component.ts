import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-student-grades-simple',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6">
        <!-- Page Header -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Bảng điểm học tập</h2>
          <p class="text-gray-600">Theo dõi kết quả học tập và tiến độ của bạn</p>
        </div>

        <!-- Overall Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center">
              <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Điểm trung bình</p>
                <p class="text-2xl font-semibold text-gray-900">8.2</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center">
              <div class="p-3 rounded-full bg-green-100 text-green-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Bài tập hoàn thành</p>
                <p class="text-2xl font-semibold text-gray-900">8/12</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center">
              <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Điểm cao nhất</p>
                <p class="text-2xl font-semibold text-gray-900">9.5</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center">
              <div class="p-3 rounded-full bg-purple-100 text-purple-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Khóa học</p>
                <p class="text-2xl font-semibold text-gray-900">3</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Course Grades -->
        <div class="space-y-6">
          <!-- Navigation Basics -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Navigation Basics</h3>
                <p class="text-sm text-gray-600">Thầy Nguyễn Văn A</p>
              </div>
              <div class="text-right">
                <div class="text-sm text-gray-500">Điểm trung bình</div>
                <div class="text-2xl font-bold text-blue-600">8.5</div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-900">Bài tập: Tính toán vị trí tàu</p>
                  <p class="text-sm text-gray-600">Nộp: 20/12/2024</p>
                </div>
                <div class="text-right">
                  <div class="text-lg font-semibold text-green-600">85/100</div>
                  <div class="text-sm text-gray-500">Tốt</div>
                </div>
              </div>

              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-900">Bài tập: Sử dụng la bàn</p>
                  <p class="text-sm text-gray-600">Nộp: 15/12/2024</p>
                </div>
                <div class="text-right">
                  <div class="text-lg font-semibold text-green-600">92/100</div>
                  <div class="text-sm text-gray-500">Xuất sắc</div>
                </div>
              </div>

              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-900">Kiểm tra giữa kỳ</p>
                  <p class="text-sm text-gray-600">Thi: 10/12/2024</p>
                </div>
                <div class="text-right">
                  <div class="text-lg font-semibold text-green-600">88/100</div>
                  <div class="text-sm text-gray-500">Tốt</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Maritime Safety -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Maritime Safety</h3>
                <p class="text-sm text-gray-600">Thầy Trần Thị B</p>
              </div>
              <div class="text-right">
                <div class="text-sm text-gray-500">Điểm trung bình</div>
                <div class="text-2xl font-bold text-green-600">8.8</div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-900">Bài tập: Phân tích tình huống an toàn</p>
                  <p class="text-sm text-gray-600">Nộp: 18/12/2024</p>
                </div>
                <div class="text-right">
                  <div class="text-lg font-semibold text-green-600">95/150</div>
                  <div class="text-sm text-gray-500">Tốt</div>
                </div>
              </div>

              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-900">Bài tập: Quy định SOLAS</p>
                  <p class="text-sm text-gray-600">Nộp: 12/12/2024</p>
                </div>
                <div class="text-right">
                  <div class="text-lg font-semibold text-green-600">142/150</div>
                  <div class="text-sm text-gray-500">Xuất sắc</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Ship Operations -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Ship Operations</h3>
                <p class="text-sm text-gray-600">Thầy Lê Văn C</p>
              </div>
              <div class="text-right">
                <div class="text-sm text-gray-500">Điểm trung bình</div>
                <div class="text-2xl font-bold text-purple-600">7.8</div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-900">Bài tập: Lập kế hoạch vận hành tàu</p>
                  <p class="text-sm text-gray-600">Nộp: 16/12/2024</p>
                </div>
                <div class="text-right">
                  <div class="text-lg font-semibold text-green-600">85/100</div>
                  <div class="text-sm text-gray-500">Tốt</div>
                </div>
              </div>

              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-900">Bài tập: Quản lý nhiên liệu</p>
                  <p class="text-sm text-gray-600">Nộp: 08/12/2024</p>
                </div>
                <div class="text-right">
                  <div class="text-lg font-semibold text-yellow-600">72/100</div>
                  <div class="text-sm text-gray-500">Khá</div>
                </div>
              </div>

              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-900">Kiểm tra cuối kỳ</p>
                  <p class="text-sm text-gray-600">Thi: 05/12/2024</p>
                </div>
                <div class="text-right">
                  <div class="text-lg font-semibold text-green-600">78/100</div>
                  <div class="text-sm text-gray-500">Tốt</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Grade Distribution -->
        <div class="mt-12 bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">Phân bố điểm số</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 class="font-medium text-gray-900 mb-4">Theo loại bài tập</h4>
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Bài tập thường</span>
                  <div class="flex items-center">
                    <div class="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div class="bg-blue-500 h-2 rounded-full" style="width: 75%"></div>
                    </div>
                    <span class="text-sm font-medium text-gray-900">8.3</span>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Kiểm tra</span>
                  <div class="flex items-center">
                    <div class="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div class="bg-green-500 h-2 rounded-full" style="width: 83%"></div>
                    </div>
                    <span class="text-sm font-medium text-gray-900">8.3</span>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Dự án</span>
                  <div class="flex items-center">
                    <div class="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div class="bg-purple-500 h-2 rounded-full" style="width: 78%"></div>
                    </div>
                    <span class="text-sm font-medium text-gray-900">7.8</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 class="font-medium text-gray-900 mb-4">Theo khóa học</h4>
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Navigation Basics</span>
                  <div class="flex items-center">
                    <div class="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div class="bg-blue-500 h-2 rounded-full" style="width: 85%"></div>
                    </div>
                    <span class="text-sm font-medium text-gray-900">8.5</span>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Maritime Safety</span>
                  <div class="flex items-center">
                    <div class="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div class="bg-green-500 h-2 rounded-full" style="width: 88%"></div>
                    </div>
                    <span class="text-sm font-medium text-gray-900">8.8</span>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Ship Operations</span>
                  <div class="flex items-center">
                    <div class="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div class="bg-purple-500 h-2 rounded-full" style="width: 78%"></div>
                    </div>
                    <span class="text-sm font-medium text-gray-900">7.8</span>
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
export class StudentGradesSimpleComponent {
  protected authService = inject(AuthService);
}