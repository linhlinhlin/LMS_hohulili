import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SessionExpiredService } from '../../../core/services/session-expired.service';

@Component({
  selector: 'app-session-expired-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showBanner()) {
      <div class="fixed top-0 left-0 right-0 z-[101] bg-amber-500 text-white px-4 py-2 flex items-center justify-between shadow-md"
           role="alert"
           aria-live="assertive">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
          <span class="text-sm font-semibold">
            Phiên đăng nhập hết hạn — Chế độ chỉ đọc — Kết nối mạng để đăng nhập lại
          </span>
        </div>
        <button (click)="goToLogin()"
                class="shrink-0 px-3 py-1 text-xs font-medium bg-white text-amber-700 rounded-lg hover:bg-amber-50 transition-colors">
          Đăng nhập lại
        </button>
      </div>
    }
  `,
})
export class SessionExpiredBannerComponent {
  protected readonly session = inject(SessionExpiredService);
  private readonly router = inject(Router);

  /** Hide banner on auth pages — login page handles its own offline state */
  protected readonly showBanner = computed(() =>
    this.session.showExpiredBanner() && !this.router.url.startsWith('/auth')
  );

  goToLogin(): void {
    // Can't login without network — only navigate if online
    if (!navigator.onLine) return;
    const returnUrl = window.location.pathname;
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl }
    });
  }
}
