# Category/Taxonomy System Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 5 hardcoded flat categories with a 2-level hierarchical category system + tags, fully managed by ADMIN/ORG_ADMIN via CRUD UI.

**Architecture:** 3 new DB tables (`course_categories`, `course_tags`, `course_tag_assignments`), Clean Architecture domain models, full CRUD API endpoints, Angular admin management page, cascading category picker for teacher, tag-based filtering for students. Zero-downtime migration preserving existing course-category links.

**Tech Stack:** Spring Boot 3.2 / Java 21 / PostgreSQL 16 / Flyway / Angular 20.3 / Signals / Standalone Components

**Design doc:** `docs/plans/2026-03-03-category-taxonomy-redesign-design.md`

---

### Task 1: Database Migration — Create Tables + Seed

**Files:**
- Create: `backend/src/main/resources/db/migration/V70__course_categories_and_tags.sql`

**Step 1: Write the migration SQL**

```sql
-- V70: Course Categories (2-level hierarchy) + Tags system
-- Replaces flat 'categories' table with hierarchical course_categories + tags

-- 1. course_categories: 2-level hierarchy (parent_id=NULL for root)
CREATE TABLE IF NOT EXISTS course_categories (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id   UUID            REFERENCES course_categories(id) ON DELETE CASCADE,
    code        VARCHAR(50)     NOT NULL,
    name        VARCHAR(255)    NOT NULL,
    slug        VARCHAR(100)    NOT NULL,
    prefix      VARCHAR(10),
    description TEXT,
    icon        VARCHAR(50),
    sort_order  INT             NOT NULL DEFAULT 0,
    is_active   BOOLEAN         NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ,

    CONSTRAINT uq_course_categories_code UNIQUE (code),
    CONSTRAINT uq_course_categories_slug UNIQUE (slug)
);

-- Prefix uniqueness: only non-null values must be unique (subcategories have NULL prefix)
CREATE UNIQUE INDEX uq_course_categories_prefix ON course_categories (prefix) WHERE prefix IS NOT NULL;

CREATE INDEX idx_course_categories_parent ON course_categories(parent_id);
CREATE INDEX idx_course_categories_active ON course_categories(is_active);

COMMENT ON TABLE course_categories IS '2-level course taxonomy. parent_id=NULL → root category, non-null → subcategory. Max 2 levels enforced in application.';

-- 2. course_tags: flat controlled vocabulary
CREATE TABLE IF NOT EXISTS course_tags (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100)    NOT NULL,
    slug        VARCHAR(100)    NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_course_tags_name UNIQUE (name),
    CONSTRAINT uq_course_tags_slug UNIQUE (slug)
);

COMMENT ON TABLE course_tags IS 'Controlled vocabulary tags for courses. Admin-managed only. Max 5 tags per course.';

-- 3. course_tag_assignments: many-to-many (course <-> tags)
CREATE TABLE IF NOT EXISTS course_tag_assignments (
    course_id   UUID            NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    tag_id      UUID            NOT NULL REFERENCES course_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, tag_id)
);

CREATE INDEX idx_course_tag_assignments_tag ON course_tag_assignments(tag_id);

COMMENT ON TABLE course_tag_assignments IS 'Many-to-many: courses ↔ tags.';

-- 4. Migrate existing 5 categories → root categories (preserve UUIDs for FK compat)
INSERT INTO course_categories (id, parent_id, code, name, slug, prefix, sort_order, is_active)
SELECT id, NULL, code, name, LOWER(code), prefix,
       ROW_NUMBER() OVER (ORDER BY code)::int, true
FROM categories
ON CONFLICT (code) DO NOTHING;

-- 5. Seed subcategories under each root
-- NAVIGATION subcategories
INSERT INTO course_categories (parent_id, code, name, slug, sort_order) VALUES
((SELECT id FROM course_categories WHERE code = 'NAVIGATION'), 'NAV_RADAR',     'Radar & ECDIS',        'radar-ecdis',          1),
((SELECT id FROM course_categories WHERE code = 'NAVIGATION'), 'NAV_CELESTIAL', 'Thiên văn hàng hải',   'thien-van-hang-hai',   2),
((SELECT id FROM course_categories WHERE code = 'NAVIGATION'), 'NAV_COLREG',    'Quy tắc tránh va',     'quy-tac-tranh-va',     3),
((SELECT id FROM course_categories WHERE code = 'NAVIGATION'), 'NAV_PILOTAGE',  'Luồng lạch & hoa tiêu','luong-lach-hoa-tieu',  4);

-- ENGINEERING subcategories
INSERT INTO course_categories (parent_id, code, name, slug, sort_order) VALUES
((SELECT id FROM course_categories WHERE code = 'ENGINEERING'), 'ENG_DIESEL',    'Diesel chính',         'diesel-chinh',         1),
((SELECT id FROM course_categories WHERE code = 'ENGINEERING'), 'ENG_ELECTRIC',  'Hệ thống điện',        'he-thong-dien',        2),
((SELECT id FROM course_categories WHERE code = 'ENGINEERING'), 'ENG_AUX',       'Hệ thống phụ',         'he-thong-phu',         3);

-- SAFETY subcategories
INSERT INTO course_categories (parent_id, code, name, slug, sort_order) VALUES
((SELECT id FROM course_categories WHERE code = 'SAFETY'), 'SAF_STCW',      'STCW Cơ bản',          'stcw-co-ban',          1),
((SELECT id FROM course_categories WHERE code = 'SAFETY'), 'SAF_FIRE',      'Chữa cháy',            'chua-chay',            2),
((SELECT id FROM course_categories WHERE code = 'SAFETY'), 'SAF_EMERGENCY', 'Ứng phó khẩn cấp',     'ung-pho-khan-cap',     3);

-- LOGISTICS subcategories
INSERT INTO course_categories (parent_id, code, name, slug, sort_order) VALUES
((SELECT id FROM course_categories WHERE code = 'LOGISTICS'), 'LOG_PORT',      'Quản lý cảng',         'quan-ly-cang',         1),
((SELECT id FROM course_categories WHERE code = 'LOGISTICS'), 'LOG_CONTAINER', 'Vận tải container',    'van-tai-container',    2);

-- LAW subcategories
INSERT INTO course_categories (parent_id, code, name, slug, sort_order) VALUES
((SELECT id FROM course_categories WHERE code = 'LAW'), 'LAW_INTL',      'Luật biển quốc tế',    'luat-bien-quoc-te',    1),
((SELECT id FROM course_categories WHERE code = 'LAW'), 'LAW_VN',        'Luật hàng hải VN',     'luat-hang-hai-vn',     2);

-- 6. Seed some initial tags
INSERT INTO course_tags (name, slug) VALUES
('STCW',           'stcw'),
('IMO',            'imo'),
('Chứng chỉ',     'chung-chi'),
('Thực hành',      'thuc-hanh'),
('Lý thuyết',      'ly-thuyet'),
('Nâng cao',       'nang-cao'),
('Cơ bản',         'co-ban'),
('An ninh',        'an-ninh'),
('Môi trường',     'moi-truong'),
('Mô phỏng',       'mo-phong')
ON CONFLICT (name) DO NOTHING;

-- 7. Point courses to new table (preserve existing category links)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS new_category_id UUID REFERENCES course_categories(id) ON DELETE SET NULL;
UPDATE courses SET new_category_id = category_id WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_courses_new_category ON courses(new_category_id);
```

**Step 2: Verify migration runs**

Run: `cd backend && docker compose up -d && docker compose logs api --tail=30 | grep -i "flyway\|migration\|V70"`
Expected: `Successfully applied 1 migration to schema "public", now at version v70`

---

### Task 2: Backend Domain Models

**Files:**
- Create: `backend/src/main/java/com/example/lms/course_authoring/domain/model/CourseCategory.java`
- Create: `backend/src/main/java/com/example/lms/course_authoring/domain/model/CourseTag.java`

**Step 1: Create CourseCategory domain model**

```java
package com.example.lms.course_authoring.domain.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class CourseCategory {

    private UUID id;
    private UUID parentId;
    private String code;
    private String name;
    private String slug;
    private String prefix;       // nullable — root categories only
    private String description;
    private String icon;
    private int sortOrder;
    private boolean active;
    private Instant createdAt;
    private Instant updatedAt;

    // Transient: populated for tree responses
    private List<CourseCategory> children = new ArrayList<>();

    // --- Factory methods ---

    public static CourseCategory createRoot(String code, String name, String slug, String prefix, String description, String icon) {
        var cat = new CourseCategory();
        cat.code = code;
        cat.name = name;
        cat.slug = slug;
        cat.prefix = prefix;
        cat.description = description;
        cat.icon = icon;
        cat.sortOrder = 0;
        cat.active = true;
        return cat;
    }

    public static CourseCategory createSub(UUID parentId, String code, String name, String slug, String description) {
        if (parentId == null) throw new IllegalArgumentException("Subcategory must have a parent");
        var cat = new CourseCategory();
        cat.parentId = parentId;
        cat.code = code;
        cat.name = name;
        cat.slug = slug;
        cat.prefix = null; // subcategories don't have prefix
        cat.description = description;
        cat.sortOrder = 0;
        cat.active = true;
        return cat;
    }

    // --- Reconstitution (from persistence) ---

    public static CourseCategory reconstitute(UUID id, UUID parentId, String code, String name, String slug,
                                               String prefix, String description, String icon,
                                               int sortOrder, boolean active, Instant createdAt, Instant updatedAt) {
        var cat = new CourseCategory();
        cat.id = id;
        cat.parentId = parentId;
        cat.code = code;
        cat.name = name;
        cat.slug = slug;
        cat.prefix = prefix;
        cat.description = description;
        cat.icon = icon;
        cat.sortOrder = sortOrder;
        cat.active = active;
        cat.createdAt = createdAt;
        cat.updatedAt = updatedAt;
        return cat;
    }

    // --- Behavior ---

    public boolean isRoot() { return parentId == null; }
    public boolean isSubcategory() { return parentId != null; }

    public void activate() { this.active = true; }
    public void deactivate() { this.active = false; }

    public void update(String name, String slug, String description, String icon) {
        this.name = name;
        this.slug = slug;
        this.description = description;
        this.icon = icon;
    }

    public void updatePrefix(String prefix) {
        if (!isRoot()) throw new IllegalStateException("Only root categories can have a prefix");
        this.prefix = prefix;
    }

    public void reorder(int sortOrder) { this.sortOrder = sortOrder; }

    public void addChild(CourseCategory child) { this.children.add(child); }

    // --- Getters ---
    public UUID getId() { return id; }
    public UUID getParentId() { return parentId; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getSlug() { return slug; }
    public String getPrefix() { return prefix; }
    public String getDescription() { return description; }
    public String getIcon() { return icon; }
    public int getSortOrder() { return sortOrder; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<CourseCategory> getChildren() { return children; }

    private CourseCategory() {} // prevent external construction
}
```

**Step 2: Create CourseTag domain model**

```java
package com.example.lms.course_authoring.domain.model;

import java.time.Instant;
import java.util.UUID;

public class CourseTag {

    private UUID id;
    private String name;
    private String slug;
    private Instant createdAt;

    public static CourseTag create(String name, String slug) {
        var tag = new CourseTag();
        tag.name = name;
        tag.slug = slug;
        return tag;
    }

    public static CourseTag reconstitute(UUID id, String name, String slug, Instant createdAt) {
        var tag = new CourseTag();
        tag.id = id;
        tag.name = name;
        tag.slug = slug;
        tag.createdAt = createdAt;
        return tag;
    }

    public void rename(String name, String slug) {
        this.name = name;
        this.slug = slug;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getSlug() { return slug; }
    public Instant getCreatedAt() { return createdAt; }

    private CourseTag() {}
}
```

**Step 3: Verify compilation**

Run: `cd backend && docker compose exec api bash -c "cd /app && ./mvnw compile -q" 2>&1 | tail -5`
Expected: BUILD SUCCESS

---

### Task 3: Backend JPA Entities + Spring Data Repositories

**Files:**
- Create: `backend/src/main/java/com/example/lms/course_authoring/infrastructure/persistence/entity/CourseCategoryJpaEntity.java`
- Create: `backend/src/main/java/com/example/lms/course_authoring/infrastructure/persistence/entity/CourseTagJpaEntity.java`
- Create: `backend/src/main/java/com/example/lms/course_authoring/infrastructure/persistence/entity/CourseTagAssignmentJpaEntity.java`
- Create: `backend/src/main/java/com/example/lms/course_authoring/infrastructure/persistence/repository/CourseCategoryJpaRepository.java`
- Create: `backend/src/main/java/com/example/lms/course_authoring/infrastructure/persistence/repository/CourseTagJpaRepository.java`
- Create: `backend/src/main/java/com/example/lms/course_authoring/infrastructure/persistence/repository/CourseTagAssignmentJpaRepository.java`

**Step 1: CourseCategoryJpaEntity**

```java
package com.example.lms.course_authoring.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "course_categories")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class CourseCategoryJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "parent_id")
    private UUID parentId;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(length = 10)
    private String prefix;

    private String description;

    @Column(length = 50)
    private String icon;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
```

**Step 2: CourseTagJpaEntity**

```java
package com.example.lms.course_authoring.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "course_tags")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class CourseTagJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
```

**Step 3: CourseTagAssignmentJpaEntity**

```java
package com.example.lms.course_authoring.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Entity
@Table(name = "course_tag_assignments")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@IdClass(CourseTagAssignmentJpaEntity.CourseTagAssignmentId.class)
public class CourseTagAssignmentJpaEntity {

    @Id
    @Column(name = "course_id")
    private UUID courseId;

    @Id
    @Column(name = "tag_id")
    private UUID tagId;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CourseTagAssignmentId implements Serializable {
        private UUID courseId;
        private UUID tagId;
    }
}
```

**Step 4: Spring Data JPA Repositories**

**CourseCategoryJpaRepository.java:**
```java
package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseCategoryJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseCategoryJpaRepository extends JpaRepository<CourseCategoryJpaEntity, UUID> {

    List<CourseCategoryJpaEntity> findByParentIdIsNullOrderBySortOrder();

    List<CourseCategoryJpaEntity> findByParentIdOrderBySortOrder(UUID parentId);

    @Query("SELECT c FROM CourseCategoryJpaEntity c ORDER BY c.parentId NULLS FIRST, c.sortOrder")
    List<CourseCategoryJpaEntity> findAllOrdered();

    List<CourseCategoryJpaEntity> findByActiveTrue();

    boolean existsByCode(String code);

    boolean existsBySlug(String slug);

    boolean existsByPrefix(String prefix);

    Optional<CourseCategoryJpaEntity> findByCode(String code);
}
```

**CourseTagJpaRepository.java:**
```java
package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseTagJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseTagJpaRepository extends JpaRepository<CourseTagJpaEntity, UUID> {

    boolean existsByName(String name);

    boolean existsBySlug(String slug);

    Optional<CourseTagJpaEntity> findByName(String name);

    List<CourseTagJpaEntity> findAllByOrderByNameAsc();
}
```

**CourseTagAssignmentJpaRepository.java:**
```java
package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseTagAssignmentJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CourseTagAssignmentJpaRepository
        extends JpaRepository<CourseTagAssignmentJpaEntity, CourseTagAssignmentJpaEntity.CourseTagAssignmentId> {

    List<CourseTagAssignmentJpaEntity> findByCourseId(UUID courseId);

    @Modifying
    @Query("DELETE FROM CourseTagAssignmentJpaEntity a WHERE a.courseId = :courseId")
    void deleteAllByCourseId(@Param("courseId") UUID courseId);

    @Query("SELECT a.tagId FROM CourseTagAssignmentJpaEntity a WHERE a.courseId = :courseId")
    List<UUID> findTagIdsByCourseId(@Param("courseId") UUID courseId);

    long countByCourseId(UUID courseId);
}
```

**Step 5: Verify compilation**

Run: `cd backend && docker compose exec api bash -c "cd /app && ./mvnw compile -q" 2>&1 | tail -5`
Expected: BUILD SUCCESS

---

### Task 4: Backend Repository Ports + Adapters

**Files:**
- Create: `backend/src/main/java/com/example/lms/course_authoring/domain/repository/CourseCategoryRepository.java`
- Create: `backend/src/main/java/com/example/lms/course_authoring/domain/repository/CourseTagRepository.java`
- Create: `backend/src/main/java/com/example/lms/course_authoring/infrastructure/persistence/CourseCategoryRepositoryAdapter.java`
- Create: `backend/src/main/java/com/example/lms/course_authoring/infrastructure/persistence/CourseTagRepositoryAdapter.java`

**Step 1: CourseCategoryRepository port**

```java
package com.example.lms.course_authoring.domain.repository;

import com.example.lms.course_authoring.domain.model.CourseCategory;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CourseCategoryRepository {
    Optional<CourseCategory> findById(UUID id);
    List<CourseCategory> findAllRoots();
    List<CourseCategory> findChildrenOf(UUID parentId);
    List<CourseCategory> findAllActiveTree();
    List<CourseCategory> findAll();
    CourseCategory save(CourseCategory category);
    void deleteById(UUID id);
    boolean existsByCode(String code);
    boolean existsBySlug(String slug);
    boolean existsByPrefix(String prefix);
}
```

**Step 2: CourseTagRepository port**

```java
package com.example.lms.course_authoring.domain.repository;

import com.example.lms.course_authoring.domain.model.CourseTag;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface CourseTagRepository {
    List<CourseTag> findAll();
    Optional<CourseTag> findById(UUID id);
    CourseTag save(CourseTag tag);
    void deleteById(UUID id);
    boolean existsByName(String name);
    boolean existsBySlug(String slug);
    List<CourseTag> findByCourseId(UUID courseId);
    void assignTagsToCourse(UUID courseId, Set<UUID> tagIds);
    void removeAllTagsFromCourse(UUID courseId);
    long countByCourseId(UUID courseId);
}
```

**Step 3: CourseCategoryRepositoryAdapter**

```java
package com.example.lms.course_authoring.infrastructure.persistence;

import com.example.lms.course_authoring.domain.model.CourseCategory;
import com.example.lms.course_authoring.domain.repository.CourseCategoryRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseCategoryJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseCategoryJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class CourseCategoryRepositoryAdapter implements CourseCategoryRepository {

    private final CourseCategoryJpaRepository jpaRepo;

    @Override
    public Optional<CourseCategory> findById(UUID id) {
        return jpaRepo.findById(id).map(this::toDomain);
    }

    @Override
    public List<CourseCategory> findAllRoots() {
        return jpaRepo.findByParentIdIsNullOrderBySortOrder().stream()
                .map(this::toDomain).toList();
    }

    @Override
    public List<CourseCategory> findChildrenOf(UUID parentId) {
        return jpaRepo.findByParentIdOrderBySortOrder(parentId).stream()
                .map(this::toDomain).toList();
    }

    @Override
    public List<CourseCategory> findAllActiveTree() {
        var all = jpaRepo.findByActiveTrue();
        return buildTree(all);
    }

    @Override
    public List<CourseCategory> findAll() {
        var all = jpaRepo.findAllOrdered();
        return buildTree(all);
    }

    @Override
    public CourseCategory save(CourseCategory category) {
        var entity = toEntity(category);
        var saved = jpaRepo.save(entity);
        return toDomain(saved);
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepo.deleteById(id);
    }

    @Override
    public boolean existsByCode(String code) { return jpaRepo.existsByCode(code); }

    @Override
    public boolean existsBySlug(String slug) { return jpaRepo.existsBySlug(slug); }

    @Override
    public boolean existsByPrefix(String prefix) { return jpaRepo.existsByPrefix(prefix); }

    // --- Mapping ---

    private CourseCategory toDomain(CourseCategoryJpaEntity e) {
        return CourseCategory.reconstitute(
                e.getId(), e.getParentId(), e.getCode(), e.getName(), e.getSlug(),
                e.getPrefix(), e.getDescription(), e.getIcon(),
                e.getSortOrder(), e.isActive(), e.getCreatedAt(), e.getUpdatedAt()
        );
    }

    private CourseCategoryJpaEntity toEntity(CourseCategory c) {
        return CourseCategoryJpaEntity.builder()
                .id(c.getId())
                .parentId(c.getParentId())
                .code(c.getCode())
                .name(c.getName())
                .slug(c.getSlug())
                .prefix(c.getPrefix())
                .description(c.getDescription())
                .icon(c.getIcon())
                .sortOrder(c.getSortOrder())
                .active(c.isActive())
                .build();
    }

    private List<CourseCategory> buildTree(List<CourseCategoryJpaEntity> all) {
        Map<UUID, CourseCategory> map = new LinkedHashMap<>();
        List<CourseCategory> roots = new ArrayList<>();

        for (var e : all) {
            map.put(e.getId(), toDomain(e));
        }
        for (var cat : map.values()) {
            if (cat.isRoot()) {
                roots.add(cat);
            } else if (map.containsKey(cat.getParentId())) {
                map.get(cat.getParentId()).addChild(cat);
            }
        }
        return roots;
    }
}
```

**Step 4: CourseTagRepositoryAdapter**

```java
package com.example.lms.course_authoring.infrastructure.persistence;

import com.example.lms.course_authoring.domain.model.CourseTag;
import com.example.lms.course_authoring.domain.repository.CourseTagRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseTagAssignmentJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseTagJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseTagAssignmentJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseTagJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Component
@RequiredArgsConstructor
public class CourseTagRepositoryAdapter implements CourseTagRepository {

    private final CourseTagJpaRepository tagRepo;
    private final CourseTagAssignmentJpaRepository assignmentRepo;

    @Override
    public List<CourseTag> findAll() {
        return tagRepo.findAllByOrderByNameAsc().stream().map(this::toDomain).toList();
    }

    @Override
    public Optional<CourseTag> findById(UUID id) {
        return tagRepo.findById(id).map(this::toDomain);
    }

    @Override
    public CourseTag save(CourseTag tag) {
        var entity = CourseTagJpaEntity.builder()
                .id(tag.getId())
                .name(tag.getName())
                .slug(tag.getSlug())
                .build();
        return toDomain(tagRepo.save(entity));
    }

    @Override
    public void deleteById(UUID id) { tagRepo.deleteById(id); }

    @Override
    public boolean existsByName(String name) { return tagRepo.existsByName(name); }

    @Override
    public boolean existsBySlug(String slug) { return tagRepo.existsBySlug(slug); }

    @Override
    public List<CourseTag> findByCourseId(UUID courseId) {
        var tagIds = assignmentRepo.findTagIdsByCourseId(courseId);
        if (tagIds.isEmpty()) return List.of();
        return tagRepo.findAllById(tagIds).stream().map(this::toDomain).toList();
    }

    @Override
    @Transactional
    public void assignTagsToCourse(UUID courseId, Set<UUID> tagIds) {
        assignmentRepo.deleteAllByCourseId(courseId);
        for (var tagId : tagIds) {
            assignmentRepo.save(new CourseTagAssignmentJpaEntity(courseId, tagId));
        }
    }

    @Override
    @Transactional
    public void removeAllTagsFromCourse(UUID courseId) {
        assignmentRepo.deleteAllByCourseId(courseId);
    }

    @Override
    public long countByCourseId(UUID courseId) {
        return assignmentRepo.countByCourseId(courseId);
    }

    private CourseTag toDomain(CourseTagJpaEntity e) {
        return CourseTag.reconstitute(e.getId(), e.getName(), e.getSlug(), e.getCreatedAt());
    }
}
```

**Step 5: Verify compilation**

Run: `cd backend && docker compose exec api bash -c "cd /app && ./mvnw compile -q" 2>&1 | tail -5`
Expected: BUILD SUCCESS

---

### Task 5: Backend Use Cases

**Files:**
- Create: `backend/src/main/java/com/example/lms/course_authoring/application/usecase/ManageCourseCategoryUseCase.java`
- Create: `backend/src/main/java/com/example/lms/course_authoring/application/usecase/ManageCourseTagUseCase.java`
- Create: `backend/src/main/java/com/example/lms/course_authoring/application/usecase/AssignCourseTagsUseCase.java`

**Step 1: ManageCourseCategoryUseCase**

```java
package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.model.CourseCategory;
import com.example.lms.course_authoring.domain.repository.CourseCategoryRepository;
import com.example.lms.shared.domain.exception.BusinessRuleException;
import com.example.lms.shared.domain.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ManageCourseCategoryUseCase {

    private final CourseCategoryRepository categoryRepo;

    public List<CourseCategory> getAllTree() {
        return categoryRepo.findAll();
    }

    public List<CourseCategory> getActiveTree() {
        return categoryRepo.findAllActiveTree();
    }

    @Transactional
    public CourseCategory createRoot(String code, String name, String slug, String prefix, String description, String icon) {
        if (categoryRepo.existsByCode(code))
            throw new BusinessRuleException("CATEGORY_CODE_EXISTS", "Mã danh mục đã tồn tại: " + code);
        if (categoryRepo.existsBySlug(slug))
            throw new BusinessRuleException("CATEGORY_SLUG_EXISTS", "Slug đã tồn tại: " + slug);
        if (prefix != null && !prefix.isBlank() && categoryRepo.existsByPrefix(prefix))
            throw new BusinessRuleException("CATEGORY_PREFIX_EXISTS", "Prefix đã tồn tại: " + prefix);

        var category = CourseCategory.createRoot(code, name, slug, prefix, description, icon);
        return categoryRepo.save(category);
    }

    @Transactional
    public CourseCategory createSub(UUID parentId, String code, String name, String slug, String description) {
        var parent = categoryRepo.findById(parentId)
                .orElseThrow(() -> new EntityNotFoundException("Danh mục cha", parentId));
        if (!parent.isRoot())
            throw new BusinessRuleException("MAX_DEPTH_EXCEEDED", "Chỉ hỗ trợ 2 cấp danh mục. Không thể tạo danh mục con cho danh mục con.");
        if (categoryRepo.existsByCode(code))
            throw new BusinessRuleException("CATEGORY_CODE_EXISTS", "Mã danh mục đã tồn tại: " + code);
        if (categoryRepo.existsBySlug(slug))
            throw new BusinessRuleException("CATEGORY_SLUG_EXISTS", "Slug đã tồn tại: " + slug);

        var sub = CourseCategory.createSub(parentId, code, name, slug, description);
        return categoryRepo.save(sub);
    }

    @Transactional
    public CourseCategory update(UUID id, String name, String slug, String description, String icon, String prefix) {
        var category = categoryRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Danh mục", id));
        category.update(name, slug, description, icon);
        if (category.isRoot() && prefix != null) {
            category.updatePrefix(prefix);
        }
        return categoryRepo.save(category);
    }

    @Transactional
    public void deactivate(UUID id) {
        var category = categoryRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Danh mục", id));
        category.deactivate();
        categoryRepo.save(category);
    }

    @Transactional
    public void reorder(List<UUID> orderedIds) {
        for (int i = 0; i < orderedIds.size(); i++) {
            var category = categoryRepo.findById(orderedIds.get(i))
                    .orElseThrow(() -> new EntityNotFoundException("Danh mục", orderedIds.get(i)));
            category.reorder(i);
            categoryRepo.save(category);
        }
    }
}
```

**Step 2: ManageCourseTagUseCase**

```java
package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.model.CourseTag;
import com.example.lms.course_authoring.domain.repository.CourseTagRepository;
import com.example.lms.shared.domain.exception.BusinessRuleException;
import com.example.lms.shared.domain.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ManageCourseTagUseCase {

    private final CourseTagRepository tagRepo;

    public List<CourseTag> getAll() {
        return tagRepo.findAll();
    }

    @Transactional
    public CourseTag create(String name, String slug) {
        if (tagRepo.existsByName(name))
            throw new BusinessRuleException("TAG_NAME_EXISTS", "Tag đã tồn tại: " + name);
        if (tagRepo.existsBySlug(slug))
            throw new BusinessRuleException("TAG_SLUG_EXISTS", "Slug đã tồn tại: " + slug);
        return tagRepo.save(CourseTag.create(name, slug));
    }

    @Transactional
    public CourseTag rename(UUID id, String name, String slug) {
        var tag = tagRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Tag", id));
        tag.rename(name, slug);
        return tagRepo.save(tag);
    }

    @Transactional
    public void delete(UUID id) {
        if (tagRepo.findById(id).isEmpty())
            throw new EntityNotFoundException("Tag", id);
        tagRepo.deleteById(id);
    }
}
```

**Step 3: AssignCourseTagsUseCase**

```java
package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.repository.CourseTagRepository;
import com.example.lms.shared.domain.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AssignCourseTagsUseCase {

    private static final int MAX_TAGS = 5;
    private final CourseTagRepository tagRepo;

    @Transactional
    public void setTags(UUID courseId, Set<UUID> tagIds) {
        if (tagIds.size() > MAX_TAGS) {
            throw new BusinessRuleException("MAX_TAGS_EXCEEDED",
                    "Tối đa " + MAX_TAGS + " tags cho mỗi khóa học");
        }
        tagRepo.assignTagsToCourse(courseId, tagIds);
    }
}
```

**Step 4: Verify compilation**

Run: `cd backend && docker compose exec api bash -c "cd /app && ./mvnw compile -q" 2>&1 | tail -5`
Expected: BUILD SUCCESS

---

### Task 6: Backend REST Controllers

**Files:**
- Create: `backend/src/main/java/com/example/lms/course_authoring/infrastructure/web/CourseCategoryControllerV3.java`
- Create: `backend/src/main/java/com/example/lms/course_authoring/infrastructure/web/CourseTagControllerV3.java`

**Step 1: CourseCategoryControllerV3**

```java
package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.application.usecase.ManageCourseCategoryUseCase;
import com.example.lms.course_authoring.domain.model.CourseCategory;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Course Categories V3")
@RestController
@RequestMapping("/api/v3")
@RequiredArgsConstructor
public class CourseCategoryControllerV3 {

    private final ManageCourseCategoryUseCase useCase;

    // --- Public (cached) ---

    @Operation(summary = "Get active category tree (public)")
    @GetMapping("/course-categories")
    @Cacheable("courseCategories")
    public ResponseEntity<ApiResponse<List<CourseCategoryDTO>>> getActiveTree() {
        var tree = useCase.getActiveTree();
        return ResponseEntity.ok(ApiResponse.success(tree.stream().map(this::toDTO).toList(), "Danh mục khóa học"));
    }

    // --- Admin CRUD ---

    @Operation(summary = "Get full category tree (admin)")
    @GetMapping("/admin/course-categories")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<List<CourseCategoryDTO>>> getFullTree() {
        var tree = useCase.getAllTree();
        return ResponseEntity.ok(ApiResponse.success(tree.stream().map(this::toDTO).toList(), "Tất cả danh mục"));
    }

    @Operation(summary = "Create category")
    @PostMapping("/admin/course-categories")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @CacheEvict(value = "courseCategories", allEntries = true)
    public ResponseEntity<ApiResponse<CourseCategoryDTO>> create(@Valid @RequestBody CreateCategoryRequest req) {
        CourseCategory created;
        if (req.parentId() != null) {
            created = useCase.createSub(req.parentId(), req.code(), req.name(), req.slug(), req.description());
        } else {
            created = useCase.createRoot(req.code(), req.name(), req.slug(), req.prefix(), req.description(), req.icon());
        }
        return ResponseEntity.ok(ApiResponse.success(toDTO(created), "Đã tạo danh mục"));
    }

    @Operation(summary = "Update category")
    @PutMapping("/admin/course-categories/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @CacheEvict(value = "courseCategories", allEntries = true)
    public ResponseEntity<ApiResponse<CourseCategoryDTO>> update(@PathVariable UUID id, @Valid @RequestBody UpdateCategoryRequest req) {
        var updated = useCase.update(id, req.name(), req.slug(), req.description(), req.icon(), req.prefix());
        return ResponseEntity.ok(ApiResponse.success(toDTO(updated), "Đã cập nhật danh mục"));
    }

    @Operation(summary = "Deactivate category (soft delete)")
    @DeleteMapping("/admin/course-categories/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @CacheEvict(value = "courseCategories", allEntries = true)
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable UUID id) {
        useCase.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã ẩn danh mục"));
    }

    @Operation(summary = "Reorder categories")
    @PutMapping("/admin/course-categories/reorder")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @CacheEvict(value = "courseCategories", allEntries = true)
    public ResponseEntity<ApiResponse<Void>> reorder(@RequestBody List<UUID> orderedIds) {
        useCase.reorder(orderedIds);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã sắp xếp lại"));
    }

    // --- DTOs ---

    public record CourseCategoryDTO(
            String id, String parentId, String code, String name, String slug,
            String prefix, String description, String icon, int sortOrder,
            boolean active, List<CourseCategoryDTO> children
    ) {}

    public record CreateCategoryRequest(
            UUID parentId,
            @NotBlank @Size(max = 50) String code,
            @NotBlank @Size(max = 255) String name,
            @NotBlank @Size(max = 100) String slug,
            @Size(max = 10) String prefix,
            String description,
            @Size(max = 50) String icon
    ) {}

    public record UpdateCategoryRequest(
            @NotBlank @Size(max = 255) String name,
            @NotBlank @Size(max = 100) String slug,
            String description,
            @Size(max = 50) String icon,
            @Size(max = 10) String prefix
    ) {}

    private CourseCategoryDTO toDTO(CourseCategory c) {
        return new CourseCategoryDTO(
                c.getId().toString(),
                c.getParentId() != null ? c.getParentId().toString() : null,
                c.getCode(), c.getName(), c.getSlug(),
                c.getPrefix(), c.getDescription(), c.getIcon(),
                c.getSortOrder(), c.isActive(),
                c.getChildren().stream().map(this::toDTO).toList()
        );
    }
}
```

**Step 2: CourseTagControllerV3**

```java
package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.application.usecase.AssignCourseTagsUseCase;
import com.example.lms.course_authoring.application.usecase.ManageCourseTagUseCase;
import com.example.lms.course_authoring.domain.model.CourseTag;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Tag(name = "Course Tags V3")
@RestController
@RequestMapping("/api/v3")
@RequiredArgsConstructor
public class CourseTagControllerV3 {

    private final ManageCourseTagUseCase tagUseCase;
    private final AssignCourseTagsUseCase assignUseCase;

    // --- Public ---

    @Operation(summary = "Get all tags")
    @GetMapping("/course-tags")
    public ResponseEntity<ApiResponse<List<CourseTagDTO>>> getAll() {
        var tags = tagUseCase.getAll();
        return ResponseEntity.ok(ApiResponse.success(tags.stream().map(this::toDTO).toList(), "Danh sách tags"));
    }

    // --- Admin ---

    @Operation(summary = "Get all tags (admin)")
    @GetMapping("/admin/course-tags")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<List<CourseTagDTO>>> getAllAdmin() {
        var tags = tagUseCase.getAll();
        return ResponseEntity.ok(ApiResponse.success(tags.stream().map(this::toDTO).toList(), "Tất cả tags"));
    }

    @Operation(summary = "Create tag")
    @PostMapping("/admin/course-tags")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<CourseTagDTO>> create(@Valid @RequestBody CreateTagRequest req) {
        var tag = tagUseCase.create(req.name(), req.slug());
        return ResponseEntity.ok(ApiResponse.success(toDTO(tag), "Đã tạo tag"));
    }

    @Operation(summary = "Rename tag")
    @PutMapping("/admin/course-tags/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<CourseTagDTO>> rename(@PathVariable UUID id, @Valid @RequestBody CreateTagRequest req) {
        var tag = tagUseCase.rename(id, req.name(), req.slug());
        return ResponseEntity.ok(ApiResponse.success(toDTO(tag), "Đã cập nhật tag"));
    }

    @Operation(summary = "Delete tag")
    @DeleteMapping("/admin/course-tags/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        tagUseCase.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa tag"));
    }

    // --- Course tag assignment (Teacher) ---

    @Operation(summary = "Set course tags (max 5)")
    @PutMapping("/courses/{courseId}/tags")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> setCourseTags(@PathVariable UUID courseId, @RequestBody Set<UUID> tagIds) {
        assignUseCase.setTags(courseId, tagIds);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã cập nhật tags"));
    }

    // --- DTOs ---

    public record CourseTagDTO(String id, String name, String slug) {}

    public record CreateTagRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Size(max = 100) String slug
    ) {}

    private CourseTagDTO toDTO(CourseTag t) {
        return new CourseTagDTO(t.getId().toString(), t.getName(), t.getSlug());
    }
}
```

**Step 3: Update SecurityConfig if needed — add new paths to permitAll**

Check `backend/src/main/java/com/example/lms/config/SecurityConfig.java` and ensure these public paths are permitted:
- `GET /api/v3/course-categories`
- `GET /api/v3/course-tags`

These should already match the existing wildcard `"/api/v3/**"` GET permit pattern. Verify and add if not.

**Step 4: Verify compilation + startup**

Run: `cd backend && docker compose restart api && docker compose logs api --tail=30 2>&1 | grep -i "started\|error\|exception"`
Expected: `Started LmsApplication` with no errors

---

### Task 7: Update CourseAuthoringUseCase — Use New Category

**Files:**
- Modify: `backend/src/main/java/com/example/lms/course_authoring/application/usecase/CourseAuthoringUseCase.java`

**Step 1: Update createCourse to use CourseCategoryRepository**

In `CourseAuthoringUseCase.java`, the `createCourse` method currently uses `CategoryRepository.findById()` to get the old `Category` record. Change it to use `CourseCategoryRepository` to look up the new `CourseCategory`:

Replace the field injection and the category lookup in createCourse():
- Change `private final CategoryRepository categoryRepository;` → `private final CourseCategoryRepository courseCategoryRepository;`
- In `createCourse()`: replace `Category category = categoryRepository.findById(...)` with `CourseCategory category = courseCategoryRepository.findById(...)`
- Replace `category.prefix()` → `category.getPrefix()` (CourseCategory is a class, not record)
- Handle subcategory: if selected category is a subcategory, look up its parent's prefix for code generation

```java
// Updated category lookup in createCourse():
CourseCategory selectedCategory = courseCategoryRepository.findById(request.getCategoryId())
        .orElseThrow(() -> new EntityNotFoundException("Danh mục", request.getCategoryId()));

// Resolve prefix: subcategory → use parent's prefix; root → use own prefix
String prefix;
if (selectedCategory.isSubcategory()) {
    CourseCategory parent = courseCategoryRepository.findById(selectedCategory.getParentId())
            .orElseThrow(() -> new EntityNotFoundException("Danh mục cha", selectedCategory.getParentId()));
    prefix = parent.getPrefix();
} else {
    prefix = selectedCategory.getPrefix();
}
if (prefix == null || prefix.isBlank()) {
    throw new BusinessRuleException("NO_PREFIX", "Danh mục không có prefix để tạo mã khóa học");
}
```

**Step 2: Update backward-compatible /categories endpoint**

In `CourseAuthoringControllerV3.java` (the old `CourseAuthoringSupportControllerV3`), update `getCategories()` to return data from the new `course_categories` table (root only, flat list) so existing FE code still works:

```java
// Replace: categoryJpaRepository.findAll()
// With: courseCategoryJpaRepository.findByParentIdIsNullOrderBySortOrder()
// Map to old CategoryDTO format (id, code, name, prefix)
```

**Step 3: Verify BE boots + old endpoint works**

Run: `cd backend && docker compose restart api && sleep 5 && curl -s http://localhost:8088/api/v3/categories | python -m json.tool | head -20`
Expected: Returns the 5 root categories in old format

Run: `curl -s http://localhost:8088/api/v3/course-categories | python -m json.tool | head -40`
Expected: Returns 2-level tree with subcategories

---

### Task 8: Frontend Types + Endpoints + Service

**Files:**
- Modify: `fe/src/app/api/types/course.types.ts` — add CourseCategoryDTO, CourseTagDTO
- Modify: `fe/src/app/api/endpoints/admin.endpoints.ts` — add new endpoints
- Modify: `fe/src/app/features/admin/infrastructure/services/admin.service.ts` — add CRUD methods

**Step 1: Add new types to course.types.ts**

Add after existing interfaces:

```typescript
// Course Category (2-level hierarchy)
export interface CourseCategoryDTO {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  slug: string;
  prefix: string | null;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  active: boolean;
  children: CourseCategoryDTO[];
}

// Course Tag
export interface CourseTagDTO {
  id: string;
  name: string;
  slug: string;
}
```

**Step 2: Add endpoints to admin.endpoints.ts**

Add to `ADMIN_ENDPOINTS`:

```typescript
// === Course Categories ===
COURSE_CATEGORIES: '/api/v3/admin/course-categories',
COURSE_CATEGORIES_REORDER: '/api/v3/admin/course-categories/reorder',
// === Course Tags ===
COURSE_TAGS: '/api/v3/admin/course-tags',
```

Also add public endpoints constant (outside ADMIN_ENDPOINTS):

```typescript
export const PUBLIC_ENDPOINTS = {
  COURSE_CATEGORIES: '/api/v3/course-categories',
  COURSE_TAGS: '/api/v3/course-tags',
};
```

**Step 3: Add admin service methods**

Add to `AdminService` class in `admin.service.ts`:

```typescript
// --- Course Categories ---
getCourseCategories(): Observable<CourseCategoryDTO[]> {
  return this.apiClient.getWithResponse<CourseCategoryDTO[]>(ADMIN_ENDPOINTS.COURSE_CATEGORIES).pipe(
    map(res => res.data || [])
  );
}

createCourseCategory(data: { parentId?: string; code: string; name: string; slug: string; prefix?: string; description?: string; icon?: string }): Observable<CourseCategoryDTO> {
  return this.apiClient.postWithResponse<CourseCategoryDTO>(ADMIN_ENDPOINTS.COURSE_CATEGORIES, data).pipe(
    map(res => res.data)
  );
}

updateCourseCategory(id: string, data: { name: string; slug: string; description?: string; icon?: string; prefix?: string }): Observable<CourseCategoryDTO> {
  return this.apiClient.putWithResponse<CourseCategoryDTO>(`${ADMIN_ENDPOINTS.COURSE_CATEGORIES}/${id}`, data).pipe(
    map(res => res.data)
  );
}

deleteCourseCategory(id: string): Observable<void> {
  return this.apiClient.deleteWithResponse<void>(`${ADMIN_ENDPOINTS.COURSE_CATEGORIES}/${id}`).pipe(
    map(() => undefined)
  );
}

reorderCourseCategories(orderedIds: string[]): Observable<void> {
  return this.apiClient.putWithResponse<void>(ADMIN_ENDPOINTS.COURSE_CATEGORIES_REORDER, orderedIds).pipe(
    map(() => undefined)
  );
}

// --- Course Tags ---
getCourseTags(): Observable<CourseTagDTO[]> {
  return this.apiClient.getWithResponse<CourseTagDTO[]>(ADMIN_ENDPOINTS.COURSE_TAGS).pipe(
    map(res => res.data || [])
  );
}

createCourseTag(data: { name: string; slug: string }): Observable<CourseTagDTO> {
  return this.apiClient.postWithResponse<CourseTagDTO>(ADMIN_ENDPOINTS.COURSE_TAGS, data).pipe(
    map(res => res.data)
  );
}

updateCourseTag(id: string, data: { name: string; slug: string }): Observable<CourseTagDTO> {
  return this.apiClient.putWithResponse<CourseTagDTO>(`${ADMIN_ENDPOINTS.COURSE_TAGS}/${id}`, data).pipe(
    map(res => res.data)
  );
}

deleteCourseTag(id: string): Observable<void> {
  return this.apiClient.deleteWithResponse<void>(`${ADMIN_ENDPOINTS.COURSE_TAGS}/${id}`).pipe(
    map(() => undefined)
  );
}
```

**Step 4: Verify FE build**

Run: `cd fe && npx ng build 2>&1 | tail -5`
Expected: 0 errors

---

### Task 9: Admin Category Management Page

**Files:**
- Create: `fe/src/app/features/admin/presentation/components/category-management.component.ts`
- Modify: `fe/src/app/features/admin/admin.routes.ts` — add route
- Modify: `fe/src/app/shared/components/navigation/sidebar.config.ts` — add menu item

**Step 1: Add sidebar menu item**

In `sidebar.config.ts`, add to `allAdminMenuItems` array (after "Khóa học" item at ~line 174):

```typescript
{
  label: 'Danh mục',
  route: '/admin/categories',
  icon: 'tag'
},
```

**Step 2: Add route**

In `admin.routes.ts`, add a new route inside the admin layout children:

```typescript
{
  path: 'categories',
  loadComponent: () => import('./presentation/components/category-management.component').then(m => m.CategoryManagementComponent),
  title: 'Quản lý danh mục'
},
```

**Step 3: Create CategoryManagementComponent**

Create `fe/src/app/features/admin/presentation/components/category-management.component.ts` — a full admin CRUD page with:

- **Left panel**: Category tree (root + subcategories, expandable)
- **Right panel**: Edit form OR tag management
- **Top actions**: [+ Danh mục gốc] [+ Danh mục con]
- **Tags section**: Chip list with add/edit/delete
- Design tokens: `#0056D2` primary, `bg-slate-50` page bg, `border-gray-200` cards

This component will be ~400-500 lines (single-file Angular component with inline template). Full code should be written in the implementation step.

Key signals:
```typescript
categories = signal<CourseCategoryDTO[]>([]);
tags = signal<CourseTagDTO[]>([]);
selectedCategory = signal<CourseCategoryDTO | null>(null);
expandedRoots = signal<Set<string>>(new Set());
isCreating = signal(false);
editMode = signal<'category' | 'tag'>('category');
```

**Step 4: Verify FE build + navigation**

Run: `cd fe && npx ng build 2>&1 | tail -5`
Expected: 0 errors

---

### Task 10: Update Course Creation — Cascading Category Picker

**Files:**
- Modify: `fe/src/app/features/teacher/courses/course-creation.component.ts`
- Modify: `fe/src/app/features/teacher/course-editor/services/course-authoring.service.ts`

**Step 1: Update CourseAuthoringService**

Add method to load category tree (alongside existing `getCategories()`):

```typescript
getCourseCategoryTree(): Observable<CourseCategoryDTO[]> {
  return this.http.get<ApiResponse<CourseCategoryDTO[]>>(`${this.baseUrl}/course-categories`).pipe(
    map(res => res.data)
  );
}
```

**Step 2: Update course-creation.component.ts**

Replace the single `<select>` dropdown with 2 cascading dropdowns:

1. Root category dropdown (Level 1)
2. Subcategory dropdown (Level 2) — shown only if root has children

Add new signals:
```typescript
categoryTree = signal<CourseCategoryDTO[]>([]);
rootCategories = computed(() => this.categoryTree());
selectedRoot = signal<CourseCategoryDTO | null>(null);
subcategories = computed(() => this.selectedRoot()?.children || []);
```

Replace `categoryControl` usage: when root selected, show subcategories. If subcategory selected, use its ID as `categoryId`. If root selected (no sub), use root ID.

Also update `selectedPrefix()` to traverse up to root for prefix.

**Step 3: Verify FE build**

Run: `cd fe && npx ng build 2>&1 | tail -5`
Expected: 0 errors

---

### Task 11: Update Course Editor — Category Picker + Tag Picker

**Files:**
- Modify: `fe/src/app/features/teacher/course-editor/pages/course-info/course-info.component.ts`

**Step 1: Update course-info component**

Replace single category `<select>` with the same 2-cascading-dropdown pattern from Task 10.

Add tag picker section below category:
- Load tags from `/api/v3/course-tags`
- Multi-select chips (max 5) with search
- Save via `PUT /api/v3/courses/{id}/tags`

**Step 2: Verify FE build**

Run: `cd fe && npx ng build 2>&1 | tail -5`
Expected: 0 errors

---

### Task 12: Update Admin Course Management + Student Browse

**Files:**
- Modify: `fe/src/app/features/admin/presentation/components/course-management.component.ts`
- Modify: `fe/src/app/features/student/browse/student-course-browser.component.ts`

**Step 1: Admin course-management.component.ts**

Replace single category filter dropdown with 2-level cascading filter:
- Root category filter → subcategory filter
- Add tag filter chips

**Step 2: Student browse component**

Replace dynamic `categoryList` (extracted from course data) with proper category tabs from API:
- Fetch `/api/v3/course-categories` on init
- Render root categories as horizontal tabs
- Click root → show subcategory chips below
- Add tag filter row

**Step 3: Verify FE build**

Run: `cd fe && npx ng build 2>&1 | tail -5`
Expected: 0 errors

---

### Task 13: Cleanup + Final Verification

**Files:**
- Delete or deprecate: `fe/src/app/features/courses/category/category.configs.ts` (if not used elsewhere)
- Modify: `fe/src/app/features/courses/category/configurable-category.component.ts` (update to use API data)

**Step 1: Check if category.configs.ts is used elsewhere**

Search for imports of `CATEGORY_CONFIGS` or `category.configs`. If only used by `configurable-category.component.ts`, the whole showcase page should be refactored to load from API instead of hardcoded data. This can be done in a follow-up task if the showcase pages are not priority.

**Step 2: Full build verification**

Run: `cd backend && docker compose restart api && docker compose logs api --tail=10 | grep "Started"`
Run: `cd fe && npx ng build 2>&1 | tail -5`
Expected: Both BE and FE build with 0 errors

**Step 3: API smoke tests**

```bash
# Public category tree
curl -s http://localhost:8088/api/v3/course-categories | python -m json.tool | head -30

# Public tags
curl -s http://localhost:8088/api/v3/course-tags | python -m json.tool

# Old endpoint (backward compat)
curl -s http://localhost:8088/api/v3/categories | python -m json.tool

# Admin: create category (requires auth token)
TOKEN=$(curl -s -X POST http://localhost:8088/api/v3/auth/login -H "Content-Type: application/json" -d '{"email":"admin@maritime.edu","password":"admin123"}' | python -m json.tool | grep accessToken | cut -d'"' -f4)

curl -s -X POST http://localhost:8088/api/v3/admin/course-categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"IT","name":"Công nghệ thông tin","slug":"cong-nghe-thong-tin","prefix":"IT","description":"Khóa học CNTT"}' | python -m json.tool

# Verify tree now has 6 root categories
curl -s http://localhost:8088/api/v3/course-categories | python -m json.tool | grep '"name"'
```

Expected: All endpoints respond correctly, new IT category appears in tree.
