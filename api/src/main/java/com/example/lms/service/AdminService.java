package com.example.lms.service;

import com.example.lms.entity.Course;
import com.example.lms.entity.User;
import com.example.lms.repository.AssignmentRepository;
import com.example.lms.repository.CourseRepository;
import com.example.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminService {

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final AssignmentRepository assignmentRepository;

    public Map<String, Object> getAnalytics() {
        Map<String, Object> analytics = new HashMap<>();

        // User statistics
        long totalUsers = userRepository.count();
        long totalTeachers = userRepository.countByRole(User.Role.TEACHER);
        long totalStudents = userRepository.countByRole(User.Role.STUDENT);
        long totalAdmins = userRepository.countByRole(User.Role.ADMIN);

        analytics.put("totalUsers", totalUsers);
        analytics.put("totalTeachers", totalTeachers);
        analytics.put("totalStudents", totalStudents);
        analytics.put("totalAdmins", totalAdmins);

        // Course statistics
        long totalCourses = courseRepository.count();
        long publishedCourses = courseRepository.countByStatus(Course.CourseStatus.APPROVED);
        long draftCourses = courseRepository.countByStatus(Course.CourseStatus.DRAFT);
        long pendingCourses = courseRepository.countByStatus(Course.CourseStatus.PENDING);
        long rejectedCourses = courseRepository.countByStatus(Course.CourseStatus.REJECTED);

        analytics.put("totalCourses", totalCourses);
        analytics.put("publishedCourses", publishedCourses);
        analytics.put("draftCourses", draftCourses);
        analytics.put("pendingCourses", pendingCourses);
        analytics.put("rejectedCourses", rejectedCourses);

        // Assignment statistics
        long totalAssignments = assignmentRepository.count();
        analytics.put("totalAssignments", totalAssignments);

        // Recent activity (last 30 days)
        Instant thirtyDaysAgo = Instant.now().minusSeconds(30 * 24 * 60 * 60);
        long newUsersLast30Days = userRepository.countByCreatedAtAfter(thirtyDaysAgo);
        long newCoursesLast30Days = courseRepository.countByCreatedAtAfter(thirtyDaysAgo);

        analytics.put("newUsersLast30Days", newUsersLast30Days);
        analytics.put("newCoursesLast30Days", newCoursesLast30Days);

        return analytics;
    }

    public Page<Course> getPendingCourses(Pageable pageable) {
        return courseRepository.findByStatus(Course.CourseStatus.PENDING, pageable);
    }

    public Course reviewCourse(UUID courseId, com.example.lms.controller.AdminController.ReviewCourseRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học với ID: " + courseId));
        
        if (course.getStatus() != Course.CourseStatus.PENDING) {
            throw new RuntimeException("Chỉ có thể duyệt khóa học ở trạng thái chờ duyệt");
        }

        if (request.isApproved()) {
            course.setStatus(Course.CourseStatus.APPROVED);
        } else {
            course.setStatus(Course.CourseStatus.REJECTED);
        }

        // Note: Course entity doesn't have reviewComment and reviewedAt fields yet
        // These would need to be added to the Course entity
        
        return courseRepository.save(course);
    }

    public Page<User> getAllUsers(String search, User.Role role, Pageable pageable) {
        if (search != null && !search.trim().isEmpty()) {
            if (role != null) {
                return userRepository.findByRoleAndEmailContainingIgnoreCaseOrRoleAndFullNameContainingIgnoreCase(
                    role, search, role, search, pageable);
            } else {
                return userRepository.findByEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(
                    search, search, pageable);
            }
        } else {
            if (role != null) {
                return userRepository.findByRole(role, pageable);
            } else {
                return userRepository.findAll(pageable);
            }
        }
    }

    public void deleteUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + userId));
        
        // Check if user has any active courses (as teacher)
        long activeCourses = courseRepository.countByTeacherAndStatusIn(
            user, 
            java.util.Arrays.asList(Course.CourseStatus.APPROVED, Course.CourseStatus.PENDING)
        );
        
        if (activeCourses > 0) {
            throw new RuntimeException("Không thể xóa người dùng có khóa học đang hoạt động");
        }

        userRepository.delete(user);
    }

    public User updateUserRole(UUID userId, com.example.lms.controller.AdminController.UpdateUserRoleRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + userId));
        
        user.setRole(request.getRole());
        return userRepository.save(user);
    }

    public void toggleUserStatus(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + userId));
        
        user.setEnabled(!user.isEnabled());
        userRepository.save(user);
    }

    public Page<Course> getAllCourses(String search, Course.CourseStatus status, Pageable pageable) {
        if (search != null && !search.trim().isEmpty()) {
            if (status != null) {
                return courseRepository.findByStatusAndTitleContainingIgnoreCase(status, search, pageable);
            } else {
                return courseRepository.findByTitleContainingIgnoreCase(search, pageable);
            }
        } else {
            if (status != null) {
                return courseRepository.findByStatus(status, pageable);
            } else {
                return courseRepository.findAll(pageable);
            }
        }
    }

    public void deleteCourse(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học với ID: " + courseId));
        
        // Only allow deleting courses that are not published
        if (course.getStatus() == Course.CourseStatus.APPROVED) {
            throw new RuntimeException("Không thể xóa khóa học đã được xuất bản");
        }

        courseRepository.delete(course);
    }

    public void approveCourse(UUID courseId, User currentUser) {
        com.example.lms.controller.AdminController.ReviewCourseRequest request = 
            new com.example.lms.controller.AdminController.ReviewCourseRequest();
        request.setApproved(true);
        reviewCourse(courseId, request);
    }

    public void rejectCourse(UUID courseId, User currentUser, com.example.lms.controller.AdminController.RejectCourseRequest request) {
        com.example.lms.controller.AdminController.ReviewCourseRequest reviewRequest = 
            new com.example.lms.controller.AdminController.ReviewCourseRequest();
        reviewRequest.setApproved(false);
        reviewRequest.setComment(request.getReason());
        reviewCourse(courseId, reviewRequest);
    }

    public Map<String, Object> getSystemAnalytics() {
        return getAnalytics(); // Use the existing getAnalytics method
    }

}