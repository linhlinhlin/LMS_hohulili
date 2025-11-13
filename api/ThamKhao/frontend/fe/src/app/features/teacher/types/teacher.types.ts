export interface TeacherCourse {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  category: string;
  status: 'active' | 'draft' | 'archived';
  enrolledStudents: number;
  rating: number;
  revenue?: number;
  thumbnail?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  duration?: string;
  price?: number;
  modules?: number;
  lessons?: number;
  skills?: string[];
  prerequisites?: string[];
  certificate?: {
    type: string;
    description: string;
  };
  students?: number; // Alias for enrolledStudents for compatibility
  createdAt: string;
  updatedAt: string;
}

export interface TeacherStudent {
  id: string;
  name: string;
  email: string;
  studentId: string;
  department: string;
  enrolledCourses: string[];
  courses?: string[]; // Alias for enrolledCourses
  averageGrade: number;
  progress: number; // percentage
  lastActive: string;
  status: 'active' | 'inactive' | 'suspended';
  avatar?: string;
  totalCourses?: number;
  completedCourses?: number;
  enrollmentDate?: string;
}

export interface TeacherAssignment {
  id: string;
  title: string;
  courseId: string;
  courseTitle?: string;
  description: string;
  type?: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded' | 'overdue';
  submissions: number;
  totalStudents: number;
  maxScore?: number;
  averageScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherAnalytics {
  totalCourses: number;
  totalStudents: number;
  totalRevenue: number;
  averageRating: number;
  completionRate: number;
  activeCourses: TeacherCourse[];
  recentStudents: TeacherStudent[];
  pendingAssignments: TeacherAssignment[];
  coursePerformance: CoursePerformance[];
  studentEngagement: StudentEngagement[];
}

export interface CoursePerformance {
  courseId: string;
  courseTitle: string;
  enrolledStudents: number;
  completionRate: number;
  averageRating: number;
  revenue: number;
  lastActivity: string;
}

export interface StudentEngagement {
  studentId: string;
  studentName: string;
  coursesEnrolled: number;
  averageGrade: number;
  progress: number;
  lastActive: string;
  status: 'active' | 'inactive' | 'at_risk';
}

export interface Notification {
  id: string;
  type: 'assignment' | 'course' | 'system' | 'grade';
  title: string;
  message: string;
  isRead: boolean;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionText?: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  assignmentReminders: boolean;
  courseUpdates: boolean;
  systemAnnouncements: boolean;
  gradeNotifications: boolean;
}