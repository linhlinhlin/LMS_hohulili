-- Add description column to lessons table

ALTER TABLE lessons 
ADD COLUMN description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN lessons.description IS 'Detailed description of the lesson content';