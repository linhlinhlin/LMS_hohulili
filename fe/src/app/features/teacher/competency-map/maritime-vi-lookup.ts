import { matchStandards } from './keywords-catalog';

export const STANDARD_VI: Record<string, string> = {
  STCW: 'Huấn luyện & Chứng chỉ Hàng hải',
  SOLAS: 'An toàn Sinh mạng trên Biển',
  MARPOL: 'Phòng chống Ô nhiễm Biển',
  COLREGS: 'Quy tắc Tránh Va chạm',
};

export const CATEGORY_VI: Record<string, string> = {
  Deck: 'Boong',
  Engine: 'Máy',
  Safety: 'An toàn',
  Radio: 'Vô tuyến',
  Security: 'An ninh',
  Tanker: 'Tàu chở dầu/khí',
  General: 'Chung',
  'Fire Safety': 'Phòng cháy',
  'Life-Saving': 'Cứu sinh',
  Navigation: 'Hàng hải',
  Cargo: 'Hàng hóa',
  Pollution: 'Ô nhiễm',
  'Navigation Rules': 'Quy tắc tránh va',
  'Lights and Shapes': 'Đèn & Hình hiệu',
  'Sound and Light Signals': 'Tín hiệu âm & ánh sáng',
  'Chemical Tanker': 'Tàu hóa chất',
  'Gas Tanker': 'Tàu khí',
  'Dangerous Goods': 'Hàng nguy hiểm',
};

export const COMPETENCY_VI: Record<string, string> = {
  'A-II/1': 'Sĩ quan trực ca boong (Cấp vận hành)',
  'A-II/2': 'Thuyền phó/Thuyền trưởng (Cấp quản lý)',
  'A-II/3': 'Sĩ quan trực ca tàu nhỏ (< 500 GT)',
  'A-II/4': 'Thủy thủ trực ca boong',
  'A-II/5': 'Thủy thủ có kinh nghiệm (Boong)',
  'A-III/1': 'Sĩ quan trực ca buồng máy (Cấp vận hành)',
  'A-III/2': 'Máy trưởng / Đại phó máy (Cấp quản lý)',
  'A-III/3': 'Sĩ quan điện tàu biển',
  'A-III/4': 'Thủy thủ trực ca buồng máy',
  'A-III/5': 'Thủy thủ giỏi máy',
  'A-IV/2': 'Sĩ quan vô tuyến điện GMDSS',
  'A-V/1-1': 'Huấn luyện cơ bản tàu chở dầu',
  'A-V/1-2': 'Huấn luyện cơ bản tàu chở hóa chất',
  'A-V/1-3': 'Huấn luyện cơ bản tàu chở khí hóa lỏng',
  'A-VI/1-1': 'Kỹ thuật sống sót cá nhân (PST)',
  'A-VI/1-2': 'Phòng cháy & Chữa cháy cơ bản',
  'A-VI/1-3': 'Sơ cứu y tế cơ bản',
  'A-VI/1-4': 'An toàn cá nhân & Trách nhiệm xã hội',
  'A-VI/2-1': 'Xưởng & Bè cứu sinh',
  'A-VI/2-2': 'Xuồng cứu nạn nhanh',
  'A-VI/3': 'Chữa cháy nâng cao',
  'A-VI/4-1': 'Y tế nâng cao',
  'A-VI/4-2': 'Y tế chăm sóc',
  'A-VI/6-1': 'An ninh cơ bản',
  'A-VI/6-2': 'Sĩ quan an ninh tàu (SSO)',
  // legacy codes for backward compat
  'A-VI/1': 'Huấn luyện an toàn cơ bản (STCW)',
  'A-VI/2': 'Vận hành phương tiện cứu sinh & xuồng',
  'A-VI/4': 'Hỗ trợ y tế trên biển',
  'A-VI/5': 'Sĩ quan bảo vệ tàu (Ship Security Officer)',
  'A-VI/6': 'Nhận thức bảo vệ & trách nhiệm ISPS',
};

export interface LessonSuggestion {
  code: string;
  standardType: string;
  title: string;
  score: number;
  matchedKeywords: string[];
  confidence: 'strong' | 'possible';
  note: string;
}

export function getSuggestionsForTitle(text: string, limit = 6): LessonSuggestion[] {
  return matchStandards(text, limit).map((m) => ({
    code: m.code,
    standardType: m.standardType,
    title: m.title,
    score: m.score,
    matchedKeywords: m.matchedKeywords,
    confidence: m.confidence,
    note: m.title,
  }));
}

export function getCompetencyViTitle(code: string): string {
  return COMPETENCY_VI[code] ?? '';
}

export function getStandardViName(code: string): string {
  return STANDARD_VI[code] ?? code;
}

export function getCategoryViName(category: string): string {
  return CATEGORY_VI[category] ?? category;
}
