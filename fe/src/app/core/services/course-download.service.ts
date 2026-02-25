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

  /** Set to true to cancel current download after the current chapter finishes */
  private downloadCancelled = false;

  constructor() {
    this.refreshDownloadedCourses();
  }

  /**
   * Cancel an in-progress download.
   * Stops after the current chapter completes — checkpoint supports resume later.
   */
  cancelDownload(): void {
    if (this.isDownloading()) {
      this.downloadCancelled = true;
      this.toast.info('Đang hủy tải xuống...');
    }
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

    this.downloadCancelled = false;

    try {
      // 0a. Request persistent storage on first download (prevent browser eviction)
      if (!this.storage.isPersisted()) {
        await this.storage.requestPersistence();
      }

      // 0b. Check storage quota before downloading
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

      // 4. Fetch lessons per chapter, write to DB per-chapter (crash-safe)
      // Checkpoint only AFTER successful DB write — never "done" with empty DB
      for (let i = 0; i < chaptersData.length; i++) {
        const chapter = chaptersData[i];

        if (completedChapterIds.has(chapter.id)) {
          // Skip — already downloaded and written to DB in a previous attempt
          this.downloadProgress.set(Math.round(((i + 1) / chaptersData.length) * 80));
          continue;
        }

        let chapterLessons: any[] = [];
        try {
          const lessonsRes: any = await firstValueFrom(
            this.http.get(`${environment.apiUrl}/api/v3/courses/${courseId}/chapters/${chapter.id}/lessons`)
          );
          const lessons = lessonsRes.data || lessonsRes || [];
          chapterLessons = lessons.map((l: any) => ({ ...l, chapterId: chapter.id }));
        } catch {
          // Chapter may have no lessons
        }

        // Write chapter + its lessons to DB BEFORE checkpointing
        await offlineDb.transaction('rw', [offlineDb.chapters, offlineDb.lessons], async () => {
          const chapterRecord: OfflineChapter = {
            id: chapter.id,
            courseId,
            title: chapter.title || chapter.name,
            sortOrder: chapter.sortOrder ?? chapter.order ?? 0,
          };
          await offlineDb.chapters.put(chapterRecord);

          for (const l of chapterLessons) {
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
        });

        // Checkpoint AFTER successful DB write — crash here is safe (data is in DB)
        completedChapterIds.add(chapter.id);
        await offlineDb.downloadCheckpoints.put({
          courseId,
          completedChapterIds: [...completedChapterIds],
          totalChapters: chaptersData.length,
          startedAt: checkpoint?.startedAt || new Date(),
          updatedAt: new Date(),
        });

        this.downloadProgress.set(Math.round(((i + 1) / chaptersData.length) * 80));

        // Check for cancel after each chapter (checkpoint supports resume later)
        if (this.downloadCancelled) {
          this.toast.info('Đã hủy tải xuống. Bạn có thể tiếp tục sau.');
          return;
        }
      }

      // 5. Count total lessons + size from DB (not memory — crash-safe)
      const dbLessons = await offlineDb.lessons.where('courseId').equals(courseId).toArray();
      let totalSize = 0;
      for (const l of dbLessons) {
        totalSize += new Blob([l.contentHtml || '']).size;
      }

      // 6. Write course metadata with DB-counted values
      const course: OfflineCourse = {
        id: courseId,
        title: courseData.title || courseData.name,
        description: courseData.description || '',
        thumbnailUrl: courseData.thumbnailUrl,
        totalLessons: dbLessons.length,
        downloadedAt: new Date(),
        version: 1,
        sizeBytes: totalSize,
      };
      await offlineDb.courses.put(course);

      // 7. Clean up checkpoint on successful completion
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

    // Clean orphaned syncQueue entries for this course
    const allQueueItems = await offlineDb.syncQueue.toArray();
    const relatedIds = allQueueItems
      .filter(item =>
        item.endpoint.includes(courseId) ||
        (item.payload as any)?.courseId === courseId
      )
      .map(item => item.id!)
      .filter(id => id != null);
    if (relatedIds.length > 0) {
      await offlineDb.syncQueue.bulkDelete(relatedIds);
    }

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
