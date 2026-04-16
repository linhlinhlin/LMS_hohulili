import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { OrganizationService } from '../../infrastructure/services/organization.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Organization } from '../../../../shared/types/user.types';

@Component({
  selector: 'app-organization-list',
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './organization-list.component.html',
  styleUrl: './organization-list.component.scss',
})
export class OrganizationListComponent implements OnInit {
  private orgService = inject(OrganizationService);
  private toast = inject(ToastService);

  organizations = signal<Organization[]>([]);
  isLoading = signal(true);
  showCreateForm = signal(false);
  isCreating = signal(false);

  ngOnInit(): void {
    this.loadOrganizations();
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

  createOrg(name: string, code: string, description: string, tokenExpiryDays: number): void {
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
