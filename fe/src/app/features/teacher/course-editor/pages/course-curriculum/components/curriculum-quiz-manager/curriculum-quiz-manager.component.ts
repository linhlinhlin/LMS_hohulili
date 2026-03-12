import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-curriculum-quiz-manager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './curriculum-quiz-manager.component.html'
})
export class CurriculumQuizManagerComponent {
  timeLimit = input.required<number>();
  passingScore = input.required<number>();
  maxAttempts = input.required<number>();
  questions = input<any[]>([]);
  loading = input(false);

  timeLimitChange = output<string>();
  passingScoreChange = output<string>();
  maxAttemptsChange = output<string>();

  onTimeLimitInput(value: string): void {
    this.timeLimitChange.emit(value);
  }

  onPassingScoreInput(value: string): void {
    this.passingScoreChange.emit(value);
  }

  onMaxAttemptsInput(value: string): void {
    this.maxAttemptsChange.emit(value);
  }

  getDifficultyLabel(difficulty: string | null | undefined): string {
    switch (difficulty) {
      case 'EASY':
        return 'Dễ';
      case 'MEDIUM':
        return 'Trung bình';
      case 'HARD':
        return 'Khó';
      default:
        return 'Chưa rõ';
    }
  }

  getPreviewQuestions(): any[] {
    return this.questions().slice(0, 5);
  }

  getOverflowCount(): number {
    return Math.max(this.questions().length - this.getPreviewQuestions().length, 0);
  }
}
