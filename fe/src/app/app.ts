import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaService } from './core/services/pwa.service';
import { SwUpdateService } from './core/services/sw-update.service';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { OfflineIndicatorComponent } from './shared/components/offline-indicator/offline-indicator.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, ConfirmDialogComponent, OfflineIndicatorComponent],
  template: `
    <app-offline-indicator />
    <router-outlet></router-outlet>
    <app-toast-container />
    <app-confirm-dialog />
  `,
})
export class App {
  private pwaService = inject(PwaService);
  private swUpdate = inject(SwUpdateService);
  protected readonly title = signal('LMS Maritime - Hệ thống Quản lý Học tập Phân tán');

  constructor() {
    this.swUpdate.initialize();
  }
}
