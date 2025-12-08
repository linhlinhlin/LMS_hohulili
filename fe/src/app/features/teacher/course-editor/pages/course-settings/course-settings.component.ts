import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourseEditorStore } from '../../store/course-editor.store';

@Component({
    selector: 'app-course-settings',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="max-w-10xl mx-auto">
      <!-- Header -->
      <div class="bg-white shadow-sm border border-gray-200 px-6 py-3">
        <h1 class="text-lg font-bold text-gray-900">Cài đặt khóa học</h1>
        <p class="text-gray-500 mt-1">Cấu hình các tùy chọn nâng cao</p>
      </div>

      <!-- Settings Cards -->
      <div class="bg-white shadow-sm border border-gray-200 px-6 py-3">
        <!-- Visibility -->
        <div class="pb-4">
          <h3 class="text-lg font-bold text-gray-900">Hiển thị</h3>
          <div class="space-y-2">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="radio" name="visibility" value="public" class="w-4 h-4 text-blue-600" checked>
              <div>
                <span class="font-medium text-gray-900">Công khai</span>
                <p class="text-sm text-gray-500">Tất cả học viên có thể xem và đăng ký</p>
              </div>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="radio" name="visibility" value="private" class="w-4 h-4 text-blue-600">
              <div>
                <span class="font-medium text-gray-900">Riêng tư</span>
                <p class="text-sm text-gray-500">Chỉ học viên được mời mới có thể truy cập</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Enrollment -->
        <div class="pb-4">
          <h3 class="text-lg font-bold text-gray-900">Đăng ký</h3>
          <div class="space-y-2">
            <label class="flex items-center justify-between cursor-pointer">
              <div>
                <span class="font-medium text-gray-900">Cho phép tự đăng ký</span>
                <p class="text-sm text-gray-500">Học viên có thể tự đăng ký mà không cần phê duyệt</p>
              </div>
              <div class="relative">
                <input type="checkbox" class="sr-only peer" checked>
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
            </label>
            <label class="flex items-center justify-between cursor-pointer">
              <div>
                <span class="font-medium text-gray-900">Giới hạn số lượng học viên</span>
                <p class="text-sm text-gray-500">Đặt số lượng học viên tối đa cho khóa học</p>
              </div>
              <input type="number" min="1" class="w-35 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Không giới hạn">
            </label>
          </div>
        </div>

        <!-- Certificate -->
        <div>
          <h3 class="text-lg font-bold text-gray-900">Chứng chỉ</h3>
          <label class="flex items-center justify-between cursor-pointer">
            <div>
              <span class="font-medium text-gray-900">Cấp chứng chỉ hoàn thành</span>
              <p class="text-sm text-gray-500">Tự động cấp chứng chỉ khi học viên hoàn thành khóa học</p>
            </div>
            <div class="relative">
              <input type="checkbox" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
          </label>
        </div>
      </div>
    </div>

      <!-- Danger Zone -->
    <div class="max-w-10xl mx-auto mt-6">
      <div class="bg-white rounded-xl shadow-sm border border-red-200 px-6 py-3">
        <h3 class="text-lg font-semibold text-red-600 mb-2">Vùng nguy hiểm</h3>
        <div class="flex items-center justify-between">
          <div>
            <span class="font-medium text-gray-900">Xóa khóa học</span>
            <p class="text-sm text-gray-500">Xóa vĩnh viễn khóa học và tất cả dữ liệu liên quan</p>
          </div>
          <button class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
            Xóa khóa học
          </button>
        </div>
      </div>
    </div>
  `
})
export class CourseSettingsComponent {
    store = inject(CourseEditorStore);
}
