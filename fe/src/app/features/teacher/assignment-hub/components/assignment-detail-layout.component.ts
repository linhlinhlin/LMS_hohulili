import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';

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
@Component({
  selector: 'app-assignment-detail-layout',
  imports: [RouterModule, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <button (click)="goBack()" class="p-2 hover:bg-gray-100 rounded-lg">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
              </button>
              <div>
                @if (assignmentStore.loading()) {
                  <div class="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
                } @else {
                  <h1 class="text-xl font-bold text-gray-900">{{ assignmentStore.assignmentTitle() }}</h1>
                  <p class="text-sm text-gray-500">{{ assignmentStore.assignment()?.courseTitle }}</p>
                }
              </div>
            </div>
            
            <!-- Quick Stats Badge -->
            @if (submissionsStore.pendingCount() > 0) {
              <div class="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                <span class="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                {{ submissionsStore.pendingCount() }} chờ chấm
              </div>
            }
          </div>
          
          <!-- Tabs Navigation -->
          <nav class="flex gap-1 mt-4 -mb-px">
            <a routerLink="overview" routerLinkActive="border-blue-500 text-[#0056D2]"
               class="px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-gray-300 hover:text-gray-700 transition-colors">
              Tổng quan
            </a>
            <a routerLink="submissions" routerLinkActive="border-blue-500 text-[#0056D2]"
               class="px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-gray-300 hover:text-gray-700 transition-colors flex items-center gap-2">
              Bài nộp
              @if (submissionsStore.totalCount() > 0) {
                <span class="px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">{{ submissionsStore.totalCount() }}</span>
              }
            </a>
            <a routerLink="settings" routerLinkActive="border-blue-500 text-[#0056D2]"
               class="px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-gray-300 hover:text-gray-700 transition-colors">
              Cài đặt
            </a>
            <a routerLink="rubric" routerLinkActive="border-blue-500 text-[#0056D2]"
               class="px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-gray-300 hover:text-gray-700 transition-colors">
              Rubric
            </a>
            <a routerLink="audit-log" routerLinkActive="border-blue-500 text-[#0056D2]"
               class="px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-gray-300 hover:text-gray-700 transition-colors">
              Lịch sử
            </a>
          </nav>
        </div>
      </div>
      
      <!-- Tab Content -->
      <div class="max-w-7xl mx-auto px-6 py-6">
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
    this.router.navigate(['/teacher/assignments']);
  }
}
