import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { getPortalRootRoute } from '../../../core/utils/portal-route.util';

@Component({
  selector: 'app-onboarding',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
        --auth-shadow-card: 0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06);
      }

      .onboard-shell {
        min-height: 100vh;
        background:
          radial-gradient(ellipse 900px 420px at 50% -120px, rgba(0, 86, 210, 0.05), transparent 65%),
          #fafafa;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px 16px;
      }

      .onboard-frame {
        width: min(100%, 420px);
        display: grid;
        gap: 14px;
      }

      .onboard-brand {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        text-decoration: none;
      }

      .onboard-card {
        width: 100%;
        padding: 32px 24px;
        border-radius: 16px;
        border: 1px solid var(--auth-border);
        background: #ffffff;
        box-shadow: var(--auth-shadow-card);
        text-align: center;
      }

      .onboard-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        margin: 0 auto 16px;
        border-radius: 16px;
        background: rgba(0, 86, 210, 0.08);
      }

      .onboard-icon svg {
        width: 32px;
        height: 32px;
        color: var(--auth-primary);
      }

      .onboard-title {
        margin: 0 0 6px;
        font-size: 1.45rem;
        font-weight: 700;
        color: var(--auth-text);
      }

      .onboard-copy {
        margin: 0 0 24px;
        font-size: 0.92rem;
        line-height: 1.6;
        color: var(--auth-text-secondary);
      }

      .onboard-field {
        display: grid;
        gap: 6px;
        text-align: left;
        margin-bottom: 16px;
      }

      .onboard-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #374151;
      }

      .onboard-input {
        min-height: 48px;
        width: 100%;
        padding: 12px 14px;
        border-radius: 12px;
        border: 1px solid var(--auth-border-strong);
        background: #ffffff;
        font-size: 1rem;
        color: var(--auth-text);
        text-align: center;
        transition: border-color 0.18s ease, box-shadow 0.18s ease;
      }

      .onboard-input::placeholder { color: #9ca3af; }

      .onboard-input:focus {
        outline: none;
        border-color: var(--auth-primary);
        box-shadow: 0 0 0 4px rgba(0, 86, 210, 0.12);
      }

      .onboard-error {
        margin: 0;
        font-size: 0.84rem;
        color: var(--auth-error-text);
      }

      .onboard-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 46px;
        padding: 0 18px;
        border: 0;
        border-radius: 12px;
        background: var(--auth-primary);
        color: #ffffff;
        font-size: 0.94rem;
        font-weight: 700;
        cursor: pointer;
        transition: background-color 0.18s ease, box-shadow 0.18s ease;
      }

      .onboard-btn:hover:not(:disabled) {
        background: var(--auth-primary-hover);
        box-shadow: 0 2px 8px rgba(0, 86, 210, 0.18);
      }

      .onboard-btn:disabled {
        cursor: not-allowed;
        opacity: 0.58;
      }

      .onboard-btn:focus-visible {
        outline: 2px solid var(--auth-primary);
        outline-offset: 2px;
      }

      .onboard-skip {
        margin-top: 8px;
        border: 0;
        background: transparent;
        color: var(--auth-text-muted);
        font-size: 0.84rem;
        cursor: pointer;
      }

      .onboard-skip:hover {
        color: var(--auth-text-secondary);
        text-decoration: underline;
      }

      @media (min-width: 640px) {
        .onboard-card { padding: 40px 32px; }
      }
    </style>

    <div class="onboard-shell">
      <div class="onboard-frame">
        <div class="onboard-brand">
          <img src="/icons/logo-master.png" alt="LMS Maritime" class="h-10 w-10 rounded-2xl shadow-sm">
        </div>

        <div class="onboard-card">
          <div class="onboard-icon" aria-hidden="true">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <h1 class="onboard-title">Chào mừng bạn!</h1>
          <p class="onboard-copy">Tôi nên gọi bạn là gì?</p>

          <form (ngSubmit)="submit()" class="onboard-field">
            <label for="display-name" class="onboard-label">Họ và tên</label>
            <input
              id="display-name"
              type="text"
              [formControl]="nameControl"
              autocomplete="name"
              autofocus
              placeholder="Nguyễn Văn A"
              class="onboard-input"
              maxlength="100"
            >
            @if (errorMessage()) {
              <p class="onboard-error">{{ errorMessage() }}</p>
            }
          </form>

          <button
            type="button"
            [disabled]="isLoading() || nameControl.invalid"
            (click)="submit()"
            class="onboard-btn"
          >
            @if (isLoading()) {
              <svg class="mr-3 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Đang lưu...
            } @else {
              Tiếp tục
            }
          </button>

          <button type="button" class="onboard-skip" (click)="skip()">
            Để sau
          </button>
        </div>
      </div>
    </div>
  `
})
export class OnboardingComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly nameControl = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(1)] });
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  submit(): void {
    const name = this.nameControl.value.trim();
    if (!name) {
      this.errorMessage.set('Vui lòng nhập tên của bạn.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.auth.updateProfile({ fullName: name }).subscribe({
      next: () => this.goToDashboard(),
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Không thể lưu. Vui lòng thử lại.');
      }
    });
  }

  skip(): void {
    this.goToDashboard();
  }

  private goToDashboard(): void {
    const user = this.auth.currentUserSignal();
    const role = (user?.role || 'student').toLowerCase();
    this.router.navigateByUrl(getPortalRootRoute(role));
  }
}
