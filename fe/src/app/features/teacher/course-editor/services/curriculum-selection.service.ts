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

    /**
     * Preserve an in-flight section deep-link or click selection while the
     * latest tree/object reference is still being hydrated. This prevents the
     * route sync layer from stripping `sectionId` back out of the URL and
     * causing an open/close feedback loop.
     */
    primeSectionSelection(chapter: ChapterDraftDTO, lesson: LessonDraftDTO, sectionId: string) {
        const currentSection = this.selectedSection();

        this.selectedChapterId.set(chapter.id);
        this.selectedChapter.set(chapter);
        this.selectedLessonId.set(lesson.id);
        this.selectedLesson.set(lesson);
        this.selectedSectionId.set(sectionId);

        if (currentSection?.id !== sectionId) {
            this.selectedSection.set(null);
        }
    }

    syncChapterReference(chapter: ChapterDraftDTO) {
        if (this.selectedChapterId() !== chapter.id) {
            return;
        }

        this.selectedChapter.set(chapter);
    }

    syncLessonReference(chapter: ChapterDraftDTO, lesson: LessonDraftDTO) {
        if (this.selectedChapterId() !== chapter.id || this.selectedLessonId() !== lesson.id) {
            return;
        }

        this.selectedChapter.set(chapter);
        this.selectedLesson.set(lesson);
    }

    syncSectionReference(chapter: ChapterDraftDTO, lesson: LessonDraftDTO, section: SectionDraftDTO) {
        if (
            this.selectedChapterId() !== chapter.id
            || this.selectedLessonId() !== lesson.id
            || this.selectedSectionId() !== section.id
        ) {
            return;
        }

        this.selectedChapter.set(chapter);
        this.selectedLesson.set(lesson);
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
