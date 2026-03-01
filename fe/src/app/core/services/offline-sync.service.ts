import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { offlineDb, getCurrentUserId, type SyncQueueItem, type SyncEntityType, type SyncOperationType } from '../db/lms-offline.db';
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

  /** True if there are failed items that can be retried */
  readonly hasFailedItems = computed(() => this.failedCount() > 0);

  private syncInProgress = false;

  constructor() {
    if (typeof window === 'undefined') return;

    // Auto-sync when coming back online
    window.addEventListener('online', () => {
      setTimeout(() => this.syncAll(), 2000);
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
    this.refreshCounts();
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
    const userId = getCurrentUserId();

    // Deduplicate: check for existing pending item with same entityType + endpoint for this user
    const existing = await offlineDb.syncQueue
      .where('userId').equals(userId)
      .filter(item => item.syncStatus === 'pending' && item.entityType === entityType && item.endpoint === endpoint)
      .first();

    if (existing?.id != null) {
      await offlineDb.syncQueue.update(existing.id, {
        payload,
      });
    } else {
      await offlineDb.syncQueue.add({
        userId,
        entityType,
        operationType,
        endpoint,
        payload,
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
   * Retry all failed sync items.
   * Resets failed items to pending and triggers syncAll().
   */
  async retryFailed(): Promise<SyncResult> {
    const failedItems = await offlineDb.syncQueue
      .where('userId').equals(getCurrentUserId())
      .filter(item => item.syncStatus === 'failed')
      .toArray();

    if (failedItems.length === 0) {
      this.toast.info('Không có mục thất bại cần thử lại');
      return { synced: 0, failed: 0, pending: 0 };
    }

    // Reset failed items to pending with retryCount preserved, clear backoff
    for (const item of failedItems) {
      await offlineDb.syncQueue.update(item.id!, {
        syncStatus: 'pending',
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
    return offlineDb.syncQueue
      .where('userId').equals(getCurrentUserId())
      .filter(item => item.syncStatus === 'failed')
      .count();
  }

  /**
   * Clear all failed items (user acknowledges data loss).
   */
  async clearFailed(): Promise<void> {
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
    try {
      const operations = items.map(item => ({
        entityType: item.entityType,
        operationType: item.operationType,
        endpoint: item.endpoint,
        payload: item.payload as Record<string, unknown>,
      }));

      const response: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/v3/sync/push`, { operations })
      );

      const pushResult = response?.data;
      if (!pushResult) return null;

      // Mark all as synced (server processes batch atomically)
      for (const item of items) {
        await offlineDb.syncQueue.update(item.id!, { syncStatus: 'synced' });
      }

      // Handle conflicts returned by server
      if (pushResult.conflicts?.length > 0) {
        for (const conflict of pushResult.conflicts) {
          // Find the matching item by entityType + entityId from payload
          const matchingItem = items.find(i =>
            i.entityType === conflict.entityType &&
            this.extractEntityIdFromItem(i) === conflict.entityId
          ) || items.find(i => i.entityType === conflict.entityType);

          if (matchingItem) {
            await offlineDb.syncQueue.update(matchingItem.id!, {
              syncStatus: 'failed',
              lastError: `Xung đột: ${conflict.message}`,
            });
          }
        }
      }

      return {
        synced: pushResult.accepted || items.length,
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
    const id = payload['id'] ?? payload['lessonId'] ?? payload['attemptId'] ?? payload['sectionId'];
    return id != null ? String(id) : undefined;
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const url = `${environment.apiUrl}${item.endpoint}`;

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
    return offlineDb.syncQueue
      .where('userId').equals(getCurrentUserId())
      .filter(item => item.syncStatus === 'pending')
      .count();
  }

  private async refreshCounts(): Promise<void> {
    const [pending, failed] = await Promise.all([
      this.getPendingCount(),
      this.getFailedCount(),
    ]);
    this.pendingCount.set(pending);
    this.failedCount.set(failed);
  }
}
