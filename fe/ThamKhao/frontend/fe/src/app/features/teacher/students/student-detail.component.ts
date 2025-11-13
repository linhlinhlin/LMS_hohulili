import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StudentApi, StudentDetail, StudentCourseProgress, StudentAssignmentSummary } from '../../../api/client/student.api';

@Component({
  selector: 'app-student-detail',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">
          {{ loading() ? 'Đang tải...' : student()?.name ? 'Học viên: ' + student()!.name : 'Chi tiết học viên' }}
        </h1>
        <a routerLink="/teacher/students" class="text-sm text-gray-600 underline">Quay lại danh sách</a>
      </div>

      <!-- Error State -->
      <div class="bg-red-50 border border-red-200 rounded-lg p-4" *ngIf="error() && !loading()">
        <p class="text-red-600">{{ error() }}</p>
                <button (click)="onReload()" class="mt-2 text-blue-600 underline text-sm">Tải lại</button>
      </div>

      <!-- Loading State -->
      <div class="bg-white rounded-lg shadow p-6 text-center" *ngIf="loading()">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600">Đang tải thông tin học viên...</p>
      </div>

      <!-- Student Info -->
      <div class="bg-white rounded-lg shadow p-6" *ngIf="student() && !loading()">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="col-span-1 flex items-center gap-4">
            <div class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xl font-bold">
              {{ getInitials(student()!.name) }}
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-900">{{ student()!.name }}</h2>
              <p class="text-gray-600">{{ student()!.email }}</p>
              <p class="text-sm text-gray-500">Tham gia: {{ student()!.enrolledAt | date:'dd/MM/yyyy' }}</p>
              <p class="text-sm text-gray-500">Truy cập cuối: {{ student()!.lastAccessed ? (student()!.lastAccessed | date:'dd/MM/yyyy HH:mm') : 'Chưa có' }}</p>
            </div>
          </div>
          
          <div class="col-span-2">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600">{{ student()!.progress }}%</div>
                <div class="text-sm text-gray-500">Tiến độ tổng</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-green-600">{{ student()!.averageGrade.toFixed(1) }}</div>
                <div class="text-sm text-gray-500">Điểm TB</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-purple-600">{{ student()!.completedCourses }}</div>
                <div class="text-sm text-gray-500">Hoàn thành</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-orange-600">{{ student()!.totalCourses }}</div>
                <div class="text-sm text-gray-500">Tổng khóa học</div>
              </div>
            </div>
            
            <div class="mt-4 flex items-center justify-between">
              <span class="px-3 py-1 inline-flex text-sm font-semibold rounded-full"
                    [class.bg-green-100]="student()!.status === 'active'"
                    [class.text-green-800]="student()!.status === 'active'"
                    [class.bg-gray-100]="student()!.status === 'inactive'"
                    [class.text-gray-800]="student()!.status === 'inactive'"
                    [class.bg-red-100]="student()!.status === 'suspended'"
                    [class.text-red-800]="student()!.status === 'suspended'">
                {{ getStatusText(student()!.status) }}
              </span>
              
              <div class="flex gap-2">
                <button (click)="sendMessage()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  Nhắn tin
                </button>
                <button (click)="exportReport()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                  Xuất báo cáo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Course Progress -->
      <div class="bg-white rounded-lg shadow p-6" *ngIf="student() && !loading()">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Tiến độ khóa học</h3>
        <div class="space-y-4" *ngIf="courseProgress().length > 0; else noCourses">
          <div *ngFor="let course of courseProgress()" class="border rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-medium text-gray-900">{{ course.courseTitle }}</h4>
              <span class="px-2 py-1 text-xs font-semibold rounded-full"
                    [class.bg-blue-100]="course.status === 'in-progress'"
                    [class.text-blue-800]="course.status === 'in-progress'"
                    [class.bg-green-100]="course.status === 'completed'"
                    [class.text-green-800]="course.status === 'completed'"
                    [class.bg-gray-100]="course.status === 'dropped'"
                    [class.text-gray-800]="course.status === 'dropped'">
                {{ getCourseStatusText(course.status) }}
              </span>
            </div>
            <div class="flex items-center gap-4 text-sm text-gray-600">
              <div class="flex items-center">
                <div class="w-24 bg-gray-200 rounded-full h-2 mr-2">
                  <div class="bg-blue-600 h-2 rounded-full" [style.width.%]="course.progress"></div>
                </div>
                <span>{{ course.progress }}%</span>
              </div>
              <span>{{ course.completedLessons }}/{{ course.totalLessons }} bài học</span>
              <span *ngIf="course.grade">Điểm: {{ course.grade.toFixed(1) }}</span>
              <span>Tham gia: {{ course.enrolledAt | date:'dd/MM/yyyy' }}</span>
            </div>
          </div>
        </div>
        <ng-template #noCourses>
          <p class="text-gray-500 text-center py-8">Học viên chưa tham gia khóa học nào.</p>
        </ng-template>
      </div>

      <!-- Assignment Submissions -->
      <div class="bg-white rounded-lg shadow p-6" *ngIf="student() && !loading()">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Bài tập đã nộp</h3>
        <div class="space-y-3" *ngIf="assignments().length > 0; else noAssignments">
          <div *ngFor="let assignment of assignments()" class="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <h5 class="font-medium text-gray-900">{{ assignment.assignmentTitle }}</h5>
              <p class="text-sm text-gray-600">{{ assignment.courseTitle }}</p>
              <p class="text-xs text-gray-500">
                Hạn: {{ assignment.dueDate ? (assignment.dueDate | date:'dd/MM/yyyy HH:mm') : 'Không giới hạn' }}
                <span *ngIf="assignment.submittedAt"> | Nộp: {{ assignment.submittedAt | date:'dd/MM/yyyy HH:mm' }}</span>
              </p>
            </div>
            <div class="text-right">
              <span class="px-2 py-1 text-xs font-semibold rounded-full"
                    [class.bg-yellow-100]="assignment.status === 'pending'"
                    [class.text-yellow-800]="assignment.status === 'pending'"
                    [class.bg-blue-100]="assignment.status === 'submitted'"
                    [class.text-blue-800]="assignment.status === 'submitted'"
                    [class.bg-green-100]="assignment.status === 'graded'"
                    [class.text-green-800]="assignment.status === 'graded'"
                    [class.bg-red-100]="assignment.status === 'overdue'"
                    [class.text-red-800]="assignment.status === 'overdue'">
                {{ getAssignmentStatusText(assignment.status) }}
              </span>
              <div class="text-sm text-gray-600 mt-1" *ngIf="assignment.score !== undefined">
                {{ assignment.score }}/{{ assignment.maxScore }}
              </div>
            </div>
          </div>
        </div>
        <ng-template #noAssignments>
          <p class="text-gray-500 text-center py-8">Chưa có bài tập nào được nộp.</p>
        </ng-template>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentDetailComponent {
  private route = inject(ActivatedRoute);
  private studentApi = inject(StudentApi);

  studentId = this.route.snapshot.paramMap.get('id') || '';
  
  student = signal<StudentDetail | null>(null);
  courseProgress = signal<StudentCourseProgress[]>([]);
  assignments = signal<StudentAssignmentSummary[]>([]);
  loading = signal(true);
  error = signal('');

  constructor() {
    this.loadStudent();
  }

  private loadStudent() {
    if (!this.studentId) {
      this.error.set('ID học viên không hợp lệ');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.studentApi.getStudentDetail(this.studentId).subscribe({
      next: (response) => {
        if (response.data) {
          this.student.set(response.data);
          this.courseProgress.set(response.data.courseProgress || []);
          this.assignments.set(response.data.assignmentSubmissions || []);
        } else {
          // Mock data for development
          const mockStudent: StudentDetail = {
            id: this.studentId,
            name: 'Nguyễn Văn An',
            email: 'nguyenvanan@email.com',
            enrolledAt: '2025-09-01T00:00:00Z',
            lastAccessed: '2025-10-13T10:30:00Z',
            progress: 75,
            averageGrade: 8.5,
            status: 'active',
            completedCourses: 2,
            totalCourses: 3,
            courseProgress: [
              {
                courseId: '1',
                courseTitle: 'An toàn Hàng hải Cơ bản',
                enrolledAt: '2025-09-01T00:00:00Z',
                progress: 80,
                completedLessons: 8,
                totalLessons: 10,
                lastAccessed: '2025-10-13T09:00:00Z',
                grade: 8.5,
                status: 'in-progress'
              },
              {
                courseId: '2',
                courseTitle: 'Điều hướng Maritime',
                enrolledAt: '2025-09-15T00:00:00Z',
                progress: 100,
                completedLessons: 6,
                totalLessons: 6,
                lastAccessed: '2025-10-10T16:00:00Z',
                grade: 9.2,
                status: 'completed'
              }
            ],
            assignmentSubmissions: [
              {
                assignmentId: '1',
                assignmentTitle: 'Bài tập về An toàn Hàng hải',
                courseTitle: 'An toàn Hàng hải Cơ bản',
                dueDate: '2025-10-20T23:59:59Z',
                submittedAt: '2025-10-18T14:30:00Z',
                status: 'graded',
                score: 85,
                maxScore: 100,
                feedback: 'Bài làm tốt, cần chú ý thêm về phần SOLAS'
              }
            ],
            analytics: {
              totalStudyTime: 1200,
              averageSessionTime: 45,
              streakDays: 7,
              assignmentsCompleted: 5,
              assignmentsOverdue: 0,
              averageScore: 8.5,
              strongSubjects: ['An toàn hàng hải'],
              improvementAreas: ['Điều hướng'],
              learningActivity: []
            }
          };
          
          this.student.set(mockStudent);
          this.courseProgress.set(mockStudent.courseProgress);
          this.assignments.set(mockStudent.assignmentSubmissions);
        }
      },
      error: (error) => {
        console.error('Error loading student detail:', error);
        this.error.set('Không thể tải thông tin học viên');
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'active': 'Đang học',
      'inactive': 'Không hoạt động',
      'suspended': 'Tạm khóa'
    };
    return statusMap[status] || status;
  }

  getCourseStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'in-progress': 'Đang học',
      'completed': 'Hoàn thành',
      'dropped': 'Đã bỏ'
    };
    return statusMap[status] || status;
  }

  getAssignmentStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Chưa nộp',
      'submitted': 'Đã nộp',
      'graded': 'Đã chấm',
      'overdue': 'Quá hạn'
    };
    return statusMap[status] || status;
  }

  sendMessage() {
    // TODO: Implement messaging functionality
    console.log('Send message to student:', this.studentId);
  }

  exportReport() {
    // TODO: Implement export functionality
    this.studentApi.exportStudentReport(this.studentId, 'pdf').subscribe({
      next: (blob) => {
        // Handle file download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `student-report-${this.studentId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting report:', error);
      }
    });
  }

  onReload() {
    this.loadStudent();
  }
}