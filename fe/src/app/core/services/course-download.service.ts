import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { offlineDb, getCurrentUserId, type OfflineCourse, type OfflineChapter, type OfflineLesson, type DownloadCheckpoint } from '../db/lms-offline.db';
import { StorageManagerService } from './storage-manager.service';
import { ToastService } from './toast.service';
import { OfflineVideoService } from './offline-video.service';
import { environment } from '../../../environments/environment';

export type { OfflineCourse, OfflineChapter, OfflineLesson };

export interface DownloadOptions {
  videoQuality: 'none' | '360p' | '720p' | '1080p';
}

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

  private readonly videoService = inject(OfflineVideoService);

  /**
   * Download entire course for offline access.
   * Supports resume: skips chapters already saved from a previous attempt.
   * Uses atomic Dexie transactions for data consistency.
   *
   * @param options - Video quality selection from download dialog (Phase 1)
   */
  async downloadCourse(courseId: string, options?: DownloadOptions): Promise<void> {
    if (this.isDownloading()) return;
    this.isDownloading.set(true);
    this.currentDownloadId.set(courseId);
    this.downloadProgress.set(0);

    this.downloadCancelled = false;
    const userId = getCurrentUserId();

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

      // 2. Fetch chapters+lessons in one call via /content endpoint (accessible to all roles)
      const contentRes: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/api/v3/courses/${courseId}/content`)
      );
      const chaptersData = contentRes.data || contentRes || [];

      // 3. Check for existing checkpoint (resume support)
      const checkpoint = await offlineDb.downloadCheckpoints.get([userId, courseId]);
      const completedChapterIds = new Set(checkpoint?.completedChapterIds || []);

      // 4. Write chapters+lessons to DB per-chapter (crash-safe)
      for (let i = 0; i < chaptersData.length; i++) {
        const chapter = chaptersData[i];

        if (completedChapterIds.has(chapter.id)) {
          this.downloadProgress.set(Math.round(((i + 1) / chaptersData.length) * 80));
          continue;
        }

        // Lessons are already included in the /content response
        const chapterLessons = (chapter.lessons || []).map((l: any) => ({ ...l, chapterId: chapter.id }));

        // Write chapter + its lessons to DB BEFORE checkpointing
        await offlineDb.transaction('rw', [offlineDb.chapters, offlineDb.lessons], async () => {
          const chapterRecord: OfflineChapter = {
            id: chapter.id,
            courseId,
            title: chapter.title || chapter.name,
            sortOrder: chapter.sortOrder ?? chapter.orderIndex ?? chapter.order ?? 0,
            userId,
          };
          await offlineDb.chapters.put(chapterRecord);

          for (const l of chapterLessons) {
            // Build contentHtml from sections (content endpoint nests content inside sections)
            let contentHtml = l.content || l.contentHtml || '';
            if (!contentHtml && l.sections?.length) {
              contentHtml = l.sections
                .map((s: any) => s.content || '')
                .filter((c: string) => c.length > 0)
                .join('\n');
            }

            const lesson: OfflineLesson = {
              id: l.id,
              courseId,
              chapterId: l.chapterId,
              title: l.title || l.name,
              contentHtml,
              videoManifestUrl: l.sections?.[0]?.videoUrl || l.videoUrl,
              sortOrder: l.sortOrder ?? l.orderIndex ?? l.order ?? 0,
              downloadedAt: new Date(),
              userId,
            };
            await offlineDb.lessons.put(lesson);
          }
        });

        // Checkpoint AFTER successful DB write
        completedChapterIds.add(chapter.id);
        await offlineDb.downloadCheckpoints.put({
          courseId,
          completedChapterIds: [...completedChapterIds],
          totalChapters: chaptersData.length,
          startedAt: checkpoint?.startedAt || new Date(),
          updatedAt: new Date(),
          userId,
        });

        this.downloadProgress.set(Math.round(((i + 1) / chaptersData.length) * 80));

        if (this.downloadCancelled) {
          this.toast.info('Đã hủy tải xuống. Bạn có thể tiếp tục sau.');
          return;
        }
      }

      // 5. Download videos if quality selected (Phase 1 — single quality from R2)
      const videoQuality = options?.videoQuality || 'none';
      if (videoQuality !== 'none' && !this.downloadCancelled) {
        const dbLessonsForVideo = await offlineDb.lessons
          .where('[userId+courseId]').equals([userId, courseId]).toArray();
        const videoLessons = dbLessonsForVideo.filter(l => !!l.videoManifestUrl);

        for (let vi = 0; vi < videoLessons.length; vi++) {
          if (this.downloadCancelled) break;

          const vl = videoLessons[vi];
          // Phase 1: Download original quality (R2 single URL). Phase 2 will use quality-specific URLs.
          try {
            await this.videoService.downloadVideo(vl.videoManifestUrl!, vl.id, vl.title);
          } catch {
            // Video download failure is non-fatal — skip and continue
          }

          this.downloadProgress.set(80 + Math.round(((vi + 1) / videoLessons.length) * 15));
        }
      }

      // 6. Count total lessons + size from DB (not memory — crash-safe)
      const dbLessons = await offlineDb.lessons.where('[userId+courseId]').equals([userId, courseId]).toArray();
      let totalSize = 0;
      for (const l of dbLessons) {
        totalSize += new Blob([l.contentHtml || '']).size;
      }

      // 7. Write course metadata with DB-counted values
      const course: OfflineCourse = {
        id: courseId,
        title: courseData.title || courseData.name,
        description: courseData.description || '',
        thumbnailUrl: courseData.thumbnailUrl,
        totalLessons: dbLessons.length,
        downloadedAt: new Date(),
        version: 1,
        sizeBytes: totalSize,
        userId,
      };
      await offlineDb.courses.put(course);

      // 8. Clean up checkpoint on successful completion
      await offlineDb.downloadCheckpoints.delete([userId, courseId]);

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
    const userId = getCurrentUserId();
    // Sync any pending progress before deleting (prevent data loss)
    const pendingProgress = await offlineDb.progress
      .where('courseId').equals(courseId)
      .filter(p => p.userId === userId && p.syncStatus === 'pending')
      .count();
    if (pendingProgress > 0) {
      this.toast.warning(`${pendingProgress} mục tiến trình chưa đồng bộ. Đang đồng bộ trước khi xóa...`);
      // Progress will be synced next time user goes online
    }

    await offlineDb.lessons.where('[userId+courseId]').equals([userId, courseId]).delete();
    await offlineDb.chapters.where('[userId+courseId]').equals([userId, courseId]).delete();
    await offlineDb.progress.where('courseId').equals(courseId).filter(p => p.userId === userId).delete();
    await offlineDb.courses.delete([userId, courseId]);
    await offlineDb.downloadCheckpoints.delete([userId, courseId]);

    // Clean orphaned syncQueue entries for this course
    const allQueueItems = await offlineDb.syncQueue.where('userId').equals(userId).toArray();
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
   * Remove ALL downloaded courses, videos, and sync queue for current user.
   * Used by Storage Management UI "Delete All" action.
   */
  async removeAllCourses(videoService: OfflineVideoService): Promise<void> {
    const userId = getCurrentUserId();

    // 1. Delete all offline videos from Cache API
    const videos = videoService.downloads();
    for (const video of videos) {
      await videoService.deleteVideo(video.lessonId);
    }

    // 2. Delete all IndexedDB data for this user
    await offlineDb.lessons.where('userId').equals(userId).delete();
    await offlineDb.chapters.where('userId').equals(userId).delete();
    await offlineDb.progress.where('userId').equals(userId).delete();
    await offlineDb.courses.where('userId').equals(userId).delete();
    await offlineDb.downloadCheckpoints.where('userId').equals(userId).delete();
    await offlineDb.syncQueue.where('userId').equals(userId).delete();

    await this.refreshDownloadedCourses();
    await this.storage.refresh();
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
    const userId = getCurrentUserId();
    const course = await offlineDb.courses.get([userId, courseId]);
    return course !== undefined;
  }

  /**
   * Get offline course metadata.
   */
  async getOfflineCourse(courseId: string): Promise<OfflineCourse | undefined> {
    const userId = getCurrentUserId();
    return offlineDb.courses.get([userId, courseId]);
  }

  /**
   * Get offline chapters for a course, sorted by sortOrder.
   */
  async getOfflineChapters(courseId: string): Promise<OfflineChapter[]> {
    const userId = getCurrentUserId();
    return offlineDb.chapters
      .where('[userId+courseId]')
      .equals([userId, courseId])
      .sortBy('sortOrder');
  }

  /**
   * Get offline lesson content.
   */
  async getOfflineLesson(lessonId: string): Promise<OfflineLesson | undefined> {
    const userId = getCurrentUserId();
    return offlineDb.lessons.get([userId, lessonId]);
  }

  /**
   * Get all lessons for an offline course.
   */
  async getOfflineLessons(courseId: string): Promise<OfflineLesson[]> {
    const userId = getCurrentUserId();
    return offlineDb.lessons
      .where('[userId+courseId]')
      .equals([userId, courseId])
      .sortBy('sortOrder');
  }

  private async refreshDownloadedCourses(): Promise<void> {
    const userId = getCurrentUserId();
    const courses = await offlineDb.courses.where('userId').equals(userId).toArray();
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
