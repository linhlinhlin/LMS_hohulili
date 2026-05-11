import type {
  InteractiveVideoInteraction,
  InteractiveVideoSpec,
} from '../../api/types/interactive-video.types';
import {
  evaluateInteractiveVideoDragDrop,
  evaluateInteractiveVideoFillBlank,
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

  it('keeps the seek gate open unless a forward skip exceeds watched progress with required work pending', () => {
    const guardedSpec: InteractiveVideoSpec = {
      version: 2,
      enabled: true,
      behavior: { preventSkippingMode: 'forward' },
      timeline,
    };
    const disabledSpec: InteractiveVideoSpec = {
      ...guardedSpec,
      behavior: { preventSkippingMode: 'none' },
    };

    expect(shouldBlockInteractiveVideoSeek({
      spec: guardedSpec,
      targetTimeSeconds: 49,
      furthestWatchedSeconds: 45,
      hasIncompleteRequiredInteractions: true,
      graceSeconds: 3,
    })).toBeTrue();

    expect(shouldBlockInteractiveVideoSeek({
      spec: guardedSpec,
      targetTimeSeconds: 48,
      furthestWatchedSeconds: 45,
      hasIncompleteRequiredInteractions: true,
      graceSeconds: 3,
    })).toBeFalse();

    expect(shouldBlockInteractiveVideoSeek({
      spec: guardedSpec,
      targetTimeSeconds: 120,
      furthestWatchedSeconds: 45,
      hasIncompleteRequiredInteractions: false,
    })).toBeFalse();

    expect(shouldBlockInteractiveVideoSeek({
      spec: disabledSpec,
      targetTimeSeconds: 120,
      furthestWatchedSeconds: 45,
      hasIncompleteRequiredInteractions: true,
    })).toBeFalse();
  });

  it('evaluates fill-blank answers with alternatives and case-insensitive matching by default', () => {
    const interaction: InteractiveVideoInteraction = {
      id: 'fill-blank',
      type: 'fill_blank',
      atSeconds: 12,
      fillBlank: {
        template: 'A {{1}} arrives at {{2}}.',
        blanks: [
          { id: '1', acceptedAnswers: ['Ship', 'Vessel'] },
          { id: '2', acceptedAnswers: ['harbor'] },
        ],
      },
    };

    const result = evaluateInteractiveVideoFillBlank(interaction, {
      '1': ' vessel ',
      '2': 'Harbor',
    });

    expect(result.correctCount).toBe(2);
    expect(result.totalCount).toBe(2);
    expect(result.allCorrect).toBeTrue();
  });

  it('respects case-sensitive fill-blank answers', () => {
    const interaction: InteractiveVideoInteraction = {
      id: 'fill-blank-case',
      type: 'fill_blank',
      atSeconds: 12,
      fillBlank: {
        template: '{{1}}',
        blanks: [{ id: '1', acceptedAnswers: ['VMU'] }],
        caseSensitive: true,
      },
    };

    const result = evaluateInteractiveVideoFillBlank(interaction, { '1': 'vmu' });

    expect(result.correctCount).toBe(0);
    expect(result.allCorrect).toBeFalse();
  });

  it('evaluates drag-drop placements against accepted drop zones', () => {
    const interaction: InteractiveVideoInteraction = {
      id: 'drag-drop',
      type: 'drag_drop',
      atSeconds: 32,
      dragDrop: {
        instruction: 'Place safety gear.',
        backgroundImage: { idOrUrl: 'ship.png' },
        dropZones: [
          {
            id: 'deck',
            label: 'Deck',
            xPercent: 10,
            yPercent: 20,
            widthPercent: 30,
            heightPercent: 20,
            correctDraggableIds: ['vest'],
          },
          {
            id: 'bridge',
            label: 'Bridge',
            xPercent: 60,
            yPercent: 20,
            widthPercent: 25,
            heightPercent: 20,
            correctDraggableIds: ['radio'],
          },
        ],
        draggables: [
          { id: 'vest', label: 'Life vest', acceptedDropZoneIds: ['deck'] },
          { id: 'radio', label: 'Radio', acceptedDropZoneIds: ['bridge'] },
        ],
      },
    };

    const result = evaluateInteractiveVideoDragDrop(interaction, {
      vest: 'deck',
      radio: 'deck',
    });

    expect(result.correctCount).toBe(1);
    expect(result.totalCount).toBe(2);
    expect(result.allCorrect).toBeFalse();
    expect(result.states.find(state => state.draggableId === 'radio')?.isCorrect).toBeFalse();
  });

  it('treats unplaced drag-drop distractors as correct in a single answer zone', () => {
    const interaction: InteractiveVideoInteraction = {
      id: 'drag-drop-selection',
      type: 'drag_drop',
      atSeconds: 32,
      dragDrop: {
        instruction: 'Select the correct gear.',
        backgroundImage: { idOrUrl: 'ship.png' },
        dropZones: [
          {
            id: 'answer-zone',
            label: 'Correct answers',
            xPercent: 50,
            yPercent: 50,
            widthPercent: 80,
            heightPercent: 72,
            correctDraggableIds: ['vest'],
          },
        ],
        draggables: [
          { id: 'vest', label: 'Life vest', acceptedDropZoneIds: ['answer-zone'] },
          { id: 'anchor', label: 'Anchor', acceptedDropZoneIds: [] },
        ],
      },
    };

    const selectedCorrectOnly = evaluateInteractiveVideoDragDrop(interaction, {
      vest: 'answer-zone',
      anchor: null,
    });
    expect(selectedCorrectOnly.correctCount).toBe(2);
    expect(selectedCorrectOnly.allCorrect).toBeTrue();

    const selectedDistractor = evaluateInteractiveVideoDragDrop(interaction, {
      vest: 'answer-zone',
      anchor: 'answer-zone',
    });
    expect(selectedDistractor.correctCount).toBe(1);
    expect(selectedDistractor.states.find(state => state.draggableId === 'anchor')?.isCorrect).toBeFalse();
  });
});
