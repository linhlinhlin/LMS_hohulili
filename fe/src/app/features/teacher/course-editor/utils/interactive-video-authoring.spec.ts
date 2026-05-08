import {
  buildInteractiveVideoSpec,
  createInteractiveVideoInteraction,
  createSuggestedInteractiveVideoInteractions,
  getInteractiveVideoAuthoringIssues,
  normalizeInteractiveVideoSpec,
  removeInteractiveVideoInteractionAndRetargetBranches,
  suggestNextInteractiveVideoTimeSeconds,
} from './interactive-video-authoring';
import type { InteractiveVideoInteraction } from '../../../../api/types/interactive-video.types';

describe('interactive-video-authoring', () => {
  it('creates a default single-choice interaction after the latest timestamp', () => {
    const existing: InteractiveVideoInteraction[] = [
      { id: 'a', type: 'checkpoint', atSeconds: 15, pause: true, required: false },
      { id: 'b', type: 'checkpoint', atSeconds: 45, pause: true, required: false },
    ];

    const created = createInteractiveVideoInteraction(existing, 'single_choice');

    expect(created.type).toBe('single_choice');
    expect(created.atSeconds).toBe(75);
    expect(created.choices?.length).toBe(2);
    expect(created.pause).toBeTrue();
  });

  it('creates a default fill-blank interaction with editable blanks', () => {
    const created = createInteractiveVideoInteraction([], 'fill_blank', {
      durationSeconds: 90,
    });

    expect(created.type).toBe('fill_blank');
    expect(created.choices).toEqual([]);
    expect(created.fillBlank?.template).toContain('{{1}}');
    expect(created.fillBlank?.blanks[0].acceptedAnswers[0]).toBe('đáp án 1');
  });

  it('creates a default drag-drop interaction with zones and draggable items', () => {
    const created = createInteractiveVideoInteraction([], 'drag_drop', {
      durationSeconds: 90,
    });

    expect(created.type).toBe('drag_drop');
    expect(created.choices).toEqual([]);
    expect(created.dragDrop?.dropZones.length).toBe(1);
    expect(created.dragDrop?.draggables.length).toBe(2);
    expect(created.dragDrop?.dropZones[0].widthPercent).toBeGreaterThan(60);
    expect(created.dragDrop?.dropZones[0].correctDraggableIds)
      .toEqual([created.dragDrop?.draggables[0].id as string]);
    expect(created.dragDrop?.draggables[0].acceptedDropZoneIds)
      .toEqual([created.dragDrop?.dropZones[0].id as string]);
    expect(created.dragDrop?.draggables[1].acceptedDropZoneIds).toEqual([]);
  });

  it('places the first interaction inside short videos instead of hard-coding 30s', () => {
    const created = createInteractiveVideoInteraction([], 'checkpoint', {
      durationSeconds: 15,
    });

    expect(created.atSeconds).toBe(8);
  });

  it('places the first interaction after the intro for long videos', () => {
    const created = createInteractiveVideoInteraction([], 'checkpoint', {
      durationSeconds: 22 * 60,
    });

    expect(created.atSeconds).toBe(30);
  });

  it('creates one duration-aware quick scaffold for very short videos', () => {
    const suggestions = createSuggestedInteractiveVideoInteractions([], {
      durationSeconds: 15,
    });

    expect(suggestions.length).toBe(1);
    expect(suggestions[0].atSeconds).toBe(8);
    expect(suggestions[0].type).toBe('checkpoint');
  });

  it('creates spaced quick scaffolds for a 22 minute lecture', () => {
    const suggestions = createSuggestedInteractiveVideoInteractions([], {
      durationSeconds: 22 * 60,
    });

    expect(suggestions.map(item => item.atSeconds)).toEqual([106, 370, 686, 1003, 1214]);
    expect(suggestions.some(item => item.type === 'single_choice')).toBeTrue();
  });

  it('skips quick scaffold points that are already covered nearby', () => {
    const existing: InteractiveVideoInteraction[] = [
      { id: 'near-intro', type: 'checkpoint', atSeconds: 100, pause: true, required: false },
    ];

    const suggestions = createSuggestedInteractiveVideoInteractions(existing, {
      durationSeconds: 22 * 60,
    });

    expect(suggestions.map(item => item.atSeconds)).not.toContain(106);
    expect(suggestions.length).toBe(4);
  });

  it('spreads later generated interactions into the largest remaining gap', () => {
    const existing: InteractiveVideoInteraction[] = [
      { id: 'intro', type: 'checkpoint', atSeconds: 30, pause: true, required: false },
    ];

    const next = suggestNextInteractiveVideoTimeSeconds(existing, {
      durationSeconds: 22 * 60,
    });

    expect(next).toBe(675);
  });

  it('keeps later generated interactions inside the known video duration', () => {
    const existing: InteractiveVideoInteraction[] = [
      { id: 'a', type: 'checkpoint', atSeconds: 6, pause: true, required: false },
      { id: 'b', type: 'checkpoint', atSeconds: 12, pause: true, required: false },
    ];

    const created = createInteractiveVideoInteraction(existing, 'branch', {
      durationSeconds: 15,
    });

    expect(created.atSeconds).toBeLessThan(15);
    expect(created.atSeconds).toBeGreaterThanOrEqual(0);
  });

  it('builds a sorted spec when enabled and returns null when disabled', () => {
    const timeline: InteractiveVideoInteraction[] = [
      { id: 'later', type: 'checkpoint', atSeconds: 90, title: 'Later', pause: true },
      { id: 'earlier', type: 'checkpoint', atSeconds: 30, title: 'Earlier', pause: true },
    ];

    expect(buildInteractiveVideoSpec(false, timeline)).toBeNull();

    const spec = buildInteractiveVideoSpec(true, timeline);

    expect(spec?.version).toBe(2);
    expect(spec?.enabled).toBeTrue();
    expect(spec?.timeline.map(item => item.id)).toEqual(['earlier', 'later']);
  });

  it('normalizes imported H5P-like aliases into the runtime schema', () => {
    const spec = normalizeInteractiveVideoSpec({
      enabled: true,
      interactions: [
        {
          id: 'q1',
          type: 'single_choice',
          time: 12.4,
          prompt: 'What is next?',
          choices: [
            { id: 'a', text: 'Correct', isCorrect: true },
            { id: 'b', text: 'Wrong', feedback: 'Review the previous step' },
          ],
        },
      ],
    });

    expect(spec?.timeline[0].atSeconds).toBe(12);
    expect(spec?.timeline[0].displayType).toBe('button');
    expect(spec?.timeline[0].body).toBe('What is next?');
    expect(spec?.timeline[0].choices?.map(choice => choice.label)).toEqual(['Correct', 'Wrong']);
  });

  it('reports blocking authoring issues before saving', () => {
    const timeline: InteractiveVideoInteraction[] = [
      {
        id: 'q1',
        type: 'single_choice',
        atSeconds: 120,
        title: 'Question',
        pause: true,
        required: true,
        choices: [
          { id: 'a', label: '', isCorrect: true },
          { id: 'b', label: 'Second option' },
        ],
      },
      {
        id: 'b1',
        type: 'branch',
        atSeconds: 10,
        title: 'Branch',
        pause: true,
        choices: [
          { id: 'go', label: 'Go', targetInteractionId: 'missing' },
          { id: 'stay', label: 'Stay', targetTimeSeconds: 20 },
        ],
      },
    ];

    const issues = getInteractiveVideoAuthoringIssues(true, timeline, { durationSeconds: 60 });

    expect(issues.some(issue => issue.code === 'interaction_after_duration')).toBeTrue();
    expect(issues.some(issue => issue.code === 'too_few_choices')).toBeTrue();
    expect(issues.some(issue => issue.code === 'blank_correct_answer')).toBeTrue();
    expect(issues.some(issue => issue.code === 'missing_branch_target')).toBeTrue();
  });

  it('reports fill-blank authoring errors for missing answers', () => {
    const timeline: InteractiveVideoInteraction[] = [
      {
        id: 'blank',
        type: 'fill_blank',
        atSeconds: 12,
        title: 'Fill blank',
        pause: true,
        fillBlank: {
          template: 'A {{1}} enters {{2}}.',
          blanks: [
            { id: '1', acceptedAnswers: ['ship'] },
            { id: '2', acceptedAnswers: [] },
          ],
        },
      },
    ];

    const issues = getInteractiveVideoAuthoringIssues(true, timeline, { durationSeconds: 90 });

    expect(issues.some(issue => issue.code === 'fill_blank_missing_answer')).toBeTrue();
  });

  it('reports drag-drop authoring errors for missing background and correct answers', () => {
    const timeline: InteractiveVideoInteraction[] = [
      {
        id: 'drag',
        type: 'drag_drop',
        atSeconds: 32,
        title: 'Drag drop',
        pause: true,
        dragDrop: {
          instruction: 'Place safety gear.',
          backgroundImage: null,
          dropZones: [
            {
              id: 'deck',
              label: 'Deck',
              xPercent: 20,
              yPercent: 30,
              widthPercent: 20,
              heightPercent: 20,
              correctDraggableIds: [],
            },
          ],
          draggables: [
            { id: 'vest', label: 'Life vest', image: null, acceptedDropZoneIds: [] },
          ],
        },
      },
    ];

    const issues = getInteractiveVideoAuthoringIssues(true, timeline, { durationSeconds: 90 });

    expect(issues.some(issue => issue.code === 'drag_drop_missing_background')).toBeTrue();
    expect(issues.some(issue => issue.code === 'drag_drop_missing_correct_answer')).toBeTrue();
  });

  it('surfaces teacher-friendly warnings without blocking a valid flow', () => {
    const timeline: InteractiveVideoInteraction[] = [
      {
        id: 'q1',
        type: 'single_choice',
        atSeconds: 12,
        title: '',
        body: '',
        pause: true,
        choices: [
          { id: 'a', label: 'Lựa chọn 1', isCorrect: true },
          { id: 'b', label: 'Lựa chọn 2' },
        ],
      },
      { id: 'pause', type: 'checkpoint', atSeconds: 12, title: 'Pause', pause: true },
    ];

    const issues = getInteractiveVideoAuthoringIssues(true, timeline, { durationSeconds: 90 });

    expect(issues.every(issue => issue.severity === 'warning')).toBeTrue();
    expect(issues.some(issue => issue.code === 'empty_student_copy')).toBeTrue();
    expect(issues.some(issue => issue.code === 'placeholder_choice_label')).toBeTrue();
    expect(issues.some(issue => issue.code === 'duplicate_timestamp')).toBeTrue();
  });

  it('allows review branches to send wrong answers back to earlier video', () => {
    const timeline: InteractiveVideoInteraction[] = [
      {
        id: 'branch',
        type: 'branch',
        atSeconds: 47,
        title: 'Branch',
        pause: true,
        adaptivity: { requireCorrectBeforeContinue: true },
        choices: [
          { id: 'a', label: 'Wrong', isCorrect: false, targetTimeSeconds: 5 },
          { id: 'b', label: 'Correct', isCorrect: true, targetTimeSeconds: null },
        ],
      },
    ];

    const issues = getInteractiveVideoAuthoringIssues(true, timeline, { durationSeconds: 120 });

    expect(issues.some(issue => issue.code === 'branch_rewinds')).toBeFalse();
    expect(issues.some(issue => issue.code === 'review_target_after_question')).toBeFalse();
  });

  it('blocks review targets that start after the question moment', () => {
    const timeline: InteractiveVideoInteraction[] = [
      {
        id: 'branch',
        type: 'branch',
        atSeconds: 47,
        title: 'Branch',
        pause: true,
        adaptivity: { requireCorrectBeforeContinue: true },
        choices: [
          { id: 'a', label: 'Wrong', isCorrect: false, targetTimeSeconds: 60 },
          { id: 'b', label: 'Correct', isCorrect: true },
        ],
      },
    ];

    const issues = getInteractiveVideoAuthoringIssues(true, timeline, { durationSeconds: 120 });
    const reviewIssue = issues.find(issue => issue.code === 'review_target_after_question');

    expect(reviewIssue?.severity).toBe('error');
    expect(reviewIssue?.choiceId).toBe('a');
  });

  it('retargets branches to the removed timestamp when deleting an interaction', () => {
    const timeline: InteractiveVideoInteraction[] = [
      { id: 'branch', type: 'branch', atSeconds: 10, pause: true, choices: [
        { id: 'a', label: 'Next', targetInteractionId: 'target', targetTimeSeconds: null },
      ] },
      { id: 'target', type: 'checkpoint', atSeconds: 45, title: 'Target', pause: true },
    ];

    const next = removeInteractiveVideoInteractionAndRetargetBranches(timeline, 'target');
    const choice = next[0].choices?.[0];

    expect(next.map(interaction => interaction.id)).toEqual(['branch']);
    expect(choice?.targetInteractionId).toBeNull();
    expect(choice?.targetTimeSeconds).toBe(45);
  });
});
