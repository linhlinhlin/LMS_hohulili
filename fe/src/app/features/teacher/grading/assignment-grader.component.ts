import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-assignment-grader',
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Assignment Grader</h1>
      <div class="bg-white rounded-lg shadow p-6">
        <p class="text-gray-600">Assignment grader functionality coming soon...</p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentGraderComponent {
  constructor() {}
}