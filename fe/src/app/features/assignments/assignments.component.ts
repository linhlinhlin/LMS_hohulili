import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
                  class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
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
                    class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Tất cả</option>
                    <option value="pending">Chưa làm</option>
                    <option value="in-progress">Đang làm</option>
                    <option value="submitted">Đã nộp</option>
                    <option value="graded">Đã chấm</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Khóa học</label>
                  <select 
                    [(ngModel)]="filters.course"
                    class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Tất cả</option>
                    <option value="course1">Khóa học 1</option>
                    <option value="course2">Khóa học 2</option>
                    <option value="course3">Khóa học 3</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Loại bài tập</label>
                  <select 
                    [(ngModel)]="filters.type"
                    class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Tất cả</option>
                    <option value="essay">Tiểu luận</option>
                    <option value="quiz">Quiz</option>
                    <option value="project">Dự án</option>
                    <option value="presentation">Thuyết trình</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm</label>
                  <input 
                    type="text" 
                    [(ngModel)]="filters.search"
                    placeholder="Tìm kiếm bài tập..."
                    class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
              </div>
            </div>
          }

          <!-- Assignments List -->
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
                        <p class="text-sm text-gray-600 mb-1">Loại bài tập</p>
                        <p class="font-medium text-gray-900">{{ getTypeText(assignment.type) }}</p>
                      </div>
                      <div>
                        <p class="text-sm text-gray-600 mb-1">Hạn nộp</p>
                        <p class="font-medium text-gray-900">{{ assignment.dueDate }}</p>
                      </div>
                      <div>
                        <p class="text-sm text-gray-600 mb-1">Điểm</p>
                        <p class="font-medium text-gray-900">{{ assignment.points }} điểm</p>
                      </div>
                    </div>

                    <p class="text-gray-700 mb-4">{{ assignment.description }}</p>

                    <div class="flex items-center space-x-4">
                      @if (assignment.status === 'pending' || assignment.status === 'in-progress') {
                        <button 
                          (click)="startAssignment(assignment.id)"
                          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                          {{ assignment.status === 'pending' ? 'Bắt đầu' : 'Tiếp tục' }}
                        </button>
                      }
                      @if (assignment.status === 'submitted') {
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
                      @if (assignment.status === 'graded') {
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

          <!-- Pagination -->
          @if (filteredAssignments().length > 0) {
            <div class="mt-8 flex justify-center">
              <nav class="flex space-x-2">
                <button 
                  (click)="previousPage()"
                  [disabled]="currentPage() === 1"
                  class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-800 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  Trước
                </button>
                @for (page of getPageNumbers(); track page) {
                  <button 
                    (click)="goToPage(page)"
                    [class]="page === currentPage() ? 'bg-blue-600 text-white' : 'text-gray-500 bg-white hover:bg-gray-50'"
                    class="px-3 py-2 text-sm font-medium border border-gray-800 rounded-lg">
                    {{ page }}
                  </button>
                }
                <button 
                  (click)="nextPage()"
                  [disabled]="currentPage() === totalPages()"
                  class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-800 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  Sau
                </button>
              </nav>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class AssignmentsComponent {
  private router = inject(Router);

  showFilter = signal(false);
  currentPage = signal(1);
  itemsPerPage = 10;

  filters = {
    status: '',
    course: '',
    type: '',
    search: ''
  };

  assignments = signal([
    {
      id: 1,
      title: 'Bài tập 1: Phân tích tình huống hàng hải',
      course: 'Khóa học Hàng hải cơ bản',
      type: 'essay',
      status: 'pending',
      dueDate: '2024-01-15',
      points: 100,
      grade: null,
      description: 'Phân tích tình huống hàng hải thực tế và đưa ra giải pháp xử lý phù hợp.'
    },
    {
      id: 2,
      title: 'Quiz 1: Kiến thức cơ bản về hàng hải',
      course: 'Khóa học Hàng hải cơ bản',
      type: 'quiz',
      status: 'graded',
      dueDate: '2024-01-10',
      points: 50,
      grade: 45,
      description: 'Kiểm tra kiến thức cơ bản về hàng hải qua 20 câu hỏi trắc nghiệm.'
    },
    {
      id: 3,
      title: 'Dự án: Thiết kế hệ thống an toàn hàng hải',
      course: 'Khóa học An toàn hàng hải',
      type: 'project',
      status: 'in-progress',
      dueDate: '2024-01-20',
      points: 200,
      grade: null,
      description: 'Thiết kế và trình bày hệ thống an toàn hàng hải cho tàu thương mại.'
    },
    {
      id: 4,
      title: 'Thuyết trình: Xu hướng phát triển ngành hàng hải',
      course: 'Khóa học Xu hướng hàng hải',
      type: 'presentation',
      status: 'submitted',
      dueDate: '2024-01-12',
      points: 150,
      grade: null,
      description: 'Thuyết trình về xu hướng phát triển ngành hàng hải trong tương lai.'
    }
  ]);

  filteredAssignments = computed(() => {
    let filtered = this.assignments();
    
    if (this.filters.status) {
      filtered = filtered.filter(a => a.status === this.filters.status);
    }
    
    if (this.filters.course) {
      filtered = filtered.filter(a => a.course === this.filters.course);
    }
    
    if (this.filters.type) {
      filtered = filtered.filter(a => a.type === this.filters.type);
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

  totalPages = computed(() => Math.ceil(this.filteredAssignments().length / this.itemsPerPage));

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
      pages.push(i);
    }
    
    return pages;
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'submitted': 'bg-green-100 text-green-800',
      'graded': 'bg-purple-100 text-purple-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusText(status: string): string {
    const statusTexts: { [key: string]: string } = {
      'pending': 'Chưa làm',
      'in-progress': 'Đang làm',
      'submitted': 'Đã nộp',
      'graded': 'Đã chấm'
    };
    return statusTexts[status] || status;
  }

  getTypeText(type: string): string {
    const typeTexts: { [key: string]: string } = {
      'essay': 'Tiểu luận',
      'quiz': 'Quiz',
      'project': 'Dự án',
      'presentation': 'Thuyết trình'
    };
    return typeTexts[type] || type;
  }

  toggleFilter(): void {
    this.showFilter.update(show => !show);
  }

  refreshAssignments(): void {
    // Simulate refresh
    console.log('Refreshing assignments...');
  }

  startAssignment(id: number): void {
    this.router.navigate(['/assignments', id, 'submit']);
  }

  viewSubmission(id: number): void {
    this.router.navigate(['/assignments', id, 'submission']);
  }

  viewGrade(id: number): void {
    this.router.navigate(['/assignments', id, 'grade']);
  }

  viewDetails(id: number): void {
    this.router.navigate(['/assignments', id]);
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
    }
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }
}
