import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ensureOfflineDbReady,
  isOfflineDbUnavailableError,
  isOfflinePersistenceSupported,
  offlineDb,
  getCurrentUserId,
  type OfflineCourse,
  type OfflineChapter,
  type OfflineLesson,
  type OfflineLessonSection,
  type DownloadCheckpoint,
  type OfflineQuizData,
  type OfflineQuestion,
} from '../db/lms-offline.db';
import { StorageManagerService } from './storage-manager.service';
import { ToastService } from './toast.service';
import { OfflineVideoService } from './offline-video.service';
import { OfflineFileService } from './offline-file.service';
import { environment } from '../../../environments/environment';

export type { OfflineCourse, OfflineChapter, OfflineLesson };

// Re-export DownloadOptions from the canonical source (download-dialog)
export type { DownloadOptions } from '../../shared/components/download-dialog/download-dialog.component';
import type { DownloadOptions } from '../../shared/components/download-dialog/download-dialog.component';

export interface DownloadableCourse {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  teacherName?: string;
  deliveryMode?: 'SELF_PACED' | 'INSTRUCTOR_LED';
  totalLessons: number;
  isDownloaded: boolean;
  downloadedAt?: Date;
  sizeBytes: number;
  contentVersion?: number;
  publicationId?: string | null;
  publicationNumber?: number | null;
  versionModeSnapshot?: 'PINNED' | 'FOLLOW_LATEST' | 'LEGACY';
  isStale?: boolean;
  staleReason?: string | null;
  completionPercent: number;
}

@Injectable({ providedIn: 'root' })
export class CourseDownloadService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageManagerService);
  private readonly toast = inject(ToastService);
  private readonly videoService = inject(OfflineVideoService);
  private readonly fileService = inject(OfflineFileService);

  readonly downloadedCourses = signal<DownloadableCourse[]>([]);
  readonly isDownloading = signal(false);
  readonly downloadProgress = signal(0);
  readonly currentDownloadId = signal<string | null>(null);
  readonly isBulkUpdating = signal(false);
  readonly bulkUpdateProgress = signal<{ current: number; total: number }>({ current: 0, total: 0 });

  readonly downloadedCount = computed(() => this.downloadedCourses().length);

  /** Set to true to cancel current download after the current chapter finishes */
  private downloadCancelled = false;
  private readonly offlineSupported = isOfflinePersistenceSupported();
  private offlineUnavailableToastShown = false;

  constructor() {
    if (!this.offlineSupported) {
      return;
    }
    void this.refreshDownloadedCourses().catch((error) => {
      if (!isOfflineDbUnavailableError(error)) {
        console.error('[CourseDownloadService] Failed to initialize offline downloads:', error);
      }
    });
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
      await this.ensureOfflineReady();

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
              lessonType: l.lessonType || l.type || 'LECTURE',
              isFree: l.isFree === true,
              sections: this.mapOfflineLessonSections(l),
              videoManifestUrl: l.sections?.find((section: any) => section.type === 'VIDEO' && (!!section.videoUrl || !!section.streamVideoUid))?.videoUrl || l.videoUrl,
              streamVideoUid: l.streamVideoUid,
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
          try {
            let downloadUrl = vl.videoManifestUrl!;
            // Phase 3C: Use CF quality-specific MP4 URL when lesson is CF-hosted
            if (vl.streamVideoUid) {
              try {
                const cfRes: any = await firstValueFrom(
                  this.http.get(`${environment.apiUrl}/api/v3/lessons/${vl.id}/video/download`, {
                    params: { quality: videoQuality }
                  })
                );
                const cfUrl = cfRes?.downloadUrl ?? cfRes?.data?.downloadUrl;
                if (cfUrl) downloadUrl = cfUrl;
              } catch {
                // CF URL fetch failed — fall through to raw videoManifestUrl
              }
            }
            await this.videoService.downloadVideo(downloadUrl, vl.id, vl.title);
          } catch {
            // Video download failure is non-fatal — skip and continue
          }

          this.downloadProgress.set(80 + Math.round(((vi + 1) / videoLessons.length) * 15));
        }
      }

      if (!this.downloadCancelled) {
        const lessonsWithSectionAssets = await offlineDb.lessons
          .where('[userId+courseId]').equals([userId, courseId]).toArray();

        for (const lesson of lessonsWithSectionAssets) {
          if (this.downloadCancelled || !lesson.sections?.length) break;

          let sectionsChanged = false;
          const updatedSections = lesson.sections.map(section => ({ ...section }));

          for (const section of updatedSections) {
            if (section.type === 'VIDEO' && videoQuality !== 'none') {
              try {
                const downloadUrl = await this.resolveSectionVideoDownloadUrl(section, videoQuality);
                if (downloadUrl) {
                  section.videoOfflineUri = await this.videoService.downloadSectionVideo(downloadUrl, section.id);
                  sectionsChanged = true;
                }
              } catch {
                // Section video download failure is non-fatal
              }
            }

            if (section.type === 'FILE' && section.fileUrl) {
              try {
                section.fileOfflineUri = await this.fileService.downloadSectionFile(section.fileUrl, section.id);
                sectionsChanged = true;
              } catch {
                // Section file download failure is non-fatal
              }
            }
          }

          if (sectionsChanged) {
            await offlineDb.lessons.update([userId, lesson.id], {
              sections: updatedSections,
            });
          }
        }
      }

      // 5b. Download quiz data for lessons (offline quiz support)
      if (!this.downloadCancelled) {
        const allLessons = await offlineDb.lessons
          .where('[userId+courseId]').equals([userId, courseId]).toArray();
        for (const lesson of allLessons) {
          if (this.downloadCancelled) break;
          try {
            const quizRes: any = await firstValueFrom(
              this.http.get(`${environment.apiUrl}/api/v3/quizzes/lessons/${lesson.id}`)
            );
            const quizList: any[] = quizRes?.data ?? (Array.isArray(quizRes) ? quizRes : []);
            for (const quiz of quizList) {
              const quizType = this.normalizeQuizAssessmentType(quiz.quizType);
              if (!this.canDownloadQuizOffline(quizType)) {
                continue;
              }

              const qRes: any = await firstValueFrom(
                this.http.get(`${environment.apiUrl}/api/v3/quizzes/${quiz.id}/questions`)
              );
              const rawQuestions: any[] = qRes?.data ?? qRes ?? [];
              const questions: OfflineQuestion[] = this.mapOfflineQuizQuestions(rawQuestions);
              const quizData: OfflineQuizData = {
                quizId: quiz.id,
                lessonId: lesson.id,
                mode: 'lesson',
                courseId,
                userId,
                title: quiz.title || quiz.name || '',
                quizType,
                countsTowardCertificate: Boolean(quiz.countsTowardCertificate) && quizType === 'EXAM',
                allowOffline: true,
                passingScore: quiz.passingScore ?? 60,
                timeLimit: quiz.timeLimitMinutes ?? quiz.timeLimit ?? undefined,
                maxAttempts: quiz.maxAttempts ?? 1,
                shuffleQuestions: quiz.shuffleQuestions === true,
                shuffleOptions: quiz.shuffleOptions === true,
                showResultsImmediately: quiz.showResultsImmediately !== false,
                showCorrectAnswers: quiz.showCorrectAnswers !== false,
                questions,
                downloadedAt: new Date(),
              };
              await offlineDb.quizData.put(quizData);
            }
          } catch {
            // Quiz download failure is non-fatal — skip this lesson's quiz
          }
        }
      }

      // 6. Count total lessons + size from DB (not memory — crash-safe)
      if (!this.downloadCancelled) {
        const allLessons = await offlineDb.lessons
          .where('[userId+courseId]').equals([userId, courseId]).toArray();

        for (const lesson of allLessons) {
          for (const section of lesson.sections ?? []) {
            if (section.type !== 'QUIZ' || !section.quizData?.questions?.length) {
              continue;
            }

            const quizType = this.normalizeQuizAssessmentType(section.quizData.quizType);
            if (!this.canDownloadQuizOffline(quizType)) {
              continue;
            }

            const quizData: OfflineQuizData = {
              quizId: `section:${section.id}`,
              lessonId: lesson.id,
              sectionId: section.id,
              mode: 'section',
              courseId,
              userId,
              title: section.title || lesson.title,
              quizType,
              countsTowardCertificate: Boolean(section.quizData.countsTowardCertificate) && quizType === 'EXAM',
              allowOffline: true,
              passingScore: section.quizData.passingScore ?? 60,
              timeLimit: section.quizData.timeLimitMinutes ?? undefined,
              maxAttempts: section.quizData.maxAttempts ?? 1,
              shuffleQuestions: section.quizData.shuffleQuestions === true,
              shuffleOptions: section.quizData.shuffleOptions === true,
              showResultsImmediately: section.quizData.showResultsImmediately !== false,
              showCorrectAnswers: section.quizData.showCorrectAnswers !== false,
              questions: this.mapOfflineQuizQuestions(section.quizData.questions),
              downloadedAt: new Date(),
            };
            await offlineDb.quizData.put(quizData);
          }
        }
      }

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
        teacherName: courseData.teacherName || courseData.instructorName || courseData.instructor?.name,
        deliveryMode: courseData.deliveryMode || 'SELF_PACED',
        totalLessons: dbLessons.length,
        downloadedAt: new Date(),
        version: 1,
        sizeBytes: totalSize,
        userId,
        contentVersion: courseData.contentVersion || 1,
        publicationId: courseData.publicationId ?? null,
        publicationNumber: courseData.publicationNumber ?? null,
        versionModeSnapshot: courseData.versionMode ?? 'LEGACY',
        isStale: false,
        staleReason: null,
      };
      await offlineDb.courses.put(course);

      // 8. Clean up checkpoint on successful completion
      await offlineDb.downloadCheckpoints.delete([userId, courseId]);

      this.downloadProgress.set(100);
      this.toast.success(`Đã tải khóa học "${courseData.title || courseData.name}" cho ngoại tuyến`);

      await this.refreshDownloadedCourses();
      await this.storage.refresh();
    } catch (error: any) {
      if (isOfflineDbUnavailableError(error)) {
        return;
      }
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
    await this.ensureOfflineReady();
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

    // Delete offline videos from Cache API before removing lesson records
    const lessonsToRemove = await offlineDb.lessons.where('[userId+courseId]').equals([userId, courseId]).toArray();
    for (const l of lessonsToRemove) {
      if (l.videoOfflineUri || this.videoService.isAvailableOffline(l.id)) {
        await this.videoService.deleteVideo(l.id);
      }
      for (const section of l.sections ?? []) {
        if (section.videoOfflineUri) {
          await this.videoService.deleteSectionVideo(section.id);
        }
        if (section.fileOfflineUri) {
          await this.fileService.deleteSectionFile(section.id);
        }
      }
    }

    await offlineDb.lessons.where('[userId+courseId]').equals([userId, courseId]).delete();
    await offlineDb.chapters.where('[userId+courseId]').equals([userId, courseId]).delete();
    await offlineDb.quizData.where('[userId+courseId]').equals([userId, courseId]).delete();
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
    await this.ensureOfflineReady();
    const userId = getCurrentUserId();
    const lessons = await offlineDb.lessons.where('userId').equals(userId).toArray();

    // 1. Delete all offline videos from Cache API
    const videos = videoService.downloads();
    for (const video of videos) {
      await videoService.deleteVideo(video.lessonId);
    }
    for (const lesson of lessons) {
      for (const section of lesson.sections ?? []) {
        if (section.videoOfflineUri) {
          await this.videoService.deleteSectionVideo(section.id);
        }
        if (section.fileOfflineUri) {
          await this.fileService.deleteSectionFile(section.id);
        }
      }
    }

    // 2. Delete all IndexedDB data for this user
    await offlineDb.lessons.where('userId').equals(userId).delete();
    await offlineDb.chapters.where('userId').equals(userId).delete();
    await offlineDb.quizData.where('userId').equals(userId).delete();
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
    if (!(await this.ensureOfflineReady(true))) {
      return false;
    }
    const userId = getCurrentUserId();
    const course = await offlineDb.courses.get([userId, courseId]);
    return course !== undefined;
  }

  /**
   * Get offline course metadata.
   */
  async getOfflineCourse(courseId: string): Promise<OfflineCourse | undefined> {
    if (!(await this.ensureOfflineReady(true))) {
      return undefined;
    }
    const userId = getCurrentUserId();
    return offlineDb.courses.get([userId, courseId]);
  }

  /**
   * Get offline chapters for a course, sorted by sortOrder.
   */
  async getOfflineChapters(courseId: string): Promise<OfflineChapter[]> {
    if (!(await this.ensureOfflineReady(true))) {
      return [];
    }
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
    if (!(await this.ensureOfflineReady(true))) {
      return undefined;
    }
    const userId = getCurrentUserId();
    return offlineDb.lessons.get([userId, lessonId]);
  }

  /**
   * Get all lessons for an offline course.
   */
  async getOfflineLessons(courseId: string): Promise<OfflineLesson[]> {
    if (!(await this.ensureOfflineReady(true))) {
      return [];
    }
    const userId = getCurrentUserId();
    return offlineDb.lessons
      .where('[userId+courseId]')
      .equals([userId, courseId])
      .sortBy('sortOrder');
  }

  /**
   * Resolve the best lesson to open for an offline course.
   * Prefers the learner's last accessed lesson, then the first incomplete lesson,
   * then falls back to the first lesson in chapter/lesson order.
   */
  async getOfflineResumeLessonId(courseId: string): Promise<string | null> {
    if (!(await this.ensureOfflineReady(true))) {
      return null;
    }

    const [chapters, lessons] = await Promise.all([
      this.getOfflineChapters(courseId),
      this.getOfflineLessons(courseId),
    ]);

    if (lessons.length === 0) {
      return null;
    }

    const chapterOrder = new Map(
      chapters.map((chapter, index) => [chapter.id, chapter.sortOrder ?? index])
    );

    const orderedLessons = [...lessons].sort((left, right) => {
      const leftChapterOrder = chapterOrder.get(left.chapterId) ?? Number.MAX_SAFE_INTEGER;
      const rightChapterOrder = chapterOrder.get(right.chapterId) ?? Number.MAX_SAFE_INTEGER;

      if (leftChapterOrder !== rightChapterOrder) {
        return leftChapterOrder - rightChapterOrder;
      }

      return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
    });

    const progress = this.readOfflineLearningProgress(courseId);
    const lessonIds = new Set(orderedLessons.map(lesson => lesson.id));
    const lastAccessedLessonId = progress?.lastAccessedLessonId;

    if (lastAccessedLessonId && lessonIds.has(lastAccessedLessonId)) {
      return lastAccessedLessonId;
    }

    const completedLessonIds = new Set(progress?.completedLessons ?? []);
    const firstIncompleteLesson = orderedLessons.find(lesson => !completedLessonIds.has(lesson.id));

    return firstIncompleteLesson?.id ?? orderedLessons[0]?.id ?? null;
  }

  /**
   * Bulk re-download all stale courses sequentially.
   * Shows progress: "Đang cập nhật 2/3 khóa học..."
   */
  async bulkUpdateStale(): Promise<void> {
    if (this.isBulkUpdating()) return;
    await this.ensureOfflineReady();
    const stale = this.downloadedCourses().filter(c => c.isStale);
    if (stale.length === 0) return;

    this.isBulkUpdating.set(true);
    this.bulkUpdateProgress.set({ current: 0, total: stale.length });
    try {
      for (let i = 0; i < stale.length; i++) {
        this.bulkUpdateProgress.set({ current: i, total: stale.length });
        await this.removeCourse(stale[i].id);
        await this.downloadCourse(stale[i].id);
      }
      this.bulkUpdateProgress.set({ current: stale.length, total: stale.length });
      this.toast.success(`Đã cập nhật ${stale.length} khóa học`);
    } finally {
      this.isBulkUpdating.set(false);
      this.bulkUpdateProgress.set({ current: 0, total: 0 });
    }
  }

  /**
   * Return the latest downloaded-course snapshot for the current user.
   * Intended for UI fallbacks such as offline "My Courses" surfaces.
   */
  async listDownloadedCourses(): Promise<DownloadableCourse[]> {
    try {
      await this.refreshDownloadedCourses();
    } catch (error) {
      if (!isOfflineDbUnavailableError(error)) {
        throw error;
      }
    }
    return this.downloadedCourses();
  }

  private mapOfflineLessonSections(lesson: any): OfflineLessonSection[] | undefined {
    if (!Array.isArray(lesson?.sections) || lesson.sections.length === 0) {
      return undefined;
    }

    return lesson.sections.map((section: any, index: number) => ({
      id: section.id,
      lessonId: lesson.id,
      title: section.title || `Muc ${index + 1}`,
      type: section.type || 'TEXT',
      content: section.content || '',
      contentBlocks: Array.isArray(section.contentBlocks) ? section.contentBlocks : [],
      videoUrl: section.videoUrl,
      videoType: section.videoType,
      streamVideoUid: section.streamVideoUid,
      fileUrl: section.fileUrl || section.downloadUrl,
      fileName: section.fileName,
      sortOrder: section.sortOrder ?? index,
      quizData: section.quizData ? {
        quizType: this.normalizeQuizAssessmentType(section.quizData.quizType),
        countsTowardCertificate: Boolean(section.quizData.countsTowardCertificate)
          && this.normalizeQuizAssessmentType(section.quizData.quizType) === 'EXAM',
        allowOffline: this.canDownloadQuizOffline(this.normalizeQuizAssessmentType(section.quizData.quizType)),
        timeLimitMinutes: section.quizData.timeLimitMinutes ?? null,
        passingScore: section.quizData.passingScore ?? null,
        maxAttempts: section.quizData.maxAttempts ?? null,
        shuffleQuestions: section.quizData.shuffleQuestions === true,
        shuffleOptions: section.quizData.shuffleOptions === true,
        showResultsImmediately: section.quizData.showResultsImmediately !== false,
        showCorrectAnswers: section.quizData.showCorrectAnswers !== false,
        questions: Array.isArray(section.quizData.questions)
          ? section.quizData.questions.map((question: any) => ({
              id: question.id,
              content: question.content || '',
              contentBlocks: Array.isArray(question.contentBlocks) ? question.contentBlocks : [],
              questionType: question.questionType || 'SINGLE_CHOICE',
              options: Array.isArray(question.options)
                ? question.options.map((option: any, optionIndex: number) => ({
                    optionKey: option.optionKey || option.key || String.fromCharCode(65 + optionIndex),
                    content: option.content || '',
                    contentBlocks: Array.isArray(option.contentBlocks) ? option.contentBlocks : [],
                    displayOrder: option.displayOrder ?? optionIndex,
                  }))
                : [],
            }))
          : [],
      } : undefined,
    }));
  }

  private normalizeQuizAssessmentType(rawQuizType: unknown): 'PRACTICE' | 'ASSESSMENT' | 'EXAM' {
    const normalized = typeof rawQuizType === 'string'
      ? rawQuizType.trim().toUpperCase()
      : 'ASSESSMENT';

    if (normalized === 'PRACTICE' || normalized === 'EXAM') {
      return normalized;
    }

    return 'ASSESSMENT';
  }

  private canDownloadQuizOffline(quizType: unknown): boolean {
    return this.normalizeQuizAssessmentType(quizType) === 'PRACTICE';
  }

  private async resolveSectionVideoDownloadUrl(
    section: OfflineLessonSection,
    quality: '360p' | '720p' | '1080p'
  ): Promise<string | null> {
    if (section.videoType === 'YOUTUBE') {
      return null;
    }

    if (section.streamVideoUid) {
      try {
        const response: any = await firstValueFrom(
          this.http.get(`${environment.apiUrl}/api/v3/sections/${section.id}/video/download`, {
            params: { quality }
          })
        );
        return response?.downloadUrl ?? response?.data?.downloadUrl ?? null;
      } catch {
        // Fall back to raw video URL when a section still carries a direct URL.
      }
    }

    return section.videoUrl || null;
  }

  private mapOfflineQuizQuestions(rawQuestions: any[]): OfflineQuestion[] {
    return rawQuestions.map((q: any) => ({
      id: q.id,
      content: q.content || q.text || '',
      contentBlocks: Array.isArray(q.contentBlocks)
        ? q.contentBlocks
        : Array.isArray(q.structuredContent)
          ? q.structuredContent
          : [],
      questionType: q.questionType || 'SINGLE_CHOICE',
      options: (q.options || []).map((o: any, index: number) => ({
        optionKey: o.optionKey || o.key || String.fromCharCode(65 + index),
        content: o.content || o.text || '',
        contentBlocks: Array.isArray(o.contentBlocks) ? o.contentBlocks : [],
        displayOrder: o.displayOrder ?? index,
      })),
    }));
  }

  private async refreshDownloadedCourses(): Promise<void> {
    if (!(await this.ensureOfflineReady(true))) {
      this.downloadedCourses.set([]);
      return;
    }
    const userId = getCurrentUserId();
    const courses = await offlineDb.courses.where('userId').equals(userId).toArray();

    // Compute completion % per course from progress table (parallel queries)
    const completionList = await Promise.all(
      courses.map(async c => {
        const [lessonCount, completedCount] = await Promise.all([
          offlineDb.lessons.where('[userId+courseId]').equals([userId, c.id]).count(),
          offlineDb.progress
            .where('courseId').equals(c.id)
            .filter(p => p.userId === userId && (p.completedAt != null || p.progressPercent >= 100))
            .count(),
        ]);
        return { id: c.id, percent: lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0 };
      })
    );
    const completionMap = new Map(completionList.map(d => [d.id, d.percent]));

    this.downloadedCourses.set(
      courses.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        teacherName: c.teacherName,
        deliveryMode: c.deliveryMode,
        totalLessons: c.totalLessons,
        isDownloaded: true,
        downloadedAt: c.downloadedAt,
        sizeBytes: c.sizeBytes,
        contentVersion: c.contentVersion,
        publicationId: c.publicationId,
        publicationNumber: c.publicationNumber,
        versionModeSnapshot: c.versionModeSnapshot,
        isStale: c.isStale,
        staleReason: c.staleReason,
        completionPercent: completionMap.get(c.id) ?? 0,
      }))
    );
  }

  private async ensureOfflineReady(optional = false): Promise<boolean> {
    try {
      await ensureOfflineDbReady();
      return true;
    } catch (error) {
      if (!isOfflineDbUnavailableError(error)) {
        throw error;
      }

      if (!optional) {
        this.maybeToastOfflineUnavailable();
        throw error;
      }

      return false;
    }
  }

  private maybeToastOfflineUnavailable(): void {
    if (this.offlineUnavailableToastShown) {
      return;
    }

    this.offlineUnavailableToastShown = true;
    this.toast.warning(this.getOfflineUnavailableMessage());
  }

  private getOfflineUnavailableMessage(): string {
    return 'Bộ nhớ ngoại tuyến trên trình duyệt này đang gặp sự cố. Hệ thống sẽ tạm chuyển sang chế độ chỉ dùng online.';
  }

  private readOfflineLearningProgress(courseId: string): {
    completedLessons?: string[];
    lastAccessedLessonId?: string;
  } | null {
    try {
      const stored = localStorage.getItem(`learning_progress_${courseId}`);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return {
        completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
        lastAccessedLessonId: typeof parsed.lastAccessedLessonId === 'string'
          ? parsed.lastAccessedLessonId
          : undefined,
      };
    } catch {
      return null;
    }
  }
}
