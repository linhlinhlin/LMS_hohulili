-- V58: Fix enrollments table missing updated_at column
-- The trigger trg_enrollments_updated_at references NEW.updated_at but the column doesn't exist
-- This causes "record new has no field updated_at" on every enrollment UPDATE (student progress broken)

-- Add the missing column
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill: set updated_at = last_accessed_at (best available proxy)
UPDATE enrollments SET updated_at = COALESCE(last_accessed_at, completed_at, enrolled_at, NOW())
WHERE updated_at IS NULL OR updated_at = NOW();
