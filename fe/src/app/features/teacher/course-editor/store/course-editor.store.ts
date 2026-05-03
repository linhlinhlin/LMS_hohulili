import { Injectable, computed, inject, signal } from '@angular/core';
import { CourseAuthoringService, CourseDraftDTO, ChapterDraftDTO, LessonDraftDTO, SectionDraftDTO } from '../services/course-authoring.service';
import { finalize } from 'rxjs/operators';
import { ToastService } from '../../../../core/services/toast.service';
import { lessonHasCanonicalContent } from '../utils/lesson-readiness';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

@Injectable({
    providedIn: 'root'
})
export class CourseEditorStore {
    private service = inject(CourseAuthoringService);
    private toast = inject(ToastService);

    // State
    readonly courseTree = signal<CourseDraftDTO | null>(null);
    readonly isLoading = signal<boolean>(false);
    readonly isSaving = signal<boolean>(false);

    // Sidebar state (shared between layout + curriculum child components)
    readonly sidebarCollapsed = signal(false);

    // Auto-save status
    readonly saveStatus = signal<SaveStatus>('saved');
    private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
    private activeLoadToken = 0;

    // Selectors
    readonly chapters = computed(() => this.courseTree()?.chapters || []);
    readonly courseInfo = computed(() => {
        const tree = this.courseTree();
        return tree ? { title: tree.title, description: tree.description, thumbnail: tree.thumbnailUrl } : null;
    });

    // Course Readiness Checklist (Canvas/Coursera pattern, mode-aware)
    readonly readinessChecklist = computed(() => {
        const tree = this.courseTree();
        if (!tree) return {
            score: 0, total: 6,
            items: [] as { label: string; done: boolean; critical: boolean }[],
            canPublish: false,
            emptyQuizLessons: [] as string[]
        };

        const hasLessonWithContent = tree.chapters?.some(ch =>
            ch.lessons?.some(lesson => lessonHasCanonicalContent(lesson))
        ) ?? false;

        // Find lessons that contain QUIZ sections with no questions — those will be invisible to students
        const emptyQuizLessons: string[] = [];
        for (const chapter of tree.chapters ?? []) {
            for (const lesson of chapter.lessons ?? []) {
                const hasEmptyQuizSection = (lesson.sections ?? []).some(section =>
                    (section.type ?? '').toUpperCase() === 'QUIZ'
                    && (section.quizData?.questions?.length ?? 0) === 0
                );
                if (hasEmptyQuizSection) {
                    emptyQuizLessons.push(lesson.title || 'Bài học chưa đặt tên');
                }
            }
        }
        const hasNoEmptyQuizzes = emptyQuizLessons.length === 0;

        const items: { label: string; done: boolean; critical: boolean }[] = [
            { label: 'Tên khóa học', done: !!tree.title?.trim(), critical: true },
            { label: 'Mô tả khóa học', done: !!tree.description?.trim(), critical: true },
            { label: 'Ảnh bìa', done: !!tree.thumbnailUrl, critical: false },
            { label: 'Danh mục', done: !!tree.categoryId, critical: true },
            { label: 'Ít nhất 1 chương', done: (tree.chapters?.length || 0) > 0, critical: true },
            { label: 'Ít nhất 1 bài học có nội dung', done: hasLessonWithContent, critical: true },
            { label: 'Bài kiểm tra đều có câu hỏi', done: hasNoEmptyQuizzes, critical: true },
            { label: 'Giá khóa học', done: tree.priceType !== 'PAID' || (tree.price != null && tree.price > 0), critical: false },
            { label: 'Video giới thiệu', done: !!tree.introVideoAssetId || !!tree.introVideoUrl, critical: false },
        ];

        // Instructor-led mode: delivery mode must be explicitly set
        if (tree.deliveryMode === 'INSTRUCTOR_LED') {
            items.push({ label: 'Hình thức: Lớp học', done: true, critical: false });
        }

        const done = items.filter(i => i.done).length;
        const canPublish = items.filter(i => i.critical).every(i => i.done);
        return { score: done, total: items.length, items, canPublish, emptyQuizLessons };
    });

    readonly readinessPercent = computed(() => {
        const r = this.readinessChecklist();
        return r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
    });

    // Error state
    readonly error = signal<string | null>(null);

    // Actions

    // Simple cache for faster loading
    private courseCache = new Map<string, { data: CourseDraftDTO, timestamp: number }>();
    private CACHE_DURATION = 60000; // 1 minute

    private setCourseTreeState(tree: CourseDraftDTO) {
        this.courseTree.set(tree);
        if (tree.id) {
            this.courseCache.set(tree.id, { data: tree, timestamp: Date.now() });
        }
    }

    loadCourse(courseId: string, forceRefresh = false) {
        const loadToken = ++this.activeLoadToken;

        // Check cache first - return immediately if valid AND not forced
        if (!forceRefresh) {
            const cached = this.courseCache.get(courseId);
            const now = Date.now();
            if (cached && (now - cached.timestamp < this.CACHE_DURATION)) {
                this.courseTree.set(cached.data);
                return; // Don't make API call
            }
        }

        this.isLoading.set(true);
        this.error.set(null);
        this.service.getCourseDraft(courseId)
            .pipe(finalize(() => {
                if (loadToken === this.activeLoadToken) {
                    this.isLoading.set(false);
                }
            }))
            .subscribe({
                next: (data) => {
                    if (loadToken !== this.activeLoadToken) return;
                    this.setCourseTreeState(data);
                },
                error: (err: any) => {
                    if (loadToken !== this.activeLoadToken) return;
                    const message = err?.error?.message || err?.message || 'Không thể tải khóa học';
                    this.error.set(message);
                    this.toast.error(message);
                }
            });
    }

    // Optimistic UI Reorder
    reorderChapters(courseId: string, newOrderedIds: string[]) {
        const currentTree = this.courseTree();
        if (!currentTree) return;

        // 1. Apply Order Locally
        const oldChapters = [...currentTree.chapters];
        const newChapters = newOrderedIds
            .map(id => oldChapters.find(ch => ch.id === id))
            .filter((ch): ch is ChapterDraftDTO => !!ch);

        this.setCourseTreeState({ ...currentTree, chapters: newChapters });

        // 2. Call API
        this.service.reorderChapters(courseId, newOrderedIds).subscribe({
            error: (err: any) => {
                this.setCourseTreeState({ ...currentTree, chapters: oldChapters });
                this.toast.error('Sắp xếp chương thất bại' + (err?.error?.message ? ': ' + err.error.message : ''));
            }
        });
    }

    // Optimistic UI Reorder - Lessons
    reorderLessonsOptimistic(chapterId: string, newOrderedIds: string[]) {
        const currentTree = this.courseTree();
        if (!currentTree) return;

        const oldChapters = currentTree.chapters;
        const newChapters = oldChapters.map(ch => {
            if (ch.id !== chapterId) return ch;
            const oldLessons = ch.lessons;
            const newLessons = newOrderedIds
                .map(id => oldLessons.find(l => l.id === id))
                .filter((l): l is LessonDraftDTO => !!l);
            return { ...ch, lessons: newLessons };
        });

        this.setCourseTreeState({ ...currentTree, chapters: newChapters });

        const courseId = currentTree.id;
        if (!courseId) {
            this.toast.error('Không tìm thấy mã khóa học để sắp xếp');
            return;
        }
        this.service.reorderLessons(chapterId, newOrderedIds, courseId).subscribe({
            error: (err: any) => {
                this.setCourseTreeState({ ...currentTree, chapters: oldChapters });
                this.toast.error('Sắp xếp bài học thất bại' + (err?.error?.message ? ': ' + err.error.message : ''));
            }
        });
    }

    // Optimistic UI Reorder - Sections
    reorderSectionsOptimistic(lessonId: string, newOrderedIds: string[]) {
        const currentTree = this.courseTree();
        if (!currentTree) return;

        const oldChapters = currentTree.chapters;
        const newChapters = oldChapters.map(ch => ({
            ...ch,
            lessons: ch.lessons.map(l => {
                if (l.id !== lessonId) return l;
                const oldSections = l.sections || [];
                const newSections = newOrderedIds
                    .map(id => oldSections.find(s => s.id === id))
                    .filter(Boolean) as typeof oldSections;
                return { ...l, sections: newSections };
            })
        }));

        this.setCourseTreeState({ ...currentTree, chapters: newChapters });

        this.service.reorderSections(lessonId, newOrderedIds).subscribe({
            error: (err: any) => {
                this.setCourseTreeState({ ...currentTree, chapters: oldChapters });
                this.toast.error('Sắp xếp nội dung thất bại' + (err?.error?.message ? ': ' + err.error.message : ''));
            }
        });
    }

    /**
     * Move a section to a different lesson (Notion block-move / Coursera "Move To" pattern).
     * targetIndex null = append at the end of target lesson.
     *
     * Concurrency-safe: rollback reverses the SPECIFIC move via {@link applySectionMove},
     * not by restoring a captured oldChapters snapshot. Two concurrent moves that both
     * capture-then-restore would clobber each other; reversing per-move keeps each one
     * independently undoable regardless of intervening state.
     */
    moveSectionToLessonOptimistic(sectionId: string, fromLessonId: string, toLessonId: string, targetIndex: number | null = null) {
        if (fromLessonId === toLessonId) return;
        const currentTree = this.courseTree();
        if (!currentTree) return;

        // Snapshot the original position so rollback can put the section back in the exact
        // slot it came from, not just at the end of the source lesson.
        let originalIndex = -1;
        for (const ch of currentTree.chapters) {
            for (const l of ch.lessons) {
                if (l.id !== fromLessonId) continue;
                const idx = (l.sections ?? []).findIndex(s => s.id === sectionId);
                if (idx >= 0) {
                    originalIndex = idx;
                }
            }
        }
        if (originalIndex < 0) return;

        const moved = this.applySectionMove(fromLessonId, toLessonId, sectionId, targetIndex);
        if (!moved) return;

        this.service.moveSection(sectionId, fromLessonId, toLessonId, targetIndex).subscribe({
            error: (err: any) => {
                // Reverse the move: pull the section back from target to original slot in source.
                this.applySectionMove(toLessonId, fromLessonId, sectionId, originalIndex);
                this.toast.error('Chuyển nội dung thất bại' + (err?.error?.message ? ': ' + err.error.message : ''));
            }
        });
    }

    /**
     * Pure helper: read latest tree, remove section from its current lesson, insert into target.
     * Returns true if the section was found and moved, false otherwise (e.g. another concurrent
     * move already removed it). Caller decides whether to roll back or report.
     */
    private applySectionMove(fromLessonId: string, toLessonId: string, sectionId: string, targetIndex: number | null): boolean {
        const currentTree = this.courseTree();
        if (!currentTree) return false;

        let movedSection: SectionDraftDTO | null = null;
        const stripped = currentTree.chapters.map(ch => ({
            ...ch,
            lessons: ch.lessons.map(l => {
                if (l.id !== fromLessonId) return l;
                const sections = l.sections || [];
                const idx = sections.findIndex(s => s.id === sectionId);
                if (idx < 0) return l;
                movedSection = sections[idx];
                return { ...l, sections: [...sections.slice(0, idx), ...sections.slice(idx + 1)] };
            })
        }));

        if (!movedSection) return false;

        const finalChapters = stripped.map(ch => ({
            ...ch,
            lessons: ch.lessons.map(l => {
                if (l.id !== toLessonId) return l;
                const sections = l.sections || [];
                const insertAt = (targetIndex == null || targetIndex < 0 || targetIndex > sections.length)
                    ? sections.length
                    : targetIndex;
                return { ...l, sections: [...sections.slice(0, insertAt), movedSection!, ...sections.slice(insertAt)] };
            })
        }));

        this.setCourseTreeState({ ...currentTree, chapters: finalChapters });
        return true;
    }

    updateLessonLocal(chapterId: string, lessonId: string, updates: Partial<LessonDraftDTO>) {
        const currentTree = this.courseTree();
        if (!currentTree) return;

        const newChapters = currentTree.chapters.map(ch => {
            if (ch.id !== chapterId) return ch;
            return {
                ...ch,
                lessons: ch.lessons.map(l => l.id === lessonId ? { ...l, ...updates } : l)
            };
        });

        this.setCourseTreeState({ ...currentTree, chapters: newChapters });
    }

    addChapterLocal(chapter: ChapterDraftDTO) {
        const currentTree = this.courseTree();
        if (!currentTree) return;
        this.setCourseTreeState({
            ...currentTree,
            chapters: [...currentTree.chapters, chapter]
        });
    }

    updateChapterLocal(chapterId: string, updates: Partial<ChapterDraftDTO>) {
        const currentTree = this.courseTree();
        if (!currentTree) return;
        this.setCourseTreeState({
            ...currentTree,
            chapters: currentTree.chapters.map(ch =>
                ch.id === chapterId ? { ...ch, ...updates } : ch
            )
        });
    }

    removeChapterLocal(chapterId: string) {
        const currentTree = this.courseTree();
        if (!currentTree) return;
        this.setCourseTreeState({
            ...currentTree,
            chapters: currentTree.chapters.filter(ch => ch.id !== chapterId)
        });
    }

    addLessonLocal(chapterId: string, lesson: LessonDraftDTO) {
        const currentTree = this.courseTree();
        if (!currentTree) return;
        this.setCourseTreeState({
            ...currentTree,
            chapters: currentTree.chapters.map(ch =>
                ch.id === chapterId
                    ? { ...ch, lessons: [...ch.lessons, lesson] }
                    : ch
            )
        });
    }

    removeLessonLocal(lessonId: string) {
        const currentTree = this.courseTree();
        if (!currentTree) return;
        this.setCourseTreeState({
            ...currentTree,
            chapters: currentTree.chapters.map(ch => {
                if (!ch.lessons.some(l => l.id === lessonId)) return ch;
                return { ...ch, lessons: ch.lessons.filter(l => l.id !== lessonId) };
            })
        });
    }

    moveLessonToChapter(lessonId: string, fromChapterId: string, toChapterId: string) {
        const currentTree = this.courseTree();
        if (!currentTree) return;

        let movedLesson: LessonDraftDTO | undefined;
        for (const ch of currentTree.chapters) {
            if (ch.id === fromChapterId) {
                movedLesson = ch.lessons.find(l => l.id === lessonId);
                break;
            }
        }
        if (!movedLesson) return;

        this.setCourseTreeState({
            ...currentTree,
            chapters: currentTree.chapters.map(ch => {
                if (ch.id === fromChapterId) {
                    return { ...ch, lessons: ch.lessons.filter(l => l.id !== lessonId) };
                }
                if (ch.id === toChapterId) {
                    return { ...ch, lessons: [...ch.lessons, movedLesson!] };
                }
                return ch;
            })
        });
    }

    addSectionLocal(lessonId: string, section: SectionDraftDTO) {
        const currentTree = this.courseTree();
        if (!currentTree) return;
        this.setCourseTreeState({
            ...currentTree,
            chapters: currentTree.chapters.map(ch => {
                if (!ch.lessons.some(l => l.id === lessonId)) return ch;
                return {
                    ...ch,
                    lessons: ch.lessons.map(l =>
                        l.id === lessonId
                            ? { ...l, sections: [...(l.sections || []), section] }
                            : l
                    )
                };
            })
        });
    }

    updateSectionLocal(lessonId: string, sectionId: string, updates: Partial<SectionDraftDTO>) {
        const currentTree = this.courseTree();
        if (!currentTree) return;
        this.setCourseTreeState({
            ...currentTree,
            chapters: currentTree.chapters.map(ch => {
                if (!ch.lessons.some(l => l.id === lessonId)) return ch;
                return {
                    ...ch,
                    lessons: ch.lessons.map(l =>
                        l.id === lessonId
                            ? {
                                ...l,
                                sections: (l.sections || []).map(s =>
                                    s.id === sectionId ? { ...s, ...updates } : s
                                )
                            }
                            : l
                    )
                };
            })
        });
    }

    removeSectionLocal(lessonId: string, sectionId: string) {
        const currentTree = this.courseTree();
        if (!currentTree) return;
        this.setCourseTreeState({
            ...currentTree,
            chapters: currentTree.chapters.map(ch => {
                if (!ch.lessons.some(l => l.id === lessonId)) return ch;
                return {
                    ...ch,
                    lessons: ch.lessons.map(l =>
                        l.id === lessonId
                            ? { ...l, sections: (l.sections || []).filter(s => s.id !== sectionId) }
                            : l
                    )
                };
            })
        });
    }

    // Auto-save calling this
    saveLesson(lessonId: string, updates: Partial<LessonDraftDTO>) {
        this.isSaving.set(true);
        this.service.updateLesson(lessonId, updates)
            .pipe(finalize(() => this.isSaving.set(false)))
            .subscribe({
                error: () => this.toast.error('Lưu bài học thất bại')
            });
    }
    // Helper to find node and parent
    findNode(id: string): { node: any, parentId: string | undefined } | null {
        const tree = this.courseTree();
        if (!tree) return null;

        for (const chapter of tree.chapters) {
            if (chapter.id === id) return { node: chapter, parentId: undefined };
            for (const lesson of chapter.lessons || []) {
                if (lesson.id === id) return { node: lesson, parentId: chapter.id };
                for (const section of lesson.sections || []) {
                    if (section.id === id) return { node: section, parentId: lesson.id };
                }
            }
        }
        return null;
    }

    // Clear cache for specific course
    invalidateCache(courseId?: string) {
        if (courseId) {
            this.courseCache.delete(courseId);
        } else {
            this.courseCache.clear();
        }
    }

    // Mark content as changed (triggers auto-save countdown)
    markUnsaved() {
        this.saveStatus.set('unsaved');
    }

    markSaving() {
        this.saveStatus.set('saving');
    }

    markSaved() {
        this.saveStatus.set('saved');
    }

    markError() {
        this.saveStatus.set('error');
    }

    // Auto-save with debounce (2s)
    scheduleAutoSave(courseId: string, payload: Record<string, unknown>) {
        this.saveStatus.set('unsaved');

        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        this.autoSaveTimer = setTimeout(() => {
            this.saveStatus.set('saving');
            this.isSaving.set(true);

            this.service.updateCourseInfo(courseId, payload)
                .pipe(finalize(() => this.isSaving.set(false)))
                .subscribe({
                    next: () => {
                        this.saveStatus.set('saved');
                        this.invalidateCache(courseId);
                    },
                    error: () => {
                        this.saveStatus.set('error');
                        this.toast.error('Tự động lưu thất bại');
                    }
                });
        }, 2000);
    }

    cancelAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    resetEditorState() {
        this.activeLoadToken++;
        this.cancelAutoSave();
        this.courseTree.set(null);
        this.error.set(null);
        this.isLoading.set(false);
        this.isSaving.set(false);
        this.saveStatus.set('saved');
        this.courseCache.clear();
    }
}
