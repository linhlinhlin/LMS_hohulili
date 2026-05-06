import type {
  InteractiveVideoInteraction,
  InteractiveVideoRuntimeEvent,
} from '../../api/types/interactive-video.types';

export interface InteractiveVideoAnalyticsContext {
  lessonId: string;
  sectionId: string | null;
  interaction: InteractiveVideoInteraction;
  event: InteractiveVideoRuntimeEvent;
  occurredAtIso: string;
}

export interface InteractiveVideoAnalyticsProjection {
  xapi: {
    profile: 'https://w3id.org/xapi/video';
    verbId: string;
    objectId: string;
    timestamp: string;
    extensions: Record<string, unknown>;
  };
  caliper: {
    profile: 'MediaProfile';
    type: 'MediaEvent';
    action: string;
    objectId: string;
    eventTime: string;
    extensions: Record<string, unknown>;
  };
}

export function buildInteractiveVideoAnalyticsProjection(
  context: InteractiveVideoAnalyticsContext,
): InteractiveVideoAnalyticsProjection {
  const baseExtensions = {
    lessonId: context.lessonId,
    sectionId: context.sectionId,
    interactionId: context.interaction.id,
    interactionType: context.interaction.type,
    action: context.event.action,
    videoTimeSeconds: context.event.videoTimeSeconds,
    data: context.event.data ?? {},
  };

  return {
    xapi: {
      profile: 'https://w3id.org/xapi/video',
      verbId: toXapiVerbId(context.event.action),
      objectId: `lesson:${context.lessonId}:section:${context.sectionId ?? 'video'}`,
      timestamp: context.occurredAtIso,
      extensions: baseExtensions,
    },
    caliper: {
      profile: 'MediaProfile',
      type: 'MediaEvent',
      action: toCaliperAction(context.event.action),
      objectId: `lesson:${context.lessonId}:section:${context.sectionId ?? 'video'}`,
      eventTime: context.occurredAtIso,
      extensions: baseExtensions,
    },
  };
}

function toXapiVerbId(action: InteractiveVideoRuntimeEvent['action']): string {
  switch (action) {
    case 'shown':
      return 'http://adlnet.gov/expapi/verbs/experienced';
    case 'answered':
      return 'http://adlnet.gov/expapi/verbs/answered';
    case 'continued':
      return 'https://w3id.org/xapi/video/verbs/played';
    case 'branch_taken':
    case 'dismissed':
      return 'http://adlnet.gov/expapi/verbs/interacted';
  }
}

function toCaliperAction(action: InteractiveVideoRuntimeEvent['action']): string {
  switch (action) {
    case 'shown':
      return 'Viewed';
    case 'answered':
      return 'Submitted';
    case 'continued':
      return 'Resumed';
    case 'branch_taken':
      return 'JumpedTo';
    case 'dismissed':
      return 'Closed';
  }
}
