package com.example.lms.service;

import com.example.lms.entity.Course;
import com.example.lms.entity.Section;
import com.example.lms.entity.User;
import com.example.lms.entity.Category;
import com.example.lms.entity.AdminAuditLog;
import com.example.lms.repository.CategoryRepository;
import com.example.lms.repository.CourseRepository;
import com.example.lms.repository.UserRepository;
import com.example.lms.dto.response.BulkEnrollmentResponse;
import com.example.lms.util.AuthorizationHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class CourseService {

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final AdminAuditService adminAuditService;

    public Page<Course> getApprovedCourses(Pageable pageable, String search, String teacher) {
        if (search != null && !search.trim().isEmpty()) {
            return courseRepository.findByStatusAndTitleContainingIgnoreCase(
                    Course.CourseStatus.APPROVED, search.trim(), pageable);
        }
        return courseRepository.findByStatus(Course.CourseStatus.APPROVED, pageable);
    }

    public Course createCourse(User teacher, com.example.lms.controller.CourseController.CreateCourseRequest request) {
        if (courseRepository.existsByCode(request.getCode())) {
            throw new RuntimeException("Mã khóa học đã tồn tại: " + request.getCode());
        }

        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElse(null);
        }

        Course course = Course.builder()
                .code(request.getCode())
                .title(request.getTitle())
                .description(request.getDescription())
                .teacher(teacher)
                // New Fields
                .instructorId(request.getInstructorId())
                .teachingStaffIds(request.getTeachingStaffIds())
                .category(category)
                .tags(request.getTags())
                .welcomeMessage(request.getWelcomeMessage())
                .courseInformation(request.getCourseInformation())
                .benefits(request.getBenefits())
                .introVideoUrl(request.getIntroVideoUrl())
                .credits(request.getCredits())
                .visibility(request.getVisibility() != null ? Course.Visibility.valueOf(request.getVisibility()) : Course.Visibility.PUBLIC)
                .priceType(request.getPriceType() != null ? Course.PriceType.valueOf(request.getPriceType()) : Course.PriceType.FREE)
                .price(request.getPrice())
                .salePrice(request.getSalePrice())
                // New courses start as DRAFT
                .status(Course.CourseStatus.DRAFT)
                .build();

        return courseRepository.save(course);
    }

    public Page<Course> getCoursesByTeacher(User teacher, Pageable pageable) {
        return courseRepository.findByTeacher(teacher, pageable);
    }

    /**
     * OPTIMIZED: Get courses with DTO Projection (single query).
     * SOTA: Now includes both OWNED courses AND courses where user is ACCEPTED CO-INSTRUCTOR.
     */
    public Page<com.example.lms.dto.CourseSummaryDTO> getCoursesSummaryByTeacher(User teacher, Pageable pageable) {
        // SOTA: Use combined query that includes co-instructor courses
        return courseRepository.findCourseSummariesByTeacherOrInstructor(teacher, pageable);
    }

    public Page<Course> getEnrolledCourses(User student, Pageable pageable) {
        // Use query with JOIN FETCH to eagerly load teacher and avoid LazyInitializationException
        return courseRepository.findEnrolledCoursesWithTeacher(student, pageable);
    }

    public Course getCourseById(UUID courseId) {
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học với ID: " + courseId));
    }

    /**
     * Get course by ID for public access (students)
     * Only returns APPROVED courses
     */
    public Course getPublicCourseById(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học với ID: " + courseId));
        
        if (course.getStatus() != Course.CourseStatus.APPROVED) {
            throw new RuntimeException("Khóa học đang được kiểm duyệt hoặc chưa được công khai");
        }
        
        return course;
    }

    /**
     * SOTA: Get course detail using DTO Projection.
     * Returns CourseDetailDTO directly - all data loaded upfront, no lazy loading issues.
     * Pattern: Google/Netflix DTO Projection Architecture (2025)
     */
    public com.example.lms.dto.CourseDetailDTO getCourseDetailById(UUID courseId) {
        com.example.lms.dto.CourseDetailDTO dto = courseRepository.findCourseDetailById(courseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học với ID: " + courseId));
        
        // Load collections separately (SOTA pattern to avoid MultipleBagFetch)
        dto.setTeachingStaffIds(courseRepository.findTeachingStaffIdsByCourseId(courseId));
        dto.setTags(courseRepository.findTagsByCourseId(courseId));
        
        return dto;
    }

    public Course updateCourse(UUID courseId, User currentUser, com.example.lms.controller.CourseController.UpdateCourseRequest request) {
        Course course = getCourseById(courseId);
        
        // Check if user is the teacher of this course
        if (!course.getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền chỉnh sửa khóa học này");
        }

        // Prevent editing PENDING courses
        if (course.getStatus() == Course.CourseStatus.PENDING) {
            throw new RuntimeException("Không thể chỉnh sửa khóa học đang chờ duyệt. Vui lòng hủy yêu cầu duyệt trước.");
        }

        // If course is APPROVED, editing will require re-approval
        boolean wasApproved = course.getStatus() == Course.CourseStatus.APPROVED;

        if (request.getCode() != null && !request.getCode().equals(course.getCode())) {
            if (courseRepository.existsByCode(request.getCode())) {
                throw new RuntimeException("Mã khóa học đã tồn tại: " + request.getCode());
            }
            course.setCode(request.getCode());
        }

        if (request.getTitle() != null) {
            course.setTitle(request.getTitle());
        }

        if (request.getDescription() != null) {
            course.setDescription(request.getDescription());
        }

        // Update new fields
        if (request.getInstructorId() != null) course.setInstructorId(request.getInstructorId());
        if (request.getTeachingStaffIds() != null) course.setTeachingStaffIds(request.getTeachingStaffIds());
        
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId()).orElse(null);
            course.setCategory(category);
        }
        
        if (request.getTags() != null) course.setTags(request.getTags());
        if (request.getWelcomeMessage() != null) course.setWelcomeMessage(request.getWelcomeMessage());
        if (request.getCourseInformation() != null) course.setCourseInformation(request.getCourseInformation());
        if (request.getBenefits() != null) course.setBenefits(request.getBenefits());
        if (request.getIntroVideoUrl() != null) course.setIntroVideoUrl(request.getIntroVideoUrl());
        if (request.getCredits() != null) course.setCredits(request.getCredits());
        
        if (request.getVisibility() != null) {
            try {
                course.setVisibility(Course.Visibility.valueOf(request.getVisibility()));
            } catch (IllegalArgumentException e) {
                // Ignore invalid enum or handle error
            }
        }
        
        if (request.getPriceType() != null) {
            try {
                course.setPriceType(Course.PriceType.valueOf(request.getPriceType()));
            } catch (IllegalArgumentException e) {}
        }
        
        if (request.getPrice() != null) course.setPrice(request.getPrice());
        if (request.getSalePrice() != null) course.setSalePrice(request.getSalePrice());

        // If course was APPROVED and content changed, reset to PENDING for re-review
        if (wasApproved) {
            course.setStatus(Course.CourseStatus.PENDING);
            // Clear previous review info
            course.setReviewComment(null);
            course.setReviewedAt(null);
            course.setReviewedBy(null);
        }

        return courseRepository.save(course);
    }

    public Course submitForApproval(UUID courseId, User currentUser) {
        Course course = getCourseById(courseId);

        if (!course.getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền thực hiện thao tác này cho khóa học này");
        }

        // Only allow submitting DRAFT or REJECTED courses for review
        if (course.getStatus() == Course.CourseStatus.DRAFT || 
            course.getStatus() == Course.CourseStatus.REJECTED) {
            course.setStatus(Course.CourseStatus.PENDING);
            // Clear previous review info when resubmitting
            course.setReviewComment(null);
            course.setReviewedAt(null);
            course.setReviewedBy(null);
            return courseRepository.save(course);
        } else if (course.getStatus() == Course.CourseStatus.PENDING) {
            throw new RuntimeException("Khóa học đang chờ admin duyệt");
        } else if (course.getStatus() == Course.CourseStatus.APPROVED) {
            throw new RuntimeException("Khóa học đã được duyệt");
        }
        
        throw new RuntimeException("Không thể gửi khóa học với trạng thái hiện tại");
    }

    public Course cancelApprovalRequest(UUID courseId, User currentUser) {
        Course course = getCourseById(courseId);

        if (!course.getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền thực hiện thao tác này cho khóa học này");
        }

        // Only allow canceling PENDING courses
        if (course.getStatus() != Course.CourseStatus.PENDING) {
            throw new RuntimeException("Chỉ có thể hủy yêu cầu duyệt cho khóa học đang chờ duyệt");
        }

        // Change status back to DRAFT
        course.setStatus(Course.CourseStatus.DRAFT);
        return courseRepository.save(course);
    }

    public void deleteCourse(UUID courseId, User currentUser) {
        Course course = getCourseById(courseId);

        if (!course.getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền xóa khóa học này");
        }

        // Allow deleting courses regardless of status
        courseRepository.delete(course);
    }

    @Transactional
    public void enrollStudent(UUID courseId, UUID studentId) {
        Course course = getCourseById(courseId);

        if (course.getStatus() != Course.CourseStatus.APPROVED) {
            throw new RuntimeException("Chỉ có thể đăng ký vào khóa học đã được duyệt");
        }

        // Check enrollment using database query to avoid lazy loading
        if (userRepository.existsByCourseEnrollment(courseId, studentId)) {
            throw new RuntimeException("Bạn đã đăng ký khóa học này rồi");
        }

        // Use database query to add enrollment without loading lazy collections
        userRepository.addCourseEnrollment(studentId, courseId);
    }

    public void enrollStudentByTeacher(UUID courseId, User currentUser, com.example.lms.controller.CourseController.EnrollStudentRequest req) {
        Course course = getCourseById(courseId);

        // Only the owner teacher of the course or admin can assign enrollments
        boolean isOwnerTeacher = course.getTeacher().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == User.Role.ADMIN;
        if (!(isOwnerTeacher || isAdmin)) {
            throw new RuntimeException("Bạn không có quyền gán học viên cho khóa học này");
        }

        // Find student by email with STUDENT role only
        User student = userRepository.findByEmailAndRole(req.getEmail(), User.Role.STUDENT)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy học viên với email: " + req.getEmail()));
        
        // No need to check role again since we already filtered by STUDENT role

        if (course.getStatus() != Course.CourseStatus.APPROVED) {
            throw new RuntimeException("Chỉ có thể gán học viên cho khóa học đã được duyệt");
        }

        // Idempotent check - use database query
        if (userRepository.existsByCourseEnrollment(courseId, student.getId())) {
            throw new RuntimeException("Học viên đã được gán vào khóa học này");
        }

        java.util.Set<Course> enrolled = student.getEnrolledCourses();
        if (enrolled == null) {
            enrolled = new java.util.HashSet<>();
            student.setEnrolledCourses(enrolled);
        }
        enrolled.add(course);
        userRepository.save(student);
    }

    public List<com.example.lms.entity.Chapter> getCourseContent(UUID courseId, User currentUser) {
        // Load course with teacher and chapters (first level)
        Course course = courseRepository.findByIdWithSectionsAndLessons(courseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học với ID: " + courseId));
        
        // Authorization check using AuthorizationHelper
        boolean isAdmin = AuthorizationHelper.isAdmin(currentUser);
        boolean isEnrolled = courseRepository.existsByEnrolledStudentAndCourse(currentUser.getId(), courseId);
        
        if (!AuthorizationHelper.canViewCourse(course, currentUser, isEnrolled)) {
            throw new RuntimeException("Bạn không có quyền truy cập nội dung khóa học này");
        }
        
        // AUDIT LOG: Log when Admin views Teacher's course content
        if (isAdmin && course.getTeacher() != null && 
            !course.getTeacher().getId().equals(currentUser.getId())) {
            adminAuditService.logAction(
                currentUser,
                AdminAuditLog.AuditAction.VIEW_COURSE_CONTENT,
                AdminAuditLog.TargetType.COURSE,
                courseId,
                course.getTeacher()
            );
        }

        // Chapters are loaded via JOIN FETCH, sort them
        java.util.Set<com.example.lms.entity.Chapter> chapterSet = course.getChapters();
        java.util.List<com.example.lms.entity.Chapter> chapters = chapterSet == null ? 
                java.util.Collections.emptyList() : new java.util.ArrayList<>(chapterSet);
        chapters.sort((c1, c2) -> Integer.compare(
                c1.getOrderIndex() != null ? c1.getOrderIndex() : 0,
                c2.getOrderIndex() != null ? c2.getOrderIndex() : 0
        ));
        
        // Initialize nested collections within this transaction to avoid LazyInitializationException
        for (com.example.lms.entity.Chapter c : chapters) {
            // Initialize lessons
            org.hibernate.Hibernate.initialize(c.getLessons());
            if (c.getLessons() != null) {
                for (com.example.lms.entity.Lesson lesson : c.getLessons()) {
                    // Initialize sections for each lesson
                    org.hibernate.Hibernate.initialize(lesson.getSections());
                    // Initialize quizzes within sections if needed
                    if (lesson.getSections() != null) {
                        for (com.example.lms.entity.Section section : lesson.getSections()) {
                            org.hibernate.Hibernate.initialize(section.getQuizzes());
                        }
                    }
                    // Initialize assignment if exists
                    org.hibernate.Hibernate.initialize(lesson.getLessonAssignment());
                    if (lesson.getLessonAssignment() != null) {
                        org.hibernate.Hibernate.initialize(lesson.getLessonAssignment().getAssignment());
                    }
                }
            }
        }
        return chapters;
    }

    /**
     * Bulk enroll multiple students by email
     */
    public BulkEnrollmentResponse bulkEnrollStudents(UUID courseId, List<String> emails) {
        BulkEnrollmentResponse response = BulkEnrollmentResponse.builder().build();
        
        Course course = getCourseById(courseId);
        
        if (course.getStatus() != Course.CourseStatus.APPROVED) {
            throw new RuntimeException("Chỉ có thể gán học viên cho khóa học đã được duyệt");
        }
        
        for (String email : emails) {
            try {
                // Validate email format
                if (email == null || email.trim().isEmpty()) {
                    response.addError(email, BulkEnrollmentResponse.ErrorType.INVALID_EMAIL_FORMAT);
                    continue;
                }
                
                String trimmedEmail = email.trim().toLowerCase();
                
                // Find student by email
                User student = userRepository.findByEmailAndRole(trimmedEmail, User.Role.STUDENT)
                    .orElse(null);
                if (student == null) {
                    response.addError(trimmedEmail, BulkEnrollmentResponse.ErrorType.EMAIL_NOT_FOUND);
                    continue;
                }
                
                // Check if already enrolled
                if (userRepository.existsByCourseEnrollment(courseId, student.getId())) {
                    response.addError(trimmedEmail, BulkEnrollmentResponse.ErrorType.ALREADY_ENROLLED);
                    continue;
                }
                
                // Enroll student
                java.util.Set<Course> enrolled = student.getEnrolledCourses();
                if (enrolled == null) {
                    enrolled = new java.util.HashSet<>();
                    student.setEnrolledCourses(enrolled);
                }
                enrolled.add(course);
                userRepository.save(student);
                
                response.addSuccess(trimmedEmail);
                
            } catch (Exception e) {
                response.addError(email, BulkEnrollmentResponse.ErrorType.SYSTEM_ERROR, 
                    "Lỗi khi gán học viên: " + e.getMessage());
            }
        }
        
        return response;
    }
    
    /**
     * Get list of enrolled students in a course with pagination and search
     */
    public Page<User> getCourseStudents(UUID courseId, Pageable pageable, String search) {
        if (search != null && !search.trim().isEmpty()) {
            return courseRepository.searchEnrolledStudents(courseId, search.trim(), pageable);
        }
        return courseRepository.findEnrolledStudents(courseId, pageable);
    }
    
    /**
     * Get list of students NOT enrolled in a specific course
     * Used for enrollment dropdown in teacher course edit page
     */
    public Page<User> getAvailableStudentsForEnrollment(UUID courseId, Pageable pageable, String search) {
        // Verify course exists
        getCourseById(courseId);
        
        if (search != null && !search.trim().isEmpty()) {
            return userRepository.findStudentsNotEnrolledInCourseWithSearch(courseId, search.trim(), pageable);
        }
        return userRepository.findStudentsNotEnrolledInCourse(courseId, pageable);
    }

    /**
     * Get course students as DTOs to avoid LazyInitializationException
     */
    public Page<com.example.lms.dto.StudentSummaryDTO> getCourseStudentSummaries(UUID courseId, Pageable pageable, String search) {
        if (search != null && !search.trim().isEmpty()) {
            return courseRepository.searchCourseStudentSummaries(courseId, search.trim(), pageable);
        }
        return courseRepository.findCourseStudentSummaries(courseId, pageable);
    }
}
