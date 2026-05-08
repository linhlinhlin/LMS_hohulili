import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  signal,
  effect,
  untracked,
  inject,
  NgZone,
} from '@angular/core';
import {
  LessonMappingInfo,
  MaritimeStandard,
  StandardCompetency,
} from '../../../../../api/competency/competency-mapping.types';
import {
  getSuggestionsForTitle,
  getCategoryViName,
  getCompetencyViTitle,
} from '../../maritime-vi-lookup';
import { ColumnPickerModalComponent } from '../column-picker-modal/column-picker-modal.component';

export interface ChapterGroup {
  id: string;
  title: string;
  lessons: LessonMappingInfo[];
}

interface ColumnGroup {
  key: string;
  standardCode: string;
  standardId: string;
  category: string;
  viLabel: string;
  competencies: StandardCompetency[];
}

interface ResolvedSuggestion {
  code: string;
  standardType: string;
  title: string;
  score: number;
  matchedKeywords: string[];
  confidence: 'strong' | 'possible';
  competencyId: string | null;
  note: string;
}

interface LessonSmartRow {
  lesson: LessonMappingInfo;
  chapterTitle: string;
  suggestions: ResolvedSuggestion[];
}

@Component({
  selector: 'app-competency-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './competency-table.component.html',
  styleUrl: './competency-table.component.css',
  imports: [ColumnPickerModalComponent],
})
export class CompetencyTableComponent {
  private zone = inject(NgZone);

  readonly courseId = input.required<string>();
  readonly lessons = input.required<LessonMappingInfo[]>();
  readonly competencies = input.required<StandardCompetency[]>();
  readonly standards = input<MaritimeStandard[]>([]);
  readonly pendingCells = input<Set<string>>(new Set());
  readonly searchTerm = input<string>('');
  readonly pulseEmptyTrigger = input<number>(0);

  readonly toggleMapping = output<{ lessonId: string; competencyId: string }>();
  readonly bulkToggle = output<{ chapterLessonIds: string[]; competencyId: string; shouldMap: boolean }>();

  readonly col1Width = signal(220);
  readonly expandedChapters = signal<Set<string>>(new Set());
  readonly selectedCompIds = signal<Set<string>>(new Set());
  readonly assignmentMode = signal<'chapter' | 'lesson'>('lesson');
  readonly showColumnModal = signal(false);
  readonly showSuggestPanel = signal(false);
  readonly dismissedSuggestions = signal<Set<string>>(new Set());
  readonly isPulsingEmpty = signal(false);

  private readonly LS_PREFIX = 'competency-cols:';
  private priorExpandedChapters: Set<string> | null = null;

  /** All lesson suggestion rows for the Smart Suggest panel (score >= 1, not yet mapped) */
  readonly smartRows = computed((): LessonSmartRow[] => {
    const allComps = this.competencies();
    const rows: LessonSmartRow[] = [];
    for (const chapter of this.chapterGroups()) {
      for (const lesson of chapter.lessons) {
        const raw = getSuggestionsForTitle(lesson.title, 6);
        const sugs = raw
          .map((s): ResolvedSuggestion => {
            const comp = allComps.find((c) => c.code === s.code);
            const alreadyMapped = comp ? lesson.mappedCompetencyIds.includes(comp.id) : false;
            return {
              code: s.code,
              standardType: s.standardType,
              title: s.title,
              score: s.score,
              matchedKeywords: s.matchedKeywords,
              confidence: s.confidence,
              competencyId: comp && !alreadyMapped ? comp.id : null,
              note: s.note,
            };
          })
          .filter((s) => {
            const alreadyMapped = s.competencyId === null && allComps.some(
              (c) => c.code === s.code && lesson.mappedCompetencyIds.includes(c.id)
            );
            return !alreadyMapped;
          });
        if (sugs.length > 0) {
          rows.push({ lesson, chapterTitle: chapter.title, suggestions: sugs });
        }
      }
    }
    return rows;
  });

  readonly smartRowCount = computed(() => this.smartRows().length);
  readonly strongSuggestCount = computed(() =>
    this.smartRows().reduce(
      (acc, r) => acc + r.suggestions.filter((s) => s.confidence === 'strong' && s.competencyId !== null).length,
      0
    )
  );
  readonly possibleSuggestCount = computed(() =>
    this.smartRows().reduce(
      (acc, r) => acc + r.suggestions.filter((s) => s.confidence === 'possible' && s.competencyId !== null).length,
      0
    )
  );

  /** lessonId → Map<competencyId, confidence> — drives cell highlighting when panel is active */
  readonly suggestedCellMap = computed((): Map<string, Map<string, 'strong' | 'possible'>> => {
    if (!this.showSuggestPanel()) return new Map();
    const outer = new Map<string, Map<string, 'strong' | 'possible'>>();
    for (const row of this.smartRows()) {
      const inner = new Map<string, 'strong' | 'possible'>();
      for (const sug of row.suggestions) {
        if (sug.competencyId) inner.set(sug.competencyId, sug.confidence);
      }
      if (inner.size > 0) outer.set(row.lesson.id, inner);
    }
    return outer;
  });

  /** lessonId → its top-3 suggestions (used by per-row sparkle icon + tooltip) */
  readonly suggestionsByLesson = computed((): Map<string, ResolvedSuggestion[]> => {
    const map = new Map<string, ResolvedSuggestion[]>();
    const dismissed = this.dismissedSuggestions();
    const allComps = this.competencies();
    for (const lesson of this.lessons()) {
      if (dismissed.has(lesson.id)) {
        map.set(lesson.id, []);
        continue;
      }
      const raw = getSuggestionsForTitle(lesson.title, 4);
      const sugs = raw
        .map((s): ResolvedSuggestion => {
          const comp = allComps.find((c) => c.code === s.code);
          const alreadyMapped = comp ? lesson.mappedCompetencyIds.includes(comp.id) : false;
          if (alreadyMapped) return null as any;
          return {
            code: s.code,
            standardType: s.standardType,
            title: s.title,
            score: s.score,
            matchedKeywords: s.matchedKeywords,
            confidence: s.confidence,
            competencyId: comp ? comp.id : null,
            note: s.note,
          };
        })
        .filter((s): s is ResolvedSuggestion => s !== null)
        .slice(0, 3);
      map.set(lesson.id, sugs);
    }
    return map;
  });

  constructor() {
    // Init: when competencies arrive AND courseId is known AND no selection yet,
    // try localStorage first, fall back to comps that already have ≥1 mapping.
    effect(() => {
      const comps = this.competencies();
      const courseId = this.courseId();
      if (comps.length === 0 || !courseId) return;
      if (untracked(() => this.selectedCompIds().size > 0)) return;

      untracked(() => {
        const stored = this.loadFromStorage(courseId);
        if (stored !== null) {
          const valid = new Set(comps.map((c) => c.id));
          const restored = new Set([...stored].filter((id) => valid.has(id)));
          this.selectedCompIds.set(restored);
        } else {
          // First-visit fallback: derive from competencies that already have ≥1
          // lesson mapped. Avoids overwhelming the matrix with 50+ unused
          // columns and guarantees existing mappings are never visually hidden.
          // Empty courses → empty matrix → user adds via "+ Thêm cột".
          const usedCompIds = new Set<string>();
          for (const lesson of this.lessons()) {
            for (const cid of lesson.mappedCompetencyIds) usedCompIds.add(cid);
          }
          this.selectedCompIds.set(usedCompIds);
        }
      });
    });

    // Persist on every change — gated on competencies being loaded so the
    // initial empty state (before API data arrives) doesn't overwrite a
    // returning user's saved selection in localStorage.
    effect(() => {
      const ids = this.selectedCompIds();
      const compsLoaded = this.competencies().length > 0;
      const courseId = untracked(() => this.courseId());
      if (!courseId || !compsLoaded) return;
      this.saveToStorage(courseId, ids);
    });

    // Pulse empty visible column headers when parent triggers (gap-card click)
    effect(() => {
      const trigger = this.pulseEmptyTrigger();
      if (trigger === 0) return; // initial value, skip
      untracked(() => {
        this.isPulsingEmpty.set(true);
        setTimeout(() => this.isPulsingEmpty.set(false), 1500);
      });
    });
  }

  private loadFromStorage(courseId: string): string[] | null {
    try {
      const raw = localStorage.getItem(this.LS_PREFIX + courseId);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : null;
    } catch {
      return null;
    }
  }

  private saveToStorage(courseId: string, ids: Set<string>): void {
    try {
      localStorage.setItem(this.LS_PREFIX + courseId, JSON.stringify(Array.from(ids)));
    } catch {
      // Quota / SSR-no-window — ignore silently
    }
  }

  readonly chapterGroups = computed((): ChapterGroup[] => {
    const groups = new Map<string, ChapterGroup>();
    for (const lesson of this.lessons()) {
      const key = lesson.chapterId || lesson.chapterTitle;
      if (!groups.has(key)) {
        groups.set(key, { id: key, title: lesson.chapterTitle, lessons: [] });
      }
      groups.get(key)!.lessons.push(lesson);
    }
    return Array.from(groups.values());
  });

  readonly visibleChapterGroups = computed((): ChapterGroup[] => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.chapterGroups();
    return this.chapterGroups()
      .map((ch) => ({
        ...ch,
        lessons: ch.lessons.filter(
          (l) =>
            l.title.toLowerCase().includes(term) ||
            l.chapterTitle.toLowerCase().includes(term)
        ),
      }))
      .filter((ch) => ch.lessons.length > 0);
  });

  readonly visibleCompetencies = computed((): StandardCompetency[] => {
    const comps = this.competencies();
    const ids = this.selectedCompIds();
    if (ids.size === 0) return [];
    return comps.filter((c) => ids.has(c.id));
  });

  readonly columnGroups = computed((): ColumnGroup[] => {
    const groups = new Map<string, ColumnGroup>();
    for (const c of this.visibleCompetencies()) {
      const cat = c.category ?? 'General';
      const key = `${c.standardCode}-${cat}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          standardCode: c.standardCode,
          standardId: c.standardId,
          category: cat,
          viLabel: `${c.standardCode} — ${getCategoryViName(cat)}`,
          competencies: [],
        });
      }
      groups.get(key)!.competencies.push(c);
    }
    return Array.from(groups.values());
  });

  readonly coveredCompetencyIds = computed(() => {
    const covered = new Set<string>();
    for (const lesson of this.lessons()) {
      for (const cid of lesson.mappedCompetencyIds) covered.add(cid);
    }
    return covered;
  });

  /** Visible competency IDs that have zero lessons mapped — used for gap-card pulse highlight */
  readonly emptyVisibleCompIds = computed((): Set<string> => {
    const visible = this.selectedCompIds();
    const covered = this.coveredCompetencyIds();
    const result = new Set<string>();
    for (const id of visible) {
      if (!covered.has(id)) result.add(id);
    }
    return result;
  });

  chapterState(chapter: ChapterGroup, competencyId: string): 'full' | 'partial' | 'empty' {
    const mapped = chapter.lessons.filter((l) =>
      l.mappedCompetencyIds.includes(competencyId)
    ).length;
    if (mapped === 0) return 'empty';
    if (mapped === chapter.lessons.length) return 'full';
    return 'partial';
  }

  isExpanded(chapterId: string): boolean {
    return this.expandedChapters().has(chapterId);
  }

  toggleChapter(chapterId: string): void {
    this.expandedChapters.update((s) => {
      const next = new Set(s);
      next.has(chapterId) ? next.delete(chapterId) : next.add(chapterId);
      return next;
    });
  }

  expandAll(): void {
    this.expandedChapters.set(new Set(this.chapterGroups().map((c) => c.id)));
  }

  collapseAll(): void {
    this.expandedChapters.set(new Set());
  }

  isMapped(lesson: LessonMappingInfo, competencyId: string): boolean {
    return lesson.mappedCompetencyIds.includes(competencyId);
  }

  isCoveredCompetency(competencyId: string): boolean {
    return this.coveredCompetencyIds().has(competencyId);
  }

  isPending(lessonId: string, competencyId: string): boolean {
    return this.pendingCells().has(`${lessonId}:${competencyId}`);
  }

  onToggle(lessonId: string, competencyId: string): void {
    this.toggleMapping.emit({ lessonId, competencyId });
  }

  onChapterClick(chapter: ChapterGroup, competencyId: string): void {
    const state = this.chapterState(chapter, competencyId);
    const shouldMap = state !== 'full';
    this.bulkToggle.emit({
      chapterLessonIds: chapter.lessons.map((l) => l.id),
      competencyId,
      shouldMap,
    });
  }

  getSuggestions(lesson: LessonMappingInfo): ResolvedSuggestion[] {
    return this.suggestionsByLesson().get(lesson.id) ?? [];
  }

  hasSuggestions(lesson: LessonMappingInfo): boolean {
    return (this.suggestionsByLesson().get(lesson.id)?.length ?? 0) > 0;
  }

  acceptSuggestion(lesson: LessonMappingInfo, sug: ResolvedSuggestion): void {
    if (!sug.competencyId) return;
    this.selectedCompIds.update((s) => new Set([...s, sug.competencyId!]));
    this.toggleMapping.emit({ lessonId: lesson.id, competencyId: sug.competencyId });
  }

  /** Apply all "strong" suggestions across all lessons at once */
  applyAllStrongSuggestions(): void {
    for (const row of this.smartRows()) {
      for (const sug of row.suggestions) {
        if (sug.confidence === 'strong' && sug.competencyId) {
          this.acceptSuggestion(row.lesson, sug);
        }
      }
    }
  }

  dismissSuggestion(lessonId: string): void {
    this.dismissedSuggestions.update((s) => new Set([...s, lessonId]));
  }

  isSuggestedCell(lessonId: string, competencyId: string): 'strong' | 'possible' | null {
    return this.suggestedCellMap().get(lessonId)?.get(competencyId) ?? null;
  }

  toggleSuggestPanel(): void {
    const next = !this.showSuggestPanel();
    this.showSuggestPanel.set(next);
    if (next) {
      this.priorExpandedChapters = new Set(this.expandedChapters());
      this.expandAll();
      const compIds = new Set<string>();
      for (const row of this.smartRows()) {
        for (const sug of row.suggestions) {
          if (sug.competencyId) compIds.add(sug.competencyId);
        }
      }
      if (compIds.size > 0) {
        this.selectedCompIds.update((s) => new Set([...s, ...compIds]));
      }
    } else if (this.priorExpandedChapters !== null) {
      this.expandedChapters.set(this.priorExpandedChapters);
      this.priorExpandedChapters = null;
    }
  }

  setMode(mode: 'chapter' | 'lesson'): void {
    this.assignmentMode.set(mode);
    if (mode === 'chapter') this.collapseAll();
  }

  openColumnModal(): void {
    this.showColumnModal.set(true);
  }

  getSuggestionTooltip(lesson: LessonMappingInfo): string {
    const sugs = this.suggestionsByLesson().get(lesson.id) ?? [];
    if (sugs.length === 0) return '';
    const parts = sugs.map((s) => `${s.code} (${s.score} từ khóa: ${s.matchedKeywords.slice(0, 3).join(', ')})`).join(' | ');
    return `Gợi ý AI: ${parts}`;
  }

  stdTypeColor(stdType: string): string {
    switch (stdType) {
      case 'STCW': return 'rgb(0 86 210)';
      case 'SOLAS': return 'rgb(22 163 74)';
      case 'MARPOL': return 'rgb(217 119 6)';
      case 'COLREGs': return 'rgb(147 51 234)';
      default: return 'rgb(100 116 139)';
    }
  }

  stdTypeBg(stdType: string): string {
    switch (stdType) {
      case 'STCW': return 'rgb(239 246 255)';
      case 'SOLAS': return 'rgb(240 253 244)';
      case 'MARPOL': return 'rgb(255 251 235)';
      case 'COLREGs': return 'rgb(250 245 255)';
      default: return 'rgb(248 250 252)';
    }
  }

  onResizeStart(event: MouseEvent): void {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = this.col1Width();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (e: MouseEvent) => {
      const w = Math.max(120, Math.min(520, startWidth + e.clientX - startX));
      this.zone.run(() => this.col1Width.set(w));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  getViTitle(code: string): string {
    return getCompetencyViTitle(code);
  }

}
