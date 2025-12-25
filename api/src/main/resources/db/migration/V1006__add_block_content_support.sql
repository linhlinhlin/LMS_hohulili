-- Migration V1006: Add Block-based JSON Content Support
-- Adds structured content columns with schema versioning to support rich content

-- Add JSONB columns for structured content to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS structured_content JSONB,
ADD COLUMN IF NOT EXISTS schema_version VARCHAR(10) DEFAULT '1.0';

-- Add JSONB columns for structured content to question_options table  
ALTER TABLE question_options
ADD COLUMN IF NOT EXISTS structured_content JSONB,
ADD COLUMN IF NOT EXISTS schema_version VARCHAR(10) DEFAULT '1.0';

-- Add JSONB columns for structured content to sections table
ALTER TABLE sections
ADD COLUMN IF NOT EXISTS structured_content JSONB,
ADD COLUMN IF NOT EXISTS schema_version VARCHAR(10) DEFAULT '1.0';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_structured_content ON questions USING GIN (structured_content);
CREATE INDEX IF NOT EXISTS idx_question_options_structured_content ON question_options USING GIN (structured_content);
CREATE INDEX IF NOT EXISTS idx_sections_structured_content ON sections USING GIN (structured_content);

-- Create schema versioning table for migration tracking
CREATE TABLE IF NOT EXISTS content_schema_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    schema_version VARCHAR(10) NOT NULL,
    migrated_at TIMESTAMP DEFAULT NOW(),
    migration_status VARCHAR(20) DEFAULT 'pending'
);

-- Create migration status tracking table
CREATE TABLE IF NOT EXISTS content_migration_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    total_records INTEGER DEFAULT 0,
    migrated_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    migration_started_at TIMESTAMP DEFAULT NOW(),
    migration_completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'in_progress'
);

-- Create function to convert legacy content to blocks
CREATE OR REPLACE FUNCTION convert_legacy_content_to_blocks(
    legacy_content TEXT,
    record_id UUID,
    table_name_param VARCHAR
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
    block_id TEXT;
BEGIN
    -- Generate unique block ID based on record ID
    block_id := 'legacy-' || table_name_param || '-' || record_id::text;
    
    -- Convert plain text to single text block
    result := jsonb_build_object(
        'blocks', jsonb_build_array(
            jsonb_build_object(
                'id', block_id,
                'type', 'text',
                'schema_version', '1.0',
                'content', jsonb_build_object('text', legacy_content),
                'metadata', jsonb_build_object(
                    'created_at', NOW()::text,
                    'last_modified', NOW()::text,
                    'migrated_from', 'legacy'
                )
            )
        ),
        'schema_version', '1.0'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create migration function for questions table
CREATE OR REPLACE FUNCTION migrate_questions_to_blocks()
RETURNS TABLE(migrated_count INTEGER, failed_count INTEGER) AS $$
DECLARE
    questions_cursor CURSOR FOR 
        SELECT id, content 
        FROM questions 
        WHERE content IS NOT NULL 
        AND (structured_content IS NULL OR structured_content = 'null'::jsonb);
    
    question_record RECORD;
    migrated_count := 0;
    failed_count := 0;
    block_content JSONB;
BEGIN
    -- Update migration status
    INSERT INTO content_migration_status (table_name, total_records, status)
    SELECT 'questions', COUNT(*), 'in_progress'
    FROM questions 
    WHERE content IS NOT NULL 
    AND (structured_content IS NULL OR structured_content = 'null'::jsonb)
    ON CONFLICT DO NOTHING;
    
    -- Process each question
    FOR question_record IN questions_cursor LOOP
        BEGIN
            -- Convert legacy content to blocks
            block_content := convert_legacy_content_to_blocks(
                question_record.content, 
                question_record.id, 
                'question'
            );
            
            -- Update question with structured content
            UPDATE questions 
            SET structured_content = block_content,
                schema_version = '1.0'
            WHERE id = question_record.id;
            
            -- Track successful migration
            INSERT INTO content_schema_versions (table_name, record_id, schema_version, migration_status)
            VALUES ('questions', question_record.id, '1.0', 'completed');
            
            migrated_count := migrated_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Track failed migration
            INSERT INTO content_schema_versions (table_name, record_id, schema_version, migration_status)
            VALUES ('questions', question_record.id, '1.0', 'failed');
            
            failed_count := failed_count + 1;
        END;
    END LOOP;
    
    -- Update migration status
    UPDATE content_migration_status 
    SET migrated_records = migrated_count,
        failed_records = failed_count,
        migration_completed_at = NOW(),
        status = CASE 
            WHEN failed_count = 0 THEN 'completed'
            ELSE 'completed_with_errors'
        END
    WHERE table_name = 'questions';
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Create migration function for question_options table
CREATE OR REPLACE FUNCTION migrate_question_options_to_blocks()
RETURNS TABLE(migrated_count INTEGER, failed_count INTEGER) AS $$
DECLARE
    options_cursor CURSOR FOR 
        SELECT qo.id, qo.content 
        FROM question_options qo
        WHERE qo.content IS NOT NULL 
        AND (qo.structured_content IS NULL OR qo.structured_content = 'null'::jsonb);
    
    option_record RECORD;
    migrated_count := 0;
    failed_count := 0;
    block_content JSONB;
BEGIN
    -- Update migration status
    INSERT INTO content_migration_status (table_name, total_records, status)
    SELECT 'question_options', COUNT(*), 'in_progress'
    FROM question_options qo
    WHERE qo.content IS NOT NULL 
    AND (qo.structured_content IS NULL OR qo.structured_content = 'null'::jsonb)
    ON CONFLICT DO NOTHING;
    
    -- Process each option
    FOR option_record IN options_cursor LOOP
        BEGIN
            -- Convert legacy content to blocks
            block_content := convert_legacy_content_to_blocks(
                option_record.content, 
                option_record.id, 
                'option'
            );
            
            -- Update option with structured content
            UPDATE question_options 
            SET structured_content = block_content,
                schema_version = '1.0'
            WHERE id = option_record.id;
            
            -- Track successful migration
            INSERT INTO content_schema_versions (table_name, record_id, schema_version, migration_status)
            VALUES ('question_options', option_record.id, '1.0', 'completed');
            
            migrated_count := migrated_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Track failed migration
            INSERT INTO content_schema_versions (table_name, record_id, schema_version, migration_status)
            VALUES ('question_options', option_record.id, '1.0', 'failed');
            
            failed_count := failed_count + 1;
        END;
    END LOOP;
    
    -- Update migration status
    UPDATE content_migration_status 
    SET migrated_records = migrated_count,
        failed_records = failed_count,
        migration_completed_at = NOW(),
        status = CASE 
            WHEN failed_count = 0 THEN 'completed'
            ELSE 'completed_with_errors'
        END
    WHERE table_name = 'question_options';
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Create migration function for sections table
CREATE OR REPLACE FUNCTION migrate_sections_to_blocks()
RETURNS TABLE(migrated_count INTEGER, failed_count INTEGER) AS $$
DECLARE
    sections_cursor CURSOR FOR 
        SELECT s.id, s.content 
        FROM sections s
        WHERE s.content IS NOT NULL 
        AND (s.structured_content IS NULL OR s.structured_content = 'null'::jsonb);
    
    section_record RECORD;
    migrated_count := 0;
    failed_count := 0;
    block_content JSONB;
BEGIN
    -- Update migration status
    INSERT INTO content_migration_status (table_name, total_records, status)
    SELECT 'sections', COUNT(*), 'in_progress'
    FROM sections s
    WHERE s.content IS NOT NULL 
    AND (s.structured_content IS NULL OR s.structured_content = 'null'::jsonb)
    ON CONFLICT DO NOTHING;
    
    -- Process each section
    FOR section_record IN sections_cursor LOOP
        BEGIN
            -- Convert legacy content to blocks
            block_content := convert_legacy_content_to_blocks(
                section_record.content, 
                section_record.id, 
                'section'
            );
            
            -- Update section with structured content
            UPDATE sections 
            SET structured_content = block_content,
                schema_version = '1.0'
            WHERE id = section_record.id;
            
            -- Track successful migration
            INSERT INTO content_schema_versions (table_name, record_id, schema_version, migration_status)
            VALUES ('sections', section_record.id, '1.0', 'completed');
            
            migrated_count := migrated_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Track failed migration
            INSERT INTO content_schema_versions (table_name, record_id, schema_version, migration_status)
            VALUES ('sections', section_record.id, '1.0', 'failed');
            
            failed_count := failed_count + 1;
        END;
    END LOOP;
    
    -- Update migration status
    UPDATE content_migration_status 
    SET migrated_records = migrated_count,
        failed_records = failed_count,
        migration_completed_at = NOW(),
        status = CASE 
            WHEN failed_count = 0 THEN 'completed'
            ELSE 'completed_with_errors'
        END
    WHERE table_name = 'sections';
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Execute all migrations
-- Note: These will be called separately to track progress
-- SELECT * FROM migrate_questions_to_blocks();
-- SELECT * FROM migrate_question_options_to_blocks();  
-- SELECT * FROM migrate_sections_to_blocks();

-- Create view for migration status
CREATE OR REPLACE VIEW content_migration_progress AS
SELECT 
    table_name,
    total_records,
    migrated_records,
    failed_records,
    ROUND(
        CASE 
            WHEN total_records > 0 THEN (migrated_records::numeric / total_records::numeric) * 100
            ELSE 0 
        END, 2
    ) as progress_percentage,
    status,
    migration_started_at,
    migration_completed_at
FROM content_migration_status
ORDER BY migration_started_at DESC;

-- Add comments for documentation
COMMENT ON TABLE content_schema_versions IS 'Tracks schema version migrations for content blocks';
COMMENT ON TABLE content_migration_status IS 'Tracks overall migration progress by table';
COMMENT ON VIEW content_migration_progress IS 'Progress view for content block migrations';
COMMENT ON FUNCTION convert_legacy_content_to_blocks IS 'Converts legacy TEXT content to block-based JSON structure';
COMMENT ON FUNCTION migrate_questions_to_blocks IS 'Migrates questions table from legacy to block content';
COMMENT ON FUNCTION migrate_question_options_to_blocks IS 'Migrates question_options table from legacy to block content';
COMMENT ON FUNCTION migrate_sections_to_blocks IS 'Migrates sections table from legacy to block content';