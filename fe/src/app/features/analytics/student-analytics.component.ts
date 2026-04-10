import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../api/client/api-client';
import { STUDENT_ENDPOINTS } from '../../api/endpoints/student.endpoints';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';

interface AnalyticsData {
  totalStudyTimeHours: number;
  coursesCompleted: number;
  averageScore: number;
  learningStreakDays: number;
  activeCourses: number;
  totalQuizAttempts: number;
  totalAssignmentsSubmitted: number;
  certificatesEarned: number;
  averageCompletionPercent: number;
  performanceTrend: TrendItem[];
}
interface TrendItem { date: string; score: number; type: string; label: string }
interface EnrolledCourse { id: string; title: string; progress: number; totalLessons: number; completedLessons: number; status: string; thumbnailUrl: string; categoryName: string }
interface ChartPoint { x: number; y: number; score: number; date: string }
interface AxisLabel { value: number; y: number }

const EMPTY: AnalyticsData = {
  totalStudyTimeHours: 0, coursesCompleted: 0, averageScore: 0,
  learningStreakDays: 0, activeCourses: 0, totalQuizAttempts: 0,
  totalAssignmentsSubmitted: 0, certificatesEarned: 0,
  averageCompletionPercent: 0, performanceTrend: []
};

@Component({
  selector: 'app-student-analytics',
  imports: [RouterModule, FormsModule],
  templateUrl: './student-analytics.component.html',
  styleUrl: './student-analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAnalyticsComponent implements OnInit {
  private api = inject(ApiClient);
  private errorService = inject(ErrorHandlingService);

  isLoading = signal(true);
  analytics = signal<AnalyticsData>(EMPTY);
  enrolledCourses = signal<EnrolledCourse[]>([]);

  // Chart layout
  private readonly CW = 560;
  private readonly CH = 180;
  private readonly PL = 38;
  private readonly PT = 12;
  readonly svgW = this.PL + this.CW + 12;
  readonly svgH = this.PT + this.CH + 28;

  totalCourses = computed(() => this.analytics().activeCourses + this.analytics().coursesCompleted);

  activeCourses = computed(() =>
    this.enrolledCourses()
      .filter(c => c.status === 'active' || c.status === 'ACTIVE')
      .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
  );

  // Performance chart
  trendLabelStep = computed(() => {
    const len = this.analytics().performanceTrend.length;
    return len <= 6 ? 1 : Math.ceil(len / 6);
  });

  trendPoints = computed<ChartPoint[]>(() => {
    const items = this.analytics().performanceTrend;
    if (items.length === 0) return [];
    const step = items.length > 1 ? this.CW / (items.length - 1) : 0;
    return items.map((item, i) => ({
      x: this.PL + i * step, y: this.PT + this.CH - (item.score / 100) * this.CH,
      score: item.score, date: item.date
    }));
  });

  trendLinePath = computed(() => this.smoothPath(this.trendPoints()));
  trendAreaPath = computed(() => {
    const pts = this.trendPoints();
    if (pts.length < 2) return '';
    const yBot = this.PT + this.CH;
    return `${this.trendLinePath()} L${pts[pts.length - 1].x},${yBot} L${pts[0].x},${yBot} Z`;
  });
  trendYLabels = computed<AxisLabel[]>(() =>
    [0, 25, 50, 75, 100].map(v => ({ value: v, y: this.PT + this.CH - (v / 100) * this.CH }))
  );
  refLine50Y = computed(() => this.PT + this.CH - 0.5 * this.CH);
  refLine80Y = computed(() => this.PT + this.CH - 0.8 * this.CH);

  ngOnInit(): void { this.loadAll(); }

  async loadAll(): Promise<void> {
    this.isLoading.set(true);
    const [r1, r2] = await Promise.allSettled([
      firstValueFrom(this.api.get<any>(STUDENT_ENDPOINTS.ANALYTICS)),
      firstValueFrom(this.api.get<any>(`${STUDENT_ENDPOINTS.MY_COURSES}?page=0&size=50`))
    ]);
    if (r1.status === 'fulfilled') {
      const d = r1.value.data ?? r1.value;
      this.analytics.set({ ...EMPTY, ...d, performanceTrend: d.performanceTrend ?? [] });
    }
    if (r2.status === 'fulfilled') {
      const d = r2.value.data ?? r2.value;
      this.enrolledCourses.set(Array.isArray(d?.content ?? d) ? (d.content ?? d) : []);
    }
    this.isLoading.set(false);
  }

  private smoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return '';
    if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      d += ` C${p1.x + (p2.x - p0.x) / 6},${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6},${p2.y - (p3.y - p1.y) / 6} ${p2.x},${p2.y}`;
    }
    return d;
  }

  scoreColor(score: number): string { if (score >= 80) return '#059669'; if (score >= 50) return '#ca8a04'; return '#dc2626'; }
  scoreDotColor(score: number): string { if (score >= 80) return '#059669'; if (score >= 50) return '#0056D2'; return '#dc2626'; }
  fmtScore(v: number): string { return v % 1 === 0 ? `${v}` : v.toFixed(1); }
  fmtDate(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  fmtDateVi(ds: string): string { const p = ds.split('-'); return `${parseInt(p[2])}/${parseInt(p[1])}`; }
  fmtDateFull(ds: string): string { const p = ds.split('-'); return `Ngày ${parseInt(p[2])} tháng ${parseInt(p[1])} năm ${p[0]}`; }

  /** In báo cáo — Moodle pattern: browser print → Save as PDF */
  printReport(): void {
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('print-mode');
    }, { once: true });
    document.body.classList.add('print-mode');
    window.print();
  }
}
