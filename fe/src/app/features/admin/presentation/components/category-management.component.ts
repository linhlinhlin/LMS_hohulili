import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../infrastructure/services/admin.service';
import { CourseCategoryDTO, CourseTagDTO } from '../../../../api/types/course.types';

@Component({
  selector: 'app-category-management',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './category-management.component.scss',
  template: `
    <div class="category-page">
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">Quản lý Danh mục & Tags</h1>
        <p class="page-subtitle">Quản lý danh mục khóa học (2 cấp) và tags</p>
      </div>

      <div class="content-grid">
        <!-- LEFT: Category Tree -->
        <div class="tree-panel">
          <div class="tree-header">
            <h2 class="tree-header-title">Danh mục</h2>
            <button (click)="startCreateRoot()" class="btn-primary">+ Danh mục gốc</button>
          </div>

          @if (isLoading()) {
            <div class="tree-loading">Đang tải...</div>
          } @else {
            <div class="tree-body">
              @for (root of categories(); track root.id) {
                <div class="tree-group">
                  <!-- Root category -->
                  <div class="tree-item"
                       [class.tree-item-selected]="selectedCategory()?.id === root.id"
                       (click)="selectCategory(root)">
                    <button (click)="toggleExpand(root.id, $event)" class="tree-expand-btn">
                      @if (root.children.length > 0) {
                        <span class="expand-icon">{{ expandedRoots().has(root.id) ? '\u25BC' : '\u25B6' }}</span>
                      }
                    </button>
                    <span class="tree-item-name" [class.inactive]="!root.active">{{ root.name }}</span>
                    @if (root.prefix) {
                      <span class="tree-item-prefix">{{ root.prefix }}</span>
                    }
                    @if (!root.active) {
                      <span class="tree-item-hidden">Ẩn</span>
                    }
                  </div>

                  <!-- Subcategories -->
                  @if (expandedRoots().has(root.id)) {
                    @for (sub of root.children; track sub.id) {
                      <div class="tree-sub-item"
                           [class.tree-item-selected]="selectedCategory()?.id === sub.id"
                           (click)="selectCategory(sub)">
                        <span class="tree-sub-name" [class.inactive]="!sub.active">{{ sub.name }}</span>
                        @if (!sub.active) {
                          <span class="tree-item-hidden">Ẩn</span>
                        }
                      </div>
                    }
                    <!-- Add subcategory button -->
                    <button (click)="startCreateSub(root)" class="tree-add-sub">+ Thêm danh mục con</button>
                  }
                </div>
              } @empty {
                <div class="tree-empty">Chưa có danh mục nào</div>
              }
            </div>
          }
        </div>

        <!-- RIGHT: Edit Form + Tags -->
        <div class="right-panel">
          <!-- Tab switcher -->
          <div class="tab-bar">
            <button (click)="activeTab.set('category')"
                    class="tab-btn"
                    [class.tab-active]="activeTab() === 'category'"
                    [class.tab-inactive]="activeTab() !== 'category'">
              Danh mục
            </button>
            <button (click)="activeTab.set('tags')"
                    class="tab-btn"
                    [class.tab-active]="activeTab() === 'tags'"
                    [class.tab-inactive]="activeTab() !== 'tags'">
              Tags ({{ tags().length }})
            </button>
          </div>

          <!-- Category Edit Panel -->
          @if (activeTab() === 'category') {
            @if (isEditing() || isCreating()) {
              <div class="edit-panel">
                <h3 class="edit-panel-title">
                  {{ isCreating() ? (createParentId() ? 'Tạo danh mục con' : 'Tạo danh mục gốc') : 'Chỉnh sửa danh mục' }}
                </h3>
                <div class="form-grid">
                  <div class="form-group">
                    <label class="form-label">Tên *</label>
                    <input [(ngModel)]="formName" placeholder="VD: Hàng hải" class="form-input" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Mã *</label>
                    <input [(ngModel)]="formCode" placeholder="VD: NAVIGATION" class="form-input" [disabled]="isEditing()" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Slug *</label>
                    <input [(ngModel)]="formSlug" placeholder="VD: hang-hai" class="form-input" />
                  </div>
                  @if (!createParentId() && !selectedCategory()?.parentId) {
                    <div class="form-group">
                      <label class="form-label">Prefix</label>
                      <input [(ngModel)]="formPrefix" placeholder="VD: NAV" maxlength="10" class="form-input" />
                    </div>
                  }
                  <div class="form-group">
                    <label class="form-label">Icon</label>
                    <input [(ngModel)]="formIcon" placeholder="VD: compass" class="form-input" />
                  </div>
                  <div class="form-group full-width">
                    <label class="form-label">Mô tả</label>
                    <textarea [(ngModel)]="formDescription" rows="2" placeholder="Mô tả ngắn..." class="form-input"></textarea>
                  </div>
                </div>

                <div class="form-actions">
                  @if (isEditing() && selectedCategory()) {
                    <button (click)="toggleActive()"
                            class="btn-toggle-active"
                            [class.deactivate]="selectedCategory()!.active"
                            [class.activate]="!selectedCategory()!.active">
                      {{ selectedCategory()!.active ? 'Ẩn danh mục' : 'Kích hoạt' }}
                    </button>
                  }
                  <div class="form-actions-spacer"></div>
                  <button (click)="cancelEdit()" class="btn-cancel">Hủy</button>
                  <button (click)="saveCategory()" [disabled]="isSaving()" class="btn-primary-lg">
                    {{ isSaving() ? 'Đang lưu...' : (isCreating() ? 'Tạo' : 'Lưu') }}
                  </button>
                </div>
              </div>
            } @else {
              <div class="empty-panel">
                <p>Chọn một danh mục từ danh sách bên trái để chỉnh sửa</p>
                <p>hoặc nhấn "Danh mục gốc" để tạo mới</p>
              </div>
            }
          }

          <!-- Tags Panel -->
          @if (activeTab() === 'tags') {
            <div class="tags-panel">
              <div class="tags-header">
                <h3 class="tags-title">Quản lý Tags</h3>
                <button (click)="showTagForm.set(true)" class="btn-primary">+ Thêm tag</button>
              </div>

              <!-- Tag create form -->
              @if (showTagForm()) {
                <div class="tag-form">
                  <input [(ngModel)]="tagName" placeholder="Tên tag" class="tag-form-input" />
                  <input [(ngModel)]="tagSlug" placeholder="slug" class="tag-form-input" />
                  <button (click)="saveTag()" class="btn-primary">
                    {{ editingTagId() ? 'Cập nhật' : 'Tạo' }}
                  </button>
                  <button (click)="cancelTagEdit()" class="btn-cancel">Hủy</button>
                </div>
              }

              <!-- Tag list -->
              <div class="tag-list">
                @for (tag of tags(); track tag.id) {
                  <div class="tag-chip">
                    <span>{{ tag.name }}</span>
                    <button (click)="editTag(tag)" class="tag-action tag-edit" title="Sửa">&#9998;</button>
                    <button (click)="deleteTag(tag.id)" class="tag-action tag-delete" title="Xóa">&#10005;</button>
                  </div>
                } @empty {
                  <p class="tags-empty">Chưa có tag nào</p>
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
