import { Injectable, computed, inject, signal } from '@angular/core';
import { CourseAuthoringService, CourseDraftDTO, ChapterDraftDTO, LessonDraftDTO } from '../services/course-authoring.service';
import { tap, finalize } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
    providedIn: 'root'
})
export class CourseEditorStore {
    private service = inject(CourseAuthoringService);
    private toast = inject(MatSnackBar);

    // State
    readonly courseTree = signal<CourseDraftDTO | null>(null);
    readonly isLoading = signal<boolean>(false);
    readonly isSaving = signal<boolean>(false);

    // Selectors
    readonly chapters = computed(() => this.courseTree()?.chapters || []);
    readonly courseInfo = computed(() => {
        const tree = this.courseTree();
        return tree ? { title: tree.title, description: tree.description, thumbnail: tree.thumbnailUrl } : null;
    });

    // Error state
    readonly error = signal<string | null>(null);

    // Actions

    // Simple cache for faster loading
    private courseCache = new Map<string, { data: CourseDraftDTO, timestamp: number }>();
    private CACHE_DURATION = 60000; // 1 minute

    loadCourse(courseId: string) {
        // Check cache first - return immediately if valid
        const cached = this.courseCache.get(courseId);
        const now = Date.now();
        if (cached && (now - cached.timestamp < this.CACHE_DURATION)) {
            this.courseTree.set(cached.data);
            console.log('Course loaded from cache (instant)');
            return; // Don't make API call
        }

        this.isLoading.set(true);
        this.error.set(null);
        this.service.getCourseDraft(courseId)
            .pipe(finalize(() => this.isLoading.set(false)))
            .subscribe({
                next: (data) => {
                    console.log('Course loaded from API:', data);
                    this.courseTree.set(data);
                    // Cache the data
                    this.courseCache.set(courseId, { data, timestamp: now });
                },
                error: (err: any) => {
                    console.error('Failed to load course:', err);
                    const message = err?.error?.message || err?.message || 'Không thể tải khóa học';
                    this.error.set(message);
                    this.toast.open(message, 'Đóng', { duration: 5000 });
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

        this.courseTree.set({ ...currentTree, chapters: newChapters });

        // 2. Call API
        this.service.reorderChapters(courseId, newOrderedIds).subscribe({
            error: () => {
                // Revert on error
                this.courseTree.set({ ...currentTree, chapters: oldChapters });
                this.toast.open('Failed to reorder chapters', 'Close', { duration: 3000 });
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

        this.courseTree.set({ ...currentTree, chapters: newChapters });
    }

    // Auto-save calling this
    saveLesson(lessonId: string, updates: Partial<LessonDraftDTO>) {
        this.isSaving.set(true);
        this.service.updateLesson(lessonId, updates)
            .pipe(finalize(() => this.isSaving.set(false)))
            .subscribe({
                error: () => this.toast.open('Failed to save lesson changes', 'Close', { duration: 3000 })
            });
    }
}
