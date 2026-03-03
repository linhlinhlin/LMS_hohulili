# Course Creation UX Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge 3-step wizard into 2-step, add price validation, placeholders, clickable stepper, cancel button, and unsaved data guard.

**Architecture:** Single-component refactor of `course-creation.component.ts` (template + class). One route change in `teacher.routes.ts` for `canDeactivate`. No new files — the component implements the `CanDeactivate` interface directly.

**Tech Stack:** Angular 20 signals, Reactive Forms, `CanDeactivate` guard, `@HostListener('window:beforeunload')`

**Design Doc:** `docs/plans/2026-03-02-course-creation-ux-fixes-design.md`

---

### Task 1: Update Steps Config & Stepper Template (Clickable Steps)

**Files:**
- Modify: `fe/src/app/features/teacher/courses/course-creation.component.ts:372-376` (steps array)
- Modify: `fe/src/app/features/teacher/courses/course-creation.component.ts:29` (subtitle text)
- Modify: `fe/src/app/features/teacher/courses/course-creation.component.ts:33-58` (stepper template)

**Step 1: Update steps array and subtitle**

Change the steps array from 3 items to 2:

```typescript
// OLD (line 372-376):
steps = [
  { num: 1, label: 'Thông tin' },
  { num: 2, label: 'Mô tả & Giá' },
  { num: 3, label: 'Xác nhận' }
];

// NEW:
steps = [
  { num: 1, label: 'Thông tin' },
  { num: 2, label: 'Hoàn tất' }
];
```

Change subtitle (line 29):
```
OLD: Hoàn thành 3 bước để tạo khóa học của bạn
NEW: Hoàn thành 2 bước để tạo khóa học của bạn
```

**Step 2: Make stepper steps clickable**

Replace the stepper div (line 36-46) — wrap the step circle + label in a `<button>` that calls `goToStep(s.num)`:

```html
<div class="flex items-center gap-2"
     [class.cursor-pointer]="canGoToStep(s.num)"
     [class.cursor-default]="!canGoToStep(s.num)"
     (click)="goToStep(s.num)">
  <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
       [class]="currentStep() > s.num ? 'bg-green-500 text-white hover:bg-green-600' :
                currentStep() === s.num ? 'bg-[#0056D2] text-white shadow-lg ring-4 ring-[#0056D2]/10' :
                'bg-slate-200 text-slate-500'">
    @if (currentStep() > s.num) {
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
    } @else {
      {{ s.num }}
    }
  </div>
  <span class="text-sm font-medium hidden sm:inline"
        [class]="currentStep() >= s.num ? 'text-slate-900' : 'text-slate-400'">
    {{ s.label }}
  </span>
</div>
```

**Step 3: Add `goToStep()` and `canGoToStep()` methods to the class**

Add after `prevStep()` (line 454):

```typescript
goToStep(step: number) {
  if (this.canGoToStep(step)) {
    this.currentStep.set(step);
  }
}

canGoToStep(step: number): boolean {
  if (step === this.currentStep()) return false; // already on this step
  if (step < this.currentStep()) return true;    // can always go back
  // Can go forward only if all previous steps are valid
  if (step === 2) return this.titleControl.valid && this.categoryControl.valid;
  return false;
}
```

**Step 4: Build and verify**

Run: `cd fe && npx ng build 2>&1 | tail -5`
Expected: Build succeeds with 0 errors

---

### Task 2: Merge Step 2 + Step 3 into Single Step 2

**Files:**
- Modify: `fe/src/app/features/teacher/courses/course-creation.component.ts:158-321` (template Step 2 + Step 3)
- Modify: `fe/src/app/features/teacher/courses/course-creation.component.ts:323-356` (footer buttons)
- Modify: `fe/src/app/features/teacher/courses/course-creation.component.ts:406-448` (canProceed, nextStep)

**Step 1: Replace Step 2 + Step 3 template sections**

Remove the old `@if (currentStep() === 2)` block (lines 159-246) and `@if (currentStep() === 3)` block (lines 249-321). Replace with a single merged Step 2:

```html
<!-- Step 2: Hoàn tất & Tạo (merged) -->
@if (currentStep() === 2) {
  <div class="p-6 space-y-5">
    <div class="border-b border-slate-100 pb-4 mb-2">
      <h2 class="text-lg font-semibold text-slate-900">Hoàn tất & Tạo</h2>
      <p class="text-sm text-slate-500 mt-0.5">Thêm thông tin bổ sung và xác nhận tạo khóa học</p>
    </div>

    <!-- Description -->
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Mô tả khóa học</label>
      <textarea [formControl]="descriptionControl" rows="5"
                class="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] transition-colors"
                placeholder="Mô tả ngắn gọn về khóa học..."></textarea>
      <p class="text-xs text-slate-400 mt-1">Có thể bỏ qua và cập nhật sau trong trang chỉnh sửa</p>
    </div>

    <!-- Price Type -->
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-3">Loại giá</label>
      <div class="flex gap-3">
        <button type="button" (click)="priceType.set('FREE')"
                class="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all"
                [class]="priceType() === 'FREE' ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center"
               [class]="priceType() === 'FREE' ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path>
            </svg>
          </div>
          <div>
            <span class="font-semibold text-sm text-slate-900 block">Miễn phí</span>
            <span class="text-xs text-slate-500">Học viên đăng ký tự do</span>
          </div>
        </button>

        <button type="button" (click)="priceType.set('PAID')"
                class="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all"
                [class]="priceType() === 'PAID' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-slate-300'">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center"
               [class]="priceType() === 'PAID' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <span class="font-semibold text-sm text-slate-900 block">Trả phí</span>
            <span class="text-xs text-slate-500">Thiết lập giá khóa học</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Price Fields (conditional) -->
    @if (priceType() === 'PAID') {
      <div class="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Giá gốc (VND) <span class="text-red-500">*</span></label>
          <input [formControl]="priceControl" type="number" min="0" step="10000"
                 class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"
                 placeholder="VD: 500000" />
          @if (priceControl.touched && (!priceControl.value || priceControl.value <= 0)) {
            <div class="text-sm text-red-600 mt-1">Giá gốc bắt buộc và phải lớn hơn 0</div>
          }
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Giá khuyến mãi (VND)</label>
          <input [formControl]="salePriceControl" type="number" min="0" step="10000"
                 class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"
                 placeholder="VD: 400000" />
          @if (salePriceControl.value && salePriceControl.value > 0 && priceControl.value && priceControl.value > 0 && salePriceControl.value >= priceControl.value) {
            <div class="text-sm text-red-600 mt-1">Giá khuyến mãi phải nhỏ hơn giá gốc</div>
          } @else {
            <p class="text-xs text-slate-400 mt-1">Để trống nếu không khuyến mãi</p>
          }
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

    <!-- Compact Summary Card -->
    <div class="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
      <h3 class="text-sm font-semibold text-slate-700 mb-2">Tóm tắt</h3>
      <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <div class="text-slate-500">Hình thức</div>
        <div class="font-medium text-slate-900">{{ selectedMode() === 'INSTRUCTOR_LED' ? 'Lớp học' : 'Khóa học online' }}</div>
        <div class="text-slate-500">Tên khóa học</div>
        <div class="font-medium text-slate-900 truncate">{{ titleControl.value }}</div>
        <div class="text-slate-500">Danh mục</div>
        <div class="font-medium text-slate-900 truncate">{{ selectedCategoryName() || 'Chưa chọn' }}</div>
        <div class="text-slate-500">Giá</div>
        <div class="font-medium text-slate-900">
          @if (priceType() === 'PAID' && priceControl.value) {
            {{ priceControl.value | number:'1.0-0' }} VND
            @if (salePriceControl.value) {
              <span class="text-green-600 text-xs ml-1">(KM: {{ salePriceControl.value | number:'1.0-0' }} VND)</span>
            }
          } @else {
            Miễn phí
          }
        </div>
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
```

**Step 2: Update the footer buttons**

Replace the entire footer section (lines 323-356). Now step 2 is the final step with the "Tạo khóa học" button. Add "Hủy" button:

```html
<!-- Footer: Navigation Buttons -->
<div class="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
  <div class="flex items-center gap-3">
    <button type="button" (click)="onCancel()"
            class="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
      Hủy
    </button>
    @if (currentStep() > 1) {
      <button type="button" (click)="prevStep()"
              class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
        Quay lại
      </button>
    }
  </div>

  <div class="flex items-center gap-3">
    @if (currentStep() < 2) {
      <button type="button" (click)="nextStep()" [disabled]="!canProceed()"
              class="px-5 py-2 text-sm font-medium text-white bg-[#0056D2] rounded-lg hover:bg-[#004BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        Tiếp theo
      </button>
    } @else {
      <button type="button" (click)="onSubmit()" [disabled]="isSubmitting() || !canSubmit()"
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
```

**Step 3: Update class logic — `canProceed()`, `canSubmit()`, `nextStep()`, `onCancel()`**

Replace `canProceed()` (line 406-416):

```typescript
canProceed(): boolean {
  if (this.currentStep() === 1) {
    return this.titleControl.valid && this.categoryControl.valid;
  }
  return true;
}

canSubmit(): boolean {
  if (this.priceType() === 'PAID') {
    if (!this.priceControl.value || this.priceControl.value <= 0) return false;
    if (this.salePriceControl.value && this.salePriceControl.value >= this.priceControl.value) return false;
  }
  return true;
}
```

Update `nextStep()` (line 435-448) — max step is now 2:

```typescript
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
```

Add `onCancel()`:

```typescript
onCancel() {
  this.router.navigate(['/teacher/courses']);
}
```

**Step 4: Build and verify**

Run: `cd fe && npx ng build 2>&1 | tail -5`
Expected: Build succeeds with 0 errors

---

### Task 3: Add Unsaved Data Guard

**Files:**
- Modify: `fe/src/app/features/teacher/courses/course-creation.component.ts:1-9` (imports)
- Modify: `fe/src/app/features/teacher/courses/course-creation.component.ts:363` (class declaration)
- Modify: `fe/src/app/features/teacher/teacher.routes.ts:65-69` (route config)

**Step 1: Update imports and class declaration**

Add `HostListener` to Angular imports (line 1):

```typescript
import { Component, ChangeDetectionStrategy, inject, signal, OnInit, HostListener } from '@angular/core';
```

Add `CanDeactivate` to router imports (line 4):

```typescript
import { Router, RouterModule, CanDeactivate } from '@angular/router';
```

**Step 2: Add `hasUnsavedData()`, `canDeactivate()`, and `@HostListener` to the component class**

Add a `submitted` signal alongside other signals (after `isSubmitting`):

```typescript
submitted = signal(false);
```

Set `this.submitted.set(true)` at the start of `onSubmit()` before navigation.

Add methods after `onCancel()`:

```typescript
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
```

**Step 3: Add functional route guard in teacher.routes.ts**

Update the route config for `course-creation` (line 65-69):

```typescript
{
  path: 'course-creation',
  loadComponent: () => import('./courses/course-creation.component').then(m => m.CourseCreationComponent),
  title: 'Tạo khóa học mới',
  canDeactivate: [(component: any) => component.canDeactivate()]
},
```

Note: Angular 20 supports functional guards inline. The `component` is the `CourseCreationComponent` instance which has `canDeactivate()`.

**Step 4: Build and verify**

Run: `cd fe && npx ng build 2>&1 | tail -5`
Expected: Build succeeds with 0 errors

---

### Task 4: Visual Verification & End-to-End Test

**Step 1: Start dev server**

Run: `cd fe && npm start` (if not already running)

**Step 2: Navigate to http://localhost:4200/teacher/course-creation**

Verify:
- [ ] Stepper shows 2 steps: "Thông tin" and "Hoàn tất"
- [ ] Subtitle says "Hoàn thành 2 bước"
- [ ] Step 1 form unchanged (mode, title, category)

**Step 3: Fill Step 1 and proceed**

- Fill title "Test Course"
- Select category
- Click "Tiếp theo" → should go to Step 2

Verify:
- [ ] Step 2 shows: Description, Price type, Summary card, Info note
- [ ] Summary card shows data from Step 1
- [ ] Price fields show placeholder "VD: 500000" not "0"

**Step 4: Test price validation**

- Click "Trả phí"
- Enter sale price 500000, original price 100000
- Verify: error "Giá khuyến mãi phải nhỏ hơn giá gốc" appears
- Verify: "Tạo khóa học" button is disabled

**Step 5: Test clickable stepper**

- On Step 2, click Step 1 circle → should jump back to Step 1
- On Step 1, click Step 2 circle (if valid) → should jump to Step 2

**Step 6: Test unsaved data guard**

- Fill title on Step 1
- Click "Hủy" or sidebar link
- Verify: confirm dialog "Bạn có dữ liệu chưa lưu..." appears
- Click "Ở lại" → stays on page
- Click "Rời trang" → navigates away

**Step 7: Test cancel button**

- Click "Hủy" (no data entered) → navigates to /teacher/courses silently
- Click "Hủy" (data entered) → confirm dialog appears

**Step 8: Test full creation flow**

- Complete Step 1 → Step 2 → click "Tạo khóa học"
- Verify: toast "Tạo khóa học thành công!" and redirect to editor
- Verify: no unsaved data dialog on successful creation

**Step 9: Commit**

```bash
git add fe/src/app/features/teacher/courses/course-creation.component.ts fe/src/app/features/teacher/teacher.routes.ts
git commit -m "refactor(teacher): merge course creation to 2-step wizard with UX improvements

- Merge 3-step wizard into 2 steps (SOTA: Thinkific/Google Classroom pattern)
- P1: Add sale price < original price validation
- P2: Price fields show placeholder instead of 0
- P2: Add canDeactivate guard + beforeunload for unsaved data
- P3: Stepper steps are now clickable (completed steps)
- P3: Add cancel button in footer

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
