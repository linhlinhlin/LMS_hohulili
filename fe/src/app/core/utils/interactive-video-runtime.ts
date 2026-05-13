import type {
  InteractiveVideoChoice,
  InteractiveVideoDragDropDraggable,
  InteractiveVideoDragDropZone,
  InteractiveVideoFillBlankBlank,
  InteractiveVideoInteraction,
  InteractiveVideoSpec,
} from '../../api/types/interactive-video.types';

const OPTIONAL_INTERACTION_WINDOW_SECONDS = 5;
const SEEK_GRACE_SECONDS = 3;
const WATCHED_RANGE_MERGE_GAP_SECONDS = 0.75;

export interface InteractiveVideoTimelineLookup {
  timeline: InteractiveVideoInteraction[];
  currentTimeSeconds: number;
  previousTimeSeconds?: number;
  completedInteractionIds?: ReadonlySet<string>;
}

export interface InteractiveVideoSeekPolicyInput {
  spec: InteractiveVideoSpec | null | undefined;
  targetTimeSeconds: number;
  furthestWatchedSeconds: number;
  hasIncompleteRequiredInteractions: boolean;
  watchedRanges?: readonly InteractiveVideoWatchedRange[];
  graceSeconds?: number;
}

export interface InteractiveVideoWatchedRange {
  startSeconds: number;
  endSeconds: number;
}

export interface InteractiveVideoChoiceTargetOptions {
  sourceTimeSeconds?: number | null;
  allowBackwardSeek?: boolean;
}

export interface InteractiveVideoFillBlankAnswerState {
  blankId: string;
  value: string;
  isCorrect: boolean;
  correctAnswer: string | null;
}

export interface InteractiveVideoFillBlankEvaluation {
  states: InteractiveVideoFillBlankAnswerState[];
  correctCount: number;
  totalCount: number;
  allCorrect: boolean;
}

export interface InteractiveVideoDragDropAnswerState {
  draggableId: string;
  label: string;
  dropZoneId: string | null;
  correctDropZoneIds: string[];
  isPlaced: boolean;
  isCorrect: boolean;
}

export interface InteractiveVideoDragDropEvaluation {
  states: InteractiveVideoDragDropAnswerState[];
  correctCount: number;
  totalCount: number;
  allCorrect: boolean;
}

export function getVisibleInteractiveVideoInteractions(
  input: InteractiveVideoTimelineLookup,
): InteractiveVideoInteraction[] {
  const current = toNonNegativeSeconds(input.currentTimeSeconds);
  const completed = input.completedInteractionIds ?? new Set<string>();

  return sortTimeline(input.timeline)
    .filter(interaction => {
      if (completed.has(interaction.id)) {
        return false;
      }
      if (current < toNonNegativeSeconds(interaction.atSeconds)) {
        return false;
      }
      return current <= getInteractionEndSeconds(interaction);
    });
}

export function getDueInteractiveVideoInteraction(
  input: InteractiveVideoTimelineLookup,
): InteractiveVideoInteraction | null {
  const current = toNonNegativeSeconds(input.currentTimeSeconds);
  const previous = input.previousTimeSeconds == null
    ? current
    : toNonNegativeSeconds(input.previousTimeSeconds);
  const completed = input.completedInteractionIds ?? new Set<string>();
  const isForwardPlayback = current >= previous;

  return sortTimeline(input.timeline)
    .find(interaction => {
      if (completed.has(interaction.id)) {
        return false;
      }
      if (current < toNonNegativeSeconds(interaction.atSeconds)) {
        return false;
      }

      if (isForwardPlayback && previous < interaction.atSeconds && current >= interaction.atSeconds) {
        return true;
      }

      return interaction.required === true || current <= getInteractionEndSeconds(interaction);
    }) ?? null;
}

export function resolveInteractiveVideoChoiceTarget(
  choice: InteractiveVideoChoice,
  timeline: InteractiveVideoInteraction[],
  options: InteractiveVideoChoiceTargetOptions = {},
): number | null {
  const target = resolveRawInteractiveVideoChoiceTarget(choice, timeline);
  if (target == null) {
    return null;
  }

  if (options.allowBackwardSeek !== true && isBackwardTarget(target, options.sourceTimeSeconds)) {
    return null;
  }

  return target;
}

export function evaluateInteractiveVideoFillBlank(
  interaction: InteractiveVideoInteraction,
  answers: Readonly<Record<string, string>>,
): InteractiveVideoFillBlankEvaluation {
  const fillBlank = interaction.fillBlank;
  const caseSensitive = fillBlank?.caseSensitive === true;
  const blanks = fillBlank?.blanks ?? [];
  const states = blanks.map(blank => evaluateFillBlankAnswer(blank, answers[blank.id] ?? '', caseSensitive));
  const correctCount = states.filter(state => state.isCorrect).length;
  const totalCount = states.length;

  return {
    states,
    correctCount,
    totalCount,
    allCorrect: totalCount > 0 && correctCount === totalCount,
  };
}

export function evaluateInteractiveVideoDragDrop(
  interaction: InteractiveVideoInteraction,
  placements: Readonly<Record<string, string | null | undefined>>,
): InteractiveVideoDragDropEvaluation {
  const dragDrop = interaction.dragDrop;
  const zones = dragDrop?.dropZones ?? [];
  const states = (dragDrop?.draggables ?? []).map(draggable =>
    evaluateDragDropAnswer(draggable, zones, placements[draggable.id] ?? null),
  );
  const correctCount = states.filter(state => state.isCorrect).length;
  const totalCount = states.length;

  return {
    states,
    correctCount,
    totalCount,
    allCorrect: totalCount > 0 && correctCount === totalCount,
  };
}

export function isInteractiveVideoReviewInteraction(
  interaction: InteractiveVideoInteraction,
): boolean {
  if (interaction.type !== 'single_choice' && interaction.type !== 'branch') {
    return false;
  }

  return interaction.adaptivity?.requireCorrectBeforeContinue === true
    || (interaction.choices ?? []).some(choice => typeof choice.isCorrect === 'boolean');
}

export function isInteractiveVideoProgressGateInteraction(
  interaction: InteractiveVideoInteraction,
): boolean {
  return interaction.required === true
    || interaction.adaptivity?.requireCorrectBeforeContinue === true
    || interaction.fillBlank?.requireAllCorrectBeforeContinue === true
    || interaction.dragDrop?.requireAllCorrectBeforeContinue === true;
}

export function hasInteractiveVideoReviewTarget(
  interaction: InteractiveVideoInteraction,
  choice: InteractiveVideoChoice,
  timeline: InteractiveVideoInteraction[],
): boolean {
  return resolveInteractiveVideoReviewTarget(interaction, choice, timeline) != null;
}

export function resolveInteractiveVideoReviewTarget(
  interaction: InteractiveVideoInteraction,
  choice: InteractiveVideoChoice,
  timeline: InteractiveVideoInteraction[],
): number | null {
  const adaptivityAction = choice.isCorrect === true
    ? interaction.adaptivity?.onCorrect
    : interaction.adaptivity?.onWrong;
  const choiceTarget = resolveInteractiveVideoChoiceTarget(
    choice,
    timeline,
    { sourceTimeSeconds: interaction.atSeconds, allowBackwardSeek: true },
  );
  const adaptivityTarget = adaptivityAction?.type === 'seek'
    ? resolveInteractiveVideoChoiceTarget(
        {
          id: `${choice.id}-adaptivity`,
          label: choice.label,
          targetTimeSeconds: adaptivityAction.targetTimeSeconds,
          targetInteractionId: adaptivityAction.targetInteractionId,
        },
        timeline,
        { sourceTimeSeconds: interaction.atSeconds, allowBackwardSeek: true },
      )
    : null;
  const target = choiceTarget ?? adaptivityTarget;

  return target == null ? null : Math.max(0, target);
}

function resolveRawInteractiveVideoChoiceTarget(
  choice: InteractiveVideoChoice,
  timeline: InteractiveVideoInteraction[],
): number | null {
  if (typeof choice.targetTimeSeconds === 'number' && Number.isFinite(choice.targetTimeSeconds)) {
    return Math.max(0, choice.targetTimeSeconds);
  }

  if (!choice.targetInteractionId) {
    return null;
  }

  return timeline.find(interaction => interaction.id === choice.targetInteractionId)?.atSeconds ?? null;
}

function isBackwardTarget(targetTimeSeconds: number, sourceTimeSeconds: number | null | undefined): boolean {
  return typeof sourceTimeSeconds === 'number'
    && Number.isFinite(sourceTimeSeconds)
    && targetTimeSeconds <= Math.max(0, sourceTimeSeconds);
}

function evaluateFillBlankAnswer(
  blank: InteractiveVideoFillBlankBlank,
  rawValue: string,
  caseSensitive: boolean,
): InteractiveVideoFillBlankAnswerState {
  const value = rawValue.trim();
  const normalizedValue = normalizeFillBlankAnswer(value, caseSensitive);
  const correctAnswer = blank.acceptedAnswers.find(answer => answer.trim()) ?? null;
  const isCorrect = normalizedValue.length > 0
    && blank.acceptedAnswers.some(answer =>
      normalizeFillBlankAnswer(answer, caseSensitive) === normalizedValue,
    );

  return {
    blankId: blank.id,
    value,
    isCorrect,
    correctAnswer,
  };
}

function normalizeFillBlankAnswer(value: string, caseSensitive: boolean): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  return caseSensitive ? normalized : normalized.toLocaleLowerCase();
}

function evaluateDragDropAnswer(
  draggable: InteractiveVideoDragDropDraggable,
  zones: InteractiveVideoDragDropZone[],
  rawDropZoneId: string | null,
): InteractiveVideoDragDropAnswerState {
  const dropZoneId = typeof rawDropZoneId === 'string' && rawDropZoneId.trim()
    ? rawDropZoneId.trim()
    : null;
  const correctDropZoneIds = getCorrectDropZoneIds(draggable, zones);
  const isPlaced = dropZoneId != null;
  const shouldBePlaced = correctDropZoneIds.length > 0;

  return {
    draggableId: draggable.id,
    label: draggable.label,
    dropZoneId,
    correctDropZoneIds,
    isPlaced,
    isCorrect: shouldBePlaced
      ? isPlaced && correctDropZoneIds.includes(dropZoneId)
      : !isPlaced,
  };
}

function getCorrectDropZoneIds(
  draggable: InteractiveVideoDragDropDraggable,
  zones: InteractiveVideoDragDropZone[],
): string[] {
  const explicit = draggable.acceptedDropZoneIds.filter(Boolean);
  if (explicit.length > 0) {
    return explicit;
  }

  return zones
    .filter(zone => zone.correctDraggableIds.includes(draggable.id))
    .map(zone => zone.id);
}

export function shouldBlockInteractiveVideoSeek(input: InteractiveVideoSeekPolicyInput): boolean {
  const mode = input.spec?.behavior?.preventSkippingMode ?? 'none';
  if (mode === 'none' || !input.hasIncompleteRequiredInteractions) {
    return false;
  }

  const target = toNonNegativeSeconds(input.targetTimeSeconds);
  const furthestWatched = toNonNegativeSeconds(input.furthestWatchedSeconds);
  const grace = Math.max(0, input.graceSeconds ?? SEEK_GRACE_SECONDS);

  if (target > furthestWatched + grace) {
    return true;
  }

  if (mode !== 'both' || !input.watchedRanges?.length) {
    return false;
  }

  return !isInteractiveVideoTimeWithinWatchedRanges(target, input.watchedRanges, grace);
}

export function addInteractiveVideoWatchedRange(
  ranges: readonly InteractiveVideoWatchedRange[],
  startSeconds: number,
  endSeconds: number,
): InteractiveVideoWatchedRange[] {
  if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) {
    return [...ranges];
  }

  const nextRange = {
    startSeconds: Math.max(0, Math.min(startSeconds, endSeconds)),
    endSeconds: Math.max(0, Math.max(startSeconds, endSeconds)),
  };
  const sorted = [...ranges, nextRange]
    .map(range => ({
      startSeconds: toNonNegativeSeconds(range.startSeconds),
      endSeconds: toNonNegativeSeconds(range.endSeconds),
    }))
    .filter(range => range.endSeconds >= range.startSeconds)
    .sort((a, b) => a.startSeconds - b.startSeconds);

  return sorted.reduce<InteractiveVideoWatchedRange[]>((merged, range) => {
    const previous = merged[merged.length - 1];
    if (!previous || range.startSeconds > previous.endSeconds + WATCHED_RANGE_MERGE_GAP_SECONDS) {
      merged.push({ ...range });
      return merged;
    }

    previous.endSeconds = Math.max(previous.endSeconds, range.endSeconds);
    return merged;
  }, []);
}

export function isInteractiveVideoTimeWithinWatchedRanges(
  timeSeconds: number,
  ranges: readonly InteractiveVideoWatchedRange[],
  graceSeconds = 0,
): boolean {
  if (!Number.isFinite(timeSeconds)) {
    return false;
  }

  const time = Math.max(0, timeSeconds);
  const grace = Math.max(0, graceSeconds);
  return ranges.some(range =>
    time >= toNonNegativeSeconds(range.startSeconds) - grace
    && time <= toNonNegativeSeconds(range.endSeconds) + grace,
  );
}

function getInteractionEndSeconds(interaction: InteractiveVideoInteraction): number {
  return interaction.endSeconds == null
    ? toNonNegativeSeconds(interaction.atSeconds) + OPTIONAL_INTERACTION_WINDOW_SECONDS
    : toNonNegativeSeconds(interaction.endSeconds);
}

function sortTimeline(timeline: InteractiveVideoInteraction[]): InteractiveVideoInteraction[] {
  return [...timeline].sort((a, b) => toNonNegativeSeconds(a.atSeconds) - toNonNegativeSeconds(b.atSeconds));
}

function toNonNegativeSeconds(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
