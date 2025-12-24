-- Migration V1004: Drop legacy 'type' column from assignments table
-- This column is a leftover that is causing not-null constraint violations during assignment creation.
-- The actual assignment type is stored in the 'assignment_type' column.

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assignments' AND column_name='type') THEN
        -- Safely migrate any data if necessary (though assignment_type should already have it)
        -- UPDATE assignments SET assignment_type = COALESCE(assignment_type, type) WHERE type IS NOT NULL;
        
        -- Drop the column and its constraints
        ALTER TABLE assignments DROP COLUMN type CASCADE;
    END IF;
END $$;
