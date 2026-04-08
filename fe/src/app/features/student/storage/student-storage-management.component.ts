import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  CourseDownloadService,
  type DownloadableCourse,
} from '../../../core/services/course-download.service';
import {
  OfflineVideoService,
  type OfflineVideoEntry,
} from '../../../core/services/offline-video.service';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import { StorageManagerService } from '../../../core/services/storage-manager.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { OfflineDeviceSettingsService } from '../../../core/services/offline-device-settings.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { OfflineStorageHealthService } from '../../../core/services/offline-storage-health.service';
import {
  OfflineStorageTelemetryService,
} from '../../../core/services/offline-storage-telemetry.service';
import { getOfflineCourseStaleCopy } from '../../../core/utils/offline-course-staleness';
import {
  formatOfflineVideoProfileLabel,
  getOfflineVideoProfileLabel,
  type OfflineVideoProfileId,
  type OfflineVideoPreference,
  type VideoQuality,
} from '../../../core/models/video-quality';

@Component({
  selector: 'app-student-storage-management',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-storage-management.component.html',
})
export class StudentStorageManagementComponent implements OnInit {
  /** Tab state for progressive disclosure layout */
  activeTab = signal<'overview' | 'courses' | 'settings'>('overview');

  readonly storageManager = inject(StorageManagerService);
  readonly downloadService = inject(CourseDownloadService);
  readonly videoService = inject(OfflineVideoService);
  readonly syncService = inject(OfflineSyncService);
  readonly offlineSettings = inject(OfflineDeviceSettingsService);
  readonly network = inject(NetworkStatusService);
  readonly offlineHealthService = inject(OfflineStorageHealthService);
  readonly offlineTelemetryService = inject(OfflineStorageTelemetryService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly estimate = this.storageManager.estimate;
  readonly deviceSettings = this.offlineSettings.settings;
  readonly offlineHealth = this.offlineHealthService.status;
  readonly offlineTelemetryEvents = this.offlineTelemetryService.events;

  readonly qualityOptions: Array<{ value: VideoQuality; label: string; hint: string }> = [
  { value: 'none', label: 'Không tải video', hint: 'Chỉ lưu văn bản, tệp, và quiz luyện tập.' },
  { value: 'SAVER', label: 'Tiết kiệm dữ liệu', hint: 'Ưu tiên gói nhỏ nhất đang sẵn sàng cho video nội bộ.' },
  { value: 'STANDARD', label: 'Chuẩn', hint: 'Mức cân bằng phù hợp cho đa số thiết bị và thời lượng học.' },
  { value: 'HIGH', label: 'Chất lượng cao', hint: 'Chỉ dùng khi video thực sự có bản chất lượng cao và máy còn nhiều dung lượng.' },
];

  readonly storagePercent = computed(() => this.estimate().percentUsed);

  readonly totalCourseBytes = computed(() =>
    this.downloadService.downloadedCourses().reduce((sum, course) => sum + (course.sizeBytes || 0), 0),
  );

  readonly totalVideoBytes = computed(() =>
    this.videoService.downloads().reduce((sum, video) => sum + (video.sizeBytes || 0), 0),
  );

  readonly freeBytes = computed(() => {
    const estimate = this.estimate();
    return Math.max(0, estimate.quotaBytes - estimate.usedBytes);
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
    const syncItems = this.syncService.pendingCount() + this.syncService.failedCount();
    const quota = this.estimate().quotaBytes;
    if (quota <= 0 || syncItems === 0) return 0;
    return Math.min(((syncItems * 1024) / quota) * 100, 1);
  });

  readonly retryCountdownLabel = computed(() => {
    const retryAt = this.syncService.earliestRetryAt();
    if (!retryAt) return '';

    const diffMs = retryAt.getTime() - Date.now();
    if (diffMs <= 0) return 'ngay bây giờ';

    const minutes = Math.ceil(diffMs / 60_000);
    return minutes === 1 ? '1 phút' : `${minutes} phút`;
  });

  readonly staleCourseCount = computed(() =>
    this.downloadService.downloadedCourses().filter(course => course.isStale).length,
  );

  readonly completedCourseCount = computed(() =>
    this.downloadService.downloadedCourses().filter(course => course.completionPercent === 100).length,
  );

  readonly completedCourseBytes = computed(() =>
    this.downloadService.downloadedCourses()
      .filter(course => course.completionPercent === 100)
      .reduce((sum, course) => sum + (course.sizeBytes || 0), 0),
  );

  readonly groupedOfflineVideos = computed(() => {
    const groups = new Map<string, {
      lessonId: string;
      lessonTitle: string;
      items: OfflineVideoEntry[];
      totalSizeBytes: number;
    }>();

    for (const video of this.videoService.downloads()) {
      const existing = groups.get(video.lessonId);
      if (existing) {
        existing.items.push(video);
        existing.totalSizeBytes += video.sizeBytes;
        continue;
      }

      groups.set(video.lessonId, {
        lessonId: video.lessonId,
        lessonTitle: video.lessonTitle,
        items: [video],
        totalSizeBytes: video.sizeBytes,
      });
    }

    return Array.from(groups.values()).map(group => ({
      ...group,
      items: [...group.items].sort((left, right) => {
        if (!left.sectionTitle && right.sectionTitle) return -1;
        if (left.sectionTitle && !right.sectionTitle) return 1;
        return (left.sectionTitle || left.title).localeCompare(right.sectionTitle || right.title);
      }),
    }));
  });

  readonly hasAnyData = computed(() =>
    this.downloadService.downloadedCount() > 0
      || this.videoService.downloads().length > 0
      || this.syncService.pendingCount() > 0
      || this.syncService.failedCount() > 0
      || this.syncService.conflictCount() > 0,
  );

  readonly persistenceStatusLabel = computed(() =>
    this.storageManager.isPersisted()
      ? 'Trình duyệt đang ưu tiên giữ dữ liệu ngoại tuyến cho thiết bị này.'
      : 'Trình duyệt chưa xác nhận giữ dữ liệu lâu dài. Dữ liệu ngoại tuyến vẫn có thể bị dọn nếu bộ nhớ thiếu.',
  );

  readonly syncStatusLabel = computed(() => {
    if (this.syncService.isSyncing()) return 'Đang đồng bộ dữ liệu học tập...';
    if (this.syncService.hasConflictItems()) return 'Có xung đột đồng bộ cần xử lý trước khi tiếp tục retry hàng đợi.';
    if (this.syncService.failedCount() > 0) return 'Có mục đồng bộ cần xử lý.';
    if (this.syncService.pendingCount() > 0) return 'Có dữ liệu đang chờ đồng bộ.';
    return 'Mọi dữ liệu hiện đã đồng bộ hoặc chưa có thay đổi mới.';
  });

  readonly syncConflictSummary = computed(() => {
    const conflictCount = this.syncService.conflictCount();
    if (conflictCount === 0) {
      return null;
    }

    if (this.staleCourseCount() > 0) {
      return `${conflictCount} xung đột đồng bộ đang liên quan đến nội dung offline cũ. Hãy cập nhật khóa học trước khi đồng bộ lại.`;
    }

    return `${conflictCount} xung đột đồng bộ cần được kiểm tra. Tiến độ local đang được giữ lại để bạn quyết định cách tiếp tục.`;
  });

  readonly syncConflictActionLabel = computed(() => {
    if (this.staleCourseCount() > 0) {
      return 'Cập nhật khóa học cũ';
    }

    if (!this.network.online()) {
      return 'Cần kết nối mạng để xử lý';
    }

    return 'Đồng bộ lại sau khi kiểm tra';
  });

  readonly currentConnectionLabel = computed(() => {
    const base = this.network.connectionLabel();
    if (this.network.isLikelyMetered()) {
      return `${base} • kết nối có thể tính theo dữ liệu`;
    }
    return base;
  });

  readonly wifiPolicyHint = computed(() => {
    if (!this.offlineSettings.downloadOnWifiOnly()) {
      return 'Bạn đang cho phép tải xuống trên mọi kết nối khả dụng.';
    }

    if (this.network.isLikelyMetered()) {
      return 'Trình duyệt đang báo kết nối có thể bị tính dung lượng. Các lượt tải mới sẽ bị chặn cho đến khi đổi mạng hoặc tắt giới hạn này.';
    }

    if (!this.network.connectionDetailsAvailable()) {
      return 'Trình duyệt không luôn cung cấp đủ thông tin để nhận biết Wi‑Fi. Ứng dụng sẽ áp dụng giới hạn này theo best-effort.';
    }

    return 'Ứng dụng sẽ tránh bắt đầu lượt tải mới khi trình duyệt báo kết nối di động hoặc tiết kiệm dữ liệu.';
  });

  readonly staleSummary = computed(() => {
    if (this.staleCourseCount() === 0) {
      return null;
    }

    if (this.downloadService.isBulkUpdating()) {
      return 'Đang cập nhật các gói ngoại tuyến cũ. Tiến trình hợp lệ sẽ được giữ lại khi có thể.';
    }

    return `${this.staleCourseCount()} khóa học đã có phiên bản mới hoặc cần làm mới để tiếp tục đồng bộ an toàn.`;
  });

  readonly offlineRecoveryCard = computed(() => {
    const status = this.offlineHealth();

    if (status.availability === 'recovering') {
      return {
        tone: 'blue' as const,
        title: 'Hệ thống đang tự kiểm tra lại bộ nhớ ngoại tuyến',
        description: 'Ứng dụng đang thử khôi phục kho dữ liệu ngoại tuyến cục bộ. Nếu trạng thái này kéo dài hoặc lặp lại, bạn có thể đặt lại bộ nhớ ngoại tuyến để tạo lại kho sạch.',
        actionLabel: 'Đặt lại bộ nhớ ngoại tuyến',
        action: 'reset' as const,
      };
    }

    if (status.availability === 'online-only') {
      return {
        tone: 'red' as const,
        title: 'Bộ nhớ ngoại tuyến đang tạm không dùng được',
        description: 'Trình duyệt không mở được dữ liệu ngoại tuyến cục bộ. Bạn vẫn có thể học online, hoặc để hệ thống làm sạch toàn bộ dữ liệu ứng dụng của holilihu.online trên trình duyệt này trước khi đăng nhập lại và tải lại khóa học.',
        actionLabel: 'Làm sạch dữ liệu trình duyệt',
        action: 'clear-site-data' as const,
      };
    }

    if (status.lastRecoveryAction === 'recreated-db' || status.lastRecoveryAction === 'rotated-db') {
      return {
        tone: 'amber' as const,
        title: 'Bộ nhớ ngoại tuyến đã được tự khôi phục',
        description: 'Hệ thống đã phát hiện dữ liệu ngoại tuyến cục bộ bị hỏng và tạo lại kho dữ liệu mới. Bạn cần tải lại các khóa học ngoại tuyến để tiếp tục dùng offline ổn định.',
        actionLabel: 'Đặt lại bộ nhớ ngoại tuyến',
        action: 'reset' as const,
      };
    }

    if (status.lastRecoveryAction === 'manual-reset') {
      return {
        tone: 'blue' as const,
        title: 'Bộ nhớ ngoại tuyến đã được đặt lại',
        description: 'Thiết bị này đang dùng một kho dữ liệu ngoại tuyến sạch. Nếu cần học offline, hãy mở danh sách khóa học để tải lại nội dung từ đầu.',
        actionLabel: 'Mở danh sách khóa học',
        action: 'browse-courses' as const,
      };
    }

    return null;
  });

  readonly lastManualSyncDate = computed(() => {
    const value = this.offlineSettings.lastManualSyncAt();
    return value ? new Date(value) : null;
  });

  readonly latestOfflineTelemetryEvent = computed(() => this.offlineTelemetryEvents()[0] ?? null);

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.storageManager.refresh(),
      this.downloadService.refreshDownloadedCourses(),
      this.videoService.refreshList(),
      this.syncService.refreshState(),
    ]);
  }

  async onRequestPersistence(): Promise<void> {
    const granted = await this.storageManager.requestPersistence();
    this.offlineSettings.markPersistenceRequested();

    if (granted) {
      this.toast.success('Trình duyệt đã chấp nhận ưu tiên giữ dữ liệu ngoại tuyến cho thiết bị này.');
      return;
    }

    this.toast.info('Trình duyệt chưa cấp quyền lưu trữ bền vững. Bạn vẫn có thể tiếp tục tải dữ liệu ngoại tuyến.');
  }

  onSelectDefaultQuality(videoQuality: VideoQuality): void {
    this.offlineSettings.setDefaultVideoQuality(videoQuality);
    const selected = this.qualityOptions.find(option => option.value === videoQuality);
    this.toast.success(`Đã đặt mặc định tải video: ${selected?.label ?? this.getDefaultVideoQualityLabel(videoQuality)}`);
  }

  getDefaultVideoQualityLabel(videoQuality: VideoQuality): string {
    if (videoQuality === 'none') {
      return 'Không tải video';
    }

    return getOfflineVideoProfileLabel(videoQuality);
  }

  getDownloadedVideoProfileBadge(video: OfflineVideoEntry): string | null {
    if (!video.profileId) {
      return null;
    }

    const profileId = video.profileId as OfflineVideoProfileId;
    if (video.actualResolution) {
      return formatOfflineVideoProfileLabel({
        id: profileId,
        actualResolution: video.actualResolution,
      });
    }

    return getOfflineVideoProfileLabel(profileId);
  }

  isGroupedOfflinePreference(value: VideoQuality): value is OfflineVideoPreference {
    return value === 'SAVER' || value === 'STANDARD' || value === 'HIGH';
  }

  onToggleWifiOnly(): void {
    const next = !this.offlineSettings.downloadOnWifiOnly();
    this.offlineSettings.setDownloadOnWifiOnly(next);
    this.toast.info(
      next
        ? 'Ứng dụng sẽ hạn chế bắt đầu lượt tải mới trên kết nối có thể tính theo dữ liệu.'
        : 'Đã cho phép tải xuống trên mọi kết nối khả dụng.',
    );
  }

  onToggleAutoSync(): void {
    const next = !this.offlineSettings.autoSyncWhenOnline();
    this.offlineSettings.setAutoSyncWhenOnline(next);
    this.toast.info(
      next
        ? 'Đã bật tự đồng bộ khi có mạng.'
        : 'Đã tắt tự đồng bộ. Bạn vẫn có thể bấm "Đồng bộ ngay" khi cần.',
    );
  }

  async onSyncNow(): Promise<void> {
    await this.syncService.syncNow();
  }

  async onBulkUpdateStale(): Promise<void> {
    const count = this.staleCourseCount();
    const confirmed = await this.confirmDialog.confirm({
      title: 'Cập nhật tất cả khóa học cũ',
      message: `Tải lại ${count} khóa học với nội dung mới nhất? Hệ thống sẽ giữ lại tiến trình và dữ liệu đồng bộ còn hợp lệ khi có thể. Quá trình này có thể mất vài phút.`,
      variant: 'info',
      confirmText: `Cập nhật ${count} khóa học`,
      cancelText: 'Hủy',
    });
    if (!confirmed) return;

    await this.downloadService.bulkUpdateStale();
  }

  async onDeleteCompletedCourses(): Promise<void> {
    const count = this.completedCourseCount();
    const bytes = this.completedCourseBytes();
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa khóa học đã hoàn thành',
      message: `Xóa ${count} khóa học đã học xong để giải phóng ${this.storageManager.formatBytes(bytes)}?`,
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    if (!confirmed) return;

    const completedCourses = this.downloadService.downloadedCourses().filter(course => course.completionPercent === 100);
    for (const course of completedCourses) {
      await this.downloadService.removeCourse(course.id);
    }

    await this.storageManager.refresh();
    this.toast.success(`Đã giải phóng ${this.storageManager.formatBytes(bytes)}`);
  }

  async onRedownloadCourse(course: DownloadableCourse): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Cập nhật khóa học',
      message: `Tải lại "${course.title}" với nội dung mới nhất? Hệ thống sẽ giữ lại tiến trình và dữ liệu đồng bộ còn hợp lệ khi có thể.`,
      variant: 'info',
      confirmText: 'Cập nhật',
      cancelText: 'Hủy',
    });
    if (!confirmed) return;

    await this.downloadService.refreshCoursePackage(course.id, course.downloadOptions ?? undefined);
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

    await this.videoService.deleteEntry(video);
    await this.storageManager.refresh();
  }

  getStaleReasonDescription(course: DownloadableCourse): string {
    return getOfflineCourseStaleCopy(course.staleReason).description;
  }

  getStaleActionLabel(course: DownloadableCourse): string {
    return getOfflineCourseStaleCopy(course.staleReason).actionLabel;
  }

  getOfflineTelemetryTypeLabel(type: string): string {
    switch (type) {
      case 'recovery-started':
        return 'Bắt đầu khôi phục';
      case 'recreate-failed':
        return 'Tạo lại DB cũ thất bại';
      case 'recovered':
        return 'Đã khôi phục';
      case 'disabled':
        return 'Chuyển sang online-only';
      case 'manual-reset':
        return 'Đặt lại thủ công';
      case 'telemetry-cleared':
        return 'Đã xóa lịch sử chẩn đoán';
      default:
        return type;
    }
  }

  async onCopyOfflineDiagnostics(): Promise<void> {
    const copied = await this.offlineTelemetryService.copyDiagnostics();
    if (copied) {
      this.toast.success('Đã sao chép chẩn đoán ngoại tuyến. Bạn có thể gửi cho QA hoặc đội hỗ trợ.');
      return;
    }

    this.toast.info('Trình duyệt không hỗ trợ sao chép tự động. Hãy mở DevTools hoặc thử trên trình duyệt khác.');
  }

  onClearOfflineDiagnostics(): void {
    this.offlineTelemetryService.clearDiagnostics();
    this.toast.info('Đã xóa lịch sử chẩn đoán ngoại tuyến cục bộ trên thiết bị này.');
  }

  async onRetryFailed(): Promise<void> {
    await this.syncService.retryFailed();
  }

  async onResolveConflicts(): Promise<void> {
    if (this.staleCourseCount() > 0) {
      await this.onBulkUpdateStale();
      return;
    }

    if (!this.network.online()) {
      this.toast.info('Cần kết nối mạng trước khi thử xử lý xung đột đồng bộ.');
      return;
    }

    await this.syncService.syncNow();
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
    this.toast.info('Đã xóa các mục đồng bộ thất bại.');
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
    this.toast.success('Đã xóa tất cả dữ liệu ngoại tuyến.');
  }

  async onRecoveryAction(): Promise<void> {
    const action = this.offlineRecoveryCard()?.action;
    if (action === 'browse-courses') {
      await this.router.navigateByUrl('/student/courses');
      return;
    }
    if (action === 'clear-site-data') {
      this.openBrowserSiteDataResetPage();
      return;
    }

    await this.onResetOfflineStorage();
  }

  async onResetOfflineStorage(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Đặt lại bộ nhớ ngoại tuyến',
      message: 'Hệ thống sẽ xóa kho dữ liệu ngoại tuyến cục bộ bị lỗi và tạo lại từ đầu. Các khóa học, video và hàng đợi đồng bộ chưa sync sẽ bị xóa khỏi thiết bị này.',
      variant: 'danger',
      confirmText: 'Đặt lại',
      cancelText: 'Hủy',
    });
    if (!confirmed) return;

    await this.offlineHealthService.resetOfflineStorage();
    await Promise.all([
      this.storageManager.refresh(),
      this.downloadService.refreshDownloadedCourses(),
      this.videoService.refreshList(),
      this.syncService.refreshState(),
    ]);

    this.toast.success('Đã đặt lại bộ nhớ ngoại tuyến. Bạn có thể tải lại khóa học nếu muốn dùng offline.');
  }

  async onOpenAdvancedRepair(): Promise<void> {
    this.openHardPwaResetPage();
  }

  private openBrowserSiteDataResetPage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.location.href = `/clear-site-data?returnUrl=${encodeURIComponent('/auth/login?message=Đã làm sạch dữ liệu trình duyệt. Hãy đăng nhập lại.')}`;
  }

  private openHardPwaResetPage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.location.href = `/reset-sw?returnUrl=${encodeURIComponent('/student/storage')}`;
  }
}
