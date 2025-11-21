import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { QuestionApi, Question } from '../../../api/endpoints/question.api';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-quiz-bank',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
    
    <div class="relative flex h-auto min-h-screen w-full flex-col bg-gray-50">
      <div class="flex h-full w-full">
        <main class="flex-1 p-8 overflow-y-auto">
          <div class="mx-auto max-w-6xl">
            <div class="flex flex-wrap justify-between gap-3 mb-8">
              <div class="flex flex-col gap-2">
                <p class="text-gray-900 text-4xl font-black leading-tight tracking-tight">Bài kiểm tra</p>
                <p class="text-gray-600 text-base font-normal leading-normal">Quản lý ngân hàng câu hỏi và tạo các bài kiểm tra mới.</p>
              </div>
            </div>

            <div class="flex flex-col gap-8">
              <div class="flex border-b border-gray-200">
                <a routerLink="/teacher/quiz/quiz-bank"
                   class="px-4 py-3 text-sm font-semibold border-b-2 border-blue-600 text-blue-600">
                  Ngân hàng câu hỏi
                </a>
                <a routerLink="/teacher/quiz/create"
                   class="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent">
                  Tạo bài kiểm tra
                </a>
              </div>

              <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div class="flex flex-col gap-6">
                  <div class="flex justify-between items-center gap-4">
                    <h2 class="text-xl font-bold text-gray-900">Ngân hàng câu hỏi</h2>
                    <button (click)="createNewQuestion()" class="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700">
                      <span class="material-symbols-outlined text-base">add</span>
                      <span>Thêm câu hỏi mới</span>
                    </button>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="relative md:col-span-2">
                      <input type="text" [(ngModel)]="filters.search" (ngModelChange)="filterQuestions()" class="w-full h-10 px-4 pl-10 rounded-lg border border-gray-300 bg-white text-sm focus:ring-blue-600 focus:border-blue-600" placeholder="Tìm kiếm câu hỏi..." />
                      <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                    </div>
                    <select [(ngModel)]="filters.subject" (ngModelChange)="filterQuestions()" class="h-10 px-4 rounded-lg border border-gray-300 bg-white text-sm focus:ring-blue-600 focus:border-blue-600">
                      <option value="">Lọc theo môn học</option>
                      <option value="luật-hàng-hải">Luật Hàng hải</option>
                      <option value="điều-động-tàu">Điều động tàu</option>
                      <option value="an-toàn">An toàn hàng hải</option>
                    </select>
                  </div>

                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                      <thead class="bg-gray-50 text-gray-600">
                        <tr>
                          <th class="p-3 font-semibold"><input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded" /></th>
                          <th class="p-3 font-semibold">Nội dung câu hỏi</th>
                          <th class="p-3 font-semibold">Chủ đề</th>
                          <th class="p-3 font-semibold">Loại</th>
                          <th class="p-3 font-semibold">Độ khó</th>
                          <th class="p-3 font-semibold">Ngày tạo</th>
                          <th class="p-3 font-semibold text-right">Hành động</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-200">
                        <tr *ngFor="let question of filteredQuestions()" class="hover:bg-gray-50">
                          <td class="p-3"><input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded" /></td>
                          <td class="p-3 text-gray-800 max-w-md">{{ question.content }}</td>
                          <td class="p-3 text-gray-600">{{ question.tags || 'Chưa phân loại' }}</td>
                          <td class="p-3 text-gray-600">Trắc nghiệm</td>
                          <td class="p-3">
                            <span class="inline-flex px-2.5 py-1 text-xs font-medium rounded-full" [ngClass]="{'bg-yellow-100 text-yellow-800': question.difficulty === 'EASY', 'bg-orange-100 text-orange-800': question.difficulty === 'MEDIUM', 'bg-red-100 text-red-800': question.difficulty === 'HARD'}">
                              {{ getDifficultyLabel(question.difficulty) }}
                            </span>
                          </td>
                          <td class="p-3 text-gray-600">{{ question.createdAt | date:'dd/MM/yyyy' }}</td>
                          <td class="p-3 text-right">
                            <div class="flex justify-end gap-2">
                              <button (click)="editQuestion(question)" class="p-1.5 rounded-md hover:bg-blue-50" title="Sửa">
                                <span class="material-symbols-outlined text-lg text-blue-600">edit</span>
                              </button>
                              <button (click)="deleteQuestion(question)" class="p-1.5 rounded-md hover:bg-red-50" title="Xóa">
                                <span class="material-symbols-outlined text-lg text-red-600">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                        <tr *ngIf="filteredQuestions().length === 0">
                          <td colspan="7" class="p-8 text-center">
                            <div class="flex flex-col items-center gap-3">
                              <span class="material-symbols-outlined text-gray-300" style="font-size: 48px;">quiz</span>
                              <p class="text-gray-500">Không tìm thấy câu hỏi nào</p>
                              <button (click)="createNewQuestion()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Tạo câu hỏi mới</button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
  `]
})
export class QuizBankComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private questionApi = inject(QuestionApi);
  private quizApi = inject(QuizApi);

  questions = signal<Question[]>([]);
  filteredQuestions = signal<Question[]>([]);

  filters = {
    search: '',
    subject: ''
  };

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    try {
      const questionsRes = await firstValueFrom(this.questionApi.getMyQuestions());
      if (questionsRes) {
        this.questions.set(questionsRes);
        this.filteredQuestions.set(questionsRes);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  }

  filterQuestions() {
    let filtered = [...this.questions()];
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(q => q.content.toLowerCase().includes(search));
    }
    if (this.filters.subject) {
      filtered = filtered.filter(q => q.tags?.toLowerCase().includes(this.filters.subject));
    }
    this.filteredQuestions.set(filtered);
  }

  getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'EASY': return 'Dễ';
      case 'MEDIUM': return 'Trung bình';
      case 'HARD': return 'Khó';
      default: return 'Không xác định';
    }
  }

  createNewQuestion() {
    this.router.navigate(['/teacher/quiz/question/create']);
  }

  editQuestion(question: Question) {
    this.router.navigate(['/teacher/quiz/question', question.id, 'edit']);
  }


  async deleteQuestion(question: Question) {
    const confirmed = confirm(`Bạn có chắc chắn muốn xóa câu hỏi:\n\n"${question.content}"\n\nHành động này không thể hoàn tác!`);
    if (!confirmed) return;
    try {
      await firstValueFrom(this.questionApi.deleteQuestion(question.id));
      alert('✅ Đã xóa câu hỏi thành công!');
      await this.loadData();
    } catch (error: any) {
      console.error('Error deleting question:', error);
      alert('Lỗi khi xóa câu hỏi: ' + (error?.message || 'Lỗi không xác định'));
    }
  }
}
