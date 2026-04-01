import {
  Component, ChangeDetectionStrategy, input, output, signal, computed, inject, ElementRef, viewChildren
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuestionBankCategoryDTO } from '../../../../api/types/question-bank.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-quiz-bank-category-sidebar',
  imports: [FormsModule],
  template: `
    @if (!collapsed()) {
      <aside class="flex w-[220px] shrink-0 flex-col border-r border-gray-200 bg-white">

        <!-- Header -->
        <div class="flex h-10 items-center justify-between px-3">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Danh mục</span>
          <button type="button" (click)="toggleCollapse.emit()"
            title="Thu gọn danh mục"
            class="flex h-6 w-6 items-center justify-center rounded text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7M18 19l-7-7 7-7"/>
            </svg>
          </button>
        </div>

        <!-- Category list -->
        <div class="flex-1 overflow-y-auto py-1">

          <!-- Tất cả -->
          <button type="button" (click)="categorySelect.emit(null)"
            class="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors mx-1"
            [class.bg-blue-50]="selectedId() === null"
            [class.text-blue-700]="selectedId() === null"
            [class.font-semibold]="selectedId() === null"
            [class.text-gray-600]="selectedId() !== null"
            [class.hover:bg-gray-50]="selectedId() !== null">
            <svg class="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
            </svg>
            <span class="flex-1 truncate">Tất cả</span>
            <span class="shrink-0 text-[10px] text-gray-400">({{ totalCount() }})</span>
          </button>

          <!-- Root categories -->
          @for (cat of categories(); track cat.id) {
            <!-- Root row -->
            <div class="group/row relative mx-1">
              <button type="button" (click)="selectCategory(cat)"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors"
                [class.bg-[#0056D2]/10]="selectedId() === cat.id"
                [class.text-[#0056D2]]="selectedId() === cat.id"
                [class.font-semibold]="selectedId() === cat.id"
                [class.text-gray-700]="selectedId() !== cat.id"
                [class.hover:bg-gray-50]="selectedId() !== cat.id">
                <!-- Folder icon -->
                <svg class="h-3.5 w-3.5 shrink-0" [class.text-[#0056D2]]="selectedId() === cat.id" [class.text-gray-400]="selectedId() !== cat.id" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
                </svg>

                <!-- Inline rename input or label -->
                @if (editingId() === cat.id) {
                  <input #renameInput
                    [value]="editingName()"
                    (input)="editingName.set($any($event.target).value)"
                    (keydown.enter)="confirmRename(cat.id)"
                    (keydown.escape)="cancelEdit()"
                    (click)="$event.stopPropagation()"
                    maxlength="60"
                    class="flex-1 min-w-0 rounded border border-[#0056D2] bg-white px-1.5 py-0.5 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-[#0056D2]/20" />
                } @else {
                  <span class="flex-1 min-w-0 truncate text-sm">{{ cat.name }}</span>
                  <span class="shrink-0 text-[10px]" [class.text-[#0056D2]]="selectedId() === cat.id" [class.text-gray-400]="selectedId() !== cat.id">({{ cat.questionCount }})</span>
                }

                <!-- Saving spinner -->
                @if (savingId() === cat.id) {
                  <svg class="h-3 w-3 shrink-0 animate-spin text-[#0056D2]" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                }
              </button>

              <!-- Row action icons (hover) — owner only -->
              @if (!readOnly() && editingId() !== cat.id && savingId() !== cat.id) {
                <div class="absolute right-1.5 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 group-hover/row:flex">
                  <!-- Add child -->
                  <button type="button" (click)="startAddChild(cat.id); $event.stopPropagation()"
                    title="Thêm danh mục con"
                    class="flex h-5 w-5 items-center justify-center rounded text-gray-300 transition-colors hover:bg-gray-100 hover:text-[#0056D2]">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                  </button>
                  <!-- Rename -->
                  <button type="button" (click)="startRename(cat); $event.stopPropagation()"
                    title="Đổi tên"
                    class="flex h-5 w-5 items-center justify-center rounded text-gray-300 transition-colors hover:bg-gray-100 hover:text-[#0056D2]">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <!-- Delete -->
                  <button type="button" (click)="deleteCategory.emit({ id: cat.id, name: cat.name }); $event.stopPropagation()"
                    title="Xóa danh mục"
                    class="flex h-5 w-5 items-center justify-center rounded text-gray-300 transition-colors hover:bg-gray-100 hover:text-rose-500">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              }
              @if (editingId() === cat.id) {
                <!-- Confirm/Cancel for inline rename -->
                <div class="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  <button type="button" (click)="confirmRename(cat.id); $event.stopPropagation()"
                    class="flex h-5 w-5 items-center justify-center rounded text-green-500 hover:bg-green-50">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  </button>
                  <button type="button" (click)="cancelEdit(); $event.stopPropagation()"
                    class="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              }
            </div>

            <!-- Add child inline input (shown below this parent) -->
            @if (addingParentId() === cat.id) {
              <div class="mx-1 pl-6">
                <div class="flex items-center gap-1 rounded-lg px-2 py-1">
                  <svg class="h-3 w-3 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
                  </svg>
                  <input #newInput
                    [value]="newCategoryName()"
                    (input)="newCategoryName.set($any($event.target).value)"
                    (keydown.enter)="confirmAdd()"
                    (keydown.escape)="cancelAdd()"
                    placeholder="Tên danh mục con..."
                    maxlength="60"
                    class="flex-1 min-w-0 rounded border border-[#0056D2] bg-white px-1.5 py-0.5 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-[#0056D2]/20" />
                  <button type="button" (click)="confirmAdd()"
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-green-500 hover:bg-green-50">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  </button>
                  <button type="button" (click)="cancelAdd()"
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
            }

            <!-- Children (depth 1) -->
            @for (child of cat.children; track child.id) {
              <div class="group/child relative mx-1 pl-5">
                <button type="button" (click)="selectCategory(child)"
                  class="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors"
                  [class.bg-[#0056D2]/10]="selectedId() === child.id"
                  [class.text-[#0056D2]]="selectedId() === child.id"
                  [class.font-semibold]="selectedId() === child.id"
                  [class.text-gray-600]="selectedId() !== child.id"
                  [class.hover:bg-gray-50]="selectedId() !== child.id">
                  <!-- Indent connector line -->
                  <span class="shrink-0 text-gray-200">└</span>
                  <!-- Inline rename input or label -->
                  @if (editingId() === child.id) {
                    <input
                      [value]="editingName()"
                      (input)="editingName.set($any($event.target).value)"
                      (keydown.enter)="confirmRename(child.id)"
                      (keydown.escape)="cancelEdit()"
                      (click)="$event.stopPropagation()"
                      maxlength="60"
                      class="flex-1 min-w-0 rounded border border-[#0056D2] bg-white px-1.5 py-0.5 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-[#0056D2]/20" />
                  } @else {
                    <span class="flex-1 min-w-0 truncate text-xs">{{ child.name }}</span>
                    <span class="shrink-0 text-[10px]" [class.text-[#0056D2]]="selectedId() === child.id" [class.text-gray-400]="selectedId() !== child.id">({{ child.questionCount }})</span>
                  }
                  @if (savingId() === child.id) {
                    <svg class="h-3 w-3 shrink-0 animate-spin text-[#0056D2]" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                    </svg>
                  }
                </button>

                <!-- Child row actions — owner only -->
                @if (!readOnly() && editingId() !== child.id && savingId() !== child.id) {
                  <div class="absolute right-1.5 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 group-hover/child:flex">
                    <button type="button" (click)="startRename(child); $event.stopPropagation()"
                      title="Đổi tên"
                      class="flex h-5 w-5 items-center justify-center rounded text-gray-300 transition-colors hover:bg-gray-100 hover:text-[#0056D2]">
                      <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    <button type="button" (click)="deleteCategory.emit({ id: child.id, name: child.name }); $event.stopPropagation()"
                      title="Xóa danh mục con"
                      class="flex h-5 w-5 items-center justify-center rounded text-gray-300 transition-colors hover:bg-gray-100 hover:text-rose-500">
                      <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                }
                @if (editingId() === child.id) {
                  <div class="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    <button type="button" (click)="confirmRename(child.id); $event.stopPropagation()"
                      class="flex h-5 w-5 items-center justify-center rounded text-green-500 hover:bg-green-50">
                      <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                    </button>
                    <button type="button" (click)="cancelEdit(); $event.stopPropagation()"
                      class="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100">
                      <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                }
              </div>
            }
          }

          <!-- Add root inline input -->
          @if (addingParentId() === 'ROOT') {
            <div class="mx-1 mt-1">
              <div class="flex items-center gap-1 rounded-lg border border-dashed border-[#0056D2]/40 px-2 py-1.5">
                <svg class="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
                </svg>
                <input #newInput
                  [value]="newCategoryName()"
                  (input)="newCategoryName.set($any($event.target).value)"
                  (keydown.enter)="confirmAdd()"
                  (keydown.escape)="cancelAdd()"
                  placeholder="Tên danh mục..."
                  maxlength="60"
                  class="flex-1 min-w-0 bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400" />
                <button type="button" (click)="confirmAdd()"
                  class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-green-500 hover:bg-green-50">
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </button>
                <button type="button" (click)="cancelAdd()"
                  class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100">
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Footer: add root category button — owner only -->
        @if (!readOnly()) {
        <div class="border-t border-gray-100 p-2">
          <button type="button" (click)="startAddRoot()"
            class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-[#0056D2]/40 hover:text-[#0056D2]">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Thêm danh mục
          </button>
        </div>
        }
      </aside>
    } @else {
      <!-- Collapsed sidebar — just an expand button -->
      <aside class="flex w-10 shrink-0 flex-col items-center border-r border-gray-200 bg-white py-3 gap-2">
        <button type="button" (click)="toggleCollapse.emit()"
          title="Mở rộng danh mục"
          class="flex h-7 w-7 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M6 5l7 7-7 7"/>
          </svg>
        </button>
        <!-- Vertical label -->
        <span class="writing-mode-vertical select-none text-[9px] font-semibold uppercase tracking-widest text-gray-300"
          style="writing-mode: vertical-rl; transform: rotate(180deg)">
          Danh mục
        </span>
      </aside>
    }
  `
})
export class QuizBankCategorySidebarComponent {
  // Inputs
  categories = input<QuestionBankCategoryDTO[]>([]);
  selectedId = input<string | null>(null);
  collapsed = input(false);
  savingId = input<string | null>(null);
  readOnly = input(false);

  // Outputs
  categorySelect = output<string | null>();
  addCategory = output<{ name: string; parentId: string | null }>();
  renameCategory = output<{ id: string; name: string }>();
  deleteCategory = output<{ id: string; name: string }>();
  toggleCollapse = output<void>();

  // Internal UI state
  editingId = signal<string | null>(null);
  editingName = signal('');
  addingParentId = signal<string | 'ROOT' | null>(null);
  newCategoryName = signal('');

  totalCount = computed(() =>
    this.categories().reduce((sum, cat) => {
      const childCount = cat.children?.reduce((s, c) => s + (c.questionCount || 0), 0) ?? 0;
      return sum + (cat.questionCount || 0) + childCount;
    }, 0)
  );

  selectCategory(cat: QuestionBankCategoryDTO) {
    if (this.editingId() === cat.id) return;
    this.categorySelect.emit(cat.id);
  }

  startRename(cat: QuestionBankCategoryDTO) {
    this.cancelAdd();
    this.editingId.set(cat.id);
    this.editingName.set(cat.name);
  }

  confirmRename(id: string) {
    const name = this.editingName().trim();
    if (!name) { this.cancelEdit(); return; }
    this.renameCategory.emit({ id, name });
    this.cancelEdit();
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editingName.set('');
  }

  startAddRoot() {
    this.cancelEdit();
    this.addingParentId.set('ROOT');
    this.newCategoryName.set('');
  }

  startAddChild(parentId: string) {
    this.cancelEdit();
    this.addingParentId.set(parentId);
    this.newCategoryName.set('');
  }

  confirmAdd() {
    const name = this.newCategoryName().trim();
    if (!name) { this.cancelAdd(); return; }
    const parentId = this.addingParentId();
    this.addCategory.emit({
      name,
      parentId: parentId === 'ROOT' ? null : (parentId as string)
    });
    this.cancelAdd();
  }

  cancelAdd() {
    this.addingParentId.set(null);
    this.newCategoryName.set('');
  }
}
