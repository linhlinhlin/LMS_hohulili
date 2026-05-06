import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type {
  InteractiveVideoChoice,
  InteractiveVideoInteraction,
} from '../../../../api/types/interactive-video.types';

@Component({
  selector: 'app-interactive-video-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 px-4">
      <section
        class="w-full max-w-xl rounded-lg border border-white/10 bg-white p-4 text-slate-900 shadow-2xl sm:p-5"
        aria-live="polite">
        <div class="mb-3 flex items-center justify-between gap-3">
          <span class="rounded-full bg-[#0056D2]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0056D2]">
            {{ interactionLabel() }}
          </span>
          @if (interaction().required) {
            <span class="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              Bat buoc
            </span>
          }
        </div>

        @if (interaction().title) {
          <h3 class="text-base font-bold leading-tight text-slate-900 sm:text-lg">
            {{ interaction().title }}
          </h3>
        }

        @if (interaction().body) {
          <p class="mt-2 text-sm leading-relaxed text-slate-600">
            {{ interaction().body }}
          </p>
        }

        @if (hasChoices()) {
          <div class="mt-4 grid gap-2">
            @for (choice of interaction().choices || []; track choice.id) {
              <button
                type="button"
                class="w-full rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-colors"
                [class.border-[#0056D2]]="selectedChoiceId() === choice.id"
                [class.bg-[#0056D2]/5]="selectedChoiceId() === choice.id"
                [class.text-[#0056D2]]="selectedChoiceId() === choice.id"
                [class.border-slate-200]="selectedChoiceId() !== choice.id"
                [class.text-slate-700]="selectedChoiceId() !== choice.id"
                [class.hover:border-[#0056D2]]="selectedChoiceId() !== choice.id"
                [class.hover:bg-slate-50]="selectedChoiceId() !== choice.id"
                (click)="choiceSelected.emit(choice)">
                {{ choice.label }}
              </button>
            }
          </div>
        }

        @if (feedback(); as feedbackText) {
          <p class="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {{ feedbackText }}
          </p>
        }

        <div class="mt-4 flex justify-end">
          <button
            type="button"
            class="rounded-lg bg-[#0056D2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#004BB5] disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="requiresChoiceBeforeContinue()"
            (click)="continueRequested.emit()">
            Tiep tuc
          </button>
        </div>
      </section>
    </div>
  `,
})
export class InteractiveVideoOverlayComponent {
  readonly interaction = input.required<InteractiveVideoInteraction>();
  readonly selectedChoiceId = input<string | null>(null);

  readonly choiceSelected = output<InteractiveVideoChoice>();
  readonly continueRequested = output<void>();

  readonly hasChoices = computed(() => (this.interaction().choices?.length ?? 0) > 0);

  readonly feedback = computed(() => {
    const selectedId = this.selectedChoiceId();
    if (!selectedId) {
      return null;
    }
    return this.interaction().choices?.find(choice => choice.id === selectedId)?.feedback ?? null;
  });

  readonly requiresChoiceBeforeContinue = computed(() => {
    const interaction = this.interaction();
    return interaction.required === true
      && (interaction.type === 'single_choice' || interaction.type === 'branch')
      && !this.selectedChoiceId();
  });

  readonly interactionLabel = computed(() => {
    switch (this.interaction().type) {
      case 'single_choice':
        return 'Cau hoi';
      case 'branch':
        return 'Lua chon nhanh';
      case 'hotspot':
        return 'Diem tuong tac';
      default:
        return 'Diem dung';
    }
  });
}
