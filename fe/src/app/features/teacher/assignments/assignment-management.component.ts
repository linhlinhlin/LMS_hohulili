import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AssignmentApi, AssignmentSummary } from '../../../api/client/assignment.api';

@Component({
  selector: 'app-assignment-management',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Bài tập</h1>
        <a routerLink="/teacher/assignment-creation" class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium">+ Tạo bài tập</a>
      </div>

      <div class="bg-white rounded-xl shadow">
        <div class="p-4 flex flex-wrap gap-3 items-center">
          <input class="border rounded px-3 py-2 w-64" placeholder="Tìm theo tên hoặc mô tả" [(ngModel)]="keyword" />
          <select class="border rounded px-3 py-2" [(ngModel)]="statusFilter">
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Nháp</option>
            <option value="published">Đã xuất bản</option>
            <option value="closed">Đã đóng</option>
          </select>
          <button class="px-4 py-2 border rounded" (click)="applyFilters()">Lọc</button>
        </div>
        <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th (click)="setSort('title')" class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider cursor-pointer">Tên <span class="text-xs" *ngIf="sortKey==='title'">{{ sortDir==='asc'?'▲':'▼' }}</span></th>
              <th (click)="setSort('courseTitle')" class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider cursor-pointer">Khóa học <span class="text-xs" *ngIf="sortKey==='courseTitle'">{{ sortDir==='asc'?'▲':'▼' }}</span></th>
              <th (click)="setSort('dueDate')" class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider cursor-pointer">Hạn <span class="text-xs" *ngIf="sortKey==='dueDate'">{{ sortDir==='asc'?'▲':'▼' }}</span></th>
              <th (click)="setSort('status')" class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider cursor-pointer">Trạng thái <span class="text-xs" *ngIf="sortKey==='status'">{{ sortDir==='asc'?'▲':'▼' }}</span></th>
              <th (click)="setSort('submissionsCount')" class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider cursor-pointer">Nộp <span class="text-xs" *ngIf="sortKey==='submissionsCount'">{{ sortDir==='asc'?'▲':'▼' }}</span></th>
              <th class="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let a of paged(); trackBy: trackById">
              <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-900">{{ a.title }}</td>
              <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-600">{{ a.courseTitle }}</td>
              <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-600">
                {{ a.dueDate ? (a.dueDate | date:'dd/MM/yyyy') : 'Không giới hạn' }}
              </td>
              <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      [class.bg-yellow-100]="a.status === 'pending'"
                      [class.text-yellow-800]="a.status === 'pending'"
                      [class.bg-green-100]="a.status === 'published'"
                      [class.text-green-800]="a.status === 'published'"
                      [class.bg-gray-100]="a.status === 'closed'"
                      [class.text-gray-800]="a.status === 'closed'">
                  {{ a.status === 'pending' ? 'Nháp' : a.status === 'published' ? 'Đã xuất bản' : 'Đã đóng' }}
                </span>
              </td>
              <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-600">{{ a.submissionsCount }}/{{ a.totalStudents }}</td>
              <td class="px-6 py-5 whitespace-nowrap text-right text-base md:text-lg">
                <a [routerLink]="['/teacher/assignments', a.id, 'submissions']" class="text-blue-600 hover:text-blue-900 mr-4">Xem bài nộp</a>
                <a [routerLink]="['/teacher/assignments', a.id, 'edit']" class="text-indigo-600 hover:text-indigo-900">Sửa</a>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
        <div class="p-6 text-center" *ngIf="loading()">
          <div class="text-gray-500">Đang tải danh sách bài tập...</div>
        </div>
        <div class="p-6 text-center text-red-600" *ngIf="error()">
          {{ error() }}
                    <button (click)="onReload()" class="ml-2 text-blue-600 underline text-sm">Tải lại</button>
        </div>
        <div class="p-6 text-gray-500" *ngIf="!loading() && !error() && paged().length === 0">Chưa có bài tập.</div>
      </div>

      <!-- Pagination Controls -->
      <div class="bg-white rounded-lg shadow p-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Hiển thị</span>
          <select class="border rounded px-2 py-1" [ngModel]="pageSize()" (ngModelChange)="onPageSizeChange($event)">
            <option [ngValue]="5">5</option>
            <option [ngValue]="10">10</option>
            <option [ngValue]="20">20</option>
          </select>
          <span class="text-sm text-gray-600">mỗi trang</span>
        </div>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1 border rounded disabled:opacity-50" [disabled]="pageIndex() <= 1" (click)="prevPage()">Trước</button>
          <span class="text-sm text-gray-700">Trang {{ pageIndex() }} / {{ totalPages() }}</span>
          <button class="px-3 py-1 border rounded disabled:opacity-50" [disabled]="pageIndex() >= totalPages()" (click)="nextPage()">Sau</button>
        </div>
        <div class="text-sm text-gray-600">Tổng: {{ total() }}</div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentManagementComponent {
  private assignmentApi = inject(AssignmentApi);
  
  pageIndex = signal(1);
  pageSize = signal(10);
  keyword = '';
  statusFilter: '' | 'pending' | 'published' | 'closed' = '';
  sortKey: 'title'|'courseTitle'|'dueDate'|'status'|'submissionsCount' = 'dueDate';
  sortDir: 'asc'|'desc' = 'desc';
  
  assignments = signal<AssignmentSummary[]>([]);
  loading = signal(true);
  error = signal('');
  
  filtered = computed(() => this.assignments().filter(a =>
    (!this.statusFilter || a.status === this.statusFilter) &&
    (!this.keyword || a.title.toLowerCase().includes(this.keyword.toLowerCase()) || (a.description||'').toLowerCase().includes(this.keyword.toLowerCase()))
  ));
  
  sorted = computed(() => [...this.filtered()].sort((a,b)=>{
    const dir = this.sortDir === 'asc' ? 1 : -1;
    const va: any = (a as any)[this.sortKey];
    const vb: any = (b as any)[this.sortKey];
    if (this.sortKey === 'dueDate') {
      const dateA = va ? new Date(va).getTime() : 0;
      const dateB = vb ? new Date(vb).getTime() : 0;
      return (dateA > dateB ? 1 : dateA < dateB ? -1 : 0) * dir;
    }
    return (va > vb ? 1 : va < vb ? -1 : 0) * dir;
  }));
  
  paged = computed(() => {
    const start = (this.pageIndex() - 1) * this.pageSize();
    return this.sorted().slice(start, start + this.pageSize());
  });
  
  total = computed(() => this.filtered().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  constructor() {
    this.loadAssignments();
  }

  private loadAssignments() {
    this.loading.set(true);
    this.error.set('');
    
    // Temporarily load mock data until we integrate with CourseApi to get all assignments
    // This should be replaced with proper API integration
    const mockAssignments: AssignmentSummary[] = [
      {
        id: '1',
        title: 'Bài tập về An toàn Hàng hải',
        description: 'Viết báo cáo về các quy định SOLAS',
        dueDate: '2025-10-20T23:59:59Z',
        courseId: 'course-1',
        courseTitle: 'An toàn Hàng hải Cơ bản',
        status: 'published',
        submissionsCount: 15,
        totalStudents: 25,
        createdAt: '2025-10-10T08:00:00Z',
        updatedAt: '2025-10-12T10:30:00Z'
      },
      {
        id: '2',
        title: 'Quiz về Điều hướng',
        description: 'Kiểm tra kiến thức về radar và GPS',
        dueDate: '2025-10-25T18:00:00Z',
        courseId: 'course-2', 
        courseTitle: 'Điều hướng Maritime',
        status: 'pending',
        submissionsCount: 0,
        totalStudents: 18,
        createdAt: '2025-10-13T14:20:00Z'
      }
    ];
    
    setTimeout(() => {
      this.assignments.set(mockAssignments);
      this.loading.set(false);
    }, 500);
  }

  goToPage(n: number) { 
    this.pageIndex.set(Math.min(Math.max(1, n), this.totalPages())); 
  }
  
  nextPage() { 
    this.goToPage(this.pageIndex() + 1); 
  }
  
  prevPage() { 
    this.goToPage(this.pageIndex() - 1); 
  }
  
  onPageSizeChange(v?: any) { 
    if (v !== undefined) this.pageSize.set(Number(v)); 
    this.goToPage(1); 
  }
  
  applyFilters() { 
    this.goToPage(1); 
  }
  
  setSort(key: typeof this.sortKey) {
    if (this.sortKey === key) { 
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc'; 
    } else { 
      this.sortKey = key; 
      this.sortDir = 'asc'; 
    }
    this.goToPage(1);
  }

  trackById(_i: number, item: any) { 
    return item.id; 
  }

  onReload() {
    this.loadAssignments();
  }
}