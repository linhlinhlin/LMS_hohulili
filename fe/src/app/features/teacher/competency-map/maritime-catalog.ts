export interface CatalogTable {
  code: string;
  viTitle: string;
  enTitle: string;
  category: string;
}

export interface CatalogStandard {
  code: string;
  viName: string;
  enName: string;
  tables: CatalogTable[];
}

export const MARITIME_CATALOG: CatalogStandard[] = [
  {
    code: 'STCW',
    viName: 'Huấn luyện & Chứng chỉ Hàng hải',
    enName: 'Standards of Training, Certification and Watchkeeping',
    tables: [
      { code: 'A-II/1', viTitle: 'Sĩ quan trực ca boong (Cấp vận hành)', enTitle: 'Officer in charge of a navigational watch — operational level', category: 'Deck' },
      { code: 'A-II/2', viTitle: 'Thuyền trưởng & Đại phó (Cấp quản lý)', enTitle: 'Master and chief mate — management level', category: 'Deck' },
      { code: 'A-II/3', viTitle: 'Sĩ quan trực ca tàu nhỏ (< 500 GT)', enTitle: 'Officer in charge of a navigational watch on vessels < 500 GT', category: 'Deck' },
      { code: 'A-II/4', viTitle: 'Thủy thủ trực ca boong', enTitle: 'Rating forming part of a navigational watch', category: 'Deck' },
      { code: 'A-II/5', viTitle: 'Thủy thủ có kinh nghiệm — Boong', enTitle: 'Able seafarer deck', category: 'Deck' },
      { code: 'A-III/1', viTitle: 'Sĩ quan trực ca buồng máy (Cấp vận hành)', enTitle: 'Officer in charge of an engineering watch — operational level', category: 'Engine' },
      { code: 'A-III/2', viTitle: 'Máy trưởng & Đại phó máy (Cấp quản lý)', enTitle: 'Chief engineer officer and second engineer officer — management level', category: 'Engine' },
      { code: 'A-III/3', viTitle: 'Sĩ quan điện tàu biển', enTitle: 'Electro-technical officer', category: 'Engine' },
      { code: 'A-III/4', viTitle: 'Thợ máy trực ca buồng máy', enTitle: 'Rating forming part of an engineering watch', category: 'Engine' },
      { code: 'A-III/5', viTitle: 'Thợ máy có kinh nghiệm', enTitle: 'Able seafarer engine', category: 'Engine' },
      { code: 'A-III/6', viTitle: 'Kỹ thuật viên điện trên tàu', enTitle: 'Electro-technical rating', category: 'Engine' },
      { code: 'A-IV/2', viTitle: 'Sĩ quan thông tin vô tuyến GMDSS', enTitle: 'GMDSS radio operator — operational level', category: 'Radio' },
      { code: 'A-V/1-1', viTitle: 'Huấn luyện cơ bản tàu dầu & hóa chất', enTitle: 'Basic training for oil and chemical tanker cargo operations', category: 'Deck' },
      { code: 'A-V/1-2', viTitle: 'Huấn luyện nâng cao — Tàu dầu', enTitle: 'Advanced training for oil tanker cargo operations', category: 'Deck' },
      { code: 'A-V/1-3', viTitle: 'Huấn luyện nâng cao — Tàu hóa chất', enTitle: 'Advanced training for chemical tanker cargo operations', category: 'Deck' },
      { code: 'A-V/2', viTitle: 'Huấn luyện tàu chở khí hóa lỏng', enTitle: 'Training for liquefied gas tanker cargo operations', category: 'Deck' },
      { code: 'A-VI/1', viTitle: 'An toàn cơ bản (STCW)', enTitle: 'Basic safety training', category: 'Safety' },
      { code: 'A-VI/2', viTitle: 'Vận hành phương tiện cứu sinh & xuồng cứu hộ', enTitle: 'Proficiency in survival craft and rescue boats', category: 'Safety' },
      { code: 'A-VI/3', viTitle: 'Chữa cháy nâng cao', enTitle: 'Advanced fire fighting', category: 'Safety' },
      { code: 'A-VI/4', viTitle: 'Hỗ trợ y tế trên biển', enTitle: 'Medical first aid and medical care', category: 'Safety' },
      { code: 'A-VI/5', viTitle: 'Sĩ quan bảo vệ tàu (SSO)', enTitle: 'Ship security officer', category: 'Safety' },
      { code: 'A-VI/6', viTitle: 'Nhận thức bảo vệ & trách nhiệm ISPS', enTitle: 'Security awareness and security duties', category: 'Safety' },
    ],
  },
  {
    code: 'SOLAS',
    viName: 'An toàn Sinh mạng trên Biển',
    enName: 'Safety of Life at Sea',
    tables: [
      { code: 'SOLAS-II-1', viTitle: 'Chương II-1 — Kết cấu, phân khoang & ổn định', enTitle: 'Chapter II-1 — Construction, subdivision and stability', category: 'General' },
      { code: 'SOLAS-II-2', viTitle: 'Chương II-2 — Phòng cháy & Chữa cháy', enTitle: 'Chapter II-2 — Fire protection, detection and extinction', category: 'Safety' },
      { code: 'SOLAS-III', viTitle: 'Chương III — Phương tiện & Trang thiết bị cứu sinh', enTitle: 'Chapter III — Life-saving appliances and arrangements', category: 'Safety' },
      { code: 'SOLAS-IV', viTitle: 'Chương IV — Vô tuyến thông tin', enTitle: 'Chapter IV — Radio communications', category: 'Radio' },
      { code: 'SOLAS-V', viTitle: 'Chương V — An toàn hàng hải', enTitle: 'Chapter V — Safety of navigation', category: 'Deck' },
      { code: 'SOLAS-VI', viTitle: 'Chương VI — Vận chuyển hàng hóa', enTitle: 'Chapter VI — Carriage of cargoes and oil fuels', category: 'Deck' },
      { code: 'SOLAS-VII', viTitle: 'Chương VII — Vận chuyển hàng nguy hiểm', enTitle: 'Chapter VII — Carriage of dangerous goods', category: 'Deck' },
      { code: 'SOLAS-IX', viTitle: 'Chương IX — Quản lý an toàn tàu (ISM)', enTitle: 'Chapter IX — Management for the safe operation of ships (ISM)', category: 'General' },
      { code: 'SOLAS-XI-1', viTitle: 'Chương XI-1 — Biện pháp đặc biệt tăng cường an toàn', enTitle: 'Chapter XI-1 — Special measures to enhance maritime safety', category: 'General' },
      { code: 'SOLAS-XI-2', viTitle: 'Chương XI-2 — Bảo vệ hàng hải (ISPS)', enTitle: 'Chapter XI-2 — Special measures to enhance maritime security (ISPS)', category: 'Safety' },
    ],
  },
  {
    code: 'MARPOL',
    viName: 'Phòng chống Ô nhiễm Biển',
    enName: 'Marine Pollution Prevention',
    tables: [
      { code: 'MARPOL-I', viTitle: 'Phụ lục I — Ngăn ngừa ô nhiễm dầu', enTitle: 'Annex I — Prevention of pollution by oil', category: 'Engine' },
      { code: 'MARPOL-II', viTitle: 'Phụ lục II — Kiểm soát chất lỏng độc hại', enTitle: 'Annex II — Control of pollution by noxious liquid substances in bulk', category: 'Engine' },
      { code: 'MARPOL-III', viTitle: 'Phụ lục III — Ngăn ngừa ô nhiễm hàng đóng gói', enTitle: 'Annex III — Prevention of pollution by harmful substances in packaged form', category: 'Deck' },
      { code: 'MARPOL-IV', viTitle: 'Phụ lục IV — Ngăn ngừa ô nhiễm nước thải', enTitle: 'Annex IV — Prevention of pollution by sewage from ships', category: 'General' },
      { code: 'MARPOL-V', viTitle: 'Phụ lục V — Ngăn ngừa ô nhiễm rác thải', enTitle: 'Annex V — Prevention of pollution by garbage from ships', category: 'General' },
      { code: 'MARPOL-VI', viTitle: 'Phụ lục VI — Ngăn ngừa ô nhiễm không khí', enTitle: 'Annex VI — Prevention of air pollution from ships', category: 'Engine' },
    ],
  },
  {
    code: 'COLREGS',
    viName: 'Quy tắc Tránh Va chạm Quốc tế',
    enName: 'International Regulations for Preventing Collisions at Sea',
    tables: [
      { code: 'COLREGS-4', viTitle: 'Quy tắc 4 — Phạm vi áp dụng', enTitle: 'Rule 4 — Application', category: 'Deck' },
      { code: 'COLREGS-5', viTitle: 'Quy tắc 5 — Quan sát', enTitle: 'Rule 5 — Look-out', category: 'Deck' },
      { code: 'COLREGS-6', viTitle: 'Quy tắc 6 — Tốc độ an toàn', enTitle: 'Rule 6 — Safe speed', category: 'Deck' },
      { code: 'COLREGS-7', viTitle: 'Quy tắc 7 — Nguy cơ va chạm', enTitle: 'Rule 7 — Risk of collision', category: 'Deck' },
      { code: 'COLREGS-8', viTitle: 'Quy tắc 8 — Hành động tránh va', enTitle: 'Rule 8 — Action to avoid collision', category: 'Deck' },
      { code: 'COLREGS-9', viTitle: 'Quy tắc 9 — Luồng hẹp', enTitle: 'Rule 9 — Narrow channels', category: 'Deck' },
      { code: 'COLREGS-10', viTitle: 'Quy tắc 10 — Phân luồng giao thông biển', enTitle: 'Rule 10 — Traffic separation schemes', category: 'Deck' },
      { code: 'COLREGS-13', viTitle: 'Quy tắc 13 — Tàu vượt', enTitle: 'Rule 13 — Overtaking', category: 'Deck' },
      { code: 'COLREGS-14', viTitle: 'Quy tắc 14 — Tình huống đối đầu', enTitle: 'Rule 14 — Head-on situation', category: 'Deck' },
      { code: 'COLREGS-15', viTitle: 'Quy tắc 15 — Tình huống cắt hướng', enTitle: 'Rule 15 — Crossing situation', category: 'Deck' },
      { code: 'COLREGS-16', viTitle: 'Quy tắc 16 — Tàu nhường đường', enTitle: 'Rule 16 — Action by give-way vessel', category: 'Deck' },
      { code: 'COLREGS-17', viTitle: 'Quy tắc 17 — Tàu giữ hướng', enTitle: 'Rule 17 — Action by stand-on vessel', category: 'Deck' },
      { code: 'COLREGS-18', viTitle: 'Quy tắc 18 — Trách nhiệm giữa các tàu', enTitle: 'Rule 18 — Responsibilities between vessels', category: 'Deck' },
      { code: 'COLREGS-19', viTitle: 'Quy tắc 19 — Hành vi khi tầm nhìn hạn chế', enTitle: 'Rule 19 — Conduct of vessels in restricted visibility', category: 'Deck' },
    ],
  },
];
