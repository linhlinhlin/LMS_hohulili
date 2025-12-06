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
      margin-top: 16px;
      margin-left: 52px;
    }

    .citations-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #0056D2;
      background: #E6F1FF;
      border: 1px solid #BFDBFE;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .citations-toggle:hover {
      background: #0056D2;
      color: white;
      border-color: #0056D2;
    }

    .toggle-icon {
      width: 16px;
      height: 16px;
      transition: transform 0.2s ease;
    }

    .toggle-icon.expanded {
      transform: rotate(180deg);
    }

    .citations-list {
      margin-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .citation-item {
      padding: 14px 16px;
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      transition: all 0.2s ease;
    }

    .citation-item:hover {
      border-color: #0056D2;
      box-shadow: 0 2px 8px rgba(0, 86, 210, 0.1);
    }

    .citation-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .citation-number {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      font-size: 12px;
      font-weight: 700;
      color: white;
      background: linear-gradient(135deg, #0056D2 0%, #0040a0 100%);
      border-radius: 6px;
    }

    .citation-title {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
    }

    .citation-content {
      font-size: 13px;
      color: #4b5563;
      line-height: 1.6;
      margin: 0 0 10px;
    }

    .citation-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 500;
      color: #0056D2;
      text-decoration: none;
      transition: all 0.2s ease;
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
