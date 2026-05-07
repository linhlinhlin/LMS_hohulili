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

type InteractiveVideoSourceKind = 'upload' | 'youtube';

interface InteractiveVideoFlowChoice {
  id: string;
  label: string;
  metaLabel: string;
  toneClass: string;
}

interface InteractiveVideoFlowNode {
  id: string;
  index: number;
  type: InteractiveVideoInteractionType;
  typeLabel: string;
  title: string;
  atSeconds: number;
  timeLabel: string;
  iconName: string;
  nodeClass: string;
  badgeClass: string;
  choices: InteractiveVideoFlowChoice[];
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
  imports: [FormsModule, LucideAngularModule, EnrichedInputFieldComponent],
  templateUrl: './interactive-video-authoring-panel.component.html',
  styleUrl: './interactive-video-authoring-panel.component.scss',
})
export class InteractiveVideoAuthoringPanelComponent {
  readonly svc = inject(CurriculumEditorService);
  private readonly toast = inject(ToastService);

  readonly sourceKind = input<InteractiveVideoSourceKind>('upload');
  readonly switchToUpload = output<void>();

  readonly interactiveVideoTypes: InteractiveVideoInteractionType[] = ['checkpoint', 'single_choice', 'branch'];
  readonly draggingInteractionId = signal<string | null>(null);
  readonly dropTargetInteractionId = signal<string | null>(null);
  readonly timelineDraggingInteractionId = signal<string | null>(null);
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
    const nextSeconds = suggestNextInteractiveVideoTimeSeconds(
      this.svc.sectionInteractiveVideoTimeline(),
      { durationSeconds: this.svc.sectionVideoDurationSec() },
    );
    const duration = this.svc.sectionVideoDurationSec();
    const nextLabel = this.formatInteractiveFlowTime(nextSeconds);
    if (!duration || !Number.isFinite(duration) || duration <= 0) {
      return `Mốc kế tiếp: ${nextLabel}.`;
    }
    return `Mốc kế tiếp: ${nextLabel} / ${this.formatInteractiveFlowTime(duration)}.`;
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
  readonly quickNudgeLabel = computed(() => `${this.quickNudgeSeconds()} giây`);
  readonly quickNudgeEarlierLabel = computed(() => `Sớm hơn ${this.quickNudgeLabel()}`);
  readonly quickNudgeLaterLabel = computed(() => `Muộn hơn ${this.quickNudgeLabel()}`);
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
      iconName: 'check-circle-2',
      title: 'Luồng tương tác ổn',
      body: 'Thời điểm, lựa chọn và nhánh đang hợp lệ để lưu.',
      toneClass: `${baseClass} border-emerald-200 bg-emerald-50 text-emerald-800`,
    };
  });
  readonly visibleInteractiveVideoQualityIssues = computed(() =>
    this.interactiveVideoQualityIssues().slice(0, 5),
  );

  onInteractiveVideoEnabledChange(enabled: boolean): void {
    this.svc.setInteractiveVideoEnabled(enabled);
  }

  addInteraction(type: InteractiveVideoInteractionType): void {
    this.svc.addInteractiveVideoInteraction(type);
  }

  addSuggestedInteractions(): void {
    this.svc.addSuggestedInteractiveVideoInteractions();
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
      targetTimeSeconds: this.clampInteractiveTime(value),
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
    return this.svc.sectionInteractiveVideoTimeline()
      .filter(interaction => interaction.id !== sourceInteractionId)
      .sort((a, b) => a.atSeconds - b.atSeconds);
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
    if (typeof document === 'undefined') {
      return;
    }

    document.getElementById(this.getInteractiveNodeDomId(interactionId))
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
      ? `${base} sm:grid-cols-[minmax(0,1fr)_7rem_minmax(8rem,10rem)_auto]`
      : `${base} sm:grid-cols-[minmax(0,1fr)_8rem_auto]`;
  }

  getTimelinePercent(seconds: number): number {
    const max = this.getTimelineScaleMaxSeconds();
    if (max <= 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, (seconds / max) * 100));
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

  onFlowNodeDragStart(event: DragEvent, node: InteractiveVideoFlowNode): void {
    this.draggingInteractionId.set(node.id);
    event.dataTransfer?.setData('text/plain', node.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onFlowNodeDragOver(event: DragEvent, node: InteractiveVideoFlowNode): void {
    const sourceId = this.draggingInteractionId();
    if (!sourceId || sourceId === node.id) {
      return;
    }
    event.preventDefault();
    this.dropTargetInteractionId.set(node.id);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onFlowNodeDrop(event: DragEvent, node: InteractiveVideoFlowNode): void {
    event.preventDefault();
    const sourceId = event.dataTransfer?.getData('text/plain') || this.draggingInteractionId();
    this.draggingInteractionId.set(null);
    this.dropTargetInteractionId.set(null);
    if (!sourceId || sourceId === node.id) {
      return;
    }
    this.moveInteractionBefore(sourceId, node.id);
  }

  onFlowNodeDragEnd(): void {
    this.draggingInteractionId.set(null);
    this.dropTargetInteractionId.set(null);
  }

  getInteractiveQualityIssueClass(issue: InteractiveVideoAuthoringIssue): string {
    return issue.severity === 'error'
      ? 'rounded-lg border border-red-100 bg-white px-3 py-2 text-xs leading-relaxed text-red-700'
      : 'rounded-lg border border-amber-100 bg-white px-3 py-2 text-xs leading-relaxed text-amber-700';
  }

  getInteractiveQualityIssueIconName(issue: InteractiveVideoAuthoringIssue): string {
    return issue.severity === 'error' ? 'x-circle' : 'alert-triangle';
  }

  focusInteractiveQualityIssue(issue: InteractiveVideoAuthoringIssue): void {
    if (issue.interactionId) {
      this.scrollInteractiveNodeIntoView(issue.interactionId);
    }
  }

  private moveInteractionBefore(sourceId: string, targetId: string): void {
    const timeline = [...this.svc.sectionInteractiveVideoTimeline()]
      .sort((a, b) => a.atSeconds - b.atSeconds);
    const source = timeline.find(item => item.id === sourceId);
    if (!source) {
      return;
    }

    const withoutSource = timeline.filter(item => item.id !== sourceId);
    const targetIndex = withoutSource.findIndex(item => item.id === targetId);
    if (targetIndex < 0) {
      return;
    }

    const previous = withoutSource[targetIndex - 1] ?? null;
    const target = withoutSource[targetIndex];
    const nextTime = this.chooseTimeBetween(previous?.atSeconds ?? null, target.atSeconds);
    this.svc.updateInteractiveVideoInteraction(sourceId, { atSeconds: nextTime });
  }

  private chooseTimeBetween(previousTime: number | null, nextTime: number | null): number {
    if (previousTime == null && nextTime == null) {
      return 0;
    }
    if (previousTime == null) {
      return this.clampInteractiveTime(Math.max(0, (nextTime ?? 0) - 1));
    }
    if (nextTime == null) {
      return this.clampInteractiveTime(previousTime + 5);
    }
    if (nextTime - previousTime > 1) {
      return this.clampInteractiveTime(Math.round(previousTime + ((nextTime - previousTime) / 2)));
    }
    return this.clampInteractiveTime(nextTime);
  }

  private buildInteractiveVideoFlowNodes(
    timeline: InteractiveVideoInteraction[],
  ): InteractiveVideoFlowNode[] {
    const sorted = [...timeline].sort((a, b) => a.atSeconds - b.atSeconds);
    const byId = new Map(sorted.map(interaction => [interaction.id, interaction]));

    return sorted.map((interaction, index) => ({
      id: interaction.id,
      index: index + 1,
      type: interaction.type,
      typeLabel: this.getInteractiveTypeLabel(interaction.type),
      title: interaction.title?.trim() || this.getInteractiveTypeLabel(interaction.type),
      atSeconds: interaction.atSeconds,
      timeLabel: this.formatInteractiveFlowTime(interaction.atSeconds),
      iconName: this.getInteractiveFlowIconName(interaction.type),
      nodeClass: this.getInteractiveFlowNodeClass(interaction.type),
      badgeClass: this.getInteractiveFlowBadgeClass(interaction.type),
      choices: this.buildInteractiveFlowChoices(interaction, byId),
      required: interaction.required === true,
      pause: interaction.pause !== false,
    }));
  }

  private buildInteractiveFlowChoices(
    interaction: InteractiveVideoInteraction,
    byId: Map<string, InteractiveVideoInteraction>,
  ): InteractiveVideoFlowChoice[] {
    if (!this.isChoiceInteraction(interaction)) {
      return [];
    }

    return (interaction.choices ?? []).map((choice, index) => {
      const label = choice.label?.trim() || `Lựa chọn ${index + 1}`;

      if (interaction.type === 'branch') {
        const target = choice.targetInteractionId ? byId.get(choice.targetInteractionId) : null;
        const missingTarget = Boolean(choice.targetInteractionId && !target);
        return {
          id: choice.id,
          label,
          metaLabel: missingTarget
            ? 'Mất đích'
            : target
              ? `${this.formatInteractiveFlowTime(target.atSeconds)} · ${target.title?.trim() || this.getInteractiveTypeLabel(target.type)}`
              : choice.targetTimeSeconds == null
                ? 'Theo timeline'
                : this.formatInteractiveFlowTime(choice.targetTimeSeconds),
          toneClass: missingTarget
            ? 'flex items-center gap-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700 ring-1 ring-red-100'
            : 'flex items-center gap-2 rounded-md bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200',
        };
      }

      return {
        id: choice.id,
        label,
        metaLabel: choice.isCorrect ? 'Đúng' : 'Chưa đúng',
        toneClass: choice.isCorrect
          ? 'flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-emerald-100'
          : 'flex items-center gap-2 rounded-md bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200',
      };
    });
  }

  private getInteractiveFlowIconName(type: InteractiveVideoInteractionType): string {
    switch (type) {
      case 'single_choice': return 'help-circle';
      case 'branch': return 'shuffle';
      case 'hotspot': return 'mouse-pointer-2';
      default: return 'pause';
    }
  }

  private getInteractiveFlowNodeClass(type: InteractiveVideoInteractionType): string {
    const base = 'interactive-flow-node w-64 rounded-xl border bg-white p-3 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0056D2] focus-visible:ring-offset-2';
    switch (type) {
      case 'single_choice':
        return `${base} border-sky-200`;
      case 'branch':
        return `${base} border-amber-200`;
      case 'hotspot':
        return `${base} border-teal-200`;
      default:
        return `${base} border-slate-200`;
    }
  }

  private getInteractiveFlowBadgeClass(type: InteractiveVideoInteractionType): string {
    const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold';
    switch (type) {
      case 'single_choice':
        return `${base} bg-sky-50 text-sky-700`;
      case 'branch':
        return `${base} bg-amber-50 text-amber-700`;
      case 'hotspot':
        return `${base} bg-teal-50 text-teal-700`;
      default:
        return `${base} bg-slate-100 text-slate-600`;
    }
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
