import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiKnowledgeService } from './services/ai-knowledge.service';
import { KnowledgeStatsComponent } from './components/knowledge-stats.component';
import { KnowledgeDocumentListComponent } from './components/knowledge-document-list.component';
import { KnowledgeUploadComponent } from './components/knowledge-upload.component';
import { DeleteConfirmModalComponent } from './components/delete-confirm-modal.component';
import { KnowledgeStats, KnowledgeDocument } from './domain/knowledge.types';

@Component({
    selector: 'app-ai-knowledge-page',
    standalone: true,
    imports: [
        CommonModule,
        KnowledgeStatsComponent,
        KnowledgeDocumentListComponent,
        KnowledgeUploadComponent,
        DeleteConfirmModalComponent
    ],
    template: `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Quản lý Tri thức AI</h1>
        <p class="page-subtitle">Quản lý tài liệu và cơ sở tri thức cho AI Chatbot</p>
      </div>

      <!-- Stats Section -->
      <app-knowledge-stats [stats]="stats()"></app-knowledge-stats>

      <div class="content-grid">
        <!-- Document List (Main Content) -->
        <div class="main-content">
          <app-knowledge-document-list
            [documents]="documents()"
            (delete)="onDeleteRequest($event)"
          ></app-knowledge-document-list>
        </div>

        <!-- Sidebar (Upload) -->
        <div class="sidebar">
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
  `,
    styles: [`
    .page-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 4px 0;
    }

    .page-subtitle {
      color: #6b7280;
      font-size: 0.95rem;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 24px;
    }

    @media (max-width: 1024px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
      
      .sidebar {
        order: -1; /* Move upload to top on mobile/tablet */
      }
    }
  `]
})
export class AiKnowledgePageComponent implements OnInit {
    private knowledgeService = inject(AiKnowledgeService);

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
            error: (err) => console.error('Failed to load stats', err)
        });
    }

    loadDocuments() {
        this.knowledgeService.getDocuments().subscribe({
            next: (data) => this.documents.set(data),
            error: (err) => console.error('Failed to load documents', err)
        });
    }

    onUpload(event: { file: File, category: string }) {
        this.isUploading.set(true);
        this.knowledgeService.uploadDocument(event.file, event.category).subscribe({
            next: (res) => {
                console.log('Upload success', res);
                this.isUploading.set(false);
                this.loadData(); // Reload data
                alert('Tải lên thành công! Tài liệu đang được xử lý.');
            },
            error: (err) => {
                console.error('Upload failed', err);
                this.isUploading.set(false);
                alert('Tải lên thất bại. Vui lòng thử lại.');
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
            error: (err) => {
                console.error('Delete failed', err);
                alert('Xóa thất bại. Vui lòng thử lại.');
            }
        });
    }

    onCancelDelete() {
        this.isDeleteModalOpen.set(false);
        this.documentToDelete.set(null);
    }
}
