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
  templateUrl: './login.component.html',
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
      next: (response: any) => {
        console.log('âœ… Login successful in component:', response);
        this.isLoading.set(false);

        // Redirect based on user role
        const userRole = response.user.role.toLowerCase();
        console.log('đŸ‘¤ User role:', userRole);

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

        console.log('đŸ”„ Redirecting to:', redirectUrl);
        console.log('đŸ”„ Calling router.navigate with:', [redirectUrl]);

        this.router.navigate([redirectUrl]).then((success: boolean) => {
          console.log('đŸ”„ Navigation result:', success);
          if (!success) {
            console.error('âŒ Navigation failed!');
          }
        }).catch((error: any) => {
          console.error('âŒ Navigation error:', error);
        });
      },
      error: (error: any) => {
        console.error('âŒ Login failed in component:', error);
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'ÄÄƒng nháº­p tháº¥t báº¡i. Vui lĂ²ng thá»­ láº¡i.');
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
      this.successMessage.set(`ÄĂ£ Ä‘Äƒng nháº­p thĂ nh cĂ´ng vá»›i tĂ i khoáº£n ${roleName}!`);
      this.showSuccessMessage.set(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        this.showSuccessMessage.set(false);
      }, 3000);

      // âœ… Redirect is handled by AuthService
    } catch (error) {
      // Error is handled by the store
    }
  }

  private getRoleDisplayName(role: UserRole): string {
    switch (role) {
      case UserRole.STUDENT: return 'Há»c viĂªn';
      case UserRole.TEACHER: return 'Giáº£ng viĂªn';
      case UserRole.ADMIN: return 'Quáº£n trá»‹ viĂªn';
      default: return 'NgÆ°á»i dĂ¹ng';
    }
  }

  getErrorMessage(error: string): string {
    // Map common error messages to user-friendly Vietnamese messages
    const errorMappings: Record<string, string> = {
      'Invalid credentials': 'TĂªn Ä‘Äƒng nháº­p hoáº·c máº­t kháº©u khĂ´ng Ä‘Ăºng',
      'User not found': 'TĂ i khoáº£n khĂ´ng tá»“n táº¡i',
      'Account locked': 'TĂ i khoáº£n Ä‘Ă£ bá»‹ khĂ³a',
      'Too many attempts': 'QuĂ¡ nhiá»u láº§n thá»­ Ä‘Äƒng nháº­p. Vui lĂ²ng thá»­ láº¡i sau.',
      'Network error': 'Lá»—i káº¿t ná»‘i máº¡ng. Vui lĂ²ng kiá»ƒm tra káº¿t ná»‘i internet.',
      'Server error': 'Lá»—i mĂ¡y chá»§. Vui lĂ²ng thá»­ láº¡i sau.',
      'Login failed': 'ÄÄƒng nháº­p tháº¥t báº¡i. Vui lĂ²ng thá»­ láº¡i.'
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

