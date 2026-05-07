import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import type {
  InteractiveVideoChoice,
  InteractiveVideoInteraction,
} from '../../../api/types/interactive-video.types';

@Component({
  selector: 'app-interactive-video-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 px-4">
      <section
        #panel
        role="dialog"
        tabindex="-1"
        class="w-full max-w-xl rounded-lg border border-white/10 bg-white p-4 text-slate-900 shadow-2xl sm:p-5"
        aria-live="polite"
        aria-modal="true"
        [attr.aria-labelledby]="interaction().title ? titleId() : null"
        [attr.aria-describedby]="interaction().body ? bodyId() : null"
        (keydown.escape)="onEscape()">
        <div class="mb-3 flex items-center justify-between gap-3">
          <span class="rounded-full bg-[#0056D2]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0056D2]">
            {{ interactionLabel() }}
          </span>
          @if (interaction().required) {
            <span class="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              Bắt buộc
            </span>
          }
        </div>

        @if (interaction().title) {
          <h3 [id]="titleId()" class="text-base font-bold leading-tight text-slate-900 sm:text-lg">
            {{ interaction().title }}
          </h3>
        }

        @if (interaction().body) {
          <p [id]="bodyId()" class="mt-2 text-sm leading-relaxed text-slate-600">
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
                [attr.aria-pressed]="selectedChoiceId() === choice.id"
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

        <div class="mt-4 flex items-center justify-between gap-3">
          @if (requiresChoiceBeforeContinue()) {
            <p [id]="choiceRequirementHintId()" class="min-w-0 text-xs font-medium text-slate-500">
              Chọn một phương án để tiếp tục.
            </p>
          }
          <button
            type="button"
            class="ml-auto shrink-0 rounded-lg bg-[#0056D2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#004BB5] disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="requiresChoiceBeforeContinue()"
            [attr.aria-describedby]="requiresChoiceBeforeContinue() ? choiceRequirementHintId() : null"
            (click)="continueRequested.emit()">
            Tiếp tục
          </button>
        </div>
      </section>
    </div>
  `,
})
export class InteractiveVideoOverlayComponent {
  readonly interaction = input.required<InteractiveVideoInteraction>();
  readonly selectedChoiceId = input<string | null>(null);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  readonly choiceSelected = output<InteractiveVideoChoice>();
  readonly continueRequested = output<void>();

  readonly hasChoices = computed(() => (this.interaction().choices?.length ?? 0) > 0);
  readonly titleId = computed(() => `interactive-video-title-${this.interaction().id}`);
  readonly bodyId = computed(() => `interactive-video-body-${this.interaction().id}`);
  readonly choiceRequirementHintId = computed(() => `interactive-video-choice-hint-${this.interaction().id}`);

  constructor() {
    effect(() => {
      this.interaction().id;
      queueMicrotask(() => this.panel()?.nativeElement.focus());
    });
  }

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
        return 'Câu hỏi';
      case 'branch':
        return 'Lựa chọn nhanh';
      case 'hotspot':
        return 'Điểm tương tác';
      default:
        return 'Điểm dừng';
    }
  });

  onEscape(): void {
    if (!this.requiresChoiceBeforeContinue()) {
      this.continueRequested.emit();
    }
  }
}
