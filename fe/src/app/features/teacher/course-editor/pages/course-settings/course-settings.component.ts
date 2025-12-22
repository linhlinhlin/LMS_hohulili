import { Component, inject, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourseEditorStore } from '../../store/course-editor.store';

@Component({
  selector: 'app-course-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="bg-white shadow-sm max-w-10xl mx-auto pb-10">
  
  <!-- Header -->
  <div class="bg-white shadow-sm border border-gray-200 h-full flex pb-4 justify-between items-end px-8 py-4">
    <div>
        <h1 class="text-2xl font-bold text-gray-900">Cài đặt khóa học</h1>
        <p class="text-gray-500 mt-1">Quản lý quyền truy cập, lộ trình và các thiết lập vận hành.</p>
    </div>
    <!-- Nút Save thủ công (Nếu không muốn Auto-save) -->
    <button (click)="saveSettings()" [disabled]="isLoading()" 
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
        <span *ngIf="isLoading()" class="animate-spin">Wait...</span>
        <span>Lưu thay đổi</span>
    </button>
  </div>

  <!-- SECTION 1: QUYỀN TRUY CẬP -->
  <section class="bg-white shadow-sm border border-gray-200 space-y-4 px-8 py-4">
    <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
      <span class="p-1 bg-blue-100 text-blue-600 rounded">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      </span>
      Hiển thị & Đăng ký
    </h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Public Card -->
      <div class="bg-white border rounded-xl p-4 cursor-pointer transition-all hover:border-blue-400 group"
           [class.ring-2]="visibility() === 'public'"
           [class.ring-blue-500]="visibility() === 'public'"
           [class.bg-blue-50]="visibility() === 'public'"
           (click)="visibility.set('public')">
        <div class="flex items-center justify-between mb-2">
          <span class="font-bold text-gray-900 group-hover:text-blue-700">Công khai</span>
          <input type="radio" name="vis" [checked]="visibility() === 'public'" class="text-blue-600 pointer-events-none">
        </div>
        <p class="text-sm text-gray-600">Bất kỳ ai cũng có thể tìm thấy và xem nội dung giới thiệu khóa học.</p>
      </div>

      <!-- Private Card -->
      <div class="bg-white border rounded-xl p-4 cursor-pointer transition-all hover:border-blue-400 group"
           [class.ring-2]="visibility() === 'private'"
           [class.ring-blue-500]="visibility() === 'private'"
           [class.bg-blue-50]="visibility() === 'private'"
           (click)="visibility.set('private')">
        <div class="flex items-center justify-between mb-2">
          <span class="font-bold text-gray-900 group-hover:text-blue-700">Riêng tư</span>
          <input type="radio" name="vis" [checked]="visibility() === 'private'" class="text-blue-600 pointer-events-none">
        </div>
        <p class="text-sm text-gray-600">Chỉ những học viên được mời hoặc được cấp quyền mới có thể truy cập.</p>
      </div>
    </div>

    <!-- Toggle Options -->
    <div class="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
      <label class="flex items-center justify-between cursor-pointer">
        <div>
          <span class="block font-medium text-gray-900">Cho phép tự đăng ký</span>
          <span class="text-sm text-gray-500">Học viên nhấn "Tham gia" là vào học ngay, không cần duyệt.</span>
        </div>
        <input type="checkbox" [ngModel]="allowSelfEnrollment()" (ngModelChange)="allowSelfEnrollment.set($event)" 
               class="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500">
      </label>

      <div class="flex items-center justify-between border-t border-gray-200 pt-4">
        <div>
          <span class="block font-medium text-gray-900">Giới hạn sĩ số</span>
          <span class="text-sm text-gray-500">Để trống nếu không giới hạn.</span>
        </div>
        <div class="relative w-32">
          <input type="number" [ngModel]="maxStudents()" (ngModelChange)="maxStudents.set($event)" min="1"
                 class="w-full rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500 pr-8" placeholder="∞">
          <span class="absolute right-3 top-2 text-xs text-gray-400 font-bold pointer-events-none">HV</span>
        </div>
      </div>
    </div>
  </section>

  <!-- SECTION 2: LỘ TRÌNH HỌC -->
  <section class="bg-white shadow-sm border border-gray-200 space-y-4 px-8 py-4">
    <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
      <span class="p-1 bg-purple-100 text-purple-600 rounded">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </span>
      Lộ trình & Điều kiện mở bài
    </h2>

    <!-- Feature 1: Progression Mode -->
    <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="px-5 py-3 bg-gray-50 border-b border-gray-200 font-medium text-gray-900">
        1. Điều kiện học học phần
      </div>
      <div class="p-5 space-y-3">
        <label class="flex items-start gap-3 cursor-pointer group">
          <input type="radio" name="progression" value="free" 
                 [ngModel]="progressionMode()" (ngModelChange)="progressionMode.set($event)"
                 class="mt-1 w-4 h-4 text-purple-600 focus:ring-purple-500">
          <div>
            <span class="font-medium text-gray-900 group-hover:text-purple-700 transition-colors">Luôn mở (Học tự do)</span>
            <p class="text-sm text-gray-500">Học viên có thể học bất kỳ bài nào.</p>
          </div>
        </label>
        
        <label class="flex items-start gap-3 cursor-pointer group">
          <input type="radio" name="progression" value="linear"
                 [ngModel]="progressionMode()" (ngModelChange)="progressionMode.set($event)"
                 class="mt-1 w-4 h-4 text-purple-600 focus:ring-purple-500">
          <div>
            <span class="font-medium text-gray-900 group-hover:text-purple-700 transition-colors">Tuần tự</span>
            <p class="text-sm text-gray-500">Phải hoàn thành bài trước mới được mở bài sau.</p>
          </div>
        </label>
      </div>
    </div>

    <!-- Feature 2: Drip Content -->
    <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="px-5 py-3 bg-gray-50 border-b border-gray-200 font-medium text-gray-900">
        2. Lịch trình mở bài học
      </div>
      <div class="p-5 space-y-4">
        
        <!-- Option A -->
        <label class="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent"
               [class.bg-purple-50]="dripType() === 'instant'"
               [class.border-purple-200]="dripType() === 'instant'">
          <input type="radio" name="drip" value="instant" 
                 [ngModel]="dripType()" (ngModelChange)="dripType.set($event)"
                 class="w-4 h-4 text-purple-600 focus:ring-purple-500">
          <span class="font-medium text-gray-900">Mở tất cả bài học ngay khi đăng ký</span>
        </label>

        <!-- Option B: Date Drip -->
        <label class="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent"
               [class.bg-purple-50]="dripType() === 'date'"
               [class.border-purple-200]="dripType() === 'date'">
          <input type="radio" name="drip" value="date" 
                 [ngModel]="dripType()" (ngModelChange)="dripType.set($event)"
                 class="mt-3 w-4 h-4 text-purple-600 focus:ring-purple-500">
          <div class="flex-1">
            <span class="font-medium text-gray-900 block mb-2">Mở theo lịch trình</span>
            <!-- Natural Language Form -->
            <div class="flex items-center flex-wrap gap-2 text-sm text-gray-600 transition-opacity" [class.opacity-50]="dripType() !== 'date'">
              <span>Tự động mở</span>
              <input type="number" [ngModel]="dateBatchSize()" (ngModelChange)="dateBatchSize.set($event)" [disabled]="dripType() !== 'date'" min="0"
                     class="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500 font-bold text-gray-900 disabled:bg-gray-100">
              <span>bài học, cứ sau mỗi</span>
              <input type="number" [ngModel]="dateIntervalDays()" (ngModelChange)="dateIntervalDays.set($event)" [disabled]="dripType() !== 'date'" min="0"
                     class="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500 font-bold text-gray-900 disabled:bg-gray-100">
              <span>ngày.</span>
            </div>
          </div>
        </label>

        <!-- Option C: Completion Drip -->
        <label class="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent"
               [class.bg-purple-50]="dripType() === 'complete'"
               [class.border-purple-200]="dripType() === 'complete'">
          <input type="radio" name="drip" value="complete" 
                 [ngModel]="dripType()" (ngModelChange)="dripType.set($event)"
                 class="mt-3 w-4 h-4 text-purple-600 focus:ring-purple-500">
          <div class="flex-1">
            <span class="font-medium text-gray-900 block mb-2">Mở dựa trên tiến độ</span>
            <!-- Natural Language Form -->
            <div class="flex items-center flex-wrap gap-2 text-sm text-gray-600 transition-opacity" [class.opacity-50]="dripType() !== 'complete'">
              <span>Sau khi hoàn thành bài trước, chờ thêm</span>
              <input type="number" [ngModel]="completeIntervalDays()" (ngModelChange)="completeIntervalDays.set($event)" [disabled]="dripType() !== 'complete'" min="0"
                     class="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500 font-bold text-gray-900 disabled:bg-gray-100">
              <span>ngày rồi mới mở</span>
              <input type="number" [ngModel]="completeBatchSize()" (ngModelChange)="completeBatchSize.set($event)" [disabled]="dripType() !== 'complete'" min="0"
                     class="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500 font-bold text-gray-900 disabled:bg-gray-100">
              <span>bài học tiếp theo.</span>
            </div>
          </div>
        </label>

      </div>
    </div>
  </section>

  <!-- SECTION 3: CHỨNG CHỈ -->
  <section class="bg-white shadow-sm border border-gray-200 p-5 flex items-center justify-between shadow-sm px-8 py-4">
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
         <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <div>
        <h3 class="font-bold text-gray-900">Chứng chỉ hoàn thành</h3>
        <p class="text-sm text-gray-500 mt-0.5">Hệ thống tự động cấp file PDF khi tiến độ đạt 100%.</p>
      </div>
    </div>
    <label class="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" [ngModel]="autoCertificate()" (ngModelChange)="autoCertificate.set($event)" class="sr-only peer">
      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
    </label>
  </section>

  <!-- DANGER ZONE -->
  <section class="bg-red-50 border border-red-200 rounded-xl p-6 mt-8 px-8 py-4">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="font-bold text-red-700">Vùng nguy hiểm</h3>
        <p class="text-sm text-red-600/80 mt-1">Các hành động dưới đây không thể hoàn tác.</p>
      </div>
      <button (click)="deleteCourse()" class="px-4 py-2 bg-white border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors shadow-sm">
        Xóa khóa học này
      </button>
    </div>
  </section>

</div>
  `
})
export class CourseSettingsComponent {
  store = inject(CourseEditorStore);

  // Trạng thái Loading giả lập
  isLoading = signal(false);

  // --- SIGNALS STATE ---
  visibility = signal<'public' | 'private'>('public');
  allowSelfEnrollment = signal(true);
  maxStudents = signal<number | null>(null);
  autoCertificate = signal(false);
  progressionMode = signal<'free' | 'linear'>('free');
  dripType = signal<'instant' | 'date' | 'complete'>('instant');
  dripBatchSize = signal(1);
  dripIntervalDays = signal(7);

  dateBatchSize = signal(1);
  dateIntervalDays = signal(1);

  completeBatchSize = signal(1);
  completeIntervalDays = signal(0);

  constructor() {
    // [QUAN TRỌNG] Đồng bộ dữ liệu từ Store vào Local Signals khi component load
    effect(() => {
      const tree = this.store.courseTree();
      if (tree && tree.settings) {
        // Untracked để tránh vòng lặp vô tận nếu logic phức tạp
        untracked(() => {
          this.visibility.set(tree.settings?.visibility || 'public');
          this.allowSelfEnrollment.set(tree.settings?.allowSelfEnrollment ?? true);
          this.maxStudents.set(tree.settings?.maxStudents || null);
          this.autoCertificate.set(tree.settings?.autoCertificate ?? false);
          this.progressionMode.set(tree.settings?.progressionMode || 'free');
          this.dripType.set(tree.settings?.dripType || 'instant');
          this.completeBatchSize.set(tree.settings?.completeBatchSize || 1);
          this.dateBatchSize.set(tree.settings?.dateBatchSize || 1);
          this.dateIntervalDays.set(tree.settings?.dateIntervalDays || 1);
          this.completeIntervalDays.set(tree.settings?.completeIntervalDays || 0);
        });
      }
    });
  }

  saveSettings() {
    this.isLoading.set(true);

    // Gom dữ liệu từ Signals thành Object
    const payload = {
      visibility: this.visibility(),
      allowSelfEnrollment: this.allowSelfEnrollment(),
      maxStudents: this.maxStudents(),
      autoCertificate: this.autoCertificate(),
      progressionMode: this.progressionMode(),
      dripType: this.dripType(),
      dateBatchSize: this.dateBatchSize(),
      dateIntervalDays: this.dateIntervalDays(),
      completeBatchSize: this.completeBatchSize(),
      completeIntervalDays: this.completeIntervalDays()
    };

    console.log('Saving settings:', payload);

    // Gọi Store để lưu (Giả lập)
    // this.store.updateSettings(payload).then(...)

    setTimeout(() => this.isLoading.set(false), 1000);
  }

  deleteCourse() {
    if (confirm('Bạn có chắc chắn muốn xóa khóa học này? Hành động này không thể hoàn tác!')) {
      console.log('Deleting course...');
      // this.store.deleteCourse();
    }
  }
}

