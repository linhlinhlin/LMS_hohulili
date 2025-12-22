import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AssignmentDetailStore } from '../stores/assignment-detail.store';
import { SubmissionsStore } from '../stores/submissions.store';
import { DistributionSelectorComponent, DistributionSettings } from './distribution-selector.component';
import { DistributionService } from '../../../../core/services/distribution.service';
import { EnrolledStudent } from '../utils/allocation-utils';
import { CourseApi } from '../../../../api/client/course.api';

/**
 * Assignment Overview Component
 * 
 * Displays assignment details with grading statistics and score distribution.
 * 
 * @requirements Expert feedback - Overview tab with stats
 */
@Component({
  selector: 'app-assignment-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, DistributionSelectorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded shadow p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Đã nộp</p>
              <p class="text-3xl font-bold text-blue-600 mt-2">{{ stats().submittedCount }}/{{ getAllocatedCount() }}</p>
            </div>
            <div class="w-12 h-12 bg-blue-50 rounded flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
          </div>
        </div>
        <div class="bg-white rounded shadow p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Đã chấm</p>
              <p class="text-3xl font-bold text-green-600 mt-2">{{ stats().gradedCount }}</p>
            </div>
            <div class="w-12 h-12 bg-green-50 rounded flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>
        <div class="bg-white rounded shadow p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Chờ chấm</p>
              <p class="text-3xl font-bold text-orange-600 mt-2">{{ stats().pendingCount }}</p>
            </div>
            <div class="w-12 h-12 bg-orange-50 rounded flex items-center justify-center">
              <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>
        <div class="bg-white rounded shadow p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Điểm trung bình</p>
              <p class="text-3xl font-bold text-purple-600 mt-2">{{ stats().averageScore | number:'1.1-1' }}%</p>
            </div>
            <div class="w-12 h-12 bg-purple-50 rounded flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Allocation Statistics -->
      @if (allocationStats()) {
        <div class="bg-white rounded shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Thống kê phân phối</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center p-4 bg-blue-50 rounded-lg">
              <p class="text-2xl font-bold text-blue-600">{{ allocationStats()!.totalAllocated }}</p>
              <p class="text-sm text-gray-600">Đã giao</p>
            </div>
            <div class="text-center p-4 bg-green-50 rounded-lg">
              <p class="text-2xl font-bold text-green-600">{{ stats().submittedCount }}</p>
              <p class="text-sm text-gray-600">Đã nộp</p>
            </div>
            <div class="text-center p-4 bg-orange-50 rounded-lg">
              <p class="text-2xl font-bold text-orange-600">{{ allocationStats()!.totalAllocated - stats().submittedCount }}</p>
              <p class="text-sm text-gray-600">Chưa nộp</p>
            </div>
            <div class="text-center p-4 bg-purple-50 rounded-lg">
              <p class="text-2xl font-bold text-purple-600">
                {{ allocationStats()!.distributionType === 'ALL_STUDENTS' ? 'Tất cả' : 'Cá nhân' }}
              </p>
              <p class="text-sm text-gray-600">Loại phân phối</p>
            </div>
          </div>
        </div>
      }

      <!-- Score Distribution -->
      <div class="bg-white rounded shadow p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Phân bố điểm</h3>
        <div class="space-y-3">
          @for (item of stats().scoreDistribution; track item.range) {
            <div class="flex items-center gap-4">
              <div class="w-20 text-sm text-gray-600">{{ item.range }}</div>
              <div class="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                <div class="h-full bg-blue-500 rounded-full transition-all"
                     [style.width.%]="getBarWidth(item.count)"></div>
              </div>
              <div class="w-16 text-sm text-gray-600 text-right">{{ item.count }} HV</div>
            </div>
          }
        </div>
      </div>

      <!-- Distribution Settings -->
      <app-distribution-selector
        [enrolledStudents]="enrolledStudents"
        [initialDistributionType]="currentDistributionType()"
        [initialStudentIds]="currentStudentIds()"
        (distributionChange)="onDistributionChange($event)"
      ></app-distribution-selector>

      <!-- Assignment Info -->
      <div class="bg-white rounded shadow p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Thông tin bài tập</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="text-sm text-gray-500">Mô tả</label>
            <p class="text-gray-900 mt-1">{{ assignment()?.description || 'Không có mô tả' }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-500">Hướng dẫn</label>
            <p class="text-gray-900 mt-1">{{ assignment()?.instructions || 'Không có hướng dẫn' }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-500">Hạn nộp</label>
            <p class="text-gray-900 mt-1">{{ formatDate(assignment()?.dueDate) }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-500">Điểm tối đa</label>
            <p class="text-gray-900 mt-1">{{ assignment()?.maxPoints || 100 }} điểm</p>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      @if (stats().pendingCount > 0) {
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">{{ stats().pendingCount }} bài chờ chấm điểm</h3>
              <p class="text-gray-600 mt-1">Bắt đầu chấm điểm để hoàn thành đánh giá</p>
            </div>
            <a routerLink="../submissions" [queryParams]="{filter: 'PENDING'}"
               class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
              Chấm tất cả bài chờ →
            </a>
          </div>
        </div>
      }
    </div>
  `
})
export class AssignmentOverviewComponent implements OnInit {
  private assignmentStore = inject(AssignmentDetailStore);
  private submissionsStore = inject(SubmissionsStore);
  private distributionService = inject(DistributionService);
  private courseApi = inject(CourseApi);

  assignment = this.assignmentStore.assignment;
  stats = this.assignmentStore.stats;
  
  // Loading state
  loadingStudents = signal(false);

  // Distribution state
  enrolledStudents = signal<EnrolledStudent[]>([]);
  currentDistributionType = signal<'ALL_STUDENTS' | 'SPECIFIC_STUDENTS'>('ALL_STUDENTS');
  currentStudentIds = signal<string[]>([]);
  distributionSettings = signal<DistributionSettings | null>(null);
  allocationStats = signal<{ totalAllocated: number; distributionType: string; isIndividual: boolean } | null>(null);

  ngOnInit(): void {
    // Load submissions to get accurate stats
    const assignmentId = this.assignment()?.id;
    const courseId = this.assignment()?.courseId;
    if (assignmentId) {
      this.submissionsStore.loadSubmissions(assignmentId).subscribe({
        next: () => {
          // Update stats from loaded submissions
          const submissions = this.submissionsStore.submissions();
          this.assignmentStore.updateStatsFromSubmissions(submissions);
        }
      });
      
      // Load allocation first, then enrolled students
      if (courseId) {
        this.loadAllocationAndStudents(assignmentId, courseId);
      }
    }
  }

  private loadAllocationAndStudents(assignmentId: string, courseId: string): void {
    // Load allocation from API first
    this.distributionService.loadAllocation(assignmentId, courseId).subscribe({
      next: (allocation) => {
        if (allocation) {
          this.currentDistributionType.set(allocation.distributionType);
          this.currentStudentIds.set(allocation.studentIds || []);
        }
        // Then load enrolled students
        this.loadEnrolledStudents(courseId);
      },
      error: () => {
        // Still load enrolled students even if allocation fails
        this.loadEnrolledStudents(courseId);
      }
    });
  }

  private loadEnrolledStudents(courseId: string): void {
    this.loadingStudents.set(true);
    this.courseApi.getEnrolledStudents(courseId).subscribe({
      next: (response) => {
        if (response.data) {
          const students: EnrolledStudent[] = response.data.map((s: any) => ({
            id: String(s.id), // Ensure ID is string
            name: s.fullName || s.name || 'Unknown',
            email: s.email || '',
            enrolledAt: s.enrolledAt || s.createdAt || ''
          }));
          this.enrolledStudents.set(students);
          
          // Update allocation stats with real student count
          this.updateAllocationStats();
        }
        this.loadingStudents.set(false);
      },
      error: () => {
        this.loadingStudents.set(false);
        // Fallback to empty array
        this.enrolledStudents.set([]);
      }
    });
  }
  
  private updateAllocationStats(): void {
    const assignmentId = this.assignment()?.id;
    if (assignmentId) {
      const stats = this.distributionService.getAllocationStats(assignmentId, this.enrolledStudents());
      
      if (stats) {
        this.allocationStats.set(stats);
      } else {
        // Default stats if no allocation exists
        this.allocationStats.set({
          totalAllocated: this.enrolledStudents().length,
          distributionType: 'ALL_STUDENTS',
          isIndividual: false
        });
      }
    }
  }



  onDistributionChange(settings: DistributionSettings): void {
    this.distributionSettings.set(settings);
    this.currentDistributionType.set(settings.distributionType);
    this.currentStudentIds.set(settings.studentIds || []);
    
    // Update allocation stats immediately for UI feedback
    const totalAllocated = settings.distributionType === 'ALL_STUDENTS' 
      ? this.enrolledStudents().length 
      : (settings.studentIds?.length || 0);
    
    this.allocationStats.set({
      totalAllocated,
      distributionType: settings.distributionType,
      isIndividual: settings.distributionType === 'SPECIFIC_STUDENTS'
    });
    
    // Auto-save distribution settings
    const assignmentId = this.assignment()?.id;
    const courseId = this.assignment()?.courseId;
    if (assignmentId && courseId) {
      this.distributionService.createAllocation(
        assignmentId,
        courseId,
        settings.distributionType,
        settings.studentIds,
        'current-teacher-id' // TODO: Get from auth service
      ).subscribe();
    }
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Không giới hạn';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  getBarWidth(count: number): number {
    const maxCount = Math.max(...this.stats().scoreDistribution.map(d => d.count), 1);
    return (count / maxCount) * 100;
  }

  /**
   * Get the number of students allocated to this assignment
   * Uses allocation stats if available, otherwise falls back to total enrolled students
   */
  getAllocatedCount(): number {
    const allocStats = this.allocationStats();
    if (allocStats) {
      return allocStats.totalAllocated;
    }
    // Fallback to total students from assignment stats
    return this.stats().totalStudents || this.enrolledStudents().length;
  }
}

