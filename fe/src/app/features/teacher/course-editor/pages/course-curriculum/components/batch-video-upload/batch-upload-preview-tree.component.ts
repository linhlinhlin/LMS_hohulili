import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { BatchTargetLesson, BatchVideoItem } from './batch-video-upload.types';

/**
 * Vertical tree view: lessons làm group, videos là draggable item bên trong.
 * Hỗ trợ cross-lesson drag-drop + reorder + inline edit title + remove + retry.
 *
 * Dùng được cho cả Stage 2 (PREVIEW — user xếp lại) và Stage 3 (PROGRESS —
 * status hiển thị real-time, drag bị disable).
 */
@Component({
  selector: 'app-batch-upload-preview-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDropList, CdkDrag, CdkDragHandle],
  template: `
    <div class="space-y-3">
      @for (lesson of lessons(); track lesson.id) {
        @let lessonItems = itemsByLessonId()[lesson.id] ?? [];
        <div class="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div class="px-4 py-2 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
            <div class="text-sm font-medium text-gray-900 flex items-center gap-2">
              <span class="text-gray-400">📚</span>
              <span>{{ lesson.title }}</span>
              @if (lesson.existingSectionCount > 0) {
                <span class="text-xs text-gray-500">({{ lesson.existingSectionCount }} mục có sẵn)</span>
              }
            </div>
            <span class="text-xs font-medium text-gray-600">
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
            @for (item of lessonItems; track item.id) {
              <div
                cdkDrag
                [cdkDragData]="item.id"
                [cdkDragDisabled]="!isDraggable(item)"
                class="px-3 py-2.5 flex items-center gap-3 border-b border-gray-50 last:border-b-0 hover:bg-slate-50/50"
                [class.opacity-60]="item.status === 'READY'"
              >
                @if (isDraggable(item)) {
                  <span cdkDragHandle class="cursor-move text-gray-300 select-none px-1" aria-label="Kéo để di chuyển">⋮⋮</span>
                } @else {
                  <span class="text-gray-200 px-1 select-none">⋮⋮</span>
                }

                <span class="text-lg flex-shrink-0">{{ statusIcon(item) }}</span>

                <div class="flex-1 min-w-0">
                  @if (editingId() === item.id) {
                    <input
                      type="text"
                      [value]="item.sectionTitle"
                      (blur)="commitTitle(item.id, $any($event.target).value)"
                      (keydown.enter)="commitTitle(item.id, $any($event.target).value)"
                      (keydown.escape)="editingId.set(null)"
                      class="w-full text-sm border-b border-[#0056D2] focus:outline-none px-1 py-0.5"
                    />
                  } @else {
                    <button
                      type="button"
                      class="text-sm font-medium text-gray-900 truncate w-full text-left hover:text-[#0056D2] hover:underline"
                      (click)="onTitleClick(item)"
                      [disabled]="item.status !== 'PENDING'"
                    >
                      {{ item.sectionTitle }}
                    </button>
                  }
                  <div class="text-xs text-gray-500 flex items-center gap-2 mt-0.5 truncate">
                    <span class="truncate">{{ item.file.name }}</span>
                    <span class="text-gray-300">·</span>
                    <span class="flex-shrink-0">{{ formatBytes(item.file.size) }}</span>
                    <span class="text-gray-300">·</span>
                    <span class="flex-shrink-0" [class]="statusColor(item)">{{ statusLabel(item) }}</span>
                  </div>
                  @if (item.status === 'UPLOADING') {
                    <div class="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-[#0056D2] transition-all duration-200"
                        [style.width.%]="item.uploadProgress"
                      ></div>
                    </div>
                  }
                  @if (item.status === 'FAILED' && item.errorMessage) {
                    <div class="mt-1 text-xs text-red-600 truncate" [title]="item.errorMessage">
                      {{ item.errorMessage }}
                    </div>
                  }
                </div>

                <div class="flex items-center gap-1 flex-shrink-0">
                  @if (item.status === 'FAILED') {
                    <button
                      type="button"
                      (click)="retryRequested.emit(item.id)"
                      class="text-xs text-[#0056D2] hover:bg-[#0056D2]/10 rounded px-2 py-1"
                    >
                      Thử lại
                    </button>
                  }
                  @if (item.status === 'PENDING' || item.status === 'FAILED') {
                    <button
                      type="button"
                      (click)="removeRequested.emit(item.id)"
                      class="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded p-1 text-sm"
                      aria-label="Xoá khỏi danh sách"
                    >
                      ✕
                    </button>
                  }
                </div>
              </div>
            } @empty {
              <div class="px-3 py-6 text-xs text-center text-gray-400 italic">
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
          class="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-slate-50 hover:border-[#0056D2] hover:text-[#0056D2] transition-colors"
        >
          + Tạo bài mới
        </button>
      }
    </div>
  `,
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
      // Reorder within same lesson — just emit final position
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this.itemMoved.emit({ itemId, targetLessonId, targetIndex: event.currentIndex });
    } else {
      // Cross-lesson move
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      this.itemMoved.emit({ itemId, targetLessonId, targetIndex: event.currentIndex });
    }
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  statusIcon(item: BatchVideoItem): string {
    switch (item.status) {
      case 'PENDING':
        return '🎬';
      case 'UPLOADING':
        return '⬆️';
      case 'ASSET_CREATING':
      case 'SECTION_CREATING':
        return '⏳';
      case 'PROCESSING':
        return '🔄';
      case 'READY':
        return '✅';
      case 'FAILED':
        return '❌';
    }
  }

  statusLabel(item: BatchVideoItem): string {
    switch (item.status) {
      case 'PENDING':
        return 'Chờ';
      case 'UPLOADING':
        return `Đang upload ${item.uploadProgress}%`;
      case 'ASSET_CREATING':
        return 'Đang đăng ký';
      case 'SECTION_CREATING':
        return 'Đang tạo mục';
      case 'PROCESSING':
        return 'Đang xử lý';
      case 'READY':
        return 'Sẵn sàng';
      case 'FAILED':
        return 'Lỗi';
    }
  }

  statusColor(item: BatchVideoItem): string {
    switch (item.status) {
      case 'READY':
        return 'text-emerald-600';
      case 'FAILED':
        return 'text-red-600';
      case 'PROCESSING':
      case 'UPLOADING':
        return 'text-[#0056D2]';
      default:
        return 'text-gray-500';
    }
  }
}
