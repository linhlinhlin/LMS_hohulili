import { Component, signal, inject, OnInit, ChangeDetectionStrategy, computed, effect } from '@angular/core';
import { RouterModule } from '@angular/router';
import { OrganizationService, OrganizationStats } from '../../infrastructure/services/organization.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Organization, OrganizationType } from '../../../../shared/types/user.types';
import { KpiCardComponent } from '../../../../shared/components/admin/kpi-card/kpi-card.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

type TypeFilterValue = 'ALL' | OrganizationType;

@Component({
  selector: 'app-organization-list',
  imports: [RouterModule, KpiCardComponent, PaginationComponent],
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

  // Issue #254 (Phase 4): client-side filter + search.
  typeFilter = signal<TypeFilterValue>('ALL');
  searchQuery = signal<string>('');

  /** Filter + search applied trên list đã load. */
  filteredOrganizations = computed(() => {
    const filter = this.typeFilter();
    const query = this.searchQuery().trim().toLowerCase();
    return this.organizations().filter(org => {
      if (filter !== 'ALL' && org.type !== filter) return false;
      if (query && !org.name.toLowerCase().includes(query) && !org.code.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  });

  // Issue #256 (Phase 4 PR 2): pagination — FE-side slice trên filteredOrganizations.
  // List size hiện < 100, BE pagination defer khi list grow. PaginationComponent
  // 1-based currentPage. pageSize 12 khớp grid card layout.
  currentPage = signal<number>(1);
  readonly pageSize = 12;

  paginationInfo = computed(() => {
    const total = this.filteredOrganizations().length;
    const totalPages = Math.max(1, Math.ceil(total / this.pageSize));
    return { totalItems: total, totalPages };
  });

  paginatedOrganizations = computed(() => {
    const items = this.filteredOrganizations();
    const start = (this.currentPage() - 1) * this.pageSize;
    return items.slice(start, start + this.pageSize);
  });

  constructor() {
    // Reset về page 1 khi filter/search thay đổi (UX: user expects fresh view).
    effect(() => {
      this.typeFilter();
      this.searchQuery();
      this.currentPage.set(1);
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  /** Type badge meta (consistent với org-detail Phase 2). */
  readonly typeMeta: Record<OrganizationType, { label: string; cssClass: string }> = {
    PLATFORM: { label: 'Nền tảng', cssClass: 'badge-org-type badge-org-type--platform' },
    PARTNER:  { label: 'Đối tác',  cssClass: 'badge-org-type badge-org-type--partner' },
    INTERNAL: { label: 'Nội bộ',   cssClass: 'badge-org-type badge-org-type--internal' }
  };
  private readonly typeFallback = { label: 'Đối tác', cssClass: 'badge-org-type badge-org-type--partner' };
  typeMetaFor(type: OrganizationType | undefined): { label: string; cssClass: string } {
    return (type && this.typeMeta[type]) || this.typeFallback;
  }

  /** Type options cho filter dropdown — All + 3 enum values. */
  readonly typeFilterOptions: Array<{ value: TypeFilterValue; label: string }> = [
    { value: 'ALL', label: 'Tất cả loại' },
    { value: 'PLATFORM', label: 'Nền tảng' },
    { value: 'PARTNER', label: 'Đối tác' },
    { value: 'INTERNAL', label: 'Nội bộ' }
  ];

  /** Type options cho create form — PLATFORM bị ẩn (reserved cho HoLiLiHu). */
  readonly typeCreateOptions: Array<{ value: OrganizationType; label: string }> = [
    { value: 'PARTNER',  label: 'Đối tác — tổ chức ngoài' },
    { value: 'INTERNAL', label: 'Nội bộ — đơn vị nội bộ' }
  ];

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

  setTypeFilter(value: string): void {
    this.typeFilter.set(value as TypeFilterValue);
  }

  setSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  clearFilters(): void {
    this.typeFilter.set('ALL');
    this.searchQuery.set('');
  }

  hasActiveFilters = computed(() => this.typeFilter() !== 'ALL' || this.searchQuery().trim().length > 0);

  createOrg(name: string, code: string, description: string, tokenExpiryDays: number, type: string): void {
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
      tokenExpiryDays: tokenExpiryDays || 30,
      type: (type as OrganizationType) || 'PARTNER'
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
