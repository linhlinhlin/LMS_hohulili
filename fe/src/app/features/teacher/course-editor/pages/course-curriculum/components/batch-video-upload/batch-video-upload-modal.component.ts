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
import { BatchUploadPreviewTreeComponent } from './batch-upload-preview-tree.component';
import { BatchVideoUploadService } from './batch-video-upload.service';
import {
  BatchScope,
  BatchTargetLesson,
  BatchUploadConfig,
  DistributionStrategy,
} from './batch-video-upload.types';

/**
 * Modal shell cho batch upload — 3 stage state machine:
 *  1. PICK: drop zone + scope/strategy chooser
 *  2. PREVIEW: tree view (xếp lại) + confirm
 *  3. UPLOADING: progress tree + aggregate stats + close-and-continue
 *
 * Service singleton (BatchVideoUploadService) giữ state khi modal đóng → user
 * có thể navigate khỏi modal mà upload vẫn chạy nền (background safety).
 *
 * Reuse 100% existing services + store. KHÔNG refactor adjacent code.
 */
@Component({
  selector: 'app-batch-video-upload-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BatchUploadPreviewTreeComponent],
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8 px-4"
        (click)="onBackdropClick($event)"
      >
        <div
          class="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-4rem)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-upload-title"
        >
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 id="batch-upload-title" class="text-lg font-semibold text-gray-900">
                {{ headerTitle() }}
              </h2>
              <p class="text-xs text-gray-500 mt-0.5">{{ headerSubtitle() }}</p>
            </div>
            <button
              type="button"
              (click)="requestClose()"
              class="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
              aria-label="Đóng"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
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
            <div class="text-xs text-gray-600">
              @if (svc.mode() === 'UPLOADING' || svc.mode() === 'COMPLETE') {
                @let p = svc.aggregateProgress();
                {{ p.readyCount }}/{{ p.totalCount }} sẵn sàng
                @if (p.failedCount > 0) {
                  · {{ p.failedCount }} lỗi
                }
              } @else if (svc.mode() === 'PREVIEW') {
                @let p = svc.aggregateProgress();
                Tổng: {{ p.totalCount }} video → {{ lessonsWithVideoCount() }} bài
              } @else {
                <span>&nbsp;</span>
              }
            </div>
            <div class="flex items-center gap-2">
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
                >← Chọn lại file</button>
                <button
                  type="button"
                  (click)="onConfirmStart()"
                  [disabled]="svc.aggregateProgress().totalCount === 0"
                  class="px-4 py-1.5 text-sm font-semibold text-white bg-[#0056D2] hover:bg-[#004BB5] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Bắt đầu upload ({{ svc.aggregateProgress().totalCount }} video)
                </button>
              }
              @if (svc.mode() === 'UPLOADING' || svc.mode() === 'COMPLETE') {
                <button
                  type="button"
                  (click)="onCloseAndContinue()"
                  class="px-4 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg"
                >
                  {{ svc.mode() === 'COMPLETE' ? 'Đóng' : 'Đóng — chạy nền' }}
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ========== PICK Stage ========== -->
    <ng-template #pickStage>
      <div class="space-y-4">
        <div
          (drop)="onFileDrop($event)"
          (dragover)="$event.preventDefault()"
          (dragenter)="dragHover.set(true)"
          (dragleave)="dragHover.set(false)"
          [class.border-\[\#0056D2\]]="dragHover()"
          [class.bg-\[\#0056D2\]\/5]="dragHover()"
          class="border-2 border-dashed border-gray-300 rounded-xl px-8 py-12 text-center hover:border-[#0056D2] transition-colors"
        >
          <div class="text-5xl mb-3">📁</div>
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
            <span class="px-4 py-2 text-sm font-semibold text-[#0056D2] bg-[#0056D2]/10 hover:bg-[#0056D2]/20 rounded-lg inline-block">
              Chọn nhiều file
            </span>
          </label>
          <p class="text-xs text-gray-400 mt-3">Tối đa 5GB / file · MP4, MOV, MKV, WebM</p>
        </div>

        <fieldset class="border border-gray-200 rounded-lg p-4 space-y-3">
          <legend class="text-xs font-semibold text-gray-700 px-2">Phạm vi phân bổ</legend>
          @for (opt of scopeOptions; track opt.value) {
            <label class="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="scope"
                [value]="opt.value"
                [checked]="selectedScope() === opt.value"
                (change)="selectedScope.set(opt.value)"
                class="mt-0.5 accent-[#0056D2]"
              />
              <div>
                <div class="font-medium text-gray-900">{{ opt.label }}</div>
                <div class="text-xs text-gray-500">{{ scopeHint(opt.value) }}</div>
              </div>
            </label>
          }
        </fieldset>

        <fieldset class="border border-gray-200 rounded-lg p-4 space-y-3">
          <legend class="text-xs font-semibold text-gray-700 px-2">Cách phân bổ mặc định</legend>
          @for (opt of strategyOptions; track opt.value) {
            <label class="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="strategy"
                [value]="opt.value"
                [checked]="selectedStrategy() === opt.value"
                (change)="selectedStrategy.set(opt.value)"
                class="mt-0.5 accent-[#0056D2]"
              />
              <div>
                <div class="font-medium text-gray-900">{{ opt.label }}</div>
                <div class="text-xs text-gray-500">{{ opt.hint }}</div>
              </div>
            </label>
          }
        </fieldset>
      </div>
    </ng-template>

    <!-- ========== PREVIEW Stage ========== -->
    <ng-template #previewStage>
      <div class="space-y-4">
        <div class="flex items-center justify-between text-xs text-gray-600">
          <span>Kéo thả ⋮⋮ để xếp lại video giữa các bài. Click tên để sửa tiêu đề mục.</span>
          <button
            type="button"
            (click)="onChangeStrategy()"
            class="text-[#0056D2] hover:underline"
          >
            Đổi cách phân bổ
          </button>
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

    <!-- ========== UPLOADING / COMPLETE Stage ========== -->
    <ng-template #uploadingStage>
      <div class="space-y-4">
        @let p = svc.aggregateProgress();
        <div class="grid grid-cols-5 gap-2 text-xs">
          <div class="rounded-lg bg-gray-100 px-3 py-2 text-center">
            <div class="font-semibold text-gray-900">{{ p.pendingCount }}</div>
            <div class="text-gray-500">Chờ</div>
          </div>
          <div class="rounded-lg bg-[#0056D2]/10 px-3 py-2 text-center">
            <div class="font-semibold text-[#0056D2]">{{ p.uploadingCount }}</div>
            <div class="text-gray-500">Đang upload</div>
          </div>
          <div class="rounded-lg bg-amber-50 px-3 py-2 text-center">
            <div class="font-semibold text-amber-700">{{ p.processingCount }}</div>
            <div class="text-gray-500">Đang xử lý</div>
          </div>
          <div class="rounded-lg bg-emerald-50 px-3 py-2 text-center">
            <div class="font-semibold text-emerald-700">{{ p.readyCount }}</div>
            <div class="text-gray-500">Sẵn sàng</div>
          </div>
          <div class="rounded-lg bg-red-50 px-3 py-2 text-center">
            <div class="font-semibold text-red-700">{{ p.failedCount }}</div>
            <div class="text-gray-500">Lỗi</div>
          </div>
        </div>
        <app-batch-upload-preview-tree
          [lessons]="svc.availableLessons()"
          [items]="svc.items()"
          [showCreateLessonButton]="false"
          (removeRequested)="svc.removeItem($event)"
          (retryRequested)="svc.retryItem($event)"
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
  /** Lesson tree: parent passes flat list with chapter context */
  readonly availableLessons = input<BatchTargetLesson[]>([]);

  readonly closed = output<void>();

  readonly dragHover = signal(false);
  readonly selectedScope = signal<BatchScope>('CURRENT_CHAPTER');
  readonly selectedStrategy = signal<DistributionStrategy>('EVEN');

  protected readonly scopeOptions: { value: BatchScope; label: string }[] = [
    { value: 'CURRENT_LESSON', label: 'Bài hiện tại' },
    { value: 'CURRENT_CHAPTER', label: 'Tất cả bài trong chương hiện tại' },
    { value: 'ENTIRE_COURSE', label: 'Tất cả bài trong khoá' },
  ];

  protected readonly strategyOptions: { value: DistributionStrategy; label: string; hint: string }[] = [
    { value: 'EVEN', label: 'Chia đều', hint: 'Ví dụ: 23 video / 4 bài → [6, 6, 6, 5]' },
    { value: 'PREFIX', label: 'Theo tiền tố tên file', hint: '"01_intro" → bài 1, "02_drill" → bài 2' },
    { value: 'SINGLE_LESSON', label: 'Tất cả vào 1 bài', hint: 'Tất cả video vào bài đầu của phạm vi' },
  ];

  readonly lessonsWithVideoCount = computed(() => {
    const items = this.svc.items();
    const ids = new Set(items.map((i) => i.lessonId));
    return ids.size;
  });

  protected readonly headerTitle = computed(() => {
    switch (this.svc.mode()) {
      case 'PREVIEW':
        return 'Xem trước phân bổ video';
      case 'UPLOADING':
        return 'Đang upload video';
      case 'COMPLETE':
        return 'Hoàn thành';
      default:
        return 'Upload nhiều video';
    }
  });

  protected readonly headerSubtitle = computed(() => {
    switch (this.svc.mode()) {
      case 'PREVIEW':
        return 'Kéo thả để xếp lại, click tên để sửa, sau đó bấm "Bắt đầu upload"';
      case 'UPLOADING':
        return 'Có thể đóng tab — upload vẫn chạy nền';
      case 'COMPLETE':
        return 'Tất cả video đã được xử lý';
      default:
        return 'Chọn nhiều video cùng lúc, hệ thống sẽ tự phân bổ vào các bài';
    }
  });

  constructor() {
    // Auto-reset PICK state when modal closes after COMPLETE
    effect(() => {
      if (!this.isOpen() && this.svc.mode() === 'COMPLETE') {
        this.svc.reset();
      }
    });
  }

  protected scopeHint(scope: BatchScope): string {
    const lessons = this.computeLessonsForScope(scope);
    return `(${lessons.length} bài)`;
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
      // Service state survives close → background mode
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
    input.value = ''; // allow same file re-pick
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

  protected onChangeStrategy(): void {
    const next: DistributionStrategy =
      this.selectedStrategy() === 'EVEN' ? 'PREFIX' : this.selectedStrategy() === 'PREFIX' ? 'SINGLE_LESSON' : 'EVEN';
    this.selectedStrategy.set(next);
    this.svc.redistribute(next);
  }

  protected async onNewLessonRequested(): Promise<void> {
    const chapterId = this.currentChapterId();
    if (!chapterId) return;
    const title = window.prompt('Tiêu đề bài mới:', 'Bài mới');
    if (!title?.trim()) return;
    await this.svc.createNewLesson(chapterId, title.trim());
  }

  private handleFilesPicked(files: File[]): void {
    if (files.length === 0) return;
    const scope = this.selectedScope();
    const lessons = this.computeLessonsForScope(scope);
    if (lessons.length === 0) {
      // No lessons → cannot distribute. Abort with hint.
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
