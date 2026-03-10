import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-legacy-section-editor-redirect',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './legacy-section-editor-redirect.component.html'
})
export class LegacySectionEditorRedirectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const courseId = this.route.snapshot.paramMap.get('courseId');
    const chapterId = this.route.snapshot.paramMap.get('sectionId');

    if (!courseId || !chapterId) {
      void this.router.navigate(['/teacher/courses']);
      return;
    }

    void this.router.navigate(['/teacher/courses', courseId, 'editor', 'curriculum'], {
      replaceUrl: true,
      queryParams: {
        chapterId
      }
    });
  }
}
