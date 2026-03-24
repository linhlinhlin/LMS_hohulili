import {
  Component, inject, signal, computed, input, output,
  OnInit, OnDestroy, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from './payment.service';
import { SepayQrData } from '../../api/client/payment.api';

/**
 * SePay QR Code Payment Modal
 *
 * Displays a QR code + bank transfer info, countdown timer,
 * and auto-polls the backend every 5 s until payment confirmed.
 *
 * Flow:
 *  1. Parent passes qrData (qrUrl, transferContent, bank info, amount)
 *  2. This component shows QR + payment details
 *  3. Every 5 s: polls /api/v3/payments/sepay/poll/{txnId}
 *  4. When hasPaid=true → closes and lets parent re-read backend truth
 */
@Component({
  selector: 'app-sepay-qr-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
         (click)="onBackdropClick($event)">
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
           (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="relative bg-[#0056D2] px-6 py-5 text-white">
          <button (click)="cancel()"
                  class="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  aria-label="Đóng">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <h2 class="text-xl font-bold">Thanh toán chuyển khoản QR</h2>
          <p class="text-white/80 text-sm mt-1">{{ qrData().courseTitle }}</p>
        </div>

        @if (isExpired()) {
          <!-- Expired State -->
          <div class="p-8 text-center">
            <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <svg class="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">QR đã hết hạn</h3>
            <p class="text-gray-500 text-sm mb-6">Mã QR chỉ có hiệu lực trong 15 phút. Vui lòng tạo QR mới để tiếp tục thanh toán.</p>
            <button (click)="cancel()"
                    class="w-full py-3 px-6 rounded-xl bg-[#0056D2] hover:bg-[#004BB5] text-white font-semibold transition-all">
              Tạo QR mới
            </button>
          </div>
        } @else {
          <div class="p-5">
            <!-- Amount + countdown row -->
            <div class="flex items-center justify-between mb-4">
              <div>
                <p class="text-xs text-gray-500">Số tiền</p>
                <p class="text-2xl font-bold text-[#0056D2]">{{ qrData().amount | number:'1.0-0' }}₫</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-gray-500">Hết hạn sau</p>
                <p class="text-xl font-mono font-bold" [class.text-red-500]="secondsLeft() < 60" [class.text-orange-500]="secondsLeft() >= 60 && secondsLeft() < 300" [class.text-gray-700]="secondsLeft() >= 300">
                  {{ countdown() }}
                </p>
              </div>
            </div>

            <!-- QR Code -->
            <div class="flex justify-center mb-4">
              <div class="relative">
                <img [src]="qrData().qrUrl"
                     alt="QR thanh toán SePay"
                     class="w-56 h-56 border-4 border-gray-100 rounded-xl shadow-md"
                     (error)="qrLoadError.set(true)">
                @if (qrLoadError()) {
                  <div class="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-xl">
                    <p class="text-sm text-gray-500 text-center px-4">Không tải được QR. Dùng thông tin bên dưới để chuyển khoản.</p>
                  </div>
                }
              </div>
            </div>

            <!-- Bank transfer info -->
            <div class="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Ngân hàng</span>
                <span class="font-semibold text-gray-900">{{ qrData().bankCode }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Số tài khoản</span>
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-gray-900 font-mono">{{ qrData().accountNumber }}</span>
                  <button (click)="copy(qrData().accountNumber)" class="text-[#0056D2] hover:text-[#004BB5]" title="Sao chép">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Tên tài khoản</span>
                <span class="font-semibold text-gray-900">{{ qrData().accountName }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Số tiền</span>
                <span class="font-bold text-[#0056D2]">{{ qrData().amount | number:'1.0-0' }}₫</span>
              </div>
              <div class="flex justify-between items-start">
                <span class="text-gray-500 shrink-0">Nội dung CK</span>
                <div class="flex items-center gap-2 min-w-0">
                  <span class="font-semibold text-gray-900 font-mono text-xs truncate max-w-[160px]" [title]="qrData().transferContent">{{ qrData().transferContent }}</span>
                  <button (click)="copy(qrData().transferContent)" class="text-[#0056D2] hover:text-[#004BB5] shrink-0" title="Sao chép">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Copy feedback -->
            @if (copyFeedback()) {
              <p class="text-center text-sm text-green-600 mt-2">Đã sao chép!</p>
            }

            <!-- Status indicator -->
            <div class="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
              <svg class="w-4 h-4 animate-spin text-[#0056D2]" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span>Đang chờ xác nhận chuyển khoản...</span>
            </div>

            <!-- Important note -->
            <p class="text-xs text-gray-400 text-center mt-3">
              Vui lòng nhập đúng nội dung chuyển khoản. Hệ thống tự động xác nhận trong vòng 1–2 phút.
            </p>
          </div>
        }
      </div>
    </div>
  `
})
export class SepayQrModalComponent implements OnInit, OnDestroy {
  private paymentService = inject(PaymentService);

  qrData = input.required<SepayQrData>();
  paymentComplete = output<void>();
  close = output<void>();

  qrLoadError = signal(false);
  copyFeedback = signal(false);
  secondsLeft = signal(15 * 60); // 15 minutes

  isExpired = computed(() => this.secondsLeft() <= 0);

  countdown = computed(() => {
    const s = this.secondsLeft();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  });

  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startPolling();
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.stopCountdown();
  }

  private startPolling(): void {
    this.pollInterval = setInterval(async () => {
      if (this.secondsLeft() <= 0) {
        this.stopPolling();
        return;
      }
      const result = await this.paymentService.pollSepayStatus(this.qrData().txnId);
      if (result.hasPaid) {
        this.stopPolling();
        this.stopCountdown();
        this.paymentComplete.emit();
        this.close.emit();
        return;
      }
    }, 5000);
  }

  private startCountdown(): void {
    this.countdownInterval = setInterval(() => {
      const current = this.secondsLeft();
      if (current <= 0) {
        this.stopCountdown();
        this.stopPolling(); // QR expired — stop polling immediately
        return;
      }
      this.secondsLeft.set(current - 1);
    }, 1000);
  }

  private stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private stopCountdown(): void {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  cancel(): void {
    this.stopPolling();
    this.stopCountdown();
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    this.cancel();
  }

  copy(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copyFeedback.set(true);
      setTimeout(() => this.copyFeedback.set(false), 2000);
    });
  }
}
