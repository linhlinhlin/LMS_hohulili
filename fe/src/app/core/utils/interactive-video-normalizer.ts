import type {
  InteractiveVideoAction,
  InteractiveVideoAdaptivity,
  InteractiveVideoBehavior,
  InteractiveVideoBookmark,
  InteractiveVideoChoice,
  InteractiveVideoDisplayType,
  InteractiveVideoEndScreen,
  InteractiveVideoHotspot,
  InteractiveVideoInteraction,
  InteractiveVideoInteractionType,
  InteractiveVideoPosition,
  InteractiveVideoPreventSkippingMode,
  InteractiveVideoSpec,
} from '../../api/types/interactive-video.types';

const DEFAULT_PREVENT_SKIPPING_MODE: InteractiveVideoPreventSkippingMode = 'none';
const DEFAULT_POSITION: InteractiveVideoPosition = {
  xPercent: 50,
  yPercent: 50,
};

export function normalizeInteractiveVideoSpecV2(value: unknown): InteractiveVideoSpec | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawTimeline = Array.isArray(value['timeline'])
    ? value['timeline']
    : Array.isArray(value['interactions'])
      ? value['interactions']
      : [];
  const timeline = rawTimeline
    .map((item, index) => normalizeInteractiveVideoInteractionV2(item, index))
    .filter(isInteraction)
    .sort((a, b) => a.atSeconds - b.atSeconds);
  const enabled = value['enabled'] == null ? timeline.length > 0 : value['enabled'] !== false;

  if (!enabled && timeline.length === 0) {
    return null;
  }

  return {
    version: 2,
    enabled,
    behavior: normalizeBehavior(value['behavior']),
    bookmarks: normalizeBookmarks(value['bookmarks']),
    endScreen: normalizeEndScreen(value['endScreen']),
    timeline,
  };
}

export function normalizeInteractiveVideoInteractionV2(
  value: unknown,
  index = 0,
): InteractiveVideoInteraction | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = normalizeInteractionType(value['type']);
  const atSeconds = toNonNegativeInteger(
    value['atSeconds'] ?? value['timeSeconds'] ?? value['time'] ?? value['timestampSeconds'],
    0,
  );
  const choices = normalizeChoices(value['choices']);
  const required = value['required'] === true;

  return {
    id: toTrimmedText(value['id']) ?? `interaction-${index + 1}`,
    type,
    atSeconds,
    endSeconds: value['endSeconds'] == null
      ? null
      : toNonNegativeInteger(value['endSeconds'], atSeconds),
    title: toTrimmedText(value['title']),
    body: toTrimmedText(value['body'] ?? value['prompt'] ?? value['description']),
    pause: value['pause'] !== false,
    required,
    displayType: normalizeDisplayType(value['displayType'], required),
    position: normalizePosition(value['position'], value),
    choices,
    hotspots: normalizeHotspots(value['hotspots']),
    adaptivity: normalizeAdaptivity(value['adaptivity']),
  };
}

function normalizeBehavior(value: unknown): InteractiveVideoBehavior {
  if (!isRecord(value)) {
    return { preventSkippingMode: DEFAULT_PREVENT_SKIPPING_MODE };
  }

  return {
    preventSkippingMode: normalizePreventSkippingMode(value['preventSkippingMode']),
    showBookmarksOnLoad: value['showBookmarksOnLoad'] === true,
    showRewind10: value['showRewind10'] === true,
    pauseOnInteraction: value['pauseOnInteraction'] === true,
  };
}

function normalizeBookmarks(value: unknown): InteractiveVideoBookmark[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index): InteractiveVideoBookmark | null => {
      if (!isRecord(item)) {
        return null;
      }
      const label = toTrimmedText(item['label'] ?? item['title']);
      const timeSeconds = toFiniteNumber(item['timeSeconds'] ?? item['time'], Number.NaN);
      if (!label || !Number.isFinite(timeSeconds)) {
        return null;
      }
      return {
        id: toTrimmedText(item['id']) ?? `bookmark-${index + 1}`,
        timeSeconds: Math.max(0, Math.round(timeSeconds)),
        label,
      };
    })
    .filter(isBookmark)
    .sort((a, b) => a.timeSeconds - b.timeSeconds);
}

function normalizeEndScreen(value: unknown): InteractiveVideoEndScreen | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    enabled: value['enabled'] !== false,
    atSeconds: value['atSeconds'] == null
      ? null
      : toNonNegativeInteger(value['atSeconds'], 0),
    requireAnswerBeforeSubmit: value['requireAnswerBeforeSubmit'] === true,
    showScore: value['showScore'] === true,
    title: toTrimmedText(value['title']),
    body: toTrimmedText(value['body']),
  };
}

function normalizeDisplayType(
  value: unknown,
  required: boolean,
): InteractiveVideoDisplayType {
  return value === 'button' || value === 'poster'
    ? value
    : required
      ? 'poster'
      : 'button';
}

function normalizePosition(
  value: unknown,
  fallbackSource: Record<string, unknown>,
): InteractiveVideoPosition {
  const source = isRecord(value) ? value : fallbackSource;
  const width = source['widthPercent'] ?? source['width'];
  const height = source['heightPercent'] ?? source['height'];

  return {
    xPercent: clampPercent(source['xPercent'] ?? source['x'], DEFAULT_POSITION.xPercent),
    yPercent: clampPercent(source['yPercent'] ?? source['y'], DEFAULT_POSITION.yPercent),
    widthPercent: width == null ? null : clampPercent(width, 0),
    heightPercent: height == null ? null : clampPercent(height, 0),
  };
}

function normalizeChoices(value: unknown): InteractiveVideoChoice[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index): InteractiveVideoChoice | null => {
      if (!isRecord(item)) {
        return null;
      }

      return {
        id: toTrimmedText(item['id']) ?? `choice-${index + 1}`,
        label: toTrimmedText(item['label'] ?? item['text']) ?? `Choice ${index + 1}`,
        feedback: toTrimmedText(item['feedback']),
        isCorrect: item['isCorrect'] === true || item['correct'] === true,
        targetTimeSeconds: item['targetTimeSeconds'] == null
          ? null
          : toNonNegativeInteger(item['targetTimeSeconds'], 0),
        targetInteractionId: toTrimmedText(item['targetInteractionId']),
      };
    })
    .filter(isChoice);
}

function normalizeHotspots(value: unknown): InteractiveVideoHotspot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): InteractiveVideoHotspot | null => {
      if (!isRecord(item)) {
        return null;
      }

      return {
        xPercent: clampPercent(item['xPercent'] ?? item['x'], 0),
        yPercent: clampPercent(item['yPercent'] ?? item['y'], 0),
        widthPercent: item['widthPercent'] == null
          ? undefined
          : clampPercent(item['widthPercent'], 0),
        heightPercent: item['heightPercent'] == null
          ? undefined
          : clampPercent(item['heightPercent'], 0),
        label: toTrimmedText(item['label']),
        targetTimeSeconds: item['targetTimeSeconds'] == null
          ? null
          : toNonNegativeInteger(item['targetTimeSeconds'], 0),
      };
    })
    .filter(isHotspot);
}

function normalizeAdaptivity(value: unknown): InteractiveVideoAdaptivity | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    requireCorrectBeforeContinue: value['requireCorrectBeforeContinue'] === true,
    onCorrect: normalizeAction(value['onCorrect']),
    onWrong: normalizeAction(value['onWrong']),
    allowOptOut: value['allowOptOut'] === true,
  };
}

function normalizeAction(value: unknown): InteractiveVideoAction | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = value['type'] === 'seek' || value['type'] === 'interaction'
    ? value['type']
    : 'continue';
  return {
    type,
    targetTimeSeconds: value['targetTimeSeconds'] == null
      ? null
      : toNonNegativeInteger(value['targetTimeSeconds'], 0),
    targetInteractionId: toTrimmedText(value['targetInteractionId']),
    message: toTrimmedText(value['message']),
  };
}

function normalizeInteractionType(value: unknown): InteractiveVideoInteractionType {
  return value === 'single_choice' || value === 'branch' || value === 'hotspot'
    ? value
    : 'checkpoint';
}

function normalizePreventSkippingMode(value: unknown): InteractiveVideoPreventSkippingMode {
  return value === 'forward' || value === 'both'
    ? value
    : DEFAULT_PREVENT_SKIPPING_MODE;
}

function clampPercent(value: unknown, fallback: number): number {
  return Math.min(100, Math.max(0, toFiniteNumber(value, fallback)));
}

function toNonNegativeInteger(value: unknown, fallback: number): number {
  return Math.max(0, Math.round(toFiniteNumber(value, fallback)));
}

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toTrimmedText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const text = value.trim();
  return text ? text : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isInteraction(value: InteractiveVideoInteraction | null): value is InteractiveVideoInteraction {
  return value != null;
}

function isBookmark(value: InteractiveVideoBookmark | null): value is InteractiveVideoBookmark {
  return value != null;
}

function isChoice(value: InteractiveVideoChoice | null): value is InteractiveVideoChoice {
  return value != null;
}

function isHotspot(value: InteractiveVideoHotspot | null): value is InteractiveVideoHotspot {
  return value != null;
}
