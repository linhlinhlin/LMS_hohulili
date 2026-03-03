-- V73: Drop orphaned new_category_id column from courses table
-- V70 created new_category_id with FK to course_categories, but JPA entity maps category_id.
-- category_id works correctly (no FK constraint, validated in application layer).
-- new_category_id is always NULL for post-V70 course saves and adds no value.

DROP INDEX IF EXISTS idx_courses_new_category;
ALTER TABLE courses DROP COLUMN IF EXISTS new_category_id;
