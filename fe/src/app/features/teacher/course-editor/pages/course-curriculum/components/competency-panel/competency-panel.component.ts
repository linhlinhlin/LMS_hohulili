import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { CompetencyMappingApi } from '../../../../../../../api/competency/competency-mapping.api';
import { ToastService } from '../../../../../../../core/services/toast.service';
import {
  MaritimeStandard,
  StandardCompetency,
} from '../../../../../../../api/competency/competency-mapping.types';

@Component({
  selector: 'app-competency-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './competency-panel.component.html',
})
export class CompetencyPanelComponent implements OnInit, OnDestroy {
  readonly lessonId = input.required<string>();

  private api = inject(CompetencyMappingApi);
  private toast = inject(ToastService);

  readonly standards = signal<MaritimeStandard[]>([]);
  readonly selectedStandardId = signal<string>('');
  readonly competencies = signal<StandardCompetency[]>([]);
  readonly selectedIds = signal<string[]>([]);
  readonly isLoadingStandards = signal(false);
  readonly isLoadingCompetencies = signal(false);
  readonly isSaving = signal(false);
  readonly isExpanded = signal(true);

  readonly selectedCount = computed(() => this.selectedIds().length);
  readonly showWarning = computed(() => this.selectedCount() > 5);
  readonly warningText = computed(
    () =>
      `Đang ánh xạ ${this.selectedCount()} tiêu chuẩn — cân nhắc chia nhỏ bài học`
  );

  private saveSubject = new Subject<string[]>();
  private sub = new Subscription();

  ngOnInit(): void {
    this.sub.add(
      this.saveSubject
        .pipe(
          debounceTime(500),
          distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
          switchMap((ids) =>
            this.api.updateLessonCompetencies(this.lessonId(), { competencyIds: ids })
          )
        )
        .subscribe({
          next: () => this.isSaving.set(false),
          error: () => {
            this.isSaving.set(false);
            this.toast.error('Lưu tiêu chuẩn thất bại');
          },
        })
    );

    this.loadStandards();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private loadStandards(): void {
    this.isLoadingStandards.set(true);
    this.sub.add(
      this.api.getStandards().subscribe({
        next: (standards) => {
          this.standards.set(standards);
          if (standards.length > 0) {
            this.selectStandard(standards[0].id);
          }
          this.isLoadingStandards.set(false);
          this.loadCurrentMappings();
        },
        error: () => {
          this.isLoadingStandards.set(false);
          this.toast.error('Không thể tải danh sách tiêu chuẩn');
        },
      })
    );
  }

  private loadCurrentMappings(): void {
    this.sub.add(
      this.api.getLessonCompetencies(this.lessonId()).subscribe({
        next: (competencies) => {
          this.selectedIds.set(competencies.map((c) => c.id));
        },
      })
    );
  }

  selectStandard(standardId: string): void {
    this.selectedStandardId.set(standardId);
    this.isLoadingCompetencies.set(true);
    this.sub.add(
      this.api.getCompetencies(standardId).subscribe({
        next: (list) => {
          this.competencies.set(list);
          this.isLoadingCompetencies.set(false);
        },
        error: () => {
          this.isLoadingCompetencies.set(false);
        },
      })
    );
  }

  toggleCompetency(id: string): void {
    this.selectedIds.update((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
    );
    this.isSaving.set(true);
    this.saveSubject.next(this.selectedIds());
  }

  toggleExpanded(): void {
    this.isExpanded.update((v) => !v);
  }

  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }
}
