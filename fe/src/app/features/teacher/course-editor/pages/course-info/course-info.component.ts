import { Component, OnInit, OnDestroy, effect, inject, signal, untracked, ChangeDetectionStrategy } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CourseEditorStore } from '../../store/course-editor.store';
import { CourseAuthoringService, DeliveryMode } from '../../services/course-authoring.service';
import { CourseCategoryDTO, CourseTagDTO } from '../../../../../api/types/course.types';
import { ToastService } from '../../../../../core/services/toast.service';
import { RichTextEditorComponent } from '../../../../../shared/components/rich-text-editor/rich-text-editor.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-course-info',
    imports: [ReactiveFormsModule, RichTextEditorComponent],
    template: `
    <div class="min-h-full flex flex-col">
      <div class="flex-1 max-w-screen-2xl mx-auto w-full px-5 sm:px-8 py-5">
        <form [formGroup]="form">
          <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

            <!-- ============ MAIN COLUMN ============ -->
            <div class="space-y-5 min-w-0">

              <!-- Card: Thông tin cơ bản -->
              <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                  <h2 class="text-sm font-semibold text-slate-900">Thông tin cơ bản</h2>
                </div>
                <div class="p-5 space-y-4">
                  <div class="space-y-1.5">
                    <label class="block text-sm font-medium text-slate-700">Tên khóa học <span class="text-red-500">*</span></label>
                    <input formControlName="title"
                      class="w-full h-10 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400"
                      placeholder="Nhập tên khóa học" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="block text-sm font-medium text-slate-700">Mô tả ngắn</label>
                    <textarea formControlName="description"
                      class="w-full h-20 p-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400 resize-none"
                      placeholder="Mô tả tóm tắt hiển thị trên card..."></textarea>
                  </div>
                  <!-- Delivery Mode -->
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <label class="block text-sm font-medium text-slate-700">Hình thức giảng dạy</label>
                      @if (isModeLocked()) {
                        <span class="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                          </svg>
                          Đã khóa
                        </span>
                      }
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                      <button type="button" (click)="!isModeLocked() && setDeliveryMode('SELF_PACED')"
                              class="flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left"
                              [class.pointer-events-none]="isModeLocked()"
                              [class.opacity-60]="isModeLocked()"
                              [class]="currentDeliveryMode() === 'SELF_PACED'
                                ? 'border-[#0056D2] bg-[#0056D2]/5'
                                : 'border-slate-200 hover:border-slate-300'">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                             [class]="currentDeliveryMode() === 'SELF_PACED' ? 'bg-[#0056D2] text-white' : 'bg-slate-100 text-slate-400'">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                          </svg>
                        </div>
                        <div>
                          <div class="text-sm font-medium text-slate-900">Khóa học online</div>
                          <div class="text-xs text-slate-500">Tự học, video, quiz</div>
                        </div>
                      </button>
                      <button type="button" (click)="!isModeLocked() && setDeliveryMode('INSTRUCTOR_LED')"
                              class="flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left"
                              [class.pointer-events-none]="isModeLocked()"
                              [class.opacity-60]="isModeLocked()"
                              [class]="currentDeliveryMode() === 'INSTRUCTOR_LED'
                                ? 'border-emerald-500 bg-emerald-50/50'
                                : 'border-slate-200 hover:border-slate-300'">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                             [class]="currentDeliveryMode() === 'INSTRUCTOR_LED' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                          </svg>
                        </div>
                        <div>
                          <div class="text-sm font-medium text-slate-900">Lớp học</div>
                          <div class="text-xs text-slate-500">Bài tập, bảng điểm, kiểm tra</div>
                        </div>
                      </button>
                    </div>
                    @if (isModeLocked()) {
                      <p class="text-xs text-slate-500">Không thể thay đổi hình thức khi đã có học viên đăng ký.</p>
                    }
                    @if (currentDeliveryMode() === 'INSTRUCTOR_LED' && !isModeLocked()) {
                      <div class="flex gap-2 p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/60 text-xs text-emerald-800">
                        <svg class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span><strong>Lớp học</strong> bao gồm quản lý lớp, bài tập, bảng điểm, kiểm tra. Không thể chuyển về "Khóa học online" sau khi có học viên.</span>
                      </div>
                    }
                  </div>
                </div>
              </section>

              <!-- Card: Nội dung chi tiết (Rich Text) -->
              <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                  <h2 class="text-sm font-semibold text-slate-900">Nội dung chi tiết</h2>
                  <p class="text-xs text-slate-500 mt-0.5">Mô tả chi tiết nội dung, mục tiêu của khóa học</p>
                </div>
                <div class="p-5">
                  <app-rich-text-editor
                    formControlName="courseInformation"
                    placeholder="Nhập thông tin chi tiết..."
                    [height]="360">
                  </app-rich-text-editor>
                </div>
              </section>

              <!-- Card: Lợi ích & Chào mừng -->
              <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                  <h2 class="text-sm font-semibold text-slate-900">Lợi ích & Chào mừng</h2>
                  <p class="text-xs text-slate-500 mt-0.5">Thông tin hiển thị cho học viên khi xem và tham gia khóa học</p>
                </div>
                <div class="p-5 space-y-4">
                  <div class="space-y-1.5">
                    <label class="block text-sm font-medium text-slate-700">Bạn sẽ học được gì</label>
                    <textarea formControlName="benefits"
                      class="w-full h-24 p-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400 resize-none"
                      placeholder="Liệt kê các kiến thức, kỹ năng học viên sẽ đạt được..."></textarea>
                  </div>
                  <div class="space-y-1.5">
                    <label class="block text-sm font-medium text-slate-700">Lời chào mừng</label>
                    <textarea formControlName="welcomeMessage"
                      class="w-full h-20 p-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400 resize-none"
                      placeholder="Tin nhắn chào mừng gửi đến học viên khi đăng ký..."></textarea>
                  </div>
                </div>
              </section>
            </div>

            <!-- ============ SIDEBAR (5 cards — Shopify/WordPress pattern) ============ -->
            <div class="space-y-4 lg:sticky lg:top-5">

              <!-- 1. Trạng thái (Visibility — always top of sidebar) -->
              <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                  <h2 class="text-sm font-semibold text-slate-900">Trạng thái</h2>
                </div>
                <div class="p-4">
                  <div class="grid grid-cols-2 gap-2">
                    <label class="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all"
                           [class]="form.get('visibility')?.value === 'PUBLIC'
                             ? 'border-[#0056D2] bg-[#0056D2]/5'
                             : 'border-slate-200 hover:border-slate-300'">
                      <input type="radio" formControlName="visibility" value="PUBLIC"
                        class="w-3.5 h-3.5 text-[#0056D2] border-slate-300 focus:ring-[#0056D2]">
                      <div>
                        <span class="text-sm font-medium text-slate-900">Công khai</span>
                      </div>
                    </label>
                    <label class="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all"
                           [class]="form.get('visibility')?.value === 'PRIVATE'
                             ? 'border-[#0056D2] bg-[#0056D2]/5'
                             : 'border-slate-200 hover:border-slate-300'">
                      <input type="radio" formControlName="visibility" value="PRIVATE"
                        class="w-3.5 h-3.5 text-[#0056D2] border-slate-300 focus:ring-[#0056D2]">
                      <div>
                        <span class="text-sm font-medium text-slate-900">Riêng tư</span>
                      </div>
                    </label>
                  </div>
                </div>
              </section>

              <!-- 2. Ảnh bìa -->
              <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                  <h2 class="text-sm font-semibold text-slate-900">Ảnh bìa</h2>
                </div>
                <div class="p-4">
                  @if (isUploading()) {
                    <div class="aspect-video rounded-lg bg-slate-50 border-2 border-[#0056D2] flex flex-col items-center justify-center p-4">
                      <svg class="animate-spin h-6 w-6 text-[#0056D2] mb-3" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <div class="w-full max-w-[180px] bg-slate-200 rounded-full h-1.5 mb-2">
                        <div class="bg-[#0056D2] h-1.5 rounded-full transition-all duration-300" [style.width.%]="uploadProgress()"></div>
                      </div>
                      <span class="text-xs text-slate-600 font-medium">{{ uploadProgress() }}%</span>
                      <button type="button" (click)="cancelUpload()"
                        class="mt-2 text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                        Hủy tải lên
                      </button>
                    </div>
                  } @else {
                    <div class="aspect-video rounded-lg bg-slate-50 border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group transition-colors"
                         [class]="isDragOver() ? 'border-[#0056D2] bg-[#0056D2]/5' : 'border-slate-300 hover:border-[#0056D2]'"
                         (dragover)="onDragOver($event)"
                         (dragleave)="onDragLeave($event)"
                         (drop)="onDrop($event)">
                      @if (!thumbnailPreview() && !thumbnailUrl()) {
                        <div class="z-10 text-center p-4 pointer-events-none">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-8 h-8 mx-auto mb-2"
                               [class]="isDragOver() ? 'text-[#0056D2]' : 'text-slate-400'">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          <span class="text-xs font-medium" [class]="isDragOver() ? 'text-[#0056D2]' : 'text-slate-500'">
                            {{ isDragOver() ? 'Thả ảnh vào đây' : 'Kéo thả hoặc click để tải ảnh' }}
                          </span>
                        </div>
                      }
                      @if (thumbnailPreview() || thumbnailUrl()) {
                        <img [src]="thumbnailPreview() || thumbnailUrl()" class="absolute inset-0 w-full h-full object-cover z-0" alt="Cover">
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center pointer-events-none">
                          <span class="text-white font-medium text-sm">Thay đổi ảnh</span>
                        </div>
                      }
                      <input type="file" accept="image/*" (change)="onFileSelected($event)"
                        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20">
                    </div>
                  }
                  <p class="text-xs text-slate-400 mt-2">JPG, PNG, WebP. Tối đa 5MB.</p>
                </div>
              </section>

              <!-- 3. Phân loại (Category + Tags) -->
              <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                  <h2 class="text-sm font-semibold text-slate-900">Phân loại</h2>
                </div>
                <div class="p-4 space-y-4">
                  <div class="space-y-1.5">
                    <label class="block text-xs font-medium text-slate-600">Lĩnh vực</label>
                    <select class="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all cursor-pointer"
                            (change)="onRootCategoryChange($any($event.target).value)">
                      <option value="" [selected]="!selectedRootId()">-- Chọn lĩnh vực --</option>
                      @for (root of categoryTree(); track root.id) {
                        <option [value]="root.id" [selected]="selectedRootId() === root.id">{{ root.name }}</option>
                      }
                    </select>
                  </div>
                  @if (subcategories().length) {
                    <div class="space-y-1.5">
                      <label class="block text-xs font-medium text-slate-600">Chuyên ngành</label>
                      <select formControlName="categoryId"
                        class="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all cursor-pointer">
                        <option value="">-- Chọn chuyên ngành --</option>
                        @for (sub of subcategories(); track sub.id) {
                          <option [value]="sub.id">{{ sub.name }}</option>
                        }
                      </select>
                    </div>
                  } @else if (!selectedRootId()) {
                    <p class="text-xs text-slate-400 italic">Chọn lĩnh vực trước</p>
                  }
                  <!-- Tags (Controlled Vocabulary) -->
                  <div class="space-y-1.5">
                    <label class="block text-xs font-medium text-slate-600">Thẻ chủ đề <span class="text-slate-400">(tối đa 5)</span></label>
                    <div class="min-h-[36px] p-2 rounded-lg border border-slate-300 bg-white transition-all flex flex-wrap gap-1.5 items-center">
                      @for (tag of selectedTags(); track tag.id) {
                        <div class="bg-[#0056D2]/10 text-[#0056D2] text-xs font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                          {{ tag.name }}
                          <button type="button" (click)="removeTagById(tag.id)" class="text-[#0056D2]/50 hover:text-[#0056D2]">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                          </button>
                        </div>
                      }
                    </div>
                    @if (availableTags().length && selectedTags().length < 5) {
                      <div class="flex flex-wrap gap-1.5 mt-1.5">
                        @for (tag of availableTags(); track tag.id) {
                          @if (!isTagSelected(tag.id)) {
                            <button type="button" (click)="addTagById(tag.id)"
                              class="text-xs px-2 py-0.5 rounded-md border border-slate-200 text-slate-600 hover:border-[#0056D2] hover:text-[#0056D2] transition-colors">
                              + {{ tag.name }}
                            </button>
                          }
                        }
                      </div>
                    }
                  </div>
                </div>
              </section>

              <!-- 4. Giá & Tín chỉ -->
              <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                  <h2 class="text-sm font-semibold text-slate-900">Giá & Tín chỉ</h2>
                </div>
                <div class="p-4 space-y-3">
                  <div class="space-y-1.5">
                    <label class="block text-xs font-medium text-slate-600">Loại giá</label>
                    <select formControlName="priceType"
                      class="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all cursor-pointer">
                      <option value="FREE">Miễn phí</option>
                      <option value="PAID">Trả phí</option>
                    </select>
                  </div>
                  @if (form.get('priceType')?.value === 'PAID') {
                    <div class="space-y-2 p-3 bg-amber-50/60 rounded-lg border border-amber-200/60">
                      <div class="space-y-1">
                        <label class="block text-xs font-medium text-slate-600">Giá gốc (VND) <span class="text-red-500">*</span></label>
                        <input type="number" formControlName="price" [min]="1000"
                          class="w-full h-9 px-3 rounded-lg border bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all"
                          [class]="priceError() ? 'border-red-400' : 'border-slate-300'"
                          placeholder="VD: 500000" />
                        @if (priceError()) {
                          <p class="text-xs text-red-500 mt-0.5">{{ priceError() }}</p>
                        }
                      </div>
                      <div class="space-y-1">
                        <label class="block text-xs font-medium text-slate-600">Giá khuyến mãi (VND)</label>
                        <input type="number" formControlName="salePrice" [min]="0"
                          class="w-full h-9 px-3 rounded-lg border bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all"
                          [class]="salePriceError() ? 'border-red-400' : 'border-slate-300'"
                          placeholder="VD: 400000" />
                        @if (salePriceError()) {
                          <p class="text-xs text-red-500 mt-0.5">{{ salePriceError() }}</p>
                        }
                      </div>
                    </div>
                  }
                  <div class="space-y-1.5">
                    <label class="block text-xs font-medium text-slate-600">Số tín chỉ</label>
                    <input type="number" formControlName="credits" [min]="0"
                      class="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all" />
                  </div>
                </div>
              </section>

              <!-- 5. Video giới thiệu -->
              <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                  <h2 class="text-sm font-semibold text-slate-900">Video giới thiệu</h2>
                </div>
                <div class="p-4">
                  <input formControlName="introVideoUrl"
                    class="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400"
                    placeholder="https://youtube.com/..." />
                  <p class="text-xs text-slate-400 mt-1.5">Link YouTube hoặc URL video trực tiếp</p>
                </div>
              </section>

            </div>
          </div>
        </form>
      </div>

      <!-- Sticky Save Bar (Shopify pattern — visible only when form has unsaved changes) -->
      @if (form.dirty) {
        <div class="sticky bottom-0 z-20 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <div class="max-w-screen-2xl mx-auto px-5 sm:px-8 py-3 flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-slate-600">
              <div class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
              <span>Bạn có thay đổi chưa lưu</span>
            </div>
            <div class="flex items-center gap-3">
              <button type="button" (click)="discardChanges()"
                class="h-9 px-4 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                Hủy thay đổi
              </button>
              <button type="button" (click)="save()"
                [disabled]="form.invalid || isSaving()"
                class="h-9 px-5 rounded-lg bg-[#0056D2] text-white font-medium text-sm hover:bg-[#004BB5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                @if (isSaving()) {
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                }
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
    `
})
export class CourseInfoComponent implements OnInit, OnDestroy {
    private store = inject(CourseEditorStore);
    private fb = inject(FormBuilder);
    private service = inject(CourseAuthoringService);
    private toast = inject(ToastService);

    // Data Signals
    categoryTree = signal<CourseCategoryDTO[]>([]);
    selectedRootId = signal('');
    subcategories = signal<CourseCategoryDTO[]>([]);
    availableTags = signal<CourseTagDTO[]>([]);
    thumbnailUrl = signal<string | null>(null);
    thumbnailPreview = signal<string | null>(null);
    isSaving = signal(false);
    currentDeliveryMode = signal<DeliveryMode>('SELF_PACED');
    isModeLocked = signal(false);

    // Thumbnail upload UX signals
    isDragOver = signal(false);
    isUploading = signal(false);
    uploadProgress = signal(0);
    private uploadSub: Subscription | null = null;

    // Price validation (methods — form values aren't signals)
    priceError(): string {
        const priceType = this.form.get('priceType')?.value;
        const price = this.form.get('price')?.value;
        if (priceType === 'PAID' && (!price || price <= 0)) return 'Giá phải lớn hơn 0';
        return '';
    }
    salePriceError(): string {
        const priceType = this.form.get('priceType')?.value;
        const price = this.form.get('price')?.value || 0;
        const salePrice = this.form.get('salePrice')?.value;
        if (priceType === 'PAID' && salePrice && salePrice > 0 && salePrice >= price) return 'Phải nhỏ hơn giá gốc';
        return '';
    }

    // Local state for tags — signal for OnPush CD tracking
    selectedTags = signal<CourseTagDTO[]>([]);

    // Form
    form = this.fb.group({
        title: ['', Validators.required],
        description: [''],
        categoryId: [''],
        tags: [''],
        introVideoUrl: [''],
        courseInformation: [''],
        welcomeMessage: [''],
        benefits: [''],
        price: [0],
        salePrice: [0],
        priceType: ['FREE'],
        visibility: ['PUBLIC'],
        credits: [0]
    });

    constructor() {
        // Sync Store -> Form (only re-runs when courseTree changes)
        effect(() => {
            const tree = this.store.courseTree();
            if (tree && !this.form.dirty) {
                untracked(() => {
                    // Hydrate selected tags from store (names → lookup full objects when availableTags loaded)
                    this.hydrateTagsFromNames(tree.tags || []);

                    this.form.patchValue({
                        title: tree.title,
                        description: tree.description,
                        categoryId: tree.categoryId || '',
                        tags: this.selectedTags().map(t => t.name).join(','),
                        introVideoUrl: tree.introVideoUrl || '',
                        courseInformation: tree.courseInformation || '',
                        welcomeMessage: tree.welcomeMessage || '',
                        benefits: tree.benefits || '',
                        price: tree.price || 0,
                        salePrice: tree.salePrice || 0,
                        priceType: tree.priceType || 'FREE',
                        visibility: tree.visibility || 'PUBLIC',
                        credits: tree.credits || 0
                    });
                    this.thumbnailUrl.set(tree.thumbnailUrl || null);
                    this.thumbnailPreview.set(null); // Reset preview on load
                    this.currentDeliveryMode.set((tree.deliveryMode as DeliveryMode) || 'SELF_PACED');
                    this.isModeLocked.set(!!tree.hasEnrollments);
                    // Hydrate cascading category from store
                    if (tree.categoryId && this.categoryTree().length) {
                        this.hydrateCategoryFromStore(tree.categoryId);
                    }
                });
            }
        });
    }

    onRootCategoryChange(rootId: string) {
        this.selectedRootId.set(rootId);
        const root = this.categoryTree().find(r => r.id === rootId);
        const children = root?.children || [];
        this.subcategories.set(children);
        if (!children.length && rootId) {
            // Root has no subcategories → assign root directly as categoryId
            this.form.patchValue({ categoryId: rootId });
        } else {
            this.form.patchValue({ categoryId: '' });
        }
        this.form.markAsDirty();
    }

    private hydrateCategoryFromStore(categoryId: string) {
        // Find which root owns this subcategory and set cascading state
        for (const root of this.categoryTree()) {
            const sub = root.children?.find(c => c.id === categoryId);
            if (sub) {
                this.selectedRootId.set(root.id);
                this.subcategories.set(root.children || []);
                return;
            }
            // Maybe categoryId is a root itself
            if (root.id === categoryId) {
                this.selectedRootId.set(root.id);
                this.subcategories.set(root.children || []);
                return;
            }
        }
    }

    ngOnInit() {
        // Load Category Tree + Tags in parallel
        this.service.getCourseCategoryTree().subscribe({
            next: (tree) => {
                this.categoryTree.set(tree);
                // If store already has a categoryId, hydrate cascading state
                const currentCatId = this.form.get('categoryId')?.value;
                if (currentCatId) this.hydrateCategoryFromStore(currentCatId);
            },
            error: () => this.toast.error('Không tải được danh mục')
        });

        this.service.getCourseTags().subscribe({
            next: (tags) => {
                this.availableTags.set(tags);
                // Hydrate pending tag names into full objects now that vocab is loaded
                if (this._pendingTagNames.length) {
                    this.selectedTags.set(this._pendingTagNames
                        .map(name => tags.find(t => t.name === name))
                        .filter((t): t is CourseTagDTO => !!t));
                    this._pendingTagNames = [];
                }
            },
            error: () => {} // Silent — tags are optional
        });
    }

    // Tag Management (controlled vocabulary — ID-based)
    isTagSelected(tagId: string): boolean {
        return this.selectedTags().some(t => t.id === tagId);
    }

    addTagById(tagId: string) {
        const tag = this.availableTags().find(t => t.id === tagId);
        if (tag && !this.selectedTags().some(t => t.id === tagId)) {
            this.selectedTags.update(prev => [...prev, tag]);
            this.form.markAsDirty();
        }
    }

    removeTagById(tagId: string) {
        this.selectedTags.update(prev => prev.filter(t => t.id !== tagId));
        this.form.markAsDirty();
    }

    /** Hydrate tag objects from name strings (backward compat with store data) */
    private hydrateTagsFromNames(names: string[]) {
        const available = this.availableTags();
        if (available.length) {
            this.selectedTags.set(names
                .map(name => available.find(t => t.name === name))
                .filter((t): t is CourseTagDTO => !!t));
        } else {
            // Tags not loaded yet — store names temporarily, re-hydrate in ngOnInit
            this._pendingTagNames = names;
        }
    }
    private _pendingTagNames: string[] = [];

    setDeliveryMode(mode: DeliveryMode) {
        this.currentDeliveryMode.set(mode);
        this.form.markAsDirty();
    }

    private readonly MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB
    private readonly ALLOWED_THUMBNAIL_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver.set(true);
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver.set(false);
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver.set(false);
        const file = event.dataTransfer?.files?.[0];
        if (file) this.handleThumbnailUpload(file);
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        input.value = '';
        this.handleThumbnailUpload(file);
    }

    cancelUpload() {
        this.uploadSub?.unsubscribe();
        this.uploadSub = null;
        this.isUploading.set(false);
        this.uploadProgress.set(0);
        this.thumbnailPreview.set(null);
    }

    private handleThumbnailUpload(file: File) {
        if (file.size > this.MAX_THUMBNAIL_SIZE) {
            this.toast.error('Ảnh quá lớn. Kích thước tối đa: 5MB');
            return;
        }
        if (!this.ALLOWED_THUMBNAIL_TYPES.includes(file.type)) {
            this.toast.error('Định dạng không hỗ trợ. Chỉ chấp nhận: JPG, PNG, WebP');
            return;
        }

        // Generate local preview immediately
        const reader = new FileReader();
        reader.onload = () => this.thumbnailPreview.set(reader.result as string);
        reader.readAsDataURL(file);

        // Upload with progress tracking
        this.isUploading.set(true);
        this.uploadProgress.set(0);
        this.uploadSub = this.service.uploadFileWithProgress(file, 'course-thumbnails').subscribe({
            next: (event) => {
                if (event.type === 'progress') {
                    this.uploadProgress.set(event.progress);
                } else {
                    this.thumbnailUrl.set(event.fileUrl);
                    this.form.markAsDirty();
                    this.isUploading.set(false);
                    this.uploadProgress.set(0);
                    this.toast.success('Ảnh đã được tải lên thành công');
                }
            },
            error: (err: any) => {
                this.toast.error('Tải ảnh thất bại: ' + (err?.error?.message || err?.message || 'Lỗi không xác định'));
                this.isUploading.set(false);
                this.uploadProgress.set(0);
                this.thumbnailPreview.set(null);
            }
        });
    }

    ngOnDestroy() {
        this.uploadSub?.unsubscribe();
    }

    discardChanges() {
        // Cancel any in-progress upload
        this.cancelUpload();

        // Reset form from store
        const tree = this.store.courseTree();
        if (tree) {
            this.form.patchValue({
                title: tree.title,
                description: tree.description,
                categoryId: tree.categoryId || '',
                introVideoUrl: tree.introVideoUrl || '',
                courseInformation: tree.courseInformation || '',
                welcomeMessage: tree.welcomeMessage || '',
                benefits: tree.benefits || '',
                price: tree.price || 0,
                salePrice: tree.salePrice || 0,
                priceType: tree.priceType || 'FREE',
                visibility: tree.visibility || 'PUBLIC',
                credits: tree.credits || 0
            });
            this.thumbnailUrl.set(tree.thumbnailUrl || null);
            this.thumbnailPreview.set(null);
            this.currentDeliveryMode.set((tree.deliveryMode as DeliveryMode) || 'SELF_PACED');
            this.isModeLocked.set(!!tree.hasEnrollments);
            // Re-hydrate tags and category
            this.hydrateTagsFromNames(tree.tags || []);
            if (tree.categoryId && this.categoryTree().length) {
                this.hydrateCategoryFromStore(tree.categoryId);
            }
        }
        this.form.markAsPristine();
    }

    save() {
        if (this.form.invalid) {
            this.toast.warning('Vui lòng kiểm tra lại các trường bắt buộc');
            return;
        }

        // Price validation guard
        if (this.priceError() || this.salePriceError()) {
            this.toast.warning(this.priceError() || this.salePriceError());
            return;
        }

        this.isSaving.set(true);
        const courseId = this.store.courseTree()?.id;
        if (!courseId) {
            this.toast.warning('Không tìm thấy khóa học');
            this.isSaving.set(false);
            return;
        }

        // Prepare payload (tags saved separately via controlled vocabulary API)
        const val = this.form.value;
        const payload = {
            title: val.title || '',
            description: val.description || '',
            thumbnailUrl: this.thumbnailUrl(),
            categoryId: val.categoryId || null,
            tags: this.selectedTags().map(t => t.name), // backward compat for embedded tags
            introVideoUrl: val.introVideoUrl || '',
            courseInformation: val.courseInformation || '',
            welcomeMessage: val.welcomeMessage || '',
            benefits: val.benefits || '',
            price: val.price || 0,
            salePrice: val.salePrice || 0,
            priceType: val.priceType || 'FREE',
            visibility: val.visibility || 'PUBLIC',
            credits: val.credits || 0,
            deliveryMode: this.currentDeliveryMode()
        };

        this.service.updateCourseInfo(courseId, payload).subscribe({
            next: () => {
                // After course info saved, assign controlled vocabulary tags (ID-based)
                const tagIds = this.selectedTags().map(t => t.id);
                this.service.setCourseTags(courseId, tagIds).subscribe({
                    next: () => {
                        this.toast.success('Đã lưu thông tin khóa học');
                        this.isSaving.set(false);
                        this.form.markAsPristine();
                        this.store.loadCourse(courseId, true);
                    },
                    error: () => {
                        // Tags assignment failed but course info saved — still show partial success
                        this.toast.warning('Đã lưu thông tin, nhưng cập nhật thẻ thất bại');
                        this.isSaving.set(false);
                        this.form.markAsPristine();
                        this.store.loadCourse(courseId, true);
                    }
                });
            },
            error: (err: any) => {
                this.toast.error('Lưu thất bại: ' + (err?.error?.message || err?.message || 'Lỗi không xác định'));
                this.isSaving.set(false);
            }
        });
    }
}
