/**
 * Profile Types
 * Types for user profiles, certificates, achievements
 * PostgreSQL Tables: users, certificates, achievements
 */

// =======================
// Profile Types
// =======================

export interface ProfileEdit {
    fullName: string;
    bio?: string;
    phone?: string;
    dateOfBirth?: string; // ISO 8601
    gender?: 'male' | 'female' | 'other';
    address?: string;
    occupation?: string;
    company?: string;
    website?: string;
    socialLinks?: SocialLink[];
    avatarUrl?: string;
    studyPreferences?: StudyPreferences;
}

export interface StudentProfileForm {
    fullName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string; // ISO 8601
    school?: string;
    major?: string;
    grade?: string;
    bio?: string;
    avatarUrl?: string;
}

export interface StudentProfile {
    id: string;
    userId: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    bio?: string;
    enrolledCourses: number;
    completedCourses: number;
    certificates: number;
    studyStreak: number;
    totalStudyTime: number;
    achievements: Achievement[];
    schedule: StudySchedule;
    socialLinks?: SocialLink[];
    createdAt: string; // ISO 8601
}

export interface StudySchedule {
    preferredDays: string[];
    preferredHours: { start: string; end: string };
    weeklyGoal: number; // hours
}

export interface StudyDay {
    dayOfWeek: number;
    isActive: boolean;
    startTime?: string;
    endTime?: string;
}

export interface StudyPreferences {
    weeklyGoal: number;
    preferredDays: StudyDay[];
    reminderEnabled: boolean;
    reminderTime?: string;
}

// =======================
// Social Link Types
// =======================

export interface SocialLink {
    platform: string;
    url: string;
    icon?: string;
}

export interface SocialPlatform {
    id: string;
    name: string;
    icon: string;
    baseUrl: string;
    placeholder: string;
}

// =======================
// Achievement Types
// =======================

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: 'learning' | 'engagement' | 'completion' | 'streak' | 'social';
    earnedAt: string; // ISO 8601
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    progress?: number;
    maxProgress?: number;
}

// =======================
// Certificate Types
// =======================

export interface Certificate {
    id: string;
    courseId: string;
    courseName: string;
    courseThumbnail?: string;
    studentId: string;
    studentName: string;
    issueDate: string; // ISO 8601
    expiryDate?: string; // ISO 8601
    certificateNumber: string;
    downloadUrl?: string;
    verificationUrl?: string;
    grade?: string;
    instructorName?: string;
    institutionName?: string;
    skills?: string[];
}

export interface CertificateVerification {
    valid: boolean;
    certificate?: Certificate;
    errorMessage?: string;
    verifiedAt: string; // ISO 8601
}

