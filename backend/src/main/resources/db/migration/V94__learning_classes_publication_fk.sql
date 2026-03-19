DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'learning_classes'
          AND constraint_name = 'fk_learning_classes_version'
    ) THEN
        ALTER TABLE learning_classes
            DROP CONSTRAINT fk_learning_classes_version;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'learning_classes'
          AND constraint_name = 'fk_learning_classes_version'
    ) THEN
        ALTER TABLE learning_classes
            ADD CONSTRAINT fk_learning_classes_version
            FOREIGN KEY (course_version_id)
            REFERENCES course_publications(id)
            ON DELETE SET NULL;
    END IF;
END $$;
