/**
 * Category Types
 * Types for course categories, filtering, and course discovery
 * PostgreSQL Tables: courses, categories
 */

// =======================
// Category Configuration Types
// =======================

export interface CategoryConfig {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon?: string;
    color?: string;
    heroImage?: string;
    courseCount: number;
    featured: boolean;
    order: number;
    ctas?: CategoryCta[];
    careers?: CareerCard[];
    trends?: TrendCard[];
}

export interface CategoryCta {
    id: string;
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
    icon?: string;
    variant: 'primary' | 'secondary' | 'outline';
}

// =======================
// Career Card Types
// =======================

export interface CareerCard {
    id: string;
    title: string;
    description: string;
    icon?: string;
    image?: string;
    salaryRange?: string;
    growthRate?: string;
    demandLevel?: 'high' | 'medium' | 'low';
    relatedCourses?: string[];
    skills?: string[];
}

// =======================
// Trend Card Types
// =======================

export interface TrendCard {
    id: string;
    title: string;
    description: string;
    icon?: string;
    statValue: string;
    statLabel: string;
    trend: 'up' | 'down' | 'stable';
    trendValue?: string;
    link?: string;
}

// =======================
// Category Course Types
// =======================

export interface CategoryCourse {
    id: string;
    title: string;
    description: string;
    thumbnail?: string;
    instructorName: string;
    instructorAvatar?: string;
    rating: number;
    reviewCount: number;
    price: number;
    originalPrice?: number;
    enrolledCount: number;
    duration: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    isFeatured: boolean;
    isNew: boolean;
    isBestseller: boolean;
    tags?: string[];
}

export interface CategoryCourseItem {
    id: string;
    title: string;
    thumbnail?: string;
    instructorName: string;
    rating: number;
    price: number;
    enrolledCount: number;
    level: string;
}

// =======================
// Course Filter Types
// =======================

export interface CourseFilter {
    category?: string;
    level?: 'beginner' | 'intermediate' | 'advanced';
    priceRange?: {
        min: number;
        max: number;
    };
    rating?: number;
    duration?: 'short' | 'medium' | 'long';
    sortBy?: 'popular' | 'rating' | 'newest' | 'price-asc' | 'price-desc';
    searchQuery?: string;
    tags?: string[];
    isFree?: boolean;
}

// =======================
// Social Proof Types
// =======================

export interface Testimonial {
    id: string;
    authorName: string;
    authorRole: string;
    authorAvatar?: string;
    authorCompany?: string;
    content: string;
    rating: number;
    courseId?: string;
    courseName?: string;
    featured: boolean;
}

export interface Partner {
    id: string;
    name: string;
    logo: string;
    description?: string;
    website?: string;
    featured: boolean;
}
