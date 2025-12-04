/**
 * SuggestedQuestionsComponent
 * Displays clickable suggestion chips for quick questions
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-suggested-questions',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (questions().length > 0) {
      <div class="suggested-questions">
        <span class="suggestions-label">Gợi ý câu hỏi:</span>
        <div class="suggestions-list">
          @for (question of questions(); track question) {
            <button
              class="suggestion-chip"
              (click)="onSelect(question)"
              [title]="question"
            >
              {{ truncateQuestion(question) }}
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .suggested-questions {
      padding: 12px 0;
    }

    .suggestions-label {
      display: block;
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 8px;
    }

    .suggestions-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .suggestion-chip {
      display: inline-block;
      padding: 8px 16px;
      font-size: 13px;
      color: #374151;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s;
      max-width: 100%;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .suggestion-chip:hover {
      background: #e0f2fe;
      border-color: #7dd3fc;
      transform: translateY(-1px);
    }

    .suggestion-chip:active {
      transform: translateY(0);
      background: #bae6fd;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestedQuestionsComponent {
  // Inputs
  questions = input<string[]>([]);
  maxLength = input<number>(50);

  // Outputs
  questionSelected = output<string>();

  truncateQuestion(question: string): string {
    const max = this.maxLength();
    if (question.length <= max) return question;
    return question.substring(0, max) + '...';
  }

  onSelect(question: string): void {
    this.questionSelected.emit(question);
  }
}
