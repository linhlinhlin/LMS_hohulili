import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { CompetencyMappingApi } from '../../../api/competency/competency-mapping.api';
import { ToastService } from '../../../core/services/toast.service';
import {
  CompetencyMapResponse,
  LessonMappingInfo,
  StandardCompetency,
} from '../../../api/competency/competency-mapping.types';
import { CompetencyStatsCardsComponent } from './components/competency-stats-cards/competency-stats-cards.component';
import { CompetencyTableComponent } from './components/competency-table/competency-table.component';

@Component({
  selector: 'app-competency-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, CompetencyStatsCardsComponent, CompetencyTableComponent],
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
  readonly searchTerm = signal('');
  readonly selectedStandardIds = signal<string[]>([]);
  readonly pendingCells = signal<Set<string>>(new Set());

  private searchSubject = new Subject<string>();
  private sub = new Subscription();

  readonly filteredLessons = computed(() => {
    const map = this.data();
    if (!map) return [];
    let lessons = map.lessons;

    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      lessons = lessons.filter(
        (l) =>
          l.title.toLowerCase().includes(term) ||
          l.chapterTitle.toLowerCase().includes(term)
      );
    }

    const stdIds = this.selectedStandardIds();
    if (stdIds.length > 0) {
      const allowedCompIds = new Set(
        map.competencies
          .filter((c) => stdIds.includes(c.standardId))
          .map((c) => c.id)
      );
      lessons = lessons.filter((l) =>
        l.mappedCompetencyIds.some((cid) => allowedCompIds.has(cid))
      );
    }

    return lessons;
  });

  readonly filteredCompetencies = computed(() => {
    const map = this.data();
    if (!map) return [];
    const stdIds = this.selectedStandardIds();
    if (stdIds.length === 0) return map.competencies;
    return map.competencies.filter((c) => stdIds.includes(c.standardId));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('courseId') ?? '';
    this.courseId.set(id);

    this.sub.add(
      this.searchSubject
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe((term) => this.searchTerm.set(term))
    );

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

  onSearch(value: string): void {
    this.searchSubject.next(value);
  }

  toggleStandardFilter(standardId: string): void {
    this.selectedStandardIds.update((ids) =>
      ids.includes(standardId)
        ? ids.filter((i) => i !== standardId)
        : [...ids, standardId]
    );
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedStandardIds.set([]);
  }

  onToggleMapping(event: { lessonId: string; competencyId: string }): void {
    const { lessonId, competencyId } = event;
    const cellKey = `${lessonId}:${competencyId}`;

    // Optimistic update
    const currentData = this.data();
    if (!currentData) return;

    const lesson = currentData.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;

    const alreadyMapped = lesson.mappedCompetencyIds.includes(competencyId);
    const newIds = alreadyMapped
      ? lesson.mappedCompetencyIds.filter((id) => id !== competencyId)
      : [...lesson.mappedCompetencyIds, competencyId];

    // Apply optimistic update
    this.data.update((d) => {
      if (!d) return d;
      return {
        ...d,
        lessons: d.lessons.map((l) =>
          l.id === lessonId ? { ...l, mappedCompetencyIds: newIds } : l
        ),
      };
    });

    // Mark cell as pending
    this.pendingCells.update((s) => new Set([...s, cellKey]));

    this.sub.add(
      this.api
        .updateLessonCompetencies(lessonId, { competencyIds: newIds })
        .subscribe({
          next: () => {
            this.pendingCells.update((s) => {
              const next = new Set(s);
              next.delete(cellKey);
              return next;
            });
          },
          error: () => {
            // Rollback on error
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
              const next = new Set(s);
              next.delete(cellKey);
              return next;
            });
            this.toast.error('Cập nhật thất bại, đã hoàn tác');
          },
        })
    );
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
    const courseId = this.courseId();
    this.router.navigate(['/teacher/courses', courseId, 'editor']);
  }
}
