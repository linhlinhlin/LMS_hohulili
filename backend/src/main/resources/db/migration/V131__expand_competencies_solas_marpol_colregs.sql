-- V131: Expand Maritime Competency Mapping — STCW full set + SOLAS + MARPOL + COLREGS + demo mappings
--
-- Builds on V130 (which seeded 10 STCW items and the 4 standard rows).
-- This migration:
--   1. Expands STCW to full set (Manila 2010 amendments) — 17 additional codes
--   2. Seeds SOLAS chapters (9 items) with safety/navigation categories
--   3. Seeds MARPOL annexes (6 items) — Pollution prevention
--   4. Seeds COLREGS rules (13 items) — Collision prevention
--   5. Adds demo lesson_competency_mappings for NAV-101 and SAF-101 (idempotent)

-- ───────────────────────────────────────────────────────────────────────────────
-- 1. STCW — additional competency codes (Manila 2010)
-- ───────────────────────────────────────────────────────────────────────────────
INSERT INTO standard_competencies (standard_id, code, title, category, display_order)
SELECT s.id, c.code, c.title, c.category, c.display_order
FROM maritime_standards s
JOIN (VALUES
    ('A-III/3',  'Electro-technical officer',                                    'Engine',          75),
    ('A-III/4',  'Rating forming part of engineering watch',                     'Engine',          82),
    ('A-III/5',  'Rating as able seafarer engine',                               'Engine',          86),
    ('A-IV/2',   'GMDSS radio operator',                                         'Radio',           90),
    ('A-V/1-1',  'Basic training for oil and chemical tanker cargo operations',  'Tanker',         100),
    ('A-V/1-2',  'Basic training for chemical tanker cargo operations',           'Chemical Tanker',110),
    ('A-V/1-3',  'Basic training for liquefied gas tanker cargo operations',     'Gas Tanker',     120),
    ('A-VI/1-1', 'Personal survival techniques (PST)',                           'Safety',         130),
    ('A-VI/1-2', 'Fire prevention and fire fighting',                            'Fire Safety',    140),
    ('A-VI/1-3', 'Elementary first aid',                                         'Safety',         150),
    ('A-VI/1-4', 'Personal safety and social responsibilities',                  'Safety',         160),
    ('A-VI/2-1', 'Survival craft and rescue boats',                              'Life-Saving',    170),
    ('A-VI/2-2', 'Fast rescue boats',                                            'Life-Saving',    180),
    ('A-VI/4-1', 'Medical first aid on board ship',                              'Safety',         190),
    ('A-VI/4-2', 'Medical care on board ship',                                   'Safety',         200),
    ('A-VI/6-1', 'Security awareness (ISPS)',                                    'Security',       210),
    ('A-VI/6-2', 'Designated security duties — Ship Security Officer (SSO)',     'Security',       220)
) AS c(code, title, category, display_order) ON TRUE
WHERE s.code = 'STCW'
ON CONFLICT (standard_id, code) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────────
-- 2. SOLAS — major chapters for maritime training curricula
-- ───────────────────────────────────────────────────────────────────────────────
INSERT INTO standard_competencies (standard_id, code, title, category, display_order)
SELECT s.id, c.code, c.title, c.category, c.display_order
FROM maritime_standards s
JOIN (VALUES
    ('Chapter II-1',  'Construction — Subdivision, stability and machinery',        'Navigation',        10),
    ('Chapter II-2',  'Fire protection, detection and extinction',                   'Fire Safety',       20),
    ('Chapter III',   'Life-saving appliances and arrangements',                     'Life-Saving',       30),
    ('Chapter IV',    'Radio communications (GMDSS)',                                'Radio',             40),
    ('Chapter V',     'Safety of navigation',                                        'Navigation',        50),
    ('Chapter VI',    'Carriage of cargoes and oil fuels',                           'Cargo',             60),
    ('Chapter VII',   'Carriage of dangerous goods',                                 'Dangerous Goods',   70),
    ('Chapter IX',    'Management for the safe operation of ships (ISM Code)',       'General',           80),
    ('Chapter XI-2',  'Special measures to enhance maritime security (ISPS Code)',   'Security',          90)
) AS c(code, title, category, display_order) ON TRUE
WHERE s.code = 'SOLAS'
ON CONFLICT (standard_id, code) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────────
-- 3. MARPOL — pollution-prevention annexes
-- ───────────────────────────────────────────────────────────────────────────────
INSERT INTO standard_competencies (standard_id, code, title, category, display_order)
SELECT s.id, c.code, c.title, c.category, c.display_order
FROM maritime_standards s
JOIN (VALUES
    ('Annex I',   'Prevention of pollution by oil',                            'Pollution', 10),
    ('Annex II',  'Control of pollution by noxious liquid substances in bulk', 'Pollution', 20),
    ('Annex III', 'Prevention of pollution by harmful substances (packaged)',   'Pollution', 30),
    ('Annex IV',  'Prevention of pollution by sewage from ships',               'Pollution', 40),
    ('Annex V',   'Prevention of pollution by garbage from ships',              'Pollution', 50),
    ('Annex VI',  'Prevention of air pollution from ships',                     'Pollution', 60)
) AS c(code, title, category, display_order) ON TRUE
WHERE s.code = 'MARPOL'
ON CONFLICT (standard_id, code) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────────
-- 4. COLREGS — collision-prevention rules and parts
-- ───────────────────────────────────────────────────────────────────────────────
INSERT INTO standard_competencies (standard_id, code, title, category, display_order)
SELECT s.id, c.code, c.title, c.category, c.display_order
FROM maritime_standards s
JOIN (VALUES
    ('Rule 5',   'Look-out',                                               'Navigation Rules',     10),
    ('Rule 6',   'Safe speed',                                             'Navigation Rules',     20),
    ('Rule 7',   'Risk of collision',                                      'Navigation Rules',     30),
    ('Rule 8',   'Action to avoid collision',                              'Navigation Rules',     40),
    ('Rule 10',  'Traffic separation schemes',                             'Navigation Rules',     50),
    ('Rule 13',  'Overtaking',                                             'Navigation Rules',     60),
    ('Rule 14',  'Head-on situation',                                      'Navigation Rules',     70),
    ('Rule 15',  'Crossing situation',                                     'Navigation Rules',     80),
    ('Rule 16',  'Action by give-way vessel',                              'Navigation Rules',     90),
    ('Rule 17',  'Action by stand-on vessel',                              'Navigation Rules',    100),
    ('Rule 19',  'Conduct of vessels in restricted visibility',            'Navigation Rules',    110),
    ('Part C',   'Lights and shapes (Rules 20–31)',                        'Lights and Shapes',   120),
    ('Part D',   'Sound and light signals (Rules 32–37)',                  'Sound and Light Signals', 130)
) AS c(code, title, category, display_order) ON TRUE
WHERE s.code = 'COLREGS'
ON CONFLICT (standard_id, code) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────────
-- 5. Demo lesson_competency_mappings — chapter-title based
--
-- Why chapter-title over lesson-title:
--   • Lesson titles in V54 seed are diacritic-free ("Cuu sinh" not "Cứu sinh"),
--     so lesson-title ILIKE patterns with diacritics never match.
--   • Chapter titles in V54 seed DO carry full diacritics, so matching by
--     chapter title is reliable and includes ALL lessons within (quizzes,
--     practicals, theory) — the right granularity for STCW competency mapping.
--
-- Single INSERT with a VALUES lookup table covers all chapter→competency pairs.
-- Idempotent: ON CONFLICT DO NOTHING. No-op rows for absent chapters/competencies.
-- ───────────────────────────────────────────────────────────────────────────────
INSERT INTO lesson_competency_mappings (lesson_id, competency_id)
SELECT DISTINCT l.id, sc.id
FROM lessons l
JOIN chapters ch ON l.chapter_id = ch.id
JOIN courses co ON ch.course_id = co.id
JOIN (VALUES
    -- SAF-101 (Basic Safety Training)
    ('SAF-101', '%Kỹ năng Sống còn%',                'STCW',    'A-VI/1-1'),
    ('SAF-101', '%Kỹ năng Sống còn%',                'SOLAS',   'Chapter III'),
    ('SAF-101', '%Phòng cháy và Chữa cháy%',         'STCW',    'A-VI/1-2'),
    ('SAF-101', '%Phòng cháy và Chữa cháy%',         'SOLAS',   'Chapter II-2'),
    ('SAF-101', '%Sơ cứu Y tế%',                     'STCW',    'A-VI/1-3'),
    ('SAF-101', '%An toàn Cá nhân%',                 'STCW',    'A-VI/1-4'),
    ('SAF-101', '%Thực hành An toàn%',               'STCW',    'A-VI/2-1'),
    ('SAF-101', '%Thực hành An toàn%',               'SOLAS',   'Chapter III'),
    ('SAF-101', '%Kiểm soát Đám đông%',              'STCW',    'A-VI/1-4'),
    ('SAF-101', '%Phòng chống Ô nhiễm%',             'MARPOL',  'Annex I'),
    ('SAF-101', '%Phòng chống Ô nhiễm%',             'MARPOL',  'Annex V'),
    ('SAF-101', '%Thi cuối khóa An toàn%',           'STCW',    'A-VI/1-1'),
    ('SAF-101', '%Thi cuối khóa An toàn%',           'STCW',    'A-VI/1-2'),
    ('SAF-101', '%Thi cuối khóa An toàn%',           'STCW',    'A-VI/1-3'),
    ('SAF-101', '%Thi cuối khóa An toàn%',           'STCW',    'A-VI/1-4'),
    -- NAV-101 (Terrestrial Navigation)
    ('NAV-101', '%Hàng hải Địa văn%',                'STCW',    'A-II/1'),
    ('NAV-101', '%La bàn%',                          'STCW',    'A-II/1'),
    ('NAV-101', '%Xác định Phương hướng%',           'STCW',    'A-II/1'),
    ('NAV-101', '%Phương pháp Xác định Vị trí%',     'STCW',    'A-II/1'),
    ('NAV-101', '%Hải đồ và Kế hoạch%',              'STCW',    'A-II/1'),
    ('NAV-101', '%Hải đồ và Kế hoạch%',              'SOLAS',   'Chapter V'),
    ('NAV-101', '%Thủy triều và Dòng chảy%',         'STCW',    'A-II/1'),
    ('NAV-101', '%Thi cuối khóa%',                   'STCW',    'A-II/1'),
    ('NAV-101', '%Thi cuối khóa%',                   'SOLAS',   'Chapter V'),
    ('NAV-101', '%Thi cuối khóa%',                   'COLREGS', 'Rule 8')
) AS m(course_code, chapter_pattern, std_code, comp_code)
  ON co.code = m.course_code AND ch.title ILIKE m.chapter_pattern
JOIN maritime_standards ms ON ms.code = m.std_code
JOIN standard_competencies sc ON sc.standard_id = ms.id AND sc.code = m.comp_code
ON CONFLICT (lesson_id, competency_id) DO NOTHING;
