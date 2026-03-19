import { Injectable, signal } from '@angular/core';
import {
  ensureOfflineDbReady,
  getCurrentUserId,
  isOfflineDbUnavailableError,
  isOfflinePersistenceSupported,
  offlineDb,
  type OfflineLessonSection,
} from '../db/lms-offline.db';
import type { OfflineVideoProfileId, VideoSourceKind } from '../models/video-quality';

export interface OfflineVideoEntry {
  cacheKey: string;
  lessonId: string;
  lessonTitle: string;
  sectionId?: string;
  sectionTitle?: string;
  courseId?: string;
  title: string;
  sizeBytes: number;
  downloadedAt: Date;
  profileId?: OfflineVideoProfileId | null;
  profileLabel?: string | null;
  actualResolution?: string | null;
  sourceKind?: VideoSourceKind;
}

@Injectable({ providedIn: 'root' })
export class OfflineVideoService {
  readonly downloads = signal<OfflineVideoEntry[]>([]);
  readonly downloadProgress = signal<Map<string, number>>(new Map());
  readonly isDownloading = signal(false);
  private readonly offlineSupported = isOfflinePersistenceSupported();

  constructor() {
    if (!this.offlineSupported) {
      return;
    }

    void this.refreshList().catch((error) => {
      if (!isOfflineDbUnavailableError(error)) {
        console.error('[OfflineVideoService] Failed to initialize offline video list:', error);
      }
    });
  }

  async downloadVideo(videoUrl: string, lessonId: string): Promise<void> {
    if (this.isDownloading()) return;
    this.isDownloading.set(true);

    try {
      await this.ensureOfflineReady();
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      await this.cacheVideoResponse(`/offline-video/${lessonId}`, response, lessonId);

      const userId = getCurrentUserId();
      const existingLesson = await offlineDb.lessons.get([userId, lessonId]);
      if (existingLesson) {
        const lessonOfflineUri = `/offline-video/${lessonId}`;
        const repairedSections = this.applyLessonOfflineUriToVideoSections(existingLesson.sections, lessonOfflineUri);
        await offlineDb.lessons.update([userId, lessonId], {
          videoOfflineUri: lessonOfflineUri,
          ...(repairedSections !== existingLesson.sections ? { sections: repairedSections } : {}),
          downloadedAt: new Date(),
        });
      }

      this.clearDownloadProgress(lessonId);
      await this.refreshList();
    } finally {
      this.isDownloading.set(false);
    }
  }

  async downloadSectionVideo(
    videoUrl: string,
    lessonId: string,
    sectionId: string,
  ): Promise<string> {
    if (this.isDownloading()) {
      throw new Error('Video download already in progress');
    }

    this.isDownloading.set(true);
    try {
      await this.ensureOfflineReady();
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      await this.cacheVideoResponse(`/offline-video/${sectionId}`, response, sectionId);
      this.clearDownloadProgress(sectionId);

      const userId = getCurrentUserId();
      const lesson = await offlineDb.lessons.get([userId, lessonId]);
      if (lesson) {
        await offlineDb.lessons.update([userId, lessonId], {
          downloadedAt: lesson.downloadedAt || new Date(),
        });
      }

      await this.refreshList();
      return `/offline-video/${sectionId}`;
    } finally {
      this.isDownloading.set(false);
    }
  }

  async getVideoUrl(lessonId: string): Promise<string | null> {
    if (!(await this.ensureOfflineReady(true))) {
      return null;
    }

    const userId = getCurrentUserId();
    const lesson = await offlineDb.lessons.get([userId, lessonId]);
    if (!lesson) return null;

    const cache = await caches.open('offline-videos');
    const response = await cache.match(`/offline-video/${lessonId}`);
    if (!response) return null;

    return `/offline-video/${lessonId}`;
  }

  async getSectionVideoUrl(sectionId: string): Promise<string | null> {
    if (!(await this.ensureOfflineReady(true))) {
      return null;
    }

    const cache = await caches.open('offline-videos');
    const response = await cache.match(`/offline-video/${sectionId}`);
    return response ? `/offline-video/${sectionId}` : null;
  }

  async deleteEntry(entry: OfflineVideoEntry): Promise<void> {
    if (entry.sectionId) {
      await this.deleteSectionVideo(entry.sectionId);
      return;
    }

    await this.deleteVideo(entry.lessonId);
  }

  async deleteVideo(lessonId: string): Promise<void> {
    if (!(await this.ensureOfflineReady(true))) {
      return;
    }

    const cache = await caches.open('offline-videos');
    await cache.delete(`/offline-video/${lessonId}`);

    const userId = getCurrentUserId();
    const lesson = await offlineDb.lessons.get([userId, lessonId]);
    if (lesson) {
      await offlineDb.lessons.update([userId, lessonId], { videoOfflineUri: undefined });
    }

    await this.refreshList();
  }

  async deleteSectionVideo(sectionId: string): Promise<void> {
    if (!(await this.ensureOfflineReady(true))) {
      return;
    }

    const cache = await caches.open('offline-videos');
    await cache.delete(`/offline-video/${sectionId}`);
    await this.refreshList();
  }

  isAvailableOffline(lessonId: string): boolean {
    return this.downloads().some(entry => entry.lessonId === lessonId);
  }

  async refreshList(): Promise<void> {
    if (!(await this.ensureOfflineReady(true))) {
      this.downloads.set([]);
      return;
    }

    try {
      const cache = await caches.open('offline-videos');
      const keys = await cache.keys();
      const entries: OfflineVideoEntry[] = [];
      const userId = getCurrentUserId();
      const lessons = await offlineDb.lessons.where('userId').equals(userId).toArray();
      const lessonMap = new Map(lessons.map(lesson => [lesson.id, lesson]));
      const sectionMap = new Map(
        lessons.flatMap(lesson =>
          (lesson.sections ?? [])
            .filter(section => section.type === 'VIDEO')
            .map(section => [section.id, {
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              sectionTitle: section.title || lesson.title,
              courseId: lesson.courseId,
              downloadedAt: lesson.downloadedAt || new Date(),
              profileId: section.downloadedVideoProfileId ?? null,
              profileLabel: section.downloadedVideoProfileLabel ?? null,
              actualResolution: section.downloadedVideoResolution ?? null,
              sourceKind: section.videoSourceKind,
            }] as const),
        ),
      );

      for (const request of keys) {
        const url = new URL(request.url);
        const cacheKey = url.pathname.replace('/offline-video/', '');
        const response = await cache.match(request);
        if (!response) continue;

        const sizeBytes = Number(response.headers.get('content-length')) || 0;
        const lesson = lessonMap.get(cacheKey);
        if (lesson) {
          const hasDedicatedVideoSections = (lesson.sections ?? []).some(
            section => section.type === 'VIDEO' && !!section.videoOfflineUri,
          );
          if (hasDedicatedVideoSections) {
            continue;
          }
          entries.push({
            cacheKey,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            courseId: lesson.courseId,
            title: lesson.title || cacheKey,
            sizeBytes,
            downloadedAt: lesson.downloadedAt || new Date(),
            profileId: lesson.downloadedVideoProfileId ?? null,
            profileLabel: lesson.downloadedVideoProfileLabel ?? null,
            actualResolution: lesson.downloadedVideoResolution ?? null,
            sourceKind: lesson.videoSourceKind,
          });
          continue;
        }

        const section = sectionMap.get(cacheKey);
        if (!section) continue;

        entries.push({
          cacheKey,
          lessonId: section.lessonId,
          lessonTitle: section.lessonTitle,
          sectionId: cacheKey,
          sectionTitle: section.sectionTitle,
          courseId: section.courseId,
          title: section.sectionTitle || section.lessonTitle || cacheKey,
          sizeBytes,
          downloadedAt: section.downloadedAt,
          profileId: section.profileId,
          profileLabel: section.profileLabel,
          actualResolution: section.actualResolution,
          sourceKind: section.sourceKind,
        });
      }

      entries.sort((left, right) => {
        if (left.lessonTitle !== right.lessonTitle) {
          return left.lessonTitle.localeCompare(right.lessonTitle);
        }

        return (left.sectionTitle || left.title).localeCompare(right.sectionTitle || right.title);
      });

      this.downloads.set(entries);
    } catch {
      // Cache API unavailable
    }
  }

  private clearDownloadProgress(progressKey: string): void {
    this.downloadProgress.update(map => {
      const next = new Map(map);
      next.delete(progressKey);
      return next;
    });
  }

  private applyLessonOfflineUriToVideoSections(
    sections: OfflineLessonSection[] | undefined,
    lessonOfflineUri: string,
  ): OfflineLessonSection[] | undefined {
    if (!Array.isArray(sections) || sections.length === 0) {
      return sections;
    }

    let changed = false;
    const updatedSections = sections.map((section) => {
      const isYoutube = section?.videoType === 'YOUTUBE'
        || (typeof section?.videoUrl === 'string'
          && /(youtube\.com|youtu\.be)/i.test(section.videoUrl));

      if (
        section?.type !== 'VIDEO'
        || section?.videoOfflineUri
        || section?.streamVideoUid
        || isYoutube
      ) {
        return section;
      }

      changed = true;
      return {
        ...section,
        videoUrl: lessonOfflineUri,
        videoOfflineUri: lessonOfflineUri,
      };
    });

    return changed ? updatedSections : sections;
  }

  private async cacheVideoResponse(
    cacheKey: string,
    response: Response,
    progressKey: string,
  ): Promise<void> {
    const contentLength = Number(response.headers.get('content-length')) || 0;
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const cache = await caches.open('offline-videos');
    const reader = response.body?.getReader();

    if (!reader) {
      const blob = await response.blob();
      await cache.put(cacheKey, new Response(blob, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(contentLength || blob.size),
          'Accept-Ranges': 'bytes',
        },
      }));
      return;
    }

    let received = 0;
    const progressStream = new ReadableStream({
      pull: async (controller) => {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        received += value.length;
        controller.enqueue(value);

        if (contentLength > 0) {
          this.downloadProgress.update(map => {
            const next = new Map(map);
            next.set(progressKey, Math.round((received / contentLength) * 100));
            return next;
          });
        }
      },
      cancel: () => {
        reader.cancel();
      },
    });

    await cache.put(cacheKey, new Response(progressStream, {
      headers: {
        'Content-Type': contentType,
        ...(contentLength > 0 ? { 'Content-Length': String(contentLength) } : {}),
        'Accept-Ranges': 'bytes',
      },
    }));
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
        throw error;
      }

      return false;
    }
  }
}
