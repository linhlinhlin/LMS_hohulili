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
