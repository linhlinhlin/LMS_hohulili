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
  openRandomize = output<void>();
  openQuestionBank = output<void>();
  openCreateQuestion = output<void>();
  removeQuestion = output<string>();
  refreshQuestions = output<void>();

  onTimeLimitInput(value: string): void {
    this.timeLimitChange.emit(value);
  }

  onPassingScoreInput(value: string): void {
    this.passingScoreChange.emit(value);
  }

  onMaxAttemptsInput(value: string): void {
    this.maxAttemptsChange.emit(value);
  }

  onOpenRandomize(): void {
    this.openRandomize.emit();
  }

  onOpenQuestionBank(): void {
    this.openQuestionBank.emit();
  }

  onOpenCreateQuestion(): void {
    this.openCreateQuestion.emit();
  }

  onRemoveQuestion(questionId: string): void {
    this.removeQuestion.emit(questionId);
  }

  onRefreshQuestions(): void {
    this.refreshQuestions.emit();
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
}
