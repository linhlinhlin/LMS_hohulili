import { Component, signal, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest } from '../../../shared/types/user.types';
import { UserRole } from '../../../shared/types/user.types';

// Typed form interface
type LoginForm = {
  email: FormControl<string>;
  password: FormControl<string>;
  rememberMe: FormControl<boolean>;
};

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  encapsulation: ViewEncapsulation.Emulated,
  template: `
    <style>
      .animate-fade-in {
        animation: fadeIn 0.3s ease-in-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
    <div class="min-h-screen bg-white">
      <!-- Udemy-style Split Layout -->
      <div class="flex min-h-screen">
        <!-- Left Side - Hero Image -->
        <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
          <!-- Background Pattern -->
          <div class="absolute inset-0 opacity-10">
            <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="waves" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
                  <path d="M0 20 Q25 0 50 20 T100 20 V0 H0 Z" fill="currentColor"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#waves)"/>
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
              <h2 class="text-4xl font-bold mb-6">LMS Maritime</h2>
              <p class="text-xl text-blue-100 leading-relaxed">
                Nền tảng học tập hàng hải chuyên nghiệp với các khóa học được thiết kế bởi chuyên gia
              </p>
              <div class="mt-8 flex items-center justify-center space-x-8 text-sm">
                <div class="text-center">
                  <div class="text-2xl font-bold">50+</div>
                  <div class="text-blue-200">Khóa học</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold">2.500+</div>
                  <div class="text-blue-200">Học viên</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold">25+</div>
                  <div class="text-blue-200">Giảng viên</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side - Login Form -->
        <div class="flex-1 flex flex-col justify-center px-6 py-12 lg:px-8">
          <div class="mx-auto w-full max-w-md">
            <!-- Mobile Logo -->
            <div class="lg:hidden flex justify-center mb-8">
              <div class="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
            </div>

            <!-- Main Heading -->
            <div class="text-center mb-8">
              <h1 class="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                Đăng nhập
              </h1>
              <p class="text-gray-600">
                Tiếp tục hành trình học tập của bạn
              </p>
            </div>
            <!-- Modern Clean Form -->
            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
              <!-- Email Field -->
              <div>
                <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
                    </svg>
                  </div>
                  <input id="email"
                         name="email"
                         type="email"
                         formControlName="email"
                         autocomplete="email"
                         required
                         [attr.aria-invalid]="loginForm.get('email')?.invalid || null"
                         [attr.aria-describedby]="loginForm.get('email')?.invalid ? 'email-error' : null"
                         class="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
                         [class.border-red-500]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                         [class.focus:ring-red-500]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                         placeholder="Nhập địa chỉ email của bạn">
                </div>
                @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
                  <p id="email-error" class="mt-2 text-sm text-red-600 flex items-center" role="alert" aria-live="polite">
                    <svg class="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                    @if (loginForm.get('email')?.errors?.['required']) {
                      Email là bắt buộc
                    } @else if (loginForm.get('email')?.errors?.['email']) {
                      Email không hợp lệ
                    }
                  </p>
                }
              </div>

              <!-- Password Field -->
              <div>
                <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <input id="password"
                         name="password"
                         [type]="showPassword() ? 'text' : 'password'"
                         formControlName="password"
                         autocomplete="current-password"
                         required
                         [attr.aria-invalid]="loginForm.get('password')?.invalid || null"
                         [attr.aria-describedby]="loginForm.get('password')?.invalid ? 'password-error' : null"
                         class="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
                         [class.border-red-500]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                         [class.focus:ring-red-500]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                         placeholder="Nhập mật khẩu của bạn">
                  <button type="button" 
                          class="absolute inset-y-0 right-0 pr-3 flex items-center"
                          (click)="showPassword.set(!showPassword())"
                          [attr.aria-pressed]="showPassword()"
                          aria-label="Toggle password visibility">
                    @if (showPassword()) {
                      <svg class="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                      </svg>
                    } @else {
                      <svg class="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    }
                  </button>
                </div>
                @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
                  <p id="password-error" class="mt-2 text-sm text-red-600 flex items-center" role="alert" aria-live="polite">
                    <svg class="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                    @if (loginForm.get('password')?.errors?.['required']) {
                      Mật khẩu là bắt buộc
                    } @else if (loginForm.get('password')?.errors?.['minlength']) {
                      Mật khẩu phải có ít nhất 6 ký tự
                    }
                  </p>
                }
              </div>

              <!-- Remember me & Forgot password -->
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <input id="remember-me"
                         name="remember-me"
                         type="checkbox"
                         formControlName="rememberMe"
                         class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                  <label for="remember-me" class="ml-2 block text-sm text-gray-700">
                    Ghi nhớ đăng nhập
                  </label>
                </div>

                <div class="text-sm">
                  <a routerLink="/auth/forgot-password" 
                     class="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200">
                    Quên mật khẩu?
                  </a>
                </div>
              </div>

              <!-- Success Message -->
              @if (showSuccessMessage()) {
                <div class="bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in" role="alert" aria-live="polite">
                  <div class="flex">
                    <div class="flex-shrink-0">
                      <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                      </svg>
                    </div>
                    <div class="ml-3">
                      <h3 class="text-sm font-medium text-green-800 mb-1">Đăng nhập thành công!</h3>
                      <p class="text-sm text-green-700">{{ successMessage() }}</p>
                    </div>
                  </div>
                </div>
              }

              <!-- Error Message -->
              @if (errorMessage()) {
                <div class="bg-red-50 border border-red-200 rounded-lg p-4 animate-fade-in" role="alert" aria-live="polite">
                  <div class="flex">
                    <div class="flex-shrink-0">
                      <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                      </svg>
                    </div>
                    <div class="ml-3">
                      <h3 class="text-sm font-medium text-red-800 mb-1">Đăng nhập thất bại</h3>
                      <p class="text-sm text-red-700">{{ errorMessage() }}</p>
                    </div>
                  </div>
                </div>
              }

              <!-- Submit Button -->
              <div>
                <button type="submit"
                        [disabled]="loginForm.invalid || isLoading()"
                        class="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 transform hover:scale-[1.02] transition-all duration-200">
                  @if (isLoading()) {
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span class="opacity-75">Đang đăng nhập...</span>
                  } @else {
                    Đăng nhập
                  }
                </button>
              </div>
            </form>

            <!-- Udemy-style Separator -->
            <div class="mt-8">
              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-300"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="px-4 bg-white text-gray-500 font-medium">Các tùy chọn đăng nhập khác</span>
                </div>
              </div>
            </div>

            <!-- Social Login - Udemy Style -->
            <div class="mt-6">
              <ul class="flex justify-center space-x-4">
                <li>
                  <button type="button"
                          aria-label="Tiếp tục bằng Google ID"
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
                          aria-label="Tiếp tục bằng Facebook ID"
                          class="flex items-center justify-center w-12 h-12 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-all duration-200">
                    <svg class="w-6 h-6" fill="#1877F2" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>
                </li>
                <li>
                  <button type="button"
                          aria-label="Tiếp tục bằng Apple ID"
                          class="flex items-center justify-center w-12 h-12 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-all duration-200">
                    <svg class="w-6 h-6" fill="#000000" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  </button>
                </li>
              </ul>
            </div>

            <!-- Sign Up Link - Udemy Style -->
            <div class="mt-8 text-center">
              <p class="text-sm text-gray-600">
                Bạn không có tài khoản? 
                <a routerLink="/auth/register" 
                   class="font-semibold text-blue-600 hover:text-blue-500 transition-colors duration-200 underline">
                  Đăng ký
                </a>
              </p>
            </div>

            <!-- Demo Accounts - Udemy Style -->
            <div class="mt-8">
              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-300"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="px-4 bg-white text-gray-500 font-medium">Tài khoản demo</span>
                </div>
              </div>

              <div class="mt-6 space-y-3">
                <button (click)="loginAsDemo(UserRole.STUDENT)"
                        [attr.aria-label]="'Đăng nhập với tài khoản Sinh viên demo'"
                        class="w-full inline-flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200">
                  <svg class="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Sinh viên
                </button>
                <button (click)="loginAsDemo(UserRole.TEACHER)"
                        [attr.aria-label]="'Đăng nhập với tài khoản Giảng viên demo'"
                        class="w-full inline-flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200">
                  <svg class="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Giảng viên
                </button>
                <button (click)="loginAsDemo(UserRole.ADMIN)"
                        [attr.aria-label]="'Đăng nhập với tài khoản Admin demo'"
                        class="w-full inline-flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200">
                  <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Admin
                </button>
              </div>
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
export class LoginComponent {
  protected authService = inject(AuthService);
  protected UserRole = UserRole;
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  loginForm: FormGroup<LoginForm>;
  showPassword = signal(false);
  showSuccessMessage = signal(false);
  successMessage = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  private returnUrl: string;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, this.emailOrUsernameValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    }) as FormGroup<LoginForm>;
    
    // Get return URL from route parameters or default to dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const formValue = this.loginForm.getRawValue();
    const credentials: LoginRequest = {
      email: formValue.email,
      password: formValue.password
    };

    this.authService.login(credentials).subscribe({
      next: (response) => {
        console.log('✅ Login successful in component:', response);
        this.isLoading.set(false);
        
        // Redirect based on user role
        const userRole = response.user.role.toLowerCase();
        console.log('👤 User role:', userRole);
        
        let redirectUrl = '/';
        switch (userRole) {
          case 'admin':
            redirectUrl = '/admin';
            break;
          case 'teacher':
            redirectUrl = '/teacher';
            break;
          case 'student':
            redirectUrl = '/student';
            break;
          default:
            redirectUrl = '/';
        }
        
        console.log('🔄 Redirecting to:', redirectUrl);
        console.log('🔄 Calling router.navigate with:', [redirectUrl]);
        
        this.router.navigate([redirectUrl]).then(success => {
          console.log('🔄 Navigation result:', success);
          if (!success) {
            console.error('❌ Navigation failed!');
          }
        }).catch(error => {
          console.error('❌ Navigation error:', error);
        });
      },
      error: (error) => {
        console.error('❌ Login failed in component:', error);
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
      }
    });
  }

  // Allow either a valid email or a simple username (alphanumeric, dots, underscores, hyphens)
  private emailOrUsernameValidator(control: any) {
    const value = (control?.value || '').trim();
    if (!value) return { required: true };
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isUsername = /^[a-zA-Z0-9._-]{3,}$/.test(value);
    return isEmail || isUsername ? null : { emailOrUsername: true };
  }

  async loginAsDemo(role: UserRole): Promise<void> {
    try {
      await this.authService.loginAsDemo(role);

      // Show success message
      const roleName = this.getRoleDisplayName(role);
      this.successMessage.set(`Đã đăng nhập thành công với tài khoản ${roleName}!`);
      this.showSuccessMessage.set(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        this.showSuccessMessage.set(false);
      }, 3000);

      // ✅ Redirect is handled by AuthService
    } catch (error) {
      // Error is handled by the store
    }
  }

  private getRoleDisplayName(role: UserRole): string {
    switch (role) {
      case UserRole.STUDENT: return 'Học viên';
      case UserRole.TEACHER: return 'Giảng viên';
      case UserRole.ADMIN: return 'Quản trị viên';
      default: return 'Người dùng';
    }
  }

  getErrorMessage(error: string): string {
    // Map common error messages to user-friendly Vietnamese messages
    const errorMappings: Record<string, string> = {
      'Invalid credentials': 'Tên đăng nhập hoặc mật khẩu không đúng',
      'User not found': 'Tài khoản không tồn tại',
      'Account locked': 'Tài khoản đã bị khóa',
      'Too many attempts': 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau.',
      'Network error': 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.',
      'Server error': 'Lỗi máy chủ. Vui lòng thử lại sau.',
      'Login failed': 'Đăng nhập thất bại. Vui lòng thử lại.'
    };

    // Check if the error message contains any known patterns
    for (const [key, message] of Object.entries(errorMappings)) {
      if (error.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }

    // Return the original error if no mapping found
    return error;
  }

  // ✅ Removed redirectAfterLogin() method - now handled by AuthService
}