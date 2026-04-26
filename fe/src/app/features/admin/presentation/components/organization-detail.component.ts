import { Component, signal, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { OrganizationService, OrgPaymentConfig } from '../../infrastructure/services/organization.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Organization, OrganizationInvite, OrgMember, OrganizationType } from '../../../../shared/types/user.types';
import { KpiCardComponent } from '../../../../shared/components/admin/kpi-card/kpi-card.component';
import { KebabMenuComponent, KebabAction } from '../../../../shared/components/admin/kebab-menu/kebab-menu.component';

type Tab = 'overview' | 'members' | 'invites' | 'settings' | 'payment-config' | 'stats';

const VALID_TABS: ReadonlySet<Tab> = new Set([
  'overview', 'members', 'invites', 'settings', 'payment-config', 'stats'
]);

@Component({
  selector: 'app-organization-detail',
  imports: [CommonModule, RouterModule, KpiCardComponent, KebabMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './organization-detail.component.html',
  styleUrl: './organization-detail.component.scss',
})
export class OrganizationDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orgService = inject(OrganizationService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private readonly authService = inject(AuthService);
  backRoute = computed(() => this.authService.userRole() === 'admin' ? '/admin/organizations' : '/org-admin/dashboard');

  org = signal<Organization | null>(null);
  members = signal<OrgMember[]>([]);
  invites = signal<OrganizationInvite[]>([]);
  isLoading = signal(true);
  // Phase 2 (#235): default 'overview' — landing card cho org info + multi-tenant
  // signals (type, isDefault). Deep-link via query param ?tab=members|invites...
  activeTab = signal<Tab>('overview');

  isCreatingInvite = signal(false);
  isSendingEmail = signal(false);
  newInviteCode = signal('');

  isUpdating = signal(false);
  editingTokenMemberId = signal('');

  // Payment config state
  paymentConfig = signal<OrgPaymentConfig | null>(null);
  isLoadingConfig = signal(false);
  isSavingConfig = signal(false);
  configPreviewPlatform = signal(20);
  configPreviewTeacher = signal(70);
  configPreviewOrgShare = computed(() => {
    const org = 100 - this.configPreviewPlatform() - this.configPreviewTeacher();
    return Math.round(org * 10) / 10;
  });
  configPreviewPlatformAmount = computed(() => Math.round(1000000 * this.configPreviewPlatform() / 100));
  configPreviewTeacherAmount = computed(() => Math.round(1000000 * this.configPreviewTeacher() / 100));
  configPreviewOrgAmount = computed(() => Math.round(1000000 * this.configPreviewOrgShare() / 100));
  configError = computed(() => {
    const sum = this.configPreviewPlatform() + this.configPreviewTeacher();
    if (sum > 100) return `Tổng phí nền tảng + giảng viên = ${sum}% > 100%`;
    if (this.configPreviewOrgShare() < 0) return 'Tỷ lệ tổ chức không thể âm';
    return '';
  });

  activeInvites = computed(() => this.invites().filter(i => i.status === 'ACTIVE'));

  // ---------------------------------------------------------------------
  // F-OA-4: KPI strip — surfaces aggregate org health (member count, role
  // breakdown, active invites) above the tab bar. Mirrors the kpi-card
  // pattern used by every other admin surface (CC-01).
  // ---------------------------------------------------------------------
  totalMembers = computed(() => this.members().length);
  activeMembers = computed(() => this.members().filter(m => m.enabled).length);
  teacherCount = computed(() =>
    this.members().filter(m => m.role?.toUpperCase() === 'TEACHER').length
  );
  studentCount = computed(() =>
    this.members().filter(m => m.role?.toUpperCase() === 'STUDENT').length
  );

  readonly tabs = [
    { key: 'overview' as Tab, label: 'Tổng quan' },
    { key: 'members' as Tab, label: 'Thành viên' },
    { key: 'invites' as Tab, label: 'Lời mời' },
    { key: 'stats' as Tab, label: 'Thống kê' },
    { key: 'payment-config' as Tab, label: 'Cấu hình doanh thu' },
    { key: 'settings' as Tab, label: 'Cài đặt' }
  ];

  // Phase 2 (#235): multi-tenant signals — type badge variant + label + isDefault.
  readonly orgTypeMeta: Record<OrganizationType, { label: string; cssClass: string }> = {
    PLATFORM: { label: 'Nền tảng', cssClass: 'badge-org-type badge-org-type--platform' },
    PARTNER:  { label: 'Đối tác',  cssClass: 'badge-org-type badge-org-type--partner' },
    INTERNAL: { label: 'Nội bộ',   cssClass: 'badge-org-type badge-org-type--internal' }
  };

  private orgId = '';

  ngOnInit(): void {
    this.orgId = this.route.snapshot.paramMap.get('id') || this.authService.currentUser()?.organizationId || '';
    if (!this.orgId) {
      this.isLoading.set(false);
      this.toast.error('Không tìm thấy tổ chức để quản lý');
      return;
    }
    // Phase 2 (#235): deep-link tab restore từ query param. Sub Subscribe để
    // pick up cả navigation trong cùng route (back/forward, share link).
    this.route.queryParamMap.subscribe(params => {
      const requested = params.get('tab') as Tab | null;
      if (requested && VALID_TABS.has(requested)) {
        this.activeTab.set(requested);
      }
    });
    this.loadAll();
    this.loadPaymentConfig();
  }

  /** Phase 2 (#235): chuyển tab + sync URL query param để deep-link / share. */
  selectTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private loadAll(): void {
    this.isLoading.set(true);
    this.orgService.getOrganization(this.orgId).subscribe({
      next: (org) => {
        this.org.set(org);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Không thể tải thông tin tổ chức');
        this.isLoading.set(false);
      }
    });
    this.loadMembers();
    this.loadInvites();
  }

  private loadMembers(): void {
    this.orgService.listMembers(this.orgId).subscribe({
      next: (members) => this.members.set(members),
      error: () => this.toast.error('Không thể tải danh sách thành viên')
    });
  }

  private loadInvites(): void {
    this.orgService.listInvites(this.orgId).subscribe({
      next: (invites) => this.invites.set(invites),
      error: () => this.toast.error('Không thể tải danh sách lời mời')
    });
  }

  /** ORG_ADMIN cannot edit token expiry for ADMIN/ORG_ADMIN members */
  canEditMember(member: OrgMember): boolean {
    const currentRole = this.authService.userRole();
    if (currentRole === 'admin') return true;
    const memberRole = member.role?.toUpperCase();
    return memberRole !== 'ADMIN' && memberRole !== 'ORG_ADMIN';
  }

  canRemoveMember(member: OrgMember): boolean {
    const currentUser = this.authService.currentUser();
    const currentRole = currentUser?.role?.toLowerCase();
    // ADMIN can remove anyone except themselves
    if (currentRole === 'admin') {
      return member.id !== currentUser?.id;
    }
    // ORG_ADMIN cannot remove ADMIN or other ORG_ADMIN, and cannot remove themselves
    const memberRole = member.role?.toLowerCase();
    if (memberRole === 'admin' || memberRole === 'org_admin') return false;
    return member.id !== currentUser?.id;
  }

  async removeMember(member: OrgMember): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa thành viên',
      message: `Bạn có chắc muốn xóa "${member.fullName}" (${member.email}) khỏi tổ chức?`,
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    this.orgService.removeMember(this.orgId, member.id).subscribe({
      next: () => {
        this.toast.success('Đã xóa thành viên', `"${member.fullName}" đã được xóa khỏi tổ chức`);
        this.loadMembers();
      },
      error: (err) => this.toast.error(err.error?.message || 'Không thể xóa thành viên')
    });
  }

  saveMemberTokenExpiry(memberId: string, value: string): void {
    const days = value.trim() === '' ? null : parseInt(value, 10);
    if (days !== null && (isNaN(days) || days < 1 || days > (this.org()?.tokenExpiryDays ?? 1095))) {
      this.toast.warning(`Giá trị phải từ 1 đến ${this.org()?.tokenExpiryDays ?? 1095} ngày, hoặc để trống cho mặc định`);
      return;
    }

    this.orgService.setMemberTokenExpiry(this.orgId, memberId, days).subscribe({
      next: () => {
        this.editingTokenMemberId.set('');
        this.toast.success('Đã cập nhật cấu hình token');
        this.loadMembers();
      },
      error: (err) => this.toast.error(err.error?.message || 'Không thể cập nhật cấu hình token')
    });
  }

  createInviteCode(): void {
    this.isCreatingInvite.set(true);
    this.newInviteCode.set('');

    this.orgService.createInviteCode(this.orgId, { expiryDays: 90 }).subscribe({
      next: (invite) => {
        this.isCreatingInvite.set(false);
        this.newInviteCode.set(invite.code || '');
        this.toast.success('Đã tạo mã mời', 'Mã mời sẵn sàng để chia sẻ');
        this.loadInvites();
      },
      error: (err) => {
        this.isCreatingInvite.set(false);
        this.toast.error(err.error?.message || 'Không thể tạo mã mời');
      }
    });
  }

  sendEmailInvite(email: string): void {
    if (!email || !email.includes('@')) {
      this.toast.warning('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }
    this.isSendingEmail.set(true);

    this.orgService.sendEmailInvite(this.orgId, { email, expiryDays: 7 }).subscribe({
      next: () => {
        this.isSendingEmail.set(false);
        this.toast.success('Đã gửi lời mời', `Lời mời đã được gửi đến ${email}`);
        this.loadInvites();
      },
      error: (err) => {
        this.isSendingEmail.set(false);
        this.toast.error(err.error?.message || 'Không thể gửi lời mời');
      }
    });
  }

  async revokeInvite(invite: OrganizationInvite): Promise<void> {
    const label = invite.type === 'CODE'
      ? `mã mời "${invite.code}"`
      : `lời mời email "${invite.email}"`;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Thu hồi lời mời',
      message: `Bạn có chắc muốn thu hồi ${label}? Lời mời sẽ không thể sử dụng nữa.`,
      variant: 'warning',
      confirmText: 'Thu hồi',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    this.orgService.revokeInvite(this.orgId, invite.id).subscribe({
      next: () => {
        this.toast.success('Đã thu hồi lời mời');
        this.loadInvites();
      },
      error: (err) => this.toast.error(err.error?.message || 'Không thể thu hồi lời mời')
    });
  }

  updateOrg(name: string, description: string, tokenExpiryDays: number): void {
    if (!name.trim()) {
      this.toast.warning('Tên tổ chức là bắt buộc');
      return;
    }
    this.isUpdating.set(true);

    this.orgService.updateOrganization(this.orgId, {
      name: name.trim(),
      description: description.trim() || undefined,
      tokenExpiryDays: tokenExpiryDays || 30
    }).subscribe({
      next: (updated) => {
        this.org.set(updated);
        this.isUpdating.set(false);
        this.toast.success('Đã cập nhật tổ chức', 'Thay đổi đã được lưu thành công');
      },
      error: (err) => {
        this.isUpdating.set(false);
        this.toast.error(err.error?.message || 'Không thể cập nhật tổ chức');
      }
    });
  }

  private loadPaymentConfig(): void {
    this.isLoadingConfig.set(true);
    this.orgService.getPaymentConfig(this.orgId).subscribe({
      next: (config) => {
        this.paymentConfig.set(config);
        this.configPreviewPlatform.set(config.platformFeePct);
        this.configPreviewTeacher.set(config.teacherSharePct);
        this.isLoadingConfig.set(false);
      },
      error: () => {
        this.isLoadingConfig.set(false);
        // Use defaults silently — org may not have custom config yet
      }
    });
  }

  savePaymentConfig(platformFeeStr: string, teacherShareStr: string, minPayoutStr: string): void {
    const platformFeePct = parseFloat(platformFeeStr);
    const teacherSharePct = parseFloat(teacherShareStr);
    const minPayoutAmount = parseFloat(minPayoutStr);

    if (isNaN(platformFeePct) || isNaN(teacherSharePct) || isNaN(minPayoutAmount)) {
      this.toast.warning('Vui lòng nhập đầy đủ giá trị hợp lệ');
      return;
    }
    if (platformFeePct + teacherSharePct > 100) {
      this.toast.warning('Tổng phí nền tảng + giảng viên không thể vượt quá 100%');
      return;
    }
    if (platformFeePct < 0 || teacherSharePct < 0) {
      this.toast.warning('Tỷ lệ không thể âm');
      return;
    }
    if (minPayoutAmount < 10000) {
      this.toast.warning('Số tiền rút tối thiểu phải ít nhất 10.000 VND');
      return;
    }

    // Update preview signals
    this.configPreviewPlatform.set(platformFeePct);
    this.configPreviewTeacher.set(teacherSharePct);

    this.isSavingConfig.set(true);
    this.orgService.updatePaymentConfig(this.orgId, { platformFeePct, teacherSharePct, minPayoutAmount }).subscribe({
      next: (config) => {
        this.paymentConfig.set(config);
        this.isSavingConfig.set(false);
        this.toast.success('Đã cập nhật cấu hình doanh thu', `Platform ${config.platformFeePct}% / Giảng viên ${config.teacherSharePct}% / Tổ chức ${config.orgSharePct}%`);
      },
      error: (err) => {
        this.isSavingConfig.set(false);
        this.toast.error(err.error?.message || 'Không thể cập nhật cấu hình');
      }
    });
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.toast.success('Đã sao chép mã mời vào clipboard');
    });
  }

  // ---------------------------------------------------------------------
  // F-OA-4: Per-row kebab menus — replaces the inline "Xóa" / "Thu hồi"
  // text buttons that were the only row action. Mirrors admin-shared kebab
  // pattern (PR #219) — every admin table now uses the same overflow
  // surface.
  // ---------------------------------------------------------------------
  memberRowActions(member: OrgMember): KebabAction[] {
    const actions: KebabAction[] = [];

    if (this.canEditMember(member)) {
      actions.push({
        key: 'edit-token',
        label: 'Chỉnh thời hạn token',
        ariaLabel: `Chỉnh thời hạn token cho ${member.fullName}`,
        // pencil
        icon: 'M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z',
      });
    }

    if (this.canRemoveMember(member)) {
      actions.push({
        key: 'remove',
        label: 'Xóa khỏi tổ chức',
        variant: 'danger',
        ariaLabel: `Xóa ${member.fullName} khỏi tổ chức`,
        // trash
        icon: 'M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z',
      });
    }

    return actions;
  }

  onMemberRowAction(member: OrgMember, key: string): void {
    switch (key) {
      case 'edit-token':
        this.editingTokenMemberId.set(member.id);
        break;
      case 'remove':
        this.removeMember(member);
        break;
    }
  }

  inviteRowActions(invite: OrganizationInvite): KebabAction[] {
    const actions: KebabAction[] = [];

    if (invite.code) {
      actions.push({
        key: 'copy',
        label: 'Sao chép mã',
        ariaLabel: `Sao chép mã mời ${invite.code}`,
        // copy
        icon: 'M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z',
      });
    }

    if (invite.status === 'ACTIVE') {
      actions.push({
        key: 'revoke',
        label: 'Thu hồi lời mời',
        variant: 'danger',
        ariaLabel: invite.type === 'CODE'
          ? `Thu hồi mã mời ${invite.code}`
          : `Thu hồi lời mời gửi đến ${invite.email}`,
        // x-circle
        icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z',
      });
    }

    return actions;
  }

  onInviteRowAction(invite: OrganizationInvite, key: string): void {
    switch (key) {
      case 'copy':
        if (invite.code) this.copyCode(invite.code);
        break;
      case 'revoke':
        this.revokeInvite(invite);
        break;
    }
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMIN': return 'bg-red-50 text-red-700 border border-red-200';
      case 'ORG_ADMIN': return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'TEACHER': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'STUDENT': return 'bg-green-50 text-green-700 border border-green-200';
      default: return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'ADMIN': return 'Quản trị';
      case 'ORG_ADMIN': return 'Chuyên viên';
      case 'TEACHER': return 'Giảng viên';
      case 'STUDENT': return 'Học viên';
      default: return role;
    }
  }
}
