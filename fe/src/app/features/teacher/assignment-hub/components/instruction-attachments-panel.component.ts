import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  computed,
  inject,
  effect,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import {
  AssignmentInstructionAttachmentApi,
  InstructionAttachment,
} from '../../../../api/client/assignment-instruction-attachment.api';
import { PresignedUploadService } from '../../../../core/services/presigned-upload.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  error?: string;
}

/**
 * Panel cho teacher upload + manage instruction attachments của assignment.
 *
 * Pattern Google Classroom: cho phép giáo viên đính kèm các file PDF/Word/sample
 * (đề bài chi tiết, rubric, file mẫu...) bên cạnh rich-text instructions.
 *
 * Upload flow (SOTA — direct R2 không qua server):
 *   1. presignedUpload.upload(file, 'assignments/instructions') trả Observable
 *      với progress events + final URL
 *   2. Sau complete: POST metadata → /api/v3/teacher/assignments/{id}/instruction-attachments
 *   3. Reload list từ BE
 *
 * Drag-drop: dropzone styled, hiển thị visual indicator khi dragover.
 * Multi-file: upload song song, mỗi file có progress bar riêng.
 */
@Component({
  selector: 'app-instruction-attachments-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <section class="iap-panel">
      <header class="iap-header">
        <div>
          <h3 class="iap-title">Tệp đính kèm hướng dẫn</h3>
          <p class="iap-subtitle">PDF, Word, Excel, hình ảnh — học viên có thể tải xuống.</p>
        </div>
        <button type="button" class="iap-add-btn" (click)="filePickerRef()?.nativeElement?.click()">
          <lucide-icon name="paperclip" [size]="16"></lucide-icon>
          <span>Đính kèm</span>
        </button>
      </header>

      <div
        class="iap-dropzone"
        [class.iap-dropzone--active]="isDragOver()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="filePickerRef()?.nativeElement?.click()">
        <lucide-icon name="upload-cloud" [size]="24"></lucide-icon>
        <p>Kéo thả tệp vào đây, hoặc <span class="iap-link">chọn từ máy</span></p>
        <p class="iap-hint">Tối đa 100MB/tệp · PDF · DOCX · XLSX · JPG · PNG</p>
      </div>

      <input
        #filePickerEl
        type="file"
        multiple
        class="iap-input-hidden"
        (change)="onFilesSelected($event)" />

      <!-- Uploading list -->
      @for (item of uploading(); track item.id) {
        <div class="iap-row iap-row--uploading">
          <lucide-icon name="loader" [size]="16" class="iap-spin"></lucide-icon>
          <div class="iap-row-meta">
            <p class="iap-filename">{{ item.name }}</p>
            <div class="iap-progress-track">
              <div class="iap-progress-fill" [style.width.%]="item.progress"></div>
            </div>
          </div>
          <span class="iap-progress-text">{{ item.progress }}%</span>
          @if (item.error) {
            <span class="iap-error">{{ item.error }}</span>
          }
        </div>
      }

      <!-- Existing attachments -->
      @if (attachments().length > 0) {
        <div class="iap-list">
          @for (att of attachments(); track att.id) {
            <div class="iap-row">
              <lucide-icon [name]="iconFor(att.fileType)" [size]="16" class="iap-icon"></lucide-icon>
              <div class="iap-row-meta">
                <a [href]="att.fileUrl" target="_blank" rel="noopener" class="iap-filename iap-link">
                  {{ att.fileName }}
                </a>
                <p class="iap-size">{{ formatSize(att.fileSize) }}</p>
              </div>
              <button type="button" class="iap-trash" (click)="onDelete(att)" aria-label="Xóa tệp">
                <lucide-icon name="trash-2" [size]="14"></lucide-icon>
              </button>
            </div>
          }
        </div>
      } @else if (uploading().length === 0) {
        <p class="iap-empty">Chưa có tệp đính kèm.</p>
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .iap-panel {
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 16px;
      background: #ffffff;
    }
    .iap-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .iap-title { font-size: 14px; font-weight: 600; color: #111827; margin: 0; }
    .iap-subtitle { font-size: 12px; color: #6B7280; margin: 2px 0 0; }
    .iap-add-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 8px; border: 1px solid #0056D2;
      background: #ffffff; color: #0056D2; font-size: 13px; font-weight: 500; cursor: pointer;
      transition: background 0.1s;
    }
    .iap-add-btn:hover { background: rgba(0, 86, 210, 0.05); }

    .iap-dropzone {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 24px 16px; border: 2px dashed #E5E7EB; border-radius: 8px;
      color: #6B7280; cursor: pointer; transition: all 0.15s;
      text-align: center;
    }
    .iap-dropzone:hover {
      border-color: #0056D2; background: rgba(0, 86, 210, 0.02);
    }
    .iap-dropzone--active {
      border-color: #0056D2; background: rgba(0, 86, 210, 0.06);
    }
    .iap-dropzone p { margin: 0; font-size: 13px; }
    .iap-hint { font-size: 11px; color: #9CA3AF; }
    .iap-link { color: #0056D2; text-decoration: underline; }

    .iap-input-hidden { display: none; }

    .iap-list { margin-top: 12px; display: flex; flex-direction: column; gap: 4px; }
    .iap-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; border-radius: 8px;
      transition: background 0.1s;
    }
    .iap-row:hover { background: #F9FAFB; }
    .iap-row--uploading { background: rgba(0, 86, 210, 0.04); }
    .iap-icon { color: #6B7280; flex-shrink: 0; }
    .iap-row-meta { flex: 1; min-width: 0; }
    .iap-filename {
      display: block; font-size: 13px; color: #111827;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .iap-size { font-size: 11px; color: #9CA3AF; margin: 2px 0 0; }
    .iap-progress-track {
      height: 4px; background: #E5E7EB; border-radius: 2px; overflow: hidden;
      margin-top: 4px;
    }
    .iap-progress-fill {
      height: 100%; background: #0056D2; transition: width 0.2s;
    }
    .iap-progress-text { font-size: 11px; color: #6B7280; flex-shrink: 0; }
    .iap-error { font-size: 11px; color: #DC2626; }
    .iap-trash {
      width: 24px; height: 24px; padding: 0; border: none; background: transparent;
      color: #9CA3AF; border-radius: 4px; cursor: pointer; display: flex;
      align-items: center; justify-content: center; transition: all 0.1s;
    }
    .iap-trash:hover { color: #DC2626; background: #FEF2F2; }
    .iap-empty {
      margin: 12px 0 0; padding: 12px; text-align: center;
      font-size: 12px; color: #9CA3AF;
    }
    .iap-spin { animation: iap-spin 1s linear infinite; }
    @keyframes iap-spin { to { transform: rotate(360deg); } }
  `,
})
export class InstructionAttachmentsPanelComponent {
  readonly assignmentId = input<string | undefined>();

  private api = inject(AssignmentInstructionAttachmentApi);
  private presigned = inject(PresignedUploadService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  readonly attachments = signal<InstructionAttachment[]>([]);
  readonly uploading = signal<UploadingFile[]>([]);
  readonly isDragOver = signal(false);
  readonly filePickerRef = viewChild<ElementRef<HTMLInputElement>>('filePickerEl');

  // 100 MB max — matches BE policy. Larger files use multipart upload automatically.
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024;

  constructor() {
    effect(() => {
      const id = this.assignmentId();
      if (id) this.reload(id);
      else this.attachments.set([]);
    });
  }

  reload(assignmentId: string): void {
    this.api.list(assignmentId).subscribe({
      next: (list) => this.attachments.set(list),
      error: () => {/* silent: 404 OK trên assignment mới chưa có attachment */},
    });
  }

  onDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragOver.set(true);
  }
  onDragLeave(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragOver.set(false);
  }
  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragOver.set(false);
    const files = ev.dataTransfer?.files;
    if (files?.length) this.uploadFiles(Array.from(files));
  }
  onFilesSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (input.files?.length) this.uploadFiles(Array.from(input.files));
    input.value = '';
  }

  private uploadFiles(files: File[]): void {
    const id = this.assignmentId();
    if (!id) {
      this.toast.warning('Cần lưu bài tập trước khi đính kèm tệp');
      return;
    }
    files.forEach((file) => this.uploadOne(id, file));
  }

  private uploadOne(assignmentId: string, file: File): void {
    if (file.size > InstructionAttachmentsPanelComponent.MAX_FILE_SIZE) {
      this.toast.error(`"${file.name}": vượt quá 100MB`);
      return;
    }

    const item: UploadingFile = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      size: file.size,
      progress: 0,
    };
    this.uploading.update((arr) => [...arr, item]);

    this.presigned.upload(file, 'assignments/instructions').subscribe({
      next: (ev) => {
        if (ev.type === 'progress') {
          this.uploading.update((arr) =>
            arr.map((u) => (u.id === item.id ? { ...u, progress: ev.progress } : u)),
          );
        } else if (ev.type === 'complete') {
          // Step 2: register metadata
          this.api
            .add(assignmentId, {
              fileName: file.name,
              fileUrl: ev.url,
              storageKey: ev.key,
              fileSize: file.size,
              fileType: file.type || null,
            })
            .subscribe({
              next: (saved) => {
                this.uploading.update((arr) => arr.filter((u) => u.id !== item.id));
                this.attachments.update((arr) => [...arr, saved]);
                this.toast.success(`Đã đính kèm "${file.name}"`);
              },
              error: () => {
                this.uploading.update((arr) =>
                  arr.map((u) => (u.id === item.id ? { ...u, error: 'Lỗi lưu metadata' } : u)),
                );
              },
            });
        }
      },
      error: () => {
        this.uploading.update((arr) =>
          arr.map((u) => (u.id === item.id ? { ...u, error: 'Lỗi tải lên' } : u)),
        );
      },
    });
  }

  async onDelete(att: InstructionAttachment): Promise<void> {
    const id = this.assignmentId();
    if (!id) return;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa tệp đính kèm?',
      message: `Tệp "${att.fileName}" sẽ bị xóa khỏi bài tập. Hành động không thể hoàn tác.`,
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    if (!confirmed) return;

    this.api.delete(id, att.id).subscribe({
      next: () => {
        this.attachments.update((arr) => arr.filter((a) => a.id !== att.id));
        this.toast.success('Đã xóa tệp');
      },
      error: () => this.toast.error('Xóa thất bại'),
    });
  }

  iconFor(fileType: string | null): string {
    if (!fileType) return 'file';
    if (fileType.includes('pdf')) return 'file-text';
    if (fileType.includes('word') || fileType.includes('document')) return 'file-text';
    if (fileType.includes('sheet') || fileType.includes('excel')) return 'file-spreadsheet';
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    return 'file';
  }

  formatSize(bytes: number | null): string {
    if (!bytes) return '';
    const KB = 1024, MB = KB * 1024;
    if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
    if (bytes >= KB) return `${(bytes / KB).toFixed(0)} KB`;
    return `${bytes} B`;
  }
}
