import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AssignmentApi, StudentAssignmentResponse } from '../../api/client/assignment.api';

interface AssignmentItem {
  id: string;
  title: string;
  course: string;
  courseId: string;
  type: string;
  status: string; // not_submitted, submitted, graded, late
  dueDate: string;
  points: number;
  grade: number | null;
  description: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-assignments',
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="container mx-auto px-4">
        <div class="max-w-6xl mx-auto">
          <!-- Header -->
          <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-3xl font-bold text-gray-900">Bài tập</h1>
                <p class="text-gray-600 mt-2">Quản lý và theo dõi bài tập của bạn</p>
              </div>
              <div class="flex space-x-4">
                <button
                  (click)="toggleFilter()"
                  class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                  {{ showFilter() ? 'Ẩn bộ lọc' : 'Hiện bộ lọc' }}
                </button>
                <button
                  (click)="refreshAssignments()"
                  class="bg-[#0056D2] text-white px-4 py-2 rounded-lg hover:bg-[#004BB5] transition-colors">
                  Làm mới
                </button>
              </div>
            </div>
          </div>

          <!-- Filter Section -->
          @if (showFilter()) {
            <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Bộ lọc</h2>
              <div class="grid md:grid-cols-4 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                  <select
                    [(ngModel)]="filters.status"
                    class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-transparent">
                    <option value="">Tất cả</option>
                    <option value="not_submitted">Chưa làm</option>
                    <option value="submitted">Đã nộp</option>
                    <option value="graded">Đã chấm</option>
                    <option value="late">Muộn</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Khóa học</label>
                  <select
                    [(ngModel)]="filters.course"
                    class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-transparent">
                    <option value="">Tất cả</option>
                    @for (course of availableCourses(); track course.id) {
                      <option [value]="course.id">{{ course.name }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm</label>
                  <input
                    type="text"
                    [(ngModel)]="filters.search"
                    placeholder="Tìm kiếm bài tập..."
                    class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-transparent">
                </div>
              </div>
            </div>
          }

          <!-- Loading -->
          @if (isLoading()) {
            <div class="bg-white rounded-lg shadow-lg p-12 text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0056D2] mx-auto mb-4"></div>
              <p class="text-gray-600">Đang tải bài tập...</p>
            </div>
          }

          <!-- Assignments List -->
          @if (!isLoading()) {
            <div class="space-y-6">
              @for (assignment of filteredAssignments(); track assignment.id) {
                <div class="bg-white rounded-lg shadow-lg p-6">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center space-x-4 mb-4">
                        <h3 class="text-xl font-semibold text-gray-900">{{ assignment.title }}</h3>
                        <span
                          class="px-3 py-1 rounded-full text-sm font-medium"
                          [class]="getStatusClass(assignment.status)">
                          {{ getStatusText(assignment.status) }}
                        </span>
                      </div>

                      <div class="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p class="text-sm text-gray-600 mb-1">Khóa học</p>
                          <p class="font-medium text-gray-900">{{ assignment.course }}</p>
                        </div>
                        <div>
                          <p class="text-sm text-gray-600 mb-1">Hạn nộp</p>
                          <p class="font-medium text-gray-900">{{ assignment.dueDate || 'Không có' }}</p>
                        </div>
                      </div>

                      <p class="text-gray-700 mb-4">{{ assignment.description }}</p>

                      <div class="flex items-center space-x-4">
                        @if (assignment.status === 'not_submitted') {
                          <button
                            (click)="startAssignment(assignment.id)"
                            class="bg-[#0056D2] text-white px-4 py-2 rounded-lg hover:bg-[#004BB5] transition-colors">
                            Bắt đầu
                          </button>
                        }
                        @if (assignment.status === 'submitted' || assignment.status === 'late') {
                          <button
                            (click)="viewSubmission(assignment.id)"
                            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                            Xem bài nộp
                          </button>
                        }
                        @if (assignment.status === 'graded') {
                          <button
                            (click)="viewGrade(assignment.id)"
                            class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                            Xem điểm
                          </button>
                        }
                        <button
                          (click)="viewDetails(assignment.id)"
                          class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                          Chi tiết
                        </button>
                      </div>
                    </div>

                    <div class="ml-6">
                      <div class="text-right">
                        @if (assignment.status === 'graded' && assignment.grade !== null) {
                          <div class="text-2xl font-bold text-green-600">{{ assignment.grade }}/{{ assignment.points }}</div>
                          <div class="text-sm text-gray-600">Điểm số</div>
                        } @else {
                          <div class="text-2xl font-bold text-gray-400">{{ assignment.points }}</div>
                          <div class="text-sm text-gray-600">Điểm tối đa</div>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="bg-white rounded-lg shadow-lg p-12 text-center">
                  <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <h3 class="text-lg font-medium text-gray-900 mb-2">Không có bài tập nào</h3>
                  <p class="text-gray-600">Hiện tại không có bài tập nào phù hợp với bộ lọc của bạn.</p>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class AssignmentsComponent implements OnInit {
  private router = inject(Router);
  private assignmentApi = inject(AssignmentApi);

  showFilter = signal(false);
  isLoading = signal(false);

  filters = {
    status: '',
    course: '',
    search: ''
  };

  assignments = signal<AssignmentItem[]>([]);

  availableCourses = computed(() => {
    const courses = this.assignments().map(a => ({ id: a.courseId, name: a.course }));
    return courses.filter((c, i, self) => i === self.findIndex(x => x.id === c.id));
  });

  filteredAssignments = computed(() => {
    let filtered = this.assignments();

    if (this.filters.status) {
      filtered = filtered.filter(a => a.status === this.filters.status);
    }

    if (this.filters.course) {
      filtered = filtered.filter(a => a.courseId === this.filters.course);
    }

    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(search) ||
        a.description.toLowerCase().includes(search)
      );
    }

    return filtered;
  });

  ngOnInit(): void {
    this.loadAssignments();
  }

  private loadAssignments(): void {
    this.isLoading.set(true);
    this.assignmentApi.getStudentAssignments().subscribe({
      next: (response) => {
        const items = (response.data || []).map(item => this.mapToAssignmentItem(item));
        this.assignments.set(items);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  private mapToAssignmentItem(item: StudentAssignmentResponse): AssignmentItem {
    const statusMap: Record<string, string> = {
      'NOT_SUBMITTED': 'not_submitted',
      'SUBMITTED': 'submitted',
      'RESUBMITTED': 'submitted',
      'GRADED': 'graded',
      'LATE': 'late'
    };

    return {
      id: item.id,
      title: item.title,
      course: item.courseName,
      courseId: item.courseId,
      type: 'assignment',
      status: statusMap[item.status] || 'not_submitted',
      dueDate: item.dueDate ? new Date(item.dueDate).toLocaleDateString('vi-VN') : '',
      points: item.maxScore,
      grade: item.score ?? null,
      description: item.description || item.instructions || ''
    };
  }

  getStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      'not_submitted': 'bg-yellow-100 text-yellow-800',
      'submitted': 'bg-green-100 text-green-800',
      'graded': 'bg-purple-100 text-purple-800',
      'late': 'bg-red-100 text-red-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusText(status: string): string {
    const statusTexts: Record<string, string> = {
      'not_submitted': 'Chưa nộp',
      'submitted': 'Đã nộp',
      'graded': 'Đã chấm',
      'late': 'Nộp muộn'
    };
    return statusTexts[status] || status;
  }

  toggleFilter(): void {
    this.showFilter.update(show => !show);
  }

  refreshAssignments(): void {
    this.loadAssignments();
  }

  startAssignment(id: string): void {
    this.router.navigate(['/assignments', id, 'submit']);
  }

  viewSubmission(id: string): void {
    this.router.navigate(['/assignments', id, 'submission']);
  }

  viewGrade(id: string): void {
    this.router.navigate(['/assignments', id, 'grade']);
  }

  viewDetails(id: string): void {
    this.router.navigate(['/assignments', id]);
  }
}
