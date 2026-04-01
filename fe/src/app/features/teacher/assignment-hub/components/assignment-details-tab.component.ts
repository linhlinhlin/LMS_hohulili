import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, effect,
  DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AssignmentDetailStore } from '../stores/assignment-detail.store';
import { SubmissionsStore } from '../stores/submissions.store';
import { AssignmentApi, UpdateAssignmentRequest } from '../../../../api/client/assignment.api';
import { CourseApi } from '../../../../api/client/course.api';
import { RubricApi, RubricDTO, RubricCriterionDTO } from '../../../../api/endpoints/rubric.api';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { DistributionSelectorComponent, DistributionSettings } from './distribution-selector.component';
import { EnrolledStudent, DistributionType } from '../utils/allocation-utils';
import { HttpClient } from '@angular/common/http';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import {
  ClassicEditor, Essentials, Paragraph,
  Bold, Italic, Underline, Strikethrough, RemoveFormat,
  Font, FontFamily, FontSize, FontColor, FontBackgroundColor,
  Alignment, List, Indent, IndentBlock, BlockQuote, Heading,
  Link, Image, ImageUpload, ImageToolbar, ImageStyle, ImageResize, ImageCaption,
  Table, TableToolbar, Autoformat
} from 'ckeditor5';
import viTranslations from 'ckeditor5/translations/vi.js';
import { ClassService } from '../../../../state/class.service';
import { validateMaxScore } from '../../assignments/utils/assignment-validators';

type AssignmentStatus = 'pending' | 'published' | 'closed';

/**
 * Assignment Details Tab Component
 *
 * Merges Overview + Settings + Rubric into a single scrollable page
 * with collapsible sections. Follows Canvas/Notion single-page pattern.
 *
 * Sections:
 * 1. Mô tả & Hướng dẫn (read-only + inline edit)
 * 2. Cài đặt (form: title, due date, max score, status)
 * 3. Phân phối (distribution selector — ONE place only)
 * 4. Rubric (collapsible — view/assign/remove)
 * 5. Phân bố điểm (bar chart, only when scores exist)
 */
@Component({
  selector: 'app-assignment-details-tab',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, DistributionSelectorComponent, CKEditorModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-slate-50 -mx-4 sm:-mx-6 -my-6 px-4 sm:px-6 py-6 min-h-[60vh]">

      <!-- Loading -->
      @if (assignmentStore.loading()) {
        <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-8 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#0056D2] border-t-transparent"></div>
          <p class="mt-3 text-sm text-gray-600">Đang tải thông tin bài tập...</p>
        </div>
      }

      @if (!assignmentStore.loading() && assignment()) {

        <!-- Sub-tabs within Details -->
        <div class="flex items-center gap-1 mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-1.5">
          @for (tab of subTabs; track tab.key) {
            <button (click)="activeSubTab.set(tab.key)" type="button"
                    [class]="activeSubTab() === tab.key ? 'bg-[#0056D2] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'"
                    class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all">
              {{ tab.label }}
            </button>
          }
        </div>

        <!-- ═══ Sub-tab: Tổng quan ═══ -->
        @if (activeSubTab() === 'overview') {
          <div class="space-y-5">
            <!-- Overview Card -->
            <section class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div class="p-5">
                <div class="flex items-start justify-between gap-4 mb-4">
                  <div class="min-w-0 flex-1">
                    <div class="prose prose-sm prose-slate max-w-none" [innerHTML]="assignment()?.description || 'Không có mô tả'"></div>
                    @if (assignment()?.instructions && assignment()?.instructions !== assignment()?.description) {
                      <div class="mt-3 pt-3 border-t border-gray-100">
                        <p class="text-xs font-medium text-gray-600 mb-1">Hướng dẫn thực hiện</p>
                        <div class="prose prose-sm prose-slate max-w-none text-gray-600" [innerHTML]="assignment()?.instructions"></div>
                      </div>
                    }
                  </div>
                  <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0" [class]="getStatusBadgeClass()">
                    {{ getStatusLabel() }}
                  </span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-gray-100">
                  <div>
                    <p class="text-xs text-gray-600">Hạn nộp</p>
                    <p class="text-sm font-medium text-gray-900">{{ formatDate(assignment()?.dueDate) || 'Không giới hạn' }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-600">Điểm tối đa</p>
                    <p class="text-sm font-medium text-gray-900">{{ assignment()?.maxScore || 100 }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-600">Bài nộp</p>
                    <p class="text-sm font-medium text-gray-900">{{ assignment()?.submissionsCount || 0 }}/{{ getEffectiveTotalStudents() }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-600">Cập nhật</p>
                    <p class="text-sm font-medium text-gray-900">{{ formatDate(assignment()?.updatedAt) }}</p>
                  </div>
                </div>
              </div>
            </section>

            <!-- Score Distribution -->
            @if (hasAnyScores()) {
              <section class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div class="px-5 py-3 border-b border-gray-200">
                  <h3 class="text-sm font-semibold text-gray-900">Phân bố điểm</h3>
                </div>
                <div class="p-5">
                  <div class="max-w-lg">
                    <div class="flex items-end gap-2 h-32">
                      @for (item of stats().scoreDistribution; track item.range) {
                        <div class="flex-1 flex flex-col items-center gap-1">
                          <span class="text-[10px] font-semibold text-gray-900 tabular-nums">{{ item.count || '' }}</span>
                          <div class="w-full bg-gray-100 rounded-t-md overflow-hidden relative" style="min-height: 4px"
                               [style.height.%]="getBarWidth(item.count)">
                            <div class="absolute inset-0 rounded-t-md transition-all duration-500"
                                 [class.bg-[#0056D2]]="item.count > 0"
                                 [class.bg-gray-200]="item.count === 0"></div>
                          </div>
                        </div>
                      }
                    </div>
                    <div class="flex gap-2 mt-2 border-t border-gray-100 pt-2">
                      @for (item of stats().scoreDistribution; track item.range) {
                        <div class="flex-1 text-center">
                          <span class="text-[10px] text-gray-600 tabular-nums">{{ item.range }}</span>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </section>
            }

            <!-- Rubric -->
            <section class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div class="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-semibold text-gray-900">Tiêu chí đánh giá</h3>
                  @if (rubric()) {
                    <p class="text-xs text-gray-600 mt-0.5">{{ rubric()?.title }} — {{ rubric()?.maxPoints }} điểm</p>
                  }
                </div>
                <div class="flex items-center gap-2">
                  @if (!rubric() && !loadingRubric()) {
                    <a routerLink="/teacher/assessments/shared/rubrics"
                       class="text-sm font-medium text-[#0056D2] hover:text-[#004BB5] transition-colors">Chọn từ thư viện</a>
                  }
                  @if (rubric()) {
                    <button (click)="removeRubric()" class="text-sm font-medium text-red-600 hover:text-red-700 transition-colors">Gỡ</button>
                    <button (click)="rubricExpanded.set(!rubricExpanded())" class="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                      <svg class="w-4 h-4 transition-transform" [class.rotate-180]="rubricExpanded()" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/>
                      </svg>
                    </button>
                  }
                </div>
              </div>
              @if (loadingRubric()) {
                <div class="p-8 text-center"><div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0056D2] border-t-transparent"></div></div>
              } @else if (!rubric()) {
                <div class="px-5 py-8 text-center">
                  <p class="text-sm text-gray-600">Chưa gắn tiêu chí đánh giá</p>
                </div>
              } @else if (rubricExpanded()) {
                <div class="overflow-x-auto">
                  <table class="w-full text-left">
                    <thead><tr class="bg-gray-50 border-b border-gray-200">
                      <th class="px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tiêu chí</th>
                      @for (level of getLevelHeaders(); track level) {
                        <th class="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center min-w-[100px]">{{ level }}</th>
                      }
                    </tr></thead>
                    <tbody class="divide-y divide-gray-100">
                      @for (criterion of rubric()?.criteria; track criterion.name) {
                        <tr>
                          <td class="px-5 py-3"><p class="text-sm font-medium text-gray-900">{{ criterion.name }}</p>
                            @if (criterion.maxPoints) { <span class="text-xs text-[#0056D2]">Tối đa {{ criterion.maxPoints }}đ</span> }
                          </td>
                          @for (level of criterion.levels; track level.label) {
                            <td class="px-4 py-3 text-center">
                              <p class="text-sm font-semibold text-gray-900">{{ level.points ?? '-' }}đ</p>
                              @if (level.description) { <p class="text-xs text-gray-600 mt-1">{{ level.description }}</p> }
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </section>
          </div>
        }

        <!-- ═══ Sub-tab: Chỉnh sửa ═══ -->
        @if (activeSubTab() === 'edit') {
          <form [formGroup]="form" class="space-y-5">
            <!-- Content (Rich Text — same editor as lesson editor) -->
            <section class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div class="px-5 py-3 border-b border-gray-200">
                <h3 class="text-sm font-semibold text-gray-900">Nội dung bài tập</h3>
              </div>
              <div class="p-5 space-y-4">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-2">Mô tả</label>
                  <ckeditor [editor]="ckEditorClass" [config]="ckEditorConfig" formControlName="description"></ckeditor>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-2">Hướng dẫn thực hiện</label>
                  <ckeditor [editor]="ckEditorClass" [config]="ckEditorConfig" formControlName="instructions"></ckeditor>
                </div>
              </div>
            </section>

            <!-- Settings -->
            <section class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div class="px-5 py-3 border-b border-gray-200">
                <h3 class="text-sm font-semibold text-gray-900">Cài đặt</h3>
              </div>
              <div class="p-5 space-y-5">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Tiêu đề <span class="text-red-500">*</span></label>
                  <input formControlName="title" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]/20 outline-none"/>
                  @if (form.controls.title.invalid && form.controls.title.touched) {
                    <p class="text-xs text-red-600 mt-1">Tiêu đề bài tập là bắt buộc</p>
                  }
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Trạng thái</span>
                  <select [formControl]="form.controls.status" class="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]/20 outline-none">
                    <option value="pending">Nháp</option>
                    <option value="published">Xuất bản</option>
                    <option value="closed">Đóng</option>
                  </select>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Hạn nộp</label>
                    <input formControlName="dueDate" type="datetime-local" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]/20 outline-none"/>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Điểm tối đa</label>
                    <input formControlName="maxScore" type="number" min="1" max="1000" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]/20 outline-none"/>
                  </div>
                </div>
              </div>
              <!-- Save/Cancel -->
              <div class="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  @if (formError()) { <span class="text-xs text-red-600">{{ formError() }}</span> }
                  @if (success()) { <span class="text-xs text-emerald-600">{{ success() }}</span> }
                </div>
                <div class="flex items-center gap-3">
                  <button type="button" (click)="resetForm()" class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Hủy</button>
                  <button type="button" (click)="onSubmit()" [disabled]="form.invalid || saving()"
                          class="rounded-lg bg-[#0056D2] px-5 py-2 text-sm font-medium text-white hover:bg-[#004BB5] disabled:opacity-50 transition-colors">
                    @if (saving()) { Đang lưu... } @else { Lưu thay đổi }
                  </button>
                </div>
              </div>
            </section>

            <!-- Danger Zone -->
            <section class="rounded-xl border border-red-100 bg-red-50/30 shadow-sm overflow-hidden px-5 py-4 flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-900">Xóa bài tập</p>
                <p class="text-xs text-gray-600 mt-0.5">Hành động này không thể hoàn tác.</p>
              </div>
              <button type="button" (click)="onDelete()" [disabled]="deleting()"
                      class="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                Xóa bài tập
              </button>
            </section>
          </form>
        }

        <!-- ═══ Sub-tab: Phân phối ═══ -->
        @if (activeSubTab() === 'distribution') {
          <div class="space-y-5">
            @if (assignment()?.deliveryMode !== 'INSTRUCTOR_LED') {
              <section class="rounded-xl border border-gray-200 bg-white shadow-sm p-8 text-center">
                <p class="text-sm text-gray-600">Bài tập tự học (Self-paced) — phân phối tự động cho toàn bộ học viên đăng ký khóa học.</p>
              </section>
            } @else {
              <section class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div class="px-5 py-3 border-b border-gray-200">
                  <h3 class="text-sm font-semibold text-gray-900">Phân phối bài tập</h3>
                  <p class="text-xs text-gray-600 mt-0.5">Chọn lớp học hoặc nhóm học viên nhận bài tập</p>
                </div>
                <div class="p-5">
                  @if (loadingStudents()) {
                    <div class="py-6 text-center">
                      <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0056D2] border-t-transparent"></div>
                      <p class="text-xs text-gray-600 mt-2">Đang tải danh sách học viên...</p>
                    </div>
                  } @else {
                    <app-distribution-selector
                      [courseId]="assignment()?.courseId || ''"
                      [enrolledStudents]="enrolledStudents()"
                      [initialDistributionType]="distributionSettings()?.distributionType || 'ALL_STUDENTS'"
                      [initialStudentIds]="distributionSettings()?.studentIds || []"
                      [initialClassId]="distributionSettings()?.classId ?? null"
                      (distributionChange)="onDistributionChange($event)">
                    </app-distribution-selector>
                  }
                </div>
              </section>
            }
          </div>
        }

        <!-- Delete Confirmation Modal -->
        @if (showDeleteConfirm()) {
          <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div class="bg-white rounded-lg border border-gray-200 shadow-lg max-w-md w-full overflow-hidden">
              <div class="px-5 py-4">
                <h3 class="text-sm font-semibold text-gray-900 mb-2">Xác nhận xóa</h3>
                <p class="text-sm text-gray-600">
                  Bạn có chắc chắn muốn xóa bài tập "{{ assignment()?.title }}"? Hành động này không thể hoàn tác.
                </p>
              </div>
              <div class="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                <button (click)="showDeleteConfirm.set(false)"
                        class="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Hủy
                </button>
                <button (click)="confirmDelete()" [disabled]="deleting()"
                        class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {{ deleting() ? 'Đang xóa...' : 'Xóa' }}
                </button>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `
})
export class AssignmentDetailsTabComponent implements OnInit {
  assignmentStore = inject(AssignmentDetailStore);
  private submissionsStore = inject(SubmissionsStore);
  private assignmentApi = inject(AssignmentApi);
  private courseApi = inject(CourseApi);
  private rubricApi = inject(RubricApi);
  private classService = inject(ClassService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // Assignment from parent store
  assignment = this.assignmentStore.assignment;
  stats = this.assignmentStore.stats;

  // UI state
  editingContent = signal(false);
  rubricExpanded = signal(false);
  distributionExpanded = signal(false);

  // Sub-tabs within Details
  activeSubTab = signal<'overview' | 'edit' | 'distribution'>('overview');
  subTabs = [
    { key: 'overview' as const, label: 'Tổng quan' },
    { key: 'edit' as const, label: 'Chỉnh sửa' },
    { key: 'distribution' as const, label: 'Phân phối' }
  ];

  // Full CKEditor config — same as lesson editor for UI consistency
  ckEditorClass = ClassicEditor;
  ckEditorConfig = {
    licenseKey: 'GPL' as const,
    language: 'vi',
    translations: [viTranslations],
    plugins: [
      Essentials, Paragraph, Heading,
      Bold, Italic, Underline, Strikethrough, RemoveFormat,
      Font, FontFamily, FontSize, FontColor, FontBackgroundColor,
      Alignment, List, Indent, IndentBlock, BlockQuote,
      Link, Image, ImageUpload, ImageToolbar, ImageStyle, ImageResize, ImageCaption,
      Table, TableToolbar, Autoformat
    ],
    toolbar: {
      items: [
        'heading', '|',
        'bold', 'italic', 'underline', 'strikethrough', 'removeFormat', '|',
        'alignment', 'bulletedList', 'numberedList', 'outdent', 'indent', '|',
        'link', 'uploadImage', 'insertTable', 'blockQuote'
      ]
    },
    placeholder: 'Nhập nội dung...'
  };
  saving = signal(false);
  deleting = signal(false);
  formError = signal('');
  success = signal('');
  showDeleteConfirm = signal(false);

  // Rubric state
  rubric = signal<RubricDTO | null>(null);
  loadingRubric = signal(false);

  // Distribution state
  enrolledStudents = signal<EnrolledStudent[]>([]);
  loadingStudents = signal(false);
  distributionSettings = signal<DistributionSettings | null>(null);
  private originalDistributionSettings = signal<DistributionSettings | null>(null);

  // Submissions loaded flag
  private loadedSubmissionsFor = signal<string | null>(null);
  private loadedStudentsForCourse = signal<string | null>(null);

  // Form
  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    instructions: [''],
    dueDate: [''],
    maxScore: [100, [Validators.min(1), Validators.max(1000)]],
    status: ['pending' as AssignmentStatus]
  });

  // Change detection
  private originalValues = signal<Record<string, unknown>>({});
  private formRevision = signal(0);

  hasChanges = computed(() => {
    this.formRevision();
    const currentForm = this.form.getRawValue();
    const originalForm = this.originalValues();
    const formChanged = JSON.stringify(currentForm) !== JSON.stringify(originalForm);

    const currentDist = this.distributionSettings();
    const originalDist = this.originalDistributionSettings();
    const distChanged = JSON.stringify(currentDist) !== JSON.stringify(originalDist);

    return formChanged || distChanged;
  });

  constructor() {
    // Track form value changes for hasChanges computed
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.formRevision.update(v => v + 1));

    // React to assignment changes (loaded by parent layout)
    effect(() => {
      const a = this.assignment();
      if (!a) return;

      this.populateForm(a);

      // Load submissions for score distribution
      if (this.loadedSubmissionsFor() !== a.id) {
        this.loadedSubmissionsFor.set(a.id);
        this.submissionsStore.loadSubmissions(a.id).subscribe({
          next: () => {
            this.assignmentStore.updateStatsFromSubmissions(this.submissionsStore.submissions());
          },
          error: () => {} // Non-critical for this tab
        });
      }

      // Load enrolled students for distribution (dedup by courseId)
      if (a.courseId && a.deliveryMode === 'INSTRUCTOR_LED' && this.loadedStudentsForCourse() !== a.courseId) {
        this.loadedStudentsForCourse.set(a.courseId);
        this.loadEnrolledStudents(a.courseId);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.loadRubric();
  }

  // ──── canDeactivate guard ────
  async canDeactivate(): Promise<boolean> {
    if (!this.hasChanges() && !this.saving()) return true;
    return this.confirmDialog.confirm({
      title: 'Rời trang chi tiết',
      message: 'Bạn có thay đổi chưa lưu. Nếu rời trang này, các chỉnh sửa sẽ bị mất.',
      variant: 'warning',
      confirmText: 'Rời trang',
      cancelText: 'Ở lại'
    });
  }

  // ──── Form population ────
  private populateForm(a: any): void {
    let dueDate = '';
    if (a.dueDate) {
      try { dueDate = new Date(a.dueDate).toISOString().slice(0, 16); } catch {}
    }

    const status = this.normalizeStatus(a.status);
    const values = {
      title: a.title,
      description: a.description || '',
      instructions: a.instructions || '',
      dueDate,
      maxScore: a.maxScore || 100,
      status
    };

    this.form.patchValue(values);
    this.originalValues.set(values);

    const distSettings: DistributionSettings = {
      distributionType: (a.distributionType as DistributionType) || 'ALL_STUDENTS',
      studentIds: a.allocatedStudentIds ? [...a.allocatedStudentIds] : [],
      classId: a.classId || null
    };
    this.distributionSettings.set(distSettings);
    this.originalDistributionSettings.set({
      distributionType: distSettings.distributionType,
      studentIds: distSettings.studentIds ? [...distSettings.studentIds] : null,
      classId: distSettings.classId ?? null
    });
  }

  private normalizeStatus(status: string): AssignmentStatus {
    const map: Record<string, AssignmentStatus> = {
      'DRAFT': 'pending', 'PUBLISHED': 'published', 'CLOSED': 'closed',
      'pending': 'pending', 'published': 'published', 'closed': 'closed'
    };
    return map[status] || 'pending';
  }

  // ──── Save ────
  onSubmit(): void {
    if (this.form.invalid) return;

    this.formError.set('');
    this.success.set('');

    const fv = this.form.getRawValue();
    if (fv.maxScore) {
      const v = validateMaxScore(fv.maxScore);
      if (!v.isValid) { this.formError.set(v.errors[0]?.message || 'Điểm không hợp lệ'); return; }
    }

    let dueDateInstant: string | undefined;
    if (fv.dueDate) {
      try { dueDateInstant = new Date(fv.dueDate).toISOString(); }
      catch { this.formError.set('Định dạng ngày không hợp lệ'); return; }
    }

    this.saving.set(true);

    const dist = this.assignment()?.deliveryMode === 'INSTRUCTOR_LED'
      ? this.distributionSettings()
      : { distributionType: 'ALL_STUDENTS' as const, studentIds: null, classId: null };

    if (dist?.distributionType === 'CLASS' && !dist.classId) {
      this.formError.set('Vui lòng chọn lớp học');
      this.saving.set(false);
      return;
    }
    if (dist?.distributionType === 'SPECIFIC_STUDENTS' && (!dist.studentIds || dist.studentIds.length === 0)) {
      this.formError.set('Vui lòng chọn ít nhất một học viên');
      this.saving.set(false);
      return;
    }

    const assignmentId = this.assignmentStore.assignmentId();
    if (!assignmentId) return;

    const request: UpdateAssignmentRequest = {
      title: fv.title || undefined,
      description: fv.description || undefined,
      instructions: fv.instructions || undefined,
      dueDate: dueDateInstant,
      maxScore: fv.maxScore || undefined,
      status: fv.status || undefined,
      classId: dist?.distributionType === 'CLASS' ? dist.classId || undefined : undefined,
      studentIds: dist?.distributionType === 'SPECIFIC_STUDENTS' ? dist.studentIds || [] : undefined,
      distributionType: dist?.distributionType
    };

    this.assignmentApi.updateAssignment(assignmentId, request).subscribe({
      next: () => {
        this.success.set('Đã lưu thay đổi');
        this.originalValues.set(this.form.getRawValue());
        const cd = this.distributionSettings();
        this.originalDistributionSettings.set(cd ? {
          distributionType: cd.distributionType,
          studentIds: cd.studentIds ? [...cd.studentIds] : null,
          classId: cd.classId ?? null
        } : null);

        // Update parent store
        this.assignmentStore.updateAssignment({
          title: fv.title || undefined,
          description: fv.description || undefined,
          instructions: fv.instructions || undefined,
          dueDate: dueDateInstant,
          maxScore: fv.maxScore || undefined,
          status: fv.status || undefined,
          distributionType: dist?.distributionType,
          classId: dist?.distributionType === 'CLASS' ? dist.classId || undefined : undefined,
          allocatedStudentIds: dist?.distributionType === 'SPECIFIC_STUDENTS' ? dist.studentIds || [] : []
        });

        setTimeout(() => this.success.set(''), 3000);
      },
      error: () => { this.formError.set('Cập nhật thất bại'); this.saving.set(false); },
      complete: () => this.saving.set(false)
    });
  }

  resetForm(): void {
    const original = this.originalValues();
    this.form.patchValue(original);
    const od = this.originalDistributionSettings();
    this.distributionSettings.set(od ? {
      distributionType: od.distributionType,
      studentIds: od.studentIds ? [...od.studentIds] : null,
      classId: od.classId ?? null
    } : null);
    this.formError.set('');
    this.success.set('');
    this.editingContent.set(false);
  }

  // ──── Delete ────
  onDelete(): void { this.showDeleteConfirm.set(true); }

  confirmDelete(): void {
    const assignmentId = this.assignmentStore.assignmentId();
    if (!assignmentId) return;
    this.deleting.set(true);

    this.assignmentApi.deleteAssignment(assignmentId).subscribe({
      next: () => this.router.navigate(['/teacher/assessments/classes/assignments']),
      error: () => {
        this.formError.set('Xóa bài tập thất bại');
        this.showDeleteConfirm.set(false);
        this.deleting.set(false);
      },
      complete: () => this.deleting.set(false)
    });
  }

  // ──── Distribution ────
  onDistributionChange(settings: DistributionSettings): void {
    this.distributionSettings.set(settings);
  }

  private loadEnrolledStudents(courseId: string): void {
    this.loadingStudents.set(true);
    this.courseApi.getEnrolledStudents(courseId).subscribe({
      next: (response: any) => {
        if (response.data) {
          this.enrolledStudents.set(response.data.map((s: any) => ({
            id: String(s.id),
            name: s.fullName || s.name || 'Unknown',
            email: s.email || '',
            enrolledAt: s.enrolledAt || s.createdAt || ''
          })));
        }
        this.loadingStudents.set(false);
      },
      error: () => { this.enrolledStudents.set([]); this.loadingStudents.set(false); }
    });
  }

  // ──── Rubric ────
  private loadRubric(): void {
    const assignmentId = this.route.parent?.snapshot.paramMap.get('id') || '';
    if (!assignmentId) return;

    this.loadingRubric.set(true);
    this.rubricApi.getByAssignment(assignmentId).subscribe({
      next: (response: any) => {
        this.rubric.set(response?.data ?? response ?? null);
      },
      error: () => { this.rubric.set(null); this.loadingRubric.set(false); },
      complete: () => this.loadingRubric.set(false)
    });
  }

  removeRubric(): void {
    const assignmentId = this.route.parent?.snapshot.paramMap.get('id') || '';
    if (!assignmentId) return;

    this.rubricApi.unassignFromAssignment(assignmentId).subscribe({
      next: () => { this.rubric.set(null); this.rubricExpanded.set(false); },
      error: () => this.toast.error('Không thể gỡ rubric')
    });
  }

  getLevelHeaders(): string[] {
    const criteria = this.rubric()?.criteria;
    if (!criteria || criteria.length === 0) return [];
    return criteria[0].levels.map(l => l.label);
  }

  // ──── Score distribution ────
  hasAnyScores(): boolean {
    return this.stats().scoreDistribution.some((d: any) => d.count > 0);
  }

  getBarWidth(count: number): number {
    const max = Math.max(...this.stats().scoreDistribution.map((d: any) => d.count), 1);
    return (count / max) * 100;
  }

  getEffectiveTotalStudents(): number {
    const submissions = this.assignment()?.submissionsCount || 0;
    const enrolled = this.assignment()?.totalStudents || 0;
    return Math.max(submissions, enrolled);
  }

  // ──── UI Helpers ────
  getStatusLabel(): string {
    const s = this.form.get('status')?.value as string;
    const labels: Record<string, string> = { 'pending': 'Nháp', 'published': 'Đã xuất bản', 'closed': 'Đã đóng' };
    return labels[s] || 'Không xác định';
  }

  getStatusBadgeClass(): string {
    const s = this.form.get('status')?.value as string;
    const classes: Record<string, string> = {
      'pending': 'bg-amber-50 text-amber-700',
      'published': 'bg-emerald-50 text-emerald-700',
      'closed': 'bg-gray-100 text-gray-700'
    };
    return classes[s] || 'bg-gray-100 text-gray-700';
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }
}
