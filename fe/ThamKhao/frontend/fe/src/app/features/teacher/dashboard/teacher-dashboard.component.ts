import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TeacherService } from '../infrastructure/services/teacher.service';

@Component({
  selector: 'app-teacher-dashboard',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6 space-y-6">
      <h1 class="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Tổng số khóa học</p>
          <p class="mt-2 text-2xl font-semibold text-gray-900">{{ teacher.totalCourses() }}</p>
        </div>
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Khóa học đang hoạt động</p>
          <p class="mt-2 text-2xl font-semibold text-gray-900">{{ teacher.activeCourses().length }}</p>
        </div>
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Tổng học viên</p>
          <p class="mt-2 text-2xl font-semibold text-gray-900">{{ teacher.totalStudents() }}</p>
        </div>
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Doanh thu (mock)</p>
          <p class="mt-2 text-2xl font-semibold text-gray-900">{{ teacher.totalRevenue() | number:'1.0-0' }} đ</p>
        </div>
      </div>

      <!-- Recent Courses & Assignments -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl shadow p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Khóa học gần đây</h2>
            <a routerLink="/teacher/courses" class="text-sm text-indigo-600">Xem tất cả</a>
          </div>
          <ul class="divide-y divide-gray-100">
            <li *ngFor="let c of teacher.courses() | slice:0:5" class="py-3 flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900">{{ c.title }}</p>
                <p class="text-sm text-gray-500">{{ c.category }} • {{ c.status }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-600">{{ c.enrolledStudents }} HV</p>
                <p class="text-xs text-gray-400">Rating {{ c.rating }}</p>
              </div>
            </li>
          </ul>
        </div>

        <div class="bg-white rounded-xl shadow p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Bài tập</h2>
            <a routerLink="/teacher/assignments" class="text-sm text-indigo-600">Xem tất cả</a>
          </div>
          <ul class="divide-y divide-gray-100">
            <li *ngFor="let a of teacher.assignments() | slice:0:5" class="py-3 flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900">{{ a.title }}</p>
                <p class="text-sm text-gray-500">Course #{{ a.courseId }} • Hạn: {{ a.dueDate }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-600">{{ a.submissions }}/{{ a.totalStudents }} nộp</p>
                <p class="text-xs text-gray-400">TT {{ a.status }}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Students quick view -->
      <div class="bg-white rounded-xl shadow p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Học viên tiêu biểu</h2>
          <a routerLink="/teacher/students" class="text-sm text-indigo-600">Quản lý học viên</a>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div *ngFor="let s of topStudents()" class="border rounded-lg p-4">
            <p class="font-medium text-gray-900">{{ s.name }}</p>
            <p class="text-sm text-gray-500">{{ s.email }}</p>
            <p class="text-sm text-gray-600 mt-1">Điểm TB: {{ s.averageGrade }} • Tiến độ: {{ s.progress }}%</p>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherDashboardComponent {
  teacher = inject(TeacherService);

  topStudents = () => {
    return [...this.teacher.students()].sort((a,b) => (b.averageGrade || 0) - (a.averageGrade || 0)).slice(0, 3);
  };
}