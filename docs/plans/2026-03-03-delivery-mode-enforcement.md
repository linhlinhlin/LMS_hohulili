# Delivery Mode Enforcement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce correct feature separation between SELF_PACED (Khóa học) and INSTRUCTOR_LED (Lớp học) across the full stack — the most critical business logic in the LMS.

**Architecture:** Binary Toggle pattern (like Open edX). DeliveryMode is set at course creation, becomes immutable after first enrollment. Each mode enables/disables specific features via domain rules in the backend and conditional UI in the frontend.

**Tech Stack:** Java 21 / Spring Boot 3.2 / PostgreSQL 16 / Flyway / Angular 20.3 / Signals

**SOTA Reference:** Open edX (immutable pacing after start), Canvas (default section pattern — already implemented), Coursera (product-level mode separation)

---

## Feature Matrix (Source of Truth)

| Feature | SELF_PACED (Khóa học) | INSTRUCTOR_LED (Lớp học) |
|---------|----------------------|--------------------------|
| Chapters + Lessons + Sections | YES | YES |
| Inline Quiz (in lesson) | YES (no deadline) | YES (can have deadline) |
| Standalone Assignment | **NO** (already enforced) | YES |
| Class Management | Hidden (auto DEFAULT class) | YES (multiple classes) |
| Gradebook | **NO** | YES |
| Enrollment | Self-enroll, unlimited | Self-enroll OR teacher-managed, with limit |
| Change mode | Only when DRAFT + zero enrollments | Only when DRAFT + zero enrollments |

---

## Task 1: BE — Add `hasEnrollments()` check to Course domain

**Files:**
- Modify: `backend/src/main/java/com/example/lms/learning_delivery/domain/repository/EnrollmentRepositoryPort.java`
- Modify: `backend/src/main/java/com/example/lms/learning_delivery/infrastructure/persistence/EnrollmentRepositoryImpl.java`

**Step 1: Add `existsByCourseId` to EnrollmentRepositoryPort**

In `EnrollmentRepositoryPort.java`, add after the existing `delete` method:

```java
/**
 * Check if any enrollment exists for a course (across all classes).
 */
boolean existsByCourseId(UUID courseId);
```

**Step 2: Implement in EnrollmentRepositoryImpl**

Find the JPA repository interface used by `EnrollmentRepositoryImpl` (likely `JpaEnrollmentRepository`). Add a JPQL query:

```java
@Query("SELECT CASE WHEN COUNT(e) > 0 THEN true ELSE false END FROM EnrollmentJpaEntity e WHERE e.courseId = :courseId")
boolean existsByCourseId(@Param("courseId") UUID courseId);
```

Then in `EnrollmentRepositoryImpl`, delegate:

```java
@Override
public boolean existsByCourseId(UUID courseId) {
    return jpaRepository.existsByCourseId(courseId);
}
```

**Note:** If the enrollment JPA entity doesn't have `courseId` directly, use a join through `classId`:
```java
@Query("SELECT CASE WHEN COUNT(e) > 0 THEN true ELSE false END FROM EnrollmentJpaEntity e JOIN LearningClassJpaEntity c ON e.classId = c.id WHERE c.courseId = :courseId")
boolean existsByCourseId(@Param("courseId") UUID courseId);
```

Check the `EnrollmentJpaEntity` first to determine which approach.

**Step 3: Verify build**

```bash
cd backend && docker compose up -d && docker compose logs api --tail=30
```

---

## Task 2: BE — Lock DeliveryMode after enrollment (P0)

**Files:**
- Modify: `backend/src/main/java/com/example/lms/course_authoring/application/usecase/UpdateCourseUseCase.java`

**Step 1: Inject EnrollmentRepositoryPort**

Add to constructor/field injection:

```java
private final EnrollmentRepositoryPort enrollmentRepository;
```

**Step 2: Add enrollment check before mode change**

In the update method, BEFORE the existing delivery mode update block, add:

```java
// Lock delivery mode if course has enrollments (Open edX pattern: immutable after start)
Course.DeliveryMode newDeliveryMode = parseDeliveryMode(command.deliveryMode());
if (newDeliveryMode != null && newDeliveryMode != course.getDeliveryMode()) {
    if (enrollmentRepository.existsByCourseId(course.getId())) {
        throw new BusinessRuleException(
            "Không thể thay đổi hình thức giảng dạy khi đã có học viên đăng ký. " +
            "Vui lòng tạo khóa học mới với hình thức khác."
        );
    }
    course.updateDeliveryMode(newDeliveryMode);
} else if (newDeliveryMode != null) {
    course.updateDeliveryMode(newDeliveryMode);
}
```

Replace the old block:
```java
// OLD — remove this:
Course.DeliveryMode deliveryMode = parseDeliveryMode(command.deliveryMode());
if (deliveryMode != null) {
    course.updateDeliveryMode(deliveryMode);
}
```

**Step 3: Verify build**

```bash
cd backend && docker compose up -d && docker compose logs api --tail=30
```

---

## Task 3: BE — Expose `hasEnrollments` flag in Course Draft DTO

**Files:**
- Modify: `backend/src/main/java/com/example/lms/course_authoring/application/dto/AuthoringDTOs.java` (CourseDraftDTO)
- Modify: `backend/src/main/java/com/example/lms/course_authoring/application/usecase/GetCourseDraftUseCase.java`

**Step 1: Add field to CourseDraftDTO**

In the `CourseDraftDTO` class (or record), add:

```java
private boolean hasEnrollments;
```

**Step 2: Set it in GetCourseDraftUseCase**

Inject `EnrollmentRepositoryPort` and set the flag:

```java
private final EnrollmentRepositoryPort enrollmentRepository;

// In the method that builds the DTO:
.hasEnrollments(enrollmentRepository.existsByCourseId(course.getId()))
```

**Step 3: Verify build**

```bash
cd backend && docker compose up -d && docker compose logs api --tail=30
```

---

## Task 4: FE — Lock delivery mode selector when course has enrollments (P1)

**Files:**
- Modify: `fe/src/app/features/teacher/course-editor/services/course-authoring.service.ts` (CourseDraftDTO type)
- Modify: `fe/src/app/features/teacher/course-editor/pages/course-info/course-info.component.ts`

**Step 1: Update CourseDraftDTO interface**

In `course-authoring.service.ts`, add to `CourseDraftDTO`:

```typescript
hasEnrollments?: boolean;
```

**Step 2: Add locked signal in course-info.component.ts**

```typescript
isModeLocked = signal(false);
```

In the `effect()` constructor block where store data is synced, add:

```typescript
this.isModeLocked.set(!!tree.hasEnrollments);
```

**Step 3: Update delivery mode buttons template**

Wrap the delivery mode section with a lock indicator. Change the buttons to:

```html
<div class="space-y-2">
  <div class="flex items-center justify-between">
    <label class="block text-sm font-medium text-slate-700">Hình thức giảng dạy</label>
    @if (isModeLocked()) {
      <span class="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
        Đã khóa
      </span>
    }
  </div>
  <div class="grid grid-cols-2 gap-3">
    <!-- Add [class.pointer-events-none]="isModeLocked()" [class.opacity-60]="isModeLocked()" to BOTH buttons -->
    <button type="button" (click)="!isModeLocked() && setDeliveryMode('SELF_PACED')"
            class="flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left"
            [class.pointer-events-none]="isModeLocked()"
            [class.opacity-60]="isModeLocked()"
            ...existing classes...>
    <!-- same for INSTRUCTOR_LED button -->
  </div>
  @if (isModeLocked()) {
    <p class="text-xs text-slate-500">Không thể thay đổi hình thức khi đã có học viên đăng ký.</p>
  }
</div>
```

**Step 4: Build and verify**

```bash
cd fe && npx ng build 2>&1 | tail -10
```

---

## Task 5: FE — Lock delivery mode in course-creation progress panel

**Files:**
- Modify: `fe/src/app/features/teacher/courses/course-creation.component.ts`

**Step 1: Update right panel "Hình thức" display**

In the progress panel, the Hình thức item always shows "Khóa học online" by default (since `selectedMode()` defaults to `'SELF_PACED'`). This is correct — course creation always allows mode selection since it's a new course with zero enrollments.

No change needed for course-creation — mode lock only applies to course-info (editor).

**Step 2: Verify no regression**

```bash
cd fe && npx ng build 2>&1 | tail -10
```

---

## Task 6: FE — Add mode indicator badge to course editor layout header

**Files:**
- Modify: `fe/src/app/features/teacher/course-editor/layouts/course-editor-layout/course-editor-layout.component.ts`

**Step 1: Add mode badge next to course title in the header**

Find the course title display in the header. Add a small badge after it:

```html
@if (isInstructorLed()) {
  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 ml-2">
    Lớp học
  </span>
} @else {
  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0056D2]/10 text-[#0056D2] ml-2">
    Khóa học
  </span>
}
```

**Step 2: Build and verify**

```bash
cd fe && npx ng build 2>&1 | tail -10
```

---

## Task 7: FE — Course-info "Lớp học" info banner for INSTRUCTOR_LED

**Files:**
- Modify: `fe/src/app/features/teacher/course-editor/pages/course-info/course-info.component.ts`

**Step 1: Add info banner below delivery mode selector**

After the delivery mode grid, add (similar to course-creation Step 2):

```html
@if (currentDeliveryMode() === 'INSTRUCTOR_LED') {
  <div class="flex gap-2 p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/60 text-xs text-emerald-800">
    <svg class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    <span><strong>Lớp học</strong> bao gồm quản lý lớp, bài tập, bảng điểm, kiểm tra. Không thể chuyển về "Khóa học online" sau khi có học viên.</span>
  </div>
}
```

**Step 2: Build and verify**

```bash
cd fe && npx ng build 2>&1 | tail -10
```

---

## Task 8: FE — Student browse add delivery mode filter pills

**Files:**
- Modify: `fe/src/app/features/student/browse/student-course-browser.component.ts`

**Step 1: Add mode filter signal**

```typescript
modeFilter = signal<'' | 'SELF_PACED' | 'INSTRUCTOR_LED'>('');
```

**Step 2: Add mode filter pills below category tabs**

After the category filter tabs div, add:

```html
<!-- Mode Filter -->
<div class="flex items-center gap-2 mb-4">
  <span class="text-xs text-slate-500 mr-1">Hình thức:</span>
  <button (click)="modeFilter.set('')"
    class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
    [class]="!modeFilter()
      ? 'bg-slate-800 text-white border-slate-800'
      : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'">
    Tất cả
  </button>
  <button (click)="modeFilter.set('SELF_PACED')"
    class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
    [class]="modeFilter() === 'SELF_PACED'
      ? 'bg-[#0056D2] text-white border-[#0056D2]'
      : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'">
    Khóa học
  </button>
  <button (click)="modeFilter.set('INSTRUCTOR_LED')"
    class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
    [class]="modeFilter() === 'INSTRUCTOR_LED'
      ? 'bg-emerald-600 text-white border-emerald-600'
      : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'">
    Lớp học
  </button>
</div>
```

**Step 3: Add mode filter to the filteredCourses computed**

Find the `filteredCourses` computed signal (or wherever courses are filtered). Add:

```typescript
.filter(c => !this.modeFilter() || c.deliveryMode === this.modeFilter())
```

**Step 4: Build and verify**

```bash
cd fe && npx ng build 2>&1 | tail -10
```

---

## Task 9: FE — Student browse show "Hết chỗ" badge for full INSTRUCTOR_LED courses

**Files:**
- Modify: `fe/src/app/features/student/browse/student-course-browser.component.ts`

**Step 1: In the course card template, add capacity badge**

Find the course card rendering (likely inside `@for` loop). Add near the mode badge:

```html
@if (course.deliveryMode === 'INSTRUCTOR_LED' && course.maxStudents && course.enrolledCount >= course.maxStudents) {
  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600">
    Đã đủ
  </span>
}
```

**Step 2: Build and verify**

```bash
cd fe && npx ng build 2>&1 | tail -10
```

---

## Task 10: Final verification & commit

**Step 1: Full backend build**

```bash
cd backend && docker compose up -d --build && sleep 10 && docker compose logs api --tail=50
```

Verify: `Started LmsApplication` with no errors.

**Step 2: Full frontend build**

```bash
cd fe && npx ng build 2>&1 | tail -20
```

Verify: `Output location: ...dist/lms-angular` with 0 errors.

**Step 3: Manual smoke test**

1. Login as teacher → Create new SELF_PACED course → Verify no "Lớp học" tab in editor
2. Login as teacher → Create new INSTRUCTOR_LED course → Verify "Lớp học" tab appears
3. Login as teacher → Open course with enrollments → Verify delivery mode selector is LOCKED
4. Login as student → Browse courses → Verify mode filter pills work
5. Login as student → Check INSTRUCTOR_LED course shows capacity info

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(delivery-mode): enforce SELF_PACED vs INSTRUCTOR_LED separation

- BE: Lock delivery mode after enrollment (Open edX immutable pattern)
- BE: Add existsByCourseId to EnrollmentRepositoryPort
- BE: Expose hasEnrollments flag in CourseDraftDTO
- FE: Lock mode selector in course-info when has enrollments
- FE: Mode badge in course editor layout header
- FE: INSTRUCTOR_LED info banner in course-info
- FE: Student browse delivery mode filter pills
- FE: 'Đã đủ' badge for full INSTRUCTOR_LED courses

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

| Task | Priority | Type | Description |
|------|----------|------|-------------|
| 1 | P0 | BE | Add `existsByCourseId` to enrollment repo |
| 2 | P0 | BE | Lock mode change after enrollment |
| 3 | P0 | BE | Expose `hasEnrollments` in draft DTO |
| 4 | P1 | FE | Lock mode selector in course-info |
| 5 | — | FE | Verify course-creation (no change needed) |
| 6 | P1 | FE | Mode badge in editor layout header |
| 7 | P1 | FE | INSTRUCTOR_LED info banner |
| 8 | P2 | FE | Student browse mode filter |
| 9 | P2 | FE | "Đã đủ" capacity badge |
| 10 | — | ALL | Final verify + commit |
