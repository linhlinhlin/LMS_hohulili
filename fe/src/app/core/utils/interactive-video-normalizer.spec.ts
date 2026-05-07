import { normalizeInteractiveVideoSpecV2 } from './interactive-video-normalizer';

describe('interactive-video-normalizer', () => {
  it('normalizes a V1 interaction to V2 defaults', () => {
    const spec = normalizeInteractiveVideoSpecV2({
      version: 1,
      enabled: true,
      timeline: [
        {
          id: 'checkpoint-1',
          type: 'checkpoint',
          atSeconds: 12,
          title: 'Pause here',
        },
        {
          id: 'required-question',
          type: 'single_choice',
          atSeconds: 30,
          required: true,
          choices: [{ label: 'Ready', isCorrect: true }],
        },
      ],
    });

    expect(spec?.version).toBe(2);
    expect(spec?.behavior?.preventSkippingMode).toBe('none');
    expect(spec?.timeline[0]).toEqual(jasmine.objectContaining({
      id: 'checkpoint-1',
      displayType: 'button',
      position: jasmine.objectContaining({ xPercent: 50, yPercent: 50 }),
    }));
    expect(spec?.timeline[1]).toEqual(jasmine.objectContaining({
      id: 'required-question',
      displayType: 'poster',
    }));
  });

  it('clamps invalid positions into 0..100 percent', () => {
    const spec = normalizeInteractiveVideoSpecV2({
      enabled: true,
      timeline: [
        {
          type: 'checkpoint',
          atSeconds: 1,
          position: {
            xPercent: -40,
            yPercent: 130,
            widthPercent: 150,
            heightPercent: -10,
          },
        },
      ],
    });

    expect(spec?.timeline[0].position).toEqual({
      xPercent: 0,
      yPercent: 100,
      widthPercent: 100,
      heightPercent: 0,
    });
  });

  it('drops unsupported bookmark rows', () => {
    const spec = normalizeInteractiveVideoSpecV2({
      enabled: true,
      bookmarks: [
        { id: 'intro', timeSeconds: 10, label: 'Intro' },
        { id: 'missing-label', timeSeconds: 20 },
        { id: 'missing-time', label: 'No time' },
        'bad row',
      ],
      timeline: [{ type: 'checkpoint', atSeconds: 5 }],
    });

    expect(spec?.bookmarks).toEqual([
      { id: 'intro', timeSeconds: 10, label: 'Intro' },
    ]);
  });

  it('keeps existing branch target fields intact', () => {
    const spec = normalizeInteractiveVideoSpecV2({
      enabled: true,
      interactions: [
        {
          id: 'branch-1',
          type: 'branch',
          time: '42',
          choices: [
            {
              id: 'review',
              text: 'Review',
              targetTimeSeconds: '12',
              targetInteractionId: 'checkpoint-1',
            },
          ],
        },
      ],
    });

    expect(spec?.timeline[0].choices?.[0]).toEqual(jasmine.objectContaining({
      id: 'review',
      label: 'Review',
      targetTimeSeconds: 12,
      targetInteractionId: 'checkpoint-1',
    }));
  });
});
