import { Component , ChangeDetectionStrategy } from '@angular/core';

import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-curriculum-empty-state',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="bg-white shadow-sm border border-gray-200 flex-grow flex items-center justify-center">
      <div class="text-center p-8 max-w-md">
        <div class="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-6 rounded-2xl shadow-inner">
          <lucide-icon name="layout" [size]="40" class="text-slate-400"></lucide-icon>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">Chọn nội dung để chỉnh sửa</h3>
        <p class="text-gray-500 text-sm mb-6">Chọn chương, bài học hoặc mục nội dung từ sidebar để bắt đầu chỉnh sửa</p>
        <div class="flex items-center justify-center gap-4 text-xs text-gray-400">
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>Video</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-amber-500"></div>
            <span>Tài liệu</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-rose-500"></div>
            <span>Trắc nghiệm</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-slate-400"></div>
            <span>Văn bản</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CurriculumEmptyStateComponent {}
