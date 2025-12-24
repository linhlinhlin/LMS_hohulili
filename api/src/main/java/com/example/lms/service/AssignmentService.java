package com.example.lms.service;

import com.example.lms.entity.*;
import com.example.lms.repository.AssignmentRepository;
import com.example.lms.repository.AssignmentSubmissionRepository;
import com.example.lms.repository.CourseRepository;
import com.example.lms.util.AuthorizationHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final CourseRepository courseRepository;
    private final AllocationService allocationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Assignment createAssignment(UUID courseId, User currentUser, com.example.lms.controller.AssignmentController.CreateAssignmentRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học với ID: " + courseId));

        // SOTA: Admin super access + Owner check
        if (!AuthorizationHelper.isOwnerOrAdmin(course, currentUser)) {
            throw new RuntimeException("Bạn không có quyền tạo bài tập cho khóa học này");
        }

        Course.CourseStatus courseStatus = course.getStatus();
        if (courseStatus == Course.CourseStatus.PENDING) {
            throw new RuntimeException("Không thể tạo bài tập cho khóa học đang chờ duyệt");
        }

        Assignment.AssignmentStatus status = Assignment.AssignmentStatus.PUBLISHED;
        
        if (Boolean.TRUE.equals(request.getSaveAsDraft())) {
            status = Assignment.AssignmentStatus.DRAFT;
        } else if (request.getStatus() != null) {
            log.info("Creating assignment with requested status: {}", request.getStatus());
            try {
                status = Assignment.AssignmentStatus.valueOf(request.getStatus().toUpperCase());
                log.info("Status parsed successfully: {}", status);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status provided: {}, defaulting to PUBLISHED", request.getStatus());
                // Default to PUBLISHED
            }
        }

        Assignment assignment = Assignment.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .instructions(request.getInstructions())
                .maxScore(request.getMaxScore())
                .dueDate(request.getDueDate() != null ?
                    LocalDateTime.ofInstant(request.getDueDate(), java.time.ZoneId.systemDefault()) : null)
                .assignmentConfig((java.util.Map<String, Object>) request.getAssignmentConfig())
                .status(status)
                .course(course)
                .build();

        Assignment saved = assignmentRepository.save(assignment);

        // If classId or studentIds provided, create an allocation automatically
        if (request.getClassId() != null || (request.getStudentIds() != null && !request.getStudentIds().isEmpty())) {
            com.example.lms.entity.AssignmentAllocation.DistributionType type = 
                request.getClassId() != null 
                    ? com.example.lms.entity.AssignmentAllocation.DistributionType.CLASS 
                    : com.example.lms.entity.AssignmentAllocation.DistributionType.SPECIFIC_STUDENTS;
            
            allocationService.createOrUpdateAllocation(
                saved.getId(),
                type,
                request.getStudentIds(),
                request.getClassId(),
                currentUser,
                false
            );
        }

        return saved;
    }

    public Assignment updateAssignment(UUID assignmentId, User currentUser, com.example.lms.controller.AssignmentController.UpdateAssignmentRequest request) {
        // Use findById to ensure we get the entity
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập với ID: " + assignmentId));
        
        // SOTA: Admin super access + Owner check
        if (!AuthorizationHelper.isOwnerOrAdmin(assignment.getCourse(), currentUser)) {
            throw new RuntimeException("Bạn không có quyền chỉnh sửa bài tập này");
        }

        Course.CourseStatus courseStatus = assignment.getCourse().getStatus();
        if (courseStatus == Course.CourseStatus.PENDING) {
            throw new RuntimeException("Không thể chỉnh sửa bài tập của khóa học đang chờ duyệt");
        }

        if (request.getTitle() != null) assignment.setTitle(request.getTitle());
        if (request.getDescription() != null) assignment.setDescription(request.getDescription());
        if (request.getInstructions() != null) assignment.setInstructions(request.getInstructions());
        if (request.getMaxScore() != null) assignment.setMaxScore(request.getMaxScore());
        
        if (request.getDueDate() != null) {
            assignment.setDueDate(LocalDateTime.ofInstant(request.getDueDate(), java.time.ZoneId.systemDefault()));
        }
        
        if (request.getAssignmentConfig() != null) {
            assignment.setAssignmentConfig((java.util.Map<String, Object>) validateAndCoerceAssignmentConfig(request.getAssignmentConfig()));
        }


        
        // Handle allocation updates
        // Note: allocationService.createOrUpdateAllocation handles logic for different types
        com.example.lms.entity.AssignmentAllocation.DistributionType distributionType = null;
        if (request.getDistributionType() != null) {
            try {
                distributionType = com.example.lms.entity.AssignmentAllocation.DistributionType.valueOf(request.getDistributionType());
            } catch (IllegalArgumentException e) {
                // Ignore invalid
            }
        }
        
        // If specific student IDs provided OR class ID provided OR explicit distribution type change
        if (request.getStudentIds() != null || request.getClassId() != null || distributionType != null) {
            
            // Determine effective distribution type
            if (distributionType == null) {
                // Infer from inputs if not explicitly set
                if (request.getClassId() != null) {
                    distributionType = com.example.lms.entity.AssignmentAllocation.DistributionType.CLASS;
                } else if (request.getStudentIds() != null && !request.getStudentIds().isEmpty()) {
                    distributionType = com.example.lms.entity.AssignmentAllocation.DistributionType.SPECIFIC_STUDENTS;
                } else {
                     // Get existing to default? Or default to ALL if nothing else matches? 
                     // For now, if user sends studentIds=[], we might mean SPECIFIC_STUDENTS with empty list (remove all). 
                     // Let's rely on standard logic: if studentIds provided explicitly (even empty), treat as update.
                }
            }
            
            if (distributionType != null) {
                 allocationService.createOrUpdateAllocation(
                    assignment.getId(),
                    distributionType,
                    request.getStudentIds(),
                    request.getClassId(),
                    currentUser,
                    false
                );
            }
        }

        if (request.getStatus() != null) {
            log.info("Updating assignment status to: {}", request.getStatus());
            try {
                assignment.setStatus(Assignment.AssignmentStatus.valueOf(request.getStatus().toUpperCase()));
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status provided for update: {}", request.getStatus());
                // Keep existing
            }
        }

        return assignmentRepository.save(assignment);
    }

    public Assignment publishAssignment(UUID assignmentId, User currentUser) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập với ID: " + assignmentId));
        
        if (!assignment.getCourse().getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền xuất bản bài tập này");
        }

        assignment.setStatus(Assignment.AssignmentStatus.PUBLISHED);
        return assignmentRepository.save(assignment);
    }

    public void deleteAssignment(UUID assignmentId, User currentUser) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập với ID: " + assignmentId));
        
        // SOTA: Admin super access + Owner check
        if (!AuthorizationHelper.isOwnerOrAdmin(assignment.getCourse(), currentUser)) {
            throw new RuntimeException("Bạn không có quyền xóa bài tập này");
        }

        Course.CourseStatus courseStatus = assignment.getCourse().getStatus();
        if (courseStatus == Course.CourseStatus.PENDING) {
            throw new RuntimeException("Không thể xóa bài tập của khóa học đang chờ duyệt");
        }

        assignmentRepository.delete(assignment);
    }

    public Assignment getAssignmentById(UUID assignmentId, User currentUser) {
        log.info("Fetching assignment {} for user {}", assignmentId, currentUser.getId());
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> {
                    log.error("Assignment {} not found in repository", assignmentId);
                    return new RuntimeException("Không tìm thấy bài tập với ID: " + assignmentId);
                });
        
        // Ensure lazy loaded data is available
        org.hibernate.Hibernate.initialize(assignment.getCourse());
        org.hibernate.Hibernate.initialize(assignment.getCourse().getTeacher());
        org.hibernate.Hibernate.initialize(assignment.getSubmissions());
        org.hibernate.Hibernate.initialize(assignment.getAllocations());
        if (assignment.getAllocations() != null) {
            for (com.example.lms.entity.AssignmentAllocation allocation : assignment.getAllocations()) {
                org.hibernate.Hibernate.initialize(allocation.getAllocatedStudents());
                if (allocation.getLearningClass() != null) {
                     org.hibernate.Hibernate.initialize(allocation.getLearningClass());
                }
            }
        }

        // SOTA: Admin super access + Owner + Enrolled check
        Course course = assignment.getCourse();
        boolean isEnrolled = course.getEnrolledStudents().contains(currentUser);
        
        if (!AuthorizationHelper.canViewCourse(course, currentUser, isEnrolled)) {
            throw new RuntimeException("Bạn không có quyền truy cập bài tập này");
        }

        return assignment;
    }

    public List<Assignment> getAssignmentsByCourse(UUID courseId, User currentUser) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học với ID: " + courseId));
        
        // SOTA: Admin super access + Owner + Enrolled check
        boolean isEnrolled = course.getEnrolledStudents().contains(currentUser);
        
        if (!AuthorizationHelper.canViewCourse(course, currentUser, isEnrolled)) {
            throw new RuntimeException("Bạn không có quyền truy cập các bài tập của khóa học này");
        }

        return assignmentRepository.findByCourseOrderByCreatedAtAsc(course);
    }

    public List<Assignment> getTeacherAssignments(User currentUser, UUID courseId, String status) {
        List<Assignment> allAssignments = assignmentRepository.findByTeacherIdWithDetails(currentUser.getId());
        
        if (allAssignments.isEmpty()) return List.of();
        
        if (courseId != null) {
            allAssignments = allAssignments.stream()
                .filter(a -> a.getCourse().getId().equals(courseId))
                .toList();
        }
        
        if (status != null && !status.isEmpty()) {
            allAssignments = allAssignments.stream()
                .filter(a -> {
                    // This logic seems a bit custom, usually we'd use the actual status field
                    // But keeping it as is to avoid changing business logic for summary
                    String assignmentStatus = (a.getStatus() != null) ? a.getStatus().name().toLowerCase() : "published";
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
        
        Course course = assignment.getCourse();
        // Here we just check enrollment, but for visibility we'll check status in AllocationService
        // Efficient check for enrollment
        if (!courseRepository.existsByEnrolledStudentAndCourse(currentUser.getId(), course.getId())) {
            throw new RuntimeException("Bạn chưa đăng ký khóa học này");
        }

        if (assignment.getDueDate() != null && LocalDateTime.now().isAfter(assignment.getDueDate())) {
            throw new RuntimeException("Đã hết hạn nộp bài tập");
        }

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
        
        // SOTA: Admin super access + Owner check
        if (!AuthorizationHelper.isOwnerOrAdmin(assignment.getCourse(), currentUser)) {
            throw new RuntimeException("Bạn không có quyền xem các bài nộp của bài tập này");
        }

        return submissionRepository.findByAssignment(assignment, pageable);
    }

    public AssignmentSubmission gradeSubmission(UUID submissionId, User currentUser, com.example.lms.controller.AssignmentController.GradeSubmissionRequest request) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài nộp với ID: " + submissionId));
        
        // SOTA: Admin super access + Owner check
        Course course = submission.getAssignment().getCourse();
        if (!AuthorizationHelper.isOwnerOrAdmin(course, currentUser)) {
            throw new RuntimeException("Bạn không có quyền chấm điểm bài nộp này");
        }

        BigDecimal maxScore = submission.getAssignment().getMaxScore();
        if (maxScore == null) maxScore = new BigDecimal("100");
        
        if (request.getScore() == null) throw new RuntimeException("Điểm số không được để trống");
        
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
        
        return submissionRepository.findByAssignmentAndStudent(assignment, currentUser)
                .orElse(null);
    }

    public AssignmentSubmission getSubmissionById(UUID submissionId, User currentUser) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài nộp với ID: " + submissionId));
        
        // SOTA: Admin super access + Owner check
        if (!AuthorizationHelper.isOwnerOrAdmin(submission.getAssignment().getCourse(), currentUser)) {
            throw new RuntimeException("Bạn không có quyền xem bài nộp này");
        }

        return submission;
    }

    private Object validateAndCoerceAssignmentConfig(Object assignmentConfig) {
        if (assignmentConfig == null) return null;
        if (!(assignmentConfig instanceof String)) return assignmentConfig;

        String configStr = (String) assignmentConfig;
        if (configStr.trim().isEmpty()) return null;

        try {
            return objectMapper.readValue(configStr, Object.class);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("assignment_config phải là JSON object hợp lệ. Lỗi: " + e.getMessage());
        }
    }
}
