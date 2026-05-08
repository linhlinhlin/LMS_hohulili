import { Injectable } from '@angular/core';

export interface KupItem {
  id: string;
  text: string;
  type: 'K' | 'U' | 'P';
  earnedHere: boolean;
}

export interface CareerCertInfo {
  certificateName: string;
  viCertName: string;
  description: string;
}

const KUP_LOOKUP: Record<string, KupItem[]> = {
  'A-II/1': [
    { id: 'k1', text: 'Hiểu hệ thống hàng hải và thiết bị điều hướng (RADAR, ECDIS)', type: 'K', earnedHere: true },
    { id: 'k2', text: 'Nắm vững nguyên tắc trực ca và phân luồng giao thông biển', type: 'K', earnedHere: true },
    { id: 'u1', text: 'Áp dụng COLREGS trong các tình huống va chạm thực tế', type: 'U', earnedHere: false },
    { id: 'p1', text: 'Thực hành điều hướng bằng RADAR và hải đồ điện tử', type: 'P', earnedHere: false },
  ],
  'A-II/2': [
    { id: 'k1', text: 'Nắm vững nguyên tắc quản lý và lãnh đạo trên tàu', type: 'K', earnedHere: true },
    { id: 'u1', text: 'Hiểu trách nhiệm pháp lý của Thuyền trưởng', type: 'U', earnedHere: true },
    { id: 'p1', text: 'Thực hành quản lý nguồn lực buồng lái (BRM)', type: 'P', earnedHere: false },
  ],
  'A-III/1': [
    { id: 'k1', text: 'Hiểu nguyên lý vận hành động cơ diesel và hệ thống đẩy', type: 'K', earnedHere: true },
    { id: 'k2', text: 'Nắm vững quy trình trực ca buồng máy an toàn', type: 'K', earnedHere: true },
    { id: 'u1', text: 'Chẩn đoán sự cố máy móc và hệ thống phụ trợ', type: 'U', earnedHere: false },
    { id: 'p1', text: 'Vận hành và bảo dưỡng thiết bị buồng máy', type: 'P', earnedHere: false },
  ],
  'A-VI/1': [
    { id: 'k1', text: 'Nhận biết mối nguy hiểm trên tàu biển và môi trường biển', type: 'K', earnedHere: true },
    { id: 'k2', text: 'Nắm vững quy trình báo động khẩn cấp và sơ đồ bố trí tàu', type: 'K', earnedHere: true },
    { id: 'u1', text: 'Hiểu vai trò của từng thuyền viên trong tình huống khẩn cấp', type: 'U', earnedHere: true },
    { id: 'p1', text: 'Thực hành kỹ thuật sinh tồn cơ bản và duy trì thân nhiệt', type: 'P', earnedHere: false },
    { id: 'p2', text: 'Vận hành thiết bị cứu sinh và phát tín hiệu cứu nạn', type: 'P', earnedHere: false },
  ],
  'A-VI/2': [
    { id: 'k1', text: 'Hiểu các loại phương tiện cứu sinh và trang bị trên tàu', type: 'K', earnedHere: true },
    { id: 'k2', text: 'Nắm vững quy trình hạ xuồng cứu sinh khẩn cấp', type: 'K', earnedHere: true },
    { id: 'u1', text: 'Xác định trách nhiệm của từng vị trí trong xuồng cứu sinh', type: 'U', earnedHere: true },
    { id: 'p1', text: 'Vận hành động cơ xuồng và thiết bị thông tin liên lạc', type: 'P', earnedHere: false },
  ],
  'A-VI/3': [
    { id: 'k1', text: 'Hiểu nguyên lý cháy và tam giác lửa (oxy, nhiên liệu, nhiệt)', type: 'K', earnedHere: true },
    { id: 'k2', text: 'Phân loại đám cháy (A, B, C, D) và chọn bình chữa cháy phù hợp', type: 'K', earnedHere: true },
    { id: 'u1', text: 'Áp dụng chiến thuật chữa cháy nâng cao và cách ly đám cháy', type: 'U', earnedHere: true },
    { id: 'p1', text: 'Thực hành chữa cháy bằng CO₂, bọt và bột khô', type: 'P', earnedHere: false },
    { id: 'p2', text: 'Mặc và vận hành bộ đồ chữa cháy cách nhiệt (BA set)', type: 'P', earnedHere: false },
  ],
  'A-VI/4': [
    { id: 'k1', text: 'Nắm vững các thương tích và bệnh thường gặp trên biển', type: 'K', earnedHere: true },
    { id: 'k2', text: 'Hiểu quy trình CPR và hồi sức tim-phổi cơ bản', type: 'K', earnedHere: true },
    { id: 'u1', text: 'Đánh giá tình trạng nạn nhân và xác định ưu tiên xử lý', type: 'U', earnedHere: true },
    { id: 'p1', text: 'Thực hành băng bó, cố định gãy xương và xử lý bỏng', type: 'P', earnedHere: false },
  ],
  'A-VI/5': [
    { id: 'k1', text: 'Hiểu mối đe dọa an ninh hàng hải và ISPS Code', type: 'K', earnedHere: true },
    { id: 'k2', text: 'Nắm vững vai trò của Ship Security Officer (SSO)', type: 'K', earnedHere: true },
    { id: 'u1', text: 'Phân tích và xử lý tình huống an ninh bất thường', type: 'U', earnedHere: false },
    { id: 'p1', text: 'Thực hiện kiểm tra an ninh và xử lý báo động ISPS', type: 'P', earnedHere: false },
  ],
};

const CAREER_MAP: Record<string, CareerCertInfo> = {
  'A-II/1': { certificateName: 'STCW II/1', viCertName: 'Sĩ quan trực ca Boong', description: 'Bắt buộc cho Sĩ quan điều hành tàu ≥ 500 GT tuyến quốc tế' },
  'A-II/2': { certificateName: 'STCW II/2', viCertName: 'Thuyền trưởng & Đại phó', description: 'Bắt buộc cho Thuyền trưởng và Đại phó tàu ≥ 3000 GT' },
  'A-III/1': { certificateName: 'STCW III/1', viCertName: 'Sĩ quan trực ca Buồng máy', description: 'Bắt buộc cho Sĩ quan trực ca buồng máy tàu ≥ 750 kW' },
  'A-III/2': { certificateName: 'STCW III/2', viCertName: 'Máy trưởng & Đại phó Máy', description: 'Bắt buộc cho Máy trưởng và Đại phó máy tàu ≥ 3000 kW' },
  'A-VI/1': { certificateName: 'STCW Basic Safety', viCertName: 'An toàn Cơ bản', description: 'Bắt buộc cho tất cả thuyền viên đi biển quốc tế' },
  'A-VI/2': { certificateName: 'STCW Survival Craft', viCertName: 'Phương tiện Cứu sinh', description: 'Bắt buộc cho thuyền viên phụ trách xuồng cứu sinh/cứu hộ' },
  'A-VI/3': { certificateName: 'STCW Adv. Firefighting', viCertName: 'Chữa cháy Nâng cao', description: 'Bắt buộc cho thuyền viên trong đội chữa cháy tàu biển' },
  'A-VI/4': { certificateName: 'STCW Medical First Aid', viCertName: 'Hỗ trợ Y tế', description: 'Bắt buộc cho thuyền viên sơ cứu cấp 1 và cấp 2' },
  'A-VI/5': { certificateName: 'STCW SSO', viCertName: 'Sĩ quan Bảo vệ Tàu', description: 'Bắt buộc cho Ship Security Officer (SSO) theo ISPS Code' },
};

function defaultKups(code: string): KupItem[] {
  return [
    { id: 'k1', text: `Nắm vững kiến thức lý thuyết và quy định của ${code}`, type: 'K', earnedHere: true },
    { id: 'u1', text: `Hiểu và áp dụng các yêu cầu thực tế của ${code}`, type: 'U', earnedHere: true },
    { id: 'p1', text: `Thực hành kỹ năng và quy trình theo yêu cầu ${code}`, type: 'P', earnedHere: false },
  ];
}

@Injectable({ providedIn: 'root' })
export class StudentCompetencyService {
  getKupItems(code: string): KupItem[] {
    return KUP_LOOKUP[code] ?? defaultKups(code);
  }

  getCareerInfo(code: string): CareerCertInfo | null {
    return CAREER_MAP[code] ?? null;
  }
}
