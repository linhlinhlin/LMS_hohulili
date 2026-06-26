# VMU ORG Domain Roadmap

> Date: 2026-06-26  
> Runtime checked: `https://holilihu.online` / `34.87.45.168`  
> Scope: VMU-oriented organization workflows, demo payout data, and next domain slices.

## 1. Decision

Keep HoHoLiHu as a modular monolith for the next ORG phase. Do not split into microservices yet.

The correct next step is to deepen the ORG domain around VMU-style academic operations:

- academic catalog: khoa, nganh, khoa tuyen sinh, lop hanh chinh, mon hoc;
- course mapping: subject maps to one or more LMS courses;
- package/tuition/enrollment policies: modeled as organization data and policies, not `if VMU` branches;
- payment/payout operations: ORG_ADMIN approves/rejects same-org payout requests, system ADMIN completes actual bank-transfer settlement.

This keeps the design close to the current Clean Architecture/DDD boundaries and avoids speculative platform complexity.

## 2. VMU business context

Sources reviewed:

- Vietnam Maritime University official site: `https://vimaru.edu.vn/`
- VMU admissions/training portal: `https://tuyensinh.vimaru.edu.vn/`
- VMU admissions training-program area: `https://tuyensinh.vimaru.edu.vn/chuong-trinh-dao-tao`

Useful domain inferences for the LMS:

- VMU-style operation is not just "courses". It needs an academic catalog: faculties/departments, training programs/majors, cohorts, administrative class groups, and academic subjects.
- A subject is different from an LMS course. A subject is the academic unit; an LMS course is the online learning content or delivery instance for that subject.
- Programs can require different subject mappings, packages, tuition rules, and enrollment windows.
- VMU-specific behavior should be represented as organization-scoped data: capabilities, policies, catalogs, packages, and mappings.

## 3. Current implementation baseline

Already deployed on review runtime:

- `/org-admin/academic`
  - API: `/api/v3/organizations/{orgId}/academic/catalog`
  - Current VMU-style seed counts: 4 departments, 4 programs, 3 cohorts, 4 class groups, 9 subjects, 9 subject-course links.
- `/org-admin/organization?tab=payment-config`
  - API: `/api/v3/organizations/{orgId}/payment-config`
  - Current config smoke: platform fee `20`, teacher share `80`, min payout `100000`.
- `/org-admin/payouts`
  - API: `/api/v3/admin/revenue/payouts`
  - ORG_ADMIN can list/approve/reject same-org payout requests.
  - Complete payout remains ADMIN-only because it represents confirmed manual bank transfer.

Relevant current tables:

- `organizations`
- `users`
- `courses`
- `learning_classes`
- `academic_departments`
- `academic_programs`
- `academic_cohorts`
- `academic_class_groups`
- `academic_subjects`
- `academic_subject_courses`
- `org_payment_configs`
- `teacher_bank_accounts`
- `payout_requests`
- `payment_transactions`

## 4. Demo payout data seeded on review runtime

Before seeding, a production DB backup was created on the VM:

```text
/home/Admin/apps/LMS_hohulili/backups/lms-before-demo-payout-20260626-081335.dump
```

Seed label:

```text
[DEMO-ORG-PAYOUT-20260626]
```

Seeded data:

| Status | Count | Purpose |
| --- | ---: | --- |
| `PENDING` | 2 | Demo ORG_ADMIN approve/reject actions |
| `APPROVED` | 1 | Demo system ADMIN complete action |
| `COMPLETED` | 1 | Historical completed row |
| `REJECTED` | 1 | Historical rejected row |

API smoke:

```text
ORG_ADMIN PENDING   total=2 demo=2
ORG_ADMIN APPROVED  total=1 demo=1
ORG_ADMIN COMPLETED total=1 demo=1
ORG_ADMIN REJECTED  total=1 demo=1
ORG_ADMIN complete approved payout -> 403 expected
ADMIN approved queue has 1 demo row available for complete
```

Important invariant:

- ORG_ADMIN can approve/reject payout requests within their organization.
- ADMIN completes payout after the actual bank transfer has been performed.
- Do not weaken this unless the finance process explicitly assigns settlement authority to ORG_ADMIN.

Cleanup SQL if needed:

```sql
BEGIN;

DELETE FROM payout_requests
WHERE teacher_note LIKE '[DEMO-ORG-PAYOUT-20260626]%'
   OR admin_note LIKE '[DEMO-ORG-PAYOUT-20260626]%';

DELETE FROM teacher_bank_accounts
WHERE account_number IN (
  '970400000001',
  '970400000002',
  '970400000003',
  '970400000004',
  '970400000005'
);

COMMIT;
```

## 5. Browser smoke evidence

Smoke was run against `https://holilihu.online` as `orgadmin@maritime.edu`.

Artifacts:

```text
E:\Sach\Sua\LMS_hohulili\artifacts\org-admin-smoke-20260626\academic.png
E:\Sach\Sua\LMS_hohulili\artifacts\org-admin-smoke-20260626\payment-config.png
E:\Sach\Sua\LMS_hohulili\artifacts\org-admin-smoke-20260626\payouts.png
```

Results:

| Route | Result |
| --- | --- |
| `/org-admin/academic` | Rendered academic catalog; API 200; counts 4/4/3/4/9/9 |
| `/org-admin/organization?tab=payment-config` | Rendered payment config; 3 numeric inputs; values `20`, `80`, `100000` |
| `/org-admin/payouts` | Rendered payout queue; KPI cards show 2 pending, 1 approved, 1 completed, 1 rejected |

One aborted request to `/api/v3/auth/google/config` appeared while leaving the login page during test setup. It was a navigation abort, not a route failure.

## 6. Next VMU-specific domain slices

### Phase A - Curriculum plan

Goal: represent a VMU program/cohort curriculum without hardcoding VMU in code.

Candidate tables:

- `academic_terms`
- `curriculum_plans`
- `curriculum_subjects`

Rules:

- `curriculum_plans.organization_id` is mandatory.
- A plan belongs to `program_id` and optionally `cohort_id`.
- `curriculum_subjects` points to `academic_subjects`, with suggested term/order/required flag.
- Add prerequisite relationships only when the UI/API needs them.

### Phase B - Learning packages

Goal: sell or assign groups of subjects/courses as organization-defined packages.

Candidate tables:

- `learning_packages`
- `learning_package_items`
- optional `learning_package_prices`

Rules:

- A package belongs to one organization.
- Package items can reference subject, course, or class depending on the workflow.
- Do not overload `courses` to mean package.

### Phase C - Tuition and enrollment policy

Goal: let VMU define how students can enroll and how tuition/payment rules apply.

Candidate tables:

- `org_enrollment_policies`
- `org_tuition_policies`
- optional `class_group_enrollment_rules`

Rules:

- Store the rule as data first.
- Promote to typed columns only after at least one real workflow depends on it.
- Keep backend as the source of truth for payment and enrollment authorization.

### Phase D - Capabilities / feature flags

Only add after at least two organizations need different behavior.

Candidate model:

- `organization_capabilities`
  - `organization_id`
  - `key`
  - `enabled`
  - optional `config jsonb`

Examples:

- `academic_catalog`
- `curriculum_plan`
- `learning_packages`
- `tuition_policy`
- `offline_device_limit`
- `org_payout_approval`

Do not start with a plugin system. A simple organization capability table is enough until proven otherwise.

## 7. Implementation rules for the next PR

- Use `cot-research` before architecture/workflow decisions.
- Use `01-backend-ddd-development` for Spring Boot/DDD changes.
- Use `lms-schema-audit` and `postgresql` before Flyway/schema changes.
- Use `angular-v20-frontend-development` for org-admin UI changes.
- Use `ponytail` to keep the change minimal.
- Use `karpathy-guidelines` to state assumptions, success criteria, and verification.
- Keep VMU as data/config, not code branches.
- Add tests before deploying to review runtime.

## 8. Suggested next PR shape

Smallest valuable next PR:

```text
feat(org): add curriculum plan foundation
```

Scope:

- migration for `academic_terms`, `curriculum_plans`, `curriculum_subjects`;
- domain/usecase/repository/controller for read/create minimal flows;
- seed one VMU curriculum plan for one program/cohort;
- org-admin read-only or minimal create UI;
- backend tests for same-org access and cross-org denial;
- browser smoke on `/org-admin/academic` or a new `/org-admin/curriculum` route.

Non-goals:

- no microservice split;
- no advanced package pricing yet;
- no generic feature-flag system until a second org needs different behavior;
- no redesign unless the workflow is blocked.

## 9. Phase A implementation - curriculum plan foundation

Status on 2026-06-26: implemented in branch `codex/vmu-org-curriculum`.

Purpose:

- let an ORG model VMU-style academic terms and curriculum plans as data;
- keep `Subject` separate from LMS `Course`;
- enforce same-organization boundaries at both use-case and database level;
- avoid `if VMU` branches in backend or frontend.

Backend scope:

- `V143__academic_curriculum_plans.sql`
  - adds `academic_terms`;
  - adds `curriculum_plans`;
  - adds `curriculum_subjects`;
  - adds composite same-org foreign keys for program/cohort/subject/term references;
  - keeps indexes on organization, plan, subject, and term lookup paths.
- `V144__seed_vmu_curriculum_plan.sql`
  - seeds three VMU-style academic terms;
  - seeds one demo curriculum plan for the existing `DKT` program and `K63` cohort;
  - maps six existing maritime subjects into that curriculum plan.
- `academic` module now has minimal domain records and APIs for:
  - creating terms;
  - creating curriculum plans;
  - adding subjects to curriculum plans;
  - reading the expanded catalog payload.

Frontend scope:

- `/org-admin/academic` now shows counts for terms, curriculum plans, and curriculum subjects.
- ORG_ADMIN can create:
  - `Học kỳ / năm học`;
  - `Khung chương trình`;
  - `Môn trong khung chương trình`.
- The UI remains a minimal workflow extension, not a visual redesign.

Verification:

```bash
cd backend
mvn "-Dtest=ManageAcademicCatalogUseCaseTest,AcademicCatalogControllerV3Test" test
# Tests run: 6, Failures: 0, Errors: 0

mvn resources:resources flyway:migrate \
  "-Dflyway.url=jdbc:postgresql://localhost:55432/lms" \
  "-Dflyway.user=lms" \
  "-Dflyway.password=lms"
# Successfully applied migrations through v144 on a temporary PostgreSQL 16 container

cd ../fe
npm run build -- --configuration development
# Application bundle generation complete

git diff --check
# pass
```

Important notes:

- The `academic_terms` composite FK from `curriculum_subjects` uses `ON DELETE SET NULL (term_id)` so deleting a term cannot accidentally null the tenant column.
- `fe/public/sitemap-courses.xml` may be regenerated by frontend builds and should not be included in this PR unless the SEO sitemap itself is intentionally changed.

Debt after Phase A:

- Add package/tuition/enrollment policy only after the curriculum workflow is accepted.
- Add search/debounce to selectors when an organization has many programs, cohorts, subjects, or courses.
- Run browser smoke against `/org-admin/academic` after this branch is merged/deployed to the review runtime.

## 10. Phase A merge, deploy, and production smoke

Status on 2026-06-26: merged and deployed to the GCP review runtime.

GitHub flow:

- PR: `#520` - `feat(org): add VMU curriculum plan foundation`.
- Merge commit: `bae5b71a21b65025a2d817cb5e7b0acc39dd09b8`.
- PR CI: backend, frontend, compose validation, Cloudflare Worker tests, and Docker smoke all passed.
- Main CI after merge: backend, frontend, compose validation, Cloudflare Worker tests, and Docker smoke all passed.
- Main `Build & Deploy`: completed successfully.

Production API smoke against `https://holilihu.online`:

```text
GET /actuator/health -> UP
POST /api/v3/auth/login as orgadmin@maritime.edu -> ORG_ADMIN
GET /api/v3/organizations/{orgId}/academic/catalog -> 200
```

Catalog counts after deploy:

| Item | Count |
| --- | ---: |
| Departments | 4 |
| Programs | 4 |
| Cohorts | 3 |
| Class groups | 4 |
| Subjects | 9 |
| Subject-course links | 9 |
| Academic terms | 3 |
| Curriculum plans | 1 |
| Curriculum subjects | 6 |
| Courses retained | 174 |

Production browser smoke:

```text
Route: https://holilihu.online/org-admin/academic
Catalog API response: 200
Visible cards: Học kỳ / năm học, Khung chương trình, Môn trong khung chương trình
Seed plan visible: DKT-K63-CDIO
Console errors: 0
Page errors: 0
Screenshot: artifacts/org-admin-curriculum-smoke-20260626/academic-curriculum-production.png
```

Conclusion:

- Phase A is live on the review runtime.
- VMU curriculum structure is represented as organization-scoped data, not hardcoded VMU logic.
- The next meaningful product slice is package/tuition/enrollment policy; do not add those tables until the workflow and demo script are explicit.

## 11. Phase B implementation - learning packages and tuition entry point

Status on 2026-06-26: implemented in branch `codex/vmu-learning-packages`.

Purpose:

- let an ORG define learning packages as business data, not as a special VMU code path;
- represent VMU-style bundles such as a foundation package for a program/cohort curriculum;
- keep `packages` in the assessment/question-bank domain untouched because that table already has a different meaning;
- create the smallest useful foundation for tuition and enrollment policy without wiring package checkout prematurely.

Backend scope:

- `V145__academic_learning_packages.sql`
  - adds `learning_packages`;
  - adds `learning_package_items`;
  - adds same-organization composite foreign keys for curriculum plans, subjects, and courses;
  - enforces non-negative price, three-letter currency codes, valid package type, valid enrollment policy, and exactly one target per package item;
  - adds duplicate-prevention indexes for subject/course items inside one package.
- `V146__seed_vmu_learning_packages.sql`
  - seeds package `VMU-DKT-K63-FOUNDATION`;
  - maps six existing VMU-style maritime subjects from the `DKT-K63-CDIO` curriculum plan into the package.
- The `academic` module now has minimal domain records and APIs for:
  - creating a learning package;
  - adding a subject or course item into a learning package;
  - reading learning packages and package items in the expanded academic catalog payload.

Frontend scope:

- `/org-admin/academic` now shows counts for `Gói học` and `Mục trong gói`.
- ORG_ADMIN can create:
  - `Gói học / học phí`;
  - `Môn / course trong gói học`.
- Package item creation intentionally allows either a subject or a course, but not both.
- The UI remains a minimal workflow extension; this is not a design-system redesign.

Important boundaries:

- `learning_packages` is part of the org academic/business domain.
- Existing `packages` remains part of the assessment/question-bank workflow.
- Package purchase/payment is not connected yet because the current payment checkout is course-level and auto-enrolls against a course/class flow.
- A future package checkout should be implemented only after the package enrollment workflow is explicit, so SePay/payment authorization remains backend-owned and auditable.

Verification:

```bash
cd backend
mvn "-Dtest=ManageAcademicCatalogUseCaseTest,AcademicCatalogControllerV3Test" test
# Tests run: 8, Failures: 0, Errors: 0

mvn resources:resources flyway:migrate \
  "-Dflyway.url=jdbc:postgresql://localhost:55433/lms" \
  "-Dflyway.user=lms" \
  "-Dflyway.password=lms"
# Successfully applied migrations through v146 on a temporary PostgreSQL 16 container

cd ../fe
npm run build -- --configuration development
# Application bundle generation complete
```

Build notes:

- `fe/public/sitemap-courses.xml` was regenerated by the FE build script from production courses and should not be included in this package PR unless the SEO sitemap itself is intentionally changed.
- The FE build still reports existing Angular/Sass/CommonJS warnings unrelated to this phase.
- `npm install` in the clean worktree reports the current dependency-audit baseline; do not run `npm audit fix` inside this ORG phase because it would mutate package versions outside the goal.

Debt after Phase B:

- Add org capabilities / feature flags as the next minimal control layer so ORG_ADMIN UI can be shown only when an org has the relevant module enabled.
- Add package enrollment/payment workflow only after the business rule is explicit: direct free assignment, ORG approval, invite-only, or payment-required package purchase.
- Add search/debounce to package selectors if catalog size grows beyond the current demo volume.

## 12. Phase B seed hotfix - default-org package data

Status on 2026-06-26: implemented in branch `codex/vmu-package-seed-fix`.

Issue found during production smoke:

- V145 schema and API deployed successfully.
- V146 ran successfully, but inserted `0` learning packages on the review runtime.
- Root cause: V146 selected VMU by `organizations.code = 'VMU'` or organization name containing `Hàng hải`, while the existing demo academic catalog from V144 is seeded under the default organization.

Fix:

- Add `V147__seed_vmu_learning_package_default_org_fix.sql`.
- Select the target organization from curriculum plan `DKT-K63-CDIO` itself.
- Insert/update package `VMU-DKT-K63-FOUNDATION` in the same organization as the curriculum plan.
- Insert six package subject items from the same organization.

Why this is cleaner:

- It avoids fragile dependence on organization display name/code.
- It keeps the seed aligned to the academic plan that the package is meant to wrap.
- It is forward-only and idempotent with `ON CONFLICT` guards.

## 13. Phase B deploy and production smoke

Status on 2026-06-26: merged, deployed, and smoke-tested on `https://holilihu.online`.

GitHub flow:

- PR `#522`: `feat(org): add VMU learning packages`.
- Merge commit: `10277a045ac56d8f8607c3e6e416f1a33c429e9a`.
- PR CI: backend, frontend, compose validation, Cloudflare Worker tests, and Docker smoke all passed.
- Main `Build & Deploy`: completed successfully.
- PR `#523`: `fix(org): seed VMU learning package from curriculum plan`.
- Merge commit: `7e1029c9be80e3f0be18765b338aa60e350bf543`.
- PR CI and main `Build & Deploy`: completed successfully.

Production API smoke:

```text
GET https://holilihu.online/actuator/health -> UP
POST /api/v3/auth/login as orgadmin@maritime.edu -> ORG_ADMIN
GET /api/v3/organizations/{orgId}/academic/catalog -> 200
```

Catalog counts after V147:

| Item | Count |
| --- | ---: |
| Departments | 4 |
| Programs | 4 |
| Cohorts | 3 |
| Class groups | 4 |
| Subjects | 9 |
| Subject-course links | 9 |
| Academic terms | 3 |
| Curriculum plans | 1 |
| Curriculum subjects | 6 |
| Learning packages | 1 |
| Learning package items | 6 |

Seed package:

```text
code: VMU-DKT-K63-FOUNDATION
name: Gói nền tảng Điều khiển tàu biển K63
enrollmentPolicy: ORG_APPROVAL
price: 0 VND
package item count by packageId: 6
```

Production browser smoke:

```text
Route: https://holilihu.online/org-admin/academic
Visible metrics: GÓI HỌC 1, MỤC TRONG GÓI 6
Seed package visible: VMU-DKT-K63-FOUNDATION / Gói nền tảng Điều khiển tàu biển K63
Console errors: 0
Screenshot: artifacts/org-admin-learning-packages-production-debug.png
```

Conclusion:

- Phase B is live on the review runtime.
- VMU learning package data is now tied to the curriculum plan's organization, not fragile organization display names.
- Package payment/enrollment remains intentionally separate until the exact VMU package checkout or assignment workflow is decided.

## 14. Phase C implementation - organization capabilities

Status on 2026-06-26: implemented in branch `codex/org-capabilities`.

Purpose:

- let each ORG expose only the modules it is configured to use;
- keep VMU-specific behavior as organization data, not `if VMU` branches;
- provide a small control layer before wiring deeper package enrollment/payment workflows.

Backend scope:

- `V148__organization_capabilities.sql`
  - adds `organization_capabilities`;
  - enforces one capability key per organization;
  - validates capability keys with `^[a-z][a-z0-9_]{1,63}$`;
  - seeds the default organization with:
    - `academic_catalog`;
    - `curriculum_plan`;
    - `learning_packages`;
    - `org_payment_config`;
    - `org_payout_approval`.
- Adds the minimal identity-domain model, repository port, JPA adapter, and use case for capabilities.
- Adds:
  - `GET /api/v3/organizations/{id}/capabilities` for `ADMIN` and same-org `ORG_ADMIN`;
  - `PUT /api/v3/organizations/{id}/capabilities/{key}` for `ADMIN` only.

Frontend scope:

- `/org-admin/academic` loads the current ORG capabilities.
- The page shows a compact "Năng lực đang bật" strip after the KPI cards.
- The first UI pass is read-only on purpose: it exposes configuration state without hiding workflows yet, so older orgs without seeded capabilities do not lose access unexpectedly.

Verification:

```bash
cd backend
mvn "-Dtest=ManageOrganizationCapabilitiesUseCaseTest" test
# Tests run: 5, Failures: 0, Errors: 0

cd ../fe
npm run build
# Application bundle generation complete
```

Local Docker/API smoke before Docker Desktop became unavailable:

```text
Flyway V148 applied successfully on local runtime.
organization_capabilities contains 5 default enabled capabilities.
POST /api/v3/auth/login as orgadmin@maritime.edu -> ORG_ADMIN.
GET /api/v3/organizations/{orgId}/capabilities -> 5 enabled capabilities.
```

Runtime note:

- Local browser smoke was blocked after a timed-out Docker frontend build left Docker Desktop's daemon unresponsive.
- The code-level blocker found during smoke was fixed: root `docker-compose.yml` now uses the same Base64 dev JWT secret as `.env.dev.example` when no local `.env` exists.
- Re-run `/org-admin/academic` browser smoke after Docker Desktop is manually healthy again or after the PR is deployed to the review runtime.

Debt after Phase C:

- The next useful product slice is policy enforcement, not more UI decoration.
- Package checkout/enrollment should be wired only after the business rule is explicit: free assignment, ORG approval, invite-only, or payment-required package purchase.
- If two organizations require materially different behavior, use these capabilities and later add small typed policy tables; do not introduce a plugin system.

## 15. Phase D implementation - learning package enrollment policy

Status on 2026-06-26: implemented in branch `codex/org-capabilities`.

Purpose:

- turn VMU learning packages from catalog data into a real workflow;
- let students request a package according to the package policy;
- let ORG_ADMIN review package requests without creating a VMU-only code path.

Backend scope:

- `V149__learning_package_enrollments.sql`
  - adds `learning_package_enrollments`;
  - stores package request state per organization/package/student;
  - enforces unique `(package_id, student_id)`;
  - supports `PENDING_APPROVAL`, `PENDING_PAYMENT`, `ACTIVE`, `REJECTED`, and `CANCELLED`.
- `V150__seed_vmu_learning_package_enrollment_request.sql`
  - creates one safe demo request for `VMU-DKT-K63-FOUNDATION` when a same-org student exists;
  - uses `ON CONFLICT DO NOTHING`.
- Adds domain/usecase/API for policy evaluation:
  - `OPEN` activates immediately;
  - `ORG_APPROVAL` enters the approval queue;
  - `PAYMENT_REQUIRED` waits for payment;
  - `INVITE_ONLY` rejects direct self-request.

Frontend scope:

- Adds type-safe academic API methods for listing, requesting, approving, and rejecting package enrollments.
- Adds a compact "Yêu cầu gói học" card to `/org-admin/academic`.
- Keeps the UI intentionally small: list package request status and allow approve/reject for `PENDING_APPROVAL`.

Verification:

```bash
cd backend
mvn "-Dtest=ManageLearningPackageEnrollmentUseCaseTest,LearningPackageEnrollmentControllerV3Test,ManageAcademicCatalogUseCaseTest,AcademicCatalogControllerV3Test" test
# Tests run: 20, Failures: 0, Errors: 0

cd ../fe
npm run build
# Application bundle generation complete
```

Remaining product gap:

- Active package enrollment is not yet course access. The next slice should activate course enrollments only after mapping package items safely:
  - direct `course_id` item -> enroll that course;
  - `subject_id` item -> resolve primary `subject_course`;
  - `PAYMENT_REQUIRED` package -> package checkout/payment must complete first.

## 16. Phase E implementation - package entitlement to course access

Status on 2026-06-26: implemented in branch `codex/org-capabilities`.

Purpose:

- make approved VMU/ORG learning packages produce actual learner access;
- avoid a fake “active package” state that does not show up in student learning;
- keep self-enrollment payment rules intact.

Backend scope:

- Adds `GrantCourseAccessUseCase` in `learning_delivery`.
- The grant use case is for already-validated entitlements only:
  - organization package approval;
  - future package payment completion;
  - future admin/import entitlement flows.
- It checks:
  - course belongs to the same organization;
  - course is `APPROVED`;
  - course is `SELF_PACED`;
  - existing active/completed enrollments are idempotent;
  - dropped/suspended enrollments can be reactivated.
- It creates or reuses the `DEFAULT` learning class and sets `organization_id` on that class.
- `ManageLearningPackageEnrollmentUseCase` calls it when a package enrollment becomes `ACTIVE`.

VMU fit:

- VMU packages can be modeled as curriculum/subject bundles without VMU-specific branches.
- A package item can point directly to a course.
- A package item can point to a subject, then resolve through `subject_courses`.
- This supports real VMU concepts such as program, cohort, subject, curriculum plan, and training package while staying tenant-configured.

Still intentionally not done:

- `PAYMENT_REQUIRED` package checkout and payment completion.
- `INSTRUCTOR_LED` automatic class placement, because university-style classes need explicit class/cohort/term placement.

Verification:

```bash
cd backend
mvn "-Dtest=ManageLearningPackageEnrollmentUseCaseTest,GrantCourseAccessUseCaseTest" test
# Tests run: 13, Failures: 0, Errors: 0
```

## 17. Phase F implementation - package class placement

Status on 2026-06-26: implemented in branch `codex/org-capabilities`.

Purpose:

- support university-style package delivery where a package course must place a learner into a concrete learning class;
- keep VMU logic as data, not hardcoded branches;
- avoid granting `INSTRUCTOR_LED` courses through the self-paced `DEFAULT` class.

Backend scope:

- Adds `V151__learning_package_class_targets.sql`.
- Adds `learning_package_class_targets` as the package/course/class placement table.
- Adds domain/JPA/repository support for `AcademicLearningPackageClassTarget`.
- Adds API:
  - `POST /api/v3/organizations/{orgId}/academic/learning-package-class-targets`.
- Extends academic catalog payload with `learningPackageClassTargets`.
- Extends `GrantCourseAccessUseCase` with `grantClass(...)`.
- Extends package enrollment activation so:
  - active class target -> enroll into that concrete class;
  - no class target -> use existing self-paced grant path.
- Rejects silent success when the learner is already `ACTIVE`/`COMPLETED` in another class of the same course, so VMU roster placement stays explicit.

VMU fit:

- VMU can configure a K63 package course to a concrete class/term offering without code changes.
- Subjects still resolve to LMS courses through `subject_courses`.
- Package approval remains the business trigger; class target controls operational placement.

Still intentionally not done:

- org-admin UI for selecting package class targets.
- package checkout/payment completion for `PAYMENT_REQUIRED`.
- automatic class allocation by cohort/class group. That should come only if VMU needs rule-based placement beyond explicit target selection.

Verification:

```bash
cd backend
mvn "-Dtest=ManageAcademicCatalogUseCaseTest,ManageLearningPackageEnrollmentUseCaseTest,GrantCourseAccessUseCaseTest,AcademicCatalogControllerV3Test,LearningPackageEnrollmentControllerV3Test" test
# Tests run: 31, Failures: 0, Errors: 0

mvn test
# Tests run: 1201, Failures: 0, Errors: 0

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build backend
curl http://localhost:8088/actuator/health
# {"status":"UP"}
```
