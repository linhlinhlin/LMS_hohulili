import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';

import {
  WiiiContextService,
  type WiiiOperatorPreviewPanel,
  type WiiiSourceReference,
} from '../../../infrastructure/api/wiii-context.service';

type PreviewStatus = 'idle' | 'applying' | 'applied' | 'error';

@Component({
  selector: 'app-wiii-operator-preview-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './operator-preview-dialog.component.html',
  styleUrl: './operator-preview-dialog.component.scss',
})
export class WiiiOperatorPreviewDialogComponent implements OnInit, OnDestroy {
  private readonly contextService = inject(WiiiContextService);
  private sub?: Subscription;

  protected readonly activePreview = signal<WiiiOperatorPreviewPanel | null>(null);
  protected readonly status = signal<PreviewStatus>('idle');
  protected readonly message = signal('');

  ngOnInit(): void {
    this.sub = this.contextService.operatorPreview$.subscribe((preview) => {
      this.activePreview.set(preview);
      this.status.set('idle');
      this.message.set('');
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  protected close(): void {
    if (this.status() === 'applying') {
      return;
    }
    this.activePreview.set(null);
    this.status.set('idle');
    this.message.set('');
  }

  protected async approve(): Promise<void> {
    const preview = this.activePreview();
    if (!preview || this.status() === 'applying') {
      return;
    }
    this.status.set('applying');
    this.message.set('');
    const result = await this.contextService.approveOperatorPreview(preview.token);
    if (result.success) {
      this.status.set('applied');
      this.message.set('Đã áp dụng thành công. LMS đang tải lại nội dung liên quan.');
      return;
    }
    this.status.set('error');
    this.message.set(result.error || 'Không thể áp dụng bản xem trước này.');
  }

  protected kindLabel(kind: string): string {
    switch (kind) {
      case 'lesson_patch':
        return 'Wiii - xem trước bài học';
      case 'course_plan':
        return 'Wiii - xem trước cấu trúc khóa học';
      case 'quiz_commit':
        return 'Wiii - xem trước bài kiểm tra';
      case 'quiz_publish':
        return 'Wiii - xem trước phát hành';
      default:
        return 'Wiii - bản xem trước';
    }
  }

  protected statusLabel(): string {
    switch (this.status()) {
      case 'applying':
        return 'Đang áp dụng bản xem trước đã duyệt vào LMS';
      case 'applied':
        return 'Đã áp dụng bản xem trước trong LMS';
      case 'error':
        return 'Áp dụng bị chặn hoặc thất bại';
      default:
        return 'Đang chờ giáo viên duyệt trên LMS';
    }
  }

  protected primaryActionLabel(): string {
    switch (this.status()) {
      case 'applying':
        return 'Đang áp dụng...';
      case 'applied':
        return 'Đã áp dụng';
      default:
        return 'Áp dụng vào LMS';
    }
  }

  protected changedFields(preview: WiiiOperatorPreviewPanel): string[] {
    return preview.changedFields;
  }

  protected sourceReferences(preview: WiiiOperatorPreviewPanel): WiiiSourceReference[] {
    return preview.sourceReferences;
  }

  protected lessonBefore(preview: WiiiOperatorPreviewPanel, field: string): string {
    return this.objectValue(preview.data['lesson_before'], field);
  }

  protected lessonAfter(preview: WiiiOperatorPreviewPanel, field: string): string {
    return this.objectValue(preview.data['lesson_after'], field);
  }

  protected blockDiffItems(preview: WiiiOperatorPreviewPanel): Array<Record<string, unknown>> {
    const diff = preview.data['block_diff'];
    if (!diff || typeof diff !== 'object' || Array.isArray(diff)) {
      return [];
    }
    const items = (diff as Record<string, unknown>)['items'];
    return Array.isArray(items)
      ? items.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
      : [];
  }

  protected blockTrack(item: Record<string, unknown>): string {
    return `${item['index'] || 0}-${item['status'] || 'unknown'}`;
  }

  protected blockStatusClass(status: unknown): string {
    return `wiii-preview-block__${String(status || 'unchanged')}`;
  }

  protected blockStatusLabel(status: unknown): string {
    switch (String(status || 'unchanged')) {
      case 'added':
        return 'Thêm';
      case 'removed':
        return 'Xóa';
      case 'changed':
        return 'Sửa';
      default:
        return 'Giữ nguyên';
    }
  }

  protected blockText(value: unknown): string {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return '';
    }
    const item = value as Record<string, unknown>;
    const label = String(item['label'] || item['type'] || '').trim();
    const excerpt = String(item['excerpt'] || '').trim();
    return [label, excerpt].filter(Boolean).join(': ');
  }

  protected planValue(preview: WiiiOperatorPreviewPanel, planKey: string, field: string): string {
    return this.objectValue(preview.data[planKey], field);
  }

  protected coursePlan(preview: WiiiOperatorPreviewPanel): Record<string, unknown> {
    const plan = preview.data['course_plan'];
    return plan && typeof plan === 'object' && !Array.isArray(plan)
      ? plan as Record<string, unknown>
      : {};
  }

  protected coursePlanValue(preview: WiiiOperatorPreviewPanel, field: string): string {
    return this.objectValue(preview.data['course_plan'], field);
  }

  protected courseChapters(preview: WiiiOperatorPreviewPanel): Array<Record<string, unknown>> {
    const chapters = this.coursePlan(preview)['chapters'];
    return Array.isArray(chapters)
      ? chapters.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
      : [];
  }

  protected chapterLessons(chapter: Record<string, unknown>): Array<Record<string, unknown>> {
    const lessons = chapter['lessons'];
    return Array.isArray(lessons)
      ? lessons.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
      : [];
  }

  protected chapterObjectives(chapter: Record<string, unknown>): string[] {
    const objectives = chapter['learning_objectives'] || chapter['learningObjectives'];
    return Array.isArray(objectives)
      ? objectives.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
  }

  protected itemValue(item: Record<string, unknown>, field: string): string {
    return String(item[field] || '').trim();
  }

  protected chapterTrack(chapter: Record<string, unknown>, index: number): string {
    return `${index}-${chapter['title'] || 'chapter'}`;
  }

  protected lessonTrack(lesson: Record<string, unknown>, index: number): string {
    return `${index}-${lesson['title'] || 'lesson'}`;
  }

  protected sourceTrack(ref: WiiiSourceReference, index: number): string {
    return `${ref.kind || 'source'}-${ref.page || ref.page_start || index}`;
  }

  protected sourceLabel(ref: WiiiSourceReference, index: number): string {
    const label = ref.label || ref.title || `${ref.kind || 'Nguồn'} ${index + 1}`;
    const pageStart = ref.page_start ?? ref.page;
    const pageText = pageStart
      ? ref.page_end && ref.page_end !== pageStart
        ? `, trang ${pageStart}-${ref.page_end}`
        : `, trang ${pageStart}`
      : '';
    return `${label}${pageText}`;
  }

  protected fieldLabel(field: string): string {
    switch (field) {
      case 'title':
        return 'Tiêu đề';
      case 'description':
        return 'Mô tả';
      case 'content':
        return 'Nội dung';
      case 'course_structure':
        return 'Cấu trúc khóa học';
      default:
        return field;
    }
  }

  private objectValue(source: unknown, field: string): string {
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return '';
    }
    return String((source as Record<string, unknown>)[field] || '').trim();
  }
}
