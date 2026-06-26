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
  AddAcademicCurriculumSubjectRequest,
  CreateAcademicCurriculumPlanRequest,
  CreateAcademicClassGroupRequest,
  CreateAcademicCohortRequest,
  CreateAcademicDepartmentRequest,
  CreateAcademicProgramRequest,
  CreateAcademicSubjectRequest,
  CreateAcademicTermRequest,
  LinkAcademicSubjectCourseRequest,
} from '../../api/types/academic.types';
import { AuthService } from '../../core/services/auth.service';
import { AdminCourseSummary, AdminService } from '../admin/infrastructure/services/admin.service';

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
});

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
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-9">
            <div class="metric-card"><span>Khoa</span><strong>{{ catalog().departments.length }}</strong></div>
            <div class="metric-card"><span>Ngành</span><strong>{{ catalog().programs.length }}</strong></div>
            <div class="metric-card"><span>Khóa</span><strong>{{ catalog().cohorts.length }}</strong></div>
            <div class="metric-card"><span>Lớp</span><strong>{{ catalog().classGroups.length }}</strong></div>
            <div class="metric-card"><span>Môn học</span><strong>{{ catalog().subjects.length }}</strong></div>
            <div class="metric-card"><span>Course map</span><strong>{{ catalog().subjectCourses.length }}</strong></div>
            <div class="metric-card"><span>Học kỳ</span><strong>{{ catalog().terms.length }}</strong></div>
            <div class="metric-card"><span>Khung CT</span><strong>{{ catalog().curriculumPlans.length }}</strong></div>
            <div class="metric-card"><span>Môn trong khung</span><strong>{{ catalog().curriculumSubjects.length }}</strong></div>
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
    .secondary-button {
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

    .primary-button:hover,
    .secondary-button:hover {
      transform: translateY(-1px);
    }

    .primary-button:disabled,
    .secondary-button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
      transform: none;
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
  private auth = inject(AuthService);

  protected readonly catalog = signal<AcademicCatalog>(emptyCatalog());
  protected readonly availableCourses = signal<AdminCourseSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  protected readonly organizationId = computed(() => this.auth.currentUserSignal()?.organizationId ?? '');

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

  ngOnInit(): void {
    void this.reload();
  }

  protected async reload(): Promise<void> {
    await Promise.all([this.loadCatalog(), this.loadCourses()]);
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
      this.catalog.set(response.data ?? emptyCatalog());
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

  protected patch<T extends object>(target: WritableSignal<T>, value: Partial<T>): void {
    target.update(current => ({ ...current, ...value }));
  }

  protected text(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
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
