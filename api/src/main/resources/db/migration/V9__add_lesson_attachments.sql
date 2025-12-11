-- Migration V9: Add lesson attachments table for file attachments support
-- Similar to Udemy/Coursera approach where lessons can have multiple file attachments

CREATE TABLE lesson_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'document', 'presentation', 'spreadsheet', 'video', 'audio', 'other'
    display_order INTEGER NOT NULL DEFAULT 0,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_lesson_attachments_lesson_id ON lesson_attachments(lesson_id);
CREATE INDEX idx_lesson_attachments_file_type ON lesson_attachments(file_type);
CREATE INDEX idx_lesson_attachments_uploaded_at ON lesson_attachments(uploaded_at);

-- Add comment
COMMENT ON TABLE lesson_attachments IS 'File attachments for lessons - supports PDF, DOC, PPT, XLS, video, audio files like Udemy/Coursera';
COMMENT ON COLUMN lesson_attachments.file_type IS 'Type of file: document, presentation, spreadsheet, video, audio, other';
COMMENT ON COLUMN lesson_attachments.display_order IS 'Order to display attachments in lesson view';