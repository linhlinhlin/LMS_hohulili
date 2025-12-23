import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CourseEditorStore } from '../../store/course-editor.store';
import { CourseAuthoringService, CategoryDTO } from '../../services/course-authoring.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RichTextEditorComponent } from '../../../../../shared/components/rich-text-editor/rich-text-editor.component';

@Component({
    selector: 'app-course-info',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RichTextEditorComponent],
    template: `
    <div class="max-w-10xl mx-auto pb-20">
      
      <form [formGroup]="form" class="bg-white p-6">
        
        <!-- Top Section: Grid with Image on Left, Info on Right -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
            
            <!-- LEFT COLUMN: Image (3 cols) -->
            <div class="lg:col-span-4 space-y-4">
                <div class="space-y-2">
                  <label class="block text-sm font-semibold text-gray-700">Ảnh bìa khóa học</label>
                  
                  <!-- Container -->
                  <div class="aspect-video w-full rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-500 transition-colors">
                    
                    <!-- TRƯỜNG HỢP 1: Chưa có ảnh -> Hiện Icon Upload -->
                    @if (!thumbnailPreview() && !thumbnailUrl()) {
                      <div class="z-10 text-center p-4 transition-opacity pointer-events-none">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-10 h-10 text-gray-400 mx-auto mb-2">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <span class="text-xs text-gray-500 font-medium bg-white/80 px-2 py-1 rounded"> 
                          Click để tải ảnh lên 
                        </span>
                      </div>
                    }

                    <!-- TRƯỜNG HỢP 2: Đã có ảnh -> Hiện ảnh Preview -->
                    @if (thumbnailPreview() || thumbnailUrl()) {
                      <img [src]="thumbnailPreview() || thumbnailUrl()" class="absolute inset-0 w-full h-full object-cover z-0" alt="Cover Preview">
                      <!-- Nút xóa ảnh hoặc thay đổi overlay (Optional) -->
                      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center pointer-events-none">
                         <span class="text-white font-medium text-sm">Thay đổi ảnh</span>
                      </div>
                    }

                    <!-- INPUT FILE (Ẩn nhưng phủ lên toàn bộ để click được) -->
                    <!-- [QUAN TRỌNG]: Thêm sự kiện (change) -->
                    <input type="file" 
                           accept="image/*" 
                           (change)="onFileSelected($event)" 
                           class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20">
                  </div>
                </div>

                <!-- Video Intro -->
                <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">Video giới thiệu (URL)</label>
                    <input formControlName="introVideoUrl" 
                       class="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 text-sm"
                       placeholder="https://youtube.com/..." />
                </div>
            </div>

            <!-- RIGHT COLUMN: Fields (8 cols) -->
            <div class="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                
                <!-- Title (Full Width) -->
                <div class="md:col-span-2 space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">Tên khóa học <span class="text-red-500">*</span></label>
                    <input formControlName="title" 
                           class="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
                           placeholder="Nhập tên khóa học" />
                </div>

                <!-- Category -->
                <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">Danh mục</label>
                    <select formControlName="categoryId" 
                            class="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer">
                        <option value="">-- Chọn danh mục --</option>
                        <option *ngFor="let cat of categories()" [value]="cat.id">
                            {{ cat.name }}
                        </option>
                    </select>
                </div>

                <!-- Tags (Chip Input) -->
                <div class="flex flex-col space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">Thẻ từ khóa (Tags)</label>
                    <div class="min-h-[44px] p-2 rounded-lg border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all flex flex-wrap gap-2 items-center">
                        <!-- Chips -->
                        <div *ngFor="let tag of tagsList" class="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded flex items-center">
                            {{ tag }}
                            <button type="button" (click)="removeTag(tag)" class="ml-1.5 text-blue-600 hover:text-blue-900 focus:outline-none">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <!-- Input -->
                        <input #tagInput
                            (keydown.enter)="$event.preventDefault(); addTag(tagInput.value); tagInput.value = ''"
                            (blur)="addTag(tagInput.value); tagInput.value = ''"
                            class="flex-1 min-w-[120px] outline-none focus:outline-none focus-visible:outline-none border-none bg-transparent text-sm placeholder:text-gray-400"
                            placeholder="Nhập tag và nhấn Enter..." />
                    </div>
                </div>

                <!-- Short Description (Full Width) -->
                <div class="md:col-span-2 space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">Mô tả ngắn</label>
                    <textarea formControlName="description" 
                              class="w-full h-[88px] p-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 resize-none text-sm"
                              placeholder="Mô tả tóm tắt hiển thị trên card..."></textarea>
                </div>

                <!-- Price Group -->
                <div class="grid grid-cols-2 gap-4 md:col-span-2">
                    <div class="space-y-2">
                        <label class="block text-sm font-semibold text-gray-700">Loại giá</label>
                        <select formControlName="priceType" 
                                class="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer">
                            <option value="FREE">Miễn phí</option>
                            <option value="PAID">Trả phí</option>
                        </select>
                    </div>
                    
                    <!-- Dynamic Price Fields -->
                    <div class="grid grid-cols-2 gap-2" *ngIf="form.get('priceType')?.value === 'PAID'">
                        <div class="space-y-2">
                            <label class="block text-sm font-semibold text-gray-700">Giá gốc (VND)</label>
                            <input type="number" formControlName="price" [min]="0"
                                   class="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                        </div>
                        <div class="space-y-2">
                            <label class="block text-sm font-semibold text-gray-700">Giá KM (VND)</label>
                            <input type="number" formControlName="salePrice" [min]="0"
                                   class="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                        </div>
                    </div>
                    
                     <div class="space-y-2" *ngIf="form.get('priceType')?.value === 'FREE'">
                        <label class="block text-sm font-semibold text-gray-400">Giá</label>
                        <input type="text" disabled value="Miễn phí"
                               class="w-full h-11 px-4 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed outline-none" />
                    </div>
                </div>

                <!-- Settings Group -->
                <div class="md:col-span-2 grid grid-cols-2 gap-4 items-end">
                    <!-- Visibility -->
                    <div class="space-y-2">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Trạng thái công khai</label>
                        <div class="flex items-center space-x-6 h-11">
                            <label class="inline-flex items-center cursor-pointer">
                                <input type="radio" formControlName="visibility" value="PUBLIC" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                                <span class="ml-2 text-gray-900">Công khai</span>
                            </label>
                            <label class="inline-flex items-center cursor-pointer">
                                <input type="radio" formControlName="visibility" value="PRIVATE" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                                <span class="ml-2 text-gray-900">Riêng tư</span>
                            </label>
                        </div>
                    </div>

                    <!-- Credits -->
                    <div class="space-y-2">
                        <label class="block text-sm font-semibold text-gray-700">Số tín chỉ</label>
                        <input type="number" formControlName="credits" [min]="0"
                               class="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                    </div>
                </div>
            </div>
        </div>

        <hr class="border-gray-100 my-8">

        <!-- Rich Text Editors Section -->
        <div class="space-y-4">
            <div class="space-y-2">
                <label class="block text-sm font-semibold text-gray-700">Thông tin học phần</label>
                <div class="text-xs text-gray-500 mb-1">Mô tả chi tiết nội dung, mục tiêu của khóa học.</div>
                <app-rich-text-editor 
                    formControlName="courseInformation" 
                    placeholder="Nhập thông tin chi tiết..."
                    [height]="500">
                </app-rich-text-editor>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="sticky bottom-4 left-0 right-0 flex justify-end gap-3 mt-8 z-10 pointer-events-none">
             <div class="bg-white p-2 rounded-xl shadow-lg border border-gray-200 pointer-events-auto flex gap-3">
                 <button type="button" class="px-5 py-2.5 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Hủy bỏ
                 </button>
                 <button type="button" (click)="save()" 
                    [disabled]="form.invalid || isSaving()"
                    class="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm">
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
      </form>
    </div>
    `
})
export class CourseInfoComponent implements OnInit {
    private store = inject(CourseEditorStore);
    private fb = inject(FormBuilder);
    private service = inject(CourseAuthoringService);
    private toast = inject(MatSnackBar);

    // Data Signals
    categories = signal<CategoryDTO[]>([]);
    instructors = signal<any[]>([]); // List of instructors
    thumbnailUrl = signal<string | null>(null);
    thumbnailPreview = signal<string | null>(null); // For local preview
    isSaving = signal(false);

    // Local state for tags
    tagsList: string[] = [];

    // Form
    form = this.fb.group({
        title: ['', Validators.required],
        description: [''],
        categoryId: [''],
        instructorId: [''],
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
                    instructorId: tree.instructorId || '',
                    tags: this.tagsList.join(','),
                    introVideoUrl: tree.introVideoUrl || '',
                    courseInformation: tree.courseInformation || '',
                    welcomeMessage: tree.welcomeMessage || '',
                    benefits: tree.benefits || '',
                    price: tree.price || 0,
                    salePrice: (tree as any).salePrice || 0,
                    priceType: tree.priceType || 'FREE',
                    visibility: tree.visibility || 'PUBLIC',
                    credits: tree.credits || 0
                });
                this.thumbnailUrl.set(tree.thumbnailUrl || null);
                this.thumbnailPreview.set(null); // Reset preview on load
            }
        }, { allowSignalWrites: true });
    }

    ngOnInit() {
        // Load Categories
        this.service.getCategories().subscribe({
            next: (data) => this.categories.set(data),
            error: (err) => console.error('Failed to load categories', err)
        });

        // Load Instructors
        this.service.getInstructors().subscribe({
            next: (data) => this.instructors.set(data),
            error: (err) => console.error('Failed to load instructors', err)
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

    onFileSelected(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            // 1. Generate local preview immediately
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => {
                    this.thumbnailPreview.set(reader.result as string);
                };
                reader.readAsDataURL(file);
            }

            // 2. Upload to server
            this.isSaving.set(true);
            this.service.uploadFile(file).subscribe({
                next: (res) => {
                    this.thumbnailUrl.set(res.fileUrl);
                    this.form.markAsDirty();
                    this.isSaving.set(false);
                    this.toast.open('Ảnh đã được tải lên thành công', 'Đóng', { duration: 2000 });
                },
                error: (err) => {
                    console.error('Upload failed', err);
                    this.toast.open('Upload failed: ' + (err?.message || 'Unknown error'), 'Close', { duration: 3000 });
                    this.isSaving.set(false);
                    this.thumbnailPreview.set(null); // Revert preview on failure
                }
            });
        }
    }

    save() {
        if (this.form.invalid) {
            this.toast.open('Vui lòng kiểm tra lại các trường bắt buộc', 'Đóng', { duration: 3000 });
            return;
        }

        this.isSaving.set(true);
        const courseId = this.store.courseTree()?.id;
        if (!courseId) {
            this.toast.open('Không tìm thấy khóa học', 'Đóng', { duration: 3000 });
            this.isSaving.set(false);
            return;
        }

        // Prepare payload
        const val = this.form.value;
        const payload: any = {
            title: val.title,
            description: val.description,
            // Use server URL for saving
            thumbnailUrl: this.thumbnailUrl(),

            categoryId: val.categoryId || null,
            instructorId: val.instructorId || null,
            // Send tags array directly if backend supports it, or handle in service
            // The service expects string[]? Let's check. 
            // DTO says tags?: string[];
            tags: this.tagsList,

            introVideoUrl: val.introVideoUrl,
            courseInformation: val.courseInformation,
            welcomeMessage: val.welcomeMessage,
            benefits: val.benefits,

            price: val.price,
            salePrice: val.salePrice,
            priceType: val.priceType,
            visibility: val.visibility,
            credits: val.credits
        };

        this.service.updateCourseInfo(courseId, payload).subscribe({
            next: () => {
                this.toast.open('Đã lưu thông tin khóa học', 'Đóng', { duration: 3000 });
                this.isSaving.set(false);
                // Reload course data
                this.store.loadCourse(courseId);
            },
            error: (err: any) => {
                this.toast.open('Lưu thất bại: ' + (err?.message || 'Lỗi không xác định'), 'Đóng', { duration: 3000 });
                this.isSaving.set(false);
            }
        });
    }
}
