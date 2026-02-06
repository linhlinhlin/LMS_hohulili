import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, output, signal, computed, effect, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Rubric, RubricCriterion, RubricLevel, RubricGradeSelection, RubricScoreResult,
  calculateRubricScore
} from './utils/rubric-calculator';

/**
 * Rubric Grader Component
 * 
 * Displays rubric criteria in grading context.
 * Features: level selection, auto-calculate total score.
 * 
 * @requirements 6.4
 */
@Component({
  selector: 'app-rubric-grader',
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rubric(); as rb) {
      <div class="border rounded-lg overflow-hidden">
        <!-- Header -->
        <div class="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
          <div>
            <h3 class="font-medium text-gray-900">{{ rb.name }}</h3>
            @if (rb.description) {
              <p class="text-sm text-gray-500">{{ rb.description }}</p>
            }
          </div>
          @if (scoreResult()) {
            <div class="text-right">
              <div class="text-2xl font-bold text-blue-600">{{ scoreResult()!.totalScore }}</div>
              <div class="text-xs text-gray-500">/ {{ scoreResult()!.maxPossibleScore }} điểm</div>
            </div>
          }
        </div>
        
        <!-- Criteria List -->
        <div class="divide-y">
          @for (criterion of rb.criteria; track criterion.id) {
            <div class="p-4">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <h4 class="font-medium text-gray-900">{{ criterion.name }}</h4>
                  @if (criterion.description) {
                    <p class="text-sm text-gray-500">{{ criterion.description }}</p>
                  }
                </div>
                <span class="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                  {{ criterion.weight }}%
                </span>
              </div>
              
              <!-- Levels -->
              <div class="space-y-2">
                @for (level of criterion.levels; track level.id) {
                  <label class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                         [class.border-blue-500]="isLevelSelected(criterion.id, level.id)"
                         [class.bg-blue-50]="isLevelSelected(criterion.id, level.id)"
                         [class.hover:bg-gray-50]="!isLevelSelected(criterion.id, level.id)">
                    <input type="radio" 
                           [name]="'criterion_' + criterion.id" 
                           [value]="level.id"
                           [checked]="isLevelSelected(criterion.id, level.id)"
                           (change)="selectLevel(criterion, level)"
                           class="mt-1"/>
                    <div class="flex-1">
                      <div class="flex items-center justify-between">
                        <span class="font-medium text-gray-900">{{ level.name }}</span>
                        <span class="text-sm font-medium text-blue-600">{{ level.points }} điểm</span>
                      </div>
                      @if (level.description) {
                        <p class="text-sm text-gray-500 mt-1">{{ level.description }}</p>
                      }
                    </div>
                  </label>
                }
              </div>
              
              <!-- Selected Score for this criterion -->
              @if (getCriterionScore(criterion.id); as score) {
                <div class="mt-2 text-sm text-gray-600">
                  Điểm: {{ score.points }} × {{ criterion.weight }}% = {{ score.weightedScore | number:'1.1-1' }}
                </div>
              }
            </div>
          }
        </div>

        <!-- Summary Footer -->
        @if (scoreResult()) {
          <div class="px-4 py-3 bg-blue-50 border-t">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-sm text-gray-600">Tổng điểm Rubric:</span>
                <span class="ml-2 text-lg font-bold text-blue-600">
                  {{ scoreResult()!.totalScore }} / {{ scoreResult()!.maxPossibleScore }}
                </span>
              </div>
              <div class="text-sm text-gray-500">
                {{ scoreResult()!.percentage }}%
              </div>
            </div>
            
            <!-- Progress Bar -->
            <div class="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full bg-blue-600 rounded-full transition-all duration-300"
                   [style.width.%]="scoreResult()!.percentage"></div>
            </div>
            
            <!-- Criteria Breakdown -->
            <div class="mt-3 space-y-1">
              @for (cs of scoreResult()!.criteriaScores; track cs.criterionId) {
                <div class="flex items-center justify-between text-xs">
                  <span class="text-gray-600">{{ cs.criterionName }}</span>
                  <span class="text-gray-900">{{ cs.weightedScore | number:'1.1-1' }} điểm</span>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="px-4 py-3 bg-gray-50 border-t text-center text-sm text-gray-500">
            Chọn mức điểm cho từng tiêu chí để tính điểm
          </div>
        }
      </div>
    } @else {
      <div class="p-6 text-center text-gray-500 border rounded-lg">
        <svg class="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p>Không có Rubric được chọn</p>
      </div>
    }
  `
})
export class RubricGraderComponent implements OnInit, OnChanges {
  // Signal inputs (Angular v20+)
  readonly rubric = input<Rubric | null>(null);
  readonly initialSelections = input<RubricGradeSelection[]>([]);

  // Output functions (Angular v20+)
  readonly selectionsChange = output<RubricGradeSelection[]>();
  readonly scoreChange = output<RubricScoreResult>();

  // State
  private _selections = signal<RubricGradeSelection[]>([]);

  // Computed
  selections = computed(() => this._selections());

  scoreResult = computed((): RubricScoreResult | null => {
    const rb = this.rubric();
    if (!rb) return null;
    const sels = this._selections();
    if (sels.length === 0) return null;
    return calculateRubricScore(rb, sels);
  });

  ngOnInit(): void {
    const initial = this.initialSelections();
    if (initial.length > 0) {
      this._selections.set([...initial]);
    }
  }

  ngOnChanges(): void {
    const initial = this.initialSelections();
    if (initial.length > 0) {
      this._selections.set([...initial]);
    }
  }

  isLevelSelected(criterionId: string, levelId: string): boolean {
    return this._selections().some(
      (s: RubricGradeSelection) => s.criterionId === criterionId && s.levelId === levelId
    );
  }

  selectLevel(criterion: RubricCriterion, level: RubricLevel): void {
    this._selections.update((selections: RubricGradeSelection[]) => {
      // Remove existing selection for this criterion
      const filtered = selections.filter((s: RubricGradeSelection) => s.criterionId !== criterion.id);
      // Add new selection
      return [...filtered, { criterionId: criterion.id, levelId: level.id, points: level.points }];
    });

    // Emit changes
    this.selectionsChange.emit(this._selections());

    const result = this.scoreResult();
    if (result) {
      this.scoreChange.emit(result);
    }
  }

  getCriterionScore(criterionId: string): { points: number; weightedScore: number } | null {
    const result = this.scoreResult();
    if (!result) return null;

    const criterionScore = result.criteriaScores.find(cs => cs.criterionId === criterionId);
    if (!criterionScore || !criterionScore.selectedLevelId) return null;

    return {
      points: criterionScore.points,
      weightedScore: criterionScore.weightedScore
    };
  }

  // Public method to get current selections
  getSelections(): RubricGradeSelection[] {
    return this._selections();
  }

  // Public method to get current score
  getScore(): RubricScoreResult | null {
    return this.scoreResult();
  }

  // Public method to reset selections
  resetSelections(): void {
    this._selections.set([]);
    this.selectionsChange.emit([]);
  }
}
