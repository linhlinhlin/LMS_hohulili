import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthResponse, AuthService } from '../../../core/services/auth.service';
import { GoogleAuthConfig, GoogleIdentityService } from '../../../core/services/google-identity.service';

type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with';
type GoogleButtonSurface = 'card' | 'bare';

@Component({
  selector: 'app-google-signin-button',
  template: `
    <div class="google-auth-shell" [class.google-auth-shell-hidden]="!isAvailable() && !noticeMessage() && !errorMessage()">
      @if (showDivider()) {
        <div class="google-divider">
          <span class="google-divider-line" aria-hidden="true"></span>
          <span>{{ dividerLabel() }}</span>
          <span class="google-divider-line" aria-hidden="true"></span>
        </div>
      }

      <div class="google-surface" [class.google-surface-card]="surface() === 'card'">
        @if (isAvailable()) {
          @if (useRedirectFlow()) {
          <!-- Redirect-flow mode: a normal <button> that navigates the browser to the BE
               authorize endpoint. No Google JS SDK runs in this mode — bypasses FedCM,
               popups, third-party-cookie restrictions entirely. -->
          <button
            type="button"
            class="google-button-visual google-button-real"
            [class.google-button-visual-disabled]="isPending() || disabled()"
            [disabled]="isPending() || disabled()"
            (click)="startRedirectFlow()"
          >
            <svg class="google-button-icon" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
              <path fill="#EA4335" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.717v2.258h2.908c1.701-1.566 2.684-3.874 2.684-6.615z"/>
              <path fill="#4285F4" d="M9 18c2.43 0 4.468-.806 5.957-2.18l-2.908-2.258c-.806.54-1.837.86-3.049.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.998 8.998 0 009 18z"/>
              <path fill="#FBBC05" d="M3.964 10.712A5.41 5.41 0 013.682 9c0-.595.102-1.173.282-1.712V4.956H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.044l3.007-2.332z"/>
              <path fill="#34A853" d="M9 3.578c1.322 0 2.507.455 3.44 1.347l2.58-2.58C13.464.891 11.426 0 9 0A8.998 8.998 0 00.957 4.956l3.007 2.332C4.672 5.161 6.656 3.578 9 3.578z"/>
            </svg>
            <span class="google-button-label">{{ visualLabel() }}</span>
          </button>
          <!-- Hidden container kept so #buttonContainer viewChild stays satisfied even in
               redirect mode (no rendering side-effects). -->
          <div #buttonContainer class="google-button-host-noop" aria-hidden="true"></div>
        } @else {
          <div
            class="google-button-visual"
            [class.google-button-visual-disabled]="isPending() || disabled()"
            aria-hidden="true"
          >
            <svg class="google-button-icon" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
              <path fill="#EA4335" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.717v2.258h2.908c1.701-1.566 2.684-3.874 2.684-6.615z"/>
              <path fill="#4285F4" d="M9 18c2.43 0 4.468-.806 5.957-2.18l-2.908-2.258c-.806.54-1.837.86-3.049.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.998 8.998 0 009 18z"/>
              <path fill="#FBBC05" d="M3.964 10.712A5.41 5.41 0 013.682 9c0-.595.102-1.173.282-1.712V4.956H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.044l3.007-2.332z"/>
              <path fill="#34A853" d="M9 3.578c1.322 0 2.507.455 3.44 1.347l2.58-2.58C13.464.891 11.426 0 9 0A8.998 8.998 0 00.957 4.956l3.007 2.332C4.672 5.161 6.656 3.578 9 3.578z"/>
            </svg>

            <span class="google-button-label">{{ visualLabel() }}</span>
          </div>

          <div
            #buttonContainer
            class="google-button-host"
            [class.google-button-host-disabled]="isPending() || disabled()"
          ></div>
          }
        } @else if (noticeMessage()) {
          <div class="google-unavailable" role="status" aria-live="polite">
            <p class="google-unavailable-title">Đăng nhập Google tạm thời chưa khả dụng</p>
            <p class="google-unavailable-copy">{{ noticeMessage() }}</p>
          </div>
          <div #buttonContainer class="google-button-host-noop" aria-hidden="true"></div>
        }
      </div>

      @if (isPending()) {
        <p class="google-helper google-helper-status">Đang xác thực với Google...</p>
      } @else if (showHelperText() && helperText() && !errorMessage()) {
        <p class="google-helper">{{ helperText() }}</p>
      }

      @if (errorMessage()) {
        <p class="google-error" role="alert" aria-live="polite">{{ errorMessage() }}</p>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .google-auth-shell {
      display: grid;
      gap: 12px;
    }

    .google-auth-shell-hidden {
      display: none;
    }

    .google-divider {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #9ca3af;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .google-divider-line {
      flex: 1;
      height: 1px;
      background: #e5e7eb;
    }

    .google-surface {
      position: relative;
      width: 100%;
    }

    .google-surface-card {
      padding: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 22px;
      background: #ffffff;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
    }

    .google-button-visual {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      min-height: 46px;
      padding: 0 18px;
      border: 1px solid #d1d5db;
      border-radius: 14px;
      background: #ffffff;
      color: #374151;
      font-size: 0.94rem;
      font-weight: 700;
      line-height: 1;
      pointer-events: none;
      transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
    }

    .google-surface:hover .google-button-visual {
      border-color: #9ca3af;
      background: #f9fafb;
      color: #111827;
    }

    .google-surface:focus-within .google-button-visual {
      border-color: #0056d2;
      box-shadow: 0 0 0 4px rgba(0, 86, 210, 0.12);
      outline: none;
    }

    .google-button-visual-disabled {
      opacity: 0.72;
    }

    .google-button-icon {
      width: 18px;
      height: 18px;
      flex: 0 0 auto;
    }

    .google-button-label {
      white-space: nowrap;
    }

    .google-button-host {
      position: absolute;
      inset: 0;
      z-index: 1;
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-radius: 14px;
      opacity: 0.01;
      cursor: pointer;
      transition: opacity 0.18s ease;
    }

    .google-button-host > div,
    .google-button-host iframe {
      width: 100% !important;
      height: 100% !important;
      border-radius: 14px !important;
    }

    .google-button-host-disabled {
      pointer-events: none;
    }

    /* Redirect-mode button: same visual as the fake overlay, but interactive. */
    .google-button-real {
      cursor: pointer;
      pointer-events: auto;
    }

    .google-button-real:hover {
      border-color: #9ca3af;
      background: #f9fafb;
      color: #111827;
    }

    .google-button-real:active:not(:disabled) {
      transform: scale(0.98);
      background: #f3f4f6;
    }

    .google-button-real:focus-visible {
      border-color: #0056d2;
      box-shadow: 0 0 0 4px rgba(0, 86, 210, 0.12);
      outline: none;
    }

    .google-button-real:disabled {
      cursor: not-allowed;
    }

    .google-button-host-noop {
      display: none;
    }

    .google-unavailable {
      display: grid;
      gap: 6px;
      padding: 14px 16px;
      border: 1px solid #dbeafe;
      border-radius: 14px;
      background: #eff6ff;
    }

    .google-unavailable-title {
      margin: 0;
      color: #1d4ed8;
      font-size: 0.88rem;
      font-weight: 700;
      line-height: 1.5;
    }

    .google-unavailable-copy {
      margin: 0;
      color: #1e3a8a;
      font-size: 0.82rem;
      line-height: 1.6;
    }

    .google-helper {
      margin: 0;
      color: #6b7280;
      font-size: 0.78rem;
      line-height: 1.65;
      text-align: center;
    }

    .google-helper-status {
      font-size: 0.9rem;
      color: #4b5563;
    }

    .google-error {
      margin: 0;
      color: #dc2626;
      font-size: 0.88rem;
      line-height: 1.6;
    }

    @media (min-width: 768px) {
      .google-helper {
        font-size: 0.82rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoogleSigninButtonComponent implements AfterViewInit {
  private authService = inject(AuthService);
  private googleIdentityService = inject(GoogleIdentityService);
  private destroyRef = inject(DestroyRef);

  /**
   * Destroyed flag — because the Google Identity callback is a detached closure stored on the
   * singleton service, it can fire after this component has been destroyed (e.g. user navigates
   * mid-popup). Without this guard we'd write to signals and emit outputs on a dead instance.
   */
  private destroyed = false;

  readonly inviteCode = input<string | undefined>(undefined);
  readonly disabled = input(false);
  readonly showDivider = input(true);
  readonly showHelperText = input(true);
  readonly dividerLabel = input('Hoặc');
  readonly buttonText = input<GoogleButtonText>('continue_with');
  readonly surface = input<GoogleButtonSurface>('card');
  readonly buttonWidth = input<number | string | null>(null);
  readonly unavailableMessageOverride = input<string | null | undefined>(undefined);
  readonly authenticated = output<AuthResponse>();
  readonly authError = output<string>();

  protected readonly isAvailable = signal(false);
  protected readonly isPending = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly noticeMessage = signal('');
  protected readonly helperText = signal('');
  /** True when the BE advertises the server-side authorization-code flow. Drives template branching. */
  protected readonly useRedirectFlow = signal(false);
  protected readonly visualLabel = computed(() => {
    switch (this.buttonText()) {
      case 'signin_with':
        return 'Đăng nhập bằng Google';
      case 'signup_with':
        return 'Đăng ký bằng Google';
      default:
        return 'Tiếp tục với Google';
    }
  });

  private readonly buttonContainer = viewChild.required<ElementRef<HTMLElement>>('buttonContainer');
  private googleConfig: GoogleAuthConfig | null = null;

  async ngAfterViewInit(): Promise<void> {
    this.destroyRef.onDestroy(() => { this.destroyed = true; });

    // SEO Phase 7: skip Google IDS init during SSR — script loads window.google
    // which doesn't exist on Node.js. Browser hydration sẽ re-run lifecycle.
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const config = await firstValueFrom(this.googleIdentityService.getConfig());
      if (this.destroyed) {
        return;
      }

      this.googleConfig = config;
      if (!config.enabled || !config.clientId) {
        this.isAvailable.set(false);
        this.useRedirectFlow.set(false);
        this.helperText.set('');
        this.noticeMessage.set(
          this.unavailableMessageOverride()?.trim()
            || config.unavailableMessage?.trim()
            || 'Đăng nhập Google tạm thời chưa khả dụng. Vui lòng dùng email và mật khẩu.'
        );
        return;
      }

      this.noticeMessage.set('');
      this.isAvailable.set(true);
      this.useRedirectFlow.set(false);

      // Prefer the server-side redirect flow when the BE advertises it. No GSI script,
      // no popup, no FedCM — just a normal navigation. Fall back to the in-page button
      // when the BE doesn't have the redirect endpoints configured.
      if (config.redirectFlowEnabled && config.authorizeUrl) {
        this.useRedirectFlow.set(true);
        this.helperText.set('Bạn sẽ được chuyển sang trang đăng nhập của Google.');
        return;
      }

      const experience = this.googleIdentityService.getPreferredButtonExperience();
      this.helperText.set(experience.helperText);
      await new Promise((resolve) => setTimeout(resolve));
      if (this.destroyed) {
        return;
      }
      await this.renderButton();
    } catch {
      if (!this.destroyed) {
        this.noticeMessage.set('');
        this.errorMessage.set('Đăng nhập Google tạm thời chưa khả dụng.');
      }
    }
  }

  /**
   * Click handler for redirect-flow mode. Builds the authorize URL with the optional
   * invite code + return URL and navigates the whole window away to the BE, which
   * immediately 302s to Google.
   */
  protected startRedirectFlow(): void {
    if (this.disabled() || this.isPending() || !this.googleConfig?.authorizeUrl) {
      return;
    }

    const params = new URLSearchParams();
    const invite = this.normalizedInviteCode();
    if (invite) {
      params.set('invite', invite);
    }
    if (typeof window !== 'undefined') {
      const returnUrl = new URLSearchParams(window.location.search).get('returnUrl')
        || new URLSearchParams(window.location.search).get('redirect');
      if (returnUrl) {
        params.set('returnUrl', returnUrl);
      }
    }

    this.isPending.set(true);
    const query = params.toString();
    const url = query ? `${this.googleConfig.authorizeUrl}?${query}` : this.googleConfig.authorizeUrl;

    if (typeof window !== 'undefined') {
      window.location.assign(url);
    }
  }

  private async handleCredential(idToken: string): Promise<void> {
    // The callback is held in GoogleIdentityService.activeCredentialCallback. If the user
    // navigated away between opening the popup and receiving the credential, this instance
    // is already destroyed — skip all writes to avoid "signal write on destroyed view" noise.
    if (this.destroyed || this.disabled() || this.isPending()) {
      return;
    }

    this.isPending.set(true);
    this.errorMessage.set('');

    try {
      const response = await firstValueFrom(this.authService.loginWithGoogle({
        idToken,
        inviteCode: this.normalizedInviteCode()
      }));
      this.authenticated.emit(response);
    } catch (error: any) {
      const message = error?.error?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.';
      this.errorMessage.set(message);
      this.authError.emit(message);
    } finally {
      this.isPending.set(false);
    }
  }

  private normalizedInviteCode(): string | undefined {
    const value = this.inviteCode();
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private async renderButton(): Promise<void> {
    if (!this.googleConfig) {
      return;
    }

    await this.googleIdentityService.renderSignInButton(
      this.buttonContainer().nativeElement,
      this.googleConfig,
      (credential) => {
        void this.handleCredential(credential);
      },
      {
        text: this.buttonText(),
        width: this.buttonWidth()
      }
    );
  }
}
