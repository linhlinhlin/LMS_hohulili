import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminStorageApi, PendingReviewItem, StorageHealth, VideoCdnHealth } from '../../../../api/client/admin-storage.api';
import { ToastService } from '../../../../core/services/toast.service';
import { KpiCardComponent, type KpiVariant } from '../../../../shared/components/admin/kpi-card/kpi-card.component';

/**
 * Admin Storage Console — `/admin/storage`.
 *
 * SOTA-grade ops surface that gives a system admin visibility into:
 *   - R2 reachability for each bucket (lms-cdn + lms-storage).
 *   - Object count + total bytes (sampled, capped at 5000 / call).
 *   - Pending-link-review queue (legacy from Phase 0c tactical backfill).
 *
 * This page is intentionally read-mostly. Destructive actions (release orphan)
 * always go through a confirm and only soft-clear the sentinel — the cleanup
 * scheduler does the actual delete on the next 3 AM run.
 */
@Component({
  selector: 'app-admin-storage',
  imports: [CommonModule, KpiCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-storage.component.html',
  styleUrl: './admin-storage.component.scss',
})
export class AdminStorageComponent implements OnInit {
  private readonly api = inject(AdminStorageApi);
  private readonly toast = inject(ToastService);

  readonly health = signal<StorageHealth | null>(null);
  readonly pending = signal<PendingReviewItem[]>([]);
  readonly loadingHealth = signal(true);
  readonly loadingPending = signal(true);
  readonly releasingId = signal<string | null>(null);

  readonly bothBucketsReachable = computed(() => {
    const h = this.health();
    return !!h && h.publicBucket.reachable && h.videoBucket.reachable;
  });

  readonly videoCdnReady = computed(() => this.health()?.videoCdn?.cdnSegmentDeliveryReady === true);

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loadHealth();
    this.loadPending();
  }

  private loadHealth(): void {
    this.loadingHealth.set(true);
    this.api.health().subscribe({
      next: (h) => {
        this.health.set(h);
        this.loadingHealth.set(false);
      },
      error: (err) => {
        this.toast.error('Không thể tải trạng thái storage', err?.error?.message);
        this.loadingHealth.set(false);
      },
    });
  }

  private loadPending(): void {
    this.loadingPending.set(true);
    this.api.pendingReview().subscribe({
      next: (rows) => {
        this.pending.set(rows);
        this.loadingPending.set(false);
      },
      error: () => {
        this.pending.set([]);
        this.loadingPending.set(false);
      },
    });
  }

  release(item: PendingReviewItem): void {
    const ok = window.confirm(
      `Xác nhận chuyển file "${item.originalName}" (${this.formatBytes(item.size)}) sang hàng đợi xóa?\n\n` +
      `File sẽ bị xóa hoàn toàn vào lần chạy cleanup tiếp theo (3 AM UTC). Hành động không thể hoàn tác.`
    );
    if (!ok) return;

    this.releasingId.set(item.id);
    this.api.releaseOrphan(item.id).subscribe({
      next: () => {
        this.releasingId.set(null);
        this.pending.update((rows) => rows.filter((r) => r.id !== item.id));
        this.toast.success('Đã chuyển sang hàng đợi xóa');
      },
      error: (err) => {
        this.releasingId.set(null);
        this.toast.error('Không thể release file', err?.error?.message);
      },
    });
  }

  formatBytes(bytes: number | null | undefined): string {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  }

  cdnStatusLabel(cdn: VideoCdnHealth | null | undefined): string {
    if (!cdn) return 'CHƯA CÓ DỮ LIỆU';
    if (cdn.cdnSegmentDeliveryReady) return 'CDN EDGE';
    return cdn.cdnRequired ? 'CẦN CẤU HÌNH' : 'FALLBACK';
  }

  cdnStatusVariant(cdn: VideoCdnHealth | null | undefined): KpiVariant {
    if (!cdn) return 'default';
    if (cdn.cdnSegmentDeliveryReady) return 'success';
    return cdn.cdnRequired ? 'error' : 'warning';
  }

  cdnStatusSub(cdn: VideoCdnHealth | null | undefined): string {
    if (!cdn) return 'Chưa nhận được trạng thái CDN';
    if (cdn.cdnSegmentDeliveryReady) {
      const manifestTtl = cdn.manifestCacheSeconds ? ` - manifest ${cdn.manifestCacheSeconds}s` : '';
      return `${cdn.mediaDomain || 'media domain'} - token ${cdn.edgeTokenExpirySeconds}s${manifestTtl}`;
    }
    if (cdn.requiredActions?.length) {
      return cdn.requiredActions.slice(0, 2).join(' - ');
    }
    return cdn.cdnRequired ? 'CDN bắt buộc nhưng chưa sẵn sàng' : 'Đang phát qua backend proxy';
  }

  cdnRequiredActions(cdn: VideoCdnHealth | null | undefined): string[] {
    return cdn?.requiredActions ?? [];
  }
}
