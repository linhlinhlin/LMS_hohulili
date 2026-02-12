import { Injectable, signal } from '@angular/core';
import { ChapterDraftDTO, LessonDraftDTO, SectionDraftDTO } from './course-authoring.service';

@Injectable({
    providedIn: 'root'
})
export class CurriculumSelectionService {
    // Selection state
    selectedChapterId = signal<string | null>(null);
    selectedLessonId = signal<string | null>(null);
    selectedLesson = signal<LessonDraftDTO | null>(null);
    selectedChapter = signal<ChapterDraftDTO | null>(null);
    selectedSectionId = signal<string | null>(null);
    selectedSection = signal<SectionDraftDTO | null>(null);

    selectChapter(chapter: ChapterDraftDTO) {
        this.selectedChapterId.set(chapter.id);
        this.selectedChapter.set(chapter);
        this.selectedLessonId.set(null);
        this.selectedLesson.set(null);
        this.selectedSectionId.set(null);
        this.selectedSection.set(null);
    }

    selectLesson(chapter: ChapterDraftDTO, lesson: LessonDraftDTO) {
        this.selectedChapterId.set(chapter.id);
        this.selectedChapter.set(chapter);
        this.selectedLessonId.set(lesson.id);
        this.selectedLesson.set(lesson);
        this.selectedSectionId.set(null);
        this.selectedSection.set(null);
    }

    selectSection(chapter: ChapterDraftDTO, lesson: LessonDraftDTO, section: SectionDraftDTO) {
        this.selectedChapterId.set(chapter.id);
        this.selectedChapter.set(chapter);
        this.selectedLessonId.set(lesson.id);
        this.selectedLesson.set(lesson);
        this.selectedSectionId.set(section.id);
        this.selectedSection.set(section);
    }

    clearSelection() {
        this.selectedChapterId.set(null);
        this.selectedChapter.set(null);
        this.selectedLessonId.set(null);
        this.selectedLesson.set(null);
        this.selectedSectionId.set(null);
        this.selectedSection.set(null);
    }

    clearLessonSelection() {
        this.selectedLessonId.set(null);
        this.selectedLesson.set(null);
        this.selectedSectionId.set(null);
        this.selectedSection.set(null);
    }

    clearSectionSelection() {
        this.selectedSectionId.set(null);
        this.selectedSection.set(null);
    }
}
