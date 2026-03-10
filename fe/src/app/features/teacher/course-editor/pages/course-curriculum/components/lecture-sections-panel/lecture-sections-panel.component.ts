import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { LucideAngularModule } from 'lucide-angular';
import { SectionDraftDTO } from '../../../../services/course-authoring.service';

type SectionEditorType = 'TEXT' | 'VIDEO' | 'FILE' | 'QUIZ';

@Component({
  selector: 'app-lecture-sections-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DragDropModule, LucideAngularModule],
  templateUrl: './lecture-sections-panel.component.html'
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
