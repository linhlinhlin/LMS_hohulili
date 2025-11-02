import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

interface AssignmentWork {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseName: string;
  instructor: {
    name: string;
    avatar: string;
  };
  type: 'quiz' | 'assignment' | 'project' | 'discussion';
  instructions: string;
  dueDate: Date;
  timeLimit?: number; // in minutes
  maxGrade: number;
  wordCount?: number;
  attachments: AssignmentAttachment[];
  rubric: AssignmentRubric[];
  attempts: number;
  maxAttempts: number;
  currentSubmission?: AssignmentSubmission;
}

interface AssignmentAttachment {
  id: string;
  name: string;
  url: string;
  type: 'pdf' | 'doc' | 'image' | 'video' | 'other';
  size: number;
}

interface AssignmentRubric {
  criterion: string;
  description: string;
  points: number;
  grade?: number;
}

interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  userId: string;
  content: string;
  attachments: AssignmentFile[];
  submittedAt: Date;
  grade?: number;
  feedback?: string;
  wordCount: number;
}

interface AssignmentFile {
  id: string;
  name: string;
  url: string;
  uploadedAt: Date;
  size: number;
}

@Component({
  selector: 'app-assignment-work',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
    <div class="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      <!-- Header -->
      <div class="bg-white shadow-xl border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-6 py-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button (click)="goBack()"
                      class="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                </svg>
                <span>Quay lại</span>
              </button>
              <div>
                <h1 class="text-3xl font-bold text-gray-900">{{ assignment()?.title }}</h1>
                <p class="text-gray-600">{{ assignment()?.courseName }}</p>
              </div>
            </div>
            
            <div class="flex items-center space-x-4">
              <div class="text-right">
                <p class="text-sm text-gray-600">Hạn nộp</p>
                <p class="text-lg font-semibold text-gray-900" [class]="isOverdue() ? 'text-red-600' : ''">
                  {{ formatDate(assignment()?.dueDate!) }}
                </p>
              </div>
              @if (assignment()?.timeLimit) {
                <div class="text-right">
                  <p class="text-sm text-gray-600">Thời gian</p>
                  <p class="text-lg font-semibold text-gray-900">{{ assignment()?.timeLimit }} phút</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-6 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Main Content -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Assignment Instructions -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-4">📋 Hướng dẫn bài tập</h3>
              <div class="prose max-w-none">
                <p class="text-gray-700 leading-relaxed">{{ assignment()?.instructions }}</p>
              </div>
              
              @if (assignment()?.wordCount) {
                <div class="mt-4 p-4 bg-blue-50 rounded-xl">
                  <div class="flex items-center space-x-2">
                    <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="font-medium text-blue-900">Yêu cầu tối thiểu: {{ assignment()?.wordCount }} từ</span>
                  </div>
                </div>
              }
            </div>

            <!-- Assignment Attachments -->
            @if (assignment()?.attachments && assignment()!.attachments.length > 0) {
              <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-4">📎 Tài liệu đính kèm</h3>
                <div class="space-y-3">
                  @for (attachment of assignment()!.attachments; track attachment.id) {
                    <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                        </svg>
                      </div>
                      <div class="flex-1">
                        <h4 class="font-medium text-gray-900">{{ attachment.name }}</h4>
                        <p class="text-sm text-gray-600">{{ formatFileSize(attachment.size) }}</p>
                      </div>
                      <button (click)="downloadAttachment(attachment.id)"
                              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Tải xuống
                      </button>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Submission Form -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-4">✍️ Nộp bài tập</h3>
              
              <form (ngSubmit)="submitAssignment()" #assignmentForm="ngForm">
                <div class="space-y-6">
                  <!-- Text Content -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Nội dung bài làm</label>
                    <textarea 
                      [(ngModel)]="submissionContent"
                      name="content"
                      rows="12"
                      placeholder="Nhập nội dung bài tập của bạn..."
                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      required></textarea>
                    <div class="mt-2 flex justify-between text-sm text-gray-600">
                      <span>Từ: {{ getWordCount(submissionContent()) }}</span>
                      @if (assignment()?.wordCount) {
                        <span [class]="getWordCount(submissionContent()) >= assignment()!.wordCount! ? 'text-green-600' : 'text-red-600'">
                          Yêu cầu: {{ assignment()?.wordCount }} từ
                        </span>
                      }
                    </div>
                  </div>

                  <!-- File Upload -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Tệp đính kèm</label>
                    <div class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                      <input type="file" 
                             multiple
                             (change)="onFileSelected($event)"
                             class="hidden"
                             #fileInput>
                      <button type="button" 
                              (click)="fileInput.click()"
                              class="flex flex-col items-center space-y-2 text-gray-600 hover:text-blue-600 transition-colors">
                        <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                        <span class="font-medium">Chọn tệp hoặc kéo thả vào đây</span>
                        <span class="text-sm">PDF, DOC, DOCX, JPG, PNG (tối đa 10MB)</span>
                      </button>
                    </div>
                    
                    <!-- Uploaded Files -->
                    @if (uploadedFiles().length > 0) {
                      <div class="mt-4 space-y-2">
                        @for (file of uploadedFiles(); track file.name) {
                          <div class="flex items-center space-x-3 p-3 bg-green-50 rounded-xl">
                            <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            <div class="flex-1">
                              <p class="font-medium text-gray-900">{{ file.name }}</p>
                              <p class="text-sm text-gray-600">{{ formatFileSize(file.size) }}</p>
                            </div>
                            <button type="button" 
                                    (click)="removeFile(file)"
                                    class="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                              </svg>
                            </button>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  <!-- Submit Button -->
                  <div class="flex items-center justify-between pt-6 border-t border-gray-200">
                    <div class="text-sm text-gray-600">
                      <p>Lần thử: {{ assignment()?.attempts }}/{{ assignment()?.maxAttempts }}</p>
                      @if (assignment()?.attempts! >= assignment()?.maxAttempts!) {
                        <p class="text-red-600 font-medium">Đã hết lượt làm bài</p>
                      }
                    </div>
                    <div class="flex space-x-3">
                      <button type="button" 
                              (click)="saveDraft()"
                              class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        Lưu nháp
                      </button>
                      <button type="submit" 
                              [disabled]="!canSubmit()"
                              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                        Nộp bài
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Assignment Info -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-4">📊 Thông tin bài tập</h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Giảng viên</label>
                  <div class="flex items-center space-x-3">
                    <img [src]="assignment()?.instructor?.avatar" 
                         [alt]="assignment()?.instructor?.name"
                         class="w-8 h-8 rounded-full object-cover">
                    <span class="text-gray-900">{{ assignment()?.instructor?.name }}</span>
                  </div>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Loại bài tập</label>
                  <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {{ getTypeText(assignment()?.type!) }}
                  </span>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Điểm tối đa</label>
                  <span class="text-lg font-semibold text-gray-900">{{ assignment()?.maxGrade }} điểm</span>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <span class="px-3 py-1 rounded-full text-sm font-medium"
                        [class]="getStatusClass()">
                    {{ getStatusText() }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Rubric -->
            @if (assignment()?.rubric && assignment()!.rubric.length > 0) {
              <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-4">📋 Tiêu chí chấm điểm</h3>
                <div class="space-y-4">
                  @for (criterion of assignment()!.rubric; track criterion.criterion) {
                    <div class="p-4 bg-gray-50 rounded-xl">
                      <div class="flex items-center justify-between mb-2">
                        <h4 class="font-medium text-gray-900">{{ criterion.criterion }}</h4>
                        <span class="text-sm text-gray-600">{{ criterion.points }} điểm</span>
                      </div>
                      <p class="text-sm text-gray-600">{{ criterion.description }}</p>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Previous Submissions -->
            @if (previousSubmissions().length > 0) {
              <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-4">📝 Bài nộp trước</h3>
                <div class="space-y-3">
                  @for (submission of previousSubmissions(); track submission.id) {
                    <div class="p-3 bg-gray-50 rounded-xl">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-gray-900">
                          Lần {{ $index + 1 }}
                        </span>
                        <span class="text-sm text-gray-600">
                          {{ formatDate(submission.submittedAt) }}
                        </span>
                      </div>
                      @if (submission.grade !== undefined) {
                        <div class="flex items-center justify-between">
                          <span class="text-sm text-gray-600">Điểm:</span>
                          <span class="font-semibold text-gray-900">{{ submission.grade }}/{{ assignment()?.maxGrade }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentWorkComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Component state
  assignment = signal<AssignmentWork | null>(null);
  submissionContent = signal<string>('');
  uploadedFiles = signal<File[]>([]);
  isLoading = signal<boolean>(false);

  // Mock data for previous submissions
  previousSubmissions = signal<AssignmentSubmission[]>([
    {
      id: 'sub-1',
      assignmentId: 'assignment-1',
      userId: 'user-1',
      content: 'Bài nộp lần 1...',
      attachments: [],
      submittedAt: new Date('2024-09-10'),
      grade: 85,
      feedback: 'Bài làm tốt, cần chú ý thêm về...',
      wordCount: 1200
    }
  ]);

  ngOnInit(): void {
    this.loadAssignment();
    console.log('🔧 Assignment Work - Component initialized');
  }

  private loadAssignment(): void {
    // Mock assignment data
    const mockAssignment: AssignmentWork = {
      id: 'assignment-1',
      title: 'Bài tập về Cấu trúc Tàu',
      description: 'Phân tích cấu trúc tàu container và trình bày báo cáo chi tiết về các thành phần chính.',
      courseId: 'course-1',
      courseName: 'Kỹ thuật Tàu biển Cơ bản',
      instructor: {
        name: 'ThS. Nguyễn Văn Hải',
        avatar: 'https://via.placeholder.com/150'
      },
      type: 'assignment',
      instructions: 'Viết báo cáo phân tích cấu trúc tàu container với tối thiểu 2000 từ, bao gồm hình ảnh minh họa và tài liệu tham khảo. Báo cáo cần trình bày rõ ràng về:\n\n1. Cấu trúc tổng thể của tàu container\n2. Các thành phần chính và chức năng\n3. Vật liệu sử dụng và đặc tính\n4. Quy trình sản xuất và lắp ráp\n5. Các tiêu chuẩn an toàn và chất lượng\n\nBáo cáo cần có hình ảnh minh họa và tài liệu tham khảo từ các nguồn uy tín.',
      dueDate: new Date('2024-09-20'),
      maxGrade: 100,
      wordCount: 2000,
      attachments: [
        {
          id: 'att-1',
          name: 'Hướng dẫn bài tập.pdf',
          url: '/attachments/assignment-1-guide.pdf',
          type: 'pdf',
          size: 1024000
        },
        {
          id: 'att-2',
          name: 'Template báo cáo.docx',
          url: '/attachments/report-template.docx',
          type: 'doc',
          size: 512000
        }
      ],
      rubric: [
        {
          criterion: 'Nội dung và kiến thức',
          description: 'Thể hiện hiểu biết sâu sắc về cấu trúc tàu container',
          points: 30
        },
        {
          criterion: 'Cấu trúc và trình bày',
          description: 'Báo cáo có cấu trúc logic, trình bày rõ ràng',
          points: 25
        },
        {
          criterion: 'Hình ảnh minh họa',
          description: 'Sử dụng hình ảnh phù hợp và chất lượng tốt',
          points: 20
        },
        {
          criterion: 'Tài liệu tham khảo',
          description: 'Sử dụng nguồn tài liệu uy tín và trích dẫn đúng',
          points: 15
        },
        {
          criterion: 'Ngôn ngữ và chính tả',
          description: 'Sử dụng ngôn ngữ chuyên nghiệp, không lỗi chính tả',
          points: 10
        }
      ],
      attempts: 1,
      maxAttempts: 3
    };

    this.assignment.set(mockAssignment);
    console.log('🔧 Assignment Work - Assignment loaded:', mockAssignment.title);
  }

  goBack(): void {
    console.log('🔧 Assignment Work - Go back');
    this.router.navigate(['/student/assignments']).then(success => {
      if (success) {
        console.log('🔧 Assignment Work - Navigation back successful');
      } else {
        console.error('🔧 Assignment Work - Navigation back failed');
      }
    });
  }

  downloadAttachment(attachmentId: string): void {
    console.log('🔧 Assignment Work - Download attachment:', attachmentId);
    // Mock download functionality
    alert(`Tải xuống tệp đính kèm: ${attachmentId}`);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      this.uploadedFiles.update(current => [...current, ...files]);
      console.log('🔧 Assignment Work - Files selected:', files.length);
    }
  }

  removeFile(file: File): void {
    this.uploadedFiles.update(current => current.filter(f => f !== file));
    console.log('🔧 Assignment Work - File removed:', file.name);
  }

  getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }

  getTypeText(type: string): string {
    switch (type) {
      case 'quiz': return 'Quiz';
      case 'assignment': return 'Bài tập';
      case 'project': return 'Dự án';
      case 'discussion': return 'Thảo luận';
      default: return 'Không xác định';
    }
  }

  isOverdue(): boolean {
    const assignment = this.assignment();
    return assignment ? new Date() > assignment.dueDate : false;
  }

  getStatusClass(): string {
    const assignment = this.assignment();
    if (!assignment) return 'bg-gray-100 text-gray-800';
    
    if (this.isOverdue()) return 'bg-red-100 text-red-800';
    if (assignment.attempts >= assignment.maxAttempts) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  }

  getStatusText(): string {
    const assignment = this.assignment();
    if (!assignment) return 'Không xác định';
    
    if (this.isOverdue()) return 'Quá hạn';
    if (assignment.attempts >= assignment.maxAttempts) return 'Hết lượt';
    return 'Có thể làm';
  }

  canSubmit(): boolean {
    const assignment = this.assignment();
    if (!assignment) return false;
    
    const hasContent = this.submissionContent().trim().length > 0;
    const hasWordCount = assignment.wordCount ? 
      this.getWordCount(this.submissionContent()) >= assignment.wordCount : true;
    const hasAttempts = assignment.attempts < assignment.maxAttempts;
    const notOverdue = !this.isOverdue();
    
    return hasContent && hasWordCount && hasAttempts && notOverdue;
  }

  saveDraft(): void {
    console.log('🔧 Assignment Work - Save draft');
    // Mock save draft functionality
    alert('Đã lưu nháp thành công!');
  }

  submitAssignment(): void {
    if (!this.canSubmit()) {
      alert('Không thể nộp bài. Vui lòng kiểm tra lại yêu cầu.');
      return;
    }

    console.log('🔧 Assignment Work - Submit assignment');
    console.log('🔧 Assignment Work - Content:', this.submissionContent());
    console.log('🔧 Assignment Work - Files:', this.uploadedFiles().length);
    
    // Mock submission
    alert('Nộp bài thành công! Giảng viên sẽ chấm điểm trong thời gian sớm nhất.');
    
    // Navigate back to assignments
    this.router.navigate(['/student/assignments']);
  }
}