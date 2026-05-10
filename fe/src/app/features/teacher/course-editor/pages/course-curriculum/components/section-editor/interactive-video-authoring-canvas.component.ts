import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type {
  InteractiveVideoInteraction,
  InteractiveVideoInteractionType,
  InteractiveVideoPosition,
} from '../../../../../../../api/types/interactive-video.types';

export interface InteractiveVideoCanvasPlacement {
  type: InteractiveVideoInteractionType;
  atSeconds: number;
  position: InteractiveVideoPosition;
}

export interface InteractiveVideoCanvasMove {
  interactionId: string;
  atSeconds: number;
  position: InteractiveVideoPosition;
}

interface CanvasTimePreview {
  atSeconds: number;
  xPercent: number;
  yPercent: number;
}

@Component({
  selector: 'app-interactive-video-authoring-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <section class="rounded-2xl border border-slate-200 bg-slate-950 p-3 text-white shadow-sm">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h5 class="text-sm font-semibold">Canvas tương tác</h5>
          <p class="mt-0.5 text-xs text-slate-300">
            Tua video hoặc kéo chip trên khung hình; thời gian sẽ hiện ngay trên chip khi kéo.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          @for (type of interactionTypes; track type) {
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
              [class.border-sky-300]="placementType() === type"
              [class.bg-sky-400]="placementType() === type"
              [class.text-slate-950]="placementType() === type"
              [class.border-white/15]="placementType() !== type"
              [class.bg-white/10]="placementType() !== type"
              [class.text-white]="placementType() !== type"
              (click)="startPlacement(type)">
              <span class="flex h-4 w-4 items-center justify-center rounded bg-white/15 text-[10px]">
                {{ getTypeInitial(type) }}
              </span>
              {{ getTypeLabel(type) }}
            </button>
          }
        </div>
      </div>

      <div
        #canvas
        class="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-900"
        data-testid="interactive-video-authoring-canvas">
        @if (videoUrl()) {
          <video
            #videoElement
            class="h-full w-full object-contain"
            [src]="videoUrl()"
            [poster]="posterUrl() || null"
            controls
            preload="metadata">
          </video>
        } @else {
          <div class="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(14,165,233,0.28),transparent_34%),linear-gradient(135deg,#0f172a,#020617)] px-6 text-center">
            <span class="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-200/30 bg-sky-200/10 text-sm font-black text-sky-100">
              IV
            </span>
            <p class="mt-3 text-sm font-semibold">Chưa có preview video trực tiếp</p>
            <p class="mt-1 max-w-sm text-xs leading-relaxed text-slate-300">
              Bấm hoặc kéo trên canvas để đặt vị trí; thời điểm được suy ra theo vị trí ngang.
            </p>
          </div>
        }

        @if (placementType(); as pendingType) {
          <button
            type="button"
            class="absolute inset-0 z-10 cursor-crosshair bg-sky-950/10 text-xs font-semibold text-sky-50 backdrop-blur-[1px]"
            data-testid="interactive-video-canvas-placement-layer"
            (click)="placeInteraction($event)"
            (pointermove)="showPlacementPreview($event)"
            (pointerleave)="hidePlacementPreview()">
            <span class="absolute inset-x-0 bottom-4 text-center">
              Bấm lên video để đặt {{ getTypeLabel(pendingType).toLowerCase() }}
            </span>
          </button>
        }

        @if (placementPreview(); as preview) {
          <div
            class="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-full bg-slate-950/95 px-2.5 py-1 text-xs font-bold text-white shadow-lg ring-1 ring-white/20"
            [style.left.%]="preview.xPercent"
            [style.top.%]="previewTooltipTop(preview)">
            {{ formatTime(preview.atSeconds) }}
          </div>
        }

        @for (interaction of sortedTimeline(); track interaction.id) {
          <button
            type="button"
            class="absolute z-20 flex min-h-8 -translate-x-1/2 -translate-y-1/2 touch-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
            [class.border-sky-200]="selectedInteractionId() === interaction.id"
            [class.bg-sky-300]="selectedInteractionId() === interaction.id"
            [class.text-slate-950]="selectedInteractionId() === interaction.id"
            [class.border-white/20]="selectedInteractionId() !== interaction.id"
            [class.bg-slate-950]="selectedInteractionId() !== interaction.id"
            [class.text-white]="selectedInteractionId() !== interaction.id"
            [style.left.%]="positionX(interaction)"
            [style.top.%]="positionY(interaction)"
            [attr.aria-label]="'Kéo ' + getTypeLabel(interaction.type) + ' tại ' + formatTime(interaction.atSeconds)"
            [attr.aria-current]="selectedInteractionId() === interaction.id ? 'true' : null"
            [attr.data-testid]="'interactive-video-canvas-handle-' + interaction.id"
            (click)="selectInteraction($event, interaction.id)"
            (pointerdown)="onHandlePointerDown($event, interaction)"
            (pointermove)="onHandlePointerMove($event)"
            (pointerup)="onHandlePointerUp($event)"
            (pointercancel)="onHandlePointerCancel()">
            <span class="flex h-4 w-4 items-center justify-center rounded bg-white/15 text-[10px]">
              {{ getTypeInitial(interaction.type) }}
            </span>
            <span class="max-w-28 truncate">{{ interaction.title || getTypeLabel(interaction.type) }}</span>
            <span class="rounded-full bg-white/15 px-1.5 py-0.5 font-mono text-[10px]">
              {{ formatTime(interaction.atSeconds) }}
            </span>
          </button>
        }

        @if (dragPreview(); as preview) {
          <div
            class="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-full bg-slate-950/95 px-3 py-1.5 text-sm font-extrabold text-white shadow-xl ring-1 ring-white/25"
            [style.left.%]="preview.xPercent"
            [style.top.%]="previewTooltipTop(preview)">
            {{ formatTime(preview.atSeconds) }}
          </div>
        }
      </div>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <span>
          @if (placementType()) {
            Đang chờ đặt: {{ getTypeLabel(placementType()!) }}. Di chuột trên video để xem mốc thời gian.
          } @else {
            Kéo chip để đổi thời điểm và vị trí. Click chip chỉ chọn để chỉnh nhanh, không tự cuộn trang.
          }
        </span>
        <span class="font-mono text-slate-400">{{ timeline().length }} interaction</span>
      </div>
    </section>
  `,
})
export class InteractiveVideoAuthoringCanvasComponent {
  readonly timeline = input<InteractiveVideoInteraction[]>([]);
  readonly durationSeconds = input<number | null>(null);
  readonly videoUrl = input<string | null>('');
  readonly posterUrl = input<string | null>(null);
  readonly selectedInteractionId = input<string | null>(null);
  readonly defaultTimeSeconds = input(0);

  readonly interactionPlaced = output<InteractiveVideoCanvasPlacement>();
  readonly interactionMoved = output<InteractiveVideoCanvasMove>();
  readonly interactionSelected = output<string>();

  readonly canvas = viewChild<ElementRef<HTMLElement>>('canvas');
  readonly videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoElement');
  readonly placementType = signal<InteractiveVideoInteractionType | null>(null);
  readonly placementPreview = signal<CanvasTimePreview | null>(null);
  readonly dragPreview = signal<CanvasTimePreview | null>(null);
  private readonly draggingInteractionId = signal<string | null>(null);
  /**
   * Last pointer-derived position while a drag is in progress. Captured on
   * every pointermove and committed once on pointerup so the move emits as a
   * single state change instead of one per pointer step.
   */
  private pendingMove: { atSeconds: number; position: InteractiveVideoPosition } | null = null;

  readonly interactionTypes: InteractiveVideoInteractionType[] = [
    'checkpoint',
    'single_choice',
    'branch',
    'fill_blank',
    'drag_drop',
  ];
  readonly sortedTimeline = computed(() =>
    [...this.timeline()].sort((a, b) => a.atSeconds - b.atSeconds),
  );
  readonly timelineMaxSeconds = computed(() => {
    const duration = this.durationSeconds();
    if (duration != null && Number.isFinite(duration) && duration > 0) {
      return Math.max(1, Math.round(duration) - 1);
    }

    const timelineMax = Math.max(0, ...this.timeline().map(item => this.toNonNegativeInteger(item.atSeconds)));
    return Math.max(30, timelineMax, this.toNonNegativeInteger(this.defaultTimeSeconds()));
  });

  startPlacement(type: InteractiveVideoInteractionType): void {
    this.placementType.set(this.placementType() === type ? null : type);
    this.placementPreview.set(null);
  }

  placeInteraction(event: PointerEvent | MouseEvent): void {
    const type = this.placementType();
    if (!type) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const placement = this.buildPreviewFromPointer(event);
    this.interactionPlaced.emit({
      type,
      atSeconds: placement.atSeconds,
      position: this.getPositionFromPointer(event),
    });
    this.placementType.set(null);
    this.placementPreview.set(null);
  }

  showPlacementPreview(event: PointerEvent): void {
    this.placementPreview.set(this.buildPreviewFromPointer(event));
  }

  hidePlacementPreview(): void {
    this.placementPreview.set(null);
  }

  selectInteraction(event: Event, interactionId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.interactionSelected.emit(interactionId);
  }

  onHandlePointerDown(event: PointerEvent, interaction: InteractiveVideoInteraction): void {
    if (event.button !== 0) {
      return;
    }
    if (this.draggingInteractionId()) {
      // Refuse a second pointerdown mid-drag so a stray touch can't hijack the
      // drag state for a different interaction.
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.draggingInteractionId.set(interaction.id);
    this.interactionSelected.emit(interaction.id);
    this.dragPreview.set({
      atSeconds: interaction.atSeconds,
      xPercent: this.positionX(interaction),
      yPercent: this.positionY(interaction),
    });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onHandlePointerMove(event: PointerEvent): void {
    const interactionId = this.draggingInteractionId();
    if (!interactionId) {
      return;
    }
    event.preventDefault();
    // Only update the local preview during drag — emitting interactionMoved on
    // every pointer step caused hundreds of state writes per drag, which raced
    // with the debounced autosave and broke per-change undo. Final position is
    // committed once on pointerup using the last seen pointer position.
    this.dragPreview.set(this.buildPreviewFromPointer(event));
    this.pendingMove = {
      atSeconds: this.getTimeSecondsFromPointer(event),
      position: this.getPositionFromPointer(event),
    };
  }

  onHandlePointerUp(event: PointerEvent): void {
    const interactionId = this.draggingInteractionId();
    const pendingMove = this.pendingMove;
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    if (interactionId && pendingMove) {
      // Emit the final position once, so the move is a single undoable change.
      this.interactionMoved.emit({ interactionId, ...pendingMove });
    }
    this.draggingInteractionId.set(null);
    this.dragPreview.set(null);
    this.pendingMove = null;
  }

  onHandlePointerCancel(): void {
    // Cancel: discard the in-progress drag without emitting; original position
    // is preserved because we never wrote intermediate state to the service.
    this.draggingInteractionId.set(null);
    this.dragPreview.set(null);
    this.pendingMove = null;
  }

  positionX(interaction: InteractiveVideoInteraction): number {
    return this.clampPercent(interaction.position?.xPercent ?? this.timePercent(interaction.atSeconds));
  }

  positionY(interaction: InteractiveVideoInteraction): number {
    return this.clampPercent(interaction.position?.yPercent ?? 88);
  }

  timePercent(seconds: number): number {
    const max = this.timelineMaxSeconds();
    return max <= 0 ? 0 : Math.min(100, Math.max(0, (this.clampTime(seconds) / max) * 100));
  }

  previewTooltipTop(preview: CanvasTimePreview): number {
    return Math.max(12, preview.yPercent - 8);
  }

  getTypeLabel(type: InteractiveVideoInteractionType): string {
    switch (type) {
      case 'single_choice':
        return 'Câu hỏi';
      case 'branch':
        return 'Rẽ nhánh';
      case 'hotspot':
        return 'Hotspot';
      case 'fill_blank':
        return 'Điền từ';
      case 'drag_drop':
        return 'Kéo thả';
      default:
        return 'Điểm dừng';
    }
  }

  getTypeInitial(type: InteractiveVideoInteractionType): string {
    switch (type) {
      case 'single_choice':
        return 'Q';
      case 'branch':
        return 'B';
      case 'hotspot':
        return 'H';
      case 'fill_blank':
        return 'F';
      case 'drag_drop':
        return 'D';
      default:
        return 'P';
    }
  }

  formatTime(seconds: number): string {
    const safeSeconds = this.toNonNegativeInteger(seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const rest = safeSeconds % 60;
    return `${minutes}:${rest.toString().padStart(2, '0')}`;
  }

  private buildPreviewFromPointer(event: Pick<MouseEvent, 'clientX' | 'clientY'>): CanvasTimePreview {
    const position = this.getPositionFromPointer(event);
    return {
      atSeconds: this.getTimeSecondsFromPointer(event),
      xPercent: position.xPercent,
      yPercent: position.yPercent,
    };
  }

  private getTimeSecondsFromPointer(event: Pick<MouseEvent, 'clientX'>): number {
    const content = this.getVideoContentRect();
    if (!content || content.width <= 0) {
      return this.getVideoCurrentTime();
    }

    const ratio = Math.min(1, Math.max(0, (event.clientX - content.left) / content.width));
    return this.clampTime(Math.round(ratio * this.timelineMaxSeconds()));
  }

  private getVideoCurrentTime(): number {
    const currentTime = this.videoElement()?.nativeElement.currentTime;
    return Number.isFinite(currentTime) ? this.clampTime(currentTime) : this.clampTime(this.defaultTimeSeconds());
  }

  private getPositionFromPointer(event: Pick<MouseEvent, 'clientX' | 'clientY'>): InteractiveVideoPosition {
    const content = this.getVideoContentRect();
    if (!content || content.width <= 0 || content.height <= 0) {
      return { xPercent: 50, yPercent: 88 };
    }

    return {
      xPercent: this.clampPercent(((event.clientX - content.left) / content.width) * 100),
      yPercent: this.clampPercent(((event.clientY - content.top) / content.height) * 100),
    };
  }

  /**
   * Compute the rect of the actual rendered video frame inside the canvas.
   *
   * The `<video>` element is `object-contain`, so when the video and canvas
   * aspect ratios differ, the video is centred with letterbox or pillarbox
   * bands. Mapping pointer coordinates against the raw canvas rect would
   * place interactions on those bands, off the actual frame. This helper
   * returns the inner content rect; pointer coordinates outside it are
   * clamped to its edges by the consumer.
   *
   * Falls back to the canvas rect when video metadata is not yet loaded.
   */
  private getVideoContentRect():
    | { left: number; top: number; width: number; height: number }
    | null {
    const canvas = this.canvas()?.nativeElement.getBoundingClientRect();
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
      return null;
    }
    const video = this.videoElement()?.nativeElement;
    const naturalWidth = video?.videoWidth ?? 0;
    const naturalHeight = video?.videoHeight ?? 0;
    if (!naturalWidth || !naturalHeight) {
      return { left: canvas.left, top: canvas.top, width: canvas.width, height: canvas.height };
    }
    const videoAspect = naturalWidth / naturalHeight;
    const canvasAspect = canvas.width / canvas.height;
    if (videoAspect > canvasAspect) {
      // Letterbox: bars top/bottom, content fills full width.
      const height = canvas.width / videoAspect;
      return {
        left: canvas.left,
        top: canvas.top + (canvas.height - height) / 2,
        width: canvas.width,
        height,
      };
    }
    // Pillarbox (or exact fit): bars left/right, content fills full height.
    const width = canvas.height * videoAspect;
    return {
      left: canvas.left + (canvas.width - width) / 2,
      top: canvas.top,
      width,
      height: canvas.height,
    };
  }

  private clampPercent(value: number): number {
    return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 50;
  }

  private clampTime(value: unknown): number {
    return Math.min(this.timelineMaxSeconds(), this.toNonNegativeInteger(value));
  }

  private toNonNegativeInteger(value: unknown): number {
    const raw = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
  }
}
