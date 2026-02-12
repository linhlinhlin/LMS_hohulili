-- V30: Add missing indexes for communication, AI chat, assignment allocation, and file attachment tables
-- These indexes cover FK columns and common query patterns not covered by V27

-- ============================================================
-- Communication module
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_conversations_participant1_id ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2_id ON conversations(participant2_id);

-- ============================================================
-- AI Chat module
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_context_type ON chat_sessions(context_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- ============================================================
-- Assignment Allocation
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_assignment_allocations_assignment_id ON assignment_allocations(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_allocations_class_id ON assignment_allocations(class_id);
CREATE INDEX IF NOT EXISTS idx_allocation_students_allocation_id ON assignment_allocation_students(allocation_id);
CREATE INDEX IF NOT EXISTS idx_allocation_students_student_id ON assignment_allocation_students(student_id);

-- ============================================================
-- File Attachments (composite + FK)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_file_attachments_entity_type_id ON file_attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);

-- ============================================================
-- Categories (lookup by code)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_categories_code ON categories(code);
