import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeacherService, TeacherAssignment, TeacherStudent } from '../services/teacher.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvatar: string;
  submittedAt: Date;
  content: string;
  attachments: string[];
  score: number | null;
  feedback: string;
  status: 'submitted' | 'graded' | 'late';
  isLate: boolean;
}

@Component({
  selector: 'app-assignment-submissions',
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isLoading()" 
      text="Đang tải bài nộp..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="purple">
    </app-loading>

    <div class="bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 min-h-screen">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">📋 Bài nộp của học viên</h1>
              <p class="text-gray-600">Xem và chấm bài nộp cho bài tập: {{ currentAssignment()?.title }}</p>
            </div>
            <button routerLink="/teacher/assignments" 
                    class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              ← Quay lại
            </button>
          </div>
        </div>

        @if (currentAssignment()) {
          <!-- Assignment Info -->
          <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <div>
                  <h2 class="text-xl font-semibold text-gray-900">{{ currentAssignment()?.title }}</h2>
                  <p class="text-gray-600">{{ currentAssignment()?.courseTitle }}</p>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm text-gray-500">Hạn nộp bài</div>
                <div class="font-semibold text-gray-900">{{ formatDate(currentAssignment()?.dueDate!) }}</div>
              </div>
            </div>
          </div>

          <!-- Stats Overview -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600 mb-1">Tổng học viên</p>
                  <p class="text-3xl font-bold text-gray-900">{{ currentAssignment()?.totalStudents || 0 }}</p>
                </div>
                <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
                  </svg>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600 mb-1">Đã nộp bài</p>
                  <p class="text-3xl font-bold text-gray-900">{{ submissions().length }}</p>
                </div>
                <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600 mb-1">Chưa chấm</p>
                  <p class="text-3xl font-bold text-gray-900">{{ ungradedSubmissions().length }}</p>
                </div>
                <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                  </svg>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600 mb-1">Nộp muộn</p>
                  <p class="text-3xl font-bold text-gray-900">{{ lateSubmissions().length }}</p>
                </div>
                <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Filter and Search -->
          <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div class="flex flex-col md:flex-row gap-4">
              <div class="flex-1">
                <input type="text" 
                       [(ngModel)]="searchQuery"
                       placeholder="Tìm kiếm học viên..."
                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
              </div>
              <div class="flex gap-4">
                <select [(ngModel)]="statusFilter" 
                        class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                  <option value="">Tất cả trạng thái</option>
                  <option value="submitted">Đã nộp</option>
                  <option value="graded">Đã chấm</option>
                  <option value="late">Nộp muộn</option>
                </select>
                <select [(ngModel)]="gradingFilter" 
                        class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                  <option value="">Tất cả</option>
                  <option value="graded">Đã chấm</option>
                  <option value="ungraded">Chưa chấm</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Submissions List -->
          <div class="space-y-6">
            @for (submission of filteredSubmissions(); track submission.id) {
              <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center space-x-4">
                    <img [src]="submission.studentAvatar" 
                         [alt]="submission.studentName"
                         class="w-12 h-12 rounded-full">
                    <div>
                      <h3 class="text-lg font-semibold text-gray-900">{{ submission.studentName }}</h3>
                      <p class="text-sm text-gray-600">{{ submission.studentEmail }}</p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    @if (submission.isLate) {
                      <span class="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        Nộp muộn
                      </span>
                    }
                    <span class="px-3 py-1 text-xs font-medium rounded-full"
                          [class]="getStatusClass(submission.status)">
                      {{ getStatusText(submission.status) }}
                    </span>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Thời gian nộp</label>
                    <p class="text-sm text-gray-900">{{ formatDateTime(submission.submittedAt) }}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Điểm số</label>
                    <div class="flex items-center space-x-2">
                      @if (submission.score !== null) {
                        <span class="text-lg font-semibold text-gray-900">{{ submission.score }}/{{ currentAssignment()?.maxScore }}</span>
                        <span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          {{ getGradeText(submission.score!, currentAssignment()?.maxScore!) }}
                        </span>
                      } @else {
                        <span class="text-sm text-gray-500">Chưa chấm</span>
                      }
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <p class="text-sm text-gray-900">{{ getStatusText(submission.status) }}</p>
                  </div>
                </div>

                <!-- Submission Content -->
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Nội dung bài nộp</label>
                  <div class="bg-gray-50 rounded-lg p-4">
                    <p class="text-gray-900 whitespace-pre-wrap">{{ submission.content }}</p>
                  </div>
                </div>

                <!-- Attachments -->
                @if (submission.attachments.length > 0) {
                  <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Tệp đính kèm</label>
                    <div class="flex flex-wrap gap-2">
                      @for (attachment of submission.attachments; track attachment) {
                        <a [href]="attachment" 
                           target="_blank"
                           class="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors">
                          <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                          </svg>
                          Tải xuống
                        </a>
                      }
                    </div>
                  </div>
                }

                <!-- Grading Section -->
                <div class="border-t border-gray-200 pt-4">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Điểm số</label>
                      <input 
                        type="number" 
                        [(ngModel)]="submission.score"
                        [placeholder]="'0 - ' + currentAssignment()?.maxScore"
                        min="0"
                        [max]="currentAssignment()?.maxScore || 100"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                    </div>
                    <div class="flex items-end">
                      <button 
                        (click)="gradeSubmission(submission)"
                        [disabled]="submission.score === null || submission.score < 0"
                        class="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Chấm điểm
                      </button>
                    </div>
                  </div>
                  
                  <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Nhận xét</label>
                    <textarea 
                      [(ngModel)]="submission.feedback"
                      rows="3"
                      placeholder="Nhận xét cho học viên..."
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"></textarea>
                  </div>
                </div>
              </div>
            }

            <!-- Empty State -->
            @if (filteredSubmissions().length === 0) {
              <div class="bg-white rounded-xl shadow-lg p-6">
                <div class="text-center py-12">
                  <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                  </svg>
                  <h3 class="text-lg font-medium text-gray-900 mb-2">Chưa có bài nộp nào</h3>
                  <p class="text-gray-500 mb-6">Học viên chưa nộp bài cho bài tập này</p>
                </div>
              </div>
            }
          </div>
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
export class AssignmentSubmissionsComponent implements OnInit {
  private teacherService = inject(TeacherService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // State
  isLoading = signal(false);
  currentAssignment = signal<TeacherAssignment | null>(null);
  submissions = signal<Submission[]>([]);
  
  // Filters
  searchQuery = signal('');
  statusFilter = signal('');
  gradingFilter = signal('');

  // Computed properties
  ungradedSubmissions = computed(() => 
    this.submissions().filter(s => s.score === null)
  );

  lateSubmissions = computed(() => 
    this.submissions().filter(s => s.isLate)
  );

  filteredSubmissions = computed(() => {
    let filtered = this.submissions();
    
    // Filter by search query
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(submission => 
        submission.studentName.toLowerCase().includes(query) ||
        submission.studentEmail.toLowerCase().includes(query)
      );
    }
    
    // Filter by status
    if (this.statusFilter()) {
      filtered = filtered.filter(submission => submission.status === this.statusFilter());
    }
    
    // Filter by grading status
    if (this.gradingFilter()) {
      if (this.gradingFilter() === 'graded') {
        filtered = filtered.filter(submission => submission.score !== null);
      } else if (this.gradingFilter() === 'ungraded') {
        filtered = filtered.filter(submission => submission.score === null);
      }
    }
    
    return filtered;
  });

  ngOnInit(): void {
    this.loadAssignment();
    this.loadSubmissions();
  }

  private async loadAssignment(): Promise<void> {
    this.isLoading.set(true);
    try {
      const assignmentId = this.route.snapshot.paramMap.get('id');
      if (assignmentId) {
        await this.teacherService.getAssignments();
        const assignment = this.teacherService.assignments().find(a => a.id === assignmentId);
        this.currentAssignment.set(assignment || null);
      }
    } catch (error) {
      console.error('Error loading assignment:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadSubmissions(): Promise<void> {
    // Mock submissions data
    const mockSubmissions: Submission[] = [
      {
        id: 'sub_1',
        studentId: 'student_1',
        studentName: 'Nguyễn Văn A',
        studentEmail: 'nguyenvana@email.com',
        studentAvatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+A&background=3b82f6&color=ffffff&size=150',
        submittedAt: new Date('2024-09-20T10:30:00'),
        content: 'Đây là bài làm của em về an toàn hàng hải. Em đã nghiên cứu kỹ các quy định SOLAS và MARPOL...',
        attachments: ['assignment_1.pdf', 'safety_report.docx'],
        score: 85,
        feedback: 'Bài làm tốt, cần chú ý thêm về phần xử lý tình huống khẩn cấp.',
        status: 'graded',
        isLate: false
      },
      {
        id: 'sub_2',
        studentId: 'student_2',
        studentName: 'Trần Thị B',
        studentEmail: 'tranthib@email.com',
        studentAvatar: 'https://ui-avatars.com/api/?name=Tran+Thi+B&background=10b981&color=ffffff&size=150',
        submittedAt: new Date('2024-09-21T15:45:00'),
        content: 'Bài tập về kỹ thuật tàu biển. Em đã phân tích cấu trúc tàu và hệ thống động cơ...',
        attachments: ['ship_analysis.pdf'],
        score: null,
        feedback: '',
        status: 'submitted',
        isLate: true
      },
      {
        id: 'sub_3',
        studentId: 'student_3',
        studentName: 'Lê Văn C',
        studentEmail: 'levanc@email.com',
        studentAvatar: 'https://ui-avatars.com/api/?name=Le+Van+C&background=8b5cf6&color=ffffff&size=150',
        submittedAt: new Date('2024-09-19T09:15:00'),
        content: 'Báo cáo về quản lý cảng biển và logistics hàng hải...',
        attachments: ['port_management.pdf', 'logistics_report.docx', 'charts.xlsx'],
        score: 92,
        feedback: 'Xuất sắc! Phân tích rất chi tiết và có tính thực tiễn cao.',
        status: 'graded',
        isLate: false
      }
    ];

    this.submissions.set(mockSubmissions);
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

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('vi-VN', {
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
        return 'bg-blue-100 text-blue-800';
      case 'graded':
        return 'bg-green-100 text-green-800';
      case 'late':
        return 'bg-red-100 text-red-800';
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
      case 'late':
        return 'Nộp muộn';
      default:
        return 'Không xác định';
    }
  }

  getGradeText(score: number, maxScore: number): string {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'Xuất sắc';
    if (percentage >= 80) return 'Tốt';
    if (percentage >= 70) return 'Khá';
    if (percentage >= 60) return 'Trung bình';
    return 'Cần cải thiện';
  }

  async gradeSubmission(submission: Submission): Promise<void> {
    if (submission.score !== null && submission.score >= 0) {
      // Update submission status
      this.submissions.update(submissions => 
        submissions.map(s => 
          s.id === submission.id 
            ? { ...s, score: submission.score, feedback: submission.feedback, status: 'graded' as const }
            : s
        )
      );
      
      console.log('Graded submission:', submission);
      // In real app, this would call the API to save the grade
    }
  }
}