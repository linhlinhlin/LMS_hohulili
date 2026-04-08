-- V110: Allow message content to be null (for recalled messages)
ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;
