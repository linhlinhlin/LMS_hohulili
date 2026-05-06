import {
  buildInteractiveVideoSpec,
  createInteractiveVideoInteraction,
  normalizeInteractiveVideoSpec,
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
});
