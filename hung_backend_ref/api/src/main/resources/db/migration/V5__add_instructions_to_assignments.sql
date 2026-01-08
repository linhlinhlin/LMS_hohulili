-- Add instructions column to assignments table

ALTER TABLE assignments 
ADD COLUMN instructions TEXT;

-- Add comment for documentation
COMMENT ON COLUMN assignments.instructions IS 'Detailed instructions for the assignment';