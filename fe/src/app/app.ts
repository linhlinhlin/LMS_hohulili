import { Component, signal, inject, effect, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { PwaService } from './core/services/pwa.service';
import { SwUpdateService } from './core/services/sw-update.service';
import { NetworkStatusService } from './core/services/network-status.service';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { OfflineIndicatorComponent } from './shared/components/offline-indicator/offline-indicator.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, ConfirmDialogComponent, OfflineIndicatorComponent],
  template: `
    <router-outlet></router-outlet>
    <app-toast-container />
    <app-confirm-dialog />
    <app-offline-indicator />
  `,
})
export class App {
  private pwaService = inject(PwaService);
  private swUpdate = inject(SwUpdateService);
  private network = inject(NetworkStatusService);
  private router = inject(Router);
  protected readonly title = signal('LMS Maritime - Hệ thống Quản lý Học tập Phân tán');

  /** URL to restore when coming back online */
  private savedUrl: string | null = null;

  constructor() {
    this.swUpdate.initialize();

    // Auto-redirect to /offline when network goes down, restore when back
    effect(() => {
      const isOnline = this.network.online();
      const currentUrl = this.router.url;

      if (!isOnline && !currentUrl.startsWith('/offline')) {
        this.savedUrl = currentUrl;
        this.router.navigate(['/offline']);
      } else if (isOnline && currentUrl.startsWith('/offline')) {
        this.router.navigate([this.savedUrl || '/']);
        this.savedUrl = null;
      }
    });
  }
}
