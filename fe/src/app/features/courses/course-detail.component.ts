import { Component, signal, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';
import { CourseService } from '../../state/course.service';
import { ExtendedCourse } from '../../shared/types/course.types';
import { AuthService } from '../../core/services/auth.service';
import { ClassSummary, CourseApi } from '../../api/client/course.api';
import { firstValueFrom } from 'rxjs';
import { StudentEnrollmentService } from '../student/services/enrollment.service';
import { PaymentModalComponent, CoursePaymentInfo } from '../payment/payment-modal.component';
import { PaymentService } from '../payment/payment.service';

/**
 * CourseDetailComponent - Coursera/Udemy-inspired Design (Dec 2025 SOTA)
 * 
 * Features:
 * - Dark gradient hero section
 * - Sticky sidebar with price card
 * - Curriculum accordion with lesson previews
 * - Class picker modal for enrollment
 * - Payment simulation flow
 */
@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, PaymentModalComponent],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- HERO SECTION - Dark Gradient (Coursera Style) -->
      <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          @if (courseService.isLoading()) {
            <div class="animate-pulse">
              <div class="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
              <div class="h-4 bg-slate-700 rounded w-2/3 mb-2"></div>
              <div class="h-4 bg-slate-700 rounded w-1/2"></div>
            </div>
          } @else if (course()) {
            <div class="flex flex-col lg:flex-row gap-8">
              <!-- Left Content -->
              <div class="lg:w-2/3">
                <!-- Breadcrumb -->
                <nav class="text-sm text-slate-400 mb-4">
                  <a routerLink="/courses" class="hover:text-white transition-colors">Khóa học</a>
                  <span class="mx-2">›</span>
                  <span class="text-blue-400">{{ getCategoryName(course()?.category!) }}</span>
                </nav>
                
                <!-- Title -->
                <h1 class="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                  {{ course()?.title }}
                </h1>
                
                <!-- Description -->
                <p class="text-lg text-slate-300 mb-6 line-clamp-3">
                  {{ course()?.description }}
                </p>
                
                <!-- Badges -->
                <div class="flex flex-wrap items-center gap-4 mb-6">
                  <!-- Rating -->
                  <div class="flex items-center gap-1">
                    <span class="text-yellow-400 font-bold">{{ course()?.rating || 4.5 }}</span>
                    <div class="flex">
                      @for (star of [1,2,3,4,5]; track star) {
                        <svg class="w-4 h-4" [class.text-yellow-400]="star <= (course()?.rating || 4)" [class.text-slate-500]="star > (course()?.rating || 4)" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                      }
                    </div>
                    <span class="text-slate-400">({{ course()?.reviews || 0 }} đánh giá)</span>
                  </div>
                  
                  <span class="text-slate-400">{{ course()?.studentsCount || 0 }} học viên</span>
                </div>
                
                <!-- Instructor -->
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {{ (course()?.instructor?.name || 'G')[0] }}
                  </div>
                  <div>
                    <p class="text-sm text-slate-400">Giảng viên</p>
                    <p class="font-medium">{{ course()?.instructor?.name || 'Giảng viên' }}</p>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- MAIN CONTENT + SIDEBAR -->
      @if (course()) {
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="flex flex-col lg:flex-row gap-8">
            
            <!-- LEFT: Main Content -->
            <div class="lg:w-2/3 space-y-8">
              
              <!-- What you'll learn -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Bạn sẽ học được gì
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div class="flex items-start gap-2">
                    <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-gray-700">Kiến thức chuyên sâu về {{ getCategoryName(course()?.category!) }}</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-gray-700">Kỹ năng thực hành từ chuyên gia</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-gray-700">Chứng chỉ hoàn thành khóa học</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-gray-700">Truy cập tài liệu học tập trọn đời</span>
                  </div>
                </div>
              </div>
              
              <!-- Course Description -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 class="text-xl font-bold text-gray-900 mb-4">Giới thiệu khóa học</h2>
                <div class="prose max-w-none text-gray-600">
                  <p>{{ course()?.description }}</p>
                  <p class="mt-4">
                    Khóa học này được thiết kế cho sinh viên và chuyên gia trong lĩnh vực hàng hải. 
                    Bạn sẽ được học từ kiến thức cơ bản đến nâng cao với hướng dẫn từ các chuyên gia có kinh nghiệm thực tế.
                  </p>
                </div>
              </div>
              
              <!-- Curriculum -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div class="flex items-center justify-between mb-4">
                  <h2 class="text-xl font-bold text-gray-900">Nội dung khóa học</h2>
                  <span class="text-sm text-gray-500">{{ course()?.lessonsCount || 0 }} bài học</span>
                </div>
                
                <div class="space-y-3">
                  <!-- Sample curriculum items -->
                  @for (i of [1,2,3]; track i) {
                    <div class="border border-gray-200 rounded-lg overflow-hidden">
                      <button (click)="toggleChapter(i)" 
                              class="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                        <div class="flex items-center gap-3">
                          <svg class="w-5 h-5 text-gray-400 transition-transform" 
                               [class.rotate-90]="expandedChapters().has(i)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                          </svg>
                          <span class="font-medium text-gray-900">Chương {{ i }}: {{ getChapterTitle(i) }}</span>
                        </div>
                        <span class="text-sm text-gray-500">{{ 2 + i }} bài học</span>
                      </button>
                      
                      @if (expandedChapters().has(i)) {
                        <div class="border-t border-gray-200 divide-y divide-gray-100">
                          @for (j of [1,2,3]; track j) {
                            <div class="flex items-center justify-between p-4 hover:bg-gray-50">
                              <div class="flex items-center gap-3">
                                @if (isPaid() || (i === 1 && j <= 2)) {
                                  <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                  </svg>
                                } @else {
                                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                  </svg>
                                }
                                <span class="text-gray-700">Bài {{ j }}: {{ getLessonTitle(i, j) }}</span>
                              </div>
                              <span class="text-sm text-gray-500">{{ 5 + j * 3 }} phút</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
                
                @if (!isPaid()) {
                  <div class="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                    <svg class="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                    <p class="text-sm text-amber-800">
                      <strong>Xem trước miễn phí:</strong> 2 bài học đầu tiên. Thanh toán để mở khóa toàn bộ nội dung.
                    </p>
                  </div>
                }
              </div>
              
              <!-- Instructor Section -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 class="text-xl font-bold text-gray-900 mb-4">Giảng viên</h2>
                <div class="flex items-start gap-4">
                  <div class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    {{ (course()?.instructor?.name || 'G')[0] }}
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">{{ course()?.instructor?.name || 'Giảng viên' }}</h3>
                    <p class="text-gray-600 mb-2">{{ course()?.instructor?.title || 'Chuyên gia Hàng hải' }}</p>
                    <div class="flex items-center gap-4 text-sm text-gray-500">
                      <span>⭐ {{ course()?.instructor?.rating || 4.8 }} đánh giá</span>
                      <span>👥 {{ course()?.instructor?.studentsCount || 0 }} học viên</span>
                      <span>📚 {{ course()?.instructor?.experience || 5 }}+ năm kinh nghiệm</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- RIGHT: Sticky Sidebar -->
            <div class="lg:w-1/3">
              <div class="sticky top-4 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <!-- Course Preview Image -->
                <div class="relative">
                  <img [src]="course()?.thumbnail || 'assets/images/courses/placeholder.png'" 
                       [alt]="course()?.title"
                       class="w-full h-48 object-cover">
                  <div class="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <button class="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                      <svg class="w-8 h-8 text-blue-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                  </div>
                </div>
                
                <!-- Price Section -->
                <div class="p-6">
                  <div class="flex items-center gap-3 mb-4">
                    <!-- Show sale price if exists, otherwise show regular price -->
                    @if (course()?.salePrice && course()!.salePrice! > 0) {
                      <span class="text-3xl font-bold text-gray-900">{{ getPriceDisplay(course()?.salePrice!) }}</span>
                      <span class="text-lg text-gray-400 line-through">{{ course()!.price | number:'1.0-0' }}₫</span>
                      <span class="bg-red-100 text-red-700 text-sm font-semibold px-2 py-1 rounded">-{{ getDiscountPercent() }}%</span>
                    } @else {
                      <span class="text-3xl font-bold text-gray-900">{{ getPriceDisplay(course()?.price!) }}</span>
                    }
                  </div>
                  
                  <!-- CTA Buttons -->
                  @if (isEnrolled() && (isPaid() || !course()?.price || course()!.price === 0)) {
                    <!-- Enrolled + (Paid OR Free course) = Continue Learning -->
                    <button (click)="continueLearning()" 
                            class="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3.5 px-6 rounded-lg font-semibold transition-all mb-3 flex items-center justify-center gap-2">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span>Tiếp tục học</span>
                    </button>
                  } @else if (isEnrolled() && !isPaid() && course()?.price && course()!.price > 0) {
                    <!-- Enrolled + NOT Paid + Paid course = Show Payment Button -->
                    <button (click)="openPaymentModal()" 
                            class="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white py-3.5 px-6 rounded-lg font-semibold transition-all mb-3 flex items-center justify-center gap-2">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                      </svg>
                      <span>Mở khóa khóa học ({{ course()!.price | number:'1.0-0' }}₫)</span>
                    </button>
                    <p class="text-center text-sm text-amber-600 mb-3">
                      ⚠️ Bạn chỉ xem được 2 bài học đầu tiên. Thanh toán để truy cập đầy đủ.
                    </p>
                  } @else {
                    <!-- Not Enrolled = Register Button -->
                    <button (click)="handleEnrollClick()" 
                            [disabled]="isEnrolling()"
                            class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3.5 px-6 rounded-lg font-semibold transition-all disabled:opacity-50 mb-3 flex items-center justify-center gap-2">
                      @if (isEnrolling()) {
                        <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Đang xử lý...</span>
                      } @else {
                        @if (course()?.price && course()!.price > 0) {
                          <span>Đăng ký & Thanh toán</span>
                        } @else {
                          <span>Đăng ký miễn phí</span>
                        }
                      }
                    </button>
                  }
                  
                  @if (!isEnrolled() && course()?.price && course()!.price > 0) {
                    <button (click)="handleEnrollClick()" class="w-full border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors mb-4">
                      Dùng thử miễn phí (2 bài đầu)
                    </button>
                  }
                  
                  <p class="text-center text-sm text-gray-500 mb-6">Đảm bảo hoàn tiền trong 30 ngày</p>
                  
                  <!-- Course Includes -->
                  <div class="border-t border-gray-200 pt-4">
                    <h4 class="font-semibold text-gray-900 mb-3">Khóa học bao gồm:</h4>
                    <div class="space-y-2 text-sm">
                      <div class="flex items-center gap-2 text-gray-600">
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>{{ getDurationInHours(course()?.duration!) }} giờ video</span>
                      </div>
                      <div class="flex items-center gap-2 text-gray-600">
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <span>{{ course()?.lessonsCount }} bài học</span>
                      </div>
                      <div class="flex items-center gap-2 text-gray-600">
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>Truy cập trọn đời</span>
                      </div>
                      <div class="flex items-center gap-2 text-gray-600">
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                        </svg>
                        <span>Chứng chỉ hoàn thành</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- CLASS PICKER MODAL -->
      @if (showClassModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div class="p-6 border-b border-gray-200">
              <h3 class="text-xl font-bold text-gray-900">Chọn lớp học</h3>
              <p class="text-sm text-gray-500 mt-1">Vui lòng chọn lớp phù hợp với lịch học của bạn</p>
            </div>
            
            <div class="p-6 space-y-3 max-h-60 overflow-y-auto">
              @for (cls of availableClasses(); track cls.id) {
                <div (click)="selectedClass.set(cls.id)" 
                     class="p-4 border-2 rounded-lg cursor-pointer transition-all"
                     [class.border-blue-500]="selectedClass() === cls.id"
                     [class.bg-blue-50]="selectedClass() === cls.id"
                     [class.border-gray-200]="selectedClass() !== cls.id"
                     [class.hover:border-gray-300]="selectedClass() !== cls.id">
                  <div class="flex justify-between items-start">
                    <div>
                      <div class="font-semibold text-gray-900">{{ cls.name }}</div>
                      <div class="text-sm text-gray-500">Mã lớp: {{ cls.code }}</div>
                      <div class="text-sm text-gray-500">Giảng viên: {{ cls.teacherName }}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-sm font-medium text-gray-700">{{ cls.maxStudents }} slots</div>
                      @if (selectedClass() === cls.id) {
                        <svg class="w-6 h-6 text-blue-500 mt-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
            
            <div class="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button (click)="showClassModal.set(false)" 
                      class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                Hủy
              </button>
              <button (click)="confirmEnrollment()" 
                      [disabled]="!selectedClass() || isEnrolling()"
                      class="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {{ isEnrolling() ? 'Đang xử lý...' : 'Xác nhận đăng ký' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- PAYMENT MODAL -->
      @if (showPaymentModal()) {
        <app-payment-modal
          [courseInfo]="getPaymentInfo()"
          (close)="onPaymentModalClose($event)"
          (paymentComplete)="onPaymentComplete()">
        </app-payment-modal>
      }
    </div>
  `
})
export class CourseDetailComponent implements OnInit {
  protected courseService = inject(CourseService);
  protected authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private title = inject(Title);
  private meta = inject(Meta);
  private courseApi = inject(CourseApi);

  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  // State
  course = signal<ExtendedCourse | null>(null);
  availableClasses = signal<ClassSummary[]>([]);
  showClassModal = signal(false);
  selectedClass = signal<string | null>(null);
  isEnrolling = signal(false);
  expandedChapters = signal<Set<number>>(new Set([1])); // First chapter expanded by default
  isEnrolled = signal(false); // Student enrollment status
  isPaid = signal(false); // Payment status
  showPaymentModal = signal(false); // Payment modal visibility

  // Inject services
  private enrollmentService = inject(StudentEnrollmentService);
  private paymentService = inject(PaymentService);

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadCourse(params['id']);

        // Preload enrollment status for logged-in students
        if (this.authService.isAuthenticated() && this.authService.userRole() === 'student') {
          this.enrollmentService.loadEnrolledCourses(1, 100).then(() => {
            // Check if student is enrolled in this course
            this.isEnrolled.set(this.enrollmentService.isEnrolledInCourse(params['id']));
          });
        }
      }
    });
  }

  continueLearning() {
    const courseId = this.course()?.id;
    if (courseId) {
      this.router.navigate(['/student/learn/course', courseId]);
    }
  }

  // === PAYMENT METHODS ===

  getPaymentInfo(): CoursePaymentInfo {
    const c = this.course();
    // Handle instructor which could be string or object
    let instructorName = 'Giảng viên';
    if (c?.instructor) {
      if (typeof c.instructor === 'string') {
        instructorName = c.instructor;
      } else if (c.instructor.name) {
        instructorName = c.instructor.name;
      }
    }
    return {
      courseId: c?.id || '',
      title: c?.title || '',
      thumbnail: c?.thumbnail || '',
      price: c?.price || 0,
      salePrice: (c as any)?.salePrice,
      instructorName
    };
  }

  openPaymentModal() {
    this.showPaymentModal.set(true);
  }

  onPaymentModalClose(startLearning?: boolean | void) {
    this.showPaymentModal.set(false);
    if (startLearning === true) {
      // Payment successful, start learning
      this.isPaid.set(true);
      this.continueLearning();
    }
  }

  onPaymentComplete() {
    // Payment was successful, update state
    this.isPaid.set(true);
  }

  async handleEnrollClick() {
    if (!this.authService.currentUser()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const courseId = this.course()?.id;
    if (!courseId) return;

    this.isEnrolling.set(true);
    try {
      const classes = await this.courseService.getAvailableClasses(courseId);
      if (classes.length === 0) {
        alert('Hiện tại chưa có lớp nào mở cho khóa học này.');
      } else if (classes.length === 1) {
        await this.enroll(classes[0].id);
      } else {
        this.availableClasses.set(classes);
        this.selectedClass.set(null);
        this.showClassModal.set(true);
      }
    } catch (e) {
      console.error(e);
      alert('Có lỗi xảy ra khi kiểm tra lớp học.');
    } finally {
      this.isEnrolling.set(false);
    }
  }

  async confirmEnrollment() {
    const clsId = this.selectedClass();
    if (clsId) {
      this.isEnrolling.set(true);
      await this.enroll(clsId);
      this.showClassModal.set(false);
      this.isEnrolling.set(false);
    }
  }

  private async enroll(classId: string) {
    const user = this.authService.currentUser();
    if (!user || !this.course()) return;

    try {
      await this.courseService.enrollInCourse(this.course()!.id, user.id, classId);
      alert('Đăng ký thành công! Chuyển đến trang học.');
      this.router.navigate(['/student/learn/course', this.course()!.id]);
    } catch (e: any) {
      alert('Đăng ký thất bại: ' + (e.error?.message || e.message));
    }
  }

  private async loadCourse(id: string): Promise<void> {
    try {
      const course = await this.courseService.getCourseById(id);
      this.course.set(course);
      if (course) {
        this.updateSeo(course);
      }
    } catch (error) {
      console.error('Error loading course:', error);
    }
  }

  toggleChapter(chapterIndex: number): void {
    this.expandedChapters.update(set => {
      const newSet = new Set(set);
      if (newSet.has(chapterIndex)) {
        newSet.delete(chapterIndex);
      } else {
        newSet.add(chapterIndex);
      }
      return newSet;
    });
  }

  getChapterTitle(index: number): string {
    const titles = ['Giới thiệu tổng quan', 'Kiến thức cơ bản', 'Ứng dụng thực tiễn'];
    return titles[index - 1] || `Chương ${index}`;
  }

  getLessonTitle(chapter: number, lesson: number): string {
    const lessons: Record<number, string[]> = {
      1: ['Tổng quan khóa học', 'Mục tiêu học tập', 'Tài liệu tham khảo'],
      2: ['Khái niệm cơ bản', 'Nguyên lý hoạt động', 'Bài tập thực hành'],
      3: ['Case study', 'Dự án thực tế', 'Đánh giá cuối khóa']
    };
    return lessons[chapter]?.[lesson - 1] || `Bài ${lesson}`;
  }

  getCategoryName(category: string): string {
    const names: Record<string, string> = {
      'safety': 'An toàn Hàng hải',
      'navigation': 'Điều khiển Tàu',
      'engineering': 'Kỹ thuật Máy tàu',
      'logistics': 'Logistics Hàng hải',
      'law': 'Luật Hàng hải',
      'certificates': 'Chứng chỉ Chuyên môn'
    };
    return names[category] || category || 'Khóa học';
  }

  getDurationInHours(duration: string): number {
    const match = duration?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 40;
  }

  getPriceDisplay(price: number): string {
    if (!price || price === 0) return 'Miễn phí';
    return price.toLocaleString('vi-VN') + '₫';
  }

  getDiscountPercent(): number {
    const c = this.course();
    if (!c?.price || !c?.salePrice || c.price <= 0) return 0;
    const discount = Math.round(((c.price - c.salePrice) / c.price) * 100);
    return Math.max(0, Math.min(99, discount)); // Clamp 0-99
  }

  private updateSeo(course: ExtendedCourse): void {
    const pageTitle = `${course.title} - LMS Maritime`;
    this.title.setTitle(pageTitle);

    const description = course.description?.slice(0, 160) || course.title;
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
  }
}
