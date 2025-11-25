package com.example.lms.service;

import com.example.lms.entity.Course;
import com.example.lms.entity.Section;
import com.example.lms.entity.User;
import com.example.lms.repository.CourseRepository;
import com.example.lms.repository.UserRepository;
import com.example.lms.dto.response.BulkEnrollmentResponse;
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

        Course course = Course.builder()
                .code(request.getCode())
                .title(request.getTitle())
                .description(request.getDescription())
                .teacher(teacher)
        // Immediately approve new courses (no admin approval flow)
        .status(Course.CourseStatus.APPROVED)
                .build();

        return courseRepository.save(course);
    }

    public Page<Course> getCoursesByTeacher(User teacher, Pageable pageable) {
        return courseRepository.findByTeacher(teacher, pageable);
    }

    public Page<Course> getEnrolledCourses(User student, Pageable pageable) {
        return courseRepository.findByEnrolledStudentsContaining(student, pageable);
    }

    public Course getCourseById(UUID courseId) {
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học với ID: " + courseId));
    }

    public Course updateCourse(UUID courseId, User currentUser, com.example.lms.controller.CourseController.UpdateCourseRequest request) {
        Course course = getCourseById(courseId);
        
        // Check if user is the teacher of this course
        if (!course.getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền chỉnh sửa khóa học này");
        }

        // Allow editing regardless of current status (no approval workflow)

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

        return courseRepository.save(course);
    }

    public void submitForApproval(UUID courseId, User currentUser) {
        // No-op approval flow: ensure caller owns the course, then set to APPROVED if not already
        Course course = getCourseById(courseId);

        if (!course.getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền thực hiện thao tác này cho khóa học này");
        }

        if (course.getStatus() != Course.CourseStatus.APPROVED) {
            course.setStatus(Course.CourseStatus.APPROVED);
            courseRepository.save(course);
        }
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

    public List<Section> getCourseContent(UUID courseId, User currentUser) {
        Course course = getCourseById(courseId);
        
        // Check if user is enrolled or is the teacher
        boolean hasAccess = course.getTeacher().getId().equals(currentUser.getId()) ||
                          course.getEnrolledStudents().contains(currentUser);
        
        if (!hasAccess) {
            throw new RuntimeException("Bạn không có quyền truy cập nội dung khóa học này");
        }

        java.util.Set<Section> sectionSet = course.getSections();
        java.util.List<Section> sections = sectionSet == null ? java.util.Collections.emptyList() : new java.util.ArrayList<>(sectionSet);
        sections.sort((s1, s2) -> Integer.compare(
                s1.getOrderIndex() != null ? s1.getOrderIndex() : 0,
                s2.getOrderIndex() != null ? s2.getOrderIndex() : 0
        ));
        // Ensure lessons lists are initialized
        for (Section s : sections) {
            if (s.getLessons() == null) {
                s.setLessons(new java.util.ArrayList<>());
            }
        }
        return sections;
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
}