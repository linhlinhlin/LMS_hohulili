import { Component, signal, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';

import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterRequest, UserRole } from '../../../shared/types/user.types';
import { OrganizationService } from '../../admin/infrastructure/services/organization.service';

// Multi-step registration forms
type EmailForm = {
  email: FormControl<string>;
};

type ProfileForm = {
  name: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
  inviteCode: FormControl<string>;
  newsletter: FormControl<boolean>;
};

@Component({
  selector: 'app-register',
  imports: [RouterModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private orgService = inject(OrganizationService);
  protected authService = inject(AuthService);

  registerForm!: FormGroup<ProfileForm>;
  isLoading = signal(false);
  errorMessage = signal('');
  inviteOrgName = signal('');

  ngOnInit(): void {
    // Read invite code from URL ?invite=CODE
    const inviteFromUrl = this.route.snapshot.queryParamMap.get('invite') || '';

    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      inviteCode: [inviteFromUrl],
      newsletter: [false]
    }, {
      validators: this.passwordMatchValidator
    }) as FormGroup<ProfileForm>;

    // If invite code from URL, validate it
    if (inviteFromUrl) {
      this.validateInviteCode(inviteFromUrl);
    }
  }

  validateInviteCode(code: string): void {
    if (!code || code.trim().length < 3) {
      this.inviteOrgName.set('');
      return;
    }
    this.orgService.validateInviteCode(code.trim()).subscribe({
      next: (invite) => {
        this.inviteOrgName.set(invite.organizationName || '');
      },
      error: () => {
        this.inviteOrgName.set('');
      }
    });
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
      role: UserRole.STUDENT,
      inviteCode: formData.inviteCode || undefined
    };

    this.authService.register(userData).subscribe({
      next: (response) => {

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
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
    });
  }
}
