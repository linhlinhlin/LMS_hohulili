-- V54: Seed production data — Users, Courses, Chapters, Lessons
-- Vietnamese Maritime Education content aligned with IMO STCW standards
-- Created: 2026-02-25 (Session 89)
-- Idempotent: ON CONFLICT DO NOTHING for all inserts

-- Temporary defaults for seed data (tables created by JPA without defaults)
ALTER TABLE chapters ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE chapters ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE lessons ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE lessons ALTER COLUMN created_at SET DEFAULT NOW();

-- =============================================
-- 1. USERS (2 new admins + 10 new teachers + 25 new students)
-- =============================================
-- Passwords: Teachers = Maritime@2026, Students = Student@2026
-- BCrypt hashes generated with strength 10

-- 1.1 Admin accounts
INSERT INTO users (id, username, email, password, full_name, role, enabled, created_at)
VALUES
  (gen_random_uuid(), 'phamvanhai', 'phamvanhai@maritime.edu',
   '$2a$10$sfYhT8xEdIY1mErK.nMXfuATVYa1Ml396prqGLGO2zjbxgCDCWnX.',
   'PGS.TS Pham Van Hai', 'ADMIN', true, NOW() - INTERVAL '180 days'),
  (gen_random_uuid(), 'nguyenlanhuong', 'nguyenlanhuong@maritime.edu',
   '$2a$10$sfYhT8xEdIY1mErK.nMXfuATVYa1Ml396prqGLGO2zjbxgCDCWnX.',
   'ThS. Nguyen Thi Lan Huong', 'ORG_ADMIN', true, NOW() - INTERVAL '150 days')
ON CONFLICT (email) DO NOTHING;

-- 1.2 Teacher accounts
INSERT INTO users (id, username, email, password, full_name, role, enabled, created_at)
VALUES
  (gen_random_uuid(), 'tranngocdai', 'tranngocdai@maritime.edu',
   '$2a$10$sfYhT8xEdIY1mErK.nMXfuATVYa1Ml396prqGLGO2zjbxgCDCWnX.',
   'PGS.TS Tran Ngoc Dai', 'TEACHER', true, NOW() - INTERVAL '200 days'),
  (gen_random_uuid(), 'levanhung', 'levanhung@maritime.edu',
   '$2a$10$sfYhT8xEdIY1mErK.nMXfuATVYa1Ml396prqGLGO2zjbxgCDCWnX.',
   'TS. Le Van Hung', 'TEACHER', true, NOW() - INTERVAL '190 days'),
  (gen_random_uuid(), 'nguyenminhquan', 'nguyenminhquan@maritime.edu',
   '$2a$10$sfYhT8xEdIY1mErK.nMXfuATVYa1Ml396prqGLGO2zjbxgCDCWnX.',
   'PGS.TS Nguyen Minh Quan', 'TEACHER', true, NOW() - INTERVAL '195 days'),
  (gen_random_uuid(), 'phamthihanh', 'phamthihanh@maritime.edu',
   '$2a$10$sfYhT8xEdIY1mErK.nMXfuATVYa1Ml396prqGLGO2zjbxgCDCWnX.',
   'TS. Pham Thi Hanh', 'TEACHER', true, NOW() - INTERVAL '185 days'),
  (gen_random_uuid(), 'vudinhthang', 'vudinhthang@maritime.edu',
   '$2a$10$sfYhT8xEdIY1mErK.nMXfuATVYa1Ml396prqGLGO2zjbxgCDCWnX.',
   'PGS.TS Vu Dinh Thang', 'TEACHER', true, NOW() - INTERVAL '210 days'),
  (gen_random_uuid(), 'doanvannam', 'doanvannam@maritime.edu',
   '$2a$10$sfYhT8xEdIY1mErK.nMXfuATVYa1Ml396prqGLGO2zjbxgCDCWnX.',
   'TS. Doan Van Nam', 'TEACHER', true, NOW() - INTERVAL '175 days'),
  (gen_random_uuid(), 'hoangthimai', 'hoangthimai@maritime.edu',
   '$2a$10$sfYhT8xEdIY1mErK.nMXfuATVYa1Ml396prqGLGO2zjbxgCDCWnX.',
   'PGS.TS Hoang Thi Mai', 'TEACHER', true, NOW() - INTERVAL '160 days'),
  (gen_random_uuid(), 'buithanhson', 'buithanhson@maritime.edu',
   '$2a$10$sfYhT8xEdIY1mErK.nMXfuATVYa1Ml396prqGLGO2zjbxgCDCWnX.',
   'TS. Bui Thanh Son', 'TEACHER', true, NOW() - INTERVAL '165 days'),
  (gen_random_uuid(), 'nguyenducanh', 'nguyenducanh@maritime.edu',
   '$2a$10$sfYhT8xEdIY1mErK.nMXfuATVYa1Ml396prqGLGO2zjbxgCDCWnX.',
   'TS. Nguyen Duc Anh', 'TEACHER', true, NOW() - INTERVAL '155 days'),
  (gen_random_uuid(), 'lethimylinh', 'lethimylinh@maritime.edu',
   '$2a$10$sfYhT8xEdIY1mErK.nMXfuATVYa1Ml396prqGLGO2zjbxgCDCWnX.',
   'ThS. Le Thi My Linh', 'TEACHER', true, NOW() - INTERVAL '140 days')
ON CONFLICT (email) DO NOTHING;

-- 1.3 Student accounts
INSERT INTO users (id, username, email, password, full_name, role, enabled, created_at)
VALUES
  (gen_random_uuid(), 'nguyenvanan', 'nguyenvanan@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Nguyen Van An', 'STUDENT', true, NOW() - INTERVAL '120 days'),
  (gen_random_uuid(), 'tranthibinh', 'tranthibinh@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Tran Thi Binh', 'STUDENT', true, NOW() - INTERVAL '115 days'),
  (gen_random_uuid(), 'lehoangcuong', 'lehoangcuong@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Le Hoang Cuong', 'STUDENT', true, NOW() - INTERVAL '110 days'),
  (gen_random_uuid(), 'phamthidung', 'phamthidung@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Pham Thi Dung', 'STUDENT', true, NOW() - INTERVAL '105 days'),
  (gen_random_uuid(), 'vovanem', 'vovanem@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Vo Van Em', 'STUDENT', true, NOW() - INTERVAL '100 days'),
  (gen_random_uuid(), 'dangthiphuong', 'dangthiphuong@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Dang Thi Phuong', 'STUDENT', true, NOW() - INTERVAL '98 days'),
  (gen_random_uuid(), 'hoangvangiang', 'hoangvangiang@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Hoang Van Giang', 'STUDENT', true, NOW() - INTERVAL '95 days'),
  (gen_random_uuid(), 'ngothihue', 'ngothihue@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Ngo Thi Hue', 'STUDENT', true, NOW() - INTERVAL '90 days'),
  (gen_random_uuid(), 'buivankhoi', 'buivankhoi@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Bui Van Khoi', 'STUDENT', true, NOW() - INTERVAL '88 days'),
  (gen_random_uuid(), 'lythilan', 'lythilan@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Ly Thi Lan', 'STUDENT', true, NOW() - INTERVAL '85 days'),
  (gen_random_uuid(), 'trinhvanminh', 'trinhvanminh@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Trinh Van Minh', 'STUDENT', true, NOW() - INTERVAL '82 days'),
  (gen_random_uuid(), 'nguyenthinga', 'nguyenthinga@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Nguyen Thi Nga', 'STUDENT', true, NOW() - INTERVAL '80 days'),
  (gen_random_uuid(), 'doducthanh', 'doducthanh@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Do Duc Thanh', 'STUDENT', true, NOW() - INTERVAL '78 days'),
  (gen_random_uuid(), 'vuthiphuong', 'vuthiphuong@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Vu Thi Phuong', 'STUDENT', true, NOW() - INTERVAL '75 days'),
  (gen_random_uuid(), 'levanquy', 'levanquy@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Le Van Quy', 'STUDENT', true, NOW() - INTERVAL '72 days'),
  (gen_random_uuid(), 'phamhoangson', 'phamhoangson@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Pham Hoang Son', 'STUDENT', true, NOW() - INTERVAL '70 days'),
  (gen_random_uuid(), 'tranvantuan', 'tranvantuan@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Tran Van Tuan', 'STUDENT', true, NOW() - INTERVAL '68 days'),
  (gen_random_uuid(), 'nguyenthiuyen', 'nguyenthiuyen@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Nguyen Thi Uyen', 'STUDENT', true, NOW() - INTERVAL '65 days'),
  (gen_random_uuid(), 'hoangvanvinh', 'hoangvanvinh@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Hoang Van Vinh', 'STUDENT', true, NOW() - INTERVAL '60 days'),
  (gen_random_uuid(), 'dangthixuan', 'dangthixuan@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Dang Thi Xuan', 'STUDENT', true, NOW() - INTERVAL '58 days'),
  (gen_random_uuid(), 'buivanduy', 'buivanduy@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Bui Van Duy', 'STUDENT', true, NOW() - INTERVAL '55 days'),
  (gen_random_uuid(), 'lethihong', 'lethihong@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Le Thi Hong', 'STUDENT', true, NOW() - INTERVAL '50 days'),
  (gen_random_uuid(), 'ngovanlong', 'ngovanlong@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Ngo Van Long', 'STUDENT', true, NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), 'phamthioanh', 'phamthioanh@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Pham Thi Oanh', 'STUDENT', true, NOW() - INTERVAL '40 days'),
  (gen_random_uuid(), 'trinhducphuc', 'trinhducphuc@sv.maritime.edu',
   '$2a$10$BMpyxrWkmhMGZoHui8OmkOX5W2M.sTYB1J0drmtkvVOywxPoB9Y2a',
   'Trinh Duc Phuc', 'STUDENT', true, NOW() - INTERVAL '35 days')
ON CONFLICT (email) DO NOTHING;


-- =============================================
-- 2. COURSES (10 STCW-aligned maritime courses)
-- =============================================
-- Uses DO block to resolve category_id and teacher_id by lookup

DO $$ DECLARE
  v_cat_nav UUID;
  v_cat_eng UUID;
  v_cat_saf UUID;
  v_cat_log UUID;
  v_cat_law UUID;
  v_admin UUID;
  v_t1 UUID; v_t2 UUID; v_t3 UUID; v_t4 UUID; v_t5 UUID;
  v_t6 UUID; v_t7 UUID; v_t8 UUID; v_t9 UUID; v_t10 UUID;
BEGIN
  -- Resolve category IDs
  SELECT id INTO v_cat_nav FROM categories WHERE code = 'NAVIGATION';
  SELECT id INTO v_cat_eng FROM categories WHERE code = 'ENGINEERING';
  SELECT id INTO v_cat_saf FROM categories WHERE code = 'SAFETY';
  SELECT id INTO v_cat_log FROM categories WHERE code = 'LOGISTICS';
  SELECT id INTO v_cat_law FROM categories WHERE code = 'LAW';

  -- Resolve admin for reviewed_by
  SELECT id INTO v_admin FROM users WHERE email = 'admin@maritime.edu';

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

  -- Course 1: NAV-101 Hang hai Dia van (FREE, SELF_PACED)
  INSERT INTO courses (id, code, title, description, status, teacher_id, category_id,
    welcome_message, course_information, benefits, price_type, price, delivery_mode, visibility,
    reviewed_by_id, reviewed_at, created_at)
  VALUES (gen_random_uuid(), 'NAV-101',
    'Hang hai Dia van va La ban Tu',
    'Khoa hoc co ban ve hang hai dia van, bao gom cac phuong phap xac dinh vi tri tau bang thien van, la ban tu va la ban con quay. Phu hop voi sinh vien nam 2-3 nganh Dieu khien tau bien theo chuan STCW.',
    'APPROVED', v_t1, v_cat_nav,
    'Chao mung cac ban den voi khoa hoc Hang hai Dia van! Day la nen tang cua nghe di bien.',
    'Khoa hoc gom 7 chuong, 40 bai hoc bao gom ly thuyet va thuc hanh. Yeu cau: Toan co ban, Vat ly dai cuong.',
    'Xac dinh vi tri tau bang thien van va la ban. Su dung hai do va cac cong cu hang hai truyen thong. Hieu nguyen ly la ban tu va la ban con quay. Tinh toan sai so la ban va hieu chinh.',
    'FREE', 0, 'SELF_PACED', 'PUBLIC',
    v_admin, NOW() - INTERVAL '30 days', NOW() - INTERVAL '120 days')
  ON CONFLICT (code) DO NOTHING;

  -- Course 2: NAV-201 ECDIS va Radar/ARPA (PAID, INSTRUCTOR_LED)
  INSERT INTO courses (id, code, title, description, status, teacher_id, category_id,
    welcome_message, course_information, benefits, price_type, price, delivery_mode, visibility,
    reviewed_by_id, reviewed_at, created_at)
  VALUES (gen_random_uuid(), 'NAV-201',
    'He thong Dan duong Dien tu ECDIS va Radar/ARPA',
    'Khoa hoc nang cao ve he thong ECDIS, Radar va ARPA theo chuan IMO Model Course 1.27 va 1.07. Bao gom thuc hanh mo phong tren phan mem chuyen dung.',
    'APPROVED', v_t2, v_cat_nav,
    'Chao mung den voi khoa hoc ECDIS & Radar/ARPA nang cao!',
    'Khoa hoc 6 chuong, 32 bai hoc. Yeu cau: Hoan thanh NAV-101 hoac tuong duong. Can laptop cai phan mem mo phong.',
    'Van hanh thanh thao he thong ECDIS theo IMO. Phan tich muc tieu Radar va su dung ARPA. Lap ke hoach hanh trinh dien tu. Xu ly tinh huong khan cap bang thiet bi dien tu.',
    'PAID', 2500000, 'INSTRUCTOR_LED', 'PUBLIC',
    v_admin, NOW() - INTERVAL '25 days', NOW() - INTERVAL '100 days')
  ON CONFLICT (code) DO NOTHING;

  -- Course 3: ENG-101 May Diesel Tau bien (PAID, SELF_PACED)
  INSERT INTO courses (id, code, title, description, status, teacher_id, category_id,
    welcome_message, course_information, benefits, price_type, price, delivery_mode, visibility,
    reviewed_by_id, reviewed_at, created_at)
  VALUES (gen_random_uuid(), 'ENG-101',
    'May Diesel Tau bien - Van hanh va Bao duong',
    'Khoa hoc toan dien ve dong co diesel hang hai, tu nguyen ly hoat dong den quy trinh bao duong dinh ky. Thiet ke theo chuan STCW A-III/1 cho may truong hang ba.',
    'APPROVED', v_t3, v_cat_eng,
    'Chao mung den voi khoa hoc May Diesel Tau bien!',
    '7 chuong, 38 bai hoc. Yeu cau: Co khi dai cuong, Nhiet dong luc hoc co ban.',
    'Hieu cau tao va nguyen ly dong co diesel 2 ky va 4 ky. Van hanh dong co chinh va dong co phu. Thuc hien bao duong dinh ky theo ke hoach PMS. Xu ly su co va sua chua co ban.',
    'PAID', 1800000, 'SELF_PACED', 'PUBLIC',
    v_admin, NOW() - INTERVAL '28 days', NOW() - INTERVAL '110 days')
  ON CONFLICT (code) DO NOTHING;

  -- Course 4: ENG-201 Dien va Tu dong hoa (PAID, INSTRUCTOR_LED)
  INSERT INTO courses (id, code, title, description, status, teacher_id, category_id,
    welcome_message, course_information, benefits, price_type, price, delivery_mode, visibility,
    reviewed_by_id, reviewed_at, created_at)
  VALUES (gen_random_uuid(), 'ENG-201',
    'He thong Dien va Tu dong hoa Tau bien',
    'Khoa hoc chuyen sau ve he thong dien tau bien, bao gom may phat dien, bang dien chinh, he thong tu dong hoa va dieu khien. Theo chuan STCW A-III/6.',
    'APPROVED', v_t4, v_cat_eng,
    'Chao mung den voi khoa hoc He thong Dien Tau bien!',
    '6 chuong, 30 bai hoc. Yeu cau: Dien ky thuat, Dien tu co ban, ENG-101 hoac tuong duong.',
    'Thiet ke va phan tich mach dien tau bien. Van hanh he thong phat va phan phoi dien. Lap trinh PLC va he thong SCADA. Bao tri phong ngua thiet bi dien.',
    'PAID', 3200000, 'INSTRUCTOR_LED', 'PUBLIC',
    v_admin, NOW() - INTERVAL '20 days', NOW() - INTERVAL '95 days')
  ON CONFLICT (code) DO NOTHING;

  -- Course 5: SAF-101 An toan Co ban STCW (FREE, SELF_PACED)
  INSERT INTO courses (id, code, title, description, status, teacher_id, category_id,
    welcome_message, course_information, benefits, price_type, price, delivery_mode, visibility,
    reviewed_by_id, reviewed_at, created_at)
  VALUES (gen_random_uuid(), 'SAF-101',
    'Huan luyen An toan Co ban STCW',
    'Khoa hoc bat buoc theo Cong uoc STCW ve an toan co ban cho thuyen vien. Bao gom ky nang song con, phong chay chua chay, so cuu va an toan ca nhan.',
    'APPROVED', v_t5, v_cat_saf,
    'Chao mung den voi khoa hoc An toan Co ban STCW!',
    '8 chuong, 35 bai hoc. Khong yeu cau kien thuc truoc. Bat buoc cho moi thuyen vien.',
    'Nam vung ky nang song con tren bien. Phong chay va chua chay co ban. So cuu y te co ban tren tau. Hieu va thuc hien an toan ca nhan va trach nhiem xa hoi.',
    'FREE', 0, 'SELF_PACED', 'PUBLIC',
    v_admin, NOW() - INTERVAL '35 days', NOW() - INTERVAL '130 days')
  ON CONFLICT (code) DO NOTHING;

  -- Course 6: SAF-201 Chua chay Nang cao (PAID, INSTRUCTOR_LED)
  INSERT INTO courses (id, code, title, description, status, teacher_id, category_id,
    welcome_message, course_information, benefits, price_type, price, delivery_mode, visibility,
    reviewed_by_id, reviewed_at, created_at)
  VALUES (gen_random_uuid(), 'SAF-201',
    'Chua chay Nang cao va Cuu ho',
    'Khoa hoc nang cao ve phong chay chua chay va cuu ho tren tau theo STCW A-VI/3. Bao gom chi huy doi chua chay, kiem soat thiet hai va cuu ho nguoi roi xuong bien.',
    'APPROVED', v_t6, v_cat_saf,
    'Chao mung den voi khoa hoc Chua chay Nang cao!',
    '5 chuong, 22 bai hoc. Yeu cau: Hoan thanh SAF-101.',
    'Chi huy doi chua chay tren tau. Su dung thiet bi chua chay co dinh. Kiem soat thiet hai sau chay. To chuc va chi huy cuu ho.',
    'PAID', 2800000, 'INSTRUCTOR_LED', 'PUBLIC',
    v_admin, NOW() - INTERVAL '18 days', NOW() - INTERVAL '85 days')
  ON CONFLICT (code) DO NOTHING;

  -- Course 7: LOG-101 Quan ly Chuoi cung ung (PAID, SELF_PACED)
  INSERT INTO courses (id, code, title, description, status, teacher_id, category_id,
    welcome_message, course_information, benefits, price_type, price, delivery_mode, visibility,
    reviewed_by_id, reviewed_at, created_at)
  VALUES (gen_random_uuid(), 'LOG-101',
    'Quan ly Chuoi cung ung va Van tai Bien',
    'Khoa hoc ve quan ly chuoi cung ung trong nganh hang hai, tu van tai container den quan ly cang bien va logistics quoc te.',
    'APPROVED', v_t7, v_cat_log,
    'Chao mung den voi khoa hoc Logistics Hang hai!',
    '6 chuong, 28 bai hoc. Yeu cau: Kinh te vi mo, Quan tri kinh doanh co ban.',
    'Hieu chuoi cung ung hang hai toan cau. Quan ly van tai container va hang roi. Toi uu hoa hoat dong cang bien. Ung dung cong nghe trong logistics.',
    'PAID', 1500000, 'SELF_PACED', 'PUBLIC',
    v_admin, NOW() - INTERVAL '22 days', NOW() - INTERVAL '90 days')
  ON CONFLICT (code) DO NOTHING;

  -- Course 8: LAW-101 Luat Hang hai (FREE, SELF_PACED)
  INSERT INTO courses (id, code, title, description, status, teacher_id, category_id,
    welcome_message, course_information, benefits, price_type, price, delivery_mode, visibility,
    reviewed_by_id, reviewed_at, created_at)
  VALUES (gen_random_uuid(), 'LAW-101',
    'Luat Hang hai Quoc te va Viet Nam',
    'Khoa hoc toan dien ve phap luat hang hai quoc te (UNCLOS, SOLAS, MARPOL) va Luat Hang hai Viet Nam 2015. Bao gom hop dong van chuyen, bao hiem va giai quyet tranh chap.',
    'APPROVED', v_t8, v_cat_law,
    'Chao mung den voi khoa hoc Luat Hang hai!',
    '6 chuong, 28 bai hoc. Yeu cau: Phap luat dai cuong.',
    'Nam vung khung phap ly hang hai quoc te. Hieu Luat Hang hai Viet Nam 2015. Phan tich hop dong van chuyen va bao hiem. Giai quyet tranh chap hang hai.',
    'FREE', 0, 'SELF_PACED', 'PUBLIC',
    v_admin, NOW() - INTERVAL '26 days', NOW() - INTERVAL '105 days')
  ON CONFLICT (code) DO NOTHING;

  -- Course 9: NAV-301 Khi tuong Hai duong (PAID, INSTRUCTOR_LED)
  INSERT INTO courses (id, code, title, description, status, teacher_id, category_id,
    welcome_message, course_information, benefits, price_type, price, delivery_mode, visibility,
    reviewed_by_id, reviewed_at, created_at)
  VALUES (gen_random_uuid(), 'NAV-301',
    'Khi tuong Hai duong va Dieu dong Tau',
    'Khoa hoc chuyen sau ve khi tuong thuy van ung dung trong hang hai va ky thuat dieu dong tau trong cac dieu kien thoi tiet phuc tap. Theo chuan STCW A-II/2.',
    'APPROVED', v_t9, v_cat_nav,
    'Chao mung den voi khoa hoc Khi tuong va Dieu dong Tau!',
    '5 chuong, 22 bai hoc. Yeu cau: NAV-101, NAV-201 hoac tuong duong.',
    'Doc va phan tich ban do thoi tiet. Tranh bao va thoi tiet xau. Dieu dong tau trong vung nuoc han che. Ky thuat neo dau va cap cang an toan.',
    'PAID', 2200000, 'INSTRUCTOR_LED', 'PUBLIC',
    v_admin, NOW() - INTERVAL '15 days', NOW() - INTERVAL '80 days')
  ON CONFLICT (code) DO NOTHING;

  -- Course 10: NAV-102 Tieng Anh Hang hai (PAID, SELF_PACED)
  INSERT INTO courses (id, code, title, description, status, teacher_id, category_id,
    welcome_message, course_information, benefits, price_type, price, delivery_mode, visibility,
    reviewed_by_id, reviewed_at, created_at)
  VALUES (gen_random_uuid(), 'NAV-102',
    'Tieng Anh Hang hai Chuyen nganh',
    'Khoa hoc tieng Anh chuyen nganh hang hai theo IMO SMCP (Standard Marine Communication Phrases). Bao gom thuat ngu hang hai, giao tiep VHF va viet bao cao.',
    'APPROVED', v_t10, v_cat_nav,
    'Welcome to Maritime English! Chao mung den voi khoa hoc Tieng Anh Hang hai!',
    '5 chuong, 20 bai hoc. Yeu cau: Tieng Anh B1 (CEFR) tro len.',
    'Su dung thuat ngu hang hai bang tieng Anh. Giao tiep VHF theo IMO SMCP. Viet bao cao hang hai (Logbook, Protest). Doc hieu tai lieu ky thuat tieng Anh.',
    'PAID', 800000, 'SELF_PACED', 'PUBLIC',
    v_admin, NOW() - INTERVAL '12 days', NOW() - INTERVAL '75 days')
  ON CONFLICT (code) DO NOTHING;

  -- Course tags
  INSERT INTO course_tags (course_id, tag_name)
  SELECT c.id, t.tag FROM courses c, (VALUES
    ('NAV-101', 'hang-hai'), ('NAV-101', 'dia-van'), ('NAV-101', 'la-ban'), ('NAV-101', 'STCW'),
    ('NAV-201', 'ECDIS'), ('NAV-201', 'Radar'), ('NAV-201', 'ARPA'), ('NAV-201', 'IMO'),
    ('ENG-101', 'diesel'), ('ENG-101', 'may-tau'), ('ENG-101', 'bao-duong'), ('ENG-101', 'STCW'),
    ('ENG-201', 'dien-tau'), ('ENG-201', 'tu-dong-hoa'), ('ENG-201', 'PLC'), ('ENG-201', 'SCADA'),
    ('SAF-101', 'an-toan'), ('SAF-101', 'STCW'), ('SAF-101', 'song-con'), ('SAF-101', 'so-cuu'),
    ('SAF-201', 'chua-chay'), ('SAF-201', 'cuu-ho'), ('SAF-201', 'STCW'),
    ('LOG-101', 'logistics'), ('LOG-101', 'container'), ('LOG-101', 'cang-bien'),
    ('LAW-101', 'UNCLOS'), ('LAW-101', 'SOLAS'), ('LAW-101', 'MARPOL'), ('LAW-101', 'luat-hang-hai'),
    ('NAV-301', 'khi-tuong'), ('NAV-301', 'dieu-dong'), ('NAV-301', 'thoi-tiet'),
    ('NAV-102', 'tieng-anh'), ('NAV-102', 'SMCP'), ('NAV-102', 'VHF')
  ) AS t(code, tag) WHERE c.code = t.code
  ON CONFLICT DO NOTHING;

END $$;


-- =============================================
-- 3. CHAPTERS & LESSONS
-- =============================================
-- Helper function for content blocks
CREATE OR REPLACE FUNCTION _sc(p_html TEXT) RETURNS JSONB AS $fn$
SELECT jsonb_build_array(jsonb_build_object(
  'id', gen_random_uuid()::text, 'type', 'text',
  'data', jsonb_build_object('content', p_html)
));
$fn$ LANGUAGE sql;

-- Course: NAV-101
DO $$ DECLARE v_c UUID; v_ch UUID;
BEGIN
  SELECT id INTO v_c FROM courses WHERE code = 'NAV-101';
  IF v_c IS NULL THEN RETURN; END IF;

  -- Chapter 1: Khai quat ve Hang hai Dia van
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Khai quat ve Hang hai Dia van', 'Cac khai niem nen tang ve hang hai dia van', 0)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Lich su hang hai va phat trien nghe di bien', 'LECTURE', 30, 0, true, _sc('<h2>Lich su Hang hai</h2><p>Hang hai la nghe lau doi nhat cua nhan loai. Tu thoi Phoenicia (1500 TCN), con nguoi kham pha dai duong bang thuyen go. La ban tu phat minh the ky 11 la buoc ngoat lon.</p><p>Tai Viet Nam, truyen thong hang hai gan lien lich su dan toc. Tu thuyen buom Champa den doi tau hien dai, nganh hang hai phat trien vuot bac voi hon 40 cang bien.</p><ul><li>Co dai: Hang hai bang quan sat sao va dong chay</li><li>The ky 15-17: Dai hang hai Columbus, Magellan</li><li>Hien dai: GPS, ECDIS, AIS</li></ul>')),
    (v_ch, 'He toa do dia ly va hai do', 'LECTURE', 35, 1, false, _sc('<h2>He Toa do Dia ly</h2><p>He toa do dia ly dung kinh do va vi do xac dinh vi tri. Vi do do tu xich dao (0) den cac cuc (90 N/S). Kinh do do tu Greenwich (0) den 180 E/W.</p><p>Hai do (nautical chart) la ban do chuyen dung cho hang hai, the hien do sau, luong, den bieu. Hai do dung phep chieu Mercator chuyen mat cau sang phang.</p><p>Mot hai ly = 1.852 km = 1 phut vi do.</p>')),
    (v_ch, 'Khai niem co ban: vi do, kinh do, hai ly', 'LECTURE', 25, 2, false, _sc('<h2>Vi do, Kinh do, Hai ly</h2><p>Vi do (Latitude) la goc tu xich dao den mot diem, 0-90 N/S. Hai Phong: 20d52N. Kinh do (Longitude) la goc tu kinh tuyen goc, 0-180 E/W. Hai Phong: 106d41E.</p><p>Hai ly (NM) = 1.852m = 1 phut vi do. Toc do 1 NM/h = 1 knot.</p><p>Trong hang hai, toa do ghi: dd mm.m N/S, ddd mm.m E/W. Vi du: 20 52.3N 106 41.5E.</p>')),
    (v_ch, 'Trai Dat va cac duong tren mat cau', 'LECTURE', 30, 3, false, _sc('<h2>Duong tren Mat cau</h2><p>Trai Dat hinh cau det. Cac duong quan trong:</p><ul><li>Kinh tuyen (Meridian): nua vong tron noi 2 cuc</li><li>Vi tuyen (Parallel): vong tron song song xich dao</li><li>Chinh ngo (Great Circle): duong ngan nhat giua 2 diem tren cau</li><li>Duong hang hai (Rhumb Line): cat kinh tuyen cung goc, thang tren Mercator</li></ul><p>Chinh ngo ngan hon rhumb line nhung kho lai vi huong thay doi lien tuc.</p>')),
    (v_ch, 'Hai do giay va hai do dien tu', 'LECTURE', 35, 4, false, _sc('<h2>Hai do Giay va Dien tu</h2><p>Hai do giay in tren giay chiu nuoc, ti le 1:25.000 (cang) den 1:500.000 (bien rong). Thuyen vien phai doc duoc ky hieu, mau sac.</p><p>Hai do dien tu (ENC) dung trong ECDIS, dinh dang S-57/S-100 cua IHO. Uu diem: tu dong cap nhat, hien thi vi tri thoi gian thuc, bao dong nguy hiem.</p><p>Tu 2018, SOLAS yeu cau tau quoc te phai co ECDIS. Hai do giay van la phuong tien du phong.</p>')),
    (v_ch, 'Kiem tra chuong 1', 'QUIZ', 20, 5, false, NULL);

  -- Chapter 2: La ban Tu va La ban Con quay
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'La ban Tu va La ban Con quay', 'Nguyen ly, cau tao, su dung la ban tu va con quay', 1)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Nguyen ly la ban tu', 'LECTURE', 30, 0, false, _sc('<h2>La ban Tu</h2><p>La ban tu hoat dong dua tren tu truong Trai Dat. Kim la ban chi huong cuc tu Bac. Cau tao: mat so 360 do, kim tu, phao noi trong chat long giam chan dong, buong la ban (binnacle).</p><p>Tu truong 25-65 microTesla, manh nhat gan cuc tu. La ban tu khong can dien, do tin cay cao, la du phong khi thiet bi dien tu hong.</p>')),
    (v_ch, 'Sai so la ban: Doc sai va Dao sai', 'LECTURE', 35, 1, false, _sc('<h2>Doc sai va Dao sai</h2><p>Doc sai (Variation): sai so do cuc tu khong trung cuc dia ly. Thay doi theo vi tri va thoi gian, ghi tren hai do.</p><p>Dao sai (Deviation): do anh huong sat thep va thiet bi dien tren tau. Thay doi theo huong mui, ghi trong Bang sai so (Deviation Card).</p><p>Cong thuc: True = Compass + Variation + Deviation (T = C + V + D)</p>')),
    (v_ch, 'Bang sai so la ban va hieu chinh', 'LECTURE', 30, 2, false, _sc('<h2>Hieu chinh La ban</h2><p>Bang sai so ghi dao sai theo tung huong (cach 15 hoac 30 do). Hieu chinh la ban:</p><ol><li>Dat tau theo huong chinh N,E,S,W va do sai so</li><li>Dung nam cham hieu chinh giam dao sai</li><li>Lap bang sai so moi</li><li>Thuyen truong ky xac nhan</li></ol><p>SOLAS: hieu chinh it nhat 1 lan/nam.</p>')),
    (v_ch, 'La ban con quay: nguyen ly', 'LECTURE', 35, 3, false, _sc('<h2>La ban Con quay</h2><p>La ban con quay dung hieu ung con quay hoi chuyen. Rotor quay 12.000-20.000 vong/phut, ket hop quay Trai Dat, tu dong tim Bac that.</p><ul><li>Chi Bac that, khong bi tu truong</li><li>Ket noi Radar, ECDIS, lai tu dong</li><li>Chinh xac 0.5-1 do</li></ul><p>Nhuoc: can dien on dinh, 4-6h on dinh, sai so tang o vi do cao. Hang: Sperry, Raytheon Anschutz.</p>')),
    (v_ch, 'So sanh la ban tu va con quay', 'LECTURE', 25, 4, false, _sc('<h2>So sanh hai loai La ban</h2><p>La ban tu: khong can dien, chi Bac tu, sai so Var+Dev, doc lap, do tin cay rat cao.</p><p>La ban con quay: can dien 3 pha, chi Bac that, sai so theo vi do/toc do, ket noi thiet bi, chinh xac cao.</p><p>SOLAS: tau phai co it nhat 1 la ban tu (du phong) va 1 con quay (chinh). Sy quan phai thanh thao ca hai.</p>')),
    (v_ch, 'Kiem tra chuong 2', 'QUIZ', 20, 5, false, NULL);

  -- Chapter 3: Xac dinh Phuong huong
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Xac dinh Phuong huong', 'Chuyen doi huong that, huong tu, huong la ban', 2)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'He thong phuong huong 360 do', 'LECTURE', 25, 0, false, _sc('<h2>Phuong huong 360 do</h2><p>Bac=000, Dong=090, Nam=180, Tay=270. Dung 3 chu so (045, 180, 005).</p><p>Ba loai huong: Huong that (True-T) tu Bac that; Huong tu (Magnetic-M) tu Bac tu, M=T-Var; Huong la ban (Compass-C) doc tren la ban, C=M-Dev.</p><p>Tu T sang C tru, tu C sang T cong: T = C + Dev + Var.</p>')),
    (v_ch, 'Huong that, huong la ban, huong tu', 'LECTURE', 35, 1, false, _sc('<h2>Chuyen doi Huong</h2><p>Tren hai do lam viec huong that. Tren la ban doc huong compass. Chenh lech = Var + Dev.</p><p>Vi du: Compass 045, Dev 2E, Var 1W. True = 045 + 2 + (-1) = 046.</p><p>Quy uoc: Dong mang +, Tay mang -. Ket qua phai trong 000-360.</p>')),
    (v_ch, 'Bai tap chuyen doi huong', 'LECTURE', 30, 2, false, _sc('<h2>Bai tap Chuyen doi</h2><p>Bai 1: C=120, Dev=3E, Var=2W. T=120+3-2=121.</p><p>Bai 2: T=245, Var=1.5W, Dev=4W. C=245-(-4)-(-1.5)=250.5.</p><p>Bai 3: Tai 20d52N 106d41E, C=315, Var=1W(2020) giam 8phut/nam, Dev=2E. Var(2026)=0.2W. T=315+2-0.2=316.8.</p>')),
    (v_ch, 'Xac dinh huong di tau', 'LECTURE', 30, 3, false, _sc('<h2>Huong di Tau (Course)</h2><p>Huong di la huong tau can di den dich. Xac dinh tren hai do bang thuc do goc.</p><ol><li>Xac dinh vi tri hien tai va dich</li><li>Ke duong thang noi 2 diem</li><li>Do goc voi kinh tuyen</li><li>Doc True Course</li><li>Chuyen sang Compass Course de lai</li></ol><p>Khoang cach lon (tren 500NM) nen tinh Great Circle.</p>')),
    (v_ch, 'Thuc hanh chuyen doi huong', 'ASSIGNMENT', 40, 4, false, _sc('<h2>Bai tap Thuc hanh</h2><p>Hoan thanh 10 bai tap chuyen doi huong. Nop PDF. Trinh bay ro quy trinh, don vi, ky hieu. Lam tron 0.1 do.</p>')),
    (v_ch, 'Kiem tra chuong 3', 'QUIZ', 20, 5, false, NULL);

  -- Chapter 4: Phuong phap Xac dinh Vi tri Tau
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Phuong phap Xac dinh Vi tri Tau', 'Dead reckoning, phuong vi, radar, thien van', 3)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Vi tri uoc doan (Dead Reckoning)', 'LECTURE', 35, 0, false, _sc('<h2>Dead Reckoning</h2><p>Vi tri uoc doan dua tren vi tri truoc, huong di va toc do, khong tinh gio/dong chay. DR = Vi tri truoc + Huong x Khoang cach.</p><p>Vi du: Roi HP luc 08:00, huong 135T, toc do 12kts. Luc 10:00 DR cach 24NM huong 135.</p><p>Han che: sai lech tang theo thoi gian. Can kiem tra bang radar, GPS.</p>')),
    (v_ch, 'Duong vi tri bang phuong vi', 'LECTURE', 35, 1, false, _sc('<h2>Position Line</h2><p>Duong vi tri xac dinh bang do phuong vi den muc tieu biet vi tri (den bieu, mui dat). Tu 1 phuong vi biet tau nam tren 1 duong thang. Can 2 PL cat nhau de co Fix. Goc cat ly tuong 90 do.</p>')),
    (v_ch, 'Giao hai phuong vi (Cross Bearings)', 'LECTURE', 30, 2, false, _sc('<h2>Cross Bearings</h2><p>Do phuong vi 2-3 muc tieu cung luc, ke len hai do, giao diem la vi tri.</p><ol><li>Chon 2-3 muc tieu, goc 60-120 do</li><li>Do nhanh nhat co the</li><li>Chuyen Compass sang True</li><li>Ke len hai do, giao diem la Fix</li></ol><p>3 phuong vi tao tam giac nho (cocked hat) lay tam lam vi tri.</p>')),
    (v_ch, 'Vi tri bang khoang cach radar', 'LECTURE', 30, 3, false, _sc('<h2>Khoang cach Radar</h2><p>Radar do khoang cach chinh xac (sai so 1-2%). Do den 2-3 muc tieu, ve cung tron tren hai do, giao diem la vi tri.</p><p>Ket hop 1 phuong vi + 1 khoang cach den cung muc tieu: nhanh nhat khi chi co 1 muc tieu.</p>')),
    (v_ch, 'Vi tri thien van co ban', 'LECTURE', 35, 4, false, _sc('<h2>Thien van Co ban</h2><p>Dung sextant do goc cao thien the. Ghi UTC, tra Nautical Almanac, tinh Line of Position bang Marcq Saint-Hilaire. Giao 2 LOP = vi tri.</p><p>Du GPS pho bien, thien van van bat buoc trong STCW phong mat ve tinh.</p>')),
    (v_ch, 'Kiem tra chuong 4', 'QUIZ', 25, 5, false, NULL);

  -- Chapter 5: Hai do va Ke hoach Hanh trinh
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Hai do va Ke hoach Hanh trinh', 'Doc hai do, ky hieu, IMO passage planning', 4)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Doc hai do va ky hieu', 'LECTURE', 35, 0, false, _sc('<h2>Ky hieu Hai do</h2><p>Ky hieu IHO: Do sau (met/feet), Mau sac (Xanh=sau, Trang=can, Vang=dat), Den bieu (Fl,Oc,Iso,Q), Luong (IALA-A: xanh phai, do trai), Vung nguy hiem.</p><p>Tai lieu: INT 1 cua IHO.</p>')),
    (v_ch, 'Do sau va dia hinh day bien', 'LECTURE', 30, 1, false, _sc('<h2>Do sau Day bien</h2><p>Do sau = khoang cach tu Chart Datum (LAT) den day. Do sau thuc = hai do + thuy trieu.</p><p>Loai day: M(bun), S(cat), R(da), Co(san ho). Quan trong khi neo tau. Duong dong sau: 5m,10m,20m,50m,100m,200m.</p>')),
    (v_ch, 'Thong bao hang hai (NtM)', 'LECTURE', 25, 2, false, _sc('<h2>Notices to Mariners</h2><p>NtM cap nhat: den moi, do sau thay doi, vung cam. Cuc Hang hai VN phat hanh hang tuan.</p><p>Temporary, Preliminary, Permanent. Cap nhat hai do kip thoi, khong dung hai do chua cap nhat la vi pham SOLAS.</p>')),
    (v_ch, 'Lap ke hoach hanh trinh IMO', 'LECTURE', 40, 3, false, _sc('<h2>Passage Planning IMO</h2><p>IMO A.893(21) yeu cau ke hoach day du truoc khi roi cang. 4 giai doan:</p><ol><li>Appraisal: thu thap hai do, NtM, thoi tiet, thuy trieu</li><li>Planning: ve tuyen, tinh ETA, waypoints</li><li>Execution: thuyen truong duyet, thuc hien</li><li>Monitoring: so sanh vi tri thuc/ke hoach</li></ol>')),
    (v_ch, 'Bai tap: HP-Singapore', 'ASSIGNMENT', 45, 4, false, _sc('<h2>Ke hoach HP-Singapore</h2><p>Lap ke hoach tu HP den Singapore. Yeu cau: waypoints, khoang cach, huong di, ETA (12kts), thuy trieu, TSS, VTS, thoi tiet theo mua. Nop PDF.</p>')),
    (v_ch, 'Kiem tra chuong 5', 'QUIZ', 20, 5, false, NULL);

  -- Chapter 6: Thuy trieu va Dong chay
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Thuy trieu va Dong chay', 'Nguyen ly thuy trieu, bang thuy trieu, dong chay', 5)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Nguyen ly thuy trieu', 'LECTURE', 35, 0, false, _sc('<h2>Thuy trieu</h2><p>Thuy trieu do luc hap dan Mat Trang (2.2x) va Mat Troi. Nhat trieu (Vinh Bac Bo), Ban nhat trieu (pho bien), Hon hop (mien Trung).</p><p>Spring tide: Mat Trang-Troi thang hang, bien do lon. Neap tide: vuong goc, bien do nho.</p>')),
    (v_ch, 'Bang thuy trieu va tra cuu', 'LECTURE', 30, 1, false, _sc('<h2>Bang Thuy trieu</h2><p>Bang du bao thoi gian va do cao nuoc lon/rong tai cang chinh va phu. Viet Nam: Tong cuc Bien phat hanh hang nam.</p><p>Quy tac 1/12: chia 6 phan bang nhau, nuoc len 1/12-2/12-3/12-3/12-2/12-1/12 bien do.</p>')),
    (v_ch, 'Dong chay trong hang hai', 'LECTURE', 35, 2, false, _sc('<h2>Dong chay</h2><p>Dong trieu (thay doi 6-12h), hai luu (on dinh theo mua: Kuroshio), dong gio (tam thoi). Tau lai huong bu tru (Course to Steer) de di duong mong muon (Course Made Good). Dung tam giac toc do tinh toan.</p>')),
    (v_ch, 'Tinh toan do sau thuc te', 'LECTURE', 30, 3, false, _sc('<h2>Do sau Thuc te</h2><p>Do sau thuc = hai do + thuy trieu. Vi du: eo do sau 8.5m, draft 7.2m, UKC 1.5m. Can 8.7m, hai do 8.5m nen cho trieu len 0.2m.</p><p>UKC: 10-15% draft vung mo, 20% trong luong.</p>')),
    (v_ch, 'Kiem tra chuong 6', 'QUIZ', 20, 4, false, NULL);

  -- Chapter 7: Thi cuoi khoa
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Thi cuoi khoa', 'On tap tong hop va kiem tra cuoi khoa', 6)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'On tap kien thuc toan khoa', 'LECTURE', 40, 0, false, _sc('<h2>On tap</h2><p>Tong hop: Ch1 he toa do, Ch2 la ban, Ch3 chuyen doi huong, Ch4 xac dinh vi tri, Ch5 hai do/passage planning, Ch6 thuy trieu.</p><p>Thi: 25 trac nghiem + 2 tinh toan, 45 phut, dat 60/100.</p>')),
    (v_ch, 'Bai tap tong hop: Da Nang - Hai Phong', 'ASSIGNMENT', 60, 1, false, _sc('<h2>Hanh trinh DN-HP</h2><p>Ke hoach tu Tien Sa den HP. Waypoints, huong (T sang C), dong chay 1.5kts/020, do sau qua Hai Van (draft 6.5m, UKC 15%), TSS, VTS. Nop PDF 5 trang.</p>')),
    (v_ch, 'Phan mem hai do dien tu', 'VIDEO', 30, 2, false, NULL),
    (v_ch, 'Thi cuoi khoa', 'QUIZ', 45, 3, false, NULL),
    (v_ch, 'Tong ket va dinh huong', 'LECTURE', 20, 4, false, _sc('<h2>Tong ket</h2><p>Chuc mung hoan thanh! Buoc tiep: NAV-201 (ECDIS/Radar), NAV-301 (Khi tuong/Dieu dong), NAV-102 (Tieng Anh). Thuc hanh tren tau la then chot.</p>'));
  UPDATE lessons SET video_url = 'https://example.com/maritime/nav101-ch7-video.mp4'
  WHERE chapter_id = v_ch AND lesson_type = 'VIDEO';

END $$;
-- Course: NAV-201
DO $$ DECLARE v_c UUID; v_ch UUID;
BEGIN
  SELECT id INTO v_c FROM courses WHERE code = 'NAV-201';
  IF v_c IS NULL THEN RETURN; END IF;

  -- Chapter 1: Tong quan ECDIS
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Tong quan ECDIS', 'Gioi thieu he thong hai do dien tu ECDIS', 0)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'ECDIS la gi va tai sao quan trong', 'LECTURE', 30, 0, true, _sc('<h2>ECDIS Overview</h2><p>ECDIS (Electronic Chart Display and Information System) la he thong hien thi hai do dien tu theo chuan IMO. ECDIS ket hop ENC voi dinh vi GPS, Radar, AIS tao buc tranh hang hai toan dien.</p><p>Tu 2018 SOLAS bat buoc, ECDIS thay the hai do giay la phuong tien chinh.</p>')),
    (v_ch, 'Cau truc du lieu ENC S-57/S-100', 'LECTURE', 35, 1, false, _sc('<h2>ENC Data</h2><p>ENC luu theo S-57 (dang chuyen S-100). Gom lop (layer): do sau, duong bo, den bieu, luong. Moi doi tuong co thuoc tinh va quan he khong gian.</p><p>Cap nhat bang ban tin dien tu hang tuan. Khong duoc dung ENC het han.</p>')),
    (v_ch, 'Cai dat va cau hinh ECDIS', 'LECTURE', 35, 2, false, _sc('<h2>Cau hinh ECDIS</h2><p>Cai dat: sensor ket noi (GPS, Gyro, Radar, AIS, Anemometer), bao dong (do sau, CPA/TCPA), hien thi (ngay/dem/hoang hon), don vi do.</p><p>Truoc hanh trinh: kiem tra cap nhat ENC, backup, dong bo thoi gian UTC.</p>')),
    (v_ch, 'Route planning tren ECDIS', 'LECTURE', 40, 3, false, _sc('<h2>Route Planning ECDIS</h2><p>Tao tuyen: nhap waypoints, kiem tra tu dong (do sau, TSS, ECA). ECDIS bao dong neu tuyen di qua vung nguy hiem. Xuat ke hoach hanh trinh va chia se giua cac thiet bi.</p>')),
    (v_ch, 'Kiem tra chuong 1', 'QUIZ', 20, 4, false, NULL);

  -- Chapter 2: Radar hang hai
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Radar hang hai', 'Nguyen ly Radar va ung dung hang hai', 1)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Nguyen ly Radar va cac dai tan', 'LECTURE', 35, 0, false, _sc('<h2>Radar Principles</h2><p>Radar phat song dien tu, nhan phan xa tu muc tieu, xac dinh khoang cach va phuong vi. Dai X-band (9 GHz, phan giai cao) va S-band (3 GHz, tam xa).</p><p>Cac yeu to: cong suat, do rong xung, toc do quet, do nhay may thu.</p>')),
    (v_ch, 'Doc man hinh Radar va nhan dang muc tieu', 'LECTURE', 35, 1, false, _sc('<h2>Doc Radar</h2><p>Phan biet muc tieu that va gia (sea clutter, rain clutter, side lobes). Dieu chinh Gain, Sea, Rain. Nhan dang: tau, dat, phao, mua.</p><p>Che do: Head-up, North-up, Course-up. Chon phu hop muc dich.</p>')),
    (v_ch, 'Do khoang cach va phuong vi Radar', 'LECTURE', 30, 2, false, _sc('<h2>Do Radar</h2><p>VRM (Variable Range Marker) do khoang cach chinh xac 1%. EBL (Electronic Bearing Line) do phuong vi, chinh xac 1-2 do.</p><p>Ket hop VRM+EBL xac dinh vi tri nhanh tu 1 muc tieu.</p>')),
    (v_ch, 'Thuc hanh Radar mo phong', 'VIDEO', 35, 3, false, NULL),
    (v_ch, 'Kiem tra chuong 2', 'QUIZ', 20, 4, false, NULL);
  UPDATE lessons SET video_url = 'https://example.com/maritime/nav201-ch2-video.mp4'
  WHERE chapter_id = v_ch AND lesson_type = 'VIDEO';

  -- Chapter 3: He thong ARPA
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'He thong ARPA', 'Tu dong theo doi va phan tich va cham', 2)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'ARPA: theo doi tu dong muc tieu', 'LECTURE', 35, 0, false, _sc('<h2>ARPA Tracking</h2><p>ARPA (Automatic Radar Plotting Aid) tu dong theo doi muc tieu, tinh CPA (diem tiep can gan nhat) va TCPA (thoi gian den CPA).</p><p>Acquisition: tu dong va thu cong. Tracking: vector that/tuong doi.</p>')),
    (v_ch, 'CPA/TCPA va danh gia nguy co', 'LECTURE', 35, 1, false, _sc('<h2>CPA va TCPA</h2><p>CPA nho va TCPA ngan = nguy co cao. Nguong bao dong CPA thuong 1-2NM, TCPA 10-15 phut. Sy quan phai danh gia va hanh dong theo COLREG.</p>')),
    (v_ch, 'Trial manoeuvre va COLREG', 'LECTURE', 30, 2, false, _sc('<h2>Trial Manoeuvre</h2><p>Trial manoeuvre: mo phong doi huong/toc do de xem ket qua truoc khi hanh dong. Ket hop COLREG Rule 7,8,15,16,17 danh gia va ne tranh.</p>')),
    (v_ch, 'Bai tap mo phong ARPA', 'ASSIGNMENT', 40, 3, false, _sc('<h2>Mo phong ARPA</h2><p>Hoan thanh 5 kich ban tranh va cham tren phan mem mo phong. Ghi nhan CPA/TCPA truoc va sau hanh dong. Nop bao cao PDF.</p>')),
    (v_ch, 'Kiem tra chuong 3', 'QUIZ', 20, 4, false, NULL);

  -- Chapter 4: AIS va He thong Tich hop
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'AIS va He thong Tich hop', 'AIS, VDR, LRIT va tich hop buong lai', 3)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'AIS: He thong nhan dang tu dong', 'LECTURE', 35, 0, false, _sc('<h2>AIS Overview</h2><p>AIS phat/nhan thong tin tau (MMSI, vi tri, toc do, huong, ten tau, hang hoa). Class A (bat buoc tau SOLAS) va Class B (tau nho).</p><p>Hien thi tren ECDIS va Radar, tang nhan thuc tinh huong.</p>')),
    (v_ch, 'VDR va LRIT', 'LECTURE', 30, 1, false, _sc('<h2>VDR va LRIT</h2><p>VDR (Voyage Data Recorder) ghi du lieu hanh trinh 12h gan nhat (hop den tau). LRIT (Long Range Identification and Tracking) bao cao vi tri quoc te 4 lan/ngay.</p>')),
    (v_ch, 'Tich hop buong lai (INS)', 'LECTURE', 35, 2, false, _sc('<h2>Bridge Integration</h2><p>INS (Integrated Navigation System) ket noi ECDIS, Radar, AIS, Gyro, GPS, Autopilot. Du lieu chia se qua IEC 61162 (NMEA). Giam tai cho sy quan, tang an toan.</p>')),
    (v_ch, 'Kiem tra chuong 4', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 5: Xu ly Su co va An toan
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Xu ly Su co va An toan', 'Xu ly loi, backup, an toan hang hai dien tu', 4)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Xu ly su co ECDIS', 'LECTURE', 30, 0, false, _sc('<h2>ECDIS Troubleshooting</h2><p>Loi thuong gap: mat GPS, ENC het han, sensor disconnect. Chuyen sang backup ECDIS hoac hai do giay. Bao cao va ghi nhat ky.</p>')),
    (v_ch, 'An toan mang hang hai (Cyber Security)', 'LECTURE', 30, 1, false, _sc('<h2>Cyber Security</h2><p>IMO MSC.428(98): quan ly rui ro mang. Khong cam USB la, cap nhat phan mem, tach mang OT/IT. Kich ban tan cong: GPS spoofing, AIS spoofing.</p>')),
    (v_ch, 'Bai tap tong hop ECDIS-Radar', 'ASSIGNMENT', 45, 2, false, _sc('<h2>Bai tap Tong hop</h2><p>Hanh trinh HP-Da Nang tren ECDIS mo phong. Su dung Radar/ARPA ne tranh 3 tau. Xuat route report va screenshot. Nop PDF.</p>')),
    (v_ch, 'Thi cuoi khoa ECDIS va Radar', 'QUIZ', 45, 3, false, NULL);

  -- Chapter 6: Thuc hanh Mo phong
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Thuc hanh Mo phong', 'Thuc hanh tren simulator', 5)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Gioi thieu phan mem mo phong', 'VIDEO', 30, 0, false, NULL),
    (v_ch, 'Bai thuc hanh 1: Route planning', 'ASSIGNMENT', 45, 1, false, _sc('<h2>Thuc hanh Route</h2><p>Tao route tu Vung Tau den Singapore tren ECDIS simulator. Kiem tra do sau, TSS, ECA. Xuat route plan.</p>')),
    (v_ch, 'Bai thuc hanh 2: Radar plotting', 'ASSIGNMENT', 45, 2, false, _sc('<h2>Thuc hanh Radar</h2><p>5 kich ban Radar/ARPA: tau vuot, tau doi huong, tau cat mat, tau dung, nhieu muc tieu. Ghi CPA/TCPA, hanh dong COLREG.</p>')),
    (v_ch, 'Thi thuc hanh cuoi khoa', 'QUIZ', 60, 3, false, NULL);
  UPDATE lessons SET video_url = 'https://example.com/maritime/nav201-ch6-video.mp4'
  WHERE chapter_id = v_ch AND lesson_type = 'VIDEO';

END $$;
-- Course: ENG-101
DO $$ DECLARE v_c UUID; v_ch UUID;
BEGIN
  SELECT id INTO v_c FROM courses WHERE code = 'ENG-101';
  IF v_c IS NULL THEN RETURN; END IF;

  -- Chapter 1: Tong quan Dong co Diesel Hang hai
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Tong quan Dong co Diesel Hang hai', 'Lich su va phan loai dong co diesel tau', 0)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Lich su phat trien dong co diesel', 'LECTURE', 30, 0, true, _sc('<h2>Lich su Diesel</h2><p>Rudolf Diesel phat minh 1893. Dong co diesel hang hai phat trien tu 1912 (tau Selandia). Hien nay chiem 95% dong luc tau bien. Uu diem: hieu suat cao (45-55%), dung nhien lieu nang (HFO), tuoi tho dai.</p>')),
    (v_ch, 'Phan loai dong co diesel hang hai', 'LECTURE', 35, 1, false, _sc('<h2>Phan loai Diesel</h2><p>Theo chu ky: 2 ky (2-stroke) va 4 ky (4-stroke). Theo toc do: cham (<300rpm, dong co chinh), trung binh (300-1000rpm), nhanh (>1000rpm, may phat). Hang: MAN B&W, Wartsila, Caterpillar.</p>')),
    (v_ch, 'Nguyen ly hoat dong dong co 2 ky', 'LECTURE', 40, 2, false, _sc('<h2>Dong co 2 ky</h2><p>2 ky hoan thanh 1 chu trinh trong 1 vong quay truc. Hanh trinh: quet khi, nen, no, xa. Dong co chinh tau lon thuong la 2 ky, cham, crosshead, cong suat 10.000-100.000 kW. Vi du: MAN B&W 6S80ME-C.</p>')),
    (v_ch, 'Nguyen ly hoat dong dong co 4 ky', 'LECTURE', 35, 3, false, _sc('<h2>Dong co 4 ky</h2><p>4 ky: nap, nen, no, xa trong 2 vong quay. Dung cho may phat dien, may phu. Nho gon hon, toc do cao hon 2 ky. Vi du: Wartsila 6L20, Caterpillar 3516C.</p>')),
    (v_ch, 'He thong nhien lieu', 'LECTURE', 35, 4, false, _sc('<h2>Nhien lieu</h2><p>HFO (Heavy Fuel Oil): nhien lieu chinh, can ham nong 130-150C. MDO/MGO: nhien lieu nhe dung khi vao cang (vung ECA). He thong: két chua, loc, ham nong, bom cao ap, voi phun.</p>')),
    (v_ch, 'Kiem tra chuong 1', 'QUIZ', 20, 5, false, NULL);

  -- Chapter 2: He thong Phu tro Dong co
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'He thong Phu tro Dong co', 'Lam mat, boi tron, khoi dong, khi nen', 1)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'He thong lam mat', 'LECTURE', 30, 0, false, _sc('<h2>Lam mat</h2><p>Hai vong: nuoc ngot lam mat dong co (nhiet do 80-90C), nuoc bien lam mat nuoc ngot qua heat exchanger. Bao tri: kiem tra nuoc, lam sach cooler.</p>')),
    (v_ch, 'He thong boi tron', 'LECTURE', 30, 1, false, _sc('<h2>Boi tron</h2><p>Dau boi tron giam ma sat, lam mat, lam sach, chong gi. He thong: ket chua, bom, loc, cooler. Kiem tra TBN (Total Base Number) dinh ky. Phan tich dau hang thang.</p>')),
    (v_ch, 'He thong khi nen va khoi dong', 'LECTURE', 30, 2, false, _sc('<h2>Khi nen</h2><p>Khi nen 30 bar khoi dong dong co chinh. May nen khi (2-3 cap nen), binh chua, van phan phoi. Luon giu 2 binh day du. He thong dieu khien bang dien hoac khi nen.</p>')),
    (v_ch, 'He thong xa khi va turbocharger', 'LECTURE', 35, 3, false, _sc('<h2>Turbocharger</h2><p>Turbocharger tang cong suat 30-50% bang khi xa quay turbine, nen khi nap. Sau turbo co economizer (noi hoi khi xa) tan dung nhiet. Bao tri: rua turbo nuoc/hat, kiem tra o bi.</p>')),
    (v_ch, 'Kiem tra chuong 2', 'QUIZ', 20, 4, false, NULL);

  -- Chapter 3: Van hanh Dong co Chinh
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Van hanh Dong co Chinh', 'Quy trinh khoi dong, van hanh, dung may', 2)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Chuan bi va khoi dong dong co', 'LECTURE', 35, 0, false, _sc('<h2>Khoi dong</h2><p>Checklist truoc khoi dong: kiem tra dau, nuoc, nhien lieu, khi nen. Quay thu (turning gear), mo van nhien lieu, khoi dong bang khi nen. Theo doi thong so 15 phut dau.</p>')),
    (v_ch, 'Van hanh binh thuong va theo doi', 'LECTURE', 30, 1, false, _sc('<h2>Van hanh</h2><p>Theo doi: nhiet do xa khi moi xylanh (chenh <50C), ap suat dau boi tron (>2 bar), nhiet do nuoc lam mat. Ghi nhat ky buong may moi 4 gio.</p>')),
    (v_ch, 'Dung may va xu ly su co', 'LECTURE', 35, 2, false, _sc('<h2>Dung may & Su co</h2><p>Dung may: giam tai dan, chuyen MDO, chay khong tai 15 phut, dung, quay turning gear. Su co: qua nhiet (giam tai, kiem tra lam mat), ap suat dau thap (bao dong, dung may).</p>')),
    (v_ch, 'An toan buong may', 'LECTURE', 25, 3, false, _sc('<h2>An toan</h2><p>PPE bat buoc: bao ve tai (>85dB), giay an toan, kinh, gang tay. Khong lam viec mot minh. Khoa an toan (Lock-Out Tag-Out). Phong chay: phat hien, bao dong, chua chay CO2.</p>')),
    (v_ch, 'Thuc hanh: nhat ky buong may', 'ASSIGNMENT', 40, 4, false, _sc('<h2>Nhat ky Buong may</h2><p>Ghi nhat ky buong may 24h (6 lan, moi 4h). Ghi: vong quay, nhiet do xa khi, ap suat, muc nhien lieu/dau. Nop PDF.</p>')),
    (v_ch, 'Kiem tra chuong 3', 'QUIZ', 20, 5, false, NULL);

  -- Chapter 4: Bao duong Dinh ky (PMS)
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Bao duong Dinh ky (PMS)', 'Ke hoach bao duong phong ngua', 3)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Ke hoach bao duong PMS', 'LECTURE', 35, 0, false, _sc('<h2>PMS</h2><p>PMS (Planned Maintenance System) la he thong lap ke hoach bao duong theo gio chay hoac thoi gian. Tuan thu ISM Code. Phan mem: AMOS, Star IPS, Bass.</p>')),
    (v_ch, 'Bao duong xylanh va piston', 'LECTURE', 35, 1, false, _sc('<h2>Xylanh & Piston</h2><p>Kiem tra: do mon xylanh, vong gang piston, trang thai linner. Thay vong gang theo gio (6000-12000h). Do mon toi da cho phep theo hang che tao.</p>')),
    (v_ch, 'Bao duong he thong nhien lieu', 'LECTURE', 30, 2, false, _sc('<h2>Bao duong Nhien lieu</h2><p>Voi phun: siet ap suat, phun suong, thay kim. Bom cao ap: kiem tra piston, lo xo. Loc nhien lieu: thay dinh ky. Purifier: bao duong 3000-4000h.</p>')),
    (v_ch, 'Bao duong he thong lam mat va boi tron', 'LECTURE', 30, 3, false, _sc('<h2>Bao duong LM & BT</h2><p>Lam mat: lam sach cooler (axit/kiem), kiem tra kem chong an mon, thay nuoc lam mat. Boi tron: loc dau, phan tich, thay dau, lam sach carter.</p>')),
    (v_ch, 'Kiem tra chuong 4', 'QUIZ', 20, 4, false, NULL);

  -- Chapter 5: May phat Dien
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'May phat Dien', 'May phat dien tau va bang dien chinh', 4)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Nguyen ly may phat dien', 'LECTURE', 30, 0, false, _sc('<h2>May phat Dien</h2><p>May phat AC 3 pha (440V, 60Hz hoac 380V, 50Hz). Dong co diesel keo generator. Dieu toc (governor) giu tan so, AVR giu dien ap. Tau thuong co 3 may phat + 1 su co.</p>')),
    (v_ch, 'Van hanh va hoa dong bo', 'LECTURE', 35, 1, false, _sc('<h2>Hoa dong bo</h2><p>Truoc khi ket noi 2 may phat: dong bo tan so, dien ap, pha va goc pha. Dung synchroscope hoac den dong bo. Sau hoa: phan tai deu bang dieu chinh governor.</p>')),
    (v_ch, 'Bang dien chinh va phan phoi', 'LECTURE', 30, 2, false, _sc('<h2>Bang dien</h2><p>Main Switchboard phan phoi dien toan tau. Cau dao (ACB), bao ve qua tai, ngan mach, mat pha. Uu tien cat tai: thiet bi khong thiet yeu cat truoc khi qua tai.</p>')),
    (v_ch, 'Xu ly su co dien (Blackout)', 'LECTURE', 30, 3, false, _sc('<h2>Blackout</h2><p>Blackout: mat dien toan tau. Nguyen nhan: qua tai, ngan mach, hong governor. Quy trinh phuc hoi: khoi dong may phat su co, cap dien tung phan, khoi dong lai he thong.</p>')),
    (v_ch, 'Kiem tra chuong 5', 'QUIZ', 20, 4, false, NULL);

  -- Chapter 6: He thong Noi hoi va Hoi nuoc
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'He thong Noi hoi va Hoi nuoc', 'Noi hoi, xu ly nuoc, he thong hoi', 5)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Noi hoi chinh va noi hoi phu', 'LECTURE', 35, 0, false, _sc('<h2>Noi hoi</h2><p>Noi hoi tao hoi nuoc cho: ham nong nhien lieu HFO, lam sach ket, suoi am, nau an. Noi hoi ong nuoc (Water tube) va ong lua (Fire tube). Ap suat 7-16 bar.</p>')),
    (v_ch, 'Xu ly nuoc noi hoi', 'LECTURE', 30, 1, false, _sc('<h2>Xu ly nuoc</h2><p>Nuoc phai duoc xu ly chong can, chong an mon. Kiem tra: pH (10.5-11.5), do kiem (200-400 ppm), chloride (<200 ppm). Hoa chat: Na3PO4, N2H4, NaOH.</p>')),
    (v_ch, 'An toan noi hoi va kiem tra', 'LECTURE', 30, 2, false, _sc('<h2>An toan Noi hoi</h2><p>Kiem tra dinh ky: van an toan (moi 6 thang), muc nuoc, ap suat. Khong bao gio chay noi hoi khi muc nuoc thap. Kiem tra dang kiem hang nam.</p>')),
    (v_ch, 'Kiem tra chuong 6', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 7: Thi cuoi khoa May Diesel
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Thi cuoi khoa May Diesel', 'On tap va kiem tra tong hop', 6)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'On tap toan khoa', 'LECTURE', 40, 0, false, _sc('<h2>On tap</h2><p>Tong hop: nguyen ly 2ky/4ky, he thong phu tro, van hanh, PMS, may phat, noi hoi. Thi: 30 trac nghiem + 1 tinh toan, 45 phut, dat 60/100.</p>')),
    (v_ch, 'Bai tap: ke hoach bao duong', 'ASSIGNMENT', 50, 1, false, _sc('<h2>KH Bao duong</h2><p>Lap ke hoach bao duong 12 thang cho dong co MAN B&W 6S60MC-C. Gom: xylanh, turbo, nhien lieu, lam mat, boi tron. Nop PDF.</p>')),
    (v_ch, 'Thi cuoi khoa May Diesel', 'QUIZ', 45, 2, false, NULL);

END $$;
-- Course: ENG-201
DO $$ DECLARE v_c UUID; v_ch UUID;
BEGIN
  SELECT id INTO v_c FROM courses WHERE code = 'ENG-201';
  IF v_c IS NULL THEN RETURN; END IF;

  -- Chapter 1: He thong Dien tau bien
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'He thong Dien tau bien', 'Tong quan he thong dien 3 pha tren tau', 0)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Tong quan dien tau bien', 'LECTURE', 35, 0, true, _sc('<h2>Dien tau bien</h2><p>He thong dien 3 pha AC: 440V/60Hz (tau My, Han), 380V/50Hz (tau Chau Au). Nguon: may phat diesel, may phat truc (shaft generator), shore power. Phu tai: may bom, may nen, can cau, he thong dieu hoa.</p>')),
    (v_ch, 'May phat dien va AVR', 'LECTURE', 35, 1, false, _sc('<h2>May phat & AVR</h2><p>Alternator dong bo 3 pha. AVR (Automatic Voltage Regulator) dieu chinh dien ap bang thay doi dong kich tu. Bao ve: qua ap, thieu ap, qua tan, nghich dong.</p>')),
    (v_ch, 'He thong phan phoi dien', 'LECTURE', 30, 2, false, _sc('<h2>Phan phoi</h2><p>Main switchboard, Emergency switchboard, Distribution board. Cau dao ACB, MCCB, MCB. Bao ve ngan mach, qua tai, ro dien. Bus-tie cho hoa dong bo.</p>')),
    (v_ch, 'Dong co dien va khoi dong', 'LECTURE', 35, 3, false, _sc('<h2>Dong co dien</h2><p>Dong co AC khong dong bo (induction motor) pho bien nhat. Khoi dong: DOL (truc tiep), Star-Delta, Soft starter, VFD (Bien tan). VFD tiet kiem 30-50% dien cho bom quat.</p>')),
    (v_ch, 'Kiem tra chuong 1', 'QUIZ', 20, 4, false, NULL);

  -- Chapter 2: Tu dong hoa Tau bien
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Tu dong hoa Tau bien', 'He thong dieu khien tu dong', 1)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'PLC va lap trinh co ban', 'LECTURE', 40, 0, false, _sc('<h2>PLC</h2><p>PLC (Programmable Logic Controller) dieu khien tu dong quy trinh: bom ballast, lam mat, nhien lieu. Hang: Siemens S7, Allen-Bradley, ABB AC500. Lap trinh: Ladder, FBD.</p>')),
    (v_ch, 'He thong SCADA tau bien', 'LECTURE', 35, 1, false, _sc('<h2>SCADA</h2><p>SCADA giam sat va dieu khien toan tau: nhiet do, ap suat, muc ket, bao dong. HMI (Man-Machine Interface) tren buong dieu khien. Cac hang: Kongsberg, ABB, Wartsila.</p>')),
    (v_ch, 'Cam bien va truyen tin hieu', 'LECTURE', 30, 2, false, _sc('<h2>Cam bien</h2><p>Cam bien: nhiet do (PT100, thermocouple), ap suat (piezoelectric), muc (float, ultrasonic), luu luong. Tin hieu: 4-20mA, 0-10V, RS485, Modbus, NMEA 2000.</p>')),
    (v_ch, 'Bai tap lap trinh PLC', 'ASSIGNMENT', 45, 3, false, _sc('<h2>Thuc hanh PLC</h2><p>Viet chuong trinh PLC dieu khien he thong bom ballast tu dong: 3 bom, cam bien muc, bao dong cao/thap. Nop file chuong trinh va bao cao.</p>')),
    (v_ch, 'Kiem tra chuong 2', 'QUIZ', 20, 4, false, NULL);

  -- Chapter 3: Dien tu Cong suat
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Dien tu Cong suat', 'Bo bien doi, UPS, he thong nap', 2)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Bo chinh luu va bien tan', 'LECTURE', 35, 0, false, _sc('<h2>Bien tan</h2><p>Chinh luu: AC sang DC (dien phan, nap acquy). Bien tan VFD: AC-DC-AC, dieu khien toc do dong co. Tiet kiem nang luong, giam soc co khi.</p>')),
    (v_ch, 'UPS va nguon su co', 'LECTURE', 30, 1, false, _sc('<h2>UPS</h2><p>UPS duy tri nguon cho thiet bi quan trong (ECDIS, Radar, VHF) khi mat dien. Emergency generator tu dong khoi dong trong 45 giay (SOLAS). Pin Lithium-ion moi cho UPS hang hai.</p>')),
    (v_ch, 'He thong nap acquy', 'LECTURE', 30, 2, false, _sc('<h2>Acquy</h2><p>Acquy khoi dong may su co, chieu sang su co, thiet bi cuu sinh. Kiem tra: dien ap, ty trong dung dich, muc dien giai. Nap: 3 giai doan (bulk, absorption, float).</p>')),
    (v_ch, 'Kiem tra chuong 3', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 4: He thong Bao dong va An toan
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'He thong Bao dong va An toan', 'AMS, phong chay, bao ve', 3)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'He thong bao dong (AMS)', 'LECTURE', 35, 0, false, _sc('<h2>AMS</h2><p>AMS giam sat 500-2000 diem bao dong tren tau. Phan loai: bao dong (alarm), canh bao (warning), tat may (shutdown). Ghi nhat ky tu dong (data logger).</p>')),
    (v_ch, 'He thong phong chay dien', 'LECTURE', 30, 1, false, _sc('<h2>Phong chay dien</h2><p>Nguyen nhan chay dien: ngan mach, qua tai, tiep xuc kem. Phat hien: cam bien khoi, nhiet. Chua chay: CO2, bot, nuoc (khong dung cho thiet bi dien cao ap!).</p>')),
    (v_ch, 'Bai tap phan tich mach bao ve', 'ASSIGNMENT', 40, 2, false, _sc('<h2>Phan tich Mach</h2><p>Phan tich mach bao ve dong co bom nuoc bien: ve so do, tinh dong ngan mach, chon MCCB phu hop. Nop PDF.</p>')),
    (v_ch, 'Kiem tra chuong 4', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 5: Bao tri va Kiem tra
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Bao tri va Kiem tra', 'Bao tri dien dinh ky va kiem tra dang kiem', 4)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Bao tri dien phong ngua', 'LECTURE', 35, 0, false, _sc('<h2>Bao tri dien</h2><p>Do cach dien (Megger test) hang thang: dong co >1MOhm, cap >5MOhm. Siet oc ket noi, lam sach tu dien, kiem tra tiep dat. Ghi vao PMS.</p>')),
    (v_ch, 'Kiem tra dang kiem dien tau', 'LECTURE', 30, 1, false, _sc('<h2>Dang kiem</h2><p>Dang kiem (Classification society: DNV, Lloyd, BV) kiem tra hang nam va 5 nam. Hang muc: may phat, bang dien, cap, dong co, he thong su co, tiep dat.</p>')),
    (v_ch, 'Bai tap bao tri tong hop', 'ASSIGNMENT', 45, 2, false, _sc('<h2>Bao tri TH</h2><p>Lap ke hoach bao tri dien 6 thang: may phat, dong co bom, he thong chieu sang, UPS, acquy. Nop ke hoach chi tiet PDF.</p>')),
    (v_ch, 'Thi cuoi khoa Dien Tau bien', 'QUIZ', 60, 3, false, NULL);

  -- Chapter 6: Thi cuoi khoa
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Thi cuoi khoa', 'Thuc hanh tong hop', 5)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'On tap toan khoa', 'LECTURE', 30, 0, false, _sc('<h2>On tap ENG-201</h2><p>Tong hop: dien 3 pha, may phat, dong co, PLC/SCADA, dien tu cong suat, bao dong, bao tri. Thi: 25 trac nghiem + 2 thuc hanh, 60 phut, dat 70/100.</p>')),
    (v_ch, 'Thi thuc hanh cuoi khoa', 'QUIZ', 60, 1, false, NULL);

END $$;
-- Course: SAF-101
DO $$ DECLARE v_c UUID; v_ch UUID;
BEGIN
  SELECT id INTO v_c FROM courses WHERE code = 'SAF-101';
  IF v_c IS NULL THEN RETURN; END IF;

  -- Chapter 1: Ky nang Song con
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Ky nang Song con', 'Sinh ton tren bien theo STCW A-VI/1-1', 0)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Cac loai phuong tien cuu sinh', 'LECTURE', 30, 0, true, _sc('<h2>Phuong tien Cuu sinh</h2><p>Xuong cuu sinh (lifeboat): kin va mo. Suc chua toi thieu cho 100% thuyen vien moi man. Be cuu sinh (liferaft): phong tu dong, suc chua 6-25 nguoi. Phao cuu sinh (lifebuoy): 8 chiec, 4 co den, 2 co phat khoi.</p>')),
    (v_ch, 'Ha xuong cuu sinh va be phao', 'LECTURE', 35, 1, false, _sc('<h2>Ha xuong</h2><p>Ha xuong bang toi (davit): gravity, cam truc. Kiem tra hang thang. Ha be phao: nem xuong bien, giat day co. Trong truong hop khan cap, moi nguoi phai biet vi tri tap trung (muster station).</p>')),
    (v_ch, 'Song con tren bien', 'LECTURE', 35, 2, false, _sc('<h2>Song con</h2><p>Uu tien: bao ve khoi lanh (hypothermia), nuoc ngot (500ml/ngay), tin hieu cuu nan (EPIRB, SART, VHF). Khong uong nuoc bien. Giu tinh than, phan cong nhiem vu trong xuong.</p>')),
    (v_ch, 'Thuc hanh: mac ao phao', 'VIDEO', 25, 3, false, NULL),
    (v_ch, 'Kiem tra chuong 1', 'QUIZ', 20, 4, false, NULL);
  UPDATE lessons SET video_url = 'https://example.com/maritime/saf101-ch1-video.mp4'
  WHERE chapter_id = v_ch AND lesson_type = 'VIDEO';

  -- Chapter 2: Phong chay va Chua chay Co ban
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Phong chay va Chua chay Co ban', 'Kien thuc co ban ve chay va cac loai binh chua', 1)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Tam giac chay va phan loai dam chay', 'LECTURE', 30, 0, false, _sc('<h2>Tam giac chay</h2><p>3 yeu to: nhien lieu, oxy, nhiet. Phan loai: A (ran), B (long), C (khi), D (kim loai), E (dien). Moi loai can phuong phap chua khac nhau.</p>')),
    (v_ch, 'Cac loai binh chua chay', 'LECTURE', 35, 1, false, _sc('<h2>Binh chua chay</h2><p>Nuoc (Class A), Bot (A,B), CO2 (B,E), Bot AFFF (A,B). Vi tri: moi 20m hanh lang, buong may, bep, buong lai. Kiem tra hang thang.</p>')),
    (v_ch, 'He thong chua chay co dinh', 'LECTURE', 30, 2, false, _sc('<h2>He thong co dinh</h2><p>CO2 toan phan buong may (Total flooding). Sprinkler (cabin, hanh lang). Foam (ket hang dau). Water mist (buong may hien dai). Bao dong truoc khi xa CO2.</p>')),
    (v_ch, 'Thuc hanh chua chay', 'VIDEO', 30, 3, false, NULL),
    (v_ch, 'Kiem tra chuong 2', 'QUIZ', 20, 4, false, NULL);
  UPDATE lessons SET video_url = 'https://example.com/maritime/saf101-ch2-video.mp4'
  WHERE chapter_id = v_ch AND lesson_type = 'VIDEO';

  -- Chapter 3: So cuu Y te Co ban
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'So cuu Y te Co ban', 'So cuu, hoi suc, xu ly thuong tich', 2)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Danh gia nan nhan va ABC', 'LECTURE', 30, 0, false, _sc('<h2>So cuu ABC</h2><p>Airway (duong tho), Breathing (ho hap), Circulation (tuan hoan). Kiem tra tinh trang y thuc, goi cap cuu, bat dau CPR neu can. Ty le nen tim:thoi 30:2.</p>')),
    (v_ch, 'Xu ly thuong tich thuong gap', 'LECTURE', 35, 1, false, _sc('<h2>Thuong tich</h2><p>Bong (lam mat 20 phut), gay xuong (co dinh), chay mau (bang ep), say nong (lam mat, nuoc). Tau co tu thuoc (Medical chest) va huong dan IMGS.</p>')),
    (v_ch, 'Bai tap tinh huong so cuu', 'ASSIGNMENT', 35, 2, false, _sc('<h2>BT So cuu</h2><p>Xu ly 5 tinh huong: nguoi roi xuong bien (hypothermia), bong nhien lieu, gay tay, dien giat, ngat khi. Mo ta buoc xu ly chi tiet. Nop PDF.</p>')),
    (v_ch, 'Kiem tra chuong 3', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 4: An toan Ca nhan va Trach nhiem Xa hoi
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'An toan Ca nhan va Trach nhiem Xa hoi', 'STCW A-VI/1-4', 3)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'An toan lam viec tren tau', 'LECTURE', 30, 0, false, _sc('<h2>An toan Ca nhan</h2><p>PPE: mu bao ho, giay an toan, gang tay, kinh, day an toan (lam viec tren cao). Permit to Work cho cong viec nguy hiem. Risk Assessment truoc moi cong viec.</p>')),
    (v_ch, 'Bao ve moi truong bien', 'LECTURE', 30, 1, false, _sc('<h2>Bao ve MT</h2><p>MARPOL: 6 phu luc (dau, hoa chat, nuoc thai, rac, khi xa, chong han). Khong xa dau ra bien (Oil Record Book). Xu ly nuoc ballast (BWM Convention).</p>')),
    (v_ch, 'Quan he lao dong va suc khoe', 'LECTURE', 25, 2, false, _sc('<h2>Lao dong</h2><p>MLC 2006: thoi gian nghi (10h/ngay, 77h/tuan), luong, bao hiem, dieu kien song. Chong phan biet, quay roi. Suc khoe: kiem tra truoc khi xuong tau.</p>')),
    (v_ch, 'Lien lac va bao cao su co', 'LECTURE', 25, 3, false, _sc('<h2>Bao cao</h2><p>ISM Code: bao cao moi su co, gan-miss. Hoc tu su co (investigation). Drill hang thang: chay, bo tau, nguoi roi bien. Ghi nhat ky thuc tap.</p>')),
    (v_ch, 'Kiem tra chuong 4', 'QUIZ', 20, 4, false, NULL);

  -- Chapter 5: Thuc hanh An toan
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Thuc hanh An toan', 'Cac bai thuc hanh ky nang', 4)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Thuc hanh mac thiet bi cuu sinh', 'VIDEO', 25, 0, false, NULL),
    (v_ch, 'Thuc hanh su dung binh chua chay', 'VIDEO', 25, 1, false, NULL),
    (v_ch, 'Thuc hanh CPR va so cuu', 'VIDEO', 30, 2, false, NULL),
    (v_ch, 'Kiem tra chuong 5', 'QUIZ', 20, 3, false, NULL);
  UPDATE lessons SET video_url = 'https://example.com/maritime/saf101-ch5-video.mp4'
  WHERE chapter_id = v_ch AND lesson_type = 'VIDEO';

  -- Chapter 6: Kiem soat Dam dong
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Kiem soat Dam dong', 'Quan ly hanh khach va khan cap', 5)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Ke hoach tap trung va so tan', 'LECTURE', 30, 0, false, _sc('<h2>So tan</h2><p>Muster list: phan cong nhiem vu cho tung thuyen vien. Tin hieu bo tau: 7 hoi ngan + 1 hoi dai. Huong dan hanh khach den muster station, phat ao phao.</p>')),
    (v_ch, 'Bai tap tinh huong khan cap', 'ASSIGNMENT', 35, 1, false, _sc('<h2>BT Khan cap</h2><p>Xu ly 3 tinh huong: chay buong may, dam va, nguoi roi bien. Mo ta vai tro cua ban theo muster list. Nop PDF.</p>')),
    (v_ch, 'Kiem tra chuong 6', 'QUIZ', 20, 2, false, NULL);

  -- Chapter 7: Phong chong O nhiem
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Phong chong O nhiem', 'MARPOL va bao ve moi truong', 6)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'MARPOL va cac phu luc', 'LECTURE', 35, 0, false, _sc('<h2>MARPOL</h2><p>6 phu luc: I (dau), II (hoa chat doc), III (hang nguy hiem dong goi), IV (nuoc thai), V (rac), VI (khi xa SOx, NOx, CO2). EIAPP va EEDI giam phat thai.</p>')),
    (v_ch, 'Xu ly rac va nuoc thai', 'LECTURE', 30, 1, false, _sc('<h2>Rac & Nuoc thai</h2><p>Rac: phan loai, nghien, dot, chuyen len bo. Cam xa nhua ra bien. Nuoc thai: xu ly (STP) truoc khi xa, cach bo >12NM. Garbage Management Plan bat buoc.</p>')),
    (v_ch, 'Kiem tra chuong 7', 'QUIZ', 20, 2, false, NULL);

  -- Chapter 8: Thi cuoi khoa An toan
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Thi cuoi khoa An toan', 'Kiem tra tong hop', 7)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'On tap toan khoa', 'LECTURE', 35, 0, false, _sc('<h2>On tap SAF-101</h2><p>Tong hop: cuu sinh, chua chay, so cuu, an toan ca nhan, dam dong, MARPOL. Thi: 30 trac nghiem, 30 phut, dat 60/100.</p>')),
    (v_ch, 'Thi cuoi khoa An toan STCW', 'QUIZ', 30, 1, false, NULL);

END $$;
-- Course: SAF-201
DO $$ DECLARE v_c UUID; v_ch UUID;
BEGIN
  SELECT id INTO v_c FROM courses WHERE code = 'SAF-201';
  IF v_c IS NULL THEN RETURN; END IF;

  -- Chapter 1: Chi huy Chua chay
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Chi huy Chua chay', 'Vai tro chi huy doi chua chay tren tau', 0)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'To chuc doi chua chay', 'LECTURE', 35, 0, true, _sc('<h2>Doi chua chay</h2><p>Doi chua chay: chi huy (thuyen truong/pho), doi tan cong, doi ho tro, doi cuu thuong. Phan cong theo muster list. Thong tin lien lac bang VHF cam tay.</p>')),
    (v_ch, 'Chien thuat chua chay tren tau', 'LECTURE', 35, 1, false, _sc('<h2>Chien thuat</h2><p>Danh gia: vi tri, quy mo, loai chay. Quyet dinh: tan cong truc tiep hay phong thu. Uu tien: cuu nguoi, ngan lan, dap tat. Kiem soat thong gio, dong cua phong chay.</p>')),
    (v_ch, 'Su dung thiet bi tho', 'LECTURE', 30, 2, false, _sc('<h2>Thiet bi tho</h2><p>SCBA (Self-Contained Breathing Apparatus): 30 phut khi. EEBD (Emergency Escape): 15 phut thoat nan. Kiem tra truoc khi dung, khong vao vung nguy hiem mot minh.</p>')),
    (v_ch, 'Bai tap chi huy chua chay', 'ASSIGNMENT', 40, 3, false, _sc('<h2>BT Chi huy</h2><p>Kich ban: chay buong may tu dau nhien lieu. Viet ke hoach chi huy: phan cong doi, chien thuat, lien lac, cuu thuong. Nop PDF.</p>')),
    (v_ch, 'Kiem tra chuong 1', 'QUIZ', 20, 4, false, NULL);

  -- Chapter 2: Chua chay Dac biet
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Chua chay Dac biet', 'Chay buong may, ket hang, hoa chat', 1)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Chay buong may', 'LECTURE', 35, 0, false, _sc('<h2>Chay Buong may</h2><p>Nguy hiem nhat: nhien lieu, dau, khi. He thong CO2 toan phan: so tan, dong kin, xa CO2. Lam mat tu ben ngoai. Khong mo cua 24h sau xa CO2.</p>')),
    (v_ch, 'Chay ket hang va hang nguy hiem', 'LECTURE', 30, 1, false, _sc('<h2>Chay Ket hang</h2><p>Container: xac dinh hang nguy hiem (IMDG Code). Tau dau: he thong foam boong. Hang rời: than, ngu coc co the tu boc chay. Lam mat ket xung quanh.</p>')),
    (v_ch, 'Chua chay voi hoa chat nguy hiem', 'LECTURE', 30, 2, false, _sc('<h2>Hoa chat</h2><p>MSDS (Material Safety Data Sheet) cho moi hoa chat. Khong dung nuoc cho kim loai chay (Class D). Axit/kiem: trung hoa, khong xa nuoc truc tiep.</p>')),
    (v_ch, 'Kiem tra chuong 2', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 3: Kiem soat Thiet hai
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Kiem soat Thiet hai', 'Han che thiet hai sau su co', 2)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Danh gia va kiem soat thiet hai', 'LECTURE', 35, 0, false, _sc('<h2>Damage Control</h2><p>Sau chay/dam: danh gia ket cau, do on dinh, kha nang di chuyen. Bom nuoc, han tam (temporary repair), gia co ket cau. Bao cao hang va dang kiem.</p>')),
    (v_ch, 'On dinh tau sau su co', 'LECTURE', 30, 1, false, _sc('<h2>On dinh</h2><p>Ngap nuoc: tinh lai do on dinh (GM, GZ curve). Bom ballast bu, chuyen hang. Cross-flooding neu nghieng qua. Chuan bi bo tau neu can.</p>')),
    (v_ch, 'Kiem tra chuong 3', 'QUIZ', 20, 2, false, NULL);

  -- Chapter 4: Cuu ho Nguoi roi Bien
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Cuu ho Nguoi roi Bien', 'Man overboard va cuu ho tren bien', 3)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Quy trinh Man Overboard', 'LECTURE', 30, 0, false, _sc('<h2>MOB</h2><p>Phat hien: het to MOB, nem phao, an nut MOB (danh dau GPS). Dong tac Williamson turn hoac Anderson turn. Truc vot: xuong cuu sinh, thang day.</p>')),
    (v_ch, 'Cuu ho voi tau va truc thang', 'LECTURE', 30, 1, false, _sc('<h2>Cuu ho</h2><p>Phoi hop SAR (Search and Rescue): VHF Ch16, DSC, EPIRB. Mau tim kiem: sector search, expanding square. Truc thang: chuan bi boong, giu khoang cach an toan.</p>')),
    (v_ch, 'Bai tap mo phong cuu ho', 'ASSIGNMENT', 40, 2, false, _sc('<h2>BT Cuu ho</h2><p>Kich ban: 2 nguoi roi bien luc dem, gio cap 6. Viet ke hoach cuu ho: dong tac quay tau, phan cong, lien lac VHF, truc vot. Nop PDF.</p>')),
    (v_ch, 'Kiem tra chuong 4', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 5: Thi cuoi khoa
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Thi cuoi khoa', 'Kiem tra tong hop chua chay nang cao', 4)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'On tap va tinh huong thuc te', 'LECTURE', 35, 0, false, _sc('<h2>On tap SAF-201</h2><p>Tong hop: chi huy chua chay, chua chay dac biet, kiem soat thiet hai, cuu ho. Thi: 20 trac nghiem + 2 tinh huong, 45 phut, dat 70/100.</p>')),
    (v_ch, 'Thi cuoi khoa Chua chay Nang cao', 'QUIZ', 45, 1, false, NULL);

END $$;
-- Course: LOG-101
DO $$ DECLARE v_c UUID; v_ch UUID;
BEGIN
  SELECT id INTO v_c FROM courses WHERE code = 'LOG-101';
  IF v_c IS NULL THEN RETURN; END IF;

  -- Chapter 1: Tong quan Logistics Hang hai
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Tong quan Logistics Hang hai', 'Chuoi cung ung va vai tro van tai bien', 0)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Vai tro van tai bien toan cau', 'LECTURE', 35, 0, true, _sc('<h2>Van tai bien</h2><p>Van tai bien van chuyen 80% hang hoa the gioi. Uu diem: chi phi thap/tan, kho luong lon. Han che: cham. Cac tuyen chinh: Trung Quoc-Chau Au (Suez), Chau A-My (Panama).</p>')),
    (v_ch, 'Chuoi cung ung hang hai', 'LECTURE', 30, 1, false, _sc('<h2>Chuoi cung ung</h2><p>Shipper -> Freight Forwarder -> Hang tau -> Cang xuat -> Van tai bien -> Cang nhan -> Consignee. Incoterms 2020: FOB, CIF, CFR pho bien nhat.</p>')),
    (v_ch, 'Cac loai tau va hang hoa', 'LECTURE', 35, 2, false, _sc('<h2>Loai tau</h2><p>Container (TEU/FEU), Bulk carrier (than, ngu coc), Tanker (dau, hoa chat), Ro-Ro (xe), LNG/LPG. Tau container lon nhat: 24.000 TEU (Megamax).</p>')),
    (v_ch, 'Kiem tra chuong 1', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 2: Van tai Container
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Van tai Container', 'Container hoa va quy trinh', 1)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Container hoa va tieu chuan', 'LECTURE', 35, 0, false, _sc('<h2>Container</h2><p>ISO container: 20ft (TEU) va 40ft (FEU). Loai: Dry, Reefer, Open top, Flat rack, Tank. CSC plate, so hieu container (4 chu + 7 so). Seal va kiem tra.</p>')),
    (v_ch, 'Quy trinh xuat nhap khau', 'LECTURE', 35, 1, false, _sc('<h2>XNK</h2><p>Booking -> Dong hang -> VGM -> Bill of Lading -> Thong quan -> Xep tau -> Van tai -> Do hang -> Giao nhan. B/L: chung tu van tai quan trong nhat.</p>')),
    (v_ch, 'Chi phi van tai va cuoc phi', 'LECTURE', 30, 2, false, _sc('<h2>Cuoc phi</h2><p>Cuoc (Freight): theo TEU, CBM, hoac tan. Phu phi: BAF (nhien lieu), THC (xep do), CFS, Demurrage (cham tra container), Detention.</p>')),
    (v_ch, 'Bai tap tinh cuoc van tai', 'ASSIGNMENT', 35, 3, false, _sc('<h2>BT Cuoc</h2><p>Tinh chi phi van tai 2 container 40ft Reefer tu HP den Rotterdam. Tinh: cuoc co ban, BAF, THC, bao hiem, tong chi phi. Nop PDF.</p>')),
    (v_ch, 'Kiem tra chuong 2', 'QUIZ', 20, 4, false, NULL);

  -- Chapter 3: Quan ly Cang bien
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Quan ly Cang bien', 'Hoat dong cang va logistics cang', 2)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Chuc nang va phan loai cang', 'LECTURE', 30, 0, false, _sc('<h2>Cang bien</h2><p>Chuc nang: xep do, luu kho, thong quan, dich vu tau. Phan loai: cang container, cang tong hop, cang chuyen dung (dau, than). Cang HP, Cai Mep, Da Nang.</p>')),
    (v_ch, 'Thiet bi va cong nghe cang', 'LECTURE', 35, 1, false, _sc('<h2>Thiet bi cang</h2><p>QC (Quay Crane): xep do container, nang suat 30-40 container/h. RTG, RMGC: van chuyen bai. TOS (Terminal Operating System): quan ly bai container.</p>')),
    (v_ch, 'Toi uu hoa hoat dong cang', 'LECTURE', 30, 2, false, _sc('<h2>Toi uu cang</h2><p>KPI: Crane productivity, Berth occupancy, Vessel turnaround time, Dwell time. Lean management, automation, AI planning. Cang tu dong: Rotterdam, Singapore.</p>')),
    (v_ch, 'Kiem tra chuong 3', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 4: Logistics Quoc te
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Logistics Quoc te', 'Quan ly chuoi cung ung da phuong thuc', 3)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Van tai da phuong thuc', 'LECTURE', 35, 0, false, _sc('<h2>Da phuong thuc</h2><p>Ket hop: duong bien + duong bo + duong sat. MTO (Multimodal Transport Operator) chiu trach nhiem toan trinh. FBL (FIATA B/L) cho van tai da phuong thuc.</p>')),
    (v_ch, 'Kho bai va phan phoi', 'LECTURE', 30, 1, false, _sc('<h2>Kho bai</h2><p>ICD (Inland Container Depot), CFS (Container Freight Station), Free Trade Zone. WMS (Warehouse Management System). Cross-docking giam thoi gian luu kho.</p>')),
    (v_ch, 'Bao hiem hang hai', 'LECTURE', 30, 2, false, _sc('<h2>Bao hiem</h2><p>Bao hiem than tau (Hull & Machinery), bao hiem hang (Cargo), P&I (bao hiem trach nhiem). Dieu khoan: FPA, WA, All Risks. Khieu nai: thong bao 3 ngay, giam dinh.</p>')),
    (v_ch, 'Kiem tra chuong 4', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 5: Cong nghe trong Logistics
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Cong nghe trong Logistics', 'So hoa va cong nghe moi', 4)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'He thong thong tin logistics', 'LECTURE', 35, 0, false, _sc('<h2>CNTT Logistics</h2><p>ERP (SAP, Oracle), TMS (Transportation), WMS, Port Community System. EDI trao doi chung tu dien tu. API ket noi cac he thong.</p>')),
    (v_ch, 'Blockchain va IoT trong hang hai', 'LECTURE', 30, 1, false, _sc('<h2>Blockchain & IoT</h2><p>Blockchain: B/L dien tu (TradeLens, GSBN), minh bach chuoi cung ung. IoT: theo doi container (nhiet do, vi tri, rung lac), bao tri du doan.</p>')),
    (v_ch, 'Bai tap: phan tich chuoi cung ung', 'ASSIGNMENT', 40, 2, false, _sc('<h2>BT Chuoi CU</h2><p>Phan tich chuoi cung ung xuat khau ca tra VN sang EU: tu trang trai den sieu thi. Ve so do, xac dinh bottleneck, de xuat cai tien. Nop PDF.</p>')),
    (v_ch, 'Kiem tra chuong 5', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 6: Thi cuoi khoa Logistics
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Thi cuoi khoa Logistics', 'Kiem tra tong hop', 5)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'On tap toan khoa', 'LECTURE', 30, 0, false, _sc('<h2>On tap LOG-101</h2><p>Tong hop: van tai bien, container, cang, logistics quoc te, cong nghe. Thi: 25 trac nghiem + 1 tinh huong, 45 phut, dat 60/100.</p>')),
    (v_ch, 'Bai tap cuoi khoa', 'ASSIGNMENT', 45, 1, false, _sc('<h2>BT Cuoi khoa</h2><p>Thiet ke chuoi cung ung nhap khau may moc tu Nhat ve VN. So do, chi phi, thoi gian, rui ro, bao hiem. Nop PDF 5 trang.</p>')),
    (v_ch, 'Thi cuoi khoa', 'QUIZ', 45, 2, false, NULL);

END $$;
-- Course: LAW-101
DO $$ DECLARE v_c UUID; v_ch UUID;
BEGIN
  SELECT id INTO v_c FROM courses WHERE code = 'LAW-101';
  IF v_c IS NULL THEN RETURN; END IF;

  -- Chapter 1: Luat Bien Quoc te
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Luat Bien Quoc te', 'UNCLOS va cac vung bien', 0)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'UNCLOS 1982 va cac vung bien', 'LECTURE', 40, 0, true, _sc('<h2>UNCLOS</h2><p>UNCLOS phan chia: Noi thuy, Lanh hai (12NM), Tiep giap (24NM), EEZ (200NM), Them luc dia, Bien ca. Quy che phap ly tung vung. Quyen di lai vo hai (innocent passage).</p>')),
    (v_ch, 'Quyen va nghia vu quoc gia ven bien', 'LECTURE', 35, 1, false, _sc('<h2>Quoc gia ven bien</h2><p>Quyen chu quyen noi thuy va lanh hai. Quyen chu quyen tai EEZ (tai nguyen). Quyen tham do them luc dia. Nghia vu: bao dam an toan hang hai, bao ve moi truong.</p>')),
    (v_ch, 'Tranh chap Bien Dong', 'LECTURE', 35, 2, false, _sc('<h2>Bien Dong</h2><p>Cac yeu sach chong lan, duong 9 doan. Phan quyet PCA 2016 bac bo duong 9 doan. Viet Nam: tuyen bo EEZ, DKI, Hoang Sa, Truong Sa. Giai quyet hoa binh theo UNCLOS.</p>')),
    (v_ch, 'Kiem tra chuong 1', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 2: Cong uoc An toan Hang hai
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Cong uoc An toan Hang hai', 'SOLAS, Load Lines, COLREG', 1)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'SOLAS va an toan ket cau', 'LECTURE', 35, 0, false, _sc('<h2>SOLAS</h2><p>SOLAS 1974 (sua doi): 14 chuong. Ket cau, phong chay, thiet bi cuu sinh, thong tin lien lac, an toan hang hai, hang nguy hiem. Ap dung tau >= 500 GT tuyen quoc te.</p>')),
    (v_ch, 'Cong uoc Load Lines va man kho', 'LECTURE', 30, 1, false, _sc('<h2>Load Lines</h2><p>Cong uoc man kho 1966: gioi han tai trong toi da (draft toi da). Cac vach man kho: S(mua he), W(mua dong), T(nhiet doi), F(nuoc ngot). Dam bao du luc noi.</p>')),
    (v_ch, 'COLREG va quy tac tranh va', 'LECTURE', 35, 2, false, _sc('<h2>COLREG</h2><p>COLREG 1972: 41 quy tac + 4 phu luc. Phan A: tong quat. Phan B: lai va can. Phan C: den va dau hieu. Phan D: am hieu. Quy tac 5 (canh gioi), 7 (danh gia va cham), 8 (hanh dong tranh va).</p>')),
    (v_ch, 'Kiem tra chuong 2', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 3: Cong uoc Bao ve Moi truong
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Cong uoc Bao ve Moi truong', 'MARPOL va quy dinh moi truong', 2)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'MARPOL 73/78', 'LECTURE', 35, 0, false, _sc('<h2>MARPOL</h2><p>6 phu luc: I (dau), II (hoa chat doc), III (hang nguy hiem), IV (nuoc thai), V (rac), VI (khi xa). Vung dac biet (Special Area): Dia Trung Hai, Baltic, Vung Vinh. ECA: SOx < 0.1%.</p>')),
    (v_ch, 'BWM Convention va nuoc dan', 'LECTURE', 30, 1, false, _sc('<h2>Nuoc dan</h2><p>BWM Convention 2017: xu ly nuoc dan chong xam nhap sinh vat la. Tieu chuan D-2: < 10 sinh vat/m3. He thong: UV, dien phan, loc. Nhat ky Ballast bat buoc.</p>')),
    (v_ch, 'Cong uoc Hong Kong (tai che tau)', 'LECTURE', 25, 2, false, _sc('<h2>Tai che tau</h2><p>Hong Kong Convention 2009 (co hieu luc 2025): IHM (Inventory of Hazardous Materials), Ship Recycling Plan. Bao ve cong nhan va moi truong tai co so pha do.</p>')),
    (v_ch, 'Bai tap phan tich MARPOL', 'ASSIGNMENT', 35, 3, false, _sc('<h2>BT MARPOL</h2><p>Phan tich vu o nhiem dau (vi du: Wakashio 2020, Mauritius). Xac dinh vi pham MARPOL, trach nhiem, boi thuong. Nop PDF 3 trang.</p>')),
    (v_ch, 'Kiem tra chuong 3', 'QUIZ', 20, 4, false, NULL);

  -- Chapter 4: Luat Hang hai Viet Nam
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Luat Hang hai Viet Nam', 'Bo luat Hang hai VN 2015', 3)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Bo luat Hang hai VN 2015', 'LECTURE', 40, 0, false, _sc('<h2>Luat HH VN</h2><p>20 chuong, 341 dieu. Pham vi: tau bien, cang bien, hop dong van chuyen, thuyen vien, tai nan, bao hiem, trach nhiem. Co quan: Cuc Hang hai VN (VINAMARINE).</p>')),
    (v_ch, 'Dang ky tau va co tau', 'LECTURE', 30, 1, false, _sc('<h2>Dang ky tau</h2><p>Dang ky tai So dang ky tau bien Viet Nam. Co tau: quoc ky, giay chung nhan. Dieu kien: so huu hop phap, dang kiem, bao hiem. Quyen treo co VN.</p>')),
    (v_ch, 'Thuyen vien va lao dong hang hai', 'LECTURE', 30, 2, false, _sc('<h2>Thuyen vien</h2><p>Chung chi STCW, so thuyen vien, hop dong lao dong. Quyen: luong, nghi phep, hoi huong, bao hiem. Bo nhiem thuyen truong va trach nhiem phap ly.</p>')),
    (v_ch, 'Kiem tra chuong 4', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 5: Hop dong Van chuyen
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Hop dong Van chuyen', 'Hop dong, B/L, Charter Party', 4)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Hop dong van chuyen hang hoa', 'LECTURE', 35, 0, false, _sc('<h2>HD Van chuyen</h2><p>2 loai: van chuyen theo chuyen (Voyage Charter) va van chuyen theo thoi gian (Time Charter). Bill of Lading: chung tu van chuyen, bien nhan hang, chung tu so huu.</p>')),
    (v_ch, 'Charter Party', 'LECTURE', 30, 1, false, _sc('<h2>Charter Party</h2><p>Voyage C/P: Gencon. Time C/P: NYPE, Baltime. Bareboat C/P: Barecon. Cac dieu khoan: laycan, laytime, demurrage, dispatch, off-hire, redelivery.</p>')),
    (v_ch, 'Bai tap phan tich B/L', 'ASSIGNMENT', 35, 2, false, _sc('<h2>BT B/L</h2><p>Doc va phan tich 1 van B/L mau. Xac dinh: nguoi gui, nguoi nhan, hang hoa, dieu khoan. Nop phan tich PDF 2 trang.</p>')),
    (v_ch, 'Kiem tra chuong 5', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 6: Thi cuoi khoa Luat
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Thi cuoi khoa Luat', 'Kiem tra tong hop', 5)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'On tap toan khoa', 'LECTURE', 30, 0, false, _sc('<h2>On tap LAW-101</h2><p>Tong hop: UNCLOS, SOLAS/COLREG, MARPOL/BWM, Luat VN, hop dong/B/L. Thi: 25 trac nghiem + 1 tinh huong, 45 phut, dat 60/100.</p>')),
    (v_ch, 'Bai tap cuoi khoa', 'ASSIGNMENT', 40, 1, false, _sc('<h2>BT Cuoi khoa</h2><p>Phan tich vu va cham tau: xac dinh vi pham COLREG, trach nhiem phap ly theo Luat Hang hai VN, boi thuong. Nop PDF 4 trang.</p>')),
    (v_ch, 'Thi cuoi khoa Luat Hang hai', 'QUIZ', 45, 2, false, NULL);

END $$;
-- Course: NAV-301
DO $$ DECLARE v_c UUID; v_ch UUID;
BEGIN
  SELECT id INTO v_c FROM courses WHERE code = 'NAV-301';
  IF v_c IS NULL THEN RETURN; END IF;

  -- Chapter 1: Khi tuong Hang hai
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Khi tuong Hang hai', 'Thoi tiet va khi hau hang hai', 0)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'He thong thoi tiet toan cau', 'LECTURE', 35, 0, true, _sc('<h2>Thoi tiet</h2><p>Khi quyen, ap suat, gio. Dai ap cao (anticyclone) va dai ap thap (cyclone). Front nong/lanh. Passat, Gio mua, Tay on doi. Anh huong den tuyen hang hai.</p>')),
    (v_ch, 'Doc ban do thoi tiet hang hai', 'LECTURE', 35, 1, false, _sc('<h2>Ban do Thoi tiet</h2><p>Surface chart: isobar, front, center L/H. 500hPa chart: luong gio tren cao. GRIB data: du bao so tren ECDIS. Nguon: NOAA, ECMWF, JMA.</p>')),
    (v_ch, 'Bao nhiet doi va tranh bao', 'LECTURE', 40, 2, false, _sc('<h2>Bao nhiet doi</h2><p>Bao (Typhoon/Cyclone/Hurricane) hinh thanh tren bien nhiet doi. Phan loai: ap thap, bao, sieu bao. Quy tac Buys-Ballot xac dinh tam bao. Tranh: khong vao ban kinh 200NM, di huong vuong goc duong di bao.</p>')),
    (v_ch, 'Bai tap doc ban do thoi tiet', 'ASSIGNMENT', 35, 3, false, _sc('<h2>BT Thoi tiet</h2><p>Phan tich 3 ban do thoi tiet hang hai: xac dinh front, ap suat, gio, song. Du bao xu huong 24h. Nop PDF.</p>')),
    (v_ch, 'Kiem tra chuong 1', 'QUIZ', 20, 4, false, NULL);

  -- Chapter 2: Hai duong hoc Ung dung
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Hai duong hoc Ung dung', 'Song, dong chay, bang', 1)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Song va swell', 'LECTURE', 35, 0, false, _sc('<h2>Song bien</h2><p>Song gio (wind wave) va swell (song tu xa). Do cao song (Hs), chu ky (Ts). Thang Douglas. Anh huong: rolling, pitching, slamming, green sea. Du bao song: Beaufort, WMO.</p>')),
    (v_ch, 'Dong hai luu va nhiet do bien', 'LECTURE', 30, 1, false, _sc('<h2>Hai luu</h2><p>Dong hai luu lon: Gulf Stream, Kuroshio, Benguela. Anh huong nhiet do, suong mu, bao. Ban do dong chay (Pilot Chart). Upwelling va El Nino.</p>')),
    (v_ch, 'Bang va hang hai vung lanh', 'LECTURE', 30, 2, false, _sc('<h2>Bang</h2><p>Iceberg, pack ice, fast ice. Ice Patrol (sau Titanic 1912). Ice class cho tau chay vung cuc. Tuyen Bac Cuc (NSR, NWP) ngay cang kha thi do bien doi khi hau.</p>')),
    (v_ch, 'Kiem tra chuong 2', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 3: Dieu dong Tau co ban
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Dieu dong Tau co ban', 'Tinh nang dieu dong va cac bai tap', 2)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Tinh nang dieu dong tau', 'LECTURE', 35, 0, false, _sc('<h2>Dieu dong</h2><p>Turning circle, advance, transfer, tactical diameter. Stopping distance va crash stop. Anh huong: propeller effect (kick), wind, current, shallow water (squat, bank effect).</p>')),
    (v_ch, 'Dieu dong trong luong hang hai', 'LECTURE', 35, 1, false, _sc('<h2>Luong hang hai</h2><p>TSS (Traffic Separation Scheme): di dung lane, cat tai goc vuong. VTS (Vessel Traffic Service): bao cao vi tri. Hoa tieu (Pilot): bat buoc tai nhieu cang.</p>')),
    (v_ch, 'Ky thuat neo tau', 'LECTURE', 30, 2, false, _sc('<h2>Neo tau</h2><p>Chon vi tri neo: do sau, day bien, che gio. Tinh do dai xich neo: 5-7 lan do sau. Kiem tra neo bam: bearing cua muc tieu co dinh. Neo khi bao: 2 neo, may san sang.</p>')),
    (v_ch, 'Bai tap dieu dong mo phong', 'ASSIGNMENT', 40, 3, false, _sc('<h2>BT Dieu dong</h2><p>3 bai tap mo phong: ra vao cang HP (gio NE 20kts), tranh va trong TSS, neo tai Vung Tau. Ghi nhan thong so, danh gia. Nop PDF.</p>')),
    (v_ch, 'Kiem tra chuong 3', 'QUIZ', 20, 4, false, NULL);

  -- Chapter 4: Cap cang va Roi cang
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Cap cang va Roi cang', 'Ky thuat cap/roi cang an toan', 3)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Chuan bi cap cang', 'LECTURE', 30, 0, false, _sc('<h2>Cap cang</h2><p>Passage plan vao cang: hai do chi tiet, thuy trieu, hoa tieu. Chuan bi: may lai, neo, day buoc, fender. Lien lac VTS. Giam toc do tu xa.</p>')),
    (v_ch, 'Ky thuat buoc tau', 'LECTURE', 30, 1, false, _sc('<h2>Buoc tau</h2><p>Day buoc: head line, stern line, breast line, spring line. Chat lieu: nylon, polypropylene, wire. Winch va bollard. Khong dung trong bight of the rope!</p>')),
    (v_ch, 'Bai tap cap cang mo phong', 'ASSIGNMENT', 40, 2, false, _sc('<h2>BT Cap cang</h2><p>Mo phong cap cang Da Nang (gio S 15kts, dong chay 1kt): lien lac VTS, don hoa tieu, dieu dong, buoc tau. Ghi buoc va nhan xet. Nop PDF.</p>')),
    (v_ch, 'Kiem tra chuong 4', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 5: Thi cuoi khoa
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Thi cuoi khoa', 'Kiem tra tong hop', 4)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'On tap toan khoa', 'LECTURE', 30, 0, false, _sc('<h2>On tap NAV-301</h2><p>Tong hop: khi tuong, hai duong, dieu dong, cap/roi cang. Thi: 20 trac nghiem + 2 tinh huong mo phong, 60 phut, dat 70/100.</p>')),
    (v_ch, 'Thi cuoi khoa Khi tuong & Dieu dong', 'QUIZ', 60, 1, false, NULL);

END $$;
-- Course: NAV-102
DO $$ DECLARE v_c UUID; v_ch UUID;
BEGIN
  SELECT id INTO v_c FROM courses WHERE code = 'NAV-102';
  IF v_c IS NULL THEN RETURN; END IF;

  -- Chapter 1: Maritime English Basics
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Maritime English Basics', 'Tu vung hang hai co ban', 0)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Ship types and parts', 'LECTURE', 30, 0, true, _sc('<h2>Ship Vocabulary</h2><p>Tau va cac bo phan: bow (mui), stern (lai), port (trai), starboard (phai), bridge (buong lai), engine room (buong may). Ship types: tanker, container, bulk carrier.</p>')),
    (v_ch, 'Navigation terminology', 'LECTURE', 30, 1, false, _sc('<h2>Navigation Terms</h2><p>Course, bearing, heading, waypoint, ETA, ETD, draft, freeboard, trim. Compass: true, magnetic, compass. Chart: depth, contour, buoy, lighthouse.</p>')),
    (v_ch, 'Engine room terminology', 'LECTURE', 25, 2, false, _sc('<h2>Engine Terms</h2><p>Main engine, auxiliary, generator, pump, valve, pipe, filter, cooler. Fuel: HFO, MDO, MGO. Maintenance: overhaul, inspection, repair.</p>')),
    (v_ch, 'Kiem tra chuong 1', 'QUIZ', 15, 3, false, NULL);

  -- Chapter 2: IMO SMCP
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'IMO SMCP', 'Standard Marine Communication Phrases', 1)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'SMCP structure and usage', 'LECTURE', 35, 0, false, _sc('<h2>SMCP</h2><p>IMO SMCP: External (ship-shore, ship-ship) va On-board. Marker phrases: Instruction, Advice, Warning, Information, Question, Answer, Request, Intention.</p>')),
    (v_ch, 'Distress and safety communication', 'LECTURE', 35, 1, false, _sc('<h2>Distress Comms</h2><p>MAYDAY (distress), PAN PAN (urgency), SECURITE (safety). Format: MAYDAY x3, This is [vessel] x3, MAYDAY [vessel], position, nature of distress, assistance required.</p>')),
    (v_ch, 'Pilotage and berthing phrases', 'LECTURE', 30, 2, false, _sc('<h2>Pilotage English</h2><p>Pilot boarding: What is your draft? Ready to receive pilot. Berthing: dead slow ahead, stop engine, let go forward spring. Departure: singled up, let go all.</p>')),
    (v_ch, 'Bai tap SMCP', 'ASSIGNMENT', 30, 3, false, _sc('<h2>BT SMCP</h2><p>Hoan thanh 10 doan hoi thoai SMCP: distress call, pilot boarding, berthing, departure, weather report. Nop audio hoac text.</p>')),
    (v_ch, 'Kiem tra chuong 2', 'QUIZ', 20, 4, false, NULL);

  -- Chapter 3: VHF Communication
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'VHF Communication', 'Giao tiep VHF hang hai', 2)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'VHF radio operation', 'LECTURE', 30, 0, false, _sc('<h2>VHF Operation</h2><p>VHF marine band: Ch16 (distress/calling), Ch13 (bridge-to-bridge), Ch12 (VTS). Quy trinh: goi ten tau x3, This is x3, Over. Phonetic alphabet: Alpha, Bravo, Charlie...</p>')),
    (v_ch, 'VTS reporting', 'LECTURE', 30, 1, false, _sc('<h2>VTS Report</h2><p>Bao cao VTS: vessel name, call sign, position, course, speed, destination, ETA, cargo, draft, persons on board. Ket noi AIS.</p>')),
    (v_ch, 'Bai tap giao tiep VHF', 'ASSIGNMENT', 30, 2, false, _sc('<h2>BT VHF</h2><p>Nghe va dien 5 doan VHF: position report, weather warning, pilot request, traffic information, distress relay. Nop text.</p>')),
    (v_ch, 'Kiem tra chuong 3', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 4: Maritime Documents
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Maritime Documents', 'Tai lieu hang hai tieng Anh', 3)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'Logbook entries', 'LECTURE', 30, 0, false, _sc('<h2>Logbook</h2><p>Deck logbook: vi tri, thoi tiet, su kien. Engine logbook: thong so may. Oil Record Book. Garbage Record Book. Viet chinh xac, ro rang, khong tay xoa.</p>')),
    (v_ch, 'Sea Protest va bao cao', 'LECTURE', 25, 1, false, _sc('<h2>Sea Protest</h2><p>Sea Protest (Khang nghi hang hai): khi hang hoa hu hong do thoi tiet. Note of Protest tai cang den. Incident Report: tai nan, o nhiem, su co.</p>')),
    (v_ch, 'Doc hieu tai lieu ky thuat', 'LECTURE', 30, 2, false, _sc('<h2>Technical Docs</h2><p>Manual: operation manual, maintenance manual. Safety Data Sheet (SDS). Classification survey report. Certificates: SOLAS, MARPOL, ISPS.</p>')),
    (v_ch, 'Kiem tra chuong 4', 'QUIZ', 20, 3, false, NULL);

  -- Chapter 5: Thi cuoi khoa
  INSERT INTO chapters (course_id, title, description, order_index)
  VALUES (v_c, 'Thi cuoi khoa', 'Kiem tra tong hop Tieng Anh Hang hai', 4)
  RETURNING id INTO v_ch;

  INSERT INTO lessons (chapter_id, title, lesson_type, duration_minutes, order_index, is_free, content_blocks)
  VALUES
    (v_ch, 'On tap toan khoa', 'LECTURE', 25, 0, false, _sc('<h2>On tap NAV-102</h2><p>Tong hop: vocabulary, SMCP, VHF, documents. Thi: 20 trac nghiem + 1 listening + 1 writing, 40 phut, dat 60/100.</p>')),
    (v_ch, 'Thi cuoi khoa Tieng Anh Hang hai', 'QUIZ', 40, 1, false, NULL);

END $$;
-- Remove temporary defaults
ALTER TABLE chapters ALTER COLUMN id DROP DEFAULT;
ALTER TABLE chapters ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE lessons ALTER COLUMN id DROP DEFAULT;
ALTER TABLE lessons ALTER COLUMN created_at DROP DEFAULT;

-- Cleanup helper function
DROP FUNCTION IF EXISTS _sc(TEXT);
