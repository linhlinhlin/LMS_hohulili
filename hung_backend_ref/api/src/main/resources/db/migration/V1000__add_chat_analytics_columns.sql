-- Migration: Add analytics columns to chat_messages
-- Date: 10/12/2025
-- Purpose: Support AI Service analytics metadata for learning pattern tracking

-- Add analytics columns to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS topics_accessed TEXT,
ADD COLUMN IF NOT EXISTS confidence_score DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS document_ids_used TEXT,
ADD COLUMN IF NOT EXISTS query_type VARCHAR(50);

-- Add index for analytics queries by query_type
CREATE INDEX IF NOT EXISTS idx_chat_message_query_type 
ON chat_messages(query_type);

-- Add comments for documentation
COMMENT ON COLUMN chat_messages.topics_accessed IS 'JSON array of topics accessed in this message, extracted from source titles';
COMMENT ON COLUMN chat_messages.confidence_score IS 'AI confidence score (0.5-1.0) based on source relevance';
COMMENT ON COLUMN chat_messages.document_ids_used IS 'JSON array of document IDs used for RAG retrieval';
COMMENT ON COLUMN chat_messages.query_type IS 'Query classification: factual, conceptual, or procedural';
