import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CourseApi, AvailableStudent, EnrolledStudent } from '../../../api/client/course.api';
import { CourseDetail, CreateSectionRequest } from '../../../api/types/course.types';
import { SectionApi } from '../../../api/client/section.api';
// Lessons are managed on a dedicated page now

@Component({
  selector: 'app-course-editor',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  encapsulation: ViewEncapsulation.None,
  template: `
  <div class="max-w-9xl mx-auto p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Chỉnh sửa khóa học</h1>

      <!-- Review Feedback Alert for REJECTED courses -->
      <div *ngIf="course()?.status === 'REJECTED' && reviewStatus()" class="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
        <div class="flex items-start gap-3">
          <svg class="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <div class="flex-1">
            <h3 class="text-red-800 font-semibold mb-1">Khóa học bị từ chối</h3>
            <p class="text-red-700 text-sm mb-2">{{ reviewStatus()?.reviewComment }}</p>
            <div class="text-xs text-red-600">
              <span *ngIf="reviewStatus()?.reviewedByName">Người duyệt: {{ reviewStatus()?.reviewedByName }}</span>
              <span *ngIf="reviewStatus()?.reviewedAt" class="ml-3">Thời gian: {{ reviewStatus()?.reviewedAt | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white shadow rounded-lg overflow-hidden" *ngIf="course() as c">
        <div class="px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-b">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">Thông tin khóa học</h3>
              <p class="text-sm text-gray-500">Chỉnh sửa thông tin cơ bản</p>
            </div>
          </div>
        </div>
        <form [formGroup]="form" (ngSubmit)="onSave()" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mã khóa học</label>
            <input formControlName="code" type="text" class="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tên khóa học</label>
            <input formControlName="title" type="text" class="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="flex items-center gap-3">
            <button type="submit" class="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Lưu thay đổi</button>
            <span class="text-sm text-green-600" *ngIf="success()">✓ {{ success() }}</span>
            <span class="text-sm text-red-600" *ngIf="error()">✗ {{ error() }}</span>
          </div>
        </form>
      </div>

      <!-- Nội dung khóa học -->
      <div class="mt-8 bg-white shadow rounded-lg overflow-hidden" *ngIf="course() as c">
        <button type="button" 
                class="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white hover:from-indigo-100 transition-all"
                (click)="togglePanel('sections')">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
            </div>
            <div class="text-left">
              <h3 class="font-semibold text-gray-900">Nội dung khóa học</h3>
              <p class="text-sm text-gray-500">{{ sections().length }} chương</p>
            </div>
          </div>
          <svg class="w-5 h-5 text-gray-400 transition-transform" [class.rotate-180]="activeToggle === 'sections'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        
        <div class="p-6 border-t" *ngIf="activeToggle === 'sections'">
          <!-- Action Bar -->
          <div class="flex items-center gap-3 mb-4">
            <input class="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Tiêu đề chương (VD: Chương 1)" [(ngModel)]="newSectionTitle" name="newSectionTitle" />
            <button type="button" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2" (click)="createSection()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Tạo chương
            </button>
          </div>
          
          <div *ngIf="sectionError" class="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            {{ sectionError }}
          </div>

          <!-- Sections Table -->
          <div class="overflow-x-auto" *ngIf="sections().length > 0">
            <table class="min-w-full">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">STT</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên chương</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Bài học</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-64">Thao tác</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr *ngFor="let sec of sections(); let i = index" class="hover:bg-blue-50/50 transition-colors">
                  <td class="px-6 py-4 text-sm text-gray-500 font-medium text-center">{{ i + 1 }}</td>
                  <td class="px-6 py-4">
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-gray-900 truncate">
                        {{ sectionTitles[sec.id] || sec.title || 'Chưa đặt tên chương' }}
                      </div>
                      <div class="text-xs text-gray-500 mt-0.5">
                        {{ sec.description || 'Chưa có mô tả' }}
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <div class="inline-flex items-center gap-1.5 text-sm text-gray-700 w-full">
                      <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"></path>
                      </svg>
                      <span class="font-semibold ml-auto">{{ sec.lessonsCount || 0 }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center justify-center gap-2">
                      <a class="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors text-xs font-medium inline-flex items-center gap-1" 
                         [routerLink]="['/teacher/courses', course()!.id, 'sections', sec.id]">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                        Chi tiết
                      </a>
                      <button class="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors text-xs font-medium inline-flex items-center gap-1" 
                              (click)="deleteSection(sec.id)">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p *ngIf="sections().length === 0" class="text-gray-500 text-center py-8">Chưa có chương nào. Tạo chương đầu tiên!</p>
        </div>
      </div>

      <!-- Danh sách học viên đã đăng ký -->
      <div class="mt-6 bg-white shadow rounded-lg overflow-hidden" *ngIf="course() as c">
        <button type="button" 
                class="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white hover:from-emerald-100 transition-all"
                (click)="togglePanel('students')">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
              </svg>
            </div>
            <div class="text-left">
              <h3 class="font-semibold text-gray-900">Danh sách học viên</h3>
              <p class="text-sm text-gray-500">{{ enrolledStudents().length }} học viên đã đăng ký</p>
            </div>
          </div>
          <svg class="w-5 h-5 text-gray-400 transition-transform" [class.rotate-180]="activeToggle === 'students'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        
        <div class="p-6 border-t" *ngIf="activeToggle === 'students'">
          <div *ngIf="loadingEnrolledStudents()" class="text-center py-8 text-gray-500">
            <svg class="animate-spin h-8 w-8 mx-auto mb-2 text-emerald-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Đang tải danh sách học viên...
          </div>
          
          <div class="overflow-x-auto" *ngIf="!loadingEnrolledStudents() && enrolledStudents().length > 0">
            <table class="min-w-full">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">STT</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Học viên</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Ngày đăng ký</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Trạng thái</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr *ngFor="let student of enrolledStudents(); let i = index" class="hover:bg-blue-50/50 transition-colors">
                  <td class="px-6 py-4 text-sm text-gray-500 font-medium text-center">{{ i + 1 }}</td>
                  <td class="px-6 py-4">
                    <div class="flex items-start gap-3">
                      <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {{ student.fullName?.charAt(0)?.toUpperCase() || '?' }}
                      </div>
                      <div class="min-w-0">
                        <div class="text-sm font-semibold text-gray-900">{{ student.fullName }}</div>
                        <div class="text-xs text-gray-500 mt-0.5">{{ student.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center text-sm text-gray-500">{{ student.enrolledAt ? (student.enrolledAt | date:'dd/MM/yyyy') : 'N/A' }}</td>
                  <td class="px-6 py-4 text-center">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" 
                          [ngClass]="{'bg-green-100 text-green-700': student.status === 'ACTIVE', 'bg-gray-100 text-gray-600': student.status !== 'ACTIVE'}">
                      <span class="w-1.5 h-1.5 rounded-full mr-1.5" [ngClass]="{'bg-green-500': student.status === 'ACTIVE', 'bg-gray-400': student.status !== 'ACTIVE'}"></span>
                      {{ student.status || 'ACTIVE' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <p *ngIf="!loadingEnrolledStudents() && enrolledStudents().length === 0" class="text-gray-500 text-center py-8">
            Chưa có học viên nào đăng ký khóa học này.
          </p>
        </div>
      </div>

      <!-- Gán học viên -->
      <div class="mt-6 bg-white shadow rounded-lg overflow-hidden" *ngIf="course() as c">
        <button type="button" 
                class="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-white hover:from-purple-100 transition-all"
                (click)="togglePanel('assign')">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
              </svg>
            </div>
            <div class="text-left">
              <h3 class="font-semibold text-gray-900">Gán học viên</h3>
              <p class="text-sm text-gray-500">Thêm học viên vào khóa học</p>
            </div>
          </div>
          <svg class="w-5 h-5 text-gray-400 transition-transform" [class.rotate-180]="activeToggle === 'assign'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        
        <div class="p-6 border-t" *ngIf="activeToggle === 'assign'">
          <!-- Single student assignment with dropdown -->
          <div class="mb-6">
            <h4 class="font-medium text-gray-900 mb-3">Gán học viên</h4>
            <div class="flex gap-3 items-end">
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">Chọn học viên</label>
                <select 
                  [(ngModel)]="selectedStudentId" 
                  name="selectedStudent" 
                  class="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  [disabled]="loadingStudents()">
                  <option [ngValue]="null">-- Chọn học viên --</option>
                  <option *ngFor="let student of availableStudents()" [ngValue]="student.id">
                    {{ student.fullName }} ({{ student.email }})
                  </option>
                </select>
              </div>
              <button type="button" 
                      class="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors" 
                      (click)="assignStudentFromDropdown()" 
                      [disabled]="assigning() || !selectedStudentId()">
                {{ assigning() ? 'Đang gán...' : 'Gán học viên' }}
              </button>
            </div>
            <p *ngIf="loadingStudents()" class="text-xs text-gray-500 mt-2">Đang tải danh sách học viên...</p>
            <p *ngIf="!loadingStudents() && availableStudents().length === 0" class="text-xs text-orange-600 mt-2">Không có học viên nào chưa đăng ký khóa học này</p>
            <div class="mt-2" *ngIf="assignSuccess() || assignError()">
              <span class="text-sm text-green-600" *ngIf="assignSuccess()">✓ {{ assignSuccess() }}</span>
              <span class="text-sm text-red-600" *ngIf="assignError()">✗ {{ assignError() }}</span>
            </div>
          </div>

          <!-- Bulk enrollment -->
          <div class="pt-6 border-t">
            <h4 class="font-medium text-gray-900 mb-3">Gán nhiều học viên từ Excel</h4>
            <div class="space-y-4">
              <div>
                <input type="file" #fileInput (change)="onExcelFileSelected($event)" accept=".xlsx,.xls" 
                       class="w-full border rounded-lg px-4 py-2 file:mr-3 file:py-1 file:px-3 file:border-0 file:bg-purple-50 file:text-purple-700 file:rounded hover:file:bg-purple-100" />
              </div>
              <div class="flex gap-3">
                <button type="button" (click)="bulkEnrollStudents()" [disabled]="bulkEnrolling() || !selectedFile()" 
                        class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
                  {{ bulkEnrolling() ? 'Đang xử lý...' : 'Gán từ Excel' }}
                </button>
                <button type="button" (click)="clearExcelFile()" [disabled]="!selectedFile()" 
                        class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors">
                  Xóa file
                </button>
              </div>
              
              <div *ngIf="selectedFile()" class="p-3 bg-purple-50 rounded-lg">
                <p class="text-sm text-purple-800">📄 {{ selectedFile()?.name }} ({{ (selectedFile()!.size / 1024).toFixed(1) }} KB)</p>
              </div>
              
              <!-- Bulk results -->
              <div *ngIf="bulkResult()" class="p-4 bg-gray-50 rounded-lg">
                <div class="grid grid-cols-3 gap-4 mb-3">
                  <div class="text-center p-2 bg-blue-100 rounded-lg">
                    <div class="text-xl font-bold text-blue-600">{{ bulkResult()?.totalProcessed || 0 }}</div>
                    <div class="text-xs text-blue-800">Tổng</div>
                  </div>
                  <div class="text-center p-2 bg-green-100 rounded-lg">
                    <div class="text-xl font-bold text-green-600">{{ bulkResult()?.successCount || 0 }}</div>
                    <div class="text-xs text-green-800">Thành công</div>
                  </div>
                  <div class="text-center p-2 bg-red-100 rounded-lg">
                    <div class="text-xl font-bold text-red-600">{{ bulkResult()?.errorCount || 0 }}</div>
                    <div class="text-xs text-red-800">Lỗi</div>
                  </div>
                </div>
              </div>
              
              <div *ngIf="bulkSuccess() || bulkError()">
                <span class="text-sm text-green-600" *ngIf="bulkSuccess()">✓ {{ bulkSuccess() }}</span>
                <span class="text-sm text-red-600" *ngIf="bulkError()">✗ {{ bulkError() }}</span>
              </div>
              
              <div class="text-xs text-gray-500 space-y-1">
                <p>• File Excel cần chứa danh sách email học viên</p>
                <p>• Chỉ email đã có tài khoản học viên mới được gán</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseEditorComponent {
  private route = inject(ActivatedRoute);
  private api = inject(CourseApi);
  private fb = inject(FormBuilder);
  private sectionApi = inject(SectionApi);

  course = signal<CourseDetail | null>(null);
  saving = signal(false);
  publishing = signal(false);
  success = signal('');
  error = signal('');
  reviewStatus = signal<any>(null);

  // Content state
  sections = signal<any[]>([]);
  sectionTitles: Record<string, string> = {};
  newSectionTitle = '';
  sectionError = '';
  
  // Toggle states - only one can be open at a time
  activeToggle: 'sections' | 'students' | 'assign' | null = 'sections';
  
  togglePanel(panel: 'sections' | 'students' | 'assign') {
    this.activeToggle = this.activeToggle === panel ? null : panel;
  }

  // Assign student state
  assigning = signal(false);
  assignSuccess = signal('');
  assignError = signal('');
  assign: { email?: string } = {};
  
  // Available students for dropdown
  availableStudents = signal<AvailableStudent[]>([]);
  loadingStudents = signal(false);
  selectedStudentId = signal<string | null>(null);
  
  // Enrolled students list
  enrolledStudents = signal<EnrolledStudent[]>([]);
  loadingEnrolledStudents = signal(false);

  // Bulk enrollment state
  bulkEnrolling = signal(false);
  bulkSuccess = signal('');
  bulkError = signal('');
  selectedFile = signal<File | null>(null);
  bulkResult = signal<any>(null);

  form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(64)]],
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['']
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getCourseById(id).subscribe({
      next: (res) => {
        const c = res?.data as CourseDetail;
        this.course.set(c);
        if (c) {
          // Check if course is PENDING - redirect back with error
          if (c.status === 'PENDING') {
            alert('Không thể chỉnh sửa khóa học đang chờ duyệt.\n\nVui lòng hủy yêu cầu phê duyệt trước khi chỉnh sửa.');
            window.history.back();
            return;
          }

          // Show warning if course is APPROVED
          if (c.status === 'APPROVED') {
            const confirmed = confirm('⚠️ CẢNH BÁO\n\nKhóa học này đã được duyệt và đang công khai.\n\nNếu bạn chỉnh sửa khóa học, nó sẽ cần được phê duyệt lại và sẽ chuyển về trạng thái "Chờ duyệt".\n\nBạn có chắc chắn muốn tiếp tục chỉnh sửa?');
            if (!confirmed) {
              window.history.back();
              return;
            }
          }

          this.form.patchValue({ code: c.code, title: c.title, description: c.description });
          
          // Load review status if course is REJECTED
          if (c.status === 'REJECTED') {
            this.api.getReviewStatus(id).subscribe({
              next: (res) => {
                this.reviewStatus.set(res?.data);
              },
              error: (err) => {
                console.error('Failed to load review status:', err);
              }
            });
          }

          // Load sections using flat endpoint
          this.sectionApi.listSectionsFlat(id).subscribe({
            next: (sres) => {
              const data = sres?.data || [];
              this.sections.set(data);
              data.forEach((sec: any) => {
                this.sectionTitles[sec.id] = sec.title;
              });
            },
            error: (err) => {
              this.error.set(err?.message || 'Không tải được danh sách chương');
            }
          });
          // Load available students for enrollment dropdown
          this.loadAvailableStudents();
          // Load enrolled students list
          this.loadEnrolledStudents();
        }
      },
      error: (err) => {
        const msg = err?.message || err?.original?.error?.message || 'Không tải được khóa học';
        this.error.set(msg);
      }
    });
  }

  loadAvailableStudents() {
    const c = this.course();
    if (!c) return;
    this.loadingStudents.set(true);
    this.api.getAvailableStudents(c.id, { size: 100 }).subscribe({
      next: (res) => {
        this.availableStudents.set(res?.data || []);
        this.loadingStudents.set(false);
      },
      error: (err) => {
        console.error('Failed to load available students:', err);
        this.loadingStudents.set(false);
      }
    });
  }

  loadEnrolledStudents() {
    const c = this.course();
    if (!c) return;
    this.loadingEnrolledStudents.set(true);
    this.api.getEnrolledStudents(c.id, { size: 100 }).subscribe({
      next: (res) => {
        this.enrolledStudents.set(res?.data || []);
        this.loadingEnrolledStudents.set(false);
      },
      error: (err) => {
        console.error('Failed to load enrolled students:', err);
        this.loadingEnrolledStudents.set(false);
      }
    });
  }

  onSave() {
    if (this.form.invalid || !this.course()) return;
    this.saving.set(true);
    this.success.set('');
    this.error.set('');
    const id = this.course()!.id;
    const raw = this.form.getRawValue();
    const payload = {
      code: raw.code || undefined,
      title: raw.title || undefined,
      description: raw.description || undefined
    };
    this.api.updateCourse(id, payload).subscribe({
      next: () => {
        this.success.set('Đã lưu thay đổi');
      },
      error: (err) => {
        this.error.set(err?.message || 'Lưu thất bại');
      },
      complete: () => this.saving.set(false)
    });
  }

  onPublish() {
    if (!this.course()) return;
    this.publishing.set(true);
    this.success.set('');
    this.error.set('');
    const id = this.course()!.id;
    this.api.publishCourse(id).subscribe({
      next: () => {
        this.success.set('Đã xuất bản khóa học');
      },
      error: (err) => {
        this.error.set(err?.message || 'Xuất bản thất bại');
      },
      complete: () => this.publishing.set(false)
    });
  }

  // --- Content actions ---
  createSection() {
    this.sectionError = '';
    const c = this.course();
    if (!c) return;
    const title = (this.newSectionTitle || '').trim();
    if (!title) { this.sectionError = 'Nhập tiêu đề section'; return; }
    const payload: CreateSectionRequest = { title };
    this.sectionApi.createSection(c.id, payload).subscribe({
      next: (res) => {
        const sec = res?.data as any;
        if (sec) {
          this.sections.update(list => [...list, sec]);
          this.sectionTitles[sec.id] = sec.title;
          this.newSectionTitle = '';
        }
      },
      error: (err) => this.sectionError = err?.message || 'Tạo section thất bại'
    });
  }

  deleteSection(sectionId: string) {
    this.sectionApi.deleteSection(sectionId).subscribe({
      next: () => {
        this.sections.update(list => list.filter(s => s.id !== sectionId));
        delete this.sectionTitles[sectionId];
      }
    });
  }

  renameSection(sectionId: string) {
    const title = (this.sectionTitles[sectionId] || '').trim();
    if (!title) { this.sectionError = 'Tiêu đề section không được để trống'; return; }
    const payload = { title } as any;
    this.sectionApi.updateSection(sectionId, payload).subscribe({
      next: () => {
        this.sections.update(list => list.map(s => s.id === sectionId ? { ...s, title } : s));
      },
      error: (err) => this.sectionError = err?.message || 'Đổi tên section thất bại'
    });
  }

  // Inline lessons are managed on a dedicated page; no lesson handlers here

  assignStudent() {
    const c = this.course();
    if (!c) return;
    this.assignError.set('');
    this.assignSuccess.set('');
    this.assigning.set(true);

    if (!this.assign.email?.trim()) {
      this.assignError.set('Vui lòng nhập email sinh viên');
      this.assigning.set(false);
      return;
    }

    const payload = { email: this.assign.email.trim() };
    this.api.enrollStudentAsTeacher(c.id, payload).subscribe({
      next: () => {
        this.assignSuccess.set('Đã gán học viên vào khóa học');
        this.assign = {}; // Clear form
        this.assigning.set(false);
      },
      error: (err) => {
        this.assignError.set(err?.message || 'Gán học viên thất bại');
        this.assigning.set(false);
      }
    });
  }

  assignStudentFromDropdown() {
    const c = this.course();
    const studentId = this.selectedStudentId();
    if (!c || !studentId) return;

    this.assignError.set('');
    this.assignSuccess.set('');
    this.assigning.set(true);

    // Find selected student to get email
    const student = this.availableStudents().find(s => s.id === studentId);
    if (!student) {
      this.assignError.set('Không tìm thấy học viên');
      this.assigning.set(false);
      return;
    }

    const payload = { email: student.email };
    this.api.enrollStudentAsTeacher(c.id, payload).subscribe({
      next: () => {
        this.assignSuccess.set(`Đã gán học viên ${student.fullName} vào khóa học`);
        this.selectedStudentId.set(null);
        // Reload both lists
        this.loadAvailableStudents();
        this.loadEnrolledStudents();
        this.assigning.set(false);
      },
      error: (err) => {
        this.assignError.set(err?.message || 'Gán học viên thất bại');
        this.assigning.set(false);
      }
    });
  }

  onExcelFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        this.bulkError.set('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.bulkError.set('File quá lớn. Vui lòng chọn file nhỏ hơn 5MB');
        return;
      }

      this.selectedFile.set(file);
      this.bulkError.set('');
      this.bulkResult.set(null);
    }
  }

  clearExcelFile() {
    this.selectedFile.set(null);
    this.bulkResult.set(null);
    this.bulkError.set('');
    this.bulkSuccess.set('');
  }

  bulkEnrollStudents() {
    const c = this.course();
    const file = this.selectedFile();
    if (!c || !file) return;

    this.bulkError.set('');
    this.bulkSuccess.set('');
    this.bulkResult.set(null);
    this.bulkEnrolling.set(true);

    this.api.bulkEnrollStudents(c.id, file).subscribe({
      next: (res) => {
        this.bulkResult.set(res?.data);
        this.bulkSuccess.set(res?.message || 'Hoàn thành xử lý file Excel');
        this.bulkEnrolling.set(false);
      },
      error: (err) => {
        this.bulkError.set(err?.message || 'Lỗi xử lý file Excel');
        this.bulkEnrolling.set(false);
      }
    });
  }
}