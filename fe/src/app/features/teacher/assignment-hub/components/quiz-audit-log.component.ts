import { ChangeDetectionStrategy, Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { QuizApi } from '../../../../api/endpoints/quiz.api';

interface TimelineEvent {
  type: 'created' | 'updated' | 'published' | 'attempt' | 'graded';
  text: string;
  detail?: string;
  timestamp: string;
  displayTime: string;
}

@Component({
  selector: 'app-quiz-audit-log',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div class="space-y-4 animate-pulse">
          @for (i of [1,2,3]; track i) {
            <div class="flex gap-3">
              <div class="w-2 h-2 rounded-full bg-gray-200 mt-1.5 flex-shrink-0"></div>
              <div class="flex-1 space-y-1">
                <div class="h-3.5 w-48 rounded bg-gray-200"></div>
                <div class="h-3 w-24 rounded bg-gray-100"></div>
              </div>
            </div>
          }
        </div>
      </div>
    } @else if (events().length === 0) {
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-10 text-center">
        <p class="text-sm text-gray-500">Chưa có lịch sử hoạt động.</p>
      </div>
    } @else {
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-100">
          <h3 class="text-sm font-semibold text-gray-900">Lịch sử hoạt động</h3>
        </div>
        <div class="px-5 py-4">
          <div class="relative">
            <div class="absolute left-[3px] top-2 bottom-2 w-px bg-gray-200"></div>
            <div class="space-y-4">
              @for (event of events(); track $index) {
                <div class="flex gap-3 relative">
                  <div class="w-[7px] h-[7px] rounded-full mt-1.5 flex-shrink-0 z-10"
                    [class.bg-[#0056D2]]="event.type === 'created' || event.type === 'published'"
                    [class.bg-green-500]="event.type === 'graded'"
                    [class.bg-amber-500]="event.type === 'attempt'"
                    [class.bg-gray-400]="event.type === 'updated'"></div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-800">{{ event.text }}</p>
                    @if (event.detail) {
                      <p class="text-xs text-gray-400 mt-0.5">{{ event.detail }}</p>
                    }
                    <p class="text-[11px] text-gray-400 mt-0.5">{{ event.displayTime }}</p>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class QuizAuditLogComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly quizApi = inject(QuizApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly events = signal<TimelineEvent[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.route.parent!.paramMap.pipe(
      map(params => params.get('quizId') || ''),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(quizId => {
      if (quizId) this.loadTimeline(quizId);
    });
  }

  private loadTimeline(quizId: string): void {
    this.loading.set(true);

    Promise.all([
      new Promise<any>((resolve) => {
        this.quizApi.getQuizById(quizId).subscribe({
          next: (r: any) => resolve(r?.data ?? r),
          error: () => resolve(null)
        });
      }),
      new Promise<any[]>((resolve) => {
        this.quizApi.getStudentAttempts(quizId, 0, 100).subscribe({
          next: (r: any) => {
            const data = r?.data ?? r;
            resolve(data?.content ?? data ?? []);
          },
          error: () => resolve([])
        });
      })
    ]).then(([quiz, attempts]) => {
      const timeline: TimelineEvent[] = [];

      if (quiz?.createdAt) {
        timeline.push({
          type: 'created', text: 'Tạo bài kiểm tra',
          detail: quiz.title, timestamp: quiz.createdAt,
          displayTime: this.fmt(quiz.createdAt)
        });
      }

      if (quiz?.updatedAt && quiz.updatedAt !== quiz.createdAt) {
        timeline.push({
          type: quiz.status === 'PUBLISHED' ? 'published' : 'updated',
          text: quiz.status === 'PUBLISHED' ? 'Phát hành bài kiểm tra' : 'Cập nhật cài đặt',
          timestamp: quiz.updatedAt, displayTime: this.fmt(quiz.updatedAt)
        });
      }

      for (const a of attempts) {
        const time = a.endTime || a.startTime || a.createdAt;
        if (!time) continue;
        const name = a.studentName || a.studentEmail || 'Học viên';
        const score = a.score != null ? ` — ${Math.round(a.score * 10) / 10}%` : '';
        const verb = a.status === 'TIMEOUT' ? 'hết giờ' : a.status === 'IN_PROGRESS' ? 'bắt đầu làm' : 'nộp bài';
        timeline.push({
          type: a.status === 'GRADED' ? 'graded' : 'attempt',
          text: `${name} ${verb}${score}`,
          timestamp: time, displayTime: this.fmt(time)
        });
      }

      timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      this.events.set(timeline);
      this.loading.set(false);
    });
  }

  private fmt(iso: string): string {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}
