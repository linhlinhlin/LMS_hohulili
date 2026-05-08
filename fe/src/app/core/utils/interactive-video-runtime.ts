import type {
  InteractiveVideoChoice,
  InteractiveVideoInteraction,
  InteractiveVideoSpec,
} from '../../api/types/interactive-video.types';

const OPTIONAL_INTERACTION_WINDOW_SECONDS = 5;
const SEEK_GRACE_SECONDS = 3;

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
  graceSeconds?: number;
}

export interface InteractiveVideoChoiceTargetOptions {
  sourceTimeSeconds?: number | null;
  allowBackwardSeek?: boolean;
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

export function isInteractiveVideoReviewInteraction(
  interaction: InteractiveVideoInteraction,
): boolean {
  if (interaction.type !== 'single_choice' && interaction.type !== 'branch') {
    return false;
  }

  return interaction.adaptivity?.requireCorrectBeforeContinue === true
    || (interaction.choices ?? []).some(choice => typeof choice.isCorrect === 'boolean');
}

export function resolveInteractiveVideoReviewTarget(
  interaction: InteractiveVideoInteraction,
  choice: InteractiveVideoChoice,
  timeline: InteractiveVideoInteraction[],
): number {
  const adaptivityAction = choice.isCorrect === true
    ? interaction.adaptivity?.onCorrect
    : interaction.adaptivity?.onWrong;
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
  const choiceTarget = resolveInteractiveVideoChoiceTarget(
    choice,
    timeline,
    { sourceTimeSeconds: interaction.atSeconds, allowBackwardSeek: true },
  );

  return Math.max(0, adaptivityTarget ?? choiceTarget ?? 0);
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

export function shouldBlockInteractiveVideoSeek(input: InteractiveVideoSeekPolicyInput): boolean {
  const mode = input.spec?.behavior?.preventSkippingMode ?? 'none';
  if (mode === 'none' || !input.hasIncompleteRequiredInteractions) {
    return false;
  }

  const target = toNonNegativeSeconds(input.targetTimeSeconds);
  const furthestWatched = toNonNegativeSeconds(input.furthestWatchedSeconds);
  const grace = Math.max(0, input.graceSeconds ?? SEEK_GRACE_SECONDS);

  return target > furthestWatched + grace;
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
