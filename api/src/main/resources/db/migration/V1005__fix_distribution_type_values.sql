-- Migration V1005: Fix distribution_type values in assignment_allocations
-- Ensure all distribution_type values are valid enum values

-- Update any invalid or null distribution_type values to ALL_STUDENTS
UPDATE assignment_allocations 
SET distribution_type = 'ALL_STUDENTS' 
WHERE distribution_type IS NULL 
   OR distribution_type NOT IN ('ALL_STUDENTS', 'SPECIFIC_STUDENTS', 'CLASS');

-- Ensure distribution_type column is not null
ALTER TABLE assignment_allocations 
ALTER COLUMN distribution_type SET NOT NULL;

-- Add constraint to ensure only valid enum values
ALTER TABLE assignment_allocations 
ADD CONSTRAINT check_distribution_type 
CHECK (distribution_type IN ('ALL_STUDENTS', 'SPECIFIC_STUDENTS', 'CLASS'));
