import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-student-assignments-simple',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6">
        <!-- Page Header -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Bài tập và nhiệm vụ</h2>
          <p class="text-gray-600">Theo dõi và hoàn thành các bài tập được giao</p>
        </div>

        <!-- Filter Tabs -->
        <div class="mb-8">
          <div class="border-b border-gray-200">
            <nav class="-mb-px flex space-x-8">
              <button class="border-b-2 border-blue-500 py-2 px-1 text-sm font-medium text-blue-600">
                Tất cả
              </button>
              <button class="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                Chưa làm
              </button>
              <button class="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                Đã nộp
              </button>
              <button class="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                Đã chấm
              </button>
            </nav>
          </div>
        </div>

        <!-- Assignments List -->
        <div class="space-y-6">
          <!-- Assignment 1 -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center mb-2">
                  <span class="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-3">Hạn sắp đến</span>
                  <span class="text-sm text-gray-500">Navigation Basics</span>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Bài tập: Tính toán vị trí tàu</h3>
                <p class="text-gray-600 mb-4">Sử dụng các công thức tính toán để xác định vị trí tàu dựa trên tọa độ GPS và la bàn.</p>
                
                <div class="flex items-center text-sm text-gray-500 mb-4">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Hạn nộp: 25/12/2024 - 23:59
                </div>

                <div class="flex items-center space-x-4">
                  <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Làm bài tập
                  </button>
                  <button class="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Xem chi tiết
                  </button>
                </div>
              </div>
              <div class="ml-6 text-right">
                <div class="text-sm text-gray-500 mb-1">Điểm tối đa</div>
                <div class="text-lg font-semibold text-gray-900">100 điểm</div>
              </div>
            </div>
          </div>

          <!-- Assignment 2 -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center mb-2">
                  <span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-3">Đã nộp</span>
                  <span class="text-sm text-gray-500">Maritime Safety</span>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Bài tập: Phân tích tình huống an toàn</h3>
                <p class="text-gray-600 mb-4">Phân tích các tình huống nguy hiểm trên biển và đề xuất giải pháp xử lý.</p>
                
                <div class="flex items-center text-sm text-gray-500 mb-4">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Đã nộp: 20/12/2024 - 14:30
                </div>

                <div class="flex items-center space-x-4">
                  <button class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Xem bài nộp
                  </button>
                  <button class="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Xem chi tiết
                  </button>
                </div>
              </div>
              <div class="ml-6 text-right">
                <div class="text-sm text-gray-500 mb-1">Điểm tối đa</div>
                <div class="text-lg font-semibold text-gray-900">150 điểm</div>
              </div>
            </div>
          </div>

          <!-- Assignment 3 -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center mb-2">
                  <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-3">Đã chấm</span>
                  <span class="text-sm text-gray-500">Ship Operations</span>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Bài tập: Lập kế hoạch vận hành tàu</h3>
                <p class="text-gray-600 mb-4">Lập kế hoạch chi tiết cho chuyến đi từ cảng A đến cảng B.</p>
                
                <div class="flex items-center text-sm text-gray-500 mb-4">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Đã chấm: 18/12/2024 - 09:15
                </div>

                <div class="flex items-center space-x-4">
                  <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Xem kết quả
                  </button>
                  <button class="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Xem chi tiết
                  </button>
                </div>
              </div>
              <div class="ml-6 text-right">
                <div class="text-sm text-gray-500 mb-1">Điểm đạt được</div>
                <div class="text-lg font-semibold text-green-600">85/100 điểm</div>
              </div>
            </div>
          </div>

          <!-- Assignment 4 -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center mb-2">
                  <span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-3">Mới</span>
                  <span class="text-sm text-gray-500">Weather Forecasting</span>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Bài tập: Dự báo thời tiết biển</h3>
                <p class="text-gray-600 mb-4">Phân tích các bản đồ thời tiết và đưa ra dự báo cho khu vực biển Đông.</p>
                
                <div class="flex items-center text-sm text-gray-500 mb-4">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Hạn nộp: 30/12/2024 - 23:59
                </div>

                <div class="flex items-center space-x-4">
                  <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Làm bài tập
                  </button>
                  <button class="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Xem chi tiết
                  </button>
                </div>
              </div>
              <div class="ml-6 text-right">
                <div class="text-sm text-gray-500 mb-1">Điểm tối đa</div>
                <div class="text-lg font-semibold text-gray-900">120 điểm</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistics -->
        <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center">
              <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Tổng bài tập</p>
                <p class="text-2xl font-semibold text-gray-900">12</p>
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
                <p class="text-sm font-medium text-gray-600">Đã hoàn thành</p>
                <p class="text-2xl font-semibold text-gray-900">8</p>
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
                <p class="text-sm font-medium text-gray-600">Điểm trung bình</p>
                <p class="text-2xl font-semibold text-gray-900">8.2</p>
              </div>
            </div>
          </div>
        </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAssignmentsSimpleComponent {
  protected authService = inject(AuthService);
}