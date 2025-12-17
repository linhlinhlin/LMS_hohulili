package com.example.lms.controller;

import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.service.ClassService;
import com.example.lms.dto.ApiResponse;
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

    @GetMapping("/courses/{courseId}/classes/available")
    @Operation(summary = "Lấy danh sách lớp học đang mở", description = "Lấy danh sách các lớp học trạng thái OPEN cho một khóa học")
    public ResponseEntity<ApiResponse<List<ClassSummary>>> getAvailableClasses(@PathVariable UUID courseId) {
        List<LearningClass> classes = classService.getOpenClasses(courseId);
        List<ClassSummary> dtos = classes.stream()
            .map(this::mapToSummary)
            .collect(Collectors.toList());
            
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/courses/{courseId}/classes")
    @Operation(summary = "Lấy danh sách tất cả lớp học", description = "Lấy danh sách tất cả các lớp học của khóa học (cho Teacher)")
    public ResponseEntity<ApiResponse<List<ClassSummary>>> getAllClasses(@PathVariable UUID courseId) {
        List<LearningClass> classes = classService.getAllClassesByCourse(courseId);
        List<ClassSummary> dtos = classes.stream()
            .map(this::mapToSummary)
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/courses/{courseId}/classes/search")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Tìm kiếm lớp học", description = "Tìm kiếm, lọc và phân trang lớp học")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<ClassSummary>>> searchClasses(
            @PathVariable UUID courseId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) LearningClass.ClassStatus status,
            org.springframework.data.domain.Pageable pageable) {
            
        org.springframework.data.domain.Page<LearningClass> page = classService.getClassesWithFilter(courseId, search, status, pageable);
        
        org.springframework.data.domain.Page<ClassSummary> dtoPage = page.map(this::mapToSummary);
        
        return ResponseEntity.ok(ApiResponse.success(dtoPage));
    }

    @PostMapping("/classes")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Tạo lớp học mới", description = "Tạo một lớp học mới cho khóa học")
    public ResponseEntity<ApiResponse<ClassSummary>> createClass(@RequestBody CreateClassRequest request) {
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
    public ResponseEntity<ApiResponse<ClassSummary>> updateClass(@PathVariable UUID id, @RequestBody UpdateClassRequest request) {
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

    private ClassSummary mapToSummary(LearningClass c) {
        return ClassSummary.builder()
            .id(c.getId())
            .name(c.getName())
            .code(c.getCode())
            .teacherName(c.getTeacher() != null ? c.getTeacher().getFullName() : "Unknown")
            .startDate(c.getStartDate())
            .endDate(c.getEndDate())
            .maxStudents(c.getMaxStudents())
            .scheduleType(c.getScheduleType().name())
            .semester(c.getSemester())
            .build();
    }

    // DTOs
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ClassSummary {
        private UUID id;
        private String name;
        private String code;
        private String teacherName;
        private Instant startDate;
        private Instant endDate;
        private Integer maxStudents;
        private String scheduleType;
        private String semester;
    }

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
}
