import { Injectable, signal } from '@angular/core';
import { ChapterDraftDTO, LessonDraftDTO } from './course-authoring.service';

@Injectable({
    providedIn: 'root'
})
export class CurriculumSelectionService {
    // Selection state
    selectedChapterId = signal<string | null>(null);
    selectedLessonId = signal<string | null>(null);
    selectedChapter = signal<ChapterDraftDTO | null>(null);
    selectedLesson = signal<LessonDraftDTO | null>(null);

    selectChapter(chapter: ChapterDraftDTO) {
        this.selectedChapterId.set(chapter.id);
        this.selectedChapter.set(chapter);
        this.selectedLessonId.set(null);
        this.selectedLesson.set(null);
    }

    selectLesson(chapter: ChapterDraftDTO, lesson: LessonDraftDTO) {
        this.selectedChapterId.set(chapter.id);
        this.selectedChapter.set(chapter);
        this.selectedLessonId.set(lesson.id);
        this.selectedLesson.set(lesson);
    }

    clearSelection() {
        this.selectedChapterId.set(null);
        this.selectedChapter.set(null);
        this.selectedLessonId.set(null);
        this.selectedLesson.set(null);
    }

    clearLessonSelection() {
        this.selectedLessonId.set(null);
        this.selectedLesson.set(null);
    }
}
