import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClient } from '../../../../api/client/api-client';
import { ORGANIZATION_ENDPOINTS, INVITE_ENDPOINTS } from '../../../../api/endpoints/organization.endpoints';
import { ApiResponse } from '../../../../api/types/common.types';
import { Organization, OrganizationInvite, OrganizationType, OrgMember } from '../../../../shared/types/user.types';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private api = inject(ApiClient);

  // Organization CRUD
  /** Issue #254 (Phase 4): optional type filter (PLATFORM/PARTNER/INTERNAL).
   *  ADMIN only — ORG_ADMIN bypass server-side, chỉ thấy org của mình. */
  listOrganizations(typeFilter?: OrganizationType): Observable<Organization[]> {
    const options = typeFilter ? { params: { type: typeFilter } } : {};
    return this.api.get<ApiResponse<Organization[]>>(ORGANIZATION_ENDPOINTS.BASE, options).pipe(
      map(res => res.data)
    );
  }

  /**
   * Issue #231 (Phase 1): trả về org nền tảng default (HoLiLiHu Org).
   * Dùng cho registration flow + branding header.
   */
  getDefault(): Observable<Organization> {
    return this.api.get<ApiResponse<Organization>>(`${ORGANIZATION_ENDPOINTS.BASE}/default`).pipe(
      map(res => res.data)
    );
  }

  /**
   * Aggregate stats over all organizations — KPI strip on /admin/organizations
   * (issue #200, F-ORG-1). ADMIN role only.
   */
  getStats(): Observable<OrganizationStats> {
    return this.api.get<ApiResponse<OrganizationStats>>(ORGANIZATION_ENDPOINTS.STATS).pipe(
      map(res => res.data)
    );
  }

  getOrganization(id: string): Observable<Organization> {
    return this.api.get<ApiResponse<Organization>>(ORGANIZATION_ENDPOINTS.BY_ID(id)).pipe(
      map(res => res.data)
    );
  }

  /** Issue #254 (Phase 4): type field optional (default PARTNER server-side).
   *  PLATFORM bị reject — chỉ HoLiLiHu Org được phép. */
  createOrganization(data: { name: string; code: string; description?: string; tokenExpiryDays?: number; type?: OrganizationType }): Observable<Organization> {
    return this.api.post<ApiResponse<Organization>>(ORGANIZATION_ENDPOINTS.BASE, data).pipe(
      map(res => res.data)
    );
  }

  updateOrganization(id: string, data: { name: string; description?: string; tokenExpiryDays?: number }): Observable<Organization> {
    return this.api.put<ApiResponse<Organization>>(ORGANIZATION_ENDPOINTS.BY_ID(id), data).pipe(
      map(res => res.data)
    );
  }

  // Members
  listMembers(orgId: string): Observable<OrgMember[]> {
    return this.api.get<ApiResponse<OrgMember[]>>(ORGANIZATION_ENDPOINTS.MEMBERS(orgId)).pipe(
      map(res => res.data)
    );
  }

  addMember(orgId: string, userId: string): Observable<string> {
    return this.api.post<ApiResponse<string>>(ORGANIZATION_ENDPOINTS.MEMBERS(orgId), { userId }).pipe(
      map(res => res.data)
    );
  }

  removeMember(orgId: string, userId: string): Observable<string> {
    return this.api.delete<ApiResponse<string>>(ORGANIZATION_ENDPOINTS.REMOVE_MEMBER(orgId, userId)).pipe(
      map(res => res.data)
    );
  }

  // Invites
  createInviteCode(orgId: string, data: { maxUses?: number; expiryDays?: number }): Observable<OrganizationInvite> {
    return this.api.post<ApiResponse<OrganizationInvite>>(ORGANIZATION_ENDPOINTS.INVITE_CODE(orgId), data).pipe(
      map(res => res.data)
    );
  }

  sendEmailInvite(orgId: string, data: { email: string; expiryDays?: number }): Observable<OrganizationInvite> {
    return this.api.post<ApiResponse<OrganizationInvite>>(ORGANIZATION_ENDPOINTS.INVITE_EMAIL(orgId), data).pipe(
      map(res => res.data)
    );
  }

  listInvites(orgId: string): Observable<OrganizationInvite[]> {
    return this.api.get<ApiResponse<OrganizationInvite[]>>(ORGANIZATION_ENDPOINTS.INVITES(orgId)).pipe(
      map(res => res.data)
    );
  }

  revokeInvite(orgId: string, inviteId: string): Observable<string> {
    return this.api.delete<ApiResponse<string>>(ORGANIZATION_ENDPOINTS.REVOKE_INVITE(orgId, inviteId)).pipe(
      map(res => res.data)
    );
  }

  // Member token config
  setMemberTokenExpiry(orgId: string, userId: string, tokenExpiryDays: number | null): Observable<{ userId: string; tokenExpiryDays: number | null; effectiveExpiryDays: number }> {
    return this.api.put<ApiResponse<{ userId: string; tokenExpiryDays: number | null; effectiveExpiryDays: number }>>(
      ORGANIZATION_ENDPOINTS.MEMBER_TOKEN_CONFIG(orgId, userId),
      { tokenExpiryDays }
    ).pipe(map(res => res.data));
  }

  // Public invite validation
  validateInviteCode(code: string): Observable<OrganizationInvite> {
    return this.api.get<ApiResponse<OrganizationInvite>>(INVITE_ENDPOINTS.VALIDATE_CODE, { params: { code } }).pipe(
      map(res => res.data)
    );
  }

  validateInviteToken(token: string): Observable<OrganizationInvite> {
    return this.api.get<ApiResponse<OrganizationInvite>>(INVITE_ENDPOINTS.VALIDATE_TOKEN, { params: { token } }).pipe(
      map(res => res.data)
    );
  }

  acceptInvite(data: { code?: string; token?: string }): Observable<{ organizationId: string; message: string }> {
    return this.api.post<ApiResponse<{ organizationId: string; message: string }>>(INVITE_ENDPOINTS.ACCEPT, data).pipe(
      map(res => res.data)
    );
  }

  // Payment config
  getPaymentConfig(orgId: string): Observable<OrgPaymentConfig> {
    return this.api.get<ApiResponse<OrgPaymentConfig>>(`/api/v3/organizations/${orgId}/payment-config`).pipe(
      map(res => res.data)
    );
  }

  updatePaymentConfig(orgId: string, data: { platformFeePct: number; teacherSharePct: number; minPayoutAmount: number }): Observable<OrgPaymentConfig> {
    return this.api.put<ApiResponse<OrgPaymentConfig>>(`/api/v3/organizations/${orgId}/payment-config`, data).pipe(
      map(res => res.data)
    );
  }
}

export interface OrgPaymentConfig {
  orgId: string;
  platformFeePct: number;
  teacherSharePct: number;
  orgSharePct: number;
  minPayoutAmount: number;
}

export interface OrganizationStats {
  totalOrgs: number;
  activeOrgs: number;
  totalMembers: number;
  activeInvites: number;
}
