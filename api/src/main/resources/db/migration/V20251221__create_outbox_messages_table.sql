-- Transactional Outbox Pattern - Outbox Messages Table
-- Created: 2025-12-21
-- Purpose: Store domain events for reliable asynchronous publishing to Kafka
--
-- Reference: https://microservices.io/patterns/data/transactional-outbox.html

CREATE TABLE IF NOT EXISTS outbox_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Aggregate information
    aggregate_type VARCHAR(255) NOT NULL,
    aggregate_id UUID NOT NULL,
    
    -- Event information
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    
    -- Processing status
    status VARCHAR(20) DEFAULT 'PENDING',
    attempts INT DEFAULT 0,
    next_attempt_at TIMESTAMP,
    last_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- Index for efficient polling of pending messages
CREATE INDEX IF NOT EXISTS idx_outbox_status 
ON outbox_messages(status, next_attempt_at);

-- Index for finding messages by aggregate
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate 
ON outbox_messages(aggregate_type, aggregate_id);

-- Index for cleanup of old processed messages
CREATE INDEX IF NOT EXISTS idx_outbox_processed_at 
ON outbox_messages(processed_at) 
WHERE status = 'SENT';

COMMENT ON TABLE outbox_messages IS 'Transactional Outbox for reliable event publishing';
COMMENT ON COLUMN outbox_messages.aggregate_type IS 'Type of the aggregate (e.g., Course, User)';
COMMENT ON COLUMN outbox_messages.aggregate_id IS 'ID of the aggregate root';
COMMENT ON COLUMN outbox_messages.event_type IS 'Type of domain event (e.g., CourseCreated)';
COMMENT ON COLUMN outbox_messages.payload IS 'JSON serialized event payload';
COMMENT ON COLUMN outbox_messages.status IS 'PENDING, PROCESSING, SENT, FAILED, DLQ';
COMMENT ON COLUMN outbox_messages.attempts IS 'Number of publishing attempts';
COMMENT ON COLUMN outbox_messages.next_attempt_at IS 'Scheduled time for next retry';
