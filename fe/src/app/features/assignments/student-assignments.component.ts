import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { AssignmentApi, StudentAssignmentResponse } from '../../api/client/assignment.api';

interface Assignment {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseName: string;
  instructor: {
    name: string;
    avatar: string;
  };
  type: 'quiz' | 'assignment' | 'project' | 'discussion';
  status: 'pending' | 'in-progress' | 'submitted' | 'graded' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  dueDate: Date;
  submittedAt?: Date;
  gradedAt?: Date;
  grade?: number;
  maxGrade: number;
  feedback?: string;
  attachments: AssignmentAttachment[];
  instructions: string;
  rubric?: AssignmentRubric[];
  attempts: number;
  maxAttempts: number;
  timeLimit?: number; // in minutes
  wordCount?: number;
  fileUploads: AssignmentFile[];
}

interface AssignmentAttachment {
  id: string;
  name: string;
  url: string;
  type: 'pdf' | 'doc' | 'image' | 'video' | 'other';
  size: number;
}

interface AssignmentRubric {
  criterion: string;
  description: string;
  points: number;
  grade?: number;
}

interface AssignmentFile {
  id: string;
  name: string;
  url: string;
  uploadedAt: Date;
  size: number;
}

interface AssignmentFilter {
  status: string[];
  type: string[];
  priority: string[];
  course: string[];
  sortBy: 'dueDate' | 'title' | 'priority' | 'status';
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-student-assignments',
  imports: [RouterModule, FormsModule, LoadingComponent],
  templateUrl: './student-assignments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAssignmentsComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private errorService = inject(ErrorHandlingService);
  private assignmentApi = inject(AssignmentApi);

  // Loading state
  isLoading = signal<boolean>(true);

  assignments = signal<Assignment[]>([]);

  filters: AssignmentFilter = {
    status: [],
    type: [],
    priority: [],
    course: [],
    sortBy: 'dueDate',
    sortOrder: 'asc'
  };

  // Computed values
  pendingAssignments = computed(() => 
    this.assignments().filter(assignment => assignment.status === 'pending')
  );

  submittedAssignments = computed(() => 
    this.assignments().filter(assignment => assignment.status === 'submitted' || assignment.status === 'graded')
  );

  overdueAssignments = computed(() => 
    this.assignments().filter(assignment => 
      assignment.status === 'pending' && this.isOverdue(assignment.dueDate)
    )
  );

  filteredAssignments = computed(() => {
    let assignments = [...this.assignments()];

    // Apply status filter
    if (this.filters.status.length > 0 && this.filters.status[0]) {
      assignments = assignments.filter(assignment => assignment.status === this.filters.status[0]);
    }

    // Apply type filter
    if (this.filters.type.length > 0 && this.filters.type[0]) {
      assignments = assignments.filter(assignment => assignment.type === this.filters.type[0]);
    }

    // Apply priority filter
    if (this.filters.priority.length > 0 && this.filters.priority[0]) {
      assignments = assignments.filter(assignment => assignment.priority === this.filters.priority[0]);
    }

    // Apply sorting
    assignments.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (this.filters.sortBy) {
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'priority':
          const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'dueDate':
        default:
          aValue = a.dueDate;
          bValue = b.dueDate;
          break;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return this.filters.sortOrder === 'desc' 
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return this.filters.sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      }
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return this.filters.sortOrder === 'desc' 
          ? bValue.getTime() - aValue.getTime()
          : aValue.getTime() - bValue.getTime();
      }
      
      return 0;
    });

    return assignments;
  });

  ngOnInit(): void {
    this.loadAssignments();
  }

  private loadAssignments(): void {
    this.isLoading.set(true);
    this.assignmentApi.getStudentAssignments().subscribe({
      next: (response) => {
        const items = response.data || [];
        this.assignments.set(items.map(item => this.mapToAssignment(item)));
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorService.addError({ message: 'Không thể tải danh sách bài tập', type: 'error', context: 'assignment' });
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private mapToAssignment(item: StudentAssignmentResponse): Assignment {
    const now = new Date();
    const dueDate = item.dueDate ? new Date(item.dueDate) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = item.isLate || (dueDate < now && item.status === 'NOT_SUBMITTED');

    let status: Assignment['status'] = 'pending';
    switch (item.status) {
      case 'GRADED': status = 'graded'; break;
      case 'SUBMITTED': case 'RESUBMITTED': status = 'submitted'; break;
      case 'LATE': status = 'submitted'; break;
      case 'OVERDUE': status = 'overdue'; break;
      case 'NOT_SUBMITTED': status = isOverdue ? 'overdue' : 'pending'; break;
    }

    let priority: Assignment['priority'] = 'medium';
    if (isOverdue) priority = 'high';
    else if (daysUntilDue <= 3) priority = 'high';
    else if (daysUntilDue <= 7) priority = 'medium';
    else priority = 'low';

    return {
      id: item.id,
      title: item.title,
      description: item.description || item.instructions || '',
      courseId: item.courseId,
      courseName: item.courseName,
      instructor: { name: '', avatar: '' },
      type: 'assignment',
      status,
      priority,
      dueDate,
      submittedAt: item.submittedAt ? new Date(item.submittedAt) : undefined,
      gradedAt: item.gradedAt ? new Date(item.gradedAt) : undefined,
      grade: item.score,
      maxGrade: item.maxScore,
      feedback: item.feedback,
      attachments: [],
      instructions: item.instructions || item.description || '',
      attempts: 0,
      maxAttempts: item.maxAttempts || 1,
      fileUploads: item.fileUrl ? [{ id: '1', name: item.fileName || 'file', url: item.fileUrl, uploadedAt: new Date(), size: 0 }] : []
    };
  }

  applyFilters(): void {
    // Filters are applied automatically through computed signal
  }

  clearFilters(): void {
    this.filters = {
      status: [],
      type: [],
      priority: [],
      course: [],
      sortBy: 'dueDate',
      sortOrder: 'asc'
    };
  }

  startAssignment(assignmentId: string): void {
    this.router.navigate(['/student/assignments/work', assignmentId]).catch(error => {
      this.errorService.handleNavigationError(error, `/student/assignments/work/${assignmentId}`);
    });
  }

  viewAssignmentDetail(assignmentId: string): void {
    this.errorService.showInfo('Tính năng xem chi tiết bài tập sẽ được phát triển trong phiên bản tiếp theo', 'assignment');
  }

  viewSubmission(assignmentId: string): void {
    this.errorService.showInfo('Tính năng xem bài nộp sẽ được phát triển trong phiên bản tiếp theo', 'submission');
  }

  viewGrade(assignmentId: string): void {
    this.errorService.showInfo('Tính năng xem điểm chi tiết sẽ được phát triển trong phiên bản tiếp theo', 'grade');
  }

  goToCalendar(): void {
    this.errorService.showInfo('Tính năng lịch học tập sẽ được phát triển trong phiên bản tiếp theo', 'calendar');
  }

  goToGrades(): void {
    this.router.navigate(['/student/analytics']).catch(error => {
      this.errorService.handleNavigationError(error, '/student/analytics');
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'text-yellow-800 bg-yellow-100';
      case 'in-progress':
        return 'text-[#004BB5] bg-[#0056D2]/10';
      case 'submitted':
        return 'text-green-800 bg-green-100';
      case 'graded':
        return 'text-purple-800 bg-purple-100';
      case 'overdue':
        return 'text-red-800 bg-red-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'Chờ làm';
      case 'in-progress':
        return 'Đang làm';
      case 'submitted':
        return 'Đã nộp';
      case 'graded':
        return 'Đã chấm';
      case 'overdue':
        return 'Quá hạn';
      default:
        return 'Không xác định';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high':
        return 'text-red-800 bg-red-100';
      case 'medium':
        return 'text-yellow-800 bg-yellow-100';
      case 'low':
        return 'text-green-800 bg-green-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  }

  getPriorityText(priority: string): string {
    switch (priority) {
      case 'high':
        return 'Cao';
      case 'medium':
        return 'Trung bình';
      case 'low':
        return 'Thấp';
      default:
        return 'Không xác định';
    }
  }

  getTypeText(type: string): string {
    switch (type) {
      case 'quiz':
        return 'Quiz';
      case 'assignment':
        return 'Bài tập';
      case 'project':
        return 'Dự án';
      case 'discussion':
        return 'Thảo luận';
      default:
        return 'Không xác định';
    }
  }

  isOverdue(dueDate: Date): boolean {
    return new Date() > dueDate;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }

  // Enhanced features
  getDaysUntilDue(dueDate: Date): number {
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getUrgencyLevel(assignment: Assignment): 'low' | 'medium' | 'high' | 'critical' {
    const daysUntilDue = this.getDaysUntilDue(assignment.dueDate);
    
    if (assignment.status === 'overdue') return 'critical';
    if (daysUntilDue <= 1) return 'critical';
    if (daysUntilDue <= 3) return 'high';
    if (daysUntilDue <= 7) return 'medium';
    return 'low';
  }

  getUrgencyClass(urgency: string): string {
    switch (urgency) {
      case 'critical':
        return 'text-red-800 bg-red-100 border-red-200';
      case 'high':
        return 'text-orange-800 bg-orange-100 border-orange-200';
      case 'medium':
        return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-green-800 bg-green-100 border-green-200';
      default:
        return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  }

  getUrgencyText(urgency: string): string {
    switch (urgency) {
      case 'critical':
        return 'Khẩn cấp';
      case 'high':
        return 'Cao';
      case 'medium':
        return 'Trung bình';
      case 'low':
        return 'Thấp';
      default:
        return 'Không xác định';
    }
  }

  downloadAttachment(attachment: AssignmentAttachment): void {
    // Simulate file download
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    link.click();
    this.errorService.showSuccess(`Đang tải xuống: ${attachment.name}`, 'download');
  }

  getTotalAssignments(): number {
    return this.assignments().length;
  }

  getCompletedAssignments(): number {
    return this.assignments().filter(a => a.status === 'graded').length;
  }

  getAverageGrade(): number {
    const gradedAssignments = this.assignments().filter(a => a.grade !== undefined);
    if (gradedAssignments.length === 0) return 0;
    return gradedAssignments.reduce((sum, a) => sum + (a.grade || 0), 0) / gradedAssignments.length;
  }

  getUpcomingAssignments(): Assignment[] {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return this.assignments().filter(assignment => 
      assignment.dueDate >= today && 
      assignment.dueDate <= nextWeek &&
      (assignment.status === 'pending' || assignment.status === 'in-progress')
    );
  }

  getOverdueAssignments(): Assignment[] {
    const today = new Date();
    return this.assignments().filter(assignment => 
      assignment.dueDate < today && 
      (assignment.status === 'pending' || assignment.status === 'in-progress')
    );
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getAssignmentProgress(assignment: Assignment): number {
    if (assignment.status === 'graded') return 100;
    if (assignment.status === 'submitted') return 90;
    if (assignment.status === 'in-progress') return 50;
    return 0;
  }
}

