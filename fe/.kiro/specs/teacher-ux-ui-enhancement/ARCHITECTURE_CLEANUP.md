# Architecture Cleanup - Teacher Course Management

## Current Issues

### 1. Duplicate Functionality
- `course-editor.component` has section management (create, rename, delete)
- `section-list.component` also shows sections list → **DUPLICATE**
- Routes have both `/courses/:id/edit` AND `/courses/:id/sections` → **UNNECESSARY**

### 2. Over-complicated Components
- `section-editor.component` is 2529 lines with inline lesson management
- Violates "Simplicity First" principle from design document
- Violates Single Responsibility Principle

### 3. Confusing Navigation Flow
```
Course Management → Course Editor → Section List → Section Editor
                                  ↓
                            (Already has section management)
```

## Proposed Clean Architecture

### Simplified Flow
```
Course Management → Course Editor (with accordion sections)
                         ↓
                    Section Management (in accordion)
                         ↓
                    Lesson Management (separate page)
```

### Components to Keep
1. ✅ `course-management.component` - Course list with search/filters
2. ✅ `course-creation.component` - Create new course
3. ✅ `course-editor.component` - Edit course with accordion:
   - Course Info
   - Course Content (sections)
   - Student Assignment
   - Enrolled Students
4. ✅ `course-students-list.component` - Student list (reusable)
5. ✅ `lesson-management.component` - NEW: Manage lessons in a section

### Components to DELETE
1. ❌ `section-list.component` - Duplicate of course-editor section management
2. ❌ `section-editor.component` - Too complex, split into smaller components

### New Component to Create
```typescript
// lesson-management.component.ts
// Route: /teacher/courses/:courseId/sections/:sectionId/lessons
// Features:
// - List lessons in section
// - Create/Edit/Delete lessons
// - Reorder lessons
// - Simple, focused component (~300-500 lines)
```

### Updated Routes
```typescript
// BEFORE (Complex)
{
  path: 'courses/:id/edit',           // Course editor
  path: 'courses/:id/sections',       // Section list (DUPLICATE)
  path: 'courses/:id/sections/:sectionId', // Section editor (TOO COMPLEX)
}

// AFTER (Simple)
{
  path: 'courses/:id/edit',           // Course editor with sections
  path: 'courses/:courseId/sections/:sectionId/lessons', // Lesson management
}
```

## Benefits

### 1. Simpler Navigation
- One less page to navigate
- Clear hierarchy: Course → Sections → Lessons

### 2. Better UX
- All course info in one place (accordion)
- Less clicking between pages
- Consistent with design principles

### 3. Easier Maintenance
- Fewer components to maintain
- Clear separation of concerns
- Follows "Simplicity First" principle

### 4. Consistent with Design Document
- "Practical Over Perfect"
- "No over-engineering"
- "Keep it simple"

## Implementation Plan

### Phase 1: Create Lesson Management Component
1. Create `lesson-management.component.ts` (~400 lines)
2. Features:
   - List lessons in section
   - Create lesson (LECTURE, ASSIGNMENT, QUIZ)
   - Edit lesson inline
   - Delete lesson
   - Reorder lessons (drag-drop optional)
3. Use existing APIs (no business logic changes)

### Phase 2: Update Course Editor
1. Update section table to link to lesson management
2. Change "Quản lý bài học" button to navigate to new component
3. Test navigation flow

### Phase 3: Delete Redundant Components
1. Delete `section-list.component.ts`
2. Delete `section-editor.component.ts`
3. Update routes in `teacher.routes.ts`
4. Test all flows

### Phase 4: Verify
1. Test course creation flow
2. Test course editing flow
3. Test section management
4. Test lesson management
5. Ensure no broken links

## Code Size Comparison

### Before
- `course-editor.component`: ~400 lines
- `section-list.component`: ~100 lines
- `section-editor.component`: ~2529 lines
- **Total: ~3029 lines**

### After
- `course-editor.component`: ~450 lines (with accordion)
- `lesson-management.component`: ~400 lines (new, focused)
- **Total: ~850 lines**

**Reduction: ~72% less code!**

## Conclusion

This cleanup will:
- ✅ Remove duplicate functionality
- ✅ Simplify navigation
- ✅ Reduce code complexity by 72%
- ✅ Follow design principles
- ✅ Improve maintainability
- ✅ Better UX for teachers

**Recommendation: Proceed with cleanup immediately after completing current task.**
