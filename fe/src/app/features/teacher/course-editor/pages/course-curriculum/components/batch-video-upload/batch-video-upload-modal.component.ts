import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { BatchUploadPreviewTreeComponent } from './batch-upload-preview-tree.component';
import { BatchVideoUploadService } from './batch-video-upload.service';
import {
  BatchScope,
  BatchTargetLesson,
  DistributionStrategy,
} from './batch-video-upload.types';

/**
 * Modal shell — 3-stage state machine:
 *  PICK     → drop zone + scope/strategy chooser
 *  PREVIEW  → tree view (drag-drop xếp lại) + confirm
 *  UPLOADING/COMPLETE → progress dashboard + tree với status real-time
 *
 * Service singleton (BatchVideoUploadService) survive khi modal đóng → upload
 * tiếp tục chạy nền. Mode `IDLE` reset trạng thái cho lần mở sau.
 *
 * Tuân thủ docs/reference/PAGE_UX_STANDARD.md:
 *  - Lucide icons (NO emoji)
 *  - Design tokens: #0056D2 primary, semantic emerald/amber/red
 *  - Cards rounded-xl, border-gray-200, shadow-sm
 *  - Spacing 8px grid
 */
@Component({
  selector: 'app-batch-video-upload-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BatchUploadPreviewTreeComponent, NgTemplateOutlet, LucideAngularModule],
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-6 px-4"
        (click)="onBackdropClick($event)"
      >
        <div
          class="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-upload-title"
        >
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 flex items-start justify-between flex-shrink-0">
            <div class="min-w-0">
              <h2 id="batch-upload-title" class="text-lg font-semibold text-gray-900">
                {{ headerTitle() }}
              </h2>
              <p class="text-sm text-gray-500 mt-0.5">{{ headerSubtitle() }}</p>
            </div>
            <button
              type="button"
              (click)="requestClose()"
              class="text-gray-400 hover:text-gray-600 p-1.5 rounded-md hover:bg-gray-100 flex-shrink-0 ml-4"
              aria-label="Đóng"
            >
              <lucide-icon name="x" [size]="20"></lucide-icon>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 py-5">
            @switch (svc.mode()) {
              @case ('PICK') {
                <ng-container *ngTemplateOutlet="pickStage"></ng-container>
              }
              @case ('PREVIEW') {
                <ng-container *ngTemplateOutlet="previewStage"></ng-container>
              }
              @case ('UPLOADING') {
                <ng-container *ngTemplateOutlet="uploadingStage"></ng-container>
              }
              @case ('COMPLETE') {
                <ng-container *ngTemplateOutlet="uploadingStage"></ng-container>
              }
              @default {
                <ng-container *ngTemplateOutlet="pickStage"></ng-container>
              }
            }
          </div>

          <!-- Footer -->
          <div class="px-6 py-3 border-t border-gray-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
            <div class="text-sm text-gray-700 min-w-0">
              @if (svc.mode() === 'UPLOADING' || svc.mode() === 'COMPLETE') {
                @let p = svc.aggregateProgress();
                <span class="font-medium tabular-nums">{{ p.readyCount }}/{{ p.totalCount }}</span>
                <span class="text-gray-500"> sẵn sàng</span>
                @if (etaSeconds() !== null && svc.mode() === 'UPLOADING') {
                  <span class="text-gray-400 mx-1">·</span>
                  <span class="text-gray-600">~{{ formatEta(etaSeconds()!) }} còn lại</span>
                }
                @if (p.failedCount > 0) {
                  <span class="text-gray-400 mx-1">·</span>
                  <span class="text-red-600 font-medium">{{ p.failedCount }} lỗi</span>
                }
              } @else if (svc.mode() === 'PREVIEW') {
                @let p = svc.aggregateProgress();
                <span class="font-medium tabular-nums">{{ p.totalCount }}</span>
                <span class="text-gray-500"> video → </span>
                <span class="font-medium tabular-nums">{{ lessonsWithVideoCount() }}</span>
                <span class="text-gray-500"> bài</span>
              } @else {
                <span>&nbsp;</span>
              }
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              @if (svc.mode() === 'PICK') {
                <button
                  type="button"
                  (click)="requestClose()"
                  class="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >Hủy</button>
              }
              @if (svc.mode() === 'PREVIEW') {
                <button
                  type="button"
                  (click)="onBackToPick()"
                  class="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >Chọn lại file</button>
                <button
                  type="button"
                  (click)="onConfirmStart()"
                  [disabled]="svc.aggregateProgress().totalCount === 0"
                  class="px-4 py-1.5 text-sm font-semibold text-white bg-[#0056D2] hover:bg-[#004BB8] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  <lucide-icon name="upload-cloud" [size]="14"></lucide-icon>
                  Bắt đầu tải lên
                </button>
              }
              @if (svc.mode() === 'UPLOADING' || svc.mode() === 'COMPLETE') {
                <button
                  type="button"
                  (click)="onCloseAndContinue()"
                  class="px-4 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg"
                >
                  {{ svc.mode() === 'COMPLETE' ? 'Đóng' : 'Thu nhỏ — chạy nền' }}
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ============ PICK Stage ============ -->
    <ng-template #pickStage>
      <div class="space-y-4">
        <div
          (drop)="onFileDrop($event)"
          (dragover)="$event.preventDefault()"
          (dragenter)="dragHover.set(true)"
          (dragleave)="dragHover.set(false)"
          [class.border-\[\#0056D2\]]="dragHover()"
          [class.bg-\[\#0056D2\]\/5]="dragHover()"
          class="border-2 border-dashed border-gray-300 rounded-xl px-8 py-10 text-center hover:border-[#0056D2] transition-colors"
        >
          <div class="mx-auto w-12 h-12 rounded-full bg-[#0056D2]/10 flex items-center justify-center mb-3">
            <lucide-icon name="upload-cloud" [size]="24" class="text-[#0056D2]"></lucide-icon>
          </div>
          <p class="text-sm font-medium text-gray-900">Kéo thả nhiều video vào đây</p>
          <p class="text-xs text-gray-500 mt-1">hoặc</p>
          <label class="inline-block mt-2 cursor-pointer">
            <input
              type="file"
              multiple
              accept="video/*"
              (change)="onFilePickerChange($event)"
              class="hidden"
            />
            <span class="px-4 py-2 text-sm font-semibold text-[#0056D2] bg-[#0056D2]/10 hover:bg-[#0056D2]/20 rounded-lg inline-block transition-colors">
              Chọn nhiều file
            </span>
          </label>
          <p class="text-xs text-gray-400 mt-3">MP4, MOV, MKV, WebM · Tối đa 5GB / file</p>
        </div>

        <!-- Smart context line: cho user biết video sẽ đi đâu mà không phải tự cấu hình -->
        <div class="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-gray-700">
          <div class="flex items-start gap-2">
            <lucide-icon name="info" [size]="16" class="text-[#0056D2] flex-shrink-0 mt-0.5"></lucide-icon>
            <div class="min-w-0">
              <p>{{ defaultDistributionDescription() }}</p>
              <p class="text-xs text-gray-500 mt-0.5">Bạn có thể xem trước và xếp lại trước khi tải lên.</p>
            </div>
          </div>
        </div>

        <!-- Advanced (collapsed by default) — chỉ hiện khi có >1 bài để chia -->
        @if (hasScopeChoices()) {
          <button
            type="button"
            (click)="showAdvanced.set(!showAdvanced())"
            class="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-[#0056D2]"
          >
            <lucide-icon
              [name]="showAdvanced() ? 'chevron-up' : 'chevron-down'"
              [size]="14"
            ></lucide-icon>
            Tuỳ chỉnh nâng cao
          </button>

          @if (showAdvanced()) {
            <fieldset class="border border-gray-200 rounded-xl p-4 space-y-2">
              <legend class="text-xs font-semibold text-gray-700 px-2 uppercase tracking-wide">Chia video vào đâu?</legend>
              @for (opt of visibleScopeOptions(); track opt.value) {
                <label class="flex items-start gap-2.5 text-sm cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-1.5 rounded-md">
                  <input
                    type="radio"
                    name="scope"
                    [value]="opt.value"
                    [checked]="selectedScope() === opt.value"
                    (change)="selectedScope.set(opt.value)"
                    class="mt-1 accent-[#0056D2]"
                  />
                  <div class="min-w-0">
                    <div class="font-medium text-gray-900">{{ opt.label }}</div>
                    <div class="text-xs text-gray-500">{{ opt.description }}</div>
                  </div>
                </label>
              }
            </fieldset>

            @if (selectedScope() !== 'CURRENT_LESSON') {
              <fieldset class="border border-gray-200 rounded-xl p-4 space-y-2">
                <legend class="text-xs font-semibold text-gray-700 px-2 uppercase tracking-wide">Cách chia</legend>
                @for (opt of strategyOptions; track opt.value) {
                  <label class="flex items-start gap-2.5 text-sm cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-1.5 rounded-md">
                    <input
                      type="radio"
                      name="strategy"
                      [value]="opt.value"
                      [checked]="selectedStrategy() === opt.value"
                      (change)="selectedStrategy.set(opt.value)"
                      class="mt-1 accent-[#0056D2]"
                    />
                    <div class="min-w-0">
                      <div class="font-medium text-gray-900">{{ opt.label }}</div>
                      <div class="text-xs text-gray-500">{{ opt.hint }}</div>
                    </div>
                  </label>
                }
              </fieldset>
            }
          }
        }
      </div>
    </ng-template>

    <!-- ============ PREVIEW Stage ============ -->
    <ng-template #previewStage>
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span class="text-gray-500">Kéo thả để xếp lại video giữa các bài. Click tên để sửa tiêu đề.</span>
          <label class="inline-flex items-center gap-2 text-gray-600">
            <span class="font-medium">Cách phân bổ:</span>
            <select
              [value]="selectedStrategy()"
              (change)="onStrategyChanged($any($event.target).value)"
              class="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-900 focus:border-[#0056D2] focus:outline-none focus:ring-1 focus:ring-[#0056D2]"
            >
              @for (opt of strategyOptions; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          </label>
        </div>
        <app-batch-upload-preview-tree
          [lessons]="svc.availableLessons()"
          [items]="svc.items()"
          [showCreateLessonButton]="true"
          (itemMoved)="onItemMoved($event)"
          (removeRequested)="svc.removeItem($event)"
          (titleChanged)="svc.updateTitle($event.itemId, $event.title)"
          (newLessonRequested)="onNewLessonRequested()"
        />
      </div>
    </ng-template>

    <!-- ============ UPLOADING / COMPLETE Stage ============ -->
    <ng-template #uploadingStage>
      <div class="space-y-4">
        @let p = svc.aggregateProgress();
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
          @for (card of statusCards(); track card.label) {
            <div class="rounded-xl border px-3 py-2.5" [class]="card.containerClass">
              <div class="flex items-center justify-between mb-0.5">
                <lucide-icon [name]="card.icon" [size]="14" [class]="card.iconClass"></lucide-icon>
                <span class="text-lg font-semibold tabular-nums" [class]="card.numberClass">{{ card.count }}</span>
              </div>
              <div class="text-[11px] font-medium" [class]="card.labelClass">{{ card.label }}</div>
            </div>
          }
        </div>

        @if (svc.mode() === 'UPLOADING') {
          @let totalDone = p.readyCount + p.failedCount;
          <div class="rounded-xl border border-gray-200 bg-white p-3">
            <div class="flex items-center justify-between text-xs mb-2">
              <span class="text-gray-700 font-medium">Tổng tiến độ</span>
              <span class="text-gray-500 tabular-nums">{{ totalDone }} / {{ p.totalCount }}</span>
            </div>
            <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-[#0056D2] transition-all duration-300 rounded-full"
                [style.width.%]="overallPercent()"
              ></div>
            </div>
          </div>
        }

        <app-batch-upload-preview-tree
          [lessons]="svc.availableLessons()"
          [items]="svc.items()"
          [showCreateLessonButton]="false"
          (removeRequested)="svc.removeItem($event)"
          (retryRequested)="svc.retryItem($event)"
          (cancelRequested)="svc.cancelItem($event)"
        />
      </div>
    </ng-template>
  `,
})
export class BatchVideoUploadModalComponent {
  protected readonly svc = inject(BatchVideoUploadService);

  readonly isOpen = input(false);
  readonly courseId = input.required<string>();
  readonly currentChapterId = input<string | null>(null);
  readonly currentLessonId = input<string | null>(null);
  readonly availableLessons = input<BatchTargetLesson[]>([]);

  readonly closed = output<void>();

  readonly dragHover = signal(false);
  readonly selectedScope = signal<BatchScope>('CURRENT_CHAPTER');
  readonly selectedStrategy = signal<DistributionStrategy>('EVEN');
  readonly showAdvanced = signal(false);

  /** Strategy "SINGLE_LESSON" KHÔNG hiện trong UI vì trùng nghĩa với scope=CURRENT_LESSON. */
  protected readonly strategyOptions: { value: DistributionStrategy; label: string; hint: string }[] = [
    {
      value: 'EVEN',
      label: 'Chia đều mỗi bài',
      hint: 'Mỗi bài nhận số video xấp xỉ nhau. Bài đầu nhận thêm 1 nếu không chia hết.',
    },
    {
      value: 'PREFIX',
      label: 'Theo số đầu tên file',
      hint: 'Tự nhận diện file đặt tên dạng "01_xx", "02_yy". Nếu không có quy tắc → tự chia đều.',
    },
  ];

  readonly lessonsWithVideoCount = computed(() => {
    const items = this.svc.items();
    const ids = new Set(items.map((i) => i.lessonId));
    return ids.size;
  });

  /** Lessons trong chapter hiện tại — dùng để compute scope choices. */
  private readonly lessonsInChapter = computed<BatchTargetLesson[]>(() => {
    const chapterId = this.currentChapterId();
    if (!chapterId) return this.availableLessons();
    return this.availableLessons().filter((l) => l.chapterId === chapterId);
  });

  /**
   * Smart adaptive: chỉ show scope picker nếu thực sự có >1 lựa chọn ý nghĩa.
   * Khoá có 1 chương 1 bài → 3 options đều = 1 bài → ẩn picker hoàn toàn.
   */
  readonly hasScopeChoices = computed(() => {
    const chapterCount = this.lessonsInChapter().length;
    const courseCount = this.availableLessons().length;
    // Có ý nghĩa nếu: (a) chapter có >1 bài, hoặc (b) khoá có nhiều chapter
    return chapterCount > 1 || courseCount > chapterCount;
  });

  /** Filter scope options chỉ show ones có ý nghĩa cho khoá hiện tại. */
  readonly visibleScopeOptions = computed(() => {
    const chapterCount = this.lessonsInChapter().length;
    const courseCount = this.availableLessons().length;
    const options: { value: BatchScope; label: string; description: string }[] = [];

    options.push({
      value: 'CURRENT_LESSON',
      label: 'Chỉ bài đang mở',
      description: 'Tất cả video gộp vào 1 bài',
    });

    if (chapterCount > 1) {
      options.push({
        value: 'CURRENT_CHAPTER',
        label: `${chapterCount} bài trong chương hiện tại`,
        description: 'Chia video cho các bài thuộc chương này',
      });
    }
    if (courseCount > chapterCount) {
      options.push({
        value: 'ENTIRE_COURSE',
        label: `${courseCount} bài trong cả khoá`,
        description: 'Chia video cho mọi bài của khoá',
      });
    }
    return options;
  });

  /**
   * Context line (Hick's Law: tell user upfront what default behavior is).
   * Adaptive theo state thực tế của khoá.
   */
  readonly defaultDistributionDescription = computed<string>(() => {
    const chapterCount = this.lessonsInChapter().length;
    const courseCount = this.availableLessons().length;

    if (courseCount === 0) {
      return 'Chưa có bài học nào để chia video. Vui lòng tạo bài trước.';
    }
    if (chapterCount === 1 && courseCount === 1) {
      return 'Tất cả video sẽ được thêm vào bài hiện tại.';
    }
    if (this.selectedScope() === 'CURRENT_LESSON') {
      return 'Tất cả video sẽ vào bài đang mở.';
    }
    if (this.selectedScope() === 'ENTIRE_COURSE') {
      return `Video sẽ được chia đều vào ${courseCount} bài của khoá.`;
    }
    return `Video sẽ được chia đều vào ${chapterCount} bài trong chương hiện tại.`;
  });

  /**
   * ETA tổng cho batch: bottleneck là backend transcoding (max 2 concurrent,
   * ~60s per video — measured 6.2x realtime với video ~6 phút trên prod).
   * Returns null khi không có item active.
   */
  readonly etaSeconds = computed<number | null>(() => {
    const p = this.svc.aggregateProgress();
    const remaining = p.pendingCount + p.uploadingCount + p.processingCount;
    if (remaining === 0) return null;
    const BACKEND_PARALLEL = 2;
    const AVG_SECONDS_PER_VIDEO = 60;
    return Math.ceil((remaining / BACKEND_PARALLEL) * AVG_SECONDS_PER_VIDEO);
  });

  readonly overallPercent = computed(() => {
    const p = this.svc.aggregateProgress();
    if (p.totalCount === 0) return 0;
    const done = p.readyCount + p.failedCount;
    return Math.round((done / p.totalCount) * 100);
  });

  readonly statusCards = computed(() => {
    const p = this.svc.aggregateProgress();
    return [
      {
        label: 'Chờ',
        count: p.pendingCount,
        icon: 'clock',
        containerClass: 'border-gray-200 bg-white',
        iconClass: 'text-slate-400',
        numberClass: 'text-gray-900',
        labelClass: 'text-gray-500',
      },
      {
        label: 'Đang tải lên',
        count: p.uploadingCount,
        icon: 'upload-cloud',
        containerClass: 'border-[#0056D2]/20 bg-[#0056D2]/5',
        iconClass: 'text-[#0056D2]',
        numberClass: 'text-[#0056D2]',
        labelClass: 'text-[#0056D2]',
      },
      {
        label: 'Đang xử lý',
        count: p.processingCount,
        icon: 'settings',
        containerClass: 'border-amber-200 bg-amber-50',
        iconClass: 'text-amber-600',
        numberClass: 'text-amber-700',
        labelClass: 'text-amber-700',
      },
      {
        label: 'Sẵn sàng',
        count: p.readyCount,
        icon: 'check-circle',
        containerClass: 'border-emerald-200 bg-emerald-50',
        iconClass: 'text-emerald-600',
        numberClass: 'text-emerald-700',
        labelClass: 'text-emerald-700',
      },
      {
        label: 'Lỗi',
        count: p.failedCount,
        icon: 'alert-circle',
        containerClass: 'border-red-200 bg-red-50',
        iconClass: 'text-red-600',
        numberClass: 'text-red-700',
        labelClass: 'text-red-700',
      },
    ];
  });

  protected readonly headerTitle = computed(() => {
    switch (this.svc.mode()) {
      case 'PREVIEW':
        return 'Xem trước phân bổ video';
      case 'UPLOADING':
        return 'Đang tải lên video';
      case 'COMPLETE':
        return 'Hoàn thành';
      default:
        return 'Tải lên nhiều video';
    }
  });

  protected readonly headerSubtitle = computed(() => {
    switch (this.svc.mode()) {
      case 'PREVIEW':
        return 'Kéo thả để xếp lại, click tên để sửa, sau đó bấm "Bắt đầu tải lên"';
      case 'UPLOADING':
        return 'Có thể đóng modal — tải lên vẫn chạy nền (cần giữ tab này mở)';
      case 'COMPLETE':
        return 'Tất cả video đã được xử lý';
      default:
        return 'Chọn nhiều video cùng lúc, hệ thống sẽ tự phân bổ vào các bài';
    }
  });

  constructor() {
    effect(() => {
      if (!this.isOpen() && this.svc.mode() === 'COMPLETE') {
        this.svc.reset();
      }
    });

    /**
     * Smart default scope auto-select khi modal mở:
     *  - Vào từ section editor (có currentLessonId, không nhiều bài) → CURRENT_LESSON
     *  - Vào từ chapter editor + có >1 bài trong chương → CURRENT_CHAPTER
     *  - Else → ENTIRE_COURSE (rare)
     * Tránh user phải tự chọn cho 80% trường hợp.
     */
    effect(() => {
      if (!this.isOpen()) return;
      const chapterCount = this.lessonsInChapter().length;
      const courseCount = this.availableLessons().length;

      if (courseCount <= 1) {
        // Khoá chỉ 1 bài → chỉ có 1 lựa chọn ý nghĩa
        this.selectedScope.set('CURRENT_LESSON');
      } else if (chapterCount > 1) {
        this.selectedScope.set('CURRENT_CHAPTER');
      } else if (this.currentLessonId()) {
        this.selectedScope.set('CURRENT_LESSON');
      } else {
        this.selectedScope.set('ENTIRE_COURSE');
      }
    });
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.requestClose();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) this.requestClose();
  }

  protected requestClose(): void {
    if (this.svc.mode() === 'UPLOADING') {
      this.closed.emit();
      return;
    }
    if (this.svc.mode() === 'COMPLETE' || this.svc.mode() === 'PICK' || this.svc.mode() === 'IDLE') {
      this.svc.reset();
    }
    this.closed.emit();
  }

  protected onFilePickerChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.handleFilesPicked(files);
    input.value = '';
  }

  protected onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragHover.set(false);
    const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
    this.handleFilesPicked(files);
  }

  protected onItemMoved(payload: { itemId: string; targetLessonId: string; targetIndex: number }): void {
    this.svc.moveItem(payload.itemId, payload.targetLessonId, payload.targetIndex);
  }

  protected onConfirmStart(): void {
    this.svc.startUpload();
  }

  protected onBackToPick(): void {
    this.svc.reset();
  }

  protected onCloseAndContinue(): void {
    this.requestClose();
  }

  protected onStrategyChanged(value: string): void {
    const valid: DistributionStrategy[] = ['EVEN', 'PREFIX', 'SINGLE_LESSON'];
    if (!valid.includes(value as DistributionStrategy)) return;
    const strategy = value as DistributionStrategy;
    this.selectedStrategy.set(strategy);
    this.svc.redistribute(strategy);
  }

  protected async onNewLessonRequested(): Promise<void> {
    const chapterId = this.currentChapterId();
    if (!chapterId) return;
    const title = window.prompt('Tiêu đề bài mới:', 'Bài mới');
    if (!title?.trim()) return;
    await this.svc.createNewLesson(chapterId, title.trim());
  }

  protected formatEta(seconds: number): string {
    if (seconds < 60) return Math.max(1, seconds) + ' giây';
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return minutes + ' phút';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours + ' giờ' + (mins > 0 ? ' ' + mins + ' phút' : '');
  }

  private handleFilesPicked(files: File[]): void {
    if (files.length === 0) return;
    const scope = this.selectedScope();
    const lessons = this.computeLessonsForScope(scope);
    if (lessons.length === 0) {
      window.alert('Không có bài học nào để phân bổ. Vui lòng tạo bài trước hoặc chọn phạm vi rộng hơn.');
      return;
    }
    this.svc.setupBatch(files, lessons, {
      scope,
      strategy: this.selectedStrategy(),
      courseId: this.courseId(),
      currentLessonId: this.currentLessonId() ?? undefined,
      currentChapterId: this.currentChapterId() ?? undefined,
    });
  }

  private computeLessonsForScope(scope: BatchScope): BatchTargetLesson[] {
    const all = this.availableLessons();
    if (scope === 'ENTIRE_COURSE') return all;
    if (scope === 'CURRENT_CHAPTER') {
      const chapterId = this.currentChapterId();
      return chapterId ? all.filter((l) => l.chapterId === chapterId) : all;
    }
    if (scope === 'CURRENT_LESSON') {
      const lessonId = this.currentLessonId();
      return lessonId ? all.filter((l) => l.id === lessonId) : all;
    }
    return all;
  }
}
