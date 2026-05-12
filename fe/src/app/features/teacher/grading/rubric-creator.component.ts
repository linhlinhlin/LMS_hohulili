import { Component, ChangeDetectionStrategy, signal, computed, inject, viewChild, ElementRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import {
  RubricCriterion,
  validateRubricWeightSum,
  generateRubricId
} from './utils/rubric-calculator';
import { RubricApi } from '../../../api/endpoints/rubric.api';
import {
  buildDefaultRubricLevels,
  buildRubricLevelPoints,
  RUBRIC_SEGMENT_COLORS
} from './rubric-form.defaults';

// ─── Module-level constants ────────────────────────────────────────────────
const RUBRIC_TEMPLATES = [
  {
    id: 'practical', name: 'Kỹ năng thực hành', icon: 'settings',
    description: 'Phù hợp cho bài thực hành, thao tác kỹ thuật, kiểm tra quy trình và tiêu chuẩn an toàn.',
    criteria: [
      { name: 'Kỹ thuật thực hiện', weight: 40 },
      { name: 'Độ chính xác', weight: 30 },
      { name: 'An toàn lao động', weight: 20 },
      { name: 'Hoàn thành đúng hạn', weight: 10 },
    ]
  },
  {
    id: 'report', name: 'Báo cáo bài viết', icon: 'file-text',
    description: 'Dùng cho báo cáo, bài luận hoặc hồ sơ nộp bài cần đánh giá nội dung, cấu trúc và nguồn tham khảo.',
    criteria: [
      { name: 'Nội dung chuyên môn', weight: 50 },
      { name: 'Cấu trúc & Trình bày', weight: 30 },
      { name: 'Tài liệu tham khảo', weight: 20 },
    ]
  },
  {
    id: 'presentation', name: 'Thuyết trình', icon: 'presentation',
    description: 'Dành cho phần trình bày trước lớp, bảo vệ dự án hoặc hoạt động cần đánh giá giao tiếp và phản hồi.',
    criteria: [
      { name: 'Nội dung', weight: 40 },
      { name: 'Kỹ năng trình bày', weight: 30 },
      { name: 'Trả lời câu hỏi', weight: 20 },
      { name: 'Thời gian', weight: 10 },
    ]
  },
  {
    id: 'simulation', name: 'Mô phỏng', icon: 'activity',
    description: 'Phù hợp với tình huống mô phỏng, bài tập xử lý sự cố hoặc hoạt động phối hợp nhóm theo kịch bản.',
    criteria: [
      { name: 'Thực hiện quy trình', weight: 40 },
      { name: 'Xử lý tình huống', weight: 30 },
      { name: 'Phối hợp nhóm', weight: 20 },
      { name: 'Tuân thủ an toàn', weight: 10 },
    ]
  }
];

@Component({
  selector: 'app-rubric-creator',
  imports: [CommonModule, RouterLink, ReactiveFormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50">

      <!-- Page Header -->
      <div class="bg-white border-b border-slate-200">
        <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <a routerLink="/teacher/assessments/shared/rubrics"
               class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <lucide-icon name="arrow-left" [size]="18"></lucide-icon>
            </a>
            <h1 class="text-xl font-bold text-slate-900">Tạo Rubric mới</h1>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" (click)="togglePreview()"
                    class="h-9 px-4 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2">
              <lucide-icon [name]="showPreview() ? 'eye-off' : 'eye'" [size]="15"></lucide-icon>
              {{ showPreview() ? 'Ẩn xem trước' : 'Xem trước' }}
            </button>
            <button type="submit" form="rubricForm"
                    [disabled]="!rubricForm.valid || !isWeightValid() || saving()"
                    class="h-9 px-4 bg-[#0056D2] text-white rounded-lg text-sm font-medium hover:bg-[#004BB5] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              @if (saving()) {
                <lucide-icon name="loader-2" [size]="15" class="animate-spin"></lucide-icon>
                Đang lưu...
              } @else {
                <lucide-icon name="save" [size]="15"></lucide-icon>
                Lưu Rubric
              }
            </button>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="max-w-5xl mx-auto px-6 py-6">
        <form id="rubricForm" [formGroup]="rubricForm" (ngSubmit)="saveRubric()"
              class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Main column -->
          <div class="lg:col-span-2 space-y-5">

            <!-- Basic Info Card -->
            <div class="bg-white border border-slate-200 rounded-xl p-6">
              <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-[#0056D2]"></span>
                Thông tin định danh
              </h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">
                    Tên Rubric <span class="text-rose-500">*</span>
                  </label>
                  <input type="text" formControlName="name"
                         class="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]/10 outline-none transition-colors"
                         placeholder="VD: Rubric Đánh giá Kỹ năng Thực hành"/>
                  @if (rubricForm.get('name')?.invalid && rubricForm.get('name')?.touched) {
                    <p class="mt-1 text-xs text-rose-500">Tên rubric cần ít nhất 3 ký tự.</p>
                  }
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">Mô tả</label>
                  <textarea formControlName="description" rows="3"
                            class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]/10 outline-none transition-colors resize-none"
                            placeholder="Mô tả phạm vi áp dụng..."></textarea>
                </div>
              </div>
            </div>

            <!-- Weight Distribution Bar (only when >= 2 criteria) -->
            @if (criteriaArray.length >= 2) {
              <div class="bg-white border border-slate-200 rounded-xl p-5">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div>
                    <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <span class="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                      Phân bổ trọng số
                    </h2>
                    <p class="mt-1 text-xs text-slate-500">Mỗi màu là một tiêu chí. Kéo mốc để đổi tỷ trọng hoặc mở tiêu chí để nhập số trực tiếp.</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-semibold"
                          [class]="isWeightValid() ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-amber-100 bg-amber-50 text-amber-700'">
                      Tổng {{ totalWeight() }}%
                    </span>
                    <button type="button" (click)="redistributeWeightsEvenly()"
                            class="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:border-[#0056D2]/30 hover:text-[#0056D2] flex items-center gap-1 transition-colors">
                      <lucide-icon name="rotate-ccw" [size]="12"></lucide-icon>
                      Chia đều
                    </button>
                  </div>
                </div>

                <div #weightBar
                     class="relative h-5 rounded-full bg-slate-100 shadow-inner flex overflow-visible select-none"
                     [class.cursor-ew-resize]="draggingIndex() !== null"
                     [class.cursor-default]="draggingIndex() === null">
                  @for (seg of weightSegments(); track $index; let i = $index) {
                    <div class="relative h-full transition-all duration-100 cursor-pointer first:rounded-l-full last:rounded-r-full"
                         [style.width.%]="totalWeight() > 0 ? (seg.weight / totalWeight() * 100) : (100 / weightSegments().length)"
                         [style.background-color]="seg.color"
                         [attr.title]="seg.name + ': ' + seg.weight + '%'"
                         (click)="expandedIndex.set(i)">
                    </div>
                  }

                  @for (pos of handlePositions(); track $index; let i = $index) {
                    <div class="absolute -top-2 h-9 w-5 -translate-x-1/2 flex items-center justify-center cursor-ew-resize z-10 group"
                         [style.left.%]="totalWeight() > 0 ? (pos / totalWeight() * 100) : pos"
                         (pointerdown)="startDrag($event, i)"
                         (pointermove)="onDrag($event)"
                         (pointerup)="endDrag($event)"
                         (pointercancel)="endDrag($event)">
                      <div class="h-8 w-1.5 rounded-full bg-white shadow-md ring-1 ring-slate-300 group-hover:ring-[#0056D2] transition-colors"></div>
                    </div>
                  }
                </div>

                <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  @for (seg of weightSegments(); track $index; let i = $index) {
                    <button type="button" (click)="expandedIndex.set(i)"
                            class="flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors"
                            [class.border-[#0056D2]/40]="expandedIndex() === i"
                            [class.bg-blue-50]="expandedIndex() === i"
                            [class.border-slate-200]="expandedIndex() !== i"
                            [class.hover:border-slate-300]="expandedIndex() !== i">
                      <span class="h-8 w-2.5 rounded-full shrink-0" [style.background-color]="seg.color"></span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-xs font-semibold text-slate-700">{{ seg.name }}</span>
                        <span class="text-[11px] text-slate-400">Tiêu chí {{ i + 1 }}</span>
                      </span>
                      <span class="text-sm font-bold tabular-nums" [style.color]="seg.color">{{ seg.weight }}%</span>
                    </button>
                  }
                </div>

                <div class="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p class="text-xs text-slate-400">Giữ Shift khi kéo để chỉnh từng 1%.</p>
                  @if (!isWeightValid()) {
                    <span class="text-xs font-medium" [class]="totalWeight() > 100 ? 'text-rose-600' : 'text-amber-600'">
                      {{ totalWeight() > 100 ? 'Vượt' : 'Còn thiếu' }} {{ Math.abs(100 - totalWeight()) }}%
                    </span>
                  }
                </div>
              </div>
            }

            <!-- Criteria Builder Card -->
            <div class="bg-white border border-slate-200 rounded-xl p-6">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Cấu trúc tiêu chí
                  </h2>
                </div>
              </div>

              @if (criteriaArray.length === 0) {
                <div class="py-10 text-center border-2 border-dashed border-slate-200 rounded-lg">
                  <lucide-icon name="layers" [size]="28" class="mx-auto mb-2 text-slate-300"></lucide-icon>
                  <p class="text-sm text-slate-400 mb-3">Chưa có tiêu chí nào</p>
                </div>
              } @else {
                <div class="space-y-2" formArrayName="criteria">
                  @for (criterion of criteriaArray.controls; track $index; let i = $index) {
                    <div class="border rounded-xl transition-colors"
                         [class]="expandedIndex() === i ? 'border-[#0056D2]/40 bg-blue-50/30' : 'border-slate-200 hover:border-slate-300'"
                         [formGroupName]="i">

                      <!-- Summary row (always visible) -->
                      <div class="flex items-center gap-3 px-4 py-3 cursor-pointer" (click)="toggleExpand(i)">
                        <!-- Drag grip -->
                        <span class="text-slate-300 cursor-grab active:cursor-grabbing flex-shrink-0">
                          <lucide-icon name="grip-vertical" [size]="14"></lucide-icon>
                        </span>
                        <!-- Index badge -->
                        <span class="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
                              [style.background-color]="segmentColors[i % segmentColors.length] + '20'"
                              [style.color]="segmentColors[i % segmentColors.length]">
                          {{ i + 1 }}
                        </span>
                        <!-- Name display -->
                        <span class="flex-1 text-sm font-medium text-slate-700 truncate">
                          {{ criterion.get('name')?.value || 'Tiêu chí ' + (i + 1) }}
                        </span>
                        <!-- Weight badge -->
                        <span class="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                              [style.background-color]="segmentColors[i % segmentColors.length] + '20'"
                              [style.color]="segmentColors[i % segmentColors.length]">
                          {{ criterion.get('weight')?.value || 0 }}%
                        </span>
                        <!-- Actions -->
                        <div class="flex items-center gap-0.5 flex-shrink-0">
                          <button type="button" (click)="duplicateCriterion(i); $event.stopPropagation()" title="Nhân bản"
                                  class="w-7 h-7 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg flex items-center justify-center transition-colors">
                            <lucide-icon name="copy" [size]="13"></lucide-icon>
                          </button>
                          <button type="button" (click)="removeCriterion(i); $event.stopPropagation()" title="Xóa"
                                  class="w-7 h-7 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-colors">
                            <lucide-icon name="trash-2" [size]="13"></lucide-icon>
                          </button>
                          <lucide-icon [name]="expandedIndex() === i ? 'chevron-up' : 'chevron-down'" [size]="14" class="text-slate-300 ml-1"></lucide-icon>
                        </div>
                      </div>

                      <!-- Expanded detail -->
                      @if (expandedIndex() === i) {
                        <div class="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
                          <!-- Name input -->
                          <div>
                            <label class="block text-xs font-medium text-slate-500 mb-1">Tên tiêu chí <span class="text-rose-400">*</span></label>
                            <input type="text" formControlName="name"
                                   class="w-full h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-300 focus:border-[#0056D2] focus:ring-1 focus:ring-[#0056D2]/20 outline-none transition-colors"
                                   placeholder="Tên tiêu chí *"/>
                          </div>
                          <!-- Description -->
                          <div>
                            <label class="block text-xs font-medium text-slate-500 mb-1">Mô tả hướng dẫn</label>
                            <input type="text" formControlName="description"
                                   class="w-full h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-500 placeholder:text-slate-300 focus:border-[#0056D2] focus:ring-1 focus:ring-[#0056D2]/20 outline-none transition-colors"
                                   placeholder="Mô tả hướng dẫn (tuỳ chọn)..."/>
                          </div>
                          <!-- Weight input -->
                          <div class="flex items-center gap-3">
                            <label class="text-xs font-medium text-slate-500">Trọng số</label>
                            <div class="flex items-center gap-1">
                              <input type="number" formControlName="weight" min="0" max="100"
                                     (input)="onCriterionWeightInput(i, $event)"
                                     class="w-16 h-8 text-center text-sm font-bold text-slate-900 border border-slate-200 rounded-lg focus:border-[#0056D2] focus:ring-1 focus:ring-[#0056D2]/20 outline-none transition-colors"/>
                              <span class="text-xs text-slate-400">%</span>
                            </div>
                          </div>
                          <!-- Levels Grid -->
                          <div class="bg-slate-50 rounded-lg p-3 border border-slate-100">
                              <div class="flex items-center justify-between gap-3 mb-2.5">
                                <span class="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                  <lucide-icon name="bar-chart" [size]="11"></lucide-icon>
                                  Thang điểm
                                </span>
                                <div class="flex flex-wrap justify-end items-center gap-2">
                                  <button type="button" (click)="autoPopulateScores(i)"
                                          title="Chia đều điểm cho các mức hiện có"
                                        class="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1 transition-colors">
                                   <lucide-icon name="target" [size]="11"></lucide-icon>
                                   Tự động
                                </button>
                                <button type="button" (click)="addLevel(i)"
                                        class="text-xs text-[#0056D2] hover:text-[#004BB5] flex items-center gap-1 transition-colors font-medium">
                                  <lucide-icon name="plus" [size]="11"></lucide-icon>
                                  Thêm mức
                                </button>
                              </div>
                            </div>
                            <p class="mb-2 text-[11px] leading-relaxed text-slate-500">
                              Tự động chỉ chia đều điểm cho các mức hiện có. Khi thêm hoặc xóa mức, hệ thống cũng tự chia lại điểm và giữ tên/mô tả đã nhập.
                            </p>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2" formArrayName="levels">
                              @for (level of getLevelsArray(i).controls; track $index; let j = $index) {
                                <div class="relative bg-white border border-slate-200 rounded-lg p-3 group/level hover:border-[#0056D2]/30 transition-colors"
                                     [formGroupName]="j">
                                  <button type="button" (click)="removeLevel(i, j)"
                                          class="absolute top-1 right-1 w-5 h-5 text-slate-300 hover:text-rose-500 rounded flex items-center justify-center transition-colors opacity-0 group-hover/level:opacity-100">
                                    <lucide-icon name="x" [size]="10"></lucide-icon>
                                  </button>
                                  <div class="flex items-center gap-1.5 mb-1.5">
                                    <input type="number" formControlName="points" min="0"
                                           class="w-11 h-7 text-center text-xs font-bold text-[#0056D2] border border-slate-200 rounded focus:border-[#0056D2] focus:ring-1 focus:ring-[#0056D2]/10 outline-none transition-colors"/>
                                    <span class="text-[10px] text-slate-400">đ</span>
                                  </div>
                                   <input type="text" formControlName="name"
                                          class="w-full text-xs font-medium text-slate-700 placeholder:text-slate-300 border-none bg-transparent focus:ring-0 outline-none p-0"
                                          placeholder="Tên mức *"/>
                                   <input type="text" formControlName="description"
                                          class="mt-2 w-full text-[11px] leading-snug text-slate-500 placeholder:text-slate-300 border-none bg-transparent focus:ring-0 outline-none p-0"
                                          placeholder="Mô tả dấu hiệu đạt mức này..."/>
                                 </div>
                               }
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Quick Add input -->
              <div class="mt-3 flex items-center gap-2">
                <div class="flex-1 relative">
                  <input #quickAddInput
                         type="text"
                         placeholder="Nhập tên tiêu chí mới rồi nhấn Enter..."
                         (keydown.enter)="addByName(quickAddInput); $event.preventDefault()"
                         class="w-full h-10 pl-4 pr-10 border border-dashed border-slate-300 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]/10 outline-none transition-all bg-slate-50 hover:bg-white focus:bg-white"/>
                  <lucide-icon name="plus" [size]="14" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></lucide-icon>
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div>
            <div class="sticky top-6 space-y-4">

              <!-- Weight Status Card -->
              <div class="bg-white border border-slate-200 rounded-xl p-5">
                <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full"
                        [class]="isWeightValid() ? 'bg-emerald-500' : 'bg-amber-400'"></span>
                  Trạng thái trọng số
                </h3>

                <div class="flex items-end justify-between mb-2">
                  <span class="text-3xl font-bold text-slate-900">
                    {{ totalWeight() }}<span class="text-base font-medium text-slate-400">%</span>
                  </span>
                  <span class="text-xs text-slate-400">/ 100%</span>
                </div>
                <div class="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div class="h-full rounded-full transition-all duration-500"
                       [class.bg-emerald-500]="isWeightValid()"
                       [class.bg-[#0056D2]]="!isWeightValid() && totalWeight() < 100"
                       [class.bg-rose-500]="totalWeight() > 100"
                       [style.width.%]="Math.min(totalWeight(), 100)"></div>
                </div>

                @if (isWeightValid()) {
                  <div class="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                    <lucide-icon name="check-circle" [size]="14"></lucide-icon>
                    <span class="text-xs font-medium">Cấu hình hợp lệ</span>
                  </div>
                } @else if (totalWeight() < 100) {
                  <div class="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <lucide-icon name="alert-circle" [size]="14"></lucide-icon>
                    <span class="text-xs font-medium">Còn thiếu {{ 100 - totalWeight() }}%</span>
                  </div>
                } @else {
                  <div class="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                    <lucide-icon name="alert-triangle" [size]="14"></lucide-icon>
                    <span class="text-xs font-medium">Vượt quá {{ totalWeight() - 100 }}%</span>
                  </div>
                }

                <div class="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <p class="text-xs text-slate-400 flex items-start gap-2">
                    <span class="w-1 h-1 rounded-full bg-slate-300 mt-1.5 shrink-0"></span>
                    Tổng trọng số phải đúng 100% để lưu.
                  </p>
                  <p class="text-xs text-slate-400 flex items-start gap-2">
                    <span class="w-1 h-1 rounded-full bg-slate-300 mt-1.5 shrink-0"></span>
                    Tên tiêu chí và tên mức độ là bắt buộc.
                  </p>
                </div>
              </div>

              <!-- Cancel -->
              <a routerLink="/teacher/assessments/shared/rubrics"
                 class="block w-full py-2.5 text-center text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium">
                Hủy bỏ & Quay lại
              </a>
            </div>
          </div>
        </form>
      </div>

      <!-- Preview Modal -->
      @if (showPreview()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
             (click)="togglePreview()">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden"
               (click)="$event.stopPropagation()">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p class="text-xs font-medium text-[#0056D2] uppercase tracking-wider mb-0.5">Xem trước Rubric</p>
                <h3 class="text-lg font-bold text-slate-900">{{ rubricForm.get('name')?.value || 'Rubric chưa đặt tên' }}</h3>
              </div>
              <button (click)="togglePreview()"
                      class="w-9 h-9 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors">
                <lucide-icon name="x" [size]="16"></lucide-icon>
              </button>
            </div>
            <div class="flex-1 overflow-y-auto p-6">
              @if (previewCriteria().length === 0) {
                <p class="text-sm text-slate-400 text-center py-8">Chưa có tiêu chí để hiển thị.</p>
              } @else {
                <div class="border border-slate-200 rounded-xl overflow-hidden">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="bg-slate-900 text-white">
                        <th class="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider">Tiêu chí</th>
                        @for (level of previewLevelHeaders(); track $index) {
                          <th class="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-center border-l border-white/10">
                            {{ level }}
                          </th>
                        }
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (criterion of previewCriteria(); track $index) {
                        <tr class="hover:bg-slate-50 transition-colors">
                          <td class="px-5 py-4 border-r border-slate-100">
                            <div class="font-semibold text-slate-900 text-sm mb-0.5">
                              {{ criterion.name || 'Tiêu chí ' + ($index + 1) }}
                            </div>
                            <div class="text-xs text-[#0056D2] font-medium">{{ criterion.weight }}% trọng số</div>
                          </td>
                          @for (level of criterion.levels; track $index) {
                            <td class="px-5 py-4 text-center border-l border-slate-100">
                              <div class="font-semibold text-slate-900 text-sm mb-1">{{ level.name || '-' }}</div>
                              @if (level.description) {
                                <p class="mb-2 text-xs leading-relaxed text-slate-500">{{ level.description }}</p>
                              }
                              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                {{ level.points }} điểm
                              </span>
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Error Toast -->
      @if (error()) {
        <div class="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-lg flex items-center gap-3 z-[200] text-sm">
          <lucide-icon name="alert-circle" [size]="15"></lucide-icon>
          {{ error() }}
          <button (click)="error.set(null)" class="text-slate-400 hover:text-white ml-1">
            <lucide-icon name="x" [size]="14"></lucide-icon>
          </button>
        </div>
      }

      <!-- Success Toast -->
      @if (success()) {
        <div class="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center gap-3 z-[200] text-sm font-medium">
          <lucide-icon name="check-circle" [size]="15"></lucide-icon>
          Rubric đã được tạo thành công!
        </div>
      }

      <!-- Template Dialog -->
      @if (showTemplateDialog()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100">
              <h2 class="text-lg font-bold text-slate-900">Bắt đầu với</h2>
              <p class="text-sm text-slate-500 mt-1">Chọn mẫu có sẵn hoặc tạo từ đầu</p>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                @for (t of templates; track t.id) {
                  <button type="button" (click)="loadTemplate(t)"
                          class="flex items-start gap-3 p-4 min-h-[132px] rounded-xl border-2 border-slate-200 hover:border-[#0056D2] hover:bg-[#0056D2]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0056D2]/30 transition-all text-left group">
                    <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-[#0056D2] group-hover:text-white transition-colors">
                      <lucide-icon [name]="t.icon" [size]="22"></lucide-icon>
                    </span>
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-slate-800 group-hover:text-[#0056D2]">{{ t.name }}</p>
                      <p class="text-xs text-slate-500 mt-1 leading-relaxed">{{ t.description }}</p>
                      <p class="text-xs font-medium text-slate-400 mt-2">{{ t.criteria.length }} tiêu chí</p>
                    </div>
                  </button>
                }
              </div>
              <button type="button" (click)="startFromScratch()"
                      class="w-full py-2.5 text-sm text-slate-500 border border-dashed border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium">
                Tạo từ đầu (trống)
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class RubricCreatorComponent {
  protected Math = Math;
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private rubricApi = inject(RubricApi);

  // ─── State signals ─────────────────────────────────────────────────────────
  saving = signal(false);
  error = signal<string | null>(null);
  showPreview = signal(false);
  success = signal(false);
  showTemplateDialog = signal(true);
  expandedIndex = signal<number | null>(null);
  draggingIndex = signal<number | null>(null);

  // ─── Constants exposed to template ─────────────────────────────────────────
  segmentColors = RUBRIC_SEGMENT_COLORS;
  templates = RUBRIC_TEMPLATES;

  // ─── ViewChild ─────────────────────────────────────────────────────────────
  weightBar = viewChild<ElementRef>('weightBar');

  // ─── Form ───────────────────────────────────────────────────────────────────
  rubricForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    criteria: this.fb.array([])
  });

  get criteriaArray(): FormArray {
    return this.rubricForm.get('criteria') as FormArray;
  }

  private criteriaValue = toSignal(this.criteriaArray.valueChanges, { initialValue: this.criteriaArray.value });

  // ─── Computed ───────────────────────────────────────────────────────────────
  totalWeight = computed(() => {
    const criteria = this.criteriaValue() as { weight: number | null }[];
    return (criteria || []).reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  });

  remainingWeight = computed(() => 100 - this.totalWeight());
  isWeightValid = computed(() => this.totalWeight() === 100);

  previewCriteria = computed((): RubricCriterion[] => {
    return this.criteriaValue() as RubricCriterion[];
  });

  previewLevelHeaders = computed(() => {
    const criteria = this.previewCriteria();
    if (criteria.length === 0) return [];
    const richest = criteria.reduce((a, b) =>
      (a.levels?.length || 0) >= (b.levels?.length || 0) ? a : b
    );
    return (richest.levels || []).map((l: any) => l.name || 'Mức độ');
  });

  weightSegments = computed(() => {
    const criteria = this.criteriaValue() as { name: string; weight: number }[];
    return (criteria || []).map((c, i) => ({
      name: c.name || `Tiêu chí ${i + 1}`,
      weight: Math.max(0, Number(c.weight) || 0),
      color: RUBRIC_SEGMENT_COLORS[i % RUBRIC_SEGMENT_COLORS.length]
    }));
  });

  // Cumulative positions for handles (N-1 handles for N segments)
  handlePositions = computed(() => {
    const segs = this.weightSegments();
    const positions: number[] = [];
    let cum = 0;
    for (let i = 0; i < segs.length - 1; i++) {
      cum += segs[i].weight;
      positions.push(Math.min(cum, 100));
    }
    return positions;
  });


  // ─── Template selection ─────────────────────────────────────────────────────
  loadTemplate(template: typeof RUBRIC_TEMPLATES[0]): void {
    while (this.criteriaArray.length) this.criteriaArray.removeAt(0);
    template.criteria.forEach(c => {
      const group = this.fb.group({
        id: [generateRubricId('criterion')],
        name: [c.name, Validators.required],
        description: [''],
        weight: [c.weight, [Validators.required, Validators.min(0), Validators.max(100)]],
        levels: this.createDefaultLevelsFormArray(c.weight)
      });
      this.criteriaArray.push(group);
    });
    this.showTemplateDialog.set(false);
  }

  startFromScratch(): void {
    this.showTemplateDialog.set(false);
    if (this.criteriaArray.length === 0) this.addCriterion();
  }

  // ─── Quick Add ──────────────────────────────────────────────────────────────
  addByName(input: HTMLInputElement): void {
    const name = input.value.trim();
    if (!name) return;
    const nextCriterionCount = this.criteriaArray.length + 1;
    const suggestedWeight = Math.floor(100 / nextCriterionCount);
    const criterionGroup = this.fb.group({
      id: [generateRubricId('criterion')],
      name: [name, Validators.required],
      description: [''],
      weight: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      levels: this.createDefaultLevelsFormArray(suggestedWeight)
    });
    this.criteriaArray.push(criterionGroup);
    this.redistributeWeightsEvenly();
    this.expandedIndex.set(this.criteriaArray.length - 1);
    input.value = '';
    input.focus();
  }

  redistributeWeightsEvenly(): void {
    const n = this.criteriaArray.length;
    if (n === 0) return;
    const base = Math.floor(100 / n);
    const rem = 100 - base * n;
    for (let i = 0; i < n; i++) {
      this.criteriaArray.at(i).get('weight')?.setValue(i === 0 ? base + rem : base, { emitEvent: false });
    }
    this.redistributeAllLevelPoints();
  }

  // ─── Collapse/Expand ────────────────────────────────────────────────────────
  toggleExpand(index: number): void {
    this.expandedIndex.update(v => v === index ? null : index);
  }

  // ─── Drag & Drop weight bar ─────────────────────────────────────────────────
  startDrag(event: PointerEvent, handleIndex: number): void {
    event.preventDefault();
    this.draggingIndex.set(handleIndex);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onDrag(event: PointerEvent): void {
    const idx = this.draggingIndex();
    if (idx === null) return;
    const bar = this.weightBar()?.nativeElement as HTMLElement;
    if (!bar) return;

    const rect = bar.getBoundingClientRect();
    const raw = ((event.clientX - rect.left) / rect.width) * 100;
    // Snap to 5% by default; hold Shift for 1% precision
    let pct = event.shiftKey ? Math.round(raw) : Math.round(raw / 5) * 5;

    // Clamp: keep MIN_WEIGHT (5%) for each segment
    const MIN = 5;
    const positions = this.handlePositions();
    const left = idx > 0 ? positions[idx - 1] + MIN : MIN;
    const right = idx < positions.length - 1 ? positions[idx + 1] - MIN : 100 - MIN;
    pct = Math.max(left, Math.min(right, pct));

    const newPositions = [...positions];
    newPositions[idx] = pct;
    this.applyHandlePositions(newPositions);
  }

  endDrag(event: PointerEvent): void {
    this.draggingIndex.set(null);
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  }

  private applyHandlePositions(positions: number[]): void {
    const n = this.criteriaArray.length;
    for (let i = 0; i < n; i++) {
      let w: number;
      if (n === 1) w = 100;
      else if (i === 0) w = positions[0];
      else if (i === n - 1) w = 100 - positions[n - 2];
      else w = positions[i] - positions[i - 1];
      this.criteriaArray.at(i).get('weight')?.setValue(Math.round(w), { emitEvent: false });
    }
    this.redistributeAllLevelPoints();
  }

  // ─── Existing methods (preserved) ───────────────────────────────────────────
  getLevelsArray(criterionIndex: number): FormArray {
    return this.criteriaArray.at(criterionIndex).get('levels') as FormArray;
  }

  addCriterion(): void {
    const id = generateRubricId('criterion');
    const weightSuggestion = Math.max(0, this.remainingWeight());

    const criterionGroup = this.fb.group({
      id: [id],
      name: ['', Validators.required],
      description: [''],
      weight: [weightSuggestion, [Validators.required, Validators.min(0), Validators.max(100)]],
      levels: this.createDefaultLevelsFormArray(weightSuggestion)
    });

    this.criteriaArray.push(criterionGroup);
  }

  private createDefaultLevelsFormArray(maxPoints: number): FormArray {
    return this.fb.array(buildDefaultRubricLevels(maxPoints).map(level =>
      this.createLevelFormGroup(level.name, level.points, level.description)
    ));
  }

  private createLevelFormGroup(name: string = '', points: number = 0, description: string = ''): FormGroup {
    return this.fb.group({
      id: [generateRubricId('level')],
      name: [name, Validators.required],
      description: [description],
      points: [points, [Validators.required, Validators.min(0)]]
    });
  }

  removeCriterion(index: number): void {
    this.criteriaArray.removeAt(index);
    if (this.expandedIndex() === index) {
      this.expandedIndex.set(null);
    } else if ((this.expandedIndex() ?? 0) > index) {
      this.expandedIndex.update(v => (v ?? 0) - 1);
    }
    this.redistributeWeightsEvenly();
  }

  addLevel(criterionIndex: number): void {
    const levelsArray = this.getLevelsArray(criterionIndex);
    levelsArray.push(this.createLevelFormGroup());
    this.redistributeExistingLevelPoints(criterionIndex);
  }

  removeLevel(criterionIndex: number, levelIndex: number): void {
    const levelsArray = this.getLevelsArray(criterionIndex);
    if (levelsArray.length > 1) {
      levelsArray.removeAt(levelIndex);
      this.redistributeExistingLevelPoints(criterionIndex);
    }
  }

  duplicateCriterion(index: number): void {
    const source = this.criteriaArray.at(index).value;
    const id = generateRubricId('criterion');

    const criterionGroup = this.fb.group({
      id: [id],
      name: [`${source.name} (Bản sao)`, Validators.required],
      description: [source.description],
      weight: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      levels: this.fb.array(
        (source.levels || []).map((l: any) => this.createLevelFormGroup(l.name, l.points, l.description || ''))
      )
    });

    this.criteriaArray.insert(index + 1, criterionGroup);
  }

  autoPopulateScores(criterionIndex: number): void {
    this.redistributeExistingLevelPoints(criterionIndex);
  }

  onCriterionWeightInput(criterionIndex: number, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const weight = input?.value === '' ? 0 : Number(input?.value);
    if (input?.value !== '' && Number.isFinite(weight)) {
      this.criteriaArray.at(criterionIndex).get('weight')?.setValue(weight, { emitEvent: false });
    }
    this.redistributeExistingLevelPoints(criterionIndex, true, Number.isFinite(weight) ? weight : 0);
  }

  private getCriterionWeight(criterionIndex: number): number {
    return Number(this.criteriaArray.at(criterionIndex).get('weight')?.value) || 0;
  }

  private redistributeAllLevelPoints(): void {
    for (let i = 0; i < this.criteriaArray.length; i++) {
      this.redistributeExistingLevelPoints(i, false);
    }
    this.criteriaArray.updateValueAndValidity();
  }

  private redistributeExistingLevelPoints(
    criterionIndex: number,
    emitEvent = true,
    maxPoints = this.getCriterionWeight(criterionIndex)
  ): void {
    const levelsArray = this.getLevelsArray(criterionIndex);
    const points = buildRubricLevelPoints(maxPoints, levelsArray.length);
    points.forEach((point, index) => {
      levelsArray.at(index).get('points')?.setValue(point, { emitEvent: false });
    });
    levelsArray.updateValueAndValidity({ emitEvent });
  }

  togglePreview(): void {
    this.showPreview.update(v => !v);
  }

  saveRubric(): void {
    if (!this.rubricForm.valid || !this.isWeightValid()) {
      this.error.set('Vui lòng hoàn thiện cấu trúc Rubric (Tổng trọng số 100%)');
      return;
    }

    const criteria = this.criteriaArray.value as RubricCriterion[];
    const validation = validateRubricWeightSum(criteria);
    if (!validation.isValid) {
      this.error.set(validation.errors[0]?.message || 'Tổng trọng số không hợp lệ');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const formValue = this.rubricForm.value;
    const request = {
      title: formValue.name as string,
      description: formValue.description as string || undefined,
      maxPoints: 100,
      criteria: (formValue.criteria as any[]).map(c => ({
        name: c.name,
        description: c.description || undefined,
        maxPoints: c.weight,
        levels: (c.levels || []).map((l: any) => ({
          label: l.name,
          description: l.description || undefined,
          points: l.points
        }))
      }))
    };

    this.rubricApi.create(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/teacher/assessments/shared/rubrics']), 1500);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Không thể kết nối máy chủ để lưu Rubric.');
      }
    });
  }
}
