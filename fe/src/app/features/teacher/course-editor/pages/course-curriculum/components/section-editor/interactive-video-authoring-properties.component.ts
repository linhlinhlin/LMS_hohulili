import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  InteractiveVideoDisplayType,
  InteractiveVideoInteraction,
  InteractiveVideoPosition,
} from '../../../../../../../api/types/interactive-video.types';

@Component({
  selector: 'app-interactive-video-authoring-properties',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <aside class="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      @if (interaction(); as item) {
        <div class="flex items-start justify-between gap-3">
          <div>
            <h5 class="text-sm font-semibold text-slate-900">Thuộc tính nhanh</h5>
            <p class="mt-0.5 text-xs text-slate-500">
              Chỉnh phần hiển thị trực tiếp trên canvas.
            </p>
          </div>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
            {{ formatTime(item.atSeconds) }}
          </span>
        </div>

        <div class="mt-4 grid gap-3">
          <label class="grid gap-1.5">
            <span class="text-xs font-semibold text-slate-600">Tiêu đề</span>
            <input
              type="text"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#0056D2] focus:ring-[#0056D2]"
              [ngModel]="item.title || ''"
              data-testid="interactive-video-properties-title"
              (ngModelChange)="updateTitle($event)" />
          </label>

          <div class="grid grid-cols-2 gap-2">
            <label class="grid gap-1.5">
              <span class="text-xs font-semibold text-slate-600">Thời điểm</span>
              <input
                type="number"
                min="0"
                step="1"
                class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#0056D2] focus:ring-[#0056D2]"
                [attr.max]="maxTimeSeconds() ?? null"
                [ngModel]="item.atSeconds"
                data-testid="interactive-video-properties-time"
                (ngModelChange)="updateTime($event)" />
            </label>

            <label class="grid gap-1.5">
              <span class="text-xs font-semibold text-slate-600">Hiển thị</span>
              <select
                class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#0056D2] focus:ring-[#0056D2]"
                [ngModel]="effectiveDisplayType(item)"
                data-testid="interactive-video-properties-display"
                (ngModelChange)="updateDisplayType($event)">
                <option [ngValue]="'button'">Button</option>
                <option [ngValue]="'poster'">Poster</option>
              </select>
            </label>
          </div>

          <div class="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3">
            <label class="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                class="h-4 w-4 rounded text-[#0056D2] focus:ring-[#0056D2]"
                [ngModel]="item.pause !== false"
                data-testid="interactive-video-properties-pause"
                (ngModelChange)="updateBoolean('pause', $event)" />
              Tạm dừng
            </label>
            <label class="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                class="h-4 w-4 rounded text-[#0056D2] focus:ring-[#0056D2]"
                [ngModel]="item.required === true"
                data-testid="interactive-video-properties-required"
                (ngModelChange)="updateBoolean('required', $event)" />
              Bắt buộc
            </label>
          </div>

          <div class="rounded-xl border border-slate-200 p-3">
            <p class="text-xs font-semibold text-slate-600">Vị trí trên video</p>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <label class="grid gap-1">
                <span class="text-[11px] font-medium text-slate-500">X (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-[#0056D2] focus:ring-[#0056D2]"
                  [ngModel]="positionValue(item.position, 'xPercent')"
                  data-testid="interactive-video-properties-x"
                  (ngModelChange)="updatePosition('xPercent', $event)" />
              </label>
              <label class="grid gap-1">
                <span class="text-[11px] font-medium text-slate-500">Y (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-[#0056D2] focus:ring-[#0056D2]"
                  [ngModel]="positionValue(item.position, 'yPercent')"
                  data-testid="interactive-video-properties-y"
                  (ngModelChange)="updatePosition('yPercent', $event)" />
              </label>
            </div>

            @if (effectiveDisplayType(item) === 'poster') {
              <div class="mt-2 grid grid-cols-2 gap-2">
                <label class="grid gap-1">
                  <span class="text-[11px] font-medium text-slate-500">Rộng poster (%)</span>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    step="1"
                    class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-[#0056D2] focus:ring-[#0056D2]"
                    [ngModel]="item.position?.widthPercent ?? 30"
                    data-testid="interactive-video-properties-width"
                    (ngModelChange)="updatePosition('widthPercent', $event)" />
                </label>
                <label class="grid gap-1">
                  <span class="text-[11px] font-medium text-slate-500">Cao poster (%)</span>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    step="1"
                    class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-[#0056D2] focus:ring-[#0056D2]"
                    [ngModel]="item.position?.heightPercent ?? 30"
                    data-testid="interactive-video-properties-height"
                    (ngModelChange)="updatePosition('heightPercent', $event)" />
                </label>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="flex h-full min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
          <p class="text-sm font-semibold text-slate-700">Chọn một điểm trên canvas</p>
          <p class="mt-1 text-xs leading-relaxed text-slate-500">
            Bấm chip trên video hoặc tạo điểm mới để chỉnh nhanh vị trí và cách hiển thị.
          </p>
        </div>
      }
    </aside>
  `,
})
export class InteractiveVideoAuthoringPropertiesComponent {
  readonly interaction = input<InteractiveVideoInteraction | null>(null);
  readonly durationSeconds = input<number | null>(null);
  readonly interactionPatch = output<Partial<InteractiveVideoInteraction>>();

  updateTitle(title: string): void {
    this.interactionPatch.emit({ title });
  }

  updateTime(value: unknown): void {
    this.interactionPatch.emit({ atSeconds: this.clampTime(value) });
  }

  updateDisplayType(value: InteractiveVideoDisplayType): void {
    this.interactionPatch.emit({ displayType: value });
  }

  /**
   * Mirror the normalizer's display-type fallback so the properties form shows
   * the same value the canvas/runtime will use. Without this, required
   * interactions whose displayType wasn't explicitly set rendered as posters
   * on the canvas but read as "button" in this form.
   */
  effectiveDisplayType(item: InteractiveVideoInteraction): InteractiveVideoDisplayType {
    if (item.displayType === 'button' || item.displayType === 'poster') {
      return item.displayType;
    }
    return item.required === true ? 'poster' : 'button';
  }

  updateBoolean(key: 'pause' | 'required', value: boolean): void {
    this.interactionPatch.emit({ [key]: value });
  }

  updatePosition(key: keyof InteractiveVideoPosition, value: unknown): void {
    const current = this.interaction()?.position ?? { xPercent: 50, yPercent: 50 };
    this.interactionPatch.emit({
      position: {
        ...current,
        [key]: this.clampPercent(value),
      },
    });
  }

  positionValue(
    position: InteractiveVideoPosition | null | undefined,
    key: 'xPercent' | 'yPercent',
  ): number {
    return this.clampPercent(position?.[key] ?? 50);
  }

  maxTimeSeconds(): number | null {
    const duration = this.durationSeconds();
    return duration == null || !Number.isFinite(duration) || duration <= 0
      ? null
      : Math.max(0, Math.round(duration) - 1);
  }

  formatTime(seconds: number): string {
    const safeSeconds = this.clampTime(seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const rest = safeSeconds % 60;
    return `${minutes}:${rest.toString().padStart(2, '0')}`;
  }

  private clampTime(value: unknown): number {
    const raw = typeof value === 'number' ? value : Number(value);
    const safe = Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
    const max = this.maxTimeSeconds();
    return max == null ? safe : Math.min(max, safe);
  }

  private clampPercent(value: unknown): number {
    const raw = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(raw) ? Math.min(100, Math.max(0, Math.round(raw))) : 50;
  }
}
