import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { AcademicApi } from '../../api/client/academic.api';
import { ApiResponse } from '../../api/types/common.types';
import {
  AcademicCatalog,
  AcademicClassGroupMembership,
  AcademicLearningPackageEnrollment,
  AcademicLearningPackageItem,
  AcademicLearningPackageRevenueAllocation,
  AcademicLearningPackageRevenueSplit,
  AddAcademicCurriculumSubjectRequest,
  AddAcademicLearningPackageItemRequest,
  BulkAcademicClassGroupRosterResponse,
  CreateAcademicClassGroupMembershipRequest,
  CreateAcademicLearningPackageClassTargetRequest,
  CreateAcademicCurriculumPlanRequest,
  CreateAcademicClassGroupRequest,
  CreateAcademicCohortRequest,
  CreateAcademicDepartmentRequest,
  CreateAcademicLearningPackageRequest,
  CreateAcademicProgramRequest,
  CreateAcademicSubjectRequest,
  CreateAcademicTermRequest,
  LinkAcademicSubjectCourseRequest,
} from '../../api/types/academic.types';
import { AuthService } from '../../core/services/auth.service';
import { OrganizationCapability } from '../../shared/types/user.types';
import { ClassSummary } from '../../shared/types/course.types';
import { AdminCourseSummary, AdminService, AdminUser } from '../admin/infrastructure/services/admin.service';
import { OrganizationService } from '../admin/infrastructure/services/organization.service';
import { ClassService } from '../../state/class.service';

const emptyCatalog = (): AcademicCatalog => ({
  departments: [],
  programs: [],
  cohorts: [],
  classGroups: [],
  subjects: [],
  subjectCourses: [],
  terms: [],
  curriculumPlans: [],
  curriculumSubjects: [],
  learningPackages: [],
  learningPackageItems: [],
  learningPackageClassTargets: [],
  classGroupMemberships: [],
});

const capabilityLabels: Record<string, string> = {
  academic_catalog: 'Cấu trúc đào tạo',
  curriculum_plan: 'Khung chương trình',
  learning_packages: 'Gói học',
  org_payment_config: 'Cấu hình học phí',
  org_payout_approval: 'Duyệt chi trả',
};

const packageEnrollmentStatusFilters = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING_APPROVAL', label: 'Chờ ORG duyệt' },
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'ACTIVE', label: 'Đã kích hoạt' },
  { value: 'REJECTED', label: 'Đã từ chối' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'REFUNDED', label: 'Đã hoàn tiền' },
] as const;

type PackageEnrollmentStatusFilter = typeof packageEnrollmentStatusFilters[number]['value'];

@Component({
  selector: 'app-org-academic-catalog',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div class="mx-auto flex max-w-7xl flex-col gap-6">
        <header class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p class="text-sm font-semibold uppercase tracking-[0.18em] text-[#0056D2]">Org academic catalog</p>
          <div class="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 class="text-3xl font-bold tracking-tight text-slate-950">Cấu trúc đào tạo</h1>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Quản lý khoa, ngành, khóa, lớp hành chính, môn học và liên kết môn với khóa học LMS trong phạm vi tổ chức hiện tại.
              </p>
            </div>
            <button type="button" class="secondary-button" (click)="reload()" [disabled]="loading()">
              {{ loading() ? 'Đang tải...' : 'Tải lại dữ liệu' }}
            </button>
          </div>
        </header>

        @if (error()) {
          <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {{ error() }}
          </div>
        }

        @if (success()) {
          <div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {{ success() }}
          </div>
        }

        @if (!organizationId()) {
          <div class="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-800">
            Tài khoản hiện tại chưa có mã tổ chức. ORG_ADMIN cần thuộc một tổ chức cụ thể trước khi quản lý cấu trúc đào tạo.
          </div>
        } @else {
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-12">
            <div class="metric-card"><span>Khoa</span><strong>{{ catalog().departments.length }}</strong></div>
            <div class="metric-card"><span>Ngành</span><strong>{{ catalog().programs.length }}</strong></div>
            <div class="metric-card"><span>Khóa</span><strong>{{ catalog().cohorts.length }}</strong></div>
            <div class="metric-card"><span>Lớp</span><strong>{{ catalog().classGroups.length }}</strong></div>
            <div class="metric-card"><span>Sinh viên lớp</span><strong>{{ activeClassGroupMemberships().length }}</strong></div>
            <div class="metric-card"><span>Môn học</span><strong>{{ catalog().subjects.length }}</strong></div>
            <div class="metric-card"><span>Course map</span><strong>{{ catalog().subjectCourses.length }}</strong></div>
            <div class="metric-card"><span>Học kỳ</span><strong>{{ catalog().terms.length }}</strong></div>
            <div class="metric-card"><span>Khung CT</span><strong>{{ catalog().curriculumPlans.length }}</strong></div>
            <div class="metric-card"><span>Môn trong khung</span><strong>{{ catalog().curriculumSubjects.length }}</strong></div>
            <div class="metric-card"><span>Gói học</span><strong>{{ catalog().learningPackages.length }}</strong></div>
            <div class="metric-card"><span>Mục trong gói</span><strong>{{ catalog().learningPackageItems.length }}</strong></div>
            <div class="metric-card"><span>Lớp trong gói</span><strong>{{ catalog().learningPackageClassTargets.length }}</strong></div>
          </div>

          <div class="capability-strip">
            <div>
              <span>Cấu hình theo tổ chức</span>
              <strong>Năng lực đang bật cho ORG hiện tại</strong>
            </div>
            <div class="capability-list">
              @for (capability of capabilityItems(); track capability.key) {
                <span class="capability-pill" [class.disabled]="!capability.enabled">
                  {{ capability.label }}
                </span>
              } @empty {
                <span class="capability-pill disabled">Chưa có cấu hình capability</span>
              }
            </div>
          </div>

          <div class="grid gap-5 xl:grid-cols-2">
            <article class="catalog-card">
              <h2>Khoa / bộ môn</h2>
              <form class="catalog-form" (submit)="createDepartment($event)">
                <input aria-label="Mã khoa" placeholder="Mã khoa, ví dụ: CNTT" [value]="departmentForm().code" (input)="patch(departmentForm, { code: text($event) })">
                <input aria-label="Tên khoa" placeholder="Tên khoa" [value]="departmentForm().name" (input)="patch(departmentForm, { name: text($event) })">
                <button class="primary-button" type="submit" [disabled]="saving()">Tạo khoa</button>
              </form>
              <div class="compact-list">
                @for (department of catalog().departments; track department.id) {
                  <p><strong>{{ department.code }}</strong><span>{{ department.name }}</span></p>
                } @empty {
                  <p class="empty-text">Chưa có khoa.</p>
                }
              </div>
            </article>

            <article class="catalog-card">
              <h2>Ngành / chương trình</h2>
              <form class="catalog-form" (submit)="createProgram($event)">
                <select aria-label="Khoa phụ trách" [value]="programForm().departmentId ?? ''" (change)="patch(programForm, { departmentId: nullableText($event) })">
                  <option value="">Không gắn khoa</option>
                  @for (department of catalog().departments; track department.id) {
                    <option [value]="department.id">{{ department.code }} - {{ department.name }}</option>
                  }
                </select>
                <input aria-label="Mã ngành" placeholder="Mã ngành, ví dụ: CNT63" [value]="programForm().code" (input)="patch(programForm, { code: text($event) })">
                <input aria-label="Tên ngành" placeholder="Tên ngành" [value]="programForm().name" (input)="patch(programForm, { name: text($event) })">
                <input aria-label="Bậc đào tạo" placeholder="Bậc, ví dụ: Đại học" [value]="programForm().level ?? ''" (input)="patch(programForm, { level: nullableText($event) })">
                <button class="primary-button" type="submit" [disabled]="saving()">Tạo ngành</button>
              </form>
              <div class="compact-list">
                @for (program of catalog().programs; track program.id) {
                  <p><strong>{{ program.code }}</strong><span>{{ program.name }}</span></p>
                } @empty {
                  <p class="empty-text">Chưa có ngành.</p>
                }
              </div>
            </article>

            <article class="catalog-card">
              <h2>Khóa tuyển sinh</h2>
              <form class="catalog-form" (submit)="createCohort($event)">
                <input aria-label="Mã khóa" placeholder="Mã khóa, ví dụ: K63" [value]="cohortForm().code" (input)="patch(cohortForm, { code: text($event) })">
                <input aria-label="Tên khóa" placeholder="Tên khóa" [value]="cohortForm().name" (input)="patch(cohortForm, { name: text($event) })">
                <input aria-label="Năm bắt đầu" type="number" placeholder="Năm bắt đầu" [value]="cohortForm().startYear" (input)="patch(cohortForm, { startYear: numberValue($event) })">
                <input aria-label="Năm tốt nghiệp" type="number" placeholder="Năm tốt nghiệp" [value]="cohortForm().graduationYear ?? ''" (input)="patch(cohortForm, { graduationYear: nullableNumber($event) })">
                <button class="primary-button" type="submit" [disabled]="saving()">Tạo khóa</button>
              </form>
              <div class="compact-list">
                @for (cohort of catalog().cohorts; track cohort.id) {
                  <p><strong>{{ cohort.code }}</strong><span>{{ cohort.name }} · {{ cohort.startYear }}</span></p>
                } @empty {
                  <p class="empty-text">Chưa có khóa.</p>
                }
              </div>
            </article>

            <article class="catalog-card">
              <h2>Lớp hành chính</h2>
              <form class="catalog-form" (submit)="createClassGroup($event)">
                <select aria-label="Ngành" [value]="classGroupForm().programId" (change)="patch(classGroupForm, { programId: text($event) })">
                  <option value="">Chọn ngành</option>
                  @for (program of catalog().programs; track program.id) {
                    <option [value]="program.id">{{ program.code }} - {{ program.name }}</option>
                  }
                </select>
                <select aria-label="Khóa" [value]="classGroupForm().cohortId" (change)="patch(classGroupForm, { cohortId: text($event) })">
                  <option value="">Chọn khóa</option>
                  @for (cohort of catalog().cohorts; track cohort.id) {
                    <option [value]="cohort.id">{{ cohort.code }} - {{ cohort.name }}</option>
                  }
                </select>
                <input aria-label="Mã lớp" placeholder="Mã lớp, ví dụ: CNT63ĐH" [value]="classGroupForm().code" (input)="patch(classGroupForm, { code: text($event) })">
                <input aria-label="Tên lớp" placeholder="Tên lớp" [value]="classGroupForm().name" (input)="patch(classGroupForm, { name: text($event) })">
                <button class="primary-button" type="submit" [disabled]="saving()">Tạo lớp</button>
              </form>
              <div class="compact-list">
                @for (classGroup of catalog().classGroups; track classGroup.id) {
                  <p><strong>{{ classGroup.code }}</strong><span>{{ classGroup.name }}</span></p>
                } @empty {
                  <p class="empty-text">Chưa có lớp hành chính.</p>
                }
              </div>
            </article>

            <article class="catalog-card">
              <h2>Môn học</h2>
              <form class="catalog-form" (submit)="createSubject($event)">
                <select aria-label="Khoa phụ trách môn" [value]="subjectForm().departmentId ?? ''" (change)="patch(subjectForm, { departmentId: nullableText($event) })">
                  <option value="">Không gắn khoa</option>
                  @for (department of catalog().departments; track department.id) {
                    <option [value]="department.id">{{ department.code }} - {{ department.name }}</option>
                  }
                </select>
                <input aria-label="Mã môn" placeholder="Mã môn, ví dụ: NAV101" [value]="subjectForm().code" (input)="patch(subjectForm, { code: text($event) })">
                <input aria-label="Tên môn" placeholder="Tên môn" [value]="subjectForm().name" (input)="patch(subjectForm, { name: text($event) })">
                <input aria-label="Số tín chỉ" type="number" placeholder="Số tín chỉ" [value]="subjectForm().credits" (input)="patch(subjectForm, { credits: numberValue($event) })">
                <button class="primary-button" type="submit" [disabled]="saving()">Tạo môn</button>
              </form>
              <div class="compact-list">
                @for (subject of catalog().subjects; track subject.id) {
                  <p><strong>{{ subject.code }}</strong><span>{{ subject.name }} · {{ subject.credits }} tín chỉ</span></p>
                } @empty {
                  <p class="empty-text">Chưa có môn học.</p>
                }
              </div>
            </article>

            <article class="catalog-card">
              <h2>Liên kết môn với khóa học LMS</h2>
              <form class="catalog-form" (submit)="linkSubjectCourse($event)">
                <select aria-label="Môn học" [value]="linkForm().subjectId" (change)="patch(linkForm, { subjectId: text($event) })">
                  <option value="">Chọn môn học</option>
                  @for (subject of catalog().subjects; track subject.id) {
                    <option [value]="subject.id">{{ subject.code }} - {{ subject.name }}</option>
                  }
                </select>
                <select aria-label="Khóa học LMS" [value]="linkForm().courseId" (change)="patch(linkForm, { courseId: text($event) })">
                  <option value="">Chọn khóa học LMS trong tổ chức</option>
                  @for (course of availableCourses(); track course.id) {
                    <option [value]="course.id">{{ course.code }} - {{ course.title }}</option>
                  }
                </select>
                @if (availableCourses().length === 0) {
                  <p class="helper-text">Chưa có khóa học LMS khả dụng trong tổ chức hiện tại.</p>
                }
                <label class="inline-check">
                  <input type="checkbox" [checked]="linkForm().primary" (change)="patch(linkForm, { primary: checked($event) })">
                  Course chính của môn
                </label>
                <button class="primary-button" type="submit" [disabled]="saving()">Liên kết</button>
              </form>
              <div class="compact-list">
                @for (link of catalog().subjectCourses; track link.id) {
                  <p><strong>{{ subjectLabel(link.subjectId) }}</strong><span>{{ courseLabel(link.courseId) }}{{ link.primary ? ' · chính' : '' }}</span></p>
                } @empty {
                  <p class="empty-text">Chưa có liên kết môn - khóa học.</p>
                }
              </div>
            </article>

            <article class="catalog-card">
              <h2>Học kỳ / năm học</h2>
              <form class="catalog-form" (submit)="createTerm($event)">
                <input aria-label="Mã học kỳ" placeholder="Mã học kỳ, ví dụ: 2022-HK1" [value]="termForm().code" (input)="patch(termForm, { code: text($event) })">
                <input aria-label="Tên học kỳ" placeholder="Tên học kỳ" [value]="termForm().name" (input)="patch(termForm, { name: text($event) })">
                <input aria-label="Năm học" placeholder="Năm học, ví dụ: 2022-2023" [value]="termForm().academicYear" (input)="patch(termForm, { academicYear: text($event) })">
                <input aria-label="Số thứ tự học kỳ" type="number" placeholder="Số thứ tự học kỳ" [value]="termForm().termNumber" (input)="patch(termForm, { termNumber: numberValue($event) })">
                <button class="primary-button" type="submit" [disabled]="saving()">Tạo học kỳ</button>
              </form>
              <div class="compact-list">
                @for (term of catalog().terms; track term.id) {
                  <p><strong>{{ term.code }}</strong><span>{{ term.name }} · {{ term.academicYear }}</span></p>
                } @empty {
                  <p class="empty-text">Chưa có học kỳ.</p>
                }
              </div>
            </article>

            <article class="catalog-card">
              <h2>Khung chương trình</h2>
              <form class="catalog-form" (submit)="createCurriculumPlan($event)">
                <select aria-label="Ngành của khung chương trình" [value]="curriculumPlanForm().programId" (change)="patch(curriculumPlanForm, { programId: text($event) })">
                  <option value="">Chọn ngành</option>
                  @for (program of catalog().programs; track program.id) {
                    <option [value]="program.id">{{ program.code }} - {{ program.name }}</option>
                  }
                </select>
                <select aria-label="Khóa áp dụng" [value]="curriculumPlanForm().cohortId ?? ''" (change)="patch(curriculumPlanForm, { cohortId: nullableText($event) })">
                  <option value="">Áp dụng chung</option>
                  @for (cohort of catalog().cohorts; track cohort.id) {
                    <option [value]="cohort.id">{{ cohort.code }} - {{ cohort.name }}</option>
                  }
                </select>
                <input aria-label="Mã khung chương trình" placeholder="Mã khung, ví dụ: DKT-K63-CDIO" [value]="curriculumPlanForm().code" (input)="patch(curriculumPlanForm, { code: text($event) })">
                <input aria-label="Tên khung chương trình" placeholder="Tên khung chương trình" [value]="curriculumPlanForm().name" (input)="patch(curriculumPlanForm, { name: text($event) })">
                <input aria-label="Tổng tín chỉ" type="number" placeholder="Tổng tín chỉ" [value]="curriculumPlanForm().totalCredits" (input)="patch(curriculumPlanForm, { totalCredits: numberValue($event) })">
                <button class="primary-button" type="submit" [disabled]="saving()">Tạo khung</button>
              </form>
              <div class="compact-list">
                @for (plan of catalog().curriculumPlans; track plan.id) {
                  <p><strong>{{ plan.code }}</strong><span>{{ plan.name }} · {{ plan.totalCredits }} tín chỉ</span></p>
                } @empty {
                  <p class="empty-text">Chưa có khung chương trình.</p>
                }
              </div>
            </article>

            <article class="catalog-card">
              <h2>Môn trong khung chương trình</h2>
              <form class="catalog-form" (submit)="addCurriculumSubject($event)">
                <select aria-label="Khung chương trình" [value]="curriculumSubjectForm().curriculumPlanId" (change)="patch(curriculumSubjectForm, { curriculumPlanId: text($event) })">
                  <option value="">Chọn khung chương trình</option>
                  @for (plan of catalog().curriculumPlans; track plan.id) {
                    <option [value]="plan.id">{{ plan.code }} - {{ plan.name }}</option>
                  }
                </select>
                <select aria-label="Môn học trong khung" [value]="curriculumSubjectForm().subjectId" (change)="patch(curriculumSubjectForm, { subjectId: text($event) })">
                  <option value="">Chọn môn học</option>
                  @for (subject of catalog().subjects; track subject.id) {
                    <option [value]="subject.id">{{ subject.code }} - {{ subject.name }}</option>
                  }
                </select>
                <select aria-label="Học kỳ gợi ý" [value]="curriculumSubjectForm().termId ?? ''" (change)="patch(curriculumSubjectForm, { termId: nullableText($event) })">
                  <option value="">Chưa gán học kỳ</option>
                  @for (term of catalog().terms; track term.id) {
                    <option [value]="term.id">{{ term.code }} - {{ term.name }}</option>
                  }
                </select>
                <input aria-label="Thứ tự trong khung" type="number" placeholder="Thứ tự" [value]="curriculumSubjectForm().displayOrder" (input)="patch(curriculumSubjectForm, { displayOrder: numberValue($event) })">
                <label class="inline-check">
                  <input type="checkbox" [checked]="curriculumSubjectForm().required" (change)="patch(curriculumSubjectForm, { required: checked($event) })">
                  Môn bắt buộc
                </label>
                <button class="primary-button" type="submit" [disabled]="saving()">Thêm vào khung</button>
              </form>
              <div class="compact-list">
                @for (item of catalog().curriculumSubjects; track item.id) {
                  <p><strong>{{ curriculumPlanLabel(item.curriculumPlanId) }}</strong><span>{{ subjectLabel(item.subjectId) }} · {{ termLabel(item.termId) }}</span></p>
                } @empty {
                  <p class="empty-text">Chưa có môn trong khung chương trình.</p>
                }
              </div>
            </article>

            <article class="catalog-card">
              <h2>Gói học / học phí</h2>
              <form class="catalog-form" (submit)="createLearningPackage($event)">
                <select aria-label="Khung chương trình của gói" [value]="learningPackageForm().curriculumPlanId ?? ''" (change)="patch(learningPackageForm, { curriculumPlanId: nullableText($event) })">
                  <option value="">Không gắn khung chương trình</option>
                  @for (plan of catalog().curriculumPlans; track plan.id) {
                    <option [value]="plan.id">{{ plan.code }} - {{ plan.name }}</option>
                  }
                </select>
                <input aria-label="Mã gói học" placeholder="Mã gói, ví dụ: VMU-DKT-K63" [value]="learningPackageForm().code" (input)="patch(learningPackageForm, { code: text($event) })">
                <input aria-label="Tên gói học" placeholder="Tên gói học" [value]="learningPackageForm().name" (input)="patch(learningPackageForm, { name: text($event) })">
                <input aria-label="Mô tả gói học" placeholder="Mô tả ngắn" [value]="learningPackageForm().description ?? ''" (input)="patch(learningPackageForm, { description: nullableText($event) })">
                <select aria-label="Loại gói học" [value]="learningPackageForm().packageType" (change)="patch(learningPackageForm, { packageType: text($event) })">
                  <option value="CURRICULUM_BUNDLE">Theo khung chương trình</option>
                  <option value="SUBJECT_BUNDLE">Theo nhóm môn</option>
                  <option value="COURSE_BUNDLE">Theo khóa học LMS</option>
                </select>
                <input aria-label="Học phí" type="number" min="0" placeholder="Học phí" [value]="learningPackageForm().price" (input)="patch(learningPackageForm, { price: numberValue($event) })">
                <select aria-label="Chính sách ghi danh" [value]="learningPackageForm().enrollmentPolicy" (change)="patch(learningPackageForm, { enrollmentPolicy: text($event) })">
                  <option value="ORG_APPROVAL">Cần ORG duyệt</option>
                  <option value="PAYMENT_REQUIRED">Cần thanh toán</option>
                  <option value="INVITE_ONLY">Chỉ theo lời mời</option>
                  <option value="OPEN">Tự ghi danh</option>
                </select>
                <button class="primary-button" type="submit" [disabled]="saving()">Tạo gói học</button>
              </form>
              <div class="compact-list">
                @for (learningPackage of catalog().learningPackages; track learningPackage.id) {
                  <p>
                    <strong>{{ learningPackage.code }}</strong>
                    <span>{{ learningPackage.name }} · {{ formatPrice(learningPackage.price, learningPackage.currency) }} · {{ enrollmentPolicyLabel(learningPackage.enrollmentPolicy) }}</span>
                  </p>
                } @empty {
                  <p class="empty-text">Chưa có gói học.</p>
                }
              </div>
              <form class="catalog-form allocation-form" (submit)="loadRevenueAllocation($event)">
                <select data-testid="package-revenue-allocation-select" aria-label="Gói học cần xem phân bổ học phí" [value]="selectedRevenuePackageId()" (change)="selectedRevenuePackageId.set(text($event))">
                  <option value="">Chọn gói học để xem phân bổ</option>
                  @for (learningPackage of catalog().learningPackages; track learningPackage.id) {
                    <option [value]="learningPackage.id">{{ learningPackage.code }} - {{ learningPackage.name }}</option>
                  }
                </select>
                <button data-testid="package-revenue-allocation-load" class="secondary-button" type="submit" [disabled]="saving() || !selectedRevenuePackageId()">Xem phân bổ học phí</button>
              </form>
              @if (selectedRevenueAllocation(); as allocation) {
                <div class="allocation-panel" data-testid="package-revenue-allocation-panel">
                  <p class="helper-text">
                    Tổng học phí {{ formatPrice(allocation.packagePrice, allocation.currency) }} · tổng trọng số {{ allocation.totalWeight }} · đã phân bổ {{ formatPrice(allocation.allocatedTotal, allocation.currency) }}.
                  </p>
                  <div class="compact-list">
                    @for (row of allocation.items; track row.itemId) {
                      <p>
                        <strong>{{ packageAllocationItemLabel(row) }}</strong>
                        <span>{{ row.allocationPct }}% · trọng số {{ row.revenueWeight }} · {{ formatPrice(row.allocatedAmount, allocation.currency) }}</span>
                      </p>
                    } @empty {
                      <p class="empty-text">Gói học này chưa có môn/course để phân bổ học phí.</p>
                    }
                  </div>
                </div>
              }
            </article>

            <article class="catalog-card">
              <h2>Môn / course trong gói học</h2>
              <form class="catalog-form" (submit)="addLearningPackageItem($event)">
                <select aria-label="Gói học" [value]="learningPackageItemForm().packageId" (change)="patch(learningPackageItemForm, { packageId: text($event) })">
                  <option value="">Chọn gói học</option>
                  @for (learningPackage of catalog().learningPackages; track learningPackage.id) {
                    <option [value]="learningPackage.id">{{ learningPackage.code }} - {{ learningPackage.name }}</option>
                  }
                </select>
                <select aria-label="Môn học trong gói" [value]="learningPackageItemForm().subjectId ?? ''" (change)="selectPackageSubject($event)">
                  <option value="">Không chọn môn học</option>
                  @for (subject of catalog().subjects; track subject.id) {
                    <option [value]="subject.id">{{ subject.code }} - {{ subject.name }}</option>
                  }
                </select>
                <select aria-label="Course LMS trong gói" [value]="learningPackageItemForm().courseId ?? ''" (change)="selectPackageCourse($event)">
                  <option value="">Không chọn course LMS</option>
                  @for (course of availableCourses(); track course.id) {
                    <option [value]="course.id">{{ course.code }} - {{ course.title }}</option>
                  }
                </select>
                <input aria-label="Thứ tự trong gói" type="number" placeholder="Thứ tự" [value]="learningPackageItemForm().displayOrder" (input)="patch(learningPackageItemForm, { displayOrder: numberValue($event) })">
                <input aria-label="Trọng số phân bổ" type="number" min="0" step="0.0001" placeholder="Trọng số phân bổ" [value]="learningPackageItemForm().revenueWeight" (input)="patch(learningPackageItemForm, { revenueWeight: numberValue($event) })">
                <label class="inline-check">
                  <input type="checkbox" [checked]="learningPackageItemForm().required" (change)="patch(learningPackageItemForm, { required: checked($event) })">
                  Bắt buộc trong gói
                </label>
                <p class="helper-text">Chọn một trong hai: môn học hoặc course LMS. Trọng số phân bổ mặc định là 1 và dùng cho báo cáo tài chính gói học sau này.</p>
                <button class="primary-button" type="submit" [disabled]="saving()">Thêm vào gói</button>
              </form>
              <div class="compact-list">
                @for (item of catalog().learningPackageItems; track item.id) {
                  <p>
                    <strong>{{ learningPackageLabel(item.packageId) }}</strong>
                    <span>{{ packageItemLabel(item) }}{{ item.required ? ' · bắt buộc' : '' }} · trọng số {{ item.revenueWeight }}</span>
                  </p>
                } @empty {
                  <p class="empty-text">Chưa có mục nào trong gói học.</p>
                }
              </div>
            </article>

            <article class="catalog-card" data-testid="class-group-membership-card">
              <h2>Sinh viên thuộc lớp</h2>
              <form class="catalog-form" (submit)="createClassGroupMembership($event)">
                <select data-testid="class-group-membership-class" aria-label="Lớp hành chính của sinh viên" [value]="classGroupMembershipForm().classGroupId" (change)="patch(classGroupMembershipForm, { classGroupId: text($event) })">
                  <option value="">Chọn lớp hành chính</option>
                  @for (classGroup of catalog().classGroups; track classGroup.id) {
                    <option [value]="classGroup.id">{{ classGroup.code }} - {{ classGroup.name }}</option>
                  }
                </select>
                <select data-testid="class-group-membership-student" aria-label="Sinh viên cần gán lớp" [value]="classGroupMembershipForm().studentId" (change)="patch(classGroupMembershipForm, { studentId: text($event) })">
                  <option value="">Chọn sinh viên</option>
                  @for (student of studentUsers(); track student.id) {
                    <option [value]="student.id">{{ student.name || student.email }} - {{ student.email }}</option>
                  }
                </select>
                <p class="helper-text">Mỗi sinh viên chỉ có một lớp hành chính đang hoạt động. Khi duyệt gói học, hệ thống sẽ ưu tiên lớp triển khai theo lớp hành chính này.</p>
                <button data-testid="class-group-membership-submit" class="primary-button" type="submit" [disabled]="saving() || !canCreateClassGroupMembership()">Gán sinh viên vào lớp</button>
              </form>
              <form class="catalog-form roster-form" (submit)="importClassGroupRoster($event)">
                <select data-testid="class-group-roster-class" aria-label="Lớp nhận danh sách sinh viên" [value]="classGroupRosterForm().classGroupId" (change)="patch(classGroupRosterForm, { classGroupId: text($event) })">
                  <option value="">Chọn lớp để nhập danh sách</option>
                  @for (classGroup of catalog().classGroups; track classGroup.id) {
                    <option [value]="classGroup.id">{{ classGroup.code }} - {{ classGroup.name }}</option>
                  }
                </select>
                <textarea
                  data-testid="class-group-roster-emails"
                  aria-label="Danh sách email sinh viên"
                  rows="5"
                  placeholder="Mỗi dòng một email sinh viên, ví dụ:&#10;nguyenvanan@sv.maritime.edu&#10;tranthibinh@sv.maritime.edu"
                  [value]="classGroupRosterForm().rosterText"
                  (input)="patch(classGroupRosterForm, { rosterText: textarea($event) })"></textarea>
                <p class="helper-text">Dùng để nhập danh sách lớp từ Excel hoặc danh sách sinh viên VMU. Nếu sinh viên đang ở lớp khác, hệ thống sẽ chuyển lớp và lưu lịch sử lớp cũ.</p>
                <button data-testid="class-group-roster-submit" class="secondary-button" type="submit" [disabled]="saving() || !canImportClassGroupRoster()">Nhập danh sách lớp</button>
              </form>
              @if (classGroupRosterResult(); as rosterResult) {
                <div class="roster-result" data-testid="class-group-roster-result">
                  <strong>Kết quả nhập danh sách</strong>
                  <dl>
                    <div><dt>Tổng</dt><dd>{{ rosterResult.total }}</dd></div>
                    <div><dt>Gán mới</dt><dd>{{ rosterResult.assigned }}</dd></div>
                    <div><dt>Chuyển lớp</dt><dd>{{ rosterResult.transferred }}</dd></div>
                    <div><dt>Bỏ qua</dt><dd>{{ rosterResult.unchanged }}</dd></div>
                    <div><dt>Lỗi</dt><dd>{{ rosterResult.failed }}</dd></div>
                  </dl>
                </div>
              }
              <div class="compact-list">
                @for (membership of catalog().classGroupMemberships; track membership.id) {
                  <div class="membership-row">
                    <p>
                      <strong>{{ classGroupLabel(membership.classGroupId) }}</strong>
                      <span>{{ studentLabel(membership.studentId) }}</span>
                      <span class="membership-status" [class.inactive]="membership.status !== 'ACTIVE'">
                        {{ classGroupMembershipStatusLabel(membership) }}
                      </span>
                    </p>
                    @if (membership.status === 'ACTIVE') {
                      <div class="membership-transfer">
                        <select
                          data-testid="class-group-membership-transfer-target"
                          aria-label="Lớp hành chính muốn chuyển tới"
                          [value]="transferTargetFor(membership.id)"
                          (change)="setTransferTarget(membership.id, $event)">
                          <option value="">Chuyển sang lớp...</option>
                          @for (classGroup of catalog().classGroups; track classGroup.id) {
                            @if (classGroup.id !== membership.classGroupId) {
                              <option [value]="classGroup.id">{{ classGroup.code }} - {{ classGroup.name }}</option>
                            }
                          }
                        </select>
                        <button
                          data-testid="class-group-membership-transfer-submit"
                          class="secondary-button compact-action"
                          type="button"
                          [disabled]="saving() || !canTransferMembership(membership)"
                          (click)="transferClassGroupMembership(membership)">
                          Chuyển lớp
                        </button>
                      </div>
                    }
                  </div>
                } @empty {
                  <p class="empty-text">Chưa có sinh viên nào được gán vào lớp hành chính.</p>
                }
              </div>
            </article>

            <article class="catalog-card" data-testid="package-class-target-card">
              <h2>Lớp triển khai trong gói học</h2>
              <form class="catalog-form" (submit)="createLearningPackageClassTarget($event)">
                <select data-testid="package-class-target-package" aria-label="Gói học cần gắn lớp" [value]="classTargetForm().packageId" (change)="selectClassTargetPackage($event)">
                  <option value="">Chọn gói học</option>
                  @for (learningPackage of catalog().learningPackages; track learningPackage.id) {
                    <option [value]="learningPackage.id">{{ learningPackage.code }} - {{ learningPackage.name }}</option>
                  }
                </select>
                <select data-testid="package-class-target-course" aria-label="Course trong gói cần gắn lớp" [value]="classTargetForm().courseId" (change)="selectClassTargetCourse($event)">
                  <option value="">Chọn course thuộc gói</option>
                  @for (course of packageTargetCourseOptions(); track course.id) {
                    <option [value]="course.id">{{ course.code }} - {{ course.title }}</option>
                  }
                </select>
                <select data-testid="package-class-target-class-group" aria-label="Phạm vi lớp hành chính" [value]="classTargetForm().classGroupId ?? ''" (change)="patch(classTargetForm, { classGroupId: nullableText($event) })">
                  <option value="">Áp dụng mặc định cho mọi lớp</option>
                  @for (classGroup of catalog().classGroups; track classGroup.id) {
                    <option [value]="classGroup.id">{{ classGroup.code }} - {{ classGroup.name }}</option>
                  }
                </select>
                <select data-testid="package-class-target-class" aria-label="Lớp triển khai của course" [value]="classTargetForm().learningClassId" (change)="patch(classTargetForm, { learningClassId: text($event) })">
                  <option value="">Chọn lớp triển khai</option>
                  @for (learningClass of learningClasses(); track learningClass.id) {
                    <option [value]="learningClass.id">{{ learningClass.code }} - {{ learningClass.name }}</option>
                  }
                </select>
                <p class="helper-text">Dùng khi VMU hoặc một ORG cần duyệt gói học rồi đưa học viên vào đúng lớp triển khai của từng course.</p>
                <button data-testid="package-class-target-submit" class="primary-button" type="submit" [disabled]="saving() || !canCreateClassTarget()">Gắn lớp cho gói</button>
              </form>
              <div class="compact-list">
                @for (target of catalog().learningPackageClassTargets; track target.id) {
                  <p>
                    <strong>{{ learningPackageLabel(target.packageId) }}</strong>
                    <span>{{ classGroupScopeLabel(target.classGroupId) }} · {{ courseLabel(target.courseId) }} → {{ learningClassLabel(target.learningClassId) }}</span>
                  </p>
                } @empty {
                  <p class="empty-text">Chưa có lớp triển khai nào được gắn với gói học.</p>
                }
              </div>
            </article>

            <article class="catalog-card">
              <div class="card-heading-row">
                <div>
                  <h2>Yêu cầu gói học</h2>
                  <p class="helper-text">
                    Theo dõi học viên đăng ký gói học theo chính sách của tổ chức. Gói cần ORG duyệt sẽ nằm ở trạng thái chờ duyệt trước khi kích hoạt.
                  </p>
                </div>
                <div class="card-heading-actions">
                  <label class="status-filter">
                    <span>Trạng thái</span>
                    <select
                      aria-label="Lọc yêu cầu gói học"
                      [value]="packageEnrollmentStatusFilter()"
                      (change)="changePackageEnrollmentStatusFilter($event)">
                      @for (option of packageEnrollmentStatusFilters; track option.value) {
                        <option [value]="option.value">{{ option.label }}</option>
                      }
                    </select>
                  </label>
                  <button
                    type="button"
                    class="secondary-button compact-action"
                    [disabled]="exportingPackageEnrollments() || !organizationId()"
                    (click)="downloadPackageEnrollmentsCsv()">
                    {{ exportingPackageEnrollments() ? 'Đang tạo CSV...' : 'Tải CSV đối soát' }}
                  </button>
                </div>
              </div>
              <div class="compact-list">
                @for (enrollment of packageEnrollments(); track enrollment.id) {
                  <p>
                    <strong>{{ learningPackageLabel(enrollment.packageId) }}</strong>
                    <span>Học viên {{ studentLabel(enrollment.studentId) }} · {{ enrollmentStatusLabel(enrollment.status) }}</span>
                    <span class="payment-chip">{{ formatEnrollmentPayment(enrollment) }}</span>
                    @if (enrollment.paymentReference) {
                      <span class="payment-chip muted">Mã: {{ enrollment.paymentReference }}</span>
                    }
                    @if (enrollment.paymentConfirmedAt) {
                      <span class="payment-chip muted">Đối soát: {{ shortId(enrollment.paymentConfirmedBy ?? '') }}</span>
                    }
                    @if (enrollment.status === 'PENDING_APPROVAL') {
                      <span class="action-row">
                        <button type="button" class="secondary-button compact-action" [disabled]="saving()" (click)="rejectPackageEnrollment(enrollment)">
                          Từ chối
                        </button>
                        <button type="button" class="primary-button compact-action" [disabled]="saving()" (click)="approvePackageEnrollment(enrollment)">
                          Duyệt
                        </button>
                      </span>
                    }
                    @if (enrollment.status === 'PENDING_PAYMENT') {
                      <span class="action-row">
                        <input class="compact-input" aria-label="Mã giao dịch gói học" placeholder="Mã giao dịch" [value]="paymentReferenceFor(enrollment.id)" (input)="setPaymentReference(enrollment.id, $event)">
                        <button type="button" class="secondary-button compact-action" [disabled]="saving()" (click)="rejectPackageEnrollment(enrollment)">
                          Hủy yêu cầu
                        </button>
                        <button type="button" class="primary-button compact-action" [disabled]="saving()" (click)="completePackagePayment(enrollment)">
                          Xác nhận thanh toán
                        </button>
                      </span>
                    }
                    @if (enrollment.status === 'ACTIVE') {
                      <span class="action-row">
                        <input class="compact-input" aria-label="Mã hoàn tiền gói học" placeholder="Mã hoàn tiền" [value]="paymentReferenceFor(enrollment.id)" (input)="setPaymentReference(enrollment.id, $event)">
                        <button type="button" class="secondary-button compact-action" [disabled]="saving()" (click)="loadPackageRevenueSplits(enrollment)">
                          Xem doanh thu
                        </button>
                        <button type="button" class="danger-button compact-action" [disabled]="saving()" (click)="refundPackageEnrollment(enrollment)">
                          Hoàn tiền
                        </button>
                      </span>
                    }
                  </p>
                  @if (revenueSplitsFor(enrollment.id); as splits) {
                    <div class="split-panel" data-testid="package-revenue-split-panel">
                      <strong>Đối soát doanh thu gói học</strong>
                      <div class="compact-list">
                        @for (split of splits; track split.id) {
                          <p>
                            <strong>{{ packageRevenueSplitLabel(split) }}</strong>
                            <span>GV {{ shortId(split.teacherId) }} · tổng {{ formatPrice(split.grossAmount, split.currency) }}</span>
                            <span>Giảng viên {{ formatPrice(split.teacherAmount, split.currency) }} · ORG {{ formatPrice(split.orgAmount, split.currency) }} · nền tảng {{ formatPrice(split.platformAmount, split.currency) }}</span>
                            @if (split.paymentReference) {
                              <span class="payment-chip muted">Mã: {{ split.paymentReference }}</span>
                            }
                          </p>
                        } @empty {
                          <p class="empty-text">Chưa có dòng doanh thu nào cho enrollment này.</p>
                        }
                      </div>
                    </div>
                  }
                } @empty {
                  <p class="empty-text">Chưa có yêu cầu đăng ký gói học.</p>
                }
              </div>
            </article>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .metric-card,
    .catalog-card {
      border: 1px solid #e2e8f0;
      background: #fff;
      box-shadow: 0 10px 35px rgba(15, 23, 42, 0.06);
    }

    .metric-card {
      border-radius: 1.25rem;
      padding: 1rem;
    }

    .metric-card span {
      display: block;
      color: #64748b;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .metric-card strong {
      display: block;
      margin-top: 0.35rem;
      color: #0f172a;
      font-size: 1.875rem;
      line-height: 1;
    }

    .catalog-card {
      border-radius: 1.5rem;
      padding: 1.25rem;
    }

    .catalog-card h2 {
      margin: 0 0 1rem;
      color: #0f172a;
      font-size: 1.05rem;
      font-weight: 800;
    }

    .card-heading-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .card-heading-row h2,
    .card-heading-row .helper-text {
      margin-bottom: 0;
    }

    .card-heading-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .status-filter {
      display: grid;
      gap: 0.35rem;
      min-width: 12rem;
    }

    .status-filter span {
      color: #64748b;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .status-filter select {
      min-height: 2rem;
      border-radius: 0.7rem;
      font-size: 0.82rem;
      font-weight: 700;
    }

    .capability-strip {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border: 1px solid #bfdbfe;
      border-radius: 1.5rem;
      background: linear-gradient(135deg, #eff6ff, #ffffff);
      padding: 1rem 1.25rem;
    }

    .capability-strip span {
      color: #64748b;
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .capability-strip strong {
      display: block;
      margin-top: 0.25rem;
      color: #0f172a;
      font-size: 1rem;
    }

    .capability-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .capability-pill {
      border: 1px solid rgba(0, 86, 210, 0.22);
      border-radius: 999px;
      background: #ffffff;
      color: #0056D2 !important;
      padding: 0.45rem 0.75rem;
      letter-spacing: 0 !important;
      text-transform: none !important;
    }

    .capability-pill.disabled {
      border-color: #e2e8f0;
      color: #94a3b8 !important;
      text-decoration: line-through;
    }

    .catalog-form {
      display: grid;
      gap: 0.75rem;
    }

    input,
    select {
      min-height: 2.75rem;
      border-radius: 0.9rem;
      border: 1px solid #cbd5e1;
      background: #fff;
      padding: 0 0.9rem;
      color: #0f172a;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    input:focus,
    select:focus {
      border-color: #0056D2;
      box-shadow: 0 0 0 3px rgba(0, 86, 210, 0.14);
    }

    .primary-button,
    .secondary-button,
    .danger-button {
      min-height: 2.75rem;
      border-radius: 0.9rem;
      padding: 0 1rem;
      font-weight: 800;
      transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
    }

    .primary-button {
      background: #0056D2;
      color: #fff;
      box-shadow: 0 12px 28px rgba(0, 86, 210, 0.22);
    }

    .secondary-button {
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      color: #0056D2;
    }

    .danger-button {
      border: 1px solid #fecaca;
      background: #fef2f2;
      color: #b91c1c;
    }

    .primary-button:hover,
    .secondary-button:hover,
    .danger-button:hover {
      transform: translateY(-1px);
    }

    .primary-button:disabled,
    .secondary-button:disabled,
    .danger-button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
      transform: none;
    }

    .compact-action {
      min-height: 2rem;
      border-radius: 0.7rem;
      padding: 0 0.75rem;
      font-size: 0.8rem;
    }

    .compact-input {
      min-height: 2rem;
      width: min(13rem, 100%);
      border-radius: 0.7rem;
      font-size: 0.8rem;
    }

    .action-row {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }

    .payment-chip {
      border-radius: 999px;
      background: #eff6ff;
      color: #0056D2;
      padding: 0.2rem 0.55rem;
      font-size: 0.78rem;
      font-weight: 800;
    }

    .payment-chip.muted {
      background: #f1f5f9;
      color: #475569;
    }

    .compact-list {
      margin-top: 1rem;
      display: grid;
      gap: 0.5rem;
    }

    .compact-list p {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem 0.75rem;
      justify-content: space-between;
      margin: 0;
      border-radius: 0.9rem;
      background: #f8fafc;
      padding: 0.75rem 0.9rem;
      color: #475569;
      font-size: 0.9rem;
    }

    .roster-form {
      margin-top: 1rem;
      border-top: 1px solid #e2e8f0;
      padding-top: 1rem;
    }

    .allocation-form,
    .allocation-panel {
      margin-top: 1rem;
      border-top: 1px solid #e2e8f0;
      padding-top: 1rem;
    }

    .allocation-panel {
      border-radius: 1rem;
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      padding: 1rem;
    }

    .allocation-panel .compact-list p {
      background: rgba(255, 255, 255, 0.78);
    }

    .split-panel {
      border-radius: 1rem;
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      padding: 1rem;
    }

    .split-panel > strong {
      display: block;
      color: #0f172a;
      font-size: 0.9rem;
    }

    .split-panel .compact-list p {
      background: rgba(255, 255, 255, 0.82);
    }

    .roster-form textarea {
      min-height: 8rem;
      resize: vertical;
    }

    .roster-result {
      margin-top: 1rem;
      border-radius: 1rem;
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      padding: 0.9rem;
      color: #1e3a8a;
      font-size: 0.85rem;
    }

    .roster-result strong {
      display: block;
      margin-bottom: 0.65rem;
      color: #0f172a;
    }

    .roster-result dl {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(5.5rem, 1fr));
      gap: 0.5rem;
      margin: 0;
    }

    .roster-result div {
      border-radius: 0.75rem;
      background: rgba(255, 255, 255, 0.75);
      padding: 0.5rem 0.65rem;
    }

    .roster-result dt {
      color: #64748b;
      font-weight: 700;
    }

    .roster-result dd {
      margin: 0.15rem 0 0;
      color: #0056D2;
      font-size: 1.1rem;
      font-weight: 900;
    }

    .membership-row {
      display: grid;
      gap: 0.5rem;
      border-radius: 0.9rem;
      background: #f8fafc;
      padding: 0.75rem 0.9rem;
    }

    .membership-row p {
      padding: 0;
      background: transparent;
    }

    .membership-transfer {
      display: grid;
      gap: 0.5rem;
    }

    .membership-transfer select {
      min-height: 2.35rem;
      border-radius: 0.75rem;
    }

    @media (min-width: 640px) {
      .membership-transfer {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
      }
    }

    @media (max-width: 639px) {
      .card-heading-row {
        flex-direction: column;
      }

      .card-heading-actions,
      .status-filter {
        width: 100%;
      }
    }

    .membership-status {
      border-radius: 999px;
      background: #dcfce7;
      color: #166534;
      padding: 0.15rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 800;
    }

    .membership-status.inactive {
      background: #e2e8f0;
      color: #64748b;
    }

    .compact-list strong {
      color: #0f172a;
      font-weight: 800;
    }

    .empty-text {
      color: #94a3b8 !important;
    }

    .helper-text {
      margin: 0;
      color: #64748b;
      font-size: 0.85rem;
      line-height: 1.5;
    }

    .inline-check {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      color: #334155;
      font-size: 0.9rem;
      font-weight: 700;
    }

    .inline-check input {
      min-height: auto;
      width: 1rem;
      height: 1rem;
    }
  `],
})
export class OrgAcademicCatalogComponent implements OnInit {
  private academicApi = inject(AcademicApi);
  private adminService = inject(AdminService);
  private organizationService = inject(OrganizationService);
  private classService = inject(ClassService);
  private auth = inject(AuthService);

  protected readonly catalog = signal<AcademicCatalog>(emptyCatalog());
  protected readonly availableCourses = signal<AdminCourseSummary[]>([]);
  protected readonly studentUsers = signal<AdminUser[]>([]);
  protected readonly capabilities = signal<OrganizationCapability[]>([]);
  protected readonly packageEnrollments = signal<AcademicLearningPackageEnrollment[]>([]);
  protected readonly packageRevenueAllocations = signal<Record<string, AcademicLearningPackageRevenueAllocation>>({});
  protected readonly packageRevenueSplits = signal<Record<string, AcademicLearningPackageRevenueSplit[]>>({});
  protected readonly exportingPackageEnrollments = signal(false);
  protected readonly packageEnrollmentStatusFilters = packageEnrollmentStatusFilters;
  protected readonly packageEnrollmentStatusFilter = signal<PackageEnrollmentStatusFilter>('');
  protected readonly selectedRevenuePackageId = signal('');
  protected readonly packagePaymentReferences = signal<Record<string, string>>({});
  protected readonly classGroupTransferTargets = signal<Record<string, string>>({});
  protected readonly learningClasses = signal<ClassSummary[]>([]);
  private readonly classNameCache = signal<Record<string, string>>({});
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  protected readonly organizationId = computed(() => this.auth.currentUserSignal()?.organizationId ?? '');
  protected readonly capabilityItems = computed(() =>
    this.capabilities().map(capability => ({
      key: capability.key,
      enabled: capability.enabled,
      label: capabilityLabels[capability.key] ?? capability.key,
    }))
  );
  protected readonly activeClassGroupMemberships = computed(() =>
    this.catalog().classGroupMemberships.filter(membership => membership.status === 'ACTIVE')
  );
  protected readonly selectedRevenueAllocation = computed(() =>
    this.packageRevenueAllocations()[this.selectedRevenuePackageId()] ?? null
  );

  protected readonly departmentForm = signal<CreateAcademicDepartmentRequest>({ code: '', name: '' });
  protected readonly programForm = signal<CreateAcademicProgramRequest>({
    departmentId: null,
    code: '',
    name: '',
    level: null,
  });
  protected readonly cohortForm = signal<CreateAcademicCohortRequest>({
    code: '',
    name: '',
    startYear: new Date().getFullYear(),
    graduationYear: null,
  });
  protected readonly classGroupForm = signal<CreateAcademicClassGroupRequest>({
    programId: '',
    cohortId: '',
    code: '',
    name: '',
  });
  protected readonly classGroupMembershipForm = signal<CreateAcademicClassGroupMembershipRequest>({
    classGroupId: '',
    studentId: '',
  });
  protected readonly classGroupRosterForm = signal({
    classGroupId: '',
    rosterText: '',
  });
  protected readonly classGroupRosterResult = signal<BulkAcademicClassGroupRosterResponse | null>(null);
  protected readonly subjectForm = signal<CreateAcademicSubjectRequest>({
    departmentId: null,
    code: '',
    name: '',
    credits: 0,
  });
  protected readonly linkForm = signal<LinkAcademicSubjectCourseRequest>({
    subjectId: '',
    courseId: '',
    primary: true,
  });
  protected readonly termForm = signal<CreateAcademicTermRequest>({
    code: '',
    name: '',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    termNumber: 1,
    startsOn: null,
    endsOn: null,
  });
  protected readonly curriculumPlanForm = signal<CreateAcademicCurriculumPlanRequest>({
    programId: '',
    cohortId: null,
    code: '',
    name: '',
    totalCredits: 0,
  });
  protected readonly curriculumSubjectForm = signal<AddAcademicCurriculumSubjectRequest>({
    curriculumPlanId: '',
    subjectId: '',
    termId: null,
    displayOrder: 0,
    required: true,
    creditsOverride: null,
  });
  protected readonly learningPackageForm = signal<CreateAcademicLearningPackageRequest>({
    curriculumPlanId: null,
    code: '',
    name: '',
    description: null,
    packageType: 'CURRICULUM_BUNDLE',
    price: 0,
    currency: 'VND',
    enrollmentPolicy: 'ORG_APPROVAL',
  });
  protected readonly learningPackageItemForm = signal<AddAcademicLearningPackageItemRequest>({
    packageId: '',
    subjectId: null,
    courseId: null,
    displayOrder: 0,
    required: true,
    revenueWeight: 1,
  });
  protected readonly classTargetForm = signal<CreateAcademicLearningPackageClassTargetRequest>({
    packageId: '',
    courseId: '',
    classGroupId: null,
    learningClassId: '',
  });
  protected readonly packageTargetCourseOptions = computed(() => {
    const packageId = this.classTargetForm().packageId;
    if (!packageId) {
      return [];
    }

    const courseIds = new Set<string>();
    for (const item of this.catalog().learningPackageItems.filter(item => item.packageId === packageId)) {
      if (item.courseId) {
        courseIds.add(item.courseId);
      }
      if (item.subjectId) {
        this.catalog().subjectCourses
          .filter(link => link.subjectId === item.subjectId)
          .forEach(link => courseIds.add(link.courseId));
      }
    }

    return this.availableCourses().filter(course => courseIds.has(course.id));
  });
  protected readonly canCreateClassTarget = computed(() => {
    const form = this.classTargetForm();
    return Boolean(form.packageId && form.courseId && form.learningClassId);
  });
  protected readonly canCreateClassGroupMembership = computed(() => {
    const form = this.classGroupMembershipForm();
    return Boolean(form.classGroupId && form.studentId);
  });
  protected readonly canImportClassGroupRoster = computed(() => {
    const form = this.classGroupRosterForm();
    return Boolean(form.classGroupId && this.rosterEmails().length > 0);
  });

  ngOnInit(): void {
    void this.reload();
  }

  protected async reload(): Promise<void> {
    await Promise.all([
      this.loadCatalog(),
      this.loadCourses(),
      this.loadStudents(),
      this.loadCapabilities(),
      this.loadPackageEnrollments(),
    ]);
  }

  protected async loadCatalog(): Promise<void> {
    const orgId = this.organizationId();
    if (!orgId) {
      this.catalog.set(emptyCatalog());
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(this.academicApi.getCatalog(orgId));
      const catalog = { ...emptyCatalog(), ...(response.data ?? {}) };
      this.catalog.set(catalog);
      if (!this.selectedRevenuePackageId() && catalog.learningPackages.length > 0) {
        this.selectedRevenuePackageId.set(catalog.learningPackages[0].id);
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected async loadCourses(): Promise<void> {
    if (!this.organizationId()) {
      this.availableCourses.set([]);
      return;
    }

    try {
      const response = await firstValueFrom(this.adminService.getAllCourses({ page: 0, size: 100 }));
      this.availableCourses.set(response.data ?? []);
    } catch {
      this.availableCourses.set([]);
    }
  }

  protected async loadStudents(): Promise<void> {
    if (!this.organizationId()) {
      this.studentUsers.set([]);
      return;
    }

    try {
      const response = await firstValueFrom(this.adminService.getUsers({ page: 0, size: 200, role: 'STUDENT' }));
      this.studentUsers.set(response.data ?? []);
    } catch {
      this.studentUsers.set([]);
    }
  }

  protected async loadCapabilities(): Promise<void> {
    const orgId = this.organizationId();
    if (!orgId) {
      this.capabilities.set([]);
      return;
    }

    try {
      this.capabilities.set(await firstValueFrom(this.organizationService.listCapabilities(orgId)));
    } catch {
      this.capabilities.set([]);
    }
  }

  protected async loadPackageEnrollments(): Promise<void> {
    const orgId = this.organizationId();
    if (!orgId) {
      this.packageEnrollments.set([]);
      return;
    }

    try {
      const status = this.packageEnrollmentStatusFilter() || undefined;
      const response = await firstValueFrom(this.academicApi.listLearningPackageEnrollments(orgId, status));
      this.packageEnrollments.set(response.data ?? []);
    } catch {
      this.packageEnrollments.set([]);
    }
  }

  protected changePackageEnrollmentStatusFilter(event: Event): void {
    this.packageEnrollmentStatusFilter.set(this.text(event) as PackageEnrollmentStatusFilter);
    void this.loadPackageEnrollments();
  }

  protected async downloadPackageEnrollmentsCsv(): Promise<void> {
    const orgId = this.organizationId();
    if (!orgId) {
      this.error.set('Không xác định được tổ chức để xuất CSV.');
      return;
    }

    this.exportingPackageEnrollments.set(true);
    this.error.set(null);
    try {
      const status = this.packageEnrollmentStatusFilter() || undefined;
      const blob = await firstValueFrom(this.academicApi.exportLearningPackageEnrollmentsCsv(orgId, status));
      this.saveBlob(blob, `learning-package-enrollments-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.exportingPackageEnrollments.set(false);
    }
  }

  protected async loadRevenueAllocation(event?: Event): Promise<void> {
    event?.preventDefault();
    const orgId = this.organizationId();
    const packageId = this.selectedRevenuePackageId();
    if (!orgId || !packageId) {
      this.error.set('Vui lòng chọn gói học cần xem phân bổ.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.academicApi.previewLearningPackageRevenueAllocation(orgId, packageId)
      );
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không tải được phân bổ học phí.');
      }
      this.packageRevenueAllocations.update(current => ({ ...current, [packageId]: response.data }));
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected async createDepartment(event: Event): Promise<void> {
    event.preventDefault();
    const form = this.departmentForm();
    await this.mutate(
      this.academicApi.createDepartment(this.organizationId(), {
        code: form.code.trim(),
        name: form.name.trim(),
      }),
      'Đã tạo khoa.',
      () => this.departmentForm.set({ code: '', name: '' })
    );
  }

  protected async createProgram(event: Event): Promise<void> {
    event.preventDefault();
    const form = this.programForm();
    await this.mutate(
      this.academicApi.createProgram(this.organizationId(), {
        departmentId: form.departmentId,
        code: form.code.trim(),
        name: form.name.trim(),
        level: form.level?.trim() || null,
      }),
      'Đã tạo ngành.',
      () => this.programForm.set({ departmentId: null, code: '', name: '', level: null })
    );
  }

  protected async createCohort(event: Event): Promise<void> {
    event.preventDefault();
    const form = this.cohortForm();
    await this.mutate(
      this.academicApi.createCohort(this.organizationId(), {
        code: form.code.trim(),
        name: form.name.trim(),
        startYear: form.startYear,
        graduationYear: form.graduationYear,
      }),
      'Đã tạo khóa tuyển sinh.',
      () => this.cohortForm.set({ code: '', name: '', startYear: new Date().getFullYear(), graduationYear: null })
    );
  }

  protected async createClassGroup(event: Event): Promise<void> {
    event.preventDefault();
    const form = this.classGroupForm();
    await this.mutate(
      this.academicApi.createClassGroup(this.organizationId(), {
        programId: form.programId,
        cohortId: form.cohortId,
        code: form.code.trim(),
        name: form.name.trim(),
      }),
      'Đã tạo lớp hành chính.',
      () => this.classGroupForm.set({ programId: '', cohortId: '', code: '', name: '' })
    );
  }

  protected async createClassGroupMembership(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canCreateClassGroupMembership()) {
      this.error.set('Vui lòng chọn lớp hành chính và sinh viên.');
      return;
    }

    const form = this.classGroupMembershipForm();
    await this.mutate(
      this.academicApi.createClassGroupMembership(this.organizationId(), form),
      'Đã gán sinh viên vào lớp hành chính.',
      () => this.classGroupMembershipForm.set({ classGroupId: '', studentId: '' })
    );
  }

  protected async importClassGroupRoster(event: Event): Promise<void> {
    event.preventDefault();
    const form = this.classGroupRosterForm();
    const studentEmails = this.rosterEmails();
    if (!form.classGroupId || studentEmails.length === 0) {
      this.error.set('Vui lòng chọn lớp hành chính và nhập ít nhất một email sinh viên.');
      return;
    }
    if (!this.organizationId()) {
      this.error.set('Không tìm thấy tổ chức hiện tại.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    this.classGroupRosterResult.set(null);
    try {
      const response = await firstValueFrom(this.academicApi.bulkImportClassGroupRoster(this.organizationId(), {
        classGroupId: form.classGroupId,
        studentEmails,
      }));
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể nhập danh sách lớp.');
      }
      this.classGroupRosterResult.set(response.data);
      this.classGroupRosterForm.set({ classGroupId: form.classGroupId, rosterText: '' });
      this.success.set(
        `Đã xử lý ${response.data.total} dòng: ${response.data.assigned} gán mới, ${response.data.transferred} chuyển lớp, ${response.data.failed} lỗi.`
      );
      await this.loadCatalog();
      await this.loadPackageEnrollments();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected async transferClassGroupMembership(membership: AcademicClassGroupMembership): Promise<void> {
    const classGroupId = this.transferTargetFor(membership.id);
    if (!classGroupId || classGroupId === membership.classGroupId) {
      this.error.set('Vui lòng chọn lớp hành chính mới cho sinh viên.');
      return;
    }

    await this.mutate(
      this.academicApi.transferClassGroupMembership(this.organizationId(), membership.id, { classGroupId }),
      'Đã chuyển sinh viên sang lớp hành chính mới.',
      () => this.clearTransferTarget(membership.id)
    );
  }

  protected async createSubject(event: Event): Promise<void> {
    event.preventDefault();
    const form = this.subjectForm();
    await this.mutate(
      this.academicApi.createSubject(this.organizationId(), {
        departmentId: form.departmentId,
        code: form.code.trim(),
        name: form.name.trim(),
        credits: form.credits,
      }),
      'Đã tạo môn học.',
      () => this.subjectForm.set({ departmentId: null, code: '', name: '', credits: 0 })
    );
  }

  protected async linkSubjectCourse(event: Event): Promise<void> {
    event.preventDefault();
    const form = this.linkForm();
    await this.mutate(
      this.academicApi.linkSubjectCourse(this.organizationId(), {
        subjectId: form.subjectId,
        courseId: form.courseId.trim(),
        primary: form.primary,
      }),
      'Đã liên kết môn với khóa học LMS.',
      () => this.linkForm.set({ subjectId: '', courseId: '', primary: true })
    );
  }

  protected async createTerm(event: Event): Promise<void> {
    event.preventDefault();
    const form = this.termForm();
    await this.mutate(
      this.academicApi.createTerm(this.organizationId(), {
        code: form.code.trim(),
        name: form.name.trim(),
        academicYear: form.academicYear.trim(),
        termNumber: form.termNumber,
        startsOn: form.startsOn,
        endsOn: form.endsOn,
      }),
      'Đã tạo học kỳ.',
      () => this.termForm.set({
        code: '',
        name: '',
        academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        termNumber: 1,
        startsOn: null,
        endsOn: null,
      })
    );
  }

  protected async createCurriculumPlan(event: Event): Promise<void> {
    event.preventDefault();
    const form = this.curriculumPlanForm();
    await this.mutate(
      this.academicApi.createCurriculumPlan(this.organizationId(), {
        programId: form.programId,
        cohortId: form.cohortId,
        code: form.code.trim(),
        name: form.name.trim(),
        totalCredits: form.totalCredits,
      }),
      'Đã tạo khung chương trình.',
      () => this.curriculumPlanForm.set({
        programId: '',
        cohortId: null,
        code: '',
        name: '',
        totalCredits: 0,
      })
    );
  }

  protected async addCurriculumSubject(event: Event): Promise<void> {
    event.preventDefault();
    const form = this.curriculumSubjectForm();
    await this.mutate(
      this.academicApi.addCurriculumSubject(this.organizationId(), {
        curriculumPlanId: form.curriculumPlanId,
        subjectId: form.subjectId,
        termId: form.termId,
        displayOrder: form.displayOrder,
        required: form.required,
        creditsOverride: form.creditsOverride,
      }),
      'Đã thêm môn vào khung chương trình.',
      () => this.curriculumSubjectForm.set({
        curriculumPlanId: '',
        subjectId: '',
        termId: null,
        displayOrder: 0,
        required: true,
        creditsOverride: null,
      })
    );
  }

  protected async createLearningPackage(event: Event): Promise<void> {
    event.preventDefault();
    const form = this.learningPackageForm();
    await this.mutate(
      this.academicApi.createLearningPackage(this.organizationId(), {
        curriculumPlanId: form.curriculumPlanId,
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description?.trim() || null,
        packageType: form.packageType,
        price: form.price,
        currency: form.currency,
        enrollmentPolicy: form.enrollmentPolicy,
      }),
      'Đã tạo gói học.',
      () => this.learningPackageForm.set({
        curriculumPlanId: null,
        code: '',
        name: '',
        description: null,
        packageType: 'CURRICULUM_BUNDLE',
        price: 0,
        currency: 'VND',
        enrollmentPolicy: 'ORG_APPROVAL',
      })
    );
  }

  protected async addLearningPackageItem(event: Event): Promise<void> {
    event.preventDefault();
    const form = this.learningPackageItemForm();
    await this.mutate(
      this.academicApi.addLearningPackageItem(this.organizationId(), {
        packageId: form.packageId,
        subjectId: form.subjectId,
        courseId: form.courseId,
        displayOrder: form.displayOrder,
        required: form.required,
        revenueWeight: form.revenueWeight,
      }),
      'Đã thêm mục vào gói học.',
      () => this.learningPackageItemForm.set({
        packageId: '',
        subjectId: null,
        courseId: null,
        displayOrder: 0,
        required: true,
        revenueWeight: 1,
      })
    );
  }

  protected async createLearningPackageClassTarget(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canCreateClassTarget()) {
      this.error.set('Vui lòng chọn đủ gói học, course và lớp triển khai.');
      return;
    }

    const form = this.classTargetForm();
    await this.mutate(
      this.academicApi.createLearningPackageClassTarget(this.organizationId(), form),
      'Đã gắn gói học với lớp triển khai.',
      () => {
        this.classTargetForm.set({ packageId: '', courseId: '', classGroupId: null, learningClassId: '' });
        this.learningClasses.set([]);
      }
    );
  }

  protected async approvePackageEnrollment(enrollment: AcademicLearningPackageEnrollment): Promise<void> {
    await this.mutate(
      this.academicApi.approveLearningPackageEnrollment(this.organizationId(), enrollment.id, {
        note: 'Đã duyệt theo chính sách của tổ chức.',
      }),
      'Đã duyệt yêu cầu gói học.',
      () => undefined
    );
  }

  protected async rejectPackageEnrollment(enrollment: AcademicLearningPackageEnrollment): Promise<void> {
    await this.mutate(
      this.academicApi.rejectLearningPackageEnrollment(this.organizationId(), enrollment.id, {
        note: 'Chưa đủ điều kiện theo chính sách của tổ chức.',
      }),
      'Đã từ chối yêu cầu gói học.',
      () => undefined
    );
  }

  protected async completePackagePayment(enrollment: AcademicLearningPackageEnrollment): Promise<void> {
    const paymentReference = this.paymentReferenceFor(enrollment.id).trim() || null;
    await this.mutate(
      this.academicApi.completeLearningPackagePayment(this.organizationId(), enrollment.id, {
        note: paymentReference
          ? `Đã xác nhận thanh toán gói học (${paymentReference}).`
          : 'Đã xác nhận thanh toán gói học.',
        paymentReference,
      }),
      'Đã xác nhận thanh toán và kích hoạt gói học.',
      () => this.clearPaymentReference(enrollment.id)
    );
    if (this.packageRevenueSplits()[enrollment.id]) {
      await this.loadPackageRevenueSplits(enrollment);
    }
  }

  protected async refundPackageEnrollment(enrollment: AcademicLearningPackageEnrollment): Promise<void> {
    const paymentReference = this.paymentReferenceFor(enrollment.id).trim() || null;
    await this.mutate(
      this.academicApi.refundLearningPackageEnrollment(this.organizationId(), enrollment.id, {
        note: paymentReference
          ? `Đã hoàn học phí gói học (${paymentReference}).`
          : 'Đã hoàn học phí gói học.',
        paymentReference,
      }),
      'Đã hoàn tiền gói học và thu hồi quyền truy cập liên quan.',
      () => this.clearPaymentReference(enrollment.id)
    );
    this.packageRevenueSplits.update(current => {
      const next = { ...current };
      delete next[enrollment.id];
      return next;
    });
  }

  protected async loadPackageRevenueSplits(enrollment: AcademicLearningPackageEnrollment): Promise<void> {
    const orgId = this.organizationId();
    if (!orgId) {
      this.error.set('Không tìm thấy tổ chức hiện tại.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.academicApi.listLearningPackageRevenueSplits(orgId, enrollment.id)
      );
      if (!response.success) {
        throw new Error(response.message || 'Không tải được dữ liệu đối soát doanh thu.');
      }
      this.packageRevenueSplits.update(current => ({
        ...current,
        [enrollment.id]: response.data ?? [],
      }));
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected selectPackageSubject(event: Event): void {
    const subjectId = this.nullableText(event);
    this.learningPackageItemForm.update(current => ({
      ...current,
      subjectId,
      courseId: subjectId ? null : current.courseId,
    }));
  }

  protected selectPackageCourse(event: Event): void {
    const courseId = this.nullableText(event);
    this.learningPackageItemForm.update(current => ({
      ...current,
      courseId,
      subjectId: courseId ? null : current.subjectId,
    }));
  }

  protected selectClassTargetPackage(event: Event): void {
    this.classTargetForm.set({
      packageId: this.text(event),
      courseId: '',
      classGroupId: null,
      learningClassId: '',
    });
    this.learningClasses.set([]);
  }

  protected async selectClassTargetCourse(event: Event): Promise<void> {
    const courseId = this.text(event);
    this.classTargetForm.update(current => ({
      ...current,
      courseId,
      learningClassId: '',
    }));
    await this.loadLearningClasses(courseId);
  }

  private async loadLearningClasses(courseId: string): Promise<void> {
    if (!courseId) {
      this.learningClasses.set([]);
      return;
    }

    try {
      const classes = await firstValueFrom(this.classService.getClassesByCourse(courseId));
      this.learningClasses.set(classes);
      this.rememberClasses(classes);
    } catch {
      this.learningClasses.set([]);
    }
  }

  private rememberClasses(classes: ClassSummary[]): void {
    this.classNameCache.update(current => ({
      ...current,
      ...Object.fromEntries(classes.map(item => [item.id, `${item.code} - ${item.name}`])),
    }));
  }

  protected patch<T extends object>(target: WritableSignal<T>, value: Partial<T>): void {
    target.update(current => ({ ...current, ...value }));
  }

  protected text(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected textarea(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }

  protected nullableText(event: Event): string | null {
    const value = this.text(event).trim();
    return value.length > 0 ? value : null;
  }

  protected numberValue(event: Event): number {
    const value = Number(this.text(event));
    return Number.isFinite(value) ? value : 0;
  }

  protected nullableNumber(event: Event): number | null {
    const value = this.text(event).trim();
    return value.length > 0 ? this.numberValue(event) : null;
  }

  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected subjectLabel(subjectId: string): string {
    const subject = this.catalog().subjects.find(item => item.id === subjectId);
    return subject ? `${subject.code} - ${subject.name}` : subjectId;
  }

  protected courseLabel(courseId: string): string {
    const course = this.availableCourses().find(item => item.id === courseId);
    return course ? `${course.code} - ${course.title}` : courseId;
  }

  protected classGroupLabel(classGroupId: string): string {
    const classGroup = this.catalog().classGroups.find(item => item.id === classGroupId);
    return classGroup ? `${classGroup.code} - ${classGroup.name}` : this.shortId(classGroupId);
  }

  protected classGroupScopeLabel(classGroupId: string | null): string {
    return classGroupId ? this.classGroupLabel(classGroupId) : 'Mặc định';
  }

  protected classGroupMembershipStatusLabel(membership: AcademicClassGroupMembership): string {
    return membership.status === 'ACTIVE' ? 'Đang học' : 'Đã rời lớp';
  }

  protected canTransferMembership(membership: AcademicClassGroupMembership): boolean {
    const targetClassGroupId = this.transferTargetFor(membership.id);
    return Boolean(targetClassGroupId && targetClassGroupId !== membership.classGroupId);
  }

  protected studentLabel(studentId: string): string {
    const student = this.studentUsers().find(item => item.id === studentId);
    return student ? `${student.name || student.email} - ${student.email}` : this.shortId(studentId);
  }

  protected learningClassLabel(learningClassId: string): string {
    return this.classNameCache()[learningClassId] ?? this.shortId(learningClassId);
  }

  protected termLabel(termId: string | null): string {
    if (!termId) {
      return 'Chưa gán học kỳ';
    }
    const term = this.catalog().terms.find(item => item.id === termId);
    return term ? `${term.code} - ${term.name}` : termId;
  }

  protected curriculumPlanLabel(planId: string): string {
    const plan = this.catalog().curriculumPlans.find(item => item.id === planId);
    return plan ? plan.code : planId;
  }

  protected learningPackageLabel(packageId: string): string {
    const learningPackage = this.catalog().learningPackages.find(item => item.id === packageId);
    return learningPackage ? learningPackage.code : packageId;
  }

  protected packageItemLabel(item: AcademicLearningPackageItem): string {
    if (item.subjectId) {
      return this.subjectLabel(item.subjectId);
    }
    return item.courseId ? this.courseLabel(item.courseId) : 'Chưa chọn mục';
  }

  protected packageAllocationItemLabel(row: AcademicLearningPackageRevenueAllocation['items'][number]): string {
    if (row.subjectId) {
      return this.subjectLabel(row.subjectId);
    }
    return row.courseId ? this.courseLabel(row.courseId) : this.shortId(row.itemId);
  }

  protected packageRevenueSplitLabel(split: AcademicLearningPackageRevenueSplit): string {
    if (split.subjectId) {
      return this.subjectLabel(split.subjectId);
    }
    return split.courseId ? this.courseLabel(split.courseId) : this.shortId(split.packageItemId);
  }

  protected enrollmentPolicyLabel(policy: string): string {
    switch (policy) {
      case 'OPEN':
        return 'Tự ghi danh';
      case 'PAYMENT_REQUIRED':
        return 'Cần thanh toán';
      case 'INVITE_ONLY':
        return 'Chỉ theo lời mời';
      default:
        return 'Cần ORG duyệt';
    }
  }

  protected enrollmentStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Đã kích hoạt';
      case 'PENDING_PAYMENT':
        return 'Chờ thanh toán';
      case 'REJECTED':
        return 'Đã từ chối';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'REFUNDED':
        return 'Đã hoàn tiền';
      default:
        return 'Chờ ORG duyệt';
    }
  }

  protected shortId(id: string): string {
    return id.length > 8 ? id.slice(0, 8) : id;
  }

  protected paymentReferenceFor(enrollmentId: string): string {
    return this.packagePaymentReferences()[enrollmentId] ?? '';
  }

  protected revenueSplitsFor(enrollmentId: string): AcademicLearningPackageRevenueSplit[] | null {
    return this.packageRevenueSplits()[enrollmentId] ?? null;
  }

  protected setPaymentReference(enrollmentId: string, event: Event): void {
    const value = this.text(event);
    this.packagePaymentReferences.update(current => ({ ...current, [enrollmentId]: value }));
  }

  protected transferTargetFor(membershipId: string): string {
    return this.classGroupTransferTargets()[membershipId] ?? '';
  }

  protected setTransferTarget(membershipId: string, event: Event): void {
    const value = this.text(event);
    this.classGroupTransferTargets.update(current => ({ ...current, [membershipId]: value }));
  }

  protected clearTransferTarget(membershipId: string): void {
    this.classGroupTransferTargets.update(current => {
      const next = { ...current };
      delete next[membershipId];
      return next;
    });
  }

  protected clearPaymentReference(enrollmentId: string): void {
    this.packagePaymentReferences.update(current => {
      const next = { ...current };
      delete next[enrollmentId];
      return next;
    });
  }

  protected formatEnrollmentPayment(enrollment: AcademicLearningPackageEnrollment): string {
    return this.formatPrice(enrollment.paymentAmount ?? 0, enrollment.paymentCurrency ?? 'VND');
  }

  protected formatPrice(price: number, currency: string): string {
    if (!price) {
      return 'Miễn phí';
    }
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency || 'VND',
      maximumFractionDigits: 0,
    }).format(price);
  }

  private rosterEmails(): string[] {
    return this.classGroupRosterForm()
      .rosterText
      .split(/[\n,;]+/)
      .map(email => email.trim())
      .filter(Boolean);
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  private async mutate<T>(
    request: Observable<ApiResponse<T>>,
    successMessage: string,
    reset: () => void
  ): Promise<void> {
    if (!this.organizationId()) {
      this.error.set('Không tìm thấy tổ chức hiện tại.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    try {
      const response = await firstValueFrom(request);
      if (!response.success) {
        throw new Error(response.message || 'Thao tác không thành công.');
      }
      reset();
      this.success.set(successMessage);
      await this.loadCatalog();
      await this.loadPackageEnrollments();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Có lỗi xảy ra, vui lòng thử lại.';
  }
}
