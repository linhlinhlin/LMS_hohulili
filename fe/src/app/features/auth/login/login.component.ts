import { Component, signal, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest, UserRole } from '../../../shared/types/user.types';

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
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes slideIn {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }

      .animate-fade-in {
        animation: fadeIn 0.5s ease-out;
      }

      .animate-slide-in {
        animation: slideIn 0.6s ease-out;
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

      /* Label float when focused or has value */
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
        opacity: 1;
        visibility: visible;
      }

      /* Hide label when input is empty and not focused */
      .input-field:placeholder-shown ~ .input-label {
        opacity: 0;
        visibility: hidden;
      }

      /* Button Hover Effect */
      .btn-login {
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .btn-login:hover:not(:disabled) {
        background: #0277BD;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(2, 136, 209, 0.3);
      }

      .btn-login:active:not(:disabled) {
        transform: translateY(0);
      }

      /* Social Button */
      .social-btn {
        transition: all 0.2s ease;
      }

      .social-btn:hover {
        border-color: #0288D1;
        background: #F0F9FF;
        transform: translateY(-2px);
      }

      /* Stagger Animation */
      .form-element {
        animation: fadeIn 0.5s ease-out backwards;
      }

      .form-element:nth-child(1) { animation-delay: 0.1s; }
      .form-element:nth-child(2) { animation-delay: 0.2s; }
      .form-element:nth-child(3) { animation-delay: 0.3s; }
      .form-element:nth-child(4) { animation-delay: 0.4s; }
      .form-element:nth-child(5) { animation-delay: 0.5s; }
      .form-element:nth-child(6) { animation-delay: 0.6s; }
    </style>

    <div class="min-h-screen bg-slate-50 flex lg:pt-0 pt-16">
      <!-- Left Side - Compact Hero (35%) - Hidden on Mobile -->
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
          <div class="text-center max-w-sm animate-slide-in">
            <!-- Logo -->
            <div class="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg class="w-11 h-11 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>

            <!-- Title -->
            <h2 class="text-3xl font-bold mb-3 text-white">
              LMS Maritime
            </h2>
            
            <!-- Tagline -->
            <p class="text-blue-200 text-sm leading-relaxed">
              Nền tảng học tập hàng hải chuyên nghiệp
            </p>
          </div>
        </div>
      </div>

        <!-- Right Side - Login Form (65%) -->
        <div class="flex-1 flex flex-col justify-center px-6 py-8 lg:px-16 bg-white">
          <div class="w-full max-w-md mx-auto">
            <!-- Mobile Logo -->
            <div class="lg:hidden flex justify-center mb-8">
              <div class="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg class="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
            </div>

            <!-- Heading -->
            <div class="text-center mb-10">
              <h1 class="text-4xl lg:text-5xl font-bold mb-4 leading-tight"
                  style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                Chào mừng trở lại
              </h1>
              <p class="text-lg lg:text-xl text-blue-700 font-medium leading-relaxed">
                Đăng nhập để tiến tới đại hải trình
              </p>
            </div>
            <!-- Form -->
            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
              <!-- Email Field -->
              <div class="input-wrapper form-element">
                <input id="email"
                       name="email"
                       type="text"
                       formControlName="email"
                       autocomplete="email"
                       placeholder="Email hoặc tên đăng nhập"
                       [attr.aria-invalid]="loginForm.get('email')?.invalid || null"
                       [attr.aria-describedby]="loginForm.get('email')?.invalid ? 'email-error' : null"
                       class="input-field block w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-base placeholder-gray-500 focus:placeholder-gray-400"
                       [class.border-red-400]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched">
                <label for="email" class="input-label">
                  Email hoặc tên đăng nhập
                </label>
              </div>
              @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
                <p id="email-error" class="mt-2 text-sm text-red-600 flex items-center gap-1" role="alert" aria-live="polite">
                  <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                  </svg>
                  @if (loginForm.get('email')?.errors?.['required']) {
                    Email hoặc tên đăng nhập là bắt buộc
                  } @else if (loginForm.get('email')?.errors?.['emailOrUsername']) {
                    Email hoặc tên đăng nhập không hợp lệ
                  }
                </p>
              }

              <!-- Password Field -->
              <div class="input-wrapper form-element">
                <input id="password"
                       name="password"
                       [type]="showPassword() ? 'text' : 'password'"
                       formControlName="password"
                       autocomplete="current-password"
                       placeholder="Mật khẩu"
                       [attr.aria-invalid]="loginForm.get('password')?.invalid || null"
                       [attr.aria-describedby]="loginForm.get('password')?.invalid ? 'password-error' : null"
                       class="input-field block w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-base pr-12 placeholder-gray-500 focus:placeholder-gray-400"
                       [class.border-red-400]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched">
                <label for="password" class="input-label">
                  Mật khẩu
                </label>
                <button type="button"
                        class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        (click)="showPassword.set(!showPassword())"
                        [attr.aria-pressed]="showPassword()"
                        aria-label="Toggle password visibility">
                  @if (showPassword()) {
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                    </svg>
                  } @else {
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  }
                </button>
              </div>
              @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
                <p id="password-error" class="mt-2 text-sm text-red-600 flex items-center gap-1" role="alert" aria-live="polite">
                  <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                  </svg>
                  @if (loginForm.get('password')?.errors?.['required']) {
                    Mật khẩu là bắt buộc
                  }
                </p>
              }

              <!-- Remember & Forgot -->
              <div class="flex items-center justify-between form-element">
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
                     class="font-medium text-blue-600 hover:text-blue-700 transition-colors">
                    Quên mật khẩu?
                  </a>
                </div>
              </div>

              <!-- Success Message -->
              @if (showSuccessMessage()) {
                <div class="bg-green-50 border border-green-200 rounded-xl p-4 form-element" role="alert" aria-live="polite">
                  <div class="flex items-start gap-3">
                    <svg class="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                    <div>
                      <h3 class="text-sm font-semibold text-green-900">Đăng nhập thành công!</h3>
                      <p class="text-sm text-green-700 mt-1">{{ successMessage() }}</p>
                    </div>
                  </div>
                </div>
              }

              <!-- Error Message -->
              @if (errorMessage()) {
                <div class="bg-red-50 border border-red-200 rounded-xl p-4 form-element" role="alert" aria-live="polite">
                  <div class="flex items-start gap-3">
                    <svg class="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                    </svg>
                    <div>
                      <h3 class="text-sm font-semibold text-red-900">Đăng nhập thất bại</h3>
                      <p class="text-sm text-red-700 mt-1">{{ errorMessage() }}</p>
                    </div>
                  </div>
                </div>
              }

              <!-- Submit Button - Prominent -->
              <div class="form-element">
                <button type="submit"
                        [disabled]="loginForm.invalid || isLoading()"
                        class="btn-login w-full flex justify-center items-center py-4 px-6 border-none rounded-xl text-base font-semibold text-white bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
                  @if (isLoading()) {
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Đang đăng nhập...</span>
                  } @else {
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                    </svg>
                    <span>Đăng nhập</span>
                  }
                </button>
              </div>
            </form>

            <!-- Separator -->
            <div class="mt-8 form-element">
              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-300"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="px-4 bg-white text-gray-500">Hoặc đăng nhập với</span>
                </div>
              </div>
            </div>

            <!-- Social Login -->
            <div class="mt-6 form-element">
              <div class="flex justify-center gap-4">
                <button type="button"
                        aria-label="Tiếp tục bằng Google"
                        class="social-btn flex items-center justify-center w-12 h-12 border-2 border-gray-300 rounded-xl bg-white">
                  <svg class="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </button>
                <button type="button"
                        aria-label="Tiếp tục bằng Facebook"
                        class="social-btn flex items-center justify-center w-12 h-12 border-2 border-gray-300 rounded-xl bg-white">
                  <svg class="w-6 h-6" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>
                <button type="button"
                        aria-label="Tiếp tục bằng Apple"
                        class="social-btn flex items-center justify-center w-12 h-12 border-2 border-gray-300 rounded-xl bg-white">
                  <svg class="w-6 h-6" fill="#000000" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Sign Up Link -->
            <div class="mt-8 text-center form-element">
              <p class="text-sm text-gray-600">
                Bạn không có tài khoản? 
                <a routerLink="/auth/register" 
                   class="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Đăng ký
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  loginForm: FormGroup<LoginForm>;
  showPassword = signal(false);
  showSuccessMessage = signal(false);
  successMessage = signal('');
  isLoading = signal(false);
  errorMessage = signal('');

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, this.emailOrUsernameValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    }) as FormGroup<LoginForm>;
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
}