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
import { WiiiContextService, type WiiiSidebarOpenDetail } from '../../../infrastructure/api/wiii-context.service';

@Component({
  selector: 'app-chat-widget',
  imports: [FloatingChatBubbleComponent, ChatPanelComponent],
  template: `
    @if (isEnabled()) {
      <!-- Chat Panel (iframe embed) -->
      @if (isPanelOpen()) {
        <app-chat-panel
          mode="widget"
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
  private readonly contextService = inject(WiiiContextService);

  // State
  isPanelOpen = signal(false);
  isEnabled = signal(true);

  // Listener for sidebar open requests (from Course Editor AI button)
  private sidebarOpenListener: ((event: Event) => void) | null = null;

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

    // Listen for sidebar open requests (e.g., from Course Editor "AI Generate" button)
    this.sidebarOpenListener = (event: Event) => {
      if (event instanceof CustomEvent) {
        this.contextService.applySidebarIntent((event as CustomEvent<WiiiSidebarOpenDetail>).detail);
      }
      this.isPanelOpen.set(true);
    };
    window.addEventListener('wiii:open-sidebar', this.sidebarOpenListener);
  }

  ngOnDestroy(): void {
    if (this.sidebarOpenListener) {
      window.removeEventListener('wiii:open-sidebar', this.sidebarOpenListener);
      this.sidebarOpenListener = null;
    }
  }

  togglePanel(): void {
    this.isPanelOpen.update((open: boolean) => !open);
  }

  closePanel(): void {
    this.isPanelOpen.set(false);
  }
}
