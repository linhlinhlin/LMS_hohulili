/**
 * ChatPanelComponent — Sprint 220c: "Nhúng Wiii Pro"
 *
 * Embeds Wiii AI directly via iframe instead of proxying through LMS backend.
 * Auth is passed via URL hash fragment (not sent to server — secure by spec).
 *
 * Supports two display modes:
 *   - "sidebar" (default): Fills parent container, no fixed positioning — used as right sidebar in layout
 *   - "widget": Fixed position popup at bottom-right — used on mobile
 *
 * Architecture:
 *   Browser → iframe(Wiii Embed) → Wiii AI directly
 *   Latency: ~1-3s (single hop, direct SSE) vs ~3-7s (double hop via LMS proxy)
 */
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
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
import { AuthService } from '../../../../../core/services/auth.service';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-chat-panel',
  imports: [],
  template: `
    <div
      class="chat-panel"
      [class.sidebar-mode]="mode() === 'sidebar'"
      [class.widget-mode]="mode() === 'widget'"
      [class.mobile]="isMobile() && mode() === 'widget'"
      [class.visible]="isVisible()"
    >
      <!-- Header -->
      <div class="panel-header">
        <div class="header-title">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="header-icon">
            <path fill-rule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5z" clip-rule="evenodd" />
          </svg>
          <span>Wiii</span>
        </div>
        <div class="header-actions">
          @if (mode() === 'sidebar') {
            <button class="new-chat-button" (click)="clearChat()" title="Cuộc trò chuyện mới">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
              </svg>
            </button>
          }
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
    /* Host element — must stretch inside flex-column parents (sidebar) */
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    /* =========================================================
       BASE — shared between sidebar and widget modes
       ========================================================= */
    .chat-panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      background: white;
      overflow: hidden;
    }

    /* =========================================================
       SIDEBAR MODE — fills parent container, no fixed positioning
       Used as right sidebar in desktop layout
       ========================================================= */
    .chat-panel.sidebar-mode {
      width: 100%;
      height: 100%;
      min-width: 0;
      border-radius: 0;
      box-shadow: none;
      opacity: 1;
      pointer-events: auto;
    }

    .chat-panel.sidebar-mode .wiii-embed-frame {
      border-radius: 0;
    }

    /* Sidebar header — clean minimal (Claude.ai style) */
    .chat-panel.sidebar-mode .panel-header {
      background: #ffffff;
      color: #1a1a2e;
      border-bottom: 1px solid #ebebeb;
      padding: 13px 14px;
    }

    .chat-panel.sidebar-mode .header-icon {
      color: #0056D2;
    }

    .chat-panel.sidebar-mode .header-title {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .chat-panel.sidebar-mode .new-chat-button,
    .chat-panel.sidebar-mode .expand-button,
    .chat-panel.sidebar-mode .close-button {
      background: transparent;
      color: #9ca3af;
      border-radius: 6px;
      width: 28px;
      height: 28px;
    }

    .chat-panel.sidebar-mode .new-chat-button:hover,
    .chat-panel.sidebar-mode .expand-button:hover,
    .chat-panel.sidebar-mode .close-button:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .chat-panel.sidebar-mode .new-chat-button svg,
    .chat-panel.sidebar-mode .expand-button svg,
    .chat-panel.sidebar-mode .close-button svg {
      width: 15px;
      height: 15px;
    }

    /* =========================================================
       WIDGET MODE — fixed position popup (mobile fallback)
       ========================================================= */
    .chat-panel.widget-mode {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      height: 520px;
      max-height: calc(100vh - 120px);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      z-index: 999;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .chat-panel.widget-mode.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .chat-panel.widget-mode.mobile {
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

    .chat-panel.widget-mode .wiii-embed-frame {
      border-radius: 0 0 16px 16px;
    }

    .chat-panel.widget-mode.mobile .wiii-embed-frame {
      border-radius: 0;
    }

    /* =========================================================
       HEADER
       ========================================================= */
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: linear-gradient(135deg, #0056D2 0%, #004BB5 100%);
      color: white;
      flex-shrink: 0;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 600;
    }

    .header-icon {
      width: 22px;
      height: 22px;
    }

    .header-actions {
      display: flex;
      gap: 4px;
    }

    .new-chat-button,
    .expand-button,
    .close-button {
      width: 30px;
      height: 30px;
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

    .new-chat-button:hover,
    .expand-button:hover,
    .close-button:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .new-chat-button svg,
    .expand-button svg,
    .close-button svg {
      width: 16px;
      height: 16px;
    }

    /* =========================================================
       IFRAME
       ========================================================= */
    .wiii-embed-frame {
      width: 100%;
      flex: 1;
      border: none;
    }

    /* =========================================================
       LOADING / ERROR STATES
       ========================================================= */
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

    /* =========================================================
       MOBILE OVERRIDES (widget mode only)
       ========================================================= */
    @media (max-width: 767px) {
      .chat-panel.widget-mode {
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
  private readonly authService = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);

  // Inputs
  mode = input<'sidebar' | 'widget'>('sidebar');

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
        // Sprint 220c: Pass mode=widget, hide_welcome, and org for multi-tenant context
        const org = this.authService.getCurrentUser()?.organizationId || '';
        const hash = `token=${token}&domain=maritime&theme=light&role=${role}&mode=widget&hide_welcome=true${org ? '&org=' + encodeURIComponent(org) : ''}`;
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
   * New Chat — sends PostMessage to Wiii embed to start a fresh conversation.
   * The old conversation is preserved in backend history (accessible from full Wiii app).
   * Only the sidebar view resets to show a clean welcome screen.
   */
  clearChat(): void {
    const wiiiOrigin = this.getEmbedOrigin();
    if (!wiiiOrigin) return;

    const iframe = this.wiiiIframe();
    iframe?.nativeElement.contentWindow?.postMessage(
      { type: 'wiii:clear-chat' },
      wiiiOrigin
    );
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
