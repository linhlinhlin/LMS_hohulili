# Quick Fix for Flyway Migration Error

## Problem
```
Migration checksum mismatch for migration version 3
Detected applied migration not resolved locally: 1, 1.1, 2
```

## Solution 1: Repair Flyway (Recommended - Keeps Data)

```powershell
cd api
mvn flyway:repair
mvn -DskipTests spring-boot:run
```

## Solution 2: Clean Database (Nuclear - Deletes All Data)

```powershell
cd api
mvn flyway:clean
mvn -DskipTests spring-boot:run
```

## Solution 3: Disable Flyway Validation (Quick Test)

Edit `api/src/main/resources/application-dev.yml`:

```yaml
spring:
  flyway:
    validate-on-migrate: false
```

Then restart:
```powershell
cd api
mvn -DskipTests spring-boot:run
```

## What Happened?

Migration file `V3__add_course_review_fields.sql` was modified after being applied to database.

Flyway detected:
- Database checksum: 172247416
- Local file checksum: 495563232

## Recommended Action

**Use Solution 1 (Repair)** - This will:
- Mark missing migrations as deleted
- Update checksums to match current files
- Keep all your data

After repair, backend should start successfully!
