-- Add assignment type and configuration support
-- This migration enhances the assignments table to support multiple assignment types like Coursera

-- Add new columns to assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(50) DEFAULT 'file_submission';
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS assignment_config JSONB;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assignments_type ON assignments(assignment_type);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

-- Update existing assignments to have default type
UPDATE assignments SET assignment_type = 'file_submission' WHERE assignment_type IS NULL;

-- Create assignment_attachments table for multiple file support
CREATE TABLE IF NOT EXISTS assignment_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL,
    file_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    upload_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_assignment_attachments_assignment 
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

-- Create indexes for assignment attachments
CREATE INDEX IF NOT EXISTS idx_assignment_attachments_assignment_id ON assignment_attachments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_attachments_order ON assignment_attachments(assignment_id, upload_order);

-- Create assignment_rubrics table for grading criteria
CREATE TABLE IF NOT EXISTS assignment_rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL,
    criteria_name VARCHAR(255) NOT NULL,
    description TEXT,
    max_points DECIMAL(5,2) NOT NULL,
    weight DECIMAL(3,2) DEFAULT 1.00, -- Percentage weight (0-1)
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_assignment_rubrics_assignment 
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

-- Create indexes for rubrics
CREATE INDEX IF NOT EXISTS idx_assignment_rubrics_assignment_id ON assignment_rubrics(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_rubrics_order ON assignment_rubrics(assignment_id, order_index);

-- Add submission attempts tracking
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS submission_metadata JSONB; -- For storing type-specific data

-- Create index for attempts
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_attempt ON assignment_submissions(assignment_id, student_id, attempt_number);

-- Add comments to document the enhanced schema
COMMENT ON COLUMN assignments.assignment_type IS 'Type of assignment: essay, quiz, programming, project, file_submission';
COMMENT ON COLUMN assignments.assignment_config IS 'JSON configuration specific to assignment type (timeLimit, maxAttempts, etc.)';
COMMENT ON COLUMN assignments.status IS 'Assignment status: draft, published, closed';
COMMENT ON TABLE assignment_attachments IS 'Multiple file attachments for assignments (like Coursera)';
COMMENT ON TABLE assignment_rubrics IS 'Grading rubrics with multiple criteria and weights';
COMMENT ON COLUMN assignment_submissions.attempt_number IS 'Track multiple submission attempts';
COMMENT ON COLUMN assignment_submissions.submission_metadata IS 'Type-specific submission data (quiz answers, code results, etc.)';