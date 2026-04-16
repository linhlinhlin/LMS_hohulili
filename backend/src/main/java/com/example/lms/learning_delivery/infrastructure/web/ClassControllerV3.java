package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.application.dto.DropStudentCommand;
import com.example.lms.learning_delivery.application.dto.EnrollmentResponse;
import com.example.lms.learning_delivery.application.dto.LearningClassResponse;
import com.example.lms.learning_delivery.application.usecase.*;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.domain.PageResponse;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * V3 Controller for Learning Classes (DDD - Learning Delivery Bounded Context).
 * Includes CRUD for classes + student enrollment management.
 *
 * CLEAN ARCHITECTURE: Controller only injects Use Cases, not repositories.
 */
@Tag(name = "Classes V3", description = "Learning class management endpoints")
@RestController
@RequestMapping("/api/v3/classes")
@RequiredArgsConstructor
public class ClassControllerV3 {

    private final CreateLearningClassUseCaseV3 createLearningClassUseCase;
    private final UpdateLearningClassUseCase updateLearningClassUseCase;
    private final DeleteLearningClassUseCase deleteLearningClassUseCase;
    private final GetLearningClassByIdUseCase getLearningClassByIdUseCase;
    private final EnrollStudentByEmailUseCase enrollStudentByEmailUseCase;
    private final GetClassStudentsUseCase getClassStudentsUseCase;
    private final DropStudentUseCase dropStudentUseCase;
    private final com.example.lms.learning_delivery.infrastructure.persistence.JpaLearningClassRepository classJpaRepository;
    private final com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository courseJpaRepository;
    private final com.example.lms.course_authoring.infrastructure.persistence.repository.CoursePublicationJpaRepository coursePublicationJpaRepository;
    private final UserJpaRepository userJpaRepository;
    private final JpaEnrollmentRepository enrollmentJpaRepository;
    private final ManageClassTeachersUseCase manageClassTeachersUseCase;
    private final com.example.lms.learning_delivery.infrastructure.persistence.ClassTeacherJpaRepository classTeacherJpaRepository;

    // ================================================================================================
    // Course-scoped Class Listing (FE: ClassService)
    // ================================================================================================

    @Operation(summary = "List classes for a course")
    @GetMapping("/by-course/{courseId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<java.util.List<java.util.Map<String, Object>>>> getClassesByCourse(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserJpaEntity user) {
        var course = resolveOwnedCourse(courseId, user);
        ensureInstructorLedCourse(course);
        var entities = classJpaRepository.findByCourseId(courseId);
        var result = mapClassSummaries(entities);
        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách lớp học"));
    }

    @Operation(summary = "Search classes for a course (paginated)")
    @GetMapping("/by-course/{courseId}/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> searchClassesByCourse(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String semester,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        var course = resolveOwnedCourse(courseId, user);
        ensureInstructorLedCourse(course);

        // Use simple findByCourseId when no filters, to avoid JPQL null parameter issues
        String searchParam = (search != null && !search.isBlank()) ? search : null;
        com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity.ClassStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            try {
                statusEnum = com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity.ClassStatus.valueOf(status);
            } catch (IllegalArgumentException ignored) {}
        }

        org.springframework.data.domain.Page<com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity> pageResult;
        if (searchParam == null && statusEnum == null) {
            // Simple query without filters
            var allClasses = classJpaRepository.findByCourseId(courseId);
            int start = Math.min(page * size, allClasses.size());
            int end = Math.min(start + size, allClasses.size());
            pageResult = new org.springframework.data.domain.PageImpl<>(
                    allClasses.subList(start, end),
                    PageRequest.of(page, size),
                    allClasses.size());
        } else {
            pageResult = classJpaRepository.searchByCourseId(courseId, searchParam, statusEnum, PageRequest.of(page, size));
        }

        var content = mapClassSummaries(pageResult.getContent());
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("content", content);
        result.put("totalElements", pageResult.getTotalElements());
        result.put("totalPages", pageResult.getTotalPages());
        result.put("pageNumber", pageResult.getNumber());
        result.put("pageSize", pageResult.getSize());

        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách lớp học"));
    }

    private List<Map<String, Object>> mapClassSummaries(List<LearningClassJpaEntity> entities) {
        Map<UUID, String> teacherNames = resolveTeacherNames(entities);

        // Batch-resolve publication info for version display
        UUID latestPubId = null;
        Integer latestPubNumber = null;
        Map<UUID, Integer> pubNumberMap = new java.util.HashMap<>();
        if (!entities.isEmpty()) {
            UUID courseId = entities.get(0).getCourseId();
            var latestPub = coursePublicationJpaRepository
                    .findTopByCourseIdOrderByPublicationNumberDesc(courseId).orElse(null);
            if (latestPub != null) {
                latestPubId = latestPub.getId();
                latestPubNumber = latestPub.getPublicationNumber();
            }
            // Build map of publicationId → publicationNumber for pinned classes
            Set<UUID> versionIds = entities.stream()
                    .map(LearningClassJpaEntity::getCourseVersionId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            if (!versionIds.isEmpty()) {
                coursePublicationJpaRepository.findAllById(versionIds)
                        .forEach(pub -> pubNumberMap.put(pub.getId(), pub.getPublicationNumber()));
            }
        }

        final UUID finalLatestPubId = latestPubId;
        final Integer finalLatestPubNumber = latestPubNumber;
        return entities.stream()
                .map(entity -> toClassMap(entity, teacherNames, pubNumberMap, finalLatestPubId, finalLatestPubNumber))
                .toList();
    }

    private Map<UUID, String> resolveTeacherNames(List<LearningClassJpaEntity> entities) {
        Set<UUID> teacherIds = entities.stream()
                .map(LearningClassJpaEntity::getTeacherId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (teacherIds.isEmpty()) {
            return Map.of();
        }

        return userJpaRepository.findAllById(teacherIds).stream()
                .collect(Collectors.toMap(UserJpaEntity::getId, UserJpaEntity::getFullName));
    }

    private java.util.Map<String, Object> toClassMap(
            LearningClassJpaEntity e,
            Map<UUID, String> teacherNames,
            Map<UUID, Integer> pubNumberMap,
            UUID latestPubId,
            Integer latestPubNumber) {
        java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("id", e.getId().toString());
        map.put("name", e.getName());
        map.put("code", e.getCode());
        map.put("courseId", e.getCourseId().toString());
        map.put("teacherId", e.getTeacherId() != null ? e.getTeacherId().toString() : null);
        map.put("teacherName", e.getTeacherId() != null ? teacherNames.get(e.getTeacherId()) : null);
        map.put("status", e.getStatus().name());
        map.put("scheduleType", e.getScheduleType() != null ? e.getScheduleType().name() : LearningClassJpaEntity.ScheduleType.CUSTOM.name());
        map.put("maxStudents", e.getMaxStudents());
        long studentCount = enrollmentJpaRepository.countByClassId(e.getId());
        map.put("studentCount", studentCount);
        map.put("semester", e.getSemester());
        map.put("courseVersionId", e.getCourseVersionId() != null ? e.getCourseVersionId().toString() : null);
        map.put("versionMode", e.getVersionMode() != null ? e.getVersionMode().name() : "PINNED");
        map.put("startDate", e.getStartDate() != null ? e.getStartDate().toString() : null);
        map.put("endDate", e.getEndDate() != null ? e.getEndDate().toString() : null);
        map.put("createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : null);

        // Version info for FE display
        Integer pinnedPubNumber = e.getCourseVersionId() != null ? pubNumberMap.get(e.getCourseVersionId()) : null;
        map.put("publicationNumber", pinnedPubNumber);
        map.put("latestPublicationNumber", latestPubNumber);
        boolean updateAvailable = latestPubId != null
                && e.getCourseVersionId() != null
                && !e.getCourseVersionId().equals(latestPubId);
        map.put("updateAvailable", updateAvailable);

        // Capacity info
        int maxStudents = e.getMaxStudents() != null ? e.getMaxStudents() : 9999;
        map.put("capacityPercent", maxStudents > 0 ? Math.min(100, (int)(studentCount * 100 / maxStudents)) : 0);

        return map;
    }

    // ================================================================================================
    // Class CRUD Endpoints
    // ================================================================================================

    @Operation(summary = "Create a new learning class")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<UUID>> createClass(
            @jakarta.validation.Valid @RequestBody CreateClassRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        // P0-13: Verify teacher owns the course
        UUID courseId = UUID.fromString(request.getCourseId());
        var course = resolveOwnedCourse(courseId, user);
        ensureInstructorLedCourse(course);

        // Auto-generate code if missing — format: CLS-{semester}-{shortId} or CLS-{shortId}
        String classCode = request.getCode();
        if (classCode == null || classCode.isBlank()) {
            String shortId = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            String semester = request.getSemester();
            classCode = (semester != null && !semester.isBlank())
                    ? "CLS-" + semester + "-" + shortId
                    : "CLS-" + shortId;
        }

        // Determine teacher (defaults to creator if not specified)
        UUID teacherId = user.getId();

        Instant startDate = null;
        Instant endDate = null;
        try {
            if (request.getTeacherId() != null && !request.getTeacherId().isBlank()) teacherId = UUID.fromString(request.getTeacherId());
            if (request.getStartDate() != null) startDate = Instant.parse(request.getStartDate());
            if (request.getEndDate() != null) endDate = Instant.parse(request.getEndDate());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("INVALID_TEACHER_ID", "Teacher ID không hợp lệ"));
        } catch (java.time.format.DateTimeParseException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("INVALID_DATE", "Định dạng ngày không hợp lệ: " + e.getMessage()));
        }
        var command = new CreateLearningClassUseCaseV3.CreateClassCommand(
                courseId,
                teacherId,
                classCode,
                request.getName(),
                startDate,
                endDate,
                request.getMaxStudents(),
                request.getScheduleType(),
                request.getSemester()
        );

        UUID classId = createLearningClassUseCase.execute(command);

        return ResponseEntity.ok(ApiResponse.success(classId, "Tạo lớp học thành công"));
    }

    @Operation(summary = "Update an existing learning class")
    @PutMapping("/{classId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<LearningClassResponse>> updateClass(
            @PathVariable String classId,
            @Valid @RequestBody UpdateClassRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        // P0-13: Verify teacher owns the course via class
        var context = resolveOwnedClassContext(UUID.fromString(classId), user);
        ensureInstructorLedCourse(context.course());
        Instant startDate = null;
        Instant endDate = null;
        UUID teacherId = null;
        try {
            if (request.getStartDate() != null) startDate = Instant.parse(request.getStartDate());
            if (request.getEndDate() != null) endDate = Instant.parse(request.getEndDate());
            if (request.getTeacherId() != null && !request.getTeacherId().isBlank()) teacherId = UUID.fromString(request.getTeacherId());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("INVALID_TEACHER_ID", "Teacher ID không hợp lệ"));
        } catch (java.time.format.DateTimeParseException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("INVALID_DATE", "Định dạng ngày không hợp lệ: " + e.getMessage()));
        }
        var command = new UpdateLearningClassUseCase.UpdateClassCommand(
                UUID.fromString(classId),
                request.getName(),
                request.getCode(),
                teacherId,
                request.getStatus(),
                request.getScheduleType(),
                request.getSemester(),
                request.getMaxStudents(),
                startDate,
                endDate
        );

        LearningClassResponse response = updateLearningClassUseCase.execute(command);

        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật lớp học thành công"));
    }

    @Operation(summary = "Delete a learning class")
    @DeleteMapping("/{classId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteClass(
            @PathVariable String classId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        // P0-13: Verify teacher owns the course via class
        var context = resolveOwnedClassContext(UUID.fromString(classId), user);
        ensureInstructorLedCourse(context.course());
        deleteLearningClassUseCase.execute(UUID.fromString(classId));
        return ResponseEntity.ok(ApiResponse.success(null, "Xóa lớp học thành công"));
    }

    @Operation(summary = "Get class by ID")
    @GetMapping("/{classId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<LearningClassResponse>> getClassById(
            @PathVariable String classId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        var context = resolveOwnedClassContext(UUID.fromString(classId), user);
        ensureInstructorLedCourse(context.course());
        LearningClassResponse response = getLearningClassByIdUseCase.execute(UUID.fromString(classId));
        return ResponseEntity.ok(ApiResponse.success(response, "Thông tin lớp học"));
    }

    @Operation(summary = "Adopt a published course release for this class")
    @PostMapping("/{classId}/adopt-publication")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> adoptPublication(
            @PathVariable String classId,
            @RequestBody(required = false) AdoptPublicationRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        var context = resolveOwnedClassContext(UUID.fromString(classId), user);
        ensureInstructorLedCourse(context.course());

        UUID publicationId = null;
        if (request != null && request.getPublicationId() != null && !request.getPublicationId().isBlank()) {
            publicationId = UUID.fromString(request.getPublicationId());
        }

        var publication = publicationId != null
                ? coursePublicationJpaRepository.findById(publicationId)
                : coursePublicationJpaRepository.findTopByCourseIdOrderByPublicationNumberDesc(context.course().getId());

        var resolvedPublication = publication.orElseThrow(() -> new BusinessRuleException(
                "PUBLICATION_NOT_FOUND",
                "KhÃ³a há»c chÆ°a cÃ³ báº£n phÃ¡t hÃ nh Ä‘Æ°á»£c phÃª duyá»‡t."
        ));

        if (!resolvedPublication.getCourseId().equals(context.course().getId())) {
            throw new AccessDeniedException("Ban khong the ap dung phien ban cua khoa hoc khac.");
        }

        var learningClass = context.learningClass();
        learningClass.setCourseVersionId(resolvedPublication.getId());
        learningClass.setVersionMode(LearningClassJpaEntity.VersionMode.PINNED);
        classJpaRepository.save(learningClass);

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("classId", learningClass.getId().toString());
        result.put("courseVersionId", resolvedPublication.getId().toString());
        result.put("publicationNumber", resolvedPublication.getPublicationNumber());
        result.put("versionMode", learningClass.getVersionMode().name());
        return ResponseEntity.ok(ApiResponse.success(result, "Da cap nhat phien ban khoa hoc cho lop."));
    }

    // ================================================================================================
    // Student Enrollment Management Endpoints
    // ================================================================================================

    @Operation(summary = "Enroll student by email")
    @PostMapping("/{classId}/enrollments")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<UUID>> enrollStudent(
            @PathVariable String classId,
            @Valid @RequestBody EnrollStudentRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        // S78: IDOR fix — verify teacher owns the class's course
        var context = resolveOwnedClassContext(UUID.fromString(classId), user);
        ensureInstructorLedCourse(context.course());

        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email không được để trống");
        }

        UUID enrollmentId = enrollStudentByEmailUseCase.enroll(
                request.getEmail(),
                UUID.fromString(classId)
        );

        return ResponseEntity.ok(ApiResponse.success(enrollmentId, "Đã thêm học viên vào lớp"));
    }

    @Operation(summary = "Get students in class")
    @GetMapping("/{classId}/students")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<PageResponse<EnrollmentResponse>>> getClassStudents(
            @PathVariable String classId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        var context = resolveOwnedClassContext(UUID.fromString(classId), user);
        ensureInstructorLedCourse(context.course());
        PageResponse<EnrollmentResponse> students = getClassStudentsUseCase.execute(
                UUID.fromString(classId),
                PageRequest.of(page, size)
        );

        return ResponseEntity.ok(ApiResponse.success(students, "Danh sách học viên"));
    }

    @Operation(summary = "Remove student from class")
    @DeleteMapping("/{classId}/enrollments/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> removeStudent(
            @PathVariable String classId,
            @PathVariable String studentId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        // S78: IDOR fix — verify teacher owns the class's course
        var context = resolveOwnedClassContext(UUID.fromString(classId), user);
        ensureInstructorLedCourse(context.course());

        var command = new DropStudentCommand(
                UUID.fromString(studentId),
                UUID.fromString(classId),
                null
        );

        dropStudentUseCase.execute(command);

        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa học viên khỏi lớp"));
    }

    // ================================================================================================
    // Request DTOs
    // ================================================================================================

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateClassRequest {
        @jakarta.validation.constraints.NotBlank(message = "Tên lớp không được để trống")
        private String name;
        
        private String code; // Optional - auto generated if missing
        
        @jakarta.validation.constraints.NotBlank(message = "Mã khóa học không được để trống")
        private String courseId;
        
        private String startDate;
        private String endDate;
        private Integer maxStudents;
        
        private String teacherId;
        private String scheduleType;
        private String semester;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateClassRequest {
        private String name;
        private String code;
        private String courseId;
        private String teacherId;
        private String status;
        private String startDate;
        private String endDate;
        private Integer maxStudents;
        private String scheduleType;
        private String semester;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EnrollStudentRequest {
        @jakarta.validation.constraints.NotBlank(message = "Email không được để trống")
        @jakarta.validation.constraints.Email(message = "Email không hợp lệ")
        private String email;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdoptPublicationRequest {
        private String publicationId;
    }

    // === Ownership Helpers ===

    private boolean isAdminRole(com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity user) {
        return user.getRole() == com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity.UserRole.ADMIN
            || user.getRole() == com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity.UserRole.ORG_ADMIN;
    }

    // Legacy aliases — delegate to resolveOwnedCourse for consistent co-teacher support
    private com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity getOwnedCourse(
            UUID courseId,
            com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity user) {
        return resolveOwnedCourse(courseId, user);
    }

    private OwnedClassContext getOwnedClassContext(
            UUID classId,
            com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity user) {
        return resolveOwnedClassContext(classId, user);
    }

    private record OwnedClassContext(
            LearningClassJpaEntity learningClass,
            com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity course) {}

    private com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity resolveOwnedCourse(
            UUID courseId,
            com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity user) {
        var course = courseJpaRepository.findById(courseId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Course", courseId));
        if (!isAdminRole(user)
                && (course.getTeacherId() == null || !course.getTeacherId().equals(user.getId()))
                && !classTeacherJpaRepository.existsByTeacherIdAndCourseId(user.getId(), courseId)) {
            throw new AccessDeniedException("Bạn không có quyền truy cập khóa học này");
        }
        return course;
    }

    private OwnedClassContext resolveOwnedClassContext(
            UUID classId,
            com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity user) {
        var learningClass = classJpaRepository.findById(classId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("LearningClass", classId));
        var course = resolveOwnedCourse(learningClass.getCourseId(), user);
        return new OwnedClassContext(learningClass, course);
    }

    private void ensureInstructorLedCourse(
            com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity course) {
        if (course.getDeliveryMode() != com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity.DeliveryMode.INSTRUCTOR_LED) {
            throw new BusinessRuleException(
                    "CLASS_MANAGEMENT_NOT_ALLOWED",
                    "Quan ly lop chi ap dung cho khoa hoc dang \"Lop hoc\"."
            );
        }
    }

    // ================================================================================================
    // Co-Teacher Management (Google Classroom pattern — direct assignment)
    // ================================================================================================

    @Operation(summary = "List teachers for a class")
    @GetMapping("/{classId}/teachers")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<ManageClassTeachersUseCase.ClassTeacherDTO>>> getClassTeachers(
            @PathVariable UUID classId,
            @AuthenticationPrincipal UserJpaEntity user) {
        resolveOwnedClassContext(classId, user);
        return ResponseEntity.ok(ApiResponse.success(
                manageClassTeachersUseCase.listTeachers(classId),
                "Danh sách giảng viên của lớp"
        ));
    }

    @Operation(summary = "Add a co-teacher to a class")
    @PostMapping("/{classId}/teachers")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> addClassTeacher(
            @PathVariable UUID classId,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserJpaEntity user) {
        resolveOwnedClassContext(classId, user);

        String teacherIdStr = request.get("teacherId");
        if (teacherIdStr == null || teacherIdStr.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("MISSING_TEACHER_ID", "Vui lòng chọn giảng viên"));
        }

        String teacherName = manageClassTeachersUseCase.addCoTeacher(classId, UUID.fromString(teacherIdStr));
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("message", "Đã thêm " + teacherName + " làm đồng giảng viên"),
                "Thêm giảng viên thành công"
        ));
    }

    @Operation(summary = "Remove a co-teacher from a class")
    @DeleteMapping("/{classId}/teachers/{teacherId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> removeClassTeacher(
            @PathVariable UUID classId,
            @PathVariable UUID teacherId,
            @AuthenticationPrincipal UserJpaEntity user) {
        resolveOwnedClassContext(classId, user);
        manageClassTeachersUseCase.removeCoTeacher(classId, teacherId);
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("message", "Đã xóa giảng viên khỏi lớp"),
                "Xóa giảng viên thành công"
        ));
    }
}
