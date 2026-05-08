import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { CompetencyMapStats } from '../../../../../api/competency/competency-mapping.types';

@Component({
  selector: 'app-competency-stats-cards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display:flex;align-items:center;flex-wrap:wrap;gap:0;padding:0.5rem 1rem;background:white;border:1px solid rgb(226 232 240);border-radius:0.625rem;font-size:0.8125rem;row-gap:0.375rem">

      <!-- Compliance % + mini progress bar -->
      <div style="display:flex;align-items:center;gap:0.5rem;padding:0 0.75rem 0 0">
        <div style="width:0.5rem;height:0.5rem;border-radius:9999px;flex-shrink:0" [style.background]="complianceColor()"></div>
        <span style="color:rgb(100 116 139);font-weight:500;white-space:nowrap">Tuân thủ</span>
        <span style="font-weight:800;letter-spacing:-0.01em" [style.color]="complianceColor()">{{ stats().coveragePercent }}%</span>
        <div style="width:3.5rem;height:0.3125rem;background:rgb(241 245 249);border-radius:9999px;overflow:hidden;flex-shrink:0">
          <div style="height:100%;border-radius:9999px;transition:width 600ms ease"
               [style.width]="stats().coveragePercent + '%'"
               [style.background]="complianceColor()"></div>
        </div>
        <span style="font-size:0.75rem;color:rgb(148 163 184);white-space:nowrap">{{ stats().competenciesCovered }}/{{ stats().totalCompetencies }} chuẩn</span>
      </div>

      <div style="width:1px;height:1.125rem;background:rgb(226 232 240);flex-shrink:0;margin:0 0.5rem"></div>

      <!-- Gap count — clickable when there are gaps to highlight empty columns -->
      @if (stats().uncoveredCompetenciesCount === 0) {
        <div style="display:flex;align-items:center;gap:0.375rem;padding:0 0.75rem 0 0">
          <svg style="width:0.875rem;height:0.875rem;color:rgb(22 163 74);flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
          <span style="color:rgb(22 163 74);font-weight:600;white-space:nowrap">Đủ chuẩn</span>
        </div>
      } @else {
        <button type="button"
          (click)="gapCardClick.emit()"
          title="Nhấn để làm nổi bật các cột chưa ánh xạ"
          style="display:flex;align-items:center;gap:0.375rem;padding:0 0.75rem 0 0;background:none;border:none;cursor:pointer;font:inherit">
          <svg style="width:0.875rem;height:0.875rem;color:rgb(239 68 68);flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          <span style="color:rgb(239 68 68);font-weight:700;white-space:nowrap">{{ stats().uncoveredCompetenciesCount }} khoảng trống mục tiêu</span>
        </button>
      }

      <div style="width:1px;height:1.125rem;background:rgb(226 232 240);flex-shrink:0;margin:0 0.5rem"></div>

      <!-- Lessons mapped -->
      <div style="display:flex;align-items:center;gap:0.375rem;padding:0 0.75rem 0 0">
        <svg style="width:0.875rem;height:0.875rem;color:rgb(13 148 136);flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
        <span style="color:rgb(100 116 139);white-space:nowrap">Đã gán</span>
        <span style="color:rgb(13 148 136);font-weight:700;white-space:nowrap">{{ stats().lessonsWithMapping }}/{{ stats().totalLessons }}</span>
        <span style="color:rgb(100 116 139);white-space:nowrap">bài</span>
      </div>

      <!-- Unmapped warning (only show when > 0) -->
      @if (stats().unmappedLessonsCount > 0) {
        <div style="width:1px;height:1.125rem;background:rgb(226 232 240);flex-shrink:0;margin:0 0.5rem"></div>
        <div style="display:flex;align-items:center;gap:0.375rem">
          <svg style="width:0.875rem;height:0.875rem;color:rgb(234 88 12);flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0"/>
          </svg>
          <span style="color:rgb(234 88 12);font-weight:600;white-space:nowrap">{{ stats().unmappedLessonsCount }} bài chưa gán</span>
        </div>
      }

    </div>
  `,
})
export class CompetencyStatsCardsComponent {
  readonly stats = input.required<CompetencyMapStats>();
  readonly gapCardClick = output<void>();

  readonly complianceColor = computed(() => {
    const pct = this.stats().coveragePercent;
    if (pct < 30) return 'rgb(239 68 68)';
    if (pct <= 70) return 'rgb(249 115 22)';
    return 'rgb(22 163 74)';
  });
}
