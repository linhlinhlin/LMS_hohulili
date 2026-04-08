-- V109: Message recall (Messenger "Unsend" pattern)
-- Soft-delete: content replaced with null, recalled=true

ALTER TABLE messages ADD COLUMN IF NOT EXISTS recalled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recalled_at TIMESTAMPTZ;

-- Allow content to be null when message is recalled
ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;
