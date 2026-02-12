import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CourseApi } from '../../../api/client/course.api';
import { PaymentService, CheckoutRequest } from '../services/payment.service';

interface CourseInfo {
  id: string;
  title: string;
  description: string;
  price: number;
  teacherName: string;
  thumbnail?: string;
}

/**
 * Checkout Component - Trang thanh toán khóa học
 * 
 * Features:
 * - Hiển thị thông tin khóa học
 * - Giả lập thanh toán (bấm nút là thành công)
 * - Redirect về course detail sau khi thanh toán
 */
@Component({
  selector: 'app-checkout',
  imports: [RouterModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-[#0056D2]/5 py-8 px-4">
      <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <button 
            (click)="goBack()" 
            class="flex items-center text-slate-600 hover:text-[#0056D2] transition-colors mb-4">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            <span>Quay lại</span>
          </button>
          <h1 class="text-3xl font-bold text-slate-800">Thanh toán khóa học</h1>
          <p class="text-slate-600 mt-2">Hoàn tất thanh toán để truy cập đầy đủ nội dung</p>
        </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div class="animate-spin w-12 h-12 border-4 border-[#0056D2] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p class="text-slate-600">Đang tải thông tin...</p>
          </div>
        }

        <!-- Error State -->
        @if (error()) {
          <div class="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
            <div class="flex items-start gap-3">
              <svg class="w-6 h-6 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
              </svg>
              <div>
                <h3 class="font-semibold text-red-800">Có lỗi xảy ra</h3>
                <p class="text-red-700 mt-1">{{ error() }}</p>
              </div>
            </div>
          </div>
        }

        <!-- Success State -->
        @if (paymentSuccess()) {
          <div class="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-slate-800 mb-2">Thanh toán thành công!</h2>
            <p class="text-slate-600 mb-6">Bạn đã có quyền truy cập đầy đủ khóa học.</p>
            
            <div class="space-y-3">
              <button 
                (click)="goToCourse()"
                class="w-full py-3 px-6 bg-[#0056D2] text-white font-semibold rounded-xl hover:bg-[#004BB5] transition-colors">
                Bắt đầu học ngay
              </button>
              <button 
                (click)="goToMyCourses()"
                class="w-full py-3 px-6 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors">
                Về danh sách khóa học
              </button>
            </div>
          </div>
        }

        <!-- Already Paid State -->
        @if (alreadyPaid()) {
          <div class="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div class="w-20 h-20 bg-[#0056D2]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-[#0056D2]" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-slate-800 mb-2">Bạn đã sở hữu khóa học này!</h2>
            @if (course()) {
              <p class="text-lg text-[#0056D2] font-semibold mb-2">{{ course()?.title }}</p>
            }
            <p class="text-slate-600 mb-6">Khóa học này đã được thanh toán. Bạn có quyền truy cập đầy đủ tất cả bài học.</p>
            
            <div class="space-y-3">
              <button 
                (click)="goToCourse()"
                class="w-full py-3 px-6 bg-[#0056D2] text-white font-semibold rounded-xl hover:bg-[#004BB5] transition-colors">
                Tiếp tục học
              </button>
              <button 
                (click)="goToMyCourses()"
                class="w-full py-3 px-6 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors">
                Xem các khóa học khác
              </button>
            </div>
          </div>
        }

        <!-- Checkout Form -->
        @if (!isLoading() && !paymentSuccess() && !alreadyPaid() && course()) {
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
            <!-- Course Info -->
            <div class="p-6 border-b border-slate-100">
              <div class="flex gap-4">
                @if (course()?.thumbnail) {
                  <img [src]="course()?.thumbnail" 
                       [alt]="course()?.title"
                       class="w-24 h-24 rounded-xl object-cover flex-shrink-0">
                } @else {
                  <div class="w-24 h-24 bg-[#0056D2] rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    </svg>
                  </div>
                }
                <div class="flex-1">
                  <h2 class="text-xl font-bold text-slate-800">{{ course()?.title }}</h2>
                  <p class="text-slate-500 text-sm mt-1">Giảng viên: {{ course()?.teacherName || 'Chưa cập nhật' }}</p>
                  <p class="text-slate-600 text-sm mt-2 line-clamp-2">{{ course()?.description }}</p>
                </div>
              </div>
            </div>

            <!-- Price Summary -->
            <div class="p-6 bg-slate-50">
              <div class="flex justify-between items-center mb-4">
                <span class="text-slate-600">Giá khóa học</span>
                <span class="text-lg font-semibold text-slate-800">{{ formatPrice(course()?.price || 0) }}</span>
              </div>
              <div class="flex justify-between items-center mb-4 text-green-600">
                <span>Giảm giá (Demo)</span>
                <span>-0đ</span>
              </div>
              <div class="border-t border-slate-200 pt-4 flex justify-between items-center">
                <span class="text-lg font-bold text-slate-800">Tổng thanh toán</span>
                <span class="text-2xl font-bold text-[#0056D2]">{{ formatPrice(course()?.price || 0) }}</span>
              </div>
            </div>

            <!-- Payment Method (Demo) -->
            <div class="p-6">
              <h3 class="font-semibold text-slate-800 mb-4">Phương thức thanh toán</h3>
              <div class="space-y-3">
                <label class="flex items-center p-4 border-2 border-[#0056D2] bg-[#0056D2]/5 rounded-xl cursor-pointer">
                  <input type="radio" name="payment" checked class="w-5 h-5 text-[#0056D2]">
                  <span class="ml-3 font-medium text-slate-700">Thanh toán giả lập (Demo)</span>
                  <span class="ml-auto text-xs bg-[#0056D2]/10 text-[#004BB5] px-2 py-1 rounded">Miễn phí</span>
                </label>
                <label class="flex items-center p-4 border border-slate-200 rounded-xl cursor-not-allowed opacity-50">
                  <input type="radio" name="payment" disabled class="w-5 h-5">
                  <span class="ml-3 font-medium text-slate-400">VNPAY <span class="text-xs">(Sắp có)</span></span>
                </label>
                <label class="flex items-center p-4 border border-slate-200 rounded-xl cursor-not-allowed opacity-50">
                  <input type="radio" name="payment" disabled class="w-5 h-5">
                  <span class="ml-3 font-medium text-slate-400">MoMo <span class="text-xs">(Sắp có)</span></span>
                </label>
              </div>
            </div>

            <!-- Notice -->
            <div class="px-6 pb-4">
              <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <p class="text-sm text-amber-800">
                  <strong>Lưu ý:</strong> Đây là môi trường demo. Bấm "Thanh toán" sẽ tự động hoàn tất mà không cần thanh toán thực.
                </p>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="p-6 border-t border-slate-100">
              <button 
                (click)="processPayment()"
                [disabled]="isProcessing()"
                class="w-full py-4 px-6 bg-[#0056D2] hover:bg-[#004BB5] text-white font-bold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl">
                @if (isProcessing()) {
                  <div class="flex items-center justify-center">
                    <svg class="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Đang xử lý...</span>
                  </div>
                } @else {
                  <span>Thanh toán {{ formatPrice(course()?.price || 0) }}</span>
                }
              </button>
            </div>
          </div>
        }

        <!-- Free Preview Notice -->
        <div class="mt-6 text-center text-sm text-slate-500">
          <p><app-icon name="lightbulb" size="sm" class="text-yellow-500 mr-1"/> Chưa thanh toán? Bạn có thể xem thử 2 bài học đầu tiên miễn phí!</p>
        </div>
      </div>
    </div>
  `
})
export class CheckoutComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private courseApi = inject(CourseApi);
  private paymentService = inject(PaymentService);

  // State
  course = signal<CourseInfo | null>(null);
  isLoading = signal(true);
  isProcessing = signal(false);
  error = signal<string | null>(null);
  paymentSuccess = signal(false);
  alreadyPaid = signal(false);  // Đã thanh toán từ trước

  private courseId: string = '';

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    if (this.courseId) {
      this.checkPaymentAndLoadCourse();
    } else {
      this.error.set('Không tìm thấy khóa học');
      this.isLoading.set(false);
    }
  }

  /**
   * Kiểm tra trạng thái thanh toán trước, sau đó load course info
   */
  private checkPaymentAndLoadCourse(): void {
    this.isLoading.set(true);

    // Force refresh để lấy trạng thái mới nhất từ server
    this.paymentService.getPaymentStatus(this.courseId, true).subscribe({
      next: (response: any) => {
        const hasPaid = response?.data?.hasPaid || false;
        if (hasPaid) {
          this.alreadyPaid.set(true);
          this.isLoading.set(false);
          // Vẫn load course info để hiển thị tên
          this.loadCourseInfoSilent();
        } else {
          this.loadCourseInfo();
        }
      },
      error: (err: Error) => {
        // Vẫn load course info nếu check payment lỗi
        this.loadCourseInfo();
      }
    });
  }

  /**
   * Load thông tin course (không set loading = false)
   */
  private loadCourseInfoSilent(): void {
    this.courseApi.getCourseById(this.courseId).subscribe({
      next: (response: any) => {
        const data = response.data || response;
        this.course.set({
          id: data.id,
          title: data.title,
          description: data.description || '',
          price: data.price || 500000,
          teacherName: data.teacherName || data.teacher?.fullName || 'Giảng viên',
          thumbnail: data.thumbnail || data.coverImage
        });
      },
      error: (err: Error) => {
      }
    });
  }

  private loadCourseInfo(): void {
    this.isLoading.set(true);
    this.courseApi.getCourseById(this.courseId).subscribe({
      next: (response: any) => {
        const data = response.data || response;
        this.course.set({
          id: data.id,
          title: data.title,
          description: data.description || '',
          price: data.price || 500000, // Default price if not set
          teacherName: data.teacherName || data.teacher?.fullName || 'Giảng viên',
          thumbnail: data.thumbnail || data.coverImage
        });
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.error.set('Không thể tải thông tin khóa học');
        this.isLoading.set(false);
      }
    });
  }

  processPayment(): void {
    if (!this.course()) return;

    this.isProcessing.set(true);
    this.error.set(null);

    const request: CheckoutRequest = {
      courseId: this.courseId,
      amount: this.course()!.price,
      paymentMethod: 'SIMULATED'
    };

    this.paymentService.checkout(request).subscribe({
      next: (response) => {
        this.isProcessing.set(false);
        if (response.data) {
          this.paymentSuccess.set(true);
        } else {
          this.error.set(response.message || 'Thanh toán thất bại');
        }
      },
      error: (err: any) => {
        this.isProcessing.set(false);
        this.error.set(err.error?.message || 'Có lỗi xảy ra khi thanh toán');
      }
    });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  }

  goBack(): void {
    this.router.navigate(['/student/course', this.courseId]);
  }

  goToCourse(): void {
    this.router.navigate(['/student/course', this.courseId]);
  }

  goToMyCourses(): void {
    this.router.navigate(['/student/my-courses']);
  }
}
