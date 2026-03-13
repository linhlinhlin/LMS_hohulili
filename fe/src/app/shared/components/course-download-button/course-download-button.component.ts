import {
  Component, input, signal, computed, inject,
  ChangeDetectionStrategy, OnInit, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CourseDownloadService } from '../../../core/services/course-download.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { ToastService } from '../../../core/services/toast.service';
import { DownloadDialogComponent, DownloadOptions } from '../download-dialog/download-dialog.component';

@Component({
  selector: 'app-course-download-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DownloadDialogComponent],
  template: `
    @if (allowOfflineDownload()) {
    @if (isDownloaded()) {
      <!-- Already downloaded -->
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Đã tải xuống
        </span>
        <button (click)="removeCourse()"
                class="text-xs text-gray-400 hover:text-red-500 transition-colors"
                title="Xóa bản tải xuống">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    } @else if (isDownloading()) {
      <!-- Download in progress -->
      <div class="flex items-center gap-2">
        <div class="w-24 bg-gray-200 rounded-full h-1.5">
          <div class="bg-[#0056D2] h-1.5 rounded-full transition-all duration-300"
               [style.width.%]="downloadProgress()"></div>
        </div>
        <span class="text-xs text-gray-500 min-w-[2.5rem] text-right">{{ downloadProgress() }}%</span>
        <button (click)="cancelDownload()"
                class="text-xs text-gray-400 hover:text-red-500 transition-colors"
                title="Hủy tải xuống">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    } @else {
      <!-- Download button (opens dialog) -->
      <button (click)="openDialog()"
              [disabled]="!isOnline()"
              class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
              [class]="isOnline()
                ? 'bg-[#0056D2]/10 text-[#0056D2] hover:bg-[#0056D2]/20'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'"
              [title]="isOnline() ? 'Tải xuống để xem ngoại tuyến' : 'Cần kết nối mạng để tải'">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Tải xuống
      </button>
    }
    }

    <!-- Download dialog -->
    @if (showDialog()) {
      <app-download-dialog
        [courseId]="courseId()"
        [courseTitle]="courseTitle()"
        (close)="showDialog.set(false)"
        (confirm)="onDialogConfirm($event)" />
    }
  `,
})
export class CourseDownloadButtonComponent implements OnInit {
  private readonly downloadService = inject(CourseDownloadService);
  private readonly network = inject(NetworkStatusService);
  private readonly toast = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);

  courseId = input.required<string>();
  courseTitle = input<string>('');
  allowOfflineDownload = input<boolean>(true);

  protected isDownloaded = signal(false);
  protected showDialog = signal(false);
  protected isDownloading = computed(() =>
    this.downloadService.isDownloading() &&
    this.downloadService.currentDownloadId() === this.courseId()
  );
  protected downloadProgress = computed(() => this.downloadService.downloadProgress());
  protected isOnline = computed(() => this.network.online());

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return; // IndexedDB not available in SSR
    try {
      this.isDownloaded.set(await this.downloadService.isDownloaded(this.courseId()));
    } catch (error) {
      console.error('[CourseDownloadButton] Failed to read offline status:', error);
      this.isDownloaded.set(false);
    }
  }

  protected openDialog(): void {
    if (!this.network.online()) {
      this.toast.warning('Cần kết nối mạng để tải khóa học');
      return;
    }
    this.showDialog.set(true);
  }

  protected async onDialogConfirm(options: DownloadOptions): Promise<void> {
    this.showDialog.set(false);
    try {
      await this.downloadService.downloadCourse(this.courseId(), options);
      this.isDownloaded.set(await this.downloadService.isDownloaded(this.courseId()));
    } catch (error) {
      console.error('[CourseDownloadButton] Download flow failed:', error);
      this.toast.error('Không thể tải khóa học ngoại tuyến lúc này. Vui lòng thử lại sau.');
    }
  }

  protected cancelDownload(): void {
    this.downloadService.cancelDownload();
  }

  protected async removeCourse(): Promise<void> {
    try {
      await this.downloadService.removeCourse(this.courseId());
      this.isDownloaded.set(false);
    } catch (error) {
      console.error('[CourseDownloadButton] Failed to remove offline course:', error);
      this.toast.error('Không thể xóa bản tải xuống lúc này. Vui lòng thử lại sau.');
    }
  }
}
