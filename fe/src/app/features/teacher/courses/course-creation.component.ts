import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CourseApi } from '../../../api/client/course.api';
import { CreateCourseRequest, DeliveryMode } from '../../../api/types/course.types';
import { CourseAuthoringService, CategoryDTO } from '../course-editor/services/course-authoring.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-course-creation',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="max-w-3xl mx-auto p-6">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Tạo khóa học mới</h1>
        <p class="text-sm text-gray-500 mt-1">Hoàn thành 3 bước để tạo khóa học của bạn</p>
      </div>

      <!-- Stepper -->
      <div class="flex items-center justify-center mb-8">
        @for (s of steps; track s.num; let i = $index) {
          <div class="flex items-center">
            <div class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                   [class]="currentStep() > s.num ? 'bg-green-500 text-white' :
                            currentStep() === s.num ? 'bg-[#0056D2] text-white shadow-lg ring-4 ring-[#0056D2]/10' :
                            'bg-gray-200 text-gray-500'">
                @if (currentStep() > s.num) {
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                } @else {
                  {{ s.num }}
                }
              </div>
              <span class="text-sm font-medium hidden sm:inline"
                    [class]="currentStep() >= s.num ? 'text-gray-900' : 'text-gray-400'">
                {{ s.label }}
              </span>
            </div>
            @if (i < steps.length - 1) {
              <div class="w-12 sm:w-20 h-0.5 mx-3 transition-colors"
                   [class]="currentStep() > s.num ? 'bg-green-400' : 'bg-gray-200'"></div>
            }
          </div>
        }
      </div>

      <!-- Step Content -->
      <div class="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <!-- Step 1: Basic Info -->
        @if (currentStep() === 1) {
          <div class="p-6 space-y-5">
            <div class="border-b border-gray-100 pb-4 mb-2">
              <h2 class="text-lg font-semibold text-gray-900">Thông tin cơ bản</h2>
              <p class="text-sm text-gray-500 mt-0.5">Chọn hình thức giảng dạy, tên và danh mục</p>
            </div>

            <!-- Delivery Mode Selector -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-3">Hình thức giảng dạy <span class="text-red-500">*</span></label>
              <div class="grid grid-cols-2 gap-3">
                <button type="button" (click)="setDeliveryMode('SELF_PACED')"
                        class="relative flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left"
                        [class]="selectedMode() === 'SELF_PACED'
                          ? 'border-[#0056D2] bg-[#0056D2]/5 ring-1 ring-[#0056D2]/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'">
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                         [class]="selectedMode() === 'SELF_PACED' ? 'bg-[#0056D2] text-white' : 'bg-gray-100 text-gray-500'">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                    <span class="font-semibold text-sm text-gray-900">Khóa học online</span>
                  </div>
                  <p class="text-xs text-gray-500 leading-relaxed">Học viên tự học theo tiến độ. Bao gồm video, bài giảng, quiz tự luyện.</p>
                  @if (selectedMode() === 'SELF_PACED') {
                    <div class="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#0056D2] flex items-center justify-center">
                      <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                    </div>
                  }
                </button>

                <button type="button" (click)="setDeliveryMode('INSTRUCTOR_LED')"
                        class="relative flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left"
                        [class]="selectedMode() === 'INSTRUCTOR_LED'
                          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200'
                          : 'border-gray-200 hover:border-gray-300 bg-white'">
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                         [class]="selectedMode() === 'INSTRUCTOR_LED' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                      </svg>
                    </div>
                    <span class="font-semibold text-sm text-gray-900">Lớp học</span>
                  </div>
                  <p class="text-xs text-gray-500 leading-relaxed">Giảng dạy trực tiếp với lớp học, bài tập, bảng điểm, kiểm tra.</p>
                  @if (selectedMode() === 'INSTRUCTOR_LED') {
                    <div class="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                    </div>
                  }
                </button>
              </div>
            </div>

            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tên khóa học <span class="text-red-500">*</span></label>
              <input [formControl]="titleControl" type="text"
                     class="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] transition-colors"
                     placeholder="VD: Điều khiển tàu biển nâng cao" />
              @if (titleControl.invalid && titleControl.touched) {
                <div class="text-sm text-red-600 mt-1">Tên khóa học bắt buộc, tối đa 255 ký tự</div>
              }
            </div>

            <!-- Category -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Danh mục <span class="text-red-500">*</span></label>
              @if (loadingCategories()) {
                <div class="text-sm text-gray-500 py-2">Đang tải danh mục...</div>
              } @else {
                <select [formControl]="categoryControl"
                        class="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] transition-colors">
                  <option value="">-- Chọn danh mục --</option>
                  @for (cat of categories(); track cat.id) {
                    <option [value]="cat.id">{{ cat.name }}</option>
                  }
                </select>
              }
              @if (categoryControl.invalid && categoryControl.touched) {
                <div class="text-sm text-red-600 mt-1">Vui lòng chọn danh mục</div>
              }
            </div>

            @if (selectedPrefix()) {
              <div class="bg-[#0056D2]/5 border border-[#0056D2]/20 rounded-lg px-4 py-2 text-sm text-[#004BB5]">
                Mã khóa học sẽ được tự động tạo: <strong>{{ selectedPrefix() }}-xxx</strong>
              </div>
            }
          </div>
        }

        <!-- Step 2: Description & Price -->
        @if (currentStep() === 2) {
          <div class="p-6 space-y-5">
            <div class="border-b border-gray-100 pb-4 mb-2">
              <h2 class="text-lg font-semibold text-gray-900">Mô tả & Giá</h2>
              <p class="text-sm text-gray-500 mt-0.5">Thêm mô tả và thiết lập giá cho khóa học</p>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả khóa học</label>
              <textarea [formControl]="descriptionControl" rows="5"
                        class="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] transition-colors"
                        placeholder="Mô tả ngắn gọn về khóa học..."></textarea>
              <p class="text-xs text-gray-400 mt-1">Có thể bỏ qua và cập nhật sau trong trang chỉnh sửa</p>
            </div>

            <!-- Price Type -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-3">Loại giá</label>
              <div class="flex gap-3">
                <button type="button" (click)="priceType.set('FREE')"
                        class="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all"
                        [class]="priceType() === 'FREE' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                       [class]="priceType() === 'FREE' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path>
                    </svg>
                  </div>
                  <div>
                    <span class="font-semibold text-sm text-gray-900 block">Miễn phí</span>
                    <span class="text-xs text-gray-500">Học viên đăng ký tự do</span>
                  </div>
                </button>

                <button type="button" (click)="priceType.set('PAID')"
                        class="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all"
                        [class]="priceType() === 'PAID' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                       [class]="priceType() === 'PAID' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <span class="font-semibold text-sm text-gray-900 block">Trả phí</span>
                    <span class="text-xs text-gray-500">Thiết lập giá khóa học</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Price Fields (conditional) -->
            @if (priceType() === 'PAID') {
              <div class="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Giá gốc (VND)</label>
                  <input [formControl]="priceControl" type="number" min="0" step="10000"
                         class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                         placeholder="0" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Giá khuyến mãi (VND)</label>
                  <input [formControl]="salePriceControl" type="number" min="0" step="10000"
                         class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                         placeholder="0" />
                  <p class="text-xs text-gray-400 mt-1">Để trống nếu không khuyến mãi</p>
                </div>
              </div>
            }

            <!-- Mode Info -->
            @if (selectedMode() === 'INSTRUCTOR_LED') {
              <div class="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
                <div class="font-medium mb-1">Chế độ Lớp học bao gồm:</div>
                <ul class="list-disc list-inside text-xs space-y-0.5 text-emerald-700">
                  <li>Quản lý lớp học (tạo nhiều lớp, gán sinh viên)</li>
                  <li>Giao bài tập & chấm điểm</li>
                  <li>Bảng điểm lớp</li>
                  <li>Bài kiểm tra có giám sát</li>
                </ul>
              </div>
            }
          </div>
        }

        <!-- Step 3: Confirmation -->
        @if (currentStep() === 3) {
          <div class="p-6 space-y-5">
            <div class="border-b border-gray-100 pb-4 mb-2">
              <h2 class="text-lg font-semibold text-gray-900">Xác nhận & Tạo</h2>
              <p class="text-sm text-gray-500 mt-0.5">Kiểm tra thông tin trước khi tạo khóa học</p>
            </div>

            <!-- Summary Card -->
            <div class="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
              <div class="p-4 flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                     [class]="selectedMode() === 'INSTRUCTOR_LED' ? 'bg-emerald-100 text-emerald-600' : 'bg-[#0056D2]/10 text-[#0056D2]'">
                  @if (selectedMode() === 'INSTRUCTOR_LED') {
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  } @else {
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                  }
                </div>
                <div>
                  <p class="text-xs text-gray-500">Hình thức</p>
                  <p class="font-semibold text-gray-900">{{ selectedMode() === 'INSTRUCTOR_LED' ? 'Lớp học' : 'Khóa học online' }}</p>
                </div>
              </div>

              <div class="p-4">
                <p class="text-xs text-gray-500">Tên khóa học</p>
                <p class="font-semibold text-gray-900 mt-0.5">{{ titleControl.value }}</p>
              </div>

              <div class="p-4">
                <p class="text-xs text-gray-500">Danh mục</p>
                <p class="font-semibold text-gray-900 mt-0.5">{{ selectedCategoryName() || 'Chưa chọn' }}</p>
              </div>

              @if (descriptionControl.value) {
                <div class="p-4">
                  <p class="text-xs text-gray-500">Mô tả</p>
                  <p class="text-sm text-gray-700 mt-0.5 line-clamp-3">{{ descriptionControl.value }}</p>
                </div>
              }

              <div class="p-4">
                <p class="text-xs text-gray-500">Giá</p>
                <p class="font-semibold text-gray-900 mt-0.5">
                  @if (priceType() === 'PAID') {
                    {{ priceControl.value | number:'1.0-0' }} VND
                    @if (salePriceControl.value) {
                      <span class="text-sm text-green-600 ml-2">(Khuyến mãi: {{ salePriceControl.value | number:'1.0-0' }} VND)</span>
                    }
                  } @else {
                    Miễn phí
                  }
                </p>
              </div>
            </div>

            <!-- Info Note -->
            <div class="flex items-start gap-3 p-4 bg-[#0056D2]/5 border border-[#0056D2]/20 rounded-lg">
              <svg class="w-5 h-5 text-[#0056D2] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
              </svg>
              <div class="text-sm text-[#004BB5]">
                <p class="font-medium">Sau khi tạo, bạn sẽ được chuyển đến trang chỉnh sửa để:</p>
                <ul class="list-disc list-inside text-xs mt-1 space-y-0.5 text-[#004BB5]">
                  <li>Thêm chương và bài học</li>
                  <li>Upload video và tài liệu</li>
                  <li>Thiết lập quiz và bài tập</li>
                  <li>Xuất bản khi sẵn sàng</li>
                </ul>
              </div>
            </div>
          </div>
        }

        <!-- Footer: Navigation Buttons -->
        <div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div>
            @if (currentStep() > 1) {
              <button type="button" (click)="prevStep()"
                      class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Quay lại
              </button>
            }
          </div>

          <div class="flex items-center gap-3">
            @if (currentStep() < 3) {
              <button type="button" (click)="nextStep()" [disabled]="!canProceed()"
                      class="px-5 py-2 text-sm font-medium text-white bg-[#0056D2] rounded-lg hover:bg-[#004BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Tiếp theo
              </button>
            } @else {
              <button type="button" (click)="onSubmit()" [disabled]="isSubmitting()"
                      class="px-5 py-2 text-sm font-medium text-white bg-[#0056D2] rounded-lg hover:bg-[#004BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                @if (isSubmitting()) {
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang tạo...
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                  Tạo khóa học
                }
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseCreationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(CourseApi);
  private router = inject(Router);
  private authoringService = inject(CourseAuthoringService);
  private toast = inject(ToastService);

  // Step tracking
  currentStep = signal(1);
  steps = [
    { num: 1, label: 'Thông tin' },
    { num: 2, label: 'Mô tả & Giá' },
    { num: 3, label: 'Xác nhận' }
  ];

  // Data
  categories = signal<CategoryDTO[]>([]);
  loadingCategories = signal(true);
  isSubmitting = signal(false);
  selectedMode = signal<DeliveryMode>('SELF_PACED');
  priceType = signal<'FREE' | 'PAID'>('FREE');

  // Form controls (individual for step validation)
  titleControl = this.fb.control('', [Validators.required, Validators.maxLength(255)]);
  categoryControl = this.fb.control('', [Validators.required]);
  descriptionControl = this.fb.control('');
  priceControl = this.fb.control<number | null>(null);
  salePriceControl = this.fb.control<number | null>(null);

  selectedPrefix(): string {
    const catId = this.categoryControl.value;
    if (!catId) return '';
    const cat = this.categories().find(c => c.id === catId);
    return cat?.prefix || '';
  }

  selectedCategoryName(): string {
    const catId = this.categoryControl.value;
    if (!catId) return '';
    const cat = this.categories().find(c => c.id === catId);
    return cat?.name || '';
  }

  canProceed(): boolean {
    if (this.currentStep() === 1) {
      return this.titleControl.valid && this.categoryControl.valid;
    }
    return true; // Step 2 has no required fields
  }

  ngOnInit(): void {
    this.authoringService.getCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.loadingCategories.set(false);
      },
      error: () => {
        this.loadingCategories.set(false);
        this.toast.error('Không tải được danh mục');
      }
    });
  }

  setDeliveryMode(mode: DeliveryMode) {
    this.selectedMode.set(mode);
  }

  nextStep() {
    if (this.currentStep() === 1) {
      this.titleControl.markAsTouched();
      this.categoryControl.markAsTouched();
      if (this.titleControl.invalid || this.categoryControl.invalid) return;
    }
    if (this.currentStep() < 3) {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  async onSubmit() {
    this.isSubmitting.set(true);

    const payload: CreateCourseRequest = {
      categoryId: this.categoryControl.value!,
      title: this.titleControl.value!,
      description: this.descriptionControl.value || undefined,
      deliveryMode: this.selectedMode()
    };

    try {
      const res = await firstValueFrom(this.api.createCourse(payload));
      const course = res?.data;
      if (course?.id) {
        this.toast.success('Tạo khóa học thành công! Đang chuyển đến trang chỉnh sửa...');
        await this.router.navigate(['/teacher/courses', course.id, 'editor']);
      } else {
        this.toast.error('Phản hồi không hợp lệ từ máy chủ');
      }
    } catch (e: any) {
      this.toast.error(e?.message || 'Tạo khóa học thất bại');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
