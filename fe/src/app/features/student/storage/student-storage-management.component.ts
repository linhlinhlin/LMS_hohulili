import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-student-storage-management',
  template: `<div class="p-6"><h1 class="text-2xl font-bold text-gray-900">Lưu trữ ngoại tuyến</h1></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentStorageManagementComponent {}
