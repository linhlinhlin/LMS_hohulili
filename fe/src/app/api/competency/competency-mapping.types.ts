export interface MaritimeStandard {
  id: string;
  code: string;
  name: string;
  description: string | null;
  competencyCount: number;
}

export interface StandardCompetency {
  id: string;
  standardId: string;
  standardCode: string;
  code: string;
  title: string;
  description: string | null;
  category: string | null;
  displayOrder: number;
}

export interface LessonMappingInfo {
  id: string;
  title: string;
  chapterTitle: string;
  mappedCompetencyIds: string[];
  warning: string | null;
}

export interface CompetencyMapStats {
  totalMappings: number;
  coveragePercent: number;
  lessonsWithMapping: number;
  totalLessons: number;
  competenciesCovered: number;
  totalCompetencies: number;
}

export interface CompetencyMapResponse {
  standards: MaritimeStandard[];
  competencies: StandardCompetency[];
  lessons: LessonMappingInfo[];
  stats: CompetencyMapStats;
  warnings: string[] | null;
}

export interface UpdateLessonCompetenciesRequest {
  competencyIds: string[];
  note?: string;
}

export interface UpdateLessonCompetenciesResponse {
  message: string;
  lessonId: string;
  mappingCount: number;
  warning?: string;
}
