# Category/Taxonomy System Redesign — Design Document

> **Date**: 2026-03-03 | **Status**: Approved | **Approach**: B (Clean Redesign)

## Context

Current system: 5 hardcoded flat categories (seed SQL V33), read-only, no admin UI, no CRUD API. Category prefix gắn chặt với course code generation. Frontend browse pages dùng hardcoded `CATEGORY_CONFIGS`.

**Target**: 500+ courses, hierarchical categories managed by ADMIN/ORG_ADMIN, with tags support, following SOTA patterns (Udemy 3-level, Coursera 2-level + skills).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hierarchy depth | 2 tầng (Category > Subcategory) + Tags | Đủ cho 500+ courses, không quá phức tạp. Coursera/Thinkific pattern. |
| Course code | Tách prefix khỏi category, admin tùy chỉnh | Prefix vẫn có nhưng admin set khi tạo category. Tách concerns. |
| Tag management | Controlled vocabulary — chỉ Admin/ORG_ADMIN | Tránh trùng lặp. SOTA: Udemy, Coursera. Teacher chọn từ list có sẵn. |
| Multi-category | 1 category + nhiều tags (max 5) | Udemy pattern. Đơn giản, rõ ràng. |
| Approach | B: Clean Redesign (3 bảng mới) | Clean separation of concerns. DDD đúng chuẩn. Dễ scale lâu dài. |

## Database Schema

### Bảng `course_categories` (2 tầng, hierarchy)

```sql
CREATE TABLE course_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id   UUID REFERENCES course_categories(id) ON DELETE CASCADE,
    code        VARCHAR(50) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    prefix      VARCHAR(10) UNIQUE,             -- Course code prefix (root only)
    description TEXT,
    icon        VARCHAR(50),
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ
);

CREATE INDEX idx_course_categories_parent ON course_categories(parent_id);
CREATE INDEX idx_course_categories_active ON course_categories(is_active);

COMMENT ON TABLE course_categories IS '2-level course taxonomy. parent_id=NULL for root, non-null for subcategory.';
```

**Constraint**: Max 2 levels enforced in application layer (not DB CHECK — too complex for self-referencing FK).

### Bảng `course_tags` (flat, controlled vocabulary)

```sql
CREATE TABLE course_tags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE course_tags IS 'Controlled vocabulary tags for courses. Admin-managed only.';
```

### Bảng `course_tag_assignments` (many-to-many)

```sql
CREATE TABLE course_tag_assignments (
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    tag_id      UUID NOT NULL REFERENCES course_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, tag_id)
);

CREATE INDEX idx_course_tag_assignments_tag ON course_tag_assignments(tag_id);

COMMENT ON TABLE course_tag_assignments IS 'Many-to-many: courses <-> tags. Max 5 tags per course enforced in app.';
```

### Courses table migration

```sql
ALTER TABLE courses ADD COLUMN new_category_id UUID REFERENCES course_categories(id) ON DELETE SET NULL;
-- After data migration: swap columns
```

## Backend Architecture

### Domain Layer

```
course_authoring/domain/model/
├── CourseCategory.java        -- Aggregate root (2-level hierarchy)
├── CourseTag.java             -- Entity (flat, controlled vocab)
```

**CourseCategory fields**: id, parentId, code, name, slug, prefix (nullable, root only), description, icon, sortOrder, isActive, children (transient)

**CourseCategory methods**: isRoot(), isSubcategory(), activate(), deactivate(), reorder(), validate max depth

**CourseTag fields**: id, name, slug

### Repository Ports

```java
public interface CourseCategoryRepository {
    Optional<CourseCategory> findById(UUID id);
    List<CourseCategory> findAllRoots();
    List<CourseCategory> findChildrenOf(UUID parentId);
    List<CourseCategory> findAllActiveTree();
    CourseCategory save(CourseCategory category);
    void deleteById(UUID id);
    boolean existsByCode(String code);
    boolean existsByPrefix(String prefix);
}

public interface CourseTagRepository {
    List<CourseTag> findAll();
    CourseTag save(CourseTag tag);
    void deleteById(UUID id);
    List<CourseTag> findByCourseId(UUID courseId);
    void assignTagsToCourse(UUID courseId, Set<UUID> tagIds);
    void removeAllTagsFromCourse(UUID courseId);
}
```

### Use Cases

| Use Case | Actor | Description |
|----------|-------|-------------|
| ManageCourseCategoryUseCase | ADMIN/ORG_ADMIN | CRUD categories (root + sub), reorder, activate/deactivate |
| ManageCourseTagUseCase | ADMIN/ORG_ADMIN | CRUD tags (create, rename, delete) |
| AssignCourseTagsUseCase | TEACHER | Set tags for course (max 5, replace all) |

### API Endpoints

```
# Admin Category Management
GET    /api/v3/admin/course-categories          -- Full tree (active + inactive)
POST   /api/v3/admin/course-categories          -- Create root or sub
PUT    /api/v3/admin/course-categories/{id}     -- Update
DELETE /api/v3/admin/course-categories/{id}     -- Deactivate (soft delete)
PUT    /api/v3/admin/course-categories/reorder  -- Batch reorder

# Admin Tag Management
GET    /api/v3/admin/course-tags                -- List all
POST   /api/v3/admin/course-tags                -- Create
PUT    /api/v3/admin/course-tags/{id}           -- Rename
DELETE /api/v3/admin/course-tags/{id}           -- Delete

# Public (cached)
GET    /api/v3/course-categories                -- Active tree only
GET    /api/v3/course-tags                      -- All tags

# Course Tag Assignment (Teacher)
PUT    /api/v3/courses/{id}/tags                -- Set tags [tagId1, ...]
```

### Security

- Admin endpoints: `@PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")`
- Tag assignment: `@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")` + ownership check
- Public GET: no auth, `@Cacheable`

## Frontend Architecture

### Admin — Category Management Page (`/admin/categories`)

**New component**: `category-management.component.ts`

**Layout**:
- Left: Category tree (expandable, drag-reorder)
- Right: Edit form (name, code, prefix, slug, icon, description, active toggle)
- Top actions: [+ Danh mục gốc] [+ Danh mục con]
- Below: Tags section — chip list + [+ Thêm tag] inline

**Sidebar**: Thêm "Danh mục" menu item vào admin sidebar (dưới "Khóa học")

### Teacher — Course Creation/Editor

**Category picker**: 2 cascading dropdowns
1. Chọn Category gốc (Level 1)
2. Chọn Subcategory (Level 2) — filtered by parent

**Tag picker**: Multi-select chips (max 5) with search/filter

### Student — Browse Page

**Category navigation**:
- Horizontal tabs (root categories)
- Click → subcategory chips
- Tag filter chips
- Faceted: Category + Sub + Tags + Level + Price

### FE Migration

| Component | Before | After |
|-----------|--------|-------|
| course-creation.component.ts | 1 dropdown | 2 cascading + tag picker |
| course-info.component.ts | 1 dropdown | 2 cascading + tag picker |
| course-management.component.ts | 1 filter | 2-level + tag filter |
| student-course-browser.component.ts | Dynamic pills | Category tabs from API |
| category.configs.ts | Hardcoded showcase | Remove — dynamic from DB |
| Admin sidebar | No "Danh mục" | Add menu item |
| NEW: category-management.component.ts | — | Admin CRUD page |

## Data Migration (Zero-downtime, 3 steps)

### V56: Create tables + seed

```sql
CREATE TABLE course_categories (...);
CREATE TABLE course_tags (...);
CREATE TABLE course_tag_assignments (...);

-- Migrate 5 existing categories → root categories
INSERT INTO course_categories (id, parent_id, code, name, slug, prefix, sort_order)
SELECT id, NULL, code, name, LOWER(code), prefix, ROW_NUMBER() OVER (ORDER BY code)
FROM categories;

-- Seed subcategories
INSERT INTO course_categories (parent_id, code, name, slug, sort_order) VALUES
-- Under NAVIGATION
((SELECT id FROM course_categories WHERE code='NAVIGATION'), 'NAV_RADAR', 'Radar & ECDIS', 'radar-ecdis', 1),
((SELECT id FROM course_categories WHERE code='NAVIGATION'), 'NAV_CELESTIAL', 'Thiên văn hàng hải', 'thien-van-hang-hai', 2),
((SELECT id FROM course_categories WHERE code='NAVIGATION'), 'NAV_COLREG', 'Quy tắc tránh va', 'quy-tac-tranh-va', 3),
-- ... (other subcategories)
```

### V57: Migrate course FK

```sql
ALTER TABLE courses ADD COLUMN new_category_id UUID REFERENCES course_categories(id) ON DELETE SET NULL;
UPDATE courses SET new_category_id = category_id WHERE category_id IS NOT NULL;
CREATE INDEX idx_courses_new_category ON courses(new_category_id);
```

### V58: Swap columns (after BE/FE updated)

```sql
ALTER TABLE courses DROP CONSTRAINT fk_courses_category;
ALTER TABLE courses DROP COLUMN category_id;
ALTER TABLE courses RENAME COLUMN new_category_id TO category_id;
ALTER TABLE courses ADD CONSTRAINT fk_courses_new_category
    FOREIGN KEY (category_id) REFERENCES course_categories(id) ON DELETE SET NULL;
```

## Backward Compatibility

- `GET /api/v3/categories` (old) → still works, returns flat list of root categories
- `CreateCourseRequest.categoryId` → accepts both root and subcategory IDs
- Course code generation: same `PREFIX-###` logic, prefix from `course_categories.prefix`
- Old `Category` domain model → deprecated, replaced by `CourseCategory`

## File Scope

### Backend (New)
| File | Purpose |
|------|---------|
| `domain/model/CourseCategory.java` | Domain aggregate |
| `domain/model/CourseTag.java` | Domain entity |
| `domain/repository/CourseCategoryRepository.java` | Port |
| `domain/repository/CourseTagRepository.java` | Port |
| `infrastructure/persistence/entity/CourseCategoryJpaEntity.java` | JPA entity |
| `infrastructure/persistence/entity/CourseTagJpaEntity.java` | JPA entity |
| `infrastructure/persistence/entity/CourseTagAssignmentJpaEntity.java` | JPA entity |
| `infrastructure/persistence/repository/CourseCategoryJpaRepository.java` | Spring Data |
| `infrastructure/persistence/repository/CourseTagJpaRepository.java` | Spring Data |
| `infrastructure/persistence/CourseCategoryRepositoryAdapter.java` | Adapter |
| `infrastructure/persistence/CourseTagRepositoryAdapter.java` | Adapter |
| `application/usecase/ManageCourseCategoryUseCase.java` | Use case |
| `application/usecase/ManageCourseTagUseCase.java` | Use case |
| `application/usecase/AssignCourseTagsUseCase.java` | Use case |
| `infrastructure/web/CourseCategoryControllerV3.java` | REST controller |
| `infrastructure/web/CourseTagControllerV3.java` | REST controller |
| `db/migration/V56__course_categories_tags.sql` | Create tables + seed |
| `db/migration/V57__migrate_course_category_fk.sql` | Migrate FK |

### Backend (Modify)
| File | Changes |
|------|---------|
| `CourseAuthoringUseCase.java` | Use `CourseCategoryRepository` for prefix lookup |
| `CourseAuthoringSupportControllerV3.java` | Deprecate, redirect to new endpoint |

### Frontend (New)
| File | Purpose |
|------|---------|
| `admin/presentation/components/category-management.component.ts` | Admin CRUD page |
| `shared/components/category-picker/` | Reusable 2-level cascading picker |
| `shared/components/tag-picker/` | Reusable multi-select tag picker |

### Frontend (Modify)
| File | Changes |
|------|---------|
| `sidebar.config.ts` | Add "Danh mục" to admin sidebar |
| `admin.routes.ts` | Add `/admin/categories` route |
| `admin.endpoints.ts` | Add category/tag admin endpoints |
| `admin.service.ts` | Add category/tag CRUD methods |
| `course-creation.component.ts` | 2 cascading dropdowns + tag picker |
| `course-info.component.ts` | 2 cascading dropdowns + tag picker |
| `course-management.component.ts` | 2-level category filter + tag filter |
| `student-course-browser.component.ts` | Category tabs from API |
| `course.types.ts` | Add CourseCategoryDTO, CourseTagDTO types |

### Frontend (Remove)
| File | Reason |
|------|--------|
| `category.configs.ts` | Replaced by dynamic DB data |

## Verification

1. `cd backend && docker compose up -d` → migrations run (V56, V57)
2. `GET /api/v3/course-categories` → returns 2-level tree
3. `GET /api/v3/course-tags` → returns tag list
4. Admin: create category, create subcategory, create tag → all persist
5. Teacher: create course with subcategory + 3 tags → works
6. Student: browse page shows category tabs + tag filters
7. Course code generation: still produces `NAV-001` format
8. `GET /api/v3/categories` (old) → backward-compatible response
9. `cd fe && npx ng build` → 0 errors
