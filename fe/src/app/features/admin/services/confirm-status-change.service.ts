import { Injectable, inject } from '@angular/core';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
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

  confirm(
    user: Pick<AdminUser, 'name'>,
    newStatus: UserAccountStatus,
    role: StatusChangeRole,
  ): Promise<boolean> {
    if (newStatus !== 'BLOCKED' && newStatus !== 'ACTIVE') {
      // No-op gate for unsupported statuses (RESTRICTED etc. — backend has
      // no UI affordance for these in the inline-edit dropdown today).
      return Promise.resolve(true);
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
}
