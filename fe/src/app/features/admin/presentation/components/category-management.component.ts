import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  DragDropModule,
  CdkDragEnter,
} from '@angular/cdk/drag-drop';
import { AdminService } from '../../infrastructure/services/admin.service';
import { CourseCategoryDTO, CourseTagDTO } from '../../../../api/types/course.types';

@Component({
  selector: 'app-category-management',
  imports: [CommonModule, FormsModule, DragDropModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './category-management.component.scss',
  template: `
    <div class="category-page">
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">Quản lý Danh mục & Tags</h1>
        <p class="page-subtitle">Kéo-thả để sắp xếp lại hoặc chuyển danh mục con sang nhánh khác (tối đa 2 cấp)</p>
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
            <!--
              cdkDropListGroup: connect every list (root list + per-root sub
              lists) so the user can drag a category from any container into
              any other compatible container without us having to wire ids
              manually.

              Sub-categories live in their own per-root cdkDropList so the
              user can promote (drag out → root list) or move between roots.
              We hard-disable nesting beyond 2 levels via cdkDropListEnterPredicate.
            -->
            <div class="tree-body" cdkDropListGroup>
              <!-- Root-level drop list -->
              <div
                class="tree-root-list"
                cdkDropList
                cdkDropListLockAxis="y"
                [cdkDropListData]="categories()"
                [id]="ROOT_LIST_ID"
                (cdkDropListDropped)="onDropCategory($event)">
                @for (root of categories(); track root.id) {
                  <div class="tree-group" cdkDrag [cdkDragData]="root">
                    <!-- Root category row -->
                    <div class="tree-item"
                         [class.tree-item-selected]="selectedCategory()?.id === root.id"
                         (click)="selectCategory(root)">
                      <span class="drag-handle" cdkDragHandle title="Kéo để sắp xếp lại" aria-label="Kéo để sắp xếp lại">
                        &#x2630;
                      </span>
                      <button (click)="toggleExpand(root.id, $event)" class="tree-expand-btn"
                              [attr.aria-label]="expandedRoots().has(root.id) ? 'Thu gọn' : 'Mở rộng'">
                        @if (root.children.length > 0) {
                          <span class="expand-icon">{{ expandedRoots().has(root.id) ? '▼' : '▶' }}</span>
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

                    <!-- Sub-category drop list (always present so the user can
                         drop into an empty root). Hidden when collapsed. -->
                    @if (expandedRoots().has(root.id)) {
                      <div
                        class="tree-sub-list"
                        cdkDropList
                        cdkDropListLockAxis="y"
                        [cdkDropListData]="root.children"
                        [id]="'sub-list-' + root.id"
                        [cdkDropListEnterPredicate]="canEnterSubList"
                        (cdkDropListEntered)="onSubListEnter($event, root.id)"
                        (cdkDropListExited)="onSubListExit()"
                        (cdkDropListDropped)="onDropCategory($event, root.id)"
                        [class.drop-zone-invalid]="invalidDropTargetId() === root.id">
                        @for (sub of root.children; track sub.id) {
                          <div class="tree-sub-item"
                               cdkDrag
                               [cdkDragData]="sub"
                               [class.tree-item-selected]="selectedCategory()?.id === sub.id"
                               (click)="selectCategory(sub)">
                            <span class="drag-handle" cdkDragHandle title="Kéo để sắp xếp lại" aria-label="Kéo để sắp xếp lại">
                              &#x2630;
                            </span>
                            <span class="tree-sub-name" [class.inactive]="!sub.active">{{ sub.name }}</span>
                            @if (!sub.active) {
                              <span class="tree-item-hidden">Ẩn</span>
                            }
                          </div>
                        } @empty {
                          <div class="tree-sub-empty">Thả vào đây để thêm danh mục con</div>
                        }
                      </div>
                      <!-- Add subcategory button -->
                      <button (click)="startCreateSub(root)" class="tree-add-sub">+ Thêm danh mục con</button>
                    }
                  </div>
                } @empty {
                  <div class="tree-empty">Chưa có danh mục nào</div>
                }
              </div>
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
              <!-- F-CAT3 (epic #186): Carbon empty-state pattern
                   Inform + Inspire + Activate.
                   - Illustration: layered tag icon stack signals "danh mục
                     có nhiều cấp" without a brand icon (kpi-card rule).
                   - Inspire copy explains what the user can do here.
                   - Activate CTA fires the same handler as the sidebar
                     "+ Danh mục gốc" button — single source of truth. -->
              <div class="empty-panel" role="status" aria-live="polite">
                <svg
                  class="empty-illustration"
                  viewBox="0 0 96 96"
                  fill="none"
                  aria-hidden="true">
                  <!-- Stacked tag illustration: back tag (muted), front tag (primary tint). -->
                  <rect x="14" y="22" width="52" height="36" rx="6"
                        fill="#E5E7EB" stroke="#D1D5DB" stroke-width="2"/>
                  <circle cx="22" cy="32" r="3" fill="#9CA3AF"/>
                  <rect x="26" y="36" width="36" height="4" rx="2" fill="#D1D5DB"/>
                  <rect x="26" y="44" width="22" height="4" rx="2" fill="#D1D5DB"/>
                  <!-- Front tag, slightly offset, primary tint. -->
                  <rect x="28" y="36" width="52" height="36" rx="6"
                        fill="#E0EAFD" stroke="#0056D2" stroke-width="2"/>
                  <circle cx="36" cy="46" r="3" fill="#0056D2"/>
                  <rect x="40" y="50" width="36" height="4" rx="2" fill="#0056D2" fill-opacity="0.4"/>
                  <rect x="40" y="58" width="22" height="4" rx="2" fill="#0056D2" fill-opacity="0.3"/>
                </svg>
                <h3 class="empty-title">Chọn danh mục để xem chi tiết</h3>
                <p class="empty-desc">
                  Bạn có thể chỉnh sửa tên, mã, mô tả, hoặc thêm danh mục con
                  trực tiếp tại đây. Kéo-thả các mục bên trái để sắp xếp lại.
                </p>
                <button type="button" class="empty-cta" (click)="startCreateRoot()">
                  + Tạo danh mục mới
                </button>
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

          <!-- Toast (drag-drop feedback) -->
          @if (toast(); as msg) {
            <div class="toast" role="status" aria-live="polite" [class.toast-error]="toastIsError()">
              {{ msg }}
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class CategoryManagementComponent implements OnInit {
  private adminService = inject(AdminService);

  /** Stable id for the root drop-list — referenced from `cdkDropList[id]`. */
  readonly ROOT_LIST_ID = 'category-root-list';

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

  // Drag-drop UI state
  invalidDropTargetId = signal<string | null>(null);
  toast = signal<string | null>(null);
  toastIsError = signal(false);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

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

  // ============================================
  // DRAG-DROP (issue #199, F-CAT1)
  // ============================================

  /**
   * Predicate: only allow a drag item to enter a sub-list if doing so would
   * not create a level-3 grandchild. Since our root-level dropList holds
   * roots (which are containers) and our sub-lists hold leaves (subs), the
   * dragged item being a root-with-children must NOT be allowed into a
   * sub-list.
   *
   * `cdkDropListEnterPredicate` runs synchronously on hover, before drop —
   * we use it to flip `drop-zone-invalid` red CSS state too via
   * onSubListEnter / Exit.
   */
  canEnterSubList = (drag: { data: CourseCategoryDTO }): boolean => {
    const item = drag.data;
    // A root with children cannot become a sub (would push children to L3).
    if (!item.parentId && item.children && item.children.length > 0) {
      return false;
    }
    return true;
  };

  onSubListEnter(event: CdkDragEnter<CourseCategoryDTO[]>, rootId: string): void {
    const item = event.item.data as unknown as CourseCategoryDTO;
    // Mirror the predicate so we can paint the red invalid-drop hint while
    // hovering — the predicate itself doesn't expose hover state.
    if (!item.parentId && item.children && item.children.length > 0) {
      this.invalidDropTargetId.set(rootId);
    } else {
      this.invalidDropTargetId.set(null);
    }
  }

  onSubListExit(): void {
    this.invalidDropTargetId.set(null);
  }

  /**
   * Drop handler — fires for both root list drops and per-root sub-list drops.
   *
   * @param event           CDK event containing previous + new container
   * @param targetParentId  rootId of the destination sub-list, or undefined for
   *                        the root list (i.e. promote to root)
   */
  onDropCategory(event: CdkDragDrop<CourseCategoryDTO[]>, targetParentId?: string): void {
    this.invalidDropTargetId.set(null);
    const moved = event.item.data as CourseCategoryDTO;
    const newSortOrder = event.currentIndex;
    const newParentId = targetParentId ?? null;
    const oldParentId = moved.parentId ?? null;

    // No-op: dropped at the same position in same container.
    if (event.previousContainer === event.container && event.previousIndex === event.currentIndex) {
      return;
    }

    // Predicate already blocked invalid moves into sub lists, but defend in
    // depth: refuse demoting a root that has children.
    if (newParentId !== null && !moved.parentId && moved.children && moved.children.length > 0) {
      this.showToast('Không thể chuyển danh mục cha xuống làm danh mục con vì sẽ vượt quá 2 cấp.', true);
      return;
    }

    // Snapshot for rollback.
    const snapshot = this.deepCloneTree(this.categories());

    // Optimistic local update: remove from source container, insert into destination.
    const optimistic = this.applyOptimistic(this.categories(), moved.id, oldParentId, newParentId, newSortOrder);
    this.categories.set(optimistic);

    this.adminService.moveCourseCategory(moved.id, newParentId, newSortOrder).subscribe({
      next: (tree) => {
        // BE returns the canonical tree — replace optimistic with truth.
        this.categories.set(tree);
        this.showToast('Đã cập nhật danh mục.', false);
      },
      error: (err) => {
        // Rollback.
        this.categories.set(snapshot);
        const msg = err?.error?.message || 'Không thể di chuyển danh mục. Vui lòng thử lại.';
        this.showToast(msg, true);
      }
    });
  }

  /**
   * Pure helper: rebuilds the categories tree with `categoryId` removed from
   * its current location and inserted at `newSortOrder` under `newParentId`
   * (null = root). We do not re-renumber sortOrder fields locally — the BE
   * returns the canonical tree on success and we replace state then.
   */
  private applyOptimistic(
    tree: CourseCategoryDTO[],
    categoryId: string,
    _oldParentId: string | null,
    newParentId: string | null,
    newSortOrder: number
  ): CourseCategoryDTO[] {
    // Locate + extract the moving node first (read-only pass), so the
    // following structural rebuild doesn't have to deal with assigned-in-map
    // narrowing weirdness.
    const movingNode = this.findInTree(tree, categoryId);
    if (!movingNode) return tree;

    // Remove the moving node from wherever it currently lives.
    const stripped: CourseCategoryDTO[] = tree
      .filter(root => root.id !== categoryId)
      .map(root => ({
        ...root,
        children: root.children.filter(c => c.id !== categoryId)
      }));

    if (newParentId === null) {
      // Insert at root level.
      const next = [...stripped];
      const insertAt = Math.min(newSortOrder, next.length);
      next.splice(insertAt, 0, { ...movingNode, parentId: null });
      return next;
    }

    // Insert into a sub-list of the target root.
    return stripped.map(root => {
      if (root.id !== newParentId) return root;
      const children = [...root.children];
      const insertAt = Math.min(newSortOrder, children.length);
      children.splice(insertAt, 0, { ...movingNode, parentId: newParentId });
      return { ...root, children };
    });
  }

  private findInTree(tree: CourseCategoryDTO[], id: string): CourseCategoryDTO | null {
    for (const root of tree) {
      if (root.id === id) return root;
      for (const child of root.children) {
        if (child.id === id) return child;
      }
    }
    return null;
  }

  private deepCloneTree(tree: CourseCategoryDTO[]): CourseCategoryDTO[] {
    return tree.map(r => ({ ...r, children: r.children.map(c => ({ ...c })) }));
  }

  private showToast(message: string, isError: boolean): void {
    this.toast.set(message);
    this.toastIsError.set(isError);
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => {
      this.toast.set(null);
      this.toastTimer = null;
    }, 3000);
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
