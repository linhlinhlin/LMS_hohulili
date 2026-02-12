import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { RubricApi, RubricDTO, RubricCriterionDTO } from '../../../../api/endpoints/rubric.api';

/**
 * Assignment Rubric Component
 *
 * Manages rubric for specific assignment (loaded from API or library).
 *
 * @requirements Expert feedback - Rubric per assignment (cloned)
 */
@Component({
  selector: 'app-assignment-rubric',
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded shadow p-6">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-gray-900">Rubric bài tập</h3>
        <div class="flex gap-2">
          @if (!rubric()) {
            <a routerLink="/teacher/assignments/rubrics" class="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm transition-colors">
              Chọn từ thư viện
            </a>
          }
          @if (rubric()) {
            <button (click)="removeRubric()" class="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm transition-colors">
              Gỡ rubric
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0056D2]"></div>
        </div>
      } @else if (rubric(); as r) {
        <!-- Rubric Content -->
        <div class="mb-4">
          <h4 class="text-base font-medium text-gray-900">{{ r.title }}</h4>
          @if (r.description) {
            <p class="text-sm text-gray-500 mt-1">{{ r.description }}</p>
          }
          <p class="text-sm text-[#0056D2] mt-1">Tổng điểm: {{ r.maxPoints }}</p>
        </div>

        <!-- Criteria Table -->
        <div class="border rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-700">Tiêu chí</th>
                @for (level of getLevelHeaders(r.criteria); track level) {
                  <th class="px-4 py-3 text-center font-medium text-gray-700">{{ level }}</th>
                }
              </tr>
            </thead>
            <tbody class="divide-y">
              @for (criterion of r.criteria; track criterion.name) {
                <tr>
                  <td class="px-4 py-3 font-medium text-gray-900">
                    {{ criterion.name }}
                    @if (criterion.maxPoints) {
                      <span class="text-xs text-gray-400 ml-1">({{ criterion.maxPoints }} đ)</span>
                    }
                  </td>
                  @for (level of criterion.levels; track level.label) {
                    <td class="px-4 py-3 text-center text-gray-600">
                      <div class="font-medium">{{ level.points ?? '-' }}</div>
                      @if (level.description) {
                        <div class="text-xs text-gray-400 mt-1">{{ level.description }}</div>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <!-- Empty State -->
        <div class="text-center py-12 text-gray-500">
          <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <p class="mb-2">Chưa có rubric cho bài tập này</p>
          <p class="text-sm">Chọn từ thư viện để gắn rubric vào bài tập</p>
        </div>
      }

      @if (error()) {
        <div class="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{{ error() }}</div>
      }
    </div>
  `
})
export class AssignmentRubricComponent implements OnInit {
  private rubricApi = inject(RubricApi);
  private route = inject(ActivatedRoute);

  private assignmentId = '';

  rubric = signal<RubricDTO | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.assignmentId = this.route.parent?.snapshot.paramMap.get('id') || '';
    if (this.assignmentId) {
      this.loadRubric();
    }
  }

  loadRubric(): void {
    this.loading.set(true);
    this.error.set(null);

    this.rubricApi.getByAssignment(this.assignmentId).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response;
        this.rubric.set(data || null);
      },
      error: () => {
        // 404 means no rubric assigned — not an error
        this.rubric.set(null);
      },
      complete: () => this.loading.set(false)
    });
  }

  removeRubric(): void {
    if (!this.assignmentId) return;
    this.loading.set(true);
    this.error.set(null);

    this.rubricApi.unassignFromAssignment(this.assignmentId).subscribe({
      next: () => {
        this.rubric.set(null);
      },
      error: () => {
        this.error.set('Không thể gỡ rubric. Vui lòng thử lại.');
      },
      complete: () => this.loading.set(false)
    });
  }

  getLevelHeaders(criteria: RubricCriterionDTO[]): string[] {
    if (!criteria || criteria.length === 0) return [];
    return criteria[0].levels.map(l => l.label);
  }
}
