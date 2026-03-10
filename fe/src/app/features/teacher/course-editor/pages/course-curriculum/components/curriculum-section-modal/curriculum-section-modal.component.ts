import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, input, output, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { LucideAngularModule } from 'lucide-angular';

type SectionEditorType = 'TEXT' | 'VIDEO' | 'QUIZ' | 'FILE';

@Component({
  selector: 'app-curriculum-section-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CKEditorModule, LucideAngularModule],
  templateUrl: './curriculum-section-modal.component.html'
})
export class CurriculumSectionModalComponent {
  private sanitizer = inject(DomSanitizer);

  private dialogShell = viewChild<ElementRef<HTMLElement>>('dialogShell');

  editingSectionId = input<string | null>(null);
  sectionType = input<SectionEditorType>('TEXT');
  sectionTitle = input('');
  sectionIsRequired = input(false);
  sectionVideoUrl = input('');
  sectionContent = input('');
  selectedFile = input<File | null>(null);
  sectionFileUrl = input<string | null>(null);
  safePdfUrl = input<SafeResourceUrl | null>(null);
  isDataLoaded = input(false);
  editorHeight = input(380);
  wordCount = input(0);
  isSaving = input(false);
  editor = input<any>(null);
  editorConfig = input<any>(null);

  closeRequested = output<void>();
  saveRequested = output<void>();
  sectionTitleChange = output<string>();
  sectionRequiredChange = output<boolean>();
  sectionVideoUrlChange = output<string>();
  sectionContentChange = output<string>();
  fileSelected = output<Event>();
  clearSelectedFile = output<void>();
  resizeStarted = output<MouseEvent>();
  editorReady = output<any>();
  editorChange = output<any>();

  constructor() {
    afterNextRender(() => {
      this.dialogShell()?.nativeElement.focus();
    });
  }

  onEscape(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeRequested.emit();
  }

  onBackdropClick(): void {
    this.closeRequested.emit();
  }

  onSectionTitleInput(value: string): void {
    this.sectionTitleChange.emit(value);
  }

  onSectionRequiredInput(value: boolean): void {
    this.sectionRequiredChange.emit(value);
  }

  onSectionVideoUrlInput(value: string): void {
    this.sectionVideoUrlChange.emit(value);
  }

  onSectionContentInput(value: string): void {
    this.sectionContentChange.emit(value);
  }

  onFileInput(event: Event): void {
    this.fileSelected.emit(event);
  }

  onClearSelectedFile(): void {
    this.clearSelectedFile.emit();
  }

  onResizeStart(event: MouseEvent): void {
    this.resizeStarted.emit(event);
  }

  onEditorReadyEvent(event: any): void {
    this.editorReady.emit(event);
  }

  onEditorChangeEvent(event: any): void {
    this.editorChange.emit(event);
  }

  requestSave(): void {
    this.saveRequested.emit();
  }

  getDialogTitle(): string {
    return this.editingSectionId() ? 'Chỉnh sửa mục' : 'Thêm mục mới';
  }

  getSubmitLabel(): string {
    return this.editingSectionId() ? 'Cập nhật' : 'Tạo mới';
  }

  getSafeUrl(url: string): SafeResourceUrl {
    const videoId = this.extractYouTubeId(url);
    if (videoId) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`);
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getFileNameFromUrl(url: string): string {
    if (!url) {
      return 'Tệp đính kèm';
    }

    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.substring(pathname.lastIndexOf('/') + 1);
      return decodeURIComponent(fileName) || 'Tệp đính kèm';
    } catch {
      const lastSlash = url.lastIndexOf('/');
      return lastSlash >= 0 ? url.substring(lastSlash + 1) : url;
    }
  }

  private extractYouTubeId(url: string): string | null {
    if (!url) {
      return null;
    }

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }
}
