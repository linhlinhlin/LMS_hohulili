import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';

import { AiKnowledgeService } from './services/ai-knowledge.service';
import { ToastService } from '../../../core/services/toast.service';
import { KnowledgeStatsComponent } from './components/knowledge-stats.component';
import { KnowledgeDocumentListComponent } from './components/knowledge-document-list.component';
import { KnowledgeUploadComponent } from './components/knowledge-upload.component';
import { DeleteConfirmModalComponent } from './components/delete-confirm-modal.component';
import { KnowledgeStats, KnowledgeDocument } from './domain/knowledge.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-ai-knowledge-page',
    imports: [
    KnowledgeStatsComponent,
    KnowledgeDocumentListComponent,
    KnowledgeUploadComponent,
    DeleteConfirmModalComponent
],
    template: `
    <div class="px-6 py-6 max-w-[1400px] mx-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-1">Quản lý Tri thức AI</h1>
        <p class="text-gray-500 text-sm">Quản lý tài liệu và cơ sở tri thức cho AI Chatbot</p>
      </div>

      <!-- Stats Section -->
      <app-knowledge-stats [stats]="stats()"></app-knowledge-stats>

      <div class="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
        <!-- Document List (Main Content) -->
        <div>
          <app-knowledge-document-list
            [documents]="documents()"
            (delete)="onDeleteRequest($event)"
          ></app-knowledge-document-list>
        </div>

        <!-- Sidebar (Upload) -->
        <div class="lg:order-none order-first">
          <app-knowledge-upload
            [isUploading]="isUploading()"
            (upload)="onUpload($event)"
          ></app-knowledge-upload>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <app-delete-confirm-modal
        [isOpen]="isDeleteModalOpen()"
        [documentName]="documentToDelete()?.filename || ''"
        (confirm)="onConfirmDelete()"
        (cancel)="onCancelDelete()"
      ></app-delete-confirm-modal>
    </div>
  `
})
export class AiKnowledgePageComponent implements OnInit {
    private knowledgeService = inject(AiKnowledgeService);
    private toast = inject(ToastService);

    // Signals
    stats = signal<KnowledgeStats | null>(null);
    documents = signal<KnowledgeDocument[]>([]);
    isUploading = signal(false);
    isDeleteModalOpen = signal(false);
    documentToDelete = signal<KnowledgeDocument | null>(null);

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.loadStats();
        this.loadDocuments();
    }

    loadStats() {
        this.knowledgeService.getStats().subscribe({
            next: (data) => this.stats.set(data),
            error: () => { /* Stats are supplementary */ }
        });
    }

    loadDocuments() {
        this.knowledgeService.getDocuments().subscribe({
            next: (data) => this.documents.set(data),
            error: () => { this.toast.error('Không thể tải danh sách tài liệu. Vui lòng thử lại.'); }
        });
    }

    onUpload(event: { file: File, category: string }) {
        this.isUploading.set(true);
        this.knowledgeService.uploadDocument(event.file, event.category).subscribe({
            next: () => {
                this.isUploading.set(false);
                this.loadData(); // Reload data
                this.toast.success('Tải lên thành công! Tài liệu đang được xử lý.');
            },
            error: () => {
                this.isUploading.set(false);
                this.toast.error('Tải lên thất bại. Vui lòng thử lại.');
            }
        });
    }

    onDeleteRequest(doc: KnowledgeDocument) {
        this.documentToDelete.set(doc);
        this.isDeleteModalOpen.set(true);
    }

    onConfirmDelete() {
        const doc = this.documentToDelete();
        if (!doc) return;

        this.knowledgeService.deleteDocument(doc.id).subscribe({
            next: () => {
                this.isDeleteModalOpen.set(false);
                this.documentToDelete.set(null);
                this.loadData(); // Reload data
            },
            error: () => {
                this.toast.error('Xóa thất bại. Vui lòng thử lại.');
            }
        });
    }

    onCancelDelete() {
        this.isDeleteModalOpen.set(false);
        this.documentToDelete.set(null);
    }
}
