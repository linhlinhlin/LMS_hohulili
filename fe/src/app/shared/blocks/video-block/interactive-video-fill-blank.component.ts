import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type {
  InteractiveVideoFillBlankBlank,
  InteractiveVideoInteraction,
} from '../../../api/types/interactive-video.types';
import { evaluateInteractiveVideoFillBlank } from '../../../core/utils/interactive-video-runtime';

interface FillBlankTemplateSegment {
  kind: 'text' | 'blank';
  text: string;
  blank: InteractiveVideoFillBlankBlank | null;
}

interface AnswerState {
  interactionId: string;
  answers: Record<string, string>;
}

interface ResultState {
  interactionId: string;
  checked: boolean;
  solutionVisible: boolean;
}

@Component({
  selector: 'app-interactive-video-fill-blank',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="mt-4 grid gap-4" data-testid="interactive-video-fill-blank">
      <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        @if (templateSegments().length > 0) {
          <div class="text-[15px] font-normal leading-8 text-slate-800 sm:text-base sm:leading-9">
            @for (segment of templateSegments(); track $index) {
              @if (segment.kind === 'blank') {
                @if (segment.blank; as blank) {
                  <span class="inline-flex items-center gap-1.5 align-baseline">
                    <input
                      type="text"
                      [value]="answerFor(blank.id)"
                      [disabled]="isChecked()"
                      [class]="blankInputClass(blank)"
                      [attr.aria-label]="'Ô trống ' + blank.id"
                      [attr.data-testid]="'interactive-video-fill-blank-input-' + blank.id"
                      (input)="updateAnswer(blank.id, $event)" />
                    @if (isChecked()) {
                      <span [class]="blankStatusClass(blank)" aria-hidden="true">
                        {{ isBlankCorrect(blank) ? '✓' : '×' }}
                      </span>
                    }
                    @if (isSolutionVisible() && !isBlankCorrect(blank)) {
                      @if (correctAnswerFor(blank); as answer) {
                        <span class="inline-flex h-8 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 text-sm font-bold text-emerald-800">
                          {{ answer }}
                        </span>
                      }
                    }
                  </span>
                }
              } @else {
                <span>{{ segment.text }}</span>
              }
            }
          </div>
        } @else {
          <p class="text-sm font-medium leading-relaxed text-amber-700">
            Chưa có câu điền từ hợp lệ. Giáo viên cần thêm ô dạng {{ '{' }}{{ '{' }}1{{ '}' }}{{ '}' }}.
          </p>
        }
      </div>

      @if (isChecked()) {
        <div [class]="feedbackClass()" data-testid="interactive-video-fill-blank-feedback" role="status">
          <p class="text-sm font-extrabold">{{ feedbackTitle() }}</p>
          <p class="mt-1 text-sm leading-relaxed">
            Bạn đúng {{ evaluation().correctCount }}/{{ evaluation().totalCount }} chỗ trống.
          </p>
        </div>
      }

      <div class="flex flex-wrap items-center gap-2">
        @if (!isChecked()) {
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg bg-[#0056D2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#004BB5] disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="evaluation().totalCount === 0"
            data-testid="interactive-video-fill-blank-check"
            (click)="checkAnswers()">
            Kiểm tra
          </button>
        }

        @if (isChecked() && canRetry()) {
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#0056D2]/30 hover:bg-[#0056D2]/5"
            data-testid="interactive-video-fill-blank-retry"
            (click)="retry()">
            Làm lại
          </button>
        }

        @if (isChecked() && canShowSolution() && !isSolutionVisible()) {
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
            data-testid="interactive-video-fill-blank-solution"
            (click)="showSolution()">
            Xem đáp án
          </button>
        }

        <button
          type="button"
          class="ml-auto inline-flex items-center justify-center rounded-lg bg-[#0056D2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#004BB5] disabled:cursor-not-allowed disabled:opacity-50"
          [disabled]="isContinueDisabled()"
          data-testid="interactive-video-fill-blank-continue"
          (click)="continueRequested.emit()">
          Tiếp tục
        </button>
      </div>
    </div>
  `,
})
export class InteractiveVideoFillBlankComponent {
  readonly interaction = input.required<InteractiveVideoInteraction>();
  readonly continueRequested = output<void>();

  private readonly answerState = signal<AnswerState>({ interactionId: '', answers: {} });
  private readonly resultState = signal<ResultState>({
    interactionId: '',
    checked: false,
    solutionVisible: false,
  });

  readonly fillBlank = computed(() => this.interaction().fillBlank ?? null);
  readonly templateSegments = computed(() => this.parseTemplate(this.fillBlank()?.template ?? ''));
  readonly currentAnswers = computed(() => {
    const state = this.answerState();
    return state.interactionId === this.interaction().id ? state.answers : {};
  });
  readonly isChecked = computed(() => {
    const state = this.resultState();
    return state.interactionId === this.interaction().id && state.checked;
  });
  readonly isSolutionVisible = computed(() => {
    const state = this.resultState();
    return state.interactionId === this.interaction().id && state.solutionVisible;
  });
  readonly evaluation = computed(() =>
    evaluateInteractiveVideoFillBlank(this.interaction(), this.currentAnswers()),
  );
  readonly canRetry = computed(() => this.fillBlank()?.enableRetry !== false);
  readonly canShowSolution = computed(() => this.fillBlank()?.enableShowSolution !== false);
  readonly isContinueDisabled = computed(() => {
    const fillBlank = this.fillBlank();
    if (!this.isChecked()) {
      return this.interaction().required === true || fillBlank?.requireAllCorrectBeforeContinue === true;
    }
    return fillBlank?.requireAllCorrectBeforeContinue === true
      && !this.evaluation().allCorrect
      && !this.isSolutionVisible();
  });
  readonly feedbackTitle = computed(() =>
    this.evaluation().allCorrect ? 'Đúng!' : 'Chưa đúng',
  );
  readonly feedbackClass = computed(() => {
    const base = 'rounded-xl border px-3 py-2.5';
    return this.evaluation().allCorrect
      ? `${base} border-emerald-200 bg-emerald-50 text-emerald-800`
      : `${base} border-red-200 bg-red-50 text-red-800`;
  });

  answerFor(blankId: string): string {
    return this.currentAnswers()[blankId] ?? '';
  }

  updateAnswer(blankId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.answerState.set({
      interactionId: this.interaction().id,
      answers: {
        ...this.currentAnswers(),
        [blankId]: input.value,
      },
    });
  }

  checkAnswers(): void {
    this.resultState.set({
      interactionId: this.interaction().id,
      checked: true,
      solutionVisible: false,
    });
  }

  retry(): void {
    this.answerState.set({ interactionId: this.interaction().id, answers: {} });
    this.resultState.set({
      interactionId: this.interaction().id,
      checked: false,
      solutionVisible: false,
    });
  }

  showSolution(): void {
    this.resultState.set({
      interactionId: this.interaction().id,
      checked: true,
      solutionVisible: true,
    });
  }

  blankInputClass(blank: InteractiveVideoFillBlankBlank): string {
    const base = 'mx-1.5 my-1 inline-block h-9 w-[8.75rem] max-w-[45vw] rounded-full border px-3 text-center text-sm font-semibold leading-none outline-none transition sm:w-[10.5rem]';
    if (!this.isChecked()) {
      return `${base} border-slate-300 bg-white text-slate-900 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]/20`;
    }
    return this.isBlankCorrect(blank)
      ? `${base} border-emerald-300 bg-emerald-50 text-emerald-800`
      : `${base} border-red-300 bg-red-50 text-red-800`;
  }

  blankStatusClass(blank: InteractiveVideoFillBlankBlank): string {
    const base = 'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black shadow-sm';
    return this.isBlankCorrect(blank)
      ? `${base} bg-emerald-100 text-emerald-700`
      : `${base} bg-red-100 text-red-700`;
  }

  isBlankCorrect(blank: InteractiveVideoFillBlankBlank): boolean {
    return this.evaluation().states.find(state => state.blankId === blank.id)?.isCorrect === true;
  }

  correctAnswerFor(blank: InteractiveVideoFillBlankBlank): string | null {
    return this.evaluation().states.find(state => state.blankId === blank.id)?.correctAnswer ?? null;
  }

  private parseTemplate(template: string): FillBlankTemplateSegment[] {
    const segments: FillBlankTemplateSegment[] = [];
    const blanksById = new Map((this.fillBlank()?.blanks ?? []).map(blank => [blank.id, blank]));
    const pattern = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g;
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(template)) != null) {
      if (match.index > cursor) {
        segments.push({ kind: 'text', text: template.slice(cursor, match.index), blank: null });
      }
      segments.push({ kind: 'blank', text: '', blank: blanksById.get(match[1]) ?? null });
      cursor = match.index + match[0].length;
    }

    if (cursor < template.length) {
      segments.push({ kind: 'text', text: template.slice(cursor), blank: null });
    }

    return segments;
  }
}
