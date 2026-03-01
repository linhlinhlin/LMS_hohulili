import { Component, signal, inject, ChangeDetectionStrategy, computed } from '@angular/core';

import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
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
  imports: [RouterModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  protected authService = inject(AuthService);
  protected network = inject(NetworkStatusService);
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

  /** Soft logout detection — show "Resume offline" button */
  readonly isSoftLogout = signal(false);
  readonly canResume = computed(() =>
    this.isSoftLogout() && this.authService.canResumeSession() && !this.network.online()
  );
  readonly isOffline = computed(() => !this.network.online());

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, this.emailOrUsernameValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    }) as FormGroup<LoginForm>;

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

    // Detect soft logout from query params
    if (this.route.snapshot.queryParams['softLogout'] === 'true') {
      this.isSoftLogout.set(true);
    }
  }

  /** Resume the offline session — restores UI state from cached tokens */
  resumeOffline(): void {
    this.authService.resumeOfflineSession();
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
      next: (response: any) => {
        this.isLoading.set(false);

        // Redirect based on user role
        const userRole = response.user.role.toLowerCase();

        let redirectUrl = '/';
        switch (userRole) {
          case 'admin':
          case 'org_admin':
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
      error: (error: any) => {
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
}
