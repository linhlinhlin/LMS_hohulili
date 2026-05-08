import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  signal,
  inject,
  OnInit,
} from '@angular/core';
import { CompetencyMappingApi } from '../../../../api/competency/competency-mapping.api';
import {
  StandardCompetency,
  CompetencyMapResponse,
} from '../../../../api/competency/competency-mapping.types';
import { StudentCompetencyService } from '../../services/student-competency.service';
import { LearningService } from '../../services/learning.service';
import { SideDrawerComponent } from '../../../../shared/components/side-drawer/side-drawer.component';

@Component({
  selector: 'app-competency-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SideDrawerComponent],
  templateUrl: './competency-badge.component.html',
})
export class CompetencyBadgeComponent implements OnInit {
  private api = inject(CompetencyMappingApi);
  private competencyService = inject(StudentCompetencyService);
  private learningService = inject(LearningService);

  readonly lessonId = input.required<string>();
  readonly courseId = input.required<string>();

  readonly lessonComps = signal<StandardCompetency[]>([]);
  readonly courseMap = signal<CompetencyMapResponse | null>(null);
  readonly drawerOpen = signal(false);
  readonly activeCompIdx = signal(0);
  readonly isLoadingMap = signal(false);
  readonly isLoadingComps = signal(true);

  readonly primaryComp = computed(() => this.lessonComps()[0] ?? null);

  readonly activeComp = computed(
    () => this.lessonComps()[this.activeCompIdx()] ?? null
  );

  readonly masteryPct = computed((): number | null => {
    const comp = this.activeComp();
    const map = this.courseMap();
    if (!comp || !map) return null;
    const lessonsWithComp = map.lessons.filter((l) =>
      l.mappedCompetencyIds.includes(comp.id)
    );
    if (lessonsWithComp.length === 0) return null;
    const completed = this.learningService.completedLessons();
    const completedCount = lessonsWithComp.filter((l) =>
      completed.has(l.id)
    ).length;
    return Math.round((completedCount / lessonsWithComp.length) * 100);
  });

  readonly masteryLabel = computed(() => {
    const pct = this.masteryPct();
    if (pct === null) return '';
    if (pct === 100) return 'Đã thành thạo';
    if (pct >= 70) return 'Gần hoàn thành';
    if (pct >= 30) return 'Đang tiến bộ';
    return 'Mới bắt đầu';
  });

  readonly kupItems = computed(() => {
    const comp = this.activeComp();
    if (!comp) return [];
    return this.competencyService.getKupItems(comp.code);
  });

  readonly careerInfo = computed(() => {
    const comp = this.activeComp();
    if (!comp) return null;
    return this.competencyService.getCareerInfo(comp.code);
  });

  readonly kupByType = computed(() => {
    const items = this.kupItems();
    return {
      K: items.filter((i) => i.type === 'K'),
      U: items.filter((i) => i.type === 'U'),
      P: items.filter((i) => i.type === 'P'),
    };
  });

  ngOnInit(): void {
    this.api.getLessonCompetencies(this.lessonId()).subscribe({
      next: (comps) => {
        this.lessonComps.set(comps);
        this.isLoadingComps.set(false);
      },
      error: () => this.isLoadingComps.set(false),
    });
  }

  openDrawer(): void {
    this.drawerOpen.set(true);
    if (!this.courseMap() && !this.isLoadingMap()) {
      this.isLoadingMap.set(true);
      this.api.getCourseCompetencyMap(this.courseId()).subscribe({
        next: (map) => {
          this.courseMap.set(map);
          this.isLoadingMap.set(false);
        },
        error: () => this.isLoadingMap.set(false),
      });
    }
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  setActiveComp(idx: number): void {
    this.activeCompIdx.set(idx);
  }

  masteryColor(pct: number | null): string {
    if (pct === null) return '#94a3b8';
    if (pct === 100) return '#10b981';
    if (pct >= 50) return '#f59e0b';
    return '#0056D2';
  }
}
