import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { BatchTargetLesson, BatchVideoItem } from './batch-video-upload.types';

/**
 * Vertical tree: lessons làm group, videos là draggable item bên trong.
 * Cross-lesson drag-drop, inline edit title, remove, retry.
 *
 * Dùng cho cả PREVIEW (drag-drop) và UPLOADING (status real-time, drag disabled).
 *
 * Design tokens: tuân thủ docs/reference/PAGE_UX_STANDARD.md
 *  - Primary #0056D2, semantic emerald/amber/red qua Tailwind
 *  - Lucide icons (NO emoji)
 *  - Cards: rounded-lg border-gray-200
 *  - Status pills: light bg + colored text + dot indicator
 */
@Component({
  selector: 'app-batch-upload-preview-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDropList, CdkDrag, CdkDragHandle, LucideAngularModule],
  template: `
    <div class="space-y-3">
      @for (lesson of lessons(); track lesson.id) {
        @let lessonItems = itemsByLessonId()[lesson.id] ?? [];
        <div class="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div class="px-4 py-2.5 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
            <div class="flex items-center gap-2 min-w-0">
              <lucide-icon name="book-open" [size]="14" class="text-slate-400 flex-shrink-0"></lucide-icon>
              <span class="text-sm font-medium text-gray-900 truncate">{{ lesson.title }}</span>
              @if (lesson.existingSectionCount > 0) {
                <span class="text-xs text-gray-500 flex-shrink-0">— đã có {{ lesson.existingSectionCount }} mục, sẽ thêm video mới vào sau cùng</span>
              }
            </div>
            <span class="text-xs font-medium text-gray-600 flex-shrink-0 ml-3">
              {{ lessonItems.length }} video
            </span>
          </div>

          <div
            cdkDropList
            [id]="'drop-' + lesson.id"
            [cdkDropListData]="lessonItems"
            [cdkDropListConnectedTo]="allDropListIds()"
            (cdkDropListDropped)="onDrop($event)"
            class="min-h-[56px]"
          >
            @for (item of lessonItems; track item.id; let i = $index) {
              <div
                cdkDrag
                [cdkDragData]="item.id"
                [cdkDragDisabled]="!isDraggable(item)"
                class="px-3 py-2.5 flex items-center gap-3 border-b border-gray-50 last:border-b-0 hover:bg-slate-50/50 transition-colors"
                [class.opacity-60]="item.status === 'READY'"
              >
                <button
                  type="button"
                  cdkDragHandle
                  class="text-slate-300 hover:text-slate-500 cursor-move flex-shrink-0 disabled:cursor-default disabled:hover:text-slate-300"
                  [disabled]="!isDraggable(item)"
                  aria-label="Kéo để di chuyển"
                >
                  <lucide-icon name="grip-vertical" [size]="14"></lucide-icon>
                </button>

                <div class="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" [class]="iconWrapperClass(item)">
                  <lucide-icon [name]="statusIconName(item)" [size]="16" [class]="iconClass(item)"></lucide-icon>
                </div>

                <div class="flex-1 min-w-0">
                  @if (editingId() === item.id) {
                    <input
                      type="text"
                      [value]="item.sectionTitle"
                      (blur)="commitTitle(item.id, $any($event.target).value)"
                      (keydown.enter)="commitTitle(item.id, $any($event.target).value)"
                      (keydown.escape)="editingId.set(null)"
                      class="w-full text-sm border-b border-[#0056D2] focus:outline-none px-1 py-0.5 bg-transparent"
                    />
                  } @else {
                    <button
                      type="button"
                      class="text-sm font-medium text-gray-900 truncate w-full text-left enabled:hover:text-[#0056D2] disabled:cursor-default"
                      (click)="onTitleClick(item)"
                      [disabled]="item.status !== 'PENDING'"
                    >
                      {{ item.sectionTitle }}
                    </button>
                  }
                  <div class="text-xs text-gray-500 flex items-center gap-2 mt-0.5 truncate">
                    <span class="truncate">{{ item.file.name }}</span>
                    <span class="text-gray-300">·</span>
                    <span class="flex-shrink-0 tabular-nums">{{ formatBytes(item.file.size) }}</span>
                    @if (queuePositionFor(item.id); as pos) {
                      <span class="text-gray-300">·</span>
                      <span class="flex-shrink-0">Vị trí #{{ pos }}</span>
                    }
                  </div>
                  @if (item.status === 'UPLOADING') {
                    <div class="mt-1.5 flex items-center gap-2">
                      <div class="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          class="h-full bg-[#0056D2] transition-all duration-200 rounded-full"
                          [style.width.%]="item.uploadProgress"
                        ></div>
                      </div>
                      <span class="text-[11px] font-medium text-[#0056D2] tabular-nums w-9 text-right">{{ item.uploadProgress }}%</span>
                    </div>
                  }
                  @if (item.status === 'PROCESSING' || item.status === 'ASSET_CREATING' || item.status === 'SECTION_CREATING') {
                    <div class="mt-1.5 h-1 bg-amber-100 rounded-full overflow-hidden relative">
                      <div class="absolute inset-0 batch-stripe-animate"></div>
                    </div>
                  }
                  @if (item.status === 'FAILED' && item.errorMessage) {
                    <div class="mt-1 text-xs text-red-600 truncate" [title]="item.errorMessage">
                      {{ item.errorMessage }}
                    </div>
                  }
                </div>

                <div class="flex items-center gap-1 flex-shrink-0">
                  <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" [class]="statusPillClass(item)">
                    {{ statusLabel(item) }}
                  </span>
                  @if (item.status === 'FAILED') {
                    <button
                      type="button"
                      (click)="retryRequested.emit(item.id)"
                      class="text-gray-500 hover:text-[#0056D2] hover:bg-[#0056D2]/10 rounded p-1"
                      aria-label="Thử lại"
                      title="Thử lại"
                    >
                      <lucide-icon name="rotate-cw" [size]="14"></lucide-icon>
                    </button>
                  }
                  @if (item.status === 'PENDING' || item.status === 'FAILED') {
                    <button
                      type="button"
                      (click)="removeRequested.emit(item.id)"
                      class="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded p-1"
                      aria-label="Xoá khỏi danh sách"
                      title="Xoá khỏi danh sách"
                    >
                      <lucide-icon name="x" [size]="14"></lucide-icon>
                    </button>
                  }
                </div>
              </div>
            } @empty {
              <div class="px-3 py-5 text-xs text-center text-gray-400 italic">
                Kéo thả video vào đây
              </div>
            }
          </div>
        </div>
      }

      @if (showCreateLessonButton()) {
        <button
          type="button"
          (click)="newLessonRequested.emit()"
          class="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-slate-50 hover:border-[#0056D2] hover:text-[#0056D2] transition-colors flex items-center justify-center gap-1.5"
        >
          <lucide-icon name="plus" [size]="14"></lucide-icon>
          Tạo bài mới
        </button>
      }
    </div>
  `,
  styles: [`
    @keyframes batch-stripe {
      0% { background-position: 0 0; }
      100% { background-position: 32px 0; }
    }
    .batch-stripe-animate {
      background-image: linear-gradient(
        45deg,
        rgba(217, 119, 6, 0.4) 25%,
        transparent 25%,
        transparent 50%,
        rgba(217, 119, 6, 0.4) 50%,
        rgba(217, 119, 6, 0.4) 75%,
        transparent 75%,
        transparent
      );
      background-size: 32px 32px;
      animation: batch-stripe 1s linear infinite;
    }
  `],
})
export class BatchUploadPreviewTreeComponent {
  readonly lessons = input.required<BatchTargetLesson[]>();
  readonly items = input.required<BatchVideoItem[]>();
  readonly showCreateLessonButton = input(true);

  readonly itemMoved = output<{ itemId: string; targetLessonId: string; targetIndex: number }>();
  readonly removeRequested = output<string>();
  readonly retryRequested = output<string>();
  readonly titleChanged = output<{ itemId: string; title: string }>();
  readonly newLessonRequested = output<void>();

  readonly editingId = signal<string | null>(null);

  readonly itemsByLessonId = computed<Record<string, BatchVideoItem[]>>(() => {
    const map: Record<string, BatchVideoItem[]> = {};
    for (const lesson of this.lessons()) {
      map[lesson.id] = [];
    }
    for (const item of this.items()) {
      if (!map[item.lessonId]) map[item.lessonId] = [];
      map[item.lessonId].push(item);
    }
    return map;
  });

  readonly allDropListIds = computed(() => this.lessons().map((l) => 'drop-' + l.id));

  /** Queue position 1-based: 1 = upload tiếp theo, null nếu không trong queue PENDING. */
  private readonly pendingOrder = computed<Map<string, number>>(() => {
    const map = new Map<string, number>();
    let pos = 1;
    for (const item of this.items()) {
      if (item.status === 'PENDING') {
        map.set(item.id, pos++);
      }
    }
    return map;
  });

  queuePositionFor(itemId: string): number | null {
    return this.pendingOrder().get(itemId) ?? null;
  }

  isDraggable(item: BatchVideoItem): boolean {
    return item.status === 'PENDING';
  }

  onTitleClick(item: BatchVideoItem): void {
    if (item.status !== 'PENDING') return;
    this.editingId.set(item.id);
  }

  commitTitle(itemId: string, value: string): void {
    const trimmed = (value ?? '').trim();
    if (trimmed) {
      this.titleChanged.emit({ itemId, title: trimmed });
    }
    this.editingId.set(null);
  }

  onDrop(event: CdkDragDrop<BatchVideoItem[]>): void {
    const itemId = event.item.data as string;
    const targetLessonId = (event.container.id ?? '').replace(/^drop-/, '');
    if (!targetLessonId) return;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
    this.itemMoved.emit({ itemId, targetLessonId, targetIndex: event.currentIndex });
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  statusIconName(item: BatchVideoItem): string {
    switch (item.status) {
      case 'PENDING':
        return 'clock';
      case 'UPLOADING':
        return 'upload-cloud';
      case 'ASSET_CREATING':
      case 'SECTION_CREATING':
        return 'cog';
      case 'PROCESSING':
        return 'cog';
      case 'READY':
        return 'check-circle-2';
      case 'FAILED':
        return 'alert-circle';
    }
  }

  iconWrapperClass(item: BatchVideoItem): string {
    switch (item.status) {
      case 'READY':
        return 'bg-emerald-50';
      case 'FAILED':
        return 'bg-red-50';
      case 'PROCESSING':
      case 'ASSET_CREATING':
      case 'SECTION_CREATING':
        return 'bg-amber-50';
      case 'UPLOADING':
        return 'bg-[#0056D2]/10';
      default:
        return 'bg-slate-100';
    }
  }

  iconClass(item: BatchVideoItem): string {
    switch (item.status) {
      case 'READY':
        return 'text-emerald-600';
      case 'FAILED':
        return 'text-red-600';
      case 'PROCESSING':
      case 'ASSET_CREATING':
      case 'SECTION_CREATING':
        return 'text-amber-600 animate-spin';
      case 'UPLOADING':
        return 'text-[#0056D2]';
      default:
        return 'text-slate-500';
    }
  }

  statusLabel(item: BatchVideoItem): string {
    switch (item.status) {
      case 'PENDING':
        return 'Chờ';
      case 'UPLOADING':
        return 'Đang tải lên';
      case 'ASSET_CREATING':
        return 'Đăng ký';
      case 'SECTION_CREATING':
        return 'Tạo mục';
      case 'PROCESSING':
        return 'Đang xử lý';
      case 'READY':
        return 'Sẵn sàng';
      case 'FAILED':
        return 'Lỗi';
    }
  }

  statusPillClass(item: BatchVideoItem): string {
    switch (item.status) {
      case 'READY':
        return 'bg-emerald-50 text-emerald-700';
      case 'FAILED':
        return 'bg-red-50 text-red-700';
      case 'PROCESSING':
      case 'ASSET_CREATING':
      case 'SECTION_CREATING':
        return 'bg-amber-50 text-amber-700';
      case 'UPLOADING':
        return 'bg-[#0056D2]/10 text-[#0056D2]';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }
}
