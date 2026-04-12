import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { LucideAngularModule } from 'lucide-angular';
import { SectionDraftDTO } from '../../../../services/course-authoring.service';

type SectionEditorType = 'TEXT' | 'VIDEO' | 'FILE' | 'QUIZ';

@Component({
  selector: 'app-lecture-sections-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DragDropModule, LucideAngularModule],
  templateUrl: './lecture-sections-panel.component.html',
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
    .sections-header__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }
    .sections-add-btn {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.3rem 0.625rem;
      border: 1px solid var(--editor-control-border);
      border-radius: var(--editor-control-radius);
      background: #fff;
      color: rgb(71 85 105);
      cursor: pointer;
      transition: border-color 160ms ease, color 160ms ease, background 160ms ease;
    }
    .sections-add-btn:hover {
      border-color: rgba(0, 86, 210, 0.4);
      color: rgb(0 86 210);
      background: rgba(0, 86, 210, 0.04);
    }
    .sections-add-btn--file:hover {
      border-color: rgba(217, 119, 6, 0.4);
      color: rgb(180 83 9);
      background: rgba(245, 158, 11, 0.06);
    }
    .sections-add-btn--quiz:hover {
      border-color: rgba(139, 92, 246, 0.4);
      color: rgb(109 40 217);
      background: rgba(139, 92, 246, 0.06);
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
      align-items: center;
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
    .section-row__handle {
      color: rgb(203 213 225);
      cursor: grab;
      flex-shrink: 0;
      padding: 0.125rem;
    }
    .section-row__handle:active { cursor: grabbing; }
    .section-row__content {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
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
    }
    .section-row:hover .section-row__delete { opacity: 1; }
    .section-row__delete:hover {
      color: rgb(220 38 38);
      background: rgb(254 242 242);
    }

    /* CDK Drag */
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
  sections = input<SectionDraftDTO[]>([]);

  createSection = output<SectionEditorType>();
  editSection = output<SectionDraftDTO>();
  deleteSection = output<string>();
  dropSection = output<CdkDragDrop<SectionDraftDTO[]>>();

  onCreateSection(type: SectionEditorType): void {
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
    const pattern = /^\d+\.\d+[.:.]\s*/;
    const match = title.match(pattern);
    if (!match) return title;
    const stripped = title.slice(match[0].length).trim();
    return stripped || 'Chưa đặt tên';
  }

  getSectionTypeLabel(type: string): string {
    switch (type) {
      case 'TEXT':
        return 'Bài giảng';
      case 'VIDEO':
        return 'Video';
      case 'FILE':
        return 'Tài liệu';
      case 'QUIZ':
        return 'Trắc nghiệm';
      default:
        return type;
    }
  }
}
