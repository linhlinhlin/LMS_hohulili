import { ChangeDetectionStrategy, Component, input, output, signal, ElementRef, inject } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { LucideAngularModule } from 'lucide-angular';
import { SectionDraftDTO } from '../../../../services/course-authoring.service';
import { buildCurriculumLabel, stripCurriculumPrefix } from '../../../../utils/curriculum-labels';

type SectionEditorType = 'TEXT' | 'VIDEO' | 'FILE' | 'QUIZ';

@Component({
  selector: 'app-lecture-sections-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DragDropModule, LucideAngularModule],
  templateUrl: './lecture-sections-panel.component.html',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape($event)',
  },
  styles: [`
    @import '../../../course-info/editor-shared';

    :host { display: block; }

    .sections-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.625rem;
    }

    .add-content-wrapper { position: relative; }
    .add-content-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
      padding: 0.375rem 0.75rem;
      border: 1px solid var(--editor-control-border);
      border-radius: var(--editor-control-radius);
      background: #fff;
      color: rgb(0 86 210);
      cursor: pointer;
      transition: border-color 160ms ease, background 160ms ease;
    }
    .add-content-btn:hover {
      border-color: rgba(0, 86, 210, 0.4);
      background: rgba(0, 86, 210, 0.04);
    }
    /* Secondary action: less prominent, subtler border. Primary action ("Thêm
       mục") giữ default style — visual hierarchy rõ giữa 2 actions. */
    .add-content-btn--secondary {
      color: rgb(71 85 105);
      border-color: rgb(226 232 240);
    }
    .add-content-btn--secondary:hover {
      color: rgb(0 86 210);
      border-color: rgba(0, 86, 210, 0.3);
      background: rgba(0, 86, 210, 0.04);
    }
    .add-content-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      z-index: 20;
      min-width: 13rem;
      background: #fff;
      border: 1px solid var(--editor-card-border);
      border-radius: var(--editor-control-radius);
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.10);
      padding: 0.25rem;
      animation: dropdownIn 0.15s ease-out;
    }
    .add-content-option {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      width: 100%;
      padding: 0.5rem 0.625rem;
      border: none;
      border-radius: 0.375rem;
      background: transparent;
      cursor: pointer;
      transition: background 120ms ease;
      text-align: left;
    }
    .add-content-option:hover { background: rgb(248 250 252); }
    .add-content-option__icon {
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .add-content-option__text {
      display: flex;
      flex-direction: column;
      gap: 0.0625rem;
    }
    .add-content-option__label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: rgb(15 23 42);
    }
    .add-content-option__hint {
      font-size: 0.6875rem;
      color: rgb(100 116 139);
    }
    @keyframes dropdownIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .sections-empty {
      padding: 1.5rem;
      text-align: center;
      border: 1px dashed var(--editor-control-border);
      border-radius: var(--editor-control-radius);
    }

    .sections-list {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .section-row {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--editor-control-border);
      border-radius: var(--editor-control-radius);
      background: #fff;
      cursor: pointer;
      transition: border-color 160ms ease, background 160ms ease;
    }
    .section-row:hover {
      border-color: rgba(0, 86, 210, 0.3);
      background: rgba(0, 86, 210, 0.02);
    }
    .section-row--active {
      border-color: rgb(0 86 210);
      background: rgba(0, 86, 210, 0.03);
    }
    .section-row__handle {
      color: rgb(203 213 225);
      cursor: grab;
      flex-shrink: 0;
      padding: 0.125rem;
      margin-top: 0.25rem;
    }
    .section-row__handle:active { cursor: grabbing; }
    .section-row__content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .section-row__top {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .section-row__status {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .section-row__title {
      flex: 1;
      font-size: 0.8125rem;
      font-weight: 500;
      color: rgb(15 23 42);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .section-row__label {
      color: rgb(148 163 184);
      font-size: 0.6875rem;
      font-weight: 600;
      margin-right: 0.375rem;
    }
    .section-row__meta {
      display: flex;
      gap: 0.375rem;
      flex-shrink: 0;
    }
    .section-row__type {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      background: rgb(241 245 249);
      color: rgb(71 85 105);
    }
    .section-row__required {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      background: rgba(0, 86, 210, 0.08);
      color: rgb(0 86 210);
    }
    .section-row__snippet {
      font-size: 0.6875rem;
      color: rgb(100 116 139);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding-left: 1rem;
    }
    .section-row__delete {
      flex-shrink: 0;
      padding: 0.25rem;
      border-radius: 0.25rem;
      color: rgb(203 213 225);
      opacity: 0;
      transition: opacity 160ms ease, color 160ms ease, background 160ms ease;
      cursor: pointer;
      border: none;
      background: transparent;
      margin-top: 0.125rem;
    }
    .section-row:hover .section-row__delete { opacity: 1; }
    .section-row__delete:hover {
      color: rgb(220 38 38);
      background: rgb(254 242 242);
    }

    .cdk-drag-preview {
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
      border-radius: var(--editor-control-radius);
    }
    .cdk-drag-placeholder {
      opacity: 0.4;
    }
  `]
})
export class LectureSectionsPanelComponent {
  private readonly elRef = inject(ElementRef);

  sections = input<SectionDraftDTO[]>([]);
  activeSectionId = input<string | null>(null);

  createSection = output<SectionEditorType>();
  batchVideoUpload = output<void>();
  editSection = output<SectionDraftDTO>();
  deleteSection = output<string>();
  dropSection = output<CdkDragDrop<SectionDraftDTO[]>>();

  isDropdownOpen = signal(false);

  toggleDropdown(): void {
    this.isDropdownOpen.update(value => !value);
  }

  onDocumentClick(event: Event): void {
    if (!this.isDropdownOpen()) return;
    const target = event.target as HTMLElement;
    const wrapper = this.elRef.nativeElement.querySelector('.add-content-wrapper');
    if (wrapper && !wrapper.contains(target)) {
      this.isDropdownOpen.set(false);
    }
  }

  onEscape(event: Event): void {
    if (this.isDropdownOpen()) {
      event.stopPropagation();
      event.preventDefault();
      this.isDropdownOpen.set(false);
    }
  }

  onCreateSection(type: SectionEditorType): void {
    this.isDropdownOpen.set(false);
    this.createSection.emit(type);
  }

  onEditSection(section: SectionDraftDTO): void {
    this.editSection.emit(section);
  }

  onDeleteSection(sectionId: string, event: Event): void {
    event.stopPropagation();
    this.deleteSection.emit(sectionId);
  }

  onDropSection(event: CdkDragDrop<SectionDraftDTO[]>): void {
    this.dropSection.emit(event);
  }

  stripSectionPrefix(title: string): string {
    return stripCurriculumPrefix(title, 'section');
  }

  sectionLabel(index: number): string {
    return buildCurriculumLabel('section', index);
  }

  getSectionTypeLabel(type: string): string {
    switch (type) {
      case 'TEXT': return 'Bài giảng';
      case 'VIDEO': return 'Video';
      case 'FILE': return 'Tài liệu';
      case 'QUIZ': return 'Trắc nghiệm';
      default: return type;
    }
  }

  getSectionSnippet(section: SectionDraftDTO): string {
    switch (section.type) {
      case 'TEXT':
        if (!section.content) return 'Chưa có nội dung';
        return this.stripHtml(section.content).slice(0, 80) || 'Chưa có nội dung';
      case 'VIDEO':
        if (section.videoAssetId) {
          const status = section.videoProcessingStatus;
          if (status === 'PROCESSING') return 'Đang xử lý video...';
          if (status === 'FAILED') return 'Xử lý video thất bại';
          return 'Video đã tải lên';
        }
        if (section.videoUrl) return 'Video từ URL';
        return 'Chưa có video';
      case 'FILE':
        if (section.fileUrl) {
          const name = section.fileUrl.split('/').pop() || 'Tài liệu';
          return name.length > 60 ? name.slice(0, 57) + '...' : name;
        }
        return 'Chưa có tài liệu';
      case 'QUIZ': {
        const quizData = section.quizData;
        if (quizData?.questions?.length) {
          return `${quizData.questions.length} câu hỏi`;
        }
        return 'Chưa có câu hỏi';
      }
      default:
        return '';
    }
  }

  hasContent(section: SectionDraftDTO): boolean {
    switch (section.type) {
      case 'TEXT': return !!section.content?.trim();
      case 'VIDEO': return !!(section.videoAssetId || section.videoUrl);
      case 'FILE': return !!section.fileUrl;
      case 'QUIZ': return !!(section.quizData?.questions?.length);
      default: return false;
    }
  }

  private stripHtml(html: string): string {
    const tmp = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
    return tmp.replace(/\s+/g, ' ').trim();
  }
}
