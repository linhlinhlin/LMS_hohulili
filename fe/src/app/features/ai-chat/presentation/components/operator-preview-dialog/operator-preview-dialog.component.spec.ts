import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import {
  WiiiContextService,
  type WiiiOperatorPreviewPanel,
} from '../../../infrastructure/api/wiii-context.service';
import { WiiiOperatorPreviewDialogComponent } from './operator-preview-dialog.component';

describe('WiiiOperatorPreviewDialogComponent', () => {
  let fixture: ComponentFixture<WiiiOperatorPreviewDialogComponent>;
  let previewSubject: BehaviorSubject<WiiiOperatorPreviewPanel | null>;

  beforeEach(async () => {
    previewSubject = new BehaviorSubject<WiiiOperatorPreviewPanel | null>(null);

    await TestBed.configureTestingModule({
      imports: [WiiiOperatorPreviewDialogComponent],
      providers: [
        {
          provide: WiiiContextService,
          useValue: {
            operatorPreview$: previewSubject.asObservable(),
            approveOperatorPreview: jasmine.createSpy('approveOperatorPreview').and.resolveTo({ success: true }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WiiiOperatorPreviewDialogComponent);
    fixture.detectChanges();
  });

  it('keeps old lesson content compact while the proposed draft stays easy to review', () => {
    const currentLongContent = `CURRENT_START ${'nội dung cũ rất dài '.repeat(80)} CURRENT_SENTINEL_END`;
    const preview: WiiiOperatorPreviewPanel = {
      token: 'preview-token',
      kind: 'lesson_patch',
      createdAt: Date.now(),
      summary: 'Giáo viên cần xem phần so sánh và nguồn trước khi áp dụng.',
      applyAction: 'authoring.apply_lesson_patch',
      targetLabel: 'Bản nháp: Hướng dẫn sử dụng HoLiLiHu LMS',
      changedFields: ['title', 'description', 'content'],
      sourceReferences: [{ title: 'Manual', page_start: 1, excerpt: 'Nguồn trích dẫn' }],
      data: {
        lesson_before: {
          title: 'Bài cũ',
          description: 'Mô tả cũ',
          content_excerpt: currentLongContent,
        },
        lesson_after: {
          title: 'Bản nháp: Hướng dẫn sử dụng HoLiLiHu LMS',
          description: 'Mô tả mới cho giáo viên',
          content_excerpt: 'PROPOSED_DIFF_EXCERPT',
          content_preview: 'PROPOSED_FULL_DRAFT giáo viên đọc trước khi áp dụng.',
          learning_objectives: ['Giáo viên kiểm tra nguồn trước khi áp dụng.'],
        },
      },
    };

    previewSubject.next(preview);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const currentDetails = host.querySelector('.wiii-preview-diff-details') as HTMLDetailsElement;
    const proposedDetails = host.querySelector('.wiii-preview-content-preview') as HTMLDetailsElement;

    expect(currentDetails).toBeTruthy();
    expect(currentDetails.open).toBeFalse();
    expect(currentDetails.textContent).toContain('CURRENT_START');
    expect(currentDetails.textContent).not.toContain('CURRENT_SENTINEL_END');
    expect(proposedDetails).toBeTruthy();
    expect(proposedDetails.open).toBeTrue();
    expect(proposedDetails.textContent).toContain('PROPOSED_FULL_DRAFT');
  });

  it('shows only changed block diff items and keeps before text collapsed', () => {
    const changedBefore = `BEFORE_START ${'old block text '.repeat(80)} BEFORE_SENTINEL_END`;
    const preview: WiiiOperatorPreviewPanel = {
      token: 'preview-token',
      kind: 'lesson_patch',
      createdAt: Date.now(),
      summary: 'Giáo viên cần xem thay đổi khối nội dung.',
      applyAction: 'authoring.apply_lesson_patch',
      targetLabel: 'Bản nháp bài học',
      changedFields: ['content'],
      sourceReferences: [],
      data: {
        lesson_before: { title: 'Bài cũ' },
        lesson_after: { title: 'Bài mới' },
        block_diff: {
          items: [
            {
              index: 0,
              status: 'changed',
              before: { label: 'Khối cũ', excerpt: changedBefore },
              after: { label: 'Khối mới', excerpt: 'AFTER_VISIBLE_TEXT' },
            },
            {
              index: 1,
              status: 'unchanged',
              before: { label: 'Giữ nguyên', excerpt: 'UNCHANGED_SENTINEL' },
              after: { label: 'Giữ nguyên', excerpt: 'UNCHANGED_SENTINEL' },
            },
          ],
        },
      },
    };

    previewSubject.next(preview);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const blocks = host.querySelectorAll('.wiii-preview-block');
    const beforeDetails = host.querySelector('.wiii-preview-block__before') as HTMLDetailsElement;

    expect(blocks.length).toBe(1);
    expect(host.textContent).not.toContain('UNCHANGED_SENTINEL');
    expect(beforeDetails).toBeTruthy();
    expect(beforeDetails.open).toBeFalse();
    expect(beforeDetails.textContent).toContain('BEFORE_START');
    expect(beforeDetails.textContent).not.toContain('BEFORE_SENTINEL_END');
    expect(host.textContent).toContain('AFTER_VISIBLE_TEXT');
  });
});
