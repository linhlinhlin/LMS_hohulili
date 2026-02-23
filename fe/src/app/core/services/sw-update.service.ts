import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval, switchMap } from 'rxjs';
import { from } from 'rxjs';
import { ToastService } from './toast.service';
import { StorageManagerService } from './storage-manager.service';
import { ConfirmDialogService } from './confirm-dialog.service';

@Injectable({ providedIn: 'root' })
export class SwUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly toast = inject(ToastService);
  private readonly storage = inject(StorageManagerService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  initialize(): void {
    if (!this.swUpdate.isEnabled) return;

    // Check for updates every 6 hours (maritime connectivity windows)
    interval(6 * 60 * 60 * 1000).pipe(
      switchMap(() => from(this.swUpdate.checkForUpdate())),
    ).subscribe();

    // Prompt user when new version ready (prevents data loss during quiz/assignment)
    this.swUpdate.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
    ).subscribe(async () => {
      const confirmed = await this.confirmDialog.confirm({
        title: 'Cập nhật ứng dụng',
        message: 'Phiên bản mới đã sẵn sàng. Tải lại trang để cập nhật?',
        variant: 'info',
        confirmText: 'Cập nhật ngay',
        cancelText: 'Để sau',
      });

      if (confirmed) {
        document.location.reload();
      } else {
        this.toast.info('Ứng dụng sẽ cập nhật khi bạn tải lại trang');
      }
    });

    // Handle unrecoverable state
    this.swUpdate.unrecoverable.subscribe(() => {
      this.toast.error('Ứng dụng gặp lỗi. Đang tải lại...');
      document.location.reload();
    });

    // Request persistent storage on first load
    this.storage.requestPersistence();
  }
}
