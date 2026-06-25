import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import { ACADEMIC_ENDPOINTS } from '../endpoints/academic.endpoints';
import { ApiResponse } from '../types/common.types';
import {
  AcademicCatalog,
  AcademicClassGroup,
  AcademicCohort,
  AcademicDepartment,
  AcademicProgram,
  AcademicSubject,
  AcademicSubjectCourse,
  CreateAcademicClassGroupRequest,
  CreateAcademicCohortRequest,
  CreateAcademicDepartmentRequest,
  CreateAcademicProgramRequest,
  CreateAcademicSubjectRequest,
  LinkAcademicSubjectCourseRequest,
} from '../types/academic.types';

@Injectable({ providedIn: 'root' })
export class AcademicApi {
  private api = inject(ApiClient);

  getCatalog(orgId: string): Observable<ApiResponse<AcademicCatalog>> {
    return this.api.getWithResponse<AcademicCatalog>(ACADEMIC_ENDPOINTS.CATALOG(orgId));
  }

  createDepartment(orgId: string, request: CreateAcademicDepartmentRequest) {
    return this.api.postWithResponse<AcademicDepartment>(
      ACADEMIC_ENDPOINTS.DEPARTMENTS(orgId),
      request
    );
  }

  createProgram(orgId: string, request: CreateAcademicProgramRequest) {
    return this.api.postWithResponse<AcademicProgram>(ACADEMIC_ENDPOINTS.PROGRAMS(orgId), request);
  }

  createCohort(orgId: string, request: CreateAcademicCohortRequest) {
    return this.api.postWithResponse<AcademicCohort>(ACADEMIC_ENDPOINTS.COHORTS(orgId), request);
  }

  createClassGroup(orgId: string, request: CreateAcademicClassGroupRequest) {
    return this.api.postWithResponse<AcademicClassGroup>(
      ACADEMIC_ENDPOINTS.CLASS_GROUPS(orgId),
      request
    );
  }

  createSubject(orgId: string, request: CreateAcademicSubjectRequest) {
    return this.api.postWithResponse<AcademicSubject>(ACADEMIC_ENDPOINTS.SUBJECTS(orgId), request);
  }

  linkSubjectCourse(orgId: string, request: LinkAcademicSubjectCourseRequest) {
    return this.api.postWithResponse<AcademicSubjectCourse>(
      ACADEMIC_ENDPOINTS.SUBJECT_COURSES(orgId),
      request
    );
  }
}
