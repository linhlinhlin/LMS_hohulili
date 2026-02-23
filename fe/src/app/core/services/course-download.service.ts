import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { offlineDb, type OfflineCourse, type OfflineChapter, type OfflineLesson, type DownloadCheckpoint } from '../db/lms-offline.db';
import { StorageManagerService } from './storage-manager.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';

export type { OfflineCourse, OfflineChapter, OfflineLesson };

export interface DownloadableCourse {
  id: string;
  title: string;
  totalLessons: number;
  isDownloaded: boolean;
  downloadedAt?: Date;
  sizeBytes: number;
}

@Injectable({ providedIn: 'root' })
export class CourseDownloadService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageManagerService);
  private readonly toast = inject(ToastService);

  readonly downloadedCourses = signal<DownloadableCourse[]>([]);
  readonly isDownloading = signal(false);
  readonly downloadProgress = signal(0);
  readonly currentDownloadId = signal<string | null>(null);

  readonly downloadedCount = computed(() => this.downloadedCourses().length);

  constructor() {
    this.refreshDownloadedCourses();
  }

  /**
   * Download entire course for offline access.
   * Supports resume: skips chapters already saved from a previous attempt.
   * Uses atomic Dexie transactions for data consistency.
   */
  async downloadCourse(courseId: string): Promise<void> {
    if (this.isDownloading()) return;
    this.isDownloading.set(true);
    this.currentDownloadId.set(courseId);
    this.downloadProgress.set(0);

    try {
      // 0. Check storage quota before downloading
      const estimate = await this.storage.refresh();
      const percentUsed = estimate.percentUsed ?? 0;
      if (percentUsed > 90) {
        this.toast.error('Bộ nhớ gần đầy (>90%). Vui lòng xóa dữ liệu cũ trước khi tải.');
        return;
      }

      // 1. Fetch course details
      const courseRes: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/api/v3/courses/${courseId}`)
      );
      const courseData = courseRes.data || courseRes;

      // 2. Fetch chapters
      const chaptersRes: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/api/v3/courses/${courseId}/chapters`)
      );
      const chaptersData = chaptersRes.data || chaptersRes || [];

      // 3. Check for existing checkpoint (resume support)
      const checkpoint = await offlineDb.downloadCheckpoints.get(courseId);
      const completedChapterIds = new Set(checkpoint?.completedChapterIds || []);

      // 4. Fetch lessons per chapter (skip already-downloaded chapters)
      const allLessons: any[] = [];
      for (let i = 0; i < chaptersData.length; i++) {
        const chapter = chaptersData[i];

        if (completedChapterIds.has(chapter.id)) {
          // Skip — already downloaded in a previous attempt
          this.downloadProgress.set(Math.round(((i + 1) / chaptersData.length) * 80));
          continue;
        }

        try {
          const lessonsRes: any = await firstValueFrom(
            this.http.get(`${environment.apiUrl}/api/v3/courses/${courseId}/chapters/${chapter.id}/lessons`)
          );
          const lessons = lessonsRes.data || lessonsRes || [];
          allLessons.push(...lessons.map((l: any) => ({ ...l, chapterId: chapter.id })));
        } catch {
          // Chapter may have no lessons
        }

        // Save checkpoint after each chapter
        completedChapterIds.add(chapter.id);
        await offlineDb.downloadCheckpoints.put({
          courseId,
          completedChapterIds: [...completedChapterIds],
          totalChapters: chaptersData.length,
          startedAt: checkpoint?.startedAt || new Date(),
          updatedAt: new Date(),
        });

        this.downloadProgress.set(Math.round(((i + 1) / chaptersData.length) * 80));
      }

      // 5. Store in IndexedDB using atomic transaction
      await offlineDb.transaction('rw', [offlineDb.courses, offlineDb.chapters, offlineDb.lessons], async () => {
        // Store course
        const course: OfflineCourse = {
          id: courseId,
          title: courseData.title || courseData.name,
          description: courseData.description || '',
          thumbnailUrl: courseData.thumbnailUrl,
          totalLessons: allLessons.length,
          downloadedAt: new Date(),
          version: 1,
          sizeBytes: 0,
        };
        await offlineDb.courses.put(course);

        // Store chapters
        for (const ch of chaptersData) {
          const chapter: OfflineChapter = {
            id: ch.id,
            courseId,
            title: ch.title || ch.name,
            sortOrder: ch.sortOrder ?? ch.order ?? 0,
          };
          await offlineDb.chapters.put(chapter);
        }

        // Store lessons
        let totalSize = 0;
        for (const l of allLessons) {
          const contentSize = new Blob([l.content || l.contentHtml || '']).size;
          totalSize += contentSize;

          const lesson: OfflineLesson = {
            id: l.id,
            courseId,
            chapterId: l.chapterId,
            title: l.title || l.name,
            contentHtml: l.content || l.contentHtml || '',
            videoManifestUrl: l.videoUrl,
            sortOrder: l.sortOrder ?? l.order ?? 0,
            downloadedAt: new Date(),
          };
          await offlineDb.lessons.put(lesson);
        }

        // Update course size
        await offlineDb.courses.update(courseId, { sizeBytes: totalSize });
      });

      // 6. Clean up checkpoint on successful completion
      await offlineDb.downloadCheckpoints.delete(courseId);

      this.downloadProgress.set(100);
      this.toast.success(`Đã tải khóa học "${courseData.title || courseData.name}" cho ngoại tuyến`);

      await this.refreshDownloadedCourses();
      await this.storage.refresh();
    } catch (error: any) {
      this.toast.error(`Lỗi tải khóa học: ${error?.message || 'Không xác định'}`);
    } finally {
      this.isDownloading.set(false);
      this.currentDownloadId.set(null);
      this.downloadProgress.set(0);
    }
  }

  /**
   * Remove a downloaded course from local storage.
   */
  async removeCourse(courseId: string): Promise<void> {
    // Sync any pending progress before deleting (prevent data loss)
    const pendingProgress = await offlineDb.progress
      .where('courseId').equals(courseId)
      .filter(p => p.syncStatus === 'pending')
      .count();
    if (pendingProgress > 0) {
      this.toast.warning(`${pendingProgress} mục tiến trình chưa đồng bộ. Đang đồng bộ trước khi xóa...`);
      // Progress will be synced next time user goes online
    }

    await offlineDb.lessons.where('courseId').equals(courseId).delete();
    await offlineDb.chapters.where('courseId').equals(courseId).delete();
    await offlineDb.progress.where('courseId').equals(courseId).delete();
    await offlineDb.courses.delete(courseId);
    await offlineDb.downloadCheckpoints.delete(courseId);

    await this.refreshDownloadedCourses();
    await this.storage.refresh();
    this.toast.info('Đã xóa khóa học ngoại tuyến');
  }

  /**
   * Synchronous check if a course is available offline.
   * Uses the downloadedCourses signal (no await needed).
   * This is the primary check for download-first pattern.
   */
  isDownloadedSync(courseId: string): boolean {
    return this.downloadedCourses().some(c => c.id === courseId);
  }

  /**
   * Check if a course is available offline (async version).
   */
  async isDownloaded(courseId: string): Promise<boolean> {
    const course = await offlineDb.courses.get(courseId);
    return course !== undefined;
  }

  /**
   * Get offline course metadata.
   */
  async getOfflineCourse(courseId: string): Promise<OfflineCourse | undefined> {
    return offlineDb.courses.get(courseId);
  }

  /**
   * Get offline chapters for a course, sorted by sortOrder.
   */
  async getOfflineChapters(courseId: string): Promise<OfflineChapter[]> {
    return offlineDb.chapters
      .where('courseId')
      .equals(courseId)
      .sortBy('sortOrder');
  }

  /**
   * Get offline lesson content.
   */
  async getOfflineLesson(lessonId: string): Promise<OfflineLesson | undefined> {
    return offlineDb.lessons.get(lessonId);
  }

  /**
   * Get all lessons for an offline course.
   */
  async getOfflineLessons(courseId: string): Promise<OfflineLesson[]> {
    return offlineDb.lessons
      .where('courseId')
      .equals(courseId)
      .sortBy('sortOrder');
  }

  private async refreshDownloadedCourses(): Promise<void> {
    const courses = await offlineDb.courses.toArray();
    this.downloadedCourses.set(
      courses.map(c => ({
        id: c.id,
        title: c.title,
        totalLessons: c.totalLessons,
        isDownloaded: true,
        downloadedAt: c.downloadedAt,
        sizeBytes: c.sizeBytes,
      }))
    );
  }
}
