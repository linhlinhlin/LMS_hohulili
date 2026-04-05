import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { QuizApi } from '../../../../api/endpoints/quiz.api';

interface AttemptRow {
  id: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  isPassed: boolean | null;
  startTime?: string;
  endTime?: string;
  timeSpentSeconds?: number;
}

type AttemptFilter = '' | 'GRADED' | 'SUBMITTED' | 'IN_PROGRESS' | 'NOT_STARTED';

@Component({
  selector: 'app-quiz-results-tab',
  imports: [CommonModule, RouterModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Làm bài</p>
          <p class="mt-1 text-2xl font-bold text-gray-900">{{ totalAttempts() }}</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Điểm trung bình</p>
          <p class="mt-1 text-2xl font-bold text-gray-900">
            {{ avgScore() != null ? avgScore() + '%' : '—' }}
          </p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Tỷ lệ đạt</p>
          <p class="mt-1 text-2xl font-bold" [class]="passRateClass()">
            {{ passRate() != null ? passRate() + '%' : '—' }}
          </p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Thời gian TB</p>
          <p class="mt-1 text-2xl font-bold text-gray-900">{{ avgTimeLabel() }}</p>
        </div>
      </div>

      <!-- Attempt list -->
      <div>
        <!-- Filter row -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <button (click)="setFilter('')"
                    [class]="!attemptFilter() ? 'bg-[#0056D2] text-white border-[#0056D2]' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'"
                    class="inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors">
              Tất cả ({{ attempts().length + notStartedStudents().length }})
            </button>
            @if (gradedCount() > 0) {
              <button (click)="setFilter('GRADED')"
                      [class]="attemptFilter() === 'GRADED' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'"
                      class="inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors">
                Đã chấm ({{ gradedCount() }})
              </button>
            }
            @if (submittedCount() > 0) {
              <button (click)="setFilter('SUBMITTED')"
                      [class]="attemptFilter() === 'SUBMITTED' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'"
                      class="inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors">
                Chờ chấm ({{ submittedCount() }})
              </button>
            }
            @if (inProgressCount() > 0) {
              <button (click)="setFilter('IN_PROGRESS')"
                      [class]="attemptFilter() === 'IN_PROGRESS' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'"
                      class="inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors">
                Đang làm ({{ inProgressCount() }})
              </button>
            }
            @if (notStartedCount() > 0) {
              <button (click)="setFilter('NOT_STARTED')"
                      [class]="attemptFilter() === 'NOT_STARTED' ? 'bg-gray-600 text-white border-gray-600' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'"
                      class="inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors">
                Chưa làm ({{ notStartedCount() }})
              </button>
            }
          </div>
        </div>

        <!-- Table -->
        @if (loading()) {
          <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-8 animate-pulse">
            <div class="space-y-3">
              @for (i of [1,2,3]; track i) {
                <div class="flex items-center gap-4">
                  <div class="h-8 w-8 rounded-full bg-gray-100"></div>
                  <div class="flex-1 space-y-1"><div class="h-4 w-40 rounded bg-gray-100"></div><div class="h-3 w-56 rounded bg-gray-50"></div></div>
                  <div class="h-5 w-12 rounded bg-gray-100"></div>
                </div>
              }
            </div>
          </div>
        } @else if (filteredAttempts().length === 0 && filteredNotStarted().length === 0) {
          <div class="rounded-xl border border-gray-200 bg-white shadow-sm px-6 py-10 text-center">
            <lucide-icon name="inbox" [size]="28" class="mx-auto mb-3 text-gray-300"></lucide-icon>
            <p class="text-sm text-gray-500">
              @if (attempts().length === 0) {
                Chưa có học viên nào làm bài kiểm tra này.
              } @else {
                Không tìm thấy lượt làm bài phù hợp.
              }
            </p>
          </div>
        } @else {
          <div class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Học viên</th>
                  <th class="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Điểm</th>
                  <th class="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                  <th class="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Thời gian</th>
                  <th class="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Thao tác</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (attempt of filteredAttempts(); track attempt.id) {
                  <tr class="hover:bg-gray-50/60 transition-colors">
                    <td class="px-5 py-3">
                      <div class="flex items-center gap-3">
                        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                          {{ getInitials(attempt.studentName || attempt.studentEmail || attempt.studentId) }}
                        </div>
                        <div class="min-w-0">
                          <p class="text-sm font-medium text-gray-900 truncate">{{ attempt.studentName || attempt.studentEmail || 'Học viên' }}</p>
                          @if (attempt.studentEmail) {
                            <p class="text-xs text-gray-400 truncate">{{ attempt.studentEmail }}</p>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="text-center px-3 py-3">
                      @if (attempt.score != null) {
                        <span class="text-sm font-semibold" [class]="attempt.isPassed ? 'text-emerald-700' : 'text-red-600'">
                          {{ attempt.score | number:'1.0-1' }}%
                        </span>
                      } @else {
                        <span class="text-xs text-gray-400">—</span>
                      }
                    </td>
                    <td class="text-center px-3 py-3">
                      <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            [ngClass]="getAttemptStatusClass(attempt.status)">
                        {{ getAttemptStatusLabel(attempt.status) }}
                      </span>
                    </td>
                    <td class="text-center px-3 py-3 text-xs text-gray-500">
                      {{ formatDuration(attempt.timeSpentSeconds) }}
                    </td>
                    <td class="text-right px-5 py-3 space-x-3">
                      <button (click)="viewAttempt(attempt.id)"
                         class="text-sm font-medium text-[#0056D2] hover:underline">
                        Xem
                      </button>
                      <button (click)="confirmDeleteAttempt(attempt)"
                         class="text-sm font-medium text-red-500 hover:underline">
                        Xóa
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- NOT_STARTED students (enrolled but haven't taken quiz) -->
          @if (filteredNotStarted().length > 0) {
            @if (filteredAttempts().length > 0) {
              <div class="border-t-2 border-dashed border-gray-200 my-3"></div>
            }
            <div class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <table class="w-full text-sm">
                <tbody class="divide-y divide-gray-100">
                  @for (student of filteredNotStarted(); track student.studentId) {
                    <tr class="bg-gray-50/30">
                      <td class="px-5 py-3">
                        <div class="flex items-center gap-3">
                          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-400">
                            {{ getInitials(student.studentName || student.studentEmail || student.studentId) }}
                          </div>
                          <div class="min-w-0">
                            <p class="text-sm text-gray-500 truncate">{{ student.studentName || student.studentEmail || 'Học viên' }}</p>
                            @if (student.studentEmail) {
                              <p class="text-xs text-gray-400 truncate">{{ student.studentEmail }}</p>
                            }
                          </div>
                        </div>
                      </td>
                      <td class="text-center px-3 py-3"><span class="text-xs text-gray-300">—</span></td>
                      <td class="text-center px-3 py-3">
                        <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500">
                          Chưa làm
                        </span>
                      </td>
                      <td class="text-center px-3 py-3 text-xs text-gray-300">—</td>
                      <td class="text-right px-5 py-3"></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class QuizResultsTabComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quizApi = inject(QuizApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly attempts = signal<AttemptRow[]>([]);
  readonly notStartedStudents = signal<AttemptRow[]>([]);
  readonly enrolledCount = signal(0);
  readonly loading = signal(true);
  readonly quizId = signal('');
  readonly attemptFilter = signal<AttemptFilter>('');

  // KPIs
  readonly totalAttempts = computed(() => this.attempts().length);
  readonly avgScore = computed(() => {
    const scored = this.attempts().filter(a => a.score != null);
    if (scored.length === 0) return null;
    const sum = scored.reduce((s, a) => s + (a.score ?? 0), 0);
    return Math.round(sum / scored.length * 10) / 10;
  });
  readonly passRate = computed(() => {
    const scored = this.attempts().filter(a => a.score != null);
    if (scored.length === 0) return null;
    const passed = scored.filter(a => a.isPassed).length;
    return Math.round(passed / scored.length * 1000) / 10;
  });
  readonly avgTimeLabel = computed(() => {
    const withTime = this.attempts().filter(a => a.timeSpentSeconds && a.timeSpentSeconds > 0);
    if (withTime.length === 0) return '—';
    const avg = withTime.reduce((s, a) => s + (a.timeSpentSeconds ?? 0), 0) / withTime.length;
    return this.formatDuration(Math.round(avg));
  });

  passRateClass(): string {
    const rate = this.passRate();
    if (rate == null) return 'text-gray-900';
    if (rate >= 70) return 'text-emerald-700';
    if (rate >= 40) return 'text-amber-600';
    return 'text-red-600';
  }

  // Counts
  readonly gradedCount = computed(() => this.attempts().filter(a => a.status === 'GRADED').length);
  readonly submittedCount = computed(() => this.attempts().filter(a => a.status === 'SUBMITTED').length);
  readonly inProgressCount = computed(() => this.attempts().filter(a => a.status === 'IN_PROGRESS').length);
  readonly notStartedCount = computed(() => this.notStartedStudents().length);

  // Filtered — includes NOT_STARTED students when that filter is active or "all"
  readonly filteredAttempts = computed(() => {
    const f = this.attemptFilter();
    if (f === 'NOT_STARTED') return [];
    if (!f) return this.attempts();
    return this.attempts().filter(a => a.status === f);
  });
  readonly filteredNotStarted = computed(() => {
    const f = this.attemptFilter();
    if (f === '' || f === 'NOT_STARTED') return this.notStartedStudents();
    return [];
  });

  ngOnInit(): void {
    this.route.parent!.paramMap.pipe(
      map(params => params.get('quizId') || ''),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(quizId => {
      this.quizId.set(quizId);
      if (quizId) {
        this.loadAttempts(quizId);
        this.loadEnrolled(quizId);
      }
    });
  }

  private loadAttempts(quizId: string): void {
    this.loading.set(true);
    this.quizApi.getStudentAttempts(quizId, 0, 200).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response;
        const content = data?.content ?? data ?? [];
        this.attempts.set(Array.isArray(content) ? content : []);
      },
      error: () => {
        this.attempts.set([]);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  setFilter(f: AttemptFilter): void {
    this.attemptFilter.set(f);
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.split(/[\s@.]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  getAttemptStatusClass(status: string): string {
    switch (status) {
      case 'GRADED': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'SUBMITTED': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'IN_PROGRESS': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'TIMEOUT': return 'bg-red-50 text-red-700 border border-red-200';
      default: return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
  }

  getAttemptStatusLabel(status: string): string {
    switch (status) {
      case 'GRADED': return 'Đã chấm';
      case 'SUBMITTED': return 'Chờ chấm';
      case 'IN_PROGRESS': return 'Đang làm';
      case 'TIMEOUT': return 'Hết giờ';
      case 'EXPIRED': return 'Hết hạn';
      case 'NOT_STARTED': return 'Chưa làm';
      default: return status;
    }
  }

  private loadEnrolled(quizId: string): void {
    this.quizApi.getEnrolledStudents(quizId).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response;
        this.enrolledCount.set(data?.enrolledCount ?? 0);
        const students: AttemptRow[] = (data?.enrolledStudents ?? []).map((s: any) => ({
          id: '', studentId: s.studentId, studentName: s.studentName,
          studentEmail: s.studentEmail, status: 'NOT_STARTED',
          score: null, maxScore: null, isPassed: null
        }));
        this.notStartedStudents.set(students);
      },
      error: () => {}
    });
  }

  confirmDeleteAttempt(attempt: AttemptRow): void {
    const name = attempt.studentName || attempt.studentEmail || 'học viên';
    if (!confirm(`Xóa lần làm bài của ${name}?\nHọc viên sẽ được làm lại bài kiểm tra này.`)) return;
    this.quizApi.deleteAttempt(attempt.id).subscribe({
      next: () => {
        this.attempts.update(list => list.filter(a => a.id !== attempt.id));
      },
      error: (err: any) => {
        alert(err?.error?.message || 'Không thể xóa lần làm bài. Vui lòng thử lại.');
      }
    });
  }

  viewAttempt(attemptId: string): void {
    this.router.navigate(['/student/quiz/result'], {
      queryParams: {
        attemptId,
        returnUrl: `/teacher/assessments/classes/quizzes/${this.quizId()}/results`
      }
    });
  }

  formatDuration(seconds?: number): string {
    if (!seconds || seconds <= 0) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h}h ${m % 60}p`;
    }
    return `${m}p ${s < 10 ? '0' + s : s}s`;
  }
}
