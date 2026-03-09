import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AssignmentDetailStore } from '../stores/assignment-detail.store';
import { SubmissionsStore } from '../stores/submissions.store';
import { DistributionSelectorComponent, DistributionSettings } from './distribution-selector.component';
import { DistributionService } from '../../../../core/services/distribution.service';
import { EnrolledStudent, DistributionType } from '../utils/allocation-utils';
import { CourseApi } from '../../../../api/client/course.api';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * Assignment Overview Component
 * 
 * Displays assignment details with grading statistics and score distribution.
 * 
 * @requirements Expert feedback - Overview tab with stats
 */
@Component({
  selector: 'app-assignment-overview',
  imports: [CommonModule, RouterLink, DistributionSelectorComponent, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-in fade-in duration-500">
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Submitted -->
        <!-- Submitted -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-all hover:shadow-xl hover:-translate-y-0.5 group cursor-default">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">Đã nộp bài</p>
              <div class="flex items-baseline gap-1.5">
                <p class="text-3xl font-black text-slate-900 tracking-tight">{{ stats().submittedCount }}</p>
                <p class="text-xs font-black text-slate-300">/{{ getAllocatedCount() }}</p>
              </div>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-blue-50 text-[#0056D2] border border-blue-100/50 flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-md">
               <lucide-icon name="file-text" [size]="20"></lucide-icon>
            </div>
          </div>
        </div>
        
        <!-- Graded -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-all hover:shadow-xl hover:-translate-y-0.5 group cursor-default">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">Đã chấm điểm</p>
              <p class="text-3xl font-black text-slate-900 tracking-tight">{{ stats().gradedCount }}</p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/50 flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-md">
              <lucide-icon name="check-circle" [size]="20"></lucide-icon>
            </div>
          </div>
        </div>

        <!-- Pending -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-all hover:shadow-xl hover:-translate-y-0.5 group cursor-default">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">Chờ chấm điểm</p>
              <p class="text-3xl font-black text-slate-900 tracking-tight">{{ stats().pendingCount }}</p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100/50 flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-md">
              <lucide-icon name="clock" [size]="20"></lucide-icon>
            </div>
          </div>
        </div>

        <!-- Average Score -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-all hover:shadow-xl hover:-translate-y-0.5 group cursor-default">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">Điểm trung bình</p>
              <p class="text-3xl font-black text-slate-900 tracking-tight">{{ stats().averageScore | number:'1.1-1' }}%</p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100/50 flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-md">
              <lucide-icon name="award" [size]="20"></lucide-icon>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left: Distribution & Info -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Allocation Stats -->
          @if (allocationStats()) {
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 class="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <lucide-icon name="users" [size]="14"></lucide-icon>
                  Cấu hình phân phối bài tập
                </h3>
              </div>
              <div class="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <p class="text-xl font-black text-slate-900">{{ allocationStats()!.totalAllocated }}</p>
                  <p class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">Đã giao bài</p>
                </div>
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <p class="text-xl font-black text-slate-900">{{ stats().submittedCount }}</p>
                  <p class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">Đã hoàn thành</p>
                </div>
                <div class="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-center">
                  <p class="text-xl font-black text-[#0056D2]">{{ allocationStats()!.totalAllocated - stats().submittedCount }}</p>
                  <p class="text-[10px] font-bold text-blue-600 uppercase tracking-tighter mt-1">Còn lại</p>
                </div>
                <div class="p-4 bg-slate-900 text-white rounded-xl shadow-lg flex flex-col items-center justify-center">
                  <p class="text-xs font-black uppercase tracking-tight">
                    {{ allocationStats()!.distributionType === 'ALL_STUDENTS' ? 'Toàn bộ' : 
                       (allocationStats()!.distributionType === 'CLASS' ? 'Lớp học' : 'Cá nhân') }}
                  </p>
                  <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">CHẾ ĐỘ</p>
                </div>
              </div>
            </div>
          }

          <!-- Distribution Settings (Inline Selector) -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <app-distribution-selector
              [courseId]="assignment()?.courseId || null"
              [enrolledStudents]="enrolledStudents()"
              [initialDistributionType]="currentDistributionType()"
              [initialStudentIds]="currentStudentIds()"
              [initialClassId]="currentClassId()"
              (distributionChange)="onDistributionChange($event)"
            ></app-distribution-selector>
          </div>

          <!-- Description & Instructions -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 class="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <lucide-icon name="info" [size]="14"></lucide-icon>
                Thông tin chi tiết
              </h3>
            </div>
            <div class="p-6 space-y-6">
              <div>
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Mô tả bài tập</label>
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed font-medium">
                  {{ assignment()?.description || 'Không có mô tả' }}
                </div>
              </div>
              <div>
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Hướng dẫn thực hiện</label>
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed font-medium">
                  {{ assignment()?.instructions || 'Không có hướng dẫn chi tiết' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Score Distribution & Quick Actions -->
        <div class="space-y-8">
          <!-- Score Distribution -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 class="text-[11px] font-black text-slate-700 uppercase tracking-[0.1em] flex items-center gap-2">
                <lucide-icon name="bar-chart-3" [size]="14" class="text-[#0056D2]"></lucide-icon>
                Phổ điểm đánh giá
              </h3>
            </div>
            <div class="p-6 space-y-5">
              @for (item of stats().scoreDistribution; track item.range) {
                <div class="space-y-2 group/bar">
                  <div class="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                    <span class="text-slate-500">{{ item.range }}</span>
                    <span class="text-slate-900">{{ item.count }} học viên</span>
                  </div>
                  <div class="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner flex items-center px-0.5">
                    <div class="h-1.5 bg-[#0056D2] rounded-full transition-all duration-1000 ease-out shadow-sm group-hover/bar:bg-blue-600 group-hover/bar:h-2"
                         [style.width.%]="getBarWidth(item.count)"></div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Quick Info Cards -->
          <div class="space-y-4">
            <div class="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <lucide-icon name="calendar" [size]="20"></lucide-icon>
              </div>
              <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hạn nộp bài</p>
                <p class="text-sm font-black text-slate-900 mt-0.5">{{ formatDate(assignment()?.dueDate) }}</p>
              </div>
            </div>

            <div class="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div class="w-10 h-10 rounded-xl bg-blue-50 text-[#0056D2] flex items-center justify-center">
                <lucide-icon name="target" [size]="20"></lucide-icon>
              </div>
              <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thang điểm tối đa</p>
                <p class="text-sm font-black text-slate-900 mt-0.5">{{ assignment()?.maxScore || 100 }} Điểm</p>
              </div>
            </div>
          </div>

          <!-- Pending Action Alert -->
          @if (stats().pendingCount > 0) {
            <div class="bg-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
              <div class="absolute inset-0 bg-gradient-to-br from-[#0056D2]/30 to-transparent opacity-50"></div>
              <div class="relative z-10">
                <h4 class="text-lg font-black text-white leading-tight mb-2">
                  {{ stats().pendingCount }} bài nộp<br/>đang chờ chấm!
                </h4>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                  Hoàn tất đánh giá để cập nhật bảng điểm
                </p>
                <a routerLink="../submissions" [queryParams]="{filter: 'PENDING'}"
                   class="w-full py-3 bg-white text-slate-900 text-[10px] font-black rounded-xl hover:bg-slate-100 transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest">
                  Chấm bài ngay
                  <lucide-icon name="arrow-right" [size]="14"></lucide-icon>
                </a>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class AssignmentOverviewComponent implements OnInit {
  private assignmentStore = inject(AssignmentDetailStore);
  private submissionsStore = inject(SubmissionsStore);
  private distributionService = inject(DistributionService);
  private courseApi = inject(CourseApi);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

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
        },
        error: () => this.toast.error('Không thể tải danh sách bài nộp')
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
        this.authService.getCurrentUser()?.id || '',
        settings.distributionType === 'SPECIFIC_STUDENTS',
        settings.classId
      ).subscribe({
        error: () => this.toast.error('Không thể lưu cài đặt phân phối')
      });
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
