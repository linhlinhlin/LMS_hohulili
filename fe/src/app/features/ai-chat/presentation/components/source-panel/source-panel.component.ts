/**
 * SourcePanelComponent
 * Inline sidebar panel for displaying source citations
 * 
 * Features:
 * - Accordion/dropdown style - click to expand each source
 * - All sources visible as collapsed items
 * - Expand to see PDF preview and details
 * 
 * Updated: 11/12/2025 - Changed to accordion style
 */
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SourcePanelService } from '../../../application/services/source-panel.service';

@Component({
  selector: 'app-source-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Panel - Inline (not fixed overlay) -->
    <aside class="source-panel" [class.open]="panelService.isOpen()">
      <!-- Header -->
      <header class="panel-header">
        <div class="header-title">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="header-icon">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          <h3>{{ panelService.sources().length }} nguồn tham khảo</h3>
        </div>
        <button class="close-btn" (click)="panelService.close()" aria-label="Đóng">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </header>

      <!-- Accordion List -->
      <div class="accordion-list">
        @for (source of panelService.sources(); track $index; let i = $index) {
          <div class="accordion-item" [class.expanded]="expandedIndex() === i">
            <!-- Accordion Header - Always visible -->
            <button class="accordion-header" (click)="toggleExpand(i)">
              <span class="source-number">{{ i + 1 }}</span>
              <div class="header-info">
                <span class="header-title">{{ source.title || source.documentId || 'Nguồn ' + (i + 1) }}</span>
                @if (source.pageNumber) {
                  <span class="header-page">Trang {{ source.pageNumber }}</span>
                }
              </div>
              <svg class="expand-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
              </svg>
            </button>

            <!-- Accordion Content - Expandable -->
            @if (expandedIndex() === i) {
              <div class="accordion-content">
                <!-- PDF Preview -->
                @if (source.imageUrl) {
                  <div class="preview-container">
                    <img 
                      [src]="source.imageUrl" 
                      [alt]="'Trang ' + source.pageNumber"
                      class="preview-image"
                    />
                    
                    <!-- Bounding Box Overlays -->
                    @if (source.boundingBoxes && source.boundingBoxes.length > 0) {
                      @for (box of source.boundingBoxes; track $index) {
                        <div 
                          class="highlight-box"
                          [style.left.%]="box.x0"
                          [style.top.%]="box.y0"
                          [style.width.%]="box.x1 - box.x0"
                          [style.height.%]="box.y1 - box.y0"
                        ></div>
                      }
                    }
                  </div>
                }

                <!-- Content Text -->
                <div class="source-text">
                  <p>{{ source.content }}</p>
                </div>

                <!-- Actions -->
                @if (source.url || source.imageUrl) {
                  <div class="source-actions">
                    <a 
                      [href]="source.url || source.imageUrl" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      class="action-link"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 19H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0-2-.9-2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                      </svg>
                      Xem nguồn gốc
                    </a>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </aside>
  `,
  styles: [`
    :host {
      display: block;
    }

    /* Panel */
    .source-panel {
      width: 0;
      min-width: 0;
      height: 100%;
      background: #ffffff;
      border-left: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: width 0.3s ease, min-width 0.3s ease;
    }

    .source-panel.open {
      width: 400px;
      min-width: 400px;
    }

    /* Header */
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid #e5e7eb;
      background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
      flex-shrink: 0;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-icon {
      width: 20px;
      height: 20px;
      color: #0056D2;
    }

    .header-title h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      color: #6b7280;
      transition: all 0.15s ease;
    }

    .close-btn:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    .close-btn svg {
      width: 18px;
      height: 18px;
    }

    /* Accordion List */
    .accordion-list {
      flex: 1;
      overflow-y: auto;
    }

    .accordion-item {
      border-bottom: 1px solid #f0f1f3;
    }

    .accordion-item:last-child {
      border-bottom: none;
    }

    /* Accordion Header */
    .accordion-header {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 14px 16px;
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }

    .accordion-header:hover {
      background: #f8fafc;
    }

    .accordion-item.expanded .accordion-header {
      background: #f0f7ff;
      border-left: 3px solid #0056D2;
    }

    .source-number {
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: #6b7280;
      background: #e5e7eb;
      border-radius: 6px;
      flex-shrink: 0;
    }

    .accordion-item.expanded .source-number {
      color: white;
      background: linear-gradient(135deg, #0056D2 0%, #0040a0 100%);
    }

    .header-info {
      flex: 1;
      min-width: 0;
    }

    .header-title {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #1f2937;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header-page {
      display: block;
      font-size: 11px;
      color: #6b7280;
      margin-top: 2px;
    }

    .expand-icon {
      width: 18px;
      height: 18px;
      color: #9ca3af;
      flex-shrink: 0;
      transition: transform 0.2s ease;
    }

    .accordion-item.expanded .expand-icon {
      transform: rotate(180deg);
      color: #0056D2;
    }

    /* Accordion Content */
    .accordion-content {
      padding: 0 16px 16px 54px;
      animation: slideDown 0.2s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Preview Container */
    .preview-container {
      position: relative;
      margin-bottom: 12px;
      border-radius: 8px;
      overflow: hidden;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
    }

    .preview-image {
      width: 100%;
      height: auto;
      display: block;
    }

    .highlight-box {
      position: absolute;
      background: rgba(255, 220, 0, 0.4);
      border: 2px solid #ffc107;
      pointer-events: none;
      animation: pulse-highlight 2s ease-in-out infinite;
    }

    @keyframes pulse-highlight {
      0%, 100% { background: rgba(255, 220, 0, 0.4); }
      50% { background: rgba(255, 220, 0, 0.6); }
    }

    /* Source Text */
    .source-text {
      background: #f8fafc;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .source-text p {
      margin: 0;
      font-size: 13px;
      color: #374151;
      line-height: 1.6;
    }

    /* Actions */
    .source-actions {
      display: flex;
      gap: 10px;
    }

    .action-link {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 500;
      color: #0056D2;
      text-decoration: none;
      padding: 6px 10px;
      background: #e6f1ff;
      border-radius: 6px;
      transition: all 0.15s ease;
    }

    .action-link:hover {
      background: #0056D2;
      color: white;
    }

    .action-link svg {
      width: 14px;
      height: 14px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .source-panel.open {
        width: 340px;
        min-width: 340px;
      }
    }

    @media (max-width: 480px) {
      .source-panel.open {
        width: 100%;
        min-width: 100%;
        position: fixed;
        top: 0;
        right: 0;
        z-index: 999;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourcePanelComponent {
  readonly panelService = inject(SourcePanelService);

  // Track which item is expanded (null = none)
  expandedIndex = signal<number | null>(0); // Default expand first

  toggleExpand(index: number): void {
    if (this.expandedIndex() === index) {
      this.expandedIndex.set(null); // Collapse if clicking same
    } else {
      this.expandedIndex.set(index); // Expand clicked item
    }
  }
}
