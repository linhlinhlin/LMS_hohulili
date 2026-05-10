import type {
  InteractiveVideoInteraction,
  InteractiveVideoSpec,
} from '../../../../api/types/interactive-video.types';
import { normalizeInteractiveVideoSpecV2 } from '../../../../core/utils/interactive-video-normalizer';
import { sortInteractiveVideoTimeline } from './interactive-video-authoring';

type H5PZipInput = Blob | ArrayBuffer | Uint8Array;

interface ZipFileEntry {
  async(type: 'string'): Promise<string>;
}

interface ZipArchive {
  file(path: string): ZipFileEntry | null;
  file(path: string, data: string): ZipArchive;
  folder(path: string): ZipArchive | null;
  generateAsync(options: {
    type: 'blob';
    compression?: 'STORE' | 'DEFLATE';
    compressionOptions?: { level: number };
    mimeType?: string;
  }): Promise<Blob>;
}

interface JSZipConstructor {
  new(): ZipArchive;
  loadAsync(data: H5PZipInput, options?: { checkCRC32?: boolean }): Promise<ZipArchive>;
}

const H5P_MAIN_LIBRARY = {
  machineName: 'H5P.InteractiveVideo',
  majorVersion: 1,
  minorVersion: 27,
} as const;

const H5P_INTERACTION_DEPENDENCIES = [
  { machineName: 'H5P.MultiChoice', majorVersion: 1, minorVersion: 16 },
  { machineName: 'H5P.Text', majorVersion: 1, minorVersion: 1 },
] as const;

export interface InteractiveVideoInterchangeBundle {
  format: 'holilihu.interactive-video.v1';
  exportedAt: string;
  spec: InteractiveVideoSpec;
  h5pParameters: H5PInteractiveVideoParameters;
}

export interface H5PPackageExportOptions {
  title?: string | null;
  language?: string | null;
  authorName?: string | null;
  source?: string | null;
}

export interface H5PPackageDefinition {
  title: string;
  mainLibrary: string;
  language: string;
  preloadedDependencies: Array<{
    machineName: string;
    majorVersion: number;
    minorVersion: number;
  }>;
  embedTypes: Array<'div' | 'iframe'>;
  authors?: Array<{ name: string; role: 'Author' }>;
  source?: string;
  license?: 'U';
}

export interface InteractiveVideoH5PPackageImportResult {
  spec: InteractiveVideoSpec;
  h5pDefinition: H5PPackageDefinition | null;
  h5pParameters: H5PInteractiveVideoParameters | null;
  importedFrom: 'holilihu-sidecar' | 'h5p-content';
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
  width?: number;
  height?: number;
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
  const normalized = normalizeInteractiveVideoSpecV2(spec);
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
  const nativeSpec = normalizeInteractiveVideoSpecV2((value as { spec?: unknown } | null)?.spec ?? value);
  if (nativeSpec) {
    return nativeSpec;
  }

  const h5pInteractions = getH5PInteractions(value);
  if (h5pInteractions.length === 0) {
    return null;
  }

  return normalizeInteractiveVideoSpecV2({
    version: 2,
    enabled: true,
    timeline: sortInteractiveVideoTimeline(
      h5pInteractions.map((interaction, index) => fromH5PInteraction(interaction, index)),
    ),
  });
}

export async function exportInteractiveVideoH5PPackage(
  spec: InteractiveVideoSpec,
  videoUrl: string | null,
  options: H5PPackageExportOptions = {},
): Promise<Blob> {
  const JSZip = await loadJsZip();
  const zip = new JSZip();
  const bundle = exportInteractiveVideoBundle(spec, videoUrl);
  const h5pDefinition = buildH5PPackageDefinition(bundle.spec, options);
  const contentFolder = zip.folder('content');
  if (!contentFolder) {
    throw new Error('Unable to create H5P content folder.');
  }

  zip.file('h5p.json', toPrettyJson(h5pDefinition));
  contentFolder.file('content.json', toPrettyJson(bundle.h5pParameters));
  contentFolder.file('holilihu-interactive-video.json', toPrettyJson(bundle));

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    mimeType: 'application/h5p',
  });
}

export async function importInteractiveVideoH5PPackage(
  input: H5PZipInput,
): Promise<InteractiveVideoSpec | null> {
  return (await readInteractiveVideoH5PPackage(input))?.spec ?? null;
}

export async function readInteractiveVideoH5PPackage(
  input: H5PZipInput,
): Promise<InteractiveVideoH5PPackageImportResult | null> {
  const JSZip = await loadJsZip();
  const zip = await JSZip.loadAsync(input, { checkCRC32: true });
  const h5pDefinition = toH5PPackageDefinition(await readJsonEntry(zip, 'h5p.json'));
  const nativeBundle = await readJsonEntry(zip, 'content/holilihu-interactive-video.json');
  const nativeSpec = importInteractiveVideoBundle(nativeBundle);
  const h5pContent = await readJsonEntry(zip, 'content/content.json')
    ?? await readJsonEntry(zip, 'content.json');
  const h5pParameters = toH5PParameters(h5pContent);

  if (nativeSpec) {
    return {
      spec: nativeSpec,
      h5pDefinition,
      h5pParameters,
      importedFrom: 'holilihu-sidecar',
    };
  }

  const h5pSpec = importInteractiveVideoBundle(h5pContent);
  if (!h5pSpec) {
    return null;
  }

  return {
    spec: h5pSpec,
    h5pDefinition,
    h5pParameters,
    importedFrom: 'h5p-content',
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
  const position = interaction.position ?? null;
  const displayType = interaction.displayType === 'button' ? 'button' : 'poster';

  return {
    // Map HoliLihu's percent-based InteractiveVideoPosition into H5P's spatial
    // fields. Falling back to centre (50, 50) keeps imports without explicit
    // position visible rather than collapsed onto the top-left corner.
    x: clampH5PPercent(position?.xPercent, 50),
    y: clampH5PPercent(position?.yPercent, 50),
    width: position?.widthPercent == null ? undefined : clampH5PPercent(position.widthPercent, 0),
    height: position?.heightPercent == null ? undefined : clampH5PPercent(position.heightPercent, 0),
    duration: {
      from: interaction.atSeconds,
      to: interaction.endSeconds ?? interaction.atSeconds,
    },
    pause: interaction.pause !== false,
    displayType,
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
    displayType: interaction.displayType === 'button' ? 'button' : 'poster',
    // Restore spatial placement; H5P encodes percent values directly on the
    // interaction record. Without this, every imported interaction collapses
    // onto the same centre point in HoliLihu's canvas.
    position: readH5PPosition(interaction),
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

function readH5PPosition(interaction: H5PInteractiveVideoInteraction): InteractiveVideoInteraction['position'] {
  const xPercent = clampH5PPercent(interaction.x, NaN);
  const yPercent = clampH5PPercent(interaction.y, NaN);
  if (!Number.isFinite(xPercent) || !Number.isFinite(yPercent)) {
    return null;
  }
  return {
    xPercent,
    yPercent,
    widthPercent: interaction.width == null ? null : clampH5PPercent(interaction.width, 0),
    heightPercent: interaction.height == null ? null : clampH5PPercent(interaction.height, 0),
  };
}

function clampH5PPercent(value: unknown, fallback: number): number {
  const next = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(next)) {
    return fallback;
  }
  return Math.min(100, Math.max(0, Math.round(next)));
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

function buildH5PPackageDefinition(
  spec: InteractiveVideoSpec,
  options: H5PPackageExportOptions,
): H5PPackageDefinition {
  const authorName = toText(options.authorName);
  return {
    title: toText(options.title) ?? spec.timeline[0]?.title ?? 'HoliLihu Interactive Video',
    mainLibrary: H5P_MAIN_LIBRARY.machineName,
    language: normalizeLanguage(options.language),
    preloadedDependencies: [
      H5P_MAIN_LIBRARY,
      ...H5P_INTERACTION_DEPENDENCIES,
    ].map(dependency => ({ ...dependency })),
    embedTypes: ['div'],
    authors: authorName ? [{ name: authorName, role: 'Author' }] : undefined,
    source: toText(options.source) ?? undefined,
    license: 'U',
  };
}

async function readJsonEntry(zip: ZipArchive, path: string): Promise<unknown | null> {
  const file = zip.file(path);
  if (!file) {
    return null;
  }

  try {
    return JSON.parse(await file.async('string'));
  } catch {
    return null;
  }
}

function toH5PPackageDefinition(value: unknown): H5PPackageDefinition | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Partial<H5PPackageDefinition>;
  const title = toText(source.title);
  const mainLibrary = toText(source.mainLibrary);
  if (!title || !mainLibrary) {
    return null;
  }

  return {
    title,
    mainLibrary,
    language: normalizeLanguage(source.language),
    preloadedDependencies: Array.isArray(source.preloadedDependencies)
      ? source.preloadedDependencies
          .map(toH5PDependency)
          .filter((dependency): dependency is H5PPackageDefinition['preloadedDependencies'][number] => !!dependency)
      : [],
    embedTypes: Array.isArray(source.embedTypes)
      ? source.embedTypes.filter((type): type is 'div' | 'iframe' => type === 'div' || type === 'iframe')
      : ['div'],
    authors: Array.isArray(source.authors)
      ? source.authors
          .map(author => ({ name: toText(author.name), role: author.role }))
          .filter((author): author is { name: string; role: 'Author' } =>
            !!author.name && author.role === 'Author',
          )
      : undefined,
    source: toText(source.source) ?? undefined,
    license: source.license === 'U' ? 'U' : undefined,
  };
}

function toH5PDependency(value: unknown): H5PPackageDefinition['preloadedDependencies'][number] | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  const machineName = toText(source['machineName']);
  const majorVersion = toNumber(source['majorVersion'], Number.NaN);
  const minorVersion = toNumber(source['minorVersion'], Number.NaN);
  if (!machineName || !Number.isFinite(majorVersion) || !Number.isFinite(minorVersion)) {
    return null;
  }

  return { machineName, majorVersion, minorVersion };
}

function toH5PParameters(value: unknown): H5PInteractiveVideoParameters | null {
  return getH5PInteractions(value).length > 0 ? value as H5PInteractiveVideoParameters : null;
}

async function loadJsZip(): Promise<JSZipConstructor> {
  const module = await import('jszip') as unknown as { default?: JSZipConstructor } & JSZipConstructor;
  return module.default ?? module;
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

function normalizeLanguage(value: unknown): string {
  const language = toText(value);
  return language && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(language) ? language : 'und';
}

function toPrettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
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
