import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-gray-900">LMS Maritime</h1>
        </div>

        <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          @if (resetSuccess()) {
            <!-- Success State -->
            <div class="p-8 text-center">
              <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h2 class="text-xl font-bold text-gray-900 mb-2">Đặt lại mật khẩu thành công!</h2>
              <p class="text-gray-600 mb-6">Mật khẩu của bạn đã được cập nhật. Bạn sẽ được chuyển đến trang đăng nhập...</p>
              <a routerLink="/auth/login"
                 class="inline-block w-full py-3 text-center rounded-xl bg-[#0056D2] hover:bg-[#004BB5] text-white font-semibold transition-colors">
                Đăng nhập ngay
              </a>
            </div>
          } @else {
            <!-- Header -->
            <div class="bg-[#0056D2] p-6 text-white">
              <h2 class="text-xl font-bold">Đặt lại mật khẩu</h2>
              <p class="text-white/80 text-sm mt-1">Nhập mật khẩu mới cho tài khoản của bạn</p>
            </div>

            <!-- Form -->
            <div class="p-6">
              @if (errorMessage()) {
                <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {{ errorMessage() }}
                </div>
              }

              @if (!token()) {
                <div class="text-center py-4">
                  <p class="text-gray-600 mb-4">Liên kết đặt lại mật khẩu không hợp lệ hoặc bị thiếu.</p>
                  <a routerLink="/auth/forgot-password"
                     class="text-[#0056D2] hover:text-[#004BB5] font-medium">
                    Yêu cầu liên kết mới
                  </a>
                </div>
              } @else {
                <form [formGroup]="form" (ngSubmit)="onSubmit()">
                  <!-- New Password -->
                  <div class="mb-4">
                    <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                    <input id="newPassword" type="password" formControlName="newPassword"
                           class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] outline-none transition-all"
                           placeholder="Ít nhất 6 ký tự">
                    @if (form.get('newPassword')?.touched && form.get('newPassword')?.errors) {
                      <p class="mt-1 text-sm text-red-600">Mật khẩu phải có ít nhất 6 ký tự</p>
                    }
                  </div>

                  <!-- Confirm Password -->
                  <div class="mb-6">
                    <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
                    <input id="confirmPassword" type="password" formControlName="confirmPassword"
                           class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] outline-none transition-all"
                           placeholder="Nhập lại mật khẩu mới">
                    @if (passwordMismatch()) {
                      <p class="mt-1 text-sm text-red-600">Mật khẩu xác nhận không khớp</p>
                    }
                  </div>

                  <!-- Submit -->
                  <button type="submit"
                          [disabled]="isLoading() || form.invalid || passwordMismatch()"
                          class="w-full py-3 rounded-xl bg-[#0056D2] hover:bg-[#004BB5] text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    @if (isLoading()) {
                      <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Đang xử lý...</span>
                    } @else {
                      <span>Đặt lại mật khẩu</span>
                    }
                  </button>
                </form>

                <div class="mt-4 text-center">
                  <a routerLink="/auth/login" class="text-sm text-[#0056D2] hover:text-[#004BB5] font-medium">
                    Quay lại đăng nhập
                  </a>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  token = signal<string | null>(null);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  resetSuccess = signal(false);

  form: FormGroup = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get('token'));
  }

  passwordMismatch(): boolean {
    const pw = this.form.get('newPassword')?.value;
    const confirm = this.form.get('confirmPassword')?.value;
    return confirm?.length > 0 && pw !== confirm;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.passwordMismatch()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await fetch(`${environment.apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: this.token(),
          newPassword: this.form.get('newPassword')?.value
        })
      }).then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Đặt lại mật khẩu thất bại');
        }
      });

      this.resetSuccess.set(true);
      setTimeout(() => this.router.navigate(['/auth/login']), 3000);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
