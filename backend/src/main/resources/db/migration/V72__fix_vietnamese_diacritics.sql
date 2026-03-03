-- V72: Fix Vietnamese diacritics in course_categories and course_tags seed data
-- V70 inserted names without diacritics (ASCII only). This migration corrects them.

-- Subcategories under NAVIGATION
UPDATE course_categories SET name = 'Thiên văn hàng hải' WHERE code = 'NAV_CELESTIAL';
UPDATE course_categories SET name = 'Quy tắc tránh va'   WHERE code = 'NAV_COLREG';
UPDATE course_categories SET name = 'Luồng lạch & hoa tiêu' WHERE code = 'NAV_PILOTAGE';

-- Subcategories under ENGINEERING
UPDATE course_categories SET name = 'Diesel chính'       WHERE code = 'ENG_DIESEL';
UPDATE course_categories SET name = 'Hệ thống điện'      WHERE code = 'ENG_ELECTRIC';
UPDATE course_categories SET name = 'Hệ thống phụ'       WHERE code = 'ENG_AUX';

-- Subcategories under SAFETY
UPDATE course_categories SET name = 'STCW Cơ bản'        WHERE code = 'SAF_STCW';
UPDATE course_categories SET name = 'Chữa cháy'          WHERE code = 'SAF_FIRE';
UPDATE course_categories SET name = 'Ứng phó khẩn cấp'   WHERE code = 'SAF_EMERGENCY';

-- Subcategories under LOGISTICS
UPDATE course_categories SET name = 'Quản lý cảng'       WHERE code = 'LOG_PORT';
UPDATE course_categories SET name = 'Vận tải container'   WHERE code = 'LOG_CONTAINER';

-- Subcategories under LAW
UPDATE course_categories SET name = 'Luật biển quốc tế'  WHERE code = 'LAW_INTL';
UPDATE course_categories SET name = 'Luật hàng hải VN'   WHERE code = 'LAW_VN';

-- Tags
UPDATE course_tags SET name = 'Chứng chỉ'   WHERE slug = 'chung-chi';
UPDATE course_tags SET name = 'Thực hành'    WHERE slug = 'thuc-hanh';
UPDATE course_tags SET name = 'Lý thuyết'    WHERE slug = 'ly-thuyet';
UPDATE course_tags SET name = 'Nâng cao'     WHERE slug = 'nang-cao';
UPDATE course_tags SET name = 'Cơ bản'       WHERE slug = 'co-ban';
UPDATE course_tags SET name = 'Môi trường'   WHERE slug = 'moi-truong';
UPDATE course_tags SET name = 'Mô phỏng'     WHERE slug = 'mo-phong';
