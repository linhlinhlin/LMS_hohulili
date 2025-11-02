import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeacherService } from '../services/teacher.service';

export interface AssignmentSubmission {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  assignmentId: string;
  submissionText: string;
  submittedFiles: string[];
  submittedAt: Date;
  grade?: number;
  feedback?: string;
  gradedAt?: Date;
  status: 'submitted' | 'graded' | 'returned';
}

@Component({
  selector: 'app-assignment-grader',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">📝 Chấm điểm bài tập</h1>
              <p class="text-gray-600">Chấm điểm và phản hồi cho học viên</p>
            </div>
            <button (click)="goBack()"
                    class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Quay lại
            </button>
          </div>
        </div>

        <!-- Assignment Info -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">{{ assignmentTitle() }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="text-sm text-gray-600">
              <span class="font-medium">Tổng bài nộp:</span> {{ totalSubmissions() }}
            </div>
            <div class="text-sm text-gray-600">
              <span class="font-medium">Đã chấm:</span> {{ gradedSubmissions() }}
            </div>
            <div class="text-sm text-gray-600">
              <span class="font-medium">Chưa chấm:</span> {{ pendingSubmissions() }}
            </div>
          </div>
        </div>

        <!-- Submissions List -->
        <div class="space-y-6">
          @for (submission of submissions(); track submission.id) {
            <div class="bg-white rounded-xl shadow-lg overflow-hidden">
              <!-- Student Info Header -->
              <div class="bg-purple-50 px-6 py-4 border-b border-gray-200">
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <div class="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {{ submission.studentName.charAt(0) }}
                    </div>
                    <div class="ml-4">
                      <h3 class="text-lg font-semibold text-gray-900">{{ submission.studentName }}</h3>
                      <p class="text-sm text-gray-600">{{ submission.studentEmail }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm text-gray-600">
                      Nộp lúc: {{ formatDate(submission.submittedAt) }}
                    </div>
                    <span class="px-3 py-1 text-xs font-medium rounded-full"
                          [class]="getStatusClass(submission.status)">
                      {{ getStatusText(submission.status) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Submission Content -->
              <div class="p-6">
                <div class="mb-6">
                  <h4 class="text-lg font-medium text-gray-900 mb-3">Nội dung bài nộp</h4>
                  <div class="bg-gray-50 rounded-lg p-4">
                    <p class="text-gray-800 whitespace-pre-wrap">{{ submission.submissionText }}</p>
                  </div>
                </div>

                <!-- Files -->
                @if (submission.submittedFiles.length > 0) {
                  <div class="mb-6">
                    <h4 class="text-lg font-medium text-gray-900 mb-3">Tệp đính kèm</h4>
                    <div class="space-y-2">
                      @for (file of submission.submittedFiles; track file) {
                        <div class="flex items-center p-3 bg-gray-50 rounded-lg">
                          <svg class="w-5 h-5 text-gray-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                          </svg>
                          <span class="text-sm text-gray-700">{{ file }}</span>
                          <button class="ml-auto text-purple-600 hover:text-purple-800 text-sm">
                            Tải xuống
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Grading Form -->
                <div class="border-t border-gray-200 pt-6">
                  <h4 class="text-lg font-medium text-gray-900 mb-4">Chấm điểm</h4>
                  <form (ngSubmit)="gradeSubmission(submission)" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Điểm số (0-100)</label>
                        <input type="number" 
                               [(ngModel)]="submission.grade"
                               name="grade"
                               min="0"
                               max="100"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500">
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                        <select [(ngModel)]="submission.status"
                                name="status"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500">
                          <option value="submitted">Đã nộp</option>
                          <option value="graded">Đã chấm</option>
                          <option value="returned">Đã trả</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Phản hồi</label>
                      <textarea [(ngModel)]="submission.feedback"
                                name="feedback"
                                rows="4"
                                placeholder="Nhập phản hồi cho học viên..."
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"></textarea>
                    </div>
                    
                    <div class="flex justify-end space-x-3">
                      <button type="button"
                              (click)="saveDraft(submission)"
                              class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                        Lưu nháp
                      </button>
                      <button type="submit"
                              class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        Chấm điểm
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Empty State -->
        @if (submissions().length === 0) {
          <div class="text-center py-12">
            <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Chưa có bài nộp nào</h3>
            <p class="text-gray-500">Học viên chưa nộp bài tập này</p>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentGraderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private teacherService = inject(TeacherService);

  assignmentId = signal<string>('');
  assignmentTitle = signal<string>('');
  submissions = signal<AssignmentSubmission[]>([]);

  totalSubmissions = computed(() => this.submissions().length);
  gradedSubmissions = computed(() => this.submissions().filter(s => s.status === 'graded').length);
  pendingSubmissions = computed(() => this.submissions().filter(s => s.status === 'submitted').length);

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.assignmentId.set(params['id']);
      this.loadSubmissions();
    });
  }

  private loadSubmissions(): void {
    // Mock data for now
    const mockSubmissions: AssignmentSubmission[] = [
      {
        id: 'sub_1',
        studentId: 'student_1',
        studentName: 'Nguyễn Văn A',
        studentEmail: 'nguyenvana@example.com',
        assignmentId: this.assignmentId(),
        submissionText: 'Đây là bài làm của tôi về chủ đề an toàn hàng hải. Tôi đã nghiên cứu kỹ các quy định và thực hành an toàn trong ngành hàng hải...',
        submittedFiles: ['bai_tap_an_toan.pdf', 'hinh_anh_minh_hoa.jpg'],
        submittedAt: new Date('2024-09-20'),
        status: 'submitted'
      },
      {
        id: 'sub_2',
        studentId: 'student_2',
        studentName: 'Trần Thị B',
        studentEmail: 'tranthib@example.com',
        assignmentId: this.assignmentId(),
        submissionText: 'Bài tập về kỹ thuật tàu biển. Tôi đã phân tích các hệ thống động cơ và cách vận hành...',
        submittedFiles: ['ky_thuat_tau_bien.docx'],
        submittedAt: new Date('2024-09-19'),
        grade: 85,
        feedback: 'Bài làm tốt, có phân tích sâu sắc. Cần chú ý thêm về phần bảo trì.',
        gradedAt: new Date('2024-09-21'),
        status: 'graded'
      }
    ];

    this.submissions.set(mockSubmissions);
    this.assignmentTitle.set('Bài tập An toàn Hàng hải');
  }

  gradeSubmission(submission: AssignmentSubmission): void {
    if (submission.grade !== undefined && submission.grade >= 0 && submission.grade <= 100) {
      submission.gradedAt = new Date();
      submission.status = 'graded';
      
      // Update the submission in the signal
      this.submissions.update(submissions => 
        submissions.map(s => s.id === submission.id ? submission : s)
      );
      
      console.log('Graded submission:', submission);
    }
  }

  saveDraft(submission: AssignmentSubmission): void {
    // Save draft without changing status
    this.submissions.update(submissions => 
      submissions.map(s => s.id === submission.id ? submission : s)
    );
    
    console.log('Saved draft:', submission);
  }

  goBack(): void {
    window.history.back();
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'graded':
        return 'bg-green-100 text-green-800';
      case 'returned':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'submitted':
        return 'Đã nộp';
      case 'graded':
        return 'Đã chấm';
      case 'returned':
        return 'Đã trả';
      default:
        return 'Không xác định';
    }
  }
}