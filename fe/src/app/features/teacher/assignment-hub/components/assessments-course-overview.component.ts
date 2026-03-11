import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-assessments-course-overview',
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './assessments-course-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssessmentsCourseOverviewComponent {}
