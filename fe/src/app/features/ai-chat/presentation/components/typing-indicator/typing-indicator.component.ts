/**
 * TypingIndicatorComponent
 * Animated typing indicator (3 dots) shown when AI is generating response
 */
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-typing-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `,
  styles: [`
    .typing-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;
      background: #f3f4f6;
      border-radius: 18px;
      margin: 8px 0;
    }

    .typing-dot {
      width: 8px;
      height: 8px;
      background: #9ca3af;
      border-radius: 50%;
      animation: typing-bounce 1.4s infinite ease-in-out both;
    }

    .typing-dot:nth-child(1) {
      animation-delay: -0.32s;
    }

    .typing-dot:nth-child(2) {
      animation-delay: -0.16s;
    }

    .typing-dot:nth-child(3) {
      animation-delay: 0s;
    }

    @keyframes typing-bounce {
      0%, 80%, 100% {
        transform: scale(0.6);
        opacity: 0.5;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypingIndicatorComponent {}
