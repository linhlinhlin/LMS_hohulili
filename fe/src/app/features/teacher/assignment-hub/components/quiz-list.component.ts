import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-quiz-list',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Bài tập trắc nghiệm</h1>
          <p class="text-gray-500 mt-1">Quản lý các bài kiểm tra trắc nghiệm từ nhiều nguồn (Lesson & Assignment)</p>
        </div>
        
        <a routerLink="/teacher/assessments/quizzes/create" 
           class="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <i-lucide name="plus" class="w-5 h-5 mr-2"></i-lucide>
          Tạo bài kiểm tra
        </a>
      </div>

      <!-- View Aggregation Placeholder -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i-lucide name="file-text" class="w-8 h-8 text-blue-500"></i-lucide>
        </div>
        <h3 class="text-lg font-medium text-gray-900">Danh sách tổng hợp (Placeholder)</h3>
        <p class="text-gray-500 max-w-md mx-auto mt-2">
          Tính năng này đang được phát triển. Nó sẽ hiển thị danh sách gộp từ:
          <br>
          1. Quiz trong bài học (Lesson Quizzes)
          <br>
          2. Bài tập dạng trắc nghiệm (Assignment Quizzes)
        </p>
        
        <div class="mt-6 flex justify-center gap-4">
           <button class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
             Load Lesson Quizzes
           </button>
           <button class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
             Load Assignment Quizzes
           </button>
        </div>
      </div>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent {
  // Placeholder for View Aggregation inputs
  lessonQuizzes = signal<any[]>([]);
  assignmentQuizzes = signal<any[]>([]);
}
