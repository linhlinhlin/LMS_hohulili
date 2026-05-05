import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import {
  LessonMappingInfo,
  StandardCompetency,
} from '../../../../../api/competency/competency-mapping.types';

@Component({
  selector: 'app-competency-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './competency-table.component.html',
})
export class CompetencyTableComponent {
  readonly lessons = input.required<LessonMappingInfo[]>();
  readonly competencies = input.required<StandardCompetency[]>();
  readonly pendingCells = input<Set<string>>(new Set());

  readonly toggleMapping = output<{ lessonId: string; competencyId: string }>();

  readonly coveredCompetencyIds = computed(() => {
    const covered = new Set<string>();
    for (const lesson of this.lessons()) {
      for (const cid of lesson.mappedCompetencyIds) {
        covered.add(cid);
      }
    }
    return covered;
  });

  isMapped(lesson: LessonMappingInfo, competencyId: string): boolean {
    return lesson.mappedCompetencyIds.includes(competencyId);
  }

  isCoveredCompetency(competencyId: string): boolean {
    return this.coveredCompetencyIds().has(competencyId);
  }

  isPending(lessonId: string, competencyId: string): boolean {
    return this.pendingCells().has(`${lessonId}:${competencyId}`);
  }

  onToggle(lessonId: string, competencyId: string): void {
    this.toggleMapping.emit({ lessonId, competencyId });
  }
}
