-- V57: Fix Vietnamese diacritics in all seed data
-- Fixes ASCII text without diacritics inserted by V54 and V55
-- Idempotent: all UPDATEs are safe to re-run
-- Created: 2026-02-26

-- =============================================
-- 1. USER NAMES (37 records)
-- =============================================

UPDATE users SET full_name = 'PGS.TS Phạm Văn Hải' WHERE email = 'phamvanhai@maritime.edu';
UPDATE users SET full_name = 'ThS. Nguyễn Thị Lan Hương' WHERE email = 'nguyenlanhuong@maritime.edu';
UPDATE users SET full_name = 'PGS.TS Trần Ngọc Đại' WHERE email = 'tranngocdai@maritime.edu';
UPDATE users SET full_name = 'TS. Lê Văn Hùng' WHERE email = 'levanhung@maritime.edu';
UPDATE users SET full_name = 'PGS.TS Nguyễn Minh Quân' WHERE email = 'nguyenminhquan@maritime.edu';
UPDATE users SET full_name = 'TS. Phạm Thị Hạnh' WHERE email = 'phamthihanh@maritime.edu';
UPDATE users SET full_name = 'PGS.TS Vũ Đình Thắng' WHERE email = 'vudinhthang@maritime.edu';
UPDATE users SET full_name = 'TS. Đoàn Văn Nam' WHERE email = 'doanvannam@maritime.edu';
UPDATE users SET full_name = 'PGS.TS Hoàng Thị Mai' WHERE email = 'hoangthimai@maritime.edu';
UPDATE users SET full_name = 'TS. Bùi Thanh Sơn' WHERE email = 'buithanhson@maritime.edu';
UPDATE users SET full_name = 'TS. Nguyễn Đức Anh' WHERE email = 'nguyenducanh@maritime.edu';
UPDATE users SET full_name = 'ThS. Lê Thị Mỹ Linh' WHERE email = 'lethimylinh@maritime.edu';
UPDATE users SET full_name = 'Nguyễn Văn An' WHERE email = 'nguyenvanan@sv.maritime.edu';
UPDATE users SET full_name = 'Trần Thị Bình' WHERE email = 'tranthibinh@sv.maritime.edu';
UPDATE users SET full_name = 'Lê Hoàng Cường' WHERE email = 'lehoangcuong@sv.maritime.edu';
UPDATE users SET full_name = 'Phạm Thị Dung' WHERE email = 'phamthidung@sv.maritime.edu';
UPDATE users SET full_name = 'Võ Văn Em' WHERE email = 'vovanem@sv.maritime.edu';
UPDATE users SET full_name = 'Đặng Thị Phương' WHERE email = 'dangthiphuong@sv.maritime.edu';
UPDATE users SET full_name = 'Hoàng Văn Giang' WHERE email = 'hoangvangiang@sv.maritime.edu';
UPDATE users SET full_name = 'Ngô Thị Huế' WHERE email = 'ngothihue@sv.maritime.edu';
UPDATE users SET full_name = 'Bùi Văn Khoái' WHERE email = 'buivankhoi@sv.maritime.edu';
UPDATE users SET full_name = 'Lý Thị Lan' WHERE email = 'lythilan@sv.maritime.edu';
UPDATE users SET full_name = 'Trịnh Văn Minh' WHERE email = 'trinhvanminh@sv.maritime.edu';
UPDATE users SET full_name = 'Nguyễn Thị Nga' WHERE email = 'nguyenthinga@sv.maritime.edu';
UPDATE users SET full_name = 'Đỗ Đức Thành' WHERE email = 'doducthanh@sv.maritime.edu';
UPDATE users SET full_name = 'Vũ Thị Phương' WHERE email = 'vuthiphuong@sv.maritime.edu';
UPDATE users SET full_name = 'Lê Văn Quý' WHERE email = 'levanquy@sv.maritime.edu';
UPDATE users SET full_name = 'Phạm Hoàng Sơn' WHERE email = 'phamhoangson@sv.maritime.edu';
UPDATE users SET full_name = 'Trần Văn Tuân' WHERE email = 'tranvantuan@sv.maritime.edu';
UPDATE users SET full_name = 'Nguyễn Thị Uyên' WHERE email = 'nguyenthiuyen@sv.maritime.edu';
UPDATE users SET full_name = 'Hoàng Văn Vinh' WHERE email = 'hoangvanvinh@sv.maritime.edu';
UPDATE users SET full_name = 'Đặng Thị Xuân' WHERE email = 'dangthixuan@sv.maritime.edu';
UPDATE users SET full_name = 'Bùi Văn Duy' WHERE email = 'buivanduy@sv.maritime.edu';
UPDATE users SET full_name = 'Lê Thị Hồng' WHERE email = 'lethihong@sv.maritime.edu';
UPDATE users SET full_name = 'Ngô Văn Long' WHERE email = 'ngovanlong@sv.maritime.edu';
UPDATE users SET full_name = 'Phạm Thị Oanh' WHERE email = 'phamthioanh@sv.maritime.edu';
UPDATE users SET full_name = 'Trịnh Đức Phúc' WHERE email = 'trinhducphuc@sv.maritime.edu';

-- =============================================
-- 2. COURSES (10 records)
-- =============================================

UPDATE courses SET
  title = 'Hàng Hải Địa Văn và La Bàn Từ',
  description = 'Khóa học cơ bản về hàng hải địa văn, bao gồm các phương pháp xác định vị trí tàu bằng thiên văn, la bàn từ và la bàn con quay. Phù hợp với sinh viên năm 2-3 ngành Điều khiển tàu biển theo chuẩn STCW.',
  welcome_message = 'Chào mừng các bạn đến với khóa học Hàng hải Địa văn! Đây là nền tảng của nghề đi biển.',
  course_information = 'Khóa học gồm 7 chương, 40 bài học bao gồm lý thuyết và thực hành. Yêu cầu: Toán cơ bản, Vật lý đại cương.',
  benefits = 'Xác định vị trí tàu bằng thiên văn và la bàn. Sử dụng hải đồ và các công cụ hàng hải truyền thống. Hiểu nguyên lý la bàn từ và la bàn con quay. Tính toán sai số la bàn và hiệu chỉnh.'
WHERE code = 'NAV-101';

UPDATE courses SET
  title = 'Hệ Thống Dẫn Đường Điện Tử ECDIS và Radar/ARPA',
  description = 'Khóa học nâng cao về hệ thống ECDIS, Radar và ARPA theo chuẩn IMO Model Course 1.27 và 1.07. Bao gồm thực hành mô phỏng trên phần mềm chuyên dụng.',
  welcome_message = 'Chào mừng đến với khóa học ECDIS & Radar/ARPA nâng cao!',
  course_information = 'Khóa học 6 chương, 32 bài học. Yêu cầu: Hoàn thành NAV-101 hoặc tương đương. Cần laptop cài phần mềm mô phỏng.',
  benefits = 'Vận hành thành thạo hệ thống ECDIS theo IMO. Phân tích mục tiêu Radar và sử dụng ARPA. Lập kế hoạch hành trình điện tử. Xử lý tình huống khẩn cấp bằng thiết bị điện tử.'
WHERE code = 'NAV-201';

UPDATE courses SET
  title = 'Máy Diesel Tàu Biển - Vận Hành và Bảo Dưỡng',
  description = 'Khóa học toàn diện về động cơ diesel hàng hải, từ nguyên lý hoạt động đến quy trình bảo dưỡng định kỳ. Thiết kế theo chuẩn STCW A-III/1 cho máy trưởng hạng ba.',
  welcome_message = 'Chào mừng đến với khóa học Máy Diesel Tàu biển!',
  course_information = '7 chương, 38 bài học. Yêu cầu: Cơ khí đại cương, Nhiệt động lực học cơ bản.',
  benefits = 'Hiểu cấu tạo và nguyên lý động cơ diesel 2 kỳ và 4 kỳ. Vận hành động cơ chính và động cơ phụ. Thực hiện bảo dưỡng định kỳ theo kế hoạch PMS. Xử lý sự cố và sửa chữa cơ bản.'
WHERE code = 'ENG-101';

UPDATE courses SET
  title = 'Hệ Thống Điện và Tự Động Hóa Tàu Biển',
  description = 'Khóa học chuyên sâu về hệ thống điện tàu biển, bao gồm máy phát điện, bảng điện chính, hệ thống tự động hóa và điều khiển. Theo chuẩn STCW A-III/6.',
  welcome_message = 'Chào mừng đến với khóa học Hệ thống Điện Tàu biển!',
  course_information = '6 chương, 30 bài học. Yêu cầu: Điện kỹ thuật, Điện tử cơ bản, ENG-101 hoặc tương đương.',
  benefits = 'Thiết kế và phân tích mạch điện tàu biển. Vận hành hệ thống phát và phân phối điện. Lập trình PLC và hệ thống SCADA. Bảo trì phòng ngừa thiết bị điện.'
WHERE code = 'ENG-201';

UPDATE courses SET
  title = 'Huấn Luyện An Toàn Cơ Bản STCW',
  description = 'Khóa học bắt buộc theo Công ước STCW về an toàn cơ bản cho thuyền viên. Bao gồm kỹ năng sống còn, phòng cháy chữa cháy, sơ cứu và an toàn cá nhân.',
  welcome_message = 'Chào mừng đến với khóa học An toàn Cơ bản STCW!',
  course_information = '8 chương, 35 bài học. Không yêu cầu kiến thức trước. Bắt buộc cho mọi thuyền viên.',
  benefits = 'Nắm vững kỹ năng sống còn trên biển. Phòng cháy và chữa cháy cơ bản. Sơ cứu y tế cơ bản trên tàu. Hiểu và thực hiện an toàn cá nhân và trách nhiệm xã hội.'
WHERE code = 'SAF-101';

UPDATE courses SET
  title = 'Chữa Cháy Nâng Cao và Cứu Hộ',
  description = 'Khóa học nâng cao về phòng cháy chữa cháy và cứu hộ trên tàu theo STCW A-VI/3. Bao gồm chỉ huy đội chữa cháy, kiểm soát thiệt hại và cứu hộ người rơi xuống biển.',
  welcome_message = 'Chào mừng đến với khóa học Chữa cháy Nâng cao!',
  course_information = '5 chương, 22 bài học. Yêu cầu: Hoàn thành SAF-101.',
  benefits = 'Chỉ huy đội chữa cháy trên tàu. Sử dụng thiết bị chữa cháy cố định. Kiểm soát thiệt hại sau cháy. Tổ chức và chỉ huy cứu hộ.'
WHERE code = 'SAF-201';

UPDATE courses SET
  title = 'Quản Lý Chuỗi Cung Ứng và Vận Tải Biển',
  description = 'Khóa học về quản lý chuỗi cung ứng trong ngành hàng hải, từ vận tải container đến quản lý cảng biển và logistics quốc tế.',
  welcome_message = 'Chào mừng đến với khóa học Logistics Hàng hải!',
  course_information = '6 chương, 28 bài học. Yêu cầu: Kinh tế vĩ mô, Quản trị kinh doanh cơ bản.',
  benefits = 'Hiểu chuỗi cung ứng hàng hải toàn cầu. Quản lý vận tải container và hàng rời. Tối ưu hóa hoạt động cảng biển. Ứng dụng công nghệ trong logistics.'
WHERE code = 'LOG-101';

UPDATE courses SET
  title = 'Luật Hàng Hải Quốc Tế và Việt Nam',
  description = 'Khóa học toàn diện về pháp luật hàng hải quốc tế (UNCLOS, SOLAS, MARPOL) và Luật Hàng hải Việt Nam 2015. Bao gồm hợp đồng vận chuyển, bảo hiểm và giải quyết tranh chấp.',
  welcome_message = 'Chào mừng đến với khóa học Luật Hàng hải!',
  course_information = '6 chương, 28 bài học. Yêu cầu: Pháp luật đại cương.',
  benefits = 'Nắm vững khung pháp lý hàng hải quốc tế. Hiểu Luật Hàng hải Việt Nam 2015. Phân tích hợp đồng vận chuyển và bảo hiểm. Giải quyết tranh chấp hàng hải.'
WHERE code = 'LAW-101';

UPDATE courses SET
  title = 'Khí Tượng Hải Dương và Điều Động Tàu',
  description = 'Khóa học chuyên sâu về khí tượng thủy văn ứng dụng trong hàng hải và kỹ thuật điều động tàu trong các điều kiện thời tiết phức tạp. Theo chuẩn STCW A-II/2.',
  welcome_message = 'Chào mừng đến với khóa học Khí tượng và Điều động Tàu!',
  course_information = '5 chương, 22 bài học. Yêu cầu: NAV-101, NAV-201 hoặc tương đương.',
  benefits = 'Đọc và phân tích bản đồ thời tiết. Tránh bão và thời tiết xấu. Điều động tàu trong vùng nước hạn chế. Kỹ thuật neo đậu và cập cảng an toàn.'
WHERE code = 'NAV-301';

UPDATE courses SET
  title = 'Tiếng Anh Hàng Hải Chuyên Ngành',
  description = 'Khóa học tiếng Anh chuyên ngành hàng hải theo IMO SMCP (Standard Marine Communication Phrases). Bao gồm thuật ngữ hàng hải, giao tiếp VHF và viết báo cáo.',
  welcome_message = 'Welcome to Maritime English! Chào mừng đến với khóa học Tiếng Anh Hàng hải!',
  course_information = '5 chương, 20 bài học. Yêu cầu: Tiếng Anh B1 (CEFR) trở lên.',
  benefits = 'Sử dụng thuật ngữ hàng hải bằng tiếng Anh. Giao tiếp VHF theo IMO SMCP. Viết báo cáo hàng hải (Logbook, Protest). Đọc hiểu tài liệu kỹ thuật tiếng Anh.'
WHERE code = 'NAV-102';

-- =============================================
-- 3. CHAPTERS (61 records)
-- Match by course code + order_index (unique)
-- =============================================

-- NAV-101 chapters (7)
UPDATE chapters SET title = 'Khái quát về Hàng hải Địa văn', description = 'Các khái niệm nền tảng về hàng hải địa văn'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-101') AND order_index = 0;
UPDATE chapters SET title = 'La bàn Từ và La bàn Con quay', description = 'Nguyên lý, cấu tạo, sử dụng la bàn từ và con quay'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-101') AND order_index = 1;
UPDATE chapters SET title = 'Xác định Phương hướng', description = 'Chuyển đổi hướng thật, hướng từ, hướng la bàn'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-101') AND order_index = 2;
UPDATE chapters SET title = 'Phương pháp Xác định Vị trí Tàu', description = 'Dead reckoning, phương vị, radar, thiên văn'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-101') AND order_index = 3;
UPDATE chapters SET title = 'Hải đồ và Kế hoạch Hành trình', description = 'Đọc hải đồ, ký hiệu, IMO passage planning'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-101') AND order_index = 4;
UPDATE chapters SET title = 'Thủy triều và Dòng chảy', description = 'Nguyên lý thủy triều, bảng thủy triều, dòng chảy'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-101') AND order_index = 5;
UPDATE chapters SET title = 'Thi cuối khóa', description = 'Ôn tập tổng hợp và kiểm tra cuối khóa'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-101') AND order_index = 6;

-- NAV-201 chapters (6)
UPDATE chapters SET title = 'Tổng quan ECDIS', description = 'Giới thiệu hệ thống hải đồ điện tử ECDIS'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-201') AND order_index = 0;
UPDATE chapters SET title = 'Radar hàng hải', description = 'Nguyên lý Radar và ứng dụng hàng hải'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-201') AND order_index = 1;
UPDATE chapters SET title = 'Hệ thống ARPA', description = 'Tự động theo dõi và phân tích va chạm'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-201') AND order_index = 2;
UPDATE chapters SET title = 'AIS và Hệ thống Tích hợp', description = 'AIS, VDR, LRIT và tích hợp buồng lái'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-201') AND order_index = 3;
UPDATE chapters SET title = 'Xử lý Sự cố và An toàn', description = 'Xử lý lỗi, backup, an toàn hàng hải điện tử'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-201') AND order_index = 4;
UPDATE chapters SET title = 'Thực hành Mô phỏng', description = 'Thực hành trên simulator'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-201') AND order_index = 5;

-- ENG-101 chapters (7)
UPDATE chapters SET title = 'Tổng quan Động cơ Diesel Hàng hải', description = 'Lịch sử và phân loại động cơ diesel tàu'
WHERE course_id = (SELECT id FROM courses WHERE code = 'ENG-101') AND order_index = 0;
UPDATE chapters SET title = 'Hệ thống Phụ trợ Động cơ', description = 'Làm mát, bôi trơn, khởi động, khí nén'
WHERE course_id = (SELECT id FROM courses WHERE code = 'ENG-101') AND order_index = 1;
UPDATE chapters SET title = 'Vận hành Động cơ Chính', description = 'Quy trình khởi động, vận hành, dừng máy'
WHERE course_id = (SELECT id FROM courses WHERE code = 'ENG-101') AND order_index = 2;
UPDATE chapters SET title = 'Bảo dưỡng Định kỳ (PMS)', description = 'Kế hoạch bảo dưỡng phòng ngừa'
WHERE course_id = (SELECT id FROM courses WHERE code = 'ENG-101') AND order_index = 3;
UPDATE chapters SET title = 'Máy phát Điện', description = 'Máy phát điện tàu và bảng điện chính'
WHERE course_id = (SELECT id FROM courses WHERE code = 'ENG-101') AND order_index = 4;
UPDATE chapters SET title = 'Hệ thống Nồi hơi và Hơi nước', description = 'Nồi hơi, xử lý nước, hệ thống hơi'
WHERE course_id = (SELECT id FROM courses WHERE code = 'ENG-101') AND order_index = 5;
UPDATE chapters SET title = 'Thi cuối khóa Máy Diesel', description = 'Ôn tập và kiểm tra tổng hợp'
WHERE course_id = (SELECT id FROM courses WHERE code = 'ENG-101') AND order_index = 6;

-- ENG-201 chapters (6)
UPDATE chapters SET title = 'Hệ thống Điện tàu biển', description = 'Tổng quan hệ thống điện 3 pha trên tàu'
WHERE course_id = (SELECT id FROM courses WHERE code = 'ENG-201') AND order_index = 0;
UPDATE chapters SET title = 'Tự động hóa Tàu biển', description = 'Hệ thống điều khiển tự động'
WHERE course_id = (SELECT id FROM courses WHERE code = 'ENG-201') AND order_index = 1;
UPDATE chapters SET title = 'Điện tử Công suất', description = 'Bộ biến đổi, UPS, hệ thống nạp'
WHERE course_id = (SELECT id FROM courses WHERE code = 'ENG-201') AND order_index = 2;
UPDATE chapters SET title = 'Hệ thống Báo động và An toàn', description = 'AMS, phòng cháy, bảo vệ'
WHERE course_id = (SELECT id FROM courses WHERE code = 'ENG-201') AND order_index = 3;
UPDATE chapters SET title = 'Bảo trì và Kiểm tra', description = 'Bảo trì điện định kỳ và kiểm tra đăng kiểm'
WHERE course_id = (SELECT id FROM courses WHERE code = 'ENG-201') AND order_index = 4;
UPDATE chapters SET title = 'Thi cuối khóa', description = 'Thực hành tổng hợp'
WHERE course_id = (SELECT id FROM courses WHERE code = 'ENG-201') AND order_index = 5;

-- SAF-101 chapters (8)
UPDATE chapters SET title = 'Kỹ năng Sống còn', description = 'Sinh tồn trên biển theo STCW A-VI/1-1'
WHERE course_id = (SELECT id FROM courses WHERE code = 'SAF-101') AND order_index = 0;
UPDATE chapters SET title = 'Phòng cháy và Chữa cháy Cơ bản', description = 'Kiến thức cơ bản về cháy và các loại bình chữa'
WHERE course_id = (SELECT id FROM courses WHERE code = 'SAF-101') AND order_index = 1;
UPDATE chapters SET title = 'Sơ cứu Y tế Cơ bản', description = 'Sơ cứu, hồi sức, xử lý thương tích'
WHERE course_id = (SELECT id FROM courses WHERE code = 'SAF-101') AND order_index = 2;
UPDATE chapters SET title = 'An toàn Cá nhân và Trách nhiệm Xã hội', description = 'STCW A-VI/1-4'
WHERE course_id = (SELECT id FROM courses WHERE code = 'SAF-101') AND order_index = 3;
UPDATE chapters SET title = 'Thực hành An toàn', description = 'Các bài thực hành kỹ năng'
WHERE course_id = (SELECT id FROM courses WHERE code = 'SAF-101') AND order_index = 4;
UPDATE chapters SET title = 'Kiểm soát Đám đông', description = 'Quản lý hành khách và khẩn cấp'
WHERE course_id = (SELECT id FROM courses WHERE code = 'SAF-101') AND order_index = 5;
UPDATE chapters SET title = 'Phòng chống Ô nhiễm', description = 'MARPOL và bảo vệ môi trường'
WHERE course_id = (SELECT id FROM courses WHERE code = 'SAF-101') AND order_index = 6;
UPDATE chapters SET title = 'Thi cuối khóa An toàn', description = 'Kiểm tra tổng hợp'
WHERE course_id = (SELECT id FROM courses WHERE code = 'SAF-101') AND order_index = 7;

-- SAF-201 chapters (5)
UPDATE chapters SET title = 'Chỉ huy Chữa cháy', description = 'Vai trò chỉ huy đội chữa cháy trên tàu'
WHERE course_id = (SELECT id FROM courses WHERE code = 'SAF-201') AND order_index = 0;
UPDATE chapters SET title = 'Chữa cháy Đặc biệt', description = 'Cháy buồng máy, két hàng, hóa chất'
WHERE course_id = (SELECT id FROM courses WHERE code = 'SAF-201') AND order_index = 1;
UPDATE chapters SET title = 'Kiểm soát Thiệt hại', description = 'Hạn chế thiệt hại sau sự cố'
WHERE course_id = (SELECT id FROM courses WHERE code = 'SAF-201') AND order_index = 2;
UPDATE chapters SET title = 'Cứu hộ Người rơi Biển', description = 'Man overboard và cứu hộ trên biển'
WHERE course_id = (SELECT id FROM courses WHERE code = 'SAF-201') AND order_index = 3;
UPDATE chapters SET title = 'Thi cuối khóa', description = 'Kiểm tra tổng hợp chữa cháy nâng cao'
WHERE course_id = (SELECT id FROM courses WHERE code = 'SAF-201') AND order_index = 4;

-- LOG-101 chapters (6)
UPDATE chapters SET title = 'Tổng quan Logistics Hàng hải', description = 'Chuỗi cung ứng và vai trò vận tải biển'
WHERE course_id = (SELECT id FROM courses WHERE code = 'LOG-101') AND order_index = 0;
UPDATE chapters SET title = 'Vận tải Container', description = 'Container hóa và quy trình'
WHERE course_id = (SELECT id FROM courses WHERE code = 'LOG-101') AND order_index = 1;
UPDATE chapters SET title = 'Quản lý Cảng biển', description = 'Hoạt động cảng và logistics cảng'
WHERE course_id = (SELECT id FROM courses WHERE code = 'LOG-101') AND order_index = 2;
UPDATE chapters SET title = 'Logistics Quốc tế', description = 'Quản lý chuỗi cung ứng đa phương thức'
WHERE course_id = (SELECT id FROM courses WHERE code = 'LOG-101') AND order_index = 3;
UPDATE chapters SET title = 'Công nghệ trong Logistics', description = 'Số hóa và công nghệ mới'
WHERE course_id = (SELECT id FROM courses WHERE code = 'LOG-101') AND order_index = 4;
UPDATE chapters SET title = 'Thi cuối khóa Logistics', description = 'Kiểm tra tổng hợp'
WHERE course_id = (SELECT id FROM courses WHERE code = 'LOG-101') AND order_index = 5;

-- LAW-101 chapters (6)
UPDATE chapters SET title = 'Luật Biển Quốc tế', description = 'UNCLOS và các vùng biển'
WHERE course_id = (SELECT id FROM courses WHERE code = 'LAW-101') AND order_index = 0;
UPDATE chapters SET title = 'Công ước An toàn Hàng hải', description = 'SOLAS, Load Lines, COLREG'
WHERE course_id = (SELECT id FROM courses WHERE code = 'LAW-101') AND order_index = 1;
UPDATE chapters SET title = 'Công ước Bảo vệ Môi trường', description = 'MARPOL và quy định môi trường'
WHERE course_id = (SELECT id FROM courses WHERE code = 'LAW-101') AND order_index = 2;
UPDATE chapters SET title = 'Luật Hàng hải Việt Nam', description = 'Bộ luật Hàng hải VN 2015'
WHERE course_id = (SELECT id FROM courses WHERE code = 'LAW-101') AND order_index = 3;
UPDATE chapters SET title = 'Hợp đồng Vận chuyển', description = 'Hợp đồng, B/L, Charter Party'
WHERE course_id = (SELECT id FROM courses WHERE code = 'LAW-101') AND order_index = 4;
UPDATE chapters SET title = 'Thi cuối khóa Luật', description = 'Kiểm tra tổng hợp'
WHERE course_id = (SELECT id FROM courses WHERE code = 'LAW-101') AND order_index = 5;

-- NAV-301 chapters (5)
UPDATE chapters SET title = 'Khí tượng Hàng hải', description = 'Thời tiết và khí hậu hàng hải'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-301') AND order_index = 0;
UPDATE chapters SET title = 'Hải dương học Ứng dụng', description = 'Sóng, dòng chảy, băng'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-301') AND order_index = 1;
UPDATE chapters SET title = 'Điều động Tàu cơ bản', description = 'Tính năng điều động và các bài tập'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-301') AND order_index = 2;
UPDATE chapters SET title = 'Cập cảng và Rời cảng', description = 'Kỹ thuật cập/rời cảng an toàn'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-301') AND order_index = 3;
UPDATE chapters SET title = 'Thi cuối khóa', description = 'Kiểm tra tổng hợp'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-301') AND order_index = 4;

-- NAV-102 chapters (5)
UPDATE chapters SET title = 'Maritime English Basics', description = 'Từ vựng hàng hải cơ bản'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-102') AND order_index = 0;
UPDATE chapters SET title = 'IMO SMCP', description = 'Standard Marine Communication Phrases'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-102') AND order_index = 1;
UPDATE chapters SET title = 'VHF Communication', description = 'Giao tiếp VHF hàng hải'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-102') AND order_index = 2;
UPDATE chapters SET title = 'Maritime Documents', description = 'Tài liệu hàng hải tiếng Anh'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-102') AND order_index = 3;
UPDATE chapters SET title = 'Thi cuối khóa', description = 'Kiểm tra tổng hợp Tiếng Anh Hàng hải'
WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-102') AND order_index = 4;
