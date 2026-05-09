import type {
  InteractiveVideoAction,
  InteractiveVideoAdaptivity,
  InteractiveVideoBehavior,
  InteractiveVideoBookmark,
  InteractiveVideoChoice,
  InteractiveVideoDisplayType,
  InteractiveVideoDragDrop,
  InteractiveVideoDragDropDraggable,
  InteractiveVideoDragDropMedia,
  InteractiveVideoDragDropZone,
  InteractiveVideoEndScreen,
  InteractiveVideoFillBlank,
  InteractiveVideoFillBlankBlank,
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
  const body = toTrimmedText(value['body'] ?? value['prompt'] ?? value['description']);

  return {
    id: toTrimmedText(value['id']) ?? `interaction-${index + 1}`,
    type,
    atSeconds,
    endSeconds: value['endSeconds'] == null
      ? null
      : toNonNegativeInteger(value['endSeconds'], atSeconds),
    title: toTrimmedText(value['title']),
    body,
    pause: value['pause'] !== false,
    required,
    displayType: normalizeDisplayType(value['displayType'], required),
    position: normalizePosition(value['position'], value),
    choices,
    hotspots: normalizeHotspots(value['hotspots']),
    fillBlank: type === 'fill_blank'
      ? normalizeFillBlank(value['fillBlank'] ?? value['fillBlankQuestion'], body)
      : null,
    dragDrop: type === 'drag_drop'
      ? normalizeDragDrop(value['dragDrop'] ?? value['dragDropQuestion'], body)
      : null,
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

function normalizeFillBlank(value: unknown, fallbackTemplate: string | null): InteractiveVideoFillBlank {
  const source = isRecord(value) ? value : {};
  const template = toTrimmedText(source['template'] ?? source['text'] ?? source['prompt'])
    ?? fallbackTemplate
    ?? '';
  const placeholderIds = extractFillBlankPlaceholderIds(template);
  const blanks = mergeTemplatePlaceholders(
    normalizeFillBlankBlanks(source['blanks'] ?? source['answers']),
    placeholderIds,
  );

  return {
    template,
    blanks,
    caseSensitive: source['caseSensitive'] === true,
    enableRetry: source['enableRetry'] !== false,
    enableShowSolution: source['enableShowSolution'] !== false,
    requireAllCorrectBeforeContinue: source['requireAllCorrectBeforeContinue'] === true,
  };
}

function normalizeFillBlankBlanks(value: unknown): InteractiveVideoFillBlankBlank[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index): InteractiveVideoFillBlankBlank | null => {
      if (typeof item === 'string') {
        return {
          id: `${index + 1}`,
          acceptedAnswers: [item.trim()].filter(Boolean),
        };
      }
      if (!isRecord(item)) {
        return null;
      }

      return {
        id: toTrimmedText(item['id'] ?? item['key'] ?? item['name']) ?? `${index + 1}`,
        acceptedAnswers: normalizeAcceptedAnswers(
          item['acceptedAnswers'] ?? item['answers'] ?? item['answer'] ?? item['correctAnswer'],
        ),
      };
    })
    .filter(isFillBlankBlank);
}

function normalizeAcceptedAnswers(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(item => typeof item === 'string' ? item.trim() : '')
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split('|')
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeDragDrop(value: unknown, fallbackInstruction: string | null): InteractiveVideoDragDrop {
  const source = isRecord(value) ? value : {};
  const rawDropZones = source['dropZones'] ?? source['zones'];
  const rawDraggables = source['draggables'] ?? source['items'];
  const dropZones = normalizeDragDropZones(rawDropZones);
  const draggables = normalizeDragDropDraggables(rawDraggables, dropZones);
  const synced = syncDragDropAnswerMaps(dropZones, draggables);

  return {
    instruction: toTrimmedText(source['instruction'] ?? source['prompt'] ?? source['description'])
      ?? fallbackInstruction
      ?? '',
    backgroundImage: normalizeDragDropMedia(source['backgroundImage'] ?? source['image'] ?? source['background']),
    dropZones: synced.dropZones,
    draggables: synced.draggables,
    enableRetry: source['enableRetry'] !== false,
    enableShowSolution: source['enableShowSolution'] !== false,
    requireAllCorrectBeforeContinue: source['requireAllCorrectBeforeContinue'] === true,
  };
}

function normalizeDragDropZones(value: unknown): InteractiveVideoDragDropZone[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index): InteractiveVideoDragDropZone | null => {
      if (!isRecord(item)) {
        return null;
      }

      return {
        id: toTrimmedText(item['id'] ?? item['key'] ?? item['name']) ?? `zone-${index + 1}`,
        label: toTrimmedText(item['label'] ?? item['title'] ?? item['name']) ?? `Vùng ${index + 1}`,
        xPercent: clampPercent(item['xPercent'] ?? item['x'], 10),
        yPercent: clampPercent(item['yPercent'] ?? item['y'], 10),
        widthPercent: clampPercent(item['widthPercent'] ?? item['width'], 28),
        heightPercent: clampPercent(item['heightPercent'] ?? item['height'], 22),
        correctDraggableIds: normalizeIdList(item['correctDraggableIds'] ?? item['correctItems'] ?? item['answers']),
      };
    })
    .filter(isDragDropZone);
}

function normalizeDragDropDraggables(
  value: unknown,
  dropZones: InteractiveVideoDragDropZone[],
): InteractiveVideoDragDropDraggable[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const zoneIds = new Set(dropZones.map(zone => zone.id));
  return value
    .map((item, index): InteractiveVideoDragDropDraggable | null => {
      if (!isRecord(item)) {
        return null;
      }
      const id = toTrimmedText(item['id'] ?? item['key'] ?? item['name']) ?? `drag-${index + 1}`;
      const acceptedDropZoneIds = normalizeIdList(
        item['acceptedDropZoneIds'] ?? item['dropZoneIds'] ?? item['correctZoneIds'] ?? item['answers'],
      ).filter(zoneId => zoneIds.size === 0 || zoneIds.has(zoneId));

      return {
        id,
        label: toTrimmedText(item['label'] ?? item['title'] ?? item['text']) ?? `Vật kéo ${index + 1}`,
        image: normalizeDragDropMedia(item['image'] ?? item['media'] ?? item['imageUrl']),
        acceptedDropZoneIds,
      };
    })
    .filter(isDragDropDraggable);
}

function normalizeDragDropMedia(value: unknown): InteractiveVideoDragDropMedia | null {
  if (typeof value === 'string') {
    const idOrUrl = value.trim();
    return idOrUrl ? { idOrUrl } : null;
  }
  if (!isRecord(value)) {
    return null;
  }

  const idOrUrl = toTrimmedText(value['idOrUrl'] ?? value['url'] ?? value['id'] ?? value['uuid']);
  if (!idOrUrl) {
    return null;
  }

  return {
    idOrUrl,
    alt: toTrimmedText(value['alt'] ?? value['label']),
  };
}

function syncDragDropAnswerMaps(
  dropZones: InteractiveVideoDragDropZone[],
  draggables: InteractiveVideoDragDropDraggable[],
): { dropZones: InteractiveVideoDragDropZone[]; draggables: InteractiveVideoDragDropDraggable[] } {
  const zoneIds = new Set(dropZones.map(zone => zone.id));
  const draggableIds = new Set(draggables.map(item => item.id));
  const acceptedByDraggable = new Map<string, Set<string>>();

  for (const draggable of draggables) {
    acceptedByDraggable.set(
      draggable.id,
      new Set(draggable.acceptedDropZoneIds.filter(zoneId => zoneIds.has(zoneId))),
    );
  }

  for (const zone of dropZones) {
    for (const draggableId of zone.correctDraggableIds) {
      if (!draggableIds.has(draggableId)) {
        continue;
      }
      const accepted = acceptedByDraggable.get(draggableId) ?? new Set<string>();
      accepted.add(zone.id);
      acceptedByDraggable.set(draggableId, accepted);
    }
  }

  const nextDraggables = draggables.map(draggable => ({
    ...draggable,
    acceptedDropZoneIds: [...(acceptedByDraggable.get(draggable.id) ?? new Set<string>())],
  }));
  const nextDropZones = dropZones.map(zone => ({
    ...zone,
    correctDraggableIds: nextDraggables
      .filter(draggable => draggable.acceptedDropZoneIds.includes(zone.id))
      .map(draggable => draggable.id),
  }));

  return { dropZones: nextDropZones, draggables: nextDraggables };
}

function normalizeIdList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(item => typeof item === 'string' ? item.trim() : '')
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split('|')
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function mergeTemplatePlaceholders(
  blanks: InteractiveVideoFillBlankBlank[],
  placeholderIds: string[],
): InteractiveVideoFillBlankBlank[] {
  const byId = new Map(blanks.map(blank => [blank.id, blank]));
  const ordered: InteractiveVideoFillBlankBlank[] = [];

  for (const id of placeholderIds) {
    ordered.push(byId.get(id) ?? { id, acceptedAnswers: [] });
    byId.delete(id);
  }

  return [...ordered, ...byId.values()];
}

function extractFillBlankPlaceholderIds(template: string): string[] {
  const ids: string[] = [];
  const pattern = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(template)) != null) {
    if (!ids.includes(match[1])) {
      ids.push(match[1]);
    }
  }
  return ids;
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
  return value === 'single_choice'
    || value === 'branch'
    || value === 'hotspot'
    || value === 'fill_blank'
    || value === 'drag_drop'
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

function isFillBlankBlank(value: InteractiveVideoFillBlankBlank | null): value is InteractiveVideoFillBlankBlank {
  return value != null;
}

function isDragDropZone(value: InteractiveVideoDragDropZone | null): value is InteractiveVideoDragDropZone {
  return value != null;
}

function isDragDropDraggable(
  value: InteractiveVideoDragDropDraggable | null,
): value is InteractiveVideoDragDropDraggable {
  return value != null;
}
