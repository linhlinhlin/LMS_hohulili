import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GradingStateService } from './services/grading-state.service';
import { SubmissionDetail } from '../../../api/client/assignment.api';

/**
 * Grading Dashboard Component (Advanced Grading System)
 * 
 * Dashboard tổng quan chấm điểm với statistics và pending submissions.
 * Features: summary stats, pending list sorted by due date, quick navigation.
 * 
 * @requirements 7.1, 7.2, 7.3
 */
@Component({
  selector: 'app-advanced-grading-system',
  standalone: true,
  imports: [CommonModule, RouterLink],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-7xl mx-auto p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Dashboard Chấm điểm</h1>
          <p class="text-gray-600 mt-1">Tổng quan và quản lý bài chờ chấm</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="refreshData()" [disabled]="gradingState.loading()"
                  class="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <svg class="w-4 h-4" [class.animate-spin]="gradingState.loading()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Làm mới
          </button>
          <a routerLink="/teacher/grading/rubrics" class="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            Quản lý Rubric
          </a>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl shadow-sm border p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Chờ chấm</p>
              <p class="text-3xl font-bold text-orange-600">{{ stats().totalPending }}</p>
            </div>
            <div class="p-3 bg-orange-100 rounded-full">
              <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Quá hạn</p>
              <p class="text-3xl font-bold text-red-600">{{ stats().overdueSubmissions }}</p>
            </div>
            <div class="p-3 bg-red-100 rounded-full">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-sm border p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Đã chấm hôm nay</p>
              <p class="text-3xl font-bold text-green-600">{{ stats().recentlyGraded }}</p>
            </div>
            <div class="p-3 bg-green-100 rounded-full">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-sm border p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Bản nháp</p>
              <p class="text-3xl font-bold text-blue-600">{{ gradingState.draftCount() }}</p>
            </div>
            <div class="p-3 bg-blue-100 rounded-full">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Pending Submissions List -->
      <div class="bg-white rounded-xl shadow-sm border">
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Bài chờ chấm điểm</h2>
          <span class="text-sm text-gray-500">Sắp xếp theo hạn nộp (cũ nhất trước)</span>
        </div>
        
        @if (gradingState.loading()) {
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        } @else if (sortedSubmissions().length === 0) {
          <div class="py-12 text-center">
            <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Không có bài chờ chấm</h3>
            <p class="text-gray-500">Tất cả bài nộp đã được chấm điểm</p>
          </div>
        } @else {
          <div class="divide-y">
            @for (submission of sortedSubmissions(); track submission.id) {
              <div class="px-6 py-4 hover:bg-gray-50 flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span class="text-blue-600 font-medium">{{ getInitials(submission.studentName) }}</span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ submission.studentName }}</p>
                    <p class="text-sm text-gray-500">{{ submission.assignmentTitle }}</p>
                  </div>
                </div>
                
                <div class="flex items-center gap-6">
                  <div class="text-right">
                    <p class="text-sm text-gray-600">Nộp lúc</p>
                    <p class="text-sm font-medium">{{ formatDate(submission.submittedAt) }}</p>
                  </div>
                  
                  @if (submission.isLate) {
                    <span class="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">Muộn</span>
                  }
                  
                  @if (isOverdue(submission)) {
                    <span class="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded-full">Quá hạn chấm</span>
                  }
                  
                  <a [routerLink]="['/teacher/grading/speed-grader', submission.assignmentId, submission.id]"
                     class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    Chấm điểm
                  </a>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Error Message -->
      @if (gradingState.error()) {
        <div class="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
          {{ gradingState.error() }}
        </div>
      }
    </div>
  `
})
export class AdvancedGradingSystemComponent implements OnInit {
  gradingState = inject(GradingStateService);
  
  // Computed
  stats = computed(() => this.gradingState.gradingStats());
  sortedSubmissions = computed(() => this.gradingState.sortedPendingSubmissions());
  
  ngOnInit(): void {
    this.loadData();
  }
  
  loadData(): void {
    this.gradingState.loadPendingSubmissions().subscribe();
  }
  
  refreshData(): void {
    this.gradingState.loadPendingSubmissions(true).subscribe();
  }
  
  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  
  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  isOverdue(submission: SubmissionDetail): boolean {
    if (!submission.dueDate) return false;
    const dueDate = new Date(submission.dueDate);
    const now = new Date();
    // Consider overdue if more than 3 days past due date
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    return now.getTime() - dueDate.getTime() > threeDaysMs;
  }
}

