import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CourseApi } from '../../../api/client/course.api';
import { CreateCourseRequest, DeliveryMode } from '../../../api/types/course.types';
import { CourseAuthoringService } from '../course-editor/services/course-authoring.service';
import { CourseCategoryDTO } from '../../../api/types/course.types';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-course-creation',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="h-screen flex flex-col bg-slate-50 overflow-hidden">

      <!-- Sticky top bar -->
      <div class="flex-shrink-0 bg-white border-b border-slate-200/80 z-10">
        <div class="max-w-[1100px] mx-auto px-5 sm:px-8 flex items-center justify-between h-12">
          <a routerLink="/teacher/courses"
             class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            <span class="hidden sm:inline">Khóa học</span>
          </a>

          <!-- Step indicator -->
          <div class="flex items-center gap-1">
            @for (s of steps; track s.num; let i = $index) {
              <button type="button" (click)="goToStep(s.num)"
                      class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm transition-all"
                      [class]="currentStep() === s.num ? 'bg-[#0056D2]/10' : ''"
                      [class.cursor-pointer]="canGoToStep(s.num)"
                      [class.cursor-default]="!canGoToStep(s.num)">
                <div class="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                     [class]="isStepComplete(s.num) ? 'bg-green-500 text-white' :
                              currentStep() === s.num ? 'bg-[#0056D2] text-white' :
                              'bg-slate-200 text-slate-400'">
                  @if (isStepComplete(s.num)) {
                    <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                  } @else {
                    {{ s.num }}
                  }
                </div>
                <span class="font-medium"
                      [class]="currentStep() === s.num ? 'text-[#0056D2]' : 'text-slate-400'">{{ s.label }}</span>
              </button>
              @if (i < steps.length - 1) {
                <div class="w-6 h-px" [class]="isStepComplete(1) ? 'bg-green-400' : 'bg-slate-200'"></div>
              }
            }
          </div>

          <div class="w-16"></div>
        </div>
      </div>

      <!-- Content: two-panel layout -->
      <div class="flex-1 overflow-y-auto">
        <div class="max-w-[1100px] mx-auto px-5 sm:px-8 py-5">
          <div class="flex gap-6 items-start">

            <!-- LEFT: Main form -->
            <div class="flex-1 min-w-0">

              <!-- Step 1: Basic Info -->
              @if (currentStep() === 1) {
                <h1 class="text-xl font-bold text-slate-900 mb-1">Thông tin cơ bản</h1>
                <p class="text-sm text-slate-500 mb-4">Chọn hình thức, đặt tên và danh mục cho khóa học</p>

                <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div class="p-5 sm:p-6 space-y-5">
                    <!-- Delivery Mode -->
                    <div>
                      <label class="block text-sm font-medium text-slate-700 mb-2">Hình thức giảng dạy</label>
                      <div class="grid grid-cols-2 gap-3">
                        <button type="button" (click)="setDeliveryMode('SELF_PACED')"
                                class="group relative text-left px-4 py-3 rounded-lg border-2 transition-all"
                                [class]="selectedMode() === 'SELF_PACED'
                                  ? 'border-[#0056D2] bg-[#0056D2]/[0.03]'
                                  : 'border-slate-200 hover:border-slate-300'">
                          <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
                                 [class]="selectedMode() === 'SELF_PACED' ? 'bg-[#0056D2] text-white' : 'bg-slate-100 text-slate-400'">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                              </svg>
                            </div>
                            <div>
                              <span class="font-semibold text-sm text-slate-900 block">Khóa học online</span>
                              <span class="text-xs text-slate-500">Tự học, video, quiz</span>
                            </div>
                          </div>
                          @if (selectedMode() === 'SELF_PACED') {
                            <div class="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#0056D2] flex items-center justify-center">
                              <svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                            </div>
                          }
                        </button>

                        <button type="button" (click)="setDeliveryMode('INSTRUCTOR_LED')"
                                class="group relative text-left px-4 py-3 rounded-lg border-2 transition-all"
                                [class]="selectedMode() === 'INSTRUCTOR_LED'
                                  ? 'border-emerald-500 bg-emerald-50/50'
                                  : 'border-slate-200 hover:border-slate-300'">
                          <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
                                 [class]="selectedMode() === 'INSTRUCTOR_LED' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                              </svg>
                            </div>
                            <div>
                              <span class="font-semibold text-sm text-slate-900 block">Lớp học</span>
                              <span class="text-xs text-slate-500">Lớp, bài tập, bảng điểm</span>
                            </div>
                          </div>
                          @if (selectedMode() === 'INSTRUCTOR_LED') {
                            <div class="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                              <svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                            </div>
                          }
                        </button>
                      </div>
                    </div>

                    <!-- Title -->
                    <div>
                      <label for="courseTitle" class="block text-sm font-medium text-slate-700 mb-1.5">Tên khóa học</label>
                      <input id="courseTitle" [formControl]="titleControl" type="text"
                             class="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0056D2]/40 focus:border-[#0056D2] transition-all"
                             placeholder="VD: Điều khiển tàu biển nâng cao" />
                      @if (titleControl.invalid && titleControl.touched) {
                        <p class="text-xs text-red-600 mt-1">Vui lòng nhập tên (tối đa 255 ký tự)</p>
                      }
                    </div>

                    <!-- Category -->
                    <div>
                      <label class="block text-sm font-medium text-slate-700 mb-1.5">Danh mục</label>
                      @if (loadingCategories()) {
                        <div class="text-sm text-slate-400 py-1">Đang tải...</div>
                      } @else {
                        <div class="grid grid-cols-2 gap-3">
                          <div>
                            <label class="block text-xs text-slate-500 mb-1">Lĩnh vực</label>
                            <select class="w-full border border-slate-300 rounded-lg px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#0056D2]/40 focus:border-[#0056D2] transition-all text-sm"
                                    (change)="onRootCategoryChange($any($event.target).value)">
                              <option value="" [selected]="!selectedRootId()">Chọn lĩnh vực</option>
                              @for (root of categoryTree(); track root.id) {
                                <option [value]="root.id" [selected]="selectedRootId() === root.id">{{ root.name }}</option>
                              }
                            </select>
                          </div>
                          <div>
                            <label class="block text-xs text-slate-500 mb-1">Chuyên ngành</label>
                            <select [formControl]="categoryControl"
                                    class="w-full border border-slate-300 rounded-lg px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#0056D2]/40 focus:border-[#0056D2] transition-all text-sm"
                                    [class.text-slate-400]="!subcategories().length"
                                    [class.opacity-60]="!subcategories().length">
                              <option value="">{{ subcategories().length ? 'Chọn chuyên ngành' : 'Chọn lĩnh vực trước' }}</option>
                              @for (sub of subcategories(); track sub.id) {
                                <option [value]="sub.id">{{ sub.name }}</option>
                              }
                            </select>
                          </div>
                        </div>
                      }
                      @if (categoryControl.invalid && categoryControl.touched) {
                        <p class="text-xs text-red-600 mt-1">Vui lòng chọn danh mục</p>
                      }
                    </div>

                    @if (selectedPrefix()) {
                      <div class="text-sm text-slate-500">
                        Mã khóa học: <span class="font-mono font-semibold text-slate-800">{{ selectedPrefix() }}-xxx</span>
                      </div>
                    }
                  </div>

                  <!-- Card footer -->
                  <div class="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/60 rounded-b-xl">
                    <button type="button" (click)="onCancel()" class="text-sm text-slate-500 hover:text-slate-700 transition-colors">Hủy</button>
                    <button type="button" (click)="nextStep()" [disabled]="!canProceed()"
                            class="px-5 py-2 text-sm font-semibold text-white bg-[#0056D2] rounded-lg hover:bg-[#004BB5] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      Tiếp theo
                    </button>
                  </div>
                </div>
              }

              <!-- Step 2: Finalize & Create -->
              @if (currentStep() === 2) {
                <h1 class="text-xl font-bold text-slate-900 mb-1">Hoàn tất & Tạo</h1>
                <p class="text-sm text-slate-500 mb-4">Thêm mô tả, chọn giá và xác nhận</p>

                @if (!titleControl.valid || !categoryControl.valid) {
                  <div class="flex items-center gap-2 p-3 mb-4 bg-amber-50 rounded-lg border border-amber-200/70 text-sm text-amber-800">
                    <svg class="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                    </svg>
                    <span>Cần hoàn thành <button type="button" (click)="goToStep(1)" class="font-semibold text-[#0056D2] hover:underline">Bước 1</button> trước khi tạo khóa học.</span>
                  </div>
                }

                <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div class="p-5 sm:p-6 space-y-5">
                    <!-- Description -->
                    <div>
                      <div class="flex items-baseline justify-between mb-1.5">
                        <label for="courseDesc" class="text-sm font-medium text-slate-700">Mô tả khóa học</label>
                        <span class="text-xs text-slate-400">Không bắt buộc</span>
                      </div>
                      <textarea id="courseDesc" [formControl]="descriptionControl" rows="3"
                                class="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0056D2]/40 focus:border-[#0056D2] transition-all resize-none"
                                placeholder="Học viên sẽ học được gì từ khóa học này?"></textarea>
                    </div>

                    <!-- Price -->
                    <div>
                      <label class="block text-sm font-medium text-slate-700 mb-2">Giá khóa học</label>
                      <div class="grid grid-cols-2 gap-3">
                        <button type="button" (click)="priceType.set('FREE')"
                                class="group flex items-center gap-2.5 px-4 py-3 rounded-lg border-2 transition-all text-left"
                                [class]="priceType() === 'FREE' ? 'border-green-500 bg-green-50/50' : 'border-slate-200 hover:border-slate-300'">
                          <div class="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                               [class]="priceType() === 'FREE' ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path>
                            </svg>
                          </div>
                          <div>
                            <span class="font-semibold text-sm text-slate-900 block">Miễn phí</span>
                            <span class="text-xs text-slate-500">Mở cho tất cả</span>
                          </div>
                        </button>

                        <button type="button" (click)="priceType.set('PAID')"
                                class="group flex items-center gap-2.5 px-4 py-3 rounded-lg border-2 transition-all text-left"
                                [class]="priceType() === 'PAID' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:border-slate-300'">
                          <div class="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                               [class]="priceType() === 'PAID' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                          </div>
                          <div>
                            <span class="font-semibold text-sm text-slate-900 block">Trả phí</span>
                            <span class="text-xs text-slate-500">Thiết lập giá bán</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    <!-- Price Fields -->
                    @if (priceType() === 'PAID') {
                      <div class="grid grid-cols-2 gap-3 p-3.5 bg-amber-50/60 rounded-lg border border-amber-200/60">
                        <div>
                          <label class="block text-xs text-slate-600 mb-1">Giá gốc (VND)</label>
                          <input [formControl]="priceControl" type="number" min="0" step="10000"
                                 class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0056D2]/40 focus:border-[#0056D2] text-sm bg-white"
                                 placeholder="VD: 500000" />
                          @if (priceControl.touched && (!priceControl.value || priceControl.value <= 0)) {
                            <p class="text-xs text-red-500 mt-0.5">Vui lòng nhập giá gốc</p>
                          }
                        </div>
                        <div>
                          <label class="block text-xs text-slate-600 mb-1">Giá khuyến mãi (VND)</label>
                          <input [formControl]="salePriceControl" type="number" min="0" step="10000"
                                 class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0056D2]/40 focus:border-[#0056D2] text-sm bg-white"
                                 placeholder="VD: 400000" />
                          @if (salePriceControl.value && salePriceControl.value > 0 && priceControl.value && priceControl.value > 0 && salePriceControl.value >= priceControl.value) {
                            <p class="text-xs text-red-500 mt-0.5">Phải nhỏ hơn giá gốc</p>
                          }
                        </div>
                      </div>
                    }

                    <!-- Instructor-Led info -->
                    @if (selectedMode() === 'INSTRUCTOR_LED') {
                      <div class="flex gap-2 p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/60 text-xs text-emerald-800">
                        <svg class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span><strong>Lớp học</strong> bao gồm quản lý lớp, bài tập, bảng điểm, kiểm tra.</span>
                      </div>
                    }
                  </div>

                  <!-- Card footer -->
                  <div class="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/60 rounded-b-xl">
                    <button type="button" (click)="prevStep()" class="text-sm text-slate-500 hover:text-slate-700 transition-colors">Quay lại</button>
                    <button type="button" (click)="onSubmit()" [disabled]="isSubmitting() || !canSubmit()"
                            class="px-5 py-2 text-sm font-semibold text-white bg-[#0056D2] rounded-lg hover:bg-[#004BB5] disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-2">
                      @if (isSubmitting()) {
                        <svg class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang tạo...
                      } @else {
                        Tạo khóa học
                      }
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- RIGHT: Progress + Info Panel (sticky) -->
            <div class="hidden lg:block w-[280px] flex-shrink-0 sticky top-5">
              <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <!-- Header -->
                <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tiến độ</span>
                    <span class="text-xs font-semibold text-slate-700">{{ filledCount() }}/4</span>
                  </div>
                  <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full bg-[#0056D2] rounded-full transition-all duration-500"
                         [style.width.%]="filledCount() / 4 * 100"></div>
                  </div>
                </div>

                <!-- Checklist items with values -->
                <div class="p-4 space-y-3.5">
                  <!-- 1. Hình thức -->
                  <div class="flex gap-2.5">
                    <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                         [class]="selectedMode() ? 'bg-green-500' : 'bg-slate-200'">
                      @if (selectedMode()) {
                        <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                      }
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs text-slate-500">Hình thức</div>
                      <div class="text-sm font-medium text-slate-900 truncate">
                        {{ selectedMode() === 'INSTRUCTOR_LED' ? 'Lớp học' : 'Khóa học online' }}
                      </div>
                    </div>
                  </div>

                  <!-- 2. Tên -->
                  <div class="flex gap-2.5">
                    <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                         [class]="titleControl.valid ? 'bg-green-500' : 'bg-slate-200'">
                      @if (titleControl.valid) {
                        <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                      }
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs text-slate-500">Tên khóa học</div>
                      <div class="text-sm truncate" [class]="titleControl.valid ? 'font-medium text-slate-900' : 'text-slate-400'">
                        {{ titleControl.value || 'Chưa nhập' }}
                      </div>
                    </div>
                  </div>

                  <!-- 3. Danh mục -->
                  <div class="flex gap-2.5">
                    <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                         [class]="categoryControl.valid ? 'bg-green-500' : 'bg-slate-200'">
                      @if (categoryControl.valid) {
                        <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                      }
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs text-slate-500">Danh mục</div>
                      <div class="text-sm truncate" [class]="categoryControl.valid ? 'font-medium text-slate-900' : 'text-slate-400'">
                        {{ selectedCategoryName() || 'Chưa chọn' }}
                      </div>
                    </div>
                  </div>

                  <!-- 4. Giá -->
                  <div class="flex gap-2.5">
                    <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                         [class]="priceReady() ? 'bg-green-500' : 'bg-slate-200'">
                      @if (priceReady()) {
                        <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                      }
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs text-slate-500">Giá</div>
                      <div class="text-sm truncate" [class]="priceReady() ? 'font-medium text-slate-900' : 'text-slate-400'">
                        @if (priceType() === 'FREE') {
                          Miễn phí
                        } @else if (priceControl.value && priceControl.value > 0) {
                          {{ priceControl.value | number:'1.0-0' }}đ
                          @if (salePriceControl.value && salePriceControl.value > 0 && salePriceControl.value < priceControl.value) {
                            <span class="text-xs text-amber-600"> → {{ salePriceControl.value | number:'1.0-0' }}đ</span>
                          }
                        } @else {
                          Chưa thiết lập
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Footer: current step info + edit link -->
                <div class="px-4 py-3 border-t border-slate-100 bg-slate-50/40">
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-slate-500">Bước {{ currentStep() }}/2</span>
                    @if (currentStep() === 2) {
                      <button type="button" (click)="goToStep(1)" class="text-xs text-[#0056D2] hover:text-[#004BB5] font-medium transition-colors">
                        Sửa thông tin
                      </button>
                    }
                  </div>
                </div>
              </div>
            </div>
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
    { num: 2, label: 'Hoàn tất' }
  ];

  // Data
  categoryTree = signal<CourseCategoryDTO[]>([]);
  selectedRootId = signal('');
  subcategories = signal<CourseCategoryDTO[]>([]);
  loadingCategories = signal(true);
  isSubmitting = signal(false);
  submitted = signal(false);
  selectedMode = signal<DeliveryMode>('SELF_PACED');
  priceType = signal<'FREE' | 'PAID'>('FREE');

  // Form controls
  titleControl = this.fb.control('', [Validators.required, Validators.maxLength(255)]);
  categoryControl = this.fb.control('', [Validators.required]);
  descriptionControl = this.fb.control('');
  priceControl = this.fb.control<number | null>(null);
  salePriceControl = this.fb.control<number | null>(null);

  filledCount = computed(() => {
    let c = 0;
    if (this.selectedMode()) c++;
    if (this.titleControl.valid) c++;
    if (this.categoryControl.valid) c++;
    if (this.priceReady()) c++;
    return c;
  });

  priceReady = computed(() => {
    if (this.priceType() === 'FREE') return true;
    return !!(this.priceControl.value && this.priceControl.value > 0);
  });

  onRootCategoryChange(rootId: string) {
    this.selectedRootId.set(rootId);
    this.categoryControl.setValue('');
    const root = this.categoryTree().find(r => r.id === rootId);
    this.subcategories.set(root?.children || []);
  }

  selectedPrefix(): string {
    const catId = this.categoryControl.value;
    if (!catId) return '';
    const rootId = this.selectedRootId();
    const root = this.categoryTree().find(r => r.id === rootId);
    return root?.prefix || '';
  }

  selectedCategoryName(): string {
    const catId = this.categoryControl.value;
    if (!catId) return '';
    const sub = this.subcategories().find(c => c.id === catId);
    if (sub) {
      const root = this.categoryTree().find(r => r.id === this.selectedRootId());
      return `${root?.name || ''} > ${sub.name}`;
    }
    return '';
  }

  canProceed(): boolean {
    if (this.currentStep() === 1) {
      return this.titleControl.valid && this.categoryControl.valid;
    }
    return true;
  }

  canSubmit(): boolean {
    // Must complete step 1 (title + category) even with free navigation
    if (!this.titleControl.valid || !this.categoryControl.valid) return false;
    if (this.priceType() === 'PAID') {
      if (!this.priceControl.value || this.priceControl.value <= 0) return false;
      if (this.salePriceControl.value && this.salePriceControl.value >= this.priceControl.value) return false;
    }
    return true;
  }

  ngOnInit(): void {
    this.authoringService.getCourseCategoryTree().subscribe({
      next: (tree) => {
        this.categoryTree.set(tree);
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
    if (this.currentStep() < 2) {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  goToStep(step: number) {
    if (this.canGoToStep(step)) {
      this.currentStep.set(step);
    }
  }

  canGoToStep(step: number): boolean {
    // Azure/Amazon pattern: allow free navigation between steps
    // Users can preview any step before completing earlier ones
    return step !== this.currentStep();
  }

  isStepComplete(step: number): boolean {
    if (step === 1) return this.titleControl.valid && this.categoryControl.valid;
    if (step === 2) return this.priceReady();
    return false;
  }

  onCancel() {
    this.router.navigate(['/teacher/courses']);
  }

  hasUnsavedData(): boolean {
    if (this.submitted()) return false;
    return !!(this.titleControl.value || this.categoryControl.value || this.descriptionControl.value ||
      (this.priceType() === 'PAID' && this.priceControl.value));
  }

  canDeactivate(): boolean {
    if (!this.hasUnsavedData()) return true;
    return window.confirm('Bạn có dữ liệu chưa lưu. Bạn có chắc muốn rời trang?');
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.hasUnsavedData()) {
      event.preventDefault();
    }
  }

  async onSubmit() {
    if (this.priceType() === 'PAID') {
      this.priceControl.markAsTouched();
      if (!this.priceControl.value || this.priceControl.value <= 0) return;
      if (this.salePriceControl.value && this.salePriceControl.value >= this.priceControl.value) return;
    }

    this.isSubmitting.set(true);
    this.submitted.set(true);

    const payload: CreateCourseRequest = {
      categoryId: this.categoryControl.value!,
      title: this.titleControl.value!,
      description: this.descriptionControl.value || undefined,
      deliveryMode: this.selectedMode(),
      priceType: this.priceType(),
      price: this.priceType() === 'PAID' ? (this.priceControl.value || undefined) : undefined,
      salePrice: this.priceType() === 'PAID' ? (this.salePriceControl.value || undefined) : undefined
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
      this.submitted.set(false);
      this.toast.error(e?.message || 'Tạo khóa học thất bại');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
