import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import { ACADEMIC_ENDPOINTS } from '../endpoints/academic.endpoints';
import { ApiResponse } from '../types/common.types';
import {
  AcademicCatalog,
  AcademicCurriculumPlan,
  AcademicCurriculumSubject,
  AcademicClassGroup,
  AcademicCohort,
  AcademicDepartment,
  AcademicLearningPackage,
  AcademicLearningPackageEnrollment,
  AcademicLearningPackageItem,
  AcademicProgram,
  AcademicSubject,
  AcademicSubjectCourse,
  AcademicTerm,
  AddAcademicCurriculumSubjectRequest,
  AddAcademicLearningPackageItemRequest,
  CreateAcademicCurriculumPlanRequest,
  CreateAcademicClassGroupRequest,
  CreateAcademicCohortRequest,
  CreateAcademicDepartmentRequest,
  CreateAcademicLearningPackageRequest,
  CreateAcademicProgramRequest,
  CreateAcademicSubjectRequest,
  CreateAcademicTermRequest,
  LinkAcademicSubjectCourseRequest,
  ReviewAcademicLearningPackageEnrollmentRequest,
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

  createTerm(orgId: string, request: CreateAcademicTermRequest) {
    return this.api.postWithResponse<AcademicTerm>(ACADEMIC_ENDPOINTS.TERMS(orgId), request);
  }

  createCurriculumPlan(orgId: string, request: CreateAcademicCurriculumPlanRequest) {
    return this.api.postWithResponse<AcademicCurriculumPlan>(
      ACADEMIC_ENDPOINTS.CURRICULUM_PLANS(orgId),
      request
    );
  }

  addCurriculumSubject(orgId: string, request: AddAcademicCurriculumSubjectRequest) {
    return this.api.postWithResponse<AcademicCurriculumSubject>(
      ACADEMIC_ENDPOINTS.CURRICULUM_SUBJECTS(orgId),
      request
    );
  }

  createLearningPackage(orgId: string, request: CreateAcademicLearningPackageRequest) {
    return this.api.postWithResponse<AcademicLearningPackage>(
      ACADEMIC_ENDPOINTS.LEARNING_PACKAGES(orgId),
      request
    );
  }

  addLearningPackageItem(orgId: string, request: AddAcademicLearningPackageItemRequest) {
    return this.api.postWithResponse<AcademicLearningPackageItem>(
      ACADEMIC_ENDPOINTS.LEARNING_PACKAGE_ITEMS(orgId),
      request
    );
  }

  listLearningPackageEnrollments(orgId: string, status?: string) {
    return this.api.getWithResponse<AcademicLearningPackageEnrollment[]>(
      ACADEMIC_ENDPOINTS.LEARNING_PACKAGE_ENROLLMENTS(orgId),
      status ? { params: { status } } : undefined
    );
  }

  requestLearningPackageEnrollment(orgId: string, packageId: string) {
    return this.api.postWithResponse<AcademicLearningPackageEnrollment>(
      ACADEMIC_ENDPOINTS.MY_LEARNING_PACKAGE_ENROLLMENT(orgId, packageId),
      {}
    );
  }

  approveLearningPackageEnrollment(
    orgId: string,
    enrollmentId: string,
    request: ReviewAcademicLearningPackageEnrollmentRequest
  ) {
    return this.api.patchWithResponse<AcademicLearningPackageEnrollment>(
      ACADEMIC_ENDPOINTS.APPROVE_LEARNING_PACKAGE_ENROLLMENT(orgId, enrollmentId),
      request
    );
  }

  rejectLearningPackageEnrollment(
    orgId: string,
    enrollmentId: string,
    request: ReviewAcademicLearningPackageEnrollmentRequest
  ) {
    return this.api.patchWithResponse<AcademicLearningPackageEnrollment>(
      ACADEMIC_ENDPOINTS.REJECT_LEARNING_PACKAGE_ENROLLMENT(orgId, enrollmentId),
      request
    );
  }
}
