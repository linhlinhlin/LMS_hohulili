# Authoring Frontend Design Audit

Date: 2026-03-09
Scope: teacher authoring routes such as `/teacher/course-creation`, `/teacher/courses/:id/editor/info`, and `/teacher/courses/:id/editor/curriculum`

## Why this note exists

Recent frontend changes improved logic and trust, but some UI changes drifted away from the visual language already established in the repo.

This note is the reference for future teacher-authoring UI work so that:

- UX fixes do not break the system's visual consistency
- Angular 20 refactors stay aligned with the existing architecture
- course-authoring screens feel like one product, not a sequence of unrelated redesigns

## Sources used

- Angular Style Guide: <https://angular.dev/style-guide>
- Angular Reactive Forms: <https://angular.dev/guide/forms/reactive-forms>
- GOV.UK fieldset: <https://design-system.service.gov.uk/components/fieldset/>
- GOV.UK error summary: <https://design-system.service.gov.uk/components/error-summary/>
- USWDS forms: <https://designsystem.digital.gov/components/form/>
- Atlassian form patterns: <https://atlassian.design/patterns/forms/>
- Shopify save bar reference: <https://shopify.dev/docs/api/app-bridge-library/apis/save-bar>

## Audit summary

The repo already has a recognizable authoring style. The safest path is not to redesign it from scratch, but to strengthen it.

Current visual grammar already present in code:

- primary accent: `#0056D2`
- white shell + light gray work surface
- dense, utilitarian cards
- underline tabs in the editor shell
- compact header with save/readiness state
- teacher workspace tone, not marketing tone

Evidence in repo:

- `fe/src/app/shared/components/ui/README.md`
- `fe/src/app/features/teacher/course-editor/layouts/course-editor-layout/course-editor-layout.component.ts`
- `fe/FRONTEND_ARCHITECTURE.md`

## Product-level design rules

These rules should govern future FE changes in teacher authoring.

### 1. Preserve authoring density

Teacher authoring screens should optimize for scanability and low scroll cost.

Do:

- keep headers compact
- keep cards dense and purpose-driven
- prefer one strong main column plus one compact aside
- keep key fields above the fold when possible

Do not:

- add hero sections
- inflate paddings/radii/shadows
- turn authoring pages into landing pages

### 2. Treat trust as the first UX requirement

For authoring UI, the most important interaction quality is trust.

Always keep these aligned:

- dirty state
- saved state
- leave-page confirmation
- publish readiness
- field-level validation

If these signals disagree, the page is not production-grade, even if it looks polished.

### 3. Course-wide vs class-scoped meaning must be explicit

`Khóa học` and `Lớp học` are different product modes, not cosmetic labels.

UI must clearly communicate:

- course-owned metadata and content
- class-specific delivery or distribution overlays

Do not hide this boundary in generic labels.

### 4. Favor progressive disclosure over card fragmentation

Breaking metadata into too many small rail cards increases scan cost.

Preferred grouping:

- core public info
- catalog/discovery metadata
- presentation assets
- pricing/commercial fields

Avoid splitting closely related fields into many narrow cards unless the workflow truly benefits.

## Angular 20 implementation rules

### 1. Large authoring pages should not stay as giant inline templates

For complex editor screens:

- use `templateUrl` and `styleUrl`
- keep orchestration in the page component
- extract subcomponents only when they have a stable responsibility

Do not extract UI just to create more files. Extract when the boundary is clear.

### 2. Prefer typed reactive forms + signals bridge

For authoring forms:

- use one typed `FormGroup` as the source of truth
- derive display state from signals/computed values
- explicitly sync when patching with `emitEvent: false`

This is especially important for price, visibility, category, and delivery-mode fields.

### 3. Route shells own layout; pages own field workflow

The course-editor shell should continue owning:

- header
- tabs
- save/readiness chrome
- sidebar behavior

Page components should own:

- field groups
- page-level validation
- page-local dirty semantics

## Route-specific guidance

### `/teacher/course-creation`

Target style:

- compact two-step setup
- minimal explanation copy
- visible progress, but not oversized
- stepper can stay clickable for preview

Keep:

- small footprint
- old layout density
- subtle helper text

Avoid:

- large feature cards
- oversized step blocks
- decorative overview panels

### `/teacher/courses/:id/editor/info`

Target style:

- metadata editor, not marketing page
- fast scan from title to category, media, pricing
- clear validation and save confidence

Keep:

- compact shell
- aside for secondary metadata
- save bar and header state

Improve carefully:

- readiness-critical fields must validate in the form
- field groups should use semantic markup
- overview copy should stay short

Avoid:

- long editorial hero copy
- too many nested cards
- duplicate save/readiness messages

### `/teacher/courses/:id/editor/curriculum`

Target style:

- dense workspace
- sidebar-first navigation
- content editing prioritized over decoration

Keep:

- collapsible sidebar
- underline tabs
- compact breadcrumb

Prioritize:

- unsaved-change protection
- stable deep-link/reload behavior
- explicit context for `Khóa học` vs `Lớp học`

## Non-negotiables for future FE work

- No layout rewrite without checking the existing shell style first.
- No oversized UI on teacher authoring routes.
- No inline giant templates for large editor screens.
- No validation/readiness mismatch.
- No design change that increases scroll without a workflow reason.
- No course/class ambiguity in labels or summaries.

## Practical next steps

When continuing FE work in teacher authoring:

1. fix trust/logic issues first
2. then refine semantics and layout density
3. only then consider visual polish

For this repo, correct and consistent beats flashy.
