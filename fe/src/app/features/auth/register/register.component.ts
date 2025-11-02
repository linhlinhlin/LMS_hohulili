import { Component, signal, inject, ChangeDetectionStrategy, ViewEncapsulation, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterRequest, UserRole } from '../../../shared/types/user.types';

// Typed form interface - Udemy Passwordless Style
type RegisterForm = {
  name: FormControl<string>;
  email: FormControl<string>;
  newsletter: FormControl<boolean>;
};

@Component({
  selector: 'app-register',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  encapsulation: ViewEncapsulation.Emulated,
  template: `
    <div class="min-h-screen bg-white">
      <!-- Udemy-style Split Layout -->
      <div class="flex min-h-screen">
        <!-- Left Side - Hero Image -->
        <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-700 to-blue-800 relative overflow-hidden">
          <!-- Background Pattern -->
          <div class="absolute inset-0 opacity-10">
            <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="register-waves" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
                  <path d="M0 20 Q25 0 50 20 T100 20 V0 H0 Z" fill="currentColor"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#register-waves)"/>
            </svg>
          </div>
          
          <!-- Content -->
          <div class="relative z-10 flex flex-col justify-center items-center text-white p-12">
            <div class="text-center max-w-md">
              <div class="w-20 h-20 bg-white bg-opacity-20 rounded-3xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
                <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h2 class="text-4xl font-bold mb-6">Tham gia LMS Maritime</h2>
              <p class="text-xl text-indigo-100 leading-relaxed">
                Khởi đầu hành trình học tập hàng hải của bạn với các khóa học chuyên nghiệp và cộng đồng học viên năng động
              </p>
              <div class="mt-8 flex items-center justify-center space-x-8 text-sm">
                <div class="text-center">
                  <div class="text-2xl font-bold">100%</div>
                  <div class="text-indigo-200">Miễn phí</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold">24/7</div>
                  <div class="text-indigo-200">Hỗ trợ</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold">∞</div>
                  <div class="text-indigo-200">Truy cập</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side - Register Form -->
        <div class="flex-1 flex flex-col justify-center px-6 py-12 lg:px-8">
          <div class="mx-auto w-full max-w-md">
            <!-- Mobile Logo -->
            <div class="lg:hidden flex justify-center mb-8">
              <div class="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
            </div>

            <!-- Main Heading - Udemy Passwordless Style -->
            <div class="text-center mb-8">
              <h1 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                Đăng ký bằng email
              </h1>
            </div>

            <!-- Udemy Passwordless Form -->
            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-4">
              <!-- Full Name Field - Udemy Passwordless Style -->
              <div>
                <div class="relative">
                  <input id="name"
                         name="name"
                         type="text"
                         formControlName="name"
                         autocomplete="name"
                         required
                         [attr.aria-invalid]="registerForm.get('name')?.invalid || null"
                         [attr.aria-describedby]="registerForm.get('name')?.invalid ? 'name-error' : null"
                         class="block w-full px-4 py-4 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-base"
                         [class.border-red-500]="registerForm.get('name')?.invalid && registerForm.get('name')?.touched"
                         placeholder=" ">
                  <label for="name" class="absolute left-4 top-4 text-gray-500 transition-all duration-200 pointer-events-none"
                         [class.-top-2]="registerForm.get('name')?.value || registerForm.get('name')?.touched"
                         [class.text-xs]="registerForm.get('name')?.value || registerForm.get('name')?.touched"
                         [class.bg-white]="registerForm.get('name')?.value || registerForm.get('name')?.touched"
                         [class.px-1]="registerForm.get('name')?.value || registerForm.get('name')?.touched">
                    Tên đầy đủ
                  </label>
                </div>
                @if (registerForm.get('name')?.invalid && registerForm.get('name')?.touched) {
                  <p id="name-error" class="mt-2 text-sm text-red-600" role="alert" aria-live="polite">
                    @if (registerForm.get('name')?.errors?.['required']) {
                      Tên đầy đủ là bắt buộc
                    }
                  </p>
                }
              </div>

              <!-- Email Field - Udemy Passwordless Style -->
              <div>
                <div class="relative">
                  <input id="email"
                         name="email"
                         type="email"
                         formControlName="email"
                         autocomplete="email"
                         required
                         minlength="7"
                         maxlength="77"
                         [attr.aria-invalid]="registerForm.get('email')?.invalid || null"
                         [attr.aria-describedby]="registerForm.get('email')?.invalid ? 'email-error' : null"
                         class="block w-full px-4 py-4 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-base"
                         [class.border-red-500]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
                         placeholder=" ">
                  <label for="email" class="absolute left-4 top-4 text-gray-500 transition-all duration-200 pointer-events-none"
                         [class.-top-2]="registerForm.get('email')?.value || registerForm.get('email')?.touched"
                         [class.text-xs]="registerForm.get('email')?.value || registerForm.get('email')?.touched"
                         [class.bg-white]="registerForm.get('email')?.value || registerForm.get('email')?.touched"
                         [class.px-1]="registerForm.get('email')?.value || registerForm.get('email')?.touched">
                    Email
                  </label>
                </div>
                @if (registerForm.get('email')?.invalid && registerForm.get('email')?.touched) {
                  <p id="email-error" class="mt-2 text-sm text-red-600" role="alert" aria-live="polite">
                    @if (registerForm.get('email')?.errors?.['required']) {
                      Email là bắt buộc
                    } @else if (registerForm.get('email')?.errors?.['email']) {
                      Email không hợp lệ
                    } @else if (registerForm.get('email')?.errors?.['minlength']) {
                      Email phải có ít nhất 7 ký tự
                    }
                  </p>
                }
              </div>

              <!-- Newsletter Subscription - Udemy Style -->
              <div class="flex items-start">
                <div class="flex items-center h-5">
                  <input id="newsletter"
                         name="newsletter"
                         type="checkbox"
                         formControlName="newsletter"
                         class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                </div>
                <div class="ml-3 text-sm">
                  <label for="newsletter" class="text-gray-700">
                    Gửi cho tôi các ưu đãi đặc biệt, đề xuất cá nhân hóa và bí quyết học tập.
                  </label>
                </div>
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

              <!-- Submit Button - Udemy Passwordless Style -->
              <div>
                <button type="submit"
                        [disabled]="registerForm.invalid || authService.isLoading()"
                        class="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
                  @if (authService.isLoading()) {
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span class="opacity-75">Đang xử lý...</span>
                  } @else {
                    Tiếp tục
                  }
                </button>
              </div>
            </form>

            <!-- Udemy Passwordless Separator -->
            <div class="mt-8">
              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-300"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="px-4 bg-white text-gray-500 font-medium">Các tùy chọn đăng ký khác</span>
                </div>
              </div>
            </div>

            <!-- Social Registration - Udemy Style -->
            <div class="mt-6">
              <ul class="flex justify-center space-x-4">
                <li>
                  <button type="button"
                          aria-label="Đăng ký bằng Google ID"
                          class="flex items-center justify-center w-12 h-12 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-all duration-200">
                    <svg class="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </button>
                </li>
                <li>
                  <button type="button"
                          aria-label="Đăng ký bằng Facebook ID"
                          class="flex items-center justify-center w-12 h-12 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-all duration-200">
                    <svg class="w-6 h-6" fill="#1877F2" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>
                </li>
                <li>
                  <button type="button"
                          aria-label="Đăng ký bằng Apple ID"
                          class="flex items-center justify-center w-12 h-12 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-all duration-200">
                    <svg class="w-6 h-6" fill="#000000" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  </button>
                </li>
              </ul>
            </div>

            <!-- Terms and Privacy - Udemy Passwordless Style -->
            <div class="mt-8 text-center">
              <p class="text-xs text-gray-500">
                Bằng việc đăng ký, bạn đồng ý với 
                <a href="/terms" class="text-indigo-600 hover:text-indigo-500 underline" target="_blank" rel="noopener noreferrer">Điều khoản sử dụng</a>
                và 
                <a href="/privacy" class="text-indigo-600 hover:text-indigo-500 underline" target="_blank" rel="noopener noreferrer">Chính sách về quyền riêng tư</a>.
              </p>
            </div>

            <!-- Login Link - Udemy Passwordless Style -->
            <div class="mt-6 text-center">
              <p class="text-sm text-gray-600">
                Bạn đã có tài khoản chưa? 
                <a routerLink="/auth/login" class="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors duration-200 underline">
                  Đăng nhập
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  protected authService = inject(AuthService);

  registerForm!: FormGroup<RegisterForm>;
  returnUrl: string = '/dashboard';

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email, Validators.minLength(7), Validators.maxLength(77)]],
      newsletter: [false]
    }) as FormGroup<RegisterForm>;
    
    // Get return URL from route parameters or default to dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    try {
      // For passwordless registration, we'll create a default user with student role
      const formData = this.registerForm.getRawValue();
      const userData: RegisterRequest = {
        username: formData.email.split('@')[0] + Date.now(), // Generate username from email
        fullName: formData.name,
        email: formData.email,
        password: 'passwordless-temp-' + Date.now(), // Temporary password for passwordless
        role: UserRole.STUDENT // Default to student for passwordless registration
      };
      
      await this.authService.register(userData);
      // Navigate to dashboard - let DashboardRedirectComponent handle role-based routing
      this.router.navigate(['/dashboard']);
    } catch (error) {
      // Error is handled by the service
    }
  }
}
