import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../../../../../../core/services/toast.service';
import { EnrichedInputFieldComponent } from '../../../../../../../shared/components/enriched-input/enriched-input.component';
import type {
  InteractiveVideoChoice,
  InteractiveVideoInteraction,
  InteractiveVideoInteractionType,
  InteractiveVideoSpec,
} from '../../../../../../../api/types/interactive-video.types';
import { CurriculumEditorService } from '../../../../services/curriculum-editor.service';
import {
  buildInteractiveVideoSpec,
  getInteractiveVideoAuthoringIssues,
  suggestNextInteractiveVideoTimeSeconds,
  type InteractiveVideoAuthoringIssue,
} from '../../../../utils/interactive-video-authoring';
import {
  exportInteractiveVideoBundle,
  exportInteractiveVideoH5PPackage,
  importInteractiveVideoBundle,
  importInteractiveVideoH5PPackage,
} from '../../../../utils/interactive-video-interoperability';
import {
  InteractiveVideoAuthoringCanvasComponent,
  type InteractiveVideoCanvasMove,
  type InteractiveVideoCanvasPlacement,
} from './interactive-video-authoring-canvas.component';
import { InteractiveVideoAuthoringPropertiesComponent } from './interactive-video-authoring-properties.component';

type InteractiveVideoSourceKind = 'upload' | 'youtube';

interface InteractiveVideoFlowNode {
  id: string;
  index: number;
  type: InteractiveVideoInteractionType;
  typeLabel: string;
  title: string;
  atSeconds: number;
  timeLabel: string;
  required: boolean;
  pause: boolean;
}

interface InteractiveVideoQualitySummary {
  iconName: string;
  title: string;
  body: string;
  toneClass: string;
}

@Component({
  selector: 'app-interactive-video-authoring-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    LucideAngularModule,
    EnrichedInputFieldComponent,
    InteractiveVideoAuthoringCanvasComponent,
    InteractiveVideoAuthoringPropertiesComponent,
  ],
  templateUrl: './interactive-video-authoring-panel.component.html',
  styleUrl: './interactive-video-authoring-panel.component.scss',
})
export class InteractiveVideoAuthoringPanelComponent {
  readonly svc = inject(CurriculumEditorService);
  private readonly toast = inject(ToastService);

  readonly sourceKind = input<InteractiveVideoSourceKind>('upload');
  readonly switchToUpload = output<void>();

  readonly interactiveVideoTypes: InteractiveVideoInteractionType[] = ['checkpoint', 'single_choice', 'branch'];
  readonly timelineDraggingInteractionId = signal<string | null>(null);
  readonly hoveredTimelineNodeId = signal<string | null>(null);
  readonly showAllInteractiveVideoQualityIssues = signal(false);
  readonly selectedCanvasInteractionId = signal<string | null>(null);
  readonly timelineRail = viewChild<ElementRef<HTMLElement>>('timelineRail');
  private suppressNextTimelineClick = false;

  readonly isYoutubeSource = computed(() => this.sourceKind() === 'youtube');
  readonly previewSpec = computed<InteractiveVideoSpec | null>(() =>
    buildInteractiveVideoSpec(
      this.svc.sectionInteractiveVideoEnabled(),
      this.svc.sectionInteractiveVideoTimeline(),
    ),
  );
  readonly maxInteractiveTimeSeconds = computed(() => {
    const duration = this.svc.sectionVideoDurationSec();
    if (!duration || !Number.isFinite(duration) || duration <= 0) {
      return null;
    }
    return Math.max(0, Math.round(duration) - 1);
  });
  readonly compatibilityLabel = computed(() =>
    this.isYoutubeSource() ? 'Tương tác online' : 'Hỗ trợ tương tác',
  );
  readonly compatibilityBadgeClass = computed(() =>
    this.isYoutubeSource()
      ? 'inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200'
      : 'inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200',
  );
  readonly durationHint = computed(() => {
    const nextSeconds = this.canvasSuggestedTimeSeconds();
    const duration = this.svc.sectionVideoDurationSec();
    const nextLabel = this.formatInteractiveFlowTime(nextSeconds);
    if (!duration || !Number.isFinite(duration) || duration <= 0) {
      return `Mốc kế tiếp: ${nextLabel}.`;
    }
    return `Mốc kế tiếp: ${nextLabel} / ${this.formatInteractiveFlowTime(duration)}.`;
  });
  readonly canvasSuggestedTimeSeconds = computed(() =>
    suggestNextInteractiveVideoTimeSeconds(
      this.svc.sectionInteractiveVideoTimeline(),
      { durationSeconds: this.svc.sectionVideoDurationSec() },
    ),
  );
  readonly canvasVideoUrl = computed(() =>
    this.isYoutubeSource() ? null : (this.svc.sectionVideoUrl() || null),
  );
  readonly selectedCanvasInteraction = computed<InteractiveVideoInteraction | null>(() => {
    const selectedId = this.selectedCanvasInteractionId();
    if (!selectedId) {
      return null;
    }
    return this.svc.sectionInteractiveVideoTimeline()
      .find(interaction => interaction.id === selectedId) ?? null;
  });
  readonly quickNudgeSeconds = computed(() => {
    const duration = this.svc.sectionVideoDurationSec();
    if (!duration || !Number.isFinite(duration) || duration <= 0) {
      return 5;
    }
    if (duration <= 30) {
      return 1;
    }
    if (duration <= 120) {
      return 5;
    }
    if (duration <= 600) {
      return 10;
    }
    return 30;
  });
  readonly timelineScaleLabel = computed(() => {
    const duration = this.svc.sectionVideoDurationSec();
    if (!duration || !Number.isFinite(duration) || duration <= 0) {
      return 'Timeline';
    }
    return `Timeline ${this.formatInteractiveFlowTime(duration)}`;
  });
  readonly interactiveVideoFlowNodes = computed<InteractiveVideoFlowNode[]>(() =>
    this.buildInteractiveVideoFlowNodes(this.svc.sectionInteractiveVideoTimeline()),
  );
  readonly interactiveVideoDetailInteractions = computed(() =>
    this.sortInteractiveTimeline(this.svc.sectionInteractiveVideoTimeline()),
  );
  readonly activeTimelinePreviewNode = computed<InteractiveVideoFlowNode | null>(() => {
    const activeId = this.timelineDraggingInteractionId() ?? this.hoveredTimelineNodeId();
    if (!activeId) {
      return null;
    }
    return this.interactiveVideoFlowNodes().find(node => node.id === activeId) ?? null;
  });
  readonly interactiveVideoFlowStats = computed(() => {
    const nodes = this.interactiveVideoFlowNodes();
    return {
      total: nodes.length,
      branches: nodes.filter(node => node.type === 'branch').length,
      questions: nodes.filter(node => node.type === 'single_choice').length,
      required: nodes.filter(node => node.required).length,
    };
  });
  readonly timelineMaxSeconds = computed(() => this.getTimelineScaleMaxSeconds());
  readonly interactiveVideoQualityIssues = computed(() =>
    getInteractiveVideoAuthoringIssues(
      this.svc.sectionInteractiveVideoEnabled(),
      this.svc.sectionInteractiveVideoTimeline(),
      { durationSeconds: this.svc.sectionVideoDurationSec() },
    ),
  );
  readonly interactiveVideoQualitySummary = computed<InteractiveVideoQualitySummary>(() => {
    const issues = this.interactiveVideoQualityIssues();
    const errorCount = issues.filter(issue => issue.severity === 'error').length;
    const warningCount = issues.filter(issue => issue.severity === 'warning').length;
    const baseClass = 'rounded-lg border px-3 py-2.5';

    if (errorCount > 0) {
      return {
        iconName: 'alert-circle',
        title: `${errorCount} việc cần sửa trước khi lưu`,
        body: warningCount > 0
          ? `Có thêm ${warningCount} điểm nên rà soát.`
          : 'Các lỗi này có thể làm học viên bị kẹt hoặc dữ liệu ghi nhận sai.',
        toneClass: `${baseClass} border-red-200 bg-red-50 text-red-800`,
      };
    }

    if (warningCount > 0) {
      return {
        iconName: 'alert-triangle',
        title: `${warningCount} điểm nên rà soát`,
        body: 'Bài vẫn có thể lưu, nhưng các điểm này dễ làm học viên hiểu nhầm.',
        toneClass: `${baseClass} border-amber-200 bg-amber-50 text-amber-800`,
      };
    }

    return {
      iconName: 'check-circle',
      title: 'Luồng tương tác ổn',
      body: 'Thời điểm, lựa chọn và nhánh đang hợp lệ để lưu.',
      toneClass: `${baseClass} border-emerald-200 bg-emerald-50 text-emerald-800`,
    };
  });
  readonly visibleInteractiveVideoQualityIssues = computed(() => {
    const issues = this.interactiveVideoQualityIssues();
    return this.showAllInteractiveVideoQualityIssues() ? issues : issues.slice(0, 5);
  });
  readonly hiddenInteractiveVideoQualityIssueCount = computed(() =>
    Math.max(0, this.interactiveVideoQualityIssues().length - this.visibleInteractiveVideoQualityIssues().length),
  );

  onInteractiveVideoEnabledChange(enabled: boolean): void {
    this.svc.setInteractiveVideoEnabled(enabled);
  }

  addInteraction(type: InteractiveVideoInteractionType): void {
    const created = this.svc.addInteractiveVideoInteraction(type);
    this.selectedCanvasInteractionId.set(created.id);
  }

  addSuggestedInteractions(): void {
    this.svc.addSuggestedInteractiveVideoInteractions();
  }

  toggleInteractiveVideoQualityIssues(): void {
    this.showAllInteractiveVideoQualityIssues.update(showAll => !showAll);
  }

  onInteractiveTypeChange(
    interactionId: string,
    type: InteractiveVideoInteractionType,
  ): void {
    this.svc.updateInteractiveVideoInteractionType(interactionId, type);
  }

  onInteractiveTimeChange(interactionId: string, value: unknown): void {
    this.svc.updateInteractiveVideoInteraction(interactionId, {
      atSeconds: this.clampInteractiveTime(value),
    });
  }

  onInteractiveChoiceTargetChange(
    interactionId: string,
    choiceId: string,
    value: unknown,
  ): void {
    this.svc.updateInteractiveVideoChoice(interactionId, choiceId, {
      targetTimeSeconds: this.normalizeOptionalInteractiveTime(value),
      targetInteractionId: null,
    });
  }

  onInteractiveChoiceTargetInteractionChange(
    interactionId: string,
    choiceId: string,
    value: string,
  ): void {
    this.svc.updateInteractiveVideoChoice(interactionId, choiceId, {
      targetInteractionId: value || null,
      targetTimeSeconds: value ? null : undefined,
    });
  }

  async onInteractiveImportSelected(event: Event): Promise<void> {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    inputElement.value = '';
    if (!file) {
      return;
    }

    try {
      const spec = await this.readInteractiveImportSpec(file);
      if (!spec || spec.timeline.length === 0) {
        this.toast.error('Tệp nhập không có dữ liệu video tương tác hợp lệ.');
        return;
      }

      this.svc.sectionInteractiveVideoEnabled.set(spec.enabled !== false);
      this.svc.sectionInteractiveVideoTimeline.set(spec.timeline);
      this.svc.markDirty();
      this.toast.success(`Đã nhập ${spec.timeline.length} điểm tương tác.`);
    } catch {
      this.toast.error('Không thể đọc tệp video tương tác.');
    }
  }

  exportInteractiveVideoJson(): void {
    const spec = this.previewSpec();
    if (!spec) {
      this.toast.error('Chưa có dữ liệu video tương tác để xuất.');
      return;
    }

    try {
      const bundle = exportInteractiveVideoBundle(spec, this.svc.sectionVideoUrl());
      this.downloadJsonFile(bundle, this.getInteractiveExportFileName('json'));
      this.toast.success('Đã xuất JSON video tương tác.');
    } catch {
      this.toast.error('Không thể xuất JSON video tương tác.');
    }
  }

  async exportInteractiveVideoH5P(): Promise<void> {
    const spec = this.previewSpec();
    if (!spec) {
      this.toast.error('Chưa có dữ liệu video tương tác để xuất.');
      return;
    }

    try {
      const blob = await exportInteractiveVideoH5PPackage(spec, this.svc.sectionVideoUrl(), {
        title: this.svc.sectionTitle(),
        language: 'vi',
      });
      this.downloadBlobFile(blob, this.getInteractiveExportFileName('h5p'));
      this.toast.success('Đã xuất H5P video tương tác.');
    } catch {
      this.toast.error('Không thể xuất H5P video tương tác.');
    }
  }

  isChoiceInteraction(interaction: InteractiveVideoInteraction): boolean {
    return interaction.type === 'single_choice' || interaction.type === 'branch';
  }

  getInteractiveBranchTargets(sourceInteractionId: string): InteractiveVideoInteraction[] {
    return this.sortInteractiveTimeline(this.svc.sectionInteractiveVideoTimeline())
      .filter(interaction => interaction.id !== sourceInteractionId);
  }

  getInteractiveTypeLabel(type: InteractiveVideoInteractionType): string {
    switch (type) {
      case 'single_choice': return 'Câu hỏi';
      case 'branch': return 'Rẽ nhánh';
      case 'hotspot': return 'Hotspot';
      default: return 'Điểm dừng';
    }
  }

  getInteractiveTypeHint(type: InteractiveVideoInteractionType): string {
    switch (type) {
      case 'single_choice':
        return 'Dừng video để hỏi nhanh và phản hồi theo lựa chọn.';
      case 'branch':
        return 'Cho học viên chọn đường đi tiếp theo trong video.';
      case 'hotspot':
        return 'Dành cho vùng bấm trên video khi nhập từ gói tương tác.';
      default:
        return 'Tạm dừng video tại mốc này để nhấn mạnh nội dung.';
    }
  }

  getInteractiveNodeDomId(interactionId: string): string {
    return `interactive-node-${interactionId}`;
  }

  scrollInteractiveNodeIntoView(interactionId: string): void {
    this.selectedCanvasInteractionId.set(interactionId);
    if (typeof document === 'undefined') {
      return;
    }

    requestAnimationFrame(() => {
      document.getElementById(this.getInteractiveNodeDomId(interactionId))
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  onCanvasInteractionPlaced(event: InteractiveVideoCanvasPlacement): void {
    const created = this.svc.addInteractiveVideoInteraction(event.type, {
      preferredSeconds: event.atSeconds,
    });
    this.svc.updateInteractiveVideoInteraction(created.id, {
      atSeconds: event.atSeconds,
      displayType: event.type === 'checkpoint' ? 'button' : 'poster',
      position: event.position,
    });
    this.selectedCanvasInteractionId.set(created.id);
  }

  onCanvasInteractionMoved(event: InteractiveVideoCanvasMove): void {
    this.svc.updateInteractiveVideoInteraction(event.interactionId, {
      atSeconds: event.atSeconds,
      position: event.position,
    });
    this.selectedCanvasInteractionId.set(event.interactionId);
  }

  onCanvasInteractionSelected(interactionId: string): void {
    this.selectedCanvasInteractionId.set(interactionId);
  }

  onCanvasPropertyPatch(patch: Partial<InteractiveVideoInteraction>): void {
    const interactionId = this.selectedCanvasInteraction()?.id;
    if (!interactionId) {
      return;
    }
    this.svc.updateInteractiveVideoInteraction(interactionId, patch);
  }

  formatInteractiveTimeLabel(seconds: number | null | undefined): string {
    return this.formatInteractiveFlowTime(seconds);
  }

  formatInteractiveBranchTargetLabel(target: InteractiveVideoInteraction): string {
    const title = target.title?.trim() || this.getInteractiveTypeLabel(target.type);
    return `${this.formatInteractiveFlowTime(target.atSeconds)} · ${title}`;
  }

  getInteractiveChoiceRowClass(type: InteractiveVideoInteractionType): string {
    const base = 'grid gap-2 px-3 py-2';
    return type === 'branch'
      ? `${base} sm:grid-cols-[minmax(0,1fr)_7rem_7rem_minmax(8rem,10rem)_auto]`
      : `${base} sm:grid-cols-[minmax(0,1fr)_8rem_auto]`;
  }

  getInteractiveDetailCardClass(interactionId: string): string {
    const base = 'interactive-detail-card rounded-lg border bg-slate-50/60 p-3';
    return this.selectedCanvasInteractionId() === interactionId
      ? `${base} interactive-detail-card--selected border-[#0056D2]/60`
      : `${base} border-slate-200`;
  }

  getTimelinePercent(seconds: number): number {
    const max = this.getTimelineScaleMaxSeconds();
    if (max <= 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, (seconds / max) * 100));
  }

  getTimelinePreviewLeftPercent(node: InteractiveVideoFlowNode): number {
    return Math.min(92, Math.max(8, this.getTimelinePercent(node.atSeconds)));
  }

  showTimelinePreview(nodeId: string): void {
    this.hoveredTimelineNodeId.set(nodeId);
  }

  hideTimelinePreview(nodeId: string): void {
    if (this.hoveredTimelineNodeId() === nodeId) {
      this.hoveredTimelineNodeId.set(null);
    }
  }

  onTimelineDotClick(node: InteractiveVideoFlowNode): void {
    if (this.suppressNextTimelineClick) {
      this.suppressNextTimelineClick = false;
      return;
    }
    this.scrollInteractiveNodeIntoView(node.id);
  }

  onTimelineDotPointerDown(event: PointerEvent, node: InteractiveVideoFlowNode): void {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    this.timelineDraggingInteractionId.set(node.id);
    this.hoveredTimelineNodeId.set(node.id);
    this.suppressNextTimelineClick = false;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onTimelineDotPointerMove(event: PointerEvent): void {
    const interactionId = this.timelineDraggingInteractionId();
    if (!interactionId) {
      return;
    }

    const nextSeconds = this.getTimelineSecondsFromPointer(event);
    const current = this.svc.sectionInteractiveVideoTimeline()
      .find(item => item.id === interactionId);
    if (!current || current.atSeconds === nextSeconds) {
      return;
    }

    this.suppressNextTimelineClick = true;
    this.svc.updateInteractiveVideoInteraction(interactionId, {
      atSeconds: nextSeconds,
    });
  }

  onTimelineDotPointerUp(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement;
    if (this.timelineDraggingInteractionId()) {
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
    }
    this.timelineDraggingInteractionId.set(null);
  }

  onTimelineDotPointerCancel(): void {
    this.timelineDraggingInteractionId.set(null);
  }

  nudgeInteractiveTime(interactionId: string, deltaSeconds: number): void {
    const interaction = this.svc.sectionInteractiveVideoTimeline()
      .find(item => item.id === interactionId);
    if (!interaction) {
      return;
    }
    this.svc.updateInteractiveVideoInteraction(interactionId, {
      atSeconds: this.clampInteractiveTime(interaction.atSeconds + deltaSeconds),
    });
  }

  moveInteractiveTimeToBoundary(interactionId: string, boundary: 'start' | 'end'): void {
    const max = this.maxInteractiveTimeSeconds();
    const target = boundary === 'start'
      ? 0
      : max ?? this.getLastTimelineSecond() + 30;
    this.svc.updateInteractiveVideoInteraction(interactionId, {
      atSeconds: this.clampInteractiveTime(target),
    });
  }

  onFlowNodeKeydown(event: KeyboardEvent, node: InteractiveVideoFlowNode): void {
    if (event.target !== event.currentTarget) {
      return;
    }

    const smallStep = event.shiftKey ? this.quickNudgeSeconds() : 1;
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.nudgeInteractiveTime(node.id, -smallStep);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.nudgeInteractiveTime(node.id, smallStep);
        break;
      case 'Home':
        event.preventDefault();
        this.moveInteractiveTimeToBoundary(node.id, 'start');
        break;
      case 'End':
        event.preventDefault();
        this.moveInteractiveTimeToBoundary(node.id, 'end');
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.scrollInteractiveNodeIntoView(node.id);
        break;
    }
  }

  getInteractiveQualityIssueClass(issue: InteractiveVideoAuthoringIssue): string {
    return issue.severity === 'error'
      ? 'rounded-lg border border-red-100 bg-white px-3 py-2 text-xs leading-relaxed text-red-700'
      : 'rounded-lg border border-amber-100 bg-white px-3 py-2 text-xs leading-relaxed text-amber-700';
  }

  getInteractiveQualityIssueIconName(issue: InteractiveVideoAuthoringIssue): string {
    return issue.severity === 'error' ? 'circle-x' : 'alert-triangle';
  }

  focusInteractiveQualityIssue(issue: InteractiveVideoAuthoringIssue): void {
    if (issue.interactionId) {
      this.scrollInteractiveNodeIntoView(issue.interactionId);
    }
  }

  private buildInteractiveVideoFlowNodes(
    timeline: InteractiveVideoInteraction[],
  ): InteractiveVideoFlowNode[] {
    return this.sortInteractiveTimeline(timeline).map((interaction, index) => ({
      id: interaction.id,
      index: index + 1,
      type: interaction.type,
      typeLabel: this.getInteractiveTypeLabel(interaction.type),
      title: interaction.title?.trim() || this.getInteractiveTypeLabel(interaction.type),
      atSeconds: interaction.atSeconds,
      timeLabel: this.formatInteractiveFlowTime(interaction.atSeconds),
      required: interaction.required === true,
      pause: interaction.pause !== false,
    }));
  }

  private formatInteractiveFlowTime(seconds: number | null | undefined): string {
    const safeSeconds = this.toNonNegativeInteger(seconds ?? 0);
    const minutes = Math.floor(safeSeconds / 60);
    const rest = safeSeconds % 60;
    return `${minutes}:${rest.toString().padStart(2, '0')}`;
  }

  private clampInteractiveTime(value: unknown): number {
    const next = this.toNonNegativeInteger(value);
    const max = this.maxInteractiveTimeSeconds();
    return max == null ? next : Math.min(max, next);
  }

  private normalizeOptionalInteractiveTime(value: unknown): number | null {
    if (value == null || value === '') {
      return null;
    }
    return this.clampInteractiveTime(value);
  }

  private getTimelineSecondsFromPointer(event: PointerEvent): number {
    const rail = this.timelineRail()?.nativeElement;
    if (!rail) {
      return 0;
    }

    const rect = rail.getBoundingClientRect();
    const ratio = rect.width <= 0
      ? 0
      : Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    return this.clampInteractiveTime(Math.round(ratio * this.getTimelineScaleMaxSeconds()));
  }

  private getTimelineScaleMaxSeconds(): number {
    return this.maxInteractiveTimeSeconds() ?? Math.max(30, this.getLastTimelineSecond());
  }

  private getLastTimelineSecond(): number {
    const timeline = this.svc.sectionInteractiveVideoTimeline();
    return Math.max(0, ...timeline.map(item => this.toNonNegativeInteger(item.atSeconds)));
  }

  private sortInteractiveTimeline(timeline: InteractiveVideoInteraction[]): InteractiveVideoInteraction[] {
    return timeline
      .map((interaction, sourceIndex) => ({ interaction, sourceIndex }))
      .sort((a, b) => (a.interaction.atSeconds - b.interaction.atSeconds) || (a.sourceIndex - b.sourceIndex))
      .map(item => item.interaction);
  }

  private toNonNegativeInteger(value: unknown): number {
    const next = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(next) ? Math.max(0, Math.round(next)) : 0;
  }

  private async readInteractiveImportSpec(file: File): Promise<InteractiveVideoSpec | null> {
    if (this.isH5PFile(file)) {
      return importInteractiveVideoH5PPackage(await file.arrayBuffer());
    }

    return importInteractiveVideoBundle(JSON.parse(await file.text()));
  }

  private isH5PFile(file: File): boolean {
    const name = file.name.toLowerCase();
    return name.endsWith('.h5p')
      || name.endsWith('.zip')
      || file.type === 'application/h5p'
      || file.type === 'application/zip'
      || file.type === 'application/x-zip-compressed';
  }

  private downloadJsonFile(payload: unknown, filename: string): void {
    this.downloadBlobFile(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
      filename,
    );
  }

  private downloadBlobFile(blob: Blob, filename: string): void {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private getInteractiveExportFileName(extension: 'json' | 'h5p'): string {
    const base = (this.svc.sectionTitle() || 'interactive-video')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
    return `${base || 'interactive-video'}-holilihu-v1.${extension}`;
  }
}
