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
  template: `
    @if (activePreview(); as preview) {
      <div class="wiii-preview-backdrop" role="presentation">
        <section
          class="wiii-preview-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wiii-preview-title"
          data-wiii-id="wiii-preview-diff-panel"
        >
          <header class="wiii-preview-header">
            <div>
              <p class="wiii-preview-kicker">{{ kindLabel(preview.kind) }}</p>
              <h2 id="wiii-preview-title">{{ preview.targetLabel }}</h2>
              <p class="wiii-preview-summary">{{ preview.summary }}</p>
            </div>
            <button
              type="button"
              class="wiii-preview-icon-button"
              data-wiii-id="close-wiii-preview"
              [disabled]="status() === 'applying'"
              (click)="close()"
              aria-label="Dong preview"
            >
              &times;
            </button>
          </header>

          <div class="wiii-preview-body">
            <div class="wiii-preview-status" [class.wiii-preview-status--done]="status() === 'applied'" [class.wiii-preview-status--error]="status() === 'error'">
              <span class="wiii-preview-dot"></span>
              <span>{{ statusLabel() }}</span>
            </div>

            @if (changedFields(preview).length > 0) {
              <div class="wiii-preview-section">
                <h3>Truong se thay doi</h3>
                <div class="wiii-preview-pills">
                  @for (field of changedFields(preview); track field) {
                    <span>{{ fieldLabel(field) }}</span>
                  }
                </div>
              </div>
            }

            @if (preview.kind === 'lesson_patch') {
              <div class="wiii-preview-section">
                <h3>Diff bai hoc</h3>
                <div class="wiii-preview-diff-grid">
                  <article>
                    <span>Hien tai</span>
                    <strong>{{ lessonBefore(preview, 'title') || 'Chua co tieu de' }}</strong>
                    <p>{{ lessonBefore(preview, 'description') || 'Khong co mo ta' }}</p>
                    <p>{{ lessonBefore(preview, 'content_excerpt') || 'Khong co noi dung' }}</p>
                  </article>
                  <article>
                    <span>Wiii de xuat</span>
                    <strong>{{ lessonAfter(preview, 'title') || 'Chua co tieu de' }}</strong>
                    <p>{{ lessonAfter(preview, 'description') || 'Khong co mo ta' }}</p>
                    <p>{{ lessonAfter(preview, 'content_excerpt') || 'Khong co noi dung' }}</p>
                  </article>
                </div>
              </div>

              @if (blockDiffItems(preview).length > 0) {
                <div class="wiii-preview-section">
                  <h3>Block diff</h3>
                  <div class="wiii-preview-block-list">
                    @for (item of blockDiffItems(preview); track blockTrack(item)) {
                      <article class="wiii-preview-block">
                        <span [class]="blockStatusClass(item['status'])">{{ blockStatusLabel(item['status']) }}</span>
                        <div>
                          <p>{{ blockText(item['before']) || 'Trong' }}</p>
                          <p>{{ blockText(item['after']) || 'Trong' }}</p>
                        </div>
                      </article>
                    }
                  </div>
                </div>
              }
            }

            @if (preview.kind === 'quiz_commit') {
              <div class="wiii-preview-section">
                <h3>Quiz plan</h3>
                <dl class="wiii-preview-kv">
                  <div><dt>Che do</dt><dd>{{ planValue(preview, 'quiz_plan', 'mode') || 'create' }}</dd></div>
                  <div><dt>So cau hoi</dt><dd>{{ planValue(preview, 'quiz_plan', 'question_count') || '0' }}</dd></div>
                  <div><dt>Thoi gian</dt><dd>{{ planValue(preview, 'quiz_plan', 'time_limit_minutes') || '30' }} phut</dd></div>
                  <div><dt>Diem dat</dt><dd>{{ planValue(preview, 'quiz_plan', 'passing_score') || '60' }}%</dd></div>
                </dl>
              </div>
            }

            @if (preview.kind === 'quiz_publish') {
              <div class="wiii-preview-section">
                <h3>Publish plan</h3>
                <p class="wiii-preview-warning">Quiz se chi duoc publish sau khi giao vien bam ap dung trong LMS.</p>
                <dl class="wiii-preview-kv">
                  <div><dt>Quiz</dt><dd>{{ planValue(preview, 'publish_plan', 'title') || preview.targetLabel }}</dd></div>
                  <div><dt>Trang thai</dt><dd>{{ planValue(preview, 'publish_plan', 'status') || 'DRAFT' }}</dd></div>
                </dl>
              </div>
            }

            @if (sourceReferences(preview).length > 0) {
              <div class="wiii-preview-section">
                <h3>Nguon tu tai lieu</h3>
                <div class="wiii-preview-source-list">
                  @for (ref of sourceReferences(preview); track sourceTrack(ref, $index)) {
                    <article>
                      <strong>{{ sourceLabel(ref, $index) }}</strong>
                      @if (ref.excerpt) {
                        <p>{{ ref.excerpt }}</p>
                      }
                    </article>
                  }
                </div>
              </div>
            }

            @if (message()) {
              <p class="wiii-preview-message">{{ message() }}</p>
            }
          </div>

          <footer class="wiii-preview-footer">
            <button
              type="button"
              class="wiii-preview-secondary"
              data-wiii-id="cancel-wiii-preview"
              [disabled]="status() === 'applying'"
              (click)="close()"
            >
              Huy
            </button>
            <button
              type="button"
              class="wiii-preview-primary"
              data-wiii-id="apply-wiii-preview"
              [disabled]="status() === 'applying' || status() === 'applied'"
              (click)="approve()"
            >
              {{ status() === 'applying' ? 'Dang ap dung...' : status() === 'applied' ? 'Da ap dung' : 'Ap dung vao LMS' }}
            </button>
          </footer>
        </section>
      </div>
    }
  `,
  styles: [`
    .wiii-preview-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(15, 23, 42, 0.45);
    }

    .wiii-preview-dialog {
      width: min(960px, 100%);
      max-height: min(820px, calc(100vh - 48px));
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #dbe3ef;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 24px 72px rgba(15, 23, 42, 0.22);
    }

    .wiii-preview-header,
    .wiii-preview-footer {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 20px;
      border-bottom: 1px solid #e5eaf2;
    }

    .wiii-preview-footer {
      align-items: center;
      justify-content: flex-end;
      border-top: 1px solid #e5eaf2;
      border-bottom: 0;
      background: #f8fafc;
    }

    .wiii-preview-kicker {
      margin: 0 0 6px;
      font-size: 12px;
      font-weight: 700;
      color: #0056D2;
      text-transform: uppercase;
    }

    h2, h3, p {
      margin: 0;
    }

    h2 {
      font-size: 20px;
      line-height: 1.25;
      color: #0f172a;
    }

    h3 {
      margin-bottom: 10px;
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }

    .wiii-preview-summary {
      margin-top: 8px;
      color: #475569;
      font-size: 14px;
      line-height: 1.55;
    }

    .wiii-preview-body {
      overflow: auto;
      padding: 18px 20px 20px;
      background: #ffffff;
    }

    .wiii-preview-section {
      margin-top: 18px;
    }

    .wiii-preview-status,
    .wiii-preview-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border: 1px solid #c7d7ee;
      border-radius: 8px;
      background: #f1f7ff;
      color: #17406f;
      font-size: 13px;
      font-weight: 600;
    }

    .wiii-preview-status--done {
      border-color: #bbf7d0;
      background: #f0fdf4;
      color: #166534;
    }

    .wiii-preview-status--error {
      border-color: #fecaca;
      background: #fef2f2;
      color: #991b1b;
    }

    .wiii-preview-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: currentColor;
    }

    .wiii-preview-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .wiii-preview-pills span {
      padding: 5px 8px;
      border: 1px solid #c7d7ee;
      border-radius: 999px;
      background: #f8fbff;
      color: #17406f;
      font-size: 12px;
      font-weight: 700;
    }

    .wiii-preview-diff-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .wiii-preview-diff-grid article,
    .wiii-preview-block,
    .wiii-preview-source-list article {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      background: #fbfdff;
    }

    .wiii-preview-diff-grid span,
    .wiii-preview-kv dt {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }

    .wiii-preview-diff-grid strong,
    .wiii-preview-source-list strong {
      display: block;
      margin-bottom: 8px;
      color: #0f172a;
      font-size: 14px;
    }

    .wiii-preview-diff-grid p,
    .wiii-preview-block p,
    .wiii-preview-source-list p,
    .wiii-preview-warning {
      color: #475569;
      font-size: 13px;
      line-height: 1.55;
    }

    .wiii-preview-block-list,
    .wiii-preview-source-list {
      display: grid;
      gap: 10px;
    }

    .wiii-preview-block {
      display: grid;
      grid-template-columns: 96px minmax(0, 1fr);
      gap: 12px;
    }

    .wiii-preview-block span {
      align-self: start;
      justify-self: start;
      padding: 4px 7px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
    }

    .wiii-preview-block__added { background: #dcfce7; color: #166534; }
    .wiii-preview-block__removed { background: #fee2e2; color: #991b1b; }
    .wiii-preview-block__changed { background: #dbeafe; color: #1d4ed8; }
    .wiii-preview-block__unchanged { background: #f1f5f9; color: #475569; }

    .wiii-preview-kv {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin: 0;
    }

    .wiii-preview-kv div {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      background: #fbfdff;
    }

    .wiii-preview-kv dd {
      margin: 0;
      color: #0f172a;
      font-weight: 700;
    }

    .wiii-preview-icon-button,
    .wiii-preview-secondary,
    .wiii-preview-primary {
      border: 0;
      cursor: pointer;
      font-weight: 700;
      transition: background 160ms ease, color 160ms ease, opacity 160ms ease;
    }

    .wiii-preview-icon-button {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #f1f5f9;
      color: #334155;
      font-size: 22px;
      line-height: 1;
    }

    .wiii-preview-secondary,
    .wiii-preview-primary {
      min-height: 38px;
      padding: 0 14px;
      border-radius: 8px;
      font-size: 13px;
    }

    .wiii-preview-secondary {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
    }

    .wiii-preview-primary {
      background: #0056D2;
      color: #ffffff;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    @media (max-width: 720px) {
      .wiii-preview-backdrop {
        align-items: stretch;
        padding: 12px;
      }

      .wiii-preview-dialog {
        max-height: calc(100vh - 24px);
      }

      .wiii-preview-diff-grid,
      .wiii-preview-kv {
        grid-template-columns: 1fr;
      }

      .wiii-preview-block {
        grid-template-columns: 1fr;
      }
    }
  `],
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
      this.message.set('Da ap dung thanh cong. LMS dang tai lai noi dung lien quan.');
      return;
    }
    this.status.set('error');
    this.message.set(result.error || 'Khong the ap dung preview nay.');
  }

  protected kindLabel(kind: string): string {
    switch (kind) {
      case 'lesson_patch':
        return 'Wiii lesson preview';
      case 'quiz_commit':
        return 'Wiii quiz preview';
      case 'quiz_publish':
        return 'Wiii publish preview';
      default:
        return 'Wiii preview';
    }
  }

  protected statusLabel(): string {
    switch (this.status()) {
      case 'applying':
        return 'Dang ap dung preview da duyet vao LMS';
      case 'applied':
        return 'Da ap dung preview trong LMS';
      case 'error':
        return 'Apply bi chan hoac that bai';
      default:
        return 'Dang cho giao vien duyet tren LMS';
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
        return 'Them';
      case 'removed':
        return 'Xoa';
      case 'changed':
        return 'Sua';
      default:
        return 'Giu nguyen';
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

  protected sourceTrack(ref: WiiiSourceReference, index: number): string {
    return `${ref.kind || 'source'}-${ref.page || ref.page_start || index}`;
  }

  protected sourceLabel(ref: WiiiSourceReference, index: number): string {
    const label = ref.label || ref.title || `${ref.kind || 'Nguon'} ${index + 1}`;
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
        return 'Tieu de';
      case 'description':
        return 'Mo ta';
      case 'content':
        return 'Noi dung';
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
