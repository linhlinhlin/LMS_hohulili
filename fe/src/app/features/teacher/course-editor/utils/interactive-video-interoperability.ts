import type {
  InteractiveVideoInteraction,
  InteractiveVideoSpec,
} from '../../../../api/types/interactive-video.types';
import { normalizeInteractiveVideoSpec, sortInteractiveVideoTimeline } from './interactive-video-authoring';

export interface InteractiveVideoInterchangeBundle {
  format: 'holilihu.interactive-video.v1';
  exportedAt: string;
  spec: InteractiveVideoSpec;
  h5pParameters: H5PInteractiveVideoParameters;
}

export interface H5PInteractiveVideoParameters {
  interactiveVideo: {
    video?: {
      files?: Array<{ path: string; mime?: string }>;
    };
    assets: {
      interactions: H5PInteractiveVideoInteraction[];
      bookmarks: Array<{ time: number; label: string }>;
    };
  };
}

export interface H5PInteractiveVideoInteraction {
  x: number;
  y: number;
  duration: { from: number; to: number };
  pause: boolean;
  displayType: 'poster' | 'button';
  action: {
    library: string;
    params: Record<string, unknown>;
  };
  adaptivity?: {
    correct?: { seekTo?: number };
    wrong?: { seekTo?: number };
  };
  metadata?: {
    holilihuInteractionId: string;
    holilihuInteractionType: string;
  };
}

export function exportInteractiveVideoBundle(
  spec: InteractiveVideoSpec,
  videoUrl: string | null,
): InteractiveVideoInterchangeBundle {
  const normalized = normalizeInteractiveVideoSpec(spec);
  if (!normalized) {
    throw new Error('Interactive video spec is empty.');
  }

  return {
    format: 'holilihu.interactive-video.v1',
    exportedAt: new Date().toISOString(),
    spec: normalized,
    h5pParameters: exportToH5PParameters(normalized, videoUrl),
  };
}

export function importInteractiveVideoBundle(value: unknown): InteractiveVideoSpec | null {
  const nativeSpec = normalizeInteractiveVideoSpec((value as { spec?: unknown } | null)?.spec ?? value);
  if (nativeSpec) {
    return nativeSpec;
  }

  const h5pInteractions = getH5PInteractions(value);
  if (h5pInteractions.length === 0) {
    return null;
  }

  return {
    version: 1,
    enabled: true,
    timeline: sortInteractiveVideoTimeline(
      h5pInteractions.map((interaction, index) => fromH5PInteraction(interaction, index)),
    ),
  };
}

function exportToH5PParameters(
  spec: InteractiveVideoSpec,
  videoUrl: string | null,
): H5PInteractiveVideoParameters {
  return {
    interactiveVideo: {
      video: videoUrl ? { files: [{ path: videoUrl, mime: inferMimeType(videoUrl) }] } : undefined,
      assets: {
        interactions: spec.timeline.map(toH5PInteraction),
        bookmarks: spec.timeline
          .filter(interaction => interaction.title)
          .map(interaction => ({
            time: interaction.atSeconds,
            label: interaction.title ?? interaction.id,
          })),
      },
    },
  };
}

function toH5PInteraction(interaction: InteractiveVideoInteraction): H5PInteractiveVideoInteraction {
  const choices = interaction.choices ?? [];
  const firstCorrect = choices.find(choice => choice.isCorrect === true);
  const firstWrong = choices.find(choice => choice.isCorrect !== true);

  return {
    x: 10,
    y: 10,
    duration: {
      from: interaction.atSeconds,
      to: interaction.endSeconds ?? interaction.atSeconds,
    },
    pause: interaction.pause !== false,
    displayType: 'poster',
    action: {
      library: interaction.type === 'single_choice' || interaction.type === 'branch'
        ? 'H5P.MultiChoice 1.16'
        : 'H5P.Text 1.1',
      params: interaction.type === 'single_choice' || interaction.type === 'branch'
        ? {
            question: interaction.title ?? interaction.body ?? '',
            answers: choices.map(choice => ({
              text: choice.label,
              correct: choice.isCorrect === true,
              tipsAndFeedback: {
                chosenFeedback: choice.feedback ?? '',
              },
            })),
          }
        : {
            text: interaction.body ?? interaction.title ?? '',
          },
    },
    adaptivity: interaction.type === 'branch'
      ? {
          correct: firstCorrect?.targetTimeSeconds == null
            ? undefined
            : { seekTo: firstCorrect.targetTimeSeconds },
          wrong: firstWrong?.targetTimeSeconds == null
            ? undefined
            : { seekTo: firstWrong.targetTimeSeconds },
        }
      : undefined,
    metadata: {
      holilihuInteractionId: interaction.id,
      holilihuInteractionType: interaction.type,
    },
  };
}

function fromH5PInteraction(
  interaction: H5PInteractiveVideoInteraction,
  index: number,
): InteractiveVideoInteraction {
  const params = interaction.action?.params ?? {};
  const answers = Array.isArray(params['answers'])
    ? params['answers'] as Array<Record<string, unknown>>
    : [];
  const hasChoices = answers.length > 0;
  const type = interaction.metadata?.holilihuInteractionType === 'branch'
    ? 'branch'
    : hasChoices
      ? 'single_choice'
      : 'checkpoint';

  return {
    id: interaction.metadata?.holilihuInteractionId || `h5p-${index + 1}`,
    type,
    atSeconds: toNumber(interaction.duration?.from, 0),
    endSeconds: interaction.duration?.to == null
      ? null
      : toNumber(interaction.duration.to, toNumber(interaction.duration?.from, 0)),
    title: toText(params['question']) ?? null,
    body: toText(params['text']) ?? toText(params['question']) ?? null,
    pause: interaction.pause !== false,
    required: false,
    choices: hasChoices
      ? answers.map((answer, answerIndex) => ({
          id: `h5p-${index + 1}-choice-${answerIndex + 1}`,
          label: toText(answer['text']) ?? `Choice ${answerIndex + 1}`,
          isCorrect: answer['correct'] === true,
          feedback: readH5PFeedback(answer),
          targetTimeSeconds: readH5PSeekTarget(interaction, answer['correct'] === true),
          targetInteractionId: null,
        }))
      : [],
    hotspots: [],
  };
}

function getH5PInteractions(value: unknown): H5PInteractiveVideoInteraction[] {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const source = value as {
    h5pParameters?: H5PInteractiveVideoParameters;
    interactiveVideo?: H5PInteractiveVideoParameters['interactiveVideo'];
  };
  const interactions = source.h5pParameters?.interactiveVideo?.assets?.interactions
    ?? source.interactiveVideo?.assets?.interactions
    ?? [];
  return Array.isArray(interactions) ? interactions : [];
}

function readH5PFeedback(answer: Record<string, unknown>): string | null {
  const feedback = answer['tipsAndFeedback'];
  if (!feedback || typeof feedback !== 'object') {
    return null;
  }
  return toText((feedback as Record<string, unknown>)['chosenFeedback']);
}

function readH5PSeekTarget(
  interaction: H5PInteractiveVideoInteraction,
  isCorrect: boolean,
): number | null {
  const target = isCorrect ? interaction.adaptivity?.correct?.seekTo : interaction.adaptivity?.wrong?.seekTo;
  return typeof target === 'number' && Number.isFinite(target) ? Math.max(0, Math.round(target)) : null;
}

function inferMimeType(url: string): string | undefined {
  const clean = url.split('?')[0]?.toLowerCase() ?? '';
  if (clean.endsWith('.mp4')) return 'video/mp4';
  if (clean.endsWith('.webm')) return 'video/webm';
  if (clean.endsWith('.m3u8')) return 'application/x-mpegURL';
  if (clean.endsWith('.mpd')) return 'application/dash+xml';
  return undefined;
}

function toText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toNumber(value: unknown, fallback: number): number {
  const next = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(next) ? Math.max(0, Math.round(next)) : fallback;
}
