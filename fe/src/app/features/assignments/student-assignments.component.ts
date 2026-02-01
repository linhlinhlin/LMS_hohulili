import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';

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
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  templateUrl: './student-assignments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAssignmentsComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private errorService = inject(ErrorHandlingService);

  // Loading state
  isLoading = signal<boolean>(true);

  // Mock assignments data
  assignments = signal<Assignment[]>([
    {
      id: 'assignment-1',
      title: 'BĂ i táº­p vá» Cáº¥u trĂºc TĂ u',
      description: 'PhĂ¢n tĂ­ch cáº¥u trĂºc tĂ u container vĂ  trĂ¬nh bĂ y bĂ¡o cĂ¡o chi tiáº¿t vá» cĂ¡c thĂ nh pháº§n chĂ­nh.',
      courseId: 'course-1',
      courseName: 'Ká»¹ thuáº­t TĂ u biá»ƒn CÆ¡ báº£n',
      instructor: {
        name: 'ThS. Nguyá»…n VÄƒn Háº£i',
        avatar: 'https://via.placeholder.com/150'
      },
      type: 'assignment',
      status: 'pending',
      priority: 'high',
      dueDate: new Date('2024-09-20'),
      maxGrade: 100,
      attachments: [
        {
          id: 'att-1',
          name: 'HÆ°á»›ng dáº«n bĂ i táº­p.pdf',
          url: '/attachments/assignment-1-guide.pdf',
          type: 'pdf',
          size: 1024000
        }
      ],
      instructions: 'Viáº¿t bĂ¡o cĂ¡o phĂ¢n tĂ­ch cáº¥u trĂºc tĂ u container vá»›i tá»‘i thiá»ƒu 2000 tá»«, bao gá»“m hĂ¬nh áº£nh minh há»a vĂ  tĂ i liá»‡u tham kháº£o.',
      attempts: 0,
      maxAttempts: 3,
      wordCount: 2000,
      fileUploads: []
    },
    {
      id: 'assignment-2',
      title: 'Quiz An toĂ n HĂ ng háº£i',
      description: 'Kiá»ƒm tra kiáº¿n thá»©c vá» quy Ä‘á»‹nh an toĂ n hĂ ng háº£i quá»‘c táº¿.',
      courseId: 'course-2',
      courseName: 'An toĂ n HĂ ng háº£i',
      instructor: {
        name: 'TS. Pháº¡m VÄƒn Nam',
        avatar: 'https://via.placeholder.com/150'
      },
      type: 'quiz',
      status: 'graded',
      priority: 'medium',
      dueDate: new Date('2024-09-15'),
      submittedAt: new Date('2024-09-14'),
      gradedAt: new Date('2024-09-16'),
      grade: 85,
      maxGrade: 100,
      feedback: 'Báº¡n Ä‘Ă£ lĂ m tá»‘t bĂ i quiz nĂ y. Cáº§n chĂº Ă½ thĂªm vá» cĂ¡c quy Ä‘á»‹nh STCW má»›i nháº¥t.',
      attachments: [],
      instructions: 'Tráº£ lá»i 20 cĂ¢u há»i tráº¯c nghiá»‡m trong thá»i gian 30 phĂºt.',
      attempts: 1,
      maxAttempts: 2,
      timeLimit: 30,
      fileUploads: []
    },
    {
      id: 'assignment-3',
      title: 'Dá»± Ă¡n Quáº£n lĂ½ Cáº£ng',
      description: 'Thiáº¿t káº¿ há»‡ thá»‘ng quáº£n lĂ½ cáº£ng biá»ƒn hiá»‡n Ä‘áº¡i.',
      courseId: 'course-3',
      courseName: 'Quáº£n lĂ½ Cáº£ng biá»ƒn',
      instructor: {
        name: 'ThS. Tráº§n Thá»‹ Lan',
        avatar: 'https://via.placeholder.com/150'
      },
      type: 'project',
      status: 'in-progress',
      priority: 'high',
      dueDate: new Date('2024-09-25'),
      maxGrade: 100,
      attachments: [
        {
          id: 'att-2',
          name: 'Template dá»± Ă¡n.docx',
          url: '/attachments/project-template.docx',
          type: 'doc',
          size: 512000
        }
      ],
      instructions: 'Thiáº¿t káº¿ há»‡ thá»‘ng quáº£n lĂ½ cáº£ng vá»›i cĂ¡c module chĂ­nh: quáº£n lĂ½ tĂ u, quáº£n lĂ½ hĂ ng hĂ³a, quáº£n lĂ½ nhĂ¢n viĂªn.',
      attempts: 1,
      maxAttempts: 1,
      fileUploads: [
        {
          id: 'file-1',
          name: 'BĂ¡o cĂ¡o tiáº¿n Ä‘á»™.docx',
          url: '/uploads/progress-report.docx',
          uploadedAt: new Date('2024-09-10'),
          size: 256000
        }
      ]
    }
  ]);

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

  private async loadAssignments(): Promise<void> {
    try {
      this.isLoading.set(true);
      
      // Simulate loading data
      await this.simulateDataLoading();
      
      // Force change detection to ensure component renders
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      
      console.log('đŸ”§ Student Assignments - Component initialized successfully');
      console.log('đŸ”§ Student Assignments - Assignments count:', this.assignments().length);
      console.log('đŸ”§ Student Assignments - Pending assignments:', this.pendingAssignments().length);
      
      this.errorService.showSuccess('BĂ i táº­p Ä‘Ă£ Ä‘Æ°á»£c táº£i thĂ nh cĂ´ng!', 'assignments');
      
    } catch (error) {
      this.errorService.handleApiError(error, 'assignments');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async simulateDataLoading(): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  applyFilters(): void {
    // Filters are applied automatically through computed signal
    console.log('Applying filters...');
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
    console.log('đŸ”§ Student Assignments - Start assignment:', assignmentId);
    this.router.navigate(['/student/assignments/work', assignmentId]).catch(error => {
      this.errorService.handleNavigationError(error, `/student/assignments/work/${assignmentId}`);
    });
  }

  viewAssignmentDetail(assignmentId: string): void {
    console.log('đŸ”§ Student Assignments - View assignment detail:', assignmentId);
    this.errorService.showInfo('TĂ­nh nÄƒng xem chi tiáº¿t bĂ i táº­p sáº½ Ä‘Æ°á»£c phĂ¡t triá»ƒn trong phiĂªn báº£n tiáº¿p theo', 'assignment');
  }

  viewSubmission(assignmentId: string): void {
    console.log('đŸ”§ Student Assignments - View submission:', assignmentId);
    this.errorService.showInfo('TĂ­nh nÄƒng xem bĂ i ná»™p sáº½ Ä‘Æ°á»£c phĂ¡t triá»ƒn trong phiĂªn báº£n tiáº¿p theo', 'submission');
  }

  viewGrade(assignmentId: string): void {
    console.log('đŸ”§ Student Assignments - View grade:', assignmentId);
    this.errorService.showInfo('TĂ­nh nÄƒng xem Ä‘iá»ƒm chi tiáº¿t sáº½ Ä‘Æ°á»£c phĂ¡t triá»ƒn trong phiĂªn báº£n tiáº¿p theo', 'grade');
  }

  goToCalendar(): void {
    console.log('đŸ”§ Student Assignments - Go to calendar');
    this.errorService.showInfo('TĂ­nh nÄƒng lá»‹ch há»c táº­p sáº½ Ä‘Æ°á»£c phĂ¡t triá»ƒn trong phiĂªn báº£n tiáº¿p theo', 'calendar');
  }

  goToGrades(): void {
    console.log('đŸ”§ Student Assignments - Go to grades');
    this.router.navigate(['/student/analytics']).catch(error => {
      this.errorService.handleNavigationError(error, '/student/analytics');
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'text-yellow-800 bg-yellow-100';
      case 'in-progress':
        return 'text-blue-800 bg-blue-100';
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
        return 'Chá» lĂ m';
      case 'in-progress':
        return 'Äang lĂ m';
      case 'submitted':
        return 'ÄĂ£ ná»™p';
      case 'graded':
        return 'ÄĂ£ cháº¥m';
      case 'overdue':
        return 'QuĂ¡ háº¡n';
      default:
        return 'KhĂ´ng xĂ¡c Ä‘á»‹nh';
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
        return 'Trung bĂ¬nh';
      case 'low':
        return 'Tháº¥p';
      default:
        return 'KhĂ´ng xĂ¡c Ä‘á»‹nh';
    }
  }

  getTypeText(type: string): string {
    switch (type) {
      case 'quiz':
        return 'Quiz';
      case 'assignment':
        return 'BĂ i táº­p';
      case 'project':
        return 'Dá»± Ă¡n';
      case 'discussion':
        return 'Tháº£o luáº­n';
      default:
        return 'KhĂ´ng xĂ¡c Ä‘á»‹nh';
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
        return 'Kháº©n cáº¥p';
      case 'high':
        return 'Cao';
      case 'medium':
        return 'Trung bĂ¬nh';
      case 'low':
        return 'Tháº¥p';
      default:
        return 'KhĂ´ng xĂ¡c Ä‘á»‹nh';
    }
  }

  downloadAttachment(attachment: AssignmentAttachment): void {
    // Simulate file download
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    link.click();
    this.errorService.showSuccess(`Äang táº£i xuá»‘ng: ${attachment.name}`, 'download');
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

