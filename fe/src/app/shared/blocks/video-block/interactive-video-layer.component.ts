import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { InteractiveVideoInteraction } from '../../../api/types/interactive-video.types';
import { getVisibleInteractiveVideoInteractions } from '../../../core/utils/interactive-video-runtime';

@Component({
  selector: 'app-interactive-video-layer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    @if (visibleInteractions().length > 0) {
      <div class="pointer-events-none absolute inset-0 z-10">
        @for (interaction of visibleInteractions(); track interaction.id) {
          <button
            type="button"
            [class]="interaction.displayType === 'poster' ? posterClass : buttonClass"
            [class.ring-2]="activeInteractionId() === interaction.id"
            [class.ring-sky-200]="activeInteractionId() === interaction.id"
            [style.left.%]="positionX(interaction)"
            [style.top.%]="positionY(interaction)"
            [style.width.%]="posterWidth(interaction)"
            [attr.aria-label]="interactionAriaLabel(interaction)"
            [attr.data-testid]="'interactive-video-layer-' + interaction.id"
            (click)="interactionSelected.emit(interaction)">
            <span class="inline-flex h-2 w-2 shrink-0 rounded-full bg-sky-300"></span>
            <span class="min-w-0 truncate">
              {{ interactionTitle(interaction) }}
            </span>
            @if (interaction.required) {
              <span class="shrink-0 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-100">
                Bắt buộc
              </span>
            }
          </button>
        }
      </div>
    }
  `,
})
export class InteractiveVideoLayerComponent {
  readonly timeline = input<InteractiveVideoInteraction[]>([]);
  readonly currentTimeSeconds = input(0);
  readonly durationSeconds = input<number | null>(null);
  readonly completedInteractionIds = input<ReadonlySet<string>>(new Set<string>());
  readonly activeInteractionId = input<string | null>(null);
  readonly interactionSelected = output<InteractiveVideoInteraction>();

  protected readonly buttonClass = [
    'pointer-events-auto absolute flex max-w-[15rem] -translate-x-1/2 -translate-y-1/2 items-center gap-2',
    'rounded-full border border-white/20 bg-slate-950/85 px-3 py-1.5 text-[11px] font-semibold text-white',
    'shadow-lg backdrop-blur transition hover:bg-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200',
  ].join(' ');
  protected readonly posterClass = [
    'pointer-events-auto absolute flex min-w-[11rem] max-w-[22rem] -translate-x-1/2 -translate-y-1/2 items-start gap-2',
    'rounded-xl border border-white/20 bg-slate-950/88 px-3 py-2.5 text-left text-xs font-semibold text-white',
    'shadow-2xl backdrop-blur transition hover:bg-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200',
  ].join(' ');

  readonly visibleInteractions = computed(() =>
    getVisibleInteractiveVideoInteractions({
      timeline: this.timeline(),
      currentTimeSeconds: this.currentTimeSeconds(),
      completedInteractionIds: this.completedInteractionIds(),
    }),
  );

  positionX(interaction: InteractiveVideoInteraction): number {
    return this.clampPercent(interaction.position?.xPercent ?? 50);
  }

  positionY(interaction: InteractiveVideoInteraction): number {
    return this.clampPercent(interaction.position?.yPercent ?? 50);
  }

  posterWidth(interaction: InteractiveVideoInteraction): number | null {
    if (interaction.displayType !== 'poster') {
      return null;
    }
    const width = interaction.position?.widthPercent;
    return typeof width === 'number' && Number.isFinite(width) && width > 0
      ? this.clampPercent(width)
      : null;
  }

  interactionTitle(interaction: InteractiveVideoInteraction): string {
    return interaction.title?.trim() || this.interactionLabel(interaction);
  }

  interactionAriaLabel(interaction: InteractiveVideoInteraction): string {
    const required = interaction.required ? ' bắt buộc' : '';
    return `${this.interactionLabel(interaction)}${required}: ${this.interactionTitle(interaction)}`;
  }

  private interactionLabel(interaction: InteractiveVideoInteraction): string {
    switch (interaction.type) {
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

  private clampPercent(value: number): number {
    return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 50;
  }
}
