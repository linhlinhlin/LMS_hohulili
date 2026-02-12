import { Component, OnInit, effect, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CourseEditorStore } from '../../store/course-editor.store';
import { CourseAuthoringService, CategoryDTO, DeliveryMode } from '../../services/course-authoring.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { RichTextEditorComponent } from '../../../../../shared/components/rich-text-editor/rich-text-editor.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-course-info',
    imports: [ReactiveFormsModule, RichTextEditorComponent],
    template: `
    <div class="max-w-screen-2xl mx-auto px-8 py-6">
      <form [formGroup]="form">

        <!-- Two-Column Layout: Main Content + Sidebar Metadata (WordPress/Shopify pattern) -->
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">

          <!-- ============ MAIN COLUMN ============ -->
          <div class="space-y-5 min-w-0">

            <!-- Card: Thông tin cơ bản -->
            <section class="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                <h2 class="text-sm font-semibold text-slate-900">Thông tin cơ bản</h2>
              </div>
              <div class="p-5 space-y-4">
                <!-- Title -->
                <div class="space-y-1.5">
                  <label class="block text-sm font-medium text-slate-700">Tên khóa học <span class="text-red-500">*</span></label>
                  <input formControlName="title"
                    class="w-full h-10 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400"
                    placeholder="Nhập tên khóa học" />
                </div>

                <!-- Short Description -->
                <div class="space-y-1.5">
                  <label class="block text-sm font-medium text-slate-700">Mô tả ngắn</label>
                  <textarea formControlName="description"
                    class="w-full h-20 p-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400 resize-none"
                    placeholder="Mô tả tóm tắt hiển thị trên card..."></textarea>
                </div>

                <!-- Delivery Mode -->
                <div class="space-y-2">
                  <label class="block text-sm font-medium text-slate-700">Hình thức giảng dạy</label>
                  <div class="grid grid-cols-2 gap-3">
                    <button type="button" (click)="setDeliveryMode('SELF_PACED')"
                            class="flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left"
                            [class]="currentDeliveryMode() === 'SELF_PACED'
                              ? 'border-[#0056D2] bg-[#0056D2]/5/50'
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
                    <button type="button" (click)="setDeliveryMode('INSTRUCTOR_LED')"
                            class="flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left"
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
                </div>
              </div>
            </section>

            <!-- Card: Nội dung chi tiết (Rich Text) -->
            <section class="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
            <section class="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                <h2 class="text-sm font-semibold text-slate-900">Lợi ích & Chào mừng</h2>
                <p class="text-xs text-slate-500 mt-0.5">Thông tin hiển thị cho học viên khi xem và tham gia khóa học</p>
              </div>
              <div class="p-5 space-y-4">
                <!-- Benefits -->
                <div class="space-y-1.5">
                  <label class="block text-sm font-medium text-slate-700">Bạn sẽ học được gì</label>
                  <textarea formControlName="benefits"
                    class="w-full h-24 p-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400 resize-none"
                    placeholder="Liệt kê các kiến thức, kỹ năng học viên sẽ đạt được..."></textarea>
                </div>

                <!-- Welcome Message -->
                <div class="space-y-1.5">
                  <label class="block text-sm font-medium text-slate-700">Lời chào mừng</label>
                  <textarea formControlName="welcomeMessage"
                    class="w-full h-20 p-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400 resize-none"
                    placeholder="Tin nhắn chào mừng gửi đến học viên khi đăng ký..."></textarea>
                </div>
              </div>
            </section>

            <!-- Save Button (bottom of main column) -->
            <div class="flex justify-end pb-4">
              <button type="button" (click)="save()"
                [disabled]="form.invalid || isSaving()"
                class="h-10 px-6 rounded-lg bg-[#0056D2] text-white font-medium text-sm hover:bg-[#004BB5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
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

          <!-- ============ SIDEBAR COLUMN (sticky, WordPress/Shopify pattern) ============ -->
          <div class="space-y-5 lg:sticky lg:top-4">

            <!-- Sidebar Card: Ảnh bìa -->
            <section class="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                <h2 class="text-sm font-semibold text-slate-900">Ảnh bìa</h2>
              </div>
              <div class="p-4">
                <div class="aspect-video rounded-lg bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center relative overflow-hidden group hover:border-[#0056D2] transition-colors">
                  @if (!thumbnailPreview() && !thumbnailUrl()) {
                    <div class="z-10 text-center p-4 pointer-events-none">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-8 h-8 text-slate-400 mx-auto mb-2">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <span class="text-xs text-slate-500 font-medium">Click để tải ảnh lên</span>
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
                <p class="text-xs text-slate-400 mt-2">JPG, PNG, WebP. Tối đa 5MB.</p>
              </div>
            </section>

            <!-- Sidebar Card: Phân loại -->
            <section class="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                <h2 class="text-sm font-semibold text-slate-900">Phân loại</h2>
              </div>
              <div class="p-4 space-y-4">
                <!-- Category -->
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-slate-600">Danh mục</label>
                  <select formControlName="categoryId"
                    class="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all cursor-pointer">
                    <option value="">-- Chọn danh mục --</option>
                    @for (cat of categories(); track cat) {
                      <option [value]="cat.id">{{ cat.name }}</option>
                    }
                  </select>
                </div>

                <!-- Tags -->
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-slate-600">Thẻ từ khóa</label>
                  <div class="min-h-[36px] p-2 rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-[#0056D2]/20 focus-within:border-[#0056D2] transition-all flex flex-wrap gap-1.5 items-center">
                    @for (tag of tagsList; track tag) {
                      <div class="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                        {{ tag }}
                        <button type="button" (click)="removeTag(tag)" class="text-slate-400 hover:text-slate-700">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      </div>
                    }
                    <input #tagInput
                      (keydown.enter)="$event.preventDefault(); addTag(tagInput.value); tagInput.value = ''"
                      (blur)="addTag(tagInput.value); tagInput.value = ''"
                      class="flex-1 min-w-[80px] outline-none border-none bg-transparent text-sm placeholder:text-slate-400"
                      placeholder="Nhập tag..." />
                  </div>
                </div>
              </div>
            </section>

            <!-- Sidebar Card: Xuất bản -->
            <section class="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                <h2 class="text-sm font-semibold text-slate-900">Xuất bản</h2>
              </div>
              <div class="p-4 space-y-4">
                <!-- Visibility -->
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-slate-600">Trạng thái</label>
                  <div class="flex items-center gap-4">
                    <label class="inline-flex items-center cursor-pointer gap-1.5">
                      <input type="radio" formControlName="visibility" value="PUBLIC" class="w-3.5 h-3.5 text-[#0056D2] border-slate-300 focus:ring-[#0056D2]">
                      <span class="text-sm text-slate-900">Công khai</span>
                    </label>
                    <label class="inline-flex items-center cursor-pointer gap-1.5">
                      <input type="radio" formControlName="visibility" value="PRIVATE" class="w-3.5 h-3.5 text-[#0056D2] border-slate-300 focus:ring-[#0056D2]">
                      <span class="text-sm text-slate-900">Riêng tư</span>
                    </label>
                  </div>
                </div>

                <!-- Price Type -->
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-slate-600">Loại giá</label>
                  <select formControlName="priceType"
                    class="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all cursor-pointer">
                    <option value="FREE">Miễn phí</option>
                    <option value="PAID">Trả phí</option>
                  </select>
                </div>

                @if (form.get('priceType')?.value === 'PAID') {
                  <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1">
                      <label class="block text-xs font-medium text-slate-600">Giá gốc</label>
                      <input type="number" formControlName="price" [min]="0"
                        class="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all" />
                    </div>
                    <div class="space-y-1">
                      <label class="block text-xs font-medium text-slate-600">Giá KM</label>
                      <input type="number" formControlName="salePrice" [min]="0"
                        class="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all" />
                    </div>
                  </div>
                }

                <!-- Credits -->
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-slate-600">Số tín chỉ</label>
                  <input type="number" formControlName="credits" [min]="0"
                    class="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all" />
                </div>

                <!-- Video URL -->
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-slate-600">Video giới thiệu</label>
                  <input formControlName="introVideoUrl"
                    class="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400"
                    placeholder="https://youtube.com/..." />
                </div>
              </div>
            </section>

          </div>
        </div>

      </form>
    </div>
    `
})
export class CourseInfoComponent implements OnInit {
    private store = inject(CourseEditorStore);
    private fb = inject(FormBuilder);
    private service = inject(CourseAuthoringService);
    private toast = inject(ToastService);

    // Data Signals
    categories = signal<CategoryDTO[]>([]);
    thumbnailUrl = signal<string | null>(null);
    thumbnailPreview = signal<string | null>(null); // For local preview
    isSaving = signal(false);
    currentDeliveryMode = signal<DeliveryMode>('SELF_PACED');

    // Local state for tags
    tagsList: string[] = [];

    // Form
    form = this.fb.group({
        title: ['', Validators.required],
        description: [''],
        categoryId: [''],
        tags: [''], // Hidden control to sync with tagsList
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
        // Sync Store -> Form
        effect(() => {
            const tree = this.store.courseTree();
            if (tree && !this.form.dirty) {
                // Parse tags
                this.tagsList = tree.tags || [];

                this.form.patchValue({
                    title: tree.title,
                    description: tree.description,
                    categoryId: tree.categoryId || '',
                    tags: this.tagsList.join(','),
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
            }
        }, { allowSignalWrites: true });
    }

    ngOnInit() {
        // Load Categories
        this.service.getCategories().subscribe({
            next: (data) => this.categories.set(data),
            error: () => this.toast.error('Không tải được danh mục')
        });
    }

    // Tag Management
    addTag(value: string) {
        const tag = value.trim();
        if (tag && !this.tagsList.includes(tag)) {
            this.tagsList.push(tag);
            this.updateTagsControl();
        }
    }

    removeTag(tag: string) {
        this.tagsList = this.tagsList.filter(t => t !== tag);
        this.updateTagsControl();
    }

    private updateTagsControl() {
        this.form.patchValue({ tags: this.tagsList.join(',') });
        this.form.markAsDirty();
    }

    setDeliveryMode(mode: DeliveryMode) {
        this.currentDeliveryMode.set(mode);
        this.form.markAsDirty();
    }

    private readonly MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB
    private readonly ALLOWED_THUMBNAIL_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        if (file.size > this.MAX_THUMBNAIL_SIZE) {
            this.toast.error('Ảnh quá lớn. Kích thước tối đa: 5MB');
            input.value = '';
            return;
        }

        if (!this.ALLOWED_THUMBNAIL_TYPES.includes(file.type)) {
            this.toast.error('Định dạng không hỗ trợ. Chỉ chấp nhận: JPG, PNG, WebP');
            input.value = '';
            return;
        }

        // 1. Generate local preview immediately
        const reader = new FileReader();
        reader.onload = () => {
            this.thumbnailPreview.set(reader.result as string);
        };
        reader.readAsDataURL(file);

        // 2. Upload to server
        this.isSaving.set(true);
        this.service.uploadFile(file).subscribe({
            next: (res) => {
                this.thumbnailUrl.set(res.fileUrl);
                this.form.markAsDirty();
                this.isSaving.set(false);
                this.toast.success('Ảnh đã được tải lên thành công');
            },
            error: (err: any) => {
                this.toast.error('Tải ảnh thất bại: ' + (err?.error?.message || err?.message || 'Lỗi không xác định'));
                this.isSaving.set(false);
                this.thumbnailPreview.set(null);
            }
        });
    }

    save() {
        if (this.form.invalid) {
            this.toast.warning('Vui lòng kiểm tra lại các trường bắt buộc');
            return;
        }

        this.isSaving.set(true);
        const courseId = this.store.courseTree()?.id;
        if (!courseId) {
            this.toast.warning('Không tìm thấy khóa học');
            this.isSaving.set(false);
            return;
        }

        // Prepare payload
        const val = this.form.value;
        const payload = {
            title: val.title || '',
            description: val.description || '',
            thumbnailUrl: this.thumbnailUrl(),
            categoryId: val.categoryId || null,
            tags: this.tagsList,
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
                this.toast.success('Đã lưu thông tin khóa học');
                this.isSaving.set(false);
                this.form.markAsPristine();
                this.store.loadCourse(courseId, true);
            },
            error: (err: any) => {
                this.toast.error('Lưu thất bại: ' + (err?.error?.message || err?.message || 'Lỗi không xác định'));
                this.isSaving.set(false);
            }
        });
    }
}
