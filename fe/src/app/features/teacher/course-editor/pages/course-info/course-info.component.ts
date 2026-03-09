import { Component, OnInit, OnDestroy, effect, inject, signal, untracked, ChangeDetectionStrategy } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CourseEditorStore } from '../../store/course-editor.store';
import { CourseAuthoringService, DeliveryMode } from '../../services/course-authoring.service';
import { CourseCategoryDTO, CourseTagDTO } from '../../../../../api/types/course.types';
import { ToastService } from '../../../../../core/services/toast.service';
import { RichTextEditorComponent } from '../../../../../shared/components/rich-text-editor/rich-text-editor.component';

import { LucideAngularModule } from 'lucide-angular';
 
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-info',
  imports: [ReactiveFormsModule, RichTextEditorComponent, LucideAngularModule],
  template: `
    <div class="min-h-full flex flex-col">
      <div class="flex-1 max-w-screen-2xl mx-auto w-full px-3 sm:px-4 py-3">
        <form [formGroup]="form">
          <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

            <!-- ============ MAIN COLUMN ============ -->
            <div class="space-y-6 min-w-0">
 
              <!-- Card: Thông tin cơ bản -->
              <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div class="px-5 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                  <div>
                    <h2 class="text-lg font-bold text-slate-800">Thông tin cơ bản</h2>
                  </div>
                  <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#0056D2]">
                    <lucide-icon name="info" [size]="18"></lucide-icon>
                  </div>
                </div>
                <div class="px-6 py-3 space-y-3">
                  <div class="space-y-2">
                    <label class="block text-sm font-bold text-slate-900">Tên khóa học <span class="text-rose-500">*</span></label>
                    <input formControlName="title"
                      class="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400 font-medium shadow-inner"
                      placeholder="Nhập tên khóa học chuyên nghiệp..." />
                  </div>
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <label class="block text-sm font-bold text-slate-900">Mô tả ngắn</label>
                    </div>
                    <textarea formControlName="description"
                      class="w-full h-24 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400 resize-none font-medium shadow-inner"
                      placeholder="Mô tả tóm tắt lôi cuốn hiển thị trên trang danh sách..."></textarea>
                  </div>
                  <!-- Delivery Mode -->
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <label class="block text-sm font-bold text-slate-900">Hình thức giảng dạy</label>
                      @if (isModeLocked()) {
                        <span class="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 uppercase tracking-wider">
                          <lucide-icon name="lock" [size]="10"></lucide-icon>
                          Đã khóa
                        </span>
                      }
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <button type="button" (click)="!isModeLocked() && setDeliveryMode('SELF_PACED')"
                              class="flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden group"
                              [class.pointer-events-none]="isModeLocked()"
                              [class.opacity-60]="isModeLocked()"
                              [class]="currentDeliveryMode() === 'SELF_PACED'
                                ? 'border-[#0056D2] bg-blue-50/50 shadow-sm'
                                : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/30'">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                             [class]="currentDeliveryMode() === 'SELF_PACED' ? 'bg-[#0056D2] text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'">
                          <lucide-icon name="video" [size]="20"></lucide-icon>
                        </div>
                        <div class="min-w-0 pr-4">
                          <div class="text-sm font-bold text-slate-900 mb-0.5">Khóa học online</div>
                          <div class="text-[11px] text-slate-500 leading-tight">Tự học linh hoạt qua video & quiz</div>
                        </div>
                        @if (currentDeliveryMode() === 'SELF_PACED') {
                          <div class="absolute top-3 right-3 text-[#0056D2]">
                            <lucide-icon name="circle-check-big" [size]="16"></lucide-icon>
                          </div>
                        }
                      </button>
 
                      <button type="button" (click)="!isModeLocked() && setDeliveryMode('INSTRUCTOR_LED')"
                              class="flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden group"
                              [class.pointer-events-none]="isModeLocked()"
                              [class.opacity-60]="isModeLocked()"
                              [class]="currentDeliveryMode() === 'INSTRUCTOR_LED'
                                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                                : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/30'">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                             [class]="currentDeliveryMode() === 'INSTRUCTOR_LED' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-400'">
                          <lucide-icon name="users" [size]="20"></lucide-icon>
                        </div>
                        <div class="min-w-0 pr-4">
                          <div class="text-sm font-bold text-slate-900 mb-0.5">Lớp học tập trung</div>
                          <div class="text-[11px] text-slate-500 leading-tight">Quản lý lớp, bảng điểm & kiểm tra</div>
                        </div>
                        @if (currentDeliveryMode() === 'INSTRUCTOR_LED') {
                          <div class="absolute top-3 right-3 text-emerald-500">
                            <lucide-icon name="circle-check-big" [size]="16"></lucide-icon>
                          </div>
                        }
                      </button>
                    </div>
                    @if (isModeLocked()) {
                      <p class="text-[11px] text-slate-400 font-medium italic flex items-center gap-1.5 mt-1">
                        <lucide-icon name="alert-circle" [size]="12"></lucide-icon>
                        Không thể thay đổi hình thức khi đã có học viên đăng ký.
                      </p>
                    }
                    @if (currentDeliveryMode() === 'INSTRUCTOR_LED' && !isModeLocked()) {
                      <div class="flex gap-3 p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 text-[11px] text-emerald-800 leading-relaxed shadow-inner">
                        <lucide-icon name="sparkles" [size]="14" class="text-emerald-600 flex-shrink-0 mt-0.5"></lucide-icon>
                        <span><strong>Lớp học tập trung</strong> kích hoạt các tính năng quản lý lớp chuyên sâu. Lựa chọn này sẽ bị khóa sau khi khóa học có học viên đầu tiên.</span>
                      </div>
                    }
                  </div>
                </div>
              </section>
 
              <!-- Card: Nội dung chi tiết (Rich Text) -->
              <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div class="px-5 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                  <div>
                    <h2 class="text-lg font-bold text-slate-800">Nội dung chi tiết</h2>
                  </div>
                  <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <lucide-icon name="layout" [size]="18"></lucide-icon>
                  </div>
                </div>
                <div class="px-6 py-4">
                  <app-rich-text-editor
                    formControlName="courseInformation"
                    placeholder="Bắt đầu soạn thảo nội dung khóa học tại đây..."
                    [height]="400">
                  </app-rich-text-editor>
                </div>
              </section>
 
              <!-- Card: Lợi ích & Chào mừng -->
              <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div class="px-5 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                  <div>
                    <h2 class="text-lg font-bold text-slate-800">Lợi ích & Chào mừng</h2>
                  </div>
                  <div class="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                    <lucide-icon name="heart" [size]="18"></lucide-icon>
                  </div>
                </div>
                <div class="px-6 py-3 space-y-5">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <label class="block text-sm font-bold text-slate-900">Bạn sẽ học được gì</label>
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giá trị cốt lõi</span>
                    </div>
                    <textarea formControlName="benefits"
                      class="w-full h-28 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400 resize-none font-medium shadow-inner"
                      placeholder="VD: Làm chủ kiến thức nền tảng về hàng hải, quản lý đội tàu..."></textarea>
                  </div>
                  <div class="space-y-2">
                    <label class="block text-sm font-bold text-slate-900">Lời chào mừng</label>
                    <textarea formControlName="welcomeMessage"
                      class="w-full h-24 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400 resize-none font-medium shadow-inner"
                      placeholder="Gửi gắm lời chào thân thiện đến học viên khi họ vừa đăng ký thành công..."></textarea>
                  </div>
                </div>
              </section>
            </div>

            <!-- ============ SIDEBAR (5 cards — Shopify/WordPress pattern) ============ -->
            <div class="space-y-4 lg:sticky lg:top-5">

              <!-- 1. Trạng thái (Visibility — always top of sidebar) -->
              <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                  <h2 class="text-sm font-bold text-slate-800">Trạng thái</h2>
                  <lucide-icon name="eye" [size]="14" class="text-slate-400"></lucide-icon>
                </div>
                <div class="p-4">
                  <div class="grid grid-cols-1 gap-2">
                    <label class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden group"
                           [class]="form.get('visibility')?.value === 'PUBLIC'
                             ? 'border-[#0056D2] bg-blue-50/50 shadow-sm'
                             : 'border-slate-100 hover:border-slate-200 bg-white'">
                      <input type="radio" formControlName="visibility" value="PUBLIC" class="hidden">
                      <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                           [class]="form.get('visibility')?.value === 'PUBLIC' ? 'bg-[#0056D2] text-white shadow-md shadow-blue-100' : 'bg-slate-100 text-slate-400'">
                        <lucide-icon name="globe" [size]="16"></lucide-icon>
                      </div>
                      <div class="min-w-0">
                        <span class="text-sm font-bold text-slate-900 block">Công khai</span>
                        <span class="text-[10px] text-slate-500 font-medium block">Mọi người đều thấy</span>
                      </div>
                      @if (form.get('visibility')?.value === 'PUBLIC') {
                        <div class="absolute top-2 right-2 text-[#0056D2]">
                          <lucide-icon name="circle-check-big" [size]="14"></lucide-icon>
                        </div>
                      }
                    </label>

                    <label class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden group"
                           [class]="form.get('visibility')?.value === 'PRIVATE'
                             ? 'border-[#0056D2] bg-blue-50/50 shadow-sm'
                             : 'border-slate-100 hover:border-slate-200 bg-white'">
                      <input type="radio" formControlName="visibility" value="PRIVATE" class="hidden">
                      <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                           [class]="form.get('visibility')?.value === 'PRIVATE' ? 'bg-[#0056D2] text-white shadow-md shadow-blue-100' : 'bg-slate-100 text-slate-400'">
                        <lucide-icon name="lock" [size]="16"></lucide-icon>
                      </div>
                      <div class="min-w-0">
                        <span class="text-sm font-bold text-slate-900 block">Riêng tư</span>
                        <span class="text-[10px] text-slate-500 font-medium block">Chỉ người có link</span>
                      </div>
                      @if (form.get('visibility')?.value === 'PRIVATE') {
                        <div class="absolute top-2 right-2 text-[#0056D2]">
                          <lucide-icon name="circle-check-big" [size]="14"></lucide-icon>
                        </div>
                      }
                    </label>
                  </div>
                </div>
              </section>

              <!-- 2. Ảnh bìa -->
              <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                  <h2 class="text-sm font-bold text-slate-800">Ảnh bìa</h2>
                  <lucide-icon name="image" [size]="14" class="text-slate-400"></lucide-icon>
                </div>
                <div class="p-4">
                  @if (isUploading()) {
                    <div class="aspect-video rounded-xl bg-slate-50 border-2 border-[#0056D2] flex flex-col items-center justify-center p-4 shadow-inner">
                      <div class="relative w-10 h-10 mb-3">
                        <svg class="animate-spin w-full h-full text-[#0056D2]" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-10" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center">
                          <span class="text-[9px] font-black text-[#0056D2]">{{ uploadProgress() }}%</span>
                        </div>
                      </div>
                      <button type="button" (click)="cancelUpload()"
                        class="px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-wider hover:bg-rose-100 transition-colors">
                        Hủy
                      </button>
                    </div>
                  } @else {
                    <div class="aspect-video rounded-xl bg-slate-50 border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group transition-all shadow-inner"
                         [class]="isDragOver() ? 'border-[#0056D2] bg-blue-50/50 scale-[0.98]' : 'border-slate-200 hover:border-[#0056D2]/50 hover:bg-slate-100/30'"
                         (dragover)="onDragOver($event)"
                         (dragleave)="onDragLeave($event)"
                         (drop)="onDrop($event)">
                      @if (!thumbnailPreview() && !thumbnailUrl()) {
                        <div class="z-10 text-center p-4 pointer-events-none transition-transform group-hover:scale-105">
                          <div class="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-2 border border-slate-100 text-slate-400 group-hover:text-[#0056D2] group-hover:shadow-md transition-all">
                            <lucide-icon name="plus" [size]="20"></lucide-icon>
                          </div>
                          <span class="text-[11px] font-bold text-slate-500 block">Tải ảnh bìa</span>
                          <span class="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-1">16:9 Aspect Ratio</span>
                        </div>
                      }
                      @if (thumbnailPreview() || thumbnailUrl()) {
                        <img [src]="thumbnailPreview() || thumbnailUrl()" class="absolute inset-0 w-full h-full object-cover z-0" alt="Cover">
                        <div class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center pointer-events-none backdrop-blur-[2px]">
                          <div class="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full border border-white/30 text-white text-[10px] font-bold uppercase tracking-widest">
                            <lucide-icon name="pencil-line" [size]="12"></lucide-icon>
                            Thay đổi
                          </div>
                        </div>
                      }
                      <input type="file" accept="image/*" (change)="onFileSelected($event)"
                        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20">
                    </div>
                  }
                  <div class="mt-3 flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                      <lucide-icon name="file-info" [size]="10"></lucide-icon>
                      JPG, PNG, WebP
                    </span>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max 5MB</span>
                  </div>
                </div>
              </section>

              <!-- 3. Phân loại (Category + Tags) -->
              <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                  <h2 class="text-sm font-bold text-slate-800">Phân loại</h2>
                  <lucide-icon name="tags" [size]="14" class="text-slate-400"></lucide-icon>
                </div>
                <div class="p-4 space-y-4">
                  <div class="space-y-1.5 relative">
                    <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lĩnh vực</label>
                    <div class="relative">
                      <select class="w-full h-10 pl-3.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all cursor-pointer appearance-none font-medium shadow-inner"
                              (change)="onRootCategoryChange($any($event.target).value)">
                        <option value="" [selected]="!selectedRootId()">-- Chọn lĩnh vực --</option>
                        @for (root of categoryTree(); track root.id) {
                          <option [value]="root.id" [selected]="selectedRootId() === root.id">{{ root.name }}</option>
                        }
                      </select>
                      <div class="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <lucide-icon name="chevron-down" [size]="16"></lucide-icon>
                      </div>
                    </div>
                  </div>
                  @if (subcategories().length) {
                    <div class="space-y-1.5 relative">
                      <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chuyên ngành</label>
                      <div class="relative">
                        <select formControlName="categoryId"
                          class="w-full h-10 pl-3.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all cursor-pointer appearance-none font-medium shadow-inner">
                          <option value="">-- Chọn chuyên ngành --</option>
                          @for (sub of subcategories(); track sub.id) {
                            <option [value]="sub.id">{{ sub.name }}</option>
                          }
                        </select>
                        <div class="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <lucide-icon name="chevron-down" [size]="16"></lucide-icon>
                        </div>
                      </div>
                    </div>
                  } @else if (!selectedRootId()) {
                    <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                       <lucide-icon name="mouse-pointer-2" [size]="14" class="text-slate-400"></lucide-icon>
                       <p class="text-[11px] text-slate-400 italic">Chọn lĩnh vực trước</p>
                    </div>
                  }
                  <!-- Tags (Controlled Vocabulary) -->
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Thẻ chủ đề</label>
                      <span class="text-[10px] font-bold text-slate-400">{{ selectedTags().length }}/5</span>
                    </div>
                    <div class="min-h-[44px] p-2.5 rounded-xl border border-slate-200 bg-slate-50 transition-all flex flex-wrap gap-2 items-center shadow-inner">
                      @if (selectedTags().length === 0) {
                        <span class="text-[11px] text-slate-400 px-1 italic">Chưa chọn thẻ nào...</span>
                      }
                      @for (tag of selectedTags(); track tag.id) {
                        <div class="bg-white text-[#0056D2] text-[11px] font-bold pl-2.5 pr-1.5 py-1 rounded-lg flex items-center gap-1.5 border border-blue-100 shadow-sm transition-all hover:border-[#0056D2]/30">
                          {{ tag.name }}
                          <button type="button" (click)="removeTagById(tag.id)" class="w-5 h-5 flex items-center justify-center rounded-md hover:bg-rose-50 hover:text-rose-500 transition-colors">
                            <lucide-icon name="x" [size]="12"></lucide-icon>
                          </button>
                        </div>
                      }
                    </div>
                    @if (availableTags().length && selectedTags().length < 5) {
                      <div class="flex flex-wrap gap-1.5 mt-2">
                        @for (tag of availableTags(); track tag.id) {
                          @if (!isTagSelected(tag.id)) {
                            <button type="button" (click)="addTagById(tag.id)"
                              class="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-[#0056D2] hover:text-[#0056D2] hover:bg-blue-50/50 transition-all">
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
              <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                  <h2 class="text-sm font-bold text-slate-800">Giá & Tín chỉ</h2>
                  <lucide-icon name="landmark" [size]="14" class="text-slate-400"></lucide-icon>
                </div>
                <div class="p-4 space-y-4">
                  <div class="space-y-1.5 relative">
                    <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Loại giá</label>
                    <div class="relative">
                      <select formControlName="priceType"
                        class="w-full h-10 pl-3.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all cursor-pointer appearance-none font-medium shadow-inner">
                        <option value="FREE">Miễn phí</option>
                        <option value="PAID">Trả phí</option>
                      </select>
                      <div class="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <lucide-icon name="chevron-down" [size]="16"></lucide-icon>
                      </div>
                    </div>
                  </div>
                  @if (form.get('priceType')?.value === 'PAID') {
                    <div class="space-y-3 p-4 bg-amber-50/50 rounded-xl border border-amber-100 shadow-inner">
                      <div class="space-y-1.5">
                        <label class="block text-[11px] font-bold text-amber-700 uppercase tracking-wider">Giá gốc (VND)</label>
                        <div class="relative">
                          <input type="number" formControlName="price" [min]="1000"
                            class="w-full h-10 pl-3.5 pr-12 rounded-xl border bg-white text-slate-900 text-sm focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all font-bold"
                            [class]="priceError() ? 'border-rose-400' : 'border-amber-200'"
                            placeholder="VD: 500000" />
                          <div class="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-500">VND</div>
                        </div>
                        @if (priceError()) {
                          <p class="text-[10px] text-rose-500 font-bold mt-1.5 flex items-center gap-1">
                            <lucide-icon name="alert-circle" [size]="10"></lucide-icon> {{ priceError() }}
                          </p>
                        }
                      </div>
                      <div class="space-y-1.5">
                        <label class="block text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Giá khuyến mãi</label>
                        <div class="relative">
                          <input type="number" formControlName="salePrice" [min]="0"
                            class="w-full h-10 pl-3.5 pr-12 rounded-xl border bg-white text-slate-900 text-sm focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all font-bold"
                            [class]="salePriceError() ? 'border-rose-400' : 'border-emerald-200'"
                            placeholder="VD: 400000" />
                          <div class="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-500">OFF</div>
                        </div>
                        @if (salePriceError()) {
                          <p class="text-[10px] text-rose-500 font-bold mt-1.5 flex items-center gap-1">
                            <lucide-icon name="alert-circle" [size]="10"></lucide-icon> {{ salePriceError() }}
                          </p>
                        }
                      </div>
                    </div>
                  }
                  <div class="space-y-1.5">
                    <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Số tín chỉ</label>
                    <div class="relative">
                      <input type="number" formControlName="credits" [min]="0"
                        class="w-full h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all font-bold shadow-inner" />
                      <div class="absolute right-4 top-1/2 -translate-y-1/2">
                         <lucide-icon name="award" [size]="14" class="text-slate-400"></lucide-icon>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <!-- 5. Video giới thiệu -->
              <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                  <h2 class="text-sm font-bold text-slate-800">Video giới thiệu</h2>
                  <lucide-icon name="clapperboard" [size]="14" class="text-slate-400"></lucide-icon>
                </div>
                <div class="p-4 space-y-3">
                  <div class="relative">
                    <input formControlName="introVideoUrl"
                      class="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400 font-medium shadow-inner"
                      placeholder="https://youtube.com/..." />
                    <div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <lucide-icon name="link" [size]="14"></lucide-icon>
                    </div>
                  </div>
                  <div class="flex gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[10px] text-blue-700 leading-relaxed">
                     <lucide-icon name="info" [size]="12" class="flex-shrink-0 mt-0.5"></lucide-icon>
                     <span>Hỗ trợ YouTube, Vimeo hoặc URL video trực tiếp (MP4, HLS).</span>
                  </div>
                </div>
              </section>
            </div> <!-- End Sidebar -->
          </div> <!-- End Grid -->
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
      error: () => { } // Silent — tags are optional
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
