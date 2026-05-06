export type InteractiveVideoInteractionType =
  | 'checkpoint'
  | 'single_choice'
  | 'branch'
  | 'hotspot';

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
  choices?: InteractiveVideoChoice[];
  hotspots?: InteractiveVideoHotspot[];
}

export interface InteractiveVideoSpec {
  version: 1;
  enabled?: boolean;
  timeline: InteractiveVideoInteraction[];
}

export interface InteractiveVideoRuntimeEvent {
  interactionId: string;
  action: 'shown' | 'continued' | 'answered' | 'branch_taken' | 'dismissed';
  videoTimeSeconds: number;
  data?: Record<string, unknown>;
}
