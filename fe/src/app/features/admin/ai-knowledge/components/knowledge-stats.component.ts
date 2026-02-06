import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

import { KnowledgeStats } from '../domain/knowledge.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-knowledge-stats',
  imports: [],
  template: `
    <div class="stats-grid">
      <!-- Total Documents -->
      <div class="stat-card blue">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats()?.totalDocuments || 0 }}</div>
          <div class="stat-label">Documents</div>
        </div>
      </div>

      <!-- Total Nodes -->
      <div class="stat-card green">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats()?.totalNodes || 0 }}</div>
          <div class="stat-label">Knowledge Nodes</div>
        </div>
      </div>

      <!-- Categories -->
      <div class="stat-card purple">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ categoryCount() }}</div>
          <div class="stat-label">Categories</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid #e5e7eb;
      transition: transform 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon svg {
      width: 24px;
      height: 24px;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #6b7280;
      margin-top: 4px;
    }

    /* Colors */
    .stat-card.blue .stat-icon {
      background-color: #eff6ff;
      color: #3b82f6;
    }

    .stat-card.green .stat-icon {
      background-color: #f0fdf4;
      color: #22c55e;
    }

    .stat-card.purple .stat-icon {
      background-color: #f3e8ff;
      color: #a855f7;
    }
  `]
})
export class KnowledgeStatsComponent {
  stats = input<KnowledgeStats | null>(null);

  categoryCount = computed(() => {
    const s = this.stats();
    if (!s?.categories) return 0;
    return Object.keys(s.categories).length;
  });
}
