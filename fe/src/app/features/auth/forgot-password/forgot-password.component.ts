import { Component, signal, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

// Typed form interface
type ForgotPasswordForm = {
  email: FormControl<string>;
};

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  encapsulation: ViewEncapsulation.Emulated,
  template: `
    <style>
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .animate-fade-in {
        animation: fadeIn 0.5s ease-out;
      }

      /* Floating Label */
      .input-wrapper {
        position: relative;
      }

      .input-field {
        transition: all 0.2s ease;
        background: #ffffff;
      }

      .input-field:focus {
        outline: none;
        border-color: #0288D1;
        box-shadow: 0 0 0 3px rgba(2, 136, 209, 0.1);
      }

      .input-label {
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        background: white;
        padding: 2px 10px;
        color: #6B7280;
        font-size: 15px;
        pointer-events: none;
        transition: all 0.2s ease;
        border-radius: 12px;
      }

      .input-field:focus ~ .input-label,
      .input-field:not(:placeholder-shown) ~ .input-label {
        top: 0;
        transform: translateY(-50%);
        font-size: 12px;
        color: #0288D1;
        font-weight: 600;
        background: #EFF6FF;
        padding: 3px 12px;
        border-radius: 16px;
        box-shadow: 0 0 0 1px #BFDBFE;
      }

      .btn-submit {
        transition: all 0.3s ease;
      }

      .btn-submit:hover:not(:disabled) {
        background: #0277BD;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(2, 136, 209, 0.3);
      }

      .form-element {
        animation: fadeIn 0.5s ease-out backwards;
      }

      .form-element:nth-child(1) { animation-delay: 0.1s; }
      .form-element:nth-child(2) { animation-delay: 0.2s; }
      .form-element:nth-child(3) { animation-delay: 0.3s; }
    </style>

    <div class="min-h-screen bg-slate-50">
      <div class="flex min-h-screen">
        <!-- Left Side - Compact Hero (35%) -->
        <div class="hidden lg:flex lg:w-[35%] bg-gradient-to-br from-slate-800 to-blue-900 relative overflow-hidden">
          <!-- Subtle Pattern Overlay -->
          <div class="absolute inset-0 opacity-[0.03]">
            <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                  <circle cx="5" cy="5" r="1" fill="white"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)"/>
            </svg>
          </div>

          <!-- Gradient Overlay -->
          <div class="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent"></div>

          <!-- Compact Content -->
          <div class="relative z-10 flex flex-col justify-center items-center text-white p-12 w-full">
            <div class="text-center max-w-sm">
              <!-- Logo -->
              <div class="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <svg class="w-11 h-11 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                </svg>
              </div>

              <!-- Title -->
              <h2 class="text-3xl font-bold mb-3 text-white">
                Khôi phục mật khẩu
              </h2>
              
              <!-- Tagline -->
              <p class="text-blue-200 text-sm leading-relaxed">
                Quy trình khôi phục an toàn và nhanh chóng
              </p>
            </div>
          </div>
        </div>

        <!-- Right Side - Form (65%) -->
        <div class="flex-1 flex flex-col justify-center px-6 py-8 lg:px-16 bg-white">
          <div class="w-full max-w-md mx-auto">
            <!-- Mobile Logo -->
            <div class="lg:hidden flex justify-center mb-8">
              <div class="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                </svg>
              </div>
            </div>

            <!-- Heading -->
            <div class="text-center mb-10">
              <h1 class="text-4xl lg:text-5xl font-bold mb-4 leading-tight"
                  style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                Quên mật khẩu?
              </h1>
              <p class="text-lg lg:text-xl text-blue-700 font-medium leading-relaxed">
                Nhập email để nhận hướng dẫn khôi phục
              </p>
            </div>

            <!-- Success State -->
            @if (emailSent()) {
              <div class="text-center animate-fade-in">
                <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h2 class="text-3xl font-bold text-gray-900 mb-4">Email đã được gửi!</h2>
                <p class="text-gray-600 mb-8">
                  Chúng tôi đã gửi hướng dẫn khôi phục mật khẩu đến <strong>{{ lastEmailSent() }}</strong>
                </p>
                <p class="text-sm text-gray-500 mb-6">
                  Không nhận được email? Kiểm tra thư mục spam hoặc thử lại.
                </p>
                <button (click)="resetForm()"
                        class="btn-submit w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-semibold shadow-lg">
                  Gửi lại email
                </button>
              </div>
            } @else {
              <!-- Form -->
              <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()" class="space-y-6">
                <!-- Email Field -->
                <div class="input-wrapper form-element">
                  <input id="email"
                         name="email"
                         type="email"
                         formControlName="email"
                         autocomplete="email"
                         placeholder="Email"
                         [attr.aria-invalid]="forgotPasswordForm.get('email')?.invalid || null"
                         [attr.aria-describedby]="forgotPasswordForm.get('email')?.invalid ? 'email-error' : null"
                         class="input-field block w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-base placeholder-gray-500 focus:placeholder-gray-400"
                         [class.border-red-400]="forgotPasswordForm.get('email')?.invalid && forgotPasswordForm.get('email')?.touched">
                  <label for="email" class="input-label">
                    Email
                  </label>
                </div>
                @if (forgotPasswordForm.get('email')?.invalid && forgotPasswordForm.get('email')?.touched) {
                  <p id="email-error" class="mt-2 text-sm text-red-600 flex items-center gap-1" role="alert" aria-live="polite">
                    <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                    @if (forgotPasswordForm.get('email')?.errors?.['required']) {
                      Email là bắt buộc
                    } @else if (forgotPasswordForm.get('email')?.errors?.['email']) {
                      Email không hợp lệ
                    }
                  </p>
                }

                <!-- Error Message -->
                @if (errorMessage()) {
                  <div class="bg-red-50 border border-red-200 rounded-xl p-4 form-element" role="alert" aria-live="polite">
                    <div class="flex items-start gap-3">
                      <svg class="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                      </svg>
                      <div>
                        <h3 class="text-sm font-semibold text-red-900">Có lỗi xảy ra</h3>
                        <p class="text-sm text-red-700 mt-1">{{ errorMessage() }}</p>
                      </div>
                    </div>
                  </div>
                }

                <!-- Submit Button -->
                <div class="form-element">
                  <button type="submit"
                          [disabled]="forgotPasswordForm.invalid || isLoading()"
                          class="btn-submit w-full flex justify-center items-center py-4 px-6 border-none rounded-xl text-base font-semibold text-white bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
                    @if (isLoading()) {
                      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Đang gửi...</span>
                    } @else {
                      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                      </svg>
                      <span>Gửi hướng dẫn khôi phục</span>
                    }
                  </button>
                </div>
              </form>
            }

            <!-- Back to Login Link -->
            <div class="mt-8 text-center form-element">
              <p class="text-sm text-gray-600">
                Nhớ mật khẩu?
                <a routerLink="/auth/login"
                   class="font-semibold text-blue-600 hover:text-blue-700 transition-colors ml-1">
                  Đăng nhập
                </a>
              </p>
            </div>

            <!-- Security Notice -->
            <div class="mt-8 text-center form-element">
              <div class="flex items-center justify-center gap-2 text-xs text-gray-500">
                <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
                </svg>
                <span>SSL Encrypted • Maritime Security Standards</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordComponent {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  forgotPasswordForm!: FormGroup<ForgotPasswordForm>;
  emailSent = signal(false);
  lastEmailSent = signal('');
  isLoading = signal(false);
  errorMessage = signal('');

  constructor() {
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
      const email = this.forgotPasswordForm.get('email')?.value || '';

      // Simulate API call (replace with real API when backend is ready)
      await this.simulateForgotPassword(email);

      this.emailSent.set(true);
      this.lastEmailSent.set(email);
      this.isLoading.set(false);

      console.log('Password reset email sent to:', email);

    } catch (error) {
      console.error('Forgot password error:', error);
      this.isLoading.set(false);
      this.errorMessage.set('Không thể gửi email. Vui lòng thử lại sau.');
    }
  }

  resetForm(): void {
    this.emailSent.set(false);
    this.lastEmailSent.set('');
    this.forgotPasswordForm.reset();
  }

  private async simulateForgotPassword(email: string): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // In a real implementation, this would call:
    // return this.authService.forgotPassword({ email });
    // or this.apiClient.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, { email });

    return Promise.resolve();
  }
}