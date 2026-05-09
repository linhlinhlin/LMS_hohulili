import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import type {
  InteractiveVideoDragDropDraggable,
  InteractiveVideoDragDropMedia,
  InteractiveVideoDragDropZone,
  InteractiveVideoInteraction,
} from '../../../api/types/interactive-video.types';
import { ContentIdentityService } from '../../../core/services/content-identity.service';
import { evaluateInteractiveVideoDragDrop } from '../../../core/utils/interactive-video-runtime';

interface DragDropAnswerState {
  interactionId: string;
  placements: Record<string, string | null>;
}

interface DragDropResultState {
  interactionId: string;
  checked: boolean;
  solutionVisible: boolean;
}

@Component({
  selector: 'app-interactive-video-drag-drop',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  styles: [`
    :host {
      display: block;
    }

    .drag-drop-stage {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    .drag-drop-zone {
      touch-action: manipulation;
      transition:
        border-color 140ms ease,
        background-color 140ms ease,
        box-shadow 140ms ease,
        opacity 140ms ease;
    }

    .drag-drop-item {
      touch-action: manipulation;
      user-select: none;
      transition:
        border-color 140ms ease,
        background-color 140ms ease,
        box-shadow 140ms ease,
        opacity 140ms ease,
        transform 140ms ease;
    }

    .drag-drop-item:active:not(:disabled) {
      transform: scale(0.98);
    }
  `],
  template: `
    <div class="mt-3 grid gap-3" data-testid="interactive-video-drag-drop">
      <section class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        @if (dragDrop()?.instruction) {
          <p class="mb-3 text-sm font-semibold leading-relaxed text-slate-700">
            {{ dragDrop()?.instruction }}
          </p>
        }

        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div class="min-w-0">
            <div
              class="drag-drop-stage relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-inner"
              data-testid="interactive-video-drag-drop-canvas"
              (dragover)="onStageDragOver($event)">
              @if (backgroundUrl(); as bgUrl) {
                <img [src]="bgUrl"
                  width="1280"
                  height="720"
                  [alt]="dragDrop()?.backgroundImage?.alt || 'Ảnh nền kéo thả'"
                  class="h-full w-full object-cover" />
              } @else {
                <div class="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(14,165,233,0.24),transparent_34%),linear-gradient(135deg,#0f172a,#020617)] px-6 text-center">
                  <p class="max-w-xs text-sm font-semibold leading-relaxed text-slate-200">
                    Giáo viên chưa thêm ảnh nền cho bài kéo thả.
                  </p>
                </div>
              }

              <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/18 via-transparent to-transparent"></div>

              @for (zone of dropZones(); track zone.id) {
                <button
                  type="button"
                  [class]="dropZoneClass(zone)"
                  [style.left.%]="zone.xPercent"
                  [style.top.%]="zone.yPercent"
                  [style.width.%]="zone.widthPercent"
                  [style.height.%]="zone.heightPercent"
                  [disabled]="isChecked()"
                  [attr.aria-label]="'Thả vào vùng ' + zone.label"
                  [attr.data-testid]="'interactive-video-drag-drop-zone-' + zone.id"
                  (dragenter)="onDropZoneDragEnter($event, zone.id)"
                  (dragover)="onDropZoneDragOver($event, zone.id)"
                  (dragleave)="onDropZoneDragLeave(zone.id)"
                  (drop)="onDrop($event, zone.id)"
                  (click)="placeSelectedInZone(zone.id)">
                  <span [class]="dropZoneLabelClass(zone)">
                    {{ zone.label }}
                  </span>

                  @if (placedDraggablesForZone(zone.id).length > 0) {
                    <span class="flex max-h-full max-w-full flex-wrap items-center justify-center gap-1.5 overflow-hidden">
                      @for (draggable of placedDraggablesForZone(zone.id); track draggable.id) {
                        <span [class]="placedTileClass(draggable)">
                          <span class="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/70 bg-white">
                            @if (mediaUrl(draggable.image); as imageUrl) {
                              <img [src]="imageUrl"
                                width="72"
                                height="56"
                                [alt]="draggable.image?.alt || draggable.label"
                                class="max-h-11 max-w-full object-contain" />
                            } @else {
                              <span class="px-1 text-[10px] font-black uppercase text-slate-400">Text</span>
                            }
                          </span>
                          <span class="max-w-[7rem] truncate text-xs font-extrabold">
                            {{ draggable.label }}
                          </span>
                          @if (isChecked()) {
                            <span [class]="placedStatusClass(draggable)" aria-hidden="true">
                              {{ isDraggableCorrect(draggable) ? '✓' : '×' }}
                            </span>
                          }
                        </span>
                      }
                    </span>
                  } @else {
                    <span class="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm">
                      Thả vào đây
                    </span>
                  }

                  @if (isSolutionVisible()) {
                    <span class="absolute -bottom-7 left-1/2 max-w-[13rem] -translate-x-1/2 truncate rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shadow-sm ring-1 ring-emerald-200">
                      Đúng: {{ solutionLabelsForZone(zone.id) || 'Chưa gắn vật dụng' }}
                    </span>
                  }
                </button>
              }
            </div>

            <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Kéo đáp án đúng vào vùng ảnh; giữ đáp án sai ở ngoài.
              </span>
              <span class="font-semibold tabular-nums text-slate-700">
                {{ placedCount() }}/{{ draggables().length }} đã chọn
              </span>
            </div>
          </div>

          <aside class="flex max-h-[min(31rem,calc(100vh-12rem))] min-h-0 flex-col rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Vật dụng</p>
                <p class="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                  Bấm hoặc kéo những ảnh bạn nghĩ là đúng vào vùng trên hình.
                </p>
              </div>
              @if (selectedDraggable(); as selected) {
                <span class="shrink-0 rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700 ring-1 ring-cyan-100">
                  Đang chọn
                </span>
              }
            </div>

            <div class="mt-3 grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
              @for (draggable of draggables(); track draggable.id) {
                <button
                  type="button"
                  draggable="true"
                  [class]="draggableCardClass(draggable)"
                  [disabled]="isChecked()"
                  [attr.aria-pressed]="selectedDraggableId() === draggable.id"
                  [attr.data-state]="draggableState(draggable)"
                  [attr.data-testid]="'interactive-video-drag-drop-draggable-' + draggable.id"
                  (click)="selectDraggable(draggable.id)"
                  (dragstart)="onDragStart($event, draggable.id)"
                  (dragend)="onDragEnd()">
                  <span class="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    @if (mediaUrl(draggable.image); as imageUrl) {
                      <img [src]="imageUrl"
                        width="96"
                        height="72"
                        [alt]="draggable.image?.alt || draggable.label"
                        class="max-h-14 max-w-full object-contain" />
                    } @else {
                      <span class="px-1 text-[10px] font-bold uppercase text-slate-400">Text</span>
                    }
                  </span>
                  <span class="min-w-0 flex-1 text-left">
                    <span class="block truncate text-sm font-extrabold">{{ draggable.label }}</span>
                    @if (placementLabel(draggable); as zoneLabel) {
                      <span class="mt-0.5 block truncate text-[11px] font-semibold opacity-75">
                        Đã chọn: {{ zoneLabel }}
                      </span>
                    } @else if (shouldStayOutside(draggable)) {
                      <span class="mt-0.5 block text-[11px] font-semibold opacity-70">
                        Để ngoài nếu là đáp án sai
                      </span>
                    } @else {
                      <span class="mt-0.5 block text-[11px] font-semibold opacity-70">
                        Kéo vào vùng đúng
                      </span>
                    }
                  </span>
                  @if (isChecked()) {
                    <span [class]="draggableStatusClass(draggable)" aria-hidden="true">
                      {{ isDraggableCorrect(draggable) ? '✓' : '×' }}
                    </span>
                  }
                </button>
              }
            </div>

            @if (isChecked()) {
              <div [class]="feedbackClass()" data-testid="interactive-video-drag-drop-feedback" role="status">
                <p class="text-sm font-extrabold">{{ feedbackTitle() }}</p>
                <p class="mt-1 text-sm leading-relaxed">
                  Bạn chọn đúng {{ evaluation().correctCount }}/{{ evaluation().totalCount }} vật dụng.
                </p>
              </div>
            }

            <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
              @if (!isChecked()) {
                <button
                  type="button"
                  class="inline-flex flex-1 items-center justify-center rounded-lg bg-[#0056D2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#004BB5] disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="evaluation().totalCount === 0"
                  data-testid="interactive-video-drag-drop-check"
                  (click)="checkAnswers()">
                  Kiểm tra
                </button>
              }

              @if (isChecked() && canRetry()) {
                <button
                  type="button"
                  class="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[#0056D2]/30 hover:bg-[#0056D2]/5"
                  data-testid="interactive-video-drag-drop-retry"
                  (click)="retry()">
                  Làm lại
                </button>
              }

              @if (isChecked() && canShowSolution() && !isSolutionVisible()) {
                <button
                  type="button"
                  class="inline-flex flex-1 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                  data-testid="interactive-video-drag-drop-solution"
                  (click)="showSolution()">
                  Xem đáp án
                </button>
              }

              <button
                type="button"
                class="inline-flex flex-1 items-center justify-center rounded-lg bg-[#0056D2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#004BB5] disabled:cursor-not-allowed disabled:opacity-50"
                [disabled]="isContinueDisabled()"
                data-testid="interactive-video-drag-drop-continue"
                (click)="continueRequested.emit()">
                Tiếp tục
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  `,
})
export class InteractiveVideoDragDropComponent {
  private readonly contentIdentity = inject(ContentIdentityService);

  readonly interaction = input.required<InteractiveVideoInteraction>();
  readonly continueRequested = output<void>();

  private readonly answerState = signal<DragDropAnswerState>({ interactionId: '', placements: {} });
  private readonly resultState = signal<DragDropResultState>({
    interactionId: '',
    checked: false,
    solutionVisible: false,
  });
  readonly selectedDraggableId = signal<string | null>(null);
  readonly hoveredDropZoneId = signal<string | null>(null);

  readonly dragDrop = computed(() => this.interaction().dragDrop ?? null);
  readonly dropZones = computed(() => this.dragDrop()?.dropZones ?? []);
  readonly draggables = computed(() => this.dragDrop()?.draggables ?? []);
  readonly placements = computed(() => {
    const state = this.answerState();
    return state.interactionId === this.interaction().id ? state.placements : {};
  });
  readonly placedCount = computed(() =>
    Object.values(this.placements()).filter(zoneId => typeof zoneId === 'string' && zoneId.length > 0).length,
  );
  readonly isChecked = computed(() => {
    const state = this.resultState();
    return state.interactionId === this.interaction().id && state.checked;
  });
  readonly isSolutionVisible = computed(() => {
    const state = this.resultState();
    return state.interactionId === this.interaction().id && state.solutionVisible;
  });
  readonly evaluation = computed(() =>
    evaluateInteractiveVideoDragDrop(this.interaction(), this.placements()),
  );
  readonly backgroundUrl = computed(() => this.mediaUrl(this.dragDrop()?.backgroundImage));
  readonly selectedDraggable = computed(() => {
    const selectedId = this.selectedDraggableId();
    return selectedId ? this.draggables().find(item => item.id === selectedId) ?? null : null;
  });
  readonly canRetry = computed(() => this.dragDrop()?.enableRetry !== false);
  readonly canShowSolution = computed(() => this.dragDrop()?.enableShowSolution !== false);
  readonly feedbackTitle = computed(() =>
    this.evaluation().allCorrect ? 'Đúng!' : 'Chưa đúng',
  );
  readonly feedbackClass = computed(() => {
    const base = 'rounded-xl border px-3 py-2.5';
    return this.evaluation().allCorrect
      ? `${base} border-emerald-200 bg-emerald-50 text-emerald-800`
      : `${base} border-red-200 bg-red-50 text-red-800`;
  });
  readonly isContinueDisabled = computed(() => {
    const dragDrop = this.dragDrop();
    if (!this.isChecked()) {
      return this.interaction().required === true || dragDrop?.requireAllCorrectBeforeContinue === true;
    }
    return dragDrop?.requireAllCorrectBeforeContinue === true
      && !this.evaluation().allCorrect
      && !this.isSolutionVisible();
  });

  selectDraggable(draggableId: string): void {
    if (this.isChecked()) {
      return;
    }
    this.selectedDraggableId.set(this.selectedDraggableId() === draggableId ? null : draggableId);
  }

  onDragStart(event: DragEvent, draggableId: string): void {
    if (this.isChecked()) {
      event.preventDefault();
      return;
    }
    event.dataTransfer?.setData('text/plain', draggableId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
    event.dataTransfer?.setDragImage?.(event.currentTarget as Element, 24, 24);
    this.selectedDraggableId.set(draggableId);
  }

  onDragEnd(): void {
    this.hoveredDropZoneId.set(null);
  }

  onStageDragOver(event: DragEvent): void {
    if (!this.isChecked()) {
      event.preventDefault();
    }
  }

  onDropZoneDragEnter(event: DragEvent, dropZoneId: string): void {
    if (this.isChecked()) {
      return;
    }
    event.preventDefault();
    this.hoveredDropZoneId.set(dropZoneId);
  }

  onDropZoneDragOver(event: DragEvent, dropZoneId: string): void {
    if (this.isChecked()) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.hoveredDropZoneId.set(dropZoneId);
  }

  onDropZoneDragLeave(dropZoneId: string): void {
    if (this.hoveredDropZoneId() === dropZoneId) {
      this.hoveredDropZoneId.set(null);
    }
  }

  onDrop(event: DragEvent, dropZoneId: string): void {
    event.preventDefault();
    this.hoveredDropZoneId.set(null);
    if (this.isChecked()) {
      return;
    }
    const draggableId = event.dataTransfer?.getData('text/plain') || this.selectedDraggableId();
    this.placeDraggable(draggableId, dropZoneId);
  }

  placeSelectedInZone(dropZoneId: string): void {
    if (this.isChecked()) {
      return;
    }
    this.placeDraggable(this.selectedDraggableId(), dropZoneId);
  }

  checkAnswers(): void {
    this.resultState.set({
      interactionId: this.interaction().id,
      checked: true,
      solutionVisible: false,
    });
    this.hoveredDropZoneId.set(null);
  }

  retry(): void {
    this.answerState.set({ interactionId: this.interaction().id, placements: {} });
    this.resultState.set({
      interactionId: this.interaction().id,
      checked: false,
      solutionVisible: false,
    });
    this.selectedDraggableId.set(null);
    this.hoveredDropZoneId.set(null);
  }

  showSolution(): void {
    this.resultState.set({
      interactionId: this.interaction().id,
      checked: true,
      solutionVisible: true,
    });
  }

  mediaUrl(media: InteractiveVideoDragDropMedia | null | undefined): string | null {
    const idOrUrl = media?.idOrUrl.trim();
    if (!idOrUrl) {
      return null;
    }
    if (
      /^https?:\/\//i.test(idOrUrl)
      || idOrUrl.startsWith('assets/')
      || idOrUrl.startsWith('data:')
      || idOrUrl.startsWith('blob:')
    ) {
      return idOrUrl;
    }
    return this.contentIdentity.resolveUrl(idOrUrl);
  }

  placedDraggablesForZone(zoneId: string): InteractiveVideoDragDropDraggable[] {
    return this.draggables().filter(draggable => this.placements()[draggable.id] === zoneId);
  }

  placementLabel(draggable: InteractiveVideoDragDropDraggable): string | null {
    const zoneId = this.placements()[draggable.id];
    return zoneId ? this.dropZones().find(zone => zone.id === zoneId)?.label ?? null : null;
  }

  solutionLabelsForZone(zoneId: string): string {
    const labels = this.draggables()
      .filter(draggable => this.getCorrectZoneIds(draggable).includes(zoneId))
      .map(draggable => draggable.label)
      .filter(Boolean);
    return labels.join(', ');
  }

  shouldStayOutside(draggable: InteractiveVideoDragDropDraggable): boolean {
    return this.getCorrectZoneIds(draggable).length === 0;
  }

  draggableState(draggable: InteractiveVideoDragDropDraggable): 'idle' | 'placed' | 'selected' | 'correct' | 'wrong' {
    if (this.isChecked()) {
      return this.isDraggableCorrect(draggable) ? 'correct' : 'wrong';
    }
    if (this.selectedDraggableId() === draggable.id) {
      return 'selected';
    }
    return this.placements()[draggable.id] ? 'placed' : 'idle';
  }

  isDraggableCorrect(draggable: InteractiveVideoDragDropDraggable): boolean {
    return this.evaluation().states.find(state => state.draggableId === draggable.id)?.isCorrect === true;
  }

  dropZoneClass(zone: InteractiveVideoDragDropZone): string {
    const base = [
      'drag-drop-zone absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border-2 px-2 py-1 text-center',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
    ].join(' ');
    const hasPlacement = this.placedDraggablesForZone(zone.id).length > 0;
    const isTargeted = this.selectedDraggableId() != null || this.hoveredDropZoneId() === zone.id;

    if (this.isSolutionVisible()) {
      return `${base} border-emerald-300 bg-emerald-100/65 text-emerald-950 shadow-[0_0_0_4px_rgba(16,185,129,0.16)]`;
    }
    if (this.isChecked()) {
      const hasWrongPlacement = this.placedDraggablesForZone(zone.id)
        .some(draggable => !this.isDraggableCorrect(draggable));
      return hasWrongPlacement
        ? `${base} border-red-300 bg-red-100/70 text-red-950 shadow-[0_0_0_4px_rgba(248,113,113,0.18)]`
        : `${base} border-emerald-300 bg-emerald-100/70 text-emerald-950 shadow-[0_0_0_4px_rgba(16,185,129,0.16)]`;
    }
    if (this.hoveredDropZoneId() === zone.id) {
      return `${base} border-cyan-300 bg-cyan-100/75 text-cyan-950 shadow-[0_0_0_5px_rgba(34,211,238,0.18)]`;
    }
    if (hasPlacement) {
      return `${base} border-white/60 bg-white/10 text-slate-900 shadow-sm`;
    }
    return isTargeted
      ? `${base} border-cyan-200 bg-cyan-100/45 text-cyan-950 hover:bg-cyan-100/65`
      : `${base} border-white/40 bg-white/10 text-white/90 opacity-75 hover:opacity-100`;
  }

  dropZoneLabelClass(zone: InteractiveVideoDragDropZone): string {
    const isQuiet = !this.selectedDraggableId()
      && this.hoveredDropZoneId() !== zone.id
      && this.placedDraggablesForZone(zone.id).length > 0
      && !this.isChecked()
      && !this.isSolutionVisible();
    const base = 'absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-sm';
    return isQuiet
      ? `${base} bg-slate-950/55 text-white/85`
      : `${base} bg-slate-950/75 text-white`;
  }

  draggableCardClass(draggable: InteractiveVideoDragDropDraggable): string {
    const base = 'drag-drop-item flex w-full cursor-grab items-center gap-3 rounded-2xl border px-3 py-2.5 text-left disabled:cursor-not-allowed';
    switch (this.draggableState(draggable)) {
      case 'selected':
        return `${base} border-[#0056D2] bg-white text-[#0056D2] shadow-sm ring-2 ring-[#0056D2]/15`;
      case 'placed':
        return `${base} border-slate-200 bg-white/75 text-slate-600 opacity-80 hover:opacity-100`;
      case 'correct':
        return `${base} border-emerald-200 bg-emerald-50 text-emerald-800`;
      case 'wrong':
        return `${base} border-red-200 bg-red-50 text-red-800`;
      default:
        return `${base} border-slate-200 bg-white text-slate-700 hover:border-[#0056D2]/40 hover:bg-[#0056D2]/5`;
    }
  }

  placedTileClass(draggable: InteractiveVideoDragDropDraggable): string {
    const base = 'flex max-w-full items-center gap-1.5 rounded-xl border px-1.5 py-1 text-left shadow-lg';
    if (!this.isChecked()) {
      return `${base} border-white/70 bg-white/95 text-slate-900`;
    }
    return this.isDraggableCorrect(draggable)
      ? `${base} border-emerald-200 bg-emerald-50 text-emerald-800`
      : `${base} border-red-200 bg-red-50 text-red-800`;
  }

  placedStatusClass(draggable: InteractiveVideoDragDropDraggable): string {
    const base = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black';
    return this.isDraggableCorrect(draggable)
      ? `${base} bg-emerald-100 text-emerald-700`
      : `${base} bg-red-100 text-red-700`;
  }

  draggableStatusClass(draggable: InteractiveVideoDragDropDraggable): string {
    const base = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black shadow-sm';
    return this.isDraggableCorrect(draggable)
      ? `${base} bg-emerald-100 text-emerald-700`
      : `${base} bg-red-100 text-red-700`;
  }

  private placeDraggable(draggableId: string | null, dropZoneId: string): void {
    if (!draggableId || !this.draggables().some(draggable => draggable.id === draggableId)) {
      return;
    }
    this.answerState.set({
      interactionId: this.interaction().id,
      placements: {
        ...this.placements(),
        [draggableId]: dropZoneId,
      },
    });
    this.selectedDraggableId.set(null);
  }

  private getCorrectZoneIds(draggable: InteractiveVideoDragDropDraggable): string[] {
    if (draggable.acceptedDropZoneIds.length > 0) {
      return draggable.acceptedDropZoneIds;
    }
    return this.dropZones()
      .filter(zone => zone.correctDraggableIds.includes(draggable.id))
      .map(zone => zone.id);
  }
}
