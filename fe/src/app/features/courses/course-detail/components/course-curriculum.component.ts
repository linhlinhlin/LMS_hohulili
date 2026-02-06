import { Component, input, computed, inject, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { ExtendedCourse, CourseModule, EnhancedLesson } from '../../../../shared/types/course.types';
import { CourseDetailService } from '../services/course-detail.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-curriculum',
  imports: [RouterModule],
  templateUrl: './course-curriculum.component.html'
})
export class CourseCurriculumComponent {
  course = input<ExtendedCourse | null>(null);

  protected courseDetailService = inject(CourseDetailService);

  getTotalLessons(): number {
    return this.courseDetailService.modules().reduce((total, module) => total + module.lessons.length, 0);
  }

  getTotalDuration(): string {
    const totalMinutes = this.courseDetailService.modules().reduce((total, module) => total + module.duration, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  getLessonTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'video': 'Video',
      'text': 'Tài liệu',
      'quiz': 'Bài tập',
      'assignment': 'Bài tập lớn'
    };
    return labels[type] || type;
  }
}
