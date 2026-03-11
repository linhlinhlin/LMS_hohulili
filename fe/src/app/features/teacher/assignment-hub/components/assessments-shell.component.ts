import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

type AssessmentContext = 'courses' | 'classes' | 'shared';

interface ContextTab {
  id: AssessmentContext;
  label: string;
  href: string;
}

interface SubnavItem {
  label: string;
  href: string;
}

@Component({
  selector: 'app-assessments-shell',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './assessments-shell.component.html',
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

  readonly contextTabs: ContextTab[] = [
    { id: 'courses', label: 'Khóa học', href: '/teacher/assessments/courses/overview' },
    { id: 'classes', label: 'Lớp học', href: '/teacher/assessments/classes/assignments' },
    { id: 'shared', label: 'Dùng chung', href: '/teacher/assessments/shared/question-bank' },
  ];

  readonly currentContext = computed<AssessmentContext>(() => {
    const url = this.currentUrl();
    if (url.includes('/teacher/assessments/shared')) {
      return 'shared';
    }
    if (url.includes('/teacher/assessments/courses')) {
      return 'courses';
    }
    return 'classes';
  });

  readonly pageTitle = computed(() => {
    const url = this.currentUrl();

    if (url.includes('/teacher/assessments/shared/question-bank')) {
      return 'Ngân hàng câu hỏi';
    }

    if (url.includes('/teacher/assessments/shared/rubrics')) {
      return 'Thư viện rubric';
    }

    if (url.includes('/teacher/assessments/courses/overview')) {
      return 'Đánh giá ở cấp khóa học';
    }

    if (url.includes('/teacher/assessments/classes/assignments/create')) {
      return 'Tạo bài tập';
    }

    if (/\/teacher\/assessments\/classes\/assignments\/[^/]+\/overview/.test(url)) {
      return 'Chi tiết bài tập';
    }

    if (/\/teacher\/assessments\/classes\/assignments\/[^/]+\/settings/.test(url)) {
      return 'Thiết lập bài tập';
    }

    if (url.includes('/teacher/assessments/classes/assignments')) {
      return 'Vận hành bài tập';
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
      return 'Vận hành bài kiểm tra';
    }

    return 'Đánh giá';
  });

  readonly subnavItems = computed<SubnavItem[]>(() => {
    switch (this.currentContext()) {
      case 'courses':
        return [
          { label: 'Tổng quan', href: '/teacher/assessments/courses/overview' },
        ];
      case 'shared':
        return [
          { label: 'Ngân hàng câu hỏi', href: '/teacher/assessments/shared/question-bank' },
          { label: 'Thư viện Rubric', href: '/teacher/assessments/shared/rubrics' },
        ];
      default:
        return [
          { label: 'Bài tập', href: '/teacher/assessments/classes/assignments' },
          { label: 'Bài kiểm tra', href: '/teacher/assessments/classes/quizzes' },
        ];
    }
  });
}
