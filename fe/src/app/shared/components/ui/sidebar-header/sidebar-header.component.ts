import { Component, EventEmitter, Output, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-sidebar-header',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="flex flex-col gap-2 p-3 bg-white border-b border-gray-100">
      <div class="flex items-center justify-between">
        <h2 class="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Cấu trúc bài học</h2>
        <div class="flex items-center gap-2">
          <span class="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded">
            {{ publishedCount }}/{{ totalCount }}
          </span>
          <button (click)="toggleExpand()" 
                  class="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  [matTooltip]="allExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'">
            <mat-icon class="text-sm scale-75">{{ allExpanded ? 'unfold_less' : 'unfold_more' }}</mat-icon>
          </button>
        </div>
      </div>
      
      <!-- Global Filter: Slimmed down -->
      <div class="relative group px-1">
        <mat-icon class="absolute left-3 top-2 text-slate-300 group-focus-within:text-blue-500 scale-75 transition-colors">search</mat-icon>
        <input 
          type="text" 
          [(ngModel)]="searchQuery"
          (input)="onSearchChange()"
          placeholder="Tìm nhanh..." 
          class="w-full h-8 bg-slate-50 border-none rounded-lg pl-8 pr-3 text-xs focus:ring-1 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
        />
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class SidebarHeaderComponent {
  @Input() publishedCount = 0;
  @Input() totalCount = 0;
  @Input() allExpanded = false;

  @Output() search = new EventEmitter<string>();
  @Output() toggleAll = new EventEmitter<void>();

  searchQuery = '';

  onSearchChange() {
    this.search.emit(this.searchQuery);
  }

  toggleExpand() {
    this.toggleAll.emit();
  }
}
