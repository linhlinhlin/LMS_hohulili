-- V33: Seed categories table with maritime course categories
-- These categories are required for auto-generating course codes

INSERT INTO categories (id, code, name, prefix) VALUES
    (gen_random_uuid(), 'NAVIGATION',   'Hàng hải - Điều khiển tàu biển', 'NAV'),
    (gen_random_uuid(), 'ENGINEERING',  'Kỹ thuật máy tàu biển',          'ENG'),
    (gen_random_uuid(), 'SAFETY',       'An toàn hàng hải',               'SAF'),
    (gen_random_uuid(), 'LOGISTICS',    'Logistics và vận tải biển',      'LOG'),
    (gen_random_uuid(), 'LAW',          'Luật hàng hải',                  'LAW')
ON CONFLICT (code) DO NOTHING;
