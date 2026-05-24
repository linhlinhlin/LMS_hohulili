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
  type OfflineQuizAttempt,
  type OfflineQuizData,
  type OfflineQuestion,
  type SyncQueueItem,
} from '../db/lms-offline.db';
import { StorageManagerService } from './storage-manager.service';
import { ToastService } from './toast.service';
import {
  OFFLINE_VIDEO_MAX_CACHE_BYTES,
  OfflineVideoService,
  isOfflineVideoTooLargeError,
} from './offline-video.service';
import { OfflineFileService } from './offline-file.service';
import {
  OfflineSimulationService,
  isOfflineSimulationTooLargeError,
} from './offline-simulation.service';
import { OfflineSyncService } from './offline-sync.service';
import { NetworkStatusService } from './network-status.service';
import { OfflineDeviceSettingsService } from './offline-device-settings.service';
import {
  formatOfflineVideoProfileLabel,
  getOfflineVideoProfileLabel,
  normalizeVideoQuality,
  type OfflineVideoProfileId,
  type VideoSourceKind,
} from '../models/video-quality';
import { isOnlineOnlyVideoSource } from '../utils/video-offline-policy';
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
  downloadOptions?: DownloadOptions | null;
  completionPercent: number;
}

interface DownloadCourseBehavior {
  throwOnError?: boolean;
  silentSuccessToast?: boolean;
  silentErrorToast?: boolean;
}

interface RemoveCourseOptions {
  preserveProgress?: boolean;
  preserveSyncArtifacts?: boolean;
  preserveAssetCaches?: boolean;
  silent?: boolean;
}

interface RefreshCoursePackageOptions {
  autoSyncAfterRefresh?: boolean;
}

interface OfflineVideoDownloadDescriptor {
  downloadUrl: string | null;
  actualResolution?: string | null;
  profile?: string | null;
  profileLabel?: string | null;
  fileSizeBytes?: number | null;
}

interface OfflineCourseSnapshot {
  course: OfflineCourse | null;
  chapters: OfflineChapter[];
  lessons: OfflineLesson[];
  quizData: OfflineQuizData[];
}

interface OfflineVideoSkipSummary {
  unsupported: number;
  placeholder: number;
  tooLarge: number;
  failed: number;
}

type OfflineVideoSkipReason = keyof OfflineVideoSkipSummary;

interface OfflineSimulationSkipSummary {
  disabled: number;
  unsupported: number;
  tooLarge: number;
  failed: number;
}

type OfflineSimulationSkipReason = keyof OfflineSimulationSkipSummary;

@Injectable({ providedIn: 'root' })
export class CourseDownloadService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageManagerService);
  private readonly toast = inject(ToastService);
  private readonly videoService = inject(OfflineVideoService);
  private readonly fileService = inject(OfflineFileService);
  private readonly simulationService = inject(OfflineSimulationService);
  private readonly syncService = inject(OfflineSyncService);
  private readonly network = inject(NetworkStatusService);
  private readonly offlineSettings = inject(OfflineDeviceSettingsService);

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

    // Auto-refresh downloaded courses when network status changes
    // This ensures UI shows correct offline availability after online/offline transitions
    if (typeof window !== 'undefined') {
      const handleNetworkChange = () => {
        // Debounce refresh to avoid multiple rapid calls
        setTimeout(() => {
          void this.refreshDownloadedCourses().catch(() => {
            // Silently fail — user will see stale data momentarily
          });
        }, 500);
      };
      window.addEventListener('online', handleNetworkChange);
      window.addEventListener('offline', handleNetworkChange);
    }
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
  async downloadCourse(
    courseId: string,
    options?: DownloadOptions,
    behavior: DownloadCourseBehavior = {},
  ): Promise<boolean> {
    if (this.isDownloading()) return false;
    this.isDownloading.set(true);
    this.currentDownloadId.set(courseId);
    this.downloadProgress.set(0);

    this.downloadCancelled = false;
    const userId = getCurrentUserId();
    const effectiveOptions = this.resolveEffectiveDownloadOptions(options);
    const videoSkipSummary: OfflineVideoSkipSummary = {
      unsupported: 0,
      placeholder: 0,
      tooLarge: 0,
      failed: 0,
    };
    const simulationSkipSummary: OfflineSimulationSkipSummary = {
      disabled: 0,
      unsupported: 0,
      tooLarge: 0,
      failed: 0,
    };

    try {
      await this.ensureOfflineReady();

      if (this.shouldBlockDownloadOnCurrentNetwork()) {
        if (!behavior.silentErrorToast) {
          this.toast.info('Thiết bị này đang ưu tiên chỉ tải khi có Wi‑Fi hoặc mạng không giới hạn. Hãy đổi mạng hoặc tắt giới hạn trong Lưu trữ ngoại tuyến.');
        }
        return false;
      }

      // 0a. Request persistent storage on first download (prevent browser eviction)
      if (!this.storage.isPersisted()) {
        await this.storage.requestPersistence();
        this.offlineSettings.markPersistenceRequested();
      }

      // 0b. Check storage quota before downloading
      const estimate = await this.storage.refresh();
      const percentUsed = estimate.percentUsed ?? 0;
      if (percentUsed > 90) {
        this.toast.error('Bộ nhớ gần đầy (>90%). Vui lòng xóa dữ liệu cũ trước khi tải.');
        return false;
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

            const shouldPersistLessonQuizMetadata = typeof l.quizType === 'string'
              || String(l.lessonType || l.type || '').toUpperCase() === 'QUIZ';
            const normalizedLessonQuizType = shouldPersistLessonQuizMetadata
              ? this.normalizeQuizAssessmentType(l.quizType)
              : undefined;

            const hasSectionVideoAssets = Array.isArray(l.sections)
              && l.sections.some((section: any) => section.type === 'VIDEO' && (!!section.videoUrl || !!section.streamVideoUid || !!section.videoAssetId));
            const lessonVideoSourceKind = this.resolveVideoSourceKind(
              l.videoSourceKind,
              hasSectionVideoAssets ? null : l.videoUrl,
              hasSectionVideoAssets ? null : l.streamVideoUid,
              hasSectionVideoAssets ? null : l.videoType,
            );
            const lesson: OfflineLesson = {
              id: l.id,
              courseId,
              chapterId: l.chapterId,
              title: l.title || l.name,
              contentHtml,
              lessonType: l.lessonType || l.type || 'LECTURE',
              isFree: l.isFree === true,
              quizType: normalizedLessonQuizType,
              countsTowardCertificate: normalizedLessonQuizType
                ? Boolean(l.countsTowardCertificate) && normalizedLessonQuizType === 'EXAM'
                : undefined,
              quizAllowOffline: normalizedLessonQuizType
                ? this.canDownloadQuizOffline(normalizedLessonQuizType)
                : undefined,
              sections: this.mapOfflineLessonSections(l),
              videoManifestUrl: hasSectionVideoAssets ? undefined : l.videoUrl,
              streamVideoUid: hasSectionVideoAssets ? undefined : l.streamVideoUid,
              videoSourceKind: hasSectionVideoAssets ? undefined : lessonVideoSourceKind,
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
          return false;
        }
      }

      // 5. Download videos if quality selected (Phase 1 — single quality from R2)
      const videoPreference = effectiveOptions.videoQuality || 'none';
      if (videoPreference !== 'none' && !this.downloadCancelled) {
        const dbLessonsForVideo = await offlineDb.lessons
          .where('[userId+courseId]').equals([userId, courseId]).toArray();
        const videoLessons = dbLessonsForVideo.filter(l => !!l.videoManifestUrl);

        for (let vi = 0; vi < videoLessons.length; vi++) {
          if (this.downloadCancelled) break;

          const vl = videoLessons[vi];
          try {
            if (isOnlineOnlyVideoSource({
              videoUrl: vl.videoManifestUrl,
              videoSourceKind: vl.videoSourceKind,
            })) {
              this.recordVideoSkip(videoSkipSummary, 'unsupported');
              continue;
            }

            let downloadUrl = vl.videoManifestUrl!;
            let downloadedVideoProfileId: OfflineVideoProfileId | null = null;
            let downloadedVideoProfileLabel: string | null = null;
            let downloadedVideoResolution: string | null = null;
            let downloadedVideoFileSizeBytes: number | null = null;
            let videoSourceKind = vl.videoSourceKind ?? this.resolveVideoSourceKind(
              null,
              vl.videoManifestUrl,
              vl.streamVideoUid,
            );
            // Phase 3C: Use CF quality-specific MP4 URL when lesson is CF-hosted
            if (vl.streamVideoUid) {
              try {
                const descriptor = await this.resolveLessonVideoDownloadDescriptor(vl.id, videoPreference);
                if (descriptor.downloadUrl) {
                  downloadUrl = descriptor.downloadUrl;
                }
                downloadedVideoProfileId = this.normalizeDownloadedProfileId(descriptor.profile);
                downloadedVideoProfileLabel = this.resolveDownloadedProfileLabel(
                  descriptor.profile,
                  descriptor.profileLabel,
                  descriptor.actualResolution,
                );
                downloadedVideoResolution = descriptor.actualResolution ?? null;
                downloadedVideoFileSizeBytes = descriptor.fileSizeBytes ?? null;
                videoSourceKind = 'STREAM';
              } catch {
                // CF URL fetch failed — fall through to raw videoManifestUrl
              }
            } else if (downloadUrl) {
              downloadedVideoProfileId = 'ORIGINAL';
              downloadedVideoProfileLabel = getOfflineVideoProfileLabel('ORIGINAL');
            }
            const skipReason = this.getOfflineVideoSkipReason({
              downloadUrl,
              fileSizeBytes: downloadedVideoFileSizeBytes,
            });
            if (skipReason) {
              this.recordVideoSkip(videoSkipSummary, skipReason);
              continue;
            }
            await this.videoService.downloadVideo(downloadUrl, vl.id);
            await offlineDb.lessons.update([userId, vl.id], {
              downloadedVideoProfileId,
              downloadedVideoProfileLabel,
              downloadedVideoResolution,
              videoSourceKind,
            });
          } catch (videoErr) {
            this.recordVideoDownloadError(videoSkipSummary, videoErr);
            // Non-fatal: text, quiz, and progress data remain available offline.
          }

          this.downloadProgress.set(80 + Math.round(((vi + 1) / videoLessons.length) * 15));
        }
      }

      if (!this.downloadCancelled) {
        const lessonsWithSectionAssets = await offlineDb.lessons
          .where('[userId+courseId]').equals([userId, courseId]).toArray();

        for (const lesson of lessonsWithSectionAssets) {
          if (this.downloadCancelled) {
            break;
          }

          if (!lesson.sections?.length) {
            continue;
          }

          let sectionsChanged = false;
          const updatedSections = lesson.sections.map(section => ({ ...section }));

          for (const section of updatedSections) {
            if (section.type === 'VIDEO' && videoPreference !== 'none') {
              try {
                const descriptor = await this.resolveSectionVideoDownloadDescriptor(section, videoPreference);
                if (descriptor.downloadUrl) {
                  const skipReason = this.getOfflineVideoSkipReason(descriptor);
                  if (skipReason) {
                    this.recordVideoSkip(videoSkipSummary, skipReason);
                    continue;
                  }

                  section.videoOfflineUri = await this.videoService.downloadSectionVideo(descriptor.downloadUrl, lesson.id, section.id);
                  section.downloadedVideoProfileId = this.normalizeDownloadedProfileId(descriptor.profile)
                    ?? (section.streamVideoUid ? null : 'ORIGINAL');
                  section.downloadedVideoProfileLabel = this.resolveDownloadedProfileLabel(
                    descriptor.profile,
                    descriptor.profileLabel,
                    descriptor.actualResolution,
                  ) ?? (section.streamVideoUid ? null : getOfflineVideoProfileLabel('ORIGINAL'));
                  section.downloadedVideoResolution = descriptor.actualResolution ?? null;
                  section.videoSourceKind = this.resolveVideoSourceKind(
                    section.videoSourceKind,
                    section.videoUrl,
                    section.streamVideoUid,
                    section.videoType,
                  );
                  sectionsChanged = true;
                } else {
                  // Descriptor has no offline MP4 rendition; keep this as debug-only telemetry.
                  this.recordVideoSkip(videoSkipSummary, 'unsupported');
                  console.debug('[CourseDownload] Section video không có downloadUrl (likely adaptive HLS, no MP4 rendition):', {
                    sectionId: section.id,
                    sectionTitle: section.title,
                    videoSourceKind: section.videoSourceKind,
                    videoType: section.videoType,
                  });
                }
              } catch (videoErr) {
                this.recordVideoDownloadError(videoSkipSummary, videoErr);
              }
            }

            if (section.type === 'FILE' && section.fileUrl) {
              try {
                section.fileOfflineUri = await this.fileService.downloadSectionFile(section.fileUrl, section.id);
                sectionsChanged = true;
              } catch (fileErr) {
                console.error('[CourseDownload] Section file download FAILED:', {
                  sectionId: section.id,
                  fileUrl: section.fileUrl,
                  error: fileErr instanceof Error ? fileErr.message : String(fileErr),
                });
              }
            }

            if (section.type === 'SIMULATION' && section.simulationData) {
              if (!effectiveOptions.includeSimulations) {
                this.recordSimulationSkip(simulationSkipSummary, 'disabled');
                continue;
              }

              try {
                const result = await this.simulationService.downloadPackage(section.simulationData);
                section.simulationOfflineReady = true;
                section.simulationOfflineBytes = result.bytes;
                section.simulationOfflineAt = new Date().toISOString();
                section.simulationOfflineError = null;
                section.simulationData = {
                  ...section.simulationData,
                  simulationOfflineReady: true,
                  simulationOfflineBytes: result.bytes,
                  simulationOfflineAt: section.simulationOfflineAt,
                  simulationOfflineError: null,
                };
                sectionsChanged = true;
              } catch (simulationErr) {
                section.simulationOfflineReady = false;
                section.simulationOfflineError = simulationErr instanceof Error ? simulationErr.message : String(simulationErr);
                section.simulationData = {
                  ...section.simulationData,
                  simulationOfflineReady: false,
                  simulationOfflineError: section.simulationOfflineError,
                };
                sectionsChanged = true;
                this.recordSimulationDownloadError(simulationSkipSummary, simulationErr);
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
              await offlineDb.lessons.update([userId, lesson.id], {
                quizType,
                countsTowardCertificate: Boolean(quiz.countsTowardCertificate) && quizType === 'EXAM',
                quizAllowOffline: true,
              });
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
      await this.snapshotInitialProgress(courseId, dbLessons);
      let totalSize = 0;

      // Quiz IDs stored separately in quizData table — skip when counting sections to avoid double-counting
      const dbQuizData = await offlineDb.quizData.where('[userId+courseId]').equals([userId, courseId]).toArray();
      const separateQuizSectionIds = new Set(dbQuizData.filter(q => q.sectionId).map(q => q.sectionId));

      for (const l of dbLessons) {
        // Count lesson HTML content
        totalSize += new Blob([l.contentHtml || '']).size;
        // Count sections — exclude QUIZ sections that are duplicated in quizData table
        if (l.sections?.length) {
          const nonDuplicatedSections = l.sections.filter(
            s => !(s.type === 'QUIZ' && s.quizData && separateQuizSectionIds.has(s.id))
          );
          if (nonDuplicatedSections.length > 0) {
            totalSize += new Blob([JSON.stringify(nonDuplicatedSections)]).size;
            totalSize += nonDuplicatedSections.reduce(
              (sum, section) => sum + (section.simulationOfflineBytes ?? section.simulationData?.simulationOfflineBytes ?? 0),
              0,
            );
          }
        }
      }
      // Count chapters metadata
      const dbChapters = await offlineDb.chapters.where('[userId+courseId]').equals([userId, courseId]).toArray();
      totalSize += new Blob([JSON.stringify(dbChapters)]).size;
      // Count quiz data (stored separately for offline quiz engine)
      if (dbQuizData.length > 0) {
        totalSize += new Blob([JSON.stringify(dbQuizData)]).size;
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
        downloadOptions: effectiveOptions,
      };
      await offlineDb.courses.put(course);

      // 8. Clean up checkpoint on successful completion
      await offlineDb.downloadCheckpoints.delete([userId, courseId]);

      this.downloadProgress.set(100);
      if (!behavior.silentSuccessToast) {
        this.toast.success(`Đã tải khóa học "${courseData.title || courseData.name}" cho ngoại tuyến`);
        this.showVideoSkipSummary(videoSkipSummary);
        this.showSimulationSkipSummary(simulationSkipSummary);
      }

      await this.refreshDownloadedCourses();
      await this.storage.refresh();
      return true;
    } catch (error: any) {
      if (isOfflineDbUnavailableError(error)) {
        if (behavior.throwOnError) {
          throw error;
        }
        return false;
      }
      if (!behavior.silentErrorToast) {
        this.toast.error(`Lỗi tải khóa học: ${error?.message || 'Không xác định'}`);
      }
      if (behavior.throwOnError) {
        throw error;
      }
      return false;
    } finally {
      this.isDownloading.set(false);
      this.currentDownloadId.set(null);
      this.downloadProgress.set(0);
    }
  }

  /**
   * Remove a downloaded course from local storage.
   */
  async removeCourse(courseId: string, options: RemoveCourseOptions = {}): Promise<void> {
    await this.ensureOfflineReady();
    const userId = getCurrentUserId();
    const preserveProgress = options.preserveProgress === true;
    const preserveSyncArtifacts = options.preserveSyncArtifacts === true;
    const preserveAssetCaches = options.preserveAssetCaches === true;
    // Sync any pending progress before deleting (prevent data loss)
    const pendingProgress = preserveProgress
      ? 0
      : await offlineDb.progress
        .where('courseId').equals(courseId)
        .filter(p => p.userId === userId && p.syncStatus === 'pending')
        .count();
    if (!options.silent && pendingProgress > 0) {
      this.toast.warning(`${pendingProgress} mục tiến trình chưa đồng bộ. Đang đồng bộ trước khi xóa...`);
      // Progress will be synced next time user goes online
    }

    // Delete offline videos from Cache API before removing lesson records
    const lessonsToRemove = await offlineDb.lessons.where('[userId+courseId]').equals([userId, courseId]).toArray();
    const lessonIdsToRemove = new Set(lessonsToRemove.map(lesson => lesson.id));
    const sectionIdsToRemove = new Set(
      lessonsToRemove.flatMap(lesson => (lesson.sections ?? []).map(section => section.id))
    );
    if (!preserveAssetCaches) {
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
          if (section.type === 'SIMULATION') {
            await this.simulationService.deletePackage(section.simulationData);
          }
        }
      }
    }

    await offlineDb.lessons.where('[userId+courseId]').equals([userId, courseId]).delete();
    await offlineDb.chapters.where('[userId+courseId]').equals([userId, courseId]).delete();
    await offlineDb.quizData.where('[userId+courseId]').equals([userId, courseId]).delete();
    if (!preserveProgress) {
      await offlineDb.progress.where('courseId').equals(courseId).filter(p => p.userId === userId).delete();
    }
    if (!preserveSyncArtifacts) {
      await offlineDb.quizAttempts
        .where('userId').equals(userId)
        .filter(attempt =>
          (attempt.lessonId != null && lessonIdsToRemove.has(attempt.lessonId))
          || (attempt.sectionId != null && sectionIdsToRemove.has(attempt.sectionId))
        )
        .delete();
    }
    await offlineDb.courses.delete([userId, courseId]);
    await offlineDb.downloadCheckpoints.delete([userId, courseId]);

    // Clean orphaned syncQueue entries for this course
    if (!preserveSyncArtifacts) {
      const allQueueItems = await offlineDb.syncQueue.where('userId').equals(userId).toArray();
      const relatedIds = allQueueItems
        .filter(item => {
          const payload = (item.payload && typeof item.payload === 'object')
            ? item.payload as Record<string, unknown>
            : null;
          const payloadCourseId = typeof payload?.['courseId'] === 'string' ? payload['courseId'] : null;
          const payloadLessonId = typeof payload?.['lessonId'] === 'string' ? payload['lessonId'] : null;
          const payloadSectionId = typeof payload?.['sectionId'] === 'string' ? payload['sectionId'] : null;

          return item.courseId === courseId
            || payloadCourseId === courseId
            || (payloadLessonId != null && lessonIdsToRemove.has(payloadLessonId))
            || (payloadSectionId != null && sectionIdsToRemove.has(payloadSectionId))
            || item.endpoint.includes(courseId);
        })
        .map(item => item.id!)
        .filter(id => id != null);
      if (relatedIds.length > 0) {
        await offlineDb.syncQueue.bulkDelete(relatedIds);
      }
    }

    await this.refreshDownloadedCourses();
    await this.storage.refresh();
    await this.syncService.refreshState();
    if (options.silent) {
      return;
    }
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
      await videoService.deleteEntry(video);
    }
    for (const lesson of lessons) {
      for (const section of lesson.sections ?? []) {
        if (section.videoOfflineUri) {
          await this.videoService.deleteSectionVideo(section.id);
        }
        if (section.fileOfflineUri) {
          await this.fileService.deleteSectionFile(section.id);
        }
        if (section.type === 'SIMULATION') {
          await this.simulationService.deletePackage(section.simulationData);
        }
      }
    }

    // 2. Delete all IndexedDB data for this user
    await offlineDb.lessons.where('userId').equals(userId).delete();
    await offlineDb.chapters.where('userId').equals(userId).delete();
    await offlineDb.quizData.where('userId').equals(userId).delete();
    await offlineDb.quizAttempts.where('userId').equals(userId).delete();
    await offlineDb.progress.where('userId').equals(userId).delete();
    await offlineDb.courses.where('userId').equals(userId).delete();
    await offlineDb.downloadCheckpoints.where('userId').equals(userId).delete();
    await offlineDb.syncQueue.where('userId').equals(userId).delete();

    await this.refreshDownloadedCourses();
    await this.storage.refresh();
    await this.syncService.refreshState();
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
    const lesson = await offlineDb.lessons.get([userId, lessonId]);
    if (!lesson) {
      return undefined;
    }

    return this.repairLessonVideoFallbackInStorage(userId, lesson);
  }

  /**
   * Get all lessons for an offline course.
   */
  async getOfflineLessons(courseId: string): Promise<OfflineLesson[]> {
    if (!(await this.ensureOfflineReady(true))) {
      return [];
    }
    const userId = getCurrentUserId();
    const lessons = await offlineDb.lessons
      .where('[userId+courseId]')
      .equals([userId, courseId])
      .sortBy('sortOrder');
    return Promise.all(lessons.map((lesson) => this.repairLessonVideoFallbackInStorage(userId, lesson)));
  }

  async getOfflineProgressState(courseId: string): Promise<{
    completedLessons: string[];
    lastAccessedLessonId?: string;
  }> {
    const localSnapshot = this.readOfflineLearningProgress(courseId);
    const completedLessons = new Set(localSnapshot?.completedLessons ?? []);

    if (await this.ensureOfflineReady(true)) {
      const userId = getCurrentUserId();
      const progressRecords = await offlineDb.progress
        .where('courseId').equals(courseId)
        .filter(record => record.userId === userId && (record.completedAt != null || record.progressPercent >= 100))
        .toArray();

      for (const record of progressRecords) {
        completedLessons.add(record.lessonId);
      }
    }

    return {
      completedLessons: Array.from(completedLessons),
      lastAccessedLessonId: localSnapshot?.lastAccessedLessonId,
    };
  }

  async markLessonCompletedOffline(courseId: string, lessonId: string): Promise<void> {
    if (!(await this.ensureOfflineReady(true))) {
      return;
    }

    const userId = getCurrentUserId();
    const existing = await offlineDb.progress
      .where('lessonId').equals(lessonId)
      .filter(record => record.userId === userId && record.courseId === courseId)
      .first();
    const completedAt = existing?.completedAt ?? new Date();

    if (existing?.id != null) {
      await offlineDb.progress.update(existing.id, {
        progressPercent: 100,
        completedAt,
        completedSectionIds: existing.completedSectionIds,
        syncStatus: existing.syncStatus === 'conflict' ? 'conflict' : 'synced',
        updatedAt: new Date(),
      });
      return;
    }

    await offlineDb.progress.add({
      lessonId,
      courseId,
      userId,
      progressPercent: 100,
      videoPosition: 0,
      completedSectionIds: existing?.completedSectionIds ?? [],
      completedAt,
      syncStatus: 'synced',
      updatedAt: new Date(),
    });
  }

  async mergeCompletedSectionsOffline(
    courseId: string,
    lessonId: string,
    sectionIds: Iterable<string>,
  ): Promise<void> {
    if (!(await this.ensureOfflineReady(true))) {
      return;
    }

    const normalizedSectionIds = Array.from(new Set(
      Array.from(sectionIds).filter((sectionId): sectionId is string => typeof sectionId === 'string' && sectionId.length > 0),
    ));

    if (normalizedSectionIds.length === 0) {
      return;
    }

    const userId = getCurrentUserId();
    const existing = await offlineDb.progress
      .where('lessonId').equals(lessonId)
      .filter(record => record.userId === userId && record.courseId === courseId)
      .first();

    const nextCompletedSectionIds = Array.from(new Set([
      ...(existing?.completedSectionIds ?? []),
      ...normalizedSectionIds,
    ]));

    if (existing?.id != null) {
      await offlineDb.progress.update(existing.id, {
        completedSectionIds: nextCompletedSectionIds,
        progressPercent: Math.max(existing.progressPercent, 1),
        syncStatus: existing.syncStatus === 'conflict' ? 'conflict' : 'synced',
        updatedAt: new Date(),
      });
      return;
    }

    await offlineDb.progress.add({
      lessonId,
      courseId,
      userId,
      progressPercent: 1,
      videoPosition: 0,
      completedSectionIds: nextCompletedSectionIds,
      syncStatus: 'synced',
      updatedAt: new Date(),
    });
  }

  async getOfflineCompletedSectionIds(courseId: string): Promise<string[]> {
    const snapshot = this.readOfflineCompletedSections(courseId);

    if (!(await this.ensureOfflineReady(true))) {
      return snapshot;
    }

    const userId = getCurrentUserId();
    const progressRecords = await offlineDb.progress
      .where('courseId').equals(courseId)
      .filter(record => record.userId === userId)
      .toArray();

    const sectionIds = Array.from(new Set([
      ...snapshot,
      ...progressRecords.flatMap(record => record.completedSectionIds ?? []),
    ]));

    this.writeOfflineCompletedSections(courseId, sectionIds);
    return sectionIds;
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

    const progress = await this.getOfflineProgressState(courseId);
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
        await this.refreshCoursePackage(
          stale[i].id,
          stale[i].downloadOptions ?? undefined,
          { autoSyncAfterRefresh: false },
        );
      }
      this.bulkUpdateProgress.set({ current: stale.length, total: stale.length });
      if (this.network.online()) {
        await this.syncService.syncWithPriority();
      }
      this.toast.success(`Đã cập nhật ${stale.length} khóa học`);
    } finally {
      this.isBulkUpdating.set(false);
      this.bulkUpdateProgress.set({ current: 0, total: 0 });
    }
  }

  async refreshCoursePackage(
    courseId: string,
    options?: DownloadOptions,
    refreshOptions: RefreshCoursePackageOptions = {},
  ): Promise<void> {
    await this.ensureOfflineReady();

    const userId = getCurrentUserId();
    const snapshot = await this.captureCourseSnapshot(userId, courseId);
    const existingCourse = await offlineDb.courses.get([userId, courseId]);
    const effectiveOptions = this.resolveEffectiveDownloadOptions(options ?? existingCourse?.downloadOptions ?? null);
    const previousLessonIds = new Set(snapshot.lessons.map(lesson => lesson.id));
    const previousSectionIds = new Set(
      snapshot.lessons.flatMap(lesson => (lesson.sections ?? []).map(section => section.id))
    );

    try {
      await this.removeCourse(courseId, {
        preserveProgress: true,
        preserveSyncArtifacts: true,
        preserveAssetCaches: false,
        silent: true,
      });

      const downloaded = await this.downloadCourse(courseId, effectiveOptions, {
        throwOnError: true,
        silentSuccessToast: true,
        silentErrorToast: true,
      });
      if (!downloaded) {
        throw new Error('Tai lai goi ngoai tuyen chua hoan tat.');
      }

      await this.rebindPreservedCourseState(courseId, previousSectionIds);
      await this.cleanupObsoleteAssetCaches(userId, courseId, previousLessonIds, previousSectionIds);
      await this.refreshDownloadedCourses();
      await this.storage.refresh();
      await this.syncService.refreshState();

      if (refreshOptions.autoSyncAfterRefresh !== false && this.network.online()) {
        try {
          await this.syncService.syncWithPriority();
        } catch {
          this.toast.info('Da cap nhat goi ngoai tuyen. Du lieu dong bo con lai se duoc thu lai khi ket noi on dinh hon.');
        }
      }

      this.toast.success('Đã cập nhật gói ngoại tuyến.');
    } catch (error: any) {
      await this.restoreCourseSnapshot(snapshot);
      await this.refreshDownloadedCourses();
      await this.storage.refresh();
      await this.syncService.refreshState();
      this.toast.error(`Khong the cap nhat goi ngoai tuyen: ${error?.message || 'Khong xac dinh'}`);
      throw error;
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

  async getDownloadedCourse(courseId: string): Promise<DownloadableCourse | null> {
    try {
      await this.refreshDownloadedCourses();
    } catch (error) {
      if (!isOfflineDbUnavailableError(error)) {
        throw error;
      }
      return null;
    }

    return this.downloadedCourses().find(course => course.id === courseId) ?? null;
  }

  private mapOfflineLessonSections(lesson: any): OfflineLessonSection[] | undefined {
    if (!Array.isArray(lesson?.sections) || lesson.sections.length === 0) {
      return undefined;
    }

    return lesson.sections.map((section: any, index: number) => {
      const videoSourceKind = this.resolveVideoSourceKind(
        section.videoSourceKind,
        section.videoUrl,
        section.streamVideoUid,
        section.videoType,
      );

      return {
        id: section.id,
        lessonId: lesson.id,
        title: section.title || `Muc ${index + 1}`,
        type: section.type || 'TEXT',
        content: section.content || '',
        contentBlocks: Array.isArray(section.contentBlocks) ? section.contentBlocks : [],
        videoUrl: section.videoUrl,
        videoAssetId: section.videoAssetId,
        videoType: section.videoType,
        streamVideoUid: section.streamVideoUid,
        videoSourceKind,
        interactiveVideoSpec: section.interactiveVideoSpec ?? null,
        fileUrl: section.fileUrl || section.downloadUrl,
        fileName: section.fileName,
        sortOrder: section.sortOrder ?? index,
        simulationData: section.simulationData ?? null,
        simulationOfflineReady: section.simulationOfflineReady ?? section.simulationData?.simulationOfflineReady ?? false,
        simulationOfflineBytes: section.simulationOfflineBytes ?? section.simulationData?.simulationOfflineBytes ?? null,
        simulationOfflineAt: section.simulationOfflineAt ?? section.simulationData?.simulationOfflineAt ?? null,
        simulationOfflineError: section.simulationOfflineError ?? section.simulationData?.simulationOfflineError ?? null,
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
      };
    });
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

  private getOfflineVideoSkipReason(
    descriptor: Pick<OfflineVideoDownloadDescriptor, 'downloadUrl' | 'fileSizeBytes'>,
  ): OfflineVideoSkipReason | null {
    if ((descriptor.fileSizeBytes ?? 0) > OFFLINE_VIDEO_MAX_CACHE_BYTES) {
      return 'tooLarge';
    }

    const downloadUrl = descriptor.downloadUrl?.trim();
    if (!downloadUrl) {
      return 'unsupported';
    }

    let parsedUrl: URL;
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://holilihu.online';
      parsedUrl = new URL(downloadUrl, baseUrl);
    } catch {
      return 'unsupported';
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return 'unsupported';
    }

    const host = parsedUrl.hostname.toLowerCase();
    if (
      host === 'example.com'
      || host === 'example.org'
      || host === 'example.net'
      || host.endsWith('.example.com')
      || host.endsWith('.example.org')
      || host.endsWith('.example.net')
    ) {
      return 'placeholder';
    }

    return null;
  }

  private recordVideoSkip(summary: OfflineVideoSkipSummary, reason: OfflineVideoSkipReason): void {
    summary[reason] += 1;
  }

  private recordVideoDownloadError(summary: OfflineVideoSkipSummary, error: unknown): void {
    if (isOfflineVideoTooLargeError(error)) {
      this.recordVideoSkip(summary, 'tooLarge');
      return;
    }

    this.recordVideoSkip(summary, 'failed');
  }

  private showVideoSkipSummary(summary: OfflineVideoSkipSummary): void {
    const total = summary.unsupported + summary.placeholder + summary.tooLarge + summary.failed;
    if (total === 0) {
      return;
    }

    const details: string[] = [];
    if (summary.tooLarge > 0) details.push(`${summary.tooLarge} video quá lớn`);
    if (summary.unsupported > 0) details.push(`${summary.unsupported} video chỉ phát trực tuyến`);
    if (summary.placeholder > 0) details.push(`${summary.placeholder} video chưa có nguồn thật`);
    if (summary.failed > 0) details.push(`${summary.failed} video chưa tải được`);

    this.toast.warning(
      `Đã bỏ qua ${total} video khi tạo gói offline (${details.join(', ')}). Các nội dung này vẫn phát khi có mạng ổn định.`,
      { duration: 6500 },
    );
  }

  private recordSimulationSkip(summary: OfflineSimulationSkipSummary, reason: OfflineSimulationSkipReason): void {
    summary[reason] += 1;
  }

  private recordSimulationDownloadError(summary: OfflineSimulationSkipSummary, error: unknown): void {
    if (isOfflineSimulationTooLargeError(error)) {
      this.recordSimulationSkip(summary, 'tooLarge');
      return;
    }

    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (message.includes('disabled')) {
      this.recordSimulationSkip(summary, 'disabled');
      return;
    }
    if (message.includes('manifest') || message.includes('offline assets') || message.includes('origin')) {
      this.recordSimulationSkip(summary, 'unsupported');
      return;
    }

    this.recordSimulationSkip(summary, 'failed');
  }

  private showSimulationSkipSummary(summary: OfflineSimulationSkipSummary): void {
    const total = summary.disabled + summary.unsupported + summary.tooLarge + summary.failed;
    if (total === 0) {
      return;
    }

    const details: string[] = [];
    if (summary.disabled > 0) details.push(`${summary.disabled} goi chua chon tai offline`);
    if (summary.tooLarge > 0) details.push(`${summary.tooLarge} goi qua lon`);
    if (summary.unsupported > 0) details.push(`${summary.unsupported} goi chua co manifest offline hop le`);
    if (summary.failed > 0) details.push(`${summary.failed} goi chua tai duoc`);

    this.toast.warning(
      `Da bo qua ${total} goi mo phong khi tao goi offline (${details.join(', ')}). Hoc vien van co the hoc noi dung thay the va chay mo phong khi co mang tren desktop/laptop.`,
      { duration: 7500 },
    );
  }

  private async resolveSectionVideoDownloadDescriptor(
    section: OfflineLessonSection,
    profile: OfflineVideoProfileId,
  ): Promise<OfflineVideoDownloadDescriptor> {
    if (isOnlineOnlyVideoSource(section)) {
      return { downloadUrl: null };
    }

    if (section.streamVideoUid || section.videoAssetId || section.videoSourceKind === 'ADAPTIVE_R2') {
      try {
        return await this.fetchSectionVideoDownloadDescriptor(section.id, profile);
      } catch {
        // Fall back to raw video URL when a section still carries a direct URL.
      }
    }

    return {
      downloadUrl: section.videoUrl || null,
      profile: 'ORIGINAL',
      profileLabel: getOfflineVideoProfileLabel('ORIGINAL'),
      actualResolution: null,
    };
  }

  private async resolveLessonVideoDownloadDescriptor(
    lessonId: string,
    profile: OfflineVideoProfileId,
  ): Promise<OfflineVideoDownloadDescriptor> {
    return this.fetchLessonVideoDownloadDescriptor(lessonId, profile);
  }

  private async fetchLessonVideoDownloadDescriptor(
    lessonId: string,
    profile: OfflineVideoProfileId,
  ): Promise<OfflineVideoDownloadDescriptor> {
    const response: any = await firstValueFrom(
      this.http.get(`${environment.apiUrl}/api/v3/lessons/${lessonId}/video/download`, {
        params: { profile }
      })
    );
    return {
      downloadUrl: response?.downloadUrl ?? response?.data?.downloadUrl ?? null,
      actualResolution: response?.actualResolution ?? response?.data?.actualResolution ?? null,
      profile: response?.profile ?? response?.data?.profile ?? profile,
      profileLabel: response?.profileLabel ?? response?.data?.profileLabel ?? null,
      fileSizeBytes: response?.fileSizeBytes ?? response?.data?.fileSizeBytes ?? null,
    };
  }

  private async fetchSectionVideoDownloadDescriptor(
    sectionId: string,
    profile: OfflineVideoProfileId,
  ): Promise<OfflineVideoDownloadDescriptor> {
    const response: any = await firstValueFrom(
      this.http.get(`${environment.apiUrl}/api/v3/sections/${sectionId}/video/download`, {
        params: { profile }
      })
    );
    return {
      downloadUrl: response?.downloadUrl ?? response?.data?.downloadUrl ?? null,
      actualResolution: response?.actualResolution ?? response?.data?.actualResolution ?? null,
      profile: response?.profile ?? response?.data?.profile ?? profile,
      profileLabel: response?.profileLabel ?? response?.data?.profileLabel ?? null,
      fileSizeBytes: response?.fileSizeBytes ?? response?.data?.fileSizeBytes ?? null,
    };
  }

  private resolveVideoSourceKind(
    explicitSourceKind: unknown,
    videoUrl?: string | null,
    streamVideoUid?: string | null,
    videoType?: string | null,
  ): VideoSourceKind | undefined {
    if (explicitSourceKind === 'ADAPTIVE_R2' || explicitSourceKind === 'STREAM' || explicitSourceKind === 'EXTERNAL' || explicitSourceKind === 'LEGACY_DIRECT') {
      return explicitSourceKind;
    }

    if (streamVideoUid) {
      return 'STREAM';
    }

    const normalizedVideoType = typeof videoType === 'string'
      ? videoType.trim().toUpperCase()
      : '';
    if (normalizedVideoType === 'YOUTUBE' || this.isExternalVideoUrl(videoUrl)) {
      return 'EXTERNAL';
    }

    return videoUrl ? 'LEGACY_DIRECT' : undefined;
  }

  private normalizeDownloadedProfileId(profile: unknown): OfflineVideoProfileId | null {
    if (profile === 'SAVER' || profile === 'STANDARD' || profile === 'HIGH' || profile === 'ORIGINAL') {
      return profile;
    }

    return null;
  }

  private resolveDownloadedProfileLabel(
    profile: unknown,
    profileLabel?: string | null,
    actualResolution?: string | null,
  ): string | null {
    const normalizedProfile = this.normalizeDownloadedProfileId(profile);
    if (!normalizedProfile) {
      return null;
    }

    if (normalizedProfile === 'ORIGINAL') {
      return getOfflineVideoProfileLabel('ORIGINAL');
    }

    return formatOfflineVideoProfileLabel({
      id: normalizedProfile,
      actualResolution: actualResolution ?? null,
    }) || profileLabel || getOfflineVideoProfileLabel(normalizedProfile);
  }

  private isExternalVideoUrl(url: string | null | undefined): boolean {
    if (!url) {
      return false;
    }

    if (/(youtube\.com|youtu\.be)/i.test(url)) {
      return true;
    }

    return /^https?:\/\//i.test(url)
      && !url.includes('videodelivery.net')
      && !url.startsWith(environment.apiUrl)
      && !(typeof window !== 'undefined' && url.startsWith(`${window.location.origin}/`));
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

  private resolveEffectiveDownloadOptions(
    options?: Partial<DownloadOptions> | null,
  ): DownloadOptions {
    if (options?.videoQuality) {
      return this.normalizeDownloadOptions(options);
    }

    return this.normalizeDownloadOptions({
      videoQuality: this.offlineSettings.defaultVideoQuality(),
    });
  }

  private shouldBlockDownloadOnCurrentNetwork(): boolean {
    return this.offlineSettings.downloadOnWifiOnly() && this.network.isLikelyMetered();
  }

  private normalizeDownloadOptions(
    options?: Partial<DownloadOptions> | null,
  ): DownloadOptions {
    const normalizedVideoQuality = normalizeVideoQuality(options?.videoQuality);
    return {
      videoQuality: normalizedVideoQuality,
      includeSimulations: options?.includeSimulations === true,
    };
  }

  private async rebindPreservedCourseState(
    courseId: string,
    previousSectionIds: Set<string>,
  ): Promise<void> {
    const userId = getCurrentUserId();
    const lessons = await offlineDb.lessons.where('[userId+courseId]').equals([userId, courseId]).toArray();
    const validLessonIds = new Set(lessons.map(lesson => lesson.id));
    const validSectionIds = new Set(
      lessons.flatMap(lesson => (lesson.sections ?? []).map(section => section.id))
    );
    const latestCourse = await offlineDb.courses.get([userId, courseId]);
    const latestPublicationId = latestCourse?.publicationId ?? null;
    const quizData = await offlineDb.quizData.where('[userId+courseId]').equals([userId, courseId]).toArray();
    const validLessonQuizIds = new Set(
      quizData
        .filter(quiz => quiz.mode !== 'section')
        .map(quiz => quiz.quizId)
    );

    await this.pruneInvalidProgressRecords(userId, courseId, validLessonIds);
    await this.pruneAndRebindQuizAttempts(userId, validLessonIds, validSectionIds, validLessonQuizIds);
    await this.rebindCourseQueueItems(userId, courseId, latestPublicationId, validLessonIds, validSectionIds, validLessonQuizIds);
    this.rewriteOfflineLearningProgress(courseId, validLessonIds);
    await this.rewriteOfflineCompletedSections(courseId, previousSectionIds, validSectionIds);
  }

  private async captureCourseSnapshot(
    userId: string,
    courseId: string,
  ): Promise<OfflineCourseSnapshot> {
    const [course, chapters, lessons, quizData] = await Promise.all([
      offlineDb.courses.get([userId, courseId]),
      offlineDb.chapters.where('[userId+courseId]').equals([userId, courseId]).toArray(),
      offlineDb.lessons.where('[userId+courseId]').equals([userId, courseId]).toArray(),
      offlineDb.quizData.where('[userId+courseId]').equals([userId, courseId]).toArray(),
    ]);

    return {
      course: course ?? null,
      chapters,
      lessons,
      quizData,
    };
  }

  private async restoreCourseSnapshot(snapshot: OfflineCourseSnapshot): Promise<void> {
    if (!snapshot.course) {
      return;
    }

    await offlineDb.transaction(
      'rw',
      [offlineDb.courses, offlineDb.chapters, offlineDb.lessons, offlineDb.quizData],
      async () => {
        await offlineDb.courses.put(snapshot.course!);

        if (snapshot.chapters.length > 0) {
          await offlineDb.chapters.bulkPut(snapshot.chapters);
        }

        if (snapshot.lessons.length > 0) {
          await offlineDb.lessons.bulkPut(snapshot.lessons);
        }

        if (snapshot.quizData.length > 0) {
          await offlineDb.quizData.bulkPut(snapshot.quizData);
        }
      },
    );
  }

  private async cleanupObsoleteAssetCaches(
    userId: string,
    courseId: string,
    previousLessonIds: Set<string>,
    previousSectionIds: Set<string>,
  ): Promise<void> {
    const latestLessons = await offlineDb.lessons
      .where('[userId+courseId]')
      .equals([userId, courseId])
      .toArray();
    const validLessonIds = new Set(latestLessons.map(lesson => lesson.id));
    const validSectionIds = new Set(
      latestLessons.flatMap(lesson => (lesson.sections ?? []).map(section => section.id))
    );

    for (const lessonId of previousLessonIds) {
      if (!validLessonIds.has(lessonId)) {
        await this.videoService.deleteVideo(lessonId);
      }
    }

    for (const sectionId of previousSectionIds) {
      if (!validSectionIds.has(sectionId)) {
        await this.videoService.deleteSectionVideo(sectionId);
        await this.fileService.deleteSectionFile(sectionId);
      }
    }

    await this.videoService.refreshList();
  }

  private async pruneInvalidProgressRecords(
    userId: string,
    courseId: string,
    validLessonIds: Set<string>,
  ): Promise<void> {
    const progressRecords = await offlineDb.progress
      .where('courseId').equals(courseId)
      .filter(progress => progress.userId === userId)
      .toArray();
    const staleProgressIds = progressRecords
      .filter(progress => !validLessonIds.has(progress.lessonId))
      .map(progress => progress.id)
      .filter((id): id is number => typeof id === 'number');

    if (staleProgressIds.length > 0) {
      await offlineDb.progress.bulkDelete(staleProgressIds);
    }
  }

  private async pruneAndRebindQuizAttempts(
    userId: string,
    validLessonIds: Set<string>,
    validSectionIds: Set<string>,
    validLessonQuizIds: Set<string>,
  ): Promise<void> {
    const attempts = await offlineDb.quizAttempts.where('userId').equals(userId).toArray();
    const staleAttemptIds = attempts
      .filter(attempt => !this.isQuizAttemptStillValid(attempt, validLessonIds, validSectionIds, validLessonQuizIds))
      .map(attempt => attempt.id)
      .filter((id): id is number => typeof id === 'number');

    if (staleAttemptIds.length > 0) {
      await offlineDb.quizAttempts.bulkDelete(staleAttemptIds);
    }
  }

  private isQuizAttemptStillValid(
    attempt: OfflineQuizAttempt,
    validLessonIds: Set<string>,
    validSectionIds: Set<string>,
    validLessonQuizIds: Set<string>,
  ): boolean {
    if (attempt.lessonId && !validLessonIds.has(attempt.lessonId)) {
      return false;
    }

    if (attempt.sectionId && !validSectionIds.has(attempt.sectionId)) {
      return false;
    }

    if ((attempt.mode ?? 'lesson') !== 'section' && !validLessonQuizIds.has(attempt.quizId)) {
      return false;
    }

    return true;
  }

  private async rebindCourseQueueItems(
    userId: string,
    courseId: string,
    publicationId: string | null,
    validLessonIds: Set<string>,
    validSectionIds: Set<string>,
    validLessonQuizIds: Set<string>,
  ): Promise<void> {
    const queueItems = await offlineDb.syncQueue
      .where('userId').equals(userId)
      .filter(item => item.courseId === courseId || this.getPayloadCourseId(item) === courseId)
      .toArray();

    const staleQueueIds: number[] = [];
    const queueUpdates: Array<Promise<number | undefined>> = [];

    for (const item of queueItems) {
      if (!this.isQueueItemStillValid(item, validLessonIds, validSectionIds, validLessonQuizIds)) {
        if (typeof item.id === 'number') {
          staleQueueIds.push(item.id);
        }
        continue;
      }

      if (typeof item.id === 'number') {
        const reboundPayload = this.rebindQueuePayload(item, courseId, publicationId);
        const isRecoverableConflict = typeof item.lastError === 'string'
          && item.lastError.toLowerCase().includes('publication');
        queueUpdates.push(offlineDb.syncQueue.update(item.id, {
          publicationId,
          payload: reboundPayload,
          syncStatus: isRecoverableConflict ? 'pending' : item.syncStatus,
          retryCount: isRecoverableConflict ? 0 : item.retryCount,
          nextRetryAt: isRecoverableConflict ? undefined : item.nextRetryAt,
          lastError: isRecoverableConflict ? undefined : item.lastError,
        }));
      }
    }

    if (staleQueueIds.length > 0) {
      await offlineDb.syncQueue.bulkDelete(staleQueueIds);
    }

    if (queueUpdates.length > 0) {
      await Promise.all(queueUpdates);
    }
  }

  private isQueueItemStillValid(
    item: SyncQueueItem,
    validLessonIds: Set<string>,
    validSectionIds: Set<string>,
    validLessonQuizIds: Set<string>,
  ): boolean {
    const payload = this.getQueuePayload(item);
    const payloadLessonId = typeof payload?.['lessonId'] === 'string' ? payload['lessonId'] : null;
    const payloadSectionId = typeof payload?.['sectionId'] === 'string' ? payload['sectionId'] : null;

    if (payloadLessonId && !validLessonIds.has(payloadLessonId)) {
      return false;
    }

    if (payloadSectionId && !validSectionIds.has(payloadSectionId)) {
      return false;
    }

    if (item.entityType === 'progress' || item.entityType === 'videoProgress') {
      const entityId = item.entityId ?? payloadSectionId ?? payloadLessonId;
      if (entityId && !validLessonIds.has(entityId) && !validSectionIds.has(entityId)) {
        return false;
      }
    }

    if (item.entityType === 'quizAttempt') {
      const mode = typeof payload?.['mode'] === 'string' ? payload['mode'] : 'lesson';
      if (mode === 'section') {
        return payloadSectionId == null || validSectionIds.has(payloadSectionId);
      }

      const quizId = typeof payload?.['quizId'] === 'string' ? payload['quizId'] : null;
      return quizId == null || validLessonQuizIds.has(quizId);
    }

    return true;
  }

  private getQueuePayload(item: SyncQueueItem): Record<string, unknown> | null {
    return item.payload && typeof item.payload === 'object'
      ? item.payload as Record<string, unknown>
      : null;
  }

  private rebindQueuePayload(
    item: SyncQueueItem,
    courseId: string,
    publicationId: string | null,
  ): Record<string, unknown> | null {
    const payload = this.getQueuePayload(item);
    if (!payload) {
      return null;
    }

    return {
      ...payload,
      courseId,
      publicationId,
    };
  }

  private getPayloadCourseId(item: SyncQueueItem): string | null {
    const payload = this.getQueuePayload(item);
    return typeof payload?.['courseId'] === 'string' ? payload['courseId'] : null;
  }

  private rewriteOfflineLearningProgress(
    courseId: string,
    validLessonIds: Set<string>,
  ): void {
    const progress = this.readOfflineLearningProgress(courseId);
    if (!progress) {
      return;
    }

    const completedLessons = (progress.completedLessons ?? [])
      .filter(lessonId => validLessonIds.has(lessonId));
    const lastAccessedLessonId = progress.lastAccessedLessonId && validLessonIds.has(progress.lastAccessedLessonId)
      ? progress.lastAccessedLessonId
      : undefined;

    try {
      if (completedLessons.length === 0 && !lastAccessedLessonId) {
        localStorage.removeItem(`learning_progress_${getCurrentUserId()}_${courseId}`);
        return;
      }

      localStorage.setItem(`learning_progress_${getCurrentUserId()}_${courseId}`, JSON.stringify({
        completedLessons,
        lastAccessedLessonId,
        progressPercentage: null,
        lastUpdated: new Date().toISOString(),
      }));
    } catch {
      // localStorage rewrite is best-effort only.
    }
  }

  private async rewriteOfflineCompletedSections(
    courseId: string,
    previousSectionIds: Set<string>,
    validSectionIds: Set<string>,
  ): Promise<void> {
    const next = (await this.getOfflineCompletedSectionIds(courseId)).filter(sectionId =>
      !previousSectionIds.has(sectionId) || validSectionIds.has(sectionId),
    );

    this.writeOfflineCompletedSections(courseId, next);
  }

  private getOfflineCompletedSectionsStorageKey(courseId: string): string {
    return `learning_completed_sections_${courseId}`;
  }

  private readOfflineCompletedSections(courseId: string): string[] {
    try {
      const raw = localStorage.getItem(this.getOfflineCompletedSectionsStorageKey(courseId));
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((value): value is string => typeof value === 'string' && value.length > 0);
    } catch {
      return [];
    }
  }

  private writeOfflineCompletedSections(courseId: string, sectionIds: Iterable<string>): void {
    try {
      const uniqueSectionIds = Array.from(new Set(
        Array.from(sectionIds).filter((sectionId): sectionId is string => typeof sectionId === 'string' && sectionId.length > 0),
      ));

      const key = this.getOfflineCompletedSectionsStorageKey(courseId);
      if (uniqueSectionIds.length === 0) {
        localStorage.removeItem(key);
        return;
      }

      localStorage.setItem(key, JSON.stringify(uniqueSectionIds));
    } catch {
      // localStorage rewrite is best-effort only.
    }
  }

  private async snapshotInitialProgress(
    courseId: string,
    lessons: OfflineLesson[],
  ): Promise<void> {
    if (lessons.length === 0 || !(await this.ensureOfflineReady(true))) {
      return;
    }

    const userId = getCurrentUserId();
    const validLessonIds = new Set(lessons.map(lesson => lesson.id));
    const completedLessons = new Set(this.readOfflineLearningProgress(courseId)?.completedLessons ?? []);

    if (this.network.online()) {
      try {
        const response: any = await firstValueFrom(
          this.http.get(`${environment.apiUrl}/api/v3/student/progress/courses/${courseId}/completed-ids`)
        );
        const completedFromServer = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : Array.isArray(response?.completedLessonIds)
              ? response.completedLessonIds
              : [];

        for (const lessonId of completedFromServer) {
          if (typeof lessonId === 'string') {
            completedLessons.add(lessonId);
          }
        }
      } catch {
        // Best-effort snapshot only.
      }
    }

    const existingProgress = await offlineDb.progress
      .where('courseId').equals(courseId)
      .filter(record => record.userId === userId)
      .toArray();
    const existingByLesson = new Map(existingProgress.map(record => [record.lessonId, record]));

    for (const lessonId of completedLessons) {
      if (!validLessonIds.has(lessonId)) {
        continue;
      }

      const existing = existingByLesson.get(lessonId);
      const completedAt = existing?.completedAt ?? new Date();

      if (existing?.id != null) {
        await offlineDb.progress.update(existing.id, {
          progressPercent: Math.max(existing.progressPercent, 100),
          completedAt,
          syncStatus: existing.syncStatus === 'conflict' ? 'conflict' : 'synced',
          updatedAt: new Date(),
        });
        continue;
      }

      await offlineDb.progress.add({
        lessonId,
        courseId,
        userId,
        progressPercent: 100,
        videoPosition: 0,
        completedAt,
        syncStatus: 'synced',
        updatedAt: new Date(),
      });
    }
  }

  private async repairLessonVideoFallbackInStorage(
    userId: string,
    lesson: OfflineLesson,
  ): Promise<OfflineLesson> {
    let lessonUpdates: Partial<OfflineLesson> = {};

    if (!lesson.videoOfflineUri || !Array.isArray(lesson.sections) || lesson.sections.length === 0) {
      return this.repairLessonQuizMetadataInStorage(userId, lesson);
    }

    let changed = false;
    const repairedSections = lesson.sections.map((section) => {
      if (
        section.type !== 'VIDEO'
        || section.videoOfflineUri
        || section.streamVideoUid
        || isOnlineOnlyVideoSource(section)
      ) {
        return section;
      }

      changed = true;
      return {
        ...section,
        videoUrl: lesson.videoOfflineUri,
        videoOfflineUri: lesson.videoOfflineUri,
      };
    });

    if (changed) {
      lessonUpdates.sections = repairedSections;
    }

    const quizMetadataUpdates = await this.resolveLessonQuizMetadataRepair(userId, lesson);
    if (quizMetadataUpdates) {
      lessonUpdates = {
        ...lessonUpdates,
        ...quizMetadataUpdates,
      };
    }

    if (Object.keys(lessonUpdates).length === 0) {
      return lesson;
    }

    await offlineDb.lessons.update([userId, lesson.id], lessonUpdates);

    return {
      ...lesson,
      ...lessonUpdates,
      sections: (lessonUpdates.sections as OfflineLessonSection[] | undefined) ?? repairedSections,
    };
  }

  private async repairLessonQuizMetadataInStorage(
    userId: string,
    lesson: OfflineLesson,
  ): Promise<OfflineLesson> {
    const quizMetadataUpdates = await this.resolveLessonQuizMetadataRepair(userId, lesson);
    if (!quizMetadataUpdates) {
      return lesson;
    }

    await offlineDb.lessons.update([userId, lesson.id], quizMetadataUpdates);
    return {
      ...lesson,
      ...quizMetadataUpdates,
    };
  }

  private async resolveLessonQuizMetadataRepair(
    userId: string,
    lesson: OfflineLesson,
  ): Promise<Partial<OfflineLesson> | null> {
    const hasQuizMetadata =
      !!lesson.quizType
      && lesson.quizAllowOffline !== undefined
      && lesson.countsTowardCertificate !== undefined;
    if (hasQuizMetadata) {
      return null;
    }

    const quizRecord = await offlineDb.quizData
      .where('[userId+lessonId]')
      .equals([userId, lesson.id])
      .first();
    if (!quizRecord) {
      return null;
    }

    const quizType = this.normalizeQuizAssessmentType(quizRecord.quizType);
    return {
      quizType,
      countsTowardCertificate: Boolean(quizRecord.countsTowardCertificate) && quizType === 'EXAM',
      quizAllowOffline: quizRecord.allowOffline === true || this.canDownloadQuizOffline(quizType),
    };
  }

  async refreshDownloadedCourses(): Promise<void> {
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
        downloadOptions: this.normalizeDownloadOptions(c.downloadOptions),
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
    return 'Bộ nhớ ngoại tuyến trên trình duyệt này đang gặp sự cố. Hệ thống sẽ tạm chuyển sang chế độ chỉ dùng online. Bạn có thể vào Lưu trữ ngoại tuyến để đặt lại bộ nhớ, hoặc mở trang khôi phục PWA nâng cao nếu trình duyệt vẫn còn cache cũ.';
  }

  private readOfflineLearningProgress(courseId: string): {
    completedLessons?: string[];
    lastAccessedLessonId?: string;
  } | null {
    try {
      const stored = localStorage.getItem(`learning_progress_${getCurrentUserId()}_${courseId}`);
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
