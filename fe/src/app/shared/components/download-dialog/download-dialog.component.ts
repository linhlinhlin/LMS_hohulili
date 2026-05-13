import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { StorageManagerService } from '../../../core/services/storage-manager.service';
import { OfflineDeviceSettingsService } from '../../../core/services/offline-device-settings.service';
import {
  OFFLINE_VIDEO_PREFERENCES,
  formatOfflineVideoProfileLabel,
  getOfflineVideoProfileLabel,
  type OfflineVideoProfileDescriptor,
  type OfflineVideoProfileId,
  type VideoQuality,
  type VideoSourceKind,
} from '../../../core/models/video-quality';
import { environment } from '../../../../environments/environment';

export interface DownloadOptions {
  videoQuality: VideoQuality;
  includeSimulations?: boolean;
}

interface LessonSummary {
  id: string;
  title: string;
  hasVideo: boolean;
  durationMinutes: number;
  videoAssets: VideoAssetSummary[];
}

interface VideoAssetSummary {
  lessonId: string;
  sectionId: string | null;
  durationMinutes: number;
  streamVideoUid?: string;
  sourceKind: VideoSourceKind;
}

interface SimulationSummary {
  sectionId: string;
  title: string;
  packageId: string;
  estimatedSizeBytes: number;
  allowOffline: boolean;
  hasManifest: boolean;
}

interface QualityOption {
  value: VideoQuality;
  label: string;
  hint: string;
}

@Component({
  selector: 'app-download-dialog',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" (click)="onBackdropClick($event)">
      <div class="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl" (click)="$event.stopPropagation()">
        <div class="px-6 pb-4 pt-6">
          <h3 class="text-lg font-semibold leading-tight text-gray-900">
            Tải về: "{{ courseTitle() }}"
          </h3>
        </div>

        @if (isLoading()) {
          <div class="flex h-48 items-center justify-center px-6 pb-6">
            <div class="h-8 w-8 animate-spin rounded-full border-2 border-[#0056D2] border-t-transparent"></div>
          </div>
        } @else {
          <div class="space-y-4 px-6">
            <div class="flex items-center justify-between py-2">
              <div class="flex items-center gap-2 text-sm text-gray-700">
                <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Nội dung bài học ({{ totalLessons() }} bài)
              </div>
              <span class="text-sm text-gray-500">~{{ formatSize(textSizeBytes()) }}</span>
            </div>

            <hr class="border-gray-200">

            @if (videoLessonsCount() > 0) {
              <div class="space-y-3">
                <div class="flex items-center gap-2 text-sm text-gray-700">
                  <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Video ({{ videoLessonsCount() }} bài có video)
                </div>

                <div class="ml-6 space-y-2">
                  @for (option of qualityOptions(); track option.value) {
                    <label class="group flex cursor-pointer items-center justify-between">
                      <div class="flex items-center gap-2">
                        <input
                          type="radio"
                          name="videoQuality"
                          [value]="option.value"
                          [checked]="selectedQuality() === option.value"
                          (change)="selectedQuality.set(option.value)"
                          class="h-4 w-4 border-gray-300 text-[#0056D2] focus:ring-[#0056D2]">
                        <div>
                          <span class="text-sm text-gray-700 group-hover:text-gray-900">
                            {{ getQualityOptionLabel(option.value) }}
                          </span>
                          @if (option.value !== 'none') {
                            <p class="text-xs text-gray-400">{{ option.hint }}</p>
                          }
                        </div>
                      </div>
                      <span class="text-sm text-gray-500">
                        {{ option.value === 'none' ? '0 MB' : '~' + formatSize(videoSizeForQuality(option.value)) }}
                      </span>
                    </label>
                  }
                </div>

                @if (showGroupedProfileFallbackNote()) {
                  <p class="ml-6 text-xs text-gray-500">
                    Nếu một video không có đúng mức này, hệ thống sẽ chọn bản gần nhất đang sẵn sàng để tải offline.
                  </p>
                }
              </div>

              @if (externalVideoCount() > 0) {
                <div class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Có {{ externalVideoCount() }} video ngoài hệ thống chỉ phát trực tuyến, không tải về cùng gói offline này.
                </div>
              }

              @if (originalOnlyVideoCount() > 0) {
                <div class="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                  Có {{ originalOnlyVideoCount() }} video chỉ có bản tải ngoại tuyến dạng {{ originalProfileLabel }}.
                </div>
              }

              @if (groupedStreamVideoCount() > 0) {
                <div class="rounded-lg bg-[#0056D2]/5 px-3 py-2 text-xs text-[#0056D2]">
                  {{ groupedStreamVideoCount() }} video phát trực tuyến đã có profile tải ngoại tuyến theo nhóm Tiết kiệm dữ liệu / Chuẩn / Chất lượng cao.
                </div>
              }

              @if (unknownStreamVideoCount() > 0) {
                <div class="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-600">
                  Không đọc được metadata profile của {{ unknownStreamVideoCount() }} video. Ứng dụng sẽ dùng ước lượng và chọn bản phù hợp nhất khi tải.
                </div>
              }

              <hr class="border-gray-200">
            }

            @if (simulationSectionsCount() > 0) {
              <div class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2 text-sm text-gray-700">
                    <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 18h18M5 18l2-8h10l2 8M8 10V6h8v4" />
                    </svg>
                    Mo phong WebGL ({{ simulationSectionsCount() }} goi)
                  </div>
                  <span class="text-sm text-gray-500">
                    {{ includeSimulations() ? '~' + formatSize(simulationSizeEstimate()) : '0 MB' }}
                  </span>
                </div>

                <label class="flex cursor-pointer items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <input
                    type="checkbox"
                    [checked]="includeSimulations()"
                    [disabled]="downloadableSimulationSectionsCount() === 0"
                    (change)="includeSimulations.set($any($event.target).checked)"
                    class="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-600">
                  <span class="text-xs leading-5 text-emerald-800">
                    Tai goi mo phong de chay offline trong PWA. Goi nay chi nen tai tren desktop/laptop, uu tien Wi-Fi va can du bo nho trinh duyet.
                  </span>
                </label>

                @if (simulationWarning()) {
                  <div class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {{ simulationWarning() }}
                  </div>
                }
              </div>

              <hr class="border-gray-200">
            }

            <div class="flex items-center justify-between py-1">
              <span class="text-sm font-medium text-gray-900">Tổng ước tính</span>
              <span class="text-sm font-semibold text-gray-900">~{{ formatSize(totalEstimate()) }}</span>
            </div>

            <div class="flex items-center justify-between py-1">
              <span class="text-sm text-gray-500">Dung lượng trống</span>
              <span class="text-sm text-gray-500">{{ formatSize(freeSpace()) }}</span>
            </div>

            @if (storageWarning()) {
              <div
                class="rounded-lg px-3 py-2 text-xs"
                [class]="insufficientStorage() ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'">
                {{ storageWarning() }}
              </div>
            }

            <a routerLink="/student/storage" class="block py-1 text-xs text-[#0056D2] hover:underline">
              Quản lý bộ nhớ
            </a>
          </div>

          <div class="mt-2 flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              (click)="close.emit()"
              class="rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
              Hủy
            </button>
            <button
              (click)="onConfirm()"
              [disabled]="insufficientStorage()"
              class="rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors"
              [class]="insufficientStorage() ? 'cursor-not-allowed bg-gray-300' : 'bg-[#0056D2] hover:bg-[#004BB5]'">
              Tải về
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class DownloadDialogComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageManagerService);
  private readonly offlineSettings = inject(OfflineDeviceSettingsService);

  readonly courseId = input.required<string>();
  readonly courseTitle = input<string>('');

  readonly close = output<void>();
  readonly confirm = output<DownloadOptions>();

  readonly isLoading = signal(true);
  readonly selectedQuality = signal<VideoQuality>(this.offlineSettings.defaultVideoQuality());
  readonly includeSimulations = signal(true);
  readonly freeSpace = signal(0);
  readonly lessons = signal<LessonSummary[]>([]);
  readonly simulations = signal<SimulationSummary[]>([]);
  readonly detectedProfileIds = signal<OfflineVideoProfileId[]>([]);
  readonly profileSizeTotals = signal<Partial<Record<OfflineVideoProfileId, number>>>({});
  readonly profileResolutionHints = signal<Partial<Record<OfflineVideoProfileId, string>>>({});
  readonly groupedStreamVideoMinutes = signal(0);
  readonly groupedStreamVideoCount = signal(0);
  readonly originalOnlyStreamVideoMinutes = signal(0);
  readonly originalOnlyStreamVideoCount = signal(0);
  readonly originalOnlyStreamSizeBytes = signal(0);
  readonly unknownStreamVideoMinutes = signal(0);
  readonly unknownStreamVideoCount = signal(0);
  readonly originalProfileLabel = getOfflineVideoProfileLabel('ORIGINAL');

  readonly totalLessons = computed(() => this.lessons().length);
  readonly videoLessonsCount = computed(() => this.lessons().filter((lesson) => lesson.hasVideo).length);
  readonly totalVideoMinutes = computed(() =>
    this.lessons()
      .flatMap((lesson) => lesson.videoAssets)
      .filter((asset) => asset.sourceKind !== 'EXTERNAL')
      .reduce((sum, asset) => sum + (asset.durationMinutes || 10), 0),
  );
  readonly externalVideoCount = computed(() =>
    this.lessons()
      .flatMap((lesson) => lesson.videoAssets)
      .filter((asset) => asset.sourceKind === 'EXTERNAL')
      .length,
  );
  readonly streamVideoCount = computed(() =>
    this.lessons()
      .flatMap((lesson) => lesson.videoAssets)
      .filter((asset) => asset.sourceKind === 'STREAM' || asset.sourceKind === 'ADAPTIVE_R2')
      .length,
  );
  readonly directVideoCount = computed(() =>
    this.lessons()
      .flatMap((lesson) => lesson.videoAssets)
      .filter((asset) => asset.sourceKind === 'LEGACY_DIRECT')
      .length,
  );
  readonly directVideoMinutes = computed(() =>
    this.lessons()
      .flatMap((lesson) => lesson.videoAssets)
      .filter((asset) => asset.sourceKind === 'LEGACY_DIRECT')
      .reduce((sum, asset) => sum + (asset.durationMinutes || 10), 0),
  );
  readonly originalOnlyVideoCount = computed(() => this.directVideoCount() + this.originalOnlyStreamVideoCount());
  readonly simulationSectionsCount = computed(() => this.simulations().length);
  readonly downloadableSimulationSectionsCount = computed(() =>
    this.simulations().filter((section) => section.allowOffline && section.hasManifest).length,
  );
  readonly simulationSizeEstimate = computed(() =>
    this.simulations()
      .filter((section) => section.allowOffline && section.hasManifest)
      .reduce((sum, section) => sum + section.estimatedSizeBytes, 0),
  );
  // Measured from actual API content payload — not a magic constant
  readonly measuredContentBytes = signal(0);
  readonly textSizeBytes = computed(() => this.measuredContentBytes());

  readonly VIDEO_SIZE_PER_10MIN: Record<VideoQuality, number> = {
    none: 0,
    SAVER: 30 * 1024 * 1024,
    STANDARD: 85 * 1024 * 1024,
    HIGH: 170 * 1024 * 1024,
    ORIGINAL: 120 * 1024 * 1024,
  };

  readonly qualityOptions = computed<QualityOption[]>(() => {
    const options: QualityOption[] = [
      { value: 'none', label: 'Không tải video', hint: '' },
    ];
    const detectedProfiles = this.detectedProfileIds();
    const hasGroupedProfiles = OFFLINE_VIDEO_PREFERENCES.some((profile) => detectedProfiles.includes(profile));

    if (hasGroupedProfiles) {
      for (const profile of OFFLINE_VIDEO_PREFERENCES) {
        if (!detectedProfiles.includes(profile)) {
          continue;
        }
        options.push(this.buildGroupedQualityOption(profile));
      }
      return options;
    }

    if (this.originalOnlyVideoCount() > 0 || detectedProfiles.includes('ORIGINAL')) {
      options.push(this.buildOriginalQualityOption());
      return options;
    }

    if (this.streamVideoCount() > 0) {
      for (const profile of OFFLINE_VIDEO_PREFERENCES) {
        options.push(this.buildGroupedQualityOption(profile));
      }
    }

    return options;
  });

  readonly totalEstimate = computed(() =>
    this.textSizeBytes()
    + this.videoSizeForQuality(this.selectedQuality())
    + (this.includeSimulations() ? this.simulationSizeEstimate() : 0),
  );

  readonly simulationWarning = computed(() => {
    if (this.simulationSectionsCount() === 0) {
      return null;
    }
    if (this.downloadableSimulationSectionsCount() === 0) {
      return 'Cac goi mo phong trong khoa hoc nay chua co manifest offline hop le. PWA van tai noi dung bai hoc, video va quiz.';
    }
    if (this.includeSimulations() && this.simulationSizeEstimate() === 0) {
      return 'Chua co uoc tinh dung luong cho goi mo phong. Nen kiem tra tren Wi-Fi va may tinh co nhieu bo nho trong.';
    }
    if (this.includeSimulations() && this.simulationSizeEstimate() > 500 * 1024 * 1024) {
      return 'Goi mo phong lon hon 500 MB nen co the bi bo qua khi tai offline. Hay dung desktop/laptop va toi uu build WebGL truoc khi phat hanh rong.';
    }
    return 'Mo phong WebGL offline chi chay tot tren desktop/laptop co WebGL 2, WebAssembly va tang toc phan cung. Dien thoai/may tinh bang nen dung noi dung thay the.';
  });

  readonly showGroupedProfileFallbackNote = computed(() => {
    const selectedQuality = this.selectedQuality();
    return selectedQuality !== 'none' && selectedQuality !== 'ORIGINAL' && this.groupedStreamVideoCount() > 0;
  });

  readonly storageWarning = computed(() => {
    const free = this.freeSpace();
    const needed = this.totalEstimate();
    if (free > 0 && needed > free) {
      return 'Không đủ dung lượng để tải. Vui lòng xóa dữ liệu cũ.';
    }
    if (free > 0 && needed > free * 0.8) {
      return 'Dung lượng còn ít. Tải xong có thể chiếm hơn 80% bộ nhớ trống.';
    }
    return null;
  });

  readonly insufficientStorage = computed(() => {
    const free = this.freeSpace();
    const needed = this.totalEstimate();
    return free > 0 && needed > free;
  });

  async ngOnInit(): Promise<void> {
    try {
      const [contentRes, storageEstimate] = await Promise.all([
        firstValueFrom(this.http.get<any>(`${environment.apiUrl}/api/v3/courses/${this.courseId()}/content`)),
        this.storage.refresh(),
      ]);

      const chapters = contentRes?.data || contentRes || [];
      const allLessons: LessonSummary[] = [];
      const allSimulations: SimulationSummary[] = [];

      // Measure actual content size from the API payload (SOTA: measure, don't guess)
      let contentBytes = 0;
      for (const chapter of chapters) {
        // Chapter metadata overhead
        contentBytes += new Blob([JSON.stringify({ id: chapter.id, title: chapter.title, sortOrder: chapter.sortOrder })]).size;

        for (const lesson of chapter.lessons || []) {
          const videoAssets = this.extractVideoAssets(lesson);
          allLessons.push({
            id: lesson.id,
            title: lesson.title || lesson.name,
            hasVideo: videoAssets.length > 0,
            durationMinutes: lesson.durationMinutes || 10,
            videoAssets,
          });

          // Measure lesson content: HTML + sections JSON (strip video binary, keep structure)
          const lessonContent = lesson.contentHtml || lesson.content || '';
          contentBytes += new Blob([lessonContent]).size;

          // Sections metadata (quiz questions, text blocks, file refs — NOT video binaries)
          const sections = lesson.sections || [];
          if (sections.length > 0) {
            contentBytes += new Blob([JSON.stringify(sections)]).size;
            allSimulations.push(...this.extractSimulations(sections));
          }
        }
      }
      // Add ~20% overhead for IndexedDB storage, keys, quiz data fetched separately
      this.measuredContentBytes.set(Math.round(contentBytes * 1.2));
      this.lessons.set(allLessons);
      this.simulations.set(allSimulations);
      if (allSimulations.length > 0 && allSimulations.every((section) => !section.allowOffline || !section.hasManifest)) {
        this.includeSimulations.set(false);
      }
      this.freeSpace.set((storageEstimate.quotaBytes ?? 0) - (storageEstimate.usedBytes ?? 0));

      const downloadableVideoAssets = allLessons
        .flatMap((lesson) => lesson.videoAssets)
        .filter((asset) => asset.sourceKind === 'STREAM' || asset.sourceKind === 'ADAPTIVE_R2');
      if (downloadableVideoAssets.length > 0) {
        await this.loadStreamProfileSizes(downloadableVideoAssets);
      }
      this.syncSelectedQualityToAvailableOptions();
    } catch {
      this.lessons.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  videoSizeForQuality(quality: VideoQuality): number {
    if (quality === 'none') {
      return 0;
    }

    let totalBytes = 0;

    totalBytes += this.estimateBytesForMinutes(this.directVideoMinutes(), 'ORIGINAL');

    const originalOnlyExactSize = this.originalOnlyStreamSizeBytes();
    if (originalOnlyExactSize > 0) {
      totalBytes += originalOnlyExactSize;
    } else {
      totalBytes += this.estimateBytesForMinutes(this.originalOnlyStreamVideoMinutes(), 'ORIGINAL');
    }

    if (quality === 'ORIGINAL') {
      totalBytes += this.estimateBytesForMinutes(
        this.groupedStreamVideoMinutes() + this.unknownStreamVideoMinutes(),
        'ORIGINAL',
      );
      return totalBytes;
    }

    const groupedTotals = this.profileSizeTotals();
    const exactGroupedSize = groupedTotals[quality] ?? 0;
    if (exactGroupedSize > 0) {
      totalBytes += exactGroupedSize;
    } else {
      totalBytes += this.estimateBytesForMinutes(this.groupedStreamVideoMinutes(), quality);
    }

    totalBytes += this.estimateBytesForMinutes(this.unknownStreamVideoMinutes(), quality);
    return totalBytes;
  }

  getQualityOptionLabel(quality: VideoQuality): string {
    const option = this.qualityOptions().find((item) => item.value === quality);
    if (!option || quality === 'none') {
      return option?.label ?? '';
    }

    const resolutionHint = this.profileResolutionHints()[quality];
    return resolutionHint
      ? formatOfflineVideoProfileLabel({ id: quality, actualResolution: resolutionHint })
      : option.label;
  }

  private async loadStreamProfileSizes(videoAssets: VideoAssetSummary[]): Promise<void> {
    const totals: Partial<Record<OfflineVideoProfileId, number>> = {};
    const resolutions = new Map<OfflineVideoProfileId, Set<string>>();
    const detectedProfiles = new Set<OfflineVideoProfileId>();
    let groupedMinutes = 0;
    let groupedCount = 0;
    let originalOnlyMinutes = 0;
    let originalOnlyCount = 0;
    let originalOnlySizeBytes = 0;
    let unknownMinutes = 0;
    let unknownCount = 0;

    await Promise.all(videoAssets.map(async (asset) => {
      try {
        const endpoint = asset.sectionId
          ? `${environment.apiUrl}/api/v3/sections/${asset.sectionId}/video/sizes`
          : `${environment.apiUrl}/api/v3/lessons/${asset.lessonId}/video/sizes`;
        const response: any = await firstValueFrom(this.http.get(endpoint));
        const rawProfiles = (response?.profiles ?? response?.data?.profiles ?? []) as OfflineVideoProfileDescriptor[];
        const profiles: Array<OfflineVideoProfileDescriptor & { id: OfflineVideoProfileId }> = rawProfiles.filter(
          (profile: OfflineVideoProfileDescriptor): profile is OfflineVideoProfileDescriptor & { id: OfflineVideoProfileId } =>
            this.isOfflineProfileId(profile.id),
        );

        if (profiles.length === 0) {
          unknownMinutes += asset.durationMinutes;
          unknownCount += 1;
          return;
        }

        const groupedProfiles = profiles.filter(
          (
            profile,
          ): profile is OfflineVideoProfileDescriptor & { id: Exclude<OfflineVideoProfileId, 'ORIGINAL'> } =>
            profile.id !== 'ORIGINAL',
        );
        if (groupedProfiles.length > 0) {
          groupedMinutes += asset.durationMinutes;
          groupedCount += 1;

          for (const profile of groupedProfiles) {
            detectedProfiles.add(profile.id);
            if ((profile.sizeBytes ?? 0) > 0) {
              totals[profile.id] = (totals[profile.id] ?? 0) + (profile.sizeBytes ?? 0);
            }
            if (profile.actualResolution) {
              const current = resolutions.get(profile.id) ?? new Set<string>();
              current.add(profile.actualResolution);
              resolutions.set(profile.id, current);
            }
          }
          return;
        }

        const originalProfile = profiles.find(
          (profile): profile is OfflineVideoProfileDescriptor & { id: 'ORIGINAL' } => profile.id === 'ORIGINAL',
        );
        if (originalProfile) {
          detectedProfiles.add('ORIGINAL');
          originalOnlyMinutes += asset.durationMinutes;
          originalOnlyCount += 1;
          if ((originalProfile.sizeBytes ?? 0) > 0) {
            originalOnlySizeBytes += originalProfile.sizeBytes ?? 0;
          }
          if (originalProfile.actualResolution) {
            const current = resolutions.get('ORIGINAL') ?? new Set<string>();
            current.add(originalProfile.actualResolution);
            resolutions.set('ORIGINAL', current);
          }
          return;
        }

        unknownMinutes += asset.durationMinutes;
        unknownCount += 1;
      } catch {
        unknownMinutes += asset.durationMinutes;
        unknownCount += 1;
      }
    }));

    this.detectedProfileIds.set(this.sortProfileIds([...detectedProfiles]));
    this.profileSizeTotals.set(totals);
    this.profileResolutionHints.set({
      SAVER: this.pickResolutionHint(resolutions.get('SAVER')),
      STANDARD: this.pickResolutionHint(resolutions.get('STANDARD')),
      HIGH: this.pickResolutionHint(resolutions.get('HIGH')),
      ORIGINAL: this.pickResolutionHint(resolutions.get('ORIGINAL')),
    });
    this.groupedStreamVideoMinutes.set(groupedMinutes);
    this.groupedStreamVideoCount.set(groupedCount);
    this.originalOnlyStreamVideoMinutes.set(originalOnlyMinutes);
    this.originalOnlyStreamVideoCount.set(originalOnlyCount);
    this.originalOnlyStreamSizeBytes.set(originalOnlySizeBytes);
    this.unknownStreamVideoMinutes.set(unknownMinutes);
    this.unknownStreamVideoCount.set(unknownCount);
  }

  private extractVideoAssets(lesson: any): VideoAssetSummary[] {
    const lessonDuration = lesson.durationMinutes || 10;
    const inferSourceKind = (
      videoUrl?: string | null,
      streamVideoUid?: string | null,
      explicitSourceKind?: string | null,
    ): VideoSourceKind => {
      if (explicitSourceKind === 'ADAPTIVE_R2' || explicitSourceKind === 'STREAM' || explicitSourceKind === 'EXTERNAL' || explicitSourceKind === 'LEGACY_DIRECT') {
        return explicitSourceKind;
      }

      if (streamVideoUid) {
        return 'STREAM';
      }

      const normalizedUrl = (videoUrl || '').toLowerCase();
      if (normalizedUrl.includes('youtube.com') || normalizedUrl.includes('youtu.be')) {
        return 'EXTERNAL';
      }

      return videoUrl ? 'LEGACY_DIRECT' : 'EXTERNAL';
    };

    if (Array.isArray(lesson.sections) && lesson.sections.length > 0) {
      return lesson.sections
        .filter((section: any) => section.type === 'VIDEO' && (section.videoUrl || section.streamVideoUid || section.videoAssetId))
        .map((section: any) => ({
          lessonId: lesson.id,
          sectionId: section.id,
          durationMinutes: section.durationMinutes || lessonDuration,
          streamVideoUid: section.streamVideoUid || undefined,
          sourceKind: inferSourceKind(section.videoUrl, section.streamVideoUid, section.videoSourceKind),
        }));
    }

    if (lesson.videoUrl || lesson.streamVideoUid) {
      return [{
        lessonId: lesson.id,
        sectionId: null,
        durationMinutes: lessonDuration,
        streamVideoUid: lesson.streamVideoUid || undefined,
        sourceKind: inferSourceKind(lesson.videoUrl, lesson.streamVideoUid, lesson.videoSourceKind),
      }];
    }

    return [];
  }

  private extractSimulations(sections: any[]): SimulationSummary[] {
    return sections
      .filter((section: any) => section.type === 'SIMULATION' && section.simulationData)
      .map((section: any) => {
        const data = section.simulationData || {};
        return {
          sectionId: section.id,
          title: section.title || data.simulationPackageId || 'Mo phong',
          packageId: data.simulationPackageId || section.id,
          estimatedSizeBytes: Math.max(0, Number(data.estimatedSizeBytes ?? 0) || 0),
          allowOffline: data.allowOffline !== false,
          hasManifest: typeof data.manifestUrl === 'string' && data.manifestUrl.trim().length > 0,
        };
      });
  }

  private buildGroupedQualityOption(profile: OfflineVideoProfileId): QualityOption {
    return {
      value: profile,
      label: getOfflineVideoProfileLabel(profile),
      hint: this.getGroupedProfileHint(profile),
    };
  }

  private buildOriginalQualityOption(): QualityOption {
    return {
      value: 'ORIGINAL',
      label: getOfflineVideoProfileLabel('ORIGINAL'),
      hint: 'Giữ nguyên tệp gốc khi video chỉ có bản tải ngoại tuyến dạng gốc.',
    };
  }

  private getGroupedProfileHint(profile: OfflineVideoProfileId): string {
    switch (profile) {
      case 'SAVER':
        return 'Ưu tiên gói nhỏ nhất mà video thật sự đang có.';
      case 'STANDARD':
        return 'Mức cân bằng cho đa số bài học và thiết bị.';
      case 'HIGH':
        return 'Dùng bản tốt nhất nếu video đã có sẵn.';
      default:
        return this.buildOriginalQualityOption().hint;
    }
  }

  private estimateBytesForMinutes(minutes: number, quality: VideoQuality): number {
    if (minutes <= 0 || quality === 'none') {
      return 0;
    }
    return Math.round((minutes / 10) * this.VIDEO_SIZE_PER_10MIN[quality]);
  }

  private sortProfileIds(profileIds: OfflineVideoProfileId[]): OfflineVideoProfileId[] {
    const order: OfflineVideoProfileId[] = ['SAVER', 'STANDARD', 'HIGH', 'ORIGINAL'];
    return [...profileIds].sort((left, right) => order.indexOf(left) - order.indexOf(right));
  }

  private isOfflineProfileId(profileId: unknown): profileId is OfflineVideoProfileId {
    return profileId === 'SAVER'
      || profileId === 'STANDARD'
      || profileId === 'HIGH'
      || profileId === 'ORIGINAL';
  }

  private syncSelectedQualityToAvailableOptions(): void {
    const availableValues = new Set(this.qualityOptions().map((option) => option.value));
    if (availableValues.has(this.selectedQuality())) {
      return;
    }

    const firstDownloadableOption = this.qualityOptions().find((option) => option.value !== 'none')?.value ?? 'none';
    this.selectedQuality.set(firstDownloadableOption);
  }

  private pickResolutionHint(values: Set<string> | undefined): string | undefined {
    if (!values || values.size === 0) {
      return undefined;
    }

    return [...values].sort((left, right) => left.localeCompare(right)).at(-1);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  onConfirm(): void {
    this.confirm.emit({
      videoQuality: this.selectedQuality(),
      includeSimulations: this.includeSimulations() && this.downloadableSimulationSectionsCount() > 0,
    });
  }

  formatSize(bytes: number): string {
    if (bytes === 0) {
      return '0 MB';
    }
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}
