ALTER TABLE sections DROP CONSTRAINT IF EXISTS sections_type_check;

ALTER TABLE sections
    ADD CONSTRAINT sections_type_check
    CHECK (type IN ('VIDEO', 'TEXT', 'QUIZ', 'FILE', 'ASSIGNMENT', 'SIMULATION'));
