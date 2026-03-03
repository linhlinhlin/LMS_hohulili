-- V70: Course Categories (2-level hierarchy) + Tags system
-- Replaces flat 'categories' table with hierarchical course_categories + tags

-- 1. course_categories: 2-level hierarchy (parent_id=NULL for root)
CREATE TABLE IF NOT EXISTS course_categories (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id   UUID            REFERENCES course_categories(id) ON DELETE CASCADE,
    code        VARCHAR(50)     NOT NULL,
    name        VARCHAR(255)    NOT NULL,
    slug        VARCHAR(100)    NOT NULL,
    prefix      VARCHAR(10),
    description TEXT,
    icon        VARCHAR(50),
    sort_order  INT             NOT NULL DEFAULT 0,
    is_active   BOOLEAN         NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ,

    CONSTRAINT uq_course_categories_code UNIQUE (code),
    CONSTRAINT uq_course_categories_slug UNIQUE (slug)
);

-- Prefix uniqueness: only non-null values must be unique (subcategories have NULL prefix)
CREATE UNIQUE INDEX uq_course_categories_prefix ON course_categories (prefix) WHERE prefix IS NOT NULL;

CREATE INDEX idx_course_categories_parent ON course_categories(parent_id);
CREATE INDEX idx_course_categories_active ON course_categories(is_active);

COMMENT ON TABLE course_categories IS '2-level course taxonomy. parent_id=NULL → root category, non-null → subcategory. Max 2 levels enforced in application.';

-- 2. Rename legacy course_tags element collection (if exists) before creating new table
ALTER TABLE IF EXISTS course_tags RENAME TO course_tags_legacy;
ALTER INDEX IF EXISTS pk_course_tags RENAME TO pk_course_tags_legacy;
ALTER TABLE IF EXISTS course_tags_legacy DROP CONSTRAINT IF EXISTS fk_course_tags_course;

-- course_tags: flat controlled vocabulary (new structure with UUID PK)
CREATE TABLE IF NOT EXISTS course_tags (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100)    NOT NULL,
    slug        VARCHAR(100)    NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_course_tags_name UNIQUE (name),
    CONSTRAINT uq_course_tags_slug UNIQUE (slug)
);

COMMENT ON TABLE course_tags IS 'Controlled vocabulary tags for courses. Admin-managed only. Max 5 tags per course.';

-- 3. course_tag_assignments: many-to-many (course <-> tags)
CREATE TABLE IF NOT EXISTS course_tag_assignments (
    course_id   UUID            NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    tag_id      UUID            NOT NULL REFERENCES course_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, tag_id)
);

CREATE INDEX idx_course_tag_assignments_tag ON course_tag_assignments(tag_id);

COMMENT ON TABLE course_tag_assignments IS 'Many-to-many: courses <-> tags.';

-- 4. Migrate existing 5 categories -> root categories (preserve UUIDs for FK compat)
INSERT INTO course_categories (id, parent_id, code, name, slug, prefix, sort_order, is_active)
SELECT id, NULL, code, name, LOWER(code), prefix,
       ROW_NUMBER() OVER (ORDER BY code)::int, true
FROM categories
ON CONFLICT (code) DO NOTHING;

-- 5. Seed subcategories under each root
-- NAVIGATION subcategories
INSERT INTO course_categories (parent_id, code, name, slug, sort_order) VALUES
((SELECT id FROM course_categories WHERE code = 'NAVIGATION'), 'NAV_RADAR',     'Radar & ECDIS',        'radar-ecdis',          1),
((SELECT id FROM course_categories WHERE code = 'NAVIGATION'), 'NAV_CELESTIAL', 'Thien van hang hai',   'thien-van-hang-hai',   2),
((SELECT id FROM course_categories WHERE code = 'NAVIGATION'), 'NAV_COLREG',    'Quy tac tranh va',     'quy-tac-tranh-va',     3),
((SELECT id FROM course_categories WHERE code = 'NAVIGATION'), 'NAV_PILOTAGE',  'Luong lach & hoa tieu','luong-lach-hoa-tieu',  4);

-- ENGINEERING subcategories
INSERT INTO course_categories (parent_id, code, name, slug, sort_order) VALUES
((SELECT id FROM course_categories WHERE code = 'ENGINEERING'), 'ENG_DIESEL',    'Diesel chinh',         'diesel-chinh',         1),
((SELECT id FROM course_categories WHERE code = 'ENGINEERING'), 'ENG_ELECTRIC',  'He thong dien',        'he-thong-dien',        2),
((SELECT id FROM course_categories WHERE code = 'ENGINEERING'), 'ENG_AUX',       'He thong phu',         'he-thong-phu',         3);

-- SAFETY subcategories
INSERT INTO course_categories (parent_id, code, name, slug, sort_order) VALUES
((SELECT id FROM course_categories WHERE code = 'SAFETY'), 'SAF_STCW',      'STCW Co ban',          'stcw-co-ban',          1),
((SELECT id FROM course_categories WHERE code = 'SAFETY'), 'SAF_FIRE',      'Chua chay',            'chua-chay',            2),
((SELECT id FROM course_categories WHERE code = 'SAFETY'), 'SAF_EMERGENCY', 'Ung pho khan cap',     'ung-pho-khan-cap',     3);

-- LOGISTICS subcategories
INSERT INTO course_categories (parent_id, code, name, slug, sort_order) VALUES
((SELECT id FROM course_categories WHERE code = 'LOGISTICS'), 'LOG_PORT',      'Quan ly cang',         'quan-ly-cang',         1),
((SELECT id FROM course_categories WHERE code = 'LOGISTICS'), 'LOG_CONTAINER', 'Van tai container',    'van-tai-container',    2);

-- LAW subcategories
INSERT INTO course_categories (parent_id, code, name, slug, sort_order) VALUES
((SELECT id FROM course_categories WHERE code = 'LAW'), 'LAW_INTL',      'Luat bien quoc te',    'luat-bien-quoc-te',    1),
((SELECT id FROM course_categories WHERE code = 'LAW'), 'LAW_VN',        'Luat hang hai VN',     'luat-hang-hai-vn',     2);

-- 6. Seed some initial tags
INSERT INTO course_tags (name, slug) VALUES
('STCW',           'stcw'),
('IMO',            'imo'),
('Chung chi',      'chung-chi'),
('Thuc hanh',      'thuc-hanh'),
('Ly thuyet',      'ly-thuyet'),
('Nang cao',       'nang-cao'),
('Co ban',         'co-ban'),
('An ninh',        'an-ninh'),
('Moi truong',     'moi-truong'),
('Mo phong',       'mo-phong')
ON CONFLICT (name) DO NOTHING;

-- 7. Point courses to new table (preserve existing category links)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS new_category_id UUID REFERENCES course_categories(id) ON DELETE SET NULL;
UPDATE courses SET new_category_id = category_id WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_courses_new_category ON courses(new_category_id);
