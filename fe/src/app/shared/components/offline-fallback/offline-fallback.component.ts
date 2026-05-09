import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CourseDownloadService } from '../../../core/services/course-download.service';
import { StorageManagerService } from '../../../core/services/storage-manager.service';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';

export const OFFLINE_FALLBACK_COURSE_ROUTE_PREFIX = '/student/learn/course';

@Component({
  selector: 'app-offline-fallback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-slate-50">
      <main class="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-8 pt-12 sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
        <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div class="grid lg:grid-cols-[minmax(0,1fr)_380px]">
            <div class="p-5 sm:p-7 lg:p-8">
              <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                  <lucide-icon name="wifi-off" [size]="24" aria-hidden="true"></lucide-icon>
                </div>

                <div class="min-w-0 flex-1">
                  <p class="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Chế độ ngoại tuyến</p>
                  <h1 class="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Bạn đang ngoại tuyến</h1>
                  <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                    Nội dung đã tải vẫn mở được. Bài làm, tiến độ và ghi chú mới sẽ được giữ trên thiết bị rồi đồng bộ khi kết nối ổn định trở lại.
                  </p>

                  <div class="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      (click)="retry()"
                      [disabled]="isRetrying()"
                      class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0056D2] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#004BB5] focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:ring-offset-2"
                      [class.cursor-wait]="isRetrying()"
                      [class.opacity-75]="isRetrying()"
                    >
                      <lucide-icon name="refresh-cw" [size]="16" [class.animate-spin]="isRetrying()" aria-hidden="true"></lucide-icon>
                      {{ isRetrying() ? 'Đang kiểm tra...' : 'Thử kết nối lại' }}
                    </button>

                    @if (downloadCount() > 0) {
                      <a
                        [routerLink]="[courseRoutePrefix, downloadedCourses()[0].id]"
                        class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:ring-offset-2"
                      >
                        <lucide-icon name="book-open" [size]="16" aria-hidden="true"></lucide-icon>
                        Mở khóa học gần nhất
                      </a>
                    }
                  </div>

                  @if (retryMessage()) {
                    <p
                      class="mt-3 max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                      role="status"
                      aria-live="polite"
                    >
                      {{ retryMessage() }}
                    </p>
                  }
                </div>
              </div>
            </div>

            <div class="border-t border-slate-200 bg-slate-50/70 p-5 sm:p-7 lg:border-l lg:border-t-0">
              <div class="grid grid-cols-2 gap-3">
                <div class="rounded-lg border border-slate-200 bg-white p-4">
                  <div class="text-2xl font-bold text-[#0056D2]">{{ downloadCount() }}</div>
                  <div class="mt-1 text-xs font-medium text-slate-500">Khóa học đã tải</div>
                </div>
                <div class="rounded-lg border border-slate-200 bg-white p-4">
                  <div class="text-2xl font-bold text-[#0056D2]">{{ pendingSync() }}</div>
                  <div class="mt-1 text-xs font-medium text-slate-500">Chờ đồng bộ</div>
                </div>
              </div>

              <div class="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                <div class="flex items-center justify-between gap-4">
                  <div class="flex min-w-0 items-center gap-3">
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <lucide-icon name="hard-drive" [size]="18" aria-hidden="true"></lucide-icon>
                    </span>
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-slate-900">Dung lượng ngoại tuyến</div>
                      <div class="mt-0.5 truncate text-xs text-slate-500">{{ usedStorage() }} / {{ totalStorage() }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div class="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 class="text-base font-semibold text-slate-950">Nội dung đã tải</h2>
                <p class="mt-0.5 text-xs text-slate-500">{{ downloadCount() }} khóa học có thể học khi mất mạng</p>
              </div>
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                Offline
              </span>
            </div>

            @if (downloadedCourses().length > 0) {
              <div class="max-h-[560px] overflow-y-auto">
                @for (course of downloadedCourses(); track course.id) {
                  <a
                    [routerLink]="[courseRoutePrefix, course.id]"
                    class="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-5 py-4 transition-colors last:border-b-0 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0056D2]"
                    [attr.aria-label]="'Mở khóa học ' + course.title"
                  >
                    <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0056D2]/10 text-[#0056D2]">
                      <lucide-icon name="book-open" [size]="18" aria-hidden="true"></lucide-icon>
                    </span>
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-semibold text-slate-900">{{ course.title }}</span>
                      <span class="mt-1 block truncate text-xs text-slate-500">
                        {{ course.totalLessons }} bài học · {{ formatSize(course.sizeBytes) }}
                      </span>
                    </span>
                    <lucide-icon name="chevron-right" [size]="18" class="text-slate-300 transition-colors group-hover:text-[#0056D2]" aria-hidden="true"></lucide-icon>
                  </a>
                }
              </div>
            } @else {
              <div class="px-5 py-12 text-center">
                <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <lucide-icon name="download" [size]="24" aria-hidden="true"></lucide-icon>
                </div>
                <h3 class="mt-4 text-sm font-semibold text-slate-900">Chưa có khóa học nào được tải xuống</h3>
                <p class="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
                  Khi có mạng, hãy tải khóa học cần học trước để dùng ổn định trong môi trường yếu hoặc mất kết nối.
                </p>
              </div>
            }
          </div>

          <aside class="space-y-4">
            <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#0056D2]">
                  <lucide-icon name="folder-sync" [size]="18" aria-hidden="true"></lucide-icon>
                </span>
                <div>
                  <h2 class="text-sm font-semibold text-slate-950">Đồng bộ</h2>
                  <p class="text-xs text-slate-500">Trạng thái dữ liệu trên thiết bị này</p>
                </div>
              </div>

              @if (pendingSync() === 0 && failedSync() === 0) {
                <div class="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  Không có thao tác nào đang chờ.
                </div>
              }

              @if (pendingSync() > 0) {
                <div class="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <div class="flex items-center gap-2 text-sm font-semibold text-amber-900">
                    <lucide-icon name="clock" [size]="16" aria-hidden="true"></lucide-icon>
                    {{ pendingSync() }} thao tác chờ đồng bộ
                  </div>
                  <p class="mt-1 text-xs leading-5 text-amber-700">Hệ thống sẽ tự thử lại khi kết nối đủ ổn định.</p>
                </div>
              }

              @if (failedSync() > 0) {
                <div class="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <div class="flex items-center gap-2 text-sm font-semibold text-red-800">
                    <lucide-icon name="alert-triangle" [size]="16" aria-hidden="true"></lucide-icon>
                    {{ failedSync() }} thao tác lỗi đồng bộ
                  </div>
                  <button
                    type="button"
                    (click)="retryFailed()"
                    class="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    <lucide-icon name="refresh-cw" [size]="15" aria-hidden="true"></lucide-icon>
                    Thử lại đồng bộ
                  </button>
                </div>
              }
            </div>

            <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="text-sm font-semibold text-slate-950">Hoạt động khi ngoại tuyến</h2>
              <div class="mt-4 space-y-3 text-sm text-slate-600">
                <div class="flex gap-3">
                  <lucide-icon name="check-circle" [size]="17" class="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true"></lucide-icon>
                  <span>Bài học đã tải, quiz hỗ trợ offline và ghi chú vẫn dùng được.</span>
                </div>
                <div class="flex gap-3">
                  <lucide-icon name="clock" [size]="17" class="mt-0.5 shrink-0 text-amber-600" aria-hidden="true"></lucide-icon>
                  <span>Các cập nhật mới trên server cần mạng để làm mới.</span>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  `,
})
export class OfflineFallbackComponent {
  private readonly courseDownload = inject(CourseDownloadService);
  private readonly storageManager = inject(StorageManagerService);
  private readonly syncService = inject(OfflineSyncService);
  private readonly networkStatus = inject(NetworkStatusService);
  private readonly router = inject(Router);

  protected readonly courseRoutePrefix = OFFLINE_FALLBACK_COURSE_ROUTE_PREFIX;
  protected readonly isRetrying = signal(false);
  protected readonly retryMessage = signal<string | null>(null);
  protected readonly downloadedCourses = computed(() => this.courseDownload.downloadedCourses());
  protected readonly downloadCount = computed(() => this.downloadedCourses().length);
  protected readonly pendingSync = computed(() => this.syncService.pendingCount());
  protected readonly failedSync = computed(() => this.syncService.failedCount());

  protected readonly usedStorage = computed(() =>
    this.storageManager.formatBytes(this.storageManager.estimate().usedBytes)
  );

  protected readonly totalStorage = computed(() =>
    this.storageManager.formatBytes(this.storageManager.estimate().quotaBytes)
  );

  protected formatSize(bytes: number): string {
    return this.storageManager.formatBytes(bytes);
  }

  protected async retry(): Promise<void> {
    if (this.isRetrying()) {
      return;
    }

    this.isRetrying.set(true);
    this.retryMessage.set(null);

    try {
      const hasConnection = await this.networkStatus.probeNow();
      if (hasConnection) {
        await this.router.navigateByUrl('/student/courses');
        return;
      }

      this.retryMessage.set('Chưa kết nối được. Nếu bạn vừa bật mạng, hãy đợi vài giây rồi thử lại.');
    } finally {
      this.isRetrying.set(false);
    }
  }

  protected retryFailed(): void {
    this.syncService.retryFailed();
  }
}
