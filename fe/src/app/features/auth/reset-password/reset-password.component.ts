import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiClient } from '../../../api/client/api-client';
import { AUTH_ENDPOINTS } from '../../../api/endpoints/auth.endpoints';
import { firstValueFrom, timeout } from 'rxjs';

type ResetPasswordForm = {
  newPassword: FormControl<string>;
  confirmPassword: FormControl<string>;
};

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterModule],
  template: `
    <style>
      :host {
        display: block;
        --auth-primary: #0056d2;
        --auth-primary-hover: #004bb8;
        --auth-border: #e5e7eb;
        --auth-border-strong: #d1d5db;
        --auth-text: #111827;
        --auth-text-secondary: #4b5563;
        --auth-text-muted: #6b7280;
        --auth-error-bg: #fef2f2;
        --auth-error-border: #fecaca;
        --auth-error-text: #b91c1c;
        --auth-success-bg: #f0fdf4;
        --auth-success-border: #bbf7d0;
        --auth-success-text: #166534;
        --auth-shadow-card: 0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06);
      }

      .auth-shell {
        min-height: 100vh;
        background: #fafafa;
      }

      .auth-page {
        min-height: 100vh;
        padding: 24px 16px 32px;
        padding-left: max(16px, env(safe-area-inset-left));
        padding-right: max(16px, env(safe-area-inset-right));
        padding-bottom: max(32px, env(safe-area-inset-bottom));
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .auth-frame {
        width: min(100%, 432px);
        display: grid;
        gap: 14px;
      }

      .auth-brand {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        text-decoration: none;
      }

      .auth-brand-kicker {
        margin: 0;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--auth-text-muted);
      }

      .auth-brand-title {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 700;
        line-height: 1.1;
        color: var(--auth-text);
      }

      .auth-card {
        width: 100%;
        padding: 24px 20px;
        border-radius: 16px;
        border: 1px solid var(--auth-border);
        background: #ffffff;
        box-shadow: var(--auth-shadow-card);
      }

      .auth-card-header {
        display: grid;
        gap: 6px;
        margin-bottom: 20px;
        text-align: center;
        justify-items: center;
      }

      .auth-card-title {
        margin: 0;
        font-size: clamp(1.45rem, 4.4vw, 1.7rem);
        line-height: 1.14;
        font-weight: 700;
        color: var(--auth-text);
      }

      .auth-card-copy {
        margin: 0;
        max-width: 34ch;
        font-size: 0.95rem;
        line-height: 1.68;
        color: var(--auth-text-secondary);
      }

      .auth-section {
        display: grid;
        gap: 16px;
      }

      .auth-field {
        display: grid;
        gap: 8px;
      }

      .auth-label {
        font-size: 0.9rem;
        font-weight: 600;
        color: #374151;
      }

      .auth-input {
        min-height: 48px;
        width: 100%;
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid var(--auth-border-strong);
        background: #ffffff;
        font-size: 0.96rem;
        color: var(--auth-text);
        transition: border-color 0.18s ease, box-shadow 0.18s ease;
      }

      .auth-input::placeholder { color: #9ca3af; }

      .auth-input:focus {
        outline: none;
        border-color: var(--auth-primary);
        box-shadow: 0 0 0 4px rgba(0, 86, 210, 0.12);
      }

      .auth-input-note {
        font-size: 0.85rem;
        line-height: 1.5;
        color: #dc2626;
      }

      .auth-input-hint {
        font-size: 0.82rem;
        line-height: 1.4;
        color: var(--auth-text-muted);
      }

      .auth-password-wrap {
        position: relative;
      }

      .auth-password-toggle {
        position: absolute;
        top: 50%;
        right: 8px;
        transform: translateY(-50%);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: var(--auth-text-muted);
        cursor: pointer;
      }

      .auth-password-toggle:hover {
        background: #f3f4f6;
        color: #374151;
      }

      .auth-banner {
        position: relative;
        margin-bottom: 16px;
        border-radius: 10px;
        padding: 14px 16px;
        font-size: 0.9rem;
        line-height: 1.6;
      }

      .auth-banner-error {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        border: 1px solid var(--auth-error-border);
        background: var(--auth-error-bg);
        color: var(--auth-error-text);
      }

      .auth-banner-close {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--auth-error-text);
        font-size: 1.2rem;
        cursor: pointer;
        opacity: 0.6;
      }

      .auth-banner-close:hover {
        opacity: 1;
        background: rgba(185, 28, 28, 0.08);
      }

      .auth-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 48px;
        padding: 0 18px;
        border: 0;
        border-radius: 14px;
        background: var(--auth-primary);
        color: #ffffff;
        font-size: 0.94rem;
        font-weight: 700;
        cursor: pointer;
        transition: background-color 0.18s ease, box-shadow 0.18s ease;
      }

      .auth-primary:hover:not(:disabled) {
        background: var(--auth-primary-hover);
        box-shadow: 0 2px 8px rgba(0, 86, 210, 0.18);
      }

      .auth-primary:disabled {
        cursor: not-allowed;
        opacity: 0.58;
      }

      .auth-success-card {
        text-align: center;
      }

      .auth-success-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        margin: 0 auto 16px;
        border-radius: 999px;
        background: var(--auth-success-bg);
        border: 1px solid var(--auth-success-border);
      }

      .auth-success-icon svg {
        width: 28px;
        height: 28px;
        color: var(--auth-success-text);
      }

      .auth-footer {
        margin-top: 18px;
        padding-top: 16px;
        border-top: 1px solid var(--auth-border);
        display: grid;
        gap: 10px;
        font-size: 0.88rem;
        color: var(--auth-text-secondary);
        text-align: center;
      }

      .auth-footer a {
        color: var(--auth-primary);
        font-weight: 600;
        text-decoration: none;
      }

      .auth-footer a:hover {
        color: var(--auth-primary-hover);
        text-decoration: underline;
      }

      .auth-primary:focus-visible,
      .auth-password-toggle:focus-visible {
        outline: 2px solid var(--auth-primary);
        outline-offset: 2px;
      }

      @media (min-width: 640px) {
        .auth-page { padding: 32px 20px 40px; }
        .auth-card { padding: 28px 24px; }
      }

      @media (min-width: 768px) {
        .auth-page { padding: 40px 24px; }
        .auth-frame { gap: 18px; }
        .auth-card { padding: 32px 28px; }
      }
    </style>

    <div class="auth-shell">
      <div class="auth-page">
        <div class="auth-frame">
          <a routerLink="/" class="auth-brand">
            <img src="/icons/logo-master.png" alt="LMS Maritime" class="h-11 w-11 rounded-2xl shadow-sm">
            <div>
              <p class="auth-brand-kicker">LMS Maritime</p>
              <p class="auth-brand-title">HoHoLiHu</p>
            </div>
          </a>

          <section class="auth-card">
            @if (resetSuccess()) {
              <div class="auth-success-card">
                <div class="auth-success-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <h1 class="auth-card-title">Đặt lại thành công!</h1>
                <p class="auth-card-copy" style="margin-top: 8px">
                  Mật khẩu đã được cập nhật. Đang chuyển đến trang đăng nhập...
                </p>
                <div style="margin-top: 20px">
                  <a routerLink="/auth/login" class="auth-primary" style="text-decoration: none; display: flex">
                    Đăng nhập ngay
                  </a>
                </div>
              </div>
            } @else if (!token()) {
              <div class="auth-card-header">
                <h1 class="auth-card-title">Liên kết không hợp lệ</h1>
                <p class="auth-card-copy">Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p>
              </div>
              <a routerLink="/auth/forgot-password" class="auth-primary" style="text-decoration: none; display: flex">
                Yêu cầu liên kết mới
              </a>
            } @else {
              <div class="auth-card-header">
                <h1 class="auth-card-title">Đặt lại mật khẩu</h1>
                <p class="auth-card-copy">Nhập mật khẩu mới cho tài khoản của bạn</p>
              </div>

              @if (errorMessage()) {
                <div class="auth-banner auth-banner-error" role="alert" id="reset-error" aria-live="assertive">
                  {{ errorMessage() }}
                  <button type="button" class="auth-banner-close" (click)="errorMessage.set('')" aria-label="Đóng thông báo lỗi">&times;</button>
                </div>
              }

              <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-section" novalidate>
                <div class="auth-field">
                  <label for="newPassword" class="auth-label">Mật khẩu mới</label>
                  <div class="auth-password-wrap">
                    <input
                      id="newPassword"
                      [type]="showPassword() ? 'text' : 'password'"
                      formControlName="newPassword"
                      autocomplete="new-password"
                      autofocus
                      placeholder="Nhập mật khẩu mới"
                      class="auth-input"
                      style="padding-right: 48px"
                      aria-describedby="password-hint"
                    >
                    <button
                      type="button"
                      class="auth-password-toggle"
                      (click)="showPassword.set(!showPassword())"
                      [attr.aria-pressed]="showPassword()"
                      aria-label="Hiển thị hoặc ẩn mật khẩu"
                    >
                      @if (showPassword()) {
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      } @else {
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      }
                    </button>
                  </div>
                  @if (form.controls.newPassword.invalid && form.controls.newPassword.touched) {
                    <p class="auth-input-note" id="password-hint" role="alert">Mật khẩu phải có ít nhất 8 ký tự.</p>
                  } @else {
                    <p class="auth-input-hint" id="password-hint">Tối thiểu 8 ký tự</p>
                  }
                </div>

                <div class="auth-field">
                  <label for="confirmPassword" class="auth-label">Xác nhận mật khẩu</label>
                  <div class="auth-password-wrap">
                    <input
                      id="confirmPassword"
                      [type]="showConfirm() ? 'text' : 'password'"
                      formControlName="confirmPassword"
                      autocomplete="new-password"
                      placeholder="Nhập lại mật khẩu mới"
                      class="auth-input"
                      style="padding-right: 48px"
                      [attr.aria-describedby]="passwordMismatch() ? 'confirm-error' : null"
                    >
                    <button
                      type="button"
                      class="auth-password-toggle"
                      (click)="showConfirm.set(!showConfirm())"
                      [attr.aria-pressed]="showConfirm()"
                      aria-label="Hiển thị hoặc ẩn mật khẩu"
                    >
                      @if (showConfirm()) {
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      } @else {
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      }
                    </button>
                  </div>
                  @if (passwordMismatch()) {
                    <p class="auth-input-note" id="confirm-error" role="alert">Mật khẩu xác nhận không khớp.</p>
                  }
                </div>

                <button
                  type="submit"
                  [disabled]="form.invalid || isLoading() || passwordMismatch()"
                  class="auth-primary"
                >
                  @if (isLoading()) {
                    <svg class="mr-3 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Đang xử lý...
                  } @else {
                    Đặt lại mật khẩu
                  }
                </button>
              </form>
            }

            <div class="auth-footer">
              <p>
                <a routerLink="/auth/login">Quay lại đăng nhập</a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private apiClient = inject(ApiClient);

  readonly token = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly resetSuccess = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirm = signal(false);

  form: FormGroup<ResetPasswordForm> = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }) as FormGroup<ResetPasswordForm>;

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get('token'));
  }

  passwordMismatch(): boolean {
    const pw = this.form.controls.newPassword.value;
    const confirm = this.form.controls.confirmPassword.value;
    return confirm.length > 0 && pw !== confirm;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.passwordMismatch()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      await firstValueFrom(
        this.apiClient.post(AUTH_ENDPOINTS.RESET_PASSWORD, {
          token: this.token(),
          newPassword: this.form.controls.newPassword.value
        }).pipe(timeout(15000))
      );
      this.resetSuccess.set(true);
      setTimeout(() => this.router.navigateByUrl('/auth/login'), 3000);
    } catch (err: any) {
      if (err?.name === 'TimeoutError') {
        this.errorMessage.set('Máy chủ không phản hồi. Vui lòng kiểm tra kết nối mạng và thử lại.');
      } else {
        this.errorMessage.set(
          err.error?.message || 'Đặt lại mật khẩu thất bại. Liên kết có thể đã hết hạn.'
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
