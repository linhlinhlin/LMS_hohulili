import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  model,
  computed,
  signal,
  effect,
  untracked,
} from '@angular/core';
import {
  MaritimeStandard,
  StandardCompetency,
} from '../../../../../api/competency/competency-mapping.types';
import {
  getCategoryViName,
  getCompetencyViTitle,
} from '../../maritime-vi-lookup';
import { MARITIME_CATALOG, CatalogStandard } from '../../maritime-catalog';

@Component({
  selector: 'app-column-picker-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './column-picker-modal.component.html',
  styles: [`
    .modal-overlay { position: fixed; inset: 0; background: rgb(15 23 42/0.45); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .modal-panel { background: white; border-radius: 1rem; box-shadow: 0 20px 60px rgb(0 0 0/0.2); width: 100%; max-width: 52rem; height: 80vh; display: flex; flex-direction: column; overflow: hidden; }
    .modal-2col { display: flex; flex: 1; overflow: hidden; }
    .modal-left { width: 11.5rem; flex-shrink: 0; border-right: 1px solid rgb(226 232 240); overflow-y: auto; }
    .modal-right { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .modal-right-body { overflow-y: auto; flex: 1; }
    .std-nav-item { display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.625rem 0.875rem; cursor: pointer; border-bottom: 1px solid rgb(241 245 249); transition: background 100ms; }
    .std-nav-item:hover { background: rgb(248 250 252); }
    .std-nav-item.active { background: rgb(239 246 255); border-left: 3px solid rgb(0 86 210); padding-left: calc(0.875rem - 3px); }
    .comp-detail-row { display: flex; align-items: flex-start; gap: 0.625rem; padding: 0.625rem 1rem; border-bottom: 1px solid rgb(241 245 249); transition: background 100ms; }
    .comp-detail-row:hover { background: rgb(248 250 252); }
    .highlight { background: rgb(254 249 195); border-radius: 0.125rem; }
  `],
})
export class ColumnPickerModalComponent {
  readonly isOpen = input.required<boolean>();
  readonly competencies = input.required<StandardCompetency[]>();
  readonly standards = input.required<MaritimeStandard[]>();
  readonly coveredCompetencyIds = input<Set<string>>(new Set());
  readonly selectedCompIds = model.required<Set<string>>();

  readonly closed = output<void>();

  readonly catalog: CatalogStandard[] = MARITIME_CATALOG;

  readonly columnSearch = signal('');
  readonly columnDept = signal('');
  readonly activeCatalogCodes = signal<Set<string>>(new Set());

  /** standardCode → 'all' | 'partial' | 'none' based on selectedCompIds vs that family's competencies */
  readonly familySelectionState = computed((): Map<string, 'all' | 'partial' | 'none'> => {
    const ids = this.selectedCompIds();
    const map = new Map<string, 'all' | 'partial' | 'none'>();
    const byCode = new Map<string, StandardCompetency[]>();
    for (const c of this.competencies()) {
      if (!byCode.has(c.standardCode)) byCode.set(c.standardCode, []);
      byCode.get(c.standardCode)!.push(c);
    }
    for (const [code, comps] of byCode) {
      const sel = comps.filter((c) => ids.has(c.id)).length;
      if (sel === 0) map.set(code, 'none');
      else if (sel === comps.length) map.set(code, 'all');
      else map.set(code, 'partial');
    }
    return map;
  });

  constructor() {
    // Reset modal state only on the closed→open transition.
    effect(() => {
      if (!this.isOpen()) return;
      untracked(() => {
        const ids = this.selectedCompIds();
        const visibleCodes = new Set<string>();
        for (const c of this.competencies()) {
          if (ids.has(c.id)) visibleCodes.add(c.standardCode);
        }
        if (visibleCodes.size === 0) visibleCodes.add('STCW');
        this.activeCatalogCodes.set(visibleCodes);
        this.columnSearch.set('');
        this.columnDept.set('');
      });
    });
  }

  readonly browsedStdGroups = computed(() => {
    const activeCodes = this.activeCatalogCodes();
    const term = this.columnSearch().toLowerCase().trim();
    const dept = this.columnDept();
    const allComps = this.competencies();

    return MARITIME_CATALOG
      .filter((cat) => activeCodes.has(cat.code))
      .map((cat) => {
        let apiComps = allComps.filter((c) => c.standardCode === cat.code);
        if (dept) apiComps = apiComps.filter((c) => c.category === dept);
        if (term) {
          apiComps = apiComps.filter((c) => {
            const vi = getCompetencyViTitle(c.code).toLowerCase();
            return c.code.toLowerCase().includes(term) || c.title.toLowerCase().includes(term) || vi.includes(term);
          });
        }
        const apiCodeSet = new Set(apiComps.map((c) => c.code));
        let refItems = cat.tables.filter((t) => !apiCodeSet.has(t.code));
        if (dept) refItems = refItems.filter((t) => t.category === dept);
        if (term) refItems = refItems.filter((t) =>
          t.code.toLowerCase().includes(term) || t.viTitle.toLowerCase().includes(term)
        );
        const hasApiData = allComps.some((c) => c.standardCode === cat.code);
        return { cat, apiComps, refItems, hasApiData };
      });
  });

  readonly browsedUniqueCategories = computed(() => {
    const activeCodes = this.activeCatalogCodes();
    const cats = new Set<string>();
    for (const c of this.competencies()) {
      if (activeCodes.has(c.standardCode) && c.category) cats.add(c.category);
    }
    for (const cat of MARITIME_CATALOG) {
      if (activeCodes.has(cat.code)) {
        for (const t of cat.tables) if (t.category) cats.add(t.category);
      }
    }
    return Array.from(cats);
  });

  getFamilyState(catalogCode: string): 'all' | 'partial' | 'none' {
    return this.familySelectionState().get(catalogCode) ?? 'none';
  }

  toggleCatalogStd(catalogCode: string): void {
    const familyComps = this.competencies().filter((c) => c.standardCode === catalogCode);
    const state = this.getFamilyState(catalogCode);

    this.selectedCompIds.update((ids) => {
      const next = new Set(ids);
      if (state === 'all') {
        for (const c of familyComps) next.delete(c.id);
      } else {
        for (const c of familyComps) next.add(c.id);
      }
      return next;
    });

    this.activeCatalogCodes.update((codes) => {
      const next = new Set(codes);
      if (state === 'all') next.delete(catalogCode);
      else next.add(catalogCode);
      return next;
    });
  }

  toggleCompetency(compId: string): void {
    this.selectedCompIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(compId)) next.delete(compId);
      else next.add(compId);
      return next;
    });
  }

  isCompetencySelected(compId: string): boolean {
    return this.selectedCompIds().has(compId);
  }

  getApiCompetencyCount(catalogCode: string): number {
    return this.competencies().filter((c) => c.standardCode === catalogCode).length;
  }

  isCoveredCompetency(competencyId: string): boolean {
    return this.coveredCompetencyIds().has(competencyId);
  }

  selectAllStandards(): void {
    this.selectedCompIds.set(new Set(this.competencies().map((c) => c.id)));
    this.activeCatalogCodes.set(new Set(MARITIME_CATALOG.map((c) => c.code)));
  }

  getViTitle(code: string): string {
    return getCompetencyViTitle(code);
  }

  getCategoryVi(cat: string): string {
    return getCategoryViName(cat);
  }

  highlightTerm(text: string): string {
    const term = this.columnSearch().trim();
    if (!term) return text;
    const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(re, '<mark class="highlight">$1</mark>');
  }
}
