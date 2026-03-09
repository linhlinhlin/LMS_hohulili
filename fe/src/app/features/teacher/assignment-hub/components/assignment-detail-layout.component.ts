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
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-assignment-detail-layout',
  imports: [RouterModule, RouterOutlet, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50/50">
      <!-- Header -->
      <div class="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div class="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <div class="flex items-center justify-between py-4">
            <div class="flex items-center gap-4">
              <button (click)="goBack()" 
                      class="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all">
                <lucide-icon name="chevron-right" [size]="20" class="rotate-180"></lucide-icon>
              </button>
              
              <div class="min-w-0">
                <!-- Merged Breadcrumb Pattern -->
                <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-1">
                  <span class="hover:text-[#0056D2] cursor-pointer transition-colors flex items-center gap-1" (click)="goBack()">
                    <lucide-icon name="arrow-left" [size]="10"></lucide-icon>
                    Quay lại
                  </span>
                  <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span class="text-slate-900">Chi tiết bài tập</span>
                </div>
                
                @if (assignmentStore.loading()) {
                  <div class="h-6 w-48 bg-slate-100 rounded-lg animate-pulse"></div>
                } @else {
                  <h1 class="text-xl font-black text-slate-900 truncate tracking-tight">
                    {{ assignmentStore.assignmentTitle() }}
                  </h1>
                }
              </div>
            </div>
            
            <!-- Quick Stats Badge -->
            @if (submissionsStore.pendingCount() > 0) {
              <div class="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-100 rounded-xl text-xs font-black shadow-sm">
                <span class="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                {{ submissionsStore.pendingCount() }} CHỜ CHẤM
              </div>
            }
          </div>
          
          <!-- Slender Tabs Navigation -->
          <nav class="flex gap-2 -mb-px">
            @let tabs = [
              { path: 'overview', label: 'Tổng quan', icon: 'layout' },
              { path: 'submissions', label: 'Bài nộp', icon: 'clipboard-list', count: submissionsStore.totalCount() },
              { path: 'settings', label: 'Cài đặt', icon: 'settings' },
              { path: 'rubric', label: 'Rubric', icon: 'clipboard-check' },
              { path: 'audit-log', label: 'Lịch sử', icon: 'clock' }
            ];

            @for (tab of tabs; track tab.path) {
              <a [routerLink]="tab.path" 
                 routerLinkActive="!border-[#0056D2] !text-[#0056D2] bg-blue-50/50"
                 class="h-12 px-6 text-[11px] font-black uppercase tracking-wider border-b-2 border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center gap-2.5 group relative">
                <lucide-icon [name]="tab.icon" [size]="14" class="opacity-50 group-hover:opacity-100 group-[.active]:opacity-100 transition-opacity"></lucide-icon>
                {{ tab.label }}
                @if (tab.count !== undefined && tab.count > 0) {
                  <span class="px-2 py-0.5 text-[9px] bg-slate-100 text-slate-500 rounded-lg group-hover:bg-[#0056D2]/10 group-hover:text-[#0056D2] transition-colors font-black">
                    {{ tab.count }}
                  </span>
                }
              </a>
            }
          </nav>
        </div>
      </div>
      
      <!-- Tab Content -->
      <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8">
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <router-outlet></router-outlet>
        </div>
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
