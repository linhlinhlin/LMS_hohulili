import type {
  InteractiveVideoChoice,
  InteractiveVideoInteraction,
  InteractiveVideoInteractionType,
  InteractiveVideoSpec,
} from '../../../../api/types/interactive-video.types';

const DEFAULT_OFFSET_SECONDS = 30;
const MIN_DURATION_AWARE_OFFSET_SECONDS = 2;
const SHORT_VIDEO_SECONDS = 30;
const SHORT_LESSON_SECONDS = 90;
const SHORT_LESSON_FIRST_INTERACTION_RATIO = 0.4;

export type InteractiveVideoAuthoringIssueSeverity = 'error' | 'warning';

export interface CreateInteractiveVideoInteractionOptions {
  durationSeconds?: number | null;
  preferredSeconds?: number | null;
}

export interface InteractiveVideoAuthoringIssue {
  code: string;
  severity: InteractiveVideoAuthoringIssueSeverity;
  message: string;
  interactionId?: string;
  choiceId?: string;
}

export interface InteractiveVideoAuthoringIssueOptions {
  durationSeconds?: number | null;
}

export function buildInteractiveVideoSpec(
  enabled: boolean,
  timeline: InteractiveVideoInteraction[],
): InteractiveVideoSpec | null {
  if (!enabled) {
    return null;
  }

  return {
    version: 1,
    enabled: true,
    timeline: sortInteractiveVideoTimeline(timeline).map(normalizeInteractionForSave),
  };
}

export function normalizeInteractiveVideoSpec(value: unknown): InteractiveVideoSpec | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as {
    enabled?: unknown;
    timeline?: unknown;
    interactions?: unknown;
  };
  const rawTimeline = Array.isArray(source.timeline)
    ? source.timeline
    : Array.isArray(source.interactions)
      ? source.interactions
      : [];

  const timeline = sortInteractiveVideoTimeline(
    rawTimeline.map(normalizeInteractiveVideoInteraction).filter(isInteraction),
  );
  const enabled = source.enabled == null ? timeline.length > 0 : source.enabled !== false;

  if (!enabled && timeline.length === 0) {
    return null;
  }

  return {
    version: 1,
    enabled,
    timeline,
  };
}

export function createInteractiveVideoInteraction(
  timeline: InteractiveVideoInteraction[],
  type: InteractiveVideoInteractionType = 'checkpoint',
  options: CreateInteractiveVideoInteractionOptions = {},
): InteractiveVideoInteraction {
  const atSeconds = suggestNextInteractiveVideoTimeSeconds(timeline, options);

  return {
    id: createAuthoringId('iv'),
    type,
    atSeconds,
    title: defaultInteractionTitle(type),
    body: '',
    pause: true,
    required: false,
    choices: choiceTypeNeedsChoices(type)
      ? [createInteractiveVideoChoice(0), createInteractiveVideoChoice(1)]
      : [],
  };
}

export function createInteractiveVideoChoice(index: number): InteractiveVideoChoice {
  return {
    id: createAuthoringId('choice'),
    label: `Lựa chọn ${index + 1}`,
    feedback: '',
    isCorrect: index === 0,
    targetTimeSeconds: null,
    targetInteractionId: null,
  };
}

export function sortInteractiveVideoTimeline(
  timeline: InteractiveVideoInteraction[],
): InteractiveVideoInteraction[] {
  return [...timeline].sort((a, b) => a.atSeconds - b.atSeconds);
}

export function getInteractiveVideoAuthoringIssues(
  enabled: boolean,
  timeline: InteractiveVideoInteraction[],
  options: InteractiveVideoAuthoringIssueOptions = {},
): InteractiveVideoAuthoringIssue[] {
  if (!enabled) {
    return [];
  }

  const issues: InteractiveVideoAuthoringIssue[] = [];
  if (timeline.length === 0) {
    issues.push({
      code: 'empty_timeline',
      severity: 'error',
      message: 'Hãy thêm ít nhất một điểm tương tác hoặc tắt Video tương tác.',
    });
    return issues;
  }

  const maxInteractiveSeconds = getMaxInteractiveSeconds(options.durationSeconds);
  const timelineById = new Map(timeline.map(interaction => [interaction.id, interaction]));
  const timeCounts = new Map<number, number>();

  for (const interaction of timeline) {
    const atSeconds = toNonNegativeNumber(interaction.atSeconds, 0);
    timeCounts.set(atSeconds, (timeCounts.get(atSeconds) ?? 0) + 1);

    if (maxInteractiveSeconds != null && atSeconds > maxInteractiveSeconds) {
      issues.push({
        code: 'interaction_after_duration',
        severity: 'error',
        message: `Điểm tại ${formatAuthoringTime(atSeconds)} nằm sau thời lượng video.`,
        interactionId: interaction.id,
      });
    }

    if (!interaction.title?.trim() && !interaction.body?.trim()) {
      issues.push({
        code: 'empty_student_copy',
        severity: 'warning',
        message: `Điểm tại ${formatAuthoringTime(atSeconds)} chưa có nội dung học viên nhìn thấy.`,
        interactionId: interaction.id,
      });
    }

    if (!choiceTypeNeedsChoices(interaction.type)) {
      continue;
    }

    const choices = interaction.choices ?? [];
    const filledChoices = choices.filter(choice => choice.label.trim());
    if (filledChoices.length < 2) {
      issues.push({
        code: 'too_few_choices',
        severity: 'error',
        message: `${interaction.type === 'branch' ? 'Rẽ nhánh' : 'Câu hỏi'} tại ${formatAuthoringTime(atSeconds)} cần ít nhất 2 lựa chọn có nội dung.`,
        interactionId: interaction.id,
      });
    }

    if (choices.some((choice, index) => isDefaultChoiceLabel(choice.label, index))) {
      issues.push({
        code: 'placeholder_choice_label',
        severity: 'warning',
        message: `${interaction.type === 'branch' ? 'Rẽ nhánh' : 'Câu hỏi'} tại ${formatAuthoringTime(atSeconds)} còn lựa chọn dùng tên mẫu.`,
        interactionId: interaction.id,
      });
    }

    const normalizedLabels = filledChoices.map(choice => choice.label.trim().toLowerCase());
    if (new Set(normalizedLabels).size < normalizedLabels.length) {
      issues.push({
        code: 'duplicate_choice_label',
        severity: 'warning',
        message: `${interaction.type === 'branch' ? 'Rẽ nhánh' : 'Câu hỏi'} tại ${formatAuthoringTime(atSeconds)} có lựa chọn trùng nội dung.`,
        interactionId: interaction.id,
      });
    }

    if (interaction.type === 'single_choice') {
      const correctChoices = choices.filter(choice => choice.isCorrect === true);
      if (correctChoices.length === 0) {
        issues.push({
          code: 'missing_correct_answer',
          severity: 'error',
          message: `Câu hỏi tại ${formatAuthoringTime(atSeconds)} cần một đáp án đúng.`,
          interactionId: interaction.id,
        });
      } else if (correctChoices.some(choice => !choice.label.trim())) {
        issues.push({
          code: 'blank_correct_answer',
          severity: 'error',
          message: `Đáp án đúng tại ${formatAuthoringTime(atSeconds)} chưa có nội dung.`,
          interactionId: interaction.id,
          choiceId: correctChoices.find(choice => !choice.label.trim())?.id,
        });
      }
    }

    if (interaction.type === 'branch') {
      for (const choice of choices) {
        const targetTime = choice.targetTimeSeconds;
        if (maxInteractiveSeconds != null && targetTime != null && targetTime > maxInteractiveSeconds) {
          issues.push({
            code: 'branch_target_after_duration',
            severity: 'error',
            message: `Một nhánh tại ${formatAuthoringTime(atSeconds)} đang tới sau thời lượng video.`,
            interactionId: interaction.id,
            choiceId: choice.id,
          });
        }

        if (choice.targetInteractionId === interaction.id) {
          issues.push({
            code: 'branch_targets_self',
            severity: 'error',
            message: `Một nhánh tại ${formatAuthoringTime(atSeconds)} đang trỏ lại chính nó.`,
            interactionId: interaction.id,
            choiceId: choice.id,
          });
          continue;
        }

        const target = choice.targetInteractionId
          ? timelineById.get(choice.targetInteractionId)
          : null;
        if (choice.targetInteractionId && !target) {
          issues.push({
            code: 'missing_branch_target',
            severity: 'error',
            message: `Một nhánh tại ${formatAuthoringTime(atSeconds)} đang trỏ tới điểm không còn tồn tại.`,
            interactionId: interaction.id,
            choiceId: choice.id,
          });
          continue;
        }

        const resolvedTargetSeconds = target?.atSeconds ?? targetTime ?? null;
        if (resolvedTargetSeconds != null && resolvedTargetSeconds <= atSeconds) {
          issues.push({
            code: 'branch_rewinds',
            severity: 'warning',
            message: `Một nhánh tại ${formatAuthoringTime(atSeconds)} quay về ${formatAuthoringTime(resolvedTargetSeconds)}.`,
            interactionId: interaction.id,
            choiceId: choice.id,
          });
        }
      }
    }
  }

  for (const [seconds, count] of timeCounts) {
    if (count > 1) {
      const interaction = timeline.find(item => toNonNegativeNumber(item.atSeconds, 0) === seconds);
      issues.push({
        code: 'duplicate_timestamp',
        severity: 'warning',
        message: `Có ${count} điểm cùng ở ${formatAuthoringTime(seconds)}; học viên có thể thấy nhiều hộp liên tiếp.`,
        interactionId: interaction?.id,
      });
    }
  }

  return issues;
}

export function hasBlockingInteractiveVideoAuthoringIssues(
  enabled: boolean,
  timeline: InteractiveVideoInteraction[],
  options: InteractiveVideoAuthoringIssueOptions = {},
): boolean {
  return getInteractiveVideoAuthoringIssues(enabled, timeline, options)
    .some(issue => issue.severity === 'error');
}

export function removeInteractiveVideoInteractionAndRetargetBranches(
  timeline: InteractiveVideoInteraction[],
  interactionId: string,
): InteractiveVideoInteraction[] {
  const removed = timeline.find(interaction => interaction.id === interactionId);
  const fallbackTargetSeconds = removed?.atSeconds ?? null;

  return timeline
    .filter(interaction => interaction.id !== interactionId)
    .map(interaction => {
      if (!choiceTypeNeedsChoices(interaction.type)) {
        return interaction;
      }

      const choices = (interaction.choices ?? []).map(choice => {
        if (choice.targetInteractionId !== interactionId) {
          return choice;
        }

        return {
          ...choice,
          targetInteractionId: null,
          targetTimeSeconds: fallbackTargetSeconds,
        };
      });

      return { ...interaction, choices };
    });
}

export function choiceTypeNeedsChoices(type: InteractiveVideoInteractionType): boolean {
  return type === 'single_choice' || type === 'branch';
}

export function suggestNextInteractiveVideoTimeSeconds(
  timeline: InteractiveVideoInteraction[],
  options: CreateInteractiveVideoInteractionOptions = {},
): number {
  const maxSeconds = normalizeDurationSeconds(options.durationSeconds);
  if (options.preferredSeconds != null) {
    return clampToVideoDuration(toNonNegativeNumber(options.preferredSeconds, 0), maxSeconds);
  }

  if (timeline.length === 0) {
    if (maxSeconds != null) {
      return getFirstInteractionTimeSeconds(maxSeconds);
    }
    return DEFAULT_OFFSET_SECONDS;
  }

  const latest = Math.max(...timeline.map(item => toNonNegativeNumber(item.atSeconds, 0)));
  if (maxSeconds == null) {
    return latest + DEFAULT_OFFSET_SECONDS;
  }

  const sortedTimes = timeline
    .map(item => clampToVideoDuration(item.atSeconds, maxSeconds))
    .sort((a, b) => a - b);
  const candidate = findLargestTimelineGapMidpoint(sortedTimes, maxSeconds);
  return clampToVideoDuration(candidate, maxSeconds);
}

function normalizeInteractiveVideoInteraction(value: unknown): InteractiveVideoInteraction | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  const type = normalizeInteractionType(source['type']);
  const atSeconds = toNonNegativeNumber(
    source['atSeconds'] ?? source['timeSeconds'] ?? source['time'] ?? source['timestampSeconds'],
    0,
  );
  const rawChoices = Array.isArray(source['choices']) ? source['choices'] : [];
  const choices = rawChoices.map(normalizeInteractiveVideoChoice).filter(isChoice);

  return {
    id: typeof source['id'] === 'string' && source['id'].trim()
      ? source['id'].trim()
      : createAuthoringId('iv'),
    type,
    atSeconds,
    endSeconds: source['endSeconds'] == null
      ? null
      : toNonNegativeNumber(source['endSeconds'], atSeconds),
    title: toNullableText(source['title']),
    body: toNullableText(source['body'] ?? source['prompt'] ?? source['description']),
    pause: source['pause'] !== false,
    required: source['required'] === true,
    choices: choiceTypeNeedsChoices(type)
      ? (choices.length > 0 ? choices : [createInteractiveVideoChoice(0), createInteractiveVideoChoice(1)])
      : [],
    hotspots: [],
  };
}

function normalizeInteractionForSave(
  interaction: InteractiveVideoInteraction,
): InteractiveVideoInteraction {
  const type = normalizeInteractionType(interaction.type);
  const choices = choiceTypeNeedsChoices(type)
    ? (interaction.choices ?? []).map((choice, index) => ({
        id: choice.id || createAuthoringId('choice'),
        label: (choice.label ?? `Lựa chọn ${index + 1}`).trim(),
        feedback: toNullableText(choice.feedback),
        isCorrect: choice.isCorrect === true,
        targetTimeSeconds: choice.targetTimeSeconds == null
          ? null
          : toNonNegativeNumber(choice.targetTimeSeconds, 0),
        targetInteractionId: toNullableText(choice.targetInteractionId),
      }))
    : [];

  return {
    id: interaction.id || createAuthoringId('iv'),
    type,
    atSeconds: toNonNegativeNumber(interaction.atSeconds, 0),
    endSeconds: interaction.endSeconds == null
      ? null
      : toNonNegativeNumber(interaction.endSeconds, interaction.atSeconds),
    title: toNullableText(interaction.title),
    body: toNullableText(interaction.body),
    pause: interaction.pause !== false,
    required: interaction.required === true,
    choices,
    hotspots: [],
  };
}

function normalizeInteractiveVideoChoice(value: unknown): InteractiveVideoChoice | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  return {
    id: typeof source['id'] === 'string' && source['id'].trim()
      ? source['id'].trim()
      : createAuthoringId('choice'),
    label: toNullableText(source['label'] ?? source['text']) ?? '',
    feedback: toNullableText(source['feedback']),
    isCorrect: source['isCorrect'] === true,
    targetTimeSeconds: source['targetTimeSeconds'] == null
      ? null
      : toNonNegativeNumber(source['targetTimeSeconds'], 0),
    targetInteractionId: toNullableText(source['targetInteractionId']),
  };
}

function normalizeInteractionType(value: unknown): InteractiveVideoInteractionType {
  return value === 'single_choice' || value === 'branch' || value === 'hotspot'
    ? value
    : 'checkpoint';
}

function defaultInteractionTitle(type: InteractiveVideoInteractionType): string {
  switch (type) {
    case 'single_choice':
      return 'Câu hỏi';
    case 'branch':
      return 'Rẽ nhánh';
    case 'hotspot':
      return 'Hotspot';
    default:
      return 'Điểm dừng';
  }
}

function toNullableText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const text = value.trim();
  return text ? text : null;
}

function toNonNegativeNumber(value: unknown, fallback: number): number {
  const next = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(next)) {
    return Math.max(0, fallback);
  }
  return Math.max(0, Math.round(next));
}

function normalizeDurationSeconds(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.max(1, Math.round(value));
}

function getMaxInteractiveSeconds(durationSeconds: number | null | undefined): number | null {
  const duration = normalizeDurationSeconds(durationSeconds);
  return duration == null ? null : Math.max(0, duration - 1);
}

function clampToVideoDuration(value: number, maxSeconds: number | null): number {
  const safe = toNonNegativeNumber(value, 0);
  if (maxSeconds == null) {
    return safe;
  }
  const upperBound = Math.max(0, maxSeconds - 1);
  return Math.min(upperBound, safe);
}

function getFirstInteractionTimeSeconds(maxSeconds: number): number {
  if (maxSeconds <= SHORT_VIDEO_SECONDS) {
    return clampToVideoDuration(Math.round(maxSeconds * 0.5), maxSeconds);
  }

  if (maxSeconds <= SHORT_LESSON_SECONDS) {
    return clampToVideoDuration(
      Math.min(
        DEFAULT_OFFSET_SECONDS,
        Math.round(maxSeconds * SHORT_LESSON_FIRST_INTERACTION_RATIO),
      ),
      maxSeconds,
    );
  }

  return clampToVideoDuration(DEFAULT_OFFSET_SECONDS, maxSeconds);
}

function findLargestTimelineGapMidpoint(sortedTimes: number[], maxSeconds: number): number {
  let bestStart = 0;
  let bestEnd = maxSeconds;
  let bestGap = -1;
  const points = [0, ...sortedTimes, maxSeconds];

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const gap = end - start;
    if (gap > bestGap) {
      bestGap = gap;
      bestStart = start;
      bestEnd = end;
    }
  }

  if (bestGap <= 1) {
    const latest = Math.max(0, ...sortedTimes);
    return latest + MIN_DURATION_AWARE_OFFSET_SECONDS;
  }
  return Math.round(bestStart + bestGap / 2);
}

function createAuthoringId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isDefaultChoiceLabel(label: string, index: number): boolean {
  return label.trim().toLowerCase() === `lựa chọn ${index + 1}`;
}

function formatAuthoringTime(seconds: number): string {
  const safeSeconds = toNonNegativeNumber(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

function isInteraction(value: InteractiveVideoInteraction | null): value is InteractiveVideoInteraction {
  return value != null;
}

function isChoice(value: InteractiveVideoChoice | null): value is InteractiveVideoChoice {
  return value != null;
}
