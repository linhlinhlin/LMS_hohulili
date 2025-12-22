import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatSidebarComponent } from '../../components/chat-sidebar/chat-sidebar.component';
import { ChatMainAreaComponent } from '../../components/chat-main-area/chat-main-area.component';
import { ChatToastContainerComponent } from '../../components/chat-toast/chat-toast.component';
import { ChatDialogComponent } from '../../components/chat-dialog/chat-dialog.component';
import { ChatService } from '../../../application/services/chat.service';
import { SessionManagementService } from '../../../application/services/session-management.service';

@Component({
  selector: 'app-ai-chat-full-page',
  standalone: true,
  imports: [
    CommonModule,
    ChatSidebarComponent,
    ChatMainAreaComponent,
    ChatToastContainerComponent,
    ChatDialogComponent
  ],
  template: `
    <div class="chat-layout">
      <!-- Sidebar - Fixed position -->
      <aside class="chat-sidebar-wrapper" [class.mobile-open]="mobileSidebarOpen">
        <app-chat-sidebar
          [sessions]="chatService.sessions()"
          [activeSessionId]="sessionService.currentSessionId()"
          [mobileIsOpen]="mobileSidebarOpen"
          (newChat)="onNewChat()"
          (selectSession)="onSelectSession($event)"
          (deleteSession)="onDeleteSession($event)"
          (closeMobile)="closeMobileSidebar()"
        ></app-chat-sidebar>
      </aside>

      <!-- Mobile Overlay -->
      <div class="mobile-overlay" *ngIf="mobileSidebarOpen" (click)="closeMobileSidebar()"></div>

      <!-- Main Content Area -->
      <main class="chat-main-wrapper">
        <!-- Mobile Header -->
        <header class="mobile-header">
          <button class="menu-btn" (click)="toggleMobileSidebar()">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div class="mobile-brand">
            <div class="brand-icon-small">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
                <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <span class="brand-text">Trợ lý AI Hàng hải</span>
          </div>
          <button class="new-chat-mobile-btn" (click)="onNewChat()">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </header>

        <!-- Chat Content -->
        <app-chat-main-area
          class="chat-content"
          [messages]="chatService.messages()"
          [isLoading]="chatService.isLoading()"
          [isStreaming]="chatService.isStreaming()"
          [streamingThinking]="chatService.streamingThinking()"
          [suggestedQuestions]="chatService.suggestedQuestions()"
          (sendMessage)="onSendMessage($event)"
          (selectSuggestion)="onSelectSuggestion($event)"
          (regenerate)="onRegenerate()"
        ></app-chat-main-area>
      </main>
    </div>

    <!-- Toast Notifications -->
    <app-chat-toast-container></app-chat-toast-container>

    <!-- Confirmation Dialogs -->
    <app-chat-dialog></app-chat-dialog>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    .chat-layout {
      display: flex;
      height: 100%;
      background: #F8FAFC;
      overflow: hidden;
    }

    /* ===== SIDEBAR ===== */
    .chat-sidebar-wrapper {
      flex-shrink: 0;
      width: 280px;
      height: 100%;
      overflow: hidden;
    }

    /* ===== MAIN CONTENT ===== */
    .chat-main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      height: 100%;
      overflow: hidden;
    }

    .chat-content {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    /* ===== MOBILE HEADER ===== */
    .mobile-header {
      display: none;
      flex-shrink: 0;
      height: 60px;
      background: #FFFFFF;
      border-bottom: 1px solid #E2E8F0;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
    }

    .menu-btn,
    .new-chat-mobile-btn {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      color: #475569;
      transition: all 0.15s;
    }

    .menu-btn:hover,
    .new-chat-mobile-btn:hover {
      background: #F1F5F9;
      color: #0369A1;
    }

    .menu-btn svg,
    .new-chat-mobile-btn svg {
      width: 22px;
      height: 22px;
    }

    .mobile-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-icon-small {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0369A1 0%, #0284C7 100%);
      border-radius: 8px;
      color: white;
    }

    .brand-icon-small svg {
      width: 18px;
      height: 18px;
    }

    .brand-text {
      font-weight: 600;
      font-size: 1rem;
      color: #0F172A;
    }

    /* ===== MOBILE OVERLAY ===== */
    .mobile-overlay {
      display: none;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 768px) {
      .chat-sidebar-wrapper {
        position: fixed;
        left: 0;
        top: 0;
        z-index: 100;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
      }

      .chat-sidebar-wrapper.mobile-open {
        transform: translateX(0);
      }

      .mobile-header {
        display: flex;
      }

      .mobile-overlay {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.5);
        z-index: 90;
      }
    }
  `]
})
export class AiChatFullPageComponent {
  readonly chatService = inject(ChatService);
  readonly sessionService = inject(SessionManagementService);

  mobileSidebarOpen = false;

  onNewChat() {
    this.chatService.startNewSession();
    this.closeMobileSidebar();
  }

  onSelectSession(sessionId: string) {
    this.chatService.loadSession(sessionId);
    this.closeMobileSidebar();
  }

  onDeleteSession(sessionId: string) {
    this.chatService.deleteSession(sessionId);
  }

  onSendMessage(message: string) {
    this.chatService.sendMessage(message);
  }

  onSelectSuggestion(suggestion: string) {
    this.chatService.sendSuggestedQuestion(suggestion);
  }

  onRegenerate() {
    this.chatService.retryLastMessage();
  }

  toggleMobileSidebar() {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeMobileSidebar() {
    this.mobileSidebarOpen = false;
  }
}

