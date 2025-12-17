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

import com.example.lms.course_management.infrastructure.persistence.JpaCourseVersionRepository;
import com.example.lms.course_management.domain.model.CourseVersion;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminService {

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final AssignmentRepository assignmentRepository;
    private final JpaCourseVersionRepository courseVersionRepository;

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

    public Course reviewCourse(UUID courseId, com.example.lms.controller.AdminController.ReviewCourseRequest request, User reviewer) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học với ID: " + courseId));
        
        // Validate course status
        // Allow approve only for PENDING courses
        if (request.isApproved() && course.getStatus() != Course.CourseStatus.PENDING) {
            throw new RuntimeException("Chỉ có thể duyệt khóa học ở trạng thái chờ duyệt. " +
                "Trạng thái hiện tại: " + course.getStatus().getDisplayName());
        }
        
        // Allow reject for PENDING or APPROVED courses (revoke approval)
        if (!request.isApproved() && 
            course.getStatus() != Course.CourseStatus.PENDING && 
            course.getStatus() != Course.CourseStatus.APPROVED) {
            throw new RuntimeException("Chỉ có thể từ chối khóa học ở trạng thái chờ duyệt hoặc đã duyệt. " +
                "Trạng thái hiện tại: " + course.getStatus().getDisplayName());
        }

        // Validate rejection reason
        if (!request.isApproved() && 
            (request.getComment() == null || request.getComment().trim().isEmpty())) {
            throw new RuntimeException("Vui lòng nhập lý do từ chối khóa học");
        }

        if (request.isApproved()) {
            course.setStatus(Course.CourseStatus.APPROVED);
            // Set default approval comment if not provided
            if (request.getComment() == null || request.getComment().trim().isEmpty()) {
                course.setReviewComment("Khóa học đã được duyệt");
            } else {
                course.setReviewComment(request.getComment());
            }

            // Create Course Version Snapshot
            createCourseVersion(course);

        } else {
            course.setStatus(Course.CourseStatus.REJECTED);
            course.setReviewComment(request.getComment());
        }

        // Set review information
        course.setReviewedAt(Instant.now());
        course.setReviewedBy(reviewer);
        
        return courseRepository.save(course);
    }

    // Made public for usage in DataFixInitializer
    public void createCourseVersion(Course courseEntity) {
        // Fetch full course data with chapters and lessons
        Course fullCourse = courseRepository.findByIdWithSectionsAndLessons(courseEntity.getId())
                .orElseThrow(() -> new IllegalStateException("Course data integrity error"));

        // Determine new version number
        Integer maxVersion = courseVersionRepository.findMaxVersionByCourseId(fullCourse.getId());
        int newVersion = (maxVersion == null) ? 1 : maxVersion + 1;

        // Map Chapters to Snapshots
        java.util.List<CourseVersion.ChapterSnapshot> chapterSnapshots = new java.util.ArrayList<>();
        if (fullCourse.getChapters() != null) {
            chapterSnapshots = fullCourse.getChapters().stream()
                .map(chapter -> {
                    java.util.List<CourseVersion.LessonSnapshot> lessonSnapshots = new java.util.ArrayList<>();
                    if (chapter.getLessons() != null) {
                        lessonSnapshots = chapter.getLessons().stream()
                            .map(lesson -> {
                                // For backward compatibility, check sections if needed, 
                                // but assuming lesson structure is primary now.
                                String contentUrl = null;
                                String contentHtml = null;
                                String type = "LECTURE"; // Default
                                
                                // Attempt to extract content from Sections
                                if (lesson.getSections() != null && !lesson.getSections().isEmpty()) {
                                    com.example.lms.entity.Section s = lesson.getSections().iterator().next();
                                    contentUrl = s.getVideoUrl();
                                    contentHtml = s.getContent();
                                    type = s.getType().name();
                                }

                                return CourseVersion.LessonSnapshot.builder()
                                    .id(lesson.getId())
                                    .title(lesson.getTitle())
                                    .type(type)
                                    .contentUrl(contentUrl)
                                    .contentHtml(contentHtml)
                                    .orderIndex(lesson.getOrderIndex())
                                    .build();
                            })
                            .collect(Collectors.toList());
                    }

                    return CourseVersion.ChapterSnapshot.builder()
                        .id(chapter.getId())
                        .title(chapter.getTitle())
                        .orderIndex(chapter.getOrderIndex())
                        .lessons(lessonSnapshots)
                        .build();
                })
                .collect(Collectors.toList());
        }

        CourseVersion version = CourseVersion.builder()
                .courseId(fullCourse.getId())
                .versionNumber(newVersion)
                .snapshotContent(chapterSnapshots)
                .build();

        courseVersionRepository.save(version);
    }

    public void fixMissingVersions() {
        // Find all APPROVED courses
        java.util.List<Course> approvedCourses = courseRepository.findByStatus(Course.CourseStatus.APPROVED);
        
        for (Course course : approvedCourses) {
            // Check if version exists
            Integer maxVersion = courseVersionRepository.findMaxVersionByCourseId(course.getId());
            if (maxVersion == null) {
                // Create V1 for existing approved course
                try {
                    createCourseVersion(course);
                    System.out.println("Backfilled version for course: " + course.getId());
                } catch (Exception e) {
                    System.err.println("Failed to backfill version for course: " + course.getId());
                    e.printStackTrace();
                }
            }
        }
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

    public Course revokeCourse(UUID courseId, String reason, User reviewer) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học với ID: " + courseId));
        
        // Only allow revoking APPROVED courses
        if (course.getStatus() != Course.CourseStatus.APPROVED) {
            throw new RuntimeException("Chỉ có thể thu hồi khóa học đã được duyệt. " +
                "Trạng thái hiện tại: " + course.getStatus().getDisplayName());
        }

        // Validate revoke reason
        if (reason == null || reason.trim().isEmpty()) {
            throw new RuntimeException("Vui lòng nhập lý do thu hồi khóa học");
        }

        // Set course back to DRAFT so teacher can edit
        course.setStatus(Course.CourseStatus.DRAFT);
        course.setReviewComment(reason);
        course.setReviewedAt(Instant.now());
        course.setReviewedBy(reviewer);
        
        return courseRepository.save(course);
    }

    public Course approveCourse(UUID courseId, User currentUser) {
        com.example.lms.controller.AdminController.ReviewCourseRequest request = 
            new com.example.lms.controller.AdminController.ReviewCourseRequest();
        request.setApproved(true);
        request.setComment("Khóa học đã được duyệt");
        return reviewCourse(courseId, request, currentUser);
    }

    public Course rejectCourse(UUID courseId, User currentUser, com.example.lms.controller.AdminController.RejectCourseRequest request) {
        com.example.lms.controller.AdminController.ReviewCourseRequest reviewRequest = 
            new com.example.lms.controller.AdminController.ReviewCourseRequest();
        reviewRequest.setApproved(false);
        reviewRequest.setComment(request.getReason());
        return reviewCourse(courseId, reviewRequest, currentUser);
    }

    public Map<String, Object> getSystemAnalytics() {
        return getAnalytics(); // Use the existing getAnalytics method
    }

    public Course getCourseById(UUID courseId) {
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học với ID: " + courseId));
    }

}
