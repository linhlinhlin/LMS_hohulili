import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AssignmentDetailStore } from '../stores/assignment-detail.store';
import { SubmissionsStore } from '../stores/submissions.store';
import { DistributionSelectorComponent, DistributionSettings } from './distribution-selector.component';
import { DistributionService } from '../../../../core/services/distribution.service';
import { EnrolledStudent, DistributionType } from '../utils/allocation-utils';
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
  imports: [CommonModule, RouterLink, DistributionSelectorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-in fade-in duration-500">
      <!-- Stats Cards (SOTA 2025: High-density, subtle markers) -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-all hover:shadow-md">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Đã nộp bài</p>
              <div class="flex items-baseline gap-1 mt-2">
                <p class="text-3xl font-black text-slate-900 tracking-tight">{{ stats().submittedCount }}</p>
                <p class="text-xs font-bold text-slate-400">/{{ getAllocatedCount() }}</p>
              </div>
            </div>
            <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner">
               <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-all hover:shadow-md">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Đã chấm điểm</p>
              <p class="text-3xl font-black text-slate-900 mt-2 tracking-tight">{{ stats().gradedCount }}</p>
            </div>
            <div class="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shadow-inner">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-all hover:shadow-md">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Chờ phê duyệt</p>
              <p class="text-3xl font-black text-slate-900 mt-2 tracking-tight">{{ stats().pendingCount }}</p>
            </div>
            <div class="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-inner">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-all hover:shadow-md">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Điểm trung bình</p>
              <p class="text-3xl font-black text-slate-900 mt-2 tracking-tight">{{ stats().averageScore | number:'1.1-1' }}%</p>
            </div>
            <div class="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shadow-inner">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Allocation Statistics -->
      @if (allocationStats()) {
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="bg-slate-50 border-b border-slate-100 px-6 py-4">
            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-widest">Cấu hình phân phối hiện tại</h3>
          </div>
          <div class="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div class="flex flex-col items-center justify-center p-4 bg-slate-50/50 rounded-xl border border-slate-100">
              <p class="text-2xl font-black text-slate-900">{{ allocationStats()!.totalAllocated }}</p>
              <p class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">Đã giao bài</p>
            </div>
            <div class="flex flex-col items-center justify-center p-4 bg-slate-50/50 rounded-xl border border-slate-100">
              <p class="text-2xl font-black text-slate-900">{{ stats().submittedCount }}</p>
              <p class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">Đã hoàn thành</p>
            </div>
            <div class="flex flex-col items-center justify-center p-4 bg-slate-50/50 rounded-xl border border-slate-100">
              <p class="text-2xl font-black text-slate-900">{{ allocationStats()!.totalAllocated - stats().submittedCount }}</p>
              <p class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">Chưa hoàn thành</p>
            </div>
            <div class="flex flex-col items-center justify-center p-4 bg-slate-900 text-white rounded-xl shadow-lg">
              <p class="text-sm font-black uppercase">
                {{ allocationStats()!.distributionType === 'ALL_STUDENTS' ? 'Toàn bộ' : 
                   (allocationStats()!.distributionType === 'CLASS' ? 'Lớp học' : 'Cá nhân') }}
              </p>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Chế độ phân phối</p>
            </div>
          </div>
        </div>
      }

      <!-- Score Distribution Card -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="bg-slate-50 border-b border-slate-100 px-6 py-4">
           <h3 class="text-xs font-bold text-slate-900 uppercase tracking-widest">Phân bố phổ điểm</h3>
        </div>
        <div class="p-8 space-y-6">
          @for (item of stats().scoreDistribution; track item.range) {
            <div class="flex items-center gap-6">
              <div class="w-24 text-[10px] font-extrabold text-slate-400 uppercase tracking-tight">{{ item.range }}</div>
              <div class="flex-1 bg-slate-100 rounded-full h-8 overflow-hidden relative shadow-inner">
                <div class="h-full bg-slate-900 rounded-full transition-all duration-700 ease-out shadow-lg"
                     [style.width.%]="getBarWidth(item.count)"></div>
                @if (item.count > 0) {
                   <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white">{{ item.count }}</span>
                }
              </div>
              <div class="w-20 text-[10px] font-bold text-slate-500 text-right uppercase">{{ item.count }} Học viên</div>
            </div>
          }
        </div>
      </div>

      <!-- Distribution Settings -->
      <app-distribution-selector
        [courseId]="assignment()?.courseId || null"
        [enrolledStudents]="enrolledStudents()"
        [initialDistributionType]="currentDistributionType()"
        [initialStudentIds]="currentStudentIds()"
        [initialClassId]="currentClassId()"
        (distributionChange)="onDistributionChange($event)"
      ></app-distribution-selector>

      <!-- Assignment Info Card -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
         <div class="bg-slate-50 border-b border-slate-100 px-6 py-4">
           <h3 class="text-xs font-bold text-slate-900 uppercase tracking-widest">Nội dung chi tiết</h3>
        </div>
        <div class="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="col-span-1 md:col-span-2">
            <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">Mô tả bài tập</label>
            <p class="text-sm font-medium text-slate-700 leading-relaxed">{{ assignment()?.description || 'Không có mô tả' }}</p>
          </div>
          <div class="col-span-1 md:col-span-2">
            <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">Hướng dẫn thực hiện</label>
            <p class="text-sm font-medium text-slate-700 leading-relaxed">{{ assignment()?.instructions || 'Không có hướng dẫn chi tiết' }}</p>
          </div>
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 block">Thời hạn nộp bài</label>
            <p class="text-sm font-bold text-slate-900">{{ formatDate(assignment()?.dueDate) }}</p>
          </div>
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 block">Thang điểm tối đa</label>
            <p class="text-sm font-bold text-slate-900">{{ assignment()?.maxScore || 100 }} Điểm chuyên cần</p>
          </div>
        </div>
      </div>

      <!-- Quick Actions (SOTA 2025: Gradient primary) -->
      @if (stats().pendingCount > 0) {
        <div class="bg-slate-900 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
          <div class="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-50 transition-opacity group-hover:opacity-70"></div>
          <div class="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="text-center md:text-left">
              <h3 class="text-xl font-black text-white tracking-tight">{{ stats().pendingCount }} bài đang chờ đánh giá!</h3>
              <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Bắt đầu chấm điểm ngay để hoàn tất tiến độ khóa học</p>
            </div>
            <a routerLink="../submissions" [queryParams]="{filter: 'PENDING'}"
               class="px-8 py-4 bg-white text-slate-900 text-xs font-black rounded-xl hover:bg-slate-100 transition-all shadow-xl active:scale-95 uppercase tracking-widest">
              Chấm bài ngay →
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
  currentDistributionType = signal<DistributionType>('ALL_STUDENTS');
  currentStudentIds = signal<string[]>([]);
  currentClassId = signal<string | null>(null);
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
      next: (allocation: any) => {
        if (allocation) {
          this.currentDistributionType.set(allocation.distributionType);
          this.currentStudentIds.set(allocation.studentIds || []);
          this.currentClassId.set(allocation.classId || null);
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
      next: (response: any) => {
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
      : (settings.distributionType === 'CLASS' ? 0 : (settings.studentIds?.length || 0)); // For Class, total is dynamic/handled by backend but we could calculate if we had class student list

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
        'current-teacher-id', // TODO: Get from auth service
        settings.distributionType === 'SPECIFIC_STUDENTS',
        settings.classId
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
    const maxCount = Math.max(...this.stats().scoreDistribution.map((d: any) => d.count), 1);
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
