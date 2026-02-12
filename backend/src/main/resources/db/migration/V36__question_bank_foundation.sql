-- V36: QuestionBank Foundation
-- Evolve existing 'packages' table + add hierarchical categories

-- 1. Evolve packages table (add columns, keep existing data)
ALTER TABLE packages ADD COLUMN IF NOT EXISTS bank_type VARCHAR(20) DEFAULT 'PERSONAL';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 0;

-- 2. Hierarchical categories (self-referencing parent_id - Moodle pattern)
CREATE TABLE IF NOT EXISTS question_bank_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES question_bank_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    question_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- 3. Add category_id to questions (nullable, backward compatible)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS category_id UUID;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_qbc_bank_id ON question_bank_categories(bank_id);
CREATE INDEX IF NOT EXISTS idx_qbc_parent_id ON question_bank_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_packages_bank_type ON packages(bank_type);
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_owner_id ON packages(owner_id);

-- 5. FK for questions.category_id (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_questions_category'
    ) THEN
        ALTER TABLE questions ADD CONSTRAINT fk_questions_category
            FOREIGN KEY (category_id) REFERENCES question_bank_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Sync question_count on packages from existing data
UPDATE packages p SET question_count = (
    SELECT COUNT(*) FROM questions q WHERE q.package_id = p.id
) WHERE p.question_count = 0 OR p.question_count IS NULL;
