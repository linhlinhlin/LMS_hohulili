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
  description: string;
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
    {
      id: 'courses',
      label: 'Khóa học',
      href: '/teacher/assessments/courses/overview',
      description: 'Canonical quiz và bài tập gắn với curriculum của khóa học.',
    },
    {
      id: 'classes',
      label: 'Lớp học',
      href: '/teacher/assessments/classes/assignments',
      description: 'Phân phối, bài nộp, chấm điểm và audit theo lớp hoặc toàn khóa học.',
    },
    {
      id: 'shared',
      label: 'Dùng chung',
      href: '/teacher/assessments/shared/question-bank',
      description: 'Ngân hàng câu hỏi, thư viện rubric, và các tài sản tái sử dụng.',
    },
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

  readonly contextHeadline = computed(() => {
    switch (this.currentContext()) {
      case 'courses':
        return {
          eyebrow: 'Khóa học',
          title: 'Assessment ở cấp khóa học',
          description: 'Tạo và chỉnh canonical quiz hoặc bài tập ngay trong curriculum. Đây không phải khu vực chấm bài.',
        };
      case 'shared':
        return {
          eyebrow: 'Dùng chung',
          title: 'Tài sản đánh giá dùng lại',
          description: 'Quản lý ngân hàng câu hỏi và thư viện rubric để dùng lại cho cả khóa học tự học và lớp học có giảng viên.',
        };
      default:
        return {
          eyebrow: 'Vận hành',
          title: 'Assessment đang vận hành',
          description: 'Theo dõi phân phối, bài nộp, chấm điểm và audit cho lớp học, nhóm học viên hoặc toàn bộ khóa học mà không làm lẫn với khu vực thiết kế assessment.',
        };
    }
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
