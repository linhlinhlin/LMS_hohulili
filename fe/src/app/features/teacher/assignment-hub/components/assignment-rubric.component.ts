import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Assignment Rubric Component
 * 
 * Manages rubric for specific assignment (cloned from library).
 * 
 * @requirements Expert feedback - Rubric per assignment (cloned)
 */
@Component({
  selector: 'app-assignment-rubric',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded shadow p-6">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-gray-900">Rubric bài tập</h3>
        <div class="flex gap-2">
          <a routerLink="/teacher/assignments/rubrics" class="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm transition-colors">
            Chọn từ thư viện
          </a>
          <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors">
            Tạo rubric mới
          </button>
        </div>
      </div>
      
      <div class="text-center py-12 text-gray-500">
        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p class="mb-2">Chưa có rubric cho bài tập này</p>
        <p class="text-sm">Chọn từ thư viện hoặc tạo mới để bắt đầu</p>
      </div>
    </div>
  `
})
export class AssignmentRubricComponent {}
