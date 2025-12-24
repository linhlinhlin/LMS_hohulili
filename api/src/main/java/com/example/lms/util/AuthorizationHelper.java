package com.example.lms.util;

import com.example.lms.entity.Course;
import com.example.lms.entity.User;

/**
 * SOTA Authorization Helper (Google/Netflix Pattern)
 * Centralized authorization logic for consistent access control across all services.
 * 
 * Access Control Hierarchy (Coursera/Udemy Model):
 * 1. ADMIN - READ-ONLY access to all resources (moderation/audit only, NO write)
 * 2. COURSE OWNER (Teacher) - Full access to their own courses
 * 3. CO-INSTRUCTOR - Access based on granted permissions
 * 4. ENROLLED STUDENT - Access to published content only
 * 
 * IMPORTANT: Admin has VIEW access only, NOT modify access.
 */
public class AuthorizationHelper {

    /**
     * Check if user is the course OWNER only (for WRITE operations).
     * Admin is explicitly EXCLUDED - Admin cannot modify Teacher content.
     * 
     * Use for: create, update, delete, grading operations
     */
    public static boolean isOwnerOnly(Course course, User user) {
        return isCourseOwner(course, user);
    }

    /**
     * Check if user can VIEW course content (READ operations).
     * Includes: Owner, Enrolled students, and Admin (for audit/moderation)
     * 
     * Use for: viewing chapters, lessons, content, submissions
     */
    public static boolean canViewCourse(Course course, User user, boolean isEnrolled) {
        if (user == null) return false;
        
        // 1. Admin has VIEW access for moderation/audit
        if (isAdmin(user)) return true;
        
        // 2. Course owner has VIEW access
        if (isCourseOwner(course, user)) return true;
        
        // 3. Enrolled student has VIEW access
        if (isEnrolled) return true;
        
        return false;
    }
    
    /**
     * @deprecated Use isOwnerOnly() for WRITE or canViewCourse() for READ
     * This method is kept for backward compatibility but should be replaced.
     */
    @Deprecated
    public static boolean isOwnerOrAdmin(Course course, User user) {
        // CHANGED: Admin no longer has write access
        // Only owner can modify content
        return isOwnerOnly(course, user);
    }
    
    /**
     * Check if user is ADMIN role.
     */
    public static boolean isAdmin(User user) {
        return user != null && 
               user.getRole() != null && 
               user.getRole().name().equalsIgnoreCase("ADMIN");
    }
    
    /**
     * Check if user is the course owner (teacher).
     */
    public static boolean isCourseOwner(Course course, User user) {
        return course != null && 
               course.getTeacher() != null && 
               user != null &&
               course.getTeacher().getId().equals(user.getId());
    }

    /**
     * Check if user can MODIFY course (Owner only, Admin excluded).
     * Use this for create/update/delete operations.
     */
    public static boolean canModifyCourse(Course course, User user) {
        return isOwnerOnly(course, user);
    }
}
