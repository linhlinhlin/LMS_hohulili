import { LessonDraftDTO } from '../services/course-authoring.service';

export type LessonReadinessState = 'ready' | 'draft' | 'empty';

const CONTENTFUL_LESSON_TYPES = new Set(['QUIZ', 'ASSIGNMENT']);

function hasText(value?: string | null): boolean {
  return !!value?.trim();
}

export function lessonHasCanonicalContent(lesson: LessonDraftDTO | null | undefined): boolean {
  if (!lesson) {
    return false;
  }

  if ((lesson.sections?.length ?? 0) > 0) {
    return true;
  }

  if (CONTENTFUL_LESSON_TYPES.has((lesson.type ?? '').toUpperCase())) {
    return true;
  }

  return [lesson.content, lesson.contentText, lesson.contentUrl, lesson.videoUrl].some(value => hasText(value));
}

export function getLessonReadinessState(lesson: LessonDraftDTO | null | undefined): LessonReadinessState {
  if (!lesson) {
    return 'empty';
  }

  if (lessonHasCanonicalContent(lesson)) {
    return 'ready';
  }

  if ([lesson.assignmentDescription, lesson.assignmentInstructions].some(value => hasText(value))) {
    return 'draft';
  }

  return 'empty';
}
