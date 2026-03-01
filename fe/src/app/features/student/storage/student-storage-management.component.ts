import { Component, ChangeDetectionStrategy, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageManagerService } from '../../../core/services/storage-manager.service';
import { CourseDownloadService, type DownloadableCourse } from '../../../core/services/course-download.service';
import { OfflineVideoService, type OfflineVideoEntry } from '../../../core/services/offline-video.service';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-student-storage-management',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="max-w-4xl mx-auto space-y-6">

        <!-- Page Header -->
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Lưu trữ ngoại tuyến</h1>
          <p class="mt-1 text-sm text-gray-500">Quản lý dữ liệu đã tải xuống cho truy cập ngoại tuyến</p>
        </div>

        <!-- Warning Banners -->
        @if (storagePercent() >= 95) {
          <div class="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <svg class="w-5 h-5 text-red-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div>
              <p class="font-semibold text-red-800">Bộ nhớ gần đầy ({{ storagePercent() | number:'1.0-0' }}%)</p>
              <p class="text-sm text-red-700 mt-0.5">Xóa bớt dữ liệu để tránh lỗi khi tải thêm nội dung.</p>
            </div>
          </div>
        } @else if (storagePercent() >= 80) {
          <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <svg class="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div>
              <p class="font-semibold text-amber-800">Bộ nhớ đang cao ({{ storagePercent() | number:'1.0-0' }}%)</p>
              <p class="text-sm text-amber-700 mt-0.5">Cân nhắc xóa bớt dữ liệu không cần thiết.</p>
            </div>
          </div>
        }

        <!-- Storage Bar Card -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-base font-semibold text-gray-900">Dung lượng sử dụng</h2>
            <span class="text-sm text-gray-500">
              {{ storageManager.formatBytes(estimate().usedBytes) }} / {{ storageManager.formatBytes(estimate().quotaBytes) }}
            </span>
          </div>

          <!-- Segmented Bar -->
          <div class="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
            @if (courseBarPercent() > 0) {
              <div
                class="h-full bg-[#0056D2] transition-all duration-300"
                [style.width.%]="courseBarPercent()">
              </div>
            }
            @if (videoBarPercent() > 0) {
              <div
                class="h-full bg-emerald-500 transition-all duration-300"
                [style.width.%]="videoBarPercent()">
              </div>
            }
            @if (syncBarPercent() > 0) {
              <div
                class="h-full bg-amber-500 transition-all duration-300"
                [style.width.%]="syncBarPercent()">
              </div>
            }
          </div>

          <!-- Legend -->
          <div class="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-[#0056D2] inline-block"></span>
              Khóa học ({{ storageManager.formatBytes(totalCourseBytes()) }})
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
              Video ({{ storageManager.formatBytes(totalVideoBytes()) }})
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
              Hàng đợi đồng bộ ({{ syncService.pendingCount() + syncService.failedCount() }} mục)
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-gray-100 border border-gray-300 inline-block"></span>
              Trống ({{ storageManager.formatBytes(freeBytes()) }})
            </div>
          </div>
        </div>

        <!-- Sync Queue Section -->
        @if (syncService.pendingCount() > 0 || syncService.failedCount() > 0) {
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 class="text-base font-semibold text-gray-900 mb-3">Hàng đợi đồng bộ</h2>
            <div class="flex flex-wrap items-center gap-4 text-sm">
              @if (syncService.pendingCount() > 0) {
                <div class="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  {{ syncService.pendingCount() }} đang chờ
                </div>
              }
              @if (syncService.failedCount() > 0) {
                <div class="flex items-center gap-2 text-red-700 bg-red-50 px-3 py-1.5 rounded-lg">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  {{ syncService.failedCount() }} thất bại
                </div>
              }
            </div>
            @if (syncService.hasFailedItems()) {
              <div class="flex gap-2 mt-3">
                <button
                  (click)="onRetryFailed()"
                  class="px-4 py-2 text-sm font-medium text-[#0056D2] bg-[#0056D2]/5 hover:bg-[#0056D2]/10 rounded-lg transition-colors">
                  Thử lại
                </button>
                <button
                  (click)="onClearFailed()"
                  class="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                  Xóa mục lỗi
                </button>
              </div>
            }
          </div>
        }

        <!-- Downloaded Courses -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 class="text-base font-semibold text-gray-900 mb-4">
            Khóa học đã tải ({{ downloadService.downloadedCount() }})
          </h2>

          @if (downloadService.downloadedCourses().length === 0) {
            <div class="text-center py-8 text-gray-400">
              <svg class="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
              <p class="text-sm">Chưa có khóa học nào được tải xuống</p>
              <p class="text-xs mt-1 text-gray-300">Vào trang khóa học và nhấn nút tải để sử dụng ngoại tuyến</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (course of downloadService.downloadedCourses(); track course.id) {
                <div class="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  <div class="min-w-0 flex-1">
                    <p class="font-medium text-gray-900 truncate">{{ course.title }}</p>
                    <div class="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{{ course.totalLessons }} bài học</span>
                      <span>{{ storageManager.formatBytes(course.sizeBytes) }}</span>
                      @if (course.downloadedAt) {
                        <span>{{ course.downloadedAt | date:'dd/MM/yyyy' }}</span>
                      }
                    </div>
                  </div>
                  <button
                    (click)="onDeleteCourse(course)"
                    class="ml-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    title="Xóa khóa học">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- Offline Videos -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 class="text-base font-semibold text-gray-900 mb-4">
            Video ngoại tuyến ({{ videoService.downloads().length }})
          </h2>

          @if (videoService.downloads().length === 0) {
            <div class="text-center py-8 text-gray-400">
              <svg class="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <p class="text-sm">Chưa có video nào được lưu ngoại tuyến</p>
              <p class="text-xs mt-1 text-gray-300">Tải video từ bài học để xem khi không có mạng</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (video of videoService.downloads(); track video.lessonId) {
                <div class="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  <div class="min-w-0 flex-1">
                    <p class="font-medium text-gray-900 truncate">{{ video.title }}</p>
                    <div class="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{{ storageManager.formatBytes(video.sizeBytes) }}</span>
                      @if (video.downloadedAt) {
                        <span>{{ video.downloadedAt | date:'dd/MM/yyyy' }}</span>
                      }
                    </div>
                  </div>
                  <button
                    (click)="onDeleteVideo(video)"
                    class="ml-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    title="Xóa video">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- Delete All Button -->
        @if (hasAnyData()) {
          <button
            (click)="onDeleteAll()"
            class="w-full py-3 px-4 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm">
            Xóa tất cả dữ liệu ngoại tuyến
          </button>
        }

      </div>
    </div>
  `
})
export class StudentStorageManagementComponent implements OnInit {
  readonly storageManager = inject(StorageManagerService);
  readonly downloadService = inject(CourseDownloadService);
  readonly videoService = inject(OfflineVideoService);
  readonly syncService = inject(OfflineSyncService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  readonly estimate = this.storageManager.estimate;

  readonly storagePercent = computed(() => this.estimate().percentUsed);

  readonly totalCourseBytes = computed(() =>
    this.downloadService.downloadedCourses().reduce((sum, c) => sum + (c.sizeBytes || 0), 0)
  );

  readonly totalVideoBytes = computed(() =>
    this.videoService.downloads().reduce((sum, v) => sum + (v.sizeBytes || 0), 0)
  );

  readonly freeBytes = computed(() => {
    const est = this.estimate();
    return Math.max(0, est.quotaBytes - est.usedBytes);
  });

  readonly courseBarPercent = computed(() => {
    const quota = this.estimate().quotaBytes;
    if (quota <= 0) return 0;
    return Math.min((this.totalCourseBytes() / quota) * 100, 100);
  });

  readonly videoBarPercent = computed(() => {
    const quota = this.estimate().quotaBytes;
    if (quota <= 0) return 0;
    return Math.min((this.totalVideoBytes() / quota) * 100, 100);
  });

  readonly syncBarPercent = computed(() => {
    // Sync queue items are tiny (JSON payloads), estimate ~1KB each
    const syncItems = this.syncService.pendingCount() + this.syncService.failedCount();
    const quota = this.estimate().quotaBytes;
    if (quota <= 0 || syncItems === 0) return 0;
    const estimatedSyncBytes = syncItems * 1024;
    return Math.min((estimatedSyncBytes / quota) * 100, 1); // Cap at 1% visual
  });

  readonly hasAnyData = computed(() =>
    this.downloadService.downloadedCount() > 0 ||
    this.videoService.downloads().length > 0 ||
    this.syncService.pendingCount() > 0 ||
    this.syncService.failedCount() > 0
  );

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.storageManager.refresh(),
      this.videoService.refreshList(),
    ]);
  }

  async onDeleteCourse(course: DownloadableCourse): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa khóa học ngoại tuyến',
      message: `Bạn có chắc muốn xóa "${course.title}" khỏi bộ nhớ ngoại tuyến? Dữ liệu tiến trình chưa đồng bộ có thể bị mất.`,
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    if (!confirmed) return;

    await this.downloadService.removeCourse(course.id);
    await this.storageManager.refresh();
  }

  async onDeleteVideo(video: OfflineVideoEntry): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa video ngoại tuyến',
      message: `Bạn có chắc muốn xóa video "${video.title}" (${this.storageManager.formatBytes(video.sizeBytes)})?`,
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    if (!confirmed) return;

    await this.videoService.deleteVideo(video.lessonId);
    await this.storageManager.refresh();
  }

  async onRetryFailed(): Promise<void> {
    await this.syncService.retryFailed();
  }

  async onClearFailed(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa mục đồng bộ lỗi',
      message: 'Các mục đồng bộ thất bại sẽ bị xóa vĩnh viễn. Dữ liệu chưa đồng bộ sẽ bị mất.',
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    if (!confirmed) return;

    await this.syncService.clearFailed();
    this.toast.info('Đã xóa các mục đồng bộ thất bại');
  }

  async onDeleteAll(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa tất cả dữ liệu ngoại tuyến',
      message: 'Tất cả khóa học, video và hàng đợi đồng bộ sẽ bị xóa. Hành động này không thể hoàn tác.',
      variant: 'danger',
      confirmText: 'Xóa tất cả',
      cancelText: 'Hủy',
    });
    if (!confirmed) return;

    await this.downloadService.removeAllCourses(this.videoService);
    await this.storageManager.refresh();
    this.toast.success('Đã xóa tất cả dữ liệu ngoại tuyến');
  }
}
