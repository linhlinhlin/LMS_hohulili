import { Component, computed, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule, RouterOutlet, ActivatedRoute, Router } from '@angular/router';
import { AssignmentDetailStore } from '../stores/assignment-detail.store';
import { SubmissionsStore } from '../stores/submissions.store';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * Assignment Detail Layout Component
 * 
 * Container component with tabs navigation for assignment detail views.
 * Tabs: Overview | Submissions | Settings | Rubric | Audit Log
 * 
 * @requirements Expert feedback - Tabs model with Audit Log
 */
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-assignment-detail-layout',
  imports: [RouterModule, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen">
      <!-- Header (expert feedback #1 — assignment name is H1, not "Chi tiết bài tập") -->
      <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div class="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div class="py-4">
            <!-- Breadcrumb (single, clean — a11y: focus-visible) -->
            <nav class="flex items-center gap-1.5 text-sm mb-2" aria-label="Breadcrumb">
              <a (click)="goBack()" class="text-gray-500 hover:text-[#0056D2] cursor-pointer transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0056D2] focus-visible:outline-offset-2" tabindex="0" (keydown.enter)="goBack()">Giao bài tập</a>
              <svg class="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              <span class="text-gray-600 truncate">{{ assignmentStore.assignmentTitle() || '...' }}</span>
            </nav>

            <div class="flex items-center justify-between">
              <div class="min-w-0">
                @if (assignmentStore.loading()) {
                  <div class="h-7 w-64 bg-gray-100 rounded animate-pulse"></div>
                } @else {
                  <h1 class="text-xl font-bold text-gray-900 truncate">{{ assignmentStore.assignmentTitle() }}</h1>
                }
              </div>

            @if (submissionsStore.pendingCount() > 0) {
              <span class="rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 flex-shrink-0">
                {{ submissionsStore.pendingCount() }} chờ chấm
              </span>
            }
          </div>

          <!-- Tabs (a11y: focus-visible, role=tablist) -->
          <nav class="flex gap-0 -mb-px overflow-x-auto" role="tablist" aria-label="Chi tiết bài tập">
            @let tabs = [
              { path: 'submissions', label: 'Bài nộp', count: submissionsStore.totalCount() },
              { path: 'details', label: 'Chi tiết' },
              { path: 'audit-log', label: 'Lịch sử' }
            ];

            @for (tab of tabs; track tab.path) {
              <a [routerLink]="tab.path"
                 routerLinkActive="!border-[#0056D2] !text-[#0056D2]"
                 role="tab"
                 class="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-900 transition-colors whitespace-nowrap flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0056D2] focus-visible:outline-offset-[-2px]">
                {{ tab.label }}
                @if (tab.count !== undefined && tab.count > 0) {
                  <span class="text-xs text-gray-500">({{ tab.count }})</span>
                }
              </a>
            }
          </nav>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class AssignmentDetailLayoutComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  assignmentStore = inject(AssignmentDetailStore);
  submissionsStore = inject(SubmissionsStore);
  private toast = inject(ToastService);

  readonly operationalContextLabel = computed(() => {
    const assignment = this.assignmentStore.assignment();

    if (!assignment) {
      return 'Chi tiết bài tập';
    }

    if (assignment.deliveryMode === 'SELF_PACED') {
      return 'Toàn khóa học';
    }

    if (assignment.distributionType === 'CLASS' && assignment.className) {
      return `Theo lớp • ${assignment.className}`;
    }

    if (assignment.distributionType === 'SPECIFIC_STUDENTS') {
      return 'Theo nhóm học viên';
    }

    return 'Toàn khóa học';
  });

  ngOnInit(): void {
    const assignmentId = this.route.snapshot.paramMap.get('id');
    if (assignmentId) {
      this.assignmentStore.loadAssignment(assignmentId).subscribe({
        error: () => this.toast.error('Không thể tải bài tập')
      });
      // Lazy load submissions only when needed (will be triggered by submissions tab)
    }
  }

  ngOnDestroy(): void {
    // Optionally clear state when leaving
    // this.assignmentStore.clearAssignment();
    // this.submissionsStore.clearSubmissions();
  }

  goBack(): void {
    this.router.navigate(['/teacher/assessments/classes/assignments']);
  }
}
