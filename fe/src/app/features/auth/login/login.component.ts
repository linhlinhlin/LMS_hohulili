import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  Injector,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AuthLookupResponse,
  AuthResponse,
  AuthService
} from '../../../core/services/auth.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { LoginRequest, RegisterRequest, UserRole } from '../../../shared/types/user.types';
import { getPortalRootRoute, mapAdminPortalPathForRole } from '../../../core/utils/portal-route.util';
import { isNewUser } from '../../../core/utils/auth.util';
import { GoogleSigninButtonComponent } from '../components/google-signin-button.component';
import { OrganizationService } from '../../admin/infrastructure/services/organization.service';
import { SeoService } from '../../../core/services/seo.service';

type LoginStep = 'identify' | 'password' | 'google' | 'register';

type IdentifyForm = {
  email: FormControl<string>;
};

type PasswordForm = {
  password: FormControl<string>;
};

type RegisterPasswordForm = {
  password: FormControl<string>;
  inviteCode: FormControl<string>;
};

@Component({
  selector: 'app-login',
  imports: [RouterModule, ReactiveFormsModule, GoogleSigninButtonComponent],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  protected authService = inject(AuthService);
  protected network = inject(NetworkStatusService);

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private injector = inject(Injector);
  private orgService = inject(OrganizationService);
  private seo = inject(SeoService);

  identifyForm: FormGroup<IdentifyForm>;
  passwordForm: FormGroup<PasswordForm>;
  registerPasswordForm: FormGroup<RegisterPasswordForm>;

  /** Reference to the password input — used to move focus when entering the password step,
   *  so keyboard users don't need to Tab into the field after an email lookup succeeds. */
  private readonly passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');

  readonly step = signal<LoginStep>('identify');
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly showSuccessMessage = signal(false);
  readonly showPassword = signal(false);
  readonly lookupResult = signal<AuthLookupResponse | null>(null);
  readonly showRegisterPassword = signal(false);
  readonly showInviteField = signal(false);
  readonly inviteOrgName = signal('');
  readonly inviteCodeError = signal('');

  readonly isOffline = computed(() => !this.network.online());
  readonly canResume = computed(() => this.isOffline() && this.authService.canResumeSession());
  readonly isOfflineNoSession = computed(() => this.isOffline() && !this.canResume());
  readonly savedUser = computed(() => this.canResume() ? this.authService.getSavedUser() : null);
  readonly savedUserInitial = computed(() => {
    const user = this.savedUser();
    if (!user) {
      return '';
    }

    const name = user.fullName || user.name || user.email || '';
    return name.charAt(0).toUpperCase();
  });

  readonly currentEmail = computed(() => this.lookupResult()?.email || this.identifyForm.controls.email.value || '');
  readonly currentDisplayName = computed(() => this.lookupResult()?.displayName || this.currentEmail());
  readonly stepTitle = computed(() => {
    switch (this.step()) {
      case 'identify':
        return 'Đăng nhập';
      case 'password':
        return 'Nhập mật khẩu';
      case 'google':
        return 'Đăng nhập bằng Google';
      case 'register':
        return 'Tạo tài khoản';
    }
  });
  readonly stepDescription = computed(() => {
    switch (this.step()) {
      case 'identify':
        return '';
      case 'password':
        return 'Nhập mật khẩu để tiếp tục.';
      case 'google':
        return 'Chọn tài khoản Google đã liên kết.';
      case 'register':
        return 'Email này chưa có tài khoản.';
    }
  });

  constructor() {
    // SEO Phase 5: auth pages should not be indexed (login form, no public content)
    this.seo.setNoindex();

    const prefilledEmail = this.route.snapshot.queryParamMap.get('email')?.trim() || '';
    const message = this.route.snapshot.queryParamMap.get('message')?.trim() || '';
    const errorParam = this.route.snapshot.queryParamMap.get('error')?.trim() || '';

    this.identifyForm = this.fb.group({
      email: [prefilledEmail, [Validators.required, Validators.email]]
    }) as FormGroup<IdentifyForm>;

    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]]
    }) as FormGroup<PasswordForm>;

    this.registerPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      inviteCode: ['']
    }) as FormGroup<RegisterPasswordForm>;

    const inviteFromUrl = this.route.snapshot.queryParamMap.get('invite') || '';
    if (inviteFromUrl) {
      this.showInviteField.set(true);
      this.registerPasswordForm.controls.inviteCode.setValue(inviteFromUrl);
      this.validateInviteCode(inviteFromUrl);
    }

    if (errorParam) {
      this.errorMessage.set(errorParam);
    } else if (message && message !== 'Đã đăng xuất thành công') {
      this.successMessage.set(message);
      this.showSuccessMessage.set(true);
    }

    if (message || errorParam) {
      this.cleanUrlParams();
    }

    // Move focus to the password input the moment we render the password step.
    // afterNextRender is the signal-safe way to reach for the DOM once the template has
    // actually rendered the new branch of the @if. We pass the component's Injector
    // because effect() callbacks run outside Angular's injection context.
    effect(() => {
      if (this.step() === 'password') {
        afterNextRender(
          () => this.passwordInput()?.nativeElement.focus(),
          { injector: this.injector }
        );
      }
    });
  }

  resumeOffline(): void {
    this.authService.resumeOfflineSession();
  }

  submitIdentifier(): void {
    if (this.identifyForm.invalid) {
      this.identifyForm.markAllAsTouched();
      return;
    }

    const email = this.identifyForm.controls.email.value.trim().toLowerCase();
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.lookupAuthOptions(email).subscribe({
      next: (result) => {
        this.isLoading.set(false);
        this.lookupResult.set(result);
        this.identifyForm.controls.email.setValue(result.email);
        this.passwordForm.reset({ password: '' });
        this.showPassword.set(false);
        this.step.set(this.mapLookupStep(result));
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'Không thể xác định phương thức đăng nhập. Vui lòng thử lại.');
      }
    });
  }

  submitPassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const email = this.currentEmail();
    if (!email) {
      this.backToIdentifier();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const formValue = this.passwordForm.getRawValue();
    const credentials: LoginRequest = {
      email,
      password: formValue.password,
    };

    this.authService.login(credentials).subscribe({
      next: (response: AuthResponse) => this.handleSuccessfulAuthentication(response),
      error: (error: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.getErrorMessage(
          error.error?.message || 'Đăng nhập thất bại. Vui lòng thử lại.'
        ));
      },
    });
  }

  backToIdentifier(): void {
    this.step.set('identify');
    this.lookupResult.set(null);
    this.passwordForm.reset({ password: '' });
    this.showPassword.set(false);
    this.errorMessage.set('');
  }

  submitRegister(): void {
    if (this.registerPasswordForm.invalid) {
      this.registerPasswordForm.markAllAsTouched();
      return;
    }

    const email = this.currentEmail();
    if (!email) {
      this.backToIdentifier();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const formData = this.registerPasswordForm.getRawValue();
    const tempName = email.split('@')[0];
    const inviteCode = formData.inviteCode?.trim() || undefined;

    const userData: RegisterRequest = {
      username: email,
      fullName: tempName,
      email,
      password: formData.password,
      role: UserRole.STUDENT,
      inviteCode
    };

    this.authService.register(userData).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigateByUrl('/auth/onboarding');
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'Tạo tài khoản thất bại. Vui lòng thử lại.');
      }
    });
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

  useDifferentEmail(): void {
    this.identifyForm.controls.email.setValue('');
    this.backToIdentifier();
  }

  dismissSuccessMessage(): void {
    this.showSuccessMessage.set(false);
  }

  dismissError(): void {
    this.errorMessage.set('');
  }

  private cleanUrlParams(): void {
    const url = this.router.createUrlTree(['/auth/login'], {
      queryParams: { email: this.route.snapshot.queryParamMap.get('email') || undefined }
    });
    this.router.navigateByUrl(url, { replaceUrl: true, skipLocationChange: false });
  }

  onGoogleAuthenticated(response: AuthResponse): void {
    this.handleSuccessfulAuthentication(response);
  }

  onGoogleAuthError(message: string): void {
    this.errorMessage.set(message);
  }

  getInviteCode(): string | undefined {
    const inviteCode = this.route.snapshot.queryParamMap.get('invite');
    const normalized = inviteCode?.trim();
    return normalized ? normalized : undefined;
  }

  private mapLookupStep(result: AuthLookupResponse): LoginStep {
    switch (result.nextStep) {
      case 'PASSWORD':
        return 'password';
      case 'GOOGLE':
        return 'google';
      case 'REGISTER':
        return 'register';
    }
  }

  private getErrorMessage(error: string): string {
    const errorMappings: Record<string, string> = {
      'Invalid credentials': 'Email hoặc mật khẩu không đúng',
      'Thông tin đăng nhập không chính xác': 'Email hoặc mật khẩu không đúng',
      'User not found': 'Tài khoản không tồn tại',
      'Account locked': 'Tài khoản đã bị khóa',
      'Too many attempts': 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau.',
      'Network error': 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.',
      'Server error': 'Lỗi máy chủ. Vui lòng thử lại sau.',
      'Login failed': 'Đăng nhập thất bại. Vui lòng thử lại.',
    };

    for (const [key, message] of Object.entries(errorMappings)) {
      if (error.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }

    return error;
  }

  private resolvePostLoginRedirect(userRole: string): string {
    const requestedUrl = this.route.snapshot.queryParamMap.get('returnUrl')
      || this.route.snapshot.queryParamMap.get('redirect')
      || '';

    if (this.isSafeInternalUrl(requestedUrl)) {
      return mapAdminPortalPathForRole(requestedUrl, userRole);
    }

    return getPortalRootRoute(userRole);
  }

  private isSafeInternalUrl(url: string): boolean {
    return !!url && url.startsWith('/') && !url.startsWith('//');
  }

  private handleSuccessfulAuthentication(response: AuthResponse): void {
    this.isLoading.set(false);
    this.errorMessage.set('');

    if (isNewUser(response.user)) {
      this.router.navigateByUrl('/auth/onboarding');
      return;
    }

    const userRole = response.user.role.toLowerCase();
    const redirectUrl = this.resolvePostLoginRedirect(userRole);
    this.router.navigateByUrl(redirectUrl);
  }

}
