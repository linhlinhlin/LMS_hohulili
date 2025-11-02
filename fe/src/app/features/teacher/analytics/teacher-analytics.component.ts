import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeacherService } from '../infrastructure/services/teacher.service';

@Component({
  selector: 'app-teacher-analytics',
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6 space-y-6">
      <h1 class="text-2xl font-bold text-gray-900">Phân tích</h1>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Tổng khóa học</p>
          <p class="mt-2 text-2xl font-semibold text-gray-900">{{ teacher.totalCourses() }}</p>
        </div>
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Tổng học viên</p>
          <p class="mt-2 text-2xl font-semibold text-gray-900">{{ teacher.totalStudents() }}</p>
        </div>
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Doanh thu (mock)</p>
          <p class="mt-2 text-2xl font-semibold text-gray-900">{{ teacher.totalRevenue() | number:'1.0-0' }} đ</p>
        </div>
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Khóa học đang hoạt động</p>
          <p class="mt-2 text-2xl font-semibold text-gray-900">{{ teacher.activeCourses().length }}</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Hiệu quả khóa học</h2>
        <div class="space-y-4">
          <div *ngFor="let c of teacher.courses()" class="">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900">{{ c.title }}</p>
                <p class="text-sm text-gray-500">{{ c.enrolledStudents }} học viên • Rating {{ c.rating }}</p>
              </div>
              <div class="w-40 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div class="bg-indigo-500 h-2" [style.width.%]="(c.rating/5)*100"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherAnalyticsComponent {
  teacher = inject(TeacherService);
}