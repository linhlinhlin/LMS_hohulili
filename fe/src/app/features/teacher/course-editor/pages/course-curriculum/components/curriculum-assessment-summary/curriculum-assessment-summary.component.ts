import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-curriculum-assessment-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './curriculum-assessment-summary.component.html'
})
export class CurriculumAssessmentSummaryComponent {
  eyebrow = input.required<string>();
  title = input.required<string>();
  description = input.required<string>();
  placementLabel = input.required<string>();
  audienceLabel = input.required<string>();
  distributionLabel = input.required<string>();
  actionLabel = input.required<string>();
  accent = input<'purple' | 'green'>('purple');

  actionClick = output<void>();

  onActionClick(): void {
    this.actionClick.emit();
  }
}
