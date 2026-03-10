-- V32: Auto-generate course code from category prefix
-- Adds prefix column to categories table for auto-generating course codes like NAV-001, SAF-002

-- 1. Add prefix column
ALTER TABLE categories ADD COLUMN IF NOT EXISTS prefix VARCHAR(10);

-- 2. Set prefix values for existing categories
UPDATE categories SET prefix = 'NAV' WHERE code = 'NAVIGATION' AND prefix IS NULL;
UPDATE categories SET prefix = 'ENG' WHERE code = 'ENGINEERING' AND prefix IS NULL;
UPDATE categories SET prefix = 'SAF' WHERE code = 'SAFETY' AND prefix IS NULL;
UPDATE categories SET prefix = 'LOG' WHERE code = 'LOGISTICS' AND prefix IS NULL;
UPDATE categories SET prefix = 'LAW' WHERE code = 'LAW' AND prefix IS NULL;

-- 3. Make prefix NOT NULL and UNIQUE
ALTER TABLE categories ALTER COLUMN prefix SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_categories_prefix'
    ) THEN
        ALTER TABLE categories ADD CONSTRAINT uq_categories_prefix UNIQUE (prefix);
    END IF;
END $$;
