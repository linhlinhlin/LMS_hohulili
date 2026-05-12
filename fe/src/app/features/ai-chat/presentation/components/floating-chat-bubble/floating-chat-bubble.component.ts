/**
 * FloatingChatBubbleComponent
 * Fixed position bubble at bottom-right corner for quick chat access
 * Inspired by Notion's chat bubble design
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  HostListener,
} from '@angular/core';


@Component({
  selector: 'app-floating-chat-bubble',
  imports: [],
  template: `
    <div
      class="floating-bubble-container"
      [class.panel-open]="isPanelOpen()"
    >
      <!-- Tooltip -->
      @if (showTooltip() && !isPanelOpen()) {
        <div class="bubble-tooltip">
          {{ tooltipText() }}
        </div>
      }

      <!-- Bubble Button -->
      <button
        class="floating-bubble"
        [class.mobile]="isMobile()"
        [attr.data-wiii-id]="isPanelOpen() ? 'close-wiii-widget' : 'open-wiii-widget'"
        data-wiii-click-safe="true"
        (click)="onBubbleClick()"
        (mouseenter)="showTooltip.set(true)"
        (mouseleave)="showTooltip.set(false)"
        [attr.aria-label]="isPanelOpen() ? 'Đóng chat' : 'Mở trợ lý AI'"
      >
        @if (isPanelOpen()) {
          <!-- Close Icon -->
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="bubble-icon">
            <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clip-rule="evenodd" />
          </svg>
        } @else {
          <!-- AI Icon -->
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="bubble-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        }
      </button>
    </div>
  `,
  styles: [`
    .floating-bubble-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }

    .bubble-tooltip {
      padding: 8px 12px;
      font-size: 13px;
      color: white;
      background: #1f2937;
      border-radius: 6px;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: tooltip-fade-in 0.2s ease;
    }

    .bubble-tooltip::after {
      content: '';
      position: absolute;
      bottom: -6px;
      right: 20px;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid #1f2937;
    }

    .floating-bubble {
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0056D2;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0, 86, 210, 0.4);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .floating-bubble:hover {
      background: #004BB5;
      transform: scale(1.08);
      box-shadow: 0 6px 24px rgba(0, 86, 210, 0.5);
    }

    .floating-bubble:active {
      transform: scale(0.95);
    }

    .floating-bubble.mobile {
      width: 48px;
      height: 48px;
    }

    .bubble-icon {
      width: 24px;
      height: 24px;
      transition: transform 0.3s ease;
    }

    .panel-open .bubble-icon {
      transform: rotate(90deg);
    }

    @keyframes tooltip-fade-in {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 767px) {
      .floating-bubble-container {
        bottom: 16px;
        right: 16px;
      }

      .floating-bubble {
        width: 48px;
        height: 48px;
      }

      .bubble-icon {
        width: 20px;
        height: 20px;
      }

      .bubble-tooltip {
        display: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingChatBubbleComponent {
  // Inputs
  tooltipText = input<string>('Trợ lý AI Hàng Hải');
  isPanelOpen = input<boolean>(false);

  // Outputs
  bubbleClick = output<void>();

  // State
  showTooltip = signal(false);
  isMobile = signal(false);

  constructor() {
    this.checkMobile();
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

  onBubbleClick(): void {
    this.showTooltip.set(false);
    this.bubbleClick.emit();
  }
}
