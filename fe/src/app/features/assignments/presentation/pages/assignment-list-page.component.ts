import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AssignmentListState } from '../state/assignment-list.state';
import { AssignmentCardComponent } from '../components/assignment-card.component';
import { AssignmentFilterPanelComponent } from '../components/assignment-filter-panel.component';
import { AssignmentPaginationComponent } from '../components/assignment-pagination.component';
import { AssignmentLoadingComponent } from '../components/assignment-loading.component';

/**
 * Assignment List Page Component
 * Main container component for the student assignment list page
 * Orchestrates state management, component integration, and user interactions
 */
@Component({
  selector: 'app-assignment-list-page',
  imports: [
    CommonModule,
    RouterModule,
    AssignmentCardComponent,
    AssignmentFilterPanelComponent,
    AssignmentPaginationComponent,
    AssignmentLoadingComponent
  ],
  templateUrl: './assignment-list-page.component.html',
  styles: [`
    input[type="checkbox"]:indeterminate {
      background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M4 8h8'/%3e%3c/svg%3e");
      background-color: #3b82f6;
      background-size: 16px 16px;
      background-position: center;
      background-repeat: no-repeat;
    }
  `]
})
export class AssignmentListPageComponent implements OnInit {
  private authService = inject(AuthService);
  private showSelectionModeSignal = signal<boolean>(false);

  // ========================================
  // PUBLIC PROPERTIES
  // ========================================

  assignmentState = inject(AssignmentListState);
  showSelectionMode = this.showSelectionModeSignal.asReadonly();

  // ========================================
  // COMPUTED PROPERTIES
  // ========================================

  hasActiveFilters = computed(() => {
    const filters = this.assignmentState.filters();
    return !!(
      filters.searchQuery ||
      filters.status?.length ||
      filters.type?.length ||
      filters.priority?.length ||
      filters.courseId?.length ||
      filters.instructorId?.length ||
      filters.dateRange
    );
  });

  // ========================================
  // LIFECYCLE
  // ========================================

  ngOnInit(): void {
    this.loadInitialData();
  }

  // ========================================
  // PUBLIC METHODS
  // ========================================

  toggleViewMode(): void {
    this.assignmentState.toggleViewMode();
  }

  toggleSelectionMode(): void {
    this.showSelectionModeSignal.update(mode => !mode);
    if (!this.showSelectionModeSignal()) {
      this.assignmentState.clearSelection();
    }
  }

  clearSelection(): void {
    this.assignmentState.clearSelection();
  }

  refreshAssignments(): void {
    this.loadAssignments();
  }

  clearAllFilters(): void {
    this.assignmentState.clearFilters();
    this.loadAssignments();
  }

  markAsRead(): void {
    // TODO: Implement mark as read functionality
    console.log('Mark selected assignments as read');
    this.assignmentState.clearSelection();
  }

  // ========================================
  // EVENT HANDLERS
  // ========================================

  onFiltersChanged(filters: any): void {
    this.assignmentState.updateFilters(filters);
    this.loadAssignments();
  }

  onViewAssignment(assignmentId: string): void {
    this.assignmentState.navigateToAssignmentDetails(assignmentId);
  }

  onStartWorking(assignmentId: string): void {
    this.assignmentState.navigateToAssignment(assignmentId);
  }

  onContinueWorking(assignmentId: string): void {
    this.assignmentState.navigateToAssignment(assignmentId);
  }

  onBookmarkAssignment(assignmentId: string): void {
    // TODO: Implement bookmark functionality
    console.log('Bookmark assignment:', assignmentId);
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private loadInitialData(): void {
    const currentUser = this.authService.user();
    if (currentUser?.id) {
      this.loadAssignments();
    }
  }

  private loadAssignments(): void {
    const currentUser = this.authService.user();
    if (currentUser?.id) {
      this.assignmentState.loadAssignments(currentUser.id as any);
    }
  }
}

