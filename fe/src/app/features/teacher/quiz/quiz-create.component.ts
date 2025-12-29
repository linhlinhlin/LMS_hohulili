import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuestionApi, Question } from '../../../api/endpoints/question.api';
import { QuizApi, CreateAssignmentQuizRequest } from '../../../api/endpoints/quiz.api';
import { CourseApi } from '../../../api/client/course.api';
import { CourseSummary } from '../../../api/types/course.types';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-quiz-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
    
    <div class="relative flex h-auto min-h-screen w-full flex-col bg-gray-50">
      <div class="flex h-full w-full">
        <main class="flex-1 p-8 overflow-y-auto">
          <div class="mx-auto max-w-9xl">
            <div class="flex flex-wrap justify-between gap-3 mb-8">
              <div class="flex flex-col gap-2">
                <p class="text-gray-900 text-4xl font-black leading-tight tracking-tight">Tạo bài kiểm tra</p>
                <p class="text-gray-600 text-base font-normal leading-normal">Tạo bài kiểm tra mới theo từng bước.</p>
              </div>
            </div>

            <!-- Tabs removed as per requirement -->

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

                  <!-- Course Selection -->
                  <div class="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                    <label class="block text-sm font-bold text-blue-800 mb-2">Chọn khóa học <span class="text-red-500">*</span></label>
                    <select [(ngModel)]="quizForm.courseId" 
                            class="w-full h-11 px-4 rounded-lg border border-blue-200 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500">
                      <option value="" disabled selected>-- Chọn khóa học --</option>
                      <option *ngFor="let course of courses()" [value]="course.id">
                        {{ course.title }} ({{ course.code }})
                      </option>
                    </select>
                    <p *ngIf="showErrors && !quizForm.courseId" class="text-red-500 text-sm mt-1">Vui lòng chọn khóa học.</p>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label class="flex flex-col col-span-2">
                      <p class="text-gray-900 text-base font-medium leading-normal pb-2">Tên bài kiểm tra <span class="text-red-500">*</span></p>
                      <input [(ngModel)]="quizForm.title"
                             class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-gray-300 bg-white h-14 placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                             placeholder="VD: Kiểm tra giữa kỳ môn Luật Hàng hải" />
                      <p *ngIf="showErrors && !quizForm.title" class="text-red-500 text-sm mt-1">Vui lòng nhập tên bài kiểm tra.</p>
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
                      <p class="text-gray-900 text-base font-medium leading-normal pb-2">Điểm đạt (%)</p>
                      <input [(ngModel)]="quizForm.passingScore"
                             type="number"
                             class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-gray-300 bg-white h-14 placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                             placeholder="VD: 60" />
                    </label>
                    <label class="flex flex-col col-span-1">
                      <p class="text-gray-900 text-base font-medium leading-normal pb-2">Số lần làm bài tối đa</p>
                      <input [(ngModel)]="quizForm.maxAttempts"
                             type="number"
                             class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-gray-300 bg-white h-14 placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                             placeholder="VD: 3" />
                    </label>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div class="flex items-center gap-2">
                        <input type="checkbox" [(ngModel)]="quizForm.shuffleQuestions" id="shuffleQuestions" class="w-5 h-5 text-blue-600 rounded">
                        <label for="shuffleQuestions" class="text-gray-700">Xáo trộn câu hỏi</label>
                    </div>
                    <div class="flex items-center gap-2">
                        <input type="checkbox" [(ngModel)]="quizForm.shuffleOptions" id="shuffleOptions" class="w-5 h-5 text-blue-600 rounded">
                        <label for="shuffleOptions" class="text-gray-700">Xáo trộn đáp án</label>
                    </div>
                    <div class="flex items-center gap-2">
                        <input type="checkbox" [(ngModel)]="quizForm.showResultsImmediately" id="showResults" class="w-5 h-5 text-blue-600 rounded">
                        <label for="showResults" class="text-gray-700">Hiện điểm ngay sau khi nộp</label>
                    </div>
                    <div class="flex items-center gap-2">
                        <input type="checkbox" [(ngModel)]="quizForm.showCorrectAnswers" id="showAnswers" class="w-5 h-5 text-blue-600 rounded">
                        <label for="showAnswers" class="text-gray-700">Hiện đáp án đúng</label>
                    </div>
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
                      <div class="col-span-2">
                        <p class="text-sm text-gray-600">Khóa học</p>
                        <p class="font-bold text-lg text-blue-800">{{ getSelectedCourseTitle() }}</p>
                      </div>
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
                        <p class="text-sm text-gray-600">Điểm đạt</p>
                        <p class="font-medium text-gray-900">{{ quizForm.passingScore }}%</p>
                      </div>
                    </div>
                    <div class="col-span-2">
                      <p class="text-sm text-gray-600 mb-2">Mô tả</p>
                      <p class="text-gray-900">{{ quizForm.description || 'Chưa có mô tả' }}</p>
                    </div>
                    
                    <div class="col-span-2 pt-4 border-t border-gray-200">
                        <ul class="list-disc list-inside text-sm text-gray-600">
                            <li>Xáo trộn câu hỏi: {{ quizForm.shuffleQuestions ? 'Có' : 'Không' }}</li>
                            <li>Xáo trộn đáp án: {{ quizForm.shuffleOptions ? 'Có' : 'Không' }}</li>
                            <li>Hiện điểm ngay: {{ quizForm.showResultsImmediately ? 'Có' : 'Không' }}</li>
                        </ul>
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
                    <span class="truncate">{{ currentStep() === 3 ? (isPublishing ? 'Đang tạo...' : 'Xuất bản') : 'Tiếp tục' }}</span>
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
  private courseApi = inject(CourseApi);

  currentStep = signal<number>(1);
  courses = signal<CourseSummary[]>([]); // Updated type
  questions = signal<Question[]>([]);
  filteredQuestions = signal<Question[]>([]);
  searchTerm = '';
  showErrors = false;
  isPublishing = false;

  quizForm = {
    courseId: '',
    title: '',
    description: '',
    timeLimit: 60,
    passingScore: 60,
    maxAttempts: 3,
    shuffleQuestions: true,
    shuffleOptions: false,
    showResultsImmediately: true,
    showCorrectAnswers: false,
    selectedQuestions: [] as string[]
  };

  async ngOnInit() {
    await this.loadCourses();
    await this.loadQuestions();
  }

  async loadCourses() {
    try {
      // Load all teacher's courses
      this.courseApi.myCourses().subscribe({ // Changed getTeacherCourses() to myCourses()
        next: (res: any) => {
          // Determine if res is array or ApiResponse
          const courseList = Array.isArray(res) ? res : (res.data || []);
          this.courses.set(courseList);
          console.log('📚 Loaded courses:', courseList.length);
        },
        error: (err: any) => console.error('Error loading courses:', err) // Added type 'any' to err
      });
    } catch (e: any) { // Added type 'any' to e
      console.error('Error in loadCourses', e);
    }
  }

  async loadQuestions() {
    try {
      const questionsRes = await firstValueFrom(this.questionApi.getMyQuestions());
      if (questionsRes) {
        this.questions.set(questionsRes);
        this.filteredQuestions.set(questionsRes);
        console.log('❓ Loaded questions:', questionsRes.length);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      // alert('Không thể tải danh sách câu hỏi. Vui lòng thử lại sau.');
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
      default: return difficulty;
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

  getSelectedCourseTitle(): string {
    const c = this.courses().find(c => c.id === this.quizForm.courseId);
    return c ? c.title : 'Chưa chọn';
  }

  handleNext() {
    // Validate Step 1
    if (this.currentStep() === 1) {
      this.showErrors = true;
      if (!this.quizForm.courseId || !this.quizForm.title) {
        return;
      }
    }

    // Validate Step 2
    if (this.currentStep() === 2) {
      if (this.quizForm.selectedQuestions.length === 0) {
        alert('Vui lòng chọn ít nhất 1 câu hỏi.');
        return;
      }
    }

    if (this.currentStep() < 3) {
      this.currentStep.set(this.currentStep() + 1);
      this.showErrors = false;
    } else {
      // Publish quiz
      this.publishQuiz();
    }
  }

  handleCancel() {
    if (this.currentStep() === 1) {
      this.router.navigate(['/teacher/assessments/quizzes']);
    } else {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  async publishQuiz() {
    if (this.isPublishing) return;
    this.isPublishing = true;

    try {
      console.log('🚀 Publishing real quiz:', this.quizForm);

      const request: CreateAssignmentQuizRequest = {
        title: this.quizForm.title,
        description: this.quizForm.description,
        timeLimitMinutes: this.quizForm.timeLimit,
        maxAttempts: this.quizForm.maxAttempts,
        passingScore: this.quizForm.passingScore,
        shuffleQuestions: this.quizForm.shuffleQuestions,
        shuffleOptions: this.quizForm.shuffleOptions,
        showResultsImmediately: this.quizForm.showResultsImmediately,
        showCorrectAnswers: this.quizForm.showCorrectAnswers,
        questionIds: this.quizForm.selectedQuestions,
        publishImmediately: true
      };

      await firstValueFrom(this.quizApi.createAssignmentQuizV2(this.quizForm.courseId, request));

      alert('✅ Tạo bài kiểm tra thành công!');
      // Navigate to assessment list
      this.router.navigate(['/teacher/assessments/quizzes']);
    } catch (error: any) {
      console.error('Error publishing quiz:', error);
      alert('Lỗi khi tạo bài kiểm tra: ' + (error?.message || 'Không xác định'));
    } finally {
      this.isPublishing = false;
    }
  }
}
