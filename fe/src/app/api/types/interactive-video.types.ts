export type InteractiveVideoInteractionType =
  | 'checkpoint'
  | 'single_choice'
  | 'branch'
  | 'hotspot';

export type InteractiveVideoDisplayType = 'button' | 'poster';

export type InteractiveVideoPreventSkippingMode = 'none' | 'forward' | 'both';

export type InteractiveVideoActionType = 'continue' | 'seek' | 'interaction';

export interface InteractiveVideoBehavior {
  preventSkippingMode?: InteractiveVideoPreventSkippingMode;
  showBookmarksOnLoad?: boolean;
  showRewind10?: boolean;
  pauseOnInteraction?: boolean;
}

export interface InteractiveVideoBookmark {
  id: string;
  timeSeconds: number;
  label: string;
}

export interface InteractiveVideoEndScreen {
  enabled: boolean;
  atSeconds?: number | null;
  requireAnswerBeforeSubmit?: boolean;
  showScore?: boolean;
  title?: string | null;
  body?: string | null;
}

export interface InteractiveVideoPosition {
  xPercent: number;
  yPercent: number;
  widthPercent?: number | null;
  heightPercent?: number | null;
}

export interface InteractiveVideoAction {
  type: InteractiveVideoActionType;
  targetTimeSeconds?: number | null;
  targetInteractionId?: string | null;
  message?: string | null;
}

export interface InteractiveVideoAdaptivity {
  requireCorrectBeforeContinue?: boolean;
  onCorrect?: InteractiveVideoAction | null;
  onWrong?: InteractiveVideoAction | null;
  allowOptOut?: boolean;
}

export interface InteractiveVideoChoice {
  id: string;
  label: string;
  feedback?: string | null;
  isCorrect?: boolean;
  targetTimeSeconds?: number | null;
  targetInteractionId?: string | null;
}

export interface InteractiveVideoHotspot {
  xPercent: number;
  yPercent: number;
  widthPercent?: number;
  heightPercent?: number;
  label?: string | null;
  targetTimeSeconds?: number | null;
}

export interface InteractiveVideoInteraction {
  id: string;
  type: InteractiveVideoInteractionType;
  atSeconds: number;
  endSeconds?: number | null;
  title?: string | null;
  body?: string | null;
  pause?: boolean;
  required?: boolean;
  displayType?: InteractiveVideoDisplayType;
  position?: InteractiveVideoPosition | null;
  choices?: InteractiveVideoChoice[];
  hotspots?: InteractiveVideoHotspot[];
  adaptivity?: InteractiveVideoAdaptivity | null;
}

export interface InteractiveVideoSpec {
  version: 1 | 2;
  enabled?: boolean;
  behavior?: InteractiveVideoBehavior;
  bookmarks?: InteractiveVideoBookmark[];
  endScreen?: InteractiveVideoEndScreen | null;
  timeline: InteractiveVideoInteraction[];
}

export interface InteractiveVideoRuntimeEvent {
  interactionId: string;
  action: 'shown' | 'continued' | 'answered' | 'branch_taken' | 'dismissed';
  videoTimeSeconds: number;
  data?: Record<string, unknown>;
}
