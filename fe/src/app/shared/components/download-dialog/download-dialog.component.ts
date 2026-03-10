import {
  Component, input, output, signal, computed, inject,
  ChangeDetectionStrategy, OnInit
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { StorageManagerService } from '../../../core/services/storage-manager.service';
import { environment } from '../../../../environments/environment';

export type VideoQuality = 'none' | '360p' | '720p' | '1080p';

export interface DownloadOptions {
  videoQuality: VideoQuality;
}

interface LessonSummary {
  id: string;
  title: string;
  hasVideo: boolean;
  durationMinutes: number;
}

/**
 * Download Dialog — lets user choose video quality before downloading a course.
 *
 * Displays size estimates per quality level, free storage, and warnings.
 * Phase 1: Uses heuristic size estimates (no Cloudflare Stream yet).
 * Phase 2: Will use real sizes from API.
 */
@Component({
  selector: 'app-download-dialog',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
         (click)="onBackdropClick($event)">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
           (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="px-6 pt-6 pb-4">
          <h3 class="text-lg font-semibold text-gray-900 leading-tight">
            Tải về: "{{ courseTitle() }}"
          </h3>
        </div>

        @if (isLoading()) {
          <div class="px-6 pb-6 flex items-center justify-center h-48">
            <div class="w-8 h-8 border-2 border-[#0056D2] border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else {
          <div class="px-6 space-y-4">
            <!-- Text content summary -->
            <div class="flex items-center justify-between py-2">
              <div class="flex items-center gap-2 text-sm text-gray-700">
                <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Nội dung bài học ({{ totalLessons() }} bài)
              </div>
              <span class="text-sm text-gray-500">~{{ formatSize(textSizeBytes()) }}</span>
            </div>

            <hr class="border-gray-200">

            <!-- Video section -->
            @if (videoLessonsCount() > 0) {
              <div class="space-y-3">
                <div class="flex items-center gap-2 text-sm text-gray-700">
                  <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Video ({{ videoLessonsCount() }} bài có video)
                </div>

                <!-- Quality radio buttons -->
                <div class="space-y-2 ml-6">
                  @for (option of qualityOptions; track option.value) {
                    <label class="flex items-center justify-between cursor-pointer group">
                      <div class="flex items-center gap-2">
                        <input type="radio"
                               name="videoQuality"
                               [value]="option.value"
                               [checked]="selectedQuality() === option.value"
                               (change)="selectedQuality.set(option.value)"
                               class="w-4 h-4 text-[#0056D2] border-gray-300 focus:ring-[#0056D2]">
                        <span class="text-sm text-gray-700 group-hover:text-gray-900">{{ option.label }}</span>
                      </div>
                      <span class="text-sm text-gray-500">{{ option.value === 'none' ? '0 MB' : '~' + formatSize(videoSizeForQuality(option.value)) }}</span>
                    </label>
                  }
                </div>
              </div>

              <hr class="border-gray-200">
            }

            <!-- Total estimate -->
            <div class="flex items-center justify-between py-1">
              <span class="text-sm font-medium text-gray-900">Tổng ước tính</span>
              <span class="text-sm font-semibold text-gray-900">~{{ formatSize(totalEstimate()) }}</span>
            </div>

            <!-- Free space -->
            <div class="flex items-center justify-between py-1">
              <span class="text-sm text-gray-500">Dung lượng trống</span>
              <span class="text-sm text-gray-500">{{ formatSize(freeSpace()) }}</span>
            </div>

            <!-- Storage warnings -->
            @if (storageWarning()) {
              <div class="rounded-lg px-3 py-2 text-xs"
                   [class]="insufficientStorage() ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'">
                {{ storageWarning() }}
              </div>
            }

            <!-- Storage management link -->
            <a routerLink="/student/storage" class="block text-xs text-[#0056D2] hover:underline py-1">
              Quản lý bộ nhớ
            </a>
          </div>

          <!-- Footer buttons -->
          <div class="px-6 py-4 mt-2 flex items-center justify-end gap-3 border-t border-gray-100">
            <button (click)="close.emit()"
                    class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors">
              Hủy
            </button>
            <button (click)="onConfirm()"
                    [disabled]="insufficientStorage()"
                    class="px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                    [class]="insufficientStorage()
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-[#0056D2] hover:bg-[#004BB5]'">
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

  readonly courseId = input.required<string>();
  readonly courseTitle = input<string>('');

  readonly close = output<void>();
  readonly confirm = output<DownloadOptions>();

  readonly isLoading = signal(true);
  readonly selectedQuality = signal<VideoQuality>('720p');
  readonly freeSpace = signal(0);
  readonly lessons = signal<LessonSummary[]>([]);

  readonly totalLessons = computed(() => this.lessons().length);
  readonly videoLessonsCount = computed(() => this.lessons().filter(l => l.hasVideo).length);
  readonly totalVideoMinutes = computed(() =>
    this.lessons().filter(l => l.hasVideo).reduce((sum, l) => sum + (l.durationMinutes || 10), 0)
  );

  /** ~1.5 MB per lesson (HTML + images) */
  readonly textSizeBytes = computed(() => this.totalLessons() * 1.5 * 1024 * 1024);

  /** Video size heuristics per quality level (Phase 1 — no Cloudflare Stream) */
  readonly VIDEO_SIZE_PER_10MIN: Record<VideoQuality, number> = {
    'none': 0,
    '360p': 30 * 1024 * 1024,    // ~30 MB per 10 min
    '720p': 85 * 1024 * 1024,    // ~85 MB per 10 min
    '1080p': 170 * 1024 * 1024,  // ~170 MB per 10 min
  };

  readonly qualityOptions = [
    { value: 'none' as VideoQuality, label: 'Không tải video' },
    { value: '360p' as VideoQuality, label: 'Tiết kiệm (360p)' },
    { value: '720p' as VideoQuality, label: 'Cân bằng (720p)' },
    { value: '1080p' as VideoQuality, label: 'Cao (1080p)' },
  ];

  videoSizeForQuality(quality: VideoQuality): number {
    const minutes = this.totalVideoMinutes();
    const per10min = this.VIDEO_SIZE_PER_10MIN[quality];
    return Math.round((minutes / 10) * per10min);
  }

  readonly totalEstimate = computed(() => {
    const text = this.textSizeBytes();
    const video = this.videoSizeForQuality(this.selectedQuality());
    return text + video;
  });

  readonly storageWarning = computed(() => {
    const free = this.freeSpace();
    const needed = this.totalEstimate();
    if (free > 0 && needed > free) {
      return 'Không đủ dung lượng để tải. Vui lòng xóa dữ liệu cũ.';
    }
    if (free > 0 && needed > free * 0.8) {
      return 'Dung lượng còn ít. Tải xong có thể chiếm >80% bộ nhớ trống.';
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
      // Fetch course content + storage estimate in parallel
      const [contentRes, storageEstimate] = await Promise.all([
        firstValueFrom(this.http.get<any>(`${environment.apiUrl}/api/v3/courses/${this.courseId()}/content`)),
        this.storage.refresh(),
      ]);

      const chapters = contentRes?.data || contentRes || [];
      const allLessons: LessonSummary[] = [];

      for (const chapter of chapters) {
        for (const lesson of (chapter.lessons || [])) {
          const videoUrl = lesson.sections?.[0]?.videoUrl || lesson.videoUrl;
          allLessons.push({
            id: lesson.id,
            title: lesson.title || lesson.name,
            hasVideo: !!videoUrl,
            durationMinutes: lesson.durationMinutes || 10,
          });
        }
      }

      this.lessons.set(allLessons);
      this.freeSpace.set((storageEstimate.quotaBytes ?? 0) - (storageEstimate.usedBytes ?? 0));
    } catch {
      // Fallback: show dialog without lesson details
      this.lessons.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  onConfirm(): void {
    this.confirm.emit({ videoQuality: this.selectedQuality() });
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 MB';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
}
