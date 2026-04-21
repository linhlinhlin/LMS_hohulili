import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthResponse, AuthService, User } from '../../../core/services/auth.service';
import { getPortalRootRoute, mapAdminPortalPathForRole } from '../../../core/utils/portal-route.util';
import { isNewUser } from '../../../core/utils/auth.util';

/**
 * Receives the URL fragment payload that the backend appends after a successful
 * Google OAuth redirect (e.g. `/auth/google/callback#token=...&refresh=...&user=...`).
 *
 * The fragment never reaches the server (browsers strip it from requests + Referer),
 * so the JWT stays in the user's browser even though we used a full-page navigation.
 *
 * Failure paths are handled the same way: the BE redirects here with `#error=CODE&message=...`,
 * and we forward the user back to the login page with the message in a query param so the
 * login form can render it in its existing error banner.
 */
@Component({
  selector: 'app-google-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="callback-shell">
      <div class="callback-card" role="status" aria-live="polite">
        @if (status() === 'processing') {
          <div class="callback-spinner" aria-hidden="true"></div>
          <h1 class="callback-title">Đang hoàn tất đăng nhập…</h1>
          <p class="callback-copy">Vui lòng chờ trong giây lát.</p>
        } @else if (status() === 'error') {
          <div class="callback-icon callback-icon-error" aria-hidden="true">!</div>
          <h1 class="callback-title">Không thể đăng nhập</h1>
          <p class="callback-copy">{{ errorMessage() }}</p>
          <p class="callback-copy callback-copy-muted">Đang đưa bạn về trang đăng nhập…</p>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #fafafa;
    }

    .callback-shell {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }

    .callback-card {
      width: min(100%, 380px);
      padding: 32px 24px;
      border-radius: 16px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06);
      text-align: center;
      display: grid;
      gap: 12px;
      justify-items: center;
    }

    .callback-spinner {
      width: 36px;
      height: 36px;
      border-radius: 999px;
      border: 3px solid #e5e7eb;
      border-top-color: #0056d2;
      animation: spin 0.9s linear infinite;
    }

    .callback-icon {
      width: 44px;
      height: 44px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.4rem;
    }

    .callback-icon-error {
      background: #fef2f2;
      color: #b91c1c;
    }

    .callback-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #111827;
    }

    .callback-copy {
      margin: 0;
      font-size: 0.92rem;
      line-height: 1.6;
      color: #4b5563;
    }

    .callback-copy-muted {
      color: #9ca3af;
      font-size: 0.85rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class GoogleCallbackComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  protected readonly status = signal<'processing' | 'error'>('processing');
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      // SSR — nothing to do, the fragment isn't visible to the server anyway.
      return;
    }

    const fragment = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;

    if (!fragment) {
      this.failWith('Phản hồi từ Google không hợp lệ. Vui lòng thử lại.');
      return;
    }

    const params = new URLSearchParams(fragment);

    if (params.has('error')) {
      const message = params.get('message') || 'Đăng nhập Google không thành công.';
      this.failWith(message);
      return;
    }

    const accessToken = params.get('token');
    const refreshToken = params.get('refresh');
    const userParam = params.get('user');

    if (!accessToken || !refreshToken || !userParam) {
      this.failWith('Phản hồi đăng nhập từ máy chủ không đầy đủ.');
      return;
    }

    let user: User;
    try {
      user = JSON.parse(this.b64UrlDecode(userParam)) as User;
    } catch {
      this.failWith('Không đọc được thông tin tài khoản từ máy chủ.');
      return;
    }

    const authResponse: AuthResponse = {
      accessToken,
      refreshToken,
      user
    };

    this.auth.hydrateFromOAuthRedirect(authResponse);

    // Drop the fragment so the JWT is no longer in the URL bar (and won't survive
    // a back-button navigation back to this page).
    history.replaceState(null, '', window.location.pathname);

    if (isNewUser(user)) {
      this.router.navigateByUrl('/auth/onboarding');
      return;
    }

    const returnUrl = params.get('returnUrl') || '';
    const role = (user.role || '').toLowerCase();
    const target = this.isSafeInternalUrl(returnUrl)
      ? mapAdminPortalPathForRole(returnUrl, role)
      : getPortalRootRoute(role);

    this.router.navigateByUrl(target);
  }

  private failWith(message: string): void {
    this.status.set('error');
    this.errorMessage.set(message);

    setTimeout(() => {
      this.router.navigate(['/auth/login'], {
        queryParams: { error: message }
      });
    }, 1800);
  }

  private isSafeInternalUrl(url: string): boolean {
    return !!url && url.startsWith('/') && !url.startsWith('//');
  }

  private b64UrlDecode(value: string): string {
    // Convert URL-safe base64 back to standard base64 + restore padding before decoding.
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    return decodeURIComponent(escape(atob(padded + padding)));
  }
}
