import {
  exportInteractiveVideoBundle,
  exportInteractiveVideoH5PPackage,
  importInteractiveVideoBundle,
  readInteractiveVideoH5PPackage,
} from './interactive-video-interoperability';
import { buildInteractiveVideoAnalyticsProjection } from '../../../../core/utils/interactive-video-analytics';
import type {
  InteractiveVideoInteraction,
  InteractiveVideoRuntimeEvent,
  InteractiveVideoSpec,
} from '../../../../api/types/interactive-video.types';

describe('interactive-video-interoperability', () => {
  const timeline: InteractiveVideoInteraction[] = [
    {
      id: 'branch-1',
      type: 'branch',
      atSeconds: 42,
      title: 'Choose next step',
      pause: true,
      choices: [
        {
          id: 'a',
          label: 'Go to docking',
          isCorrect: true,
          feedback: 'Good route.',
          targetTimeSeconds: 120,
        },
        {
          id: 'b',
          label: 'Review safety',
          isCorrect: false,
          targetTimeSeconds: 20,
        },
      ],
    },
  ];

  it('exports native spec with H5P-compatible parameters', () => {
    const spec: InteractiveVideoSpec = { version: 1, enabled: true, timeline };

    const bundle = exportInteractiveVideoBundle(spec, 'https://cdn.example/video.mp4');

    const h5pInteraction = bundle.h5pParameters.interactiveVideo.assets.interactions[0];
    expect(bundle.format).toBe('holilihu.interactive-video.v1');
    expect(h5pInteraction.action.library).toBe('H5P.MultiChoice 1.16');
    expect(h5pInteraction.duration.from).toBe(42);
    expect(h5pInteraction.adaptivity?.correct?.seekTo).toBe(120);
    expect(bundle.h5pParameters.interactiveVideo.video?.files?.[0].mime).toBe('video/mp4');
  });

  it('imports H5P-style multichoice interactions into native spec', () => {
    const spec = importInteractiveVideoBundle({
      interactiveVideo: {
        assets: {
          interactions: [
            {
              x: 10,
              y: 10,
              duration: { from: 33, to: 33 },
              pause: true,
              displayType: 'poster',
              action: {
                library: 'H5P.MultiChoice 1.16',
                params: {
                  question: 'COLREG action?',
                  answers: [
                    {
                      text: 'Maintain course',
                      correct: true,
                      tipsAndFeedback: { chosenFeedback: 'Correct.' },
                    },
                    { text: 'Turn blindly', correct: false },
                  ],
                },
              },
            },
          ],
          bookmarks: [],
        },
      },
    });

    expect(spec?.timeline[0].type).toBe('single_choice');
    expect(spec?.timeline[0].atSeconds).toBe(33);
    expect(spec?.timeline[0].choices?.[0].label).toBe('Maintain course');
    expect(spec?.timeline[0].choices?.[0].feedback).toBe('Correct.');
  });

  it('round-trips H5P behaviour, real bookmarks, and end-screen summary', () => {
    const spec: InteractiveVideoSpec = {
      version: 2,
      enabled: true,
      behavior: {
        preventSkippingMode: 'both',
        showBookmarksOnLoad: true,
        showRewind10: true,
        pauseOnInteraction: false,
      },
      bookmarks: [
        { id: 'muster-bookmark', timeSeconds: 18, label: 'Muster checklist' },
        { id: 'abandon-bookmark', timeSeconds: 74, label: 'Abandon ship drill' },
      ],
      endScreen: {
        enabled: true,
        atSeconds: 180,
        requireAnswerBeforeSubmit: true,
        showScore: true,
        title: 'Final safety review',
        body: 'Confirm that the learner has reviewed all required emergency steps.',
      },
      timeline,
    };

    const bundle = exportInteractiveVideoBundle(spec, 'https://cdn.example/video.mp4');
    const h5pRoot = bundle.h5pParameters.interactiveVideo;

    expect(h5pRoot.behaviour).toEqual({
      preventSkipping: true,
      preventSkippingMode: 'both',
      showBookmarksMenuOnLoad: true,
      showRewind10: true,
      pauseOnInteractions: false,
    });
    expect(h5pRoot.assets.bookmarks).toEqual([
      { time: 18, label: 'Muster checklist' },
      { time: 74, label: 'Abandon ship drill' },
    ]);
    expect(h5pRoot.summary?.task?.params).toEqual({
      intro: 'Final safety review',
      summary: 'Confirm that the learner has reviewed all required emergency steps.',
      requireAnswerBeforeSubmit: true,
      showScore: true,
      atSeconds: 180,
    });

    const imported = importInteractiveVideoBundle(bundle.h5pParameters);

    expect(imported?.behavior).toEqual({
      preventSkippingMode: 'both',
      showBookmarksOnLoad: true,
      showRewind10: true,
      pauseOnInteraction: false,
    });
    expect(imported?.bookmarks).toEqual([
      { id: 'h5p-bookmark-1', timeSeconds: 18, label: 'Muster checklist' },
      { id: 'h5p-bookmark-2', timeSeconds: 74, label: 'Abandon ship drill' },
    ]);
    expect(imported?.endScreen).toEqual({
      enabled: true,
      atSeconds: 180,
      requireAnswerBeforeSubmit: true,
      showScore: true,
      title: 'Final safety review',
      body: 'Confirm that the learner has reviewed all required emergency steps.',
    });
  });

  it('exports a Shaka-safe H5P package boundary and imports it losslessly', async () => {
    const spec: InteractiveVideoSpec = { version: 1, enabled: true, timeline };

    const blob = await exportInteractiveVideoH5PPackage(spec, 'https://cdn.example/video.mpd', {
      title: 'Bridge handling',
      language: 'vi',
      authorName: 'Teacher',
    });
    const imported = await readInteractiveVideoH5PPackage(blob);

    expect(blob.type).toBe('application/h5p');
    expect(imported?.importedFrom).toBe('holilihu-sidecar');
    expect(imported?.h5pDefinition?.mainLibrary).toBe('H5P.InteractiveVideo');
    expect(imported?.h5pDefinition?.language).toBe('vi');
    expect(imported?.h5pParameters?.interactiveVideo.video?.files?.[0].mime).toBe('application/dash+xml');
    expect(imported?.spec.timeline[0].choices?.[0].targetTimeSeconds).toBe(120);
  });

  it('builds xAPI and Caliper projection metadata for event payloads', () => {
    const event: InteractiveVideoRuntimeEvent = {
      interactionId: 'branch-1',
      action: 'branch_taken',
      videoTimeSeconds: 43,
      data: { choiceId: 'a' },
    };

    const projection = buildInteractiveVideoAnalyticsProjection({
      lessonId: 'lesson-1',
      sectionId: 'section-1',
      interaction: timeline[0],
      event,
      occurredAtIso: '2026-05-06T00:00:00.000Z',
    });

    expect(projection.xapi.profile).toBe('https://w3id.org/xapi/video');
    expect(projection.xapi.verbId).toBe('http://adlnet.gov/expapi/verbs/interacted');
    expect(projection.caliper.action).toBe('JumpedTo');
    expect(projection.caliper.extensions['interactionType']).toBe('branch');
  });
});
