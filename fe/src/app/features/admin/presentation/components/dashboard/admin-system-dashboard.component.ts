import { Component, input, output, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SystemAnalytics } from '../../../infrastructure/services/admin.service';
import { SystemHealthService } from '../../../infrastructure/services/system-health.service';
import { PendingApproval } from './dashboard.types';
import { DialogComponent } from '../../../../../shared/components/dialog/dialog.component';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { KpiCardComponent } from '../../../../../shared/components/admin/kpi-card/kpi-card.component';
import { DateRangeToggleComponent } from '../../../../../shared/components/admin/date-range-toggle/date-range-toggle.component';

@Component({
  selector: 'app-admin-system-dashboard',
  imports: [CommonModule, RouterLink, DialogComponent, IconComponent, KpiCardComponent, DateRangeToggleComponent],
  templateUrl: './admin-system-dashboard.component.html',
  styleUrl: './admin-system-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminSystemDashboardComponent implements OnInit {
  // F-06: backend health is read from /actuator/health (real ping), not from
  // the synthetic systemHealth object the analytics API used to imply.
  protected health = inject(SystemHealthService);

  // --- Inputs from parent ---
  analytics = input.required<SystemAnalytics>();
  pendingApprovals = input.required<PendingApproval[]>();
  isLoading = input.required<boolean>();
  isLoadingPending = input.required<boolean>();
  // F-P2: parent owns the selected window so navigation back to the
  // dashboard preserves the choice.
  windowDays = input<number>(30);

  ngOnInit(): void {
    // Fire and forget — service flips its own loading signal during the probe.
    this.health.refresh();
  }

  refreshHealth(): void {
    this.health.refresh();
  }

  // --- Outputs to parent ---
  courseApproved = output<string>();
  courseRejected = output<{ id: string; reason: string }>();
  windowDaysChange = output<number>();

  // --- Reject modal state (mirrors org-admin pattern from PR #145) ---
  rejectModalOpen = signal(false);
  private pendingRejectId = signal<string | null>(null);
  pendingRejectName = signal('');
  rejectReason = signal('');
  rejecting = signal(false);
  rejectReasonValid = computed(() => this.rejectReason().trim().length >= 10);

  // --- Actions ---
  approveCourse(courseId: string): void {
    this.courseApproved.emit(courseId);
  }

  openRejectModal(courseId: string, courseName: string): void {
    this.pendingRejectId.set(courseId);
    this.pendingRejectName.set(courseName);
    this.rejectReason.set('');
    this.rejectModalOpen.set(true);
  }

  closeRejectModal(): void {
    this.rejectModalOpen.set(false);
    this.pendingRejectId.set(null);
    this.pendingRejectName.set('');
    this.rejectReason.set('');
  }

  confirmReject(): void {
    const id = this.pendingRejectId();
    if (!id || !this.rejectReasonValid() || this.rejecting()) return;
    this.courseRejected.emit({ id, reason: this.rejectReason().trim() });
    this.closeRejectModal();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN');
  }
}
