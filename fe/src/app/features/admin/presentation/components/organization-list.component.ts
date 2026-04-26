import { Component, signal, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { OrganizationService, OrganizationStats } from '../../infrastructure/services/organization.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Organization } from '../../../../shared/types/user.types';
import { KpiCardComponent } from '../../../../shared/components/admin/kpi-card/kpi-card.component';

@Component({
  selector: 'app-organization-list',
  imports: [RouterModule, KpiCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './organization-list.component.html',
  styleUrl: './organization-list.component.scss',
})
export class OrganizationListComponent implements OnInit {
  private orgService = inject(OrganizationService);
  private toast = inject(ToastService);
  private authService = inject(AuthService);

  organizations = signal<Organization[]>([]);
  stats = signal<OrganizationStats | null>(null);
  isLoading = signal(true);
  showCreateForm = signal(false);
  isCreating = signal(false);
  canCreateOrganizations = computed(() => this.authService.userRole() === 'admin');

  ngOnInit(): void {
    this.loadOrganizations();
    if (this.canCreateOrganizations()) {
      this.loadStats();
    }
  }

  loadOrganizations(): void {
    this.isLoading.set(true);
    this.orgService.listOrganizations().subscribe({
      next: (orgs) => {
        this.organizations.set(orgs);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Không thể tải danh sách tổ chức');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Load aggregate KPI stats. Only ADMIN role can call /stats endpoint —
   * ORG_ADMIN sees their own org list scoped, doesn't need fleet-wide stats.
   * Fail silently if endpoint not authorized — KPI strip just doesn't render.
   */
  private loadStats(): void {
    this.orgService.getStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: () => {
        // Silent fail: KPI strip simply hidden via @if(stats())
      }
    });
  }

  createOrg(name: string, code: string, description: string, tokenExpiryDays: number): void {
    if (!this.canCreateOrganizations()) {
      this.showCreateForm.set(false);
      this.toast.warning('ORG_ADMIN chỉ có thể quản lý tổ chức hiện tại, không thể tạo tổ chức mới');
      return;
    }

    if (!name.trim() || !code.trim()) {
      this.toast.warning('Tên và mã tổ chức là bắt buộc');
      return;
    }
    this.isCreating.set(true);

    this.orgService.createOrganization({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      tokenExpiryDays: tokenExpiryDays || 30
    }).subscribe({
      next: (org) => {
        this.showCreateForm.set(false);
        this.isCreating.set(false);
        this.toast.success('Tạo tổ chức thành công', `Đã tạo "${org.name}" (${org.code})`);
        this.loadOrganizations();
      },
      error: (err) => {
        this.isCreating.set(false);
        this.toast.error(err.error?.message || 'Tạo tổ chức thất bại');
      }
    });
  }
}
