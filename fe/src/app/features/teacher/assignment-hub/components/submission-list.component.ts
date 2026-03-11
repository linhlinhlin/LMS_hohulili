import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AssignmentDetailStore } from '../stores/assignment-detail.store';
import { SubmissionsStore, SubmissionFilter } from '../stores/submissions.store';
import { SubmissionGrade } from '../../../../api/client/assignment.api';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * Submission List Component
 * 
 * Displays submissions with inline grading support and batch operations.
 * 
 * @requirements Expert feedback - Inline grading, Batch grading
 */
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-submission-list',
  imports: [RouterLink, FormsModule, LucideAngularModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-in fade-in duration-500">
      
      <!-- Toolbar & Filters -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
          <button (click)="setFilter('ALL')" 
                  [class]="filter() === 'ALL' ? 'bg-white text-[#0056D2] shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                  class="h-9 px-4 rounded-xl text-xs font-bold transition-all">
            Tất cả
          </button>
          <button (click)="setFilter('PENDING')"
                  [class]="filter() === 'PENDING' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                  class="h-9 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
            Chờ chấm
            <span class="px-1.5 py-0.5 text-[10px] bg-orange-500 text-white rounded-lg">{{ store.pendingCount() }}</span>
          </button>
          <button (click)="setFilter('GRADED')"
                  [class]="filter() === 'GRADED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                  class="h-9 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
            Đã chấm
            <span class="px-1.5 py-0.5 text-[10px] bg-emerald-500 text-white rounded-lg">{{ store.gradedCount() }}</span>
          </button>
          <button (click)="setFilter('LATE')"
                  [class]="filter() === 'LATE' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                  class="h-9 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
            Nộp muộn
            <span class="px-1.5 py-0.5 text-[10px] bg-rose-500 text-white rounded-lg">{{ store.lateCount() }}</span>
          </button>
        </div>
        
        <!-- Batch Actions Bar -->
        <div class="h-11 flex items-center gap-3">
          @if (selectedIds().length > 0) {
            <div class="flex items-center gap-4 px-4 h-full bg-slate-900 border border-slate-800 text-white rounded-xl shadow-xl animate-in slide-in-from-right-4 duration-300">
              <span class="text-[10px] font-black uppercase tracking-[0.1em]">{{ selectedIds().length }} đã chọn</span>
              <div class="w-px h-4 bg-slate-700"></div>
              <button (click)="openBatchGrade()" 
                      class="text-[10px] font-black uppercase tracking-[0.1em] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2">
                <lucide-icon name="check-square" [size]="14"></lucide-icon>
                Chấm hàng loạt
              </button>
            </div>
          }
          <button (click)="reload()" 
                  class="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#0056D2] hover:border-blue-200 hover:shadow-md transition-all">
            <lucide-icon name="rotate-cw" [size]="18" [class.animate-spin]="store.loading()"></lucide-icon>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      @if (store.loading() && store.filteredSubmissions().length === 0) {
        <div class="space-y-4">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="h-16 bg-white rounded-xl border border-slate-100 animate-pulse"></div>
          }
        </div>
      }

      <!-- Error State -->
      @if (store.error()) {
        <div class="bg-rose-50 border border-rose-100 rounded-2xl p-8 text-center">
          <div class="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <lucide-icon name="alert-circle" [size]="32"></lucide-icon>
          </div>
          <h3 class="text-lg font-black text-slate-900 mb-1">Đã xảy ra lỗi</h3>
          <p class="text-sm text-slate-500 mb-6">{{ store.error() }}</p>
          <button (click)="reload()" class="h-10 px-6 bg-[#0056D2] text-white rounded-xl font-bold text-sm hover:bg-[#004BB5] transition-all shadow-md shadow-blue-100">
            Thử lại
          </button>
        </div>
      }

      <!-- Submissions Table -->
      @if (!store.error()) {
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50/50 border-b border-slate-100">
                  <th class="px-6 py-4 w-12">
                    <div class="flex items-center">
                      <input type="checkbox" (change)="toggleSelectAll($event)" 
                             [checked]="isAllSelected()" 
                             class="w-4 h-4 rounded border-slate-300 text-[#0056D2] focus:ring-[#0056D2]/20 transition-all cursor-pointer"/>
                    </div>
                  </th>
                  <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">Học viên</th>
                  <th class="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">Thời gian nộp</th>
                  <th class="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">Trạng thái</th>
                  <th class="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] w-48">Điểm số</th>
                  <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (sub of store.filteredSubmissions(); track sub.id) {
                  <tr class="hover:bg-blue-50/30 transition-colors group">
                    <td class="px-6 py-4">
                      <input type="checkbox" [checked]="isSelected(sub.id)" 
                             (change)="toggleSelect(sub.id)" 
                             class="w-4 h-4 rounded border-slate-300 text-[#0056D2] focus:ring-[#0056D2]/20 transition-all cursor-pointer"/>
                    </td>
                    <td class="px-4 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-black group-hover:bg-white group-hover:shadow-sm transition-all">
                          {{ getInitials(sub.studentName) }}
                        </div>
                        <div class="min-w-0">
                          <div class="text-sm font-black text-slate-800 truncate">{{ sub.studentName }}</div>
                          <div class="text-[10px] font-bold text-slate-400 truncate">{{ sub.studentEmail }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-4">
                      <div class="flex flex-col">
                        <span class="text-xs font-black text-slate-900 tracking-tight">{{ formatDate(sub.submittedAt).split(' ')[0] }}</span>
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{{ formatDate(sub.submittedAt).split(' ')[1] }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-4">
                      <span class="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border shadow-sm" 
                            [class]="getStatusClass(sub.status, sub.isLate)">
                        {{ getStatusText(sub.status, sub.isLate) }}
                      </span>
                    </td>
                    <td class="px-4 py-4">
                      @if (getGradeScore(sub.grade) !== undefined) {
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-black text-[#0056D2] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 shadow-inner">{{ getGradeScore(sub.grade) }}</span>
                          <span class="text-[10px] font-black text-slate-400 tracking-widest">/ {{ sub.maxScore || 100 }}</span>
                        </div>
                      } @else {
                        <div class="flex items-center gap-2">
                          <div class="relative group/input max-w-[80px]">
                            <input type="number" [value]="inlineGrades()[sub.id] || ''" 
                                   (input)="setInlineGrade(sub.id, $event)"
                                   placeholder="--"
                                   [min]="0" [max]="sub.maxScore || 100"
                                   class="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all shadow-inner placeholder:text-slate-300"/>
                          </div>
                          @if (inlineGrades()[sub.id] !== undefined) {
                            <button (click)="saveInlineGrade(sub.id, sub.maxScore || 100)" 
                                    [disabled]="store.savingGrade() === sub.id"
                                    class="w-9 h-9 flex items-center justify-center rounded-xl bg-[#0056D2] text-white hover:bg-[#004BB5] transition-all disabled:opacity-50 shadow-md shadow-blue-100">
                              @if (store.savingGrade() === sub.id) {
                                <lucide-icon name="loader-2" [size]="14" class="animate-spin"></lucide-icon>
                              } @else {
                                <lucide-icon name="check" [size]="14"></lucide-icon>
                              }
                            </button>
                          }
                        </div>
                      }
                    </td>
                    <td class="px-6 py-4 text-right">
                      <a [routerLink]="['..', 'grade', sub.id]" 
                         class="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:border-[#0056D2] hover:text-[#0056D2] transition-all shadow-sm">
                        <span>{{ getGradeScore(sub.grade) !== undefined ? 'Chi tiết' : 'Chấm bài' }}</span>
                        <lucide-icon name="chevron-right" [size]="14"></lucide-icon>
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          
          @if (store.filteredSubmissions().length === 0 && !store.loading()) {
            <div class="py-20 text-center border-t border-slate-100">
              <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                <lucide-icon name="clipboard-list" [size]="32"></lucide-icon>
              </div>
              <h4 class="text-sm font-black text-slate-900">Không có bài nộp nào</h4>
              <p class="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-medium">Thay đổi bộ lọc hoặc tìm kiếm để xem kết quả khác.</p>
            </div>
          }
        </div>
      }

      <!-- Batch Grade Modal -->
      @if (showBatchModal()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
             [@modalAnimation]>
          <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 class="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <lucide-icon name="check-square" [size]="16" class="text-[#0056D2]"></lucide-icon>
                Chấm điểm hàng loạt
              </h3>
              <button (click)="closeBatchModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
                <lucide-icon name="x" [size]="18"></lucide-icon>
              </button>
            </div>
            
            <div class="p-6 space-y-6">
              <div class="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p class="text-xs font-bold text-blue-700 flex items-center gap-2">
                  <lucide-icon name="users" [size]="14"></lucide-icon>
                  Đang chấm cho {{ selectedIds().length }} học viên đã chọn
                </p>
              </div>

              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Điểm số áp dụng</label>
                <div class="relative">
                  <input type="number" [(ngModel)]="batchScore" 
                         [max]="assignmentStore.assignment()?.maxScore || 100"
                         class="w-full h-12 pl-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all"/>
                  <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">/ {{ assignmentStore.assignment()?.maxScore || 100 }}</span>
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nhận xét chung (tùy chọn)</label>
                <textarea [(ngModel)]="batchFeedback" rows="3" 
                          placeholder="Chia sẻ nhận xét cho tất cả bài nộp này..."
                          class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all resize-none"></textarea>
              </div>
            </div>

            <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button (click)="closeBatchModal()" 
                      class="flex-1 h-11 px-6 rounded-xl border border-slate-200 text-slate-600 font-black text-xs hover:bg-slate-100 transition-all uppercase tracking-widest">
                Hủy
              </button>
              <button (click)="submitBatchGrade()" 
                      class="flex-1 h-11 px-6 bg-[#0056D2] text-white rounded-xl font-black text-xs hover:bg-[#004BB5] transition-all shadow-md shadow-blue-100 uppercase tracking-widest">
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class SubmissionListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  store = inject(SubmissionsStore);
  assignmentStore = inject(AssignmentDetailStore);
  private toast = inject(ToastService);

  filter = this.store.filter;
  selectedIds = signal<string[]>([]);
  inlineGrades = signal<Record<string, number>>({});
  showBatchModal = signal(false);
  batchScore = 0;
  batchFeedback = '';

  ngOnInit(): void {
    const assignmentId = this.assignmentStore.assignmentId();
    if (assignmentId) {
      this.store.loadSubmissions(assignmentId).subscribe({
        error: () => this.toast.error('Không thể tải danh sách bài nộp')
      });
    }
    // Check for filter query param
    const filterParam = this.route.snapshot.queryParamMap.get('filter');
    if (filterParam) {
      this.store.setFilter(filterParam as SubmissionFilter);
    }
  }

  setFilter(filter: SubmissionFilter): void {
    this.store.setFilter(filter);
  }

  reload(): void {
    const assignmentId = this.assignmentStore.assignmentId();
    if (assignmentId) {
      this.store.loadSubmissions(assignmentId, true).subscribe({
        error: () => this.toast.error('Không thể tải lại danh sách bài nộp')
      });
    }
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  getStatusClass(status: string, isLate?: boolean): string {
    const normalizedStatus = status?.toLowerCase();
    if (isLate || normalizedStatus === 'late' || normalizedStatus === 'late_submission') return 'bg-rose-50 text-rose-700 border-rose-100 shadow-sm shadow-rose-50';
    if (normalizedStatus === 'graded') return 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm shadow-blue-50';
    return 'bg-orange-50 text-orange-700 border-orange-100 shadow-sm shadow-orange-50';
  }

  getStatusText(status: string, isLate?: boolean): string {
    const normalizedStatus = status?.toLowerCase();
    if (isLate || normalizedStatus === 'late' || normalizedStatus === 'late_submission') return 'Nộp muộn';
    if (normalizedStatus === 'graded') return 'Đã chấm';
    return 'Chờ chấm';
  }

  getGradeScore(grade: number | SubmissionGrade | undefined): number | undefined {
    return this.store.getGradeScore(grade);
  }

  // Selection
  toggleSelect(id: string): void {
    this.selectedIds.update(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  }

  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedIds.set(this.store.filteredSubmissions().map(s => s.id));
    } else {
      this.selectedIds.set([]);
    }
  }

  isAllSelected(): boolean {
    const filtered = this.store.filteredSubmissions();
    return filtered.length > 0 && this.selectedIds().length === filtered.length;
  }

  // Inline Grading
  setInlineGrade(id: string, event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.inlineGrades.update(grades => ({ ...grades, [id]: value }));
  }

  saveInlineGrade(id: string, maxScore: number): void {
    const score = this.inlineGrades()[id];
    if (score !== undefined && score >= 0 && score <= maxScore) {
      this.store.updateInlineGrade({ submissionId: id, score }).subscribe({
        next: () => this.inlineGrades.update(grades => { const g = { ...grades }; delete g[id]; return g; }),
        error: () => this.toast.error('Không thể lưu điểm')
      });
    }
  }

  // Batch Grading
  openBatchGrade(): void {
    this.showBatchModal.set(true);
  }

  closeBatchModal(): void {
    this.showBatchModal.set(false);
    this.batchScore = 0;
    this.batchFeedback = '';
  }

  submitBatchGrade(): void {
    this.store.batchGrade(this.selectedIds(), this.batchScore, this.batchFeedback).subscribe({
      next: () => {
        this.selectedIds.set([]);
        this.closeBatchModal();
      },
      error: () => this.toast.error('Không thể chấm điểm hàng loạt')
    });
  }
}
