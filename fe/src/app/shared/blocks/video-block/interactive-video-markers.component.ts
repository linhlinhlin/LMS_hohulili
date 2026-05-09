import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { InteractiveVideoInteraction } from '../../../api/types/interactive-video.types';

interface InteractiveVideoMarker {
  interaction: InteractiveVideoInteraction;
  percent: number;
}

@Component({
  selector: 'app-interactive-video-markers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    @if (visibleMarkers().length > 0) {
      <div class="pointer-events-none border-t border-white/10 bg-slate-950/95 px-3 py-2 text-white">
        @if (upcomingInteraction(); as next) {
          <div class="mb-1.5 flex justify-end">
            <button
              type="button"
              class="pointer-events-auto inline-flex max-w-md items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
              [attr.aria-label]="'Tới tương tác tại ' + formatTime(next.atSeconds)"
              (click)="markerSelected.emit(next.atSeconds)">
              <span class="h-2 w-2 shrink-0 rounded-full bg-sky-300"></span>
              <span class="truncate">
                Sắp tới: {{ interactionLabel(next) }} tại {{ formatTime(next.atSeconds) }}
              </span>
            </button>
          </div>
        }

        <div class="pointer-events-auto relative h-4 rounded-full bg-white/10 px-1 shadow-inner">
          <div class="absolute left-1 right-1 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/25"></div>
          @for (marker of visibleMarkers(); track marker.interaction.id) {
            <button
              type="button"
              class="absolute top-1/2 flex h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#0056D2] shadow transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
              [class.ring-2]="activeInteractionId() === marker.interaction.id"
              [class.ring-sky-200]="activeInteractionId() === marker.interaction.id"
              [style.left.%]="marker.percent"
              [attr.title]="interactionLabel(marker.interaction) + ' · ' + formatTime(marker.interaction.atSeconds)"
              [attr.aria-label]="'Tới ' + interactionLabel(marker.interaction) + ' tại ' + formatTime(marker.interaction.atSeconds)"
              (click)="markerSelected.emit(marker.interaction.atSeconds)">
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class InteractiveVideoMarkersComponent {
  readonly timeline = input<InteractiveVideoInteraction[]>([]);
  readonly durationSeconds = input<number | null>(null);
  readonly currentTimeSeconds = input(0);
  readonly activeInteractionId = input<string | null>(null);
  readonly markerSelected = output<number>();

  readonly scaleSeconds = computed(() => {
    const duration = this.toPositiveNumber(this.durationSeconds());
    const timelineMax = Math.max(
      0,
      ...this.timeline().map(interaction => this.toNonNegativeNumber(interaction.atSeconds)),
    );
    return Math.max(duration ?? 0, timelineMax + 5, 1);
  });

  readonly visibleMarkers = computed<InteractiveVideoMarker[]>(() => {
    const scale = this.scaleSeconds();
    return [...this.timeline()]
      .filter(interaction => Number.isFinite(interaction.atSeconds) && interaction.atSeconds >= 0)
      .sort((a, b) => a.atSeconds - b.atSeconds)
      .map(interaction => ({
        interaction,
        percent: Math.min(100, Math.max(0, (interaction.atSeconds / scale) * 100)),
      }));
  });

  readonly upcomingInteraction = computed<InteractiveVideoInteraction | null>(() => {
    if (this.activeInteractionId()) {
      return null;
    }

    const current = this.toNonNegativeNumber(this.currentTimeSeconds());
    const windowSeconds = this.getUpcomingWindowSeconds();
    return this.visibleMarkers()
      .map(marker => marker.interaction)
      .find(interaction => {
        const delta = interaction.atSeconds - current;
        return delta > 0 && delta <= windowSeconds;
      }) ?? null;
  });

  interactionLabel(interaction: InteractiveVideoInteraction): string {
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

  formatTime(seconds: number | null | undefined): string {
    const safeSeconds = this.toNonNegativeNumber(seconds ?? 0);
    const minutes = Math.floor(safeSeconds / 60);
    const rest = safeSeconds % 60;
    return `${minutes}:${rest.toString().padStart(2, '0')}`;
  }

  private getUpcomingWindowSeconds(): number {
    const duration = this.toPositiveNumber(this.durationSeconds()) ?? this.scaleSeconds();
    if (duration <= 30) {
      return 8;
    }
    if (duration <= 120) {
      return 15;
    }
    if (duration <= 600) {
      return 30;
    }
    if (duration <= 1800) {
      return 60;
    }
    return 90;
  }

  private toPositiveNumber(value: number | null | undefined): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value > 0
      ? value
      : null;
  }

  private toNonNegativeNumber(value: number): number {
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  }
}
