-- V55: Seed assessment data, enrollments, and interactions
-- Vietnamese Maritime Education — Session 89
-- Depends on V54 (users, courses, chapters, lessons)

-- Helper for question content blocks
CREATE OR REPLACE FUNCTION _qc(p_html TEXT) RETURNS JSONB AS $fn$
SELECT jsonb_build_array(jsonb_build_object(
  'id', gen_random_uuid()::text, 'type', 'text',
  'data', jsonb_build_object('content', p_html)
));
$fn$ LANGUAGE sql;

-- Temporary defaults for seed data (tables created by JPA without defaults)
ALTER TABLE learning_classes ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE enrollments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE packages ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE questions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE questions ALTER COLUMN usage_count SET DEFAULT 0;
ALTER TABLE question_options ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE quizzes ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE quiz_questions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE assignments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE assignments ALTER COLUMN created_at SET DEFAULT NOW();

DO $$ DECLARE
  -- Teacher IDs
  v_t1 UUID; v_t2 UUID; v_t3 UUID; v_t4 UUID; v_t5 UUID;
  v_t6 UUID; v_t7 UUID; v_t8 UUID; v_t9 UUID; v_t10 UUID;
  -- Course IDs
  v_c1 UUID; v_c2 UUID; v_c3 UUID; v_c4 UUID; v_c5 UUID;
  v_c6 UUID; v_c7 UUID; v_c8 UUID; v_c9 UUID; v_c10 UUID;
  -- Student IDs (25)
  v_s1 UUID; v_s2 UUID; v_s3 UUID; v_s4 UUID; v_s5 UUID;
  v_s6 UUID; v_s7 UUID; v_s8 UUID; v_s9 UUID; v_s10 UUID;
  v_s11 UUID; v_s12 UUID; v_s13 UUID; v_s14 UUID; v_s15 UUID;
  v_s16 UUID; v_s17 UUID; v_s18 UUID; v_s19 UUID; v_s20 UUID;
  v_s21 UUID; v_s22 UUID; v_s23 UUID; v_s24 UUID; v_s25 UUID;
  -- Temp variables
  v_lesson UUID; v_quiz UUID; v_q UUID; v_class UUID; v_enroll UUID;
  v_assign UUID; v_pkg UUID;
  v_admin UUID;
BEGIN

  -- Resolve teacher IDs
  SELECT id INTO v_t1 FROM users WHERE email = 'tranngocdai@maritime.edu';
  SELECT id INTO v_t2 FROM users WHERE email = 'levanhung@maritime.edu';
  SELECT id INTO v_t3 FROM users WHERE email = 'nguyenminhquan@maritime.edu';
  SELECT id INTO v_t4 FROM users WHERE email = 'phamthihanh@maritime.edu';
  SELECT id INTO v_t5 FROM users WHERE email = 'vudinhthang@maritime.edu';
  SELECT id INTO v_t6 FROM users WHERE email = 'doanvannam@maritime.edu';
  SELECT id INTO v_t7 FROM users WHERE email = 'hoangthimai@maritime.edu';
  SELECT id INTO v_t8 FROM users WHERE email = 'buithanhson@maritime.edu';
  SELECT id INTO v_t9 FROM users WHERE email = 'nguyenducanh@maritime.edu';
  SELECT id INTO v_t10 FROM users WHERE email = 'lethimylinh@maritime.edu';

  -- Resolve course IDs
  SELECT id INTO v_c1 FROM courses WHERE code = 'NAV-101';
  SELECT id INTO v_c2 FROM courses WHERE code = 'NAV-201';
  SELECT id INTO v_c3 FROM courses WHERE code = 'ENG-101';
  SELECT id INTO v_c4 FROM courses WHERE code = 'ENG-201';
  SELECT id INTO v_c5 FROM courses WHERE code = 'SAF-101';
  SELECT id INTO v_c6 FROM courses WHERE code = 'SAF-201';
  SELECT id INTO v_c7 FROM courses WHERE code = 'LOG-101';
  SELECT id INTO v_c8 FROM courses WHERE code = 'LAW-101';
  SELECT id INTO v_c9 FROM courses WHERE code = 'NAV-301';
  SELECT id INTO v_c10 FROM courses WHERE code = 'NAV-102';

  -- Resolve student IDs
  SELECT id INTO v_s1 FROM users WHERE email = 'nguyenvanan@sv.maritime.edu';
  SELECT id INTO v_s2 FROM users WHERE email = 'tranthibinh@sv.maritime.edu';
  SELECT id INTO v_s3 FROM users WHERE email = 'lehoangcuong@sv.maritime.edu';
  SELECT id INTO v_s4 FROM users WHERE email = 'phamthidung@sv.maritime.edu';
  SELECT id INTO v_s5 FROM users WHERE email = 'vovanem@sv.maritime.edu';
  SELECT id INTO v_s6 FROM users WHERE email = 'dangthiphuong@sv.maritime.edu';
  SELECT id INTO v_s7 FROM users WHERE email = 'hoangvangiang@sv.maritime.edu';
  SELECT id INTO v_s8 FROM users WHERE email = 'ngothihue@sv.maritime.edu';
  SELECT id INTO v_s9 FROM users WHERE email = 'buivankhoi@sv.maritime.edu';
  SELECT id INTO v_s10 FROM users WHERE email = 'lythilan@sv.maritime.edu';
  SELECT id INTO v_s11 FROM users WHERE email = 'trinhvanminh@sv.maritime.edu';
  SELECT id INTO v_s12 FROM users WHERE email = 'nguyenthinga@sv.maritime.edu';
  SELECT id INTO v_s13 FROM users WHERE email = 'doducthanh@sv.maritime.edu';
  SELECT id INTO v_s14 FROM users WHERE email = 'vuthiphuong@sv.maritime.edu';
  SELECT id INTO v_s15 FROM users WHERE email = 'levanquy@sv.maritime.edu';
  SELECT id INTO v_s16 FROM users WHERE email = 'phamhoangson@sv.maritime.edu';
  SELECT id INTO v_s17 FROM users WHERE email = 'tranvantuan@sv.maritime.edu';
  SELECT id INTO v_s18 FROM users WHERE email = 'nguyenthiuyen@sv.maritime.edu';
  SELECT id INTO v_s19 FROM users WHERE email = 'hoangvanvinh@sv.maritime.edu';
  SELECT id INTO v_s20 FROM users WHERE email = 'dangthixuan@sv.maritime.edu';
  SELECT id INTO v_s21 FROM users WHERE email = 'buivanduy@sv.maritime.edu';
  SELECT id INTO v_s22 FROM users WHERE email = 'lethihong@sv.maritime.edu';
  SELECT id INTO v_s23 FROM users WHERE email = 'ngovanlong@sv.maritime.edu';
  SELECT id INTO v_s24 FROM users WHERE email = 'phamthioanh@sv.maritime.edu';
  SELECT id INTO v_s25 FROM users WHERE email = 'trinhducphuc@sv.maritime.edu';

  SELECT id INTO v_admin FROM users WHERE email = 'admin@maritime.edu';

  -- =============================================
  -- 1. LEARNING CLASSES
  -- =============================================

  INSERT INTO learning_classes (name, code, course_id, teacher_id, status, max_students)
  VALUES ('DEFAULT', 'DEFAULT-NAV-101', v_c1, v_t1, 'OPEN', 9999)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO learning_classes (name, code, course_id, teacher_id, status, max_students)
  VALUES ('DEFAULT', 'DEFAULT-ENG-101', v_c3, v_t3, 'OPEN', 9999)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO learning_classes (name, code, course_id, teacher_id, status, max_students)
  VALUES ('DEFAULT', 'DEFAULT-SAF-101', v_c5, v_t5, 'OPEN', 9999)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO learning_classes (name, code, course_id, teacher_id, status, max_students)
  VALUES ('DEFAULT', 'DEFAULT-LOG-101', v_c7, v_t7, 'OPEN', 9999)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO learning_classes (name, code, course_id, teacher_id, status, max_students)
  VALUES ('DEFAULT', 'DEFAULT-LAW-101', v_c8, v_t8, 'OPEN', 9999)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO learning_classes (name, code, course_id, teacher_id, status, max_students)
  VALUES ('DEFAULT', 'DEFAULT-NAV-102', v_c10, v_t10, 'OPEN', 9999)
  ON CONFLICT (code) DO NOTHING;

  INSERT INTO learning_classes (name, code, course_id, teacher_id, status, max_students,
    start_date, end_date)
  VALUES ('Lop ECDIS-2026A', 'ECDIS-2026A', v_c2, v_t2, 'OPEN', 35,
    NOW() - INTERVAL '60 days', NOW() + INTERVAL '120 days')
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO learning_classes (name, code, course_id, teacher_id, status, max_students,
    start_date, end_date)
  VALUES ('Lop ECDIS-2026B', 'ECDIS-2026B', v_c2, v_t2, 'OPEN', 35,
    NOW() - INTERVAL '60 days', NOW() + INTERVAL '120 days')
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO learning_classes (name, code, course_id, teacher_id, status, max_students,
    start_date, end_date)
  VALUES ('Lop DTD-2026A', 'DTD-2026A', v_c4, v_t4, 'OPEN', 30,
    NOW() - INTERVAL '60 days', NOW() + INTERVAL '120 days')
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO learning_classes (name, code, course_id, teacher_id, status, max_students,
    start_date, end_date)
  VALUES ('Lop CCNC-2026A', 'CCNC-2026A', v_c6, v_t6, 'OPEN', 25,
    NOW() - INTERVAL '60 days', NOW() + INTERVAL '120 days')
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO learning_classes (name, code, course_id, teacher_id, status, max_students,
    start_date, end_date)
  VALUES ('Lop KT-2026A', 'KT-2026A', v_c9, v_t9, 'OPEN', 30,
    NOW() - INTERVAL '60 days', NOW() + INTERVAL '120 days')
  ON CONFLICT (code) DO NOTHING;

  -- =============================================
  -- 2. ENROLLMENTS (~70 enrollments)
  -- =============================================

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-101';
  IF v_class IS NOT NULL AND v_s1 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s1, 'COMPLETED', 100,
      NOW() - INTERVAL '90 days', NOW() - INTERVAL '60 days', NOW() - INTERVAL '80 days')
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-101';
  IF v_class IS NOT NULL AND v_s2 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s2, 'ACTIVE', 75,
      NOW() - INTERVAL '85 days', NOW() - INTERVAL '55 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-101';
  IF v_class IS NOT NULL AND v_s3 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s3, 'ACTIVE', 60,
      NOW() - INTERVAL '80 days', NOW() - INTERVAL '50 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-101';
  IF v_class IS NOT NULL AND v_s4 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s4, 'ACTIVE', 45,
      NOW() - INTERVAL '75 days', NOW() - INTERVAL '45 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-101';
  IF v_class IS NOT NULL AND v_s5 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s5, 'ACTIVE', 30,
      NOW() - INTERVAL '70 days', NOW() - INTERVAL '40 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-101';
  IF v_class IS NOT NULL AND v_s6 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s6, 'ACTIVE', 15,
      NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-101';
  IF v_class IS NOT NULL AND v_s7 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s7, 'ACTIVE', 50,
      NOW() - INTERVAL '65 days', NOW() - INTERVAL '35 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-101';
  IF v_class IS NOT NULL AND v_s8 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s8, 'ACTIVE', 85,
      NOW() - INTERVAL '88 days', NOW() - INTERVAL '58 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-101';
  IF v_class IS NOT NULL AND v_s9 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s9, 'COMPLETED', 100,
      NOW() - INTERVAL '80 days', NOW() - INTERVAL '50 days', NOW() - INTERVAL '70 days')
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-101';
  IF v_class IS NOT NULL AND v_s10 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s10, 'ACTIVE', 10,
      NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-101';
  IF v_class IS NOT NULL AND v_s11 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s11, 'DROPPED', 20,
      NOW() - INTERVAL '50 days', NULL, NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-101';
  IF v_class IS NOT NULL AND v_s12 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s12, 'ACTIVE', 35,
      NOW() - INTERVAL '55 days', NOW() - INTERVAL '25 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'ECDIS-2026A';
  IF v_class IS NOT NULL AND v_s1 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s1, 'ACTIVE', 70,
      NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'ECDIS-2026A';
  IF v_class IS NOT NULL AND v_s2 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s2, 'ACTIVE', 55,
      NOW() - INTERVAL '58 days', NOW() - INTERVAL '28 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'ECDIS-2026A';
  IF v_class IS NOT NULL AND v_s3 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s3, 'ACTIVE', 40,
      NOW() - INTERVAL '55 days', NOW() - INTERVAL '25 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'ECDIS-2026A';
  IF v_class IS NOT NULL AND v_s8 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s8, 'ACTIVE', 80,
      NOW() - INTERVAL '62 days', NOW() - INTERVAL '32 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'ECDIS-2026B';
  IF v_class IS NOT NULL AND v_s9 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s9, 'COMPLETED', 100,
      NOW() - INTERVAL '65 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '55 days')
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'ECDIS-2026B';
  IF v_class IS NOT NULL AND v_s13 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s13, 'ACTIVE', 30,
      NOW() - INTERVAL '45 days', NOW() - INTERVAL '15 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'ECDIS-2026B';
  IF v_class IS NOT NULL AND v_s14 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s14, 'ACTIVE', 25,
      NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'ECDIS-2026B';
  IF v_class IS NOT NULL AND v_s15 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s15, 'DROPPED', 10,
      NOW() - INTERVAL '50 days', NULL, NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-ENG-101';
  IF v_class IS NOT NULL AND v_s4 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s4, 'ACTIVE', 65,
      NOW() - INTERVAL '70 days', NOW() - INTERVAL '40 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-ENG-101';
  IF v_class IS NOT NULL AND v_s5 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s5, 'ACTIVE', 50,
      NOW() - INTERVAL '65 days', NOW() - INTERVAL '35 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-ENG-101';
  IF v_class IS NOT NULL AND v_s13 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s13, 'ACTIVE', 35,
      NOW() - INTERVAL '50 days', NOW() - INTERVAL '20 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-ENG-101';
  IF v_class IS NOT NULL AND v_s16 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s16, 'ACTIVE', 80,
      NOW() - INTERVAL '72 days', NOW() - INTERVAL '42 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-ENG-101';
  IF v_class IS NOT NULL AND v_s17 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s17, 'COMPLETED', 100,
      NOW() - INTERVAL '75 days', NOW() - INTERVAL '45 days', NOW() - INTERVAL '65 days')
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-ENG-101';
  IF v_class IS NOT NULL AND v_s18 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s18, 'ACTIVE', 20,
      NOW() - INTERVAL '35 days', NOW() - INTERVAL '5 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-ENG-101';
  IF v_class IS NOT NULL AND v_s19 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s19, 'DROPPED', 5,
      NOW() - INTERVAL '30 days', NULL, NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DTD-2026A';
  IF v_class IS NOT NULL AND v_s4 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s4, 'ACTIVE', 45,
      NOW() - INTERVAL '50 days', NOW() - INTERVAL '20 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DTD-2026A';
  IF v_class IS NOT NULL AND v_s16 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s16, 'ACTIVE', 60,
      NOW() - INTERVAL '55 days', NOW() - INTERVAL '25 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DTD-2026A';
  IF v_class IS NOT NULL AND v_s17 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s17, 'ACTIVE', 30,
      NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DTD-2026A';
  IF v_class IS NOT NULL AND v_s20 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s20, 'ACTIVE', 15,
      NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DTD-2026A';
  IF v_class IS NOT NULL AND v_s21 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s21, 'ACTIVE', 25,
      NOW() - INTERVAL '35 days', NOW() - INTERVAL '5 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-SAF-101';
  IF v_class IS NOT NULL AND v_s1 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s1, 'COMPLETED', 100,
      NOW() - INTERVAL '95 days', NOW() - INTERVAL '65 days', NOW() - INTERVAL '85 days')
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-SAF-101';
  IF v_class IS NOT NULL AND v_s2 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s2, 'COMPLETED', 100,
      NOW() - INTERVAL '92 days', NOW() - INTERVAL '62 days', NOW() - INTERVAL '82 days')
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-SAF-101';
  IF v_class IS NOT NULL AND v_s6 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s6, 'ACTIVE', 70,
      NOW() - INTERVAL '80 days', NOW() - INTERVAL '50 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-SAF-101';
  IF v_class IS NOT NULL AND v_s7 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s7, 'ACTIVE', 55,
      NOW() - INTERVAL '70 days', NOW() - INTERVAL '40 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-SAF-101';
  IF v_class IS NOT NULL AND v_s10 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s10, 'ACTIVE', 40,
      NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-SAF-101';
  IF v_class IS NOT NULL AND v_s11 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s11, 'ACTIVE', 25,
      NOW() - INTERVAL '50 days', NOW() - INTERVAL '20 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-SAF-101';
  IF v_class IS NOT NULL AND v_s22 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s22, 'ACTIVE', 60,
      NOW() - INTERVAL '65 days', NOW() - INTERVAL '35 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-SAF-101';
  IF v_class IS NOT NULL AND v_s23 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s23, 'ACTIVE', 35,
      NOW() - INTERVAL '45 days', NOW() - INTERVAL '15 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-SAF-101';
  IF v_class IS NOT NULL AND v_s24 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s24, 'ACTIVE', 15,
      NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-SAF-101';
  IF v_class IS NOT NULL AND v_s25 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s25, 'ACTIVE', 10,
      NOW() - INTERVAL '25 days', NOW() - INTERVAL '1 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'CCNC-2026A';
  IF v_class IS NOT NULL AND v_s1 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s1, 'ACTIVE', 50,
      NOW() - INTERVAL '45 days', NOW() - INTERVAL '15 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'CCNC-2026A';
  IF v_class IS NOT NULL AND v_s2 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s2, 'ACTIVE', 35,
      NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'CCNC-2026A';
  IF v_class IS NOT NULL AND v_s6 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s6, 'ACTIVE', 20,
      NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'CCNC-2026A';
  IF v_class IS NOT NULL AND v_s22 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s22, 'ACTIVE', 10,
      NOW() - INTERVAL '20 days', NOW() - INTERVAL '1 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-LOG-101';
  IF v_class IS NOT NULL AND v_s3 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s3, 'ACTIVE', 55,
      NOW() - INTERVAL '50 days', NOW() - INTERVAL '20 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-LOG-101';
  IF v_class IS NOT NULL AND v_s12 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s12, 'ACTIVE', 40,
      NOW() - INTERVAL '45 days', NOW() - INTERVAL '15 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-LOG-101';
  IF v_class IS NOT NULL AND v_s14 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s14, 'ACTIVE', 70,
      NOW() - INTERVAL '55 days', NOW() - INTERVAL '25 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-LOG-101';
  IF v_class IS NOT NULL AND v_s20 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s20, 'ACTIVE', 20,
      NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-LOG-101';
  IF v_class IS NOT NULL AND v_s23 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s23, 'DROPPED', 5,
      NOW() - INTERVAL '25 days', NULL, NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-LAW-101';
  IF v_class IS NOT NULL AND v_s5 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s5, 'ACTIVE', 80,
      NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-LAW-101';
  IF v_class IS NOT NULL AND v_s7 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s7, 'ACTIVE', 45,
      NOW() - INTERVAL '50 days', NOW() - INTERVAL '20 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-LAW-101';
  IF v_class IS NOT NULL AND v_s15 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s15, 'ACTIVE', 30,
      NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-LAW-101';
  IF v_class IS NOT NULL AND v_s18 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s18, 'ACTIVE', 55,
      NOW() - INTERVAL '45 days', NOW() - INTERVAL '15 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-LAW-101';
  IF v_class IS NOT NULL AND v_s24 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s24, 'ACTIVE', 15,
      NOW() - INTERVAL '25 days', NOW() - INTERVAL '1 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-LAW-101';
  IF v_class IS NOT NULL AND v_s25 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s25, 'ACTIVE', 10,
      NOW() - INTERVAL '20 days', NOW() - INTERVAL '1 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'KT-2026A';
  IF v_class IS NOT NULL AND v_s1 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s1, 'ACTIVE', 40,
      NOW() - INTERVAL '35 days', NOW() - INTERVAL '5 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'KT-2026A';
  IF v_class IS NOT NULL AND v_s8 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s8, 'ACTIVE', 55,
      NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'KT-2026A';
  IF v_class IS NOT NULL AND v_s9 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s9, 'ACTIVE', 65,
      NOW() - INTERVAL '45 days', NOW() - INTERVAL '15 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'KT-2026A';
  IF v_class IS NOT NULL AND v_s13 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s13, 'ACTIVE', 20,
      NOW() - INTERVAL '25 days', NOW() - INTERVAL '1 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-102';
  IF v_class IS NOT NULL AND v_s2 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s2, 'ACTIVE', 50,
      NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-102';
  IF v_class IS NOT NULL AND v_s6 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s6, 'ACTIVE', 35,
      NOW() - INTERVAL '35 days', NOW() - INTERVAL '5 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-102';
  IF v_class IS NOT NULL AND v_s10 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s10, 'ACTIVE', 60,
      NOW() - INTERVAL '45 days', NOW() - INTERVAL '15 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-102';
  IF v_class IS NOT NULL AND v_s12 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s12, 'ACTIVE', 25,
      NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-102';
  IF v_class IS NOT NULL AND v_s21 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s21, 'ACTIVE', 15,
      NOW() - INTERVAL '20 days', NOW() - INTERVAL '1 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  SELECT id INTO v_class FROM learning_classes WHERE code = 'DEFAULT-NAV-102';
  IF v_class IS NOT NULL AND v_s19 IS NOT NULL THEN
    INSERT INTO enrollments (class_id, student_id, status, completion_percent,
      enrolled_at, last_accessed_at, completed_at)
    VALUES (v_class, v_s19, 'ACTIVE', 40,
      NOW() - INTERVAL '32 days', NOW() - INTERVAL '2 days', NULL)
    ON CONFLICT (student_id, class_id) DO NOTHING;
  END IF;

  -- =============================================
  -- 3. QUIZZES & QUESTIONS (for QUIZ-type lessons)
  -- =============================================

  -- Question bank packages
  INSERT INTO packages (name, description, subject, owner_id, visibility, is_active)
  VALUES ('Ngan hang cau hoi Hang hai Dia van', 'Ngan hang cau hoi khoa NAV-101', 'NAV-101', v_t1, 'PRIVATE', true);
  INSERT INTO packages (name, description, subject, owner_id, visibility, is_active)
  VALUES ('Ngan hang cau hoi ECDIS va Radar', 'Ngan hang cau hoi khoa NAV-201', 'NAV-201', v_t2, 'PRIVATE', true);
  INSERT INTO packages (name, description, subject, owner_id, visibility, is_active)
  VALUES ('Ngan hang cau hoi May Diesel', 'Ngan hang cau hoi khoa ENG-101', 'ENG-101', v_t3, 'PRIVATE', true);
  INSERT INTO packages (name, description, subject, owner_id, visibility, is_active)
  VALUES ('Ngan hang cau hoi Dien Tau bien', 'Ngan hang cau hoi khoa ENG-201', 'ENG-201', v_t4, 'PRIVATE', true);
  INSERT INTO packages (name, description, subject, owner_id, visibility, is_active)
  VALUES ('Ngan hang cau hoi An toan Co ban', 'Ngan hang cau hoi khoa SAF-101', 'SAF-101', v_t5, 'PRIVATE', true);
  INSERT INTO packages (name, description, subject, owner_id, visibility, is_active)
  VALUES ('Ngan hang cau hoi Chua chay Nang cao', 'Ngan hang cau hoi khoa SAF-201', 'SAF-201', v_t6, 'PRIVATE', true);
  INSERT INTO packages (name, description, subject, owner_id, visibility, is_active)
  VALUES ('Ngan hang cau hoi Logistics', 'Ngan hang cau hoi khoa LOG-101', 'LOG-101', v_t7, 'PRIVATE', true);
  INSERT INTO packages (name, description, subject, owner_id, visibility, is_active)
  VALUES ('Ngan hang cau hoi Luat Hang hai', 'Ngan hang cau hoi khoa LAW-101', 'LAW-101', v_t8, 'PRIVATE', true);
  INSERT INTO packages (name, description, subject, owner_id, visibility, is_active)
  VALUES ('Ngan hang cau hoi Khi tuong Dieu dong', 'Ngan hang cau hoi khoa NAV-301', 'NAV-301', v_t9, 'PRIVATE', true);
  INSERT INTO packages (name, description, subject, owner_id, visibility, is_active)
  VALUES ('Ngan hang cau hoi Tieng Anh Hang hai', 'Ngan hang cau hoi khoa NAV-102', 'NAV-102', v_t10, 'PRIVATE', true);

  -- Quizzes for NAV-101
  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c1 AND l.title LIKE '%Kiem tra chuong 1%' AND l.lesson_type = 'QUIZ' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO quizzes (lesson_id, title, description, time_limit_minutes, max_attempts,
      passing_score, shuffle_questions, show_results_immediately, show_correct_answers, status)
    VALUES (v_lesson, 'Kiem tra chuong 1', 'Bai kiem tra Kiem tra chuong 1',
      20, 3, 60, true, true, true, 'PUBLISHED')
    RETURNING id INTO v_quiz;

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Vi do co gia tri tu bao nhieu den bao nhieu?'), 'EASY', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('0 den 90 do'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('0 den 180 do'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('0 den 360 do'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('-90 den 90 do'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 0, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Mot hai ly bang bao nhieu met?'), 'EASY', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('1.609 m'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('1.852 m'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('2.000 m'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('1.500 m'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 1, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Phep chieu Mercator co dac diem gi?'), 'MEDIUM', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Giu nguyen goc giua cac duong'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Giu nguyen dien tich'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Giu nguyen khoang cach'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Giu nguyen hinh dang luc dia'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 2, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Don vi toc do trong hang hai la gi?'), 'EASY', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('km/h'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('m/s'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Knot'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('mph'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 3, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Hai do dien tu ENC su dung dinh dang nao?'), 'MEDIUM', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('DWG'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('S-57'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('PDF'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('TIFF'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 4, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Duong chinh ngo (Great Circle) la gi?'), 'MEDIUM', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Vong tron lon nhat tren mat cau'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Duong thang tren hai do'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Duong song song voi xich dao'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Duong noi 2 cuc'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 5, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('SOLAS yeu cau tau quoc te phai co ECDIS tu nam nao?'), 'MEDIUM', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('2010'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('2015'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('2018'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('2020'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 6, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Kinh do duoc tinh tu dau?'), 'EASY', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Xich dao'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Kinh tuyen Greenwich'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Cuc Bac'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Kinh tuyen 180'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 7, 1);

  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c1 AND l.title LIKE '%Kiem tra chuong 2%' AND l.lesson_type = 'QUIZ' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO quizzes (lesson_id, title, description, time_limit_minutes, max_attempts,
      passing_score, shuffle_questions, show_results_immediately, show_correct_answers, status)
    VALUES (v_lesson, 'Kiem tra chuong 2', 'Bai kiem tra Kiem tra chuong 2',
      20, 3, 60, true, true, true, 'PUBLISHED')
    RETURNING id INTO v_quiz;

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('La ban tu chi ve huong nao?'), 'EASY', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Bac that'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Bac tu'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Bac hai do'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Bac la ban'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 0, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Doc sai (Variation) la gi?'), 'MEDIUM', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Sai so do cuc tu khong trung cuc dia ly'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Sai so do thiet bi dien tren tau'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Sai so do gio'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Sai so do thuy trieu'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 1, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Dao sai thay doi theo yeu to nao?'), 'MEDIUM', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Vi tri dia ly'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Thoi gian trong nam'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Huong mui tau'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Toc do tau'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 2, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('La ban con quay mat bao lau de on dinh?'), 'MEDIUM', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('1-2 gio'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('4-6 gio'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('10-12 gio'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('30 phut'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 3, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Theo SOLAS, la ban tu phai hieu chinh bao lau 1 lan?'), 'MEDIUM', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('It nhat 1 lan/nam'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('6 thang/lan'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('2 nam/lan'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Khi nao hong thi hieu chinh'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 4, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Cong thuc chuyen doi huong la gi?'), 'EASY', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('T = C - V - D'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('T = C x V x D'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('T = C + V + D'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('T = C / V + D'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 5, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Uu diem cua la ban con quay so voi la ban tu?'), 'EASY', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Chi Bac that, ket noi thiet bi'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Khong can dien'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Re hon'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Nhe hon'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 6, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Chat long trong la ban tu co tac dung gi?'), 'EASY', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Boi tron'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Giam rung lac'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Lam mat'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Tang do nhay'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 7, 1);

  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c1 AND l.title LIKE '%Kiem tra chuong 3%' AND l.lesson_type = 'QUIZ' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO quizzes (lesson_id, title, description, time_limit_minutes, max_attempts,
      passing_score, shuffle_questions, show_results_immediately, show_correct_answers, status)
    VALUES (v_lesson, 'Kiem tra chuong 3', 'Bai kiem tra Kiem tra chuong 3',
      20, 3, 60, true, true, true, 'PUBLISHED')
    RETURNING id INTO v_quiz;

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Huong Bac trong he 360 do la bao nhieu?'), 'EASY', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('000'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('090'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('180'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('360'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 0, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Huong tu (M) tinh bang cong thuc nao?'), 'MEDIUM', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('M = T + Var'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('M = T - Var'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('M = C + Dev'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('M = T + Dev'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 1, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Doc sai Dong mang dau gi?'), 'EASY', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Duong (+)'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Am (-)'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Khong co dau'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Tuy truong hop'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 2, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('C=120, Dev=3E, Var=2W. Huong that la?'), 'MEDIUM', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('119'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('125'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('121'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('117'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 3, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('T=245, Var=1.5W, Dev=4W. Huong la ban la?'), 'HARD', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('239.5'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('250.5'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('245'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('248.5'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 4, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Khoang cach lon nen tinh theo duong nao?'), 'MEDIUM', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Great Circle'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Rhumb Line'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Mercator'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Duong thang'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 5, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Phuong vi duoc do bang dung cu gi?'), 'EASY', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Sextant'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Toc do ke'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('La ban hoac Radar'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Do sau ke'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 6, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Huong di (Course) la gi?'), 'EASY', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Huong tau can di den dich'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Huong gio thoi'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Huong dong chay'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Huong song'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 7, 1);

  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c1 AND l.title LIKE '%Kiem tra chuong 4%' AND l.lesson_type = 'QUIZ' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO quizzes (lesson_id, title, description, time_limit_minutes, max_attempts,
      passing_score, shuffle_questions, show_results_immediately, show_correct_answers, status)
    VALUES (v_lesson, 'Kiem tra chuong 4', 'Bai kiem tra Kiem tra chuong 4',
      25, 3, 60, true, true, true, 'PUBLISHED')
    RETURNING id INTO v_quiz;

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Dead Reckoning khong tinh den yeu to nao?'), 'EASY', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Toc do tau'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Huong di'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Gio va dong chay'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Thoi gian'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 0, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('De co Fix can it nhat may duong vi tri?'), 'EASY', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('2'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('1'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('3'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('4'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 1, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Goc cat ly tuong giua 2 PL la bao nhieu?'), 'MEDIUM', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('45 do'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('90 do'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('60 do'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('120 do'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 2, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Do khoang cach Radar chinh xac bao nhieu?'), 'MEDIUM', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('1-2%'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('5-10%'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('10-15%'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('20%'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 3, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Sextant dung de lam gi?'), 'EASY', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Do khoang cach'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Do toc do'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Do goc cao thien the'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Do do sau'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 4, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Cocked hat la gi?'), 'MEDIUM', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Non bao ho'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Tam giac sai so khi giao 3 PL'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Loai la ban'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Phuong phap tinh toan'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 5, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('VRM tren Radar dung de?'), 'EASY', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Do khoang cach'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Do phuong vi'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Do toc do'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Do do sau'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 6, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Phuong phap nhanh nhat xac dinh vi tri khi co 1 muc tieu?'), 'HARD', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('2 phuong vi'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('2 khoang cach'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('1 phuong vi + 1 khoang cach'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Dead reckoning'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 7, 1);

  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c1 AND l.title LIKE '%Kiem tra chuong 5%' AND l.lesson_type = 'QUIZ' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO quizzes (lesson_id, title, description, time_limit_minutes, max_attempts,
      passing_score, shuffle_questions, show_results_immediately, show_correct_answers, status)
    VALUES (v_lesson, 'Kiem tra chuong 5', 'Bai kiem tra Kiem tra chuong 5',
      20, 3, 60, true, true, true, 'PUBLISHED')
    RETURNING id INTO v_quiz;

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Mat chuan do sau tren hai do thuong la gi?'), 'MEDIUM', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('LAT (muc thuy trieu thap nhat)'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Muc nuoc trung binh'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Muc nuoc cao nhat'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Muc nuoc bien'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 0, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Mau xanh tren hai do the hien gi?'), 'EASY', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Dat lien'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Vung nuoc sau'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Vung can'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Vung nguy hiem'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 1, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('NtM la viet tat cua gi?'), 'EASY', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Navigation time Management'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('New technical Manual'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Notices to Mariners'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Nautical Map'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 2, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Passage Planning theo IMO gom may buoc?'), 'MEDIUM', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('4 buoc'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('3 buoc'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('5 buoc'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('6 buoc'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 3, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Ky hieu Fl tren hai do la gi?'), 'MEDIUM', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Fixed light'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Flashing light'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Float'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Fog signal'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 4, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('He thong IALA-A: phao xanh ben nao?'), 'MEDIUM', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Ben phai khi vao cang'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Ben trai khi vao cang'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Khong co quy dinh'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Tuy quoc gia'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 5, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Do sau thuc te tinh bang cong thuc nao?'), 'EASY', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Do sau hai do - thuy trieu'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Do sau hai do x thuy trieu'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Do sau hai do + thuy trieu'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Do sau hai do / thuy trieu'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 6, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Loai NtM nao can cap nhat vinh vien tren hai do?'), 'EASY', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Permanent'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Temporary'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Preliminary'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Tat ca'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 7, 1);

  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c1 AND l.title LIKE '%Kiem tra chuong 6%' AND l.lesson_type = 'QUIZ' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO quizzes (lesson_id, title, description, time_limit_minutes, max_attempts,
      passing_score, shuffle_questions, show_results_immediately, show_correct_answers, status)
    VALUES (v_lesson, 'Kiem tra chuong 6', 'Bai kiem tra Kiem tra chuong 6',
      20, 3, 60, true, true, true, 'PUBLISHED')
    RETURNING id INTO v_quiz;

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Thuy trieu gay ra boi luc gi?'), 'EASY', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Hap dan Mat Trang va Mat Troi'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Gio'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Dong bien'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Nhiet do'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 0, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Vinh Bac Bo co che do thuy trieu gi?'), 'MEDIUM', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Ban nhat trieu'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Nhat trieu'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Hon hop'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Khong co thuy trieu'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 1, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Trieu cuong xay ra khi nao?'), 'MEDIUM', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Mat Trang-Troi thang hang'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Mat Trang-Troi vuong goc'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Mat Trang xa Trai Dat nhat'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Xich dao'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 2, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Quy tac 1/12 chia thoi gian thanh may phan?'), 'EASY', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('4'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('5'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('6'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('12'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 3, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Dong trieu thay doi theo chu ky bao lau?'), 'MEDIUM', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('24 gio'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('6-12 gio'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('1 gio'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('1 thang'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 4, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('UKC la viet tat cua gi?'), 'EASY', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Under Keel Clearance'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Universal Keel Check'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Upper Keel Capacity'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Unified Knowledge Chart'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 5, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('UKC toi thieu trong luong hang hai la?'), 'MEDIUM', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('5-10% draft'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('10-15% draft'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('20-25% draft'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('50% draft'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 6, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Course Made Good khac Course to Steer o cho nao?'), 'HARD', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Khong khac nhau'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('CMG tinh ca gio'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('CMG la huong thuc te di duoc (tinh dong chay)'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('CMG la huong la ban'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 7, 1);

  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c1 AND l.title LIKE '%Thi cuoi khoa%' AND l.lesson_type = 'QUIZ' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO quizzes (lesson_id, title, description, time_limit_minutes, max_attempts,
      passing_score, shuffle_questions, show_results_immediately, show_correct_answers, status)
    VALUES (v_lesson, 'Thi cuoi khoa', 'Bai kiem tra Thi cuoi khoa',
      45, 2, 70, true, true, true, 'PUBLISHED')
    RETURNING id INTO v_quiz;

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('UNCLOS quy dinh lanh hai rong bao nhieu?'), 'EASY', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('6 NM'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('12 NM'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('24 NM'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('200 NM'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 0, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Magnetic North va True North chenh nhau boi?'), 'EASY', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Variation'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Deviation'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Declination'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Inclination'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 1, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Tau chay 15 knots trong 3 gio di duoc bao xa?'), 'EASY', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('30 NM'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('40 NM'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('45 NM'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('50 NM'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 2, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Rhumb Line la duong gi tren hai do Mercator?'), 'MEDIUM', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Duong thang'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Duong cong'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Duong gon song'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Duong dut doan'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 3, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Do cao thuy trieu tra o dau?'), 'EASY', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Hai do'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Bang thuy trieu'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('La ban'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Radar'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 4, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('EBL tren Radar do gi?'), 'EASY', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Phuong vi'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Khoang cach'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Toc do'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Do sau'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 5, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Gyrocompass sai so tang o dau?'), 'MEDIUM', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Xich dao'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Nhiet doi'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Vi do cao (tren 75 do)'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Vi do thap'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 6, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Passage Planning buoc dau tien la gi?'), 'MEDIUM', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Appraisal'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Planning'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Execution'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Monitoring'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 7, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('1 do vi do = bao nhieu NM?'), 'EASY', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('1 NM'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('60 NM'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('100 NM'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('10 NM'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 8, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Bang sai so la ban ghi lai gi?'), 'MEDIUM', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Variation theo vi tri'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Toc do tau'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Deviation theo huong mui tau'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Do sau'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 9, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Nguyen ly Marcq Saint-Hilaire dung trong?'), 'HARD', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Hang hai thien van'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Tinh dong chay'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Hieu chinh la ban'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Do khoang cach Radar'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 10, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('SOLAS la viet tat cua?'), 'EASY', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Safety Of Life And Ships'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Safety Of Life At Sea'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Standard Of Living At Sea'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Security Of Lines And Signals'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 11, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Duong dong sau 200m thuong la ranh gioi gi?'), 'MEDIUM', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Them luc dia'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Lanh hai'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('EEZ'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Bien sau'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 12, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Spring tide co bien do?'), 'EASY', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Lon nhat'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Nho nhat'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Trung binh'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Khong doi'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 13, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Dead Reckoning sai lech do?'), 'MEDIUM', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('La ban sai'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Hai do cu'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Khong tinh gio va dong chay'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Toc do ke hong'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 14, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Thuyen vien phai co chung chi gi theo quoc te?'), 'EASY', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('ISO'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('STCW'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('IMDG'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('ISM'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 15, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Phao IALA-A: do ben trai la khi?'), 'MEDIUM', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Vao cang'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Ra bien'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Khong co quy dinh'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Chi ban dem'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 16, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Khoang cach Radar chinh xac hon phuong vi Radar?'), 'EASY', 'A', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Dung'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Sai'), false, 1);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 17, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('CPA la gi?'), 'EASY', 'B', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Central Point of Anchor'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Closest Point of Approach'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Course Planning Area'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Compass Point Adjustment'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 18, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Tau di tu HP den Singapore khoang bao nhieu NM?'), 'MEDIUM', 'C', v_t1, v_c1, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('500 NM'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('1000 NM'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('1500-1600 NM'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('2500 NM'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 19, 1);

  END IF;

  -- Quizzes for SAF-101
  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c5 AND l.title LIKE '%Kiem tra chuong 1%' AND l.lesson_type = 'QUIZ' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO quizzes (lesson_id, title, description, time_limit_minutes, max_attempts,
      passing_score, shuffle_questions, show_results_immediately, show_correct_answers, status)
    VALUES (v_lesson, 'Kiem tra chuong 1', 'Bai kiem tra Kiem tra chuong 1',
      20, 3, 60, true, true, true, 'PUBLISHED')
    RETURNING id INTO v_quiz;

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Suc chua xuong cuu sinh toi thieu la?'), 'EASY', 'A', v_t5, v_c5, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('100% thuyen vien moi man'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('50% tong so'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('75% tong so'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('25% moi man'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 0, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Tin hieu bo tau la gi?'), 'EASY', 'B', v_t5, v_c5, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('3 hoi dai'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('7 hoi ngan + 1 hoi dai'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('1 hoi dai'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('SOS'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 1, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Hypothermia la gi?'), 'EASY', 'A', v_t5, v_c5, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Ha than nhiet'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Mat nuoc'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Gay xuong'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Bong'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 2, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('EPIRB la thiet bi gi?'), 'MEDIUM', 'C', v_t5, v_c5, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Radar'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('La ban'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Phat tin hieu cuu nan qua ve tinh'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('May do do sau'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 3, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Be cuu sinh tu dong phong khi nao?'), 'MEDIUM', 'B', v_t5, v_c5, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Khi nhan nut'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Khi giat day co hoac ap suat nuoc'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Khi co tin hieu'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Tu dong sau 10 phut'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 4, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Khong nen lam gi khi tren be cuu sinh?'), 'EASY', 'A', v_t5, v_c5, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Uong nuoc bien'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Che nang'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Phat tin hieu'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Phan cong nhiem vu'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 5, 1);

  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c5 AND l.title LIKE '%Thi cuoi khoa%' AND l.lesson_type = 'QUIZ' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO quizzes (lesson_id, title, description, time_limit_minutes, max_attempts,
      passing_score, shuffle_questions, show_results_immediately, show_correct_answers, status)
    VALUES (v_lesson, 'Thi cuoi khoa', 'Bai kiem tra Thi cuoi khoa',
      30, 2, 60, true, true, true, 'PUBLISHED')
    RETURNING id INTO v_quiz;

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('STCW la viet tat cua?'), 'EASY', 'A', v_t5, v_c5, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Standards of Training, Certification and Watchkeeping'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Safety Training for Crew Workers'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Standard Technical Crew Work'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Safety and Training Certification Worldwide'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 0, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Tam giac chay gom?'), 'EASY', 'B', v_t5, v_c5, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Nuoc, gio, lua'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Nhien lieu, oxy, nhiet'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Dien, khi, nhiet'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Go, dau, than'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 1, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Binh CO2 dung cho loai chay nao?'), 'MEDIUM', 'C', v_t5, v_c5, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Class A'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Class D'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Class B va E'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Chi Class A'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 2, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('CPR ty le nen tim/thoi la?'), 'EASY', 'A', v_t5, v_c5, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('30:2'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('15:2'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('20:1'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('10:2'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 3, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('MARPOL co may phu luc?'), 'MEDIUM', 'B', v_t5, v_c5, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('4'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('6'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('8'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('10'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 4, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Oil Record Book ghi lai gi?'), 'MEDIUM', 'A', v_t5, v_c5, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Cac hoat dong lien quan den dau tren tau'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Nhat ky thoi tiet'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Hanh trinh tau'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Thong so may'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 5, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('MLC 2006 quy dinh thoi gian nghi toi thieu?'), 'MEDIUM', 'C', v_t5, v_c5, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('6h/ngay'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('8h/ngay'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('10h/ngay'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('12h/ngay'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 6, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Lock-Out Tag-Out dung khi nao?'), 'MEDIUM', 'A', v_t5, v_c5, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Bao tri thiet bi nguy hiem'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Cap cang'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Thuc tap'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Kiem tra hang hoa'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 7, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Sprinkler system thuong o dau?'), 'EASY', 'B', v_t5, v_c5, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Buong may'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Cabin va hanh lang'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Boong'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Ket hang'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 8, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('ISM Code yeu cau bao cao gi?'), 'EASY', 'A', v_t5, v_c5, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Moi su co va near-miss'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Chi su co lon'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Chi tai nan ca nhan'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Khong can bao cao'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 9, 1);

  END IF;

  -- Quizzes for ENG-101
  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c3 AND l.title LIKE '%Kiem tra chuong 1%' AND l.lesson_type = 'QUIZ' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO quizzes (lesson_id, title, description, time_limit_minutes, max_attempts,
      passing_score, shuffle_questions, show_results_immediately, show_correct_answers, status)
    VALUES (v_lesson, 'Kiem tra chuong 1', 'Bai kiem tra Kiem tra chuong 1',
      20, 3, 60, true, true, true, 'PUBLISHED')
    RETURNING id INTO v_quiz;

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Dong co diesel 2 ky hoan thanh chu trinh trong?'), 'EASY', 'A', v_t3, v_c3, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('1 vong quay truc'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('2 vong quay truc'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('4 vong quay truc'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('3 vong quay truc'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 0, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('HFO can ham nong den nhiet do bao nhieu?'), 'MEDIUM', 'B', v_t3, v_c3, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('80-90 C'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('130-150 C'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('200 C'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('50 C'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 1, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Dong co diesel hang hai chiem bao nhieu % dong luc tau?'), 'EASY', 'A', v_t3, v_c3, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('95%'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('50%'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('75%'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('30%'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 2, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('MAN B&W la hang san xuat gi?'), 'EASY', 'C', v_t3, v_c3, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('La ban'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Radar'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Dong co diesel hang hai'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('May phat dien'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 3, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Dong co 4 ky hoan thanh trong?'), 'EASY', 'B', v_t3, v_c3, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('1 vong quay'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('2 vong quay'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('3 vong quay'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('4 vong quay'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 4, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('MDO dung khi nao?'), 'MEDIUM', 'A', v_t3, v_c3, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Khi vao cang hoac vung ECA'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Khi chay tren bien'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Khi neo'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Luon luon'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 5, 1);

  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c3 AND l.title LIKE '%Thi cuoi khoa%' AND l.lesson_type = 'QUIZ' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO quizzes (lesson_id, title, description, time_limit_minutes, max_attempts,
      passing_score, shuffle_questions, show_results_immediately, show_correct_answers, status)
    VALUES (v_lesson, 'Thi cuoi khoa', 'Bai kiem tra Thi cuoi khoa',
      45, 2, 60, true, true, true, 'PUBLISHED')
    RETURNING id INTO v_quiz;

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Turbocharger tang cong suat dong co bao nhieu?'), 'MEDIUM', 'B', v_t3, v_c3, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('10-20%'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('30-50%'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('60-80%'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('5-10%'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 0, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Ap suat khi nen khoi dong dong co chinh la?'), 'EASY', 'A', v_t3, v_c3, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('30 bar'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('10 bar'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('50 bar'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('5 bar'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 1, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('TBN la chi so gi cua dau boi tron?'), 'MEDIUM', 'C', v_t3, v_c3, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Do nham'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Do dac'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Total Base Number'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Do trong'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 2, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('PMS la viet tat cua?'), 'EASY', 'A', v_t3, v_c3, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Planned Maintenance System'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Power Management System'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Pressure Monitoring System'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Port Management System'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 3, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Khi blackout, may phat su co khoi dong trong?'), 'MEDIUM', 'B', v_t3, v_c3, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('10 giay'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('45 giay'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('5 phut'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('1 phut'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 4, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Economizer la gi?'), 'MEDIUM', 'A', v_t3, v_c3, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Noi hoi khi xa tan dung nhiet'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('He thong tiet kiem nhien lieu'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Bo dieu toc'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Bo loc dau'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 5, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Chenh nhiet do xa khi giua cac xylanh cho phep?'), 'MEDIUM', 'C', v_t3, v_c3, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('100 C'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('20 C'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('50 C'), true, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('5 C'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 6, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Truoc khi khoi dong dong co, can lam gi dau tien?'), 'EASY', 'A', v_t3, v_c3, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('Kiem tra dau, nuoc, nhien lieu, khi nen'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('Khoi dong ngay'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('Ghi nhat ky'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('Bao cao thuyen truong'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 7, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('Purifier can bao duong sau?'), 'MEDIUM', 'B', v_t3, v_c3, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('1000-2000h'), false, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('3000-4000h'), true, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('6000h'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('500h'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 8, 1);

    INSERT INTO questions (content_blocks, difficulty, correct_option, created_by, course_id, status)
    VALUES (_qc('He thong noi hoi tao hoi nuoc ap suat bao nhieu?'), 'EASY', 'A', v_t3, v_c3, 'ACTIVE')
    RETURNING id INTO v_q;
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'A', _qc('7-16 bar'), true, 0);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'B', _qc('1-3 bar'), false, 1);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'C', _qc('30-50 bar'), false, 2);
    INSERT INTO question_options (question_id, option_key, content, is_correct, display_order)
    VALUES (v_q, 'D', _qc('100 bar'), false, 3);
    INSERT INTO quiz_questions (quiz_id, question_id, display_order, points)
    VALUES (v_quiz, v_q, 9, 1);

  END IF;

  -- =============================================
  -- 4. ASSIGNMENTS (for ASSIGNMENT-type lessons)
  -- =============================================

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c1 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%Thuc hanh chuyen doi huong%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c1,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'ESSAY', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c1 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%Ke hoach HP-Singapore%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c1,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'PROJECT', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c1 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%Da Nang - Hai Phong%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c1,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'PROJECT', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c2 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%Mo phong ARPA%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c2,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'PROJECT', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c2 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%tong hop ECDIS%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c2,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'PROJECT', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c2 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%Route planning%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c2,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'PROJECT', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c2 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%Radar plotting%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c2,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'PROJECT', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c3 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%nhat ky buong may%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c3,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'FILE_UPLOAD', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c3 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%ke hoach bao duong%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c3,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'PROJECT', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c4 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%lap trinh PLC%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c4,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'PROJECT', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c4 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%phan tich mach%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c4,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'FILE_UPLOAD', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c4 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%bao tri tong hop%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c4,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'PROJECT', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c5 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%tinh huong so cuu%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c5,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'ESSAY', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c5 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%tinh huong khan cap%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c5,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'ESSAY', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c6 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%chi huy chua chay%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c6,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'ESSAY', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c6 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%mo phong cuu ho%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c6,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'ESSAY', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c7 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%tinh cuoc van tai%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c7,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'FILE_UPLOAD', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c7 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%phan tich chuoi%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c7,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'PROJECT', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c7 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%cuoi khoa%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c7,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'PROJECT', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c8 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%phan tich MARPOL%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c8,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'ESSAY', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c8 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%phan tich B/L%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c8,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'FILE_UPLOAD', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c8 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%cuoi khoa%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c8,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'ESSAY', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c9 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%doc ban do thoi tiet%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c9,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'FILE_UPLOAD', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c9 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%dieu dong mo phong%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c9,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'PROJECT', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c9 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%cap cang mo phong%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c9,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'PROJECT', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c10 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%SMCP%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c10,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'FILE_UPLOAD', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  SELECT l.id INTO v_lesson FROM lessons l
  JOIN chapters ch ON l.chapter_id = ch.id
  WHERE ch.course_id = v_c10 AND l.lesson_type = 'ASSIGNMENT'
  AND l.title LIKE '%giao tiep VHF%' LIMIT 1;
  IF v_lesson IS NOT NULL THEN
    INSERT INTO assignments (lesson_id, course_id, title, description, instructions,
      assignment_type, status, max_score, due_date)
    VALUES (v_lesson, v_c10,
      (SELECT title FROM lessons WHERE id = v_lesson),
      'Bai tap thuc hanh khoa hoc',
      'Hoan thanh bai tap va nop file PDF theo yeu cau',
      'FILE_UPLOAD', 'PUBLISHED', 100, NOW() + INTERVAL '30 days');
  END IF;

  -- =============================================
  -- 5. COURSE REVIEWS
  -- =============================================

  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c1, v_s1, 5, 'Khoa hoc rat hay, giang vien nhiet tinh. Kien thuc co ban vung chac.')
  ON CONFLICT (course_id, student_id) DO NOTHING;
  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c1, v_s2, 4, 'Noi dung tot, can them bai tap thuc hanh tren tau.')
  ON CONFLICT (course_id, student_id) DO NOTHING;
  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c1, v_s8, 5, 'Tuyet voi! Da hieu ro ve la ban va hai do.')
  ON CONFLICT (course_id, student_id) DO NOTHING;
  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c1, v_s9, 4, 'Khoa hoc nen tang rat can thiet cho nghe di bien.')
  ON CONFLICT (course_id, student_id) DO NOTHING;
  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c2, v_s1, 5, 'ECDIS va Radar rat thuc te, giang vien co nhieu kinh nghiem.')
  ON CONFLICT (course_id, student_id) DO NOTHING;
  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c2, v_s9, 5, 'Khoa hoc xung dang moi dong tien. Mo phong rat tot.')
  ON CONFLICT (course_id, student_id) DO NOTHING;
  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c3, v_s17, 4, 'May diesel trinh bay de hieu, nhieu hinh anh minh hoa.')
  ON CONFLICT (course_id, student_id) DO NOTHING;
  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c3, v_s16, 5, 'Rat tot cho ky su may hang ba. Kien thuc PMS rat huu ich.')
  ON CONFLICT (course_id, student_id) DO NOTHING;
  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c5, v_s1, 5, 'An toan co ban rat quan trong. Ai di bien cung nen hoc.')
  ON CONFLICT (course_id, student_id) DO NOTHING;
  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c5, v_s2, 5, 'Giang vien rat nghiem tuc, thuc hanh nhieu.')
  ON CONFLICT (course_id, student_id) DO NOTHING;
  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c5, v_s7, 4, 'Tot nhung can them video thuc hanh.')
  ON CONFLICT (course_id, student_id) DO NOTHING;
  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c8, v_s5, 4, 'Luat hang hai phuc tap nhung giang vien trinh bay de hieu.')
  ON CONFLICT (course_id, student_id) DO NOTHING;
  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c7, v_s14, 4, 'Logistics thuc te, nhieu case study hay.')
  ON CONFLICT (course_id, student_id) DO NOTHING;
  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c7, v_s3, 5, 'Rat bo ich cho nguoi lam logistics hang hai.')
  ON CONFLICT (course_id, student_id) DO NOTHING;
  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c9, v_s8, 4, 'Khi tuong va dieu dong nang cao, can co nen tang truoc.')
  ON CONFLICT (course_id, student_id) DO NOTHING;
  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c10, v_s2, 5, 'Tieng Anh hang hai rat can thiet, SMCP rat huu ich.')
  ON CONFLICT (course_id, student_id) DO NOTHING;
  INSERT INTO course_reviews (course_id, student_id, rating, comment)
  VALUES (v_c10, v_s10, 4, 'Giao tiep VHF thuc hanh tot, can them listening.')
  ON CONFLICT (course_id, student_id) DO NOTHING;

END $$;

-- Remove temporary defaults
ALTER TABLE learning_classes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE enrollments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE packages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE questions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE questions ALTER COLUMN usage_count DROP DEFAULT;
ALTER TABLE question_options ALTER COLUMN id DROP DEFAULT;
ALTER TABLE quizzes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE quiz_questions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE assignments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE assignments ALTER COLUMN created_at DROP DEFAULT;

-- Cleanup helper function
DROP FUNCTION IF EXISTS _qc(TEXT);

-- Refresh materialized views
REFRESH MATERIALIZED VIEW mv_course_stats;
REFRESH MATERIALIZED VIEW mv_teacher_performance;