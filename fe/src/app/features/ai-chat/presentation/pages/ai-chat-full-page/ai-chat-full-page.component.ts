import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatSidebarComponent } from '../../components/chat-sidebar/chat-sidebar.component';
import { ChatMainAreaComponent } from '../../components/chat-main-area/chat-main-area.component';
import { ChatService } from '../../../application/services/chat.service';
import { SessionManagementService } from '../../../application/services/session-management.service';

@Component({
  selector: 'app-ai-chat-full-page',
  standalone: true,
  imports: [CommonModule, ChatSidebarComponent, ChatMainAreaComponent],
  template: `
    <div class="ai-chat-container">
      <!-- Mobile Header -->
      <div class="mobile-header">
        <button class="menu-btn" (click)="toggleMobileSidebar()">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <span class="mobile-title">Trợ Lý AI Hàng Hải</span>
      </div>

      <app-chat-sidebar
        [sessions]="chatService.sessions()"
        [activeSessionId]="sessionService.currentSessionId()"
        [mobileIsOpen]="mobileSidebarOpen"
        (newChat)="onNewChat()"
        (selectSession)="onSelectSession($event)"
        (deleteSession)="onDeleteSession($event)"
        (closeMobile)="closeMobileSidebar()"
      ></app-chat-sidebar>
      
      <app-chat-main-area
        class="main-area"
        [messages]="chatService.messages()"
        [isLoading]="chatService.isLoading()"
        [suggestedQuestions]="chatService.suggestedQuestions()"
        (sendMessage)="onSendMessage($event)"
        (selectSuggestion)="onSelectSuggestion($event)"
        (regenerate)="onRegenerate()"
      ></app-chat-main-area>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .ai-chat-container {
      display: flex;
      height: 100%;
      overflow: hidden;
      background-color: #ffffff;
      position: relative;
    }

    .main-area {
      flex: 1;
      min-width: 0; /* Prevent flex item from overflowing */
      height: 100%;
    }
    
    .mobile-header {
      display: none;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 50px;
      background: #ffffff;
      border-bottom: 1px solid #e5e7eb;
      z-index: 80;
      align-items: center;
      padding: 0 16px;
      gap: 12px;
    }
    
    .menu-btn {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: #374151;
    }
    
    .menu-btn svg {
      width: 24px;
      height: 24px;
    }
    
    .mobile-title {
      font-weight: 600;
      color: #111827;
      font-size: 1rem;
    }

    @media (max-width: 768px) {
      .ai-chat-container {
        flex-direction: column;
      }
      
      .mobile-header {
        display: flex;
        position: relative; /* In flow for mobile */
      }
      
      .main-area {
        height: calc(100% - 50px);
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
