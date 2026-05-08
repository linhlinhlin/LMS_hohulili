import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiClient } from '../../../api/client/api-client';
import { AUTH_ENDPOINTS } from '../../../api/endpoints/auth.endpoints';
import { SeoService } from '../../../core/services/seo.service';

type ForgotPasswordForm = {
  email: FormControl<string>;
};

@Component({
  selector: 'app-forgot-password',
  imports: [RouterModule, ReactiveFormsModule],
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

      .auth-success-email {
        font-weight: 700;
        color: var(--auth-text);
      }

      .auth-success-hint {
        margin: 16px 0 0;
        font-size: 0.85rem;
        color: var(--auth-text-muted);
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

      .auth-primary:focus-visible {
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
              <p class="auth-brand-kicker">HoLiLiHu Online</p>
              <p class="auth-brand-title">LMS Maritime</p>
            </div>
          </a>

          <section class="auth-card">
            @if (emailSent()) {
              <div class="auth-success-card">
                <div class="auth-success-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                </div>
                <h1 class="auth-card-title">Kiểm tra hộp thư</h1>
                <p class="auth-card-copy" style="margin-top: 8px">
                  Hướng dẫn khôi phục mật khẩu đã được gửi đến
                  <span class="auth-success-email">{{ lastEmailSent() }}</span>
                </p>
                <p class="auth-success-hint">Không nhận được? Kiểm tra thư mục spam hoặc thử lại.</p>

                <div style="margin-top: 20px">
                  <button type="button" (click)="resetForm()" class="auth-primary">
                    Gửi lại email
                  </button>
                </div>
              </div>
            } @else {
              <div class="auth-card-header">
                <h1 class="auth-card-title">Quên mật khẩu?</h1>
                <p class="auth-card-copy">Nhập email để nhận hướng dẫn khôi phục</p>
              </div>

              @if (errorMessage()) {
                <div class="auth-banner auth-banner-error" role="alert" id="forgot-error" aria-live="assertive">
                  {{ errorMessage() }}
                  <button type="button" class="auth-banner-close" (click)="errorMessage.set('')" aria-label="Đóng thông báo lỗi">&times;</button>
                </div>
              }

              <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()" class="auth-section" novalidate>
                <div class="auth-field">
                  <label for="email" class="auth-label">Email</label>
                  <input
                    id="email"
                    type="email"
                    formControlName="email"
                    autocomplete="email"
                    inputmode="email"
                    autofocus
                    placeholder="you@maritime.edu.vn"
                    class="auth-input"
                    [attr.aria-invalid]="forgotPasswordForm.controls.email.invalid && forgotPasswordForm.controls.email.touched ? 'true' : null"
                    [attr.aria-describedby]="forgotPasswordForm.controls.email.invalid && forgotPasswordForm.controls.email.touched ? 'email-error' : null"
                  >
                  @if (forgotPasswordForm.controls.email.invalid && forgotPasswordForm.controls.email.touched) {
                    <p class="auth-input-note" id="email-error" role="alert">
                      @if (forgotPasswordForm.controls.email.errors?.['required']) {
                        Vui lòng nhập địa chỉ email.
                      } @else {
                        Địa chỉ email không hợp lệ.
                      }
                    </p>
                  }
                </div>

                <button
                  type="submit"
                  [disabled]="forgotPasswordForm.invalid || isLoading()"
                  class="auth-primary"
                >
                  @if (isLoading()) {
                    <svg class="mr-3 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Đang gửi...
                  } @else {
                    Gửi hướng dẫn khôi phục
                  }
                </button>
              </form>
            }

            <div class="auth-footer">
              <p>
                Nhớ mật khẩu?
                <a routerLink="/auth/login">Đăng nhập</a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private apiClient = inject(ApiClient);
  private seo = inject(SeoService);

  forgotPasswordForm: FormGroup<ForgotPasswordForm>;
  readonly emailSent = signal(false);
  readonly lastEmailSent = signal('');
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  constructor() {
    // SEO Phase 5: account recovery page should not be indexed
    this.seo.setNoindex();
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    }) as FormGroup<ForgotPasswordForm>;
  }

  async onSubmit(): Promise<void> {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const email = this.forgotPasswordForm.controls.email.value;
      await firstValueFrom(
        this.apiClient.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, { email }).pipe(timeout(15000))
      );
      this.emailSent.set(true);
      this.lastEmailSent.set(email);
    } catch (err: any) {
      if (err?.name === 'TimeoutError') {
        this.errorMessage.set('Máy chủ không phản hồi. Vui lòng kiểm tra kết nối mạng và thử lại.');
      } else if (err?.status === 429) {
        this.errorMessage.set('Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi vài phút rồi thử lại.');
      } else {
        this.errorMessage.set('Không thể gửi email. Vui lòng thử lại sau.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  resetForm(): void {
    this.emailSent.set(false);
    this.lastEmailSent.set('');
    this.forgotPasswordForm.reset();
  }
}
