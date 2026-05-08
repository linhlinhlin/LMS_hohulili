# STCW Competency Mapping — Design Spec
**Date:** 2026-05-05 | **Status:** Approved | **Author:** brainstorming session

---

## Overview

Tính năng **Competency Mapping Matrix** cho phép giảng viên ánh xạ từng lesson của khóa học với các tiêu chuẩn quốc tế hàng hải (STCW, SOLAS, COLREGs, MARPOL), hiển thị ma trận tổng quan và thống kê mức độ phủ.

---

## Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Module structure | New `competency_mapping/` module | Maritime standards là bounded context độc lập |
| Matrix page | Separate route `/teacher/courses/:courseId/competency-map` | Cần toàn màn hình cho bảng lớn |
| API prefix | `/api/v3/` | Nhất quán với 295 endpoints hiện có |
| Implementation | Phân tầng: DB → BE → FE panel → FE matrix | Mỗi phần verify độc lập |

---

## Part 1: Database (V130 migration)

### Tables

```sql
-- maritime_standards
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
code        VARCHAR(20) UNIQUE NOT NULL   -- 'STCW', 'SOLAS', 'COLREGS', 'MARPOL'
name        VARCHAR(100) NOT NULL
description TEXT
is_active   BOOLEAN DEFAULT TRUE
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()

-- standard_competencies
id             UUID PRIMARY KEY DEFAULT gen_random_uuid()
standard_id    UUID NOT NULL REFERENCES maritime_standards(id) ON DELETE CASCADE
code           VARCHAR(30) NOT NULL       -- 'A-II/1', 'Chapter V', 'Rule 8'
title          VARCHAR(200) NOT NULL
description    TEXT
category       VARCHAR(100)               -- 'Deck', 'Engine', 'Safety'
display_order  INT DEFAULT 0
is_active      BOOLEAN DEFAULT TRUE
created_at     TIMESTAMPTZ DEFAULT NOW()
updated_at     TIMESTAMPTZ DEFAULT NOW()
UNIQUE(standard_id, code)

-- lesson_competency_mappings
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
lesson_id     UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE
competency_id UUID NOT NULL REFERENCES standard_competencies(id) ON DELETE CASCADE
mapped_by     UUID REFERENCES users(id) ON DELETE SET NULL
mapped_at     TIMESTAMPTZ DEFAULT NOW()
note          TEXT
UNIQUE(lesson_id, competency_id)
```

### Indexes
```sql
CREATE INDEX idx_mapping_lesson      ON lesson_competency_mappings(lesson_id);
CREATE INDEX idx_mapping_competency  ON lesson_competency_mappings(competency_id);
CREATE INDEX idx_competency_standard ON standard_competencies(standard_id);
CREATE INDEX idx_competency_category ON standard_competencies(category)
    WHERE is_active = TRUE;  -- partial index for filter queries
```

### Seed Data
- V130: 4 standards + 10 STCW competency samples (dev/staging)
- V131 (backlog): Full STCW Manila 2010 import (40+ items, priority: A-II/1-2, A-III/1-2, A-VI/1-3)

---

## Part 2: Backend DDD Module

### Module Structure
```
competency_mapping/
├── domain/
│   ├── model/
│   │   ├── MaritimeStandard.java
│   │   ├── StandardCompetency.java
│   │   └── LessonCompetencyMapping.java
│   └── repository/
│       ├── MaritimeStandardRepository.java
│       ├── StandardCompetencyRepository.java
│       └── LessonCompetencyMappingRepository.java
├── application/
│   ├── usecase/
│   │   ├── GetStandardsUseCase.java
│   │   ├── GetCompetenciesUseCase.java
│   │   ├── GetCourseCompetencyMapUseCase.java    @Cacheable(key="#courseId")
│   │   ├── UpdateLessonCompetenciesUseCase.java  @CacheEvict(key="#courseId")
│   │   ├── GetLessonCompetenciesUseCase.java
│   │   └── ExportCompetencyMapUseCase.java        @RateLimiter("csv-export")
│   └── dto/
│       ├── StandardResponse.java
│       ├── CompetencyResponse.java
│       ├── CompetencyMapResponse.java   -- standards, competencies, lessons, stats, warnings
│       ├── LessonMappingResponse.java   -- id, title, chapterTitle, mappedCompetencyIds, warning
│       ├── CompetencyMapStats.java      -- totalMappings, coveragePercent, lessonsWithMapping, ...
│       └── UpdateLessonCompetenciesCommand.java
└── infrastructure/
    ├── persistence/
    │   ├── entity/
    │   │   ├── MaritimeStandardJpaEntity.java
    │   │   ├── StandardCompetencyJpaEntity.java
    │   │   └── LessonCompetencyMappingJpaEntity.java
    │   ├── mapper/CompetencyMapper.java
    │   ├── MaritimeStandardRepositoryAdapter.java
    │   ├── StandardCompetencyRepositoryAdapter.java
    │   └── LessonCompetencyMappingRepositoryAdapter.java
    └── web/CompetencyMappingController.java
```

### Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/v3/standards` | TEACHER/ADMIN | `?active=true` |
| GET | `/api/v3/standards/{id}/competencies` | TEACHER/ADMIN | `?category=Deck` |
| GET | `/api/v3/courses/{courseId}/competency-map` | TEACHER/ADMIN | cached 60s |
| PUT | `/api/v3/lessons/{lessonId}/competencies` | TEACHER/ADMIN | owns course |
| GET | `/api/v3/lessons/{lessonId}/competencies` | TEACHER/ADMIN | |
| GET | `/api/v3/courses/{courseId}/competency-map/export` | TEACHER/ADMIN | rate-limited |

### Critical Implementation Details

**Diff-based upsert (UpdateLessonCompetenciesUseCase):**
```java
Set<UUID> existingIds = repository.findByLessonId(lessonId)
    .stream().map(m -> m.getCompetencyId()).collect(toSet());
Set<UUID> newIds = new HashSet<>(command.getCompetencyIds());
Set<UUID> toAdd    = Sets.difference(newIds, existingIds);
Set<UUID> toRemove = Sets.difference(existingIds, newIds);
repository.deleteByLessonIdAndCompetencyIdIn(lessonId, toRemove);
repository.saveAll(toAdd.stream().map(id -> createMapping(lessonId, id, userId)).toList());
```
Preserves `mapped_at`/`mapped_by` for unchanged mappings.

**Ownership check (all write UseCases):**
```java
if (!lesson.getChapter().getCourse().getCreatedBy().equals(currentUserId)
    && !currentUser.hasRole(ADMIN)) {
    throw new ForbiddenException("You don't own this course");
}
```

**Query strategy (GetCourseCompetencyMapUseCase) — JOIN FETCH to avoid N+1:**
```java
@Query("SELECT l FROM LessonJpaEntity l " +
       "JOIN FETCH l.section s " +
       "JOIN FETCH s.chapter c " +
       "WHERE c.course.id = :courseId " +
       "ORDER BY c.orderIndex, s.orderIndex, l.orderIndex")
List<LessonJpaEntity> findAllByCourseId(UUID courseId);
```

**Warning format:**
- `LessonMappingResponse.warning` (String) — per-lesson when > 5 competencies
- `CompetencyMapResponse.warnings` (List<String>) — course-level aggregated warnings

**Cache invalidation:**
```java
// GetCourseCompetencyMapUseCase
@Cacheable(value = "competency-map", key = "#courseId")

// UpdateLessonCompetenciesUseCase — resolve courseId first, then evict
@CacheEvict(value = "competency-map", key = "#courseId")
```

**DTO Spec (UpdateLessonCompetenciesCommand):**
```java
@NotNull
List<UUID> competencyIds;  // all checked competencies after user interaction

@Size(max = 500)
String note;               // optional teacher note
```

---

## Part 3: Frontend

### File Structure
```
fe/src/app/
├── api/competency/
│   ├── competency-mapping.api.ts
│   └── competency-mapping.types.ts
└── features/teacher/
    ├── course-editor/components/
    │   └── competency-panel/
    │       ├── competency-panel.component.ts     (Component A)
    │       └── competency-panel.component.html
    └── competency-map/
        ├── competency-map.component.ts           (Component B — container)
        ├── competency-map.component.html
        ├── competency-map.routes.ts
        └── components/
            ├── competency-table/
            │   ├── competency-table.component.ts (matrix table)
            │   └── competency-table.component.html
            └── competency-stats-cards/
                └── competency-stats-cards.component.ts (Component C)
```

### TypeScript Interfaces (competency-mapping.types.ts)
```typescript
export interface MaritimeStandard {
  id: string;
  code: string;
  name: string;
  description?: string;
  competencyCount?: number;
}

export interface StandardCompetency {
  id: string;
  standardId: string;
  code: string;
  title: string;
  description?: string;
  category?: string;
}

export interface LessonMappingInfo {
  id: string;
  title: string;
  chapterTitle: string;
  sectionTitle?: string;
  mappedCompetencyIds: string[];
  warning?: string;  // shown when > 5 mappings
}

export interface CompetencyMapStats {
  totalMappings: number;
  coveragePercent: number;
  lessonsWithMapping: number;
  totalLessons: number;
  competenciesCovered: number;
  totalCompetencies: number;
}

export interface CompetencyMapResponse {
  standards: MaritimeStandard[];
  competencies: StandardCompetency[];
  lessons: LessonMappingInfo[];
  stats: CompetencyMapStats;
  warnings?: string[];
}

export interface UpdateLessonCompetenciesRequest {
  competencyIds: string[];
  note?: string;
}
```

### Component A — CompetencyPanelComponent

**Auto-save with debounce (no parent dependency):**
```typescript
private saveSubject = new Subject<string[]>();

ngOnInit() {
  this.saveSubject.pipe(
    debounceTime(500),
    distinctUntilChanged(),
    switchMap(ids => this.api.updateLessonCompetencies(this.lessonId(), ids))
  ).subscribe({
    error: () => this.toastr.error('Lưu tiêu chuẩn thất bại')
  });
}

toggleCompetency(id: string) {
  this.selectedCompetencies.update(ids =>
    ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
  );
  this.saveSubject.next(this.selectedCompetencies());
}
```

**States:**
- `isLoadingCompetencies = signal<boolean>(false)` → skeleton loader
- Warning amber badge when `selectedCompetencies().length > 5`
- Badge on panel title: total selected count

### Component B — CompetencyMapPageComponent

**Route:** `/teacher/courses/:courseId/competency-map`
**Guard:** `canActivate: [courseOwnershipGuard]`

- Skeleton loading on first fetch
- Filter: search (debounce 300ms) + multi-select standard dropdown
- Optimistic toggle: update signal immediately, rollback on API error
- Error state with retry button

### Component B inner — CompetencyTableComponent

**Inputs:** `lessons`, `competencies`, `onToggle`
- Sticky header on scroll
- Uncovered row: `background: #fefce8` (amber-50 warning)
- Uncovered column header: `color: #fca5a5` (red-300)
- Tooltip on column header: full competency title

**Accessibility:**
```html
<table role="grid" aria-label="Bảng ánh xạ năng lực">
  <th scope="col">...</th>
  <th scope="row">...</th>
  <input type="checkbox" [attr.aria-label]="'Ánh xạ ' + lesson.title + ' với ' + comp.code">
```

### Component C — CompetencyStatsCardsComponent

**Input:** `stats = input.required<CompetencyMapStats>()`
**Coverage color:**
- `< 30%` → `#ef4444` (red)
- `30–70%` → `#f97316` (orange)
- `> 70%` → `#22c55e` (green)

### CSV Export
```typescript
exportCSV() {
  this.isExporting.set(true);
  this.api.exportCompetencyMap(this.courseId()).subscribe({
    next: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.courseName()}-competency-map-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      this.isExporting.set(false);
    },
    error: () => {
      this.toastr.error('Xuất CSV thất bại');
      this.isExporting.set(false);
    }
  });
}
```

### Route Guard
```typescript
// course-ownership.guard.ts
export const courseOwnershipGuard: CanActivateFn = (route) => {
  const courseId = route.params['courseId'];
  return inject(CourseService).canAccessCourse(courseId);
};
```

### Route Registration (teacher.routes.ts)
```typescript
{
  path: 'courses/:courseId/competency-map',
  loadComponent: () => import('./competency-map/competency-map.component')
    .then(m => m.CompetencyMapComponent),
  canActivate: [courseOwnershipGuard]
}
```

### Empty States
- Course no lessons → "Khóa học chưa có bài học nào" + button navigate to lesson creator
- Course has lessons but no mappings → "Chưa có ánh xạ nào. Chọn bài học để bắt đầu."
- Panel loading → skeleton list

---

## Implementation Order

1. **V130 migration** — 3 tables + indexes + seed 10 STCW items
2. **Backend module** — domain models → repositories → use cases → controller
3. **competency-panel component** (Component A) — integrate into lesson editor
4. **competency-map page** (Component B + table + stats)
5. **CSV export** — wire export button and download
6. **V131 migration** (backlog) — full STCW Manila 2010 dataset

---

## Edge Cases

| Case | Handling |
|------|----------|
| Course has no lessons | Empty state with CTA |
| Lesson deleted with mappings | ON DELETE CASCADE in DB |
| New standard added after course created | New column appears automatically |
| Multiple teachers editing same course | Last-write-wins (no real-time sync, phase 2) |
| Teacher A accessing Teacher B's course | Route guard + BE ownership check |
| > 5 competencies per lesson | Warning (non-blocking) in response + UI |
