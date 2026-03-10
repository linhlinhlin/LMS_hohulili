-- V75: Align courses.category_id with the hierarchical course_categories table.
-- V70 introduced course_categories and preserved root UUIDs, but fresh databases still
-- retained the legacy FK from courses.category_id -> categories(id). That breaks course
-- creation for subcategories because only root category IDs exist in categories.

-- Null out any stray category references that do not exist in the source-of-truth table.
UPDATE courses c
SET category_id = NULL
WHERE category_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM course_categories cc
    WHERE cc.id = c.category_id
  );

ALTER TABLE courses DROP CONSTRAINT IF EXISTS fk_courses_category;

ALTER TABLE courses
    ADD CONSTRAINT fk_courses_category
    FOREIGN KEY (category_id)
    REFERENCES course_categories(id)
    ON DELETE SET NULL;
