import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

interface AssignmentDetail {
  id: string;
  title: string;
  description: string;
  instructions: string;
  courseId: string;
  courseName: string;
  instructorId: string;
  instructorName: string;
  instructorAvatar: string;
  dueDate: Date;
  maxPoints: number;
  submissionType: 'file' | 'text' | 'both';
  allowedFileTypes: string[];
  maxFileSize: number; // in MB
  isSubmitted: boolean;
  submittedAt?: Date;
  grade?: number;
  feedback?: string;
  attachments: string[];
  rubric?: RubricItem[];
}

interface RubricItem {
  id: string;
  criteria: string;
  description: string;
  points: number;
  maxPoints: number;
}

@Component({
  selector: 'app-assignment-detail',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div class="max-w-4xl mx-auto px-6 py-8">
        <!-- Assignment Header -->
        <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div class="flex items-start justify-between mb-6">
            <div class="flex-1">
              <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ assignment().title }}</h1>
              <p class="text-gray-600 mb-4">{{ assignment().courseName }}</p>
              <div class="flex items-center space-x-6 text-sm text-gray-500">
                <div class="flex items-center space-x-2">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
                  </svg>
                  <span>Hạn nộp: {{ formatDate(assignment().dueDate) }}</span>
                </div>
                <div class="flex items-center space-x-2">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  <span>{{ assignment().maxPoints }} điểm</span>
                </div>
                @if (assignment().isSubmitted) {
                  <div class="flex items-center space-x-2">
                    <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-green-600">Đã nộp</span>
                  </div>
                }
              </div>
            </div>
            
            <div class="flex items-center space-x-3">
              <img [src]="assignment().instructorAvatar" 
                   [alt]="assignment().instructorName"
                   class="w-12 h-12 rounded-full object-cover">
              <div>
                <p class="font-medium text-gray-900">{{ assignment().instructorName }}</p>
                <p class="text-sm text-gray-500">Giảng viên</p>
              </div>
            </div>
          </div>

          <!-- Status Badge -->
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              @if (assignment().isSubmitted) {
                <span class="px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium">
                  ✅ Đã nộp bài
                </span>
                @if (assignment().grade !== undefined) {
                  <span class="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium">
                    📊 Điểm: {{ assignment().grade }}/{{ assignment().maxPoints }}
                  </span>
                }
              } @else {
                <span class="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                  ⏰ Chưa nộp bài
                </span>
              }
            </div>
            
            <div class="flex items-center space-x-3">
              <button (click)="goBack()"
                      class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Quay lại
              </button>
              @if (!assignment().isSubmitted) {
                <button (click)="startSubmission()"
                        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Nộp bài
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Assignment Content -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Main Content -->
          <div class="lg:col-span-2 space-y-8">
            <!-- Description -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-4">Mô tả bài tập</h3>
              <div class="prose max-w-none">
                <p class="text-gray-700 leading-relaxed">{{ assignment().description }}</p>
              </div>
            </div>

            <!-- Instructions -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-4">Hướng dẫn</h3>
              <div class="prose max-w-none">
                <p class="text-gray-700 leading-relaxed whitespace-pre-line">{{ assignment().instructions }}</p>
              </div>
            </div>

            <!-- Attachments -->
            @if (assignment().attachments.length > 0) {
              <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-4">Tài liệu đính kèm</h3>
                <div class="space-y-3">
                  @for (attachment of assignment().attachments; track attachment) {
                    <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                      </svg>
                      <span class="text-gray-700">{{ attachment }}</span>
                      <button class="ml-auto px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200 transition-colors">
                        Tải xuống
                      </button>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Rubric -->
            @if (assignment().rubric && assignment().rubric!.length > 0) {
              <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-4">Tiêu chí chấm điểm</h3>
                <div class="space-y-4">
                  @for (item of assignment().rubric!; track item.id) {
                    <div class="p-4 border border-gray-200 rounded-lg">
                      <div class="flex items-center justify-between mb-2">
                        <h4 class="font-medium text-gray-900">{{ item.criteria }}</h4>
                        <span class="text-sm text-gray-500">{{ item.points }}/{{ item.maxPoints }} điểm</span>
                      </div>
                      <p class="text-sm text-gray-600">{{ item.description }}</p>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Submission Info -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-lg font-bold text-gray-900 mb-4">Thông tin nộp bài</h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-gray-600">Loại nộp bài:</span>
                  <span class="font-medium">{{ getSubmissionTypeText(assignment().submissionType) }}</span>
                </div>
                @if (assignment().submissionType === 'file' || assignment().submissionType === 'both') {
                  <div class="flex justify-between">
                    <span class="text-gray-600">Định dạng file:</span>
                    <span class="font-medium">{{ assignment().allowedFileTypes.join(', ') }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Kích thước tối đa:</span>
                    <span class="font-medium">{{ assignment().maxFileSize }}MB</span>
                  </div>
                }
                <div class="flex justify-between">
                  <span class="text-gray-600">Hạn nộp:</span>
                  <span class="font-medium">{{ formatDate(assignment().dueDate) }}</span>
                </div>
                @if (assignment().isSubmitted) {
                  <div class="flex justify-between">
                    <span class="text-gray-600">Nộp lúc:</span>
                    <span class="font-medium">{{ formatDate(assignment().submittedAt!) }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Grade & Feedback -->
            @if (assignment().isSubmitted && assignment().grade !== undefined) {
              <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-lg font-bold text-gray-900 mb-4">Kết quả</h3>
                <div class="text-center mb-4">
                  <div class="text-3xl font-bold text-blue-600 mb-2">
                    {{ assignment().grade }}/{{ assignment().maxPoints }}
                  </div>
                  <div class="text-sm text-gray-500">
                    {{ calculatePercentage(assignment().grade!, assignment().maxPoints) }}%
                  </div>
                </div>
                @if (assignment().feedback) {
                  <div class="mt-4">
                    <h4 class="font-medium text-gray-900 mb-2">Nhận xét:</h4>
                    <p class="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {{ assignment().feedback }}
                    </p>
                  </div>
                }
              </div>
            }

            <!-- Quick Actions -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-lg font-bold text-gray-900 mb-4">Thao tác nhanh</h3>
              <div class="space-y-3">
                <button (click)="viewCourse()"
                        class="w-full px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-left">
                  📚 Xem khóa học
                </button>
                <button (click)="contactInstructor()"
                        class="w-full px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-left">
                  💬 Liên hệ giảng viên
                </button>
                @if (assignment().isSubmitted) {
                  <button (click)="viewSubmission()"
                          class="w-full px-4 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors text-left">
                    📄 Xem bài nộp
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentDetailComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  assignment = signal<AssignmentDetail>({
    id: 'assignment-1',
    title: 'Thiết kế hệ thống an toàn tàu biển',
    description: 'Thiết kế và phân tích hệ thống an toàn cho tàu biển theo tiêu chuẩn quốc tế SOLAS.',
    instructions: `1. Phân tích các yêu cầu an toàn theo SOLAS
2. Thiết kế hệ thống phòng cháy chữa cháy
3. Tính toán và thiết kế hệ thống cứu sinh
4. Thiết kế hệ thống báo động và liên lạc
5. Viết báo cáo chi tiết với các bản vẽ kỹ thuật`,
    courseId: 'course-1',
    courseName: 'An toàn Hàng hải',
    instructorId: 'instructor-1',
    instructorName: 'TS. Nguyễn Văn Nam',
    instructorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    dueDate: new Date('2024-10-15'),
    maxPoints: 100,
    submissionType: 'both',
    allowedFileTypes: ['pdf', 'doc', 'docx', 'ppt', 'pptx'],
    maxFileSize: 10,
    isSubmitted: true,
    submittedAt: new Date('2024-10-14'),
    grade: 85,
    feedback: 'Bài làm tốt, phân tích chi tiết và đầy đủ. Cần cải thiện phần tính toán và bản vẽ kỹ thuật.',
    attachments: [
      'SOLAS_Requirements.pdf',
      'Safety_Design_Guidelines.docx',
      'Sample_Designs.pptx'
    ],
    rubric: [
      {
        id: 'rubric-1',
        criteria: 'Phân tích yêu cầu',
        description: 'Phân tích đầy đủ và chính xác các yêu cầu SOLAS',
        points: 20,
        maxPoints: 20
      },
      {
        id: 'rubric-2',
        criteria: 'Thiết kế hệ thống',
        description: 'Thiết kế hợp lý và khả thi',
        points: 30,
        maxPoints: 35
      },
      {
        id: 'rubric-3',
        criteria: 'Tính toán kỹ thuật',
        description: 'Tính toán chính xác và đầy đủ',
        points: 20,
        maxPoints: 25
      },
      {
        id: 'rubric-4',
        criteria: 'Báo cáo và trình bày',
        description: 'Báo cáo rõ ràng, logic và trình bày chuyên nghiệp',
        points: 15,
        maxPoints: 20
      }
    ]
  });

  ngOnInit(): void {
    // Get assignment ID from route params
    const assignmentId = this.route.snapshot.paramMap.get('id');
    if (assignmentId) {
      this.loadAssignment(assignmentId);
    }
  }

  loadAssignment(id: string): void {
    // Load assignment data based on ID
    console.log('Loading assignment:', id);
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }

  getSubmissionTypeText(type: string): string {
    switch (type) {
      case 'file': return 'File';
      case 'text': return 'Văn bản';
      case 'both': return 'File + Văn bản';
      default: return 'Không xác định';
    }
  }

  goBack(): void {
    this.router.navigate(['/student/assignments']);
  }

  startSubmission(): void {
    console.log('Start submission');
  }

  viewCourse(): void {
    this.router.navigate(['/student/courses', this.assignment().courseId]);
  }

  contactInstructor(): void {
    console.log('Contact instructor');
  }

  viewSubmission(): void {
    console.log('View submission');
  }

  calculatePercentage(grade: number, maxPoints: number): number {
    return Math.round((grade / maxPoints) * 100);
  }
}