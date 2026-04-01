import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-quiz-audit-log',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-gray-200 bg-white shadow-sm px-6 py-10 text-center">
      <p class="text-sm text-gray-500">Lịch sử thao tác sẽ được cập nhật trong phiên tiếp theo.</p>
    </div>
  `
})
export class QuizAuditLogComponent {}
