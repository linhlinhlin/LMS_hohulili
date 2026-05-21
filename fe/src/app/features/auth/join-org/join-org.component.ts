import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { OrganizationService } from '../../admin/infrastructure/services/organization.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { SeoService } from '../../../core/services/seo.service';
import { OrganizationInvite } from '../../../shared/types/user.types';
import { getPortalLandingRoute } from '../../../core/utils/portal-route.util';

@Component({
  selector: 'app-join-org',
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        @if (isLoading()) {
          <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#0056D2] border-t-transparent"></div>
            <p class="mt-4 text-gray-500 text-sm">Đang xác thực lời mời...</p>
          </div>
        } @else if (error()) {
          <div class="text-center py-8">
            <div class="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-gray-900 mb-2">Lời mời không hợp lệ</h2>
            <p class="text-gray-500 text-sm mb-6">{{ error() }}</p>
            <a routerLink="/auth/login"
               class="inline-flex items-center px-6 py-3 bg-[#0056D2] text-white rounded-xl font-medium hover:bg-[#004BB5] transition-colors shadow-sm">
              Đăng nhập
            </a>
          </div>
        } @else if (invite()) {
          <div class="text-center">
            <div class="w-16 h-16 bg-[#0056D2]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-[#0056D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Lời mời tham gia</h2>
            <p class="text-lg text-[#0056D2] font-semibold mb-1">{{ invite()!.organizationName }}</p>
            <p class="text-sm text-gray-500 mb-8">Bạn được mời tham gia tổ chức này</p>

            @if (isAuthenticated()) {
              <button (click)="acceptInvite()"
                      [disabled]="isAccepting()"
                      class="w-full py-3 px-6 bg-[#0056D2] text-white rounded-xl font-semibold hover:bg-[#004BB5] transition-colors disabled:opacity-50 shadow-sm">
                @if (isAccepting()) {
                  <span class="inline-flex items-center gap-2">
                    <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </span>
                } @else {
                  Tham gia tổ chức
                }
              </button>
            } @else {
              <a [routerLink]="['/auth/login']" [queryParams]="{ redirect: currentUrl(), invite: invite()?.code || '' }"
                 class="block w-full py-3 px-6 bg-[#0056D2] text-white text-center rounded-xl font-semibold hover:bg-[#004BB5] transition-colors shadow-sm">
                Đăng nhập hoặc tạo tài khoản
              </a>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class JoinOrgComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orgService = inject(OrganizationService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private seo = inject(SeoService);

  isLoading = signal(true);
  error = signal('');
  invite = signal<OrganizationInvite | null>(null);
  isAccepting = signal(false);
  isAuthenticated = signal(false);
  currentUrl = signal('');

  ngOnInit(): void {
    this.seo.setNoindex();

    this.isAuthenticated.set(this.authService.isAuthenticated());
    this.currentUrl.set(this.router.url);

    const token = this.route.snapshot.queryParamMap.get('token');
    const code = this.route.snapshot.queryParamMap.get('code');

    if (token) {
      this.validateToken(token);
    } else if (code) {
      this.validateCode(code);
    } else {
      this.isLoading.set(false);
      this.error.set('Thiếu mã mời hoặc token trong URL');
    }
  }

  inviteQueryForRegister(): Record<string, string> {
    const inv = this.invite();
    if (inv?.code) return { invite: inv.code };
    // EMAIL invites use tokens, not codes — don't pass to register
    // User registers normally, then accepts invite post-login via /auth/join?token=...
    return {};
  }

  private validateToken(token: string): void {
    this.orgService.validateInviteToken(token).subscribe({
      next: (invite) => {
        this.invite.set(invite);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Liên kết mời không hợp lệ hoặc đã hết hạn');
        this.isLoading.set(false);
      }
    });
  }

  private validateCode(code: string): void {
    this.orgService.validateInviteCode(code).subscribe({
      next: (invite) => {
        this.invite.set(invite);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Mã mời không hợp lệ hoặc đã hết hạn');
        this.isLoading.set(false);
      }
    });
  }

  acceptInvite(): void {
    this.isAccepting.set(true);

    const token = this.route.snapshot.queryParamMap.get('token');
    const code = this.route.snapshot.queryParamMap.get('code') || this.invite()?.code;

    const payload = token ? { token } : { code: code || '' };

    this.orgService.acceptInvite(payload).subscribe({
      next: () => {
        this.toast.success('Tham gia thành công!', `Đã tham gia tổ chức "${this.invite()?.organizationName}"`);
        const role = this.authService.userRole();
        this.router.navigate([getPortalLandingRoute(role)]);
      },
      error: (err) => {
        this.isAccepting.set(false);
        this.toast.error(err.error?.message || 'Không thể tham gia tổ chức. Vui lòng thử lại.');
      }
    });
  }
}
