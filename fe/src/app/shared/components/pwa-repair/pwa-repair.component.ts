import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';
import { PwaRepairService, type PwaRepairResult } from '../../../core/services/pwa-repair.service';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-pwa-repair',
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-3xl space-y-6">
        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p class="text-sm font-medium uppercase tracking-wide text-[#0056D2]">Khôi phục PWA</p>
          <h1 class="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Sửa lại bộ nhớ ngoại tuyến và service worker
          </h1>
          <p class="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Trang này dùng cho trường hợp trình duyệt giữ lại cache cũ hoặc bộ nhớ ngoại tuyến bị hỏng. Chúng tôi sẽ thử
            dọn service worker, xóa cache của ứng dụng và tạo lại kho ngoại tuyến sạch mà không đăng xuất bạn.
          </p>
        </div>

        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="text-base font-semibold text-slate-900">Những gì sẽ diễn ra</h2>
          <ul class="mt-4 space-y-3 text-sm text-slate-600">
            <li>1. Gỡ service worker cũ của ứng dụng trên trình duyệt này.</li>
            <li>2. Xóa cache PWA và cache offline của LMS Maritime.</li>
            <li>3. Tạo lại bộ nhớ ngoại tuyến sạch để bạn có thể tải lại khóa học khi cần.</li>
          </ul>

          <div class="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              (click)="onRunRepair()"
              [disabled]="isRunning()"
              class="rounded-xl bg-[#0056D2] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#004BB5] disabled:cursor-not-allowed disabled:bg-slate-300">
              @if (isRunning()) {
                Đang khôi phục...
              } @else {
                Bắt đầu khôi phục
              }
            </button>

            <a
              routerLink="/student/storage"
              class="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
              Quay lại Lưu trữ ngoại tuyến
            </a>
          </div>
        </div>

        @if (result(); as repairResult) {
          <div
            class="rounded-3xl border p-6 shadow-sm"
            [class.border-emerald-200]="!repairResult.requiresManualSiteDataClear"
            [class.bg-emerald-50]="!repairResult.requiresManualSiteDataClear"
            [class.border-amber-200]="repairResult.requiresManualSiteDataClear"
            [class.bg-amber-50]="repairResult.requiresManualSiteDataClear">
            <h2 class="text-base font-semibold text-slate-900">{{ resultTitle() }}</h2>
            <p class="mt-2 text-sm leading-6 text-slate-700">{{ resultDescription() }}</p>

            <div class="mt-4 grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl bg-white/80 px-4 py-3">
                <p class="text-xs uppercase tracking-wide text-slate-400">Service worker</p>
                <p class="mt-1 text-sm font-semibold text-slate-900">{{ repairResult.unregisteredServiceWorkers }}</p>
              </div>
              <div class="rounded-2xl bg-white/80 px-4 py-3">
                <p class="text-xs uppercase tracking-wide text-slate-400">Cache đã dọn</p>
                <p class="mt-1 text-sm font-semibold text-slate-900">{{ repairResult.clearedCaches }}</p>
              </div>
              <div class="rounded-2xl bg-white/80 px-4 py-3">
                <p class="text-xs uppercase tracking-wide text-slate-400">Offline storage</p>
                <p class="mt-1 text-sm font-semibold text-slate-900">
                  {{ repairResult.offlineResetSucceeded ? 'Đã tạo lại' : 'Chưa khôi phục được' }}
                </p>
              </div>
            </div>

            @if (repairResult.requiresManualSiteDataClear) {
              <div class="mt-5 rounded-2xl border border-amber-200 bg-white/80 p-4 text-sm text-amber-900">
                <p class="font-semibold">Trình duyệt này vẫn đang giữ trạng thái hỏng ở mức sâu hơn.</p>
                <ol class="mt-2 list-decimal space-y-1 pl-5 text-amber-800">
                  <li>Đóng toàn bộ tab đang mở của <strong>holilihu.online</strong>.</li>
                  <li>Xóa toàn bộ dữ liệu site của domain này trong phần Site settings của trình duyệt.</li>
                  <li>Mở lại ứng dụng rồi đăng nhập lại.</li>
                </ol>
              </div>
            }

            <div class="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                (click)="onReloadApp()"
                class="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
                Tải lại ứng dụng
              </button>

              <a
                routerLink="/student/storage"
                class="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                Mở lại Lưu trữ ngoại tuyến
              </a>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class PwaRepairComponent implements OnInit {
  private readonly pwaRepair = inject(PwaRepairService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  readonly isRunning = signal(false);
  readonly result = signal<PwaRepairResult | null>(null);
  readonly returnUrl = computed(() => this.route.snapshot.queryParamMap.get('returnUrl'));

  readonly resultTitle = computed(() => {
    const result = this.result();
    if (!result) {
      return '';
    }

    return result.requiresManualSiteDataClear
      ? 'Đã dọn cache ứng dụng nhưng trình duyệt vẫn cần làm sạch sâu hơn'
      : 'Khôi phục PWA hoàn tất';
  });

  readonly resultDescription = computed(() => {
    const result = this.result();
    if (!result) {
      return '';
    }

    return result.requiresManualSiteDataClear
      ? 'Ứng dụng đã gỡ service worker và xóa cache của LMS Maritime, nhưng bộ nhớ site của trình duyệt này vẫn chưa mở lại được hoàn toàn. Bạn nên xóa toàn bộ site data rồi đăng nhập lại.'
      : 'PWA đã được làm sạch và bộ nhớ ngoại tuyến đã được tạo lại. Bạn có thể tải lại ứng dụng rồi quay về Lưu trữ ngoại tuyến để kiểm tra hoặc tải lại khóa học.';
  });

  ngOnInit(): void {
    this.seo.setNoindex();
  }

  async onRunRepair(): Promise<void> {
    this.isRunning.set(true);
    this.result.set(null);

    try {
      const result = await this.pwaRepair.repairRuntime();
      this.result.set(result);
      this.toast.success(
        result.requiresManualSiteDataClear
          ? 'Đã dọn cache ứng dụng. Trình duyệt này vẫn cần xóa site data để sạch hoàn toàn.'
          : 'Đã khôi phục PWA và tạo lại bộ nhớ ngoại tuyến.',
      );
    } catch (error) {
      console.error('[PWA] Repair page failed.', error);
      this.toast.error('Không thể hoàn tất khôi phục PWA trên trình duyệt này. Hãy thử lại hoặc xóa site data của holilihu.online.');
    } finally {
      this.isRunning.set(false);
    }
  }

  onReloadApp(): void {
    this.pwaRepair.reloadApp(this.returnUrl());
  }
}
