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

    expect(spec?.version).toBe(1);
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
