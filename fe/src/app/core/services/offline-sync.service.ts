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
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';

export interface SyncResult {
  synced: number;
  failed: number;
  pending: number;
}

@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private readonly http = inject(HttpClient);
  private readonly network = inject(NetworkStatusService);
  private readonly toast = inject(ToastService);

  readonly isSyncing = signal(false);
  readonly pendingCount = signal(0);
  readonly failedCount = signal(0);
  readonly lastSyncResult = signal<SyncResult | null>(null);
  /**
   * Earliest nextRetryAt across all pending items still in backoff.
   * Used by UI to show "Thử lại sau X phút".
   */
  readonly earliestRetryAt = signal<Date | null>(null);

  /** True if there are failed items that can be retried */
  readonly hasFailedItems = computed(() => this.failedCount() > 0);

  private syncInProgress = false;

  constructor() {
    if (typeof window === 'undefined') return;

    // Auto-sync with priority when coming back online
    window.addEventListener('online', () => {
      setTimeout(() => this.syncWithPriority(), 2000);
    });

    // Listen for SW background sync trigger (sw.js sends SYNC_OFFLINE_QUEUE)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_OFFLINE_QUEUE') {
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
  ): Promise<void> {
    await ensureOfflineDbReady();
    const userId = getCurrentUserId();
    const metadata = this.extractSyncMetadata(payload);

    // Deduplicate: check for existing pending item with same entityType + endpoint for this user
    const existing = await offlineDb.syncQueue
      .where('userId').equals(userId)
      .filter(item => item.syncStatus === 'pending' && item.entityType === entityType && item.endpoint === endpoint)
      .first();

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
  async syncAll(): Promise<SyncResult> {
    if (!(await this.ensureOfflineReady(true))) {
      return { synced: 0, failed: 0, pending: 0 };
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

      // Try batch sync via dedicated endpoint first
      const batchResult = await this.tryBatchSync(readyItems);
      if (batchResult) {
        result.synced = batchResult.synced;
        result.failed = batchResult.failed;
      } else {
        // Fallback: sync items individually
        for (const item of readyItems) {
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
  async syncWithPriority(): Promise<void> {
    if (this.syncInProgress || !this.network.online()) return;

    // Step 1: Sync all queued operations (progress, submissions, quiz attempts)
    const result = await this.syncAll();

    // Step 2: Check content freshness for all downloaded courses
    if (result.synced > 0 || result.failed === 0) {
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

    if (failedItems.length === 0) {
      this.toast.info('Không có mục thất bại cần thử lại');
      return { synced: 0, failed: 0, pending: 0 };
    }

    // Reset failed items fully (retryCount resets so backoff restarts from scratch)
    for (const item of failedItems) {
      await offlineDb.syncQueue.update(item.id!, {
        syncStatus: 'pending',
        retryCount: 0,
        lastError: undefined,
        nextRetryAt: undefined,
      });
    }

    await this.refreshCounts();
    this.toast.info(`Đang thử lại ${failedItems.length} mục...`);

    return this.syncAll();
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
      .filter(item => item.syncStatus === 'failed')
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
    await offlineDb.syncQueue
      .where('userId').equals(getCurrentUserId())
      .filter(item => item.syncStatus === 'failed')
      .delete();
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
    const hasEmbeddedSectionQuiz = items.some(item =>
      item.entityType === 'quizAttempt' &&
      ((item.payload as Record<string, unknown> | null)?.['mode'] === 'section')
    );
    if (hasEmbeddedSectionQuiz) {
      return null;
    }

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
        payload: item.payload as Record<string, unknown>,
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
    const payload = item.payload as Record<string, unknown> | null;
    if (!payload) return undefined;
    const id = payload['id'] ?? payload['quizId'] ?? payload['lessonId'] ?? payload['localAttemptId'] ?? payload['sectionId'];
    return id != null ? String(id) : undefined;
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
      this.earliestRetryAt.set(null);
      return;
    }
    const userId = getCurrentUserId();
    const [pending, failed] = await Promise.all([
      this.getPendingCount(),
      this.getFailedCount(),
    ]);
    this.pendingCount.set(pending);
    this.failedCount.set(failed);

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
}
