/**
 * SourceCitationComponent
 * Displays source citation button that opens sidebar panel
 * 
 * Updated: 11/12/2025 - Simplified to open sidebar instead of inline expansion
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageSource } from '../../../domain/types';
import { SourcePanelService } from '../../../application/services/source-panel.service';

@Component({
  selector: 'app-source-citation',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (sources().length > 0) {
      <div class="source-citations">
        <button class="citations-toggle" (click)="openSourcePanel()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="toggle-icon">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
          </svg>
          <span>{{ sources().length }} nguồn tham khảo</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="arrow-icon">
            <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    }
  `,
  styles: [`
    .source-citations {
      margin-top: 12px;
      margin-left: 52px;
    }

    .citations-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #0056D2;
      background: linear-gradient(135deg, #e6f1ff 0%, #f0f7ff 100%);
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .citations-toggle:hover {
      background: linear-gradient(135deg, #0056D2 0%, #0040a0 100%);
      color: white;
      border-color: #0056D2;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 86, 210, 0.25);
    }

    .toggle-icon {
      width: 16px;
      height: 16px;
    }

    .arrow-icon {
      width: 14px;
      height: 14px;
      opacity: 0.7;
    }

    .citations-toggle:hover .arrow-icon {
      opacity: 1;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourceCitationComponent {
  private readonly sourcePanelService = inject(SourcePanelService);

  // Inputs
  sources = input<MessageSource[]>([]);

  openSourcePanel(): void {
    const sourcesArray = this.sources();
    if (sourcesArray.length > 0) {
      this.sourcePanelService.openWithSources(sourcesArray, 0);
    }
  }
}
