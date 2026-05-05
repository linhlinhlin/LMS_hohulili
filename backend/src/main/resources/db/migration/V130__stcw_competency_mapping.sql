-- V130: STCW Competency Mapping
--
-- Creates 3 new tables to support Competency Mapping Matrix feature:
--   1. maritime_standards  — catalogue of international standards (STCW, SOLAS, COLREGs, MARPOL)
--   2. standard_competencies — individual competency items per standard
--   3. lesson_competency_mappings — many-to-many: lesson ↔ competency
--
-- Seed data: 4 standards + 10 STCW Manila 2010 sample competencies (dev/staging).
-- Full import (40+ items) is tracked as V131 backlog task.

-- ───────────────────────────────────────────────────────────────────────────────
-- 1. maritime_standards
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maritime_standards (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(20)  NOT NULL UNIQUE,  -- 'STCW', 'SOLAS', 'COLREGS', 'MARPOL'
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────────────────
-- 2. standard_competencies
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS standard_competencies (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_id    UUID         NOT NULL REFERENCES maritime_standards(id) ON DELETE CASCADE,
    code           VARCHAR(30)  NOT NULL,   -- 'A-II/1', 'Chapter V', 'Rule 8'
    title          VARCHAR(200) NOT NULL,
    description    TEXT,
    category       VARCHAR(100),            -- 'Deck', 'Engine', 'Safety'
    display_order  INT          NOT NULL DEFAULT 0,
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (standard_id, code)
);

-- ───────────────────────────────────────────────────────────────────────────────
-- 3. lesson_competency_mappings
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_competency_mappings (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id     UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    competency_id UUID        NOT NULL REFERENCES standard_competencies(id) ON DELETE CASCADE,
    mapped_by     UUID        REFERENCES users(id) ON DELETE SET NULL,
    mapped_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note          TEXT,
    UNIQUE (lesson_id, competency_id)
);

-- ───────────────────────────────────────────────────────────────────────────────
-- 4. Indexes
-- ───────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mapping_lesson
    ON lesson_competency_mappings(lesson_id);

CREATE INDEX IF NOT EXISTS idx_mapping_competency
    ON lesson_competency_mappings(competency_id);

CREATE INDEX IF NOT EXISTS idx_competency_standard
    ON standard_competencies(standard_id);

-- Partial index for UI filter by category (only active competencies queried)
CREATE INDEX IF NOT EXISTS idx_competency_category
    ON standard_competencies(category)
    WHERE is_active = TRUE;

-- ───────────────────────────────────────────────────────────────────────────────
-- 5. Seed data — maritime standards
-- ───────────────────────────────────────────────────────────────────────────────
INSERT INTO maritime_standards (code, name, description) VALUES
('STCW',    'Standards of Training, Certification and Watchkeeping',
            'International convention for the standards of training, certification and watchkeeping for seafarers (Manila Amendments 2010)'),
('SOLAS',   'Safety of Life at Sea',
            'International Convention for the Safety of Life at Sea'),
('COLREGS', 'Collision Regulations',
            'Convention on the International Regulations for Preventing Collisions at Sea'),
('MARPOL',  'Marine Pollution Prevention',
            'International Convention for the Prevention of Pollution from Ships')
ON CONFLICT (code) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────────
-- 6. Seed data — STCW Manila 2010 sample competencies (10 items)
--    Full import (40+ items) → V131 backlog
-- ───────────────────────────────────────────────────────────────────────────────
INSERT INTO standard_competencies (standard_id, code, title, category, display_order)
SELECT s.id, c.code, c.title, c.category, c.display_order
FROM maritime_standards s
JOIN (VALUES
    ('A-II/1',  'Navigational watch at operational level',          'Deck',   10),
    ('A-II/2',  'Navigational watch at management level',           'Deck',   20),
    ('A-II/3',  'Watch officer on vessels less than 500 GT',        'Deck',   30),
    ('A-II/4',  'Rating forming part of navigational watch',        'Deck',   40),
    ('A-II/5',  'Rating as able seafarer deck',                     'Deck',   50),
    ('A-III/1', 'Engineering watch at operational level',           'Engine', 60),
    ('A-III/2', 'Engineering watch at management level',            'Engine', 70),
    ('A-VI/1',  'Basic safety training',                            'Safety', 80),
    ('A-VI/2',  'Survival craft and rescue boats',                  'Safety', 90),
    ('A-VI/3',  'Advanced fire fighting',                           'Safety', 100)
) AS c(code, title, category, display_order) ON TRUE
WHERE s.code = 'STCW'
ON CONFLICT (standard_id, code) DO NOTHING;
