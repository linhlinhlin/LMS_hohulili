import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AUTH_ENDPOINTS } from '../../../api/endpoints/auth.endpoints';
import { ApiResponse } from '../../../api/types/common.types';

@Component({
  selector: 'app-change-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="card">
        <div class="icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h1 class="title">Đổi mật khẩu bắt buộc</h1>
        <p class="subtitle">Tài khoản của bạn vừa được tạo bởi quản trị viên. Vui lòng đổi mật khẩu trước khi tiếp tục.</p>

        @if (error()) {
          <div class="alert-error">{{ error() }}</div>
        }
        @if (success()) {
          <div class="alert-success">Đổi mật khẩu thành công! Đang chuyển hướng...</div>
        }

        <form class="form" (submit)="$event.preventDefault(); submit()">
          <div class="field">
            <label for="current">Mật khẩu hiện tại <span class="req">*</span></label>
            <input
              id="current"
              type="password"
              autocomplete="current-password"
              placeholder="Mật khẩu do quản trị viên cung cấp"
              [value]="currentPassword()"
              (input)="currentPassword.set($any($event.target).value)"
              [disabled]="submitting()" />
          </div>
          <div class="field">
            <label for="newpw">Mật khẩu mới <span class="req">*</span></label>
            <input
              id="newpw"
              type="password"
              autocomplete="new-password"
              placeholder="Tối thiểu 8 ký tự"
              [value]="newPassword()"
              (input)="newPassword.set($any($event.target).value)"
              [disabled]="submitting()" />
          </div>
          <div class="field">
            <label for="confirm">Xác nhận mật khẩu mới <span class="req">*</span></label>
            <input
              id="confirm"
              type="password"
              autocomplete="new-password"
              placeholder="Nhập lại mật khẩu mới"
              [value]="confirmPassword()"
              (input)="confirmPassword.set($any($event.target).value)"
              [disabled]="submitting()" />
            @if (confirmPassword().length > 0 && !passwordsMatch()) {
              <p class="field-error">Mật khẩu xác nhận không khớp</p>
            }
          </div>

          <button
            type="submit"
            class="btn-submit"
            [disabled]="!canSubmit() || submitting()">
            @if (submitting()) { Đang xử lý... } @else { Đổi mật khẩu }
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(15,23,42,.1);
      padding: 40px 36px;
      width: 100%;
      max-width: 440px;
    }
    .icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: #eff6ff;
      color: #0056D2;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
      margin: 0 0 8px;
    }
    .subtitle {
      font-size: 14px;
      color: #64748b;
      text-align: center;
      line-height: 1.6;
      margin: 0 0 24px;
    }
    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 14px;
      margin-bottom: 16px;
    }
    .alert-success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #16a34a;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 14px;
      margin-bottom: 16px;
    }
    .form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }
    .req { color: #dc2626; margin-left: 2px; }
    .field input {
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
      color: #0f172a;
      background: #f8fafc;
      transition: border-color .15s;
      outline: none;
      font-family: inherit;
    }
    .field input:focus { border-color: #0056D2; background: #fff; box-shadow: 0 0 0 3px rgba(0,86,210,.08); }
    .field input:disabled { opacity: .6; cursor: not-allowed; }
    .field-error { font-size: 12px; color: #dc2626; margin: 0; }
    .btn-submit {
      margin-top: 8px;
      padding: 12px;
      border: none;
      border-radius: 8px;
      background: #0056D2;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s, opacity .15s;
    }
    .btn-submit:hover:not(:disabled) { background: #004BB5; }
    .btn-submit:disabled { opacity: .5; cursor: not-allowed; }
  `]
})
export class ChangePasswordComponent {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(AuthService);

  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  submitting = signal(false);
  error = signal('');
  success = signal(false);

  passwordsMatch = computed(() => this.newPassword() === this.confirmPassword());
  canSubmit = computed(() =>
    this.currentPassword().trim().length > 0 &&
    this.newPassword().length >= 8 &&
    this.passwordsMatch()
  );

  submit(): void {
    if (!this.canSubmit() || this.submitting()) return;

    this.submitting.set(true);
    this.error.set('');

    this.http.put<ApiResponse<string>>(AUTH_ENDPOINTS.PASSWORD, {
      currentPassword: this.currentPassword(),
      newPassword: this.newPassword()
    }).subscribe({
      next: () => {
        this.success.set(true);
        this.authService.updateLocalUser({ mustChangePassword: false });
        setTimeout(() => this.router.navigate(['/'], { replaceUrl: true }), 1500);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.');
        this.submitting.set(false);
      }
    });
  }
}
