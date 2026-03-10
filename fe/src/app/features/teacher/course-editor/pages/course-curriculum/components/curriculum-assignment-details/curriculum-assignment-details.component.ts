import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-curriculum-assignment-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './curriculum-assignment-details.component.html'
})
export class CurriculumAssignmentDetailsComponent {
  description = input('');
  instructions = input('');
  dueDate = input('');
  maxScore = input<number | string>(100);

  descriptionChange = output<string>();
  instructionsChange = output<string>();
  dueDateChange = output<string>();
  maxScoreChange = output<string | number>();

  onDescriptionChange(value: string): void {
    this.descriptionChange.emit(value);
  }

  onInstructionsChange(value: string): void {
    this.instructionsChange.emit(value);
  }

  onDueDateChange(value: string): void {
    this.dueDateChange.emit(value);
  }

  onMaxScoreChange(value: string | number): void {
    this.maxScoreChange.emit(value);
  }
}
