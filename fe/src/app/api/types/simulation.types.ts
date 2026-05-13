export type SimulationEngine = 'unity-webgl' | 'unity-xr-native';

export type SimulationSupportTarget =
  | 'WEB_DESKTOP'
  | 'QUEST_NATIVE'
  | 'VR_LAB'
  | 'FALLBACK_ONLY';

export interface SimulationCompletionPolicy {
  requireAllObjectives?: boolean;
  minimumScorePercent?: number;
  failOnCollisionIncident?: boolean;
  requireDebriefViewed?: boolean;
}

export interface SimulationFallback {
  walkthroughUrl?: string | null;
  notesSectionId?: string | null;
  quizSectionId?: string | null;
}

export interface SimulationSectionData {
  simulationPackageId: string;
  simulationVersion?: string | null;
  entryUrl?: string | null;
  manifestUrl?: string | null;
  estimatedSizeBytes?: number | null;
  allowOffline?: boolean;
  supportedTargets?: SimulationSupportTarget[];
  completionPolicy?: SimulationCompletionPolicy | null;
  fallback?: SimulationFallback | null;
  simulationOfflineReady?: boolean;
  simulationOfflineBytes?: number | null;
  simulationOfflineAt?: string | null;
  simulationOfflineError?: string | null;
}

export interface SimulationPackageManifest {
  id: string;
  version: string;
  engine: SimulationEngine;
  entrypoint: string;
  assets: Array<{
    url: string;
    bytes?: number;
    sha256?: string;
  }>;
  events?: string[];
  offline?: {
    supported: boolean;
    requiresPersistentStorage?: boolean;
  };
}
