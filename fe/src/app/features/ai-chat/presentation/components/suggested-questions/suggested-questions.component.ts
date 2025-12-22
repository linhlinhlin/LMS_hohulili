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
      padding: 16px 0;
    }

    .suggestions-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
      margin-bottom: 12px;
    }

    .suggestions-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .suggestion-chip {
      display: inline-flex;
      align-items: center;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 500;
      color: #0056D2;
      background: #E6F1FF;
      border: 1px solid #BFDBFE;
      border-radius: 24px;
      cursor: pointer;
      transition: all 0.2s ease;
      max-width: 100%;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .suggestion-chip:hover {
      background: #0056D2;
      color: white;
      border-color: #0056D2;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 86, 210, 0.25);
    }

    .suggestion-chip:active {
      transform: translateY(0);
      box-shadow: 0 2px 6px rgba(0, 86, 210, 0.2);
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

