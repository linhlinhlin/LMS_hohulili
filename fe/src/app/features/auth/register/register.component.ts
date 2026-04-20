import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthResponse, AuthService } from '../../../core/services/auth.service';
import { RegisterRequest, UserRole } from '../../../shared/types/user.types';
import { OrganizationService } from '../../admin/infrastructure/services/organization.service';
import { getPortalRootRoute } from '../../../core/utils/portal-route.util';
import { GoogleSigninButtonComponent } from '../components/google-signin-button.component';

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
  imports: [RouterModule, ReactiveFormsModule, GoogleSigninButtonComponent],
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
  readonly inviteCodeError = signal('');

  ngOnInit(): void {
    const inviteFromUrl = this.route.snapshot.queryParamMap.get('invite') || '';
    const emailFromUrl = this.route.snapshot.queryParamMap.get('email')?.trim() || '';

    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: [emailFromUrl, [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      inviteCode: [inviteFromUrl],
      newsletter: [false]
    }, {
      validators: this.passwordMatchValidator
    }) as FormGroup<ProfileForm>;

    if (inviteFromUrl) {
      this.validateInviteCode(inviteFromUrl);
    }
  }

  validateInviteCode(code: string): void {
    if (!code || code.trim().length < 3) {
      this.inviteOrgName.set('');
      this.inviteCodeError.set('');
      return;
    }

    this.orgService.validateInviteCode(code.trim()).subscribe({
      next: (invite) => {
        this.inviteOrgName.set(invite.organizationName || '');
        this.inviteCodeError.set('');
      },
      error: () => {
        this.inviteOrgName.set('');
        this.inviteCodeError.set('Mã mời không hợp lệ hoặc đã hết hạn');
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const formData = this.registerForm.getRawValue();
    const userData: RegisterRequest = {
      username: formData.email,
      fullName: formData.name,
      email: formData.email,
      password: formData.password,
      role: UserRole.STUDENT,
      inviteCode: this.getInviteCode()
    };

    this.authService.register(userData).subscribe({
      next: (response: AuthResponse) => this.handleSuccessfulAuthentication(response),
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
    });
  }

  onGoogleAuthenticated(response: AuthResponse): void {
    this.handleSuccessfulAuthentication(response);
  }

  onGoogleAuthError(message: string): void {
    this.errorMessage.set(message);
  }

  getInviteCode(): string | undefined {
    const inviteCode = this.registerForm?.get('inviteCode')?.value;
    const normalized = inviteCode?.trim();
    return normalized ? normalized : undefined;
  }

  private passwordMatchValidator(group: FormGroup<ProfileForm>): { [key: string]: any } | null {
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  private handleSuccessfulAuthentication(response: AuthResponse): void {
    this.isLoading.set(false);
    this.errorMessage.set('');
    const userRole = response.user.role.toLowerCase();
    const redirectUrl = getPortalRootRoute(userRole);
    this.router.navigate([redirectUrl]);
  }
}
