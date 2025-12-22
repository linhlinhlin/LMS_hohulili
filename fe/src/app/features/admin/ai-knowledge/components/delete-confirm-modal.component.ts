import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-delete-confirm-modal',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="onCancel()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">Xác nhận xóa</h3>
          <button class="close-btn" (click)="onCancel()">×</button>
        </div>
        
        <div class="modal-body">
          <p>Bạn có chắc chắn muốn xóa tài liệu <strong>{{ documentName }}</strong>?</p>
          <p class="warning-text">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="warning-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Hành động này không thể hoàn tác. Tất cả các nodes liên quan trong Knowledge Graph sẽ bị xóa.
          </p>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" (click)="onCancel()">Hủy bỏ</button>
          <button class="btn-delete" (click)="onConfirm()">Xóa tài liệu</button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      width: 100%;
      max-width: 450px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      animation: slideIn 0.2s ease-out;
    }

    .modal-header {
      padding: 16px 24px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #9ca3af;
      cursor: pointer;
      line-height: 1;
    }

    .close-btn:hover {
      color: #6b7280;
    }

    .modal-body {
      padding: 24px;
    }

    .warning-text {
      display: flex;
      gap: 12px;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 12px;
      margin-top: 16px;
      color: #991b1b;
      font-size: 0.9rem;
    }

    .warning-icon {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
      color: #ef4444;
    }

    .modal-footer {
      padding: 16px 24px;
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;
      border-bottom-left-radius: 12px;
      border-bottom-right-radius: 12px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn-cancel {
      padding: 8px 16px;
      background-color: white;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      color: #374151;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-cancel:hover {
      background-color: #f3f4f6;
    }

    .btn-delete {
      padding: 8px 16px;
      background-color: #dc2626;
      border: none;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-delete:hover {
      background-color: #b91c1c;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class DeleteConfirmModalComponent {
    @Input() isOpen = false;
    @Input() documentName = '';
    @Output() confirm = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    onConfirm() {
        this.confirm.emit();
    }

    onCancel() {
        this.cancel.emit();
    }
}

