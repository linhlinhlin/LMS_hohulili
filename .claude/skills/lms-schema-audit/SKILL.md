---
name: lms-schema-audit
description: Deep audit PostgreSQL schemas for LMS applications, identify Entity-DB mismatches, optimize for SOTA patterns (Canvas, Moodle, Coursera), and guide migrations between Supabase/Neon/Local Docker. Use when debugging Hibernate startup failures, planning database migrations, or optimizing LMS schema design.
---

# LMS Schema Audit Skill

Comprehensive schema auditing for Learning Management System databases, with focus on Entity ↔ Database synchronization and SOTA LMS patterns.

## When to Use This Skill

- Debugging Hibernate `ddl-auto: validate` startup failures
- Auditing schema for type mismatches, missing indexes
- Planning migrations between Supabase, Neon, Local Docker
- Verifying LMS domain patterns (courses, enrollments, quizzes)
- Optimizing schema for performance

## Related Skills

- `postgresql` - PostgreSQL connections, configuration, roles
- `sql-optimization-patterns` - EXPLAIN analysis, indexing strategies, N+1 fixes

---

## Core Audit Workflow

### Step 1: Gather Schema Information

Collect from these sources:

| Source | Path Pattern |
|--------|--------------|
| Flyway Migrations | `api/src/main/resources/db/migration/V*.sql` |
| JPA Entities | `api/src/main/java/**/entity/*JpaEntity.java` |
| Schema Documentation | `schema_*.md` files |
| Spring Config | `application-*.yml` |

### Step 2: Type Consistency Check

Compare JPA Entity types with PostgreSQL column types:

| PostgreSQL | Java Type | Common Error |
|------------|-----------|--------------|
| `integer` | `Integer` | Using `BigDecimal` |
| `numeric` | `BigDecimal` | Using `Integer` |
| `jsonb` | `Map<>` + `@Type(JsonType.class)` | Missing `@Type` |
| `uuid` | `UUID` | Using `String` |
| `timestamptz` | `Instant` | Using `LocalDateTime` |

### Step 3: LMS Domain Pattern Verification

Check for SOTA patterns from Canvas, Moodle, Coursera:

- [ ] **Course Hierarchy**: `courses` → `chapters` → `lessons` → `sections`
- [ ] **Class-based Enrollment**: `learning_classes` + `enrollments` (not direct course enrollment)
- [ ] **Grading System**: `grade_configs` per class with weighted components
- [ ] **Quiz Structure**: Separate `questions`, `quiz_questions`, `quiz_attempts`
- [ ] **Rich Content**: JSONB `content_blocks` for EditorJS compatibility
- [ ] **File Attachments**: Polymorphic via `entity_type` + `entity_id`

### Step 4: Output Format

```
🔴 CRITICAL: [Issue causing startup failure]
   Table: xxx | Column: xxx
   DB Type: xxx | Entity Type: xxx
   Fix: [Specific migration or code change]

🟡 MEDIUM: [Performance/design issue]
   Table: xxx
   Issue: [Description]
   Recommendation: [Specific fix]

🟢 LOW: [Naming/style inconsistency]
```

---

## Migration Configurations

### Local Docker

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/lms
    username: lms
    password: lms
```

### Neon (Serverless)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://ep-xxx.aws.neon.tech/neondb?sslmode=require
    username: neondb_owner
    password: <password>
```

### Supabase (via Pooler)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
    username: postgres.projectid
    password: <password>
```

---

## Constraints

- **DO NOT** run ALTER TABLE without Flyway migration
- **DO NOT** use `ddl-auto: update` in production
- **ALWAYS** backup before migration: `pg_dump -Fc > backup.dump`
- **ALWAYS** use `CREATE INDEX CONCURRENTLY` in production
