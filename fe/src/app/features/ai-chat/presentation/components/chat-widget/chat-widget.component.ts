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
  input,
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
      @if (variant() === 'responsive-sidebar') {
        <aside
          class="wiii-sidebar-host"
          [class.wiii-sidebar-host--open]="isPanelOpen()"
          aria-label="Trợ lý Wiii"
          data-wiii-id="wiii-right-sidebar"
        >
          @if (isPanelOpen()) {
            <app-chat-panel
              mode="sidebar"
              (closePanel)="closePanel()"
            />
          } @else {
            <button
              type="button"
              class="wiii-sidebar-rail"
              data-wiii-id="open-wiii-right-sidebar"
              data-wiii-click-safe="true"
              data-wiii-click-kind="navigation"
              aria-label="Mở trợ lý Wiii"
              (click)="openPanel()"
            >
              <span class="wiii-sidebar-rail__spark" aria-hidden="true">W</span>
              <span class="wiii-sidebar-rail__label">Wiii</span>
            </button>
          }
        </aside>

        <div class="wiii-mobile-widget">
          @if (isPanelOpen()) {
            <app-chat-panel
              mode="widget"
              (closePanel)="closePanel()"
            />
          }

          <app-floating-chat-bubble
            [isPanelOpen]="isPanelOpen()"
            (bubbleClick)="togglePanel()"
          />
        </div>
      } @else {
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
    }
  `,
  styles: [`
    :host {
      display: contents;
    }

    .wiii-sidebar-host {
      display: none;
    }

    .wiii-mobile-widget {
      display: contents;
    }

    @media (min-width: 768px) {
      .wiii-mobile-widget {
        display: none;
      }

      .wiii-sidebar-host {
        display: flex;
        align-self: stretch;
        width: 56px;
        min-width: 56px;
        height: 100%;
        min-height: 0;
        border-left: 1px solid rgb(226 232 240);
        background:
          linear-gradient(180deg, rgba(248, 250, 252, 0.92), rgba(255, 255, 255, 0.98)),
          radial-gradient(circle at top, rgba(0, 86, 210, 0.08), transparent 34%);
        box-shadow: -16px 0 42px rgba(15, 23, 42, 0.06);
        transition: width 220ms cubic-bezier(0.4, 0, 0.2, 1);
      }

      .wiii-sidebar-host--open {
        width: clamp(360px, 27vw, 460px);
        min-width: clamp(360px, 27vw, 460px);
      }

      .wiii-sidebar-rail {
        width: 100%;
        min-height: 0;
        border: 0;
        border-radius: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: #0f3f8f;
        background: transparent;
        cursor: pointer;
        transition: background 160ms ease, color 160ms ease;
      }

      .wiii-sidebar-rail:hover,
      .wiii-sidebar-rail:focus-visible {
        color: #003b95;
        background: rgba(0, 86, 210, 0.07);
        outline: none;
      }

      .wiii-sidebar-rail:focus-visible {
        box-shadow: inset 0 0 0 3px rgba(0, 86, 210, 0.22);
      }

      .wiii-sidebar-rail__spark {
        width: 34px;
        height: 34px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: white;
        font-weight: 800;
        letter-spacing: -0.03em;
        background: linear-gradient(135deg, #0056d2 0%, #0f766e 100%);
        box-shadow: 0 12px 28px rgba(0, 86, 210, 0.25);
      }

      .wiii-sidebar-rail__label {
        writing-mode: vertical-rl;
        text-orientation: mixed;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  private readonly sessionService = inject(SessionManagementService);
  private readonly authService = inject(AuthService);
  private readonly contextService = inject(WiiiContextService);

  variant = input<'floating' | 'responsive-sidebar'>('floating');

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

  openPanel(): void {
    this.isPanelOpen.set(true);
  }

  closePanel(): void {
    this.isPanelOpen.set(false);
  }
}
