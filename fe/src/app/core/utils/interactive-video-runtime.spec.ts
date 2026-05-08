import type {
  InteractiveVideoInteraction,
  InteractiveVideoSpec,
} from '../../api/types/interactive-video.types';
import {
  getDueInteractiveVideoInteraction,
  getVisibleInteractiveVideoInteractions,
  isInteractiveVideoReviewInteraction,
  resolveInteractiveVideoChoiceTarget,
  resolveInteractiveVideoReviewTarget,
  shouldBlockInteractiveVideoSeek,
} from './interactive-video-runtime';

describe('interactive-video-runtime', () => {
  const timeline: InteractiveVideoInteraction[] = [
    {
      id: 'optional-button',
      type: 'checkpoint',
      atSeconds: 10,
      endSeconds: 20,
      displayType: 'button',
    },
    {
      id: 'required-poster',
      type: 'single_choice',
      atSeconds: 30,
      endSeconds: 40,
      required: true,
      displayType: 'poster',
      choices: [{ id: 'a', label: 'Answer', isCorrect: true }],
    },
  ];

  it('returns button and poster interactions inside their display windows', () => {
    const visible = getVisibleInteractiveVideoInteractions({
      timeline,
      currentTimeSeconds: 15,
    });

    expect(visible.map(interaction => interaction.id)).toEqual(['optional-button']);

    const laterVisible = getVisibleInteractiveVideoInteractions({
      timeline,
      currentTimeSeconds: 35,
    });

    expect(laterVisible.map(interaction => interaction.id)).toEqual(['required-poster']);
  });

  it('returns required overdue interactions after a forward seek', () => {
    const due = getDueInteractiveVideoInteraction({
      timeline,
      currentTimeSeconds: 120,
      completedInteractionIds: new Set(['optional-button']),
    });

    expect(due?.id).toBe('required-poster');
  });

  it('returns an optional interaction crossed between playback samples', () => {
    const due = getDueInteractiveVideoInteraction({
      timeline,
      previousTimeSeconds: 9,
      currentTimeSeconds: 21,
    });

    expect(due?.id).toBe('optional-button');
  });

  it('does not reopen an expired optional interaction when landing past its window', () => {
    const due = getDueInteractiveVideoInteraction({
      timeline,
      previousTimeSeconds: 21,
      currentTimeSeconds: 21,
    });

    expect(due).toBeNull();
  });

  it('ignores completed interactions', () => {
    const due = getDueInteractiveVideoInteraction({
      timeline,
      currentTimeSeconds: 120,
      completedInteractionIds: new Set(['optional-button', 'required-poster']),
    });

    expect(due).toBeNull();
  });

  it('resolves branch targets by time or interaction id', () => {
    expect(resolveInteractiveVideoChoiceTarget(
      { id: 'time', label: 'Jump', targetTimeSeconds: 44 },
      timeline,
    )).toBe(44);

    expect(resolveInteractiveVideoChoiceTarget(
      { id: 'node', label: 'Jump', targetInteractionId: 'required-poster' },
      timeline,
    )).toBe(30);
  });

  it('ignores backward branch targets unless explicitly allowed', () => {
    expect(resolveInteractiveVideoChoiceTarget(
      { id: 'rewind', label: 'Rewind', targetTimeSeconds: 5 },
      timeline,
      { sourceTimeSeconds: 47 },
    )).toBeNull();

    expect(resolveInteractiveVideoChoiceTarget(
      { id: 'rewind', label: 'Rewind', targetTimeSeconds: 5 },
      timeline,
      { sourceTimeSeconds: 47, allowBackwardSeek: true },
    )).toBe(5);
  });

  it('resolves review targets from a wrong branch answer', () => {
    const interaction: InteractiveVideoInteraction = {
      id: 'review-branch',
      type: 'branch',
      atSeconds: 47,
      adaptivity: { requireCorrectBeforeContinue: true },
      choices: [
        { id: 'wrong', label: 'Wrong', isCorrect: false, targetTimeSeconds: 5 },
        { id: 'right', label: 'Right', isCorrect: true },
      ],
    };

    expect(isInteractiveVideoReviewInteraction(interaction)).toBeTrue();
    expect(resolveInteractiveVideoReviewTarget(
      interaction,
      interaction.choices![0],
      timeline,
    )).toBe(5);
  });

  it('blocks forward seeks past watched time when required work remains', () => {
    const spec: InteractiveVideoSpec = {
      version: 2,
      enabled: true,
      behavior: { preventSkippingMode: 'forward' },
      timeline,
    };

    expect(shouldBlockInteractiveVideoSeek({
      spec,
      targetTimeSeconds: 90,
      furthestWatchedSeconds: 45,
      hasIncompleteRequiredInteractions: true,
    })).toBeTrue();

    expect(shouldBlockInteractiveVideoSeek({
      spec,
      targetTimeSeconds: 46,
      furthestWatchedSeconds: 45,
      hasIncompleteRequiredInteractions: true,
    })).toBeFalse();
  });
});
