import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-verify-email',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-gray-900">LMS Maritime</h1>
        </div>

        <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          @if (isLoading()) {
            <!-- Loading State -->
            <div class="p-8 text-center">
              <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-[#0056D2]/10 flex items-center justify-center">
                <svg class="animate-spin w-8 h-8 text-[#0056D2]" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 class="text-xl font-bold text-gray-900 mb-2">Đang xác nhận email...</h2>
              <p class="text-gray-600">Vui lòng đợi trong giây lát</p>
            </div>
          } @else if (verifySuccess()) {
            <!-- Success State -->
            <div class="p-8 text-center">
              <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h2 class="text-xl font-bold text-gray-900 mb-2">Xác nhận email thành công!</h2>
              <p class="text-gray-600 mb-6">Tài khoản của bạn đã được kích hoạt. Bạn có thể đăng nhập ngay bây giờ.</p>
              <a routerLink="/auth/login"
                 class="inline-block w-full py-3 text-center rounded-xl bg-[#0056D2] hover:bg-[#004BB5] text-white font-semibold transition-colors">
                Đăng nhập ngay
              </a>
            </div>
          } @else if (errorMessage()) {
            <!-- Error State -->
            <div class="p-8 text-center">
              <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </div>
              <h2 class="text-xl font-bold text-gray-900 mb-2">Xác nhận thất bại</h2>
              <p class="text-gray-600 mb-6">{{ errorMessage() }}</p>

              <div class="space-y-3">
                <button (click)="resendVerification()"
                        [disabled]="isResending()"
                        class="w-full py-3 rounded-xl border-2 border-[#0056D2] text-[#0056D2] hover:bg-[#0056D2]/5 font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  @if (isResending()) {
                    <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Đang gửi...</span>
                  } @else {
                    <span>Gửi lại email xác nhận</span>
                  }
                </button>

                <a routerLink="/auth/login"
                   class="block w-full py-3 text-center rounded-xl bg-[#0056D2] hover:bg-[#004BB5] text-white font-semibold transition-colors">
                  Quay lại đăng nhập
                </a>
              </div>

              @if (resendSuccess()) {
                <p class="mt-4 text-sm text-green-600">Email xác nhận đã được gửi lại. Vui lòng kiểm tra hộp thư.</p>
              }
            </div>
          } @else {
            <!-- No Token State -->
            <div class="p-8 text-center">
              <div class="bg-[#0056D2] -m-8 mb-6 p-6 text-white">
                <h2 class="text-xl font-bold">Xác nhận email</h2>
                <p class="text-white/80 text-sm mt-1">Kiểm tra hộp thư để xác nhận tài khoản</p>
              </div>
              <p class="text-gray-600 mb-4">Liên kết xác nhận email không hợp lệ hoặc bị thiếu.</p>
              <a routerLink="/auth/login" class="text-[#0056D2] hover:text-[#004BB5] font-medium">
                Quay lại đăng nhập
              </a>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);

  isLoading = signal(false);
  isResending = signal(false);
  verifySuccess = signal(false);
  errorMessage = signal<string | null>(null);
  resendSuccess = signal(false);
  private userEmail = signal<string | null>(null);

  ngOnInit(): void {
    this.seo.setNoindex();

    const token = this.route.snapshot.queryParamMap.get('token');
    this.userEmail.set(this.route.snapshot.queryParamMap.get('email'));

    if (token) {
      this.verifyToken(token);
    }
  }

  private async verifyToken(token: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const res = await fetch(`${environment.apiUrl}/auth/verify-email?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Xác nhận email thất bại');
      }

      this.verifySuccess.set(true);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async resendVerification(): Promise<void> {
    const email = this.userEmail();
    if (!email) {
      this.errorMessage.set('Không tìm thấy email. Vui lòng đăng ký lại.');
      return;
    }

    this.isResending.set(true);
    this.resendSuccess.set(false);

    try {
      const res = await fetch(`${environment.apiUrl}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gửi lại email thất bại');
      }

      this.resendSuccess.set(true);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      this.isResending.set(false);
    }
  }
}
