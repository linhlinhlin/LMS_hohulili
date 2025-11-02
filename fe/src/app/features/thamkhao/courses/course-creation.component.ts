import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TeacherService, TeacherCourse } from '../services/teacher.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { UploadedFile } from '../../../shared/models/uploaded-file.model';

interface MaritimeCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface CertificateType {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

@Component({
  selector: 'app-course-creation',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, LoadingComponent, FileUploadComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isSubmitting()" 
      text="Đang tạo khóa học..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="purple">
    </app-loading>

    <div class="bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 min-h-screen">
      <div class="max-w-4xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">📚 Tạo khóa học mới</h1>
              <p class="text-gray-600">Tạo khóa học chuyên về lĩnh vực hàng hải</p>
            </div>
            <button routerLink="/teacher/courses" 
                    class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              ← Quay lại
            </button>
          </div>
        </div>

        <!-- Course Creation Form -->
        <form [formGroup]="courseForm" (ngSubmit)="onSubmit()" class="space-y-8">
          <!-- Basic Information -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
              </svg>
              Thông tin cơ bản
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Course Title -->
              <div class="md:col-span-2">
                <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
                  Tên khóa học *
                </label>
                <input 
                  type="text" 
                  id="title"
                  formControlName="title"
                  placeholder="Ví dụ: Kỹ thuật Tàu biển Cơ bản"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('title')">
                @if (courseForm.get('title')?.invalid && courseForm.get('title')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Tên khóa học là bắt buộc</p>
                }
              </div>

              <!-- Short Description -->
              <div class="md:col-span-2">
                <label for="shortDescription" class="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả ngắn *
                </label>
                <textarea 
                  id="shortDescription"
                  formControlName="shortDescription"
                  rows="3"
                  placeholder="Mô tả ngắn gọn về khóa học (tối đa 200 ký tự)"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('shortDescription')"></textarea>
                <div class="flex justify-between mt-1">
                  @if (courseForm.get('shortDescription')?.invalid && courseForm.get('shortDescription')?.touched) {
                    <p class="text-sm text-red-600">Mô tả ngắn là bắt buộc</p>
                  }
                  <p class="text-sm text-gray-500">{{ courseForm.get('shortDescription')?.value?.length || 0 }}/200</p>
                </div>
              </div>

              <!-- Category -->
              <div>
                <label for="category" class="block text-sm font-medium text-gray-700 mb-2">
                  Danh mục *
                </label>
                <select 
                  id="category"
                  formControlName="category"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('category')">
                  <option value="">Chọn danh mục</option>
                  @for (category of maritimeCategories(); track category.id) {
                    <option [value]="category.id">{{ category.name }}</option>
                  }
                </select>
                @if (courseForm.get('category')?.invalid && courseForm.get('category')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Vui lòng chọn danh mục</p>
                }
              </div>

              <!-- Level -->
              <div>
                <label for="level" class="block text-sm font-medium text-gray-700 mb-2">
                  Cấp độ *
                </label>
                <select 
                  id="level"
                  formControlName="level"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('level')">
                  <option value="">Chọn cấp độ</option>
                  <option value="beginner">Cơ bản</option>
                  <option value="intermediate">Trung cấp</option>
                  <option value="advanced">Nâng cao</option>
                </select>
                @if (courseForm.get('level')?.invalid && courseForm.get('level')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Vui lòng chọn cấp độ</p>
                }
              </div>

              <!-- Duration -->
              <div>
                <label for="duration" class="block text-sm font-medium text-gray-700 mb-2">
                  Thời lượng *
                </label>
                <input 
                  type="text" 
                  id="duration"
                  formControlName="duration"
                  placeholder="Ví dụ: 40 giờ, 8 tuần"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('duration')">
                @if (courseForm.get('duration')?.invalid && courseForm.get('duration')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Thời lượng là bắt buộc</p>
                }
              </div>

              <!-- Price -->
              <div>
                <label for="price" class="block text-sm font-medium text-gray-700 mb-2">
                  Giá khóa học (VND) *
                </label>
                <input 
                  type="number" 
                  id="price"
                  formControlName="price"
                  placeholder="2500000"
                  min="0"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('price')">
                @if (courseForm.get('price')?.invalid && courseForm.get('price')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Giá khóa học là bắt buộc</p>
                }
              </div>
            </div>
          </div>

          <!-- Detailed Information -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
              </svg>
              Thông tin chi tiết
            </h2>

            <!-- Description -->
            <div class="mb-6">
              <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                Mô tả chi tiết *
              </label>
              <textarea 
                id="description"
                formControlName="description"
                rows="6"
                placeholder="Mô tả chi tiết về khóa học, nội dung, mục tiêu học tập..."
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                [class]="getFieldClass('description')"></textarea>
              @if (courseForm.get('description')?.invalid && courseForm.get('description')?.touched) {
                <p class="mt-1 text-sm text-red-600">Mô tả chi tiết là bắt buộc</p>
              }
            </div>

            <!-- Modules and Lessons -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label for="modules" class="block text-sm font-medium text-gray-700 mb-2">
                  Số module
                </label>
                <input 
                  type="number" 
                  id="modules"
                  formControlName="modules"
                  placeholder="6"
                  min="1"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
              </div>
              <div>
                <label for="lessons" class="block text-sm font-medium text-gray-700 mb-2">
                  Số bài học
                </label>
                <input 
                  type="number" 
                  id="lessons"
                  formControlName="lessons"
                  placeholder="24"
                  min="1"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
              </div>
            </div>

            <!-- Skills -->
            <div class="mb-6">
              <label for="skills" class="block text-sm font-medium text-gray-700 mb-2">
                Kỹ năng học được
              </label>
              <textarea 
                id="skills"
                formControlName="skills"
                rows="3"
                placeholder="Mỗi kỹ năng trên một dòng..."
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"></textarea>
              <p class="mt-1 text-sm text-gray-500">Mỗi kỹ năng trên một dòng riêng</p>
            </div>

            <!-- Prerequisites -->
            <div class="mb-6">
              <label for="prerequisites" class="block text-sm font-medium text-gray-700 mb-2">
                Yêu cầu tiên quyết
              </label>
              <textarea 
                id="prerequisites"
                formControlName="prerequisites"
                rows="3"
                placeholder="Kiến thức cần có trước khi học khóa này..."
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"></textarea>
              <p class="mt-1 text-sm text-gray-500">Mỗi yêu cầu trên một dòng riêng</p>
            </div>
          </div>

          <!-- Certificate Information -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
              Thông tin chứng chỉ
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label for="certificateType" class="block text-sm font-medium text-gray-700 mb-2">
                  Loại chứng chỉ *
                </label>
                <select 
                  id="certificateType"
                  formControlName="certificateType"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('certificateType')">
                  <option value="">Chọn loại chứng chỉ</option>
                  @for (cert of certificateTypes(); track cert.id) {
                    <option [value]="cert.id">{{ cert.name }}</option>
                  }
                </select>
                @if (courseForm.get('certificateType')?.invalid && courseForm.get('certificateType')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Vui lòng chọn loại chứng chỉ</p>
                }
              </div>

              <div>
                <label for="certificateDescription" class="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả chứng chỉ
                </label>
                <input 
                  type="text" 
                  id="certificateDescription"
                  formControlName="certificateDescription"
                  placeholder="Mô tả về chứng chỉ sẽ được cấp"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
              </div>
            </div>
          </div>

          <!-- Thumbnail Upload -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path>
              </svg>
              Hình ảnh khóa học
            </h2>

            <app-file-upload
              title="Tải lên hình ảnh khóa học"
              description="Kéo thả hình ảnh vào đây hoặc click để chọn thumbnail cho khóa học"
              [category]="'image'"
              [maxFileSize]="10 * 1024 * 1024"
              acceptedTypes="image/jpeg,image/jpg,image/png,image/gif"
              [multiple]="false"
              [showRestrictions]="true"
              (filesUploaded)="onThumbnailUploaded($event)"
              (fileRemoved)="onThumbnailRemoved($event)">
            </app-file-upload>
          </div>

          <!-- Course Materials Upload -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
              </svg>
              Tài liệu khóa học
            </h2>
            
            <app-file-upload
              title="Tải lên tài liệu khóa học"
              description="Kéo thả file vào đây hoặc click để chọn tài liệu hỗ trợ khóa học"
              [category]="'course'"
              [maxFileSize]="100 * 1024 * 1024"
              acceptedTypes=".pdf,.doc,.docx,.ppt,.pptx,.txt,.mp4,.avi,.mov,.jpg,.jpeg,.png"
              [multiple]="true"
              [showRestrictions]="true"
              (filesUploaded)="onMaterialsUploaded($event)"
              (fileRemoved)="onMaterialRemoved($event)">
            </app-file-upload>
          </div>

          <!-- Form Actions -->
          <div class="flex items-center justify-end space-x-4">
            <button 
              type="button"
              routerLink="/teacher/courses"
              class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Hủy
            </button>
            <button 
              type="submit"
              [disabled]="courseForm.invalid || isSubmitting()"
              class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              @if (isSubmitting()) {
                <svg class="w-4 h-4 mr-2 animate-spin inline" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
                </svg>
                Đang tạo...
              } @else {
                Tạo khóa học
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseCreationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private teacherService = inject(TeacherService);
  private router = inject(Router);

  // Form state
  courseForm!: FormGroup;
  isSubmitting = signal(false);
  thumbnailFile = signal<UploadedFile | null>(null);
  courseMaterials = signal<UploadedFile[]>([]);

  // Maritime categories for maritime-focused LMS
  maritimeCategories = signal<MaritimeCategory[]>([
    {
      id: 'safety',
      name: 'An toàn Hàng hải',
      description: 'Các quy định và thực hành an toàn trong ngành hàng hải',
      icon: '🛡️'
    },
    {
      id: 'navigation',
      name: 'Điều khiển Tàu',
      description: 'Kỹ thuật điều khiển và vận hành tàu biển',
      icon: '🧭'
    },
    {
      id: 'engineering',
      name: 'Kỹ thuật Tàu biển',
      description: 'Cấu trúc và hệ thống kỹ thuật tàu biển',
      icon: '⚙️'
    },
    {
      id: 'logistics',
      name: 'Quản lý Cảng',
      description: 'Quản lý và vận hành cảng biển',
      icon: '🚢'
    },
    {
      id: 'law',
      name: 'Luật Hàng hải',
      description: 'Pháp luật và quy định hàng hải quốc tế',
      icon: '⚖️'
    },
    {
      id: 'certificates',
      name: 'Chứng chỉ Chuyên môn',
      description: 'Các chứng chỉ và bằng cấp chuyên môn',
      icon: '📜'
    }
  ]);

  // Certificate types specific to maritime industry
  certificateTypes = signal<CertificateType[]>([
    {
      id: 'STCW',
      name: 'STCW (Standards of Training, Certification and Watchkeeping)',
      description: 'Tiêu chuẩn đào tạo, cấp chứng chỉ và trực ca',
      required: true
    },
    {
      id: 'IMO',
      name: 'IMO (International Maritime Organization)',
      description: 'Tổ chức Hàng hải Quốc tế',
      required: true
    },
    {
      id: 'Professional',
      name: 'Chứng chỉ Chuyên nghiệp',
      description: 'Chứng chỉ chuyên nghiệp trong lĩnh vực hàng hải',
      required: false
    },
    {
      id: 'Completion',
      name: 'Chứng chỉ Hoàn thành',
      description: 'Chứng chỉ hoàn thành khóa học',
      required: false
    }
  ]);

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.courseForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      shortDescription: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.minLength(50)]],
      category: ['', Validators.required],
      level: ['', Validators.required],
      duration: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      modules: [1, [Validators.min(1)]],
      lessons: [1, [Validators.min(1)]],
      skills: [''],
      prerequisites: [''],
      certificateType: ['', Validators.required],
      certificateDescription: [''],
      thumbnail: ['']
    });
  }

  getFieldClass(fieldName: string): string {
    const field = this.courseForm.get(fieldName);
    if (field?.invalid && field?.touched) {
      return 'border-red-500 focus:ring-red-500 focus:border-red-500';
    }
    return '';
  }

  // File Upload Methods
  onThumbnailUploaded(files: UploadedFile[]): void {
    if (files.length > 0) {
      this.thumbnailFile.set(files[0]);
    }
  }

  onThumbnailRemoved(fileId: string): void {
    this.thumbnailFile.set(null);
  }

  onMaterialsUploaded(files: UploadedFile[]): void {
    this.courseMaterials.update(current => [...current, ...files]);
  }

  onMaterialRemoved(fileId: string): void {
    this.courseMaterials.update(files => files.filter(f => f.id !== fileId));
  }

  async onSubmit(): Promise<void> {
    if (this.courseForm.valid) {
      this.isSubmitting.set(true);
      
      try {
        const formValue = this.courseForm.value;
        
        // Process skills and prerequisites arrays
        const skills = formValue.skills ? formValue.skills.split('\n').filter((s: string) => s.trim()) : [];
        const prerequisites = formValue.prerequisites ? formValue.prerequisites.split('\n').filter((s: string) => s.trim()) : [];
        
        const courseData: Partial<TeacherCourse> = {
          title: formValue.title,
          shortDescription: formValue.shortDescription,
          description: formValue.description,
          category: formValue.category,
          level: formValue.level,
          duration: formValue.duration,
          price: formValue.price,
          modules: formValue.modules,
          lessons: formValue.lessons,
          skills: skills,
          prerequisites: prerequisites,
          certificate: {
            type: formValue.certificateType,
            description: formValue.certificateDescription
          },
          thumbnail: this.thumbnailFile()?.url || 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop' // Default maritime image
        };

        await this.teacherService.createCourse(courseData);
        
        // Navigate back to courses list
        this.router.navigate(['/teacher/courses']);
        
      } catch (error) {
        console.error('Error creating course:', error);
      } finally {
        this.isSubmitting.set(false);
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.courseForm.controls).forEach(key => {
        this.courseForm.get(key)?.markAsTouched();
      });
    }
  }
}