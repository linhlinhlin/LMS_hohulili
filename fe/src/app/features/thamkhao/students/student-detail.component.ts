import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { TeacherService, TeacherStudent, TeacherCourse, TeacherAssignment } from '../services/teacher.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

interface StudentProgress {
  courseId: string;
  courseTitle: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  lastAccessed: Date;
  grade: number;
}

interface StudentAssignment {
  assignmentId: string;
  assignmentTitle: string;
  courseTitle: string;
  submittedAt: Date;
  score: number | null;
  maxScore: number;
  status: 'submitted' | 'graded' | 'late';
  feedback: string;
}

interface StudentActivity {
  id: string;
  type: 'login' | 'course_access' | 'assignment_submit' | 'quiz_complete';
  description: string;
  timestamp: Date;
  courseTitle?: string;
}

@Component({
  selector: 'app-student-detail',
  imports: [CommonModule, RouterModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isLoading()" 
      text="Đang tải thông tin học viên..."
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
              <h1 class="text-3xl font-bold text-gray-900 mb-2">👤 Chi tiết học viên</h1>
              <p class="text-gray-600">Thông tin chi tiết và theo dõi tiến độ học tập</p>
            </div>
            <button routerLink="/teacher/students" 
                    class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              ← Quay lại
            </button>
          </div>
        </div>

        @if (currentStudent()) {
          <!-- Student Profile Header -->
          <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div class="flex items-start space-x-6">
              <img [src]="currentStudent()?.avatar" 
                   [alt]="currentStudent()?.name"
                   class="w-24 h-24 rounded-full border-4 border-purple-200">
              <div class="flex-1">
                <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ currentStudent()?.name }}</h2>
                <p class="text-gray-600 mb-4">{{ currentStudent()?.email }}</p>
                
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div class="text-center p-3 bg-blue-50 rounded-lg">
                    <div class="text-xl font-bold text-blue-600">{{ currentStudent()?.totalCourses }}</div>
                    <div class="text-sm text-blue-800">Khóa học</div>
                  </div>
                  <div class="text-center p-3 bg-green-50 rounded-lg">
                    <div class="text-xl font-bold text-green-600">{{ currentStudent()?.completedCourses }}</div>
                    <div class="text-sm text-green-800">Hoàn thành</div>
                  </div>
                  <div class="text-center p-3 bg-purple-50 rounded-lg">
                    <div class="text-xl font-bold text-purple-600">{{ currentStudent()?.averageGrade }}/10</div>
                    <div class="text-sm text-purple-800">Điểm TB</div>
                  </div>
                  <div class="text-center p-3 bg-orange-50 rounded-lg">
                    <div class="text-xl font-bold text-orange-600">{{ currentStudent()?.progress }}%</div>
                    <div class="text-sm text-orange-800">Tiến độ</div>
                  </div>
                </div>
              </div>
              
              <div class="text-right">
                <div class="text-sm text-gray-500 mb-1">Hoạt động cuối</div>
                <div class="font-semibold text-gray-900">{{ formatLastActive(currentStudent()?.lastActive!) }}</div>
                <div class="text-sm text-gray-500 mt-2">Ngày đăng ký</div>
                <div class="text-sm text-gray-900">{{ formatDate(currentStudent()?.enrollmentDate!) }}</div>
              </div>
            </div>
          </div>

          <!-- Main Content Grid -->
          <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <!-- Left Column - Course Progress -->
            <div class="xl:col-span-2 space-y-8">
              <!-- Course Progress -->
              <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                    <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                  </svg>
                  Tiến độ khóa học
                </h3>
                
                <div class="space-y-4">
                  @for (progress of studentProgress(); track progress.courseId) {
                    <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div class="flex items-center justify-between mb-3">
                        <h4 class="font-semibold text-gray-900">{{ progress.courseTitle }}</h4>
                        <span class="px-3 py-1 text-sm font-medium rounded-full"
                              [class]="getProgressClass(progress.progress)">
                          {{ progress.progress }}%
                        </span>
                      </div>
                      
                      <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>{{ progress.completedLessons }}/{{ progress.totalLessons }} bài học</span>
                        <span>Điểm: {{ progress.grade }}/10</span>
                      </div>
                      
                      <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div class="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                             [style.width.%]="progress.progress"></div>
                      </div>
                      
                      <div class="text-xs text-gray-500">
                        Truy cập cuối: {{ formatDateTime(progress.lastAccessed) }}
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Assignment History -->
              <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                  </svg>
                  Lịch sử bài tập
                </h3>
                
                <div class="space-y-4">
                  @for (assignment of studentAssignments(); track assignment.assignmentId) {
                    <div class="border border-gray-200 rounded-lg p-4">
                      <div class="flex items-center justify-between mb-2">
                        <h4 class="font-semibold text-gray-900">{{ assignment.assignmentTitle }}</h4>
                        <span class="px-3 py-1 text-sm font-medium rounded-full"
                              [class]="getAssignmentStatusClass(assignment.status)">
                          {{ getAssignmentStatusText(assignment.status) }}
                        </span>
                      </div>
                      
                      <p class="text-sm text-gray-600 mb-3">{{ assignment.courseTitle }}</p>
                      
                      <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-500">Nộp: {{ formatDateTime(assignment.submittedAt) }}</span>
                        <div class="flex items-center space-x-2">
                          @if (assignment.score !== null) {
                            <span class="font-semibold text-gray-900">{{ assignment.score }}/{{ assignment.maxScore }}</span>
                            <span class="px-2 py-1 text-xs font-medium rounded-full"
                                  [class]="getGradeClass(assignment.score, assignment.maxScore)">
                              {{ getGradeText(assignment.score, assignment.maxScore) }}
                            </span>
                          } @else {
                            <span class="text-gray-500">Chưa chấm</span>
                          }
                        </div>
                      </div>
                      
                      @if (assignment.feedback) {
                        <div class="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p class="text-sm text-gray-700">{{ assignment.feedback }}</p>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Right Column - Activity & Stats -->
            <div class="space-y-8">
              <!-- Recent Activity -->
              <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                  </svg>
                  Hoạt động gần đây
                </h3>
                
                <div class="space-y-4">
                  @for (activity of recentActivities(); track activity.id) {
                    <div class="flex items-start space-x-3">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center"
                           [class]="getActivityIconClass(activity.type)">
                        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path [attr.d]="getActivityIcon(activity.type)"></path>
                        </svg>
                      </div>
                      <div class="flex-1">
                        <p class="text-sm text-gray-900">{{ activity.description }}</p>
                        <p class="text-xs text-gray-500">{{ formatDateTime(activity.timestamp) }}</p>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Performance Stats -->
              <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
                  </svg>
                  Thống kê hiệu suất
                </h3>
                
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Tỷ lệ hoàn thành</span>
                    <span class="font-semibold text-gray-900">{{ getCompletionRate() }}%</span>
                  </div>
                  
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Điểm trung bình</span>
                    <span class="font-semibold text-gray-900">{{ currentStudent()?.averageGrade }}/10</span>
                  </div>
                  
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Thời gian học</span>
                    <span class="font-semibold text-gray-900">{{ getTotalStudyTime() }} giờ</span>
                  </div>
                  
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Bài tập đã nộp</span>
                    <span class="font-semibold text-gray-900">{{ getSubmittedAssignments() }}</span>
                  </div>
                </div>
              </div>

              <!-- Quick Actions -->
              <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
                  </svg>
                  Thao tác nhanh
                </h3>
                
                <div class="space-y-3">
                  <button 
                    (click)="sendMessage()"
                    class="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium">
                    <svg class="w-4 h-4 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                    </svg>
                    Nhắn tin
                  </button>
                  
                  <button 
                    (click)="viewProgress()"
                    class="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium">
                    <svg class="w-4 h-4 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Xem tiến độ
                  </button>
                  
                  <button 
                    (click)="exportReport()"
                    class="w-full px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium">
                    <svg class="w-4 h-4 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                    Xuất báo cáo
                  </button>
                </div>
              </div>
            </div>
          </div>
        } @else {
          <!-- Loading or Error State -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="text-center py-12">
              <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
              </svg>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Không tìm thấy học viên</h3>
              <p class="text-gray-500 mb-6">Học viên bạn đang tìm kiếm không tồn tại hoặc đã bị xóa</p>
              <button routerLink="/teacher/students" 
                      class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Quay lại danh sách học viên
              </button>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Message Modal -->
    @if (showMessageModal()) {
      <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div class="mt-3">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">Gửi tin nhắn</h3>
              <button (click)="closeMessageModal()" class="text-gray-400 hover:text-gray-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Gửi đến: {{ currentStudent()?.name }}</label>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nội dung tin nhắn</label>
                <textarea 
                  [value]="messageContent()"
                  (input)="onMessageInput($event)"
                  rows="4"
                  placeholder="Nhập nội dung tin nhắn..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                </textarea>
              </div>
            </div>
            
            <div class="flex justify-end space-x-3 mt-6">
              <button (click)="closeMessageModal()"
                      class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors">
                Hủy
              </button>
              <button (click)="sendMessageToStudent()"
                      [disabled]="!messageContent().trim()"
                      class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Gửi tin nhắn
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentDetailComponent implements OnInit {
  private teacherService = inject(TeacherService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // State
  isLoading = signal(false);
  currentStudent = signal<TeacherStudent | null>(null);
  studentProgress = signal<StudentProgress[]>([]);
  studentAssignments = signal<StudentAssignment[]>([]);
  recentActivities = signal<StudentActivity[]>([]);
  showMessageModal = signal(false);
  messageContent = signal('');

  ngOnInit(): void {
    this.loadStudent();
    this.loadStudentData();
  }

  private async loadStudent(): Promise<void> {
    this.isLoading.set(true);
    try {
      const studentId = this.route.snapshot.paramMap.get('id');
      if (studentId) {
        await this.teacherService.getStudents();
        const student = this.teacherService.students().find(s => s.id === studentId);
        this.currentStudent.set(student || null);
      }
    } catch (error) {
      console.error('Error loading student:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadStudentData(): Promise<void> {
    // Mock data for student progress
    const mockProgress: StudentProgress[] = [
      {
        courseId: 'course_1',
        courseTitle: 'Kỹ thuật Tàu biển Cơ bản',
        progress: 85,
        completedLessons: 20,
        totalLessons: 24,
        lastAccessed: new Date('2024-09-21T14:30:00'),
        grade: 8.5
      },
      {
        courseId: 'course_2',
        courseTitle: 'An toàn Hàng hải',
        progress: 72,
        completedLessons: 14,
        totalLessons: 20,
        lastAccessed: new Date('2024-09-20T10:15:00'),
        grade: 9.0
      }
    ];

    // Mock data for student assignments
    const mockAssignments: StudentAssignment[] = [
      {
        assignmentId: 'assignment_1',
        assignmentTitle: 'Bài tập về Cấu trúc Tàu',
        courseTitle: 'Kỹ thuật Tàu biển Cơ bản',
        submittedAt: new Date('2024-09-20T10:30:00'),
        score: 85,
        maxScore: 100,
        status: 'graded',
        feedback: 'Bài làm tốt, cần chú ý thêm về phần xử lý tình huống khẩn cấp.'
      },
      {
        assignmentId: 'assignment_2',
        assignmentTitle: 'Quiz An toàn Hàng hải',
        courseTitle: 'An toàn Hàng hải',
        submittedAt: new Date('2024-09-21T15:45:00'),
        score: 92,
        maxScore: 100,
        status: 'graded',
        feedback: 'Xuất sắc! Phân tích rất chi tiết và có tính thực tiễn cao.'
      }
    ];

    // Mock data for recent activities
    const mockActivities: StudentActivity[] = [
      {
        id: 'activity_1',
        type: 'course_access',
        description: 'Truy cập khóa học "Kỹ thuật Tàu biển Cơ bản"',
        timestamp: new Date('2024-09-21T14:30:00'),
        courseTitle: 'Kỹ thuật Tàu biển Cơ bản'
      },
      {
        id: 'activity_2',
        type: 'assignment_submit',
        description: 'Nộp bài tập "Quiz An toàn Hàng hải"',
        timestamp: new Date('2024-09-21T15:45:00'),
        courseTitle: 'An toàn Hàng hải'
      },
      {
        id: 'activity_3',
        type: 'quiz_complete',
        description: 'Hoàn thành quiz "Cấu trúc Tàu biển"',
        timestamp: new Date('2024-09-20T16:20:00'),
        courseTitle: 'Kỹ thuật Tàu biển Cơ bản'
      },
      {
        id: 'activity_4',
        type: 'login',
        description: 'Đăng nhập vào hệ thống',
        timestamp: new Date('2024-09-20T09:15:00')
      }
    ];

    this.studentProgress.set(mockProgress);
    this.studentAssignments.set(mockAssignments);
    this.recentActivities.set(mockActivities);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN');
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

  formatLastActive(date: Date): string {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Vừa xong';
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} ngày trước`;
  }

  getProgressClass(progress: number): string {
    if (progress >= 80) return 'bg-green-100 text-green-800';
    if (progress >= 60) return 'bg-blue-100 text-blue-800';
    if (progress >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }

  getAssignmentStatusClass(status: string): string {
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

  getAssignmentStatusText(status: string): string {
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

  getGradeClass(score: number, maxScore: number): string {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'bg-green-100 text-green-800';
    if (percentage >= 80) return 'bg-blue-100 text-blue-800';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }

  getGradeText(score: number, maxScore: number): string {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'Xuất sắc';
    if (percentage >= 80) return 'Tốt';
    if (percentage >= 70) return 'Khá';
    if (percentage >= 60) return 'Trung bình';
    return 'Cần cải thiện';
  }

  getActivityIconClass(type: string): string {
    switch (type) {
      case 'login':
        return 'bg-green-500';
      case 'course_access':
        return 'bg-blue-500';
      case 'assignment_submit':
        return 'bg-purple-500';
      case 'quiz_complete':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'login':
        return 'M10 12a2 2 0 100-4 2 2 0 000 4z';
      case 'course_access':
        return 'M9 2a1 1 0 000 2h2a1 1 0 100-2H9z';
      case 'assignment_submit':
        return 'M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4z';
      case 'quiz_complete':
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  getCompletionRate(): number {
    const progress = this.studentProgress();
    if (progress.length === 0) return 0;
    return Math.round(progress.reduce((sum, p) => sum + p.progress, 0) / progress.length);
  }

  getTotalStudyTime(): number {
    // Mock calculation
    return Math.floor(Math.random() * 50) + 20;
  }

  getSubmittedAssignments(): number {
    return this.studentAssignments().length;
  }

  sendMessage(): void {
    const student = this.currentStudent();
    if (!student) return;
    
    // Open messaging modal or navigate to communication
    this.showMessageModal.set(true);
  }

  viewProgress(): void {
    const student = this.currentStudent();
    if (!student) return;
    
    // Navigate to detailed progress view
    this.router.navigate(['/teacher/students', student.id, 'progress']);
  }

  exportReport(): void {
    const student = this.currentStudent();
    if (!student) return;

    // Create report data
    const reportData = {
      student: {
        name: student.name,
        email: student.email,
        studentId: (student as any).studentId || '',
        department: (student as any).department || ''
      },
      progress: this.studentProgress(),
      assignments: this.studentAssignments(),
      activities: this.recentActivities(),
      summary: {
        totalCourses: this.studentProgress().length,
        completedAssignments: this.studentAssignments().filter(a => a.status === 'graded').length,
        averageGrade: this.calculateAverageGrade(),
        lastActivity: this.recentActivities()[0]?.timestamp
      }
    };

    // Create JSON file and download
    const jsonContent = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `student_report_${student.name}_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private calculateAverageGrade(): number {
    const gradedAssignments = this.studentAssignments().filter(a => a.status === 'graded' && (a as any).grade);
    if (gradedAssignments.length === 0) return 0;
    
    const totalGrade = gradedAssignments.reduce((sum, assignment) => sum + ((assignment as any).grade || 0), 0);
    return totalGrade / gradedAssignments.length;
  }

  // Message modal methods
  closeMessageModal(): void {
    this.showMessageModal.set(false);
    this.messageContent.set('');
  }

  onMessageInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.messageContent.set(target.value);
  }

  async sendMessageToStudent(): Promise<void> {
    const student = this.currentStudent();
    const content = this.messageContent();
    
    if (!student || !content.trim()) return;

    try {
      // Simulate sending message
      console.log(`Sending message to ${student.name}: ${content}`);
      this.closeMessageModal();
      // Here you would typically call a service to send the message
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
}