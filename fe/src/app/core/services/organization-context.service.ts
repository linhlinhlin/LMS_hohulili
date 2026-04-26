import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClient } from '../../api/client/api-client';
import { ORGANIZATION_ENDPOINTS } from '../../api/endpoints/organization.endpoints';
import { ApiResponse } from '../../api/types/common.types';
import { Organization } from '../../shared/types/user.types';

/**
 * Issue #237 (Phase 3 PR 1): minimal shared org accessor cho shared components
 * (sidebar, header). Tách khỏi features/admin/OrganizationService để tránh
 * shared → features layer violation. Chỉ expose read methods cần cho context
 * surface — không CRUD/invite/payment.
 */
@Injectable({ providedIn: 'root' })
export class OrganizationContextService {
  private api = inject(ApiClient);

  /** Fetch single organization detail by id. Used for sidebar context block. */
  getOrganization(id: string): Observable<Organization> {
    return this.api.get<ApiResponse<Organization>>(ORGANIZATION_ENDPOINTS.BY_ID(id)).pipe(
      map(res => res.data)
    );
  }
}
