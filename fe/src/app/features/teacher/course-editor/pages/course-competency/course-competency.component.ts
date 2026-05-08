import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnDestroy,
  effect,
  untracked,
  viewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CompetencyMappingApi } from '../../../../../api/competency/competency-mapping.api';
import { ToastService } from '../../../../../core/services/toast.service';
import { CourseEditorStore } from '../../store/course-editor.store';
import { CompetencyMapResponse, CompetencyMapStats } from '../../../../../api/competency/competency-mapping.types';
import { CompetencyStatsCardsComponent } from '../../../competency-map/components/competency-stats-cards/competency-stats-cards.component';
import { CompetencyTableComponent } from '../../../competency-map/components/competency-table/competency-table.component';

@Component({
  selector: 'app-course-competency',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CompetencyStatsCardsComponent, CompetencyTableComponent],
  templateUrl: './course-competency.component.html',
})
export class CourseCompetencyComponent implements OnDestroy {
  private api = inject(CompetencyMappingApi);
  private toast = inject(ToastService);
  private store = inject(CourseEditorStore);

  readonly data = signal<CompetencyMapResponse | null>(null);
  readonly isLoading = signal(true);
  readonly isExporting = signal(false);
  readonly errorState = signal(false);
  readonly pendingCells = signal<Set<string>>(new Set());

  readonly courseId = computed(() => this.store.courseTree()?.id ?? '');
  readonly courseName = computed(() => this.store.courseTree()?.title ?? '');

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

  constructor() {
    // Reactive load: course-tree may finish loading after this component mounts
    // (deep-link / F5 path). Watch courseId and (re)load whenever it becomes set.
    effect(() => {
      const id = this.courseId();
      if (!id) return;
      untracked(() => this.loadMap());
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  loadMap(): void {
    const id = this.courseId();
    if (!id) return;
    this.isLoading.set(true);
    this.errorState.set(false);
    this.sub.add(
      this.api.getCourseCompetencyMap(id).subscribe({
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

    // Snapshot lessons for potential rollback
    const snapshot = currentData.lessons.filter((l) => chapterLessonIds.includes(l.id));

    // Optimistic update all chapter lessons at once
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
    const id = this.courseId();
    if (!id) return;
    this.isExporting.set(true);
    this.sub.add(
      this.api.exportCsv(id).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const date = new Date().toISOString().split('T')[0];
          a.download = `${this.courseName() || id}-competency-map-${date}.csv`;
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
}
