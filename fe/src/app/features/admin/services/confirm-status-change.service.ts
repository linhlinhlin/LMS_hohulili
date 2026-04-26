import { Injectable, inject } from '@angular/core';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminUser, UserAccountStatus } from '../infrastructure/services/admin.service';

/**
 * Role label used to colour the wording of the status-change modal.
 *
 * - `admin`   → "Quản trị viên" emphasis (highest blast radius — see PR #178).
 * - `teacher` → standard "tài khoản" wording.
 * - `student` → standard "tài khoản" wording.
 *
 * Keep this enumeration narrow; the helper has to render Vietnamese-precise
 * copy and we don't want it to silently fall through to a generic message
 * when the caller passes an unexpected role.
 */
export type StatusChangeRole = 'admin' | 'teacher' | 'student';

/**
 * Single source of truth for the "Khóa / Kích hoạt tài khoản" confirmation
 * modal previously copy-pasted into three components (admins, teachers,
 * students). PR #178 introduced the gate; this service de-duplicates it
 * per epic #186 / issue #195.
 *
 * Anatomy (mirrors PR #178 exactly):
 * - `BLOCKED` → variant `danger`, title "Khóa tài khoản (Quản trị viên)?",
 *               message names the user and warns about access loss.
 * - `ACTIVE`  → variant `warning`, title "Kích hoạt tài khoản",
 *               message asks for re-activation confirmation.
 * - any other status → not gated (no-op `true`); callers should not be
 *   throwing arbitrary statuses through this helper but we don't want to
 *   regress positive-flow toggles.
 *
 * Usage:
 * ```ts
 * const ok = await this.confirmStatus.confirm(user, 'BLOCKED', 'admin');
 * if (!ok) { this.loadUsers(); return; }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ConfirmStatusChangeService {
  private confirmDialog = inject(ConfirmDialogService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  /**
   * Validate + confirm the status change. Returns `true` only if the caller
   * should proceed with the API call.
   *
   * Validation gates (issue #194 — F-AD2 followup):
   * 1. **Self-suspend** — admin clicks "Khóa" on their own row → blocked
   *    with toast. Highest priority because losing access mid-action would
   *    require an out-of-band recovery (DB write).
   * 2. **Sole-system-admin demote** — guarded by an additional helper
   *    `validateRoleChange()` (callers pass the candidate list). Not
   *    enforced here because the inline-edit role dropdown lives in three
   *    different components with three different data sources.
   *
   * Validation runs *before* the modal so the user never sees a confirm
   * dialog for an action that will never succeed.
   */
  async confirm(
    user: Pick<AdminUser, 'id' | 'name'>,
    newStatus: UserAccountStatus,
    role: StatusChangeRole,
  ): Promise<boolean> {
    // 1. Self-suspend gate — the admin and the user are the same person.
    //    Compare on `id` (UUID) which is stable; email/name can drift.
    const currentUserId = this.auth.currentUser()?.id;
    if (newStatus === 'BLOCKED' && currentUserId && currentUserId === user.id) {
      this.toast.error('Không thể khóa tài khoản của chính bạn');
      return false;
    }

    if (newStatus !== 'BLOCKED' && newStatus !== 'ACTIVE') {
      // No-op gate for unsupported statuses (RESTRICTED etc. — backend has
      // no UI affordance for these in the inline-edit dropdown today).
      return true;
    }

    const isBlock = newStatus === 'BLOCKED';
    const adminEmphasis = role === 'admin' ? ' Quản trị viên' : '';
    const blockMessage = role === 'admin'
      ? `Bạn có chắc muốn khóa tài khoản Quản trị viên ${user.name}? Họ sẽ mất quyền truy cập hệ thống cho đến khi được mở khóa.`
      : `Bạn có chắc muốn khóa tài khoản của ${user.name}? Họ sẽ không đăng nhập được cho đến khi mở khóa.`;

    return this.confirmDialog.confirm({
      title: isBlock ? `Khóa tài khoản${adminEmphasis}` : 'Kích hoạt tài khoản',
      message: isBlock
        ? blockMessage
        : `Bạn có chắc muốn kích hoạt lại tài khoản của ${user.name}?`,
      confirmText: isBlock ? 'Khóa tài khoản' : 'Kích hoạt',
      variant: isBlock ? 'danger' : 'warning',
    });
  }

  /**
   * Pre-flight gate for role demotion away from system ADMIN. Returns
   * `false` when the action would leave the system without a single
   * SYSTEM_ADMIN — UI must abort and surface the toast to the user.
   *
   * The list comes from the caller (admins surface) because that's where
   * the full set of admin users lives in memory — the helper does not
   * fetch on its own (would force a network round-trip on every dropdown
   * change).
   *
   * Heuristic: count rows whose `role` is `'admin'` (UI form) or `'ADMIN'`
   * (BE form) and `accountStatus === 'ACTIVE'`. If only one such row
   * exists and it is the row being demoted, deny.
   */
  validateRoleChange(
    user: Pick<AdminUser, 'id' | 'role' | 'accountStatus'>,
    newRole: string,
    allAdmins: readonly Pick<AdminUser, 'id' | 'role' | 'accountStatus'>[],
  ): boolean {
    const isCurrentlyAdmin = user.role.toUpperCase() === 'ADMIN';
    const becomingNonAdmin = newRole.toUpperCase() !== 'ADMIN';

    if (!isCurrentlyAdmin || !becomingNonAdmin) {
      return true;
    }

    const activeAdmins = allAdmins.filter(
      (u) =>
        u.role.toUpperCase() === 'ADMIN' &&
        u.accountStatus === 'ACTIVE',
    );

    // The only remaining ACTIVE system admin would be the one being
    // demoted → deny. Comparing on id is robust to BE/UI casing drift.
    if (activeAdmins.length <= 1 && activeAdmins.some((u) => u.id === user.id)) {
      this.toast.error('Hệ thống cần ít nhất 1 Quản trị viên hệ thống');
      return false;
    }

    return true;
  }
}
