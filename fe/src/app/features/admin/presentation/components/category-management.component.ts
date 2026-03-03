import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../infrastructure/services/admin.service';
import { CourseCategoryDTO, CourseTagDTO } from '../../../../api/types/course.types';

@Component({
  selector: 'app-category-management',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50 p-6">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Quản lý Danh mục & Tags</h1>
        <p class="text-sm text-gray-500 mt-1">Quản lý danh mục khóa học (2 cấp) và tags</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- LEFT: Category Tree -->
        <div class="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 class="font-semibold text-gray-900">Danh mục</h2>
            <button (click)="startCreateRoot()"
                    class="px-3 py-1.5 text-sm bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors">
              + Danh mục gốc
            </button>
          </div>

          @if (isLoading()) {
            <div class="p-8 text-center text-gray-400">Đang tải...</div>
          } @else {
            <div class="p-2 max-h-[600px] overflow-y-auto">
              @for (root of categories(); track root.id) {
                <div class="mb-1">
                  <!-- Root category -->
                  <div class="flex items-center gap-1 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                       [class.bg-[#0056D2]/10]="selectedCategory()?.id === root.id"
                       [class.hover:bg-gray-100]="selectedCategory()?.id !== root.id"
                       (click)="selectCategory(root)">
                    <button (click)="toggleExpand(root.id, $event)" class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600">
                      @if (root.children.length > 0) {
                        <span class="text-xs">{{ expandedRoots().has(root.id) ? '▼' : '▶' }}</span>
                      }
                    </button>
                    <span class="flex-1 text-sm font-medium" [class.text-gray-400]="!root.active">{{ root.name }}</span>
                    @if (root.prefix) {
                      <span class="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{{ root.prefix }}</span>
                    }
                    @if (!root.active) {
                      <span class="text-xs text-red-400">Ẩn</span>
                    }
                  </div>

                  <!-- Subcategories -->
                  @if (expandedRoots().has(root.id)) {
                    @for (sub of root.children; track sub.id) {
                      <div class="flex items-center gap-1 pl-10 pr-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                           [class.bg-[#0056D2]/10]="selectedCategory()?.id === sub.id"
                           [class.hover:bg-gray-50]="selectedCategory()?.id !== sub.id"
                           (click)="selectCategory(sub)">
                        <span class="text-sm text-gray-700" [class.text-gray-400]="!sub.active">{{ sub.name }}</span>
                        @if (!sub.active) {
                          <span class="text-xs text-red-400 ml-auto">Ẩn</span>
                        }
                      </div>
                    }
                    <!-- Add subcategory button -->
                    <button (click)="startCreateSub(root)"
                            class="pl-10 pr-3 py-1.5 text-xs text-[#0056D2] hover:text-[#004BB5] w-full text-left">
                      + Thêm danh mục con
                    </button>
                  }
                </div>
              } @empty {
                <div class="p-8 text-center text-gray-400 text-sm">Chưa có danh mục nào</div>
              }
            </div>
          }
        </div>

        <!-- RIGHT: Edit Form + Tags -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Tab switcher -->
          <div class="flex gap-2">
            <button (click)="activeTab.set('category')"
                    class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    [class.bg-[#0056D2]]="activeTab() === 'category'"
                    [class.text-white]="activeTab() === 'category'"
                    [class.bg-white]="activeTab() !== 'category'"
                    [class.text-gray-700]="activeTab() !== 'category'"
                    [class.border]="activeTab() !== 'category'"
                    [class.border-gray-200]="activeTab() !== 'category'">
              Danh mục
            </button>
            <button (click)="activeTab.set('tags')"
                    class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    [class.bg-[#0056D2]]="activeTab() === 'tags'"
                    [class.text-white]="activeTab() === 'tags'"
                    [class.bg-white]="activeTab() !== 'tags'"
                    [class.text-gray-700]="activeTab() !== 'tags'"
                    [class.border]="activeTab() !== 'tags'"
                    [class.border-gray-200]="activeTab() !== 'tags'">
              Tags ({{ tags().length }})
            </button>
          </div>

          <!-- Category Edit Panel -->
          @if (activeTab() === 'category') {
            @if (isEditing() || isCreating()) {
              <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 class="font-semibold text-gray-900 mb-4">
                  {{ isCreating() ? (createParentId() ? 'Tạo danh mục con' : 'Tạo danh mục gốc') : 'Chỉnh sửa danh mục' }}
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tên *</label>
                    <input [(ngModel)]="formName" placeholder="VD: Hàng hải"
                           class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Mã *</label>
                    <input [(ngModel)]="formCode" placeholder="VD: NAVIGATION"
                           class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"
                           [disabled]="isEditing()" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                    <input [(ngModel)]="formSlug" placeholder="VD: hang-hai"
                           class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]" />
                  </div>
                  @if (!createParentId() && !selectedCategory()?.parentId) {
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
                      <input [(ngModel)]="formPrefix" placeholder="VD: NAV" maxlength="10"
                             class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]" />
                    </div>
                  }
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                    <input [(ngModel)]="formIcon" placeholder="VD: compass"
                           class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]" />
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                    <textarea [(ngModel)]="formDescription" rows="2" placeholder="Mô tả ngắn..."
                              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"></textarea>
                  </div>
                </div>

                <div class="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                  @if (isEditing() && selectedCategory()) {
                    <button (click)="toggleActive()"
                            class="px-4 py-2 text-sm rounded-lg transition-colors"
                            [class.text-red-600]="selectedCategory()!.active"
                            [class.hover:bg-red-50]="selectedCategory()!.active"
                            [class.text-green-600]="!selectedCategory()!.active"
                            [class.hover:bg-green-50]="!selectedCategory()!.active">
                      {{ selectedCategory()!.active ? 'Ẩn danh mục' : 'Kích hoạt' }}
                    </button>
                  }
                  <div class="flex-1"></div>
                  <button (click)="cancelEdit()" class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Hủy</button>
                  <button (click)="saveCategory()" [disabled]="isSaving()"
                          class="px-5 py-2 text-sm bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] disabled:opacity-50 transition-colors">
                    {{ isSaving() ? 'Đang lưu...' : (isCreating() ? 'Tạo' : 'Lưu') }}
                  </button>
                </div>
              </div>
            } @else {
              <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-gray-400">
                <p class="text-sm">Chọn một danh mục từ danh sách bên trái để chỉnh sửa</p>
                <p class="text-sm mt-1">hoặc nhấn "Danh mục gốc" để tạo mới</p>
              </div>
            }
          }

          <!-- Tags Panel -->
          @if (activeTab() === 'tags') {
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-gray-900">Quản lý Tags</h3>
                <button (click)="showTagForm.set(true)"
                        class="px-3 py-1.5 text-sm bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors">
                  + Thêm tag
                </button>
              </div>

              <!-- Tag create form -->
              @if (showTagForm()) {
                <div class="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                  <input [(ngModel)]="tagName" placeholder="Tên tag" class="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056D2]" />
                  <input [(ngModel)]="tagSlug" placeholder="slug" class="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056D2]" />
                  <button (click)="saveTag()" class="px-3 py-1.5 text-sm bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5]">
                    {{ editingTagId() ? 'Cập nhật' : 'Tạo' }}
                  </button>
                  <button (click)="cancelTagEdit()" class="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Hủy</button>
                </div>
              }

              <!-- Tag list -->
              <div class="flex flex-wrap gap-2">
                @for (tag of tags(); track tag.id) {
                  <div class="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm group">
                    <span>{{ tag.name }}</span>
                    <button (click)="editTag(tag)" class="text-gray-400 hover:text-[#0056D2] opacity-0 group-hover:opacity-100 transition-opacity" title="Sửa">
                      ✏️
                    </button>
                    <button (click)="deleteTag(tag.id)" class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Xóa">
                      ✕
                    </button>
                  </div>
                } @empty {
                  <p class="text-sm text-gray-400">Chưa có tag nào</p>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class CategoryManagementComponent implements OnInit {
  private adminService = inject(AdminService);

  // Data
  categories = signal<CourseCategoryDTO[]>([]);
  tags = signal<CourseTagDTO[]>([]);
  isLoading = signal(true);

  // Category edit state
  selectedCategory = signal<CourseCategoryDTO | null>(null);
  isEditing = signal(false);
  isCreating = signal(false);
  isSaving = signal(false);
  createParentId = signal<string | null>(null);
  expandedRoots = signal<Set<string>>(new Set());
  activeTab = signal<'category' | 'tags'>('category');

  // Category form
  formName = '';
  formCode = '';
  formSlug = '';
  formPrefix = '';
  formIcon = '';
  formDescription = '';

  // Tag state
  showTagForm = signal(false);
  editingTagId = signal<string | null>(null);
  tagName = '';
  tagSlug = '';

  ngOnInit(): void {
    this.loadCategories();
    this.loadTags();
  }

  private loadCategories(): void {
    this.isLoading.set(true);
    this.adminService.getCourseCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  private loadTags(): void {
    this.adminService.getCourseTags().subscribe({
      next: (data) => this.tags.set(data)
    });
  }

  // --- Category Tree ---

  toggleExpand(rootId: string, event: Event): void {
    event.stopPropagation();
    const expanded = new Set(this.expandedRoots());
    if (expanded.has(rootId)) {
      expanded.delete(rootId);
    } else {
      expanded.add(rootId);
    }
    this.expandedRoots.set(expanded);
  }

  selectCategory(cat: CourseCategoryDTO): void {
    this.selectedCategory.set(cat);
    this.isEditing.set(true);
    this.isCreating.set(false);
    this.createParentId.set(null);
    this.formName = cat.name;
    this.formCode = cat.code;
    this.formSlug = cat.slug;
    this.formPrefix = cat.prefix || '';
    this.formIcon = cat.icon || '';
    this.formDescription = cat.description || '';
    this.activeTab.set('category');
  }

  startCreateRoot(): void {
    this.isCreating.set(true);
    this.isEditing.set(false);
    this.selectedCategory.set(null);
    this.createParentId.set(null);
    this.resetForm();
    this.activeTab.set('category');
  }

  startCreateSub(parent: CourseCategoryDTO): void {
    this.isCreating.set(true);
    this.isEditing.set(false);
    this.selectedCategory.set(null);
    this.createParentId.set(parent.id);
    this.resetForm();
    this.activeTab.set('category');
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.isCreating.set(false);
    this.selectedCategory.set(null);
    this.createParentId.set(null);
    this.resetForm();
  }

  saveCategory(): void {
    if (!this.formName.trim() || !this.formCode.trim() || !this.formSlug.trim()) return;

    this.isSaving.set(true);

    if (this.isCreating()) {
      const data: any = {
        code: this.formCode.trim(),
        name: this.formName.trim(),
        slug: this.formSlug.trim(),
        description: this.formDescription.trim() || undefined,
        icon: this.formIcon.trim() || undefined,
      };
      if (this.createParentId()) {
        data.parentId = this.createParentId();
      } else {
        data.prefix = this.formPrefix.trim() || undefined;
      }

      this.adminService.createCourseCategory(data).subscribe({
        next: () => {
          this.loadCategories();
          this.cancelEdit();
          this.isSaving.set(false);
        },
        error: () => this.isSaving.set(false)
      });
    } else if (this.isEditing() && this.selectedCategory()) {
      const data: any = {
        name: this.formName.trim(),
        slug: this.formSlug.trim(),
        description: this.formDescription.trim() || undefined,
        icon: this.formIcon.trim() || undefined,
      };
      if (!this.selectedCategory()!.parentId) {
        data.prefix = this.formPrefix.trim() || undefined;
      }

      this.adminService.updateCourseCategory(this.selectedCategory()!.id, data).subscribe({
        next: () => {
          this.loadCategories();
          this.cancelEdit();
          this.isSaving.set(false);
        },
        error: () => this.isSaving.set(false)
      });
    }
  }

  toggleActive(): void {
    const cat = this.selectedCategory();
    if (!cat) return;

    this.adminService.deleteCourseCategory(cat.id).subscribe({
      next: () => {
        this.loadCategories();
        this.cancelEdit();
      }
    });
  }

  private resetForm(): void {
    this.formName = '';
    this.formCode = '';
    this.formSlug = '';
    this.formPrefix = '';
    this.formIcon = '';
    this.formDescription = '';
  }

  // --- Tags ---

  editTag(tag: CourseTagDTO): void {
    this.editingTagId.set(tag.id);
    this.tagName = tag.name;
    this.tagSlug = tag.slug;
    this.showTagForm.set(true);
  }

  cancelTagEdit(): void {
    this.editingTagId.set(null);
    this.tagName = '';
    this.tagSlug = '';
    this.showTagForm.set(false);
  }

  saveTag(): void {
    if (!this.tagName.trim() || !this.tagSlug.trim()) return;

    const data = { name: this.tagName.trim(), slug: this.tagSlug.trim() };

    if (this.editingTagId()) {
      this.adminService.updateCourseTag(this.editingTagId()!, data).subscribe({
        next: () => {
          this.loadTags();
          this.cancelTagEdit();
        }
      });
    } else {
      this.adminService.createCourseTag(data).subscribe({
        next: () => {
          this.loadTags();
          this.cancelTagEdit();
        }
      });
    }
  }

  deleteTag(id: string): void {
    if (!confirm('Xóa tag này?')) return;
    this.adminService.deleteCourseTag(id).subscribe({
      next: () => this.loadTags()
    });
  }
}
