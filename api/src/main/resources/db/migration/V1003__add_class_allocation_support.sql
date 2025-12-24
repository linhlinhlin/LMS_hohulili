-- Migration V1003: Add class allocation support to assignments
-- Add class_id to assignment_allocations to support assigning to specific classes
ALTER TABLE assignment_allocations ADD COLUMN class_id UUID;
ALTER TABLE assignment_allocations ADD CONSTRAINT fk_allocation_class FOREIGN KEY (class_id) REFERENCES learning_classes(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_assignment_allocations_class_id ON assignment_allocations(class_id);

-- Update comment for distribution_type
COMMENT ON COLUMN assignment_allocations.distribution_type IS 'Type of distribution: ALL_STUDENTS, SPECIFIC_STUDENTS, CLASS';
