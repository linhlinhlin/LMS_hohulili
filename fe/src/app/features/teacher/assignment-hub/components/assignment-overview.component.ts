import { Component, effect, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AssignmentDetailStore } from '../stores/assignment-detail.store';
import { SubmissionsStore } from '../stores/submissions.store';
import { DistributionSelectorComponent, DistributionSettings } from './distribution-selector.component';
import { EnrolledStudent, DistributionType } from '../utils/allocation-utils';
import { CourseApi } from '../../../../api/client/course.api';
import { ToastService } from '../../../../core/services/toast.service';
import { AssignmentApi } from '../../../../api/client/assignment.api';
import { ClassService } from '../../../../state/class.service';

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
    <div class="space-y-6">

      @if (stats().submittedCount > 0) {
        <!-- Stats (ONLY when there are submissions — no zero-noise) -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <p class="text-xs text-gray-500 mb-1">Đã nộp</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats().submittedCount }}<span class="text-sm font-normal text-gray-500">/{{ getAllocatedCount() }}</span></p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <p class="text-xs text-gray-500 mb-1">Đã chấm</p>
            <p class="text-2xl font-bold text-emerald-600">{{ stats().gradedCount }}</p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <p class="text-xs text-gray-500 mb-1">Chờ chấm</p>
            <p class="text-2xl font-bold" [class.text-amber-600]="stats().pendingCount > 0" [class.text-gray-900]="stats().pendingCount === 0">{{ stats().pendingCount }}</p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <p class="text-xs text-gray-500 mb-1">Điểm TB</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats().averageScore | number:'1.0-0' }}%</p>
          </div>
        </div>
      } @else {
        <!-- Empty state when no submissions yet -->
        <div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <svg class="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
          </svg>
          <p class="text-sm font-medium text-gray-600">Chưa có học viên nộp bài</p>
          <p class="text-xs text-gray-500 mt-1">{{ getAllocatedCount() }} học viên đã được giao bài tập này</p>
        </div>
      }

      <!-- Assignment Content -->
      <div class="rounded-lg border border-gray-200 bg-white shadow-sm p-6">
        <div class="max-w-2xl space-y-5">
          <div>
            <h3 class="text-sm font-semibold text-gray-900 mb-2">Mô tả bài tập</h3>
            <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{{ assignment()?.description || 'Không có mô tả' }}</p>
          </div>

          @if (assignment()?.instructions && assignment()?.instructions !== assignment()?.description) {
            <div class="pt-4 border-t border-gray-100">
              <h3 class="text-sm font-semibold text-gray-900 mb-2">Hướng dẫn thực hiện</h3>
              <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{{ assignment()?.instructions }}</p>
            </div>
          }
        </div>
      </div>

      <!-- Score Distribution (only when scores exist) -->
      @if (hasAnyScores()) {
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm p-6">
          <h3 class="text-sm font-semibold text-gray-900 mb-4">Phân bố điểm</h3>
          <div class="max-w-lg space-y-2.5">
            @for (item of stats().scoreDistribution; track item.range) {
              <div class="flex items-center gap-3">
                <span class="w-12 text-xs text-gray-500 text-right tabular-nums">{{ item.range }}</span>
                <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full bg-[#0056D2] rounded-full transition-all duration-500"
                       [style.width.%]="getBarWidth(item.count)"></div>
                </div>
                <span class="w-8 text-xs text-gray-500 tabular-nums">{{ item.count }}</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Distribution Settings (only for instructor-led) -->
      @if (assignment()?.deliveryMode === 'INSTRUCTOR_LED') {
        <app-distribution-selector
          [courseId]="assignment()?.courseId || null"
          [enrolledStudents]="enrolledStudents()"
          [initialDistributionType]="currentDistributionType()"
          [initialStudentIds]="currentStudentIds()"
          [initialClassId]="currentClassId()"
          (distributionChange)="onDistributionChange($event)"
        ></app-distribution-selector>
      }
    </div>
  `
})
export class AssignmentOverviewComponent implements OnInit {
  private assignmentStore = inject(AssignmentDetailStore);
  private submissionsStore = inject(SubmissionsStore);
  private courseApi = inject(CourseApi);
  private toast = inject(ToastService);
  private assignmentApi = inject(AssignmentApi);
  private classService = inject(ClassService);

  assignment = this.assignmentStore.assignment;
  stats = this.assignmentStore.stats;

  // Loading state
  loadingStudents = signal(false);

  // Distribution state
  enrolledStudents = signal<EnrolledStudent[]>([]);
  currentDistributionType = signal<DistributionType>('ALL_STUDENTS');
  currentStudentIds = signal<string[]>([]);
  currentClassId = signal<string | null>(null);
  classStudentCount = signal(0);
  distributionSettings = signal<DistributionSettings | null>(null);
  allocationStats = signal<{ totalAllocated: number; distributionType: string; isIndividual: boolean } | null>(null);
  private loadedSubmissionsFor = signal<string | null>(null);
  private loadedStudentsFor = signal<string | null>(null);

  constructor() {
    effect(
      () => {
        const assignment = this.assignment();
        if (!assignment) {
          return;
        }

        this.hydrateDistributionFromAssignment(assignment);

        if (this.loadedSubmissionsFor() !== assignment.id) {
          this.loadedSubmissionsFor.set(assignment.id);
          this.submissionsStore.loadSubmissions(assignment.id).subscribe({
            next: () => {
              const submissions = this.submissionsStore.submissions();
              this.assignmentStore.updateStatsFromSubmissions(submissions);
            },
            error: () => this.toast.error('Không thể tải danh sách bài nộp')
          });
        }

        if (assignment.courseId && this.loadedStudentsFor() !== assignment.courseId) {
          this.loadedStudentsFor.set(assignment.courseId);
          this.loadEnrolledStudents(assignment.courseId);
        }
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {
    // Assignment hydration is driven by the reactive effect above.
  }

  private hydrateDistributionFromAssignment(assignment: {
    distributionType?: DistributionType;
    allocatedStudentIds?: string[];
    classId?: string | null;
  }): void {
    const previousDistributionType = this.currentDistributionType();
    const previousClassId = this.currentClassId();

    this.currentDistributionType.set(assignment.distributionType || 'ALL_STUDENTS');
    this.currentStudentIds.set(assignment.allocatedStudentIds || []);
    this.currentClassId.set(assignment.classId || null);

    if (assignment.classId && (assignment.classId !== previousClassId || previousDistributionType !== 'CLASS')) {
      this.loadClassStudentCount(assignment.classId);
    } else {
      if (previousClassId !== null || previousDistributionType === 'CLASS') {
        this.classStudentCount.set(0);
      }
      this.updateAllocationStats();
    }
  }

  private loadClassStudentCount(classId: string): void {
    this.classService.getClassStudents(classId).subscribe({
      next: (response: unknown) => {
        const items = Array.isArray(response)
          ? response
          : Array.isArray((response as { content?: unknown[] } | null)?.content)
            ? ((response as { content: unknown[] }).content)
            : [];
        this.classStudentCount.set(items.length);
        this.updateAllocationStats();
      },
      error: () => {
        this.classStudentCount.set(0);
        this.updateAllocationStats();
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

          this.updateAllocationStats();
        }
        this.loadingStudents.set(false);
      },
      error: () => {
        this.loadingStudents.set(false);
        this.enrolledStudents.set([]);
        this.updateAllocationStats();
      }
    });
  }

  private updateAllocationStats(): void {
    const distributionType = this.currentDistributionType();
    const totalAllocated = distributionType === 'CLASS'
      ? this.classStudentCount()
      : distributionType === 'SPECIFIC_STUDENTS'
        ? this.currentStudentIds().length
        : this.enrolledStudents().length;

    this.allocationStats.set({
      totalAllocated,
      distributionType,
      isIndividual: distributionType === 'SPECIFIC_STUDENTS'
    });
  }



  onDistributionChange(settings: DistributionSettings): void {
    this.distributionSettings.set(settings);
    this.currentDistributionType.set(settings.distributionType);
    this.currentStudentIds.set(settings.studentIds || []);
    this.currentClassId.set(settings.classId || null);

    if (settings.distributionType === 'CLASS' && settings.classId) {
      this.loadClassStudentCount(settings.classId);
    } else {
      this.classStudentCount.set(0);
      this.updateAllocationStats();
    }
    const assignmentId = this.assignment()?.id;
    if (assignmentId) {
      this.assignmentApi.updateAssignment(assignmentId, {
        distributionType: settings.distributionType,
        classId: settings.distributionType === 'CLASS' ? settings.classId || undefined : undefined,
        studentIds: settings.distributionType === 'SPECIFIC_STUDENTS' ? settings.studentIds || [] : undefined
      }).subscribe({
        next: () => {
          this.assignmentStore.updateAssignment({
            distributionType: settings.distributionType,
            classId: settings.distributionType === 'CLASS' ? settings.classId || undefined : undefined,
            allocatedStudentIds: settings.distributionType === 'SPECIFIC_STUDENTS' ? settings.studentIds || [] : []
          });
        },
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

  hasAnyScores(): boolean {
    return this.stats().scoreDistribution.some((d: any) => d.count > 0);
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

  getDistributionModeLabel(): string {
    const distributionType = this.allocationStats()?.distributionType ?? this.currentDistributionType();

    if (distributionType === 'CLASS') {
      return 'Theo lớp';
    }

    if (distributionType === 'SPECIFIC_STUDENTS') {
      return 'Cá nhân';
    }

    return 'Toàn khóa học';
  }

  getPendingReviewPrompt(): string {
    const assignment = this.assignment();

    if (assignment?.deliveryMode === 'SELF_PACED') {
      return 'Bắt đầu chấm điểm để cập nhật tiến độ cho toàn bộ học viên đã ghi danh';
    }

    if (assignment?.distributionType === 'CLASS' && assignment.className) {
      return `Bắt đầu chấm điểm để hoàn tất vòng đánh giá của ${assignment.className}`;
    }

    if (assignment?.distributionType === 'SPECIFIC_STUDENTS') {
      return 'Bắt đầu chấm điểm để hoàn tất vòng đánh giá cho nhóm học viên đã chọn';
    }

    return 'Bắt đầu chấm điểm để hoàn tất vòng đánh giá của toàn khóa học';
  }
}
