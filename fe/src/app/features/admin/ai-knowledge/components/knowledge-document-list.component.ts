import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KnowledgeDocument } from '../domain/knowledge.types';

@Component({
    selector: 'app-knowledge-document-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="document-list-container">
      <!-- Header / Filters -->
      <div class="list-header">
        <h3 class="list-title">Danh sách tài liệu</h3>
        
        <div class="filters">
          <!-- Search -->
          <div class="search-box">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="search-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input 
              type="text" 
              [(ngModel)]="searchTerm" 
              (ngModelChange)="onSearch()"
              placeholder="Tìm kiếm tài liệu..."
              class="search-input"
            >
          </div>

          <!-- Category Filter -->
          <select 
            [(ngModel)]="selectedCategory" 
            (change)="onFilter()"
            class="category-select"
          >
            <option value="">Tất cả danh mục</option>
            <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
          </select>
        </div>
      </div>

      <!-- Table -->
      <div class="table-responsive">
        <table class="doc-table">
          <thead>
            <tr>
              <th>Tên tài liệu</th>
              <th>Danh mục</th>
              <th>Nodes</th>
              <th>Người đăng</th>
              <th>Ngày đăng</th>
              <th class="actions-col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let doc of filteredDocuments">
              <td>
                <div class="doc-name">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="pdf-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span>{{ doc.filename }}</span>
                </div>
              </td>
              <td>
                <span class="category-badge">{{ doc.category }}</span>
              </td>
              <td>{{ doc.nodesCount || 0 }}</td>
              <td>{{ doc.uploadedBy || 'Admin' }}</td>
              <td>{{ doc.uploadedAt | date:'dd/MM/yyyy HH:mm' }}</td>
              <td class="actions-col">
                <button 
                  class="action-btn delete" 
                  (click)="onDelete(doc)"
                  title="Xóa tài liệu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </td>
            </tr>
            <tr *ngIf="filteredDocuments.length === 0">
              <td colspan="6" class="empty-state">
                Không tìm thấy tài liệu nào.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
    styles: [`
    .document-list-container {
      background: white;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .list-header {
      padding: 20px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .list-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .filters {
      display: flex;
      gap: 12px;
    }

    .search-box {
      position: relative;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      color: #9ca3af;
    }

    .search-input {
      padding: 8px 12px 8px 36px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.9rem;
      width: 240px;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      border-color: #3b82f6;
    }

    .category-select {
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.9rem;
      outline: none;
      background-color: white;
      cursor: pointer;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .doc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    .doc-table th {
      background-color: #f9fafb;
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      color: #4b5563;
      border-bottom: 1px solid #e5e7eb;
    }

    .doc-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      color: #374151;
    }

    .doc-table tr:last-child td {
      border-bottom: none;
    }

    .doc-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: #111827;
    }

    .pdf-icon {
      width: 20px;
      height: 20px;
      color: #ef4444;
    }

    .category-badge {
      background-color: #eff6ff;
      color: #1d4ed8;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .actions-col {
      text-align: right;
    }

    .action-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 4px;
      transition: background-color 0.2s;
      color: #6b7280;
    }

    .action-btn:hover {
      background-color: #f3f4f6;
    }

    .action-btn.delete:hover {
      color: #ef4444;
      background-color: #fef2f2;
    }

    .action-btn svg {
      width: 18px;
      height: 18px;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #6b7280;
    }
  `]
})
export class KnowledgeDocumentListComponent {
    @Input() documents: KnowledgeDocument[] = [];
    @Output() delete = new EventEmitter<KnowledgeDocument>();

    searchTerm: string = '';
    selectedCategory: string = '';

    get categories(): string[] {
        const cats = new Set(this.documents.map(d => d.category));
        return Array.from(cats).sort();
    }

    get filteredDocuments(): KnowledgeDocument[] {
        return this.documents.filter(doc => {
            const matchesSearch = doc.filename.toLowerCase().includes(this.searchTerm.toLowerCase());
            const matchesCategory = this.selectedCategory ? doc.category === this.selectedCategory : true;
            return matchesSearch && matchesCategory;
        });
    }

    onSearch() {
        // Triggered by ngModelChange, logic handled in getter
    }

    onFilter() {
        // Triggered by change, logic handled in getter
    }

    onDelete(doc: KnowledgeDocument) {
        this.delete.emit(doc);
    }
}

