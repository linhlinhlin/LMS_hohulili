import { Component, signal, inject, effect, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdateService } from './core/services/sw-update.service';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { OfflineIndicatorComponent } from './shared/components/offline-indicator/offline-indicator.component';
import { SessionExpiredBannerComponent } from './shared/components/session-expired-banner/session-expired-banner.component';
import { AppUpdateBannerComponent } from './shared/components/app-update-banner/app-update-banner.component';
import { SessionExpiredService } from './core/services/session-expired.service';
import { WebMcpService } from './core/services/webmcp.service';
import { OfflineStorageTelemetryIngestService } from './core/services/offline-storage-telemetry-ingest.service';
import { AuthService } from './core/services/auth.service';
import { MessagingService } from './core/services/messaging.service';
import { WiiiOperatorPreviewDialogComponent } from './features/ai-chat/presentation/components';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [
    RouterOutlet,
    ToastContainerComponent,
    ConfirmDialogComponent,
    OfflineIndicatorComponent,
    SessionExpiredBannerComponent,
    AppUpdateBannerComponent,
    WiiiOperatorPreviewDialogComponent,
  ],
  template: `
    <app-session-expired-banner />
    <app-offline-indicator />
    <app-update-banner />
    <router-outlet></router-outlet>
    <app-wiii-operator-preview-dialog />
    <app-toast-container />
    <app-confirm-dialog />
  `,
})
export class App {
  private swUpdate = inject(SwUpdateService);
  private sessionService = inject(SessionExpiredService);
  private webMcp = inject(WebMcpService);
  private offlineStorageTelemetryIngest = inject(OfflineStorageTelemetryIngestService);
  private authService = inject(AuthService);
  private messagingService = inject(MessagingService);
  protected readonly title = signal('LMS Maritime - Hệ thống Quản lý Học tập Phân tán');

  constructor() {
    this.swUpdate.initialize();
    this.sessionService.evaluateState();
    this.webMcp.initialize();

    // Connect WebSocket when user is authenticated
    effect(() => {
      const user = this.authService.currentUserSignal();
      if (user) {
        this.messagingService.setCurrentUserId(user.id);
        this.messagingService.connectWebSocket();
      } else {
        this.messagingService.disconnectWebSocket();
      }
    });
  }
}
