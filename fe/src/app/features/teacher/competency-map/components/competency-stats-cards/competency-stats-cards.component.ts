import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from '@angular/core';
import { CompetencyMapStats } from '../../../../../api/competency/competency-mapping.types';

@Component({
  selector: 'app-competency-stats-cards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));gap:1rem">
      <div class="stat-card">
        <p class="stat-label">Tổng ánh xạ</p>
        <p class="stat-value" style="color:rgb(0 86 210)">{{ stats().totalMappings }}</p>
        <p class="stat-sub">ô đã được tick</p>
      </div>

      <div class="stat-card">
        <p class="stat-label">Tỷ lệ phủ sóng</p>
        <p class="stat-value" [style.color]="coverageColor()">{{ stats().coveragePercent }}%</p>
        <p class="stat-sub">tiêu chuẩn được cover</p>
      </div>

      <div class="stat-card">
        <p class="stat-label">Bài có ánh xạ</p>
        <p class="stat-value" style="color:rgb(15 118 110)">{{ stats().lessonsWithMapping }}<span style="font-size:1rem;font-weight:400;color:rgb(148 163 184)">/{{ stats().totalLessons }}</span></p>
        <p class="stat-sub">bài học</p>
      </div>

      <div class="stat-card">
        <p class="stat-label">Chuẩn được phủ</p>
        <p class="stat-value" style="color:rgb(124 58 237)">{{ stats().competenciesCovered }}<span style="font-size:1rem;font-weight:400;color:rgb(148 163 184)">/{{ stats().totalCompetencies }}</span></p>
        <p class="stat-sub">mục tiêu năng lực</p>
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      background: white;
      border: 1px solid rgb(226 232 240);
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.06);
    }
    .stat-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: rgb(100 116 139);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 0.25rem;
    }
    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0 0 0.125rem;
      line-height: 1.2;
    }
    .stat-sub {
      font-size: 0.75rem;
      color: rgb(148 163 184);
      margin: 0;
    }
  `],
})
export class CompetencyStatsCardsComponent {
  readonly stats = input.required<CompetencyMapStats>();

  readonly coverageColor = computed(() => {
    const pct = this.stats().coveragePercent;
    if (pct < 30) return '#ef4444';
    if (pct <= 70) return '#f97316';
    return '#22c55e';
  });
}
