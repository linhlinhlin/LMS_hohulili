/**
 * ChatPanelComponent — Sprint 220b: "Nhúng Wiii"
 *
 * Embeds Wiii AI directly via iframe instead of proxying through LMS backend.
 * Auth is passed via URL hash fragment (not sent to server — secure by spec).
 *
 * Architecture:
 *   Browser → iframe(Wiii Embed) → Wiii AI directly
 *   Latency: ~1-3s (single hop, direct SSE) vs ~3-7s (double hop via LMS proxy)
 */
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  output,
  signal,
  HostListener,
  OnInit,
  OnDestroy,
  ElementRef,
  viewChild,
} from '@angular/core';

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AiTokenService } from '../../../infrastructure/api/ai-token.service';
import { SessionManagementService } from '../../../application/services/session-management.service';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-chat-panel',
  imports: [],
  template: `
    <div
      class="chat-panel"
      [class.mobile]="isMobile()"
      [class.visible]="isVisible()"
    >
      <!-- Header -->
      <div class="panel-header">
        <div class="header-title">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="header-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          <span>Trợ lý AI Hàng Hải</span>
        </div>
        <div class="header-actions">
          <button class="expand-button" (click)="openFullWiii()" title="Mở toàn màn hình">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.28 7.78l3.22-3.22v2.69a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.69l-3.22 3.22a.75.75 0 001.06 1.06zM2 17.25v-4.5a.75.75 0 011.5 0v2.69l3.22-3.22a.75.75 0 011.06 1.06L4.56 16.5h2.69a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z" />
            </svg>
          </button>
          <button class="close-button" (click)="onClose()" title="Đóng">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Wiii iframe (fills remaining space) -->
      @if (embedUrl()) {
        <iframe
          #wiiiIframe
          [src]="embedUrl()"
          class="wiii-embed-frame"
          allow="clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Wiii AI Chat"
        ></iframe>
      } @else if (loadError()) {
        <div class="error-state">
          <span>Không thể kết nối AI. Vui lòng thử lại sau.</span>
          <button (click)="retryInit()">Thử lại</button>
        </div>
      } @else {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <span>Đang kết nối AI...</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .chat-panel {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      height: 520px;
      max-height: calc(100vh - 120px);
      display: flex;
      flex-direction: column;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      overflow: hidden;
      z-index: 999;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .chat-panel.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .chat-panel.mobile {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      max-height: 100%;
      border-radius: 0;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: linear-gradient(135deg, #0056D2 0%, #004BB5 100%);
      color: white;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 600;
    }

    .header-icon {
      width: 24px;
      height: 24px;
    }

    .header-actions {
      display: flex;
      gap: 4px;
    }

    .expand-button,
    .close-button {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.15);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .expand-button:hover,
    .close-button:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .expand-button svg,
    .close-button svg {
      width: 16px;
      height: 16px;
    }

    .wiii-embed-frame {
      width: 100%;
      flex: 1;
      border: none;
      border-radius: 0 0 16px 16px;
    }

    .loading-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      color: #6b7280;
      font-size: 14px;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e5e7eb;
      border-top-color: #0056D2;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 24px;
      color: #dc2626;
      font-size: 14px;
      text-align: center;
    }

    .error-state button {
      padding: 8px 16px;
      background: #0056D2;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }

    .error-state button:hover {
      background: #004BB5;
    }

    @media (max-width: 767px) {
      .chat-panel {
        bottom: 0;
        right: 0;
      }

      .expand-button {
        display: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPanelComponent implements OnInit, OnDestroy {
  private readonly tokenService = inject(AiTokenService);
  private readonly sessionService = inject(SessionManagementService);
  private readonly sanitizer = inject(DomSanitizer);

  // Outputs
  closePanel = output<void>();

  // State
  isVisible = signal(true);
  isMobile = signal(false);
  embedUrl = signal<SafeResourceUrl | null>(null);
  loadError = signal(false);

  // View child for postMessage bridge
  wiiiIframe = viewChild<ElementRef<HTMLIFrameElement>>('wiiiIframe');

  // Track message listener for cleanup
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  ngOnInit(): void {
    this.checkMobile();
    this.initEmbed();
    this.setupMessageBridge();
  }

  ngOnDestroy(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }

  private checkMobile(): void {
    if (typeof window !== 'undefined') {
      this.isMobile.set(window.innerWidth < 768);
    }
  }

  /**
   * Initialize embed by exchanging token and building iframe URL.
   * Auth is passed via URL hash fragment (secure — not sent to server).
   */
  async initEmbed(): Promise<void> {
    this.loadError.set(false);
    this.embedUrl.set(null);

    try {
      const token = await this.tokenService.getToken();
      if (token) {
        const wiiiEmbedUrl = environment.wiiiEmbedUrl;
        const role = this.sessionService.currentRole() || 'student';
        // Hash fragment: secure — not included in HTTP requests per RFC 3986
        const hash = `token=${token}&domain=maritime&theme=light&role=${role}`;
        const url = `${wiiiEmbedUrl}#${hash}`;
        this.embedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      } else {
        this.loadError.set(true);
      }
    } catch {
      this.loadError.set(true);
    }
  }

  retryInit(): void {
    this.initEmbed();
  }

  onClose(): void {
    this.closePanel.emit();
  }

  openFullWiii(): void {
    window.open(environment.wiiiAppUrl, '_blank');
  }

  /**
   * PostMessage bridge — handles token refresh requests from Wiii embed.
   * When the AI JWT expires mid-conversation, the iframe sends 'wiii:auth-expired'
   * and we respond with a fresh token.
   */
  private setupMessageBridge(): void {
    const wiiiOrigin = this.getEmbedOrigin();
    if (!wiiiOrigin) return;

    this.messageHandler = async (event: MessageEvent) => {
      // Origin validation — only accept messages from Wiii embed
      if (event.origin !== wiiiOrigin) return;

      if (event.data?.type === 'wiii:auth-expired') {
        // Re-exchange token via LMS backend
        this.tokenService.clearToken();
        const token = await this.tokenService.getToken();
        if (token) {
          const iframe = this.wiiiIframe();
          iframe?.nativeElement.contentWindow?.postMessage(
            { type: 'wiii:auth', payload: { token } },
            wiiiOrigin
          );
        }
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  private getEmbedOrigin(): string | null {
    try {
      return new URL(environment.wiiiEmbedUrl).origin;
    } catch {
      return null;
    }
  }
}
