import { Component, signal, inject, ChangeDetectionStrategy, ViewEncapsulation, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterRequest, UserRole } from '../../../shared/types/user.types';

// Multi-step registration forms
type EmailForm = {
  email: FormControl<string>;
};

type ProfileForm = {
  name: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
  newsletter: FormControl<boolean>;
};

@Component({
  selector: 'app-register',
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
      }

      /* Button Hover Effect */
      .btn-register {
        transition: all 0.3s ease;
      }

      .btn-register:hover:not(:disabled) {
        background: #0277BD;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(2, 136, 209, 0.3);
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

      /* Form Elements Animation */
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

        <!-- Right Side - Register Form (65%) -->
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
                Bắt đầu hành trình
              </h1>
              <p class="text-lg lg:text-xl text-blue-700 font-medium leading-relaxed">
                Tạo tài khoản để khám phá thế giới hàng hải
              </p>
            </div>

            <!-- Register Form -->
            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-6">
              <!-- Full Name Field -->
              <div class="input-wrapper form-element">
                <input id="name"
                       name="name"
                       type="text"
                       formControlName="name"
                       autocomplete="name"
                       placeholder="Tên đầy đủ"
                       [attr.aria-invalid]="registerForm.get('name')?.invalid || null"
                       [attr.aria-describedby]="registerForm.get('name')?.invalid ? 'name-error' : null"
                       class="input-field block w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-base placeholder-gray-500 focus:placeholder-gray-400"
                       [class.border-red-400]="registerForm.get('name')?.invalid && registerForm.get('name')?.touched">
                <label for="name" class="input-label">
                  Tên đầy đủ
                </label>
              </div>
              @if (registerForm.get('name')?.invalid && registerForm.get('name')?.touched) {
                <p id="name-error" class="mt-2 text-sm text-red-600 flex items-center gap-1" role="alert" aria-live="polite">
                  <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                  </svg>
                  @if (registerForm.get('name')?.errors?.['required']) {
                    Tên đầy đủ là bắt buộc
                  }
                </p>
              }

              <!-- Email Field -->
              <div class="input-wrapper form-element">
                <input id="email"
                       name="email"
                       type="email"
                       formControlName="email"
                       autocomplete="email"
                       placeholder="Email"
                       [attr.aria-invalid]="registerForm.get('email')?.invalid || null"
                       [attr.aria-describedby]="registerForm.get('email')?.invalid ? 'email-error' : null"
                       class="input-field block w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-base placeholder-gray-500 focus:placeholder-gray-400"
                       [class.border-red-400]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched">
                <label for="email" class="input-label">
                  Email
                </label>
              </div>
              @if (registerForm.get('email')?.invalid && registerForm.get('email')?.touched) {
                <p id="email-error" class="mt-2 text-sm text-red-600 flex items-center gap-1" role="alert" aria-live="polite">
                  <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                  </svg>
                  @if (registerForm.get('email')?.errors?.['required']) {
                    Email là bắt buộc
                  } @else if (registerForm.get('email')?.errors?.['email']) {
                    Email không hợp lệ
                  }
                </p>
              }

              <!-- Password Field -->
              <div class="input-wrapper form-element">
                <input id="password"
                       name="password"
                       type="password"
                       formControlName="password"
                       autocomplete="new-password"
                       placeholder="Mật khẩu"
                       [attr.aria-invalid]="registerForm.get('password')?.invalid || null"
                       [attr.aria-describedby]="registerForm.get('password')?.invalid ? 'password-error' : null"
                       class="input-field block w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-base placeholder-gray-500 focus:placeholder-gray-400"
                       [class.border-red-400]="registerForm.get('password')?.invalid && registerForm.get('password')?.touched">
                <label for="password" class="input-label">
                  Mật khẩu
                </label>
              </div>
              @if (registerForm.get('password')?.invalid && registerForm.get('password')?.touched) {
                <p id="password-error" class="mt-2 text-sm text-red-600 flex items-center gap-1" role="alert" aria-live="polite">
                  <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                  </svg>
                  @if (registerForm.get('password')?.errors?.['required']) {
                    Mật khẩu là bắt buộc
                  } @else if (registerForm.get('password')?.errors?.['minlength']) {
                    Mật khẩu phải có ít nhất 6 ký tự
                  }
                </p>
              }

              <!-- Confirm Password Field -->
              <div class="input-wrapper form-element">
                <input id="confirmPassword"
                       name="confirmPassword"
                       type="password"
                       formControlName="confirmPassword"
                       autocomplete="new-password"
                       placeholder="Xác nhận mật khẩu"
                       [attr.aria-invalid]="registerForm.get('confirmPassword')?.invalid || null"
                       [attr.aria-describedby]="registerForm.get('confirmPassword')?.invalid ? 'confirm-password-error' : null"
                       class="input-field block w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-base placeholder-gray-500 focus:placeholder-gray-400"
                       [class.border-red-400]="registerForm.get('confirmPassword')?.invalid && registerForm.get('confirmPassword')?.touched">
                <label for="confirmPassword" class="input-label">
                  Xác nhận mật khẩu
                </label>
              </div>
              @if (registerForm.get('confirmPassword')?.invalid && registerForm.get('confirmPassword')?.touched) {
                <p id="confirm-password-error" class="mt-2 text-sm text-red-600 flex items-center gap-1" role="alert" aria-live="polite">
                  <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                  </svg>
                  @if (registerForm.errors?.['passwordMismatch']) {
                    Mật khẩu xác nhận không khớp
                  } @else if (registerForm.get('confirmPassword')?.errors?.['required']) {
                    Vui lòng xác nhận mật khẩu
                  }
                </p>
              }

              <!-- Newsletter Subscription -->
              <div class="flex items-start form-element">
                <div class="flex items-center h-5">
                  <input id="newsletter"
                         name="newsletter"
                         type="checkbox"
                         formControlName="newsletter"
                         class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                </div>
                <div class="ml-3 text-sm">
                  <label for="newsletter" class="text-gray-700">
                    Gửi cho tôi các ưu đãi đặc biệt, đề xuất cá nhân hóa và bí quyết học tập.
                  </label>
                </div>
              </div>

              <!-- Error Message -->
              @if (errorMessage()) {
                <div class="bg-red-50 border border-red-200 rounded-xl p-4 form-element" role="alert" aria-live="polite">
                  <div class="flex items-start gap-3">
                    <svg class="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                    </svg>
                    <div>
                      <h3 class="text-sm font-semibold text-red-900">Đăng ký thất bại</h3>
                      <p class="text-sm text-red-700 mt-1">{{ errorMessage() }}</p>
                    </div>
                  </div>
                </div>
              }

              <!-- Submit Button -->
              <div class="form-element">
                <button type="submit"
                        [disabled]="registerForm.invalid || isLoading()"
                        class="btn-register w-full flex justify-center items-center py-4 px-6 border-none rounded-xl text-base font-semibold text-white bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
                  @if (isLoading()) {
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Đang xử lý...</span>
                  } @else {
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                    </svg>
                    <span>Đăng ký</span>
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
                  <span class="px-4 bg-white text-gray-500">Hoặc đăng ký với</span>
                </div>
              </div>
            </div>

            <!-- Social Login -->
            <div class="mt-6 form-element">
              <div class="flex justify-center gap-4">
                <button type="button"
                        aria-label="Đăng ký bằng Google"
                        class="social-btn flex items-center justify-center w-12 h-12 border-2 border-gray-300 rounded-xl bg-white">
                  <svg class="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </button>
                <button type="button"
                        aria-label="Đăng ký bằng Facebook"
                        class="social-btn flex items-center justify-center w-12 h-12 border-2 border-gray-300 rounded-xl bg-white">
                  <svg class="w-6 h-6" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>
                <button type="button"
                        aria-label="Đăng ký bằng Apple"
                        class="social-btn flex items-center justify-center w-12 h-12 border-2 border-gray-300 rounded-xl bg-white">
                  <svg class="w-6 h-6" fill="#000000" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Terms and Privacy -->
            <div class="mt-8 text-center form-element">
              <p class="text-xs text-gray-500">
                Bằng việc đăng ký, bạn đồng ý với
                <a routerLink="/terms" class="text-blue-600 hover:text-blue-700 underline">Điều khoản sử dụng</a>
                và
                <a routerLink="/privacy" class="text-blue-600 hover:text-blue-700 underline">Chính sách về quyền riêng tư</a>.
              </p>
            </div>

            <!-- Login Link -->
            <div class="mt-6 text-center form-element">
              <p class="text-sm text-gray-600">
                Bạn đã có tài khoản?
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
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  protected authService = inject(AuthService);

  registerForm!: FormGroup<ProfileForm>;
  isLoading = signal(false);
  errorMessage = signal('');

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      newsletter: [false]
    }, {
      validators: this.passwordMatchValidator
    }) as FormGroup<ProfileForm>;
  }

  private passwordMatchValidator(group: FormGroup<ProfileForm>): { [key: string]: any } | null {
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const formData = this.registerForm.getRawValue();
    
    // Use email as username (backend requirement)
    const userData: RegisterRequest = {
      username: formData.email, // Email as username - unique and user-controlled
      fullName: formData.name,
      email: formData.email,
      password: formData.password,
      role: UserRole.STUDENT
    };

    this.authService.register(userData).subscribe({
      next: (response) => {
        console.log('✅ Registration successful:', response);
        this.isLoading.set(false);
        
        // Redirect based on user role
        const userRole = response.user.role.toLowerCase();
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
        
        this.router.navigate([redirectUrl]);
      },
      error: (error) => {
        console.error('❌ Registration failed:', error);
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
    });
  }
}
