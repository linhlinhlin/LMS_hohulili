import { Component, signal, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { QuestionApi, Question, QuestionImportResult } from '../../../api/endpoints/question.api';
import { PackageApi, PackageDTO, CreatePackageRequest } from '../../../api/endpoints/package.api';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { firstValueFrom } from 'rxjs';
import { QuestionImportModalComponent } from './components/question-import-modal.component';

@Component({
  selector: 'app-quiz-bank',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, QuestionImportModalComponent],
  template: `
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
    
    <div class="relative flex h-auto min-h-screen w-full flex-col bg-gray-50">
      <!-- Add to Quiz Mode Banner -->
      <div *ngIf="addToQuizLessonId" class="bg-green-600 text-white px-4 py-3">
        <div class="mx-auto max-w-7xl flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined">add_circle</span>
            <span class="font-medium">Chế độ thêm câu hỏi vào Quiz</span>
            <span class="text-green-200">- Chọn câu hỏi và nhấn "Thêm vào Quiz"</span>
          </div>
          <button *ngIf="returnUrl" (click)="goBack()" 
                  class="px-3 py-1 bg-white text-green-600 rounded text-sm font-medium hover:bg-green-50">
            ← Quay lại
          </button>
        </div>
      </div>

      <main class="flex-1 p-8 overflow-y-auto">
        <div class="mx-auto max-w-7xl">
          <!-- Header -->
          <div class="flex flex-wrap justify-between items-start gap-4 mb-6">
            <div class="flex flex-col gap-2">
              <p class="text-gray-900 text-4xl font-black leading-tight tracking-tight">Bài kiểm tra</p>
              <p class="text-gray-600 text-base font-normal leading-normal">Quản lý ngân hàng câu hỏi và tạo các bài kiểm tra mới.</p>
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex border-b border-gray-200 mb-6">
            <a routerLink="/teacher/quiz/quiz-bank"
               class="px-4 py-3 text-sm font-semibold border-b-2 border-blue-600 text-blue-600">
              Ngân hàng câu hỏi
            </a>
            <a routerLink="/teacher/quiz/create"
               class="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent">
              Tạo bài kiểm tra
            </a>
          </div>

          <!-- Main Content Card -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm">
            <!-- Toolbar -->
            <div class="p-6 border-b border-gray-200">
              <!-- Label row -->
              <label class="block text-sm font-medium text-gray-700 mb-2">Chọn gói câu hỏi</label>
              
              <div class="flex flex-wrap gap-4 items-center justify-between">
                <!-- Left: Package selector -->
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <div class="relative flex-1 max-w-md">
                    <select 
                      [(ngModel)]="selectedPackageId" 
                      (ngModelChange)="onPackageChange()"
                      class="w-full h-11 pl-10 pr-10 rounded-lg border-2 border-gray-300 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer hover:border-gray-400 transition-colors">
                      <option value="">Chọn gói câu hỏi...</option>
                      <option *ngFor="let pkg of packages()" [value]="pkg.id">
                        {{ pkg.name }} ({{ pkg.questionCount }} câu)
                      </option>
                    </select>
                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">folder</span>
                    <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                  </div>
                  
                  <button (click)="showCreatePackageModal = true" 
                          class="flex items-center gap-2 h-11 px-4 rounded-lg border-2 border-blue-600 text-blue-600 text-sm font-semibold hover:bg-blue-50 transition-colors whitespace-nowrap">
                    <span class="material-symbols-outlined text-base">add</span>
                    <span>Tạo gói</span>
                  </button>
                  
                  <button *ngIf="selectedPackage() && !selectedPackage()!.name.includes('Chưa phân loại')" 
                          (click)="showManagePackageMenu = !showManagePackageMenu"
                          class="flex items-center gap-1 h-11 px-3 rounded-lg border-2 border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
                    <span class="material-symbols-outlined text-base">more_vert</span>
                  </button>
                  
                  <!-- Package menu dropdown -->
                  <div *ngIf="showManagePackageMenu && selectedPackage()" 
                       class="absolute mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
                       style="top: 180px;">
                    <button (click)="deleteCurrentPackage(); showManagePackageMenu = false"
                            class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
                      <span class="material-symbols-outlined text-base">delete</span>
                      <span>Xóa gói này</span>
                    </button>
                  </div>
                </div>

                <!-- Right: Action buttons -->
                <div class="flex items-center gap-2">
                  <!-- Import button -->
                  <button (click)="openImportModal()" 
                          [disabled]="!selectedPackage()"
                          class="flex items-center justify-center gap-2 h-11 px-4 rounded-lg border-2 border-green-600 text-green-600 text-sm font-semibold hover:bg-green-50 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                    <span class="material-symbols-outlined text-base">upload_file</span>
                    <span>Import file</span>
                  </button>
                  
                  <!-- Add question button -->
                  <button (click)="createNewQuestion()" 
                          [disabled]="!selectedPackage()"
                          class="flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                    <span class="material-symbols-outlined text-base">add</span>
                    <span>Thêm câu hỏi</span>
                  </button>
                </div>
              </div>

              <!-- Package info -->
              <div *ngIf="selectedPackage()" class="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <div class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <span class="material-symbols-outlined text-base">quiz</span>
                  <span class="font-medium">{{ selectedPackage()!.questionCount }} câu hỏi</span>
                </div>
                <div *ngIf="selectedPackage()!.subject" class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg">
                  <span class="material-symbols-outlined text-base">book</span>
                  <span>{{ selectedPackage()!.subject }}</span>
                </div>
                <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                     [class]="selectedPackage()!.visibility === 'PUBLIC' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'">
                  <span class="material-symbols-outlined text-base">{{ selectedPackage()!.visibility === 'PUBLIC' ? 'public' : 'lock' }}</span>
                  <span>{{ selectedPackage()!.visibility === 'PUBLIC' ? 'Công khai' : 'Riêng tư' }}</span>
                </div>
                <p *ngIf="selectedPackage()!.description" class="text-gray-600 ml-2">{{ selectedPackage()!.description }}</p>
              </div>
            </div>

            <!-- Filters -->
            <div *ngIf="selectedPackage()" class="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="relative md:col-span-2">
                  <input type="text" 
                         [(ngModel)]="filters.search" 
                         (ngModelChange)="filterQuestions()" 
                         class="w-full h-10 px-4 pl-10 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                         placeholder="Tìm kiếm câu hỏi..." />
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                </div>
                <select [(ngModel)]="filters.difficulty" 
                        (ngModelChange)="filterQuestions()" 
                        class="h-10 px-4 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Tất cả độ khó</option>
                  <option value="EASY">Dễ</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HARD">Khó</option>
                </select>
              </div>
            </div>

            <!-- Empty state -->
            <div *ngIf="!selectedPackage()" class="p-16 text-center">
              <span class="material-symbols-outlined text-gray-300" style="font-size: 80px;">folder_open</span>
              <p class="text-gray-500 text-lg mt-4 mb-2">Chọn một gói câu hỏi để bắt đầu</p>
              <p class="text-gray-400 text-sm mb-6">Hoặc tạo gói mới để tổ chức câu hỏi của bạn</p>
              <button (click)="showCreatePackageModal = true" 
                      class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                <span class="material-symbols-outlined text-base">add</span>
                <span>Tạo gói đầu tiên</span>
              </button>
            </div>

            <!-- Questions table -->
            <div *ngIf="selectedPackage()" class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th class="p-4 font-semibold">
                      <input type="checkbox" 
                             [checked]="isAllSelected()"
                             (change)="toggleSelectAll()"
                             class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
                    </th>
                    <th class="p-4 font-semibold">Nội dung câu hỏi</th>
                    <th class="p-4 font-semibold">Chủ đề</th>
                    <th class="p-4 font-semibold">Độ khó</th>
                    <th class="p-4 font-semibold">Ngày tạo</th>
                    <th class="p-4 font-semibold text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr *ngFor="let question of filteredQuestions()" class="hover:bg-gray-50 transition-colors">
                    <td class="p-4">
                      <input type="checkbox" 
                             [checked]="isQuestionSelected(question.id)"
                             (change)="toggleQuestionSelection(question.id)"
                             class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td class="p-4 text-gray-800 max-w-xl">
                      <div class="line-clamp-2">{{ question.content }}</div>
                    </td>
                    <td class="p-4 text-gray-600">
                      <span class="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                        {{ question.tags || 'Chưa phân loại' }}
                      </span>
                    </td>
                    <td class="p-4">
                      <span class="inline-flex px-2.5 py-1 text-xs font-medium rounded-full" 
                            [ngClass]="{
                              'bg-green-100 text-green-800': question.difficulty === 'EASY', 
                              'bg-yellow-100 text-yellow-800': question.difficulty === 'MEDIUM', 
                              'bg-red-100 text-red-800': question.difficulty === 'HARD'
                            }">
                        {{ getDifficultyLabel(question.difficulty) }}
                      </span>
                    </td>
                    <td class="p-4 text-gray-600 whitespace-nowrap">{{ question.createdAt | date:'dd/MM/yyyy' }}</td>
                    <td class="p-4 text-right">
                      <div class="flex justify-end gap-1">
                        <button (click)="editQuestion(question)" 
                                class="p-2 rounded-lg hover:bg-blue-50 transition-colors" 
                                title="Sửa">
                          <span class="material-symbols-outlined text-lg text-blue-600">edit</span>
                        </button>
                        <button (click)="deleteQuestion(question)" 
                                class="p-2 rounded-lg hover:bg-red-50 transition-colors" 
                                title="Xóa">
                          <span class="material-symbols-outlined text-lg text-red-600">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="filteredQuestions().length === 0">
                    <td colspan="6" class="p-12 text-center">
                      <div class="flex flex-col items-center gap-3">
                        <span class="material-symbols-outlined text-gray-300" style="font-size: 56px;">quiz</span>
                        <p class="text-gray-500 text-base">Không tìm thấy câu hỏi nào</p>
                        <button (click)="createNewQuestion()" 
                                class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                          Tạo câu hỏi đầu tiên
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Bulk actions bar -->
            <div *ngIf="selectedQuestions().length > 0" 
                 class="sticky bottom-0 p-4 bg-blue-50 border-t-2 border-blue-200 rounded-b-xl">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
                    {{ selectedQuestions().length }}
                  </span>
                  <span class="text-sm font-medium text-blue-900">
                    câu hỏi đã chọn
                  </span>
                </div>
                <div class="flex gap-2">
                  <!-- Add to Quiz button - only show when in addToQuiz mode -->
                  <button *ngIf="addToQuizLessonId" 
                          (click)="addSelectedToQuiz()"
                          [disabled]="addingToQuiz()"
                          class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold transition-colors disabled:opacity-50">
                    <span class="material-symbols-outlined text-base">add_circle</span>
                    <span>{{ addingToQuiz() ? 'Đang thêm...' : 'Thêm vào Quiz' }}</span>
                  </button>
                  <button (click)="showMoveModal = true" 
                          class="flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors">
                    <span class="material-symbols-outlined text-base">drive_file_move</span>
                    <span>Di chuyển</span>
                  </button>
                  <button (click)="clearSelection()" 
                          class="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">
                    <span class="material-symbols-outlined text-base">close</span>
                    <span>Bỏ chọn</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Modal: Create Package -->
    <div *ngIf="showCreatePackageModal" 
         class="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity flex items-center justify-center z-50 p-4" 
         (click)="showCreatePackageModal = false">
      <div class="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-gray-900">Tạo gói câu hỏi mới</h3>
          <button (click)="showCreatePackageModal = false" class="p-1 hover:bg-gray-100 rounded-lg">
            <span class="material-symbols-outlined text-gray-400">close</span>
          </button>
        </div>
        
        <form (ngSubmit)="createPackage()" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Tên gói <span class="text-red-500">*</span></label>
            <input type="text" 
                   [(ngModel)]="newPackage.name" 
                   name="name" 
                   required 
                   class="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                   placeholder="VD: Luật Hàng hải - Chương 1" />
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Mô tả</label>
            <textarea [(ngModel)]="newPackage.description" 
                      name="description" 
                      rows="3" 
                      class="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      placeholder="Mô tả ngắn gọn về gói câu hỏi"></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Môn học</label>
            <input type="text" 
                   [(ngModel)]="newPackage.subject" 
                   name="subject" 
                   class="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                   placeholder="VD: Luật Hàng hải" />
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Hiển thị</label>
            <select [(ngModel)]="newPackage.visibility" 
                    name="visibility" 
                    class="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="PRIVATE">Riêng tư (chỉ mình tôi)</option>
              <option value="PUBLIC">Công khai (mọi người xem được)</option>
            </select>
          </div>
          
          <div class="flex gap-3 pt-4">
            <button type="button" 
                    (click)="showCreatePackageModal = false" 
                    class="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">
              Hủy
            </button>
            <button type="submit" 
                    class="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
              Tạo gói
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Move Questions -->
    <div *ngIf="showMoveModal" 
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
         (click)="showMoveModal = false">
      <div class="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-900">Di chuyển câu hỏi</h3>
          <button (click)="showMoveModal = false" class="p-1 hover:bg-gray-100 rounded-lg">
            <span class="material-symbols-outlined text-gray-400">close</span>
          </button>
        </div>
        
        <p class="text-sm text-gray-600 mb-4">
          Chọn gói đích để di chuyển <span class="font-semibold text-blue-600">{{ selectedQuestions().length }}</span> câu hỏi
        </p>
        
        <div class="space-y-2 max-h-96 overflow-y-auto mb-4">
          <button 
            *ngFor="let pkg of packages()"
            [disabled]="pkg.id === selectedPackage()?.id"
            (click)="moveQuestionsToPackage(pkg.id)"
            class="w-full text-left p-4 rounded-lg border-2 transition-all"
            [class]="pkg.id === selectedPackage()?.id 
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50' 
              : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'">
            <div class="flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm text-gray-900 truncate">{{ pkg.name }}</div>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs text-gray-500">{{ pkg.questionCount }} câu hỏi</span>
                  <span *ngIf="pkg.subject" class="text-xs text-gray-400">• {{ pkg.subject }}</span>
                </div>
              </div>
              <span *ngIf="pkg.id !== selectedPackage()?.id" class="material-symbols-outlined text-gray-400">arrow_forward</span>
            </div>
          </button>
        </div>
        
        <button (click)="showMoveModal = false" 
                class="w-full px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">
          Đóng
        </button>
      </div>
    </div>

    <!-- Import Modal -->
    <app-question-import-modal
      [packageId]="selectedPackageId"
      (imported)="onQuestionsImported($event)"
      (closed)="onImportModalClosed()">
    </app-question-import-modal>
  `,
  styles: [`
    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class QuizBankComponent implements OnInit {
  @ViewChild(QuestionImportModalComponent) importModal!: QuestionImportModalComponent;

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private questionApi = inject(QuestionApi);
  private packageApi = inject(PackageApi);
  private quizApi = inject(QuizApi);

  packages = signal<PackageDTO[]>([]);
  selectedPackageId = '';
  selectedPackage = signal<PackageDTO | null>(null);
  questions = signal<Question[]>([]);
  filteredQuestions = signal<Question[]>([]);
  selectedQuestions = signal<string[]>([]);

  showCreatePackageModal = false;
  showMoveModal = false;
  showManagePackageMenu = false;

  // Add to Quiz mode
  addToQuizLessonId: string | null = null;
  returnUrl: string | null = null;
  addingToQuiz = signal<boolean>(false);

  newPackage: CreatePackageRequest = {
    name: '',
    description: '',
    subject: '',
    visibility: 'PRIVATE'
  };

  filters = {
    search: '',
    difficulty: ''
  };

  async ngOnInit() {
    // Check for addToQuiz query param
    this.route.queryParams.subscribe(params => {
      this.addToQuizLessonId = params['addToQuiz'] || null;
      this.returnUrl = params['returnUrl'] || null;
      
      if (this.addToQuizLessonId) {
        console.log('📝 Add to Quiz mode - Lesson ID:', this.addToQuizLessonId);
      }
    });
    
    await this.loadPackages();
  }

  async loadPackages() {
    try {
      const packages = await firstValueFrom(this.packageApi.getMyPackages());
      this.packages.set(packages);
      
      // Auto-select first package if available
      if (packages.length > 0 && !this.selectedPackageId) {
        this.selectedPackageId = packages[0].id;
        await this.onPackageChange();
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  }

  async onPackageChange() {
    const pkg = this.packages().find(p => p.id === this.selectedPackageId);
    if (pkg) {
      this.selectedPackage.set(pkg);
      this.clearSelection();
      await this.loadQuestionsInPackage(pkg.id);
    } else {
      this.selectedPackage.set(null);
      this.questions.set([]);
      this.filteredQuestions.set([]);
    }
    this.showManagePackageMenu = false;
  }

  async loadQuestionsInPackage(packageId: string) {
    try {
      const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(packageId));
      this.questions.set(questions);
      this.filteredQuestions.set(questions);
    } catch (error) {
      console.error('Error loading questions:', error);
      this.questions.set([]);
      this.filteredQuestions.set([]);
    }
  }

  filterQuestions() {
    let filtered = [...this.questions()];
    
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(q => q.content.toLowerCase().includes(search));
    }
    
    if (this.filters.difficulty) {
      filtered = filtered.filter(q => q.difficulty === this.filters.difficulty);
    }
    
    this.filteredQuestions.set(filtered);
  }

  async createPackage() {
    if (!this.newPackage.name.trim()) {
      alert('Vui lòng nhập tên gói!');
      return;
    }

    try {
      const created = await firstValueFrom(this.packageApi.createPackage(this.newPackage));
      alert('✅ Đã tạo gói câu hỏi thành công!');
      this.showCreatePackageModal = false;
      this.newPackage = {
        name: '',
        description: '',
        subject: '',
        visibility: 'PRIVATE'
      };
      await this.loadPackages();
      
      // Auto-select the newly created package
      if (created && created.id) {
        this.selectedPackageId = created.id;
        await this.onPackageChange();
      }
    } catch (error: any) {
      console.error('Error creating package:', error);
      alert('Lỗi khi tạo gói: ' + (error?.message || 'Lỗi không xác định'));
    }
  }

  async deleteCurrentPackage() {
    const pkg = this.selectedPackage();
    if (!pkg) return;
    
    const confirmed = confirm(`Bạn có chắc chắn muốn xóa gói "${pkg.name}"?\n\nCác câu hỏi trong gói sẽ được chuyển về gói "Chưa phân loại".`);
    if (!confirmed) return;

    try {
      await firstValueFrom(this.packageApi.deletePackage(pkg.id));
      alert('✅ Đã xóa gói thành công!');
      
      this.selectedPackageId = '';
      this.selectedPackage.set(null);
      this.questions.set([]);
      this.filteredQuestions.set([]);
      
      await this.loadPackages();
    } catch (error: any) {
      console.error('Error deleting package:', error);
      alert('Lỗi khi xóa gói: ' + (error?.message || 'Lỗi không xác định'));
    }
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
    if (!this.selectedPackage()) {
      alert('Vui lòng chọn một gói câu hỏi trước!');
      return;
    }
    this.router.navigate(['/teacher/quiz/question/create'], {
      queryParams: { packageId: this.selectedPackage()!.id }
    });
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
      
      if (this.selectedPackage()) {
        await this.loadQuestionsInPackage(this.selectedPackage()!.id);
        await this.loadPackages(); // Refresh package counts
      }
    } catch (error: any) {
      console.error('Error deleting question:', error);
      alert('Lỗi khi xóa câu hỏi: ' + (error?.message || 'Lỗi không xác định'));
    }
  }

  // Selection methods
  toggleQuestionSelection(questionId: string) {
    const selected = this.selectedQuestions();
    if (selected.includes(questionId)) {
      this.selectedQuestions.set(selected.filter(id => id !== questionId));
    } else {
      this.selectedQuestions.set([...selected, questionId]);
    }
  }

  isQuestionSelected(questionId: string): boolean {
    return this.selectedQuestions().includes(questionId);
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.clearSelection();
    } else {
      this.selectedQuestions.set(this.filteredQuestions().map(q => q.id));
    }
  }

  isAllSelected(): boolean {
    const filtered = this.filteredQuestions();
    return filtered.length > 0 && this.selectedQuestions().length === filtered.length;
  }

  clearSelection() {
    this.selectedQuestions.set([]);
  }

  // Add selected questions to quiz
  async addSelectedToQuiz() {
    if (!this.addToQuizLessonId) {
      alert('Không tìm thấy Quiz để thêm câu hỏi');
      return;
    }

    const selectedIds = this.selectedQuestions();
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất một câu hỏi');
      return;
    }

    this.addingToQuiz.set(true);

    try {
      let addedCount = 0;
      let skippedCount = 0;

      // Add each question using the API
      for (const questionId of selectedIds) {
        try {
          console.log('🔄 Adding question to quiz - lessonId:', this.addToQuizLessonId, 'questionId:', questionId);
          const result = await firstValueFrom(this.quizApi.addQuestionToQuiz(this.addToQuizLessonId!, questionId));
          console.log('✅ Add question result:', result);
          addedCount++;
        } catch (error: any) {
          console.error('❌ Error adding question:', questionId, error);
          // Question might already exist
          if (error?.error?.message?.includes('đã tồn tại')) {
            skippedCount++;
          } else {
            console.error('Full error:', JSON.stringify(error, null, 2));
          }
        }
      }

      // Show result
      if (addedCount > 0) {
        let msg = `✅ Đã thêm ${addedCount} câu hỏi vào Quiz!`;
        if (skippedCount > 0) {
          msg += `\n⚠️ ${skippedCount} câu đã có sẵn trong Quiz.`;
        }
        alert(msg);
      } else if (skippedCount > 0) {
        alert('⚠️ Tất cả câu hỏi đã có trong Quiz rồi!');
      }

      this.clearSelection();

      // Navigate back if returnUrl is provided
      if (this.returnUrl) {
        this.router.navigateByUrl(this.returnUrl);
      }
    } catch (error: any) {
      console.error('Error adding questions to quiz:', error);
      alert('❌ Lỗi khi thêm câu hỏi: ' + (error?.message || 'Lỗi không xác định'));
    } finally {
      this.addingToQuiz.set(false);
    }
  }

  // Navigate back to return URL
  goBack() {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  async moveQuestionsToPackage(targetPackageId: string) {
    try {
      await firstValueFrom(this.packageApi.moveQuestionsToPackage({
        questionIds: this.selectedQuestions(),
        targetPackageId
      }));
      
      alert('✅ Đã di chuyển câu hỏi thành công!');
      this.showMoveModal = false;
      this.clearSelection();
      
      if (this.selectedPackage()) {
        await this.loadQuestionsInPackage(this.selectedPackage()!.id);
      }
      await this.loadPackages(); // Refresh package counts
    } catch (error: any) {
      console.error('Error moving questions:', error);
      alert('Lỗi khi di chuyển câu hỏi: ' + (error?.message || 'Lỗi không xác định'));
    }
  }

  // ==================== IMPORT METHODS ====================

  openImportModal() {
    if (!this.selectedPackageId) {
      alert('Vui lòng chọn gói câu hỏi trước khi import');
      return;
    }
    if (this.importModal) {
      this.importModal.open();
    }
  }

  async onQuestionsImported(result: QuestionImportResult) {
    console.log('✅ Questions imported:', result);
    // Reload questions in current package
    if (this.selectedPackage()) {
      await this.loadQuestionsInPackage(this.selectedPackage()!.id);
    }
    // Refresh package counts
    await this.loadPackages();
  }

  onImportModalClosed() {
    console.log('Import modal closed');
  }
}
