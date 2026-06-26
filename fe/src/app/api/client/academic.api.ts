import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import { ACADEMIC_ENDPOINTS } from '../endpoints/academic.endpoints';
import { ApiResponse } from '../types/common.types';
import {
  AcademicCatalog,
  AcademicClassGroupMembership,
  AcademicCurriculumPlan,
  AcademicCurriculumSubject,
  AcademicClassGroup,
  AcademicCohort,
  AcademicDepartment,
  AcademicLearningPackage,
  AcademicLearningPackageAvailability,
  AcademicLearningPackageClassTarget,
  AcademicLearningPackageEnrollment,
  AcademicLearningPackageItem,
  AcademicLearningPackagePaymentQr,
  AcademicLearningPackageRevenueAllocation,
  AcademicLearningPackageRevenueSplit,
  AcademicProgram,
  AcademicSubject,
  AcademicSubjectCourse,
  AcademicTerm,
  AddAcademicCurriculumSubjectRequest,
  AddAcademicLearningPackageItemRequest,
  BulkAcademicClassGroupRosterRequest,
  BulkAcademicClassGroupRosterResponse,
  CreateAcademicCurriculumPlanRequest,
  CreateAcademicClassGroupRequest,
  CreateAcademicCohortRequest,
  CreateAcademicClassGroupMembershipRequest,
  CreateAcademicDepartmentRequest,
  CreateAcademicLearningPackageClassTargetRequest,
  CreateAcademicLearningPackageRequest,
  CreateAcademicProgramRequest,
  CreateAcademicSubjectRequest,
  CreateAcademicTermRequest,
  LinkAcademicSubjectCourseRequest,
  ReviewAcademicLearningPackageEnrollmentRequest,
  TransferAcademicClassGroupMembershipRequest,
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

  createClassGroupMembership(orgId: string, request: CreateAcademicClassGroupMembershipRequest) {
    return this.api.postWithResponse<AcademicClassGroupMembership>(
      ACADEMIC_ENDPOINTS.CLASS_GROUP_MEMBERSHIPS(orgId),
      request
    );
  }

  transferClassGroupMembership(
    orgId: string,
    membershipId: string,
    request: TransferAcademicClassGroupMembershipRequest
  ) {
    return this.api.patchWithResponse<AcademicClassGroupMembership>(
      ACADEMIC_ENDPOINTS.TRANSFER_CLASS_GROUP_MEMBERSHIP(orgId, membershipId),
      request
    );
  }

  bulkImportClassGroupRoster(orgId: string, request: BulkAcademicClassGroupRosterRequest) {
    return this.api.postWithResponse<BulkAcademicClassGroupRosterResponse>(
      ACADEMIC_ENDPOINTS.BULK_CLASS_GROUP_ROSTER(orgId),
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

  createLearningPackageClassTarget(
    orgId: string,
    request: CreateAcademicLearningPackageClassTargetRequest
  ) {
    return this.api.postWithResponse<AcademicLearningPackageClassTarget>(
      ACADEMIC_ENDPOINTS.LEARNING_PACKAGE_CLASS_TARGETS(orgId),
      request
    );
  }

  previewLearningPackageRevenueAllocation(orgId: string, packageId: string) {
    return this.api.getWithResponse<AcademicLearningPackageRevenueAllocation>(
      ACADEMIC_ENDPOINTS.LEARNING_PACKAGE_REVENUE_ALLOCATION(orgId, packageId)
    );
  }

  listLearningPackageEnrollments(orgId: string, status?: string) {
    return this.api.getWithResponse<AcademicLearningPackageEnrollment[]>(
      ACADEMIC_ENDPOINTS.LEARNING_PACKAGE_ENROLLMENTS(orgId),
      status ? { params: { status } } : undefined
    );
  }

  listMyAvailableLearningPackages(orgId: string) {
    return this.api.getWithResponse<AcademicLearningPackageAvailability[]>(
      ACADEMIC_ENDPOINTS.MY_AVAILABLE_LEARNING_PACKAGES(orgId)
    );
  }

  requestLearningPackageEnrollment(orgId: string, packageId: string) {
    return this.api.postWithResponse<AcademicLearningPackageEnrollment>(
      ACADEMIC_ENDPOINTS.MY_LEARNING_PACKAGE_ENROLLMENT(orgId, packageId),
      {}
    );
  }

  createMyLearningPackagePaymentQr(orgId: string, packageId: string) {
    return this.api.postWithResponse<AcademicLearningPackagePaymentQr>(
      ACADEMIC_ENDPOINTS.MY_LEARNING_PACKAGE_PAYMENT_QR(orgId, packageId),
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

  completeLearningPackagePayment(
    orgId: string,
    enrollmentId: string,
    request: ReviewAcademicLearningPackageEnrollmentRequest
  ) {
    return this.api.patchWithResponse<AcademicLearningPackageEnrollment>(
      ACADEMIC_ENDPOINTS.COMPLETE_LEARNING_PACKAGE_PAYMENT(orgId, enrollmentId),
      request
    );
  }

  refundLearningPackageEnrollment(
    orgId: string,
    enrollmentId: string,
    request: ReviewAcademicLearningPackageEnrollmentRequest
  ) {
    return this.api.patchWithResponse<AcademicLearningPackageEnrollment>(
      ACADEMIC_ENDPOINTS.REFUND_LEARNING_PACKAGE_ENROLLMENT(orgId, enrollmentId),
      request
    );
  }

  listLearningPackageRevenueSplits(orgId: string, enrollmentId: string) {
    return this.api.getWithResponse<AcademicLearningPackageRevenueSplit[]>(
      ACADEMIC_ENDPOINTS.LEARNING_PACKAGE_REVENUE_SPLITS(orgId, enrollmentId)
    );
  }
}
