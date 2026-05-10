import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import type {
  InteractiveVideoChoice,
  InteractiveVideoInteraction,
} from '../../../api/types/interactive-video.types';
import { ContentIdentityService } from '../../../core/services/content-identity.service';
import katex from 'katex';
import { InteractiveVideoDragDropComponent } from './interactive-video-drag-drop.component';
import { InteractiveVideoFillBlankComponent } from './interactive-video-fill-blank.component';

type ChoiceAnswerState = 'idle' | 'selected' | 'selected-correct' | 'selected-wrong' | 'correct-answer';

@Component({
  selector: 'app-interactive-video-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InteractiveVideoDragDropComponent, InteractiveVideoFillBlankComponent],
  template: `
    <div [class]="overlayClass()">
      <section
        #panel
        role="dialog"
        tabindex="-1"
        [class]="panelClass()"
        aria-live="polite"
        aria-modal="true"
        [attr.aria-labelledby]="interaction().title ? titleId() : null"
        [attr.aria-describedby]="interaction().body ? bodyId() : null"
        (keydown.tab)="trapFocus($event)"
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
          <div
            [id]="bodyId()"
            [innerHTML]="renderedBody()"
            class="mt-2 text-sm leading-relaxed text-slate-600">
          </div>
        }

        @if (isDragDropInteraction()) {
          <app-interactive-video-drag-drop
            [interaction]="interaction()"
            [density]="density()"
            (continueRequested)="continueRequested.emit()" />
        } @else if (isFillBlankInteraction()) {
          <app-interactive-video-fill-blank
            [interaction]="interaction()"
            (continueRequested)="continueRequested.emit()" />
        } @else {
        @if (hasChoices()) {
          <div class="mt-4 grid gap-2">
            @for (item of renderedChoices(); track item.choice.id) {
              <button
                type="button"
                [class]="choiceButtonClass(item.choice)"
                [disabled]="areChoicesLocked()"
                [attr.aria-pressed]="selectedChoiceId() === item.choice.id"
                [attr.data-answer-state]="choiceAnswerState(item.choice)"
                (click)="choiceSelected.emit(item.choice)">
                <span class="flex items-center gap-2">
                  @if (choiceStateIcon(item.choice); as stateIcon) {
                    <span [class]="choiceStateIconClass(item.choice)" aria-hidden="true">
                      {{ stateIcon }}
                    </span>
                  }
                  <span class="min-w-0" [innerHTML]="item.html"></span>
                </span>
              </button>
            }
          </div>
        }

        @if (feedbackStatusTitle(); as statusTitle) {
          <div [class]="feedbackPanelClass()" data-testid="interactive-video-feedback" role="status">
            <p class="text-sm font-extrabold">{{ statusTitle }}</p>
            @if (renderedFeedback(); as feedbackHtml) {
              <div [innerHTML]="feedbackHtml" class="mt-1 text-sm leading-relaxed"></div>
            }
          </div>
        } @else if (renderedFeedback(); as feedbackHtml) {
          <div
            [innerHTML]="feedbackHtml"
            class="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          </div>
        }

        <div class="mt-4 flex items-center justify-between gap-3">
          @if (isContinueBlocked()) {
            <p [id]="choiceRequirementHintId()" class="min-w-0 text-xs font-medium text-slate-500">
              {{ continueRequirementHint() }}
            </p>
          }
          @if (shouldOfferReview()) {
            <button
              type="button"
              class="ml-auto inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0056D2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#004BB5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0056D2]/40"
              data-testid="interactive-video-review-button"
              (click)="reviewRequested.emit()">
              <span aria-hidden="true">↺</span>
              Xem lại video
            </button>
          } @else {
            <button
              type="button"
              class="ml-auto shrink-0 rounded-lg bg-[#0056D2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#004BB5] disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="isContinueBlocked()"
              [attr.aria-describedby]="isContinueBlocked() ? choiceRequirementHintId() : null"
              (click)="continueRequested.emit()">
              Tiếp tục
            </button>
          }
        </div>
        }
      </section>
    </div>
  `,
})
export class InteractiveVideoOverlayComponent implements OnDestroy {
  private static readonly FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  private readonly sanitizer = inject(DomSanitizer);
  private readonly identityService = inject(ContentIdentityService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private previouslyFocusedElement: HTMLElement | null = null;

  readonly interaction = input.required<InteractiveVideoInteraction>();
  readonly selectedChoiceId = input<string | null>(null);
  readonly density = input<'comfortable' | 'compact'>('comfortable');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  readonly choiceSelected = output<InteractiveVideoChoice>();
  readonly continueRequested = output<void>();
  readonly reviewRequested = output<void>();

  readonly hasChoices = computed(() => (this.interaction().choices?.length ?? 0) > 0);
  readonly isDragDropInteraction = computed(() => this.interaction().type === 'drag_drop');
  readonly isFillBlankInteraction = computed(() => this.interaction().type === 'fill_blank');
  readonly titleId = computed(() => `interactive-video-title-${this.interaction().id}`);
  readonly bodyId = computed(() => `interactive-video-body-${this.interaction().id}`);
  readonly choiceRequirementHintId = computed(() => `interactive-video-choice-hint-${this.interaction().id}`);
  readonly renderedBody = computed(() => this.renderRichContent(this.interaction().body, 'block'));
  readonly renderedChoices = computed(() =>
    (this.interaction().choices ?? []).map(choice => ({
      choice,
      html: this.renderRichContent(choice.label, 'inline'),
    })),
  );

  constructor() {
    effect(() => {
      this.interaction().id;
      if (!this.isBrowser) {
        return;
      }
      queueMicrotask(() => {
        const panel = this.panel()?.nativeElement;
        if (!panel) {
          return;
        }
        const activeElement = document.activeElement;
        if (
          !this.previouslyFocusedElement
          && activeElement instanceof HTMLElement
          && !panel.contains(activeElement)
        ) {
          this.previouslyFocusedElement = activeElement;
        }
        panel.focus();
      });
    });
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) {
      return;
    }
    const previous = this.previouslyFocusedElement;
    if (previous && document.contains(previous)) {
      previous.focus();
    }
  }

  readonly selectedChoice = computed(() => {
    const selectedId = this.selectedChoiceId();
    if (!selectedId) {
      return null;
    }
    return this.interaction().choices?.find(choice => choice.id === selectedId) ?? null;
  });

  readonly feedback = computed(() => {
    const selected = this.selectedChoice();
    if (!selected) {
      return null;
    }

    const adaptivityMessage = (
      selected.isCorrect
        ? this.interaction().adaptivity?.onCorrect?.message
        : this.interaction().adaptivity?.onWrong?.message
    )?.trim();
    const messages = [selected.feedback?.trim(), adaptivityMessage].filter(Boolean);

    return messages.length > 0 ? messages.join('\n') : null;
  });
  readonly renderedFeedback = computed(() => {
    const text = this.feedback();
    return text ? this.renderRichContent(text, 'block') : null;
  });
  readonly feedbackStatusTitle = computed(() => {
    const selected = this.selectedChoice();
    if (selected?.isCorrect === true) {
      return 'Đúng!';
    }
    if (selected?.isCorrect === false) {
      return 'Chưa đúng';
    }
    return null;
  });
  readonly feedbackPanelClass = computed(() => {
    const base = 'mt-3 rounded-lg border px-3 py-2';
    if (this.selectedChoice()?.isCorrect === true) {
      return `${base} border-emerald-200 bg-emerald-50 text-emerald-800`;
    }
    return `${base} border-red-200 bg-red-50 text-red-800`;
  });
  readonly requiresCorrectAnswer = computed(() => {
    const interaction = this.interaction();
    if (interaction.adaptivity?.requireCorrectBeforeContinue === true) {
      return true;
    }
    if (interaction.type === 'branch') {
      // Only enforce correctness on graded branches that explicitly mark at least
      // one choice as correct. Pure navigation branches (no isCorrect flags) must
      // let learners pick any path and continue, otherwise Continue is unreachable.
      return interaction.choices?.some(choice => choice.isCorrect === true) === true;
    }
    return false;
  });

  readonly isContinueBlocked = computed(() => {
    const interaction = this.interaction();
    if (
      interaction.required !== true
      && !this.requiresCorrectAnswer()
      || (interaction.type !== 'single_choice' && interaction.type !== 'branch')
    ) {
      return false;
    }

    const selected = this.selectedChoice();
    if (!selected) {
      return true;
    }

    return this.requiresCorrectAnswer()
      && selected.isCorrect !== true;
  });

  readonly continueRequirementHint = computed(() => {
    if (this.requiresCorrectAnswer()) {
      return 'Chọn đáp án đúng để tiếp tục.';
    }
    return 'Chọn một phương án để tiếp tục.';
  });

  readonly overlayClass = computed(() => {
    const base = 'absolute inset-0 z-20 flex bg-slate-950/70';
    if (this.density() === 'compact') {
      return `${base} items-end justify-center overflow-y-auto p-2 sm:items-center sm:p-3`;
    }
    return `${base} items-center justify-center px-4`;
  });

  readonly panelClass = computed(() => {
    const base = 'w-full rounded-lg border border-white/10 bg-white text-slate-900 shadow-2xl';
    if (this.density() === 'compact') {
      return this.isDragDropInteraction()
        ? `${base} max-h-full max-w-[72rem] overflow-y-auto p-3 sm:p-4`
        : this.isFillBlankInteraction()
        ? `${base} max-h-full max-w-xl overflow-y-auto p-3 sm:p-4`
        : `${base} max-h-full max-w-lg overflow-y-auto p-3 sm:p-4`;
    }
    return this.isDragDropInteraction()
      ? `${base} max-w-5xl p-4 sm:p-5`
      : this.isFillBlankInteraction()
      ? `${base} max-w-2xl p-4 sm:p-5`
      : `${base} max-w-xl p-4 sm:p-5`;
  });

  readonly interactionLabel = computed(() => {
    switch (this.interaction().type) {
      case 'single_choice':
        return 'Câu hỏi';
      case 'branch':
        return 'Lựa chọn nhanh';
      case 'hotspot':
        return 'Điểm tương tác';
      case 'fill_blank':
        return 'Điền từ';
      case 'drag_drop':
        return 'Kéo thả';
      default:
        return 'Điểm dừng';
    }
  });

  choiceAnswerState(choice: InteractiveVideoChoice): ChoiceAnswerState {
    const selected = this.selectedChoice();
    if (!selected) {
      return 'idle';
    }

    const isSelected = selected.id === choice.id;
    if (isSelected && choice.isCorrect === true) {
      return 'selected-correct';
    }
    if (isSelected && choice.isCorrect === false) {
      return 'selected-wrong';
    }
    if (selected.isCorrect === false && choice.isCorrect === true) {
      if (this.shouldOfferReview()) {
        return 'idle';
      }
      return 'correct-answer';
    }
    return isSelected ? 'selected' : 'idle';
  }

  choiceButtonClass(choice: InteractiveVideoChoice): string {
    const base = 'w-full rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70';
    switch (this.choiceAnswerState(choice)) {
      case 'selected-correct':
        return `${base} border-emerald-300 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200`;
      case 'selected-wrong':
        return `${base} border-red-300 bg-red-50 text-red-800 ring-1 ring-red-200`;
      case 'correct-answer':
        return `${base} border-emerald-300 bg-emerald-50 text-emerald-800`;
      case 'selected':
        return `${base} border-[#0056D2] bg-[#0056D2]/5 text-[#0056D2]`;
      default:
        return `${base} border-slate-200 text-slate-700 hover:border-[#0056D2] hover:bg-slate-50`;
    }
  }

  choiceStateIcon(choice: InteractiveVideoChoice): string | null {
    switch (this.choiceAnswerState(choice)) {
      case 'selected-correct':
      case 'correct-answer':
        return '✓';
      case 'selected-wrong':
        return '×';
      default:
        return null;
    }
  }

  choiceStateIconClass(choice: InteractiveVideoChoice): string {
    const base = 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-black';
    return this.choiceAnswerState(choice) === 'selected-wrong'
      ? `${base} bg-red-100 text-red-700`
      : `${base} bg-emerald-100 text-emerald-700`;
  }

  readonly shouldOfferReview = computed(() => {
    const interaction = this.interaction();
    const selected = this.selectedChoice();
    const hasReviewTarget = interaction.type === 'branch'
      || interaction.adaptivity?.onWrong?.type === 'seek'
      || selected?.targetTimeSeconds != null
      || !!selected?.targetInteractionId;
    return this.requiresCorrectAnswer()
      && selected?.isCorrect === false
      && hasReviewTarget;
  });

  readonly areChoicesLocked = computed(() => this.shouldOfferReview());

  onEscape(): void {
    if (this.isFillBlankInteraction() || this.isDragDropInteraction()) {
      return;
    }
    if (!this.isContinueBlocked()) {
      this.continueRequested.emit();
      return;
    }
    // Blocked: redirect focus into the choice list so the keyboard user sees
    // where action is required instead of silently swallowing the keystroke.
    if (!this.isBrowser) {
      return;
    }
    const panel = this.panel()?.nativeElement;
    if (!panel) {
      return;
    }
    const firstChoice = panel.querySelector<HTMLButtonElement>(
      'button[data-answer-state]:not([disabled])',
    );
    firstChoice?.focus();
  }

  trapFocus(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const panel = this.panel()?.nativeElement;
    if (!panel) {
      return;
    }

    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(InteractiveVideoOverlayComponent.FOCUSABLE_SELECTOR),
    ).filter(element => this.isFocusable(element));
    if (focusable.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (keyboardEvent.shiftKey && (active === first || !panel.contains(active))) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!keyboardEvent.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private renderRichContent(
    text: string | null | undefined,
    mode: 'block' | 'inline',
  ): SafeHtml {
    let html = this.escapeHtml(text ?? '');

    html = html.replace(/\[IMG:([^\]]+)\]/g, (_match, idOrUrl: string) => {
      const src = this.toSafeMediaUrl(idOrUrl);
      if (!src) {
        return '';
      }
      const imgClass = mode === 'inline'
        ? 'inline-block max-h-12 w-auto rounded border border-slate-200 bg-white align-middle'
        : 'my-2 block max-h-56 max-w-full rounded-lg border border-slate-200 bg-white object-contain';
      return `<img src="${this.escapeAttribute(src)}" class="${imgClass}" alt="Minh họa" loading="lazy">`;
    });

    html = html.replace(/\[YTVID:([^\]]+)\]/g, (_match, urlOrId: string) => {
      const videoId = this.extractYouTubeId(urlOrId);
      if (!videoId) {
        return '';
      }
      if (mode === 'inline') {
        return '<span class="inline-flex items-center rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">YouTube</span>';
      }
      return `<iframe src="https://www.youtube.com/embed/${this.escapeAttribute(videoId)}" class="my-2 aspect-video w-full rounded-lg border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    });

    html = html.replace(/\[VID:([^\]]+)\]/g, (_match, idOrUrl: string) => {
      const src = this.toSafeMediaUrl(idOrUrl);
      if (!src) {
        return '';
      }
      if (mode === 'inline') {
        return '<span class="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">Video</span>';
      }
      return `<video src="${this.escapeAttribute(src)}" controls preload="metadata" class="my-2 max-h-64 w-full rounded-lg bg-black"></video>`;
    });

    try {
      html = html.replace(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g, (match) => {
        const isDisplay = match.startsWith('$$');
        const cleanTex = isDisplay ? match.slice(2, -2) : match.slice(1, -1);
        return katex.renderToString(cleanTex, {
          throwOnError: false,
          displayMode: isDisplay,
        });
      });
    } catch {
      // Keep original escaped text if KaTeX cannot render a teacher-entered formula.
    }

    html = html.replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private toSafeMediaUrl(value: string): string {
    const decoded = this.decodeMarkerValue(value).trim();
    if (!decoded) {
      return '';
    }

    if (/^https?:\/\//i.test(decoded) || decoded.startsWith('assets/')) {
      return decoded;
    }

    return this.identityService.resolveUrl(decoded);
  }

  private extractYouTubeId(value: string): string | null {
    const decoded = this.decodeMarkerValue(value).trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(decoded)) {
      return decoded;
    }

    try {
      const url = new URL(decoded);
      if (url.hostname.includes('youtu.be')) {
        return url.pathname.replace('/', '').slice(0, 11) || null;
      }
      if (url.hostname.includes('youtube.com')) {
        const watchId = url.searchParams.get('v');
        if (watchId) {
          return watchId.slice(0, 11);
        }
        const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
        return embedMatch?.[1] ?? null;
      }
    } catch {
      return null;
    }

    return null;
  }

  private decodeMarkerValue(value: string): string {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value);
  }

  private isFocusable(element: HTMLElement): boolean {
    return element.tabIndex !== -1
      && !element.hasAttribute('disabled')
      && element.offsetParent !== null;
  }
}
