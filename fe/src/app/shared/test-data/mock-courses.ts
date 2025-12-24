/**
 * 🧪 MOCK DATA FOR INTEGRATION TESTING
 * 
 * Tạo mock courses để test UI components trước khi connect với real backend
 */

import { CourseSummary } from '../../api/types/course.types';

export const MOCK_COURSES_FOR_TESTING: CourseSummary[] = [
  {
    id: 'course-001',
    code: 'MAR-101',
    title: 'Cơ bản về Hàng hải',
    description: 'Khóa học giới thiệu các kiến thức cơ bản về ngành hàng hải, bao gồm lịch sử, quy định quốc tế và các nguyên tắc cơ bản.',
    status: 'active',
    teacherName: 'Thầy Nguyễn Văn A',
    enrolledCount: 45,
    createdAt: '2025-01-15T09:00:00Z'
  },
  {
    id: 'course-002', 
    code: 'MAR-201',
    title: 'Kỹ thuật Điều hành Tàu',
    description: 'Khóa học chuyên sâu về kỹ thuật điều hành tàu thủy, bao gồm điều khiển, định vị và an toàn hàng hải.',
    status: 'active',
    teacherName: 'Thầy Trần Thị B',
    enrolledCount: 32,
    createdAt: '2025-02-01T10:30:00Z'
  },
  {
    id: 'course-003',
    code: 'MAR-301',
    title: 'Luật Hàng hải Quốc tế',
    description: 'Nghiên cứu các quy định pháp lý quốc tế trong lĩnh vực hàng hải, bao gồm SOLAS, MARPOL và các công ước quan trọng.',
    status: 'active',
    teacherName: 'Thầy Lê Văn C',
    enrolledCount: 28,
    createdAt: '2025-02-10T14:15:00Z'
  },
  {
    id: 'course-004',
    code: 'MAR-401', 
    title: 'Quản lý Cảng biển',
    description: 'Khóa học về quản lý và vận hành cảng biển hiệu quả, bao gồm logistics, container và hệ thống thông tin.',
    status: 'active',
    teacherName: 'Cô Phạm Thị D',
    enrolledCount: 38,
    createdAt: '2025-02-20T08:45:00Z'
  },
  {
    id: 'course-005',
    code: 'MAR-501',
    title: 'An toàn và Bảo mật Hàng hải',
    description: 'Chuyên đề về an toàn, bảo mật và phòng chống khủng bố trong hoạt động hàng hải theo tiêu chuẩn ISPS.',
    status: 'active',
    teacherName: 'Thầy Hoàng Văn E',
    enrolledCount: 22,
    createdAt: '2025-03-01T11:20:00Z'
  }
];

/**
 * Mock enrolled courses for testing dashboard
 */
export const MOCK_ENROLLED_COURSES = [
  {
    id: 'course-001',
    title: 'Cơ bản về Hàng hải',
    description: 'Khóa học giới thiệu các kiến thức cơ bản về ngành hàng hải, bao gồm lịch sử, quy định quốc tế và các nguyên tắc cơ bản.',
    instructor: 'Thầy Nguyễn Văn A',
    progress: 75,
    totalLessons: 12,
    completedLessons: 9,
    duration: '40 giờ',
    deadline: '2025-12-31',
    status: 'in-progress' as const,
    thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop',
    category: 'maritime-basics',
    rating: 4.8,
    lastAccessed: new Date('2025-10-27'),
    enrolledAt: new Date('2025-10-01'),
    studyTime: 1800 // 30 hours in minutes
  },
  {
    id: 'course-002',
    title: 'Kỹ thuật Điều hành Tàu', 
    description: 'Khóa học chuyên sâu về kỹ thuật điều hành tàu thủy, bao gồm điều khiển, định vị và an toàn hàng hải.',
    instructor: 'Thầy Trần Thị B',
    progress: 45,
    totalLessons: 15,
    completedLessons: 7,
    duration: '60 giờ',
    deadline: '2025-11-30',
    status: 'in-progress' as const,
    thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop',
    category: 'ship-operations',
    rating: 4.6,
    lastAccessed: new Date('2025-10-26'),
    enrolledAt: new Date('2025-09-15'),
    studyTime: 1620 // 27 hours in minutes
  }
];
