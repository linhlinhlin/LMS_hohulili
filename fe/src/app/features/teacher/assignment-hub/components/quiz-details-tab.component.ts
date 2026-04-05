import { ChangeDetectionStrategy, Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { QuizApi } from '../../../../api/endpoints/quiz.api';

interface QuizInfo {
  id: string;
  title: string;
  description?: string;
  quizType?: string;
  status: string;
  questionCount: number;
  timeLimitMinutes?: number;
  maxAttempts?: number;
  passingScore?: number;
  maxScoreScale?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResultsImmediately?: boolean;
  showCorrectAnswers?: boolean;
  availableFrom?: string;
  dueAt?: string;
  lockAt?: string;
  requiresPassword?: boolean;
  courseTitle?: string;
  className?: string;
  deliveryMode?: string;
  assignmentScope?: string;
  countsTowardCertificate?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-quiz-details-tab',
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse space-y-4">
        @for (i of [1,2,3,4]; track i) {
          <div class="flex gap-4"><div class="h-4 w-32 rounded bg-gray-100"></div><div class="h-4 flex-1 rounded bg-gray-50"></div></div>
        }
      </div>
    } @else if (quiz()) {
      <div class="space-y-5">

        <!-- Thông tin chung -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-100">
            <h3 class="text-sm font-semibold text-gray-900">Thông tin chung</h3>
          </div>
          <div class="divide-y divide-gray-50">
            <div class="px-5 py-2.5 flex items-center justify-between">
              <span class="text-sm text-gray-500">Loại</span>
              <span class="text-sm font-medium text-gray-900">{{ getQuizTypeLabel(quiz()!.quizType) }}</span>
            </div>
            <div class="px-5 py-2.5 flex items-center justify-between">
              <span class="text-sm text-gray-500">Trạng thái</span>
              <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                [class.bg-green-50]="quiz()!.status === 'PUBLISHED'"
                [class.text-green-700]="quiz()!.status === 'PUBLISHED'"
                [class.bg-gray-100]="quiz()!.status !== 'PUBLISHED'"
                [class.text-gray-600]="quiz()!.status !== 'PUBLISHED'">
                {{ quiz()!.status === 'PUBLISHED' ? 'Đã phát hành' : 'Nháp' }}
              </span>
            </div>
            <div class="px-5 py-2.5 flex items-center justify-between">
              <span class="text-sm text-gray-500">Số câu hỏi</span>
              <span class="text-sm font-medium text-gray-900">{{ quiz()!.questionCount }}</span>
            </div>
            @if (quiz()!.courseTitle) {
              <div class="px-5 py-2.5 flex items-center justify-between">
                <span class="text-sm text-gray-500">Khóa học</span>
                <span class="text-sm text-gray-900">{{ quiz()!.courseTitle }}</span>
              </div>
            }
            @if (quiz()!.className) {
              <div class="px-5 py-2.5 flex items-center justify-between">
                <span class="text-sm text-gray-500">Lớp học</span>
                <span class="text-sm text-gray-900">{{ quiz()!.className }}</span>
              </div>
            }
            @if (quiz()!.description) {
              <div class="px-5 py-2.5">
                <span class="text-sm text-gray-500">Mô tả</span>
                <p class="text-sm text-gray-900 mt-1">{{ quiz()!.description }}</p>
              </div>
            }
          </div>
        </div>

        <!-- Cài đặt làm bài -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-100">
            <h3 class="text-sm font-semibold text-gray-900">Cài đặt làm bài</h3>
          </div>
          <div class="divide-y divide-gray-50">
            <div class="px-5 py-2.5 flex items-center justify-between">
              <span class="text-sm text-gray-500">Thời gian</span>
              <span class="text-sm font-medium text-gray-900">{{ quiz()!.timeLimitMinutes ? quiz()!.timeLimitMinutes + ' phút' : 'Không giới hạn' }}</span>
            </div>
            <div class="px-5 py-2.5 flex items-center justify-between">
              <span class="text-sm text-gray-500">Số lần làm tối đa</span>
              <span class="text-sm font-medium text-gray-900">{{ quiz()!.maxAttempts ?? 'Không giới hạn' }}</span>
            </div>
            <div class="px-5 py-2.5 flex items-center justify-between">
              <span class="text-sm text-gray-500">Điểm đậu</span>
              <span class="text-sm font-medium text-gray-900">≥{{ quiz()!.passingScore ?? 60 }}%</span>
            </div>
            <div class="px-5 py-2.5 flex items-center justify-between">
              <span class="text-sm text-gray-500">Thang điểm</span>
              <span class="text-sm font-medium text-gray-900">{{ quiz()!.maxScoreScale ?? 10 }}</span>
            </div>
            <div class="px-5 py-2.5 flex items-center justify-between">
              <span class="text-sm text-gray-500">Trộn câu hỏi</span>
              <span class="text-sm text-gray-900">{{ quiz()!.shuffleQuestions ? 'Có' : 'Không' }}</span>
            </div>
            <div class="px-5 py-2.5 flex items-center justify-between">
              <span class="text-sm text-gray-500">Trộn đáp án</span>
              <span class="text-sm text-gray-900">{{ quiz()!.shuffleOptions ? 'Có' : 'Không' }}</span>
            </div>
            <div class="px-5 py-2.5 flex items-center justify-between">
              <span class="text-sm text-gray-500">Mật khẩu</span>
              <span class="text-sm text-gray-900">{{ quiz()!.requiresPassword ? 'Có' : 'Không' }}</span>
            </div>
          </div>
        </div>

        <!-- Công bố kết quả -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-100">
            <h3 class="text-sm font-semibold text-gray-900">Công bố kết quả</h3>
          </div>
          <div class="divide-y divide-gray-50">
            <div class="px-5 py-2.5 flex items-center justify-between">
              <span class="text-sm text-gray-500">Công bố điểm</span>
              @if (quiz()!.showResultsImmediately !== false) {
                <span class="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Đã công bố</span>
              } @else {
                <span class="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Đang ẩn</span>
              }
            </div>
            <div class="px-5 py-2.5 flex items-center justify-between">
              <span class="text-sm text-gray-500">Cho xem đáp án đúng</span>
              <span class="text-sm text-gray-900">{{ quiz()!.showCorrectAnswers ? 'Có' : 'Không' }}</span>
            </div>
          </div>
        </div>

        <!-- Lịch trình -->
        @if (quiz()!.availableFrom || quiz()!.dueAt || quiz()!.lockAt) {
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-gray-100">
              <h3 class="text-sm font-semibold text-gray-900">Lịch trình</h3>
            </div>
            <div class="divide-y divide-gray-50">
              @if (quiz()!.availableFrom) {
                <div class="px-5 py-2.5 flex items-center justify-between">
                  <span class="text-sm text-gray-500">Mở bài từ</span>
                  <span class="text-sm text-gray-900">{{ formatDate(quiz()!.availableFrom!) }}</span>
                </div>
              }
              @if (quiz()!.dueAt) {
                <div class="px-5 py-2.5 flex items-center justify-between">
                  <span class="text-sm text-gray-500">Hạn nộp</span>
                  <span class="text-sm text-gray-900">{{ formatDate(quiz()!.dueAt!) }}</span>
                </div>
              }
              @if (quiz()!.lockAt) {
                <div class="px-5 py-2.5 flex items-center justify-between">
                  <span class="text-sm text-gray-500">Đóng bài lúc</span>
                  <span class="text-sm font-medium text-red-600">{{ formatDate(quiz()!.lockAt!) }}</span>
                </div>
              }
            </div>
          </div>
        }

      </div>
    } @else {
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-10 text-center">
        <p class="text-sm text-gray-500">Không thể tải thông tin bài kiểm tra.</p>
      </div>
    }
  `
})
export class QuizDetailsTabComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly quizApi = inject(QuizApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly quiz = signal<QuizInfo | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.route.parent!.paramMap.pipe(
      map(params => params.get('quizId') || ''),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(quizId => {
      if (quizId) this.loadQuiz(quizId);
    });
  }

  private loadQuiz(quizId: string): void {
    this.loading.set(true);
    this.quizApi.getQuizById(quizId).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response;
        this.quiz.set(data);
      },
      error: () => this.loading.set(false),
      complete: () => this.loading.set(false),
    });
  }

  getQuizTypeLabel(type?: string): string {
    switch (type) {
      case 'PRACTICE': return 'Luyện tập';
      case 'ASSESSMENT': return 'Kiểm tra';
      case 'EXAM': return 'Thi';
      default: return type || '—';
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
