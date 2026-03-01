/**
 * ChatWidgetComponent — Sprint 220b: "Nhúng Wiii"
 *
 * Combines FloatingChatBubble and ChatPanel (iframe embed) into a single widget.
 * Expand now opens full Wiii app in new tab instead of navigating to /ai-chat.
 */
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';

import { FloatingChatBubbleComponent } from '../floating-chat-bubble/floating-chat-bubble.component';
import { ChatPanelComponent } from '../chat-panel/chat-panel.component';
import { SessionManagementService } from '../../../application/services/session-management.service';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-chat-widget',
  imports: [FloatingChatBubbleComponent, ChatPanelComponent],
  template: `
    @if (isEnabled()) {
      <!-- Chat Panel (iframe embed) -->
      @if (isPanelOpen()) {
        <app-chat-panel
          (closePanel)="closePanel()"
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
  private readonly sessionService = inject(SessionManagementService);
  private readonly authService = inject(AuthService);

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
  }

  ngOnDestroy(): void {
    // No-op — iframe handles its own state
  }

  togglePanel(): void {
    this.isPanelOpen.update((open: boolean) => !open);
  }

  closePanel(): void {
    this.isPanelOpen.set(false);
  }
}
