package com.example.lms.controller;

import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.service.ClassService;
import com.example.lms.service.EnrollmentService;
import com.example.lms.service.BatchEnrollmentService;
import com.example.lms.dto.ApiResponse;
import com.example.lms.dto.ClassSummaryDTO;
import com.example.lms.dto.StudentSummaryDTO;
import com.example.lms.dto.ImportSummary;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Class Management", description = "API quản lý lớp học")
public class ClassController {

    private final ClassService classService;
    private final EnrollmentService enrollmentService;
    private final BatchEnrollmentService batchEnrollmentService;

    @PostMapping("/classes/{classId}/enrollments/import")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<com.example.lms.dto.ImportSummary> importEnrollments(
            @PathVariable UUID classId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "preview", defaultValue = "false") boolean preview) throws java.io.IOException {
        return ResponseEntity.ok(batchEnrollmentService.enrollFromStream(classId, file.getInputStream(), preview));
    }

    @GetMapping("/courses/{courseId}/classes/available")
    @Operation(summary = "Lấy danh sách lớp học đang mở", description = "Lấy danh sách các lớp học trạng thái OPEN cho một khóa học")
    public ResponseEntity<ApiResponse<List<ClassSummaryDTO>>> getAvailableClasses(@PathVariable UUID courseId) {
        // Use optimized service method that returns DTOs directly - avoids LazyInitializationException
        List<ClassSummaryDTO> dtos = classService.getOpenClassSummaries(courseId);
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/courses/{courseId}/classes")
    @Operation(summary = "Lấy danh sách tất cả lớp học", description = "Lấy danh sách tất cả các lớp học của khóa học (cho Teacher)")
    public ResponseEntity<ApiResponse<List<ClassSummaryDTO>>> getAllClasses(@PathVariable UUID courseId) {
        // Use optimized service method that returns DTOs directly - avoids LazyInitializationException
        List<ClassSummaryDTO> dtos = classService.getAllClassSummaries(courseId);
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/courses/{courseId}/classes/search")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Tìm kiếm lớp học", description = "Tìm kiếm, lọc và phân trang lớp học")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<ClassSummaryDTO>>> searchClasses(
            @PathVariable UUID courseId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) LearningClass.ClassStatus status,
            @RequestParam(required = false) String semester,
            org.springframework.data.domain.Pageable pageable) {
            
        // Use simpler service call which handles wildcard and returns DTOs directly
        org.springframework.data.domain.Page<ClassSummaryDTO> dtoPage = classService.getClassesWithFilter(courseId, search, status, semester, pageable);
        
        return ResponseEntity.ok(ApiResponse.success(dtoPage));
    }

    @PostMapping("/classes")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Tạo lớp học mới", description = "Tạo một lớp học mới cho khóa học")
    public ResponseEntity<ApiResponse<ClassSummaryDTO>> createClass(@RequestBody CreateClassRequest request) {
        System.out.println("DEBUG: Entering createClass controller method");
        System.out.println("DEBUG: Request payload: " + request);
        try {
            LearningClass created = classService.createClass(
                request.courseId, 
                request.name, 
                request.maxStudents, 
                request.startDate, 
                request.endDate,
                request.scheduleType != null ? LearningClass.ScheduleType.valueOf(request.scheduleType) : LearningClass.ScheduleType.CUSTOM,
                request.semester,
                request.teacherId
            );
            return ResponseEntity.ok(ApiResponse.success(mapToSummary(created)));
        } catch (Exception e) {
            System.err.println("DEBUG: Exception in createClass: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    // ... UpdateClass, DeleteClass (unchanged)

    @PutMapping("/classes/{id}")
    @Operation(summary = "Cập nhật lớp học", description = "Cập nhật thông tin lớp học")
    public ResponseEntity<ApiResponse<ClassSummaryDTO>> updateClass(@PathVariable UUID id, @RequestBody UpdateClassRequest request) {
        LearningClass updated = classService.updateClass(
            id,
            request.name,
            request.maxStudents,
            request.startDate,
            request.endDate,
            request.scheduleType != null ? LearningClass.ScheduleType.valueOf(request.scheduleType) : LearningClass.ScheduleType.CUSTOM,
            request.semester
        );
        return ResponseEntity.ok(ApiResponse.success(mapToSummary(updated)));
    }

    @DeleteMapping("/classes/{id}")
    @Operation(summary = "Xóa lớp học", description = "Xóa (Soft Delete) lớp học")
    public ResponseEntity<ApiResponse<Void>> deleteClass(@PathVariable UUID id) {
        classService.deleteClass(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/classes/{id}/enrollments")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Gán học viên vào lớp", description = "Thêm học viên vào lớp học bằng email")
    public ResponseEntity<ApiResponse<Void>> enrollStudent(@PathVariable UUID id, @RequestBody EnrollStudentRequest request) {
        enrollmentService.enrollStudentByEmail(request.getEmail(), id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/classes/{id}/students")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Lấy danh sách học viên", description = "Lấy danh sách học viên trong lớp học")
    public ResponseEntity<ApiResponse<List<StudentSummaryDTO>>> getClassStudents(@PathVariable UUID id) {
        List<StudentSummaryDTO> students = enrollmentService.getStudentsByClass(id);
        return ResponseEntity.ok(ApiResponse.success(students));
    }

    @DeleteMapping("/classes/{classId}/enrollments/{studentId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Xóa học viên khỏi lớp", description = "Hủy ghi danh học viên khỏi lớp học")
    public ResponseEntity<ApiResponse<Void>> removeStudent(
            @PathVariable UUID classId, 
            @PathVariable UUID studentId) {
        enrollmentService.removeStudentFromClass(classId, studentId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    private ClassSummaryDTO mapToSummary(LearningClass c) {
        long currentStudents = 0;
        if (c.getEnrollments() != null) {
            currentStudents = c.getEnrollments().stream()
                .filter(e -> e.getStatus() == Enrollment.EnrollmentStatus.ACTIVE)
                .count();
        }

        return ClassSummaryDTO.builder()
            .id(c.getId())
            .name(c.getName())
            .code(c.getCode())
            .teacherName(c.getTeacher() != null ? c.getTeacher().getFullName() : "Unknown")
            .startDate(c.getStartDate())
            .endDate(c.getEndDate())
            .maxStudents(c.getMaxStudents())
            .scheduleType(c.getScheduleType().name())
            .semester(c.getSemester())
            .status(c.getStatus().name())
            .currentStudents(currentStudents)
            .build();
    }

    // DTOs
    // DTOs moved to com.example.lms.dto package
    // Removed inner ClassSummary class

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CreateClassRequest {
        @lombok.ToString.Include
        private UUID courseId;
        @lombok.ToString.Include
        private String name;
        private Integer maxStudents;
        private Instant startDate;
        private Instant endDate;
        private String scheduleType;
        private String semester;
        private UUID teacherId; // Added
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class UpdateClassRequest {
        private String name;
        private Integer maxStudents;
        private Instant startDate;
        private Instant endDate;
        private String scheduleType;
        private String semester;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class EnrollStudentRequest {
        private String email;
    }
}
