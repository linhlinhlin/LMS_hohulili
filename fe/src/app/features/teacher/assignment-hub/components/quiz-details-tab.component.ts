import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-quiz-details-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-gray-200 bg-white shadow-sm px-6 py-10 text-center">
      <p class="text-sm text-gray-500">Chi tiết bài kiểm tra sẽ được cập nhật trong phiên tiếp theo.</p>
    </div>
  `
})
export class QuizDetailsTabComponent {}
