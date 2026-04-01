import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-assessments-shell',
  imports: [CommonModule, RouterOutlet],
  templateUrl: './assessments-shell.component.html',
  styleUrl: './assessments-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssessmentsShellComponent {
  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url }
  );

  readonly sectionLabel = 'Bài tập & Ngân hàng câu hỏi';

  /** Hide shell header when inside detail view (detail has its own breadcrumb) */
  readonly hideHeader = computed(() => {
    const url = this.currentUrl();
    // Hide when viewing a specific assignment or quiz detail
    return /\/assignments\/[^/]+\/(submissions|details|audit-log)/.test(url)
        || /\/assignments\/[^/]+\/grade\//.test(url)
        || /\/quizzes\/[^/]+\/(editor|essay-grading|results|details|history)/.test(url);
  });

  readonly pageTitle = computed(() => {
    const url = this.currentUrl();

    if (url.includes('/teacher/assessments/shared/question-bank')) {
      return 'Ngân hàng câu hỏi';
    }

    if (url.includes('/teacher/assessments/shared/rubrics/create')) {
      return 'Tạo rubric';
    }

    if (url.includes('/teacher/assessments/shared/rubrics/edit')) {
      return 'Chỉnh sửa rubric';
    }

    if (url.includes('/teacher/assessments/shared/rubrics')) {
      return 'Thư viện rubric';
    }

    if (url.includes('/teacher/assessments/classes/assignments/create')) {
      return 'Tạo bài tập';
    }

    if (/\/teacher\/assessments\/classes\/assignments\/[^/]+\/(submissions|details|audit-log)/.test(url)) {
      return 'Chi tiết bài tập';
    }

    if (url.includes('/teacher/assessments/classes/assignments')) {
      return 'Giao bài tập';
    }

    if (/\/teacher\/assessments\/classes\/quizzes\/[^/]+\/essay-grading/.test(url)) {
      return 'Chấm tự luận';
    }

    if (/\/teacher\/assessments\/classes\/quizzes\/[^/]+\/editor/.test(url)) {
      return 'Editor bài kiểm tra';
    }

    if (url.includes('/teacher/assessments/classes/quizzes/create')) {
      return 'Tạo bài kiểm tra';
    }

    if (url.includes('/teacher/assessments/classes/quizzes')) {
      return 'Bài kiểm tra';
    }

    return this.sectionLabel;
  });
}
