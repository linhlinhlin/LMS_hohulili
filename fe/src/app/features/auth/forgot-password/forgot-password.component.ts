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
    <div class="min-h-screen bg-white">
      <!-- Udemy-style Split Layout -->
      <div class="flex min-h-screen">
        <!-- Left Side - Hero Image -->
        <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-600 via-red-700 to-pink-800 relative overflow-hidden">
          <!-- Background Pattern -->
          <div class="absolute inset-0 opacity-10">
            <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="forgot-waves" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
                  <path d="M0 20 Q25 0 50 20 T100 20 V0 H0 Z" fill="currentColor"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#forgot-waves)"/>
            </svg>
          </div>

          <!-- Content -->
          <div class="relative z-10 flex flex-col justify-center items-center text-white p-12">
            <div class="text-center max-w-md">
              <div class="w-20 h-20 bg-white bg-opacity-20 rounded-3xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
                <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                </svg>
              </div>
              <h2 class="text-4xl font-bold mb-6">Khôi phục mật khẩu</h2>
              <p class="text-xl text-orange-100 leading-relaxed">
                Chúng tôi sẽ gửi hướng dẫn khôi phục mật khẩu đến email của bạn trong vài phút
              </p>
              <div class="mt-8 flex items-center justify-center space-x-8 text-sm">
                <div class="text-center">
                  <div class="text-2xl font-bold">24/7</div>
                  <div class="text-orange-200">Hỗ trợ</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold">Bảo mật</div>
                  <div class="text-orange-200">Hoàn toàn</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold">Nhanh chóng</div>
                  <div class="text-orange-200">Trong vài phút</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side - Forgot Password Form -->
        <div class="flex-1 flex flex-col justify-center px-6 py-12 lg:px-8">
          <div class="mx-auto w-full max-w-md">
            <!-- Mobile Logo -->
            <div class="lg:hidden flex justify-center mb-8">
              <div class="w-16 h-16 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                </svg>
              </div>
            </div>

            <!-- Main Heading -->
            <div class="text-center mb-8">
              <h1 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                Quên mật khẩu?
              </h1>
              <p class="text-gray-600">
                Nhập email của bạn và chúng tôi sẽ gửi hướng dẫn khôi phục mật khẩu
              </p>
            </div>

            <!-- Success State -->
            @if (emailSent()) {
              <div class="text-center">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">Email đã được gửi!</h2>
                <p class="text-gray-600 mb-8">
                  Chúng tôi đã gửi hướng dẫn khôi phục mật khẩu đến <strong>{{ lastEmailSent() }}</strong>
                </p>
                <p class="text-sm text-gray-500 mb-6">
                  Không nhận được email? Kiểm tra thư mục spam hoặc thử lại sau vài phút.
                </p>
                <button (click)="resetForm()"
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors duration-200">
                  Gửi lại email
                </button>
              </div>
            } @else {
              <!-- Forgot Password Form -->
              <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()" class="space-y-6">
                <!-- Email Field -->
                <div>
                  <div class="relative">
                    <input id="email"
                           name="email"
                           type="email"
                           formControlName="email"
                           autocomplete="email"
                           required
                           [attr.aria-invalid]="forgotPasswordForm.get('email')?.invalid || null"
                           [attr.aria-describedby]="forgotPasswordForm.get('email')?.invalid ? 'email-error' : null"
                           class="block w-full px-4 py-4 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-base"
                           [class.border-red-500]="forgotPasswordForm.get('email')?.invalid && forgotPasswordForm.get('email')?.touched"
                           placeholder=" ">
                    <label for="email" class="absolute left-4 top-4 text-gray-500 transition-all duration-200 pointer-events-none"
                           [class.-top-2]="forgotPasswordForm.get('email')?.value || forgotPasswordForm.get('email')?.touched"
                           [class.text-xs]="forgotPasswordForm.get('email')?.value || forgotPasswordForm.get('email')?.touched"
                           [class.bg-white]="forgotPasswordForm.get('email')?.value || forgotPasswordForm.get('email')?.touched"
                           [class.px-1]="forgotPasswordForm.get('email')?.value || forgotPasswordForm.get('email')?.touched">
                      Email
                    </label>
                  </div>
                  @if (forgotPasswordForm.get('email')?.invalid && forgotPasswordForm.get('email')?.touched) {
                    <p id="email-error" class="mt-2 text-sm text-red-600" role="alert" aria-live="polite">
                      @if (forgotPasswordForm.get('email')?.errors?.['required']) {
                        Email là bắt buộc
                      } @else if (forgotPasswordForm.get('email')?.errors?.['email']) {
                        Email không hợp lệ
                      }
                    </p>
                  }
                </div>

                <!-- Error Message -->
                @if (authService.error()) {
                  <div class="bg-red-50 border border-red-200 rounded-lg p-4" role="alert" aria-live="polite">
                    <div class="flex">
                      <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                        </svg>
                      </div>
                      <div class="ml-3">
                        <p class="text-sm text-red-800">{{ authService.error() }}</p>
                      </div>
                    </div>
                  </div>
                }

                <!-- Submit Button -->
                <div>
                  <button type="submit"
                          [disabled]="forgotPasswordForm.invalid || authService.isLoading()"
                          class="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
                    @if (authService.isLoading()) {
                      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span class="opacity-75">Đang gửi...</span>
                    } @else {
                      Gửi hướng dẫn khôi phục
                    }
                  </button>
                </div>
              </form>
            }

            <!-- Back to Login Link -->
            <div class="mt-8 text-center">
              <p class="text-sm text-gray-600">
                Nhớ mật khẩu?
                <a routerLink="/auth/login"
                   class="font-semibold text-orange-600 hover:text-orange-500 transition-colors duration-200 underline">
                  Đăng nhập
                </a>
              </p>
            </div>

            <!-- Security Notice -->
            <div class="mt-8 text-center">
              <div class="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
                </svg>
                <span>Chúng tôi bảo mật thông tin của bạn</span>
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

    try {
      const email = this.forgotPasswordForm.get('email')?.value || '';

      // In a real app, this would call the API
      // For now, we'll simulate the success
      await this.simulateForgotPassword(email);

      this.emailSent.set(true);
      this.lastEmailSent.set(email);

      // Show success message
      console.log('Password reset email sent to:', email);

    } catch (error) {
      // Error is handled by the service
      console.error('Forgot password error:', error);
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
    // return this.apiClient.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, { email });

    // For demo purposes, we'll just resolve
    return Promise.resolve();
  }
}