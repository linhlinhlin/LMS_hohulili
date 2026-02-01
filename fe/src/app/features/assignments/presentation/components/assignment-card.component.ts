import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AssignmentView } from '../../application/use-cases/get-student-assignments.use-case';

/**
 * Assignment Card Component
 * Displays assignment information in both list and grid layouts
 * Follows Angular 20 patterns with standalone components and signals
 */
@Component({
  selector: 'app-assignment-card',
  imports: [CommonModule, RouterModule],
  templateUrl: './assignment-card.component.html',
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class AssignmentCardComponent {
  // ========================================
  // INPUTS
  // ========================================

  assignment = input.required<AssignmentView>();
  viewMode = input<'list' | 'grid'>('list');
  showSelection = input<boolean>(false);
  isSelected = input<boolean>(false);

  // ========================================
  // OUTPUTS
  // ========================================

  assignmentSelected = output<string>();
  viewDetails = output<string>();
  startWorking = output<string>();
  continueWorking = output<string>();
  viewSubmission = output<string>();
  bookmark = output<string>();

  // ========================================
  // INTERNAL STATE
  // ========================================

  private isBookmarkedSignal = signal<boolean>(false);

  // ========================================
  // COMPUTED PROPERTIES
  // ========================================

  isBookmarked = this.isBookmarkedSignal.asReadonly();

  // ========================================
  // EVENT HANDLERS
  // ========================================

  onSelectionChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.assignmentSelected.emit(this.assignment().id);
    }
  }

  onViewDetails(event: Event): void {
    event.stopPropagation();
    this.viewDetails.emit(this.assignment().id);
  }

  onStartWorking(event: Event): void {
    event.stopPropagation();
    this.startWorking.emit(this.assignment().id);
  }

  onContinueWorking(event: Event): void {
    event.stopPropagation();
    this.continueWorking.emit(this.assignment().id);
  }

  onViewSubmission(event: Event): void {
    event.stopPropagation();
    this.viewSubmission.emit(this.assignment().id);
  }

  onBookmark(event: Event): void {
    event.stopPropagation();
    this.isBookmarkedSignal.update(bookmarked => !bookmarked);
    this.bookmark.emit(this.assignment().id);
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  getPriorityBadgeClasses(): string {
    const priority = this.assignment().priority;
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getPriorityText(): string {
    const priority = this.assignment().priority;
    switch (priority) {
      case 'urgent':
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

  getDueDateClasses(): string {
    const assignment = this.assignment();
    if (assignment.isOverdue) {
      return 'text-red-600 font-medium';
    } else if (assignment.daysUntilDue <= 3) {
      return 'text-orange-600 font-medium';
    } else {
      return 'text-gray-600';
    }
  }

  formatDueDate(): string {
    const assignment = this.assignment();
    const now = new Date();
    const dueDate = assignment.dueDate;

    if (assignment.isOverdue) {
      return `QuĂ¡ háº¡n ${Math.abs(assignment.daysUntilDue)} ngĂ y`;
    } else if (assignment.daysUntilDue === 0) {
      return 'HĂ´m nay';
    } else if (assignment.daysUntilDue === 1) {
      return 'NgĂ y mai';
    } else if (assignment.daysUntilDue <= 7) {
      return `${assignment.daysUntilDue} ngĂ y ná»¯a`;
    } else {
      return dueDate.toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'short'
      });
    }
  }

  getSubmissionStatusText(): string {
    const status = this.assignment().submissionStatus;
    switch (status) {
      case 'submitted':
        return 'ÄĂ£ ná»™p';
      case 'graded':
        return 'ÄĂ£ cháº¥m';
      case 'draft':
        return 'Báº£n nhĂ¡p';
      default:
        return 'ChÆ°a ná»™p';
    }
  }

  getTypeText(): string {
    const type = this.assignment().type;
    switch (type) {
      case 'assignment':
        return 'BĂ i táº­p';
      case 'quiz':
        return 'BĂ i kiá»ƒm tra';
      case 'project':
        return 'Dá»± Ă¡n';
      case 'discussion':
        return 'Tháº£o luáº­n';
      default:
        return 'BĂ i táº­p';
    }
  }
}

