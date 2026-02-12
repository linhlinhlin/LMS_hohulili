/**
 * ChatWidgetComponent
 * Combines FloatingChatBubble and ChatPanel into a single widget
 * Can be added to any layout component
 */
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';

import { Router } from '@angular/router';
import { FloatingChatBubbleComponent } from '../floating-chat-bubble/floating-chat-bubble.component';
import { ChatPanelComponent } from '../chat-panel/chat-panel.component';
import { ChatService } from '../../../application/services/chat.service';
import { SessionManagementService } from '../../../application/services/session-management.service';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-chat-widget',
  imports: [FloatingChatBubbleComponent, ChatPanelComponent],
  template: `
    @if (isEnabled()) {
      <!-- Chat Panel -->
      @if (isPanelOpen()) {
        <app-chat-panel
          (closePanel)="closePanel()"
          (expandPanel)="expandToFullPage()"
        />
      }

      <!-- Floating Bubble -->
      <app-floating-chat-bubble
        [isPanelOpen]="isPanelOpen()"
        (bubbleClick)="togglePanel()"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  private readonly chatService = inject(ChatService);
  private readonly sessionService = inject(SessionManagementService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // State
  isPanelOpen = signal(false);
  isEnabled = signal(true);

  ngOnInit(): void {
    // Set user info from auth service
    const user = this.authService.currentUser();
    if (user) {
      this.sessionService.setUser(user.id, user.role || 'student');
    } else {
      this.sessionService.setUser('guest', 'guest');
    }

    // Update context from current route
    this.sessionService.updateContextFromRoute();

    // Wake up server in background
    this.chatService.wakeUpServer();
  }

  ngOnDestroy(): void {
    // Save session state when widget is destroyed
    const messages = this.chatService.messages();
    if (messages.length > 0) {
      this.sessionService.saveSessionState(messages);
    }
  }

  togglePanel(): void {
    this.isPanelOpen.update((open: boolean) => !open);
  }

  closePanel(): void {
    this.isPanelOpen.set(false);
  }

  expandToFullPage(): void {
    this.closePanel();

    // Navigate based on user role
    const role = this.sessionService.currentRole();
    switch (role) {
      case 'student':
        this.router.navigate(['/student/ai-chat']);
        break;
      case 'teacher':
        this.router.navigate(['/teacher/ai-chat']);
        break;
      case 'admin':
      case 'org_admin':
        this.router.navigate(['/admin/ai-chat']);
        break;
      default:
        this.router.navigate(['/ai-chat']);
    }
  }
}
