import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { QuestionApi, Question } from '../../../api/endpoints/question.api';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-quiz-create',
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
                <p class="text-gray-900 text-4xl font-black leading-tight tracking-tight">Tạo bài kiểm tra</p>
                <p class="text-gray-600 text-base font-normal leading-normal">Tạo bài kiểm tra mới theo từng bước.</p>
              </div>
            </div>

            <div class="flex border-b border-gray-200">
              <a routerLink="/teacher/quiz/quiz-bank"
                 class="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent">
                Ngân hàng câu hỏi
              </a>
              <a routerLink="/teacher/quiz/create"
                 class="px-4 py-3 text-sm font-semibold border-b-2 border-blue-600 text-blue-600">
                Tạo bài kiểm tra
              </a>
            </div>

            <div class="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <div class="space-y-6">
                <!-- Progress Bar -->
                <div class="flex flex-col gap-3 mb-8">
                  <div class="flex gap-6 justify-between">
                    <p class="text-gray-900 text-base font-medium leading-normal">Bước {{ currentStep() }} trên 3: {{ getStepTitle() }}</p>
                  </div>
                  <div class="rounded-full bg-gray-200">
                    <div class="h-2 rounded-full bg-blue-600 transition-all duration-300" [style.width.%]="(currentStep() / 3) * 100"></div>
                  </div>
                </div>

                <!-- Step 1: General Info -->
                <div *ngIf="currentStep() === 1" class="space-y-6">
                  <h2 class="text-xl font-bold text-gray-900">Thông tin chung</h2>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label class="flex flex-col col-span-2">
                      <p class="text-gray-900 text-base font-medium leading-normal pb-2">Tên bài kiểm tra</p>
                      <input [(ngModel)]="quizForm.title"
                             class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-gray-300 bg-white h-14 placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                             placeholder="VD: Kiểm tra giữa kỳ môn Luật Hàng hải" />
                    </label>
                    <label class="flex flex-col col-span-2">
                      <p class="text-gray-900 text-base font-medium leading-normal pb-2">Mô tả</p>
                      <textarea [(ngModel)]="quizForm.description"
                                class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-gray-300 bg-white min-h-36 placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                                placeholder="Cung cấp mô tả ngắn gọn về bài kiểm tra cho học viên."></textarea>
                    </label>
                    <label class="flex flex-col col-span-1">
                      <p class="text-gray-900 text-base font-medium leading-normal pb-2">Thời gian làm bài (phút)</p>
                      <input [(ngModel)]="quizForm.timeLimit"
                             type="number"
                             class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-gray-300 bg-white h-14 placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                             placeholder="VD: 60" />
                    </label>
                    <label class="flex flex-col col-span-1">
                      <p class="text-gray-900 text-base font-medium leading-normal pb-2">Số câu hỏi dự kiến</p>
                      <input [(ngModel)]="quizForm.questionCount"
                             type="number"
                             class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-gray-300 bg-white h-14 placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                             placeholder="VD: 20" />
                    </label>
                  </div>
                </div>

                <!-- Step 2: Select Questions -->
                <div *ngIf="currentStep() === 2" class="space-y-6">
                  <h2 class="text-xl font-bold text-gray-900">Chọn câu hỏi</h2>
                  <p class="text-gray-600">Chọn câu hỏi từ ngân hàng câu hỏi của bạn để thêm vào bài kiểm tra.</p>
                  
                  <div class="flex flex-col gap-4">
                      <div class="flex justify-between items-center">
                          <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="filterQuestions()" 
                                 placeholder="Tìm kiếm câu hỏi..." 
                                 class="px-4 py-2 border border-gray-300 rounded-lg w-full max-w-md focus:ring-blue-500 focus:border-blue-500">
                          <div class="text-sm text-gray-600">
                              Đã chọn: <span class="font-bold text-blue-600">{{ quizForm.selectedQuestions.length }}</span> câu
                          </div>
                      </div>

                      <div class="overflow-x-auto border border-gray-200 rounded-lg max-h-[500px] overflow-y-auto">
                          <table class="w-full text-left text-sm">
                              <thead class="bg-gray-50 text-gray-600 sticky top-0 z-10">
                                  <tr>
                                      <th class="p-3 font-semibold w-10">
                                          <!-- Select All Checkbox could go here -->
                                      </th>
                                      <th class="p-3 font-semibold">Nội dung</th>
                                      <th class="p-3 font-semibold">Chủ đề</th>
                                      <th class="p-3 font-semibold">Độ khó</th>
                                  </tr>
                              </thead>
                              <tbody class="divide-y divide-gray-200 bg-white">
                                  <tr *ngFor="let question of filteredQuestions()" class="hover:bg-gray-50 cursor-pointer" (click)="toggleQuestion(question.id)">
                                      <td class="p-3">
                                          <input type="checkbox" 
                                                 [checked]="isQuestionSelected(question.id)"
                                                 (click)="$event.stopPropagation(); toggleQuestion(question.id)"
                                                 class="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                                      </td>
                                      <td class="p-3 text-gray-800">{{ question.content }}</td>
                                      <td class="p-3 text-gray-600">{{ question.tags || '---' }}</td>
                                      <td class="p-3">
                                          <span class="inline-flex px-2.5 py-1 text-xs font-medium rounded-full" 
                                                [ngClass]="{'bg-yellow-100 text-yellow-800': question.difficulty === 'EASY', 
                                                           'bg-orange-100 text-orange-800': question.difficulty === 'MEDIUM', 
                                                           'bg-red-100 text-red-800': question.difficulty === 'HARD'}">
                                              {{ getDifficultyLabel(question.difficulty) }}
                                          </span>
                                      </td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>
                  </div>
                </div>

                <!-- Step 3: Review & Publish -->
                <div *ngIf="currentStep() === 3" class="space-y-6">
                  <h2 class="text-xl font-bold text-gray-900">Xem lại và xuất bản</h2>
                  <div class="bg-gray-50 p-6 rounded-lg space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <p class="text-sm text-gray-600">Tên bài kiểm tra</p>
                        <p class="font-medium text-gray-900">{{ quizForm.title || 'Chưa nhập' }}</p>
                      </div>
                      <div>
                        <p class="text-sm text-gray-600">Thời gian</p>
                        <p class="font-medium text-gray-900">{{ quizForm.timeLimit || 0 }} phút</p>
                      </div>
                      <div>
                        <p class="text-sm text-gray-600">Số câu hỏi</p>
                        <p class="font-medium text-gray-900">{{ quizForm.selectedQuestions.length }} câu</p>
                      </div>
                      <div>
                        <p class="text-sm text-gray-600">Trạng thái</p>
                        <p class="font-medium text-gray-900">Nháp</p>
                      </div>
                    </div>
                    <div class="col-span-2">
                      <p class="text-sm text-gray-600 mb-2">Mô tả</p>
                      <p class="text-gray-900">{{ quizForm.description || 'Chưa có mô tả' }}</p>
                    </div>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex justify-end gap-4 pt-6 border-t border-gray-200">
                  <button (click)="handleCancel()"
                          class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold leading-normal hover:bg-gray-300">
                    <span class="truncate">{{ currentStep() === 1 ? 'Hủy bỏ' : 'Quay lại' }}</span>
                  </button>
                  <button (click)="handleNext()"
                          class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-blue-600 text-white text-sm font-bold leading-normal hover:bg-blue-700">
                    <span class="truncate">{{ currentStep() === 3 ? 'Xuất bản' : 'Tiếp tục' }}</span>
                  </button>
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
export class QuizCreateComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private questionApi = inject(QuestionApi);
  private quizApi = inject(QuizApi);

  currentStep = signal<number>(1);
  questions = signal<Question[]>([]);
  filteredQuestions = signal<Question[]>([]);
  searchTerm = '';

  quizForm = {
    title: '',
    description: '',
    timeLimit: 60,
    questionCount: 20,
    selectedQuestions: [] as string[]
  };

  async ngOnInit() {
    await this.loadQuestions();
  }

  async loadQuestions() {
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
    if (!this.searchTerm) {
      this.filteredQuestions.set(this.questions());
      return;
    }
    const term = this.searchTerm.toLowerCase();
    const filtered = this.questions().filter(q =>
      q.content.toLowerCase().includes(term) ||
      (q.tags && q.tags.toLowerCase().includes(term))
    );
    this.filteredQuestions.set(filtered);
  }

  toggleQuestion(questionId: string) {
    const index = this.quizForm.selectedQuestions.indexOf(questionId);
    if (index > -1) {
      this.quizForm.selectedQuestions.splice(index, 1);
    } else {
      this.quizForm.selectedQuestions.push(questionId);
    }
  }

  isQuestionSelected(questionId: string): boolean {
    return this.quizForm.selectedQuestions.includes(questionId);
  }

  getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'EASY': return 'Dễ';
      case 'MEDIUM': return 'Trung bình';
      case 'HARD': return 'Khó';
      default: return 'Không xác định';
    }
  }

  getStepTitle(): string {
    switch (this.currentStep()) {
      case 1: return 'Thông tin chung';
      case 2: return 'Chọn câu hỏi';
      case 3: return 'Xem lại và xuất bản';
      default: return '';
    }
  }

  handleNext() {
    if (this.currentStep() < 3) {
      this.currentStep.set(this.currentStep() + 1);
    } else {
      // Publish quiz
      this.publishQuiz();
    }
  }

  handleCancel() {
    if (this.currentStep() === 1) {
      this.router.navigate(['/teacher/quiz/quiz-bank']);
    } else {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  async publishQuiz() {
    try {
      console.log('Publishing quiz:', this.quizForm);
      // TODO: Call API to create quiz
      // const lessonId = '...'; // Need lesson ID context
      // await firstValueFrom(this.quizApi.createQuiz(lessonId, ...));

      alert('✅ Bài kiểm tra đã được tạo thành công! (Demo)');
      this.router.navigate(['/teacher/quiz/quiz-bank']);
    } catch (error: any) {
      console.error('Error publishing quiz:', error);
      alert('Lỗi khi tạo bài kiểm tra: ' + (error?.message || 'Lỗi không xác định'));
    }
  }
}