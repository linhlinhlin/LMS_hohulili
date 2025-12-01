/**
 * SourceCitationComponent
 * Displays expandable source citations from AI responses
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageSource } from '../../../domain/types';

@Component({
  selector: 'app-source-citation',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (sources().length > 0) {
      <div class="source-citations">
        <button class="citations-toggle" (click)="toggleExpanded()">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="toggle-icon"
            [class.expanded]="isExpanded()"
          >
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
          </svg>
          <span>{{ sources().length }} nguồn tham khảo</span>
        </button>

        @if (isExpanded()) {
          <div class="citations-list">
            @for (source of sources(); track source.title; let i = $index) {
              <div class="citation-item">
                <div class="citation-header">
                  <span class="citation-number">{{ i + 1 }}</span>
                  <span class="citation-title">{{ source.title }}</span>
                </div>
                <p class="citation-content">{{ source.content }}</p>
                @if (source.url) {
                  <a
                    [href]="source.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="citation-link"
                  >
                    Xem nguồn gốc →
                  </a>
                }
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .source-citations {
      margin-top: 12px;
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
    }

    .citations-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      font-size: 13px;
      color: #6b7280;
      background: transparent;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .citations-toggle:hover {
      background: #f9fafb;
      color: #374151;
    }

    .toggle-icon {
      width: 16px;
      height: 16px;
      transition: transform 0.2s;
    }

    .toggle-icon.expanded {
      transform: rotate(180deg);
    }

    .citations-list {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .citation-item {
      padding: 12px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }

    .citation-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .citation-number {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      font-size: 11px;
      font-weight: 600;
      color: white;
      background: #6b7280;
      border-radius: 50%;
    }

    .citation-title {
      font-size: 14px;
      font-weight: 500;
      color: #1f2937;
    }

    .citation-content {
      font-size: 13px;
      color: #4b5563;
      line-height: 1.5;
      margin: 0 0 8px;
    }

    .citation-link {
      font-size: 12px;
      color: #3b82f6;
      text-decoration: none;
    }

    .citation-link:hover {
      text-decoration: underline;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourceCitationComponent {
  // Inputs
  sources = input<MessageSource[]>([]);

  // State
  isExpanded = signal(false);

  toggleExpanded(): void {
    this.isExpanded.update((v: boolean) => !v);
  }
}
