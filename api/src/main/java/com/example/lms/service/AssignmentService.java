package com.example.lms.service;

import com.example.lms.entity.*;
import com.example.lms.repository.AssignmentRepository;
import com.example.lms.repository.AssignmentSubmissionRepository;
import com.example.lms.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;

@Service
@RequiredArgsConstructor
@Transactional
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final CourseRepository courseRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Assignment createAssignment(UUID courseId, User currentUser, com.example.lms.controller.AssignmentController.CreateAssignmentRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học với ID: " + courseId));

        // Check if user is the teacher of this course
        if (!course.getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền tạo bài tập cho khóa học này");
        }

        // Allow creating assignments for courses in DRAFT, REJECTED, or APPROVED status
        // Teachers should be able to add assignments to active courses
        // Only PENDING status is restricted (course is under review)
        Course.CourseStatus status = course.getStatus();
        if (status == Course.CourseStatus.PENDING) {
            throw new RuntimeException("Không thể tạo bài tập cho khóa học đang chờ duyệt");
        }

        Assignment assignment = Assignment.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .instructions(request.getInstructions())
                .maxScore(request.getMaxScore())
                .dueDate(request.getDueDate() != null ?
                    LocalDateTime.ofInstant(request.getDueDate(), java.time.ZoneId.systemDefault()) : null)
                .assignmentConfig((java.util.Map<String, Object>) request.getAssignmentConfig())
                .course(course)
                .build();

        return assignmentRepository.save(assignment);
    }

    public Assignment updateAssignment(UUID assignmentId, User currentUser, com.example.lms.controller.AssignmentController.UpdateAssignmentRequest request) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập với ID: " + assignmentId));
        
        // Check if user is the teacher of this course
        if (!assignment.getCourse().getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền chỉnh sửa bài tập này");
        }

        // Allow editing assignments for courses in DRAFT, REJECTED, or APPROVED status
        // Only PENDING status is restricted (course is under review)
        Course.CourseStatus courseStatus = assignment.getCourse().getStatus();
        if (courseStatus == Course.CourseStatus.PENDING) {
            throw new RuntimeException("Không thể chỉnh sửa bài tập của khóa học đang chờ duyệt");
        }

        if (request.getTitle() != null) {
            assignment.setTitle(request.getTitle());
        }

        if (request.getDescription() != null) {
            assignment.setDescription(request.getDescription());
        }

        if (request.getMaxScore() != null) {
            assignment.setMaxScore(request.getMaxScore());
        }

        if (request.getDueDate() != null) {
            assignment.setDueDate(LocalDateTime.ofInstant(request.getDueDate(), java.time.ZoneId.systemDefault()));
        }

        if (request.getAssignmentConfig() != null) {
            assignment.setAssignmentConfig((java.util.Map<String, Object>) validateAndCoerceAssignmentConfig(request.getAssignmentConfig()));
        }

        return assignmentRepository.save(assignment);
    }

    public void deleteAssignment(UUID assignmentId, User currentUser) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập với ID: " + assignmentId));
        
        // Check if user is the teacher of this course
        if (!assignment.getCourse().getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền xóa bài tập này");
        }

        // Allow deleting assignments for courses in DRAFT, REJECTED, or APPROVED status
        // Only PENDING status is restricted (course is under review)
        Course.CourseStatus courseStatus = assignment.getCourse().getStatus();
        if (courseStatus == Course.CourseStatus.PENDING) {
            throw new RuntimeException("Không thể xóa bài tập của khóa học đang chờ duyệt");
        }

        assignmentRepository.delete(assignment);
    }

    public Assignment getAssignmentById(UUID assignmentId, User currentUser) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập với ID: " + assignmentId));
        
        // Check if user has access (is teacher or enrolled student)
        Course course = assignment.getCourse();
        boolean hasAccess = course.getTeacher().getId().equals(currentUser.getId()) ||
                          course.getEnrolledStudents().contains(currentUser);
        
        if (!hasAccess) {
            throw new RuntimeException("Bạn không có quyền truy cập bài tập này");
        }

        return assignment;
    }

    public List<Assignment> getAssignmentsByCourse(UUID courseId, User currentUser) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học với ID: " + courseId));
        
        // Check if user has access (is teacher or enrolled student)
        boolean hasAccess = course.getTeacher().getId().equals(currentUser.getId()) ||
                          course.getEnrolledStudents().contains(currentUser);
        
        if (!hasAccess) {
            throw new RuntimeException("Bạn không có quyền truy cập các bài tập của khóa học này");
        }

        return assignmentRepository.findByCourseOrderByCreatedAtAsc(course);
    }

    /**
     * Get all assignments for a teacher across all their courses
     * Used for the teacher assignment management dashboard
     * Uses eager loading to avoid LazyInitializationException
     */
    public List<Assignment> getTeacherAssignments(User currentUser, UUID courseId, String status) {
        // Use the new query with eager loading to avoid lazy loading issues
        List<Assignment> allAssignments = assignmentRepository.findByTeacherIdWithDetails(currentUser.getId());
        
        if (allAssignments.isEmpty()) {
            return List.of();
        }
        
        // If courseId is specified, filter to that course only
        if (courseId != null) {
            allAssignments = allAssignments.stream()
                .filter(a -> a.getCourse().getId().equals(courseId))
                .toList();
        }
        
        // Filter by status if specified
        if (status != null && !status.isEmpty()) {
            allAssignments = allAssignments.stream()
                .filter(a -> {
                    String assignmentStatus = "published";
                    if (a.getDueDate() != null && a.getDueDate().isBefore(java.time.LocalDateTime.now())) {
                        assignmentStatus = "closed";
                    }
                    return assignmentStatus.equalsIgnoreCase(status);
                })
                .toList();
        }
        
        return allAssignments;
    }

    public AssignmentSubmission submitAssignment(UUID assignmentId, User currentUser, com.example.lms.controller.AssignmentController.CreateSubmissionRequest request) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập với ID: " + assignmentId));
        
        // Check if user is enrolled in the course
        Course course = assignment.getCourse();
        if (!course.getEnrolledStudents().contains(currentUser)) {
            throw new RuntimeException("Bạn chưa đăng ký khóa học này");
        }

        // Check if assignment is still open for submission
        if (assignment.getDueDate() != null && LocalDateTime.now().isAfter(assignment.getDueDate())) {
            throw new RuntimeException("Đã hết hạn nộp bài tập");
        }

        // Check if student has already submitted
        boolean hasSubmitted = submissionRepository.existsByAssignmentAndStudent(assignment, currentUser);
        if (hasSubmitted) {
            throw new RuntimeException("Bạn đã nộp bài tập này rồi");
        }

        AssignmentSubmission submission = AssignmentSubmission.builder()
                .content(request.getContent())
                .attachmentUrl(request.getAttachmentUrl())
                .submittedAt(LocalDateTime.now())
                .assignment(assignment)
                .student(currentUser)
                .build();

        return submissionRepository.save(submission);
    }

    public Page<AssignmentSubmission> getSubmissions(UUID assignmentId, User currentUser, Pageable pageable) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập với ID: " + assignmentId));
        
        // Only teacher can view submissions
        if (!assignment.getCourse().getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền xem các bài nộp của bài tập này");
        }

        return submissionRepository.findByAssignment(assignment, pageable);
    }

    public AssignmentSubmission gradeSubmission(UUID submissionId, User currentUser, com.example.lms.controller.AssignmentController.GradeSubmissionRequest request) {
        // Validate current user
        if (currentUser == null) {
            throw new RuntimeException("Bạn cần đăng nhập để thực hiện chức năng này");
        }
        
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài nộp với ID: " + submissionId));
        
        // Only teacher can grade submissions
        User teacher = submission.getAssignment().getCourse().getTeacher();
        if (teacher == null || !teacher.getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền chấm điểm bài nộp này");
        }

        // Validate score
        BigDecimal maxScore = submission.getAssignment().getMaxScore();
        if (maxScore == null) {
            maxScore = new BigDecimal("100"); // Default max score
        }
        if (request.getScore() == null) {
            throw new RuntimeException("Điểm số không được để trống");
        }
        if (request.getScore().compareTo(java.math.BigDecimal.ZERO) < 0 || 
            request.getScore().compareTo(maxScore) > 0) {
            throw new RuntimeException("Điểm số phải từ 0 đến " + maxScore);
        }

        submission.setScore(request.getScore());
        submission.setFeedback(request.getFeedback());
        submission.setGradedAt(LocalDateTime.now());
        submission.setStatus(AssignmentSubmission.Status.GRADED);

        return submissionRepository.save(submission);
    }

    public AssignmentSubmission getMySubmission(UUID assignmentId, User currentUser) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập với ID: " + assignmentId));
        
        // Check if user is enrolled in the course
        Course course = assignment.getCourse();
        if (!course.getEnrolledStudents().contains(currentUser)) {
            throw new RuntimeException("Bạn chưa đăng ký khóa học này");
        }

        return submissionRepository.findByAssignmentAndStudent(assignment, currentUser)
                .orElse(null);
    }

    public AssignmentSubmission getSubmissionById(UUID submissionId, User currentUser) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài nộp với ID: " + submissionId));
        
        // Only teacher of the course can view submission details
        if (!submission.getAssignment().getCourse().getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền xem bài nộp này");
        }

        return submission;
    }

    /**
     * Validates and coerces assignmentConfig to ensure it's a proper JSON object
     * Provides backward compatibility for string JSON inputs
     */
    private Object validateAndCoerceAssignmentConfig(Object assignmentConfig) {
        if (assignmentConfig == null) {
            return null;
        }

        // If it's already an object (Map, etc.), return as is
        if (!(assignmentConfig instanceof String)) {
            return assignmentConfig;
        }

        // If it's a string, try to parse it as JSON
        String configStr = (String) assignmentConfig;
        if (configStr.trim().isEmpty()) {
            return null;
        }

        try {
            // Parse the JSON string to ensure it's valid
            return objectMapper.readValue(configStr, Object.class);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("assignment_config phải là JSON object hợp lệ, không phải chuỗi JSON thô. Lỗi: " + e.getMessage());
        }
    }
}