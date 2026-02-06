import { Component, inject, signal, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from './payment.service';
import { PAYMENT_METHODS, PaymentMethod } from '../../api/client/payment.api';

/**
 * Payment Modal Component
 * 
 * SOTA Design (Dec 2025):
 * - Premium UI with gradient buttons
 * - Multiple payment method selection
 * - Loading states and error handling
 * - Success animation
 */

export interface CoursePaymentInfo {
  courseId: string;
  title: string;
  thumbnail: string;
  price: number;
  salePrice?: number;
  instructorName: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-payment-modal',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
         (click)="onBackdropClick($event)">
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all"
           (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <button (click)="close.emit()" 
                  class="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <h2 class="text-2xl font-bold">Thanh toán khóa học</h2>
          <p class="text-white/80 text-sm mt-1">Mở khóa toàn bộ nội dung học tập</p>
        </div>

        @if (paymentSuccess()) {
          <!-- Success State -->
          <div class="p-8 text-center">
            <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-gray-900 mb-2">Thanh toán thành công! 🎉</h3>
            <p class="text-gray-600 mb-6">Bạn đã mở khóa toàn bộ khóa học. Chúc bạn học tập vui vẻ!</p>
            <button (click)="close.emit(true)"
                    class="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:shadow-lg transition-all">
              Bắt đầu học ngay →
            </button>
          </div>
        } @else {
          <!-- Payment Form -->
          <div class="p-6">
            <!-- Course Info -->
            <div class="flex gap-4 p-4 bg-gray-50 rounded-xl mb-6">
              <img [src]="courseInfo().thumbnail || 'assets/images/courses/placeholder.png'" 
                   [alt]="courseInfo().title"
                   class="w-24 h-16 object-cover rounded-lg">
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-gray-900 truncate">{{ courseInfo().title }}</h3>
                <p class="text-sm text-gray-500">{{ courseInfo().instructorName }}</p>
              </div>
            </div>

            <!-- Price Display -->
            <div class="flex items-center justify-between mb-6 p-4 bg-blue-50 rounded-xl">
              <span class="text-gray-700 font-medium">Tổng thanh toán</span>
              <div class="text-right">
                @if (courseInfo().salePrice && (courseInfo().salePrice ?? 0) < courseInfo().price) {
                  <span class="text-sm text-gray-400 line-through mr-2">
                    {{ courseInfo().price | number:'1.0-0' }}₫
                  </span>
                  <span class="text-2xl font-bold text-blue-600">
                    {{ courseInfo().salePrice | number:'1.0-0' }}₫
                  </span>
                } @else {
                  <span class="text-2xl font-bold text-blue-600">
                    {{ courseInfo().price | number:'1.0-0' }}₫
                  </span>
                }
              </div>
            </div>

            <!-- Payment Methods -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-3">Chọn phương thức thanh toán</label>
              <div class="space-y-2">
                @for (method of paymentMethods; track method.code) {
                  <label class="flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all"
                         [class.border-blue-500]="selectedMethod() === method.code"
                         [class.bg-blue-50]="selectedMethod() === method.code"
                         [class.border-gray-200]="selectedMethod() !== method.code"
                         [class.hover:border-gray-300]="selectedMethod() !== method.code">
                    <input type="radio" 
                           name="paymentMethod" 
                           [value]="method.code"
                           [checked]="selectedMethod() === method.code"
                           (change)="selectedMethod.set(method.code)"
                           class="w-4 h-4 text-blue-600">
                    <span class="text-xl">{{ method.icon }}</span>
                    <div class="flex-1">
                      <div class="font-medium text-gray-900">{{ method.name }}</div>
                      <div class="text-xs text-gray-500">{{ method.description }}</div>
                    </div>
                  </label>
                }
              </div>
            </div>

            <!-- Error Message -->
            @if (error()) {
              <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {{ error() }}
              </div>
            }

            <!-- Submit Button -->
            <button (click)="processPayment()"
                    [disabled]="isProcessing()"
                    class="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              @if (isProcessing()) {
                <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Đang xử lý...</span>
              } @else {
                <span>Thanh toán {{ (courseInfo().salePrice || courseInfo().price) | number:'1.0-0' }}₫</span>
              }
            </button>

            <!-- Security Note -->
            <p class="text-center text-xs text-gray-400 mt-4">
              🔒 Thanh toán được bảo mật. Đảm bảo hoàn tiền trong 30 ngày.
            </p>
          </div>
        }
      </div>
    </div>
  `
})
export class PaymentModalComponent {
  private paymentService = inject(PaymentService);

  // Inputs
  courseInfo = input.required<CoursePaymentInfo>();

  // Outputs
  close = output<boolean | void>();
  paymentComplete = output<void>();

  // State
  selectedMethod = signal<PaymentMethod>('SIMULATED');
  paymentSuccess = signal(false);

  // Computed from service
  isProcessing = this.paymentService.isProcessing;
  error = this.paymentService.error;

  // Available payment methods
  paymentMethods = PAYMENT_METHODS;

  onBackdropClick(event: MouseEvent): void {
    if (!this.isProcessing()) {
      this.close.emit();
    }
  }

  async processPayment(): Promise<void> {
    try {
      const info = this.courseInfo();
      const amount = info.salePrice ?? info.price;

      await this.paymentService.checkout(
        info.courseId,
        amount,
        this.selectedMethod()
      );

      this.paymentSuccess.set(true);
      this.paymentComplete.emit();
    } catch (error) {
      // Error is handled by service and displayed via error signal
    }
  }
}
