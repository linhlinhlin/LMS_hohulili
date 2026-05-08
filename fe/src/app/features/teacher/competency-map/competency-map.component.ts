import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CompetencyMappingApi } from '../../../api/competency/competency-mapping.api';
import { ToastService } from '../../../core/services/toast.service';
import { CompetencyMapResponse, CompetencyMapStats } from '../../../api/competency/competency-mapping.types';
import { CompetencyStatsCardsComponent } from './components/competency-stats-cards/competency-stats-cards.component';
import { CompetencyTableComponent } from './components/competency-table/competency-table.component';

@Component({
  selector: 'app-competency-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CompetencyStatsCardsComponent, CompetencyTableComponent],
  templateUrl: './competency-map.component.html',
})
export class CompetencyMapComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(CompetencyMappingApi);
  private toast = inject(ToastService);

  readonly courseId = signal<string>('');
  readonly data = signal<CompetencyMapResponse | null>(null);
  readonly isLoading = signal(true);
  readonly isExporting = signal(false);
  readonly errorState = signal(false);
  readonly pendingCells = signal<Set<string>>(new Set());

  private tableRef = viewChild(CompetencyTableComponent);

  readonly visibleCompIds = computed((): Set<string> => {
    return this.tableRef()?.selectedCompIds() ?? new Set<string>();
  });

  readonly computedStats = computed((): CompetencyMapStats | null => {
    const d = this.data();
    if (!d) return null;
    const { lessons, competencies } = d;
    const visible = this.visibleCompIds();

    // Visible competencies only — drives "Tuân thủ %" and "Khoảng trống mục tiêu"
    const visibleComps = competencies.filter((c) => visible.has(c.id));
    const totalCompetencies = visibleComps.length;

    const visibleCompIdSet = new Set(visibleComps.map((c) => c.id));
    const coveredVisible = new Set<string>();
    for (const l of lessons) {
      for (const cid of l.mappedCompetencyIds) {
        if (visibleCompIdSet.has(cid)) coveredVisible.add(cid);
      }
    }
    const competenciesCovered = coveredVisible.size;
    const coveragePercent = totalCompetencies === 0 ? 0 : Math.round((competenciesCovered / totalCompetencies) * 100);

    // Lessons-mapped counts ANY mapping, not scoped to visible
    const totalLessons = lessons.length;
    const lessonsWithMapping = lessons.filter((l) => l.mappedCompetencyIds.length > 0).length;
    const totalMappings = lessons.reduce((sum, l) => sum + l.mappedCompetencyIds.length, 0);

    return {
      totalMappings, coveragePercent, lessonsWithMapping, totalLessons,
      competenciesCovered, totalCompetencies,
      unmappedLessonsCount: totalLessons - lessonsWithMapping,
      uncoveredCompetenciesCount: totalCompetencies - competenciesCovered,
    };
  });

  readonly pulseEmptyTrigger = signal(0);

  onGapCardClick(): void {
    this.pulseEmptyTrigger.update((n) => n + 1);
  }

  private sub = new Subscription();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('courseId') ?? '';
    this.courseId.set(id);
    this.loadMap();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  loadMap(): void {
    this.isLoading.set(true);
    this.errorState.set(false);
    this.sub.add(
      this.api.getCourseCompetencyMap(this.courseId()).subscribe({
        next: (data) => {
          this.data.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorState.set(true);
          this.isLoading.set(false);
          this.toast.error('Không thể tải bản đồ năng lực');
        },
      })
    );
  }

  onToggleMapping(event: { lessonId: string; competencyId: string }): void {
    const { lessonId, competencyId } = event;
    const cellKey = `${lessonId}:${competencyId}`;
    const currentData = this.data();
    if (!currentData) return;

    const lesson = currentData.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;

    const alreadyMapped = lesson.mappedCompetencyIds.includes(competencyId);
    const newIds = alreadyMapped
      ? lesson.mappedCompetencyIds.filter((id) => id !== competencyId)
      : [...lesson.mappedCompetencyIds, competencyId];

    this.data.update((d) => {
      if (!d) return d;
      return {
        ...d,
        lessons: d.lessons.map((l) =>
          l.id === lessonId ? { ...l, mappedCompetencyIds: newIds } : l
        ),
      };
    });
    this.pendingCells.update((s) => new Set([...s, cellKey]));

    this.sub.add(
      this.api.updateLessonCompetencies(lessonId, { competencyIds: newIds }).subscribe({
        next: () => {
          this.pendingCells.update((s) => {
            const n = new Set(s);
            n.delete(cellKey);
            return n;
          });
        },
        error: () => {
          this.data.update((d) => {
            if (!d) return d;
            return {
              ...d,
              lessons: d.lessons.map((l) =>
                l.id === lessonId
                  ? { ...l, mappedCompetencyIds: lesson.mappedCompetencyIds }
                  : l
              ),
            };
          });
          this.pendingCells.update((s) => {
            const n = new Set(s);
            n.delete(cellKey);
            return n;
          });
          this.toast.error('Cập nhật thất bại, đã hoàn tác');
        },
      })
    );
  }

  onBulkToggle(event: { chapterLessonIds: string[]; competencyId: string; shouldMap: boolean }): void {
    const { chapterLessonIds, competencyId, shouldMap } = event;
    const currentData = this.data();
    if (!currentData) return;

    const snapshot = currentData.lessons.filter((l) => chapterLessonIds.includes(l.id));

    this.data.update((d) => {
      if (!d) return d;
      return {
        ...d,
        lessons: d.lessons.map((l) => {
          if (!chapterLessonIds.includes(l.id)) return l;
          const has = l.mappedCompetencyIds.includes(competencyId);
          if (shouldMap && !has) return { ...l, mappedCompetencyIds: [...l.mappedCompetencyIds, competencyId] };
          if (!shouldMap && has) return { ...l, mappedCompetencyIds: l.mappedCompetencyIds.filter((id) => id !== competencyId) };
          return l;
        }),
      };
    });

    for (const lessonId of chapterLessonIds) {
      const lesson = snapshot.find((l) => l.id === lessonId);
      if (!lesson) continue;

      const newIds = shouldMap
        ? [...new Set([...lesson.mappedCompetencyIds, competencyId])]
        : lesson.mappedCompetencyIds.filter((id) => id !== competencyId);

      const cellKey = `${lessonId}:${competencyId}`;
      this.pendingCells.update((s) => new Set([...s, cellKey]));

      this.sub.add(
        this.api.updateLessonCompetencies(lessonId, { competencyIds: newIds }).subscribe({
          next: () => {
            this.pendingCells.update((s) => {
              const n = new Set(s);
              n.delete(cellKey);
              return n;
            });
          },
          error: () => {
            this.data.update((d) => {
              if (!d) return d;
              return { ...d, lessons: d.lessons.map((l) => (l.id === lessonId ? lesson : l)) };
            });
            this.pendingCells.update((s) => {
              const n = new Set(s);
              n.delete(cellKey);
              return n;
            });
            this.toast.error('Cập nhật thất bại, đã hoàn tác');
          },
        })
      );
    }
  }

  exportCsv(): void {
    const courseName =
      this.route.snapshot.queryParamMap.get('courseName') ?? this.courseId();
    this.isExporting.set(true);
    this.sub.add(
      this.api.exportCsv(this.courseId()).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const date = new Date().toISOString().split('T')[0];
          a.download = `${courseName}-competency-map-${date}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          this.isExporting.set(false);
        },
        error: () => {
          this.toast.error('Xuất CSV thất bại');
          this.isExporting.set(false);
        },
      })
    );
  }

  goToEditor(): void {
    this.router.navigate(['/teacher/courses', this.courseId(), 'editor']);
  }
}
