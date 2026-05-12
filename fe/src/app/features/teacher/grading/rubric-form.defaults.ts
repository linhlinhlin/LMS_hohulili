export const RUBRIC_SEGMENT_COLORS = ['#0056D2', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316'];

export interface DefaultRubricLevel {
  name: string;
  scoreRatio: number;
  description: string;
}

export const DEFAULT_RUBRIC_LEVELS: DefaultRubricLevel[] = [
  {
    name: 'Xuất sắc',
    scoreRatio: 1,
    description: 'Vượt yêu cầu, thực hiện độc lập và ổn định.'
  },
  {
    name: 'Tốt',
    scoreRatio: 0.85,
    description: 'Đáp ứng tốt hầu hết yêu cầu, chỉ còn lỗi nhỏ.'
  },
  {
    name: 'Đạt yêu cầu',
    scoreRatio: 0.7,
    description: 'Đạt chuẩn tối thiểu, còn thiếu sót cần cải thiện.'
  },
  {
    name: 'Cần cải thiện',
    scoreRatio: 0.4,
    description: 'Thể hiện một phần năng lực nhưng chưa ổn định.'
  }
];

export function buildDefaultRubricLevels(maxPoints: number): Array<DefaultRubricLevel & { points: number }> {
  return materializeLevels(DEFAULT_RUBRIC_LEVELS, maxPoints);
}

export function buildRubricLevelPoints(maxPoints: number, levelCount: number): number[] {
  return buildEvenLevelPoints(maxPoints, levelCount);
}

function materializeLevels(levels: DefaultRubricLevel[], maxPoints: number): Array<DefaultRubricLevel & { points: number }> {
  const normalizedMax = normalizeMaxPoints(maxPoints);
  return levels.map(level => ({
    ...level,
    points: roundRubricPoints(normalizedMax * level.scoreRatio)
  }));
}

function buildEvenLevelPoints(maxPoints: number, levelCount: number): number[] {
  const normalizedMax = normalizeMaxPoints(maxPoints);
  const count = Math.max(1, levelCount);
  if (count === 1) return [roundRubricPoints(normalizedMax)];

  return Array.from({ length: count }, (_, index) =>
    roundRubricPoints(normalizedMax * (1 - index / (count - 1)))
  );
}

function normalizeMaxPoints(maxPoints: number): number {
  return Number.isFinite(maxPoints) && maxPoints > 0 ? maxPoints : 0;
}

function roundRubricPoints(value: number): number {
  return Math.round(value * 100) / 100;
}
