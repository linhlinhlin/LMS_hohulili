import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TeacherService, TeacherAssignment } from '../services/teacher.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

interface QuestionType {
  id: string;
  name: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-assignment-editor',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isSubmitting() || isLoading()" 
      text="Đang tải bài tập..."
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
              <h1 class="text-3xl font-bold text-gray-900 mb-2">✏️ Chỉnh sửa bài tập</h1>
              <p class="text-gray-600">Cập nhật thông tin bài tập cho khóa học hàng hải</p>
            </div>
            <button routerLink="/teacher/assignments" 
                    class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              ← Quay lại
            </button>
          </div>
        </div>

        <!-- Assignment Editor Form -->
        @if (currentAssignment()) {
          <form [formGroup]="assignmentForm" (ngSubmit)="onSubmit()" class="space-y-8">
            <!-- Basic Information -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                </svg>
                Thông tin cơ bản
              </h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Assignment Title -->
                <div class="md:col-span-2">
                  <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
                    Tên bài tập *
                  </label>
                  <input 
                    type="text" 
                    id="title"
                    formControlName="title"
                    placeholder="Ví dụ: Quiz An toàn Hàng hải"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    [class]="getFieldClass('title')">
                  @if (assignmentForm.get('title')?.invalid && assignmentForm.get('title')?.touched) {
                    <p class="mt-1 text-sm text-red-600">Tên bài tập là bắt buộc</p>
                  }
                </div>

                <!-- Assignment Type -->
                <div>
                  <label for="type" class="block text-sm font-medium text-gray-700 mb-2">
                    Loại bài tập *
                  </label>
                  <select 
                    id="type"
                    formControlName="type"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    [class]="getFieldClass('type')">
                    <option value="">Chọn loại bài tập</option>
                    @for (questionType of questionTypes(); track questionType.id) {
                      <option [value]="questionType.id">{{ questionType.name }}</option>
                    }
                  </select>
                  @if (assignmentForm.get('type')?.invalid && assignmentForm.get('type')?.touched) {
                    <p class="mt-1 text-sm text-red-600">Vui lòng chọn loại bài tập</p>
                  }
                </div>

                <!-- Due Date -->
                <div>
                  <label for="dueDate" class="block text-sm font-medium text-gray-700 mb-2">
                    Hạn nộp bài *
                  </label>
                  <input 
                    type="datetime-local" 
                    id="dueDate"
                    formControlName="dueDate"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    [class]="getFieldClass('dueDate')">
                  @if (assignmentForm.get('dueDate')?.invalid && assignmentForm.get('dueDate')?.touched) {
                    <p class="mt-1 text-sm text-red-600">Hạn nộp bài là bắt buộc</p>
                  }
                </div>

                <!-- Max Score -->
                <div>
                  <label for="maxScore" class="block text-sm font-medium text-gray-700 mb-2">
                    Điểm tối đa *
                  </label>
                  <input 
                    type="number" 
                    id="maxScore"
                    formControlName="maxScore"
                    placeholder="100"
                    min="1"
                    max="1000"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    [class]="getFieldClass('maxScore')">
                  @if (assignmentForm.get('maxScore')?.invalid && assignmentForm.get('maxScore')?.touched) {
                    <p class="mt-1 text-sm text-red-600">Điểm tối đa là bắt buộc</p>
                  }
                </div>

                <!-- Status -->
                <div>
                  <label for="status" class="block text-sm font-medium text-gray-700 mb-2">
                    Trạng thái *
                  </label>
                  <select 
                    id="status"
                    formControlName="status"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                    <option value="draft">Nháp</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="graded">Đã chấm</option>
                  </select>
                </div>
              </div>

              <!-- Description -->
              <div class="mt-6">
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả bài tập *
                </label>
                <textarea 
                  id="description"
                  formControlName="description"
                  rows="4"
                  placeholder="Mô tả chi tiết về bài tập, yêu cầu, hướng dẫn..."
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('description')"></textarea>
                @if (assignmentForm.get('description')?.invalid && assignmentForm.get('description')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Mô tả bài tập là bắt buộc</p>
                }
              </div>
            </div>

            <!-- Assignment Statistics -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
                </svg>
                Thống kê bài tập
              </h2>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="text-center p-4 bg-blue-50 rounded-lg">
                  <div class="text-2xl font-bold text-blue-600">{{ currentAssignment()?.submissions || 0 }}</div>
                  <div class="text-sm text-blue-800">Bài đã nộp</div>
                </div>
                <div class="text-center p-4 bg-green-50 rounded-lg">
                  <div class="text-2xl font-bold text-green-600">{{ currentAssignment()?.totalStudents || 0 }}</div>
                  <div class="text-sm text-green-800">Tổng học viên</div>
                </div>
                <div class="text-center p-4 bg-purple-50 rounded-lg">
                  <div class="text-2xl font-bold text-purple-600">{{ getSubmissionRate() }}%</div>
                  <div class="text-sm text-purple-800">Tỷ lệ nộp bài</div>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="mt-6">
                <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Tiến độ nộp bài</span>
                  <span>{{ getSubmissionRate() }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3">
                  <div class="bg-purple-600 h-3 rounded-full transition-all duration-300" 
                       [style.width.%]="getSubmissionRate()"></div>
                </div>
              </div>
            </div>

            <!-- Course Information -->
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                  <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                </svg>
                Thông tin khóa học
              </h2>

              <div class="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                    <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">{{ currentAssignment()?.courseTitle }}</h3>
                  <p class="text-sm text-gray-600">Khóa học liên quan</p>
                </div>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="flex items-center justify-end space-x-4">
              <button 
                type="button"
                routerLink="/teacher/assignments"
                class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                Hủy
              </button>
              <button 
                type="submit"
                [disabled]="assignmentForm.invalid || isSubmitting()"
                class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                @if (isSubmitting()) {
                  <svg class="w-4 h-4 mr-2 animate-spin inline" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
                  </svg>
                  Đang cập nhật...
                } @else {
                  Cập nhật bài tập
                }
              </button>
            </div>
          </form>
        } @else {
          <!-- Loading or Error State -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="text-center py-12">
              <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
              </svg>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Không tìm thấy bài tập</h3>
              <p class="text-gray-500 mb-6">Bài tập bạn đang tìm kiếm không tồn tại hoặc đã bị xóa</p>
              <button routerLink="/teacher/assignments" 
                      class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Quay lại danh sách bài tập
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentEditorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private teacherService = inject(TeacherService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Form state
  assignmentForm!: FormGroup;
  isSubmitting = signal(false);
  isLoading = signal(false);
  currentAssignment = signal<TeacherAssignment | null>(null);

  // Question types for maritime assignments
  questionTypes = signal<QuestionType[]>([
    {
      id: 'quiz',
      name: 'Quiz',
      description: 'Câu hỏi trắc nghiệm',
      icon: '📝'
    },
    {
      id: 'assignment',
      name: 'Bài tập',
      description: 'Bài tập thực hành',
      icon: '📋'
    },
    {
      id: 'project',
      name: 'Dự án',
      description: 'Dự án lớn',
      icon: '🚀'
    },
    {
      id: 'discussion',
      name: 'Thảo luận',
      description: 'Thảo luận nhóm',
      icon: '💬'
    }
  ]);

  ngOnInit(): void {
    this.initializeForm();
    this.loadAssignment();
  }

  private initializeForm(): void {
    this.assignmentForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      type: ['', Validators.required],
      dueDate: ['', Validators.required],
      maxScore: [100, [Validators.required, Validators.min(1), Validators.max(1000)]],
      status: ['draft']
    });
  }

  private async loadAssignment(): Promise<void> {
    this.isLoading.set(true);
    try {
      const assignmentId = this.route.snapshot.paramMap.get('id');
      if (assignmentId) {
        // Load assignment from service
        await this.teacherService.getAssignments();
        const assignment = this.teacherService.assignments().find(a => a.id === assignmentId);
        
        if (assignment) {
          this.currentAssignment.set(assignment);
          this.populateForm(assignment);
        }
      }
    } catch (error) {
      console.error('Error loading assignment:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private populateForm(assignment: TeacherAssignment): void {
    // Format date for datetime-local input
    const dueDate = new Date(assignment.dueDate);
    const formattedDate = dueDate.toISOString().slice(0, 16);

    this.assignmentForm.patchValue({
      title: assignment.title,
      description: assignment.description,
      type: assignment.type,
      dueDate: formattedDate,
      maxScore: assignment.maxScore,
      status: assignment.status
    });
  }

  getFieldClass(fieldName: string): string {
    const field = this.assignmentForm.get(fieldName);
    if (field?.invalid && field?.touched) {
      return 'border-red-500 focus:ring-red-500 focus:border-red-500';
    }
    return '';
  }

  getSubmissionRate(): number {
    const assignment = this.currentAssignment();
    if (!assignment || assignment.totalStudents === 0) return 0;
    return Math.round((assignment.submissions / assignment.totalStudents) * 100);
  }

  async onSubmit(): Promise<void> {
    if (this.assignmentForm.valid && this.currentAssignment()) {
      this.isSubmitting.set(true);
      
      try {
        const formValue = this.assignmentForm.value;
        
        const assignmentData: Partial<TeacherAssignment> = {
          title: formValue.title,
          description: formValue.description,
          type: formValue.type,
          dueDate: new Date(formValue.dueDate),
          maxScore: formValue.maxScore,
          status: formValue.status
        };

        await this.teacherService.updateAssignment(this.currentAssignment()!.id, assignmentData);
        
        // Navigate back to assignments list
        this.router.navigate(['/teacher/assignments']);
        
      } catch (error) {
        console.error('Error updating assignment:', error);
      } finally {
        this.isSubmitting.set(false);
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.assignmentForm.controls).forEach(key => {
        this.assignmentForm.get(key)?.markAsTouched();
      });
    }
  }
}