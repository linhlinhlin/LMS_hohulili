export type CurriculumLevel = 'chapter' | 'lesson' | 'section';

const LEVEL_LABELS: Record<CurriculumLevel, string> = {
  chapter: 'Chương',
  lesson: 'Bài',
  section: 'Mục',
};

const LEVEL_PREFIX_PATTERNS: Record<CurriculumLevel, RegExp[]> = {
  chapter: [
    /^chương\s+\d+[.:\-)]\s*/i,
    /^\d+[.:\-)]\s*/,
  ],
  lesson: [
    /^bài\s+\d+(?:\.\d+)?[.:\-)]\s*/i,
    /^\d+(?:\.\d+)?[.:\-)]\s*/,
  ],
  section: [
    /^mục\s+\d+(?:\.\d+){0,2}[.:\-)]\s*/i,
    /^\d+(?:\.\d+){1,2}[.:\-)]\s*/,
  ],
};

export function buildCurriculumLabel(level: CurriculumLevel, index: number): string {
  return `${LEVEL_LABELS[level]} ${index + 1}`;
}

export function stripCurriculumPrefix(title: string, level: CurriculumLevel): string {
  const normalizedTitle = title.trim();

  for (const pattern of LEVEL_PREFIX_PATTERNS[level]) {
    if (pattern.test(normalizedTitle)) {
      const stripped = normalizedTitle.replace(pattern, '').trim();
      return stripped || 'Chưa đặt tên';
    }
  }

  return normalizedTitle || 'Chưa đặt tên';
}
