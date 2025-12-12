import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-course-assignment',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="bg-white shadow-sm max-w-10xl mx-auto pb-10">
      
      <!-- Header -->
      <div class="bg-white shadow-sm border border-gray-200 h-full flex pb-4 justify-between items-end px-8 py-4">
        <div>
            <h1 class="text-2xl font-bold text-gray-900">Học viên & Lớp học</h1>
            <p class="text-gray-500 mt-1">Quản lý danh sách học viên và lớp học được gán vào khóa học.</p>
        </div>
        <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            <span>Thêm mới</span>
        </button>
      </div>

      <!-- Content Placeholders -->
      <div class="p-8 space-y-8">
        
        <!-- Students Section -->
        <section>
            <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span class="p-1 bg-blue-100 text-blue-600 rounded">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                </span>
                Danh sách học viên
            </h2>
            <div class="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
                <p class="text-gray-500">Chưa có học viên nào được gán vào khóa học này.</p>
            </div>
        </section>

        <!-- Classes Section -->
        <section>
            <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span class="p-1 bg-purple-100 text-purple-600 rounded">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                </span>
                Danh sách lớp học
            </h2>
             <div class="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
                <p class="text-gray-500">Chưa có lớp học nào được gán vào khóa học này.</p>
            </div>
        </section>

      </div>
    </div>
  `
})
export class CourseAssignmentComponent { }
