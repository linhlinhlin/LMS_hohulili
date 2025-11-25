# Section Editor Integration Code

## ✅ Step 1: Imports (DONE)
Already added:
```typescript
import { QuizEditModalComponent } from './components/quiz-edit-modal.component';
// Added to imports array: QuizEditModalComponent
```

## 📋 Step 2: Add ViewChild and Methods

Tìm phần TypeScript class trong file (sau template), thêm code sau:

### A. Add ViewChild Reference
```typescript
@ViewChild(QuizCreationModalComponent) quizCreationModal!: QuizCreationModalComponent;
@ViewChild(QuizEditModalComponent) quizEditModal!: QuizEditModalComponent;  // ← ADD THIS
```

### B. Add Methods
Thêm các methods sau vào class:

```typescript
// Open quiz edit modal
editQuizSettings(lessonId: string) {
  console.log('🔧 Opening quiz edit modal for lesson:', lessonId);
  this.quizEditModal.lessonId = lessonId;
  this.quizEditModal.open();
}

// Handle quiz settings saved
onQuizSettingsSaved() {
  console.log('✅ Quiz settings updated successfully');
  // Reload lessons to show updated info
  this.loadLessons();
}

// Handle quiz edit modal closed
onQuizEditModalClosed() {
  console.log('Quiz edit modal closed');
}
```

## 📋 Step 3: Update Template

### A. Find Button "Sửa" Section
Tìm đoạn code có button "Sửa" trong template (trong phần table actions):

```html
<button class="..." (click)="startEdit(l)">Sửa</button>
```

### B. Replace With Conditional Buttons
Thay bằng code sau để có button riêng cho quiz:

```html
<!-- Quiz-specific edit button -->
<button *ngIf="l.lessonType === 'QUIZ'" 
        (click)="editQuizSettings(l.id)"
        class="px-3 py-1.5 text-base shadow-sm text-blue-600 hover:shadow-md hover:text-blue-700 transition-all duration-200 flex items-center gap-1">
  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
  </svg>
  Cấu hình
</button>

<!-- Regular edit button for non-quiz lessons -->
<button *ngIf="l.lessonType !== 'QUIZ'" 
        (click)="startEdit(l)"
        class="px-3 py-1.5 text-base shadow-sm text-blue-600 hover:shadow-md hover:text-blue-700 transition-all duration-200">
  Sửa
</button>
```

### C. Add Modal Component at End of Template
Tìm cuối template (trước closing `</div>` cuối cùng), thêm:

```html
<!-- Quiz Edit Modal -->
<app-quiz-edit-modal 
  (saved)="onQuizSettingsSaved()"
  (closed)="onQuizEditModalClosed()">
</app-quiz-edit-modal>
```

## 🔍 How to Find Locations

### Finding the Button Section:
1. Search for: `<button` và `Sửa`
2. Hoặc search: `startEdit`
3. Nằm trong table actions column

### Finding End of Template:
1. Scroll to bottom of file
2. Tìm closing `</div>` tags
3. Add modal component trước closing div cuối cùng

## ✅ Verification

After integration, check:
1. ✅ No TypeScript errors
2. ✅ Component compiles
3. ✅ Quiz lessons show "Cấu hình" button
4. ✅ Non-quiz lessons show "Sửa" button
5. ✅ Click "Cấu hình" opens modal
6. ✅ Modal loads quiz settings
7. ✅ Save updates quiz successfully

## 🎯 Quick Integration Steps

1. **Imports** - ✅ DONE
2. **ViewChild** - Find class, add `@ViewChild(QuizEditModalComponent)`
3. **Methods** - Add 3 methods: `editQuizSettings()`, `onQuizSettingsSaved()`, `onQuizEditModalClosed()`
4. **Template Button** - Replace single "Sửa" button with conditional buttons
5. **Template Modal** - Add `<app-quiz-edit-modal>` at end

## 📝 Alternative: Manual File Locations

If you need exact line numbers, search for these patterns:
- Line ~1-20: Imports section
- Line ~100-200: Button actions in table
- Line ~2000+: End of template

The file is very large (~2500 lines) with inline template, so use search to find exact locations.
