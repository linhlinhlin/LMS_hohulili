import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ensureOfflineDbReady,
  isOfflineDbUnavailableError,
  offlineDb,
  getCurrentUserId,
  type SyncQueueItem,
  type SyncEntityType,
  type SyncOperationType,
} from '../db/lms-offline.db';
import { NetworkStatusService } from './network-status.service';
import { OfflineDeviceSettingsService } from './offline-device-settings.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';

export interface SyncResult {
  synced: number;
  failed: number;
  pending: number;
}

interface SyncPullConflict {
  entityType?: string;
  entityId?: string;
  message?: string;
  clientOperationId?: string | null;
}

interface SyncCourseState {
  courseId?: string | null;
  publicationId?: string | null;
  versionMode?: string | null;
}

interface SyncLessonProgressItem {
  courseId?: string | null;
  lessonId?: string | null;
  status?: string | null;
  watchSeconds?: number | null;
  lastActivity?: string | null;
  completedSections?: string[] | null;
}

interface SyncVideoProgressItem {
  lessonId?: string | null;
  lastPosition?: number | null;
  watchedSeconds?: number | null;
  updatedAt?: string | null;
}

interface SyncPullPayload {
  serverTimestamp?: string | null;
  courseStates?: SyncCourseState[];
  lessonProgress?: SyncLessonProgressItem[];
  videoProgress?: SyncVideoProgressItem[];
  conflicts?: SyncPullConflict[];
}

const LAST_PULL_SYNC_KEY_PREFIX = 'offline_sync_pull_state_';

@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private readonly http = inject(HttpClient);
  private readonly network = inject(NetworkStatusService);
  private readonly offlineSettings = inject(OfflineDeviceSettingsService);
  private readonly toast = inject(ToastService);

  readonly isSyncing = signal(false);
  readonly pendingCount = signal(0);
  readonly failedCount = signal(0);
  readonly conflictCount = signal(0);
  readonly lastSyncResult = signal<SyncResult | null>(null);
  /**
   * Earliest nextRetryAt across all pending items still in backoff.
   * Used by UI to show "Thử lại sau X phút".
   */
  readonly earliestRetryAt = signal<Date | null>(null);

  /** True if there are failed items that can be retried */
  readonly hasFailedItems = computed(() => this.failedCount() > 0);
  readonly hasConflictItems = computed(() => this.conflictCount() > 0);

  private syncInProgress = false;

  constructor() {
    if (typeof window === 'undefined') return;

    // Auto-sync with priority when coming back online
    window.addEventListener('online', () => {
      if (!this.offlineSettings.autoSyncWhenOnline()) {
        return;
      }
      setTimeout(() => this.syncWithPriority(), 2000);
    });

    // Listen for SW background sync trigger (sw.js sends SYNC_OFFLINE_QUEUE)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_OFFLINE_QUEUE' && this.offlineSettings.autoSyncWhenOnline()) {
          this.syncAll();
        }
      });
    }

    // Count pending + failed items on init
    void this.refreshCounts().catch((error) => {
      if (!isOfflineDbUnavailableError(error)) {
        console.error('[OfflineSyncService] Failed to initialize sync counts:', error);
      }
    });
  }

  /**
   * Queue an operation for offline sync.
   * Deduplicates: if a pending item with the same entityType + endpoint exists,
   * updates its payload instead of creating a duplicate.
   */
  async queueOperation(
    entityType: SyncEntityType,
    operationType: SyncOperationType,
    endpoint: string,
    payload: unknown,
    metadataOverrides?: Partial<Pick<SyncQueueItem, 'clientOperationId' | 'occurredAt' | 'courseId' | 'publicationId' | 'entityId' | 'baseServerUpdatedAt'>>,
  ): Promise<void> {
    await ensureOfflineDbReady();
    const userId = getCurrentUserId();
    const metadata = this.resolveSyncMetadata(payload, metadataOverrides);
    const shouldDedupe = entityType === 'progress';

    const existing = shouldDedupe
      ? await offlineDb.syncQueue
        .where('userId').equals(userId)
        .filter(item => item.syncStatus === 'pending' && item.entityType === entityType && item.endpoint === endpoint)
        .first()
      : undefined;

    if (existing?.id != null) {
      await offlineDb.syncQueue.update(existing.id, {
        payload,
        ...metadata,
      });
    } else {
      await offlineDb.syncQueue.add({
        userId,
        entityType,
        operationType,
        endpoint,
        payload,
        clientOperationId: metadata.clientOperationId,
        occurredAt: metadata.occurredAt,
        courseId: metadata.courseId,
        publicationId: metadata.publicationId,
        entityId: metadata.entityId,
        baseServerUpdatedAt: metadata.baseServerUpdatedAt,
        createdAt: new Date(),
        syncStatus: 'pending',
        retryCount: 0,
      });
    }

    await this.refreshCounts();

    // Register Background Sync so SW can sync even if app is closed
    this.registerBackgroundSync();
  }

  /**
   * Sync all pending items to server via batch endpoint.
   * Uses /api/v3/sync/push for batch processing with conflict detection.
   * Respects exponential backoff: skips items whose nextRetryAt is in the future.
   */
  async syncAll(force = false): Promise<SyncResult> {
    if (!(await this.ensureOfflineReady(true))) {
      return { synced: 0, failed: 0, pending: 0 };
    }
    if (!force && !this.offlineSettings.autoSyncWhenOnline()) {
      return { synced: 0, failed: 0, pending: await this.getPendingCount() };
    }
    if (this.syncInProgress || !this.network.online()) {
      return { synced: 0, failed: 0, pending: await this.getPendingCount() };
    }

    this.syncInProgress = true;
    this.isSyncing.set(true);

    const result: SyncResult = { synced: 0, failed: 0, pending: 0 };

    try {
      const now = new Date();
      const userId = getCurrentUserId();
      const pendingItems = await offlineDb.syncQueue
        .where('userId').equals(userId)
        .filter(item => item.syncStatus === 'pending')
        .sortBy('createdAt');

      // Filter out items still in backoff window
      const readyItems = pendingItems.filter(item =>
        !item.nextRetryAt || item.nextRetryAt <= now
      );

      if (readyItems.length === 0) {
        return result;
      }

      const batchableItems = readyItems.filter(item => this.isBatchableSyncItem(item));
      const fallbackItems = readyItems.filter(item => !this.isBatchableSyncItem(item));
      const individualItems = [...fallbackItems];

      if (batchableItems.length > 0) {
        const batchResult = await this.tryBatchSync(batchableItems);
        if (batchResult) {
          result.synced += batchResult.synced;
          result.failed += batchResult.failed;
        } else {
          individualItems.unshift(...batchableItems);
        }
      }

      for (const item of individualItems) {
        try {
          await this.syncItem(item);
          await offlineDb.syncQueue.update(item.id!, { syncStatus: 'synced' });
          if (item.entityType === 'quizAttempt') {
            await this.markQuizAttemptSynced(item);
          }
          result.synced++;
        } catch (error: any) {
          await this.handleSyncFailure(item, error);
          result.failed++;
        }
      }

      // Clean up synced items older than 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await offlineDb.syncQueue
        .where('userId').equals(userId)
        .filter(item => item.syncStatus === 'synced' && item.createdAt < oneDayAgo)
        .delete();

      result.pending = await this.getPendingCount();
      this.lastSyncResult.set(result);

      if (result.synced > 0) {
        this.toast.success(`Đồng bộ thành công ${result.synced} mục`);
      }
      if (result.failed > 0) {
        this.toast.warning(`${result.failed} mục đồng bộ thất bại`);
      }

      return result;
    } finally {
      this.syncInProgress = false;
      this.isSyncing.set(false);
      await this.refreshCounts();
    }
  }

  /**
   * Priority-based sync on reconnect (maritime pattern).
   *
   * Step 1: Sync progress + quiz attempts + submissions (small, critical)
   * Step 2: Check content freshness (compare server updatedAt with local downloadedAt)
   * Step 3: Notify user of stale courses (non-blocking toast)
   *
   * Never auto-downloads content updates — user decides.
   */
  async syncWithPriority(force = false): Promise<void> {
    if (!force && !this.offlineSettings.autoSyncWhenOnline()) return;
    if (this.syncInProgress || !this.network.online()) return;

    // Step 1: Sync all queued operations (progress, submissions, quiz attempts)
    const result = await this.syncAll(force);

    // Step 2: Pull server state back into local caches.
    // This keeps local progress and stale flags aligned after reconnect.
    if (result.synced > 0 || result.failed === 0) {
      await this.pullServerState();
      await this.checkContentFreshness();
    }
  }

  /**
   * Check if any downloaded courses have been updated on the server.
   * Uses batch endpoint GET /api/v3/courses/versions?ids=... for efficiency.
   * Compares server contentVersion + updatedAt with local values.
   * Shows non-blocking toast if stale courses found — user navigates to storage.
   */
  async checkContentFreshness(): Promise<void> {
    try {
      if (!(await this.ensureOfflineReady(true))) {
        return;
      }
      const userId = getCurrentUserId();
      const offlineCourses = await offlineDb.courses.where('userId').equals(userId).toArray();
      if (offlineCourses.length === 0) return;

      const courseIds = offlineCourses.map(c => c.id);
      const params = courseIds.map(id => `ids=${id}`).join('&');

      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/api/v3/courses/versions?${params}`)
      );
      const versions = res?.data || res || {};

      const staleCourseNames: string[] = [];

      for (const course of offlineCourses) {
        const serverInfo = versions[course.id];
        if (!serverInfo) continue;

        const serverVersion = serverInfo.contentVersion || 1;
        const localVersion = course.contentVersion || 1;
        const serverPublicationId = serverInfo.publicationId ?? null;
        const localPublicationId = course.publicationId ?? null;
        const versionMode = course.versionModeSnapshot ?? 'LEGACY';
        const serverUpdatedAt = serverInfo.updatedAt ? new Date(serverInfo.updatedAt) : null;
        const localDownloadedAt = course.downloadedAt ? new Date(course.downloadedAt) : null;

        let isStale = false;
        let staleReason: string | null = null;

        if (versionMode === 'FOLLOW_LATEST') {
          isStale = serverPublicationId != null && localPublicationId != null
            ? serverPublicationId !== localPublicationId
            : serverVersion > localVersion ||
              Boolean(serverUpdatedAt && localDownloadedAt && serverUpdatedAt > localDownloadedAt);
          staleReason = isStale ? 'UPDATE_AVAILABLE' : null;
        } else if (versionMode === 'PINNED') {
          isStale = !!localPublicationId && !!serverPublicationId && localPublicationId !== serverPublicationId;
          staleReason = isStale ? 'CLASS_ADOPTED_NEW_PUBLICATION' : null;
        } else {
          isStale = !!serverPublicationId || serverVersion > localVersion;
          staleReason = isStale ? 'LEGACY_PACKAGE' : null;
        }

        if (isStale) {
          staleCourseNames.push(course.title);
          await offlineDb.courses.update([userId, course.id], {
            isStale: true,
            staleReason,
          } as any);
        } else if (course.isStale || course.staleReason) {
          await offlineDb.courses.update([userId, course.id], {
            isStale: false,
            staleReason: null,
          } as any);
        }
      }

      if (staleCourseNames.length > 0) {
        this.toast.info(
          `${staleCourseNames.length} khóa học có cập nhật mới. Vào Quản lý bộ nhớ để tải lại.`
        );
      }
    } catch {
      // Freshness check is best-effort, don't block
    }
  }

  /**
   * Retry all failed sync items.
   * Resets failed items to pending and triggers syncAll().
   */
  async retryFailed(): Promise<SyncResult> {
    if (!(await this.ensureOfflineReady(true))) {
      return { synced: 0, failed: 0, pending: 0 };
    }
    const failedItems = await offlineDb.syncQueue
      .where('userId').equals(getCurrentUserId())
      .filter(item => item.syncStatus === 'failed')
      .toArray();
    const retryableItems = failedItems.filter(item => !this.isConflictQueueItem(item));
    const conflictItems = failedItems.length - retryableItems.length;

    if (retryableItems.length === 0) {
      if (conflictItems > 0) {
        this.toast.info('Co xung dot dong bo can xu ly truoc khi thu lai.');
        return { synced: 0, failed: conflictItems, pending: await this.getPendingCount() };
      }
      this.toast.info('Không có mục thất bại cần thử lại');
      return { synced: 0, failed: 0, pending: 0 };
    }

    // Reset failed items fully (retryCount resets so backoff restarts from scratch)
    for (const item of retryableItems) {
      await offlineDb.syncQueue.update(item.id!, {
        syncStatus: 'pending',
        retryCount: 0,
        lastError: undefined,
        nextRetryAt: undefined,
      });
    }

    await this.refreshCounts();
    this.toast.info(`Đang thử lại ${retryableItems.length} mục đồng bộ lỗi...`);

    return this.syncAll(true);
  }

  async syncNow(): Promise<void> {
    this.offlineSettings.markManualSync();
    await this.syncWithPriority(true);
  }

  /**
   * Get count of failed items (visible to user for retry).
   */
  async getFailedCount(): Promise<number> {
    if (!(await this.ensureOfflineReady(true))) {
      return 0;
    }
    return offlineDb.syncQueue
      .where('userId').equals(getCurrentUserId())
      .filter(item => item.syncStatus === 'failed' && !this.isConflictQueueItem(item))
      .count();
  }

  /**
   * Clear all failed items (user acknowledges data loss).
   */
  async clearFailed(): Promise<void> {
    if (!(await this.ensureOfflineReady(true))) {
      this.failedCount.set(0);
      return;
    }
    const failedItems = await offlineDb.syncQueue
      .where('userId').equals(getCurrentUserId())
      .filter(item => item.syncStatus === 'failed')
      .toArray();

    const retryableIds = failedItems
      .filter(item => !this.isConflictQueueItem(item))
      .map(item => item.id)
      .filter((id): id is number => typeof id === 'number');

    if (retryableIds.length > 0) {
      await offlineDb.syncQueue.bulkDelete(retryableIds);
    }
    await this.refreshCounts();
  }

  async refreshState(): Promise<void> {
    await this.refreshCounts();
  }

  /**
   * Register Background Sync with ServiceWorker.
   * Allows sync to happen even when app is closed.
   */
  private registerBackgroundSync(): void {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        (reg as any).sync?.register('lms-offline-sync').catch(() => {
          // Background Sync not supported or permission denied — silent fallback
        });
      });
    }
  }

  // ─── Private Methods ────────────────────────────────────────────────

  /**
   * Try batch sync via /api/v3/sync/push endpoint.
   * Returns null if batch endpoint fails (triggers individual fallback).
   */
  private async tryBatchSync(items: SyncQueueItem[]): Promise<SyncResult | null> {
    try {
      const operations = items.map(item => ({
        entityType: item.entityType,
        operationType: item.operationType,
        endpoint: item.endpoint,
        clientOperationId: item.clientOperationId,
        occurredAt: item.occurredAt?.toISOString?.() ?? item.createdAt.toISOString(),
        courseId: item.courseId,
        publicationId: item.publicationId,
        entityId: item.entityId,
        baseServerUpdatedAt: item.baseServerUpdatedAt,
        payload: this.buildBatchPayload(item),
      }));

      const response: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/v3/sync/push`, { operations })
      );

      const pushResult = response?.data;
      if (!pushResult) return null;

      const ackedOperationIds = new Set<string>(
        Array.isArray(pushResult.ackedOperationIds)
          ? pushResult.ackedOperationIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
          : items.map(item => item.clientOperationId).filter((id): id is string => !!id)
      );

      for (const item of items) {
        const synced = item.clientOperationId ? ackedOperationIds.has(item.clientOperationId) : true;
        if (synced) {
          await offlineDb.syncQueue.update(item.id!, { syncStatus: 'synced' });
        }
      }

      // Handle conflicts returned by server (overrides synced → failed for conflicted items)
      const conflictedItemIds = new Set<number>();
      if (pushResult.conflicts?.length > 0) {
        const userId = getCurrentUserId();
        for (const conflict of pushResult.conflicts) {
          // Find the matching item by entityType + entityId from payload
          const matchingItem = items.find(i =>
            i.clientOperationId != null &&
            i.clientOperationId === conflict.clientOperationId
          ) || items.find(i =>
            i.entityType === conflict.entityType &&
            this.extractEntityIdFromItem(i) === conflict.entityId
          ) || items.find(i => i.entityType === conflict.entityType);

          if (matchingItem?.id != null) {
            await offlineDb.syncQueue.update(matchingItem.id, {
              syncStatus: 'failed',
              lastError: `Xung đột: ${conflict.message}`,
            });
            conflictedItemIds.add(matchingItem.id);
          }

          await this.markProgressConflictFromQueueItem(userId, matchingItem);

          if (this.isStalePublicationConflict(conflict.message)) {
            await this.markCourseStaleFromQueueItem(userId, matchingItem);
          }
        }
      }

      // Mark quizAttempts records as synced (only for non-conflicted items)
      for (const item of items) {
        const isAcked = item.clientOperationId ? ackedOperationIds.has(item.clientOperationId) : true;
        if (item.entityType === 'quizAttempt' && item.id != null && isAcked && !conflictedItemIds.has(item.id)) {
          await this.markQuizAttemptSynced(item);
        }
      }

      return {
        synced: ackedOperationIds.size > 0 ? ackedOperationIds.size : (pushResult.accepted || items.length),
        failed: pushResult.rejected || 0,
        pending: 0,
      };
    } catch {
      // Batch endpoint failed — fall back to individual sync
      return null;
    }
  }

  /**
   * Extract entity ID from a sync queue item's payload.
   */
  private extractEntityIdFromItem(item: SyncQueueItem): string | undefined {
    if (item.entityId) {
      return item.entityId;
    }

    const payload = item.payload as Record<string, unknown> | null;
    if (!payload) return undefined;
    const id = payload['id'] ?? payload['quizId'] ?? payload['lessonId'] ?? payload['localAttemptId'] ?? payload['sectionId'];
    return id != null ? String(id) : undefined;
  }

  private resolveSyncMetadata(
    payload: unknown,
    overrides?: Partial<Pick<SyncQueueItem, 'clientOperationId' | 'occurredAt' | 'courseId' | 'publicationId' | 'entityId' | 'baseServerUpdatedAt'>>,
  ): Pick<SyncQueueItem, 'clientOperationId' | 'occurredAt' | 'courseId' | 'publicationId' | 'entityId' | 'baseServerUpdatedAt'> {
    const extracted = this.extractSyncMetadata(payload);

    return {
      clientOperationId: overrides?.clientOperationId ?? extracted.clientOperationId,
      occurredAt: overrides?.occurredAt ?? extracted.occurredAt,
      courseId: overrides?.courseId ?? extracted.courseId,
      publicationId: overrides?.publicationId ?? extracted.publicationId,
      entityId: overrides?.entityId ?? extracted.entityId,
      baseServerUpdatedAt: overrides?.baseServerUpdatedAt ?? extracted.baseServerUpdatedAt,
    };
  }

  private extractSyncMetadata(payload: unknown): Pick<SyncQueueItem, 'clientOperationId' | 'occurredAt' | 'courseId' | 'publicationId' | 'entityId' | 'baseServerUpdatedAt'> {
    const record = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : {};
    const rawOccurredAt = record['occurredAt'];
    const occurredAt = rawOccurredAt instanceof Date
      ? rawOccurredAt
      : typeof rawOccurredAt === 'string'
        ? new Date(rawOccurredAt)
        : new Date();

    const courseId = typeof record['courseId'] === 'string' ? record['courseId'] : undefined;
    const publicationId = typeof record['publicationId'] === 'string' ? record['publicationId'] : null;
    const entityId = ['entityId', 'id', 'quizId', 'lessonId', 'sectionId', 'localAttemptId']
      .map(key => record[key])
      .find((value): value is string => typeof value === 'string' && value.length > 0);
    const baseServerUpdatedAt = typeof record['baseServerUpdatedAt'] === 'string' ? record['baseServerUpdatedAt'] : null;

    return {
      clientOperationId: typeof record['clientOperationId'] === 'string' && record['clientOperationId'].length > 0
        ? record['clientOperationId']
        : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`),
      occurredAt,
      courseId,
      publicationId,
      entityId,
      baseServerUpdatedAt,
    };
  }

  private isBatchableSyncItem(item: SyncQueueItem): boolean {
    const path = item.endpoint;

    if (item.entityType === 'videoProgress') {
      return path === '/api/v3/video-progress/track';
    }

    if (item.entityType === 'progress') {
      return /^\/api\/v3\/student\/progress\/lessons\/[a-f0-9-]+\/complete$/i.test(path);
    }

    if (item.entityType === 'quizAttempt') {
      const payload = item.payload as Record<string, unknown> | null;
      return payload?.['mode'] !== 'section';
    }

    return false;
  }

  private buildBatchPayload(item: SyncQueueItem): Record<string, unknown> {
    const originalPayload = (item.payload && typeof item.payload === 'object')
      ? { ...(item.payload as Record<string, unknown>) }
      : {};

    const lessonCompleteMatch = item.endpoint.match(
      /^\/api\/v3\/student\/progress\/lessons\/([a-f0-9-]+)\/complete$/i,
    );
    if (lessonCompleteMatch) {
      return {
        ...originalPayload,
        lessonId: lessonCompleteMatch[1],
        courseId: item.courseId ?? originalPayload['courseId'],
        status: originalPayload['status'] ?? 'COMPLETED',
      };
    }

    return originalPayload;
  }

  /**
   * After a quizAttempt sync item succeeds, mark the corresponding quizAttempts record as synced.
   * Keeps the offline pending badge accurate.
   */
  private async markQuizAttemptSynced(item: SyncQueueItem): Promise<void> {
    const payload = item.payload as Record<string, unknown> | null;
    const quizId = payload?.['quizId'] as string | undefined;
    const lessonId = payload?.['lessonId'] as string | undefined;
    const sectionId = payload?.['sectionId'] as string | undefined;
    const mode = payload?.['mode'] as string | undefined;
    if (!quizId) return;
    await offlineDb.quizAttempts
      .where('userId').equals(item.userId)
      .filter((a: any) =>
        a.quizId === quizId &&
        a.syncStatus === 'pending' &&
        (mode ? a.mode === mode : true) &&
        (lessonId ? a.lessonId === lessonId : true) &&
        (sectionId ? a.sectionId === sectionId : true)
      )
      .modify({ syncStatus: 'synced' });
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const url = `${environment.apiUrl}${item.endpoint}`;

    // Quiz attempt: two-step flow (start attempt → submit answers)
    if (item.entityType === 'quizAttempt') {
      const payload = item.payload as Record<string, unknown>;
      const quizId = payload['quizId'] as string;
      const mode = (payload['mode'] as string | undefined) ?? 'lesson';
      const lessonId = payload['lessonId'] as string | undefined;
      const sectionId = payload['sectionId'] as string | undefined;
      if (!quizId) throw new Error('Missing quizId in quizAttempt sync item');

      const answersMap = payload['answers'] as Record<string, unknown> | null;
      const answersArray = answersMap
        ? Object.entries(answersMap).map(([qId, val]) => ({
            questionId: qId,
            selectedOption: Array.isArray(val) ? (val as string[]).join(',') : (val != null ? String(val) : null),
            studentAnswer: Array.isArray(val) ? { selectedOptions: val } : { selectedOption: val },
          }))
        : [];

      if (mode === 'section') {
        if (!lessonId || !sectionId) {
          throw new Error('Missing lessonId or sectionId in section quiz sync item');
        }

        await firstValueFrom(
          this.http.post(
            `${environment.apiUrl}/api/v3/quizzes/lessons/${lessonId}/sections/${sectionId}/submit`,
            answersArray,
          )
        );
        return;
      }

      // Step 1: start a server-side attempt
      const startRes: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/v3/quizzes/${quizId}/attempts/start`, {})
      );
      const attemptId = (startRes?.data || startRes)?.id as string | undefined;
      if (!attemptId) throw new Error('Failed to start quiz attempt: no attemptId returned');

      // Step 2: convert Map answers to array and submit
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/v3/quizzes/attempts/${attemptId}/submit`, answersArray)
      );
      return;
    }

    switch (item.operationType) {
      case 'CREATE':
        await firstValueFrom(this.http.post(url, item.payload));
        break;
      case 'UPDATE':
        await firstValueFrom(this.http.put(url, item.payload));
        break;
      case 'DELETE':
        await firstValueFrom(this.http.delete(url));
        break;
    }
  }

  /**
   * Handle sync failure with exponential backoff.
   * delay = min(2^retryCount * 1000, 300000) + random jitter
   */
  private async handleSyncFailure(item: SyncQueueItem, error: any): Promise<void> {
    const retryCount = (item.retryCount || 0) + 1;
    const baseDelay = Math.min(Math.pow(2, retryCount) * 1000, 300_000);
    const jitter = Math.random() * 1000;
    const nextRetryAt = new Date(Date.now() + baseDelay + jitter);

    if (retryCount >= 5) {
      await offlineDb.syncQueue.update(item.id!, {
        syncStatus: 'failed',
        retryCount,
        lastError: error?.message || 'Lỗi không xác định',
        nextRetryAt: undefined,
      });
    } else {
      await offlineDb.syncQueue.update(item.id!, {
        retryCount,
        lastError: error?.message || 'Lỗi không xác định',
        nextRetryAt,
      });
    }
  }

  private async getPendingCount(): Promise<number> {
    if (!(await this.ensureOfflineReady(true))) {
      return 0;
    }
    return offlineDb.syncQueue
      .where('userId').equals(getCurrentUserId())
      .filter(item => item.syncStatus === 'pending')
      .count();
  }

  private async refreshCounts(): Promise<void> {
    if (!(await this.ensureOfflineReady(true))) {
      this.pendingCount.set(0);
      this.failedCount.set(0);
      this.conflictCount.set(0);
      this.earliestRetryAt.set(null);
      return;
    }
    const userId = getCurrentUserId();
    const [pending, failed, conflicts] = await Promise.all([
      this.getPendingCount(),
      this.getFailedCount(),
      this.getConflictCount(userId),
    ]);
    this.pendingCount.set(pending);
    this.failedCount.set(failed);
    this.conflictCount.set(conflicts);

    // Find earliest nextRetryAt for display ("Thử lại sau X phút")
    const now = new Date();
    const backoffItems = await offlineDb.syncQueue
      .where('userId').equals(userId)
      .filter(item => item.syncStatus === 'pending' && !!item.nextRetryAt && item.nextRetryAt > now)
      .toArray();
    const earliest = backoffItems
      .map(i => i.nextRetryAt!)
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
    this.earliestRetryAt.set(earliest);
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

  private async pullServerState(): Promise<void> {
    if (!(await this.ensureOfflineReady(true)) || !this.network.online()) {
      return;
    }

    try {
      const userId = getCurrentUserId();
      const lastPullTimestamp = this.readLastPullTimestamp(userId);
      const query = lastPullTimestamp
        ? `?since=${encodeURIComponent(lastPullTimestamp)}`
        : '';
      const response: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/api/v3/sync/pull${query}`)
      );
      const pullResult = (response?.data || response || {}) as SyncPullPayload;
      await this.applyPullResult(userId, pullResult);
    } catch {
      // Pull is best-effort. Push remains the critical path.
    }
  }

  private async applyPullResult(userId: string, payload: SyncPullPayload): Promise<void> {
    const touchedCourseIds = new Set<string>();

    if (Array.isArray(payload.courseStates) && payload.courseStates.length > 0) {
      await this.applyPulledCourseStates(userId, payload.courseStates, touchedCourseIds);
    }

    if (Array.isArray(payload.lessonProgress) && payload.lessonProgress.length > 0) {
      await this.applyPulledLessonProgress(userId, payload.lessonProgress, touchedCourseIds);
    }

    if (Array.isArray(payload.videoProgress) && payload.videoProgress.length > 0) {
      await this.applyPulledVideoProgress(userId, payload.videoProgress, touchedCourseIds);
    }

    if (Array.isArray(payload.conflicts) && payload.conflicts.length > 0) {
      await this.applyPulledConflicts(userId, payload.conflicts);
    }

    if (touchedCourseIds.size > 0) {
      await this.syncLearningProgressStorage(userId, touchedCourseIds);
    }

    const serverTimestamp = this.normalizeIsoTimestamp(payload.serverTimestamp);
    this.writeLastPullTimestamp(
      userId,
      serverTimestamp ?? new Date().toISOString(),
    );
  }

  private async applyPulledCourseStates(
    userId: string,
    courseStates: SyncCourseState[],
    touchedCourseIds: Set<string>,
  ): Promise<void> {
    for (const state of courseStates) {
      const courseId = state.courseId ?? null;
      if (!courseId) {
        continue;
      }

      const course = await offlineDb.courses.get([userId, courseId]);
      if (!course) {
        continue;
      }

      const versionMode = typeof state.versionMode === 'string'
        ? state.versionMode.toUpperCase()
        : null;
      const serverPublicationId = state.publicationId ?? null;

      if (
        course.versionModeSnapshot === 'PINNED' &&
        serverPublicationId &&
        course.publicationId &&
        serverPublicationId !== course.publicationId
      ) {
        await offlineDb.courses.update([userId, courseId], {
          isStale: true,
          staleReason: 'CLASS_ADOPTED_NEW_PUBLICATION',
        } as any);
        touchedCourseIds.add(courseId);
        continue;
      }

      if (
        course.isStale &&
        course.staleReason === 'CLASS_ADOPTED_NEW_PUBLICATION' &&
        versionMode === 'PINNED' &&
        serverPublicationId === course.publicationId
      ) {
        await offlineDb.courses.update([userId, courseId], {
          isStale: false,
          staleReason: null,
        } as any);
        touchedCourseIds.add(courseId);
      }
    }
  }

  private async applyPulledLessonProgress(
    userId: string,
    lessonProgress: SyncLessonProgressItem[],
    touchedCourseIds: Set<string>,
  ): Promise<void> {
    for (const item of lessonProgress) {
      const lessonId = item.lessonId ?? null;
      const courseId = item.courseId ?? null;
      if (!lessonId || !courseId) {
        continue;
      }

      const existing = await offlineDb.progress
        .where('lessonId')
        .equals(lessonId)
        .filter(record => record.userId === userId && record.courseId === courseId)
        .first();

      const status = (item.status || '').toUpperCase();
      const lastActivity = this.parseDate(item.lastActivity);
      const watchSeconds = typeof item.watchSeconds === 'number'
        ? Math.max(0, Math.trunc(item.watchSeconds))
        : 0;
      const completedSections = Array.isArray(item.completedSections)
        ? item.completedSections.filter((sectionId): sectionId is string => typeof sectionId === 'string' && sectionId.length > 0)
        : [];
      const mergedCompletedSections = Array.from(new Set([
        ...(existing?.completedSectionIds ?? []),
        ...completedSections,
      ]));
      const progressPercent = status === 'COMPLETED'
        ? 100
        : Math.max(existing?.progressPercent ?? 0, watchSeconds > 0 ? 1 : 0);
      const videoPosition = Math.max(existing?.videoPosition ?? 0, watchSeconds);
      const completedAt = status === 'COMPLETED'
        ? lastActivity ?? existing?.completedAt ?? new Date()
        : existing?.completedAt;

      if (existing?.id != null) {
        await offlineDb.progress.update(existing.id, {
          progressPercent,
          videoPosition,
          completedSectionIds: mergedCompletedSections,
          completedAt,
          syncStatus: 'synced',
          updatedAt: lastActivity ?? new Date(),
        });
      } else {
        await offlineDb.progress.add({
          lessonId,
          courseId,
          userId,
          progressPercent,
          videoPosition,
          completedSectionIds: mergedCompletedSections,
          completedAt,
          syncStatus: 'synced',
          updatedAt: lastActivity ?? new Date(),
        });
      }

      touchedCourseIds.add(courseId);
    }
  }

  private async applyPulledVideoProgress(
    userId: string,
    videoProgress: SyncVideoProgressItem[],
    touchedCourseIds: Set<string>,
  ): Promise<void> {
    for (const item of videoProgress) {
      const lessonId = item.lessonId ?? null;
      if (!lessonId) {
        continue;
      }

      const lesson = await offlineDb.lessons.get([userId, lessonId]);
      const courseId = lesson?.courseId ?? null;
      if (!courseId) {
        continue;
      }

      const existing = await offlineDb.progress
        .where('lessonId')
        .equals(lessonId)
        .filter(record => record.userId === userId && record.courseId === courseId)
        .first();
      const lastPosition = typeof item.lastPosition === 'number'
        ? Math.max(0, Math.trunc(item.lastPosition))
        : 0;
      const watchedSeconds = typeof item.watchedSeconds === 'number'
        ? Math.max(0, Math.trunc(item.watchedSeconds))
        : 0;
      const nextVideoPosition = Math.max(existing?.videoPosition ?? 0, lastPosition, watchedSeconds);
      const nextProgressPercent = Math.max(existing?.progressPercent ?? 0, nextVideoPosition > 0 ? 1 : 0);
      const updatedAt = this.parseDate(item.updatedAt) ?? new Date();

      if (existing?.id != null) {
        await offlineDb.progress.update(existing.id, {
          videoPosition: nextVideoPosition,
          progressPercent: nextProgressPercent,
          syncStatus: existing.syncStatus === 'conflict' ? 'conflict' : 'synced',
          updatedAt,
        });
      } else {
        await offlineDb.progress.add({
          lessonId,
          courseId,
          userId,
          progressPercent: nextProgressPercent,
          videoPosition: nextVideoPosition,
          syncStatus: 'synced',
          updatedAt,
        });
      }

      touchedCourseIds.add(courseId);
    }
  }

  private async applyPulledConflicts(
    userId: string,
    conflicts: SyncPullConflict[],
  ): Promise<void> {
    const queueItems = await offlineDb.syncQueue.where('userId').equals(userId).toArray();
    for (const conflict of conflicts) {
      const matchingItem = queueItems.find(item =>
        !!conflict.clientOperationId &&
        item.clientOperationId === conflict.clientOperationId
      );
      if (matchingItem?.id == null) {
        continue;
      }

      await offlineDb.syncQueue.update(matchingItem.id, {
        syncStatus: 'failed',
        lastError: conflict.message || 'Sync conflict',
      });

      await this.markProgressConflictFromQueueItem(userId, matchingItem);

      if (this.isStalePublicationConflict(conflict.message)) {
        await this.markCourseStaleFromQueueItem(userId, matchingItem);
      }
    }
  }

  private isStalePublicationConflict(message?: string | null): boolean {
    if (!message) {
      return false;
    }

    const normalized = message.toLowerCase();
    return normalized.includes('goi ngoai tuyen da cu')
      || normalized.includes('cap nhat khoa hoc truoc khi dong bo');
  }

  private async markCourseStaleFromQueueItem(
    userId: string,
    item: SyncQueueItem | undefined,
  ): Promise<void> {
    if (!item?.courseId) {
      return;
    }

    const course = await offlineDb.courses.get([userId, item.courseId]);
    if (!course) {
      return;
    }

    const staleReason =
      course.versionModeSnapshot === 'FOLLOW_LATEST'
        ? 'UPDATE_AVAILABLE'
        : 'CLASS_ADOPTED_NEW_PUBLICATION';

    await offlineDb.courses.update([userId, item.courseId], {
      isStale: true,
      staleReason,
    } as any);
  }

  private async markProgressConflictFromQueueItem(
    userId: string,
    item: SyncQueueItem | undefined,
  ): Promise<void> {
    if (!item || (item.entityType !== 'progress' && item.entityType !== 'videoProgress')) {
      return;
    }

    const payload = item.payload as Record<string, unknown> | null;
    const lessonId = typeof payload?.['lessonId'] === 'string'
      ? payload['lessonId']
      : null;
    if (!lessonId) {
      return;
    }

    let courseId = item.courseId ?? null;
    if (!courseId) {
      const offlineLesson = await offlineDb.lessons.get([userId, lessonId]);
      courseId = offlineLesson?.courseId ?? null;
    }
    if (!courseId) {
      return;
    }

    const existing = await offlineDb.progress
      .where('lessonId')
      .equals(lessonId)
      .filter(record => record.userId === userId && record.courseId === courseId)
      .first();
    if (existing?.id == null) {
      return;
    }

    await offlineDb.progress.update(existing.id, {
      syncStatus: 'conflict',
      updatedAt: new Date(),
    });
  }

  private async getConflictCount(userId: string): Promise<number> {
    const [progressConflicts, otherQueueConflicts] = await Promise.all([
      offlineDb.progress
        .where('userId').equals(userId)
        .filter(record => record.syncStatus === 'conflict')
        .count(),
      offlineDb.syncQueue
        .where('userId').equals(userId)
        .filter(item =>
          item.syncStatus === 'failed'
          && this.isConflictQueueItem(item)
          && item.entityType !== 'progress'
          && item.entityType !== 'videoProgress'
        )
        .count(),
    ]);

    return progressConflicts + otherQueueConflicts;
  }

  private isConflictQueueItem(item: SyncQueueItem): boolean {
    return this.isConflictMessage(item.lastError);
  }

  private isConflictMessage(message?: string | null): boolean {
    if (!message) {
      return false;
    }

    const normalized = this.normalizeText(message);
    return normalized.includes('xung dot')
      || normalized.includes('conflict')
      || this.isStalePublicationConflict(message);
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase();
  }

  private async syncLearningProgressStorage(
    userId: string,
    courseIds: Iterable<string>,
  ): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return;
    }

    for (const courseId of courseIds) {
      const progressRecords = await offlineDb.progress
        .where('courseId')
        .equals(courseId)
        .filter(record => record.userId === userId)
        .toArray();
      const completedLessons = progressRecords
        .filter(record => record.completedAt != null || record.progressPercent >= 100)
        .map(record => record.lessonId);
      const completedSectionIds = Array.from(new Set(
        progressRecords.flatMap(record => record.completedSectionIds ?? []),
      ));

      const existing = this.readLearningProgressSnapshot(courseId);
      const offlineCourse = await offlineDb.courses.get([userId, courseId]);
      const totalLessons = offlineCourse?.totalLessons ?? 0;
      const progressPercentage = totalLessons > 0
        ? Math.round((completedLessons.length / totalLessons) * 100)
        : existing?.progressPercentage ?? 0;

      localStorage.setItem(`learning_progress_${courseId}`, JSON.stringify({
        completedLessons,
        lastAccessedLessonId: existing?.lastAccessedLessonId,
        progressPercentage,
        lastUpdated: new Date().toISOString(),
      }));

      const completedSectionsStorageKey = `learning_completed_sections_${courseId}`;
      if (completedSectionIds.length > 0) {
        localStorage.setItem(completedSectionsStorageKey, JSON.stringify(completedSectionIds));
      } else {
        localStorage.removeItem(completedSectionsStorageKey);
      }
    }
  }

  private readLearningProgressSnapshot(courseId: string): {
    completedLessons?: string[];
    lastAccessedLessonId?: string;
    progressPercentage?: number;
  } | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const raw = localStorage.getItem(`learning_progress_${courseId}`);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return {
        completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
        lastAccessedLessonId: typeof parsed.lastAccessedLessonId === 'string'
          ? parsed.lastAccessedLessonId
          : undefined,
        progressPercentage: typeof parsed.progressPercentage === 'number'
          ? parsed.progressPercentage
          : undefined,
      };
    } catch {
      return null;
    }
  }

  private getPullStateStorageKey(userId: string): string {
    return `${LAST_PULL_SYNC_KEY_PREFIX}${userId}`;
  }

  private readLastPullTimestamp(userId: string): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const raw = localStorage.getItem(this.getPullStateStorageKey(userId));
      return this.normalizeIsoTimestamp(raw);
    } catch {
      return null;
    }
  }

  private writeLastPullTimestamp(userId: string, timestamp: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.getPullStateStorageKey(userId), timestamp);
    } catch {
      // Ignore storage write failures.
    }
  }

  private normalizeIsoTimestamp(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  private parseDate(value: string | null | undefined): Date | null {
    const normalized = this.normalizeIsoTimestamp(value);
    return normalized ? new Date(normalized) : null;
  }
}
