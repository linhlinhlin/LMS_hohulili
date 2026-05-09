import type {
  InteractiveVideoChoice,
  InteractiveVideoDragDrop,
  InteractiveVideoDragDropDraggable,
  InteractiveVideoDragDropMedia,
  InteractiveVideoDragDropZone,
  InteractiveVideoFillBlank,
  InteractiveVideoFillBlankBlank,
  InteractiveVideoInteraction,
  InteractiveVideoInteractionType,
  InteractiveVideoSpec,
} from '../../../../api/types/interactive-video.types';
import {
  normalizeInteractiveVideoInteractionV2,
  normalizeInteractiveVideoSpecV2,
} from '../../../../core/utils/interactive-video-normalizer';

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

export interface CreateSuggestedInteractiveVideoInteractionsOptions {
  durationSeconds?: number | null;
  maxSuggestions?: number;
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

  return normalizeInteractiveVideoSpecV2({
    version: 2,
    enabled: true,
    timeline: sortInteractiveVideoTimeline(timeline).map(normalizeInteractionForSave),
  });
}

export function normalizeInteractiveVideoSpec(value: unknown): InteractiveVideoSpec | null {
  return normalizeInteractiveVideoSpecV2(value);
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
    adaptivity: type === 'branch'
      ? {
          requireCorrectBeforeContinue: true,
          onWrong: {
            type: 'seek',
            targetTimeSeconds: 0,
            targetInteractionId: null,
            message: 'Hãy xem lại đoạn video trước khi thử trả lời lại.',
          },
          onCorrect: {
            type: 'continue',
            message: 'Đúng rồi, tiếp tục bài học.',
          },
        }
      : null,
    choices: choiceTypeNeedsChoices(type)
      ? [createInteractiveVideoChoice(0), createInteractiveVideoChoice(1)]
      : [],
    fillBlank: type === 'fill_blank' ? createInteractiveVideoFillBlank() : null,
    dragDrop: type === 'drag_drop' ? createInteractiveVideoDragDrop() : null,
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

export function createInteractiveVideoFillBlank(): InteractiveVideoFillBlank {
  return {
    template: 'Điền {{1}} vào chỗ trống.',
    blanks: [createInteractiveVideoFillBlankBlank(0)],
    caseSensitive: false,
    enableRetry: true,
    enableShowSolution: true,
    requireAllCorrectBeforeContinue: false,
  };
}

export function createInteractiveVideoFillBlankBlank(index: number): InteractiveVideoFillBlankBlank {
  return {
    id: `${index + 1}`,
    acceptedAnswers: [`đáp án ${index + 1}`],
  };
}

export function createInteractiveVideoDragDrop(): InteractiveVideoDragDrop {
  const answerZone = createInteractiveVideoDragDropZone(0);
  const correctDraggable = createInteractiveVideoDragDropDraggable(0, answerZone.id);
  const distractorDraggable = createInteractiveVideoDragDropDraggable(1);

  return {
    instruction: 'Kéo những đáp án đúng vào vùng ảnh. Để nguyên đáp án sai ở ngoài.',
    backgroundImage: null,
    dropZones: [
      { ...answerZone, correctDraggableIds: [correctDraggable.id] },
    ],
    draggables: [correctDraggable, distractorDraggable],
    enableRetry: true,
    enableShowSolution: true,
    requireAllCorrectBeforeContinue: false,
  };
}

export function createInteractiveVideoDragDropZone(index: number): InteractiveVideoDragDropZone {
  const isPrimaryAnswerZone = index === 0;

  return {
    id: createAuthoringId('zone'),
    label: isPrimaryAnswerZone ? 'Vùng đáp án đúng' : `Vùng thả ${index + 1}`,
    xPercent: isPrimaryAnswerZone ? 50 : (index % 2 === 0 ? 30 : 70),
    yPercent: isPrimaryAnswerZone ? 50 : (index % 2 === 0 ? 34 : 62),
    widthPercent: isPrimaryAnswerZone ? 80 : 30,
    heightPercent: isPrimaryAnswerZone ? 72 : 24,
    correctDraggableIds: [],
  };
}

export function createInteractiveVideoDragDropDraggable(
  index: number,
  acceptedDropZoneId: string | null = null,
): InteractiveVideoDragDropDraggable {
  return {
    id: createAuthoringId('drag'),
    label: `Vật dụng ${index + 1}`,
    image: null,
    acceptedDropZoneIds: acceptedDropZoneId ? [acceptedDropZoneId] : [],
  };
}

export function createSuggestedInteractiveVideoInteractions(
  timeline: InteractiveVideoInteraction[],
  options: CreateSuggestedInteractiveVideoInteractionsOptions = {},
): InteractiveVideoInteraction[] {
  const durationSeconds = normalizeDurationSeconds(options.durationSeconds)
    ?? inferDurationFromTimeline(timeline)
    ?? 180;
  const maxSuggestions = Math.max(1, Math.min(8, Math.round(options.maxSuggestions ?? 8)));
  const minGapSeconds = getSuggestedMilestoneMinGapSeconds(durationSeconds);
  const suggestions: InteractiveVideoInteraction[] = [];

  for (const preferredSeconds of suggestInteractiveVideoMilestoneSeconds(durationSeconds)) {
    if (suggestions.length >= maxSuggestions) {
      break;
    }

    if (hasNearbyInteraction([...timeline, ...suggestions], preferredSeconds, minGapSeconds)) {
      continue;
    }

    const type = getSuggestedInteractionType(suggestions.length);
    const interaction = createInteractiveVideoInteraction([...timeline, ...suggestions], type, {
      durationSeconds,
      preferredSeconds,
    });
    suggestions.push(applySuggestedInteractionCopy(interaction, suggestions.length));
  }

  return suggestions;
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

    if (!hasVisibleStudentCopy(interaction)) {
      issues.push({
        code: 'empty_student_copy',
        severity: 'warning',
        message: `Điểm tại ${formatAuthoringTime(atSeconds)} chưa có nội dung học viên nhìn thấy.`,
        interactionId: interaction.id,
      });
    }

    if (interaction.type === 'fill_blank') {
      issues.push(...getFillBlankAuthoringIssues(interaction, atSeconds));
      continue;
    }

    if (interaction.type === 'drag_drop') {
      issues.push(...getDragDropAuthoringIssues(interaction, atSeconds));
      continue;
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
      const isReviewBranch = isReviewBranchInteraction(interaction);
      if (isReviewBranch && choices.every(choice => choice.isCorrect !== true)) {
        issues.push({
          code: 'missing_branch_correct_answer',
          severity: 'error',
          message: `Rẽ nhánh tại ${formatAuthoringTime(atSeconds)} cần một đáp án đúng để học viên tiếp tục.`,
          interactionId: interaction.id,
        });
      }
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
        if (isReviewBranch) {
          if (choice.isCorrect === false && resolvedTargetSeconds == null) {
            issues.push({
              code: 'missing_review_target',
              severity: 'warning',
              message: `Lựa chọn sai tại ${formatAuthoringTime(atSeconds)} nên có mốc xem lại video.`,
              interactionId: interaction.id,
              choiceId: choice.id,
            });
          }
          if (resolvedTargetSeconds != null && resolvedTargetSeconds >= atSeconds) {
            issues.push({
              code: 'review_target_after_question',
              severity: 'error',
              message: `Mốc xem lại tại ${formatAuthoringTime(resolvedTargetSeconds)} phải nằm trước câu hỏi ${formatAuthoringTime(atSeconds)}.`,
              interactionId: interaction.id,
              choiceId: choice.id,
            });
          }
          continue;
        }

        if (resolvedTargetSeconds != null && resolvedTargetSeconds <= atSeconds) {
          issues.push({
            code: 'branch_rewinds',
            severity: 'error',
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

function hasVisibleStudentCopy(interaction: InteractiveVideoInteraction): boolean {
  return !!interaction.title?.trim()
    || !!interaction.body?.trim()
    || (
      interaction.type === 'fill_blank'
      && !!interaction.fillBlank?.template.trim()
    )
    || (
      interaction.type === 'drag_drop'
      && !!interaction.dragDrop?.instruction.trim()
    );
}

function getFillBlankAuthoringIssues(
  interaction: InteractiveVideoInteraction,
  atSeconds: number,
): InteractiveVideoAuthoringIssue[] {
  const issues: InteractiveVideoAuthoringIssue[] = [];
  const fillBlank = interaction.fillBlank;
  const template = fillBlank?.template.trim() ?? '';
  const placeholderIds = extractFillBlankPlaceholderIds(template);
  const blanksById = new Map((fillBlank?.blanks ?? []).map(blank => [blank.id, blank]));

  if (!template) {
    issues.push({
      code: 'fill_blank_missing_template',
      severity: 'error',
      message: `Điền từ tại ${formatAuthoringTime(atSeconds)} cần câu có chỗ trống.`,
      interactionId: interaction.id,
    });
  }

  if (placeholderIds.length === 0) {
    issues.push({
      code: 'fill_blank_missing_placeholder',
      severity: 'error',
      message: `Điền từ tại ${formatAuthoringTime(atSeconds)} cần ít nhất một ô dạng {{1}} trong câu.`,
      interactionId: interaction.id,
    });
  }

  for (const placeholderId of placeholderIds) {
    const blank = blanksById.get(placeholderId);
    const answers = (blank?.acceptedAnswers ?? []).map(answer => answer.trim()).filter(Boolean);
    if (answers.length === 0) {
      issues.push({
        code: 'fill_blank_missing_answer',
        severity: 'error',
        message: `Ô trống {{${placeholderId}}} tại ${formatAuthoringTime(atSeconds)} chưa có đáp án đúng.`,
        interactionId: interaction.id,
      });
      continue;
    }

    const normalizedAnswers = answers.map(answer => answer.toLocaleLowerCase());
    if (new Set(normalizedAnswers).size < normalizedAnswers.length) {
      issues.push({
        code: 'fill_blank_duplicate_answer',
        severity: 'warning',
        message: `Ô trống {{${placeholderId}}} tại ${formatAuthoringTime(atSeconds)} có đáp án trùng nhau.`,
        interactionId: interaction.id,
      });
    }

    if (answers.some((answer, index) => isDefaultFillBlankAnswer(answer, index))) {
      issues.push({
        code: 'placeholder_fill_blank_answer',
        severity: 'warning',
        message: `Điền từ tại ${formatAuthoringTime(atSeconds)} còn đáp án mẫu.`,
        interactionId: interaction.id,
      });
    }
  }

  for (const blank of fillBlank?.blanks ?? []) {
    if (!placeholderIds.includes(blank.id)) {
      issues.push({
        code: 'unused_fill_blank_answer',
        severity: 'warning',
        message: `Đáp án cho ô {{${blank.id}}} chưa xuất hiện trong câu điền từ.`,
        interactionId: interaction.id,
      });
    }
  }

  return issues;
}

function getDragDropAuthoringIssues(
  interaction: InteractiveVideoInteraction,
  atSeconds: number,
): InteractiveVideoAuthoringIssue[] {
  const issues: InteractiveVideoAuthoringIssue[] = [];
  const dragDrop = interaction.dragDrop;
  const dropZones = dragDrop?.dropZones ?? [];
  const draggables = dragDrop?.draggables ?? [];
  const zoneIds = new Set(dropZones.map(zone => zone.id));

  if (!dragDrop?.backgroundImage?.idOrUrl.trim()) {
    issues.push({
      code: 'drag_drop_missing_background',
      severity: 'error',
      message: `Kéo thả tại ${formatAuthoringTime(atSeconds)} cần ảnh nền để học viên đặt vật dụng.`,
      interactionId: interaction.id,
    });
  }

  if (dropZones.length === 0) {
    issues.push({
      code: 'drag_drop_missing_zone',
      severity: 'error',
      message: `Kéo thả tại ${formatAuthoringTime(atSeconds)} cần ít nhất một vùng thả.`,
      interactionId: interaction.id,
    });
  }

  if (draggables.length === 0) {
    issues.push({
      code: 'drag_drop_missing_draggable',
      severity: 'error',
      message: `Kéo thả tại ${formatAuthoringTime(atSeconds)} cần ít nhất một vật dụng để kéo.`,
      interactionId: interaction.id,
    });
  }

  const hasCorrectDraggable = draggables
    .some(draggable => draggable.acceptedDropZoneIds.some(zoneId => zoneIds.has(zoneId)));
  if (dropZones.length > 0 && draggables.length > 0 && !hasCorrectDraggable) {
    issues.push({
      code: 'drag_drop_missing_correct_answer',
      severity: 'error',
      message: `Kéo thả tại ${formatAuthoringTime(atSeconds)} cần ít nhất một đáp án đúng để kéo vào vùng thả.`,
      interactionId: interaction.id,
    });
  }

  for (const zone of dropZones) {
    if (!zone.label.trim()) {
      issues.push({
        code: 'drag_drop_blank_zone_label',
        severity: 'warning',
        message: `Một vùng thả tại ${formatAuthoringTime(atSeconds)} chưa có tên dễ hiểu.`,
        interactionId: interaction.id,
      });
    }
  }

  for (const draggable of draggables) {
    if (!draggable.label.trim()) {
      issues.push({
        code: 'drag_drop_blank_draggable_label',
        severity: 'error',
        message: `Một vật dụng kéo tại ${formatAuthoringTime(atSeconds)} chưa có tên.`,
        interactionId: interaction.id,
      });
    }

    if (isDefaultDragDropDraggableLabel(draggable.label)) {
      issues.push({
        code: 'placeholder_drag_drop_draggable',
        severity: 'warning',
        message: `Kéo thả tại ${formatAuthoringTime(atSeconds)} còn vật dụng dùng tên mẫu.`,
        interactionId: interaction.id,
      });
    }

    if (!draggable.image?.idOrUrl.trim()) {
      issues.push({
        code: 'drag_drop_missing_draggable_image',
        severity: 'warning',
        message: `Vật dụng "${draggable.label || 'chưa đặt tên'}" chưa có ảnh minh họa; hệ thống sẽ hiển thị dạng thẻ chữ.`,
        interactionId: interaction.id,
      });
    }
  }

  return issues;
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
  const fillBlank = type === 'fill_blank'
    ? normalizeFillBlankForSave(interaction.fillBlank)
    : null;
  const dragDrop = type === 'drag_drop'
    ? normalizeDragDropForSave(interaction.dragDrop)
    : null;

  return normalizeInteractiveVideoInteractionV2({
    ...interaction,
    id: interaction.id || createAuthoringId('iv'),
    type,
    choices,
    fillBlank,
    dragDrop,
    hotspots: interaction.hotspots ?? [],
  }) as InteractiveVideoInteraction;
}

function normalizeFillBlankForSave(value: InteractiveVideoFillBlank | null | undefined): InteractiveVideoFillBlank {
  const fallback = createInteractiveVideoFillBlank();
  const template = (value?.template ?? fallback.template).trim();
  const placeholders = extractFillBlankPlaceholderIds(template);
  const blanks = mergeTemplatePlaceholders(
    (value?.blanks ?? fallback.blanks).map((blank, index) => ({
      id: (blank.id || `${index + 1}`).trim(),
      acceptedAnswers: blank.acceptedAnswers
        .map(answer => answer.trim())
        .filter(Boolean),
    })),
    placeholders,
  );

  return {
    template,
    blanks,
    caseSensitive: value?.caseSensitive === true,
    enableRetry: value?.enableRetry !== false,
    enableShowSolution: value?.enableShowSolution !== false,
    requireAllCorrectBeforeContinue: value?.requireAllCorrectBeforeContinue === true,
  };
}

function normalizeDragDropForSave(
  value: InteractiveVideoDragDrop | null | undefined,
): InteractiveVideoDragDrop {
  const fallback = createInteractiveVideoDragDrop();
  const sourceDropZones = value?.dropZones?.length ? value.dropZones : fallback.dropZones;
  const sourceDraggables = value?.draggables?.length ? value.draggables : fallback.draggables;
  const dropZones = sourceDropZones.map((zone, index) => ({
    id: zone.id || createAuthoringId('zone'),
    label: (zone.label || `Vùng thả ${index + 1}`).trim(),
    xPercent: clampPercent(zone.xPercent, 10),
    yPercent: clampPercent(zone.yPercent, 10),
    widthPercent: clampPercent(zone.widthPercent, 28),
    heightPercent: clampPercent(zone.heightPercent, 22),
    correctDraggableIds: dedupeStrings(zone.correctDraggableIds),
  }));
  const zoneIds = new Set(dropZones.map(zone => zone.id));
  const draggables = sourceDraggables.map((draggable, index) => ({
    id: draggable.id || createAuthoringId('drag'),
    label: (draggable.label || `Vật dụng ${index + 1}`).trim(),
    image: normalizeDragDropMediaForSave(draggable.image),
    acceptedDropZoneIds: dedupeStrings(draggable.acceptedDropZoneIds)
      .filter(zoneId => zoneIds.has(zoneId)),
  }));
  const synced = syncDragDropAnswerMaps(dropZones, draggables);

  return {
    instruction: (value?.instruction || fallback.instruction).trim(),
    backgroundImage: normalizeDragDropMediaForSave(value?.backgroundImage),
    dropZones: synced.dropZones,
    draggables: synced.draggables,
    enableRetry: value?.enableRetry !== false,
    enableShowSolution: value?.enableShowSolution !== false,
    requireAllCorrectBeforeContinue: value?.requireAllCorrectBeforeContinue === true,
  };
}

function normalizeDragDropMediaForSave(
  value: InteractiveVideoDragDropMedia | null | undefined,
): InteractiveVideoDragDropMedia | null {
  const idOrUrl = value?.idOrUrl.trim();
  if (!idOrUrl) {
    return null;
  }
  return {
    idOrUrl,
    alt: toNullableText(value?.alt),
  };
}

function syncDragDropAnswerMaps(
  dropZones: InteractiveVideoDragDropZone[],
  draggables: InteractiveVideoDragDropDraggable[],
): { dropZones: InteractiveVideoDragDropZone[]; draggables: InteractiveVideoDragDropDraggable[] } {
  const draggableIds = new Set(draggables.map(draggable => draggable.id));
  const acceptedByDraggable = new Map<string, Set<string>>();

  for (const draggable of draggables) {
    acceptedByDraggable.set(draggable.id, new Set(draggable.acceptedDropZoneIds));
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

function normalizeInteractionType(value: unknown): InteractiveVideoInteractionType {
  return value === 'single_choice'
    || value === 'branch'
    || value === 'hotspot'
    || value === 'fill_blank'
    || value === 'drag_drop'
    ? value
    : 'checkpoint';
}

function isReviewBranchInteraction(interaction: InteractiveVideoInteraction): boolean {
  return interaction.type === 'branch'
    && (
      interaction.adaptivity?.requireCorrectBeforeContinue === true
      || (interaction.choices ?? []).some(choice => typeof choice.isCorrect === 'boolean')
    );
}

function defaultInteractionTitle(type: InteractiveVideoInteractionType): string {
  switch (type) {
    case 'single_choice':
      return 'Câu hỏi';
    case 'branch':
      return 'Rẽ nhánh';
    case 'hotspot':
      return 'Hotspot';
    case 'fill_blank':
      return 'Điền từ';
    case 'drag_drop':
      return 'Kéo thả';
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

function clampPercent(value: unknown, fallback: number): number {
  const next = typeof value === 'number' ? value : Number(value);
  const safe = Number.isFinite(next) ? next : fallback;
  return Math.min(100, Math.max(0, Math.round(safe)));
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

function inferDurationFromTimeline(timeline: InteractiveVideoInteraction[]): number | null {
  const latest = Math.max(0, ...timeline.map(interaction => toNonNegativeNumber(interaction.atSeconds, 0)));
  return latest > 0 ? latest + DEFAULT_OFFSET_SECONDS : null;
}

function suggestInteractiveVideoMilestoneSeconds(durationSeconds: number): number[] {
  const ratios = getSuggestedMilestoneRatios(durationSeconds);
  return ratios
    .map(ratio => clampToVideoDuration(Math.round(durationSeconds * ratio), durationSeconds))
    .filter((seconds, index, all) => all.indexOf(seconds) === index);
}

function getSuggestedMilestoneRatios(durationSeconds: number): number[] {
  if (durationSeconds <= 30) {
    return [0.5];
  }
  if (durationSeconds <= 120) {
    return [0.4, 0.75];
  }
  if (durationSeconds <= 600) {
    return [0.15, 0.45, 0.75];
  }
  if (durationSeconds <= 1800) {
    return [0.08, 0.28, 0.52, 0.76, 0.92];
  }
  return [0.05, 0.18, 0.32, 0.48, 0.64, 0.8, 0.93];
}

function getSuggestedMilestoneMinGapSeconds(durationSeconds: number): number {
  if (durationSeconds <= 120) {
    return 5;
  }
  if (durationSeconds <= 600) {
    return 12;
  }
  if (durationSeconds <= 1800) {
    return 30;
  }
  return 60;
}

function hasNearbyInteraction(
  timeline: InteractiveVideoInteraction[],
  preferredSeconds: number,
  minGapSeconds: number,
): boolean {
  return timeline.some(interaction =>
    Math.abs(toNonNegativeNumber(interaction.atSeconds, 0) - preferredSeconds) < minGapSeconds,
  );
}

function getSuggestedInteractionType(index: number): InteractiveVideoInteractionType {
  return index % 2 === 1 ? 'single_choice' : 'checkpoint';
}

function applySuggestedInteractionCopy(
  interaction: InteractiveVideoInteraction,
  index: number,
): InteractiveVideoInteraction {
  const ordinal = index + 1;
  if (interaction.type === 'single_choice') {
    return {
      ...interaction,
      title: `Kiểm tra nhanh ${ordinal}`,
      body: 'Học viên đã nắm được ý chính của đoạn vừa xem chưa?',
      required: false,
      choices: [
        {
          id: createAuthoringId('choice'),
          label: 'Đã hiểu ý chính',
          feedback: 'Tốt. Tiếp tục sang đoạn kế tiếp.',
          isCorrect: true,
          targetTimeSeconds: null,
          targetInteractionId: null,
        },
        {
          id: createAuthoringId('choice'),
          label: 'Cần xem lại đoạn này',
          feedback: 'Hãy tua lại một chút để xem lại phần vừa học.',
          isCorrect: false,
          targetTimeSeconds: null,
          targetInteractionId: null,
        },
      ],
    };
  }

  return {
    ...interaction,
    title: `Điểm dừng ${ordinal}`,
    body: 'Dừng lại một nhịp để học viên ghi nhớ ý quan trọng trước khi tiếp tục.',
    required: false,
  };
}

function createAuthoringId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isDefaultChoiceLabel(label: string, index: number): boolean {
  return label.trim().toLowerCase() === `lựa chọn ${index + 1}`;
}

function isDefaultFillBlankAnswer(answer: string, index: number): boolean {
  return answer.trim().toLocaleLowerCase() === `đáp án ${index + 1}`;
}

function isDefaultDragDropDraggableLabel(label: string): boolean {
  return /^vật dụng \d+$/i.test(label.trim());
}

function dedupeStrings(values: string[] | null | undefined): string[] {
  return [...new Set((values ?? []).map(value => value.trim()).filter(Boolean))];
}

function formatAuthoringTime(seconds: number): string {
  const safeSeconds = toNonNegativeNumber(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}
