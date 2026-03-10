import { Injectable, computed, inject, signal } from '@angular/core';
import { CourseAuthoringService, CourseDraftDTO, ChapterDraftDTO, LessonDraftDTO } from '../services/course-authoring.service';
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

    // Auto-save status
    readonly saveStatus = signal<SaveStatus>('saved');
    private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

    // Selectors
    readonly chapters = computed(() => this.courseTree()?.chapters || []);
    readonly courseInfo = computed(() => {
        const tree = this.courseTree();
        return tree ? { title: tree.title, description: tree.description, thumbnail: tree.thumbnailUrl } : null;
    });

    // Course Readiness Checklist (Canvas/Coursera pattern, mode-aware)
    readonly readinessChecklist = computed(() => {
        const tree = this.courseTree();
        if (!tree) return { score: 0, total: 6, items: [] as { label: string; done: boolean; critical: boolean }[], canPublish: false };

        const hasLessonWithContent = tree.chapters?.some(ch =>
            ch.lessons?.some(lesson => lessonHasCanonicalContent(lesson))
        ) ?? false;

        const items: { label: string; done: boolean; critical: boolean }[] = [
            { label: 'Tên khóa học', done: !!tree.title?.trim(), critical: true },
            { label: 'Mô tả khóa học', done: !!tree.description?.trim(), critical: true },
            { label: 'Ảnh bìa', done: !!tree.thumbnailUrl, critical: false },
            { label: 'Danh mục', done: !!tree.categoryId, critical: true },
            { label: 'Ít nhất 1 chương', done: (tree.chapters?.length || 0) > 0, critical: true },
            { label: 'Ít nhất 1 bài học có nội dung', done: hasLessonWithContent, critical: true },
            { label: 'Giá khóa học', done: tree.priceType !== 'PAID' || (tree.price != null && tree.price > 0), critical: false },
            { label: 'Video giới thiệu', done: !!tree.introVideoUrl, critical: false },
        ];

        // Instructor-led mode: delivery mode must be explicitly set
        if (tree.deliveryMode === 'INSTRUCTOR_LED') {
            items.push({ label: 'Hình thức: Lớp học', done: true, critical: false });
        }

        const done = items.filter(i => i.done).length;
        const canPublish = items.filter(i => i.critical).every(i => i.done);
        return { score: done, total: items.length, items, canPublish };
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
            .pipe(finalize(() => this.isLoading.set(false)))
            .subscribe({
                next: (data) => {
                    this.setCourseTreeState(data);
                },
                error: (err: any) => {
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
}
