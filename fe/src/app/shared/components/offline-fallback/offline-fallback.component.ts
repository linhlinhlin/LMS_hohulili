import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CourseDownloadService, DownloadableCourse } from '../../../core/services/course-download.service';
import { StorageManagerService } from '../../../core/services/storage-manager.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';

@Component({
  selector: 'app-offline-fallback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-slate-50 p-4">
      <div class="max-w-lg mx-auto space-y-4 pt-8">

        <!-- Header Card -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center space-y-4">
          <div class="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728" />
              <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>

          <div>
            <h1 class="text-xl font-bold text-gray-900">Bạn đang ngoại tuyến</h1>
            <p class="mt-1 text-sm text-gray-600">
              Ứng dụng vẫn hoạt động với dữ liệu đã tải xuống.
            </p>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="bg-slate-50 rounded-lg p-3">
              <div class="font-semibold text-[#0056D2]">{{ downloadCount() }}</div>
              <div class="text-gray-500">Khóa học đã tải</div>
            </div>
            <div class="bg-slate-50 rounded-lg p-3">
              <div class="font-semibold text-[#0056D2]">{{ pendingSync() }}</div>
              <div class="text-gray-500">Chờ đồng bộ</div>
            </div>
          </div>

          <!-- Storage -->
          <div class="text-xs text-gray-500">
            Dung lượng: {{ usedStorage() }} / {{ totalStorage() }}
          </div>

          <button (click)="retry()"
                  class="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Thử kết nối lại
          </button>
        </div>

        <!-- Downloaded Courses List -->
        @if (downloadedCourses().length > 0) {
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100">
              <h2 class="font-semibold text-gray-900">Khóa học đã tải xuống</h2>
            </div>

            @for (course of downloadedCourses(); track course.id) {
              <a [routerLink]="['/learn/course', course.id]"
                 class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-gray-50 last:border-b-0">
                <div class="flex-shrink-0 w-10 h-10 bg-[#0056D2]/10 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-[#0056D2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-900 truncate">{{ course.title }}</div>
                  <div class="text-xs text-gray-500">{{ course.totalLessons }} bài học · {{ formatSize(course.sizeBytes) }}</div>
                </div>
                <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            }
          </div>
        } @else {
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
            <div class="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <svg class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <p class="text-sm text-gray-600">Chưa có khóa học nào được tải xuống.</p>
            <p class="text-xs text-gray-400 mt-1">Kết nối mạng và tải khóa học để xem ngoại tuyến.</p>
          </div>
        }

        <!-- Pending Sync Info -->
        @if (pendingSync() > 0) {
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div class="flex items-center gap-2 text-amber-800">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm font-medium">{{ pendingSync() }} thao tác đang chờ đồng bộ</span>
            </div>
            <p class="text-xs text-amber-600 mt-1">Dữ liệu sẽ tự động đồng bộ khi có kết nối mạng.</p>
          </div>
        }

        <!-- Failed Sync Warning -->
        @if (failedSync() > 0) {
          <div class="bg-red-50 border border-red-200 rounded-xl p-4">
            <div class="flex items-center gap-2 text-red-800">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span class="text-sm font-medium">{{ failedSync() }} thao tác đồng bộ thất bại</span>
            </div>
            <p class="text-xs text-red-600 mt-1">Nhấn nút bên dưới để thử lại.</p>
            <button (click)="retryFailed()"
                    class="mt-2 w-full py-2 bg-red-600 text-white text-sm rounded-lg font-medium hover:bg-red-700 transition-colors">
              Thử lại đồng bộ
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class OfflineFallbackComponent {
  private readonly courseDownload = inject(CourseDownloadService);
  private readonly storageManager = inject(StorageManagerService);
  private readonly syncService = inject(OfflineSyncService);

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

  protected retry(): void {
    window.location.reload();
  }

  protected retryFailed(): void {
    this.syncService.retryFailed();
  }
}
