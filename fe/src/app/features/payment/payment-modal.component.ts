import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PaymentAccessActivationResult,
  PaymentService
} from './payment.service';
import { PAYMENT_METHODS, PaymentMethod, PaymentResponse, SepayQrData } from '../../api/client/payment.api';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { SepayQrModalComponent } from './sepay-qr-modal.component';

type PaymentMethodOption = (typeof PAYMENT_METHODS)[number];

/**
 * Payment Modal Component
 *
 * Runtime truth:
 * - payment completion does not always mean learning access is immediately ready
 * - payment methods must reflect current backend/admin gateway availability
 * - SePay success should re-read backend transaction truth before showing access messaging
 */

export interface CoursePaymentInfo {
  courseId: string;
  title: string;
  thumbnail: string;
  price: number;
  salePrice?: number;
  instructorName: string;
}

export interface PaymentCompletionOutcome {
  accessActivation: PaymentAccessActivationResult;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-payment-modal',
  imports: [CommonModule, FormsModule, IconComponent, SepayQrModalComponent],
  template: `
    @if (sepayQrData()) {
      <app-sepay-qr-modal
        [qrData]="sepayQrData()!"
        (paymentComplete)="onSepayPaymentComplete()"
        (close)="onSepayClose()">
      </app-sepay-qr-modal>
    } @else {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
           (click)="onBackdropClick($event)">
        <div class="max-w-lg w-full overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
             (click)="$event.stopPropagation()">

          <div class="relative bg-[#0056D2] p-6 text-white">
            <button (click)="close.emit()"
                    class="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                    aria-label="Đóng">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
            <h2 class="text-2xl font-bold">Thanh toán khóa học</h2>
            <p class="mt-1 text-sm text-white/80">Mở khóa toàn bộ nội dung học tập</p>
          </div>

          @if (paymentSuccess()) {
            <div class="p-8 text-center">
              <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <svg class="h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h3 class="mb-2 text-2xl font-bold text-gray-900">
                <app-icon name="party" size="md" class="text-emerald-500"/>
                {{ successTitle() }}
              </h3>
              <p class="mb-4 text-gray-600">{{ successMessage() }}</p>

              @if (accessActivation().message) {
                <div class="mb-6 rounded-xl border px-4 py-3 text-left text-sm"
                     [class.border-amber-200]="accessActivation().state === 'MANUAL_ACTIVATION_REQUIRED'"
                     [class.bg-amber-50]="accessActivation().state === 'MANUAL_ACTIVATION_REQUIRED'"
                     [class.text-amber-800]="accessActivation().state === 'MANUAL_ACTIVATION_REQUIRED'"
                     [class.border-[#0056D2]/20]="accessActivation().state !== 'MANUAL_ACTIVATION_REQUIRED'"
                     [class.bg-[#0056D2]/5]="accessActivation().state !== 'MANUAL_ACTIVATION_REQUIRED'"
                     [class.text-[#0F172A]]="accessActivation().state !== 'MANUAL_ACTIVATION_REQUIRED'">
                  {{ accessActivation().message }}
                </div>
              }

              <button (click)="completeSuccessFlow()"
                      class="w-full rounded-xl px-6 py-3 font-semibold text-white transition-all hover:shadow-lg"
                      [class.bg-gradient-to-r]="accessActivation().state === 'READY'"
                      [class.from-green-500]="accessActivation().state === 'READY'"
                      [class.to-emerald-600]="accessActivation().state === 'READY'"
                      [class.bg-[#0056D2]]="accessActivation().state !== 'READY'"
                      [class.hover:bg-[#004BB5]]="accessActivation().state !== 'READY'">
                {{ primaryActionLabel() }}
              </button>
            </div>
          } @else {
            <div class="p-6">
              <div class="mb-6 flex gap-4 rounded-xl bg-gray-50 p-4">
                <img [src]="courseInfo().thumbnail || '/icons/icon-192x192.png'"
                     [alt]="courseInfo().title"
                     class="h-16 w-24 rounded-lg object-cover"
                     (error)="$any($event.target).src='/icons/icon-192x192.png'">
                <div class="min-w-0 flex-1">
                  <h3 class="truncate font-semibold text-gray-900">{{ courseInfo().title }}</h3>
                  <p class="text-sm text-gray-500">{{ courseInfo().instructorName }}</p>
                </div>
              </div>

              <div class="mb-6 flex items-center justify-between rounded-xl bg-[#0056D2]/5 p-4">
                <span class="font-medium text-gray-700">Tổng thanh toán</span>
                <div class="text-right">
                  @if (courseInfo().salePrice && (courseInfo().salePrice ?? 0) < courseInfo().price) {
                    <span class="mr-2 text-sm text-gray-400 line-through">
                      {{ courseInfo().price | number:'1.0-0' }}₫
                    </span>
                    <span class="text-2xl font-bold text-[#0056D2]">
                      {{ courseInfo().salePrice | number:'1.0-0' }}₫
                    </span>
                  } @else {
                    <span class="text-2xl font-bold text-[#0056D2]">
                      {{ courseInfo().price | number:'1.0-0' }}₫
                    </span>
                  }
                </div>
              </div>

              <div class="mb-6">
                <label class="mb-3 block text-sm font-medium text-gray-700">Chọn phương thức thanh toán</label>
                @if (isLoadingMethods()) {
                  <div class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    Đang tải phương thức thanh toán khả dụng...
                  </div>
                } @else if (gatewayLoadError()) {
                  <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {{ gatewayLoadError() }}
                  </div>
                } @else if (paymentMethods().length === 0) {
                  <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Hiện chưa có phương thức thanh toán nào sẵn sàng. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.
                  </div>
                } @else {
                  <div class="space-y-2">
                    @for (method of paymentMethods(); track method.code) {
                      <label class="flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all"
                             [class.border-[#0056D2]]="selectedMethod() === method.code"
                             [class.bg-[#0056D2]/5]="selectedMethod() === method.code"
                             [class.border-gray-200]="selectedMethod() !== method.code"
                             [class.hover:border-gray-300]="selectedMethod() !== method.code">
                        <input type="radio"
                               name="paymentMethod"
                               [value]="method.code"
                               [checked]="selectedMethod() === method.code"
                               (change)="selectedMethod.set(method.code)"
                               class="h-4 w-4 text-[#0056D2]">
                        <app-icon [name]="method.icon" size="md" class="text-[#0056D2]"/>
                        <div class="flex-1">
                          <div class="font-medium text-gray-900">{{ method.name }}</div>
                          <div class="text-xs text-gray-500">{{ method.description }}</div>
                        </div>
                      </label>
                    }
                  </div>
                }
              </div>

              @if (error()) {
                <div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {{ error() }}
                </div>
              }

              <button (click)="processPayment()"
                      [disabled]="isProcessing() || isLoadingMethods() || !selectedMethod() || paymentMethods().length === 0"
                      class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0056D2] px-6 py-4 text-lg font-bold text-white transition-all hover:bg-[#004BB5] disabled:cursor-not-allowed disabled:opacity-50">
                @if (isProcessing()) {
                  <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Đang xử lý...</span>
                } @else {
                  <span>Thanh toán {{ (courseInfo().salePrice ?? courseInfo().price) | number:'1.0-0' }}₫</span>
                }
              </button>

              <p class="mt-4 text-center text-xs text-gray-400">
                <app-icon name="shield" size="sm" class="mr-1 text-emerald-600"/>
                @if (selectedMethod() === 'SEPAY') {
                  Thanh toán qua SePay, dùng chuyển khoản ngân hàng an toàn.
                } @else if (selectedMethod() === 'VNPAY') {
                  Thanh toán được bảo mật qua cổng VNPay.
                } @else if (selectedMethod() === 'SIMULATED') {
                  Mô phỏng thanh toán chỉ dùng cho môi trường kiểm thử cục bộ.
                } @else {
                  Chọn phương thức đang khả dụng để tiếp tục thanh toán.
                }
              </p>
            </div>
          }
        </div>
      </div>
    }
  `
})
export class PaymentModalComponent implements OnInit {
  private paymentService = inject(PaymentService);

  courseInfo = input.required<CoursePaymentInfo>();

  close = output<boolean | void>();
  paymentComplete = output<PaymentCompletionOutcome>();

  selectedMethod = signal<PaymentMethod | null>(null);
  paymentSuccess = signal(false);
  sepayQrData = signal<SepayQrData | null>(null);
  accessActivation = signal<PaymentAccessActivationResult>({
    state: 'READY',
    message: null
  });
  paymentMethods = signal<PaymentMethodOption[]>([]);
  isLoadingMethods = signal(true);
  gatewayLoadError = signal<string | null>(null);

  isProcessing = this.paymentService.isProcessing;
  error = this.paymentService.error;

  successTitle = computed(() => {
    switch (this.accessActivation().state) {
      case 'MANUAL_ACTIVATION_REQUIRED':
        return 'Thanh toán đã được ghi nhận';
      case 'ACCESS_PENDING':
        return 'Đã ghi nhận thanh toán';
      default:
        return 'Thanh toán thành công!';
    }
  });

  successMessage = computed(() => {
    switch (this.accessActivation().state) {
      case 'MANUAL_ACTIVATION_REQUIRED':
        return 'Bạn đã thanh toán thành công, nhưng khóa học này cần được xếp lớp trước khi bắt đầu học.';
      case 'ACCESS_PENDING':
        return 'Giao dịch đã hoàn tất. Hệ thống đang kích hoạt quyền học của bạn.';
      default:
        return 'Bạn đã mở khóa toàn bộ khóa học. Chúc bạn học tập vui vẻ!';
    }
  });

  primaryActionLabel = computed(() => {
    switch (this.accessActivation().state) {
      case 'MANUAL_ACTIVATION_REQUIRED':
        return 'Quay lại trang khóa học';
      case 'ACCESS_PENDING':
        return 'Kiểm tra lại sau';
      default:
        return 'Bắt đầu học ngay →';
    }
  });

  async ngOnInit(): Promise<void> {
    await this.loadAvailableMethods();
  }

  onBackdropClick(_event: MouseEvent): void {
    if (!this.isProcessing()) {
      this.close.emit();
    }
  }

  async processPayment(): Promise<void> {
    const info = this.courseInfo();
    const amount = info.salePrice ?? info.price;
    const method = this.selectedMethod();

    if (!method) {
      return;
    }

    try {
      if (method === 'SEPAY') {
        const qrData = await this.paymentService.createSepayPayment(info.courseId);
        this.sepayQrData.set(qrData);
        return;
      }

      const payment = await this.paymentService.checkout(info.courseId, amount, method);
      await this.completePaidFlow(info.courseId, payment);
    } catch (error: any) {
      const msg: string = error?.error?.message || error?.message || '';
      if (msg.includes('đã thanh toán') || msg.includes('already paid') || msg.includes('already enrolled')) {
        await this.completePaidFlow(info.courseId);
      }
    }
  }

  async onSepayPaymentComplete(): Promise<void> {
    const qrData = this.sepayQrData();

    let payment: PaymentResponse | undefined;
    if (qrData?.txnId) {
      try {
        payment = await this.paymentService.getPaymentByTxnRef(qrData.txnId);
      } catch {
        payment = undefined;
      }
    }

    if (payment?.courseId && payment.status === 'COMPLETED') {
      await this.completePaidFlow(payment.courseId, payment);
    } else {
      await this.completePaidFlow(this.courseInfo().courseId);
    }

    this.sepayQrData.set(null);
  }

  onSepayClose(): void {
    this.sepayQrData.set(null);
  }

  completeSuccessFlow(): void {
    this.close.emit(this.accessActivation().state === 'READY' ? true : undefined);
  }

  private async loadAvailableMethods(): Promise<void> {
    this.isLoadingMethods.set(true);
    this.gatewayLoadError.set(null);

    try {
      const availability = await this.paymentService.getAvailablePaymentMethods();
      const methods = PAYMENT_METHODS.filter(method => availability.availableMethods.includes(method.code));
      this.paymentMethods.set(methods);
      this.selectedMethod.set(
        methods.find(method => method.code === availability.defaultMethod)?.code
          ?? methods[0]?.code
          ?? null
      );
    } catch (error: any) {
      this.paymentMethods.set([]);
      this.selectedMethod.set(null);
      this.gatewayLoadError.set(error?.message || 'Không thể tải phương thức thanh toán hiện có.');
    } finally {
      this.isLoadingMethods.set(false);
    }
  }

  private async completePaidFlow(courseId: string, payment?: PaymentResponse): Promise<void> {
    if (payment?.accessActivationState) {
      const activation = {
        state: payment.accessActivationState,
        message: payment.accessActivationMessage ?? null
      } satisfies PaymentAccessActivationResult;
      this.accessActivation.set(activation);
      this.paymentSuccess.set(true);
      this.paymentComplete.emit({ accessActivation: activation });
      return;
    }

    try {
      const state = await this.paymentService.loadPaymentStatus(courseId);
      if (!state.hasPaid) {
        const activation = {
          state: 'ACCESS_PENDING',
          message: 'Hệ thống chưa xác nhận giao dịch hoàn tất. Vui lòng kiểm tra lại trong lịch sử thanh toán sau ít phút.'
        } satisfies PaymentAccessActivationResult;
        this.accessActivation.set(activation);
        this.paymentSuccess.set(true);
        this.paymentComplete.emit({ accessActivation: activation });
        return;
      }

      if (state.accessActivationState) {
        const activation = {
          state: state.accessActivationState,
          message: state.accessActivationMessage ?? null
        } satisfies PaymentAccessActivationResult;
        this.accessActivation.set(activation);
        this.paymentSuccess.set(true);
        this.paymentComplete.emit({ accessActivation: activation });
        return;
      }
    } catch {
      // Fall back to the enrollment/access convergence path below.
    }

    const activation = await this.paymentService.ensureEnrollment(courseId);
    this.accessActivation.set(activation);
    this.paymentSuccess.set(true);
    this.paymentComplete.emit({ accessActivation: activation });
  }
}
