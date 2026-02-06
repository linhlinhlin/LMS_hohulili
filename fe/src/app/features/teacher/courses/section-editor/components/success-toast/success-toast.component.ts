import { Component, inject, input , ChangeDetectionStrategy } from '@angular/core';

import { SectionEditorState } from '../../state/section-editor.state';

@Component({
  selector: 'app-success-toast',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    @if (state.showSuccessToast()) {
      <div class="fixed top-6 right-6 z-50 animate-slideInRight">
        <div class="bg-white border border-green-200 text-gray-900 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[280px]">
          <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <div>
            <p class="font-medium text-sm">{{ title() }}</p>
            <p class="text-xs text-gray-500">{{ message() }}</p>
          </div>
        </div>
      </div>
    }
  `
})
export class SuccessToastComponent {
  readonly state = inject(SectionEditorState);

  title = input('Đã xóa bài học');
  message = input('Thao tác hoàn tất thành công');
}
