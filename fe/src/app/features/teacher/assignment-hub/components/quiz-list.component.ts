import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { QuizApi } from '../../../../api/endpoints/quiz.api';

interface TeacherQuiz {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  timeLimitMinutes?: number;
  maxAttempts?: number;
  passingScore?: number;
  questionCount: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-quiz-list',
  imports: [CommonModule, RouterModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Bài kiểm tra trắc nghiệm</h1>
          <p class="text-gray-500 mt-1">Quản lý các bài kiểm tra trắc nghiệm của bạn</p>
        </div>
        <a routerLink="/teacher/assessments/quizzes/create"
           class="flex items-center px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Tạo bài kiểm tra
        </a>
      </div>

      <!-- KPI Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded shadow p-5">
          <p class="text-sm text-gray-600">Tổng bài kiểm tra</p>
          <p class="text-2xl font-bold text-[#0056D2] mt-1">{{ quizzes().length }}</p>
        </div>
        <div class="bg-white rounded shadow p-5">
          <p class="text-sm text-gray-600">Đã xuất bản</p>
          <p class="text-2xl font-bold text-green-600 mt-1">{{ publishedCount() }}</p>
        </div>
        <div class="bg-white rounded shadow p-5">
          <p class="text-sm text-gray-600">Bản nháp</p>
          <p class="text-2xl font-bold text-yellow-600 mt-1">{{ draftCount() }}</p>
        </div>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0056D2]"></div>
        </div>
      } @else if (quizzes().length === 0) {
        <div class="bg-white rounded-xl shadow-sm border p-12 text-center">
          <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Chưa có bài kiểm tra</h3>
          <p class="text-gray-500 mb-4">Tạo bài kiểm tra trắc nghiệm đầu tiên cho khóa học</p>
          <a routerLink="/teacher/assessments/quizzes/create"
             class="inline-flex items-center gap-2 px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors">
            Tạo bài kiểm tra
          </a>
        </div>
      } @else {
        <!-- Quiz Table -->
        <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="text-left px-6 py-3 font-medium text-gray-700">Tiêu đề</th>
                <th class="text-center px-4 py-3 font-medium text-gray-700">Câu hỏi</th>
                <th class="text-center px-4 py-3 font-medium text-gray-700">Thời gian</th>
                <th class="text-center px-4 py-3 font-medium text-gray-700">Điểm đạt</th>
                <th class="text-center px-4 py-3 font-medium text-gray-700">Trạng thái</th>
                <th class="text-right px-6 py-3 font-medium text-gray-700">Hành động</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              @for (quiz of quizzes(); track quiz.id) {
                <tr class="hover:bg-gray-50 transition-colors">
                  <td class="px-6 py-4">
                    <div class="font-medium text-gray-900">{{ quiz.title || 'Không có tiêu đề' }}</div>
                    @if (quiz.description) {
                      <div class="text-xs text-gray-500 mt-0.5 line-clamp-1">{{ quiz.description }}</div>
                    }
                  </td>
                  <td class="px-4 py-4 text-center text-gray-600">{{ quiz.questionCount }}</td>
                  <td class="px-4 py-4 text-center text-gray-600">
                    {{ quiz.timeLimitMinutes ? quiz.timeLimitMinutes + ' phút' : 'Không giới hạn' }}
                  </td>
                  <td class="px-4 py-4 text-center text-gray-600">{{ quiz.passingScore || '-' }}%</td>
                  <td class="px-4 py-4 text-center">
                    <span class="px-2 py-1 text-xs font-medium rounded-full"
                          [class]="getStatusClass(quiz.status)">
                      {{ getStatusText(quiz.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <a [routerLink]="['/teacher/courses/quizzes', quiz.id]"
                       class="text-[#0056D2] hover:text-[#004BB5] text-sm font-medium transition-colors">
                      Chi tiết
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (error()) {
        <div class="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{{ error() }}</div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent implements OnInit {
  private quizApi = inject(QuizApi);

  quizzes = signal<TeacherQuiz[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  publishedCount = signal(0);
  draftCount = signal(0);

  ngOnInit(): void {
    this.loadQuizzes();
  }

  loadQuizzes(): void {
    this.loading.set(true);
    this.error.set(null);

    this.quizApi.getTeacherQuizzes().subscribe({
      next: (response: any) => {
        const data: TeacherQuiz[] = response?.data ?? response ?? [];
        this.quizzes.set(data);
        this.publishedCount.set(data.filter(q => q.status?.toUpperCase() === 'PUBLISHED').length);
        this.draftCount.set(data.filter(q => q.status?.toUpperCase() === 'DRAFT').length);
      },
      error: () => {
        this.error.set('Không thể tải danh sách bài kiểm tra. Vui lòng thử lại.');
        this.quizzes.set([]);
      },
      complete: () => this.loading.set(false)
    });
  }

  getStatusClass(status: string): string {
    const s = status?.toUpperCase() || '';
    const classes: Record<string, string> = {
      'PUBLISHED': 'bg-green-100 text-green-700',
      'DRAFT': 'bg-yellow-100 text-yellow-700'
    };
    return classes[s] || 'bg-gray-100 text-gray-700';
  }

  getStatusText(status: string): string {
    const s = status?.toUpperCase() || '';
    const texts: Record<string, string> = {
      'PUBLISHED': 'Đã xuất bản',
      'DRAFT': 'Bản nháp'
    };
    return texts[s] || status;
  }
}
