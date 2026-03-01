# Organization Management Audit Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 11 bugs (4 P0, 5 P1, 2 P2) found in Organization management CoT audit — prevent silent org overwrite, add role guards, improve invite UX.

**Architecture:** All fixes are minimal, targeted changes following existing patterns in the codebase. Backend fixes use the same guard patterns already established in `UserControllerV3`. Frontend fixes use existing signal patterns (Angular 20 signals, inject()). No new files needed — all modifications to existing files.

**Tech Stack:** Java 21 / Spring Boot 3.2 / Angular 20.3 / Signals

---

## Task 1: Backend — OrganizationControllerV3 Guards (P0 + P1)

**Fixes:** P0 #1 (addMember no org check), P0 #3 (self-removal), P0 #4 (role guard removeMember), P1 #8 (role guard setMemberTokenExpiry)

**Files:**
- Modify: `backend/src/main/java/com/example/lms/identity/infrastructure/web/OrganizationControllerV3.java`

**Context:** `UserControllerV3` already has the pattern for role guards:
```java
if (isOrgAdmin(currentUser)) {
    Optional<UserJpaEntity> target = userRepository.findById(userId);
    if (target.isPresent() && isAdminRole(target.get().getRole())) {
        return ResponseEntity.status(403)...
    }
}
```
We replicate this pattern in `OrganizationControllerV3` for member operations.

**Step 1: Fix `addMember()` — check if user already in another org**

In `addMember()` method (around line 148, after the UUID validation and before `user.setOrganizationId(id)`), add:

```java
// Check if user is already in a different org
if (user.getOrganizationId() != null && !id.equals(user.getOrganizationId())) {
    return ResponseEntity.badRequest().body(ApiResponse.error(
        "Người dùng đã thuộc tổ chức khác. Vui lòng xóa khỏi tổ chức hiện tại trước."));
}
```

**Step 2: Fix `removeMember()` — block self-removal + role guard**

In `removeMember()` method (around line 158, after `verifyOrgAccess` and before the user lookup), add:

```java
// Prevent self-removal
if (currentUser.getId().equals(userId)) {
    return ResponseEntity.badRequest().body(ApiResponse.error(
        "Không thể tự xóa chính mình khỏi tổ chức"));
}
```

After finding the user (around line 162), add role guard:

```java
// ORG_ADMIN cannot remove ADMIN or other ORG_ADMIN
if (isOrgAdmin(currentUser) && isAdminRole(user)) {
    return ResponseEntity.status(403).body(ApiResponse.error(
        "Không có quyền xóa quản trị viên khỏi tổ chức"));
}
```

Where `isAdminRole(UserJpaEntity)` checks `user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.ORG_ADMIN`. This method likely already exists or can be a simple inline check on the user's role.

**Step 3: Fix `setMemberTokenExpiry()` — add role guard**

In `setMemberTokenExpiry()` method (around line 188, after finding the user), add:

```java
// ORG_ADMIN cannot modify token for ADMIN or other ORG_ADMIN
if (isOrgAdmin(currentUser) && isAdminRole(user)) {
    return ResponseEntity.status(403).body(ApiResponse.error(
        "Không có quyền thay đổi cấu hình token của quản trị viên"));
}
```

**Step 4: Add audit logging for member operations**

Add `log.info()` calls at the end of `addMember()`, `removeMember()`, and `setMemberTokenExpiry()`:

```java
log.info("Member added: userId={} to orgId={} by={}", userId, id, currentUser.getId());
log.info("Member removed: userId={} from orgId={} by={}", userId, id, currentUser.getId());
log.info("Token config updated: userId={} orgId={} days={} by={}", userId, id, request.tokenExpiryDays(), currentUser.getId());
```

**Step 5: Build and verify**

Run: `cd backend && docker compose build api 2>&1 | tail -20`
Expected: BUILD SUCCESS

**Step 6: Commit**

```bash
git add backend/src/main/java/com/example/lms/identity/infrastructure/web/OrganizationControllerV3.java
git commit -m "fix(org): P0 guards — block cross-org add, self-removal, role-based member ops"
```

---

## Task 2: Backend — AcceptInviteUseCase Guard (P0)

**Fixes:** P0 #2 (silent org switch on invite accept)

**Files:**
- Modify: `backend/src/main/java/com/example/lms/identity/application/usecase/AcceptInviteUseCase.java`

**Step 1: Fix `acceptInvite()` — warn when switching orgs**

In private `acceptInvite()` method (around line 96), the current code checks:
```java
if (org.getId().equals(user.getOrganizationId())) {
    throw new ValidationException("invite", "Bạn đã là thành viên của tổ chức này");
}
```

After this check, add a DIFFERENT check for users already in another org:
```java
// Block if user is already in a different org (must be removed first)
if (user.getOrganizationId() != null && !org.getId().equals(user.getOrganizationId())) {
    throw new ValidationException("invite",
        "Bạn đang thuộc tổ chức khác. Vui lòng liên hệ quản trị viên để chuyển tổ chức.");
}
```

**Design decision:** Block instead of silent overwrite. User must be explicitly removed from current org first. This follows Auth0/Okta pattern where org membership changes require admin action.

**Exception:** `acceptForNewUser()` is NOT affected because new users have `organizationId = null` (no existing org to protect). The guard only fires in the `acceptInvite()` private method used by `acceptByCode()` and `acceptByToken()`.

**Step 2: Build and verify**

Run: `cd backend && docker compose build api 2>&1 | tail -20`
Expected: BUILD SUCCESS

**Step 3: Commit**

```bash
git add backend/src/main/java/com/example/lms/identity/application/usecase/AcceptInviteUseCase.java
git commit -m "fix(org): P0 block silent org switch — require explicit removal first"
```

---

## Task 3: Backend — RegisterUserUseCaseV2 Error Handling (P1)

**Fixes:** P1 #5 (Wiii Org missing → silent null), P1 #6 (invalid invite → raw 404)

**Files:**
- Modify: `backend/src/main/java/com/example/lms/identity/application/usecase/RegisterUserUseCaseV2.java`

**Step 1: Fix default org assignment — fail explicitly if Wiii Org missing**

Replace lines 80-85 (the else block for default org):
```java
} else {
    // Default: assign to Wiii Org
    organizationRepository.findByCode(DEFAULT_ORG_CODE)
            .filter(org -> org.isEnabled())
            .ifPresent(org -> user.assignToOrganization(org.getId()));
}
```

With:
```java
} else {
    // Default: assign to Wiii Org — fail explicitly if not found
    Organization defaultOrg = organizationRepository.findByCode(DEFAULT_ORG_CODE)
            .filter(Organization::isEnabled)
            .orElse(null);
    if (defaultOrg != null) {
        user.assignToOrganization(defaultOrg.getId());
    } else {
        log.warn("Default organization '{}' not found or disabled — user {} will have no org",
                DEFAULT_ORG_CODE, command.email());
    }
}
```

**Design decision:** Log warning instead of throwing exception. A missing Wiii Org is an operational issue (admin deleted it), not a user error. The user should still be able to register; they just won't be in any org until an admin assigns them. This is the Canvas LMS pattern — users without org can still access global content.

**Step 2: Fix invite code error handling — wrap as ValidationException**

Wrap the invite acceptance in try-catch (lines 77-79):
```java
if (command.inviteCode() != null && !command.inviteCode().isBlank()) {
    try {
        java.util.UUID orgId = acceptInviteUseCase.acceptForNewUser(command.inviteCode().trim());
        user.assignToOrganization(orgId);
    } catch (EntityNotFoundException e) {
        throw new ValidationException("inviteCode", "Mã mời không hợp lệ hoặc đã hết hạn");
    } catch (IllegalStateException e) {
        throw new ValidationException("inviteCode", e.getMessage());
    }
}
```

This converts:
- `EntityNotFoundException` (code not found) → `ValidationException` with user-friendly message (400, not 404)
- `IllegalStateException` (org disabled) → `ValidationException` (400, not 500)

**Step 3: Build and verify**

Run: `cd backend && docker compose build api 2>&1 | tail -20`
Expected: BUILD SUCCESS

**Step 4: Commit**

```bash
git add backend/src/main/java/com/example/lms/identity/application/usecase/RegisterUserUseCaseV2.java
git commit -m "fix(org): P1 registration error handling — explicit Wiii Org warning + invite ValidationException"
```

---

## Task 4: Frontend — Register Invite Validation UX (P1)

**Fixes:** P1 #7 (no error feedback for invalid invite code)

**Files:**
- Modify: `fe/src/app/features/auth/register/register.component.ts`

**Step 1: Add `inviteCodeError` signal**

Near line 40 (where `inviteOrgName` is declared), add:
```typescript
readonly inviteCodeError = signal('');
```

**Step 2: Update `validateInviteCode()` method**

Replace the error handler in `validateInviteCode()` (around line 70):
```typescript
error: () => {
  this.inviteOrgName.set('');
}
```

With:
```typescript
error: () => {
  this.inviteOrgName.set('');
  this.inviteCodeError.set('Mã mời không hợp lệ hoặc đã hết hạn');
}
```

Also clear the error on successful validation (in the `next` handler):
```typescript
next: (invite) => {
  this.inviteOrgName.set(invite.organizationName || '');
  this.inviteCodeError.set('');
},
```

And clear when input is too short (in the early return):
```typescript
if (!code || code.trim().length < 3) {
  this.inviteOrgName.set('');
  this.inviteCodeError.set('');
  return;
}
```

**Step 3: Add error display in template**

After the green success banner `@if (inviteOrgName())` block (around line 293), add:
```html
@if (inviteCodeError()) {
  <div class="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    {{ inviteCodeError() }}
  </div>
}
```

**Step 4: Build and verify**

Run: `cd fe && npx ng build 2>&1 | tail -10`
Expected: 0 errors

**Step 5: Commit**

```bash
git add fe/src/app/features/auth/register/register.component.ts
git commit -m "fix(org): P1 register invite validation — show error for invalid codes"
```

---

## Task 5: Frontend — Join-Org Token→Code Fix (P1)

**Fixes:** P1 #9 (EMAIL token passed as invite code to register page)

**Files:**
- Modify: `fe/src/app/features/auth/join-org/join-org.component.ts`

**Step 1: Fix `inviteQueryForRegister()` method**

Find the method (around line 110-116):
```typescript
inviteQueryForRegister(): Record<string, string> {
    const inv = this.invite();
    if (inv?.code) return { invite: inv.code };
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) return { invite: token };
    return {};
}
```

The problem: When EMAIL invite has a token (not code), it passes the raw BASE64 token as `?invite=TOKEN` to the register page. Register page then calls `validateInviteCode(TOKEN)` which fails because tokens are not codes.

Fix: For EMAIL invites, don't pass to register. Instead, user should register first (without invite), then accept the email invite post-login.

```typescript
inviteQueryForRegister(): Record<string, string> {
    const inv = this.invite();
    if (inv?.code) return { invite: inv.code };
    // EMAIL invites use tokens, not codes — don't pass to register
    // User registers normally, then accepts invite post-login via /auth/join?token=...
    return {};
}
```

**Step 2: Build and verify**

Run: `cd fe && npx ng build 2>&1 | tail -10`
Expected: 0 errors

**Step 3: Commit**

```bash
git add fe/src/app/features/auth/join-org/join-org.component.ts
git commit -m "fix(org): P1 join-org — don't pass email token as invite code to register"
```

---

## Task 6: Frontend — Organization Detail Role Guards (P2)

**Fixes:** P2 #10 (hide delete button for ADMIN/ORG_ADMIN members)

**Files:**
- Modify: `fe/src/app/features/admin/presentation/components/organization-detail.component.ts`

**Step 1: Add `canRemoveMember()` helper method**

In the component class (near the other helper methods), add:

```typescript
canRemoveMember(member: OrgMember): boolean {
  const currentRole = this.authService.currentUser()?.role;
  // ADMIN can remove anyone except themselves
  if (currentRole === 'ADMIN' || currentRole === 'admin') {
    return member.id !== this.authService.currentUser()?.id;
  }
  // ORG_ADMIN cannot remove ADMIN or other ORG_ADMIN, and cannot remove themselves
  const memberRole = member.role?.toLowerCase();
  if (memberRole === 'admin' || memberRole === 'org_admin') return false;
  return member.id !== this.authService.currentUser()?.id;
}
```

Inject `AuthService` if not already injected:
```typescript
private readonly authService = inject(AuthService);
```

**Step 2: Wrap the delete button with `@if` guard**

Replace the delete button (around line 160-164):
```html
<button (click)="removeMember(member)"
        class="px-2.5 py-1 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        title="Xóa khỏi tổ chức">
  Xóa
</button>
```

With:
```html
@if (canRemoveMember(member)) {
  <button (click)="removeMember(member)"
          class="px-2.5 py-1 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          title="Xóa khỏi tổ chức">
    Xóa
  </button>
}
```

**Step 3: Add role badge styling to members table**

In the member row, the role display should use a more visible badge to distinguish ADMIN/ORG_ADMIN:
```html
@if (member.role?.toLowerCase() === 'admin' || member.role?.toLowerCase() === 'org_admin') {
  <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
    {{ getRoleLabel(member.role) }}
  </span>
} @else {
  <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
    {{ getRoleLabel(member.role) }}
  </span>
}
```

**Step 4: Build and verify**

Run: `cd fe && npx ng build 2>&1 | tail -10`
Expected: 0 errors

**Step 5: Commit**

```bash
git add fe/src/app/features/admin/presentation/components/organization-detail.component.ts
git commit -m "fix(org): P2 hide delete button for admin members + role badges"
```

---

## Verification Checklist

After all 6 tasks:

1. `cd backend && docker compose build api` → BUILD SUCCESS
2. `cd fe && npx ng build` → 0 errors
3. **Test: Add member already in org** → Should get 400 "Người dùng đã thuộc tổ chức khác"
4. **Test: ORG_ADMIN remove self** → Should get 400 "Không thể tự xóa"
5. **Test: ORG_ADMIN remove ADMIN** → Should get 403 "Không có quyền"
6. **Test: Accept invite when already in org** → Should get 400 "Bạn đang thuộc tổ chức khác"
7. **Test: Register with invalid invite** → Should get 400 (not 404) "Mã mời không hợp lệ"
8. **Test: Register form invalid invite** → Should show red error banner
9. **Test: Email invite join → register** → Should not pass token as invite code
10. **Test: Org detail member table** → ADMIN/ORG_ADMIN should NOT have delete button (for ORG_ADMIN viewer)

---

## Files Summary

| # | File | Changes |
|---|------|---------|
| 1 | `OrganizationControllerV3.java` | 4 guards: addMember org check, removeMember self+role, setMemberTokenExpiry role, audit logging |
| 2 | `AcceptInviteUseCase.java` | 1 guard: block org switch in acceptInvite() |
| 3 | `RegisterUserUseCaseV2.java` | 2 fixes: explicit Wiii Org warning, invite code ValidationException wrap |
| 4 | `register.component.ts` | 1 fix: inviteCodeError signal + red error UI |
| 5 | `join-org.component.ts` | 1 fix: don't pass email token as invite code |
| 6 | `organization-detail.component.ts` | 2 fixes: canRemoveMember guard, role badge styling |

**Total**: 0 new files, 6 modified files (3 BE + 3 FE)
