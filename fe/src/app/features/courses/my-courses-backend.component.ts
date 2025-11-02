import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CourseApi } from '../../api/client/course.api';
import { CourseSummary } from '../../api/types/course.types';

@Component({
  selector: 'app-my-courses-backend',
  standalone: true,
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-gray-50 min-h-[60vh]">
      <div class="bg-white shadow-sm">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 class="text-2xl font-bold text-gray-900">Khóa học của tôi (Backend)</h1>
          <p class="text-gray-600">Danh sách lấy trực tiếp từ API</p>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="text-gray-600" *ngIf="loading()">Đang tải khóa học...</div>
        <div class="text-red-600" *ngIf="error()">{{ error() }}</div>

        <div *ngIf="!loading() && !error()">
          <div *ngIf="courses().length === 0" class="p-6 bg-white rounded shadow">Chưa có khóa học nào được gán.</div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div *ngFor="let c of courses()" class="bg-white rounded shadow p-4">
              <div class="font-semibold text-gray-900 mb-1">{{ c.title }}</div>
              <div class="text-sm text-gray-600 mb-2">Mã: {{ c.code }}</div>
              <p class="text-gray-700 text-sm" *ngIf="c.description">{{ c.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MyCoursesBackendComponent {
  private api = inject(CourseApi);
  courses = signal<CourseSummary[]>([]);
  loading = signal(true);
  error = signal('');

  constructor() {
    this.api.enrolledCourses({ page: 1, limit: 10 }).subscribe({
      next: (res) => this.courses.set(res?.data || []),
      error: (err) => this.error.set(err?.message || 'Không tải được khóa học'),
      complete: () => this.loading.set(false)
    });
  }
}
