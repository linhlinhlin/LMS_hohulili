-- V78: Add partial index for efficient unread message counting
-- Replaces N+1 query pattern in GET /api/v3/messages/unread-count
-- Only indexes unread messages (is_read = false), keeping the index compact

CREATE INDEX IF NOT EXISTS idx_messages_unread_by_conv_sender
    ON messages(conversation_id, sender_id)
    WHERE is_read = false;
